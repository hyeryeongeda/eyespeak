"""
gaze_dataset.py
===============
PyTorch Dataset that reads GazeCapture recording directories and yields
per-frame (left_eye_crop, right_eye_crop, head_pose, label) tuples.

Ground-truth labels
-------------------
  XCam, YCam  from dotInfo.json
    → position of the calibration dot in centimetres, relative to the
      device camera centre (same coordinate space the model should predict).

Head-pose proxy
---------------
True 3-D head pose is not stored in GazeCapture.  We derive a lightweight
3-vector proxy from the face bounding-box geometry:

  yaw   = (face_cx - frame_cx) / (frame_w / 2)   ∈ [-1, 1]
  pitch = (face_cy - frame_cy) / (frame_h / 2)   ∈ [-1, 1]
  scale = (face_w × face_h)   / (frame_w × frame_h) ∈ [0, 1]

This is intentionally simple so the model learns a cheap estimate that
can be replaced at inference time with proper 6-DoF pose from e.g.
MediaPipe Face Mesh or 6DRepNet (keeping the same [-1,1]/[0,1] ranges).

Index caching
-------------
Scanning 1 474 subject directories at every startup is slow.
Pass `cache_file` to save/load the pre-built sample list as a pickle.

Usage
-----
  ds = GazeCaptureDataset("/path/to/gazecapture", split="train",
                          iphone_only=True, cache_file="cache_train.pkl")
  le, re, pose, label = ds[0]
"""

import json
import pickle
from pathlib import Path
from typing import Optional, Callable, List, Dict, Any, Tuple

import numpy as np
import torch
from torch.utils.data import Dataset
from PIL import Image
import torchvision.transforms as T


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _read_json(path: Path) -> Any:
    with open(path, "r") as f:
        return json.load(f)


def _safe_arr(d: dict, key: str) -> np.ndarray:
    return np.asarray(d[key], dtype=np.float32)


def _estimate_head_pose(
    face_x: float, face_y: float,
    face_w: float, face_h: float,
    img_w: int,    img_h: int,
) -> np.ndarray:
    """
    Derive a 3-D proxy head-pose vector from the face bounding box.

    Returns
    -------
    np.ndarray of shape (3,) : [yaw, pitch, scale]
      yaw   – normalised horizontal offset of face centre  ∈ [-1, 1]
      pitch – normalised vertical   offset of face centre  ∈ [-1, 1]
      scale – face area / frame area                       ∈ [ 0, 1]

    Replacement note
    ----------------
    At inference time you can swap this with true [pitch, yaw, roll] from
    MediaPipe or 6DRepNet.  Remap angles so that:
      - 0  → looking straight ahead
      - ±1 → roughly ±45° turn
    and keep `scale` as-is.
    """
    face_cx = face_x + face_w / 2.0
    face_cy = face_y + face_h / 2.0

    yaw   = float(np.clip((face_cx - img_w / 2.0) / (img_w / 2.0), -1.0, 1.0))
    pitch = float(np.clip((face_cy - img_h / 2.0) / (img_h / 2.0), -1.0, 1.0))
    scale = float(np.clip((face_w * face_h) / (img_w * img_h), 0.0, 1.0))

    return np.array([yaw, pitch, scale], dtype=np.float32)


# ---------------------------------------------------------------------------
# Dataset
# ---------------------------------------------------------------------------

class GazeCaptureDataset(Dataset):
    """
    GazeCapture per-frame dataset for gaze regression.

    Parameters
    ----------
    dataset_path : str | Path
        Root of the extracted GazeCapture dataset.
        Must contain numbered subject directories (e.g. 00001/, 00002/, …).
    split : {"train", "val", "test"}
        Which subset to use (determined by the Dataset field in info.json).
    eye_size : (H, W)
        Resize target for eye crop images.
    iphone_only : bool
        Skip non-iPhone recordings (recommended for AAC real-time use).
    eye_pad : float
        Fractional padding added around each eye bbox before cropping.
        Gives the model a small amount of context around the iris.
    transform : callable | None
        Torchvision transform applied to each eye crop PIL image.
        If None, a default (Resize → ToTensor → ImageNet-normalise) is used.
    cache_file : str | Path | None
        Optional path to a pickle file for caching the sample index.
        Speeds up repeated Dataset initialisation dramatically.
    """

    def __init__(
        self,
        dataset_path: "str | Path",
        split: str = "train",
        eye_size: Tuple[int, int] = (64, 64),
        iphone_only: bool = True,
        eye_pad: float = 0.15,
        transform: Optional[Callable] = None,
        cache_file: "Optional[str | Path]" = None,
    ) -> None:
        self.dataset_path = Path(dataset_path)
        self.split        = split
        self.eye_size     = eye_size
        self.iphone_only  = iphone_only
        self.eye_pad      = eye_pad
        self.transform    = transform or self._default_transform(eye_size)
        self.cache_file   = Path(cache_file) if cache_file else None

        self.samples: List[Dict] = []
        self._build_index()

    # ------------------------------------------------------------------
    # Index construction
    # ------------------------------------------------------------------

    def _build_index(self) -> None:
        """Scan all subject dirs and build the flat sample list."""

        # Try loading from cache first
        if self.cache_file and self.cache_file.exists():
            with open(self.cache_file, "rb") as f:
                self.samples = pickle.load(f)
            print(
                f"[GazeCaptureDataset] {self.split}: "
                f"loaded {len(self.samples):,} samples from cache "
                f"({self.cache_file})"
            )
            return

        subject_dirs = sorted(
            [p for p in self.dataset_path.iterdir()
             if p.is_dir() and p.name.isdigit()],
            key=lambda p: int(p.name),
        )

        for i, subj_dir in enumerate(subject_dirs):

            # ---- Filter by split and device ----
            info_path = subj_dir / "info.json"
            if not info_path.exists():
                continue
            try:
                info = _read_json(info_path)
            except Exception:
                continue

            if info.get("Dataset", "") != self.split:
                continue
            if self.iphone_only and "iPhone" not in info.get("DeviceName", ""):
                continue

            # ---- Load JSON metadata ----
            required = [
                "appleFace.json", "appleLeftEye.json",
                "appleRightEye.json", "dotInfo.json", "frames.json",
            ]
            if any(not (subj_dir / f).exists() for f in required):
                continue

            try:
                af       = _read_json(subj_dir / "appleFace.json")
                ale      = _read_json(subj_dir / "appleLeftEye.json")
                are_     = _read_json(subj_dir / "appleRightEye.json")
                dot      = _read_json(subj_dir / "dotInfo.json")
                frames_l = _read_json(subj_dir / "frames.json")
            except Exception as exc:
                print(f"  [SKIP] {subj_dir.name}: {exc}")
                continue

            n = len(frames_l)
            if n == 0:
                continue

            # ---- Build per-frame arrays ----
            try:
                face_valid = np.asarray(af["IsValid"],   dtype=bool)
                le_valid   = np.asarray(ale["IsValid"],  dtype=bool)
                re_valid   = np.asarray(are_["IsValid"], dtype=bool)
                all_valid  = face_valid & le_valid & re_valid

                face_x = _safe_arr(af,   "X"); face_y = _safe_arr(af,   "Y")
                face_w = _safe_arr(af,   "W"); face_h = _safe_arr(af,   "H")

                le_x = _safe_arr(ale,  "X"); le_y = _safe_arr(ale,  "Y")
                le_w = _safe_arr(ale,  "W"); le_h = _safe_arr(ale,  "H")

                re_x = _safe_arr(are_, "X"); re_y = _safe_arr(are_, "Y")
                re_w = _safe_arr(are_, "W"); re_h = _safe_arr(are_, "H")

                xcam = _safe_arr(dot, "XCam")
                ycam = _safe_arr(dot, "YCam")
            except (KeyError, ValueError) as exc:
                print(f"  [SKIP] {subj_dir.name}: array error – {exc}")
                continue

            min_len = min(n, len(face_x), len(xcam))

            for j in range(min_len):
                if not all_valid[j]:
                    continue

                img_path = subj_dir / "frames" / frames_l[j]
                if not img_path.exists():
                    continue

                # Eye bboxes → absolute frame coordinates
                # (JSON eye coords are relative to the face bbox origin)
                le_abs_x = float(face_x[j] + le_x[j])
                le_abs_y = float(face_y[j] + le_y[j])
                re_abs_x = float(face_x[j] + re_x[j])
                re_abs_y = float(face_y[j] + re_y[j])

                self.samples.append({
                    "img_path":  img_path,
                    "face_bbox": (float(face_x[j]), float(face_y[j]),
                                  float(face_w[j]), float(face_h[j])),
                    "le_bbox":   (le_abs_x, le_abs_y,
                                  float(le_w[j]), float(le_h[j])),
                    "re_bbox":   (re_abs_x, re_abs_y,
                                  float(re_w[j]), float(re_h[j])),
                    "label":     np.array([xcam[j], ycam[j]], dtype=np.float32),
                })

            if (i + 1) % 200 == 0:
                print(
                    f"  [{i+1}/{len(subject_dirs)}] "
                    f"running total: {len(self.samples):,} samples"
                )

        print(
            f"[GazeCaptureDataset] {self.split}: "
            f"indexed {len(self.samples):,} valid frames"
        )

        # Save cache
        if self.cache_file:
            self.cache_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.cache_file, "wb") as f:
                pickle.dump(self.samples, f)
            print(f"  Index cached to {self.cache_file}")

    # ------------------------------------------------------------------
    # Crop helper
    # ------------------------------------------------------------------

    def _crop_eye(
        self,
        img: Image.Image,
        x: float, y: float, w: float, h: float,
    ) -> Image.Image:
        """
        Crop an eye region from a PIL image with fractional padding.
        Coordinates are clamped to the image bounds so out-of-frame
        detections are handled gracefully.
        """
        iw, ih = img.size
        pad_x  = w * self.eye_pad
        pad_y  = h * self.eye_pad
        x0 = max(0, int(x - pad_x))
        y0 = max(0, int(y - pad_y))
        x1 = min(iw, int(x + w + pad_x))
        y1 = min(ih, int(y + h + pad_y))
        if x1 <= x0 or y1 <= y0:
            return img.crop((0, 0, max(1, iw), max(1, ih)))
        return img.crop((x0, y0, x1, y1))

    # ------------------------------------------------------------------
    # Dataset interface
    # ------------------------------------------------------------------

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(
        self, idx: int
    ) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor]:
        """
        Returns
        -------
        left_eye  : (3, H, W) float32 tensor  – ImageNet-normalised
        right_eye : (3, H, W) float32 tensor
        head_pose : (3,)      float32 tensor  – [yaw, pitch, scale]
        label     : (2,)      float32 tensor  – [XCam, YCam] in cm
        """
        s = self.samples[idx]

        img = Image.open(s["img_path"]).convert("RGB")
        img_w, img_h = img.size

        left_eye_img  = self._crop_eye(img, *s["le_bbox"])
        right_eye_img = self._crop_eye(img, *s["re_bbox"])

        head_pose = _estimate_head_pose(*s["face_bbox"], img_w, img_h)

        left_eye  = self.transform(left_eye_img)   # (3, H, W)
        right_eye = self.transform(right_eye_img)  # (3, H, W)

        return (
            left_eye,
            right_eye,
            torch.from_numpy(head_pose),
            torch.from_numpy(s["label"]),
        )

    # ------------------------------------------------------------------
    # Static helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _default_transform(eye_size: Tuple[int, int]) -> T.Compose:
        return T.Compose([
            T.Resize(eye_size),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406],
                        std=[0.229, 0.224, 0.225]),
        ])

    @staticmethod
    def augment_transform(eye_size: Tuple[int, int]) -> T.Compose:
        """
        Augmentation pipeline for the training split.

        Note: horizontal-flip augmentation is intentionally omitted here
        because flipping swaps left/right eye semantics — if you add it,
        also swap the left_eye / right_eye tensors in __getitem__.
        """
        return T.Compose([
            T.Resize(eye_size),
            T.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.2, hue=0.05),
            T.RandomAffine(degrees=8, translate=(0.05, 0.05), scale=(0.92, 1.08)),
            T.GaussianBlur(kernel_size=3, sigma=(0.1, 1.5)),
            T.ToTensor(),
            T.Normalize(mean=[0.485, 0.456, 0.406],
                        std=[0.229, 0.224, 0.225]),
        ])


# ---------------------------------------------------------------------------
# Quick sanity-check
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys
    path = sys.argv[1] if len(sys.argv) > 1 else "."
    ds = GazeCaptureDataset(path, split="train", iphone_only=True)
    if len(ds) == 0:
        print("No samples found – check dataset_path and split.")
    else:
        le, re, pose, label = ds[0]
        print(f"left_eye  : {le.shape}  dtype={le.dtype}")
        print(f"right_eye : {re.shape}  dtype={re.dtype}")
        print(f"head_pose : {pose}  dtype={pose.dtype}")
        print(f"label     : {label} cm  dtype={label.dtype}")
