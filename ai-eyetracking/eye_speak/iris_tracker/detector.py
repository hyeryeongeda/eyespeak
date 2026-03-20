"""MediaPipe Face Mesh / FaceLandmarker 기반 얼굴·눈 검출."""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np

logger = logging.getLogger(__name__)

try:
    import mediapipe as mp

    MP_AVAILABLE = True
except ImportError:
    MP_AVAILABLE = False
    mp = None  # type: ignore

RIGHT_EYE_INDICES = [
    33, 7, 163, 144, 145, 153, 154, 155, 133, 246, 161, 160, 159, 158, 157, 173,
]
LEFT_EYE_INDICES = [
    263, 249, 390, 373, 374, 380, 381, 382, 362, 466, 388, 387, 386, 385, 384, 398,
]
FACE_LANDMARKER_MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/"
    "face_landmarker/float16/1/face_landmarker.task"
)


def _repo_root() -> Path:
    """``eye_speak/iris_tracker/detector.py`` 기준 저장소 루트."""
    return Path(__file__).resolve().parent.parent.parent


def _landmarks_to_bbox(
    landmarks_xy: List[Tuple[int, int]], pad_pct: float = 0.1
) -> Tuple[int, int, int, int]:
    xs = [p[0] for p in landmarks_xy]
    ys = [p[1] for p in landmarks_xy]
    xmin, xmax = min(xs), max(xs)
    ymin, ymax = min(ys), max(ys)
    w_box = xmax - xmin
    h_box = ymax - ymin
    pad_w = max(2, int(w_box * pad_pct))
    pad_h = max(2, int(h_box * pad_pct))
    x = max(0, int(xmin) - pad_w)
    y = max(0, int(ymin) - pad_h)
    w_box = int(w_box + 2 * pad_w)
    h_box = int(h_box + 2 * pad_h)
    return (x, y, w_box, h_box)


def _get_face_landmarker_model_path() -> Optional[str]:
    path = os.environ.get("FACE_LANDMARKER_MODEL")
    if path and os.path.isfile(path):
        return path
    default = _repo_root() / "checkpoints" / "face_landmarker.task"
    if default.is_file():
        return str(default)
    try:
        import urllib.request

        default.parent.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(FACE_LANDMARKER_MODEL_URL, default)
        return str(default)
    except Exception as exc:
        logger.warning("Face landmarker model download failed: %s", exc)
        return None


def _create_legacy_face_mesh(
    mp_mod: Any, min_detection_confidence: float, min_tracking_confidence: float
) -> Any:
    return mp_mod.solutions.face_mesh.FaceMesh(
        static_image_mode=False,
        max_num_faces=1,
        refine_landmarks=True,
        min_detection_confidence=min_detection_confidence,
        min_tracking_confidence=min_tracking_confidence,
    )


def _create_face_landmarker_tasks(
    min_face_detection_confidence: float, min_tracking_confidence: float
) -> Any:
    from mediapipe.tasks.python.core import base_options
    from mediapipe.tasks.python.vision import face_landmarker
    from mediapipe.tasks.python.vision.core import vision_task_running_mode

    model_path = _get_face_landmarker_model_path()
    if not model_path:
        return None
    opts = base_options.BaseOptions(model_asset_path=model_path)
    options = face_landmarker.FaceLandmarkerOptions(
        base_options=opts,
        running_mode=vision_task_running_mode.VisionTaskRunningMode.IMAGE,
        num_faces=1,
        min_face_detection_confidence=min_face_detection_confidence,
        min_face_presence_confidence=0.5,
        min_tracking_confidence=min_tracking_confidence,
    )
    return face_landmarker.FaceLandmarker.create_from_options(options)


class MediaPipeDetector:
    """BGR 프레임 → 랜드마크·눈 크롭·얼굴 ROI."""

    def __init__(
        self,
        min_detection_confidence: float = 0.3,
        min_tracking_confidence: float = 0.3,
    ) -> None:
        if not MP_AVAILABLE:
            raise ImportError("mediapipe is required")
        self._legacy_face_mesh: Any = None
        self._face_landmarker: Any = None
        self._use_legacy = False
        if getattr(mp, "solutions", None) and getattr(mp.solutions, "face_mesh", None):
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
                    min_detection_confidence, min_tracking_confidence
                )
            except Exception:
                self._face_landmarker = None
            if self._face_landmarker is None:
                raise ImportError(
                    "MediaPipe FaceLandmarker unavailable; set FACE_LANDMARKER_MODEL "
                    "or use mediapipe 0.9.x with face_mesh"
                )

    def detect(self, frame_bgr: np.ndarray) -> Dict[str, Any]:
        """얼굴을 검출한다.

        Returns:
            ``left``, ``right`` (RGB 크롭), ``face_roi``, ``landmarks`` 키.
        """
        if frame_bgr is None or frame_bgr.size == 0:
            return {"left": None, "right": None, "face_roi": None, "landmarks": None}
        h, w = frame_bgr.shape[:2]
        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        if self._use_legacy and self._legacy_face_mesh is not None:
            results = self._legacy_face_mesh.process(rgb)
            if not results.multi_face_landmarks:
                return {"left": None, "right": None, "face_roi": None, "landmarks": None}
            lm = results.multi_face_landmarks[0]
            landmarks_px = [(int(p.x * w), int(p.y * h)) for p in lm.landmark]
        else:
            from mediapipe.tasks.python.vision.core import image as image_lib

            mp_image = image_lib.Image(
                image_lib.ImageFormat.SRGB, np.ascontiguousarray(rgb)
            )
            result = self._face_landmarker.detect(mp_image)
            if not result.face_landmarks:
                return {"left": None, "right": None, "face_roi": None, "landmarks": None}
            face_landmarks = result.face_landmarks[0]
            landmarks_px = [(int(p.x * w), int(p.y * h)) for p in face_landmarks]

        fx, fy, fw, fh = _landmarks_to_bbox(landmarks_px, pad_pct=0.15)
        fx = max(0, min(fx, w - 1))
        fy = max(0, min(fy, h - 1))
        fw = min(fw, w - fx)
        fh = min(fh, h - fy)
        face_roi = (int(fx), int(fy), int(fw), int(fh))

        def crop_eye(indices: List[int]) -> Optional[np.ndarray]:
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

        return {
            "left": crop_eye(LEFT_EYE_INDICES),
            "right": crop_eye(RIGHT_EYE_INDICES),
            "face_roi": face_roi,
            "landmarks": landmarks_px,
        }
