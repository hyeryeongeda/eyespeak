"""하위 호환: 신규 파이프라인 re-export.

- :class:`HybridTracker` — 코어 파이프라인.
- :class:`GazePipeline` — 웹/레거시 API (:mod:`eye_speak.pipeline.legacy_gaze_pipeline`).
"""

from __future__ import annotations

from eye_speak.pipeline.hybrid_tracker import HybridTracker
from eye_speak.pipeline.legacy_gaze_pipeline import GazePipeline

__all__ = ["HybridTracker", "GazePipeline"]
