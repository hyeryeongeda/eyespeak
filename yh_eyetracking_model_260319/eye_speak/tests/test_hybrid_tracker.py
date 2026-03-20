"""하이브리드 파이프라인 (MediaPipe 목)."""

from __future__ import annotations

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
    out = tr.run(dummy_frame)
    assert out["face"] is True
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
    out = tr.run(dummy_frame)
    assert out["cell"] is not None
    assert isinstance(out["screen_x"], float)
