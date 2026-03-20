"""
Gaze Estimator v2 — 과적합 방지 버전
=====================================
run2 분석: epoch 1에서 MAE 8.85가 최고, 이후 악화 → 과적합
수정:
  - batch: 256 → 64 (더 안정적인 gradient)
  - dropout: 0.3 → 0.5 (정규화 강화)
  - weight_decay: 1e-4 → 5e-4
  - LR: 3e-4 → 1e-4 (더 보수적인 학습)
  - 캐시 재사용 (이미 builds 됨, 빠른 시작)
"""
import os, math, time, torch, torch.nn as nn, torch.optim as optim
from pathlib import Path
from torchvision import transforms, models
from torch.utils.data import Dataset, DataLoader
import numpy as np

os.environ['PYTHONIOENCODING'] = 'utf-8'

BASE      = Path('C:/Users/SSAFY/Desktop/GAZE-CAPTURE/GazeCapture/MPIIGAZE')
CACHE_DIR = BASE / 'runs' / 'gaze_cache'
RUNS_DIR  = BASE / 'runs' / 'gaze'
RUNS_DIR.mkdir(parents=True, exist_ok=True)

EPOCHS       = 50
BATCH        = 64      # 256→64
LR           = 1e-4   # 3e-4→1e-4
WEIGHT_DECAY = 5e-4   # 1e-4→5e-4
IMG_SIZE     = 64
DEVICE       = torch.device('cuda' if torch.cuda.is_available() else 'cpu')


class GazeDataset(Dataset):
    def __init__(self, images, labels, transform=None):
        self.images = images
        self.labels = labels
        self.transform = transform

    def __len__(self): return len(self.labels)

    def __getitem__(self, idx):
        from PIL import Image as I
        img = I.fromarray(self.images[idx])
        if self.transform:
            img = self.transform(img)
        return img, torch.from_numpy(self.labels[idx])


class GazeEstimator(nn.Module):
    def __init__(self, dropout=0.5):  # 0.3→0.5
        super().__init__()
        bb = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.DEFAULT)
        inf = bb.classifier[0].in_features
        bb.classifier = nn.Sequential(
            nn.Linear(inf, 256),
            nn.Hardswish(),
            nn.Dropout(p=dropout),
            nn.Linear(256, 128),
            nn.Hardswish(),
            nn.Dropout(p=dropout * 0.6),
            nn.Linear(128, 2),
        )
        self.net = bb

    def forward(self, x): return self.net(x)


def mae_deg(pred, tgt):
    def v(a):
        y, p = a[:, 0], a[:, 1]
        return torch.stack([torch.cos(p)*torch.sin(y),
                            torch.sin(p),
                            torch.cos(p)*torch.cos(y)], 1)
    c = (v(pred) * v(tgt)).sum(1).clamp(-1, 1)
    return torch.acos(c).mean().item() * (180 / math.pi)


def train():
    # run 번호
    idx = 1
    while (RUNS_DIR / f'run{idx}').exists():
        idx += 1
    run_dir = RUNS_DIR / f'run{idx}'
    run_dir.mkdir()
    print(f'Run: run{idx}  Device: {DEVICE}', flush=True)

    # 캐시 로드 (train_gaze.py가 이미 생성)
    print('Loading cache...', flush=True)
    tr_imgs = np.load(str(CACHE_DIR / 'train_images.npy'))
    tr_lbl  = np.load(str(CACHE_DIR / 'train_labels.npy'))
    va_imgs = np.load(str(CACHE_DIR / 'val_images.npy'))
    va_lbl  = np.load(str(CACHE_DIR / 'val_labels.npy'))
    print(f'  Train {len(tr_lbl):,} | Val {len(va_lbl):,}', flush=True)

    mean = [0.485, 0.456, 0.406]
    std  = [0.229, 0.224, 0.225]
    tr_tf = transforms.Compose([
        transforms.RandomHorizontalFlip(),
        transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.2),
        transforms.RandomAffine(degrees=5, translate=(0.05, 0.05)),
        transforms.ToTensor(),
        transforms.Normalize(mean, std),
    ])
    va_tf = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize(mean, std),
    ])

    tr_ds = GazeDataset(tr_imgs, tr_lbl, tr_tf)
    va_ds = GazeDataset(va_imgs, va_lbl, va_tf)
    tr_ld = DataLoader(tr_ds, BATCH, shuffle=True,  num_workers=0, pin_memory=True)
    va_ld = DataLoader(va_ds, BATCH, shuffle=False, num_workers=0, pin_memory=True)

    model = GazeEstimator(dropout=0.5).to(DEVICE)
    params = sum(p.numel() for p in model.parameters())
    print(f'Model: MobileNetV3-Small ({params/1e6:.2f}M)  batch={BATCH} lr={LR}', flush=True)

    criterion = nn.SmoothL1Loss()
    optimizer = optim.AdamW(model.parameters(), lr=LR, weight_decay=WEIGHT_DECAY)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=EPOCHS, eta_min=1e-6)
    scaler = torch.amp.GradScaler('cuda') if DEVICE.type == 'cuda' else None

    best_mae = float('inf')
    log_lines = ['epoch,train_loss,val_loss,val_mae_deg,lr']

    print('=' * 65, flush=True)
    print(f'{"Epoch":>6}  {"TrainLoss":>10}  {"ValLoss":>9}  {"MAE(deg)":>9}  {"LR":>9}', flush=True)
    print('-' * 65, flush=True)

    for ep in range(1, EPOCHS + 1):
        model.train()
        tl = 0.0
        for imgs, labels in tr_ld:
            imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
            optimizer.zero_grad()
            if scaler:
                with torch.amp.autocast('cuda'):
                    pred = model(imgs)
                    loss = criterion(pred, labels)
                scaler.scale(loss).backward()
                scaler.step(optimizer)
                scaler.update()
            else:
                pred = model(imgs)
                loss = criterion(pred, labels)
                loss.backward()
                optimizer.step()
            tl += loss.item() * imgs.size(0)
        tl /= len(tr_ds)

        model.eval()
        vl = 0.0
        ap, at = [], []
        with torch.no_grad():
            for imgs, labels in va_ld:
                imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
                if scaler:
                    with torch.amp.autocast('cuda'):
                        pred = model(imgs)
                        loss = criterion(pred, labels)
                else:
                    pred = model(imgs)
                    loss = criterion(pred, labels)
                vl += loss.item() * imgs.size(0)
                ap.append(pred.cpu())
                at.append(labels.cpu())
        vl /= len(va_ds)
        vm = mae_deg(torch.cat(ap), torch.cat(at))
        lr_now = scheduler.get_last_lr()[0]
        scheduler.step()

        print(f'{ep:>6}  {tl:>10.5f}  {vl:>9.5f}  {vm:>9.3f}  {lr_now:>9.6f}', flush=True)
        log_lines.append(f'{ep},{tl:.6f},{vl:.6f},{vm:.4f},{lr_now:.7f}')

        if vm < best_mae:
            best_mae = vm
            torch.save({
                'epoch': ep, 'model_state': model.state_dict(),
                'val_mae': vm, 'val_loss': vl,
            }, str(run_dir / 'best.pt'))

        # Early stopping: 15에포크 개선 없으면 종료
        if ep > 15:
            recent = [float(l.split(',')[3]) for l in log_lines[-16:] if ',' in l]
            if len(recent) >= 15 and min(recent[:-1]) <= recent[-1]:
                consecutive = sum(1 for x in recent[-15:] if x >= min(recent))
                if consecutive >= 15:
                    print(f'Early stopping at epoch {ep} (no improvement for 15 epochs)', flush=True)
                    break

    print('=' * 65, flush=True)
    print(f'Best Val MAE: {best_mae:.3f} deg', flush=True)
    (run_dir / 'results.csv').write_text('\n'.join(log_lines), encoding='utf-8')

    # ONNX export
    print('Exporting ONNX...', flush=True)
    ckpt = torch.load(str(run_dir / 'best.pt'), map_location=DEVICE)
    model.load_state_dict(ckpt['model_state'])
    model.eval()
    dummy = torch.randn(1, 3, IMG_SIZE, IMG_SIZE).to(DEVICE)
    onnx_path = str(run_dir / 'gaze_estimator.onnx')
    torch.onnx.export(model, dummy, onnx_path, opset_version=17,
        input_names=['eye_image'], output_names=['gaze_angles'],
        dynamic_axes={'eye_image': {0: 'batch'}, 'gaze_angles': {0: 'batch'}})
    size = Path(onnx_path).stat().st_size / 1e6
    print(f'ONNX saved: {onnx_path} ({size:.1f} MB)', flush=True)
    print('DONE', flush=True)


if __name__ == '__main__':
    train()
