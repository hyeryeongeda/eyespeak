from pathlib import Path
import pandas as pd
from PIL import Image
import torch
from torch.utils.data import Dataset

class RTBeneDataset(Dataset):
    """
    Zenodo RT-BENE:
      - images: extracted eye patches (png/jpg)
      - csv: (image_filename, label) label: 0.0 open, 1.0 blink, 0.5 discard
    """
    def __init__(self, root: str, split_csv: str, transform=None):
        self.root = Path(root)
        self.transform = transform
        df = pd.read_csv(self.root / split_csv)

        # expect columns: [filename, label]
        df = df.rename(columns={df.columns[0]: "fname", df.columns[1]: "label"})
        df = df[df["label"] != 0.5].reset_index(drop=True)  # discard disagreements
        self.items = df.to_dict("records")

    def __len__(self):
        return len(self.items)

    def __getitem__(self, idx):
        it = self.items[idx]
        img_path = self.root / it["fname"]
        img = Image.open(img_path).convert("RGB")
        y = float(it["label"])  # 0 or 1
        if self.transform:
            img = self.transform(img)
        return img, torch.tensor([y], dtype=torch.float32)