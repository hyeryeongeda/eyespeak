"""
전처리 공통화 (3-1). OpenCV 기반.
학습/추론 동일 적용. 밝기·대비·노이즈·눈 크롭 보정.
"""

import cv2
import numpy as np


def preprocess_frame(
    frame: np.ndarray,
    use_clahe: bool = True,
    use_denoise: bool = True,
    clahe_clip_limit: float = 2.0,
    clahe_grid_size: tuple = (8, 8),
) -> np.ndarray:
    """
    프레임(BGR) 전처리: CLAHE로 밝기·대비 보정, 비네이즈로 노이즈 감소.
    """
    out = frame.copy()
    if use_clahe and len(out.shape) >= 2:
        if out.shape[2] == 3:
            lab = cv2.cvtColor(out, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            clahe = cv2.createCLAHE(clipLimit=clahe_clip_limit, tileGridSize=clahe_grid_size)
            l = clahe.apply(l)
            out = cv2.merge([l, a, b])
            out = cv2.cvtColor(out, cv2.COLOR_LAB2BGR)
        else:
            clahe = cv2.createCLAHE(clipLimit=clahe_clip_limit, tileGridSize=clahe_grid_size)
            out = clahe.apply(out)
    if use_denoise and out.size > 0:
        out = cv2.fastNlMeansDenoisingColored(
            out, None, h=10, hForColorComponents=10, templateWindowSize=7, searchWindowSize=21
        )
    return out


def preprocess_eye_crop(
    eye_rgb: np.ndarray,
    target_size: tuple = (224, 224),
    use_clahe: bool = True,
    use_denoise: bool = False,
) -> np.ndarray:
    """
    눈 크롭 이미지(RGB, H×W×3) 보정 후 리사이즈.
    모델 입력 전에 호출하거나, transform에서 리사이즈만 할 수도 있음.
    target_size는 config_gaze.GAZE_INPUT_SIZE와 맞출 것.
    """
    if eye_rgb is None or eye_rgb.size == 0:
        return None
    out = cv2.cvtColor(eye_rgb, cv2.COLOR_RGB2BGR) if eye_rgb.shape[2] == 3 else eye_rgb
    if use_clahe:
        lab = cv2.cvtColor(out, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        l = clahe.apply(l)
        out = cv2.merge([l, a, b])
        out = cv2.cvtColor(out, cv2.COLOR_LAB2BGR)
    if use_denoise:
        out = cv2.fastNlMeansDenoisingColored(out, None, h=6, hForColorComponents=6, templateWindowSize=5, searchWindowSize=11)
    out = cv2.resize(out, (target_size[1], target_size[0]), interpolation=cv2.INTER_LINEAR)
    return cv2.cvtColor(out, cv2.COLOR_BGR2RGB)
