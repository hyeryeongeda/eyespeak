"""Shared smoothing and runtime gaze-stability helpers."""

from __future__ import annotations

import functools
import logging
import math
import time
from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple

logger = logging.getLogger(__name__)


def _one_euro_quartet_from_smoothing(sm: Dict[str, Any]) -> Tuple[float, float, float, float]:
    """Return per-axis One-Euro parameters from smoothing config."""
    if "one_euro_min_cutoff_x" in sm:
        return (
            float(sm["one_euro_min_cutoff_x"]),
            float(sm["one_euro_beta_x"]),
            float(sm["one_euro_min_cutoff_y"]),
            float(sm["one_euro_beta_y"]),
        )
    mc = float(sm["one_euro_min_cutoff"])
    beta = float(sm["one_euro_beta"])
    return (mc, beta, mc, beta)


@functools.lru_cache(maxsize=1)
def _smoothing_from_config() -> Dict[str, Any]:
    from eye_speak.configs.loader import load_config

    return dict(load_config()["smoothing"])


def one_euro_alpha(fc: float, te: float) -> float:
    if te <= 0:
        return 1.0
    tau = 1.0 / (2.0 * math.pi * fc)
    return 1.0 / (1.0 + tau / te)


def _is_valid_normalized(value: Optional[float]) -> bool:
    return value is not None and math.isfinite(value) and 0.0 <= value <= 1.0


@dataclass(frozen=True)
class StabilizedPoint:
    x: Optional[float]
    y: Optional[float]
    space: str
    reason: str
    used_fallback: bool = False
    outlier_suppressed: bool = False


class OneEuroAxis:
    """One-Euro filter state for a single axis."""

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
        return self._x_prev

    def reset(self) -> None:
        self._x_prev = None
        self._dx_prev = 0.0

    def update(self, x: float, te: float) -> float:
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
        return self.update(x, te)


class OneEuroRefiner:
    """Apply One-Euro smoothing to an (rx, ry) pair."""

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
        if rx is None or ry is None:
            return (self._x_filter.last_filtered, self._y_filter.last_filtered)
        t = time.time()
        te = (t - self._last_t) if self._last_t is not None else 0.02
        self._last_t = t
        return (self._x_filter.update(rx, te), self._y_filter.update(ry, te))

    def reset(self) -> None:
        logger.debug("OneEuroRefiner.reset")
        self._x_filter.reset()
        self._y_filter.reset()
        self._last_t = None


class ScreenStabilizer:
    """Validate screen candidates and prefer safer fallbacks on outliers."""

    def __init__(
        self,
        outlier_distance: Optional[float] = None,
        fallback_jump_margin: Optional[float] = None,
    ) -> None:
        sm = _smoothing_from_config()
        self._outlier_distance = max(
            0.01,
            float(
                outlier_distance
                if outlier_distance is not None
                else sm.get("screen_outlier_distance", 0.35)
            ),
        )
        self._fallback_jump_margin = max(
            0.0,
            float(
                fallback_jump_margin
                if fallback_jump_margin is not None
                else sm.get("screen_fallback_jump_margin", 0.08)
            ),
        )
        self._last_x: Optional[float] = None
        self._last_y: Optional[float] = None

    def reset(self) -> None:
        self._last_x = None
        self._last_y = None

    def stabilize(
        self,
        primary_x: Optional[float],
        primary_y: Optional[float],
        *,
        primary_space: str,
        fallback_x: Optional[float] = None,
        fallback_y: Optional[float] = None,
        fallback_space: str = "ratio",
        prefer_hold: bool = False,
    ) -> StabilizedPoint:
        primary_valid = _is_valid_normalized(primary_x) and _is_valid_normalized(primary_y)
        fallback_valid = _is_valid_normalized(fallback_x) and _is_valid_normalized(fallback_y)

        choice_x = primary_x
        choice_y = primary_y
        choice_space = primary_space
        used_fallback = False
        outlier_suppressed = False
        reason = "primary"

        if not primary_valid:
            if not fallback_valid:
                return StabilizedPoint(None, None, primary_space, "invalid_primary")
            choice_x = fallback_x
            choice_y = fallback_y
            choice_space = fallback_space
            used_fallback = True
            reason = "fallback_invalid_primary"
        elif self._last_x is not None and self._last_y is not None and fallback_valid:
            dist_primary = math.hypot(primary_x - self._last_x, primary_y - self._last_y)
            dist_fallback = math.hypot(fallback_x - self._last_x, fallback_y - self._last_y)
            if (
                dist_primary > self._outlier_distance
                and dist_fallback + self._fallback_jump_margin < dist_primary
            ):
                choice_x = fallback_x
                choice_y = fallback_y
                choice_space = fallback_space
                used_fallback = True
                outlier_suppressed = True
                reason = "fallback_outlier_jump"
            elif prefer_hold and dist_primary > self._outlier_distance:
                return StabilizedPoint(
                    None,
                    None,
                    primary_space,
                    "prefer_hold_outlier_jump",
                    outlier_suppressed=True,
                )

        if not (_is_valid_normalized(choice_x) and _is_valid_normalized(choice_y)):
            return StabilizedPoint(None, None, choice_space, "invalid_choice")

        self._last_x = float(choice_x)
        self._last_y = float(choice_y)
        return StabilizedPoint(
            float(choice_x),
            float(choice_y),
            choice_space,
            reason,
            used_fallback=used_fallback,
            outlier_suppressed=outlier_suppressed,
        )


class GazeRefiner:
    """Apply simple EMA smoothing to (yaw, pitch)."""

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
        if yaw_deg is None or pitch_deg is None:
            return (self._yaw, self._pitch)
        if self._yaw is None:
            self._yaw, self._pitch = yaw_deg, pitch_deg
            return (yaw_deg, pitch_deg)
        self._yaw = self.alpha * yaw_deg + (1.0 - self.alpha) * self._yaw
        self._pitch = self.alpha * pitch_deg + (1.0 - self.alpha) * self._pitch
        return (self._yaw, self._pitch)

    def reset(self) -> None:
        self._yaw = None
        self._pitch = None
