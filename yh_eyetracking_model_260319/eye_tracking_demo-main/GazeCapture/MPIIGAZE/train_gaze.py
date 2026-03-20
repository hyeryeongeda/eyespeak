"""
MobileNetV3-Small Gaze Estimation Training — MPIIGaze Normalized
=================================================================
Input  : 64x64 RGB eye crop (from 36x60 grayscale, upscaled + 3-channel)
Output : (yaw, pitch) in radians
Loss   : SmoothL1 + Mean Angular Error metric
Split  : p00-p11 train, p12-p14 val (person-based)
GPU    : RTX 4050

Usage:
    python train_gaze.py
"""

import os, math, time
from pathlib import Path

os.environ['PYTHONIOENCODING'] = 'utf-8'

import numpy as np
import scipy.io as sio
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, TensorDataset
from torchvision import transforms, models

# ── Paths ─────────────────────────────────────────────────────
BASE_DIR  = Path('C:/Users/SSAFY/Desktop/GAZE-CAPTURE/GazeCapture/MPIIGAZE')
DATA_DIR  = BASE_DIR / 'MPIIGaze' / 'Data' / 'Normalized'
RUNS_DIR  = BASE_DIR / 'runs' / 'gaze'
CACHE_DIR = BASE_DIR / 'runs' / 'gaze_cache'
RUNS_DIR.mkdir(parents=True, exist_ok=True)
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# ── Hyperparameters ───────────────────────────────────────────
EPOCHS       = 30
BATCH        = 256
LR           = 3e-4
WEIGHT_DECAY = 1e-4
IMG_SIZE     = 64
WORKERS      = 0    # 0 = main process only (Windows safe for large in-memory data)
DEVICE       = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

TRAIN_PERSONS = {f'p{i:02d}' for i in range(12)}    # p00-p11
VAL_PERSONS   = {f'p{i:02d}' for i in range(12, 15)} # p12-p14


# ── Cache builder ─────────────────────────────────────────────
def build_cache(data_dir: Path, persons: set, prefix: str) -> tuple:
    """
    Reads all .mat files for `persons`, pre-resizes to IMG_SIZE×IMG_SIZE,
    converts to uint8 RGB, caches to .npy if not already cached.
    Returns (images: uint8 ndarray N×H×W×3, labels: float32 ndarray N×2)
    """
    from PIL import Image as PILImage

    cache_img = CACHE_DIR / f'{prefix}_images.npy'
    cache_lbl = CACHE_DIR / f'{prefix}_labels.npy'

    if cache_img.exists() and cache_lbl.exists():
        print(f'  Loading cache: {prefix} ...')
        images = np.load(str(cache_img))
        labels = np.load(str(cache_lbl))
        return images, labels

    print(f'  Building cache: {prefix} ...')
    all_imgs   = []
    all_labels = []

    sides = ['right', 'left']
    for person_dir in sorted(data_dir.iterdir()):
        if person_dir.name not in persons:
            continue
        mat_files = sorted(person_dir.glob('*.mat'))
        for mat_file in mat_files:
            try:
                d    = sio.loadmat(str(mat_file))
                data = d['data']
                for s in sides:
                    obj   = data[0, 0][s][0, 0]
                    imgs  = obj['image']   # (N, 36, 60) uint8
                    gaze  = obj['gaze']    # (N, 3) float64
                    N = imgs.shape[0]
                    gx, gy, gz = gaze[:, 0], gaze[:, 1], gaze[:, 2]
                    yaw   = np.arctan2(gx, -gz).astype(np.float32)
                    pitch = np.arctan2(-gy, np.sqrt(gx**2 + gz**2)).astype(np.float32)
                    for i in range(N):
                        pil = PILImage.fromarray(imgs[i], mode='L').resize(
                            (IMG_SIZE, IMG_SIZE), PILImage.BILINEAR).convert('RGB')
                        all_imgs.append(np.array(pil, dtype=np.uint8))
                        all_labels.append([yaw[i], pitch[i]])
            except Exception as e:
                print(f'    Skip {mat_file.name}: {e}')
                continue

    images = np.stack(all_imgs, axis=0)
    labels = np.array(all_labels, dtype=np.float32)
    np.save(str(cache_img), images)
    np.save(str(cache_lbl), labels)
    print(f'    Saved: {images.shape}, {labels.shape}')
    return images, labels


# ── Dataset ───────────────────────────────────────────────────
class GazeDataset(Dataset):
    """Wraps pre-loaded numpy arrays with augmentation transforms."""

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
    """MobileNetV3-Small backbone -> (yaw, pitch)"""

    def __init__(self, dropout=0.3):
        super().__init__()
        backbone = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.DEFAULT)
        in_features = backbone.classifier[0].in_features   # 576
        backbone.classifier = nn.Sequential(
            nn.Linear(in_features, 256),
            nn.Hardswish(),
            nn.Dropout(p=dropout),
            nn.Linear(256, 2),
        )
        self.net = backbone

    def forward(self, x):
        return self.net(x)


# ── Angular error metric ──────────────────────────────────────
def mean_angular_error_deg(pred: torch.Tensor, target: torch.Tensor) -> float:
    """Mean angular error in degrees (yaw/pitch -> 3D unit vector comparison)."""
    def to_vec(a):
        y, p = a[:, 0], a[:, 1]
        return torch.stack([torch.cos(p)*torch.sin(y),
                            torch.sin(p),
                            torch.cos(p)*torch.cos(y)], dim=1)
    cos = (to_vec(pred) * to_vec(target)).sum(dim=1).clamp(-1, 1)
    return torch.acos(cos).mean().item() * (180 / math.pi)


# ── Training ──────────────────────────────────────────────────
def train():
    # Auto-increment run folder
    idx = 1
    while (RUNS_DIR / f'run{idx}').exists():
        idx += 1
    run_dir = RUNS_DIR / f'run{idx}'
    run_dir.mkdir(parents=True)
    print(f'Run        : run{idx}')
    print(f'Device     : {DEVICE}')

    # ── Load / build cache ────────────────────────────────────
    print('\nLoading dataset...')
    t0 = time.time()
    tr_imgs, tr_lbl = build_cache(DATA_DIR, TRAIN_PERSONS, 'train')
    va_imgs, va_lbl = build_cache(DATA_DIR, VAL_PERSONS,   'val')
    print(f'  Train : {len(tr_lbl):,} | Val: {len(va_lbl):,}  ({time.time()-t0:.1f}s)')

    # ── Transforms ───────────────────────────────────────────
    mean = [0.485, 0.456, 0.406]
    std  = [0.229, 0.224, 0.225]
    train_tf = transforms.Compose([
        transforms.RandomHorizontalFlip(),
        transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.2),
        transforms.RandomAffine(degrees=5, translate=(0.05, 0.05)),
        transforms.ToTensor(),
        transforms.Normalize(mean, std),
    ])
    val_tf = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize(mean, std),
    ])

    train_ds = GazeDataset(tr_imgs, tr_lbl, transform=train_tf)
    val_ds   = GazeDataset(va_imgs, va_lbl, transform=val_tf)

    train_loader = DataLoader(train_ds, batch_size=BATCH, shuffle=True,
                              num_workers=WORKERS, pin_memory=True)
    val_loader   = DataLoader(val_ds,   batch_size=BATCH, shuffle=False,
                              num_workers=WORKERS, pin_memory=True)

    # ── Model ─────────────────────────────────────────────────
    model = GazeEstimator(dropout=0.3).to(DEVICE)
    params = sum(p.numel() for p in model.parameters())
    print(f'\nModel      : MobileNetV3-Small ({params/1e6:.2f}M params)')
    print(f'Epochs     : {EPOCHS}  |  Batch: {BATCH}  |  LR: {LR}')

    criterion = nn.SmoothL1Loss()
    optimizer = optim.AdamW(model.parameters(), lr=LR, weight_decay=WEIGHT_DECAY)
    scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=EPOCHS, eta_min=1e-6)
    scaler    = torch.amp.GradScaler('cuda') if DEVICE.type == 'cuda' else None

    best_mae  = float('inf')
    log_lines = ['epoch,train_loss,val_loss,val_mae_deg,lr']

    print('=' * 65)
    print(f'{"Epoch":>6}  {"Train Loss":>10}  {"Val Loss":>9}  {"Val MAE(deg)":>12}  {"LR":>9}')
    print('-' * 65)

    for epoch in range(1, EPOCHS + 1):
        # ── Train ─────────────────────────────────────────────
        model.train()
        train_loss = 0.0
        for imgs, labels in train_loader:
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
            train_loss += loss.item() * imgs.size(0)
        train_loss /= len(train_ds)

        # ── Validate ──────────────────────────────────────────
        model.eval()
        val_loss  = 0.0
        all_pred, all_target = [], []
        with torch.no_grad():
            for imgs, labels in val_loader:
                imgs, labels = imgs.to(DEVICE), labels.to(DEVICE)
                if scaler:
                    with torch.amp.autocast('cuda'):
                        pred = model(imgs)
                        loss = criterion(pred, labels)
                else:
                    pred = model(imgs)
                    loss = criterion(pred, labels)
                val_loss += loss.item() * imgs.size(0)
                all_pred.append(pred.cpu())
                all_target.append(labels.cpu())
        val_loss /= len(val_ds)

        all_pred   = torch.cat(all_pred)
        all_target = torch.cat(all_target)
        val_mae    = mean_angular_error_deg(all_pred, all_target)
        lr_now     = scheduler.get_last_lr()[0]
        scheduler.step()

        print(f'{epoch:>6}  {train_loss:>10.5f}  {val_loss:>9.5f}  {val_mae:>12.3f}  {lr_now:>9.6f}')
        log_lines.append(f'{epoch},{train_loss:.6f},{val_loss:.6f},{val_mae:.4f},{lr_now:.7f}')

        if val_mae < best_mae:
            best_mae = val_mae
            torch.save({
                'epoch': epoch,
                'model_state': model.state_dict(),
                'val_mae': val_mae,
                'val_loss': val_loss,
            }, str(run_dir / 'best.pt'))

    print('=' * 65)
    print(f'Best Val MAE : {best_mae:.3f} deg')
    print(f'Checkpoint   : {run_dir / "best.pt"}')
    (run_dir / 'results.csv').write_text('\n'.join(log_lines), encoding='utf-8')

    # ── Export to ONNX ────────────────────────────────────────
    print('\nExporting to ONNX...')
    ckpt = torch.load(str(run_dir / 'best.pt'), map_location=DEVICE)
    model.load_state_dict(ckpt['model_state'])
    model.eval()
    dummy = torch.randn(1, 3, IMG_SIZE, IMG_SIZE).to(DEVICE)
    onnx_path = run_dir / 'gaze_estimator.onnx'
    torch.onnx.export(
        model, dummy, str(onnx_path),
        opset_version=17,
        input_names=['eye_image'],
        output_names=['gaze_angles'],
        dynamic_axes={'eye_image': {0: 'batch'}, 'gaze_angles': {0: 'batch'}},
    )
    size_mb = os.path.getsize(str(onnx_path)) / 1e6
    print(f'  Saved: {onnx_path}  ({size_mb:.2f} MB)')
    print('\nTraining complete.')


if __name__ == '__main__':
    train()
