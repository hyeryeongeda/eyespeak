"""Tests for smoothing and runtime stability helpers."""

from __future__ import annotations

import pytest

from eye_speak.configs.loader import load_config
from eye_speak.iris_tracker.smoother import (
    GazeRefiner,
    OneEuroAxis,
    OneEuroRefiner,
    ScreenStabilizer,
)


def test_gaze_refiner_ema_smooths_toward_constant() -> None:
    r = GazeRefiner(alpha=0.5)
    y, p = r.update(10.0, 20.0)
    assert y == 10.0 and p == 20.0
    y2, p2 = r.update(10.0, 20.0)
    assert y2 == 10.0 and p2 == 20.0
    y3, p3 = r.update(0.0, 0.0)
    assert y3 == 5.0 and p3 == 10.0


def test_gaze_refiner_reset() -> None:
    r = GazeRefiner(alpha=0.3)
    r.update(1.0, 2.0)
    r.reset()
    y, p = r.update(9.0, 9.0)
    assert y == 9.0 and p == 9.0


def test_one_euro_axis_reset() -> None:
    ax = OneEuroAxis(min_cutoff=1.0, beta=0.01)
    v1 = ax.update(1.0, 0.02)
    assert v1 == 1.0
    v2 = ax.update(2.0, 0.02)
    assert v2 != 1.0
    ax.reset()
    v3 = ax.update(5.0, 0.02)
    assert v3 == 5.0


def test_one_euro_refiner_tracks_step(monkeypatch: pytest.MonkeyPatch) -> None:
    import eye_speak.iris_tracker.smoother as smoother_module

    timestamps = iter((1000.0, 1000.033, 1000.066))
    monkeypatch.setattr(smoother_module.time, "time", lambda: next(timestamps))

    o = OneEuroRefiner(min_cutoff=2.0, beta=0.05)
    a, b = o.update(0.0, 0.0)
    assert a == 0.0 and b == 0.0
    a2, b2 = o.update(100.0, 100.0)
    assert a2 == pytest.approx(90.58707210820049)
    assert b2 == pytest.approx(90.58707210820049)
    o.reset()
    a3, b3 = o.update(1.0, 1.0)
    assert a3 == 1.0 and b3 == 1.0


def test_one_euro_refiner_uses_per_axis_parameters() -> None:
    o = OneEuroRefiner(
        min_cutoff_x=1.1,
        beta_x=0.2,
        min_cutoff_y=0.7,
        beta_y=0.03,
    )
    assert o._x_filter.min_cutoff == pytest.approx(1.1)
    assert o._x_filter.beta == pytest.approx(0.2)
    assert o._y_filter.min_cutoff == pytest.approx(0.7)
    assert o._y_filter.beta == pytest.approx(0.03)


def test_one_euro_refiner_uses_configured_per_axis_defaults() -> None:
    smoothing = load_config()["smoothing"]
    o = OneEuroRefiner()
    assert o._x_filter.min_cutoff == pytest.approx(float(smoothing["one_euro_min_cutoff_x"]))
    assert o._x_filter.beta == pytest.approx(float(smoothing["one_euro_beta_x"]))
    assert o._y_filter.min_cutoff == pytest.approx(float(smoothing["one_euro_min_cutoff_y"]))
    assert o._y_filter.beta == pytest.approx(float(smoothing["one_euro_beta_y"]))


def test_one_euro_none_input_returns_last() -> None:
    o = OneEuroRefiner(min_cutoff=1.0, beta=0.01)
    o.update(3.0, 4.0)
    y, p = o.update(None, None)
    assert y is not None and p is not None


def test_screen_stabilizer_uses_ratio_fallback_for_invalid_primary() -> None:
    s = ScreenStabilizer(outlier_distance=0.35, fallback_jump_margin=0.08)
    point = s.stabilize(
        float("nan"),
        1.4,
        primary_space="screen",
        fallback_x=0.42,
        fallback_y=0.61,
    )
    assert point.used_fallback is True
    assert point.space == "ratio"
    assert point.x == pytest.approx(0.42)
    assert point.y == pytest.approx(0.61)


def test_screen_stabilizer_suppresses_outlier_jump_with_fallback() -> None:
    s = ScreenStabilizer(outlier_distance=0.25, fallback_jump_margin=0.05)
    first = s.stabilize(0.2, 0.2, primary_space="screen", fallback_x=0.2, fallback_y=0.2)
    assert first.x == pytest.approx(0.2)
    point = s.stabilize(
        0.95,
        0.95,
        primary_space="screen",
        fallback_x=0.26,
        fallback_y=0.24,
    )
    assert point.used_fallback is True
    assert point.outlier_suppressed is True
    assert point.reason == "fallback_outlier_jump"
    assert point.x == pytest.approx(0.26)
    assert point.y == pytest.approx(0.24)
