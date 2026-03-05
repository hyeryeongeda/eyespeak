import os
import torch
import torch.nn.functional as F
from torch.utils.data import DataLoader
from torchvision import transforms
from tqdm import tqdm

from models import BlinkClassifier
from datasets.rtbene import RTBeneDataset

def main():
    device = "cuda" if torch.cuda.is_available() else "cpu"

    tfm = transforms.Compose([
        transforms.Resize((128, 128)),
        transforms.ToTensor(),
    ])

    train_ds = RTBeneDataset("./data/rtbene", "train_blink_labels.csv", transform=tfm)
    val_ds   = RTBeneDataset("./data/rtbene", "val_blink_labels.csv", transform=tfm)
    train_loader = DataLoader(train_ds, batch_size=64, shuffle=True, num_workers=0)
    val_loader   = DataLoader(val_ds, batch_size=64, shuffle=False, num_workers=0)

    model = BlinkClassifier().to(device)
    opt = torch.optim.AdamW(model.parameters(), lr=3e-4)

    best = 0.0
    for epoch in range(1, 11):
        model.train()
        pbar = tqdm(train_loader, desc=f"[train] epoch {epoch}")
        for x, y in pbar:
            x, y = x.to(device), y.to(device)
            logits = model(x)
            loss = F.binary_cross_entropy_with_logits(logits, y)
            opt.zero_grad()
            loss.backward()
            opt.step()
            pbar.set_postfix(loss=float(loss))

        # val accuracy
        model.eval()
        correct = 0
        total = 0
        with torch.no_grad():
            for x, y in val_loader:
                x, y = x.to(device), y.to(device)
                prob = torch.sigmoid(model(x))
                pred = (prob > 0.5).float()
                correct += (pred == y).sum().item()
                total += y.numel()
        acc = correct / max(total, 1)
        print(f"[val] acc={acc:.4f}")

        if acc > best:
            best = acc
            os.makedirs("checkpoints", exist_ok=True)
            torch.save(model.state_dict(), "checkpoints/blink_best.pt")
            print("  saved: checkpoints/blink_best.pt")

if __name__ == "__main__":
    main()