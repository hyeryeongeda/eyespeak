"""OpenCV 전처리(CLAHE·디노이즈) 및 학습용 ``torchvision`` 증강."""

from __future__ import annotations

import logging
from typing import Tuple

import cv2
import numpy as np
from torchvision import transforms

logger = logging.getLogger(__name__)


def apply_clahe_bgr(
    frame_bgr: np.ndarray,
    clip_limit: float = 2.0,
    tile_grid_size: Tuple[int, int] = (8, 8),
) -> np.ndarray:
    """BGR 이미지에 CLAHE를 적용한다 (L 채널).

    Args:
        frame_bgr: ``H×W×3`` BGR ``uint8``.
        clip_limit: CLAHE 클리핑 한계.
        tile_grid_size: 타일 그리드 크기.

    Returns:
        보정된 BGR 이미지.
    """
    out = frame_bgr.copy()
    if len(out.shape) >= 2 and out.shape[2] == 3:
        lab = cv2.cvtColor(out, cv2.COLOR_BGR2LAB)
        l_ch, a_ch, b_ch = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)
        l_ch = clahe.apply(l_ch)
        out = cv2.merge([l_ch, a_ch, b_ch])
        out = cv2.cvtColor(out, cv2.COLOR_LAB2BGR)
    return out


def denoise_bgr_colored(
    frame_bgr: np.ndarray,
    h: int = 10,
    h_color: int = 10,
    template_window_size: int = 7,
    search_window_size: int = 21,
) -> np.ndarray:
    """``fastNlMeansDenoisingColored``로 컬러 노이즈를 줄인다.

    Args:
        frame_bgr: BGR 이미지.
        h: 필터 강도 (루마).
        h_color: 색 성분 강도.
        template_window_size: 템플릿 윈도 크기.
        search_window_size: 탐색 윈도 크기.

    Returns:
        디노이징된 BGR 이미지.
    """
    if frame_bgr.size == 0:
        return frame_bgr
    return cv2.fastNlMeansDenoisingColored(
        frame_bgr,
        None,
        h=h,
        hForColorComponents=h_color,
        templateWindowSize=template_window_size,
        searchWindowSize=search_window_size,
    )


def preprocess_frame_cv(
    frame_bgr: np.ndarray,
    use_clahe: bool = True,
    use_denoise: bool = True,
    clahe_clip_limit: float = 2.0,
    clahe_grid_size: Tuple[int, int] = (8, 8),
) -> np.ndarray:
    """프레임 단위 CLAHE + 선택적 디노이즈 (``preprocess.preprocess_frame``와 동등)."""
    out = frame_bgr.copy()
    if use_clahe and len(out.shape) >= 2:
        if out.shape[2] == 3:
            out = apply_clahe_bgr(out, clahe_clip_limit, clahe_grid_size)
        else:
            clahe = cv2.createCLAHE(
                clipLimit=clahe_clip_limit, tileGridSize=clahe_grid_size
            )
            out = clahe.apply(out)
    if use_denoise and out.size > 0:
        out = denoise_bgr_colored(out)
    return out


def build_train_augmentation(
    image_size: Tuple[int, int] = (64, 64),
) -> transforms.Compose:
    """학습용 증강: 밝기·대비·회전·좌우반전 후 텐서화.

    Args:
        image_size: ``(H, W)`` 리사이즈 목표.

    Returns:
        ``PIL.Image`` 또는 ``numpy`` 입력을 받을 수 있는 ``Compose`` (ToTensor 포함).
    """
    return transforms.Compose(
        [
            transforms.Resize(image_size),
            transforms.ColorJitter(brightness=0.25, contrast=0.25),
            transforms.RandomRotation(degrees=15),
            transforms.RandomHorizontalFlip(p=0.5),
            transforms.ToTensor(),
        ]
    )


def build_eval_transform(image_size: Tuple[int, int] = (64, 64)) -> transforms.Compose:
    """검증/추론용: 리사이즈 + 텐서."""
    return transforms.Compose(
        [transforms.Resize(image_size), transforms.ToTensor()]
    )
