"""
MediaPipe Face Mesh 기반 얼굴·눈 검출.
반환 형식: (아카이브) archive/eye_detector.EyeDetector와 동일 { left, right, face_roi } + landmarks(헤드포즈용).
MediaPipe 0.9: mp.solutions.face_mesh 사용.
MediaPipe 0.10+: mp.solutions 없음 → tasks.vision.FaceLandmarker + face_landmarker.task 모델 사용.
"""

import os
import cv2
import numpy as np
from pathlib import Path

try:
    import mediapipe as mp
    MP_AVAILABLE = True
except ImportError:
    MP_AVAILABLE = False

# Face Mesh 눈·얼굴 랜드마크 인덱스 (mediapipe face_mesh_connections 기준)
RIGHT_EYE_INDICES = [33, 7, 163, 144, 145, 153, 154, 155, 133, 246, 161, 160, 159, 158, 157, 173]
LEFT_EYE_INDICES = [263, 249, 390, 373, 374, 380, 381, 382, 362, 466, 388, 387, 386, 385, 384, 398]
# 헤드포즈용: 코끝(4), 턱(152), 왼쪽 눈 구석(33), 오른쪽 눈 구석(263), 왼쪽 입(61), 오른쪽 입(291)
HEAD_POSE_INDICES = [4, 152, 33, 263, 61, 291]

# MediaPipe 0.10+ Face Landmarker 모델 URL (공식)
FACE_LANDMARKER_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"


def _landmarks_to_bbox(landmarks_xy, pad_pct=0.1):
    """랜드마크 (N,2)에서 bbox (x,y,w,h) 반환. pad_pct로 패딩."""
    xs = [p[0] for p in landmarks_xy]
    ys = [p[1] for p in landmarks_xy]
    xmin, xmax = min(xs), max(xs)
    ymin, ymax = min(ys), max(ys)
    w = xmax - xmin
    h = ymax - ymin
    pad_w = max(2, int(w * pad_pct))
    pad_h = max(2, int(h * pad_pct))
    x = max(0, int(xmin) - pad_w)
    y = max(0, int(ymin) - pad_h)
    w = int(w + 2 * pad_w)
    h = int(h + 2 * pad_h)
    return (x, y, w, h)


def _get_face_landmarker_model_path():
    """Face Landmarker .task 파일 경로. 없으면 다운로드."""
    path = os.environ.get("FACE_LANDMARKER_MODEL")
    if path and os.path.isfile(path):
        return path
    root = Path(__file__).resolve().parent
    default = root / "checkpoints" / "face_landmarker.task"
    if default.is_file():
        return str(default)
    try:
        import urllib.request
        default.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(FACE_LANDMARKER_MODEL_URL, default)
        return str(default)
    except Exception:
        return None


def _create_legacy_face_mesh(mp, min_detection_confidence=0.5, min_tracking_confidence=0.5):
    """MediaPipe 0.9: mp.solutions.face_mesh.FaceMesh 생성."""
    return mp.solutions.face_mesh.FaceMesh(
        static_image_mode=False,
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=min_detection_confidence,
        min_tracking_confidence=min_tracking_confidence,
    )


def _create_face_landmarker_tasks(min_face_detection_confidence=0.5, min_tracking_confidence=0.5):
    """MediaPipe 0.10+: FaceLandmarker (tasks API) 생성."""
    from mediapipe.tasks.python.core import base_options
    from mediapipe.tasks.python.vision import face_landmarker
    from mediapipe.tasks.python.vision.core import vision_task_running_mode

    model_path = _get_face_landmarker_model_path()
    if not model_path:
        return None
    base_options = base_options.BaseOptions(model_asset_path=model_path)
    options = face_landmarker.FaceLandmarkerOptions(
        base_options=base_options,
        running_mode=vision_task_running_mode.VisionTaskRunningMode.IMAGE,
        num_faces=1,
        min_face_detection_confidence=min_face_detection_confidence,
        min_face_presence_confidence=0.5,
        min_tracking_confidence=min_tracking_confidence,
    )
    return face_landmarker.FaceLandmarker.create_from_options(options)


class MediaPipeDetector:
    """
    BGR 프레임 → Face Mesh / FaceLandmarker → face_roi, left/right 눈 크롭(RGB), landmarks(픽셀 좌표).
    """

    def __init__(self, min_detection_confidence=0.3, min_tracking_confidence=0.3):
        if not MP_AVAILABLE:
            raise ImportError("mediapipe is required. pip install mediapipe")
        self._legacy_face_mesh = None
        self._face_landmarker = None
        self._use_legacy = False

        # MediaPipe 0.9: mp.solutions.face_mesh 존재 여부
        if getattr(mp, "solutions", None) is not None and getattr(mp.solutions, "face_mesh", None) is not None:
            try:
                self._legacy_face_mesh = _create_legacy_face_mesh(
                    mp, min_detection_confidence, min_tracking_confidence
                )
                self._use_legacy = True
            except Exception:
                pass

        if not self._use_legacy:
            try:
                self._face_landmarker = _create_face_landmarker_tasks(
                    min_face_detection_confidence=min_detection_confidence,
                    min_tracking_confidence=min_tracking_confidence,
                )
            except Exception:
                self._face_landmarker = None
            if self._face_landmarker is None:
                raise ImportError(
                    "MediaPipe 0.10 has no 'solutions.face_mesh'. "
                    "Install face_landmarker.model or set FACE_LANDMARKER_MODEL, "
                    "or use mediapipe 0.9.x: pip install 'mediapipe>=0.9,<0.10'"
                )

    def detect(self, frame_bgr: np.ndarray) -> dict:
        """
        Returns:
            left: RGB 눈 크롭 | None
            right: RGB 눈 크롭 | None
            face_roi: (x,y,w,h) | None
            landmarks: list of (x_px, y_px) 468개 또는 None (헤드포즈용)
        """
        if frame_bgr is None or frame_bgr.size == 0:
            return {"left": None, "right": None, "face_roi": None, "landmarks": None}
        h, w = frame_bgr.shape[:2]
        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)

        if self._use_legacy and self._legacy_face_mesh is not None:
            results = self._legacy_face_mesh.process(rgb)
            if not results.multi_face_landmarks or len(results.multi_face_landmarks) == 0:
                return {"left": None, "right": None, "face_roi": None, "landmarks": None}
            lm = results.multi_face_landmarks[0]
            landmarks_px = [(int(p.x * w), int(p.y * h)) for p in lm.landmark]
        else:
            # MediaPipe 0.10+ FaceLandmarker
            from mediapipe.tasks.python.vision.core import image as image_lib

            mp_image = image_lib.Image(image_lib.ImageFormat.SRGB, np.ascontiguousarray(rgb))
            result = self._face_landmarker.detect(mp_image)
            if not result.face_landmarks or len(result.face_landmarks) == 0:
                return {"left": None, "right": None, "face_roi": None, "landmarks": None}
            face_landmarks = result.face_landmarks[0]
            landmarks_px = [(int(p.x * w), int(p.y * h)) for p in face_landmarks]

        # face_roi: 전체 랜드마크 bbox
        all_xy = landmarks_px
        fx, fy, fw, fh = _landmarks_to_bbox(all_xy, pad_pct=0.15)
        fx = max(0, min(fx, w - 1))
        fy = max(0, min(fy, h - 1))
        fw = min(fw, w - fx)
        fh = min(fh, h - fy)
        face_roi = (int(fx), int(fy), int(fw), int(fh))

        def crop_eye(indices):
            xy = [landmarks_px[i] for i in indices if i < len(landmarks_px)]
            if not xy:
                return None
            ex, ey, ew, eh = _landmarks_to_bbox(xy, pad_pct=0.3)
            ex = max(0, min(ex, w - 1))
            ey = max(0, min(ey, h - 1))
            ew = min(ew, w - ex)
            eh = min(eh, h - ey)
            if ew < 5 or eh < 5:
                return None
            crop = frame_bgr[ey : ey + eh, ex : ex + ew]
            return cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)

        left_crop = crop_eye(LEFT_EYE_INDICES)
        right_crop = crop_eye(RIGHT_EYE_INDICES)

        return {
            "left": left_crop,
            "right": right_crop,
            "face_roi": face_roi,
            "landmarks": landmarks_px,
        }
