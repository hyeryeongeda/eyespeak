"""
==========================================================
[서버 모듈] L2CS-Net 실시간 시선 추적 웹 데모
==========================================================
FastAPI 기반 백엔드로, 웹캠 영상을 받아 시선 방향(Yaw/Pitch)을
실시간으로 추론하여 브라우저에 전달합니다.

실행 방법:
    python server.py

    → 브라우저에서 http://localhost:8000 접속
"""

import os
import io
import base64
import glob
import threading

import cv2
import numpy as np
import torch
from torchvision import transforms
from PIL import Image
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.responses import HTMLResponse, JSONResponse
import uvicorn
import mediapipe as mp

import config
from model import L2CSNet


# ==========================================================
#  ModelManager: 모델 로드 / 교체 / 목록 관리
# ==========================================================

class ModelManager:
    """
    .pth 모델 파일의 검색, 로드, 교체를 관리합니다.

    스캔 대상 디렉토리:
        - runs/   (학습 시 자동 생성되는 체크포인트)
        - uploads/ (사용자가 업로드한 모델)
    """

    def __init__(self):
        self.model = None
        self.current_path = None
        self.lock = threading.Lock()
        self.upload_dir = os.path.join(config.PROJECT_ROOT, "uploads")
        os.makedirs(self.upload_dir, exist_ok=True)

    def list_models(self):
        """runs/ 및 uploads/ 에서 .pth 파일 목록을 반환합니다."""
        found = []

        # runs/ 디렉토리 스캔 (재귀)
        runs_dir = config.CHECKPOINT_BASE_DIR
        if os.path.isdir(runs_dir):
            for path in sorted(glob.glob(os.path.join(runs_dir, "**", "*.pth"), recursive=True)):
                rel = os.path.relpath(path, config.PROJECT_ROOT)
                found.append({"path": rel, "source": "runs"})

        # uploads/ 디렉토리 스캔
        if os.path.isdir(self.upload_dir):
            for path in sorted(glob.glob(os.path.join(self.upload_dir, "*.pth"))):
                rel = os.path.relpath(path, config.PROJECT_ROOT)
                found.append({"path": rel, "source": "uploads"})

        return found

    def load_model(self, rel_path):
        """
        지정된 경로의 .pth 파일을 로드합니다.

        checkpoint 형식 자동 감지:
            - dict에 'model_state_dict' 키가 있으면 → checkpoint['model_state_dict'] 사용
            - 없으면 → 파일 전체가 state_dict인 것으로 간주
        """
        abs_path = os.path.join(config.PROJECT_ROOT, rel_path)
        if not os.path.isfile(abs_path):
            raise FileNotFoundError(f"모델 파일을 찾을 수 없습니다: {rel_path}")

        # 모델 생성 (사전학습 가중치 불필요 — 곧 덮어씀)
        net = L2CSNet(num_bins=config.NUM_BINS, pretrained=False)
        checkpoint = torch.load(abs_path, map_location=config.DEVICE, weights_only=False)

        # checkpoint 형식 자동 감지
        if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
            state_dict = checkpoint["model_state_dict"]
        else:
            state_dict = checkpoint

        net.load_state_dict(state_dict)
        net.to(config.DEVICE)
        net.eval()

        with self.lock:
            self.model = net
            self.current_path = rel_path

        print(f"[ModelManager] 모델 로드 완료: {rel_path}")

    def get_model(self):
        """현재 로드된 모델을 thread-safe하게 반환합니다."""
        with self.lock:
            return self.model

    def save_upload(self, filename, data):
        """업로드된 파일을 uploads/ 디렉토리에 저장합니다."""
        safe_name = os.path.basename(filename)
        dest = os.path.join(self.upload_dir, safe_name)
        with open(dest, "wb") as f:
            f.write(data)
        return os.path.relpath(dest, config.PROJECT_ROOT)


# ==========================================================
#  FaceEyeDetector: MediaPipe Face Mesh 기반 얼굴/눈 검출
# ==========================================================

class FaceEyeDetector:
    """
    MediaPipe Face Mesh (478 랜드마크)를 사용하여 얼굴과 눈을 검출합니다.

    Haar Cascade 대비 개선점:
        1. 눈 꼬리 랜드마크로 정확한 눈 영역 위치 파악
        2. 눈 축(inner↔outer corner) 기반 affine warp로 머리 기울기 보정
        3. 타이트한 크롭으로 학습 데이터(MPIIGaze Normalized)와 유사한 입력 생성
        4. CLAHE 히스토그램 평활화로 조명 변화 보정

    오른쪽 눈은 좌우 반전하여 학습 데이터와 동일한 형태로 만듭니다.
    """

    # ── 눈 꼬리 랜드마크 인덱스 ──
    # 왼쪽 눈 (피사체 기준, 이미지에서는 오른쪽)
    LEFT_EYE_INNER = 133   # 안쪽 (코 쪽)
    LEFT_EYE_OUTER = 33    # 바깥쪽 (관자놀이 쪽)
    # 오른쪽 눈 (피사체 기준, 이미지에서는 왼쪽)
    RIGHT_EYE_INNER = 362
    RIGHT_EYE_OUTER = 263

    OUT_W, OUT_H = 60, 36  # MPIIGaze Normalized 출력 크기
    CROP_SCALE = 1.8       # 눈 너비 대비 크롭 배율 (여유 마진 포함)

    def __init__(self):
        self.face_mesh = mp.solutions.face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=1,
            refine_landmarks=True,       # 홍채 랜드마크 활성화 (478개)
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        # CLAHE: 조명 변화에 강건한 히스토그램 평활화
        self.clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(4, 4))

    def detect(self, frame):
        """
        프레임에서 얼굴과 양쪽 눈 이미지를 추출합니다.

        Returns:
            dict | None:
                face_box: {"x", "y", "w", "h"}
                left_eye:  (36, 60) grayscale numpy array
                right_eye: (36, 60) grayscale numpy array (좌우 반전됨)
        """
        h, w = frame.shape[:2]
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(rgb)

        if not results.multi_face_landmarks:
            return None

        # 랜드마크 → 픽셀 좌표 변환
        lms = results.multi_face_landmarks[0].landmark
        pts = np.array([(lm.x * w, lm.y * h) for lm in lms])

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        # 양쪽 눈 추출 (affine warp + CLAHE)
        left_eye = self._extract_eye(
            gray, pts, self.LEFT_EYE_INNER, self.LEFT_EYE_OUTER
        )
        right_eye = self._extract_eye(
            gray, pts, self.RIGHT_EYE_INNER, self.RIGHT_EYE_OUTER
        )

        if left_eye is None or right_eye is None:
            return None

        # 오른쪽 눈 좌우반전 (학습 데이터와 동일한 전처리)
        right_eye = np.fliplr(right_eye).copy()

        # 얼굴 바운딩 박스 (랜드마크 기반)
        face_pts = pts[:468]
        x_min, y_min = face_pts.min(axis=0).astype(int)
        x_max, y_max = face_pts.max(axis=0).astype(int)

        return {
            "face_box": {
                "x": int(x_min), "y": int(y_min),
                "w": int(x_max - x_min), "h": int(y_max - y_min),
            },
            "left_eye": left_eye,
            "right_eye": right_eye,
        }

    def _extract_eye(self, gray, pts, inner_idx, outer_idx):
        """
        눈 꼬리 랜드마크 기반 affine warp로 정규화된 눈 이미지를 추출합니다.

        처리 과정:
            1. inner/outer corner로 눈 축 방향 계산
            2. 눈 축을 수평으로 정렬하는 affine 변환 (머리 기울기 보정)
            3. 눈 중심 기준으로 CROP_SCALE 배율의 영역 크롭
            4. 60x36으로 warp (MPIIGaze Normalized 형식)
            5. CLAHE 히스토그램 평활화

        Args:
            gray:      그레이스케일 프레임
            pts:       478개 랜드마크 좌표 배열
            inner_idx: 안쪽 눈 꼬리 랜드마크 인덱스
            outer_idx: 바깥쪽 눈 꼬리 랜드마크 인덱스

        Returns:
            (36, 60) uint8 numpy array 또는 None
        """
        inner = pts[inner_idx]
        outer = pts[outer_idx]

        # 눈 중심 및 너비
        center = (inner + outer) / 2
        eye_w = np.linalg.norm(outer - inner)

        if eye_w < 8:  # 너무 작으면 신뢰할 수 없음
            return None

        # ── 눈 축 방향 벡터 (머리 기울기 보정의 핵심) ──
        # inner→outer 방향을 수평 기준으로 삼아 회전 보정
        dx = outer - inner
        dir_x = dx / np.linalg.norm(dx)              # 눈 축 단위 벡터
        dir_y = np.array([-dir_x[1], dir_x[0]])      # 수직 단위 벡터

        # 크롭 크기 (눈 너비 × CROP_SCALE, 종횡비 60:36 유지)
        crop_w = eye_w * self.CROP_SCALE
        crop_h = crop_w * self.OUT_H / self.OUT_W

        hw, hh = crop_w / 2, crop_h / 2

        # ── Affine 변환: 3점 대응 ──
        # 원본 이미지의 크롭 꼭짓점 → 출력 이미지 꼭짓점
        src = np.float32([
            center - hw * dir_x - hh * dir_y,   # 좌상
            center + hw * dir_x - hh * dir_y,   # 우상
            center - hw * dir_x + hh * dir_y,   # 좌하
        ])
        dst = np.float32([
            [0, 0],
            [self.OUT_W, 0],
            [0, self.OUT_H],
        ])

        M = cv2.getAffineTransform(src, dst)
        eye = cv2.warpAffine(
            gray, M, (self.OUT_W, self.OUT_H),
            flags=cv2.INTER_LINEAR,
            borderMode=cv2.BORDER_REPLICATE,
        )

        # CLAHE 히스토그램 평활화 (조명 정규화)
        eye = self.clahe.apply(eye)

        return eye


# ==========================================================
#  추론 파이프라인
# ==========================================================

# dataset.py와 동일한 전처리 파이프라인
inference_transform = transforms.Compose([
    transforms.ToPILImage(),
    transforms.Resize((config.IMAGE_SIZE, config.IMAGE_SIZE)),
    transforms.Grayscale(num_output_channels=3),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225],
    ),
])


def predict_gaze(model, left_eye, right_eye):
    """
    양쪽 눈 이미지로부터 시선 방향(Yaw, Pitch)을 예측합니다.

    양쪽 눈을 배치로 묶어 한 번의 forward pass로 동시 추론합니다.
    두 눈의 예측값을 평균하여 최종 결과를 반환합니다.

    Args:
        model:     L2CSNet (eval 모드)
        left_eye:  (36, 60) grayscale numpy array
        right_eye: (36, 60) grayscale numpy array (이미 좌우반전됨)

    Returns:
        (yaw, pitch) — 도(degree) 단위 평균 시선 각도
    """
    # 전처리: (36,60) uint8 → (3,224,224) float tensor
    left_tensor = inference_transform(left_eye)    # (3, 224, 224)
    right_tensor = inference_transform(right_eye)  # (3, 224, 224)

    # 배치로 묶기 (2, 3, 224, 224)
    batch = torch.stack([left_tensor, right_tensor]).to(config.DEVICE)

    with torch.no_grad():
        _, _, yaw_pred, pitch_pred = model(batch)

    # 두 눈의 평균
    yaw = yaw_pred.mean().item()
    pitch = pitch_pred.mean().item()

    return yaw, pitch


# ==========================================================
#  FastAPI 앱 생성
# ==========================================================

app = FastAPI(title="L2CS-Net Gaze Demo")
model_manager = ModelManager()
detector = FaceEyeDetector()


# ── GET / : index.html 제공 ──
@app.get("/", response_class=HTMLResponse)
async def serve_index():
    html_path = os.path.join(config.PROJECT_ROOT, "index.html")
    with open(html_path, "r", encoding="utf-8") as f:
        return f.read()


# ── GET /api/models : 사용 가능한 모델 목록 ──
@app.get("/api/models")
async def list_models():
    models = model_manager.list_models()
    return {
        "models": models,
        "current": model_manager.current_path,
    }


# ── POST /api/models/select : 기존 모델 선택/로드 ──
@app.post("/api/models/select")
async def select_model(body: dict):
    path = body.get("path", "")
    try:
        model_manager.load_model(path)
        return {"status": "ok", "loaded": path}
    except Exception as e:
        return JSONResponse(status_code=400, content={"status": "error", "message": str(e)})


# ── POST /api/models/upload : 새 .pth 업로드 및 로드 ──
@app.post("/api/models/upload")
async def upload_model(file: UploadFile = File(...)):
    if not file.filename.endswith(".pth"):
        return JSONResponse(
            status_code=400,
            content={"status": "error", "message": ".pth 파일만 업로드 가능합니다."},
        )

    data = await file.read()
    rel_path = model_manager.save_upload(file.filename, data)

    try:
        model_manager.load_model(rel_path)
        return {"status": "ok", "loaded": rel_path}
    except Exception as e:
        return JSONResponse(status_code=400, content={"status": "error", "message": str(e)})


# ── WebSocket /ws/gaze : 실시간 시선 추적 ──
@app.websocket("/ws/gaze")
async def websocket_gaze(ws: WebSocket):
    await ws.accept()
    print("[WebSocket] 클라이언트 연결됨")

    try:
        while True:
            # 클라이언트로부터 base64 JPEG 수신
            data = await ws.receive_json()
            image_data = data.get("image", "")

            # data:image/jpeg;base64,... 형식 파싱
            if "," in image_data:
                image_data = image_data.split(",", 1)[1]

            # base64 → numpy 배열 → OpenCV BGR 이미지
            img_bytes = base64.b64decode(image_data)
            nparr = np.frombuffer(img_bytes, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

            if frame is None:
                await ws.send_json({"status": "error", "message": "이미지 디코딩 실패"})
                continue

            # 모델 확인
            model = model_manager.get_model()
            if model is None:
                await ws.send_json({"status": "no_model", "message": "모델이 로드되지 않았습니다."})
                continue

            # 얼굴/눈 검출
            result = detector.detect(frame)
            if result is None:
                await ws.send_json({"status": "no_face", "message": "얼굴을 찾을 수 없습니다."})
                continue

            # 시선 추론
            yaw, pitch = predict_gaze(model, result["left_eye"], result["right_eye"])

            await ws.send_json({
                "status": "ok",
                "yaw": round(yaw, 2),
                "pitch": round(pitch, 2),
                "face_box": result["face_box"],
            })

    except WebSocketDisconnect:
        print("[WebSocket] 클라이언트 연결 해제")
    except Exception as e:
        print(f"[WebSocket] 오류: {e}")


# ==========================================================
#  서버 실행
# ==========================================================

if __name__ == "__main__":
    print("=" * 50)
    print("  L2CS-Net 실시간 시선 추적 웹 데모")
    print("=" * 50)
    print(f"  디바이스: {config.DEVICE}")
    print(f"  URL: http://localhost:8000")
    print("=" * 50)

    uvicorn.run(app, host="0.0.0.0", port=8000, forwarded_allow_ips="*")
