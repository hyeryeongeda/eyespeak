"""
[ARCHIVED] 눈 영역 검출 — OpenCV Haar cascade 기반.

현재 파이프라인은 MediaPipe 기반 검출을 사용합니다. 참고용으로만 보관합니다.
파이프라인: 프레임 → detect() → 왼쪽/오른쪽 눈 크롭 RGB.
"""

import cv2
import numpy as np
from pathlib import Path

# OpenCV 데이터 경로 (기본 설치 시 cascade 파일 위치)
_OPENCV_DATA = Path(cv2.__file__).parent / "data"
_FACE_CASCADE = str(_OPENCV_DATA / "haarcascade_frontalface_default.xml")
_EYE_CASCADE = str(_OPENCV_DATA / "haarcascade_eye.xml")


class EyeDetector:
    """
    BGR 프레임에서 얼굴·눈 검출 후 왼쪽/오른쪽 눈 크롭 반환.
    """

    def __init__(
        self,
        face_cascade_path: str = _FACE_CASCADE,
        eye_cascade_path: str = _EYE_CASCADE,
        min_eye_size: tuple = (30, 30),
    ):
        self.face_cascade = cv2.CascadeClassifier(face_cascade_path)
        self.eye_cascade = cv2.CascadeClassifier(eye_cascade_path)
        self.min_eye_size = min_eye_size

    def detect(self, frame_bgr: np.ndarray) -> dict:
        """
        BGR 프레임에서 눈 영역 검출.
        Returns:
            {
                "left": np.ndarray | None,   # RGB (H,W,3) 눈 크롭
                "right": np.ndarray | None,
                "face_roi": (x,y,w,h) | None,
            }
        """
        if frame_bgr is None or frame_bgr.size == 0:
            return {"left": None, "right": None, "face_roi": None}
        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
        # minSize를 줄여 먼 거리/작은 얼굴도 검출 (캘리 실패 방지)
        faces = self.face_cascade.detectMultiScale(gray, scaleFactor=1.08, minNeighbors=4, minSize=(50, 50))
        if len(faces) == 0:
            return {"left": None, "right": None, "face_roi": None}
        fx, fy, fw, fh = faces[0]
        face_roi = (int(fx), int(fy), int(fw), int(fh))
        roi_gray = gray[fy : fy + fh, fx : fx + fw]
        roi_bgr = frame_bgr[fy : fy + fh, fx : fx + fw]
        eyes = self.eye_cascade.detectMultiScale(
            roi_gray, scaleFactor=1.08, minNeighbors=4, minSize=self.min_eye_size
        )
        left_crop = None
        right_crop = None
        if len(eyes) >= 2:
            # x 좌표로 왼쪽/오른쪽 구분
            eyes = sorted(eyes, key=lambda e: e[0])
            for i, (ex, ey, ew, eh) in enumerate(eyes[:2]):
                crop = roi_bgr[ey : ey + eh, ex : ex + ew]
                crop_rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
                if i == 0:
                    left_crop = crop_rgb
                else:
                    right_crop = crop_rgb
        elif len(eyes) == 1:
            ex, ey, ew, eh = eyes[0]
            crop = roi_bgr[ey : ey + eh, ex : ex + ew]
            crop_rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
            if ex + ew // 2 < fw // 2:
                left_crop = crop_rgb
            else:
                right_crop = crop_rgb
        return {"left": left_crop, "right": right_crop, "face_roi": face_roi}
