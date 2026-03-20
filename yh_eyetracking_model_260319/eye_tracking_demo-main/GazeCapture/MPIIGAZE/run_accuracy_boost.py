"""
정확도 향상 학습 — 노트북과 동일 로직, 터미널에서 진행 상황 출력.
실행: cd GazeCapture/MPIIGAZE && python run_accuracy_boost.py
"""
import os
import sys
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms, models
from pathlib import Path
from PIL import Image

os.environ['PYTHONIOENCODING'] = 'utf-8'

SCRIPT_DIR = Path(__file__).resolve().parent
BASE = SCRIPT_DIR
for candidate in [SCRIPT_DIR, SCRIPT_DIR.parent]:
    if (candidate / 'runs' / 'aihub_cache' / 'train_eyes.npy').exists():
        BASE = candidate
        break
    p2 = candidate / 'GazeCapture' / 'MPIIGAZE' / 'runs' / 'aihub_cache' / 'train_eyes.npy'
    if p2.exists():
        BASE = candidate / 'GazeCapture' / 'MPIIGAZE'
        break

CACHE_DIR = BASE / 'runs' / 'aihub_cache'
RUNS_DIR  = BASE / 'runs' / 'gaze_aihub'
RUNS_DIR.mkdir(parents=True, exist_ok=True)

EPOCHS        = 70
PHASE1_EPOCHS = 25
LR_HEAD       = 1e-3
LR_FINETUNE   = 5e-5
WEIGHT_DECAY  = 1e-3
BATCH         = 128
IMG_SIZE      = 64
SCREEN_W      = 2560
SCREEN_H      = 1440
DEVICE        = torch.device('cuda' if torch.cuda.is_available() else 'cpu')


class GazeScreenDataset(Dataset):
    def __init__(self, images: np.ndarray, labels: np.ndarray, transform=None):
        self.images    = images
        self.labels    = labels
        self.transform = transform

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, idx):
        img = Image.fromarray(self.images[idx])
        if self.transform:
            img = self.transform(img)
        return img, torch.from_numpy(self.labels[idx])


class GazeEstimatorBoost(nn.Module):
    def __init__(self, dropout: float = 0.5, hidden: int = 256):
        super().__init__()
        bb  = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.DEFAULT)
        inf = bb.classifier[0].in_features
        bb.classifier = nn.Sequential(
            nn.Linear(inf, hidden),
            nn.Hardswish(),
            nn.Dropout(p=dropout),
            nn.Linear(hidden, 64),
            nn.Hardswish(),
            nn.Dropout(p=dropout * 0.6),
            nn.Linear(64, 2),
            nn.Sigmoid(),
        )
        self.net = bb

    def freeze_backbone(self):
        for p in self.net.features.parameters():
            p.requires_grad = False

    def unfreeze_backbone(self):
        for p in self.net.features.parameters():
            p.requires_grad = True

    def forward(self, x):
        return self.net(x)


def pixel_error(pred: torch.Tensor, tgt: torch.Tensor) -> float:
    dx = (pred[:, 0] - tgt[:, 0]) * SCREEN_W
    dy = (pred[:, 1] - tgt[:, 1]) * SCREEN_H
    return torch.sqrt(dx * dx + dy * dy).mean().item()


def main():
    print(f'BASE: {BASE}', flush=True)
    print(f'Cache: {CACHE_DIR}  exists={CACHE_DIR.exists()}', flush=True)
    print(f'Device: {DEVICE}', flush=True)
    if DEVICE.type == 'cuda':
        print(f'GPU: {torch.cuda.get_device_name(0)}', flush=True)

    tr_imgs = np.load(str(CACHE_DIR / 'train_eyes.npy'))
    tr_lbl  = np.load(str(CACHE_DIR / 'train_labels.npy'))
    va_imgs = np.load(str(CACHE_DIR / 'val_eyes.npy'))
    va_lbl  = np.load(str(CACHE_DIR / 'val_labels.npy'))
    print(f'Train {len(tr_lbl):,}  Val {len(va_lbl):,}', flush=True)

    mean = [0.485, 0.456, 0.406]
    std  = [0.229, 0.224, 0.225]
    tr_tf = transforms.Compose([
        transforms.RandomHorizontalFlip(),
        transforms.ColorJitter(brightness=0.4, contrast=0.4, saturation=0.3, hue=0.05),
        transforms.RandomGrayscale(p=0.05),
        transforms.RandomAffine(degrees=8, translate=(0.08, 0.08), scale=(0.92, 1.08)),
        transforms.RandomPerspective(distortion_scale=0.15, p=0.3),
        transforms.ToTensor(),
        transforms.Normalize(mean, std),
    ])
    va_tf = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize(mean, std),
    ])
    tr_ds = GazeScreenDataset(tr_imgs, tr_lbl, tr_tf)
    va_ds = GazeScreenDataset(va_imgs, va_lbl, va_tf)
    tr_ld = DataLoader(tr_ds, BATCH, shuffle=True,  num_workers=0, pin_memory=True)
    va_ld = DataLoader(va_ds, BATCH, shuffle=False, num_workers=0, pin_memory=True)

    idx = 1
    while (RUNS_DIR / f'run{idx}').exists():
        idx += 1
    run_dir = RUNS_DIR / f'run{idx}'
    run_dir.mkdir()
    print(f'Run: run{idx}', flush=True)

    model = GazeEstimatorBoost(dropout=0.5, hidden=256).to(DEVICE)
    model.freeze_backbone()
    criterion = nn.SmoothL1Loss()
    optimizer = optim.AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=LR_HEAD, weight_decay=WEIGHT_DECAY
    )
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=PHASE1_EPOCHS, eta_min=LR_HEAD * 0.1)
    scaler = torch.amp.GradScaler('cuda') if DEVICE.type == 'cuda' else None
    best_px   = float('inf')
    log_lines = ['epoch,train_loss,val_loss,val_px_err,lr,phase']
    phase     = 1

    print('=' * 70, flush=True)
    print('Phase 1: backbone frozen', flush=True)
    print('=' * 70, flush=True)
    for ep in range(1, PHASE1_EPOCHS + 1):
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
                pred = model(imgs)
                loss = criterion(pred, labels)
                vl += loss.item() * imgs.size(0)
                ap.append(pred.cpu())
                at.append(labels.cpu())
        vl /= len(va_ds)
        vp = pixel_error(torch.cat(ap), torch.cat(at))
        lr_now = optimizer.param_groups[0]['lr']
        scheduler.step()
        log_lines.append(f'{ep},{tl:.6f},{vl:.6f},{vp:.2f},{lr_now:.8f},{phase}')
        if vp < best_px:
            best_px = vp
            torch.save({'epoch': ep, 'model_state': model.state_dict(), 'val_px': vp}, str(run_dir / 'best.pt'))
        print(f'  Epoch {ep:3d}  TrainLoss {tl:.5f}  ValLoss {vl:.5f}  PxErr {vp:.1f}  LR {lr_now:.2e}', flush=True)
    print(f'Phase 1 완료. Best Val Px Error: {best_px:.1f} px', flush=True)

    model.unfreeze_backbone()
    optimizer = optim.AdamW(model.parameters(), lr=LR_FINETUNE, weight_decay=WEIGHT_DECAY)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(
        optimizer, T_max=EPOCHS - PHASE1_EPOCHS, eta_min=1e-7
    )
    if scaler:
        scaler = torch.amp.GradScaler('cuda')
    phase = 2
    last_best_epoch = PHASE1_EPOCHS
    print('=' * 70, flush=True)
    print('Phase 2: full fine-tune', flush=True)
    print('=' * 70, flush=True)
    for ep in range(PHASE1_EPOCHS + 1, EPOCHS + 1):
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
                pred = model(imgs)
                loss = criterion(pred, labels)
                vl += loss.item() * imgs.size(0)
                ap.append(pred.cpu())
                at.append(labels.cpu())
        vl /= len(va_ds)
        vp = pixel_error(torch.cat(ap), torch.cat(at))
        lr_now = optimizer.param_groups[0]['lr']
        scheduler.step()
        log_lines.append(f'{ep},{tl:.6f},{vl:.6f},{vp:.2f},{lr_now:.8f},{phase}')
        if vp < best_px:
            best_px = vp
            last_best_epoch = ep
            torch.save({'epoch': ep, 'model_state': model.state_dict(), 'val_px': vp}, str(run_dir / 'best.pt'))
        print(f'  Epoch {ep:3d}  TrainLoss {tl:.5f}  ValLoss {vl:.5f}  PxErr {vp:.1f}  LR {lr_now:.2e}', flush=True)
        if ep - last_best_epoch >= 15:
            print(f'Early stopping at epoch {ep}', flush=True)
            break
    print(f'Best Val Pixel Error: {best_px:.1f} px', flush=True)
    (run_dir / 'results.csv').write_text('\n'.join(log_lines), encoding='utf-8')

    # ONNX export
    ckpt = torch.load(str(run_dir / 'best.pt'), map_location=DEVICE)
    model.load_state_dict(ckpt['model_state'])
    model.eval()
    dummy = torch.randn(1, 3, IMG_SIZE, IMG_SIZE).to(DEVICE)
    onnx_path = str(run_dir / 'gaze_screen.onnx')
    torch.onnx.export(
        model, dummy, onnx_path, opset_version=17,
        input_names=['eye_image'], output_names=['screen_coords'],
        dynamic_axes={'eye_image': {0: 'batch'}, 'screen_coords': {0: 'batch'}},
    )
    print(f'ONNX 저장: {onnx_path}', flush=True)
    print(f'웹 데모 적용: copy "{run_dir / "gaze_screen.onnx"}" "web_demo/gaze_screen.onnx"', flush=True)


if __name__ == '__main__':
    main()
