"""시선 모델 학습 CLI (MobileGaze / L2CS-Net)."""

from __future__ import annotations

import argparse
import logging
import random
from pathlib import Path
from typing import List, Tuple

import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Subset

from eye_speak.iris_model.augmentation import build_eval_transform, build_train_augmentation
from eye_speak.iris_model.dataset import MPIIGazeDataset
from eye_speak.iris_model.model import L2CSNet, MobileGaze

logger = logging.getLogger(__name__)


def _split_indices(n: int, val_ratio: float = 0.2, seed: int = 42) -> Tuple[List[int], List[int]]:
    idx = list(range(n))
    random.seed(seed)
    random.shuffle(idx)
    if n <= 1:
        return idx, idx
    n_val = max(1, min(int(n * val_ratio), n - 1))
    val_idx = idx[:n_val]
    train_idx = idx[n_val:]
    return train_idx, val_idx


def _build_model(name: str, device: torch.device) -> nn.Module:
    name = name.lower().strip()
    if name == "l2cs":
        return L2CSNet().to(device)
    return MobileGaze().to(device)


def _image_size_for_model(name: str) -> Tuple[int, int]:
    return (224, 224) if name.lower() == "l2cs" else (64, 64)


def train_main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    p = argparse.ArgumentParser(description="Train gaze model (MPIIGaze layout)")
    p.add_argument("--model", type=str, default="mobilegaze", choices=["mobilegaze", "l2cs"])
    p.add_argument("--data_root", type=str, required=True)
    p.add_argument("--subject_id", type=int, default=1)
    p.add_argument("--epochs", type=int, default=20)
    p.add_argument("--batch_size", type=int, default=32)
    p.add_argument("--lr", type=float, default=1e-3)
    p.add_argument("--output_dir", type=str, default="checkpoints")
    args = p.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    size = _image_size_for_model(args.model)
    train_tf = build_train_augmentation(size)
    eval_tf = build_eval_transform(size)

    full = MPIIGazeDataset(args.data_root, args.subject_id, transform=train_tf)
    if len(full) == 0:
        logger.error("No samples found under %s / p%02d", args.data_root, args.subject_id)
        return

    tr_idx, va_idx = _split_indices(len(full))
    train_set = Subset(full, tr_idx)
    val_full = MPIIGazeDataset(args.data_root, args.subject_id, transform=eval_tf)
    val_set = Subset(val_full, va_idx)

    train_loader = DataLoader(
        train_set, batch_size=args.batch_size, shuffle=True, num_workers=0
    )
    val_loader = DataLoader(val_set, batch_size=args.batch_size, shuffle=False, num_workers=0)

    net = _build_model(args.model, device)
    opt = torch.optim.Adam(net.parameters(), lr=args.lr)
    loss_fn = nn.MSELoss()

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    best = float("inf")
    best_path = out_dir / f"{args.model}_best.pth"

    for epoch in range(args.epochs):
        net.train()
        running = 0.0
        n_batch = 0
        for xb, yb in train_loader:
            xb = xb.to(device)
            yb = yb.to(device)
            opt.zero_grad()
            yaw, pitch = net(xb)
            pred = torch.stack([yaw, pitch], dim=1)
            loss = loss_fn(pred, yb)
            loss.backward()
            opt.step()
            running += float(loss.item())
            n_batch += 1
        train_loss = running / max(n_batch, 1)

        net.eval()
        v_sum = 0.0
        v_n = 0
        with torch.no_grad():
            for xb, yb in val_loader:
                xb = xb.to(device)
                yb = yb.to(device)
                yaw, pitch = net(xb)
                pred = torch.stack([yaw, pitch], dim=1)
                v_sum += float(loss_fn(pred, yb).item())
                v_n += 1
        val_loss = v_sum / max(v_n, 1)
        logger.info(
            "epoch %s/%s train_loss=%.5f val_loss=%.5f",
            epoch + 1,
            args.epochs,
            train_loss,
            val_loss,
        )
        if val_loss < best:
            best = val_loss
            torch.save(net.state_dict(), best_path)
            logger.info("saved best -> %s", best_path)


if __name__ == "__main__":
    train_main()
