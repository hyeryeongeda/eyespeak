# src/eval_webcam.py
import argparse
import csv
import datetime as dt
import pickle
import time
from pathlib import Path

import cv2
import numpy as np
import torch
from torchvision import transforms

from roi_cv2 import FaceEyeROI
from models import GazeRegressor, BlinkClassifier
from calib_and_grid import to_grid

IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD  = (0.229, 0.224, 0.225)


def load_calib(path: str):
    p = Path(path)
    if not p.exists():
        return None
    with p.open("rb") as f:
        return pickle.load(f)


def draw_grid(frame, grid: int):
    H, W = frame.shape[:2]
    n = 2 if grid == 4 else 3
    for i in range(1, n):
        x = int(W * i / n)
        y = int(H * i / n)
        cv2.line(frame, (x, 0), (x, H), (200, 200, 200), 1)
        cv2.line(frame, (0, y), (W, y), (200, 200, 200), 1)


def cell_center_xy(frame, grid: int, idx: int):
    H, W = frame.shape[:2]
    n = 2 if grid == 4 else 3
    r = idx // n
    c = idx % n
    cx = int((c + 0.5) * W / n)
    cy = int((r + 0.5) * H / n)
    return cx, cy


def majority_vote(arr):
    arr = [x for x in arr if x is not None]
    if not arr:
        return None
    vals, counts = np.unique(np.array(arr), return_counts=True)
    return int(vals[np.argmax(counts)])


def jitter_switches(pred_idxs):
    pred_idxs = [p for p in pred_idxs if p is not None]
    if len(pred_idxs) <= 1:
        return 0
    sw = 0
    last = pred_idxs[0]
    for p in pred_idxs[1:]:
        if p != last:
            sw += 1
            last = p
    return sw


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--grid", type=int, default=4, choices=[4, 9])
    ap.add_argument("--calib", type=str, required=True)
    ap.add_argument("--secs", type=float, default=2.0, help="sampling seconds per target")
    ap.add_argument("--settle", type=float, default=0.6, help="settle seconds before sampling per target")
    ap.add_argument("--trials", type=int, default=10, help="repetitions per cell")
    ap.add_argument("--cam", type=int, default=0)
    ap.add_argument("--fps_log", type=int, default=10, help="csv log rate (Hz)")
    ap.add_argument("--blink_th", type=float, default=0.5)
    ap.add_argument("--dbl_window", type=float, default=0.8)
    args = ap.parse_args()

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print("[device]", device)

    calib = load_calib(args.calib)
    if calib is None or not getattr(calib, "ready", False):
        print(f"[calib] not found or not ready: {args.calib}")
        return
    print("[calib] loaded:", args.calib)

    gaze = GazeRegressor().to(device)
    gaze.load_state_dict(torch.load("checkpoints/gaze_best.pt", map_location=device))
    gaze.eval()

    blink = BlinkClassifier().to(device)
    blink.load_state_dict(torch.load("checkpoints/blink_best.pt", map_location=device))
    blink.eval()

    tf_face = transforms.Compose([
        transforms.ToPILImage(),
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
    ])
    tf_eye = transforms.Compose([
        transforms.ToPILImage(),
        transforms.Resize((128, 128)),
        transforms.ToTensor(),
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
    ])

    # Windows MSMF 이슈 회피: CAP_DSHOW
    cap = cv2.VideoCapture(args.cam, cv2.CAP_DSHOW)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    if not cap.isOpened():
        raise RuntimeError(f"Webcam({args.cam}) open failed")

    roi = FaceEyeROI()

    stamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    out_csv = Path("checkpoints") / f"eval_log_{args.grid}grid_{stamp}.csv"
    out_csv.parent.mkdir(parents=True, exist_ok=True)

    fcsv = out_csv.open("w", newline="", encoding="utf-8")
    wcsv = csv.writer(fcsv)
    wcsv.writerow(["ts", "phase", "target_idx", "pred_idx", "sx", "sy", "yaw", "pitch", "blink_prob", "dbl_blink"])

    n_cells = 4 if args.grid == 4 else 9
    cells = list(range(n_cells))

    last_blink_t = -999.0

    def update_double_blink(now, blink_prob):
        nonlocal last_blink_t
        dbl = False
        if blink_prob > args.blink_th:
            if (now - last_blink_t) < args.dbl_window:
                dbl = True
                last_blink_t = -999.0
            else:
                last_blink_t = now
        return dbl

    def infer_one(frame):
        H, W = frame.shape[:2]
        face_bbox, le_bbox, re_bbox = roi.update(frame, detect_every=3)

        if face_bbox is not None:
            fx, fy, fw, fh = face_bbox
            face = frame[fy:fy+fh, fx:fx+fw]
        else:
            size = int(min(H, W) * 0.6)
            x0 = (W - size) // 2
            y0 = (H - size) // 2
            face = frame[y0:y0+size, x0:x0+size]

        if face.size == 0:
            return None, None, None, None, None, 0.0, False, face_bbox, le_bbox, re_bbox

        x_face = tf_face(cv2.cvtColor(face, cv2.COLOR_BGR2RGB)).unsqueeze(0).to(device)
        with torch.no_grad():
            yp = gaze(x_face)[0].detach().cpu().numpy()

        yaw, pitch = float(yp[0]), float(yp[1])
        sx, sy = calib.predict(np.array([yaw, pitch], dtype=np.float32))
        _, _, idx = to_grid(sx, sy, mode=str(args.grid))

        # blink prob: max(L/R)
        blink_prob = 0.0
        for bbox in [le_bbox, re_bbox]:
            if bbox is None:
                continue
            ex, ey, ew, eh = bbox
            ex = max(0, min(ex, W - 1))
            ey = max(0, min(ey, H - 1))
            ew = max(1, min(ew, W - ex))
            eh = max(1, min(eh, H - ey))
            eye = frame[ey:ey+eh, ex:ex+ew]
            if eye.size == 0:
                continue

            x_eye = tf_eye(cv2.cvtColor(eye, cv2.COLOR_BGR2RGB)).unsqueeze(0).to(device)
            with torch.no_grad():
                p = torch.sigmoid(blink(x_eye))[0, 0].detach().cpu().item()
            blink_prob = max(blink_prob, float(p))

        dbl = update_double_blink(time.time(), blink_prob)
        return idx, sx, sy, yaw, pitch, blink_prob, dbl, face_bbox, le_bbox, re_bbox

    print("\n=== 평가 안내 ===")
    print(f"- grid={args.grid}, cells={n_cells}, trials/cell={args.trials}")
    print(f"- settle={args.settle}s, sample={args.secs}s")
    print("- 초록 점(타겟)을 바라보세요. q=종료\n")

    total = 0
    correct = 0
    per_cell = {i: {"hit": 0, "total": 0, "switches": 0, "secs": 0.0} for i in cells}

    log_interval = 1.0 / max(1, args.fps_log)

    for t in range(args.trials):
        for target_idx in cells:
            # settle
            settle_end = time.time() + args.settle
            while time.time() < settle_end:
                ok, frame = cap.read()
                if not ok:
                    continue
                draw_grid(frame, args.grid)
                cx, cy = cell_center_xy(frame, args.grid, target_idx)
                cv2.circle(frame, (cx, cy), 14, (0, 255, 0), -1)
                cv2.putText(frame, f"SETTLE target={target_idx} trial={t+1}/{args.trials}",
                            (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)
                cv2.imshow("EVAL", frame)
                if (cv2.waitKey(1) & 0xFF) == ord("q"):
                    cap.release(); cv2.destroyAllWindows(); fcsv.close()
                    print("saved:", out_csv)
                    return

            # sample
            sample_end = time.time() + args.secs
            preds = []
            last_log = 0.0
            t0 = time.time()

            while time.time() < sample_end:
                ok, frame = cap.read()
                if not ok:
                    continue
                now = time.time()

                pred_idx, sx, sy, yaw, pitch, blink_prob, dbl, face_bbox, le_bbox, re_bbox = infer_one(frame)
                preds.append(pred_idx)

                if (now - last_log) >= log_interval:
                    last_log = now
                    wcsv.writerow([now, "sample", target_idx, pred_idx, sx, sy, yaw, pitch, blink_prob, int(dbl)])

                draw_grid(frame, args.grid)
                cx, cy = cell_center_xy(frame, args.grid, target_idx)
                cv2.circle(frame, (cx, cy), 14, (0, 255, 0), -1)

                if face_bbox is not None:
                    fx, fy, fw, fh = face_bbox
                    cv2.rectangle(frame, (fx, fy), (fx+fw, fy+fh), (0, 255, 0), 2)
                for bbox in [le_bbox, re_bbox]:
                    if bbox is not None:
                        ex, ey, ew, eh = bbox
                        cv2.rectangle(frame, (ex, ey), (ex+ew, ey+eh), (255, 255, 0), 2)

                cv2.putText(frame, f"SAMPLE target={target_idx} trial={t+1}/{args.trials}",
                            (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)
                cv2.putText(frame, f"pred={pred_idx} blink={blink_prob:.2f}",
                            (20, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)

                cv2.imshow("EVAL", frame)
                if (cv2.waitKey(1) & 0xFF) == ord("q"):
                    cap.release(); cv2.destroyAllWindows(); fcsv.close()
                    print("saved:", out_csv)
                    return

            pred_major = majority_vote(preds)
            sw = jitter_switches(preds)
            elapsed = time.time() - t0
            hit = (pred_major == target_idx)

            total += 1
            correct += int(hit)
            per_cell[target_idx]["total"] += 1
            per_cell[target_idx]["hit"] += int(hit)
            per_cell[target_idx]["switches"] += sw
            per_cell[target_idx]["secs"] += elapsed

            print(f"[grid] target={target_idx} pred={pred_major} hit={hit} jitter_switches={sw} ({elapsed:.1f}s)")

    hit_rate = correct / max(total, 1)
    print("\n=== GRID RESULT ===")
    print(f"Grid Hit Rate: {correct}/{total} = {hit_rate*100:.1f}%")
    print("\nPer-cell:")
    for i in cells:
        tot = per_cell[i]["total"]
        hit = per_cell[i]["hit"]
        switches_per_sec = per_cell[i]["switches"] / max(per_cell[i]["secs"], 1e-6)
        print(f"  cell {i}: hit={hit}/{tot} ({(hit/max(tot,1))*100:.1f}%), jitter={switches_per_sec:.2f} switches/sec")

    fcsv.close()
    cap.release()
    cv2.destroyAllWindows()
    print("\nSaved log:", out_csv)


if __name__ == "__main__":
    main()