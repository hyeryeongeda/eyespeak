"""ALS용 눈 깜빡임(EAR) 기반 트리거 감지.

트리거 타이밍·창 길이는 ``configs/default.yaml``의 ``trigger`` 섹션에서 읽는다.
EAR 임계값 기본값은 ``smoothing.blink_ear_threshold``와 동일하게 맞춘다.
"""

from __future__ import annotations

import functools
import logging
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


@functools.lru_cache(maxsize=1)
def _trigger_from_config() -> Dict[str, Any]:
    """``trigger`` 설정 블록을 캐시하여 반환한다.

    Returns:
        ``load_config()[\"trigger\"]``의 얕은 복사에 가까운 dict.
    """
    from eye_speak.configs.loader import load_config

    return dict(load_config()["trigger"])


@functools.lru_cache(maxsize=1)
def _default_blink_ear_threshold() -> float:
    """기본 EAR 깜빡임 임계값 (스무딩 설정과 공유).

    Returns:
        ``smoothing.blink_ear_threshold``.
    """
    from eye_speak.configs.loader import load_config

    return float(load_config()["smoothing"]["blink_ear_threshold"])


class TriggerDetector:
    """매 프레임 EAR을 받아 우선순위에 따라 트리거 문자열을 반환한다.

    우선순위: ``stop`` > ``sos`` > ``start`` > ``select`` > ``none``.

    Note:
        트리거 윈도 길이 등은 생성 시점의 YAML ``trigger`` 값을 스냅샷으로 사용한다.
    """

    def __init__(self, blink_threshold: Optional[float] = None) -> None:
        """Args:
            blink_threshold: EAR이 이 값 미만이면 눈 감김. ``None``이면 YAML 기본값.
        """
        self._threshold: float = (
            float(blink_threshold)
            if blink_threshold is not None
            else _default_blink_ear_threshold()
        )
        self._cfg: Dict[str, Any] = dict(_trigger_from_config())
        self._eyes_closed: bool = False
        self._close_start_time: float = 0.0
        self._blink_history: List[Tuple[float, float]] = []
        self._stop_fired: bool = False

    def update(self, ear: float, timestamp: float) -> str:
        """프레임 단위로 호출하여 트리거 이벤트를 반환한다.

        Args:
            ear: Eye Aspect Ratio (대략 0~0.4).
            timestamp: ``time.time()`` 등 단조 증가 시각(초).

        Returns:
            ``\"none\"`` | ``\"select\"`` | ``\"start\"`` | ``\"stop\"`` | ``\"sos\"``.
        """
        ttl = float(self._cfg.get("blink_history_ttl_sec", 5.0))
        self._cleanup_history(timestamp, ttl)
        is_closed = ear < self._threshold

        long_close = float(self._cfg["long_close_sec"])

        if is_closed and not self._eyes_closed:
            self._eyes_closed = True
            self._close_start_time = timestamp
            self._stop_fired = False
            return "none"

        if is_closed and self._eyes_closed:
            duration = timestamp - self._close_start_time
            if duration >= long_close and not self._stop_fired:
                self._stop_fired = True
                logger.info("트리거: stop (%.1f초 눈 감김)", duration)
                return "stop"
            return "none"

        if not is_closed and self._eyes_closed:
            self._eyes_closed = False
            duration = timestamp - self._close_start_time

            if self._stop_fired:
                self._stop_fired = False
                self._blink_history.clear()
                return "none"

            t_min = float(self._cfg["blink_select_min_sec"])
            t_max = float(self._cfg["blink_select_max_sec"])
            if t_min <= duration <= t_max:
                self._blink_history.append((timestamp, duration))
                return self._check_multi_blink(timestamp)

            return "none"

        return "none"

    def _check_multi_blink(self, timestamp: float) -> str:
        """최근 깜빡임 횟수로 멀티 블링크 트리거를 판정한다.

        Args:
            timestamp: 현재 시각(초).

        Returns:
            ``\"select\"`` | ``\"start\"`` | ``\"sos\"``.
        """
        triple_w = float(self._cfg["triple_blink_window_sec"])
        double_w = float(self._cfg["double_blink_window_sec"])

        recent_3s = [b for b in self._blink_history if timestamp - b[0] <= triple_w]
        recent_2s = [b for b in self._blink_history if timestamp - b[0] <= double_w]

        if len(recent_3s) >= 3:
            self._blink_history.clear()
            logger.info("트리거: sos (3회 블링크)")
            return "sos"
        if len(recent_2s) >= 2:
            self._blink_history.clear()
            logger.info("트리거: start (더블 블링크)")
            return "start"

        logger.info("트리거: select (의도적 깜빡임 1회)")
        return "select"

    def _cleanup_history(self, timestamp: float, max_age_sec: float) -> None:
        """오래된 깜빡임 기록을 제거한다.

        Args:
            timestamp: 현재 시각(초).
            max_age_sec: 이 시간(초)보다 오래된 항목 삭제.
        """
        self._blink_history = [
            b for b in self._blink_history if timestamp - b[0] <= max_age_sec
        ]

    def set_threshold(self, threshold: float) -> None:
        """적응형 blink threshold 갱신 (캘리브레이션 후 등).

        Args:
            threshold: 새 EAR 임계값.
        """
        self._threshold = float(threshold)
        logger.info("트리거 임계값 업데이트: %.3f", threshold)

    def reset(self) -> None:
        """내부 상태를 초기화한다."""
        self._eyes_closed = False
        self._close_start_time = 0.0
        self._blink_history.clear()
        self._stop_fired = False
