from pathlib import Path
import pandas as pd
from PIL import Image
import torch
from torch.utils.data import Dataset

class MPIIFaceGazeCSVDataset(Dataset):
    def __init__(self, root: str, index_csv: str, transform=None):
        self.root = Path(root)
        self.df = pd.read_csv(self.root / index_csv)
        self.transform = transform

    def __len__(self):
        return len(self.df)

    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        img = Image.open(self.root / row["img_path"]).convert("RGB")
        y = torch.tensor([row["yaw"], row["pitch"]], dtype=torch.float32)
        if self.transform:
            img = self.transform(img)
        return img, y