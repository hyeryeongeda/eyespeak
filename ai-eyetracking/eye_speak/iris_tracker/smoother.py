"""시선 (yaw, pitch) 스무딩: EMA 및 One-Euro 필터.

``iris_gaze_refine.py``의 리파이너와 ``pipeline.py``의 One-Euro 보조 함수를
하나의 구현으로 통합한다. 기본 하이퍼파라미터는 ``configs/default.yaml``의
``smoothing`` 섹션에서 읽는다.
"""

from __future__ import annotations

import functools
import logging
import math
import time
from typing import Any, Dict, Optional, Tuple

logger = logging.getLogger(__name__)


def _one_euro_quartet_from_smoothing(sm: Dict[str, Any]) -> Tuple[float, float, float, float]:
    """축별 4값 또는 구버전 단일 (min_cutoff, beta) 쌍에서 (mcx, bx, mcy, by)를 만든다."""
    if "one_euro_min_cutoff_x" in sm:
        return (
            float(sm["one_euro_min_cutoff_x"]),
            float(sm["one_euro_beta_x"]),
            float(sm["one_euro_min_cutoff_y"]),
            float(sm["one_euro_beta_y"]),
        )
    mc = float(sm["one_euro_min_cutoff"])
    b = float(sm["one_euro_beta"])
    return (mc, b, mc, b)


@functools.lru_cache(maxsize=1)
def _smoothing_from_config() -> Dict[str, Any]:
    """``smoothing`` 설정을 한 번 로드해 캐시한다.

    Returns:
        ``load_config()[\"smoothing\"]`` 딕셔너리.
    """
    from eye_speak.configs.loader import load_config

    return dict(load_config()["smoothing"])


def one_euro_alpha(fc: float, te: float) -> float:
    """One-Euro 필터: 차단 주파수 ``fc``(Hz), 샘플 간격 ``te``(s)로 알파 계산.

    Args:
        fc: 차단 주파수 (Hz). ``te``가 0 이하이면 필터를 적용하지 않음.
        te: 이전 샘플과의 시간 차(초).

    Returns:
        0~1 사이 저역통과 계수.
    """
    if te <= 0:
        return 1.0
    tau = 1.0 / (2.0 * math.pi * fc)
    return 1.0 / (1.0 + tau / te)


class OneEuroAxis:
    """단일 축(예: yaw 또는 pitch, 또는 화면 rx/ry)에 대한 One-Euro 필터 상태.

    ``iris_gaze_refine._OneEuroAxis``와 ``pipeline._Axis1Euro``의 동작을 합친 클래스.
    ``update``와 ``__call__`` 모두 지원한다.
    """

    def __init__(
        self,
        min_cutoff: Optional[float] = None,
        beta: Optional[float] = None,
    ) -> None:
        sm = _smoothing_from_config()
        mcx, bx, _, _ = _one_euro_quartet_from_smoothing(sm)
        self.min_cutoff = float(min_cutoff if min_cutoff is not None else mcx)
        self.beta = float(beta if beta is not None else bx)
        self._x_prev: Optional[float] = None
        self._dx_prev: float = 0.0

    @property
    def last_filtered(self) -> Optional[float]:
        """마지막으로 필터링된 값. 아직 샘플이 없으면 ``None``."""
        return self._x_prev

    def reset(self) -> None:
        """상태를 초기화한다."""
        self._x_prev = None
        self._dx_prev = 0.0

    def update(self, x: float, te: float) -> float:
        """새 샘플 ``x``를 반영한 필터 출력.

        Args:
            x: 현재 측정값.
            te: 이전 업데이트와의 시간 간격(초). 0 이하면 ``0.02``로 대체.

        Returns:
            스무딩된 값.
        """
        if te <= 0:
            te = 0.02
        if self._x_prev is None:
            self._x_prev = x
            return x
        dx_raw = (x - self._x_prev) / te
        alpha_d = one_euro_alpha(self.min_cutoff, te)
        dx_filtered = alpha_d * dx_raw + (1.0 - alpha_d) * self._dx_prev
        fc = self.min_cutoff + self.beta * abs(dx_filtered)
        alpha_x = one_euro_alpha(fc, te)
        x_filtered = alpha_x * x + (1.0 - alpha_x) * self._x_prev
        self._x_prev = x_filtered
        self._dx_prev = dx_filtered
        return x_filtered

    def __call__(self, x: float, te: float) -> float:
        """``pipeline._Axis1Euro`` 호환: ``update``와 동일."""
        return self.update(x, te)


class OneEuroRefiner:
    """(rx, ry) 쌍에 One-Euro 필터를 적용한다 (축별 min_cutoff·beta).

    느린 움직임에서는 강한 스무딩, 빠른 시선 이동(saccade)에서는 지연을 줄인다.
    """

    def __init__(
        self,
        min_cutoff: Optional[float] = None,
        beta: Optional[float] = None,
        min_cutoff_x: Optional[float] = None,
        beta_x: Optional[float] = None,
        min_cutoff_y: Optional[float] = None,
        beta_y: Optional[float] = None,
    ) -> None:
        sm = _smoothing_from_config()
        mcx0, bx0, mcy0, by0 = _one_euro_quartet_from_smoothing(sm)
        legacy = min_cutoff is not None or beta is not None
        if legacy:
            mcx = float(min_cutoff if min_cutoff is not None else mcx0)
            mcy = mcx
            bx = float(beta if beta is not None else bx0)
            by = bx
        else:
            mcx = float(min_cutoff_x if min_cutoff_x is not None else mcx0)
            bx = float(beta_x if beta_x is not None else bx0)
            mcy = float(min_cutoff_y if min_cutoff_y is not None else mcy0)
            by = float(beta_y if beta_y is not None else by0)
        self._x_filter = OneEuroAxis(mcx, bx)
        self._y_filter = OneEuroAxis(mcy, by)
        self._last_t: Optional[float] = None

    def update(
        self,
        rx: Optional[float],
        ry: Optional[float],
    ) -> Tuple[Optional[float], Optional[float]]:
        """한 프레임의 (rx, ry)를 필터링한다.

        Args:
            rx: 수평 정규화 시선(0~1). ``None``이면 이전 필터 출력을 유지.
            ry: 수직 정규화 시선(0~1).

        Returns:
            ``(filtered_rx, filtered_ry)``. 입력이 ``None``이면 마지막 값.
        """
        if rx is None or ry is None:
            return (
                self._x_filter.last_filtered,
                self._y_filter.last_filtered,
            )
        t = time.time()
        te = (t - self._last_t) if self._last_t is not None else 0.02
        self._last_t = t
        rx_out = self._x_filter.update(rx, te)
        ry_out = self._y_filter.update(ry, te)
        return (rx_out, ry_out)

    def reset(self) -> None:
        """필터 및 시각 상태를 초기화한다."""
        logger.debug("OneEuroRefiner.reset")
        self._x_filter.reset()
        self._y_filter.reset()
        self._last_t = None


class GazeRefiner:
    """(yaw_deg, pitch_deg)에 지수 이동 평균(EMA)을 적용한다."""

    def __init__(self, alpha: Optional[float] = None) -> None:
        sm = _smoothing_from_config()
        a = float(alpha if alpha is not None else sm["gaze_refiner_alpha"])
        self.alpha = max(0.01, min(1.0, a))
        self._yaw: Optional[float] = None
        self._pitch: Optional[float] = None

    def update(
        self,
        yaw_deg: Optional[float],
        pitch_deg: Optional[float],
    ) -> Tuple[Optional[float], Optional[float]]:
        """한 프레임 (yaw, pitch) 입력 → 스무딩된 (yaw, pitch) 반환."""
        if yaw_deg is None or pitch_deg is None:
            return (self._yaw, self._pitch)
        if self._yaw is None:
            self._yaw, self._pitch = yaw_deg, pitch_deg
            return (yaw_deg, pitch_deg)
        self._yaw = self.alpha * yaw_deg + (1 - self.alpha) * self._yaw
        self._pitch = self.alpha * pitch_deg + (1 - self.alpha) * self._pitch
        return (self._yaw, self._pitch)

    def reset(self) -> None:
        """상태 초기화 (캘리 후 등)."""
        self._yaw = None
        self._pitch = None
