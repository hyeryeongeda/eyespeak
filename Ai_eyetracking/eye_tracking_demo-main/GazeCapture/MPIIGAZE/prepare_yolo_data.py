"""
MPIIGaze → YOLOv8 학습용 데이터셋 준비 스크립트

- annotation.txt (눈 랜드마크) → YOLO .txt 라벨 생성
- 라벨 파일은 원본 이미지와 같은 디렉토리에 저장
  (ultralytics가 /images/ → /labels/ 치환 없이 동일 경로에서 탐색)
- 피험자 단위 분할:
    train: p00~p11  (12명 ≈ 80%)
    val  : p12~p14  (3명  ≈ 20%)
- 최종 결과: yolo_dataset/dataset.yaml, train.txt, val.txt
"""

import os
import sys
import random
import multiprocessing as mp
from pathlib import Path
from functools import partial

# ──────────────────────────────────────────────────────────────
#  경로 설정
# ──────────────────────────────────────────────────────────────
BASE_DIR    = Path('C:/Users/SSAFY/Desktop/GAZE-CAPTURE/GazeCapture/MPIIGAZE')
DATA_DIR    = BASE_DIR / 'MPIIGaze' / 'Data' / 'Original'
YOLO_DIR    = BASE_DIR / 'yolo_dataset'
IMG_W, IMG_H = 1280, 720   # 원본 이미지 크기

# 피험자 단위 split
TRAIN_PERSONS = [f'p{i:02d}' for i in range(12)]   # p00~p11
VAL_PERSONS   = [f'p{i:02d}' for i in range(12, 15)]  # p12~p14

EYE_PADDING = 0.35  # 랜드마크 → 박스 패딩 비율


# ──────────────────────────────────────────────────────────────
#  annotation.txt 파싱
# ──────────────────────────────────────────────────────────────
def parse_annotation_line(line: str):
    """annotation.txt 한 줄 → right_pts (6×2), left_pts (6×2)"""
    vals = line.strip().split()
    if len(vals) < 24:
        return None, None
    # [0-11]: 오른눈 6점, [12-23]: 왼눈 6점
    right = [(float(vals[i]), float(vals[i+1])) for i in range(0, 12, 2)]
    left  = [(float(vals[i]), float(vals[i+1])) for i in range(12, 24, 2)]
    return right, left


def pts_to_yolo(pts, img_w, img_h, padding):
    """랜드마크 포인트 → YOLO 정규화 좌표 (cx, cy, w, h)"""
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    x1, x2 = min(xs), max(xs)
    y1, y2 = min(ys), max(ys)

    # 눈 크기 기준 패딩
    pw = (x2 - x1) * padding
    ph = (y2 - y1) * padding
    x1 = max(0.0, x1 - pw)
    y1 = max(0.0, y1 - ph)
    x2 = min(float(img_w), x2 + pw)
    y2 = min(float(img_h), y2 + ph)

    cx = (x1 + x2) / 2 / img_w
    cy = (y1 + y2) / 2 / img_h
    bw = (x2 - x1) / img_w
    bh = (y2 - y1) / img_h

    if bw < 0.005 or bh < 0.005:
        return None
    return cx, cy, bw, bh


# ──────────────────────────────────────────────────────────────
#  day 단위 처리 (멀티프로세싱 worker)
# ──────────────────────────────────────────────────────────────
def process_day(day_dir: Path):
    """
    한 day 디렉토리의 모든 이미지에 대해 YOLO 라벨 .txt 생성.
    Returns: 성공적으로 라벨이 생성된 이미지 절대경로 리스트
    """
    ann_file = day_dir / 'annotation.txt'
    if not ann_file.exists():
        return []

    try:
        ann_lines = ann_file.read_text(encoding='utf-8').strip().split('\n')
    except Exception:
        return []

    img_files = sorted(day_dir.glob('*.jpg'))
    if len(img_files) != len(ann_lines):
        # 개수가 다르면 짧은 쪽에 맞춤
        n = min(len(img_files), len(ann_lines))
        img_files = img_files[:n]
        ann_lines = ann_lines[:n]

    valid_paths = []
    for img_file, line in zip(img_files, ann_lines):
        right_pts, left_pts = parse_annotation_line(line)
        if right_pts is None:
            continue

        label_lines = []
        for cls_id, pts in [(0, right_pts), (1, left_pts)]:
            bbox = pts_to_yolo(pts, IMG_W, IMG_H, EYE_PADDING)
            if bbox:
                cx, cy, bw, bh = bbox
                label_lines.append(f'{cls_id} {cx:.6f} {cy:.6f} {bw:.6f} {bh:.6f}')

        if label_lines:
            label_file = img_file.with_suffix('.txt')
            label_file.write_text('\n'.join(label_lines))
            valid_paths.append(str(img_file))

    return valid_paths


# ──────────────────────────────────────────────────────────────
#  메인
# ──────────────────────────────────────────────────────────────
def main():
    print('=' * 60)
    print(' MPIIGaze YOLO 데이터셋 준비')
    print('=' * 60)

    # yolo_dataset 디렉토리 생성
    YOLO_DIR.mkdir(parents=True, exist_ok=True)

    # 모든 day 디렉토리 수집 (train / val 분리)
    train_days, val_days = [], []
    for person_dir in sorted(DATA_DIR.iterdir()):
        if not person_dir.is_dir():
            continue
        pid = person_dir.name
        days = sorted(d for d in person_dir.iterdir() if d.is_dir())
        if pid in TRAIN_PERSONS:
            train_days.extend(days)
        elif pid in VAL_PERSONS:
            val_days.extend(days)

    print(f'\n학습 피험자: {TRAIN_PERSONS}')
    print(f'검증 피험자: {VAL_PERSONS}')
    print(f'\n처리할 day 수: train={len(train_days)}, val={len(val_days)}')
    print(f'CPU 코어: {mp.cpu_count()}')
    print()

    # ── 학습 라벨 생성 ────────────────────────────────────────
    print('[1/4] 학습 라벨 생성 중...')
    n_workers = max(1, mp.cpu_count() - 1)
    with mp.Pool(n_workers) as pool:
        results = list(pool.imap_unordered(
            process_day, train_days, chunksize=4
        ))
    train_paths = [p for r in results for p in r]
    print(f'  → 학습 이미지: {len(train_paths):,}장')

    # ── 검증 라벨 생성 ────────────────────────────────────────
    print('[2/4] 검증 라벨 생성 중...')
    with mp.Pool(n_workers) as pool:
        results = list(pool.imap_unordered(
            process_day, val_days, chunksize=4
        ))
    val_paths = [p for r in results for p in r]
    print(f'  → 검증 이미지: {len(val_paths):,}장')

    # ── train.txt / val.txt 저장 ──────────────────────────────
    print('[3/4] train.txt / val.txt 저장 중...')

    random.shuffle(train_paths)
    random.shuffle(val_paths)

    train_txt = YOLO_DIR / 'train.txt'
    val_txt   = YOLO_DIR / 'val.txt'

    # Windows 경로를 슬래시로 통일 (ultralytics 호환)
    train_txt.write_text('\n'.join(p.replace('\\', '/') for p in train_paths))
    val_txt.write_text(  '\n'.join(p.replace('\\', '/') for p in val_paths))

    print(f'  → {train_txt}')
    print(f'  → {val_txt}')

    # ── dataset.yaml 생성 ─────────────────────────────────────
    print('[4/4] dataset.yaml 생성 중...')

    yaml_content = f"""# MPIIGaze 눈 탐지 데이터셋
# train: {len(train_paths):,}장 (p00~p11)
# val  : {len(val_paths):,}장 (p12~p14)

path: {str(YOLO_DIR).replace(chr(92), '/')}
train: train.txt
val:   val.txt

nc: 2
names:
  0: right_eye   # 피험자 기준 오른쪽 눈 (이미지 왼편)
  1: left_eye    # 피험자 기준 왼쪽 눈 (이미지 오른편)
"""
    yaml_path = YOLO_DIR / 'dataset.yaml'
    yaml_path.write_text(yaml_content)
    print(f'  → {yaml_path}')

    print()
    print('=' * 60)
    print(f' ✅ 데이터셋 준비 완료')
    print(f'    학습: {len(train_paths):,}장')
    print(f'    검증: {len(val_paths):,}장')
    print(f'    합계: {len(train_paths)+len(val_paths):,}장')
    print('=' * 60)


if __name__ == '__main__':
    mp.freeze_support()
    main()
