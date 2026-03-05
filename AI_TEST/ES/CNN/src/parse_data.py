import os
import cv2
import numpy as np
import pandas as pd
from pathlib import Path
import matplotlib.pyplot as plt

# 데이터 경로
BASE = Path(r"C:\Users\SSAFY\Downloads\033.안구 움직임 영상 데이터\01.데이터\2.Validation\원천데이터\VS_G1")

def load_dataset():
    pairs = []

    for person in sorted(BASE.iterdir()):
        if not person.is_dir():
            continue

        for dist in ['30', '50']:
            ir_dir = person / dist / 'IR'
            xy_dir = person / dist / 'XY'

            if not ir_dir.exists() or not xy_dir.exists():
                continue

            for ir_file in sorted(ir_dir.glob('*_mod.png')):
                # 프레임 번호 추출
                # NIA_EYE_G1_526_30_IR_F_0001_mod.png → F_0001
                parts = ir_file.stem.replace('_mod', '').split('_')
                frame = '_'.join(parts[-2:])  # F_0001

                # 매칭되는 CSV 찾기
                prefix = '_'.join(parts[:-3])  # NIA_EYE_G1_526_30
                csv_name = f"{prefix}_XY_{frame}.csv"
                csv_file = xy_dir / csv_name

                if csv_file.exists():
                    pairs.append((str(ir_file), str(csv_file)))

    return pairs

def preview(pairs, n=5):
    print(f"총 {len(pairs)}개 이미지-좌표 쌍 발견!\n")

    for ir_path, csv_path in pairs[:n]:
        df = pd.read_csv(csv_path)
        x, y = df['x'].values[0], df['y'].values[0]
        img = cv2.imdecode(np.fromfile(ir_path, dtype=np.uint8), cv2.IMREAD_GRAYSCALE)
        print(f"이미지: {Path(ir_path).name}")
        print(f"시선 좌표: x={x:.4f}, y={y:.4f}")
        print(f"이미지 크기: {img.shape}")
        print()

pairs = load_dataset()
preview(pairs)