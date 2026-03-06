# src/calib_fullscreen.py
import argparse, pickle, time
from pathlib import Path

import cv2
import numpy as np
import torch
from torchvision import transforms

from roi_cv2 import FaceEyeROI
from models import GazeRegressor

IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD  = (0.229, 0.224, 0.225)

class LinearCalib2D:
    """X=[yaw,pitch,1] -> Y=[x,y], 작은 ridge로 안정화"""
    def __init__(self, reg=1e-4):
        self.reg = reg
        self.W = None
        self.ready = False

    def fit(self, angles, xy):
        X = np.hstack([angles, np.ones((angles.shape[0], 1), dtype=np.float32)])  # (N,3)
        Y = xy.astype(np.float32)  # (N,2)
        A = X.T @ X + self.reg * np.eye(X.shape[1], dtype=np.float32)
        B = X.T @ Y
        self.W = np.linalg.solve(A, B)  # (3,2)
        self.ready = True

        # train recon error(참고)
        pred = X @ self.W
        mae = np.abs(pred - Y).mean()
        print(f"[calib] train recon mae={mae:.4f}")

    def predict(self, yaw_pitch):
        assert self.ready
        v = np.array([yaw_pitch[0], yaw_pitch[1], 1.0], dtype=np.float32)  # (3,)
        out = v @ self.W  # (2,)
        out = np.clip(out, 0.0, 1.0)
        return float(out[0]), float(out[1])

def get_screen_size():
    # Tkinter 없이 OpenCV만으로 화면 크기 얻기 (Windows에서도 안정적)
    cv2.namedWindow("_tmp", cv2.WINDOW_NORMAL)
    cv2.setWindowProperty("_tmp", cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)
    # 전체화면으로 만든 창의 크기를 얻는다
    _, _, w, h = cv2.getWindowImageRect("_tmp")
    cv2.destroyWindow("_tmp")
    return w, h

def targets(grid):
    if grid == 4:
        return [(0.25,0.25),(0.75,0.25),(0.25,0.75),(0.75,0.75)]
    pts=[]
    for r in range(3):
        for c in range(3):
            pts.append(((c+0.5)/3.0, (r+0.5)/3.0))
    return pts

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--grid", type=int, choices=[4,9], default=9)
    ap.add_argument("--out", type=str, default="checkpoints/calib_9.pkl")
    ap.add_argument("--cam", type=int, default=0)
    ap.add_argument("--settle_ms", type=int, default=700)
    ap.add_argument("--sample_ms", type=int, default=1800)
    ap.add_argument("--reg", type=float, default=1e-4)
    args = ap.parse_args()

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print("[device]", device)

    gaze = GazeRegressor().to(device)
    gaze.load_state_dict(torch.load("checkpoints/gaze_best.pt", map_location=device))
    gaze.eval()

    tf_face = transforms.Compose([
        transforms.ToPILImage(),
        transforms.Resize((224,224)),
        transforms.ToTensor(),
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
    ])

    # 카메라
    cap = cv2.VideoCapture(args.cam, cv2.CAP_DSHOW)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    if not cap.isOpened():
        raise RuntimeError("Webcam open failed")

    roi = FaceEyeROI()

    # 풀스크린 타겟 창
    SW, SH = get_screen_size()
    target_img = np.zeros((SH, SW, 3), dtype=np.uint8)

    cv2.namedWindow("TARGET", cv2.WINDOW_NORMAL)
    cv2.setWindowProperty("TARGET", cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)

    pts = targets(args.grid)
    angles=[]
    xys=[]

    print(f"[calib] fullscreen grid={args.grid}, points={len(pts)} settle={args.settle_ms}ms sample={args.sample_ms}ms")
    print("        q=quit, space=skip")

    for i,(tx,ty) in enumerate(pts):
        # settle
        t0=time.time()
        while (time.time()-t0)*1000 < args.settle_ms:
            ok, frame = cap.read()
            if not ok: 
                continue
            roi.update(frame, detect_every=2)

            target_img[:] = 0
            cx, cy = int(tx*SW), int(ty*SH)
            cv2.circle(target_img, (cx,cy), 18, (0,255,0), -1)
            cv2.putText(target_img, f"CALIB {i+1}/{len(pts)} settle", (40,80),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.2, (255,255,255), 2)
            cv2.imshow("TARGET", target_img)

            k = cv2.waitKey(1) & 0xFF
            if k == ord("q"):
                cap.release(); cv2.destroyAllWindows(); return
            if k == 32:
                break

        # sample
        samples=[]
        t1=time.time()
        while (time.time()-t1)*1000 < args.sample_ms:
            ok, frame = cap.read()
            if not ok:
                continue

            face_bbox, _, _ = roi.update(frame, detect_every=2)
            H,W = frame.shape[:2]

            if face_bbox is not None:
                fx,fy,fw,fh = face_bbox
                face = frame[fy:fy+fh, fx:fx+fw]
            else:
                # fallback
                size = int(min(H,W)*0.6)
                x0=(W-size)//2; y0=(H-size)//2
                face = frame[y0:y0+size, x0:x0+size]

            if face.size == 0:
                continue

            x_face = tf_face(cv2.cvtColor(face, cv2.COLOR_BGR2RGB)).unsqueeze(0).to(device)
            with torch.no_grad():
                yp = gaze(x_face)[0].detach().cpu().numpy()
            samples.append(yp)

            target_img[:] = 0
            cx, cy = int(tx*SW), int(ty*SH)
            cv2.circle(target_img, (cx,cy), 18, (0,255,0), -1)
            cv2.putText(target_img, f"CALIB {i+1}/{len(pts)} sampling", (40,80),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.2, (255,255,255), 2)
            cv2.imshow("TARGET", target_img)

            k = cv2.waitKey(1) & 0xFF
            if k == ord("q"):
                cap.release(); cv2.destroyAllWindows(); return
            if k == 32:
                break

        if len(samples) < 10:
            print(f"[calib] too few samples at {i+1}, skip")
            continue

        med = np.median(np.stack(samples,0), axis=0)
        angles.append(med.tolist())
        xys.append([tx,ty])
        print(f"[pt {i+1}] yaw={med[0]:.4f} pitch={med[1]:.4f} -> xy=({tx:.2f},{ty:.2f})")

    cap.release()
    cv2.destroyAllWindows()

    if len(angles) < max(4, len(pts)//2):
        print("[calib] failed: not enough points collected")
        return

    calib = LinearCalib2D(reg=float(args.reg))
    calib.fit(np.array(angles, dtype=np.float32), np.array(xys, dtype=np.float32))

    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    with open(args.out, "wb") as f:
        pickle.dump(calib, f)
    print("[calib] saved:", args.out)

if __name__ == "__main__":
    main()