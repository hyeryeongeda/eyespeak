# src/train_gaze.py
import os
import math
import torch
import torch.nn.functional as F
from torch.utils.data import DataLoader
from torchvision import transforms
from tqdm import tqdm

from models import GazeRegressor
from datasets.mpiifacegaze import MPIIFaceGazeCSVDataset

def mae_angle_wrap(pred, y):
    """
    pred, y: (B,2) in radians
    yaw는 [-pi, pi] 원형 값이라 wrap diff 사용
    pitch는 일반 abs diff
    """
    yaw_err = torch.abs(((pred[:, 0] - y[:, 0] + math.pi) % (2 * math.pi)) - math.pi)
    pit_err = torch.abs(pred[:, 1] - y[:, 1])
    return (yaw_err.mean() + pit_err.mean()).item() / 2.0

def main():
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print("[device]", device)

    tfm = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
    ])

    train_ds = MPIIFaceGazeCSVDataset("data/mpiifacegaze", "train_index.csv", transform=tfm)
    val_ds   = MPIIFaceGazeCSVDataset("data/mpiifacegaze", "val_index.csv", transform=tfm)

    # ✅ Windows 안정성: 일단 0 권장 (필요하면 2로 올려도 됨)
    train_loader = DataLoader(train_ds, batch_size=64, shuffle=True, num_workers=0)
    val_loader   = DataLoader(val_ds, batch_size=64, shuffle=False, num_workers=0)

    model = GazeRegressor().to(device)
    opt = torch.optim.AdamW(model.parameters(), lr=3e-4)

    best = 1e9
    for epoch in range(1, 11):
        model.train()
        pbar = tqdm(train_loader, desc=f"[train] epoch {epoch}")
        for x, y in pbar:
            x, y = x.to(device), y.to(device)
            pred = model(x)
            loss = F.smooth_l1_loss(pred, y)

            opt.zero_grad()
            loss.backward()
            opt.step()

            # ✅ warning 제거
            pbar.set_postfix(loss=float(loss.detach().cpu()))

        # val MAE (wrap)
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
            os.makedirs("checkpoints", exist_ok=True)
            torch.save(model.state_dict(), "checkpoints/gaze_best.pt")
            print("  saved: checkpoints/gaze_best.pt")

if __name__ == "__main__":
    main()