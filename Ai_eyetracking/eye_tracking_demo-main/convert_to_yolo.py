#!/usr/bin/env python3
"""
GazeCapture → YOLOv8 label converter
=====================================
Reads appleFace.json / appleLeftEye.json / appleRightEye.json from each
subject directory and writes YOLOv8-format .txt label files in-place.

Class mapping
  0  face
  1  left_eye   (subject's physical left eye – appears on RIGHT of image)
  2  right_eye  (subject's physical right eye – appears on LEFT of image)

Output layout
  <dataset>/<subject>/labels/<frame_stem>.txt   ← YOLOv8 label (written here)
  <dataset>/<subject>/frames/<frame_stem>.jpg   ← original image (untouched)

Also writes to output_dir (default = dataset root):
  train.txt / val.txt / test.txt   – absolute image paths for YOLO
  dataset.yaml                     – YOLOv8 dataset config

Usage examples
--------------
  # All devices, single thread
  python convert_to_yolo.py /path/to/dataset

  # iPhone only (recommended for real-time AAC), 8 workers
  python convert_to_yolo.py /path/to/dataset --iphone_only --workers 8

  # Custom output directory for manifests
  python convert_to_yolo.py /path/to/dataset --output_dir ./yolo_data --iphone_only
"""

import argparse
import json
import os
import sys
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

import numpy as np
from PIL import Image

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
CLASS_FACE = 0
CLASS_LEFT_EYE = 1
CLASS_RIGHT_EYE = 2
CLASS_NAMES = ["face", "left_eye", "right_eye"]

# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

def read_json(path: Path) -> dict:
    with open(path, "r") as f:
        return json.load(f)


def to_float_array(data: dict, key: str) -> np.ndarray:
    return np.asarray(data[key], dtype=float)


def bbox_to_yolo(x: float, y: float, w: float, h: float,
                 img_w: int, img_h: int) -> tuple[float, float, float, float]:
    """
    Convert pixel-space top-left (x, y, w, h) to YOLOv8 normalised
    (cx, cy, w, h). Values are clamped to [0, 1].
    """
    cx = np.clip((x + w / 2.0) / img_w, 0.0, 1.0)
    cy = np.clip((y + h / 2.0) / img_h, 0.0, 1.0)
    nw = np.clip(w / img_w, 0.0, 1.0)
    nh = np.clip(h / img_h, 0.0, 1.0)
    return float(cx), float(cy), float(nw), float(nh)


# ---------------------------------------------------------------------------
# Per-subject processing  (runs in worker process when --workers > 1)
# ---------------------------------------------------------------------------

def process_subject(args_tuple: tuple) -> tuple[list[str], list[str], list[str], int, int]:
    """
    Process one GazeCapture recording directory.

    Parameters
    ----------
    args_tuple : (subject_dir: Path, iphone_only: bool)

    Returns
    -------
    (train_paths, val_paths, test_paths, written, skipped)
    """
    subject_dir: Path
    iphone_only: bool
    subject_dir, iphone_only = args_tuple

    train_paths: list[str] = []
    val_paths: list[str] = []
    test_paths: list[str] = []

    # ------------------------------------------------------------------
    # 1. info.json  → device filter + dataset split
    # ------------------------------------------------------------------
    info_path = subject_dir / "info.json"
    if not info_path.exists():
        return [], [], [], 0, 0

    try:
        info = read_json(info_path)
    except Exception:
        return [], [], [], 0, 0

    device_name: str = info.get("DeviceName", "")
    split: str = info.get("Dataset", "train")          # "train" | "val" | "test"

    if iphone_only and "iPhone" not in device_name:
        return [], [], [], 0, 0

    # ------------------------------------------------------------------
    # 2. Load bounding-box JSONs
    # ------------------------------------------------------------------
    required_files = [
        "appleFace.json",
        "appleLeftEye.json",
        "appleRightEye.json",
        "frames.json",
    ]
    for fname in required_files:
        if not (subject_dir / fname).exists():
            return [], [], [], 0, 0

    try:
        af  = read_json(subject_dir / "appleFace.json")
        ale = read_json(subject_dir / "appleLeftEye.json")
        are = read_json(subject_dir / "appleRightEye.json")
        frames_list: list[str] = read_json(subject_dir / "frames.json")
    except Exception as exc:
        print(f"  [SKIP] {subject_dir.name}: JSON error – {exc}", flush=True)
        return [], [], [], 0, 0

    n = len(frames_list)
    if n == 0:
        return [], [], [], 0, 0

    # ------------------------------------------------------------------
    # 3. Build numpy arrays for all bbox coordinates
    # ------------------------------------------------------------------
    try:
        face_x = to_float_array(af,  "X");  face_y = to_float_array(af,  "Y")
        face_w = to_float_array(af,  "W");  face_h = to_float_array(af,  "H")
        face_valid = np.asarray(af["IsValid"], dtype=bool)

        le_x = to_float_array(ale, "X");  le_y = to_float_array(ale, "Y")
        le_w = to_float_array(ale, "W");  le_h = to_float_array(ale, "H")
        le_valid = np.asarray(ale["IsValid"], dtype=bool)

        re_x = to_float_array(are, "X");  re_y = to_float_array(are, "Y")
        re_w = to_float_array(are, "W");  re_h = to_float_array(are, "H")
        re_valid = np.asarray(are["IsValid"], dtype=bool)
    except (KeyError, ValueError) as exc:
        print(f"  [SKIP] {subject_dir.name}: bbox array error – {exc}", flush=True)
        return [], [], [], 0, 0

    # Sanity-check array lengths match frame count
    if not all(len(a) >= n for a in [face_x, le_x, re_x]):
        print(f"  [SKIP] {subject_dir.name}: array length mismatch", flush=True)
        return [], [], [], 0, 0

    # ------------------------------------------------------------------
    # 4. Convert eye coords: face-crop-relative → absolute frame coords
    #
    #    The eye bbox (X, Y) in the JSON is measured from the top-left
    #    corner of the *face crop*, so we add the face bbox origin.
    # ------------------------------------------------------------------
    le_x_abs = face_x + le_x
    le_y_abs = face_y + le_y
    re_x_abs = face_x + re_x
    re_y_abs = face_y + re_y

    # Only process frames where ALL three detections are valid
    all_valid = face_valid & le_valid & re_valid

    # ------------------------------------------------------------------
    # 5. Create labels directory
    # ------------------------------------------------------------------
    labels_dir = subject_dir / "labels"
    labels_dir.mkdir(exist_ok=True)

    # Cache image size: all frames in one recording share the same
    # camera resolution, so we read it once from the first valid frame.
    cached_img_size: tuple[int, int] | None = None

    written = 0
    skipped = 0

    for j, frame_name in enumerate(frames_list):
        if not all_valid[j]:
            skipped += 1
            continue

        img_path = subject_dir / "frames" / frame_name
        if not img_path.exists():
            skipped += 1
            continue

        # Lazy-read image dimensions (PIL does not decode pixels here)
        if cached_img_size is None:
            try:
                with Image.open(img_path) as img:
                    cached_img_size = img.size   # (width, height)
            except Exception:
                skipped += 1
                continue
        img_w, img_h = cached_img_size

        # Skip degenerate bboxes (zero area)
        if face_w[j] <= 0 or face_h[j] <= 0:
            skipped += 1
            continue

        # Build label lines for this frame
        lines: list[str] = []
        for cls_id, bx, by, bw, bh in [
            (CLASS_FACE,      face_x[j],   face_y[j],   face_w[j], face_h[j]),
            (CLASS_LEFT_EYE,  le_x_abs[j], le_y_abs[j], le_w[j],   le_h[j]),
            (CLASS_RIGHT_EYE, re_x_abs[j], re_y_abs[j], re_w[j],   re_h[j]),
        ]:
            if bw <= 0 or bh <= 0:
                continue    # skip degenerate eye bbox but keep others
            cx, cy, nw, nh = bbox_to_yolo(bx, by, bw, bh, img_w, img_h)
            lines.append(f"{cls_id} {cx:.6f} {cy:.6f} {nw:.6f} {nh:.6f}")

        if not lines:
            skipped += 1
            continue

        # Write .txt label file
        frame_stem = Path(frame_name).stem
        label_path = labels_dir / f"{frame_stem}.txt"
        label_path.write_text("\n".join(lines), encoding="utf-8")

        # Collect absolute image path for manifest
        abs_img_path = str(img_path.resolve())
        if split == "train":
            train_paths.append(abs_img_path)
        elif split == "val":
            val_paths.append(abs_img_path)
        else:   # "test" or anything else
            test_paths.append(abs_img_path)

        written += 1

    return train_paths, val_paths, test_paths, written, skipped


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Convert GazeCapture dataset to YOLOv8 format",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "dataset_path",
        type=Path,
        help="Root of GazeCapture dataset (contains numbered subject dirs like 00001/)",
    )
    parser.add_argument(
        "--output_dir",
        type=Path,
        default=None,
        help="Where to write manifests (train.txt, val.txt, test.txt, dataset.yaml). "
             "Defaults to dataset_path.",
    )
    parser.add_argument(
        "--iphone_only",
        action="store_true",
        default=False,
        help="[Recommended for AAC] Process only Apple iPhone recordings. "
             "Skips iPad data for a leaner, more consistent dataset.",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=4,
        help="Number of parallel worker processes (default: 4). "
             "Set to 1 to disable multiprocessing.",
    )
    args = parser.parse_args()

    dataset_path: Path = args.dataset_path.resolve()
    output_dir: Path = (args.output_dir or dataset_path).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    if not dataset_path.is_dir():
        sys.exit(f"ERROR: dataset_path not found: {dataset_path}")

    # ------------------------------------------------------------------
    # Discover numbered subject directories
    # ------------------------------------------------------------------
    subject_dirs = sorted(
        [p for p in dataset_path.iterdir() if p.is_dir() and p.name.isdigit()],
        key=lambda p: int(p.name),
    )
    total_subjects = len(subject_dirs)
    if total_subjects == 0:
        sys.exit(
            "ERROR: No numbered subject directories found.\n"
            "Make sure dataset_path points to the extracted dataset root "
            "(the directory that directly contains folders named like '00001', '00002', ...)."
        )

    print(f"GazeCapture → YOLOv8 converter")
    print(f"  Dataset : {dataset_path}")
    print(f"  Output  : {output_dir}")
    print(f"  Subjects: {total_subjects}")
    print(f"  iPhone only: {args.iphone_only}")
    print(f"  Workers : {args.workers}")
    print()

    # ------------------------------------------------------------------
    # Process subjects (sequential or parallel)
    # ------------------------------------------------------------------
    task_args = [(sd, args.iphone_only) for sd in subject_dirs]

    all_train: list[str] = []
    all_val:   list[str] = []
    all_test:  list[str] = []
    total_written = 0
    total_skipped = 0

    def _update(result, idx: int) -> None:
        nonlocal total_written, total_skipped
        tr, va, te, wr, sk = result
        all_train.extend(tr)
        all_val.extend(va)
        all_test.extend(te)
        total_written += wr
        total_skipped += sk
        if (idx + 1) % 100 == 0 or (idx + 1) == total_subjects:
            print(
                f"  [{idx+1:>5}/{total_subjects}] "
                f"labels written: {total_written:>7}  "
                f"skipped frames: {total_skipped:>7}",
                flush=True,
            )

    if args.workers > 1:
        with ProcessPoolExecutor(max_workers=args.workers) as executor:
            future_to_idx = {
                executor.submit(process_subject, t): i
                for i, t in enumerate(task_args)
            }
            completed = 0
            for future in as_completed(future_to_idx):
                idx = future_to_idx[future]
                try:
                    result = future.result()
                except Exception as exc:
                    print(f"  [ERROR] subject {subject_dirs[idx].name}: {exc}", flush=True)
                    result = ([], [], [], 0, 0)
                _update(result, completed)
                completed += 1
    else:
        for i, t in enumerate(task_args):
            result = process_subject(t)
            _update(result, i)

    # ------------------------------------------------------------------
    # Write manifest files  (train.txt / val.txt / test.txt)
    # ------------------------------------------------------------------
    print()
    for split_name, paths in [("train", all_train), ("val", all_val), ("test", all_test)]:
        out_file = output_dir / f"{split_name}.txt"
        out_file.write_text("\n".join(paths) + ("\n" if paths else ""), encoding="utf-8")
        print(f"  {split_name:5s}.txt  → {len(paths):>7} images  ({out_file})")

    # ------------------------------------------------------------------
    # Write dataset.yaml
    # ------------------------------------------------------------------
    yaml_content = (
        "# YOLOv8 dataset configuration\n"
        "# Generated by convert_to_yolo.py from GazeCapture dataset\n"
        f"# iPhone-only mode: {args.iphone_only}\n"
        "#\n"
        "# Label files are written in-place alongside their source frames:\n"
        "#   <dataset>/<subject>/labels/<frame>.txt\n"
        "#   <dataset>/<subject>/frames/<frame>.jpg\n\n"
        f"path: {output_dir}\n"
        "train: train.txt\n"
        "val:   val.txt\n"
        "test:  test.txt\n\n"
        f"nc: {len(CLASS_NAMES)}\n"
        f"names: {CLASS_NAMES}\n"
    )
    yaml_path = output_dir / "dataset.yaml"
    yaml_path.write_text(yaml_content, encoding="utf-8")
    print(f"  dataset.yaml → {yaml_path}")

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    total_images = len(all_train) + len(all_val) + len(all_test)
    print()
    print("=" * 60)
    print(f"  Total label files written : {total_written:>8}")
    print(f"  Total frames skipped      : {total_skipped:>8}")
    print(f"  Train / Val / Test split  : "
          f"{len(all_train)} / {len(all_val)} / {len(all_test)}")
    print("=" * 60)


if __name__ == "__main__":
    main()
