"""홍채 위치 비율(0~1) 계산 및 EAR 기반 깜빡임 감지.

MediaPipe 478점 픽셀 랜드마크를 입력으로 하며,
깜빡임 임계값은 ``configs/default.yaml``의 ``smoothing.blink_ear_threshold``에서 읽는다.
"""

from __future__ import annotations

import functools
import logging
import math
import statistics
from typing import Final, List, Optional, Sequence, Tuple

from eye_speak.iris_tracker.landmarks import (
    L_EAR,
    L_EYE_INNER,
    L_EYE_LOWER,
    L_EYE_OUTER,
    L_EYE_UPPER,
    L_IRIS,
    R_EAR,
    R_EYE_INNER,
    R_EYE_LOWER,
    R_EYE_OUTER,
    R_EYE_UPPER,
    R_IRIS,
)

logger = logging.getLogger(__name__)

_EPS: Final[float] = 1e-6
_MIN_LANDMARKS: Final[int] = 478

Point = Tuple[float, float]
LandmarksPx = Sequence[Point]


def _dist(a: Point, b: Point) -> float:
    """두 픽셀 좌표 사이 유클리드 거리.

    Args:
        a: 점 ``(x, y)``.
        b: 점 ``(x, y)``.

    Returns:
        거리(픽셀).
    """
    return math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2)


def _ear(lm: LandmarksPx, indices: Sequence[int]) -> float:
    """Eye Aspect Ratio: ``(|p2-p6| + |p3-p5|) / (2 * |p1-p4|)``.

    Args:
        lm: 인덱스별 ``(x, y)`` 랜드마크.
        indices: EAR 정의에 맞는 6개 랜드마크 인덱스.

    Returns:
        EAR 값. 수평 거리가 너무 작으면 ``0.0``.
    """
    p: List[Point] = [lm[i] for i in indices]
    vert1 = _dist(p[1], p[5])
    vert2 = _dist(p[2], p[4])
    horiz = _dist(p[0], p[3])
    if horiz < _EPS:
        return 0.0
    return (vert1 + vert2) / (2.0 * horiz)


@functools.lru_cache(maxsize=1)
def _blink_ear_threshold_from_config() -> float:
    """YAML ``smoothing.blink_ear_threshold``를 한 번 로드해 캐시한다.

    Returns:
        깜빡임 판정 EAR 임계값.
    """
    from eye_speak.configs.loader import load_config

    return float(load_config()["smoothing"]["blink_ear_threshold"])


def normalize_to_signed(ratio: Optional[float]) -> Optional[float]:
    """0~1 비율을 -1~+1 정규화 구간으로 선형 변환.

    Args:
        ratio: ``0.0``~``1.0`` 사이 비율. ``None``이면 ``None`` 반환.

    Returns:
        ``2 * clamp(ratio) - 1``. 입력이 ``None``이면 ``None``.
    """
    if ratio is None:
        return None
    r = max(0.0, min(1.0, ratio))
    return 2.0 * r - 1.0


def compute_iris_position(
    landmarks_px: Optional[LandmarksPx],
    blink_threshold: Optional[float] = None,
) -> Tuple[Optional[float], Optional[float], float, bool]:
    """홍채 상대 위치(0~1)와 평균 EAR·깜빡임 여부를 계산한다.

    Args:
        landmarks_px: 픽셀 좌표 리스트(최소 478점). 비어 있거나 부족하면 신뢰 불가.
        blink_threshold: EAR 임계값. ``None``이면 YAML ``blink_ear_threshold`` 사용.

    Returns:
        ``(ratio_x, ratio_y, ear_avg, is_blinking)``.
        깜빡임이거나 유효 눈 폭이 없으면 ``ratio_x``, ``ratio_y``는 ``None``.
        ``ratio_*``는 각각 ``0``~``1``로 클램프된다.
    """
    # 좌표 규약 (Coordinate Convention):
    # - 입력 landmarks: 미러된 프레임 기준 (카메라 좌우반전 상태)
    # - rx = 0.0: 프레임 좌측 (사용자 우측)
    # - rx = 1.0: 프레임 우측 (사용자 좌측)
    # - ry = 0.0: 프레임 상단
    # - ry = 1.0: 프레임 하단
    # - 캘리브레이션과 런타임 모두 미러된 프레임을 입력으로 받아야 함
    if blink_threshold is None:
        blink_threshold = _blink_ear_threshold_from_config()

    if not landmarks_px or len(landmarks_px) < _MIN_LANDMARKS:
        logger.debug(
            "compute_iris_position: insufficient landmarks (need %s)",
            _MIN_LANDMARKS,
        )
        return (None, None, 0.0, True)

    ear_r = _ear(landmarks_px, R_EAR)
    ear_l = _ear(landmarks_px, L_EAR)
    ear_avg = (ear_r + ear_l) / 2.0
    is_blinking = ear_avg < blink_threshold

    if is_blinking:
        return (None, None, ear_avg, True)

    ratios_x: List[float] = []
    ratios_y: List[float] = []
    conf_list: List[float] = []

    for outer, inner, iris_idxs, upper_indices, lower_indices, ear_per_eye in (
        (R_EYE_OUTER, R_EYE_INNER, R_IRIS, R_EYE_UPPER, R_EYE_LOWER, ear_r),
        (L_EYE_INNER, L_EYE_OUTER, L_IRIS, L_EYE_UPPER, L_EYE_LOWER, ear_l),
    ):
        lx, ly = landmarks_px[outer]
        rx, ry = landmarks_px[inner]
        if lx > rx:
            lx, ly, rx, ry = rx, ry, lx, ly

        eye_w = rx - lx
        if eye_w < _EPS:
            continue

        upper_ys = [landmarks_px[i][1] for i in upper_indices]
        lower_ys = [landmarks_px[i][1] for i in lower_indices]
        ty_median = statistics.median(upper_ys)
        by_median = statistics.median(lower_ys)
        eye_h = abs(by_median - ty_median)

        n_iris = max(len(iris_idxs), 1)
        iris_x = sum(landmarks_px[i][0] for i in iris_idxs) / float(n_iris)
        iris_y = sum(landmarks_px[i][1] for i in iris_idxs) / float(n_iris)

        rx_ratio = (iris_x - lx) / eye_w
        rx_ratio = max(0.0, min(1.0, rx_ratio))
        denom_y = eye_h + _EPS
        ry_ratio = (iris_y - ty_median) / denom_y
        ry_ratio = max(0.0, min(1.0, ry_ratio))

        confidence = eye_w * ear_per_eye
        conf_list.append(confidence)
        ratios_x.append(rx_ratio)
        ratios_y.append(ry_ratio)

    if not ratios_x:
        logger.debug("compute_iris_position: no valid eye width after filtering")
        return (None, None, ear_avg, True)

    sum_conf = sum(conf_list)
    if sum_conf > _EPS:
        ratio_x = sum(c * rx for c, rx in zip(conf_list, ratios_x)) / sum_conf
        ratio_y = sum(c * ry for c, ry in zip(conf_list, ratios_y)) / sum_conf
    else:
        ratio_x = sum(ratios_x) / len(ratios_x)
        ratio_y = sum(ratios_y) / len(ratios_y)
    return (ratio_x, ratio_y, ear_avg, is_blinking)


class IrisNormalizer:
    """홍채 비율·EAR 계산기 (:func:`compute_iris_position` 래퍼)."""

    def __init__(self, blink_threshold: Optional[float] = None) -> None:
        """Args:
            blink_threshold: EAR 임계값. ``None``이면 설정 파일 기본값.
        """
        self.blink_threshold: Optional[float] = blink_threshold

    def __call__(
        self, landmarks_px: Optional[LandmarksPx]
    ) -> Tuple[Optional[float], Optional[float], float, bool]:
        """랜드마크에서 비율 좌표와 EAR을 반환한다."""
        return compute_iris_position(landmarks_px, self.blink_threshold)
