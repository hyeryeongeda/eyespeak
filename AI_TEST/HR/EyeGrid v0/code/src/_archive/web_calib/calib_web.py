import asyncio
import json
import os
import pickle
import threading
import time
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

import cv2
import numpy as np
import torch
from torchvision import transforms
import websockets

from roi_cv2 import FaceEyeROI
from models import GazeRegressor
from calib_and_grid import Calibrator2D

HTTP_PORT = 8000
WS_PORT = 8765

STATE = {
    "loop": None,
    "ws": None,
    "running": False,
}

def start_http_server(root_dir: Path):
    # calib.html을 서비스하기 위해 루트를 프로젝트 루트로 맞춤
    os.chdir(root_dir)
    httpd = ThreadingHTTPServer(("localhost", HTTP_PORT), SimpleHTTPRequestHandler)
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    return httpd

def targets_for_mode(mode: int):
    if mode == 4:
        # 2x2 각 칸의 "중앙"
        return [
            (0.25, 0.25),
            (0.75, 0.25),
            (0.25, 0.75),
            (0.75, 0.75),
        ]
    if mode == 9:
        # 3x3 각 칸의 "중앙"
        pts = []
        for r in range(3):
            for c in range(3):
                pts.append(((c + 0.5) / 3.0, (r + 0.5) / 3.0))
        return pts
    raise ValueError("mode must be 4 or 9")

def ws_send(loop, ws, payload: dict):
    if ws is None:
        return
    fut = asyncio.run_coroutine_threadsafe(ws.send(json.dumps(payload)), loop)
    return fut.result()

def run_calibration(mode: int):
    if STATE["running"]:
        return
    STATE["running"] = True
    loop = STATE["loop"]
    ws = STATE["ws"]

    try:
        ws_send(loop, ws, {"type": "status", "text": f"calibrating... (mode={mode})"})

        device = "cuda" if torch.cuda.is_available() else "cpu"

        gaze = GazeRegressor().to(device)
        gaze.load_state_dict(torch.load("checkpoints/gaze_best.pt", map_location=device))
        gaze.eval()

        tf_face = transforms.Compose([
            transforms.ToPILImage(),
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
        ])

        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            ws_send(loop, ws, {"type":"error", "text":"Webcam(0) open failed"})
            return

        roi = FaceEyeROI()

        # 수집 파라미터 (너무 짧으면 노이즈가 큼)
        settle_ms = 400   # 점 바뀐 직후 안정화 대기
        sample_ms = 900   # 실제 샘플링 구간
        hold_ms = settle_ms + sample_ms

        points = targets_for_mode(mode)
        gaze_angles = []
        screen_xy = []

        # OpenCV 디버그 창(원하면 꺼도 됨)
        show_debug = True

        for idx, (tx, ty) in enumerate(points):
            ws_send(loop, ws, {"type":"target", "mode": mode, "x": tx, "y": ty, "idx": idx, "total": len(points), "hold_ms": hold_ms})

            t_start = time.time()
            # 1) settle 구간: 버림
            while (time.time() - t_start) * 1000 < settle_ms:
                ok, frame = cap.read()
                if not ok:
                    continue
                # ROI 업데이트는 해두면 다음 구간이 안정적
                roi.update(frame, detect_every=2)
                if show_debug:
                    cv2.imshow("calib_debug", frame)
                    if (cv2.waitKey(1) & 0xFF) == ord('q'):
                        raise KeyboardInterrupt

            # 2) sample 구간: yaw/pitch 모아서 평균
            samples = []
            t_sample = time.time()
            while (time.time() - t_sample) * 1000 < sample_ms:
                ok, frame = cap.read()
                if not ok:
                    continue

                face_bbox, _, _ = roi.update(frame, detect_every=2)
                H, W = frame.shape[:2]

                if face_bbox is not None:
                    fx, fy, fw, fh = face_bbox
                    face = frame[fy:fy+fh, fx:fx+fw]
                else:
                    # fallback
                    size = int(min(H, W) * 0.6)
                    x0 = (W - size)//2
                    y0 = (H - size)//2
                    face = frame[y0:y0+size, x0:x0+size]

                if face.size == 0:
                    continue

                face_rgb = cv2.cvtColor(face, cv2.COLOR_BGR2RGB)
                x_face = tf_face(face_rgb).unsqueeze(0).to(device)

                with torch.no_grad():
                    yaw_pitch = gaze(x_face)[0].detach().cpu().numpy()

                samples.append(yaw_pitch)

                if show_debug:
                    # 박스만 대충 표시
                    if face_bbox is not None:
                        fx, fy, fw, fh = face_bbox
                        cv2.rectangle(frame, (fx, fy), (fx+fw, fy+fh), (0,255,0), 2)
                    cv2.putText(frame, f"collecting {idx+1}/{len(points)}", (20,40),
                                cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255,255,255), 2)
                    cv2.imshow("calib_debug", frame)
                    if (cv2.waitKey(1) & 0xFF) == ord('q'):
                        raise KeyboardInterrupt

            if len(samples) < 5:
                # 샘플 너무 적으면 실패 처리
                ws_send(loop, ws, {"type":"error", "text": f"too few samples at point {idx+1}. (face detect unstable)"})
                cap.release()
                cv2.destroyAllWindows()
                return

            mean_yp = np.mean(np.stack(samples, axis=0), axis=0)
            gaze_angles.append(mean_yp.tolist())
            screen_xy.append([tx, ty])

        cap.release()
        cv2.destroyAllWindows()

        # fit + save
        calib = Calibrator2D()
        calib.fit(np.array(gaze_angles), np.array(screen_xy))

        Path("checkpoints").mkdir(parents=True, exist_ok=True)
        out_path = Path("checkpoints") / f"calib_{mode}.pkl"
        with out_path.open("wb") as f:
            pickle.dump(calib, f)

        ws_send(loop, ws, {"type":"done", "path": str(out_path).replace("\\","/")})

    except KeyboardInterrupt:
        ws_send(loop, ws, {"type":"status", "text":"cancelled"})
    except Exception as e:
        ws_send(loop, ws, {"type":"error", "text": repr(e)})
    finally:
        STATE["running"] = False

async def ws_handler(websocket):
    STATE["ws"] = websocket
    await websocket.send(json.dumps({"type":"status", "text":"ready (click Start 4-point / 9-point)"}))

    async for message in websocket:
        data = json.loads(message)

        if data.get("type") == "client_ready":
            await websocket.send(json.dumps({"type":"status", "text":"ready (click Start 4-point / 9-point)"}))

        if data.get("type") == "start":
            mode = int(data.get("mode", 4))
            if mode not in (4, 9):
                await websocket.send(json.dumps({"type":"error", "text":"mode must be 4 or 9"}))
                continue
            if STATE["running"]:
                await websocket.send(json.dumps({"type":"status", "text":"already running..."}))
                continue

            # calibration은 별도 thread에서 실행(웹소켓 이벤트 루프 블로킹 방지)
            t = threading.Thread(target=run_calibration, args=(mode,), daemon=True)
            t.start()

async def main():
    # 프로젝트 루트(= src의 상위 폴더)에서 calib.html을 서빙
    root_dir = Path(__file__).resolve().parent.parent
    if not (root_dir / "calib.html").exists():
        print("❌ calib.html not found in project root:", root_dir)
        return

    start_http_server(root_dir)
    print(f"✅ HTTP: http://localhost:{HTTP_PORT}/calib.html")
    print(f"✅ WS  : ws://localhost:{WS_PORT}")
    print("👉 브라우저에서 calib.html 열고 Start 버튼 누르면 캘리브가 진행됩니다.")
    print("⚠️ 캘리브 중에는 다른 프로그램이 카메라를 점유하면 안 됩니다.")

    STATE["loop"] = asyncio.get_running_loop()

    async with websockets.serve(ws_handler, "localhost", WS_PORT):
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    asyncio.run(main())