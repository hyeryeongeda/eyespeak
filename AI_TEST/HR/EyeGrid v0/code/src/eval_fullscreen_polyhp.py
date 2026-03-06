# src/eval_fullscreen_polyhp.py
import argparse, csv, datetime as dt, pickle, time
from pathlib import Path

import cv2
import numpy as np
import torch
from torchvision import transforms

from roi_cv2 import FaceEyeROI
from models import GazeRegressor
from calib_and_grid import to_grid
from calib_models import Poly2RidgeCalib2D

IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD  = (0.229, 0.224, 0.225)

try:
    import mediapipe as mp
    MP_OK = True
except Exception:
    MP_OK = False

IDX_NOSE_TIP = 1
IDX_CHIN     = 152
IDX_LEYE     = 33
IDX_REYE     = 263
IDX_LMOUTH   = 61
IDX_RMOUTH   = 291

FACE_3D = np.array([
    (0.0,   0.0,   0.0),
    (0.0, -63.6, -12.5),
    (-43.3, 32.7, -26.0),
    (43.3,  32.7, -26.0),
    (-28.9,-28.9, -24.1),
    (28.9, -28.9, -24.1),
], dtype=np.float32)

def get_screen_size():
    cv2.namedWindow("_tmp", cv2.WINDOW_NORMAL)
    cv2.setWindowProperty("_tmp", cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)
    _, _, w, h = cv2.getWindowImageRect("_tmp")
    cv2.destroyWindow("_tmp")
    return w, h

def euler_from_rvec(rvec):
    R, _ = cv2.Rodrigues(rvec)
    sy = np.sqrt(R[0,0]*R[0,0] + R[1,0]*R[1,0])
    singular = sy < 1e-6
    if not singular:
        x = np.arctan2(R[2,1], R[2,2])
        y = np.arctan2(-R[2,0], sy)
        z = np.arctan2(R[1,0], R[0,0])
    else:
        x = np.arctan2(-R[1,2], R[1,1])
        y = np.arctan2(-R[2,0], sy)
        z = 0
    return float(y), float(x), float(z)

def head_pose_from_facemesh(face_landmarks, W, H):
    def pt(i):
        p = face_landmarks[i]
        return (p.x * W, p.y * H)

    pts2d = np.array([
        pt(IDX_NOSE_TIP),
        pt(IDX_CHIN),
        pt(IDX_LEYE),
        pt(IDX_REYE),
        pt(IDX_LMOUTH),
        pt(IDX_RMOUTH),
    ], dtype=np.float32)

    fx = fy = float(W)
    cx = float(W) / 2.0
    cy = float(H) / 2.0
    K = np.array([[fx, 0, cx],
                  [0, fy, cy],
                  [0,  0,  1]], dtype=np.float32)
    dist = np.zeros((4,1), dtype=np.float32)

    ok, rvec, tvec = cv2.solvePnP(FACE_3D, pts2d, K, dist, flags=cv2.SOLVEPNP_ITERATIVE)
    if not ok:
        return None
    yaw, pitch, roll = euler_from_rvec(rvec)
    tz = float(tvec[2])
    tz = float(np.log(max(1.0, abs(tz))))
    return yaw, pitch, roll, tz

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
    ap.add_argument("--trials", type=int, default=3)
    ap.add_argument("--settle", type=float, default=0.8)
    ap.add_argument("--secs", type=float, default=2.0)
    ap.add_argument("--cam", type=int, default=0)
    args = ap.parse_args()

    device="cuda" if torch.cuda.is_available() else "cpu"
    print("[device]", device)

    with open(args.calib, "rb") as f:
        calib = pickle.load(f)
    if not isinstance(calib, Poly2RidgeCalib2D) or not getattr(calib, "ready", False):
        print("[calib] invalid or not ready:", args.calib)
        return
    base_dim = calib.base_dim
    print(f"[calib] loaded: {args.calib} base_dim={base_dim}")

    # headpose needed?
    use_hp = (base_dim > 6)
    if use_hp and not MP_OK:
        print("[error] calib expects headpose features but mediapipe is not installed.")
        print("        pip install mediapipe")
        return

    mp_face = None
    if use_hp:
        mp_face = mp.solutions.face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=False,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )

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
    out_csv = Path("checkpoints")/f"eval_polyhp_{args.grid}grid_{stamp}.csv"
    out_csv.parent.mkdir(parents=True, exist_ok=True)
    fcsv = out_csv.open("w", newline="", encoding="utf-8")
    wcsv = csv.writer(fcsv)
    wcsv.writerow(["ts","target_idx","pred_idx","sx","sy","yaw","pitch","face_w","face_h","hp_yaw","hp_pitch","hp_roll","hp_tz"])

    cells = targets_idx(args.grid)
    total=0
    correct=0

    print("\nq=종료")
    for t in range(args.trials):
        for target_idx in cells:
            tx,ty = idx_to_xy(args.grid, target_idx)

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
                    if mp_face: mp_face.close()
                    print("saved:", out_csv); return

            preds=[]
            end = time.time() + args.secs
            while time.time() < end:
                ok, frame = cap.read()
                if not ok:
                    continue

                H,W = frame.shape[:2]
                face_bbox,_,_ = roi.update(frame, detect_every=2)
                if face_bbox is not None:
                    fx,fy,fw,fh = face_bbox
                    face = frame[fy:fy+fh, fx:fx+fw]
                    face_w = fw / W
                    face_h = fh / H
                    face_cx = (fx + fw/2) / W
                    face_cy = (fy + fh/2) / H
                else:
                    size=int(min(H,W)*0.6)
                    x0=(W-size)//2; y0=(H-size)//2
                    face=frame[y0:y0+size, x0:x0+size]
                    face_w = size / W
                    face_h = size / H
                    face_cx = 0.5
                    face_cy = 0.5

                if face.size==0:
                    continue

                x_face = tf_face(cv2.cvtColor(face, cv2.COLOR_BGR2RGB)).unsqueeze(0).to(device)
                with torch.no_grad():
                    yp = gaze(x_face)[0].detach().cpu().numpy()
                yaw,pitch = float(yp[0]), float(yp[1])

                feat = [yaw, pitch, face_cx, face_cy, face_w, face_h]
                hp_yaw=hp_pitch=hp_roll=hp_tz=0.0

                if use_hp:
                    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                    res = mp_face.process(rgb)
                    if not res.multi_face_landmarks:
                        continue
                    hp = head_pose_from_facemesh(res.multi_face_landmarks[0].landmark, W, H)
                    if hp is None:
                        continue
                    hp_yaw, hp_pitch, hp_roll, hp_tz = hp
                    feat += [hp_yaw, hp_pitch, hp_roll, hp_tz]

                sx,sy = calib.predict(np.array(feat, dtype=np.float32))
                _,_,pred = to_grid(sx,sy,mode=str(args.grid))
                preds.append(pred)

                wcsv.writerow([time.time(), target_idx, pred, sx, sy, yaw, pitch, face_w, face_h, hp_yaw, hp_pitch, hp_roll, hp_tz])

                img[:] = 0
                cx,cy = int(tx*SW), int(ty*SH)
                cv2.circle(img,(cx,cy),18,(0,255,0),-1)
                cv2.putText(img,f"SAMPLE {target_idx} pred={pred}",(40,80),
                            cv2.FONT_HERSHEY_SIMPLEX,1.2,(255,255,255),2)
                cv2.imshow("TARGET", img)
                if (cv2.waitKey(1)&0xFF)==ord("q"):
                    cap.release(); cv2.destroyAllWindows(); fcsv.close()
                    if mp_face: mp_face.close()
                    print("saved:", out_csv); return

            pred_major = majority(preds)
            hit = (pred_major == target_idx)
            total += 1
            correct += int(hit)
            print(f"[grid] target={target_idx} pred={pred_major} hit={hit}")

    cap.release()
    cv2.destroyAllWindows()
    fcsv.close()
    if mp_face: mp_face.close()

    print(f"\nGrid Hit Rate: {correct}/{total} = {(correct/max(total,1))*100:.1f}%")
    print("saved:", out_csv)

if __name__ == "__main__":
    main()