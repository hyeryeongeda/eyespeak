"""
YOLOv8n Eye Detection Training — MPIIGaze
- Dataset  : MPIIGaze (20k balanced train / 4.6k val)
- Model    : YOLOv8n pretrained on COCO, finetuned for eye detection
- Classes  : right_eye (0), left_eye (1)
- GPU      : RTX 4050 (6.4GB VRAM)
- ETA      : ~2 hours for 30 epochs
"""

import os
import random
from pathlib import Path

os.environ['PYTHONIOENCODING'] = 'utf-8'

from ultralytics import YOLO

# ──────────────────────────────────────────────────────────────
#  Paths
# ──────────────────────────────────────────────────────────────
BASE_DIR  = Path('C:/Users/SSAFY/Desktop/GAZE-CAPTURE/GazeCapture/MPIIGAZE')
YOLO_DIR  = BASE_DIR / 'yolo_dataset'
RUNS_DIR  = BASE_DIR / 'runs' / 'yolo'
RUNS_DIR.mkdir(parents=True, exist_ok=True)

# ──────────────────────────────────────────────────────────────
#  Hyperparameters  (modify here)
# ──────────────────────────────────────────────────────────────
TRAIN_SAMPLES = 20_000   # balanced sample size (None = use all 209k)
EPOCHS        = 30
IMGSZ         = 640
BATCH         = 16
WORKERS       = 4        # parallel data loading
DEVICE        = 0        # GPU 0
PATIENCE      = 10       # early stopping (epochs without mAP improvement)


def make_balanced_subset(train_txt: Path, n: int, seed: int = 42):
    """
    train.txt에서 n개의 균형잡힌 서브샘플을 생성합니다.
    각 피험자(p00~p11)에서 균등하게 샘플링하여 편향을 방지합니다.
    Path() 대신 문자열 파싱으로 속도 최적화.
    """
    lines = train_txt.read_text(encoding='utf-8').strip().split('\n')
    random.seed(seed)

    # 피험자별로 그룹화 — 문자열 파싱으로 Path() 오버헤드 제거
    from collections import defaultdict
    groups = defaultdict(list)
    for line in lines:
        # 경로: .../Original/p00/day01/0001.jpg
        # 'Original' 뒤 토큰이 피험자 ID
        norm = line.replace('\\', '/')
        try:
            idx = norm.index('/Original/')
            pid = norm[idx + 10: idx + 13]   # 'p00', 'p01' 등 3글자
        except ValueError:
            pid = 'unknown'
        groups[pid].append(line)

    persons = sorted(groups.keys())
    per_person = max(1, n // len(persons))
    sampled = []
    for pid in persons:
        pool = groups[pid]
        random.shuffle(pool)
        sampled.extend(pool[:per_person])

    # 부족하면 랜덤으로 채움
    if len(sampled) < n:
        sampled_set = set(sampled)
        remaining = [l for l in lines if l not in sampled_set]
        random.shuffle(remaining)
        sampled.extend(remaining[:n - len(sampled)])

    random.shuffle(sampled)
    return sampled[:n]


def train():
    # ── Experiment folder (auto-increment) ────────────────────
    idx = 1
    while (RUNS_DIR / f'exp{idx}').exists():
        idx += 1
    exp_name = f'exp{idx}'
    print(f'Experiment : {exp_name}')
    print(f'Save dir   : {RUNS_DIR / exp_name}')

    # ── Create training txt ───────────────────────────────────
    if TRAIN_SAMPLES is not None:
        print(f'\nSampling {TRAIN_SAMPLES:,} balanced training images...')
        sampled = make_balanced_subset(YOLO_DIR / 'train.txt', TRAIN_SAMPLES)
        train_txt = YOLO_DIR / f'train_{TRAIN_SAMPLES//1000}k.txt'
        train_txt.write_text('\n'.join(sampled))
        print(f'  Saved: {train_txt}')
        train_file = f'train_{TRAIN_SAMPLES//1000}k.txt'
    else:
        train_file = 'train.txt'

    # ── Write dataset yaml ────────────────────────────────────
    yaml_path = YOLO_DIR / f'dataset_{exp_name}.yaml'
    yolo_dir_fwd = str(YOLO_DIR).replace('\\', '/')
    yaml_path.write_text(
        f'# MPIIGaze Eye Detection ({exp_name})\n'
        f'path: {yolo_dir_fwd}\n'
        f'train: {train_file}\n'
        f'val:   val.txt\n\n'
        f'nc: 2\n'
        f'names:\n'
        f'  0: right_eye\n'
        f'  1: left_eye\n',
        encoding='utf-8'
    )

    n_train = TRAIN_SAMPLES if TRAIN_SAMPLES else 209_051
    n_val   = 4_607
    print(f'\nDataset    : {n_train:,} train / {n_val:,} val')
    print(f'YAML       : {yaml_path.name}')
    print(f'Epochs     : {EPOCHS}  |  Batch: {BATCH}  |  Workers: {WORKERS}')
    print(f'Device     : GPU {DEVICE} (RTX 4050)\n')

    # ── Load pretrained YOLOv8n ───────────────────────────────
    model = YOLO('yolov8n.pt')

    # ── Train ─────────────────────────────────────────────────
    results = model.train(
        data          = str(yaml_path),
        epochs        = EPOCHS,
        imgsz         = IMGSZ,
        batch         = BATCH,
        workers       = WORKERS,
        device        = DEVICE,

        # Experiment tracking
        project       = str(RUNS_DIR),
        name          = exp_name,
        exist_ok      = True,
        save          = True,
        save_period   = 5,
        plots         = True,

        # Optimizer: AdamW is more stable than SGD for finetuning
        optimizer     = 'AdamW',
        lr0           = 0.001,
        lrf           = 0.01,
        momentum      = 0.937,
        weight_decay  = 0.0005,
        warmup_epochs = 3.0,

        # Augmentation
        # Note: flipud=0 because vertically flipped eyes are not valid
        hsv_h         = 0.015,
        hsv_s         = 0.7,
        hsv_v         = 0.4,
        degrees       = 0.0,
        translate     = 0.1,
        scale         = 0.3,
        flipud        = 0.0,
        fliplr        = 0.5,
        mosaic        = 1.0,
        mixup         = 0.0,
        copy_paste    = 0.0,

        # Early stopping
        patience      = PATIENCE,

        verbose       = True,
        seed          = 42,
        deterministic = True,
        amp           = True,   # mixed precision (faster + less VRAM)
    )

    # ── Summary ───────────────────────────────────────────────
    print('\n' + '=' * 60)
    print(f'  Training complete : {exp_name}')
    best = results.results_dict
    map50    = best.get('metrics/mAP50(B)', 0)
    map5095  = best.get('metrics/mAP50-95(B)', 0)
    print(f'  mAP50             : {map50:.4f}')
    print(f'  mAP50-95          : {map5095:.4f}')
    print(f'  Best weights      : {RUNS_DIR / exp_name}/weights/best.pt')
    print('=' * 60)

    # ── Export to ONNX (web deployment) ───────────────────────
    best_pt = RUNS_DIR / exp_name / 'weights' / 'best.pt'
    if best_pt.exists():
        print('\nExporting to ONNX...')
        best_model = YOLO(str(best_pt))
        onnx_path = best_model.export(
            format   = 'onnx',
            imgsz    = IMGSZ,
            opset    = 17,
            simplify = True,
            dynamic  = True,
        )
        size_mb = os.path.getsize(str(onnx_path)) / 1e6
        print(f'  Saved: {onnx_path}  ({size_mb:.2f} MB)')
    else:
        print('  best.pt not found, skipping ONNX export')


if __name__ == '__main__':
    train()
