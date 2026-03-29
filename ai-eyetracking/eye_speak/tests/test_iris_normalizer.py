"""홍채 정규화."""

from __future__ import annotations

from typing import List, Tuple

import pytest

from eye_speak.iris_tracker.iris_normalizer import IrisNormalizer, compute_iris_position


def test_compute_iris_position_range_open_eye(
    synthetic_landmarks_478: List[Tuple[float, float]],
) -> None:
    rx, ry, ear, blink = compute_iris_position(
        synthetic_landmarks_478, blink_threshold=0.05
    )
    assert rx is not None and ry is not None
    assert 0.0 <= rx <= 1.0 and 0.0 <= ry <= 1.0
    assert not blink
    assert ear > 0.0


def test_insufficient_landmarks_returns_blink() -> None:
    short: List[Tuple[float, float]] = [(0.0, 0.0)] * 10
    rx, ry, ear, blink = compute_iris_position(short, blink_threshold=0.18)
    assert rx is None and ry is None
    assert blink is True
    assert ear == 0.0


def test_high_threshold_forces_blink_on_same_landmarks(
    synthetic_landmarks_478: List[Tuple[float, float]],
) -> None:
    rx, ry, _, blink = compute_iris_position(
        synthetic_landmarks_478, blink_threshold=5.0
    )
    assert blink is True
    assert rx is None and ry is None


def test_iris_normalizer_wrapper(
    synthetic_landmarks_478: List[Tuple[float, float]],
) -> None:
    n = IrisNormalizer(blink_threshold=0.05)
    rx, ry, ear, blink = n(synthetic_landmarks_478)
    assert not blink
    assert rx is not None and ry is not None
    assert ear > 0.0
