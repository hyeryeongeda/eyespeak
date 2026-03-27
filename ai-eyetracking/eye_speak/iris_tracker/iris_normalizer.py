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
    L_EYEBROW,
    L_IRIS,
    R_EAR,
    R_EYE_INNER,
    R_EYE_LOWER,
    R_EYE_OUTER,
    R_EYE_UPPER,
    R_EYEBROW,
    R_IRIS,
)

logger = logging.getLogger(__name__)

_EPS: Final[float] = 1e-6
_MIN_LANDMARKS: Final[int] = 478
_last_raw_ratio_y: Optional[float] = None

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
    y_gain: Optional[float] = None,
    feature_weights: Optional[Tuple[float, float, float, float]] = None,
) -> Tuple[Optional[float], Optional[float], float, bool]:
    """홍채 상대 위치(0~1)와 평균 EAR·깜빡임 여부를 계산한다.

    Args:
        landmarks_px: 픽셀 좌표 리스트(최소 478점). 비어 있거나 부족하면 신뢰 불가.
        blink_threshold: EAR 임계값. ``None``이면 YAML ``blink_ear_threshold`` 사용.
        y_gain: Y축 amplification gain. ``None``이면 기본 ``7.0``.

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
    global _last_raw_ratio_y
    _last_raw_ratio_y = None

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

    for outer, inner, iris_idxs, eyebrow_indices, upper_indices, lower_indices, ear_per_eye in (
        (R_EYE_OUTER, R_EYE_INNER, R_IRIS, R_EYEBROW, R_EYE_UPPER, R_EYE_LOWER, ear_r),
        (L_EYE_INNER, L_EYE_OUTER, L_IRIS, L_EYEBROW, L_EYE_UPPER, L_EYE_LOWER, ear_l),
    ):
        lx, ly = landmarks_px[outer]
        rx, ry = landmarks_px[inner]
        if lx > rx:
            lx, ly, rx, ry = rx, ry, lx, ly

        eye_w = rx - lx
        if eye_w < _EPS:
            continue

        # 랜드마크 Y좌표 수집
        eyebrow_ys = [landmarks_px[i][1] for i in eyebrow_indices]
        upper_ys = [landmarks_px[i][1] for i in upper_indices]
        lower_ys = [landmarks_px[i][1] for i in lower_indices]
        eyebrow_y = statistics.median(eyebrow_ys)
        upper_lid_y = statistics.median(upper_ys)
        by_median = statistics.median(lower_ys)
        vert_span = abs(by_median - eyebrow_y)

        n_iris = max(len(iris_idxs), 1)
        iris_x = sum(landmarks_px[i][0] for i in iris_idxs) / float(n_iris)
        iris_y = sum(landmarks_px[i][1] for i in iris_idxs) / float(n_iris)

        # --- X축: eye corner 기준 (변경 없음) ---
        rx_ratio = (iris_x - lx) / eye_w
        rx_ratio = max(0.0, min(1.0, rx_ratio))

        # --- Y축: 다중 특징 복합 점수 ---
        # 특징 1: 홍채 Y 위치 (눈썹 기준, 약한 신호)
        ry_iris = (iris_y - eyebrow_y) / (vert_span + _EPS)
        ry_iris = max(0.0, min(1.0, ry_iris))

        # 특징 2: 공막 비율 (위를 보면 아래 공막↑ → ratio↓, 아래를 보면 위 공막↑ → ratio↑)
        upper_sclera = max(0.0, iris_y - upper_lid_y)
        lower_sclera = max(0.0, by_median - iris_y)
        sclera_sum = upper_sclera + lower_sclera + _EPS
        sclera_ratio = upper_sclera / sclera_sum
        sclera_ratio = max(0.0, min(1.0, sclera_ratio))

        # 특징 3: 눈꺼풀-홍채 비대칭 (위를 보면 upper↓lower↑ → ratio↓)
        lid_asymmetry = upper_sclera / (lower_sclera + _EPS)
        lid_asym_norm = max(0.0, min(1.0, lid_asymmetry / 3.0))

        # 특징 4: EAR 역방향 (눈이 크게 떠짐=위를 봄=screen_y 낮아야 함)
        ear_norm = max(0.0, min(1.0, (ear_per_eye - 0.15) / 0.25))
        ear_y_component = 1.0 - ear_norm

        # 가중 복합 (리서치 기반 가중치)
        w = feature_weights if feature_weights is not None else (0.35, 0.15, 0.30, 0.20)
        ry_ratio = (
            w[0] * ry_iris
            + w[1] * ear_y_component
            + w[2] * sclera_ratio
            + w[3] * lid_asym_norm
        )
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

    # --- Iris ratio amplification ---
    _CENTER = 0.5
    _GAIN_X = 4.0
    _GAIN_Y = y_gain if y_gain is not None else 5.0

    _last_raw_ratio_y = ratio_y

    logger.debug("[PRE-GAIN] raw_ratio_x=%.4f raw_ratio_y=%.4f", ratio_x, ratio_y)

    ratio_x = max(0.0, min(1.0, _CENTER + (ratio_x - _CENTER) * _GAIN_X))
    ratio_y = max(0.0, min(1.0, _CENTER + (ratio_y - _CENTER) * _GAIN_Y))

    return (ratio_x, ratio_y, ear_avg, is_blinking)


class IrisNormalizer:
    """홍채 비율·EAR 계산기 (:func:`compute_iris_position` 래퍼)."""

    def __init__(self, blink_threshold: Optional[float] = None) -> None:
        """Args:
            blink_threshold: EAR 임계값. ``None``이면 설정 파일 기본값.
        """
        self.blink_threshold: Optional[float] = blink_threshold
        self._y_gain: Optional[float] = None
        self._feature_weights: Tuple[float, float, float, float] = (0.35, 0.15, 0.30, 0.20)
        # PRE-gain 자동 센터: 첫 60프레임 raw 복합 Y 중앙값 기준 오프셋
        self._y_center_offset: float = 0.0
        self._center_samples: List[float] = []
        self._center_locked: bool = False
        self._AUTO_CENTER_FRAMES: int = 60

    def set_y_gain(self, gain: float) -> None:
        """캘리브레이션에서 계산된 Y축 전용 gain을 설정한다."""
        self._y_gain = float(gain)
        logger.info("IrisNormalizer: Y gain set to %.2f", self._y_gain)

    def set_feature_weights(
        self, w_iris: float, w_ear: float, w_sclera: float, w_lid: float
    ) -> None:
        """캘리브레이션에서 계산된 Y축 특징 가중치를 설정한다.

        합계가 1.0이 아니면 자동 정규화한다.
        """
        total = w_iris + w_ear + w_sclera + w_lid
        if total <= 0:
            logger.warning("set_feature_weights: invalid total %.4f, keeping defaults", total)
            return
        self._feature_weights = (
            w_iris / total,
            w_ear / total,
            w_sclera / total,
            w_lid / total,
        )
        logger.info(
            "IrisNormalizer: feature weights set to iris=%.2f ear=%.2f sclera=%.2f lid=%.2f",
            *self._feature_weights,
        )

    def reset_center(self) -> None:
        """자동 센터 오프셋을 초기화한다 (재캘리브레이션 시 호출)."""
        self._y_center_offset = 0.0
        self._center_samples.clear()
        self._center_locked = False
        logger.info("IrisNormalizer: auto-center reset")

    @property
    def y_gain(self) -> Optional[float]:
        return self._y_gain

    @property
    def feature_weights(self) -> Tuple[float, float, float, float]:
        return self._feature_weights

    def __call__(
        self, landmarks_px: Optional[LandmarksPx]
    ) -> Tuple[Optional[float], Optional[float], float, bool]:
        """랜드마크에서 비율 좌표와 EAR을 반환한다.

        첫 60프레임 동안 PRE-gain Y축 중앙값을 수집하여 자동 센터를 계산한다.
        """
        rx, ry, ear, blink = compute_iris_position(
            landmarks_px, self.blink_threshold, self._y_gain, self._feature_weights
        )

        if rx is not None and ry is not None and not blink:
            raw_y = _last_raw_ratio_y  # compute_iris_position이 저장한 PRE-gain 값

            if not self._center_locked and raw_y is not None:
                self._center_samples.append(raw_y)
                if len(self._center_samples) >= self._AUTO_CENTER_FRAMES:
                    median_y = statistics.median(self._center_samples)
                    # PRE-gain 센터를 0.5로 맞추기 위한 오프셋
                    self._y_center_offset = 0.5 - median_y
                    self._center_locked = True
                    logger.info(
                        "Auto-center Y (PRE-gain): offset=%.4f (median=%.4f, samples=%d)",
                        self._y_center_offset,
                        median_y,
                        len(self._center_samples),
                    )

            # PRE-gain 보정: raw_y에 오프셋 적용 후 gain 재적용
            if self._center_locked and raw_y is not None:
                _GAIN_Y = self._y_gain if self._y_gain is not None else 7.0
                corrected_raw = raw_y + self._y_center_offset
                ry = max(0.0, min(1.0, 0.5 + (corrected_raw - 0.5) * _GAIN_Y))

        return (rx, ry, ear, blink)
