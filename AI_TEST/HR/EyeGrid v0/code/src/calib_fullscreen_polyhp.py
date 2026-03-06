# src/calib_fullscreen_polyhp.py
import argparse
import pickle
import time
from pathlib import Path

import cv2
import numpy as np
import torch
from torchvision import transforms

from roi_cv2 import FaceEyeROI
from models import GazeRegressor
from calib_models import Poly2RidgeCalib2D

IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD  = (0.229, 0.224, 0.225)

try:
    import mediapipe as mp
    if hasattr(mp, "solutions"):
        mp_face_mesh = mp.solutions.face_mesh
    else:
        from mediapipe.python.solutions import face_mesh as mp_face_mesh
    MP_OK = True
except Exception:
    MP_OK = False
    mp_face_mesh = None

# MediaPipe landmark indices (FaceMesh)
IDX_NOSE_TIP = 1
IDX_CHIN     = 152
IDX_LEYE     = 33
IDX_REYE     = 263
IDX_LMOUTH   = 61
IDX_RMOUTH   = 291

# Generic 3D face model points (mm-ish), used for solvePnP
FACE_3D = np.array([
    (0.0,   0.0,   0.0),     # nose tip
    (0.0, -63.6, -12.5),     # chin
    (-43.3, 32.7, -26.0),    # left eye outer
    (43.3,  32.7, -26.0),    # right eye outer
    (-28.9,-28.9, -24.1),    # left mouth corner
    (28.9, -28.9, -24.1),    # right mouth corner
], dtype=np.float32)

def get_screen_size():
    cv2.namedWindow("_tmp", cv2.WINDOW_NORMAL)
    cv2.setWindowProperty("_tmp", cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)
    _, _, w, h = cv2.getWindowImageRect("_tmp")
    cv2.destroyWindow("_tmp")
    return w, h

def make_points(n: int):
    # center-of-cell targets: (c+0.5)/n
    pts = []
    for r in range(n):
        for c in range(n):
            pts.append(((c + 0.5) / n, (r + 0.5) / n))
    return pts

def euler_from_rvec(rvec):
    R, _ = cv2.Rodrigues(rvec)
    sy = np.sqrt(R[0,0]*R[0,0] + R[1,0]*R[1,0])
    singular = sy < 1e-6
    if not singular:
        x = np.arctan2(R[2,1], R[2,2])  # pitch
        y = np.arctan2(-R[2,0], sy)     # yaw
        z = np.arctan2(R[1,0], R[0,0])  # roll
    else:
        x = np.arctan2(-R[1,2], R[1,1])
        y = np.arctan2(-R[2,0], sy)
        z = 0
    return float(y), float(x), float(z)  # yaw, pitch, roll (radians)

def head_pose_from_facemesh(face_landmarks, W, H):
    # 2D points in pixels
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

    # camera matrix (rough)
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
    tz = float(tvec[2])  # distance proxy
    return yaw, pitch, roll, tz

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--calib_n", type=int, default=4, choices=[3,4,5], help="3=9pt, 4=16pt, 5=25pt")
    ap.add_argument("--out", type=str, default="")
    ap.add_argument("--cam", type=int, default=0)
    ap.add_argument("--settle_ms", type=int, default=900)
    ap.add_argument("--sample_ms", type=int, default=2500)
    ap.add_argument("--reg", type=float, default=1e-3)
    ap.add_argument("--no_headpose", action="store_true")
    args = ap.parse_args()

    use_hp = (not args.no_headpose)
    if use_hp and not MP_OK:
        print("[warn] mediapipe not installed -> headpose disabled")
        print("       pip install mediapipe")
        use_hp = False

    out_path = args.out.strip()
    if not out_path:
        out_path = f"checkpoints/calib_poly2_n{args.calib_n}_{'hp' if use_hp else 'nohp'}.pkl"

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

    cap = cv2.VideoCapture(args.cam, cv2.CAP_DSHOW)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    if not cap.isOpened():
        raise RuntimeError("Webcam open failed")

    roi = FaceEyeROI()

    mp_face = None
    if use_hp:
        mp_face = mp_face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=False,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )

    SW, SH = get_screen_size()
    target_img = np.zeros((SH, SW, 3), dtype=np.uint8)
    cv2.namedWindow("TARGET", cv2.WINDOW_NORMAL)
    cv2.setWindowProperty("TARGET", cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)

    pts = make_points(args.calib_n)
    print(f"[calib] n={args.calib_n} points={len(pts)} settle={args.settle_ms}ms sample={args.sample_ms}ms use_headpose={use_hp}")
    print("        q=quit, space=skip")

    base_feats = []
    xys = []

    # base feature dims:
    # always: gaze_yaw, gaze_pitch, face_cx, face_cy, face_w, face_h
    # plus headpose: hp_yaw, hp_pitch, hp_roll, hp_tz
    base_dim = 6 + (4 if use_hp else 0)

    for i,(tx,ty) in enumerate(pts):
        # settle
        t0 = time.time()
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
                cap.release(); cv2.destroyAllWindows()
                if mp_face: mp_face.close()
                return
            if k == 32:
                break

        # sample
        samples = []  # list of base_feat vectors
        t1 = time.time()
        while (time.time()-t1)*1000 < args.sample_ms:
            ok, frame = cap.read()
            if not ok:
                continue

            H,W = frame.shape[:2]
            face_bbox, _, _ = roi.update(frame, detect_every=2)
            if face_bbox is not None:
                fx,fy,fw,fh = face_bbox
                face = frame[fy:fy+fh, fx:fx+fw]
                face_cx = (fx + fw/2) / W
                face_cy = (fy + fh/2) / H
                face_w  = fw / W
                face_h  = fh / H
            else:
                # fallback central
                size = int(min(H,W)*0.6)
                x0=(W-size)//2; y0=(H-size)//2
                face = frame[y0:y0+size, x0:x0+size]
                face_cx = 0.5
                face_cy = 0.5
                face_w  = size / W
                face_h  = size / H

            if face.size == 0:
                continue

            # gaze yaw/pitch
            x_face = tf_face(cv2.cvtColor(face, cv2.COLOR_BGR2RGB)).unsqueeze(0).to(device)
            with torch.no_grad():
                yp = gaze(x_face)[0].detach().cpu().numpy()
            gaze_yaw, gaze_pitch = float(yp[0]), float(yp[1])

            feat = [gaze_yaw, gaze_pitch, face_cx, face_cy, face_w, face_h]

            # head pose
            if use_hp:
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                res = mp_face.process(rgb)
                if not res.multi_face_landmarks:
                    continue
                hp = head_pose_from_facemesh(res.multi_face_landmarks[0].landmark, W, H)
                if hp is None:
                    continue
                hp_yaw, hp_pitch, hp_roll, hp_tz = hp
                # tz scale: 너무 큰 값일 수 있어 log scale로 안정화
                hp_tz = float(np.log(max(1.0, abs(hp_tz))))
                feat += [hp_yaw, hp_pitch, hp_roll, hp_tz]

            samples.append(np.array(feat, dtype=np.float32))

            # draw target
            target_img[:] = 0
            cx, cy = int(tx*SW), int(ty*SH)
            cv2.circle(target_img, (cx,cy), 18, (0,255,0), -1)
            cv2.putText(target_img, f"CALIB {i+1}/{len(pts)} sampling", (40,80),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.2, (255,255,255), 2)
            cv2.imshow("TARGET", target_img)

            k = cv2.waitKey(1) & 0xFF
            if k == ord("q"):
                cap.release(); cv2.destroyAllWindows()
                if mp_face: mp_face.close()
                return
            if k == 32:
                break

        if len(samples) < 15:
            print(f"[calib] too few valid samples at pt {i+1} -> skip")
            continue

        med = np.median(np.stack(samples,0), axis=0)
        if med.shape[0] != base_dim:
            print("[calib] feat dim mismatch -> skip")
            continue

        base_feats.append(med.tolist())
        xys.append([tx,ty])

        # quick info
        print(f"[pt {i+1}] yaw={med[0]:+.3f} pitch={med[1]:+.3f}  -> xy=({tx:.2f},{ty:.2f})  samples={len(samples)}")

    cap.release()
    cv2.destroyAllWindows()
    if mp_face: mp_face.close()

    if len(base_feats) < max(6, len(pts)//2):
        print("[calib] failed: not enough points collected")
        return

    calib = Poly2RidgeCalib2D(base_dim=base_dim, reg=args.reg)
    mae = calib.fit(np.array(base_feats, dtype=np.float32), np.array(xys, dtype=np.float32))
    calib.ready = True  # explicit

    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "wb") as f:
        pickle.dump(calib, f)

    print(f"[calib] fitted points={len(base_feats)} base_dim={base_dim} poly2_mae={mae:.4f}")
    print("[calib] saved:", out_path)

if __name__ == "__main__":
    main()