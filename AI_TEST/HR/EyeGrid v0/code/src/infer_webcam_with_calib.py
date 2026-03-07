# src/infer_webcam_with_calib.py
import argparse
import pickle
import time
from pathlib import Path

import cv2
import numpy as np
import torch
from torchvision import transforms

from roi_cv2 import FaceEyeROI
from models import GazeRegressor, BlinkClassifier
from calib_and_grid import Calibrator2D, to_grid

IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD  = (0.229, 0.224, 0.225)


def targets(mode: int):
    if mode == 4:
        return [(0.25, 0.25), (0.75, 0.25), (0.25, 0.75), (0.75, 0.75)]
    pts = []
    for r in range(3):
        for c in range(3):
            pts.append(((c + 0.5) / 3.0, (r + 0.5) / 3.0))
    return pts


def draw_grid(frame, mode: int):
    H, W = frame.shape[:2]
    n = 2 if mode == 4 else 3
    for i in range(1, n):
        x = int(W * i / n)
        y = int(H * i / n)
        cv2.line(frame, (x, 0), (x, H), (200, 200, 200), 1)
        cv2.line(frame, (0, y), (W, y), (200, 200, 200), 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--grid", type=int, default=4, choices=[4, 9])
    ap.add_argument("--calib_out", type=str, default="checkpoints/calib_tmp.pkl")
    ap.add_argument("--cam", type=int, default=0)
    ap.add_argument("--settle_ms", type=int, default=500)
    ap.add_argument("--sample_ms", type=int, default=1400)
    args = ap.parse_args()

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print("[device]", device)

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

    cap = cv2.VideoCapture(args.cam, cv2.CAP_DSHOW)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    if not cap.isOpened():
        raise RuntimeError(f"Webcam({args.cam}) open failed")

    roi = FaceEyeROI()

    # ===== calibration =====
    pts = targets(args.grid)
    print(f"[calib] grid={args.grid}, points={len(pts)} settle={args.settle_ms}ms sample={args.sample_ms}ms")
    print("        space=skip point, q=quit")

    gaze_angles = []
    screen_xy = []

    for i, (tx, ty) in enumerate(pts):
        # 1) settle
        t0 = time.time()
        while (time.time() - t0) * 1000 < args.settle_ms:
            ok, frame = cap.read()
            if not ok:
                continue
            roi.update(frame, detect_every=2)

            H, W = frame.shape[:2]
            cx, cy = int(tx * W), int(ty * H)
            draw_grid(frame, args.grid)
            cv2.circle(frame, (cx, cy), 14, (0, 255, 0), -1)
            cv2.putText(frame, f"CALIB {i+1}/{len(pts)} settle", (20, 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)
            cv2.imshow("infer_webcam_with_calib", frame)
            k = cv2.waitKey(1) & 0xFF
            if k == ord("q"):
                cap.release(); cv2.destroyAllWindows()
                return
            if k == 32:
                break

        # 2) sample
        samples = []
        t1 = time.time()
        while (time.time() - t1) * 1000 < args.sample_ms:
            ok, frame = cap.read()
            if not ok:
                continue

            face_bbox, le_bbox, re_bbox = roi.update(frame, detect_every=2)
            H, W = frame.shape[:2]

            if face_bbox is not None:
                fx, fy, fw, fh = face_bbox
                face = frame[fy:fy+fh, fx:fx+fw]
            else:
                size = int(min(H, W) * 0.6)
                x0 = (W - size) // 2
                y0 = (H - size) // 2
                face = frame[y0:y0+size, x0:x0+size]

            if face.size == 0:
                continue

            x_face = tf_face(cv2.cvtColor(face, cv2.COLOR_BGR2RGB)).unsqueeze(0).to(device)
            with torch.no_grad():
                yp = gaze(x_face)[0].detach().cpu().numpy()
            samples.append(yp)

            cx, cy = int(tx * W), int(ty * H)
            draw_grid(frame, args.grid)
            cv2.circle(frame, (cx, cy), 14, (0, 255, 0), -1)
            if face_bbox is not None:
                cv2.rectangle(frame, (fx, fy), (fx+fw, fy+fh), (0, 255, 0), 2)
            cv2.putText(frame, f"CALIB {i+1}/{len(pts)} sampling", (20, 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2)
            cv2.imshow("infer_webcam_with_calib", frame)

            k = cv2.waitKey(1) & 0xFF
            if k == ord("q"):
                cap.release(); cv2.destroyAllWindows()
                return
            if k == 32:
                break

        if len(samples) < 8:
            print(f"[calib] too few samples at point {i+1}, skipping")
            continue

        mean_yp = np.mean(np.stack(samples, axis=0), axis=0)
        gaze_angles.append(mean_yp.tolist())
        screen_xy.append([tx, ty])

    if len(gaze_angles) < max(3, len(pts)//2):
        print("[calib] failed: not enough samples. (face detect unstable?)")
        cap.release(); cv2.destroyAllWindows()
        return

    calib = Calibrator2D()
    calib.fit(np.array(gaze_angles), np.array(screen_xy))

    Path(args.calib_out).parent.mkdir(parents=True, exist_ok=True)
    with open(args.calib_out, "wb") as f:
        pickle.dump(calib, f)
    print("[calib] saved:", args.calib_out)

    # ===== run =====
    last_blink_t = -999.0
    dbl_window = 0.8
    blink_th = 0.5

    print("[run] start. q=quit")
    while True:
        ok, frame = cap.read()
        if not ok:
            break

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
            continue

        x_face = tf_face(cv2.cvtColor(face, cv2.COLOR_BGR2RGB)).unsqueeze(0).to(device)
        with torch.no_grad():
            yaw_pitch = gaze(x_face)[0].detach().cpu().numpy()

        # blink (max L/R)
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

        now = cv2.getTickCount() / cv2.getTickFrequency()
        if blink_prob > blink_th:
            if (now - last_blink_t) < dbl_window:
                print("CLICK (double blink)")
                last_blink_t = -999.0
            else:
                last_blink_t = now

        sx, sy = calib.predict(yaw_pitch)
        row, col, idx = to_grid(sx, sy, mode=str(args.grid))

        draw_grid(frame, args.grid)
        cv2.putText(frame, f"grid{args.grid} idx={idx} (r{row},c{col})", (20, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 0), 2)
        cv2.putText(frame, f"yaw={yaw_pitch[0]:.3f} pitch={yaw_pitch[1]:.3f} blink={blink_prob:.2f}", (20, 80),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)

        if face_bbox is not None:
            cv2.rectangle(frame, (fx, fy), (fx+fw, fy+fh), (0, 255, 0), 2)
        for bbox in [le_bbox, re_bbox]:
            if bbox is not None:
                ex, ey, ew, eh = bbox
                cv2.rectangle(frame, (ex, ey), (ex+ew, ey+eh), (255, 255, 0), 2)

        cv2.imshow("infer_webcam_with_calib", frame)
        k = cv2.waitKey(1) & 0xFF
        if k == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()