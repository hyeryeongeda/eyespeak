"""
auto_post_training.py  v2  ─  완전 자율 학습 파이프라인
=========================================================
수정 사항 (v1 버그 fix):
  - 완료 감지: results.csv 수정 시간 90초 대신 "실제로 epochs 완료" 여부로 판단
  - YOLO 재학습 스크립트: if __name__ == '__main__': 가드 포함
  - Gaze 완료 감지: weights 폴더 구조와 다른 경로 처리

YOLO 목표: mAP50 >= 0.88
Gaze 목표: Val MAE <= 7.0 deg
"""

import os, time, shutil, subprocess, sys, random
from pathlib import Path
from datetime import datetime
from collections import defaultdict

os.environ['PYTHONIOENCODING'] = 'utf-8'

BASE          = Path('C:/Users/SSAFY/Desktop/GAZE-CAPTURE/GazeCapture/MPIIGAZE')
YOLO_RUNS     = BASE / 'runs' / 'yolo'
GAZE_RUNS     = BASE / 'runs' / 'gaze'
YOLO_DIR      = BASE / 'yolo_dataset'
WEB_DEMO_DIR  = BASE / 'web_demo'
LOG_FILE      = BASE / 'runs' / 'auto_post.log'

POLL_SEC      = 60
YOLO_MAP_GOAL = 0.88
GAZE_MAE_GOAL = 7.0
MAX_YOLO_ITER = 3
MAX_GAZE_ITER = 3

YOLO_MAX_EPOCHS   = 50  # train_yolo_full.py의 설정값
GAZE_MAX_EPOCHS   = 50  # train_gaze_v2.py의 설정값


def log(msg: str):
    ts = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    line = f'[{ts}] {msg}'
    print(line, flush=True)
    with open(LOG_FILE, 'a', encoding='utf-8') as f:
        f.write(line + '\n')


def log_sep(title=''):
    line = f'== {title} ' + '=' * max(0, 56 - len(title))
    log(line)


# ── 완료 감지 (v2: epoch 수 기반) ─────────────────────────────
def yolo_exp_epochs(exp_dir: Path) -> int:
    csv = exp_dir / 'results.csv'
    if not csv.exists():
        return 0
    import pandas as pd
    try:
        df = pd.read_csv(str(csv))
        return len(df)
    except Exception:
        return 0


def is_yolo_done(exp_dir: Path, expected_epochs: int) -> bool:
    """best.pt 존재 AND (최대 에포크 도달 OR 파일 60초 미변화)."""
    best_pt = exp_dir / 'weights' / 'best.pt'
    csv     = exp_dir / 'results.csv'
    if not best_pt.exists() or not csv.exists():
        return False
    n = yolo_exp_epochs(exp_dir)
    if n >= expected_epochs:
        return True
    # Early stopping: 파일이 3분 이상 변화 없으면 완료
    age = time.time() - csv.stat().st_mtime
    return age > 180 and n > 5


def latest_gaze_run() -> Path | None:
    dirs = sorted(GAZE_RUNS.glob('run[0-9]*'))
    return dirs[-1] if dirs else None


def is_gaze_done(run_dir: Path, expected_epochs: int) -> bool:
    csv    = run_dir / 'results.csv'
    best   = run_dir / 'best.pt'
    if not csv.exists() or not best.exists():
        return False
    import pandas as pd
    try:
        df = pd.read_csv(str(csv))
        n  = len(df)
    except Exception:
        return False
    if n >= expected_epochs:
        return True
    age = time.time() - csv.stat().st_mtime
    return age > 180 and n > 5


# ── 결과 읽기 ─────────────────────────────────────────────────
def read_yolo_results(exp_dir: Path) -> dict:
    import pandas as pd
    df = pd.read_csv(str(exp_dir / 'results.csv'))
    df.columns = df.columns.str.strip()
    best = df.loc[df['metrics/mAP50(B)'].idxmax()]
    return {
        'total_epochs': len(df),
        'best_epoch'  : int(best['epoch']),
        'map50'       : float(best['metrics/mAP50(B)']),
        'map5095'     : float(best['metrics/mAP50-95(B)']),
        'precision'   : float(best['metrics/precision(B)']),
        'recall'      : float(best['metrics/recall(B)']),
        'val_box_loss': float(best['val/box_loss']),
    }


def read_gaze_results(run_dir: Path) -> dict:
    import pandas as pd
    df = pd.read_csv(str(run_dir / 'results.csv'))
    df.columns = df.columns.str.strip()
    best = df.loc[df['val_mae_deg'].idxmin()]
    return {
        'total_epochs': len(df),
        'best_epoch'  : int(best['epoch']),
        'val_mae'     : float(best['val_mae_deg']),
        'val_loss'    : float(best['val_loss']),
    }


# ── ONNX 처리 ─────────────────────────────────────────────────
def export_and_copy_yolo_onnx(exp_dir: Path):
    onnx = exp_dir / 'weights' / 'best.onnx'
    if not onnx.exists():
        log('  best.onnx 없음 → ultralytics 내보내기')
        from ultralytics import YOLO
        m   = YOLO(str(exp_dir / 'weights' / 'best.pt'))
        out = m.export(format='onnx', imgsz=640, opset=17, simplify=True, dynamic=True)
        onnx = Path(str(out))
    dst = WEB_DEMO_DIR / 'best.onnx'
    shutil.copy2(str(onnx), str(dst))
    log(f'  web_demo/best.onnx 갱신 ({dst.stat().st_size/1e6:.1f} MB)')


def copy_gaze_onnx(run_dir: Path):
    src = run_dir / 'gaze_estimator.onnx'
    if src.exists():
        dst = WEB_DEMO_DIR / 'gaze_estimator.onnx'
        shutil.copy2(str(src), str(dst))
        log(f'  web_demo/gaze_estimator.onnx 갱신 ({dst.stat().st_size/1e6:.1f} MB)')
    else:
        log('  gaze_estimator.onnx 없음 (ONNX 내보내기 실패)')


# ── YOLO 재학습 ───────────────────────────────────────────────
def start_next_yolo(r: dict, iteration: int, prev_samples: int) -> tuple:
    map50  = r['map50']
    recall = r['recall']

    if recall < 0.82:
        next_samples = min(prev_samples + 50_000, 200_000)
        next_model   = 'yolov8s.pt'
        desc = f'Recall 낮음({recall:.3f}) → {next_samples//1000}k 데이터'
    elif map50 < 0.83:
        next_samples = prev_samples
        next_model   = 'yolov8m.pt'
        desc = f'mAP 부족({map50:.4f}) → YOLOv8m'
    else:
        next_samples = min(prev_samples + 30_000, 200_000)
        next_model   = 'yolov8m.pt'
        desc = f'목표 근접({map50:.4f}) → YOLOv8m + {next_samples//1000}k'

    idx = 1
    while (YOLO_RUNS / f'exp{idx}').exists():
        idx += 1
    exp_name = f'exp{idx}'

    # 샘플 생성
    lines = (YOLO_DIR / 'train.txt').read_text(encoding='utf-8').strip().split('\n')
    random.seed(42 + iteration * 7)
    groups = defaultdict(list)
    for line in lines:
        norm = line.replace('\\', '/')
        try:
            i = norm.index('/Original/')
            pid = norm[i+10:i+13]
        except ValueError:
            pid = 'unknown'
        groups[pid].append(line)
    persons    = sorted(groups.keys())
    per_person = max(1, next_samples // len(persons))
    sampled    = []
    for pid in persons:
        pool = groups[pid][:]
        random.shuffle(pool)
        sampled.extend(pool[:per_person])
    if len(sampled) < next_samples:
        rest = [l for l in lines if l not in set(sampled)]
        random.shuffle(rest)
        sampled.extend(rest[:next_samples - len(sampled)])
    random.shuffle(sampled)
    sampled = sampled[:next_samples]

    train_file = YOLO_DIR / f'train_{next_samples//1000}k_i{iteration}.txt'
    train_file.write_text('\n'.join(sampled), encoding='utf-8')

    yaml_path = YOLO_DIR / f'dataset_{exp_name}.yaml'
    fwd = str(YOLO_DIR).replace('\\', '/')
    yaml_path.write_text(
        f'path: {fwd}\ntrain: {train_file.name}\nval: val.txt\n'
        f'nc: 2\nnames:\n  0: right_eye\n  1: left_eye\n',
        encoding='utf-8'
    )

    script = BASE / f'_run_yolo_{exp_name}.py'
    script.write_text(f"""# auto-generated
if __name__ == '__main__':
    import os
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    from ultralytics import YOLO
    from pathlib import Path
    model = YOLO('{next_model}')
    results = model.train(
        data=r'{yaml_path}', epochs=50, imgsz=640, batch=16,
        workers=4, device=0, project=r'{YOLO_RUNS}', name='{exp_name}',
        exist_ok=True, save=True, save_period=5, plots=True,
        optimizer='AdamW', lr0=0.001, lrf=0.1, momentum=0.937,
        weight_decay=0.0005, warmup_epochs=3.0,
        hsv_h=0.015, hsv_s=0.7, hsv_v=0.4, degrees=5.0,
        translate=0.1, scale=0.5, flipud=0.0, fliplr=0.5,
        mosaic=1.0, mixup=0.1, copy_paste=0.1,
        amp=True, patience=15, seed=42, verbose=True,
    )
    best = YOLO(r'{YOLO_RUNS}/{exp_name}/weights/best.pt')
    best.export(format='onnx', imgsz=640, opset=17, simplify=True, dynamic=True)
    print('DONE')
""", encoding='utf-8')

    log_out = BASE / 'runs' / f'yolo_{exp_name}.log'
    proc = subprocess.Popen(
        [sys.executable, '-u', str(script)],
        stdout=open(str(log_out), 'w', encoding='utf-8'),
        stderr=subprocess.STDOUT, cwd=str(BASE),
    )
    log(f'  {exp_name} 시작 PID={proc.pid}: {desc}')
    return YOLO_RUNS / exp_name, next_samples


# ── Gaze 재학습 ───────────────────────────────────────────────
def start_next_gaze(r: dict, prev_run: Path, iteration: int) -> Path:
    mae = r['val_mae']
    lr  = 5e-5 if mae < 8.0 else 1e-4

    idx = 1
    while (GAZE_RUNS / f'run{idx}').exists():
        idx += 1
    next_run_name = f'run{idx}'
    next_run_dir  = GAZE_RUNS / next_run_name
    next_run_dir.mkdir()

    script = BASE / f'_run_gaze_{next_run_name}.py'
    script.write_text(f"""# auto-generated gaze retraining
if __name__ == '__main__':
    import os, math, time, torch, torch.nn as nn, torch.optim as optim, numpy as np
    from pathlib import Path
    from torchvision import transforms, models
    from torch.utils.data import Dataset, DataLoader
    os.environ['PYTHONIOENCODING'] = 'utf-8'

    BASE      = Path(r'{BASE}')
    CACHE_DIR = BASE / 'runs' / 'gaze_cache'
    RUN_DIR   = Path(r'{next_run_dir}')
    DEVICE    = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    EPOCHS, BATCH, LR, WD = 40, 64, {lr}, 5e-4
    IMG_SIZE = 64

    class DS(Dataset):
        def __init__(self, imgs, lbls, tf=None):
            self.i=imgs; self.l=lbls; self.tf=tf
        def __len__(self): return len(self.l)
        def __getitem__(self, idx):
            from PIL import Image as I
            img = I.fromarray(self.i[idx])
            if self.tf: img = self.tf(img)
            return img, torch.from_numpy(self.l[idx])

    class Model(nn.Module):
        def __init__(self):
            super().__init__()
            bb = models.mobilenet_v3_small(weights=None)
            inf = bb.classifier[0].in_features
            bb.classifier = nn.Sequential(nn.Linear(inf,256),nn.Hardswish(),
                nn.Dropout(0.5),nn.Linear(256,128),nn.Hardswish(),nn.Dropout(0.3),nn.Linear(128,2))
            self.net = bb
        def forward(self, x): return self.net(x)

    def mae_deg(p, t):
        def v(a):
            y,pi=a[:,0],a[:,1]
            return torch.stack([torch.cos(pi)*torch.sin(y),torch.sin(pi),torch.cos(pi)*torch.cos(y)],1)
        return torch.acos((v(p)*v(t)).sum(1).clamp(-1,1)).mean().item()*(180/math.pi)

    mn=[0.485,0.456,0.406]; st=[0.229,0.224,0.225]
    tr_tf = transforms.Compose([transforms.RandomHorizontalFlip(),
        transforms.ColorJitter(0.3,0.3,0.2),transforms.RandomAffine(5,(0.05,0.05)),
        transforms.ToTensor(),transforms.Normalize(mn,st)])
    va_tf = transforms.Compose([transforms.ToTensor(),transforms.Normalize(mn,st)])

    tr_imgs=np.load(str(CACHE_DIR/'train_images.npy')); tr_lbl=np.load(str(CACHE_DIR/'train_labels.npy'))
    va_imgs=np.load(str(CACHE_DIR/'val_images.npy'));   va_lbl=np.load(str(CACHE_DIR/'val_labels.npy'))
    print(f'Train {{len(tr_lbl):,}} Val {{len(va_lbl):,}}', flush=True)

    tr_ld=DataLoader(DS(tr_imgs,tr_lbl,tr_tf),BATCH,shuffle=True, num_workers=0,pin_memory=True)
    va_ld=DataLoader(DS(va_imgs,va_lbl,va_tf),BATCH,shuffle=False,num_workers=0,pin_memory=True)

    model = Model().to(DEVICE)
    # Load previous best
    ckpt = torch.load(r'{prev_run}/best.pt', map_location=DEVICE)
    model.load_state_dict(ckpt['model_state'])
    print(f'Loaded {prev_run.name}/best.pt MAE={{ckpt["val_mae"]:.3f}}deg', flush=True)

    crit = nn.SmoothL1Loss()
    opt  = optim.AdamW(model.parameters(), lr=LR, weight_decay=WD)
    sch  = optim.lr_scheduler.CosineAnnealingLR(opt, T_max=EPOCHS, eta_min=1e-6)
    sc   = torch.amp.GradScaler('cuda') if DEVICE.type=='cuda' else None

    best_mae = ckpt['val_mae']
    logs = ['epoch,train_loss,val_loss,val_mae_deg,lr']
    print('='*60, flush=True)

    for ep in range(1, EPOCHS+1):
        model.train(); tl=0
        for imgs,lbl in tr_ld:
            imgs,lbl=imgs.to(DEVICE),lbl.to(DEVICE); opt.zero_grad()
            if sc:
                with torch.amp.autocast('cuda'): p=model(imgs); ls=crit(p,lbl)
                sc.scale(ls).backward(); sc.step(opt); sc.update()
            else:
                p=model(imgs); ls=crit(p,lbl); ls.backward(); opt.step()
            tl+=ls.item()*imgs.size(0)
        tl/=len(tr_lbl)
        model.eval(); vl=0; ap,at=[],[]
        with torch.no_grad():
            for imgs,lbl in va_ld:
                imgs,lbl=imgs.to(DEVICE),lbl.to(DEVICE)
                if sc:
                    with torch.amp.autocast('cuda'): p=model(imgs); ls=crit(p,lbl)
                else:
                    p=model(imgs); ls=crit(p,lbl)
                vl+=ls.item()*imgs.size(0); ap.append(p.cpu()); at.append(lbl.cpu())
        vl/=len(va_lbl)
        vm=mae_deg(torch.cat(ap),torch.cat(at))
        lr_now=sch.get_last_lr()[0]; sch.step()
        print(f'ep{{ep:>3}} tl={{tl:.5f}} vl={{vl:.5f}} mae={{vm:.3f}}deg lr={{lr_now:.6f}}', flush=True)
        logs.append(f'{{ep}},{{tl:.6f}},{{vl:.6f}},{{vm:.4f}},{{lr_now:.7f}}')
        if vm < best_mae:
            best_mae=vm
            torch.save({{'epoch':ep,'model_state':model.state_dict(),'val_mae':vm,'val_loss':vl}},str(RUN_DIR/'best.pt'))

    (RUN_DIR/'results.csv').write_text('\\n'.join(logs), encoding='utf-8')
    print(f'Best MAE: {{best_mae:.3f}} deg', flush=True)
    model.load_state_dict(torch.load(str(RUN_DIR/'best.pt'),map_location=DEVICE)['model_state'])
    model.eval()
    dummy=torch.randn(1,3,IMG_SIZE,IMG_SIZE).to(DEVICE)
    torch.onnx.export(model,dummy,str(RUN_DIR/'gaze_estimator.onnx'),opset_version=17,
        input_names=['eye_image'],output_names=['gaze_angles'],
        dynamic_axes={{'eye_image':{{0:'batch'}},'gaze_angles':{{0:'batch'}}}})
    print('DONE', flush=True)
""", encoding='utf-8')

    log_out = GAZE_RUNS / f'gaze_{next_run_name}.log'
    proc = subprocess.Popen(
        [sys.executable, '-u', str(script)],
        stdout=open(str(log_out), 'w', encoding='utf-8'),
        stderr=subprocess.STDOUT, cwd=str(BASE),
    )
    log(f'  {next_run_name} 시작 PID={proc.pid}: MAE {mae:.3f}deg → 추가 40ep LR={lr}')
    return next_run_dir


# ── 메인 ──────────────────────────────────────────────────────
def main():
    (BASE / 'runs').mkdir(parents=True, exist_ok=True)
    log_sep('자율 파이프라인 v2 시작')
    log(f'  YOLO 목표 mAP50 >= {YOLO_MAP_GOAL}  |  Gaze 목표 MAE <= {GAZE_MAE_GOAL}deg')

    # 초기 실험 디렉토리
    yolo_dir       = YOLO_RUNS / 'exp6'   # 현재 학습 중
    gaze_run       = latest_gaze_run()    # run3 (v2 재시작) 또는 run2
    yolo_done      = False
    gaze_done      = False
    yolo_iter      = 0
    gaze_iter      = 0
    yolo_samples   = 100_000
    yolo_total_ep  = YOLO_MAX_EPOCHS
    gaze_total_ep  = GAZE_MAX_EPOCHS

    while not (yolo_done and gaze_done):
        time.sleep(POLL_SEC)
        ts = datetime.now().strftime('%H:%M')

        # ── YOLO ─────────────────────────────────────────────
        if not yolo_done:
            if is_yolo_done(yolo_dir, yolo_total_ep):
                log_sep(f'YOLO {yolo_dir.name} 완료')
                r = read_yolo_results(yolo_dir)
                log(f'  mAP50={r["map50"]:.4f}  Prec={r["precision"]:.4f}  '
                    f'Rec={r["recall"]:.4f}  ep={r["total_epochs"]}')
                try:
                    export_and_copy_yolo_onnx(yolo_dir)
                except Exception as e:
                    log(f'  ONNX 오류: {e}')

                if r['map50'] >= YOLO_MAP_GOAL:
                    log(f'  목표 달성!')
                    yolo_done = True
                elif yolo_iter >= MAX_YOLO_ITER:
                    log(f'  최대 반복 도달 (최종 mAP50={r["map50"]:.4f})')
                    yolo_done = True
                else:
                    yolo_iter += 1
                    log(f'  목표 미달 → 추가 실험 #{yolo_iter}')
                    next_dir, next_samp = start_next_yolo(r, yolo_iter, yolo_samples)
                    yolo_dir     = next_dir
                    yolo_samples = next_samp
                    yolo_total_ep = 50
            else:
                # 진행 상황 출력
                try:
                    import pandas as pd
                    csv = yolo_dir / 'results.csv'
                    if csv.exists():
                        df = pd.read_csv(str(csv)); df.columns = df.columns.str.strip()
                        n  = len(df)
                        if n > 0:
                            lat = df.iloc[-1]
                            log(f'[{ts}] YOLO {yolo_dir.name}: ep {n}/{yolo_total_ep}  '
                                f'mAP50={lat["metrics/mAP50(B)"]:.4f}  '
                                f'rec={lat["metrics/recall(B)"]:.3f}  '
                                f'best={df["metrics/mAP50(B)"].max():.4f}')
                    else:
                        log(f'[{ts}] YOLO {yolo_dir.name}: 스캔 중...')
                except Exception as e:
                    log(f'[{ts}] YOLO 상태 오류: {e}')

        # ── Gaze ─────────────────────────────────────────────
        if not gaze_done:
            gaze_run = latest_gaze_run()
            if gaze_run and is_gaze_done(gaze_run, gaze_total_ep):
                log_sep(f'Gaze {gaze_run.name} 완료')
                r = read_gaze_results(gaze_run)
                log(f'  Val MAE={r["val_mae"]:.3f}deg  BestEp={r["best_epoch"]}  '
                    f'ep={r["total_epochs"]}')
                copy_gaze_onnx(gaze_run)

                if r['val_mae'] <= GAZE_MAE_GOAL:
                    log('  목표 달성!')
                    gaze_done = True
                elif gaze_iter >= MAX_GAZE_ITER:
                    log(f'  최대 반복 도달 (최종 MAE={r["val_mae"]:.3f}deg)')
                    gaze_done = True
                else:
                    gaze_iter += 1
                    log(f'  목표 미달 → 추가 실험 #{gaze_iter}')
                    start_next_gaze(r, gaze_run, gaze_iter)
                    gaze_total_ep = 40
            elif gaze_run:
                try:
                    import pandas as pd
                    csv = gaze_run / 'results.csv'
                    if csv.exists():
                        df = pd.read_csv(str(csv)); df.columns = df.columns.str.strip()
                        n  = len(df)
                        if n > 0:
                            lat = df.iloc[-1]
                            log(f'[{ts}] Gaze {gaze_run.name}: ep {n}/{gaze_total_ep}  '
                                f'MAE={lat["val_mae_deg"]:.3f}deg  '
                                f'best={df["val_mae_deg"].min():.3f}deg')
                    else:
                        log(f'[{ts}] Gaze {gaze_run.name}: 초기화 중...')
                except Exception:
                    log(f'[{ts}] Gaze 상태 확인 중...')
            else:
                log(f'[{ts}] Gaze: run 폴더 대기 중...')

    log_sep('모든 학습 완료')
    try:
        r = read_yolo_results(yolo_dir)
        log(f'  YOLO 최종: {yolo_dir.name}  mAP50={r["map50"]:.4f}')
    except Exception:
        pass
    try:
        gr = latest_gaze_run()
        r  = read_gaze_results(gr)
        log(f'  Gaze 최종: {gr.name}  MAE={r["val_mae"]:.3f}deg')
    except Exception:
        pass
    log('  → cd web_demo && python serve.py 로 결과 확인')


if __name__ == '__main__':
    main()
