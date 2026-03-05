import argparse
import pickle
from pathlib import Path

import cv2
import numpy as np
import torch
from torchvision import transforms

from roi_cv2 import FaceEyeROI
from models import GazeRegressor, BlinkClassifier
from calib_and_grid import Calibrator2D, to_grid


def load_calib(path: str):
    p = Path(path)
    if not p.exists():
        return None
    with p.open("rb") as f:
        return pickle.load(f)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--grid", type=int, default=9, choices=[4, 9])
    ap.add_argument("--calib", type=str, default="", help="e.g. checkpoints/calib_4.pkl or calib_9.pkl")
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
    ])
    tf_eye = transforms.Compose([
        transforms.ToPILImage(),
        transforms.Resize((128, 128)),
        transforms.ToTensor(),
    ])

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        raise RuntimeError("Webcam(0) open failed")

    roi = FaceEyeROI()

    # calibration
    calib = None
    if args.calib:
        calib = load_calib(args.calib)
        if calib is not None:
            print(f"[calib] loaded: {args.calib}")
        else:
            print(f"[calib] not found: {args.calib}")

    # double blink FSM
    last_blink_t = -999.0
    dbl_window = 0.8
    blink_th = 0.5

    print("키 안내: q=종료")

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        H, W = frame.shape[:2]
        face_bbox, le_bbox, re_bbox = roi.update(frame, detect_every=3)

        # --- face crop for gaze ---
        if face_bbox is not None:
            fx, fy, fw, fh = face_bbox
            face = frame[fy:fy + fh, fx:fx + fw]
        else:
            size = int(min(H, W) * 0.6)
            x0 = (W - size) // 2
            y0 = (H - size) // 2
            face = frame[y0:y0 + size, x0:x0 + size]

        face_rgb = cv2.cvtColor(face, cv2.COLOR_BGR2RGB)
        x_face = tf_face(face_rgb).unsqueeze(0).to(device)

        with torch.no_grad():
            yaw_pitch = gaze(x_face)[0].detach().cpu().numpy()

        # --- blink from both eyes (max) ---
        blink_prob = 0.0
        for bbox in [le_bbox, re_bbox]:
            if bbox is None:
                continue
            ex, ey, ew, eh = bbox
            ex = max(0, min(ex, W - 1))
            ey = max(0, min(ey, H - 1))
            ew = max(1, min(ew, W - ex))
            eh = max(1, min(eh, H - ey))
            eye = frame[ey:ey + eh, ex:ex + ew]
            if eye.size == 0:
                continue

            eye_rgb = cv2.cvtColor(eye, cv2.COLOR_BGR2RGB)
            x_eye = tf_eye(eye_rgb).unsqueeze(0).to(device)
            with torch.no_grad():
                p = torch.sigmoid(blink(x_eye))[0, 0].detach().cpu().item()
            blink_prob = max(blink_prob, p)

        now = cv2.getTickCount() / cv2.getTickFrequency()
        if blink_prob > blink_th:
            if (now - last_blink_t) < dbl_window:
                print("CLICK (double blink)")
                last_blink_t = -999.0
            else:
                last_blink_t = now

        # --- mapping ---
        if calib is not None and getattr(calib, "ready", False):
            sx, sy = calib.predict(yaw_pitch)
            row, col, idx = to_grid(sx, sy, mode=str(args.grid))
            cv2.putText(frame, f"grid{args.grid} idx={idx} (r{row},c{col})", (20, 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 0), 2)
        else:
            cv2.putText(frame, "calib: none (run calib_web.py)", (20, 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 200, 255), 2)

        cv2.putText(frame, f"yaw={yaw_pitch[0]:.3f} pitch={yaw_pitch[1]:.3f} blink={blink_prob:.2f}",
                    (20, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)

        # debug boxes
        if face_bbox is not None:
            fx, fy, fw, fh = face_bbox
            cv2.rectangle(frame, (fx, fy), (fx + fw, fy + fh), (0, 255, 0), 2)
        for bbox in [le_bbox, re_bbox]:
            if bbox is not None:
                ex, ey, ew, eh = bbox
                cv2.rectangle(frame, (ex, ey), (ex + ew, ey + eh), (255, 255, 0), 2)

        cv2.imshow("infer_webcam", frame)
        k = cv2.waitKey(1) & 0xFF
        if k == ord("q"):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()