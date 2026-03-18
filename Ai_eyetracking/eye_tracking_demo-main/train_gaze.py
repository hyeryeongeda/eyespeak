"""
train_gaze.py
=============
Training script for GazeRegressor on the GazeCapture dataset.

Features
--------
• Mixed-precision (AMP) training for faster GPU throughput
• Cosine-annealing LR schedule with AdamW optimiser
• SmoothL1 (Huber) loss – robust to label noise in crowdsourced data
• Per-epoch validation with Euclidean MAE in centimetres
• Automatic best-model checkpointing + resume support
• Compact progress output: one line per epoch

Usage
-----
  # iPhone-only, 8 data workers, AMP
  python train_gaze.py /path/to/gazecapture \\
      --iphone_only --workers 8 --epochs 60 --batch_size 256

  # Resume from a previous run
  python train_gaze.py /path/to/gazecapture --resume checkpoints/last.pt

  # Use cached index for faster startup
  python train_gaze.py /path/to/gazecapture \\
      --cache_dir ./cache --iphone_only

Metric
------
Primary metric: Euclidean distance (cm) between predicted and true gaze
point in the camera-centred coordinate space (GazeCapture XCam/YCam).
The original iTracker paper reports ~1.71 cm on the test set (iPhone);
our model is leaner so expect ~2-3 cm without face crops as additional input.
"""

import argparse
import math
import time
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from gaze_model   import GazeRegressor
from gaze_dataset import GazeCaptureDataset


# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------

def evaluate(
    model:     nn.Module,
    loader:    DataLoader,
    device:    torch.device,
    criterion: nn.Module,
) -> tuple[float, float]:
    """
    Returns
    -------
    (mean_loss, mean_euclidean_mae_cm)
    """
    model.eval()
    total_loss = 0.0
    total_dist = 0.0
    n = 0

    with torch.no_grad():
        for le, re, pose, label in loader:
            le    = le.to(device,    non_blocking=True)
            re    = re.to(device,    non_blocking=True)
            pose  = pose.to(device,  non_blocking=True)
            label = label.to(device, non_blocking=True)

            pred = model(le, re, pose)            # (B, 2)
            total_loss += criterion(pred, label).item() * le.size(0)

            # Euclidean distance in centimetres (per sample)
            total_dist += torch.norm(pred - label, dim=1).sum().item()
            n += le.size(0)

    return total_loss / n, total_dist / n


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Train GazeRegressor on GazeCapture",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )

    # Paths
    parser.add_argument("dataset_path", type=Path,
                        help="Root of the GazeCapture dataset")
    parser.add_argument("--output_dir", type=Path, default=Path("./checkpoints"),
                        help="Directory for saved checkpoints")
    parser.add_argument("--cache_dir", type=Path, default=None,
                        help="Directory for dataset index cache files "
                             "(speeds up repeated starts)")
    parser.add_argument("--resume", type=Path, default=None,
                        help="Checkpoint path to resume training from")

    # Data
    parser.add_argument("--eye_size", type=int, nargs=2, default=[64, 64],
                        metavar=("H", "W"),
                        help="Resize target for eye-crop images")
    parser.add_argument("--iphone_only", action="store_true",
                        help="Use only iPhone recordings (recommended for AAC)")
    parser.add_argument("--workers", type=int, default=4,
                        help="DataLoader worker processes")

    # Training hyper-parameters
    parser.add_argument("--epochs",     type=int,   default=60)
    parser.add_argument("--batch_size", type=int,   default=256)
    parser.add_argument("--lr",         type=float, default=1e-3,
                        help="Initial learning rate for AdamW")
    parser.add_argument("--weight_decay", type=float, default=1e-4)
    parser.add_argument("--lr_min",     type=float, default=1e-6,
                        help="Minimum LR at end of cosine schedule")
    parser.add_argument("--warmup_epochs", type=int, default=3,
                        help="Linear LR warm-up epochs before cosine decay")

    # Model
    parser.add_argument("--eye_features",  type=int, default=128,
                        help="Feature dim per eye branch")
    parser.add_argument("--pose_features", type=int, default=32,
                        help="Feature dim of head-pose branch")
    parser.add_argument("--no_shared_eye", action="store_true",
                        help="Separate weights for left/right eye encoders")
    parser.add_argument("--no_pretrained", action="store_true",
                        help="Train MobileNetV3 backbone from scratch")
    parser.add_argument("--no_amp", action="store_true",
                        help="Disable automatic mixed precision (AMP)")

    args = parser.parse_args()

    # ------------------------------------------------------------------
    # Setup
    # ------------------------------------------------------------------
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    use_amp = not args.no_amp and device.type == "cuda"

    args.output_dir.mkdir(parents=True, exist_ok=True)

    eye_size = tuple(args.eye_size)

    print("=" * 62)
    print("  GazeRegressor training")
    print("=" * 62)
    print(f"  Device      : {device}  (AMP={use_amp})")
    print(f"  Dataset     : {args.dataset_path}")
    print(f"  iPhone only : {args.iphone_only}")
    print(f"  Eye size    : {eye_size}")
    print(f"  Batch size  : {args.batch_size}  |  Epochs: {args.epochs}")
    print(f"  LR          : {args.lr}  →  {args.lr_min}  (cosine)")
    print()

    # ------------------------------------------------------------------
    # Datasets & loaders
    # ------------------------------------------------------------------
    def _cache(split: str) -> "Path | None":
        if args.cache_dir is None:
            return None
        tag = "iphone" if args.iphone_only else "all"
        return args.cache_dir / f"index_{split}_{tag}.pkl"

    train_ds = GazeCaptureDataset(
        args.dataset_path,
        split="train",
        eye_size=eye_size,
        iphone_only=args.iphone_only,
        transform=GazeCaptureDataset.augment_transform(eye_size),
        cache_file=_cache("train"),
    )
    val_ds = GazeCaptureDataset(
        args.dataset_path,
        split="val",
        eye_size=eye_size,
        iphone_only=args.iphone_only,
        # No augmentation for validation
        cache_file=_cache("val"),
    )

    if len(train_ds) == 0:
        raise RuntimeError(
            "Training dataset is empty. "
            "Check --dataset_path and ensure data was downloaded."
        )

    train_loader = DataLoader(
        train_ds,
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=args.workers,
        pin_memory=True,
        persistent_workers=args.workers > 0,
        drop_last=True,
    )
    val_loader = DataLoader(
        val_ds,
        batch_size=args.batch_size * 2,
        shuffle=False,
        num_workers=args.workers,
        pin_memory=True,
        persistent_workers=args.workers > 0,
    )

    # ------------------------------------------------------------------
    # Model
    # ------------------------------------------------------------------
    model = GazeRegressor(
        eye_out_features=args.eye_features,
        pose_out_features=args.pose_features,
        pretrained=not args.no_pretrained,
        shared_eye_weights=not args.no_shared_eye,
    ).to(device)

    print(f"  Trainable params: {model.count_parameters():,}")
    print()

    # ------------------------------------------------------------------
    # Loss, optimiser, scheduler
    # ------------------------------------------------------------------
    # SmoothL1 / Huber loss: behaves as L2 for small errors,
    # L1 for large errors → more robust to occasional bad detections.
    criterion = nn.SmoothL1Loss(reduction="mean", beta=1.0)

    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=args.lr,
        weight_decay=args.weight_decay,
    )

    # Cosine schedule with linear warm-up
    def lr_lambda(epoch: int) -> float:
        if epoch < args.warmup_epochs:
            return (epoch + 1) / max(1, args.warmup_epochs)
        progress = (epoch - args.warmup_epochs) / max(
            1, args.epochs - args.warmup_epochs
        )
        return args.lr_min / args.lr + (1 - args.lr_min / args.lr) * (
            0.5 * (1 + math.cos(math.pi * progress))
        )

    scheduler = torch.optim.lr_scheduler.LambdaLR(optimizer, lr_lambda)

    scaler = torch.amp.GradScaler("cuda", enabled=use_amp)

    # ------------------------------------------------------------------
    # Optionally resume
    # ------------------------------------------------------------------
    start_epoch    = 0
    best_val_mae   = float("inf")

    if args.resume and args.resume.exists():
        ckpt = torch.load(args.resume, map_location=device)
        model.load_state_dict(ckpt["model"])
        optimizer.load_state_dict(ckpt["optimizer"])
        scheduler.load_state_dict(ckpt["scheduler"])
        scaler.load_state_dict(ckpt["scaler"])
        start_epoch  = ckpt["epoch"] + 1
        best_val_mae = ckpt.get("best_val_mae", float("inf"))
        print(
            f"  Resumed from {args.resume}  "
            f"(epoch {start_epoch}, best MAE={best_val_mae:.2f} cm)"
        )
        print()

    # ------------------------------------------------------------------
    # Training loop
    # ------------------------------------------------------------------
    print(
        f"{'Epoch':>6}  {'TrainLoss':>9}  {'ValLoss':>8}  "
        f"{'ValMAE(cm)':>10}  {'LR':>9}  {'Time(s)':>7}"
    )
    print("-" * 62)

    for epoch in range(start_epoch, args.epochs):
        model.train()
        epoch_loss = 0.0
        t0 = time.time()

        for le, re, pose, label in train_loader:
            le    = le.to(device,    non_blocking=True)
            re    = re.to(device,    non_blocking=True)
            pose  = pose.to(device,  non_blocking=True)
            label = label.to(device, non_blocking=True)

            optimizer.zero_grad(set_to_none=True)

            with torch.amp.autocast("cuda", enabled=use_amp):
                pred = model(le, re, pose)
                loss = criterion(pred, label)

            scaler.scale(loss).backward()

            # Gradient clipping prevents exploding gradients during warm-up
            scaler.unscale_(optimizer)
            nn.utils.clip_grad_norm_(model.parameters(), max_norm=5.0)

            scaler.step(optimizer)
            scaler.update()

            epoch_loss += loss.item()

        scheduler.step()

        # ---- Validation ----
        val_loss, val_mae = evaluate(model, val_loader, device, criterion)

        avg_train_loss = epoch_loss / len(train_loader)
        lr_now = scheduler.get_last_lr()[0]
        elapsed = time.time() - t0

        print(
            f"{epoch+1:>6}  {avg_train_loss:>9.4f}  {val_loss:>8.4f}  "
            f"{val_mae:>10.2f}  {lr_now:>9.2e}  {elapsed:>7.1f}"
        )

        # ---- Checkpointing ----
        ckpt = {
            "epoch":        epoch,
            "model":        model.state_dict(),
            "optimizer":    optimizer.state_dict(),
            "scheduler":    scheduler.state_dict(),
            "scaler":       scaler.state_dict(),
            "val_mae":      val_mae,
            "best_val_mae": best_val_mae,
            "args":         vars(args),
        }
        torch.save(ckpt, args.output_dir / "last.pt")

        if val_mae < best_val_mae:
            best_val_mae = val_mae
            ckpt["best_val_mae"] = best_val_mae
            torch.save(ckpt, args.output_dir / "best.pt")
            print(f"  ★ New best  val MAE = {best_val_mae:.2f} cm  →  best.pt")

    print("-" * 62)
    print(f"  Training complete.  Best val MAE = {best_val_mae:.2f} cm")
    print(f"  Checkpoints saved to {args.output_dir}")


if __name__ == "__main__":
    main()
