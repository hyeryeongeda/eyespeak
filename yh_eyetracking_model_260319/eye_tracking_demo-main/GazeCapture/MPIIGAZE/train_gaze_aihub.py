"""
Gaze Estimator — AI Hub 126 (스크린 좌표 예측)
================================================
Input  : 64×64 RGB eye crop
Output : (x_norm, y_norm) ∈ [0,1]  (screen coordinate)
Loss   : SmoothL1
Metric : 스크린 픽셀 유클리드 거리 (pixel error)

과적합 방지:
  - Phase 1 (epoch 1-20): 백본 동결, 헤드만 학습
  - Phase 2 (epoch 21+): 전체 fine-tune (작은 LR)

데이터: runs/aihub_cache/{train,val}_{eyes,labels}.npy
"""

import os, math, time
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms, models
from pathlib import Path

os.environ['PYTHONIOENCODING'] = 'utf-8'

BASE      = Path('C:/Users/SSAFY/Desktop/GAZE-CAPTURE/GazeCapture/MPIIGAZE')
CACHE_DIR = BASE / 'runs' / 'aihub_cache'
RUNS_DIR  = BASE / 'runs' / 'gaze_aihub'
RUNS_DIR.mkdir(parents=True, exist_ok=True)

EPOCHS        = 60
PHASE1_EPOCHS = 25   # freeze backbone, train head only
LR_HEAD       = 1e-3
LR_FINETUNE   = 5e-5
WEIGHT_DECAY  = 1e-3
BATCH         = 128
IMG_SIZE      = 64
SCREEN_W      = 2560   # matches normalization in build_aihub_cache.py
SCREEN_H      = 1440
DEVICE        = torch.device('cuda' if torch.cuda.is_available() else 'cpu')


# ── Dataset ───────────────────────────────────────────────────
class GazeScreenDataset(Dataset):
    def __init__(self, images: np.ndarray, labels: np.ndarray, transform=None):
        self.images    = images    # (N, H, W, 3) uint8
        self.labels    = labels    # (N, 2) float32
        self.transform = transform

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, idx):
        from PIL import Image as PILImage
        img = PILImage.fromarray(self.images[idx])
        if self.transform:
            img = self.transform(img)
        return img, torch.from_numpy(self.labels[idx])


# ── Model ─────────────────────────────────────────────────────
class GazeEstimator(nn.Module):
    """MobileNetV3-Small → (x_norm, y_norm)
    Phase 1: backbone frozen, head trained only
    Phase 2: full fine-tune
    """

    def __init__(self, dropout: float = 0.5):
        super().__init__()
        bb  = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.DEFAULT)
        inf = bb.classifier[0].in_features
        bb.classifier = nn.Sequential(
            nn.Linear(inf, 128),
            nn.Hardswish(),
            nn.Dropout(p=dropout),
            nn.Linear(128, 64),
            nn.Hardswish(),
            nn.Dropout(p=dropout * 0.6),
            nn.Linear(64, 2),
            nn.Sigmoid(),   # force output ∈ (0, 1)
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


# ── Pixel error metric ────────────────────────────────────────
def pixel_error(pred: torch.Tensor, tgt: torch.Tensor) -> float:
    """Mean Euclidean distance in pixels (1920×1080 denormalized)."""
    dx = (pred[:, 0] - tgt[:, 0]) * SCREEN_W
    dy = (pred[:, 1] - tgt[:, 1]) * SCREEN_H
    return torch.sqrt(dx * dx + dy * dy).mean().item()


# ── Training ──────────────────────────────────────────────────
def train():
    # Auto-increment run folder
    idx = 1
    while (RUNS_DIR / f'run{idx}').exists():
        idx += 1
    run_dir = RUNS_DIR / f'run{idx}'
    run_dir.mkdir()
    print(f'Run: run{idx}  Device: {DEVICE}', flush=True)

    # Load cache
    print('Loading cache...', flush=True)
    tr_imgs = np.load(str(CACHE_DIR / 'train_eyes.npy'))
    tr_lbl  = np.load(str(CACHE_DIR / 'train_labels.npy'))
    va_imgs = np.load(str(CACHE_DIR / 'val_eyes.npy'))
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

    tr_ds = GazeScreenDataset(tr_imgs, tr_lbl, tr_tf)
    va_ds = GazeScreenDataset(va_imgs, va_lbl, va_tf)
    tr_ld = DataLoader(tr_ds, BATCH, shuffle=True,  num_workers=0, pin_memory=True)
    va_ld = DataLoader(va_ds, BATCH, shuffle=False, num_workers=0, pin_memory=True)

    model = GazeEstimator(dropout=0.5).to(DEVICE)
    total_params     = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f'Model: MobileNetV3-Small ({total_params/1e6:.2f}M total)', flush=True)

    # Phase 1: freeze backbone
    model.freeze_backbone()
    trainable_phase1 = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f'Phase 1 ({PHASE1_EPOCHS} epochs): backbone frozen, {trainable_phase1/1e3:.0f}K trainable params', flush=True)

    criterion = nn.SmoothL1Loss()
    optimizer = optim.AdamW(
        filter(lambda p: p.requires_grad, model.parameters()),
        lr=LR_HEAD, weight_decay=WEIGHT_DECAY
    )
    scheduler = optim.lr_scheduler.CosineAnnealingLR(
        optimizer, T_max=PHASE1_EPOCHS, eta_min=LR_HEAD * 0.1
    )
    scaler    = torch.amp.GradScaler('cuda') if DEVICE.type == 'cuda' else None

    best_px   = float('inf')
    log_lines = ['epoch,train_loss,val_loss,val_px_err,lr,phase']
    phase     = 1

    print('=' * 75, flush=True)
    print(f'{"Epoch":>6}  {"TrainLoss":>10}  {"ValLoss":>9}  {"PxError":>9}  {"LR":>10}  {"Phase":>5}', flush=True)
    print('-' * 75, flush=True)

    for ep in range(1, EPOCHS + 1):
        # Phase transition
        if ep == PHASE1_EPOCHS + 1 and phase == 1:
            phase = 2
            model.unfreeze_backbone()
            trainable_p2 = sum(p.numel() for p in model.parameters() if p.requires_grad)
            print(f'\n--- Phase 2: full fine-tune ({trainable_p2/1e6:.2f}M params, lr={LR_FINETUNE}) ---', flush=True)
            optimizer = optim.AdamW(model.parameters(), lr=LR_FINETUNE, weight_decay=WEIGHT_DECAY)
            scheduler = optim.lr_scheduler.CosineAnnealingLR(
                optimizer, T_max=EPOCHS - PHASE1_EPOCHS, eta_min=1e-7
            )
            if scaler:
                scaler = torch.amp.GradScaler('cuda')

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
        vl = 0.0; ap, at = [], []
        with torch.no_grad():
            for imgs, labels in va_ld:
                imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
                if scaler:
                    with torch.amp.autocast('cuda'):
                        pred = model(imgs); loss = criterion(pred, labels)
                else:
                    pred = model(imgs); loss = criterion(pred, labels)
                vl += loss.item() * imgs.size(0)
                ap.append(pred.cpu()); at.append(labels.cpu())
        vl /= len(va_ds)
        vp = pixel_error(torch.cat(ap), torch.cat(at))
        lr_now = optimizer.param_groups[0]['lr']
        scheduler.step()

        print(f'{ep:>6}  {tl:>10.5f}  {vl:>9.5f}  {vp:>9.1f}  {lr_now:>10.7f}  {phase:>5}', flush=True)
        log_lines.append(f'{ep},{tl:.6f},{vl:.6f},{vp:.2f},{lr_now:.8f},{phase}')

        if vp < best_px:
            best_px = vp
            torch.save({
                'epoch': ep, 'model_state': model.state_dict(),
                'val_px': vp, 'val_loss': vl,
            }, str(run_dir / 'best.pt'))

        # Early stopping: phase 2에서 15 에포크 개선 없으면 종료
        if phase == 2 and ep > PHASE1_EPOCHS + 15:
            recent = [float(l.split(',')[3]) for l in log_lines[-16:] if ',' in l]
            if len(recent) >= 15 and min(recent[:-1]) <= recent[-1]:
                consecutive = sum(1 for x in recent[-15:] if x >= min(recent))
                if consecutive >= 15:
                    print(f'Early stopping at epoch {ep}', flush=True)
                    break

    print('=' * 65, flush=True)
    print(f'Best Val Pixel Error: {best_px:.1f} px', flush=True)
    (run_dir / 'results.csv').write_text('\n'.join(log_lines), encoding='utf-8')

    # ONNX export
    print('Exporting ONNX...', flush=True)
    ckpt = torch.load(str(run_dir / 'best.pt'), map_location=DEVICE)
    model.load_state_dict(ckpt['model_state'])
    model.eval()
    dummy     = torch.randn(1, 3, IMG_SIZE, IMG_SIZE).to(DEVICE)
    onnx_path = str(run_dir / 'gaze_screen.onnx')
    torch.onnx.export(
        model, dummy, onnx_path, opset_version=17,
        input_names=['eye_image'], output_names=['screen_coords'],
        dynamic_axes={'eye_image': {0: 'batch'}, 'screen_coords': {0: 'batch'}},
    )
    size_mb = Path(onnx_path).stat().st_size / 1e6
    print(f'ONNX saved: {onnx_path} ({size_mb:.1f} MB)', flush=True)
    print('DONE', flush=True)


if __name__ == '__main__':
    train()
