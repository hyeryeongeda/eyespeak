# src/train_gaze.py
import os
import math
import argparse
import random
import numpy as np

import torch
import torch.nn.functional as F
from torch.utils.data import DataLoader
from torchvision import transforms
from tqdm import tqdm

from models import GazeRegressor
from datasets.mpiifacegaze import MPIIFaceGazeCSVDataset

IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD  = (0.229, 0.224, 0.225)

def set_seed(seed: int = 42):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)

def mae_angle_wrap(pred, y):
    """
    pred, y: (B,2) in radians
    yaw는 원형 값이라 wrap diff 사용, pitch는 abs diff
    """
    yaw_err = torch.abs(((pred[:, 0] - y[:, 0] + math.pi) % (2 * math.pi)) - math.pi)
    pit_err = torch.abs(pred[:, 1] - y[:, 1])
    return (yaw_err.mean() + pit_err.mean()).item() / 2.0

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--epochs", type=int, default=10)
    ap.add_argument("--batch", type=int, default=64)
    ap.add_argument("--lr", type=float, default=3e-4)
    ap.add_argument("--backbone", type=str, default="mobilenetv3_small_100")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--num_workers", type=int, default=0)  # Windows 안정성
    ap.add_argument("--out", type=str, default="checkpoints/gaze_best.pt")
    ap.add_argument("--train_csv", type=str, default="train_index.csv")
    ap.add_argument("--val_csv", type=str, default="val_index.csv")
    args = ap.parse_args()

    set_seed(args.seed)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print("[device]", device)

    tfm = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
    ])

    train_ds = MPIIFaceGazeCSVDataset("data/mpiifacegaze", args.train_csv, transform=tfm)
    val_ds   = MPIIFaceGazeCSVDataset("data/mpiifacegaze", args.val_csv, transform=tfm)

    train_loader = DataLoader(
        train_ds,
        batch_size=args.batch,
        shuffle=True,
        num_workers=args.num_workers,
        pin_memory=torch.cuda.is_available(),
    )
    val_loader = DataLoader(
        val_ds,
        batch_size=args.batch,
        shuffle=False,
        num_workers=args.num_workers,
        pin_memory=torch.cuda.is_available(),
    )

    model = GazeRegressor(backbone=args.backbone, pretrained=True).to(device)
    opt = torch.optim.AdamW(model.parameters(), lr=args.lr)

    best = 1e9
    os.makedirs(os.path.dirname(args.out) or ".", exist_ok=True)

    for epoch in range(1, args.epochs + 1):
        # ===== train =====
        model.train()
        pbar = tqdm(train_loader, desc=f"[train] epoch {epoch}/{args.epochs}")
        for x, y in pbar:
            x, y = x.to(device), y.to(device)
            pred = model(x)
            loss = F.smooth_l1_loss(pred, y)

            opt.zero_grad()
            loss.backward()
            opt.step()

            pbar.set_postfix(loss=float(loss.detach().cpu()))

        # ===== val =====
        model.eval()
        maes = []
        with torch.no_grad():
            for x, y in val_loader:
                x, y = x.to(device), y.to(device)
                pred = model(x)
                maes.append(mae_angle_wrap(pred, y))

        mae = sum(maes) / max(len(maes), 1)
        print(f"[val] mae_wrap={mae:.6f}")

        if mae < best:
            best = mae
            torch.save(model.state_dict(), args.out)
            print(f"  saved: {args.out}")

    print(f"[done] best mae_wrap={best:.6f} -> {args.out}")

if __name__ == "__main__":
    main()