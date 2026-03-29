"""비율 좌표 (rx, ry) → 그리드 셀 인덱스 매핑 및 안정화.

``pipeline.py``의 기본/캘리브레이션 셀 분할과 ``_stabilize_cell`` 과반수 로직을 모듈화한다.
기본 그리드 크기·안정화·히스테리시스는 YAML ``grid``에서 읽을 수 있다.
"""

from __future__ import annotations

import functools
import logging
from collections import Counter, deque
from typing import Any, Deque, Dict, Optional

logger = logging.getLogger(__name__)


@functools.lru_cache(maxsize=1)
def _grid_from_config() -> Dict[str, Any]:
    """``grid`` 설정을 캐시하여 반환한다.

    Returns:
        ``load_config()[\"grid\"]`` dict.
    """
    from eye_speak.configs.loader import load_config

    return dict(load_config()["grid"])


class GridMapper:
    """시선 비율을 셀 인덱스로 바꾸고, 버퍼 기반 과반수로 안정화한다.

    히스테리시스: 이전에 확정된 셀(``stabilize`` 결과)이 있으면, 경계 인접 구간에서는
    셀 전환을 억제할 수 있다 (``hysteresis_threshold`` > 0, 2×3 그리드).
    """

    def __init__(
        self,
        rows: int,
        cols: int,
        stability_count: int,
        buffer_size: int = 5,
        hysteresis_threshold: float = 0.0,
    ) -> None:
        """Args:
            rows: 그리드 행 수.
            cols: 그리드 열 수.
            stability_count: ``stabilize``에서 이 횟수 이상 등장한 셀로 확정.
            buffer_size: 최근 셀 히스토리 최대 길이.
            hysteresis_threshold: 경계 ±이 값(정규화 좌표) 안이면 이전 안정 셀 유지.
        """
        if rows < 1 or cols < 1:
            raise ValueError("rows and cols must be >= 1")
        if stability_count < 1:
            raise ValueError("stability_count must be >= 1")
        if buffer_size < 1:
            raise ValueError("buffer_size must be >= 1")
        self._rows = rows
        self._cols = cols
        self._stability_count = stability_count
        self._hyst = max(0.0, float(hysteresis_threshold))
        self._cell_buf: Deque[int] = deque(maxlen=buffer_size)
        self._stable_cell: Optional[int] = None

    @classmethod
    def from_config(cls, buffer_size: int = 5) -> "GridMapper":
        """YAML ``grid.rows`` / ``cols`` / ``cell_stability_count`` / ``hysteresis_threshold``로 생성.

        Args:
            buffer_size: :meth:`__init__`와 동일.

        Returns:
            설정 기반 ``GridMapper`` 인스턴스.
        """
        g = _grid_from_config()
        return cls(
            int(g["rows"]),
            int(g["cols"]),
            int(g["cell_stability_count"]),
            buffer_size=buffer_size,
            hysteresis_threshold=float(g.get("hysteresis_threshold", 0.0)),
        )

    def map_to_cell(
        self,
        rx: float,
        ry: float,
        *,
        from_screen_normalized: bool = False,
    ) -> int:
        """``(rx, ry)``를 셀 인덱스(행 우선, ``row * cols + col``)로 변환.

        Args:
            rx: 수평 정규화 좌표 ``0~1``.
            ry: 수직 정규화 좌표 ``0~1``.
            from_screen_normalized: ``False``면 파이프라인 기본 분할(2×3 시 하드코딩 경계).
                ``True``면 캘리브 후 화면 좌표에 대한 ``1/3``·``0.5`` 경계 분할.

        Returns:
            셀 인덱스 ``0 .. rows*cols - 1``.
        """
        if from_screen_normalized:
            candidate = self._cell_from_normalized_screen(rx, ry)
        else:
            candidate = self._cell_default(rx, ry)

        if (
            self._hyst > 0
            and self._stable_cell is not None
            and candidate != self._stable_cell
        ):
            adjusted = self._apply_hysteresis(
                rx, ry, candidate, self._stable_cell, from_screen_normalized
            )
            return adjusted
        return candidate

    def stabilize(self, cell: int) -> int:
        """최근 ``buffer_size`` 프레임에서 과반수 이상인 셀로 안정화.

        Args:
            cell: 현재 프레임의 원시 셀 인덱스.

        Returns:
            안정화된 셀. 아직 확정 전이면 ``cell`` 또는 마지막 확정값을 반환
            (``pipeline._stabilize_cell``와 동일 취지).
        """
        self._cell_buf.append(cell)
        counts = Counter(self._cell_buf)
        most, cnt = counts.most_common(1)[0]
        if cnt >= self._stability_count:
            self._stable_cell = most
            logger.debug("GridMapper: stable cell -> %s (count=%s)", most, cnt)
        return self._stable_cell if self._stable_cell is not None else cell

    def reset_stabilizer(self) -> None:
        """버퍼·안정 셀만 초기화 (매핑 규칙은 유지)."""
        self._cell_buf.clear()
        self._stable_cell = None

    @property
    def stable_cell(self) -> Optional[int]:
        """마지막으로 확정된 안정 셀. 없으면 ``None``."""
        return self._stable_cell

    def _cell_default(self, rx: float, ry: float) -> int:
        if self._rows == 2 and self._cols == 3:
            if rx < 0.45:
                col = 0
            elif rx > 0.55:
                col = 2
            else:
                col = 1
            row = 0 if ry < 0.45 else 1
            return row * self._cols + col
        return self._cell_uniform(rx, ry)

    def _cell_from_normalized_screen(self, px: float, py: float) -> int:
        x = max(0.0, min(1.0, px))
        y = max(0.0, min(1.0, py))
        if self._rows == 2 and self._cols == 3:
            col = 0 if x < 1.0 / 3.0 else (1 if x < 2.0 / 3.0 else 2)
            row = 0 if y < 0.5 else 1
            return row * self._cols + col
        return self._cell_uniform(x, y)

    def _cell_uniform(self, rx: float, ry: float) -> int:
        eps = 1e-9
        col = int(rx * self._cols - eps)
        col = max(0, min(self._cols - 1, col))
        row = int(ry * self._rows - eps)
        row = max(0, min(self._rows - 1, row))
        return row * self._cols + col

    def _apply_hysteresis(
        self,
        rx: float,
        ry: float,
        candidate: int,
        stable: int,
        from_screen: bool,
    ) -> int:
        th = self._hyst
        if self._rows != 2 or self._cols != 3:
            return candidate

        sc, sr = stable % self._cols, stable // self._cols
        cc, cr = candidate % self._cols, candidate // self._cols

        if not from_screen:
            if sr != cr and abs(ry - 0.45) <= th:
                return stable
            if sc != cc:
                if abs(rx - 0.45) <= th or abs(rx - 0.55) <= th:
                    return stable
        else:
            if sr != cr and abs(ry - 0.5) <= th:
                return stable
            if sc != cc:
                if abs(rx - 1.0 / 3.0) <= th or abs(rx - 2.0 / 3.0) <= th:
                    return stable
        return candidate
