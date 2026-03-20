"""깜빡임 트리거 상태 머신."""

from __future__ import annotations

import pytest

from eye_speak.iris_tracker.blink_detector import TriggerDetector


@pytest.fixture
def trig() -> TriggerDetector:
    return TriggerDetector(blink_threshold=0.18)


def test_select_intentional_blink(trig: TriggerDetector) -> None:
    assert trig.update(0.10, 0.0) == "none"
    assert trig.update(0.10, 0.5) == "none"
    out = trig.update(0.25, 0.8)
    assert out == "select"
    assert trig.update(0.25, 1.0) == "none"


def test_stop_long_close(trig: TriggerDetector) -> None:
    assert trig.update(0.05, 0.0) == "none"
    assert trig.update(0.05, 1.0) == "none"
    assert trig.update(0.05, 3.5) == "stop"
    assert trig.update(0.05, 4.0) == "none"


def test_double_blink_start(trig: TriggerDetector) -> None:
    trig.update(0.08, 0.0)
    trig.update(0.08, 0.3)
    first = trig.update(0.25, 0.85)
    assert first == "select"
    trig.update(0.08, 1.0)
    trig.update(0.08, 1.3)
    second = trig.update(0.25, 2.0)
    assert second == "start"


def test_reset_clears_state(trig: TriggerDetector) -> None:
    trig.update(0.05, 0.0)
    trig.reset()
    assert trig.update(0.25, 10.0) == "none"


def test_open_eye_none(trig: TriggerDetector) -> None:
    for _ in range(5):
        assert trig.update(0.35, float(_)) == "none"
