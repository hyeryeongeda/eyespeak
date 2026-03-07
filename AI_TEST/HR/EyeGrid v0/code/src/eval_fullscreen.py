# src/eval_fullscreen.py
import argparse, csv, datetime as dt, pickle, time
from pathlib import Path

import cv2
import numpy as np
import torch
from torchvision import transforms

from roi_cv2 import FaceEyeROI
from models import GazeRegressor
from calib_and_grid import to_grid

IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD  = (0.229, 0.224, 0.225)

# ✅ calib_fullscreen.py에서 pickle로 저장된 클래스와 이름을 맞춰서 "호환 로딩"을 가능하게 함
class LinearCalib2D:
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

    def predict(self, yaw_pitch):
        v = np.array([yaw_pitch[0], yaw_pitch[1], 1.0], dtype=np.float32)  # (3,)
        out = v @ self.W  # (2,)
        out = np.clip(out, 0.0, 1.0)
        return float(out[0]), float(out[1])

class CompatUnpickler(pickle.Unpickler):
    # pickle이 __main__.LinearCalib2D를 찾을 때 여기 클래스로 매핑
    def find_class(self, module, name):
        if module == "__main__" and name == "LinearCalib2D":
            return LinearCalib2D
        return super().find_class(module, name)

def get_screen_size():
    cv2.namedWindow("_tmp", cv2.WINDOW_NORMAL)
    cv2.setWindowProperty("_tmp", cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)
    _, _, w, h = cv2.getWindowImageRect("_tmp")
    cv2.destroyWindow("_tmp")
    return w, h

def load_calib(path):
    with open(path, "rb") as f:
        # ✅ 호환 언피클러로 로드
        return CompatUnpickler(f).load()

def targets_idx(grid):
    n = 2 if grid==4 else 3
    return list(range(n*n))

def idx_to_xy(grid, idx):
    n = 2 if grid==4 else 3
    r = idx // n
    c = idx % n
    return (c+0.5)/n, (r+0.5)/n

def majority(arr):
    arr=[a for a in arr if a is not None]
    if not arr: return None
    vals, cnt = np.unique(np.array(arr), return_counts=True)
    return int(vals[np.argmax(cnt)])

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--grid", type=int, choices=[4,9], default=9)
    ap.add_argument("--calib", type=str, required=True)
    ap.add_argument("--trials", type=int, default=5)
    ap.add_argument("--settle", type=float, default=0.8)
    ap.add_argument("--secs", type=float, default=2.0)
    ap.add_argument("--cam", type=int, default=0)
    args = ap.parse_args()

    device="cuda" if torch.cuda.is_available() else "cpu"
    print("[device]", device)

    calib = load_calib(args.calib)
    print("[calib] loaded:", args.calib)

    gaze = GazeRegressor().to(device)
    gaze.load_state_dict(torch.load("checkpoints/gaze_best.pt", map_location=device))
    gaze.eval()

    tf_face = transforms.Compose([
        transforms.ToPILImage(),
        transforms.Resize((224,224)),
        transforms.ToTensor(),
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
    ])

    cap = cv2.VideoCapture(args.cam, cv2.CAP_DSHOW)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    if not cap.isOpened():
        raise RuntimeError("Webcam open failed")

    roi = FaceEyeROI()

    SW, SH = get_screen_size()
    img = np.zeros((SH, SW, 3), dtype=np.uint8)
    cv2.namedWindow("TARGET", cv2.WINDOW_NORMAL)
    cv2.setWindowProperty("TARGET", cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)

    stamp = dt.datetime.now().strftime("%Y%m%d_%H%M%S")
    out_csv = Path("checkpoints")/f"eval_full_{args.grid}grid_{stamp}.csv"
    fcsv = out_csv.open("w", newline="", encoding="utf-8")
    wcsv = csv.writer(fcsv)
    wcsv.writerow(["ts","target_idx","pred_idx","sx","sy","yaw","pitch"])

    cells = targets_idx(args.grid)
    total=0
    correct=0

    print("\nq=종료")
    for t in range(args.trials):
        for target_idx in cells:
            tx,ty = idx_to_xy(args.grid, target_idx)

            # settle
            end = time.time() + args.settle
            while time.time() < end:
                img[:] = 0
                cx,cy = int(tx*SW), int(ty*SH)
                cv2.circle(img,(cx,cy),18,(0,255,0),-1)
                cv2.putText(img,f"SETTLE {target_idx} ({t+1}/{args.trials})",(40,80),
                            cv2.FONT_HERSHEY_SIMPLEX,1.2,(255,255,255),2)
                cv2.imshow("TARGET", img)
                if (cv2.waitKey(1)&0xFF)==ord("q"):
                    cap.release(); cv2.destroyAllWindows(); fcsv.close()
                    print("saved:", out_csv); return

            # sample
            preds=[]
            end = time.time() + args.secs
            while time.time() < end:
                ok, frame = cap.read()
                if not ok:
                    continue

                face_bbox,_,_ = roi.update(frame, detect_every=2)
                H,W = frame.shape[:2]
                if face_bbox is not None:
                    fx,fy,fw,fh = face_bbox
                    face = frame[fy:fy+fh, fx:fx+fw]
                else:
                    size=int(min(H,W)*0.6)
                    x0=(W-size)//2; y0=(H-size)//2
                    face=frame[y0:y0+size, x0:x0+size]
                if face.size==0:
                    continue

                x_face = tf_face(cv2.cvtColor(face, cv2.COLOR_BGR2RGB)).unsqueeze(0).to(device)
                with torch.no_grad():
                    yp = gaze(x_face)[0].detach().cpu().numpy()
                yaw,pitch = float(yp[0]), float(yp[1])

                sx,sy = calib.predict(np.array([yaw,pitch], dtype=np.float32))
                _,_,pred = to_grid(sx,sy,mode=str(args.grid))
                preds.append(pred)

                wcsv.writerow([time.time(), target_idx, pred, sx, sy, yaw, pitch])

                img[:] = 0
                cx,cy = int(tx*SW), int(ty*SH)
                cv2.circle(img,(cx,cy),18,(0,255,0),-1)
                cv2.putText(img,f"SAMPLE {target_idx} pred={pred}",(40,80),
                            cv2.FONT_HERSHEY_SIMPLEX,1.2,(255,255,255),2)
                cv2.imshow("TARGET", img)
                if (cv2.waitKey(1)&0xFF)==ord("q"):
                    cap.release(); cv2.destroyAllWindows(); fcsv.close()
                    print("saved:", out_csv); return

            pred_major = majority(preds)
            hit = (pred_major == target_idx)
            total += 1
            correct += int(hit)
            print(f"[grid] target={target_idx} pred={pred_major} hit={hit}")

    cap.release()
    cv2.destroyAllWindows()
    fcsv.close()
    print(f"\nGrid Hit Rate: {correct}/{total} = {(correct/max(total,1))*100:.1f}%")
    print("saved:", out_csv)

if __name__ == "__main__":
    main()