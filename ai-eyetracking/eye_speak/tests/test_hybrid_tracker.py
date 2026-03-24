"""Tests for the hybrid runtime gaze pipeline."""

from __future__ import annotations

import time
from typing import Any, Dict, List, Tuple

import numpy as np
import pytest

from eye_speak.pipeline.hybrid_tracker import HybridTracker


class _FakeDetector:
    def __init__(self, lm: List[Tuple[float, float]]) -> None:
        self._lm = lm

    def detect(self, frame: np.ndarray) -> Dict[str, Any]:
        return {
            "landmarks": self._lm,
            "face_roi": (10, 10, 120, 120),
            "left": None,
            "right": None,
        }


class _SequenceDetector:
    def __init__(self, seq: List[Dict[str, Any]]) -> None:
        self._seq = list(seq)
        self._last = seq[-1]

    def detect(self, frame: np.ndarray) -> Dict[str, Any]:
        if self._seq:
            self._last = self._seq.pop(0)
        return self._last


class _BadPoly:
    is_fitted = True

    def predict(self, rx: float, ry: float) -> Tuple[float, float]:
        return (float("nan"), 1.2)


def test_hybrid_run_with_mock_detector(
    monkeypatch: pytest.MonkeyPatch,
    synthetic_landmarks_478: List[Tuple[float, float]],
    dummy_frame: np.ndarray,
    config_override: Any,
) -> None:
    import eye_speak.pipeline.hybrid_tracker as ht

    fake = _FakeDetector(synthetic_landmarks_478)
    monkeypatch.setattr(ht, "MediaPipeDetector", lambda *a, **k: fake)
    monkeypatch.setattr(ht, "head_pose_from_landmarks", lambda *a, **k: (None, None))

    tr = HybridTracker(config_path=str(config_override), use_ai=False)
    tr.detector = fake
    first = tr.run(dummy_frame)
    out = tr.run(dummy_frame)

    assert first["face"] is True
    assert first["rx"] is None and first["ry"] is None
    assert out["rx"] is not None and out["ry"] is not None
    assert out["trigger"] in ("none", "select", "start", "stop", "sos")
    assert 0.0 <= out["screen_x"] <= 1.0


def test_hybrid_empty_frame_returns_fail(
    monkeypatch: pytest.MonkeyPatch, config_override: Any
) -> None:
    import eye_speak.pipeline.hybrid_tracker as ht

    monkeypatch.setattr(ht, "MediaPipeDetector", lambda *a, **k: _FakeDetector([]))
    tr = HybridTracker(config_path=str(config_override), use_ai=False)
    bad = tr.run(np.array([]))
    assert bad["face"] is False
    assert bad["cell"] is None


def test_hybrid_set_calibration_updates_poly(
    monkeypatch: pytest.MonkeyPatch,
    synthetic_landmarks_478: List[Tuple[float, float]],
    dummy_frame: np.ndarray,
    config_override: Any,
) -> None:
    import eye_speak.pipeline.hybrid_tracker as ht

    fake = _FakeDetector(synthetic_landmarks_478)
    monkeypatch.setattr(ht, "MediaPipeDetector", lambda *a, **k: fake)
    monkeypatch.setattr(ht, "head_pose_from_landmarks", lambda *a, **k: (None, None))

    tr = HybridTracker(config_path=str(config_override), use_ai=False)
    tr.detector = fake
    pts = [{"rx": 0.1 * i, "ry": 0.1 * j} for j in range(3) for i in range(3)]
    tr.set_calibration(pts)
    tr.run(dummy_frame)
    out = tr.run(dummy_frame)
    assert out["cell"] is not None
    assert isinstance(out["screen_x"], float)


def test_hybrid_calibration_invalid_screen_uses_ratio_fallback(
    monkeypatch: pytest.MonkeyPatch,
    synthetic_landmarks_478: List[Tuple[float, float]],
    dummy_frame: np.ndarray,
    config_override: Any,
) -> None:
    import eye_speak.pipeline.hybrid_tracker as ht

    fake = _FakeDetector(synthetic_landmarks_478)
    monkeypatch.setattr(ht, "MediaPipeDetector", lambda *a, **k: fake)
    monkeypatch.setattr(ht, "head_pose_from_landmarks", lambda *a, **k: (None, None))

    tr = HybridTracker(config_path=str(config_override), use_ai=False)
    tr.detector = fake
    tr._calibrated = True
    tr._poly = _BadPoly()
    tr.run(dummy_frame)
    out = tr.run(dummy_frame)

    assert out["rx"] is not None and out["ry"] is not None
    assert out["screen_x"] == pytest.approx(out["rx"], abs=1e-4)
    assert out["screen_y"] == pytest.approx(out["ry"], abs=1e-4)


def test_hybrid_short_hold_keeps_last_valid_output_for_transient_loss(
    monkeypatch: pytest.MonkeyPatch,
    synthetic_landmarks_478: List[Tuple[float, float]],
    dummy_frame: np.ndarray,
    config_override: Any,
) -> None:
    import eye_speak.pipeline.hybrid_tracker as ht

    valid = {
        "landmarks": synthetic_landmarks_478,
        "face_roi": (10, 10, 120, 120),
        "left": None,
        "right": None,
    }
    invalid = {"landmarks": None}
    seq = _SequenceDetector([valid, valid, invalid, invalid])
    monkeypatch.setattr(ht, "MediaPipeDetector", lambda *a, **k: seq)
    monkeypatch.setattr(ht, "head_pose_from_landmarks", lambda *a, **k: (None, None))

    tr = HybridTracker(config_path=str(config_override), use_ai=False)
    tr.detector = seq
    tr.run(dummy_frame)
    ready = tr.run(dummy_frame)
    held = tr.run(dummy_frame)

    assert ready["rx"] is not None
    assert held["face"] is True
    assert held["screen_x"] == ready["screen_x"]
    assert held["screen_y"] == ready["screen_y"]

    tr._last_valid_at = time.monotonic() - 1.0
    expired = tr.run(dummy_frame)
    assert expired["face"] is False
    assert expired["cell"] is None
