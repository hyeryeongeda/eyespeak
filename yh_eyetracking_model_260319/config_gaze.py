"""
아이트래킹 파이프라인 공통 설정 (3단계 입출력 규격).
gaze_server 및 9그리드 UI와 동기화.

.. deprecated::
    신규 코드는 ``eye_speak.configs.loader.load_config()`` 및
    ``eye_speak/configs/default.yaml`` 사용을 권장합니다.
    이 모듈은 루트 ``pipeline.py`` 등 레거시 경로와의 호환을 위해 유지됩니다.
"""

import os

# 검출기: "haar" | "mediapipe" (기본 mediapipe, 얼굴 인식률 향상)
DETECTOR = (os.environ.get("DETECTOR") or "mediapipe").strip().lower()
if DETECTOR not in ("haar", "mediapipe"):
    DETECTOR = "mediapipe"

# 모델 입력
GAZE_INPUT_SIZE = (224, 224)  # (H, W)
GAZE_INPUT_H, GAZE_INPUT_W = 224, 224

# 9그리드 범위 (도 단위). yawPitchToCell 계산에 사용
GRID_YAW_RANGE = 25.0   # ±25°
GRID_PITCH_RANGE = 20.0  # ±20°
GRID_ROWS = 2
GRID_COLS = 3
GRID_NUM_CELLS = GRID_ROWS * GRID_COLS  # 6

# API 응답 형식: left/right 각각 yaw, pitch (도)
# {"left": {"yaw": deg, "pitch": deg}, "right": {...}}

# 카메라 위치 보정: 웹캠이 모니터 위에 있을 때 pitch가 위로 치우치는 현상 보정
# 양수 = pitch를 아래로 밀기 (카메라가 위에 있을 때 보통 +5~+15 사용)
PITCH_OFFSET_DEG = float(os.environ.get("PITCH_OFFSET_DEG", "0.0"))
YAW_OFFSET_DEG   = float(os.environ.get("YAW_OFFSET_DEG",   "0.0"))

# 4단계 확정 방식 (N초 응시 시 선택)
DWELL_TIME_SEC = 1.5   # 일반 문장 선택용 (초). SOS는 0초 즉시.

# B-2: (yaw, pitch) 스무딩. "1"이면 적용
USE_GAZE_REFINER = os.environ.get("USE_GAZE_REFINER", "1") == "1"
# "ema" | "one_euro". one_euro: 속도 적응형(느리면 강한 스무딩, saccade 시 지연 최소)
REFINER_TYPE = (os.environ.get("REFINER_TYPE") or "one_euro").strip().lower()
if REFINER_TYPE not in ("ema", "one_euro"):
    REFINER_TYPE = "one_euro"
GAZE_REFINER_ALPHA = 0.3  # EMA용
# One-Euro: min_cutoff 낮을수록 저속 시 강한 스무딩, beta 높을수록 saccade 반응 빠름
ONE_EURO_MIN_CUTOFF = float(os.environ.get("ONE_EURO_MIN_CUTOFF", "0.5"))
ONE_EURO_BETA = float(os.environ.get("ONE_EURO_BETA", "0.05"))

# 헤드포즈 + 홍채 합산 가중치 (합이 1이 아니어도 됨)
# 고개 돌림이 시선에 큰 영향 → head 0.35, iris 0.65 (눈동자 움직임이 주도적)
HEAD_POSE_WEIGHT = float(os.environ.get("HEAD_POSE_WEIGHT", "0.35"))
IRIS_GAZE_WEIGHT = float(os.environ.get("IRIS_GAZE_WEIGHT", "0.65"))

# 셀 안정성: 최근 N프레임 중 과반수가 같은 셀이어야 셀 전환 (떨림 방지)
CELL_STABILITY_COUNT = int(os.environ.get("CELL_STABILITY_COUNT", "3"))

# L2CS-Net 퓨전 가중치 (fused=iris+head에 L2CS 추가 시: final = (1-L2CS_WEIGHT)*fused + L2CS_WEIGHT*l2cs)
L2CS_WEIGHT = float(os.environ.get("L2CS_WEIGHT", "0.20"))

# 캘리브레이션 12점 좌표
CALIB_POINTS = 12
CALIB_TARGET_RX = [
    0.03, 0.20, 0.40, 0.60, 0.80, 0.97,   # 상단 6점
    0.03, 0.20, 0.40, 0.60, 0.80, 0.97,   # 하단 6점
]
CALIB_TARGET_RY = [
    0.03, 0.03, 0.03, 0.03, 0.03, 0.03,   # 상단
    0.97, 0.97, 0.97, 0.97, 0.97, 0.97,   # 하단
]

# 트리거 설정 (ALS 환자용)
BLINK_SELECT_MIN_SEC = float(os.environ.get("BLINK_SELECT_MIN_SEC", "0.3"))
BLINK_SELECT_MAX_SEC = float(os.environ.get("BLINK_SELECT_MAX_SEC", "1.0"))
DOUBLE_BLINK_WINDOW_SEC = float(os.environ.get("DOUBLE_BLINK_WINDOW_SEC", "2.0"))
LONG_CLOSE_SEC = float(os.environ.get("LONG_CLOSE_SEC", "3.0"))
TRIPLE_BLINK_WINDOW_SEC = float(os.environ.get("TRIPLE_BLINK_WINDOW_SEC", "3.0"))

# 캘리브레이션 데이터 저장 경로
CALIB_SAVE_DIR = os.environ.get("CALIB_SAVE_DIR", "calibration_data")
