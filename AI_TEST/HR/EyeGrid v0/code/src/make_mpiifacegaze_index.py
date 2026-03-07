# src/make_mpiifacegaze_index.py
from pathlib import Path
import argparse
import math
import csv

def vec_to_yaw_pitch(vx, vy, vz):
    # 카메라 좌표계 기준으로 흔히 쓰는 정의(라디안)
    yaw = math.atan2(vx, vz)
    pitch = math.atan2(vy, math.sqrt(vx*vx + vz*vz))
    return yaw, pitch

def parse_one_subject(p_dir: Path):
    """
    p_dir: .../p00 같은 참가자 폴더
    returns list of dict: {"img_path": "...", "yaw":..., "pitch":..., "pid":"p00"}
    """
    pid = p_dir.name
    anno = p_dir / f"{pid}.txt"
    if not anno.exists():
        raise FileNotFoundError(f"annotation not found: {anno}")

    rows = []
    with anno.open("r", encoding="utf-8", errors="ignore") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            parts = line.split()
            # Dimension 1: image file path and name.
            rel_img = parts[0]

            # Dimension 22~24 (fc): Face center in camera coord
            # Dimension 25~27 (gt): 3D gaze target location
            # readme 기준 index(1-based)라서, 0-based로는:
            # fc: parts[21:24], gt: parts[24:27]
            try:
                fc = list(map(float, parts[21:24]))
                gt = list(map(float, parts[24:27]))
            except Exception:
                continue

            vx = fc[0] - gt[0]
            vy = fc[1] - gt[1]
            vz = fc[2] - gt[2]
            yaw, pitch = vec_to_yaw_pitch(vx, vy, vz)

            # 실제 이미지 파일 존재 확인
            img_abs = p_dir / rel_img
            if not img_abs.exists():
                # 경로 표기가 살짝 다를 수 있어서 일단 스킵
                continue

            # index.csv에는 data/mpiifacegaze 기준 상대경로로 저장
            rows.append({
                "img_path": f"{pid}/{rel_img}".replace("\\", "/"),
                "yaw": yaw,
                "pitch": pitch,
                "pid": pid
            })
    return rows

def write_csv(out_path: Path, rows):
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["img_path", "yaw", "pitch", "pid"])
        w.writeheader()
        for r in rows:
            w.writerow(r)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--root", type=str, required=True,
                    help="mpiifacegaze root that contains p00..p14")
    ap.add_argument("--out_train", type=str, default="train_index.csv")
    ap.add_argument("--out_val", type=str, default="val_index.csv")
    ap.add_argument("--val_pids", type=str, default="p12,p13,p14",
                    help="comma-separated pids for validation")
    args = ap.parse_args()

    root = Path(args.root)
    val_set = set([x.strip() for x in args.val_pids.split(",") if x.strip()])

    all_train, all_val = [], []
    for p_dir in sorted(root.glob("p[0-9][0-9]")):
        rows = parse_one_subject(p_dir)
        if p_dir.name in val_set:
            all_val.extend(rows)
        else:
            all_train.extend(rows)

    write_csv(root / args.out_train, all_train)
    write_csv(root / args.out_val, all_val)

    print("done")
    print("train:", len(all_train), "->", root / args.out_train)
    print("val  :", len(all_val), "->", root / args.out_val)

if __name__ == "__main__":
    main()