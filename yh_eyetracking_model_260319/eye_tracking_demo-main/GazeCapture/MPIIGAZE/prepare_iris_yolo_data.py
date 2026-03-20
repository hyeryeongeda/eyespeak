"""
AI Hub 126 → YOLO 홍채/흰자 검출 데이터셋 변환기
===================================================
Classes:
  0: iris   (홍채/검은자) — 타원 어노테이션(cx,cy,rx,ry)으로부터 bbox
  1: sclera (흰자/공막)  — 눈꺼풀 폴리곤(eyelid) bbox

입력:
  - TS.z01 / VS.z01 : 원천 PNG 이미지 (1920×1080)
  - TL.zip / VL.zip : JSON 라벨

출력:  <out_dir>/
  images/train/  images/val/   ← JPEG (저장 용량 절감)
  labels/train/  labels/val/   ← YOLO txt
  dataset.yaml
"""

import glob, json, struct, zlib, io, os, pickle, random, time, sys
from pathlib import Path
import numpy as np
from PIL import Image

# ─────────────────────────── 설정 ───────────────────────────
BASE      = Path(__file__).parent
OUT_DIR   = BASE / 'runs' / 'iris_yolo_dataset'
IMG_W, IMG_H = 1920, 1080

N_TRAIN   = 30_000      # 추출할 train 이미지 수
N_VAL     = 5_000       # 추출할 val 이미지 수
JPEG_Q    = 88          # JPEG 저장 품질
DEVICE_OK = ('Laptop', 'Monitor')
CLASSES   = ['iris', 'sclera']

# ─────────────────────────── 경로 자동 탐색 ─────────────────
def _find(pattern):
    return glob.glob(pattern, recursive=True)

def find_paths():
    data_root = BASE / 'MPIIGaze' / 'Data'
    ts = _find(str(data_root / '**/TS.z01'))
    vs = _find(str(data_root / '**/VS.z01'))
    tl = _find(str(data_root / '**/TL.zip'))
    vl = _find(str(data_root / '**/VL.zip'))
    assert ts and vs and tl and vl, "데이터 파일을 찾을 수 없습니다."
    return ts[0], vs[0], tl[0], vl[0]

# ─────────────────────────── z01 인덱서 ─────────────────────
def scan_z01(z01_path: str, pkl_path: str) -> dict:
    """z01 내 PNG 파일 위치 인덱스 반환: {rel_path: (offset, csz, usz, method)}"""
    if os.path.exists(pkl_path):
        print(f'  [인덱스 로드] {pkl_path}', flush=True)
        with open(pkl_path, 'rb') as f:
            return pickle.load(f)

    LOCAL_SIG = b'PK\x03\x04'
    DATA_DESC = b'PK\x07\x08'
    CENTRAL_D = b'PK\x01\x02'
    END_REC   = b'PK\x05\x06'

    index   = {}
    fsz     = os.path.getsize(z01_path)
    t0      = time.time()
    count   = 0
    print(f'  [z01 스캔] {z01_path}  ({fsz/1e9:.1f} GB)', flush=True)

    with open(z01_path, 'rb') as f:
        hdr = f.read(4)
        if hdr not in (LOCAL_SIG, DATA_DESC):
            f.seek(0)
        while True:
            sig = f.read(4)
            if len(sig) < 4:
                break
            if sig == LOCAL_SIG:
                raw = f.read(26)
                if len(raw) < 26:
                    break
                _, flags, method, _, _, _, csz, usz, fnl, exl = struct.unpack('<HHHHHIIIHH', raw)
                fname = f.read(fnl).decode('utf-8', errors='replace')
                f.seek(exl, 1)
                data_start = f.tell()
                if fname.endswith('.png') and csz > 0:
                    index[fname] = (data_start, csz, usz, method)
                    count += 1
                    if count % 10_000 == 0:
                        print(f'    {count:,} PNG 인덱싱 완료  ({time.time()-t0:.0f}s)', flush=True)
                f.seek(csz, 1)
                if flags & 0x08:
                    nxt = f.read(4)
                    if nxt == DATA_DESC:
                        f.seek(12, 1)
                    else:
                        f.seek(-4, 1)
            elif sig == DATA_DESC:
                f.seek(12, 1)
            elif sig in (CENTRAL_D, END_REC):
                break
            else:
                f.seek(-3, 1)

    print(f'  → 총 {count:,} PNG  ({time.time()-t0:.0f}s)', flush=True)
    Path(pkl_path).parent.mkdir(parents=True, exist_ok=True)
    with open(pkl_path, 'wb') as f:
        pickle.dump(index, f)
    return index

# ─────────────────────────── 이미지 압축 해제 ────────────────
def decompress(z01_path: str, offset: int, csz: int, method: int) -> bytes:
    with open(z01_path, 'rb') as f:
        f.seek(offset)
        data = f.read(csz)
    return zlib.decompress(data, -15) if method == 8 else data

# ─────────────────────────── 라벨 파싱 (TL/VL.zip) ──────────
def load_labels(label_zip: str) -> dict:
    """
    반환: {img_rel_path: [(class, cx, cy, w, h), ...]}  (픽셀 절대 좌표)
    class 0=iris, 1=sclera
    """
    import zipfile
    print(f'  [라벨 로드] {label_zip}', flush=True)
    labels = {}
    t0 = time.time()
    skipped = 0

    with zipfile.ZipFile(label_zip) as zf:
        jsons = [n for n in zf.namelist() if n.endswith('.json')]
        total = len(jsons)
        print(f'  JSON 총 {total:,}개', flush=True)

        for i, jname in enumerate(jsons):
            # 장치 필터
            parts = jname.split('/')
            if len(parts) < 3 or parts[2] not in DEVICE_OK:
                skipped += 1
                continue

            with zf.open(jname) as f:
                try:
                    d = json.load(f)
                except Exception:
                    skipped += 1
                    continue

            anns = d['Annotations']['annotations']
            boxes = []

            for a in anns:
                lbl = a['label']

                # ── 홍채(iris): 타원 → bbox ─────────────────
                if lbl in ('r_iris', 'l_iris'):
                    cx = float(a.get('cx', 0))
                    cy = float(a.get('cy', 0))
                    rx = float(a.get('rx', 0))
                    ry = float(a.get('ry', 0))
                    if rx > 1 and ry > 1:
                        boxes.append((0, cx, cy, rx * 2, ry * 2))

                # ── 공막(sclera): 눈꺼풀 폴리곤 → bbox ───────
                elif lbl in ('r_eyelid', 'l_eyelid'):
                    pts = a.get('points', [])
                    if len(pts) >= 3:
                        xs = [p[0] for p in pts]
                        ys = [p[1] for p in pts]
                        x1, y1, x2, y2 = min(xs), min(ys), max(xs), max(ys)
                        bw = x2 - x1
                        bh = y2 - y1
                        if bw > 5 and bh > 3:
                            boxes.append((1, (x1+x2)/2, (y1+y2)/2, bw, bh))

            if not boxes:
                skipped += 1
                continue

            # JSON → 이미지 경로 변환
            img_path = jname.replace('/json_rgb/', '/rgb/').replace('.json', '.png')
            labels[img_path] = boxes

            if i % 50_000 == 0:
                print(f'  [{i/total*100:.0f}%] {len(labels):,} 유효 / skip {skipped:,}  ({time.time()-t0:.0f}s)', flush=True)

    print(f'  → 총 {len(labels):,} 유효 라벨 / {total:,} JSON  ({time.time()-t0:.0f}s)', flush=True)
    return labels

# ─────────────────────────── YOLO txt 변환 ───────────────────
def to_yolo_line(cls: int, cx_px, cy_px, w_px, h_px) -> str:
    cx = max(0.0, min(1.0, cx_px / IMG_W))
    cy = max(0.0, min(1.0, cy_px / IMG_H))
    w  = max(0.001, min(1.0, w_px  / IMG_W))
    h  = max(0.001, min(1.0, h_px  / IMG_H))
    return f'{cls} {cx:.6f} {cy:.6f} {w:.6f} {h:.6f}'

# ─────────────────────────── 스플릿 빌드 ─────────────────────
def build_split(split: str, z01_path: str, label_zip: str, n_max: int):
    img_dir = OUT_DIR / 'images' / split
    lbl_dir = OUT_DIR / 'labels' / split
    img_dir.mkdir(parents=True, exist_ok=True)
    lbl_dir.mkdir(parents=True, exist_ok=True)

    pkl = str(OUT_DIR / f'{split}_z01_index.pkl')

    # 1. z01 인덱스
    z01_idx = scan_z01(z01_path, pkl)
    print(f'  z01 PNG 수: {len(z01_idx):,}', flush=True)

    # 2. 라벨 로드
    labels = load_labels(label_zip)

    # 3. 매칭
    matched = [(k, v) for k, v in labels.items() if k in z01_idx]
    print(f'  매칭: {len(matched):,} / {len(labels):,}', flush=True)

    # 4. 랜덤 샘플링
    random.shuffle(matched)
    matched = matched[:n_max]
    print(f'  추출 대상: {len(matched):,}개', flush=True)

    # 5. 이미지+라벨 저장
    t0 = time.time()
    saved = 0
    errors = 0
    for i, (img_rel, boxes) in enumerate(matched):
        if i % 1000 == 0:
            print(f'  [{i:,}/{len(matched):,}] saved={saved}  ({time.time()-t0:.0f}s)', flush=True)

        # 이미지 읽기
        try:
            offset, csz, usz, method = z01_idx[img_rel]
            raw = decompress(z01_path, offset, csz, method)
            img = Image.open(io.BytesIO(raw)).convert('RGB')
        except Exception as e:
            errors += 1
            continue

        # 파일명: 경로 슬래시 → 언더바
        stem = img_rel.replace('/', '_').replace('.png', '')
        img_out = img_dir / f'{stem}.jpg'
        lbl_out = lbl_dir / f'{stem}.txt'

        if img_out.exists() and lbl_out.exists():
            saved += 1
            continue

        try:
            img.save(str(img_out), 'JPEG', quality=JPEG_Q)
        except Exception as e:
            errors += 1
            continue

        lines = [to_yolo_line(*b) for b in boxes]
        lbl_out.write_text('\n'.join(lines))
        saved += 1

    print(f'  [{split}] 완료: {saved}개 저장, {errors}개 오류  ({time.time()-t0:.0f}s)', flush=True)

# ─────────────────────────── dataset.yaml 생성 ───────────────
def write_yaml():
    yaml_path = OUT_DIR / 'dataset.yaml'
    content = f"""path: {OUT_DIR.as_posix()}
train: images/train
val:   images/val

nc: {len(CLASSES)}
names: {CLASSES}
"""
    yaml_path.write_text(content)
    print(f'dataset.yaml 작성: {yaml_path}')

# ─────────────────────────── main ────────────────────────────
if __name__ == '__main__':
    random.seed(42)
    print('='*60, flush=True)
    print('AI Hub 126 → YOLO 홍채/흰자 데이터셋 변환', flush=True)
    print('='*60, flush=True)

    ts, vs, tl, vl = find_paths()
    print(f'Train z01  : {ts}')
    print(f'Val   z01  : {vs}')
    print(f'Train label: {tl}')
    print(f'Val   label: {vl}')
    print(f'출력 디렉터리: {OUT_DIR}')
    print()

    print('[TRAIN]', flush=True)
    build_split('train', ts, tl, N_TRAIN)

    print()
    print('[VAL]', flush=True)
    build_split('val', vs, vl, N_VAL)

    write_yaml()
    print('\n변환 완료!', flush=True)
