"""공유 pytest 픽스처."""

from __future__ import annotations

import functools
from pathlib import Path
from typing import Any, Dict, List, Tuple

import numpy as np
import pytest
import yaml


def _clear_eye_speak_caches() -> None:
    """LRU 캐시된 설정 로더를 비워 테스트 간 격리한다."""
    try:
        from eye_speak.iris_tracker import blink_detector as bd

        bd._trigger_from_config.cache_clear()
        bd._default_blink_ear_threshold.cache_clear()
    except Exception:
        pass
    try:
        from eye_speak.iris_tracker import grid_mapper as gm

        gm._grid_from_config.cache_clear()
    except Exception:
        pass
    try:
        from eye_speak.iris_tracker import smoother as sm

        sm._smoothing_from_config.cache_clear()
    except Exception:
        pass
    try:
        from eye_speak.iris_tracker import iris_normalizer as irn

        irn._blink_ear_threshold_from_config.cache_clear()
    except Exception:
        pass


@pytest.fixture(autouse=True)
def _reset_caches() -> Any:
    _clear_eye_speak_caches()
    yield
    _clear_eye_speak_caches()


def _build_open_eye_landmarks() -> List[Tuple[float, float]]:
    """478점: 양안 개안·EAR·홍채 인덱스에 물리적으로 일관된 좌표."""
    lm: List[Tuple[float, float]] = [(320.0, 240.0)] * 478

    def s(i: int, x: float, y: float) -> None:
        lm[i] = (x, y)

    # Person's right eye (image-left)
    s(33, 160.0, 240.0)
    s(133, 240.0, 240.0)
    for i in (159, 160, 158, 161):
        s(i, 200.0, 210.0)
    for i in (145, 144, 153, 154):
        s(i, 200.0, 270.0)
    for j, ix in enumerate((469, 470, 471, 472)):
        s(ix, 198.0 + j * 2.0, 238.0)
    # R_EAR [33,160,158,133,153,144]
    s(160, 200.0, 212.0)
    s(158, 200.0, 228.0)
    s(153, 200.0, 252.0)
    s(144, 200.0, 268.0)

    # Person's left eye (image-right)
    s(362, 400.0, 240.0)
    s(263, 480.0, 240.0)
    for i in (386, 387, 385, 388):
        s(i, 440.0, 210.0)
    for i in (374, 373, 380, 381):
        s(i, 440.0, 270.0)
    for j, ix in enumerate((474, 475, 476, 477)):
        s(ix, 438.0 + j * 2.0, 238.0)
    s(387, 440.0, 212.0)
    s(385, 440.0, 228.0)
    s(380, 440.0, 252.0)
    s(373, 440.0, 268.0)

    return lm


@pytest.fixture
def synthetic_landmarks_478() -> List[Tuple[float, float]]:
    return _build_open_eye_landmarks()


@pytest.fixture
def dummy_frame() -> np.ndarray:
    """640×480 BGR 검정 프레임."""
    return np.zeros((480, 640, 3), dtype=np.uint8)


_MINIMAL_CFG: Dict[str, Any] = {
    "detector": {"type": "mediapipe", "gaze_input_h": 224, "gaze_input_w": 224},
    "grid": {
        "yaw_range": 25.0,
        "pitch_range": 20.0,
        "rows": 2,
        "cols": 3,
        "pitch_offset_deg": 0.0,
        "yaw_offset_deg": 0.0,
        "cell_stability_count": 3,
        "hysteresis_threshold": 0.0,
    },
    "smoothing": {
        "use_gaze_refiner": True,
        "refiner_type": "one_euro",
        "gaze_refiner_alpha": 0.3,
        "one_euro_min_cutoff": 0.5,
        "one_euro_beta": 0.05,
        "blink_ear_threshold": 0.18,
    },
    "weights": {
        "head_pose_weight": 0.35,
        "iris_gaze_weight": 0.65,
        "l2cs_weight": 0.2,
    },
    "calibration": {
        "points": 12,
        "target_rx": [0.03] * 12,
        "target_ry": [0.03] * 12,
    },
    "trigger": {
        "dwell_time_sec": 1.5,
        "blink_select_min_sec": 0.3,
        "blink_select_max_sec": 1.0,
        "double_blink_window_sec": 2.0,
        "long_close_sec": 3.0,
        "triple_blink_window_sec": 3.0,
        "blink_history_ttl_sec": 5.0,
    },
    "paths": {"calib_save_dir": "calibration_data_test"},
}


@pytest.fixture
def config_override(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """테스트 전용 YAML 경로. ``load_config``가 이 파일을 읽도록 패치."""
    p = tmp_path / "test_config.yaml"
    p.write_text(yaml.safe_dump(_MINIMAL_CFG, allow_unicode=True), encoding="utf-8")

    import eye_speak.configs.loader as loader

    real_load = loader.load_config

    @functools.wraps(real_load)
    def _patched(path: Any = None) -> Dict[str, Any]:
        use = Path(path) if path is not None else p
        if not use.is_file():
            use = p
        return real_load(use)

    monkeypatch.setattr(loader, "load_config", _patched)
    import eye_speak.pipeline.hybrid_tracker as ht

    monkeypatch.setattr(ht, "load_config", _patched)
    _clear_eye_speak_caches()
    return p
