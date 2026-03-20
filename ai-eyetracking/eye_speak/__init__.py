"""EYE SPEAK — 홍채 기반 시선 추적 (eye_speak 패키지)."""

from __future__ import annotations

__version__ = "0.1.0"

from eye_speak.configs.loader import load_config
from eye_speak.pipeline.compat import GazePipeline, HybridTracker

__all__ = [
    "__version__",
    "load_config",
    "HybridTracker",
    "GazePipeline",
]
