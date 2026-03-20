"""
YOLOv8s Eye Detection Training — MPIIGaze (100k balanced subset)
=================================================================
- Model    : YOLOv8s (small, better accuracy than nano)
- Dataset  : 100k balanced train / 4,607 val
- GPU      : RTX 4050 (6.4 GB VRAM)
- ETA      : ~8-10 hours for 50 epochs

Improvements over exp4 (YOLOv8n, 20k, mAP50=0.797):
- YOLOv8s: 11M params vs 3M (better feature extraction)
- 5x more training data (100k vs 20k), balanced per person
- 50 epochs with patience=15
- Cosine LR schedule (lrf=0.1)
- Stronger augmentation: mixup=0.1, copy_paste=0.1
"""

import os, random
from pathlib import Path
from collections import defaultdict

os.environ['PYTHONIOENCODING'] = 'utf-8'

from ultralytics import YOLO

BASE_DIR      = Path('C:/Users/SSAFY/Desktop/GAZE-CAPTURE/GazeCapture/MPIIGAZE')
YOLO_DIR      = BASE_DIR / 'yolo_dataset'
RUNS_DIR      = BASE_DIR / 'runs' / 'yolo'
RUNS_DIR.mkdir(parents=True, exist_ok=True)

TRAIN_SAMPLES = 100_000
EPOCHS        = 50
IMGSZ         = 640
BATCH         = 16
WORKERS       = 4
DEVICE        = 0
PATIENCE      = 15


def make_balanced_subset(train_txt: Path, n: int, seed: int = 42):
    lines = train_txt.read_text(encoding='utf-8').strip().split('\n')
    random.seed(seed)
    groups = defaultdict(list)
    for line in lines:
        norm = line.replace('\\', '/')
        try:
            i   = norm.index('/Original/')
            pid = norm[i + 10: i + 13]
        except ValueError:
            pid = 'unknown'
        groups[pid].append(line)

    persons    = sorted(groups.keys())
    per_person = max(1, n // len(persons))
    sampled    = []
    for pid in persons:
        pool = groups[pid]
        random.shuffle(pool)
        sampled.extend(pool[:per_person])
    if len(sampled) < n:
        sampled_set = set(sampled)
        remaining   = [l for l in lines if l not in sampled_set]
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

    # ── Create 100k balanced subset ───────────────────────────
    print(f'\nSampling {TRAIN_SAMPLES:,} balanced training images...')
    sampled    = make_balanced_subset(YOLO_DIR / 'train.txt', TRAIN_SAMPLES)
    train_txt  = YOLO_DIR / f'train_{TRAIN_SAMPLES//1000}k.txt'
    train_txt.write_text('\n'.join(sampled), encoding='utf-8')
    train_file = train_txt.name
    print(f'  Saved: {train_file}')

    # ── Write dataset yaml ────────────────────────────────────
    yaml_path    = YOLO_DIR / f'dataset_{exp_name}.yaml'
    yolo_dir_fwd = str(YOLO_DIR).replace('\\', '/')
    yaml_path.write_text(
        f'# MPIIGaze Eye Detection ({exp_name}) - 100k balanced\n'
        f'path: {yolo_dir_fwd}\n'
        f'train: {train_file}\n'
        f'val:   val.txt\n\n'
        f'nc: 2\n'
        f'names:\n'
        f'  0: right_eye\n'
        f'  1: left_eye\n',
        encoding='utf-8'
    )

    print(f'\nDataset    : {len(sampled):,} train / 4,607 val')
    print(f'YAML       : {yaml_path.name}')
    print(f'Epochs     : {EPOCHS}  |  Batch: {BATCH}  |  Workers: {WORKERS}')
    print(f'Device     : GPU {DEVICE} (RTX 4050)\n')

    # ── Load YOLOv8s ──────────────────────────────────────────
    model = YOLO('yolov8s.pt')

    # ── Train ─────────────────────────────────────────────────
    results = model.train(
        data          = str(yaml_path),
        epochs        = EPOCHS,
        imgsz         = IMGSZ,
        batch         = BATCH,
        workers       = WORKERS,
        device        = DEVICE,

        project       = str(RUNS_DIR),
        name          = exp_name,
        exist_ok      = True,
        save          = True,
        save_period   = 5,
        plots         = True,

        optimizer     = 'AdamW',
        lr0           = 0.001,
        lrf           = 0.1,
        momentum      = 0.937,
        weight_decay  = 0.0005,
        warmup_epochs = 5.0,

        hsv_h         = 0.015,
        hsv_s         = 0.7,
        hsv_v         = 0.4,
        degrees       = 5.0,
        translate     = 0.1,
        scale         = 0.5,
        flipud        = 0.0,
        fliplr        = 0.5,
        mosaic        = 1.0,
        mixup         = 0.1,
        copy_paste    = 0.1,

        rect          = False,
        amp           = True,
        patience      = PATIENCE,

        verbose       = True,
        seed          = 42,
        deterministic = True,
    )

    # ── Summary ───────────────────────────────────────────────
    print('\n' + '=' * 60)
    print(f'  Training complete : {exp_name}')
    best      = results.results_dict
    map50     = best.get('metrics/mAP50(B)', 0)
    map5095   = best.get('metrics/mAP50-95(B)', 0)
    precision = best.get('metrics/precision(B)', 0)
    recall    = best.get('metrics/recall(B)', 0)
    print(f'  mAP50             : {map50:.4f}')
    print(f'  mAP50-95          : {map5095:.4f}')
    print(f'  Precision         : {precision:.4f}')
    print(f'  Recall            : {recall:.4f}')
    print(f'  Best weights      : {RUNS_DIR / exp_name}/weights/best.pt')
    print('=' * 60)

    # ── Export to ONNX ────────────────────────────────────────
    best_pt = RUNS_DIR / exp_name / 'weights' / 'best.pt'
    if best_pt.exists():
        print('\nExporting to ONNX...')
        best_model = YOLO(str(best_pt))
        onnx_path  = best_model.export(
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
