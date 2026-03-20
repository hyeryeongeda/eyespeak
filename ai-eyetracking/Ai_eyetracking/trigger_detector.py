"""ALS 환자용 눈 깜빡임 기반 트리거 감지."""
import logging
from typing import List, Tuple

from config_gaze import (
    BLINK_SELECT_MIN_SEC,
    BLINK_SELECT_MAX_SEC,
    DOUBLE_BLINK_WINDOW_SEC,
    LONG_CLOSE_SEC,
    TRIPLE_BLINK_WINDOW_SEC,
)

log = logging.getLogger(__name__)


class TriggerDetector:
    """
    매 프레임 EAR 값을 받아 트리거 이벤트를 반환.

    트리거 우선순위: stop > sos > start > select > none
    - select: 의도적 깜빡임 1회 (0.3~1.0초 감고 뜨기)
    - start: 2초 내 의도적 깜빡임 2회 (더블 블링크)
    - stop: 3초 이상 눈 감기 유지
    - sos: 3초 내 의도적 깜빡임 3회 (트리플 블링크)
    """

    def __init__(self, blink_threshold: float = 0.18) -> None:
        """
        Args:
            blink_threshold: EAR이 이 값 미만이면 눈 감김으로 판정.
        """
        self._threshold: float = blink_threshold
        self._eyes_closed: bool = False
        self._close_start_time: float = 0.0
        self._blink_history: List[Tuple[float, float]] = []
        self._stop_fired: bool = False

    def update(self, ear: float, timestamp: float) -> str:
        """
        매 프레임 호출하여 트리거 이벤트 반환.

        Args:
            ear: Eye Aspect Ratio (0~0.4 범위).
            timestamp: 현재 시각 (time.time()).

        Returns:
            "none" | "select" | "start" | "stop" | "sos"
        """
        self._cleanup_history(timestamp)
        is_closed = ear < self._threshold

        # 눈 감김 시작
        if is_closed and not self._eyes_closed:
            self._eyes_closed = True
            self._close_start_time = timestamp
            self._stop_fired = False
            return "none"

        # 눈 감김 유지 중
        if is_closed and self._eyes_closed:
            duration = timestamp - self._close_start_time
            if duration >= LONG_CLOSE_SEC and not self._stop_fired:
                self._stop_fired = True
                log.info("트리거: stop (%.1f초 눈 감김)", duration)
                return "stop"
            return "none"

        # 눈 뜸 (직전까지 감겨있었음)
        if not is_closed and self._eyes_closed:
            self._eyes_closed = False
            duration = timestamp - self._close_start_time

            # stop이 이미 발생한 경우 → 상태 초기화만
            if self._stop_fired:
                self._stop_fired = False
                self._blink_history.clear()
                return "none"

            # 의도적 깜빡임 판정 (0.3~1.0초)
            if BLINK_SELECT_MIN_SEC <= duration <= BLINK_SELECT_MAX_SEC:
                self._blink_history.append((timestamp, duration))
                return self._check_multi_blink(timestamp)

            return "none"

        # 눈 뜬 상태 유지
        return "none"

    def _check_multi_blink(self, timestamp: float) -> str:
        """최근 깜빡임 횟수로 멀티 블링크 트리거 판정.

        Args:
            timestamp: 현재 시각.

        Returns:
            "select" | "start" | "sos"
        """
        recent_3s = [
            b for b in self._blink_history
            if timestamp - b[0] <= TRIPLE_BLINK_WINDOW_SEC
        ]
        recent_2s = [
            b for b in self._blink_history
            if timestamp - b[0] <= DOUBLE_BLINK_WINDOW_SEC
        ]

        if len(recent_3s) >= 3:
            self._blink_history.clear()
            log.info("트리거: sos (3회 블링크)")
            return "sos"
        if len(recent_2s) >= 2:
            self._blink_history.clear()
            log.info("트리거: start (더블 블링크)")
            return "start"

        log.info("트리거: select (의도적 깜빡임 1회)")
        return "select"

    def _cleanup_history(self, timestamp: float) -> None:
        """5초 이상 지난 깜빡임 기록 제거.

        Args:
            timestamp: 현재 시각.
        """
        self._blink_history = [
            b for b in self._blink_history if timestamp - b[0] <= 5.0
        ]

    def set_threshold(self, threshold: float) -> None:
        """적응형 blink threshold 업데이트 (캘리브레이션 후 호출).

        Args:
            threshold: 새 EAR 임계값.
        """
        self._threshold = threshold
        log.info("트리거 임계값 업데이트: %.3f", threshold)

    def reset(self) -> None:
        """상태 초기화."""
        self._eyes_closed = False
        self._close_start_time = 0.0
        self._blink_history.clear()
        self._stop_fired = False
