import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import cv2
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split
import tqdm

# ── 경로 ──
BASE = Path(r"C:\Users\SSAFY\Downloads\033.안구 움직임 영상 데이터\01.데이터\2.Validation\원천데이터\VS_G1")

# ── 데이터 쌍 수집 ──
def load_pairs():
    pairs = []
    for person in sorted(BASE.iterdir()):
        if not person.is_dir(): continue
        for dist in ['30', '50']:
            rgb_dir = person / dist / 'RGB'
            xy_dir = person / dist / 'XY'
            if not rgb_dir.exists() or not xy_dir.exists(): continue
            for ir_file in sorted(rgb_dir.glob('*.jpg')):
                parts = ir_file.stem.split('_')
                frame = '_'.join(parts[-2:])
                prefix = '_'.join(parts[:-3])
                csv_file = xy_dir / f"{prefix}_XY_{frame}.csv"
                if csv_file.exists():
                    pairs.append((str(ir_file), str(csv_file)))
    return pairs

# ── 데이터셋 ──
class EyeDataset(Dataset):
    def __init__(self, pairs):
        self.pairs = pairs

    def __len__(self):
        return len(self.pairs)

    def __getitem__(self, idx):
        ir_path, csv_path = self.pairs[idx]

        # 이미지 읽기 + 전처리
        img = cv2.imdecode(np.fromfile(ir_path, dtype=np.uint8), cv2.IMREAD_GRAYSCALE)
        img = cv2.resize(img, (64, 64))
        img = img.astype(np.float32) / 255.0
        img = torch.tensor(img).unsqueeze(0)  # (1, 64, 64)

        # 좌표 읽기
        df = pd.read_csv(csv_path)
        x = float(df['x'].values[0])
        y = float(df['y'].values[0])
        label = torch.tensor([x, y], dtype=torch.float32)

        return img, label

# ── CNN 모델 ──
class GazeCNN(nn.Module):
    def __init__(self):
        super().__init__()
        self.features = nn.Sequential(
            # 1단계: 64x64 → 32x32
            nn.Conv2d(1, 32, 3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(),
            nn.MaxPool2d(2),

            # 2단계: 32x32 → 16x16
            nn.Conv2d(32, 64, 3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(2),

            # 3단계: 16x16 → 8x8
            nn.Conv2d(64, 128, 3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.MaxPool2d(2),

            # 4단계: 8x8 → 4x4
            nn.Conv2d(128, 256, 3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(),
            nn.MaxPool2d(2),
        )
        self.regressor = nn.Sequential(
            nn.Flatten(),
            nn.Linear(256 * 4 * 4, 512),


            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(512, 128),
            nn.ReLU(),
            nn.Linear(128, 2),  # x, y 출력
            nn.Sigmoid()        # 0~1 사이로 출력
        )

    def forward(self, x):
        x = self.features(x)
        x = self.regressor(x)
        return x

# ── 학습 ──
def train():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"사용 장치: {device}")

    # 데이터 준비
    pairs = load_pairs()
    print(f"전체 데이터: {len(pairs)}개")

    train_pairs, val_pairs = train_test_split(pairs, test_size=0.2, random_state=42)
    print(f"학습: {len(train_pairs)}개 / 검증: {len(val_pairs)}개")

    train_loader = DataLoader(EyeDataset(train_pairs), batch_size=64, shuffle=True, num_workers=0)
    val_loader   = DataLoader(EyeDataset(val_pairs),   batch_size=64, shuffle=False, num_workers=0)

    # 모델
    model = GazeCNN().to(device)
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)
    scheduler = torch.optim.lr_scheduler.StepLR(optimizer, step_size=5, gamma=0.5)
    criterion = nn.MSELoss()

    best_val_loss = float('inf')

    for epoch in range(30):
        # 학습
        model.train()
        train_loss = 0
        for imgs, labels in tqdm.tqdm(train_loader, desc=f"Epoch {epoch+1}/30 학습"):
            imgs, labels = imgs.to(device), labels.to(device)
            optimizer.zero_grad()
            preds = model(imgs)
            loss = criterion(preds, labels)
            loss.backward()
            optimizer.step()
            train_loss += loss.item()

        # 검증
        model.eval()
        val_loss = 0
        with torch.no_grad():
            for imgs, labels in val_loader:
                imgs, labels = imgs.to(device), labels.to(device)
                preds = model(imgs)
                val_loss += criterion(preds, labels).item()

        train_loss /= len(train_loader)
        val_loss   /= len(val_loader)
        scheduler.step()

        print(f"Epoch {epoch+1:2d} | 학습손실: {train_loss:.4f} | 검증손실: {val_loss:.4f}")

        # best 모델 저장
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save(model.state_dict(), 'gaze_model_best.pth')
            print(f"  ✅ 베스트 모델 저장! (val_loss: {val_loss:.4f})")

    print("\n학습 완료!")
    print(f"베스트 모델 저장됨: gaze_model_best.pth")

if __name__ == "__main__":
    train()