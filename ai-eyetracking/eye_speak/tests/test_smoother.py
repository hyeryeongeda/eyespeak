"""스무딩."""

from __future__ import annotations

import pytest

from eye_speak.iris_tracker.smoother import GazeRefiner, OneEuroAxis, OneEuroRefiner


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


def test_one_euro_refiner_tracks_step() -> None:
    o = OneEuroRefiner(min_cutoff=2.0, beta=0.05)
    a, b = o.update(0.0, 0.0)
    assert a == 0.0 and b == 0.0
    a2, b2 = o.update(100.0, 100.0)
    assert a2 is not None and b2 is not None
    assert abs(a2 - 100.0) < 50.0
    o.reset()
    a3, b3 = o.update(1.0, 1.0)
    assert a3 == 1.0 and b3 == 1.0


def test_one_euro_none_input_returns_last() -> None:
    o = OneEuroRefiner(min_cutoff=1.0, beta=0.01)
    o.update(3.0, 4.0)
    y, p = o.update(None, None)
    assert y is not None and p is not None
