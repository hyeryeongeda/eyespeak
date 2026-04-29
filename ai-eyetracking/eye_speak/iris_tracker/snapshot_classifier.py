"""캘리브레이션 스냅샷 기반 KNN 셀 분류기.

모든 캘리브레이션 샘플을 저장하고,
런타임에 현재 iris ratio와 K-최근접 이웃 투표로 셀을 결정.
시간적 안정화: 최근 N프레임의 다수결로 최종 셀 확정.
"""
from __future__ import annotations

import logging
import math
from collections import Counter, defaultdict, deque
from typing import Deque, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


class SnapshotClassifier:
    """KNN + 시간적 안정화 기반 셀 분류기."""

    def __init__(
        self,
        rows: int = 2,
        cols: int = 3,
        k: int = 5,
        temporal_window: int = 7,
        temporal_threshold: int = 4,
    ) -> None:
        """
        Args:
            rows: 그리드 행 수
            cols: 그리드 열 수
            k: KNN의 K값 (이웃 수)
            temporal_window: 시간적 안정화 윈도 크기
            temporal_threshold: 윈도 내 최소 등장 횟수 (이상이면 셀 확정)
        """
        self._rows = rows
        self._cols = cols
        self._k = k
        self._temporal_window = temporal_window
        self._temporal_threshold = temporal_threshold
        # 모든 캘리브레이션 샘플: [(rx, ry, cell_index), ...]
        self._samples: List[Tuple[float, float, int]] = []
        # 셀별 centroid (디버그/폴백용)
        self._centroids: Dict[int, Tuple[float, float]] = {}
        # 시간적 안정화 버퍼
        self._history: Deque[int] = deque(maxlen=temporal_window)
        self._stable_cell: Optional[int] = None
        self._fitted = False

    @property
    def is_fitted(self) -> bool:
        return self._fitted

    @property
    def stable_cell(self) -> Optional[int]:
        return self._stable_cell

    def fit(
        self,
        points: List[Dict],
        target_rx: List[float],
        target_ry: List[float],
    ) -> None:
        """모든 캘리브레이션 샘플을 저장한다.

        Args:
            points: [{"rx": float, "ry": float}, ...]
            target_rx: 각 포인트의 목표 screen x (0~1)
            target_ry: 각 포인트의 목표 screen y (0~1)
        """
        n = min(len(points), len(target_rx), len(target_ry))
        self._samples.clear()
        self._centroids.clear()
        self._history.clear()
        self._stable_cell = None

        cell_groups: Dict[int, List[Tuple[float, float]]] = defaultdict(list)

        for i in range(n):
            rx = float(points[i].get("rx", 0.5))
            ry = float(points[i].get("ry", 0.5))
            tx = target_rx[i]
            ty = target_ry[i]
            cell = self._target_to_cell(tx, ty)
            self._samples.append((rx, ry, cell))
            cell_groups[cell].append((rx, ry))

        # centroid 계산 (디버그용)
        for cell, grp in cell_groups.items():
            cx = sum(s[0] for s in grp) / len(grp)
            cy = sum(s[1] for s in grp) / len(grp)
            self._centroids[cell] = (cx, cy)
            logger.info(
                "SnapshotKNN: cell %d centroid=(%.4f, %.4f) samples=%d",
                cell, cx, cy, len(grp),
            )

        # K를 샘플 수에 맞게 조정
        if self._samples:
            self._k = min(self._k, len(self._samples))

        self._fitted = len(self._samples) > 0
        logger.info(
            "SnapshotKNN: fitted with %d total samples, %d cells, K=%d",
            len(self._samples), len(cell_groups), self._k,
        )

    def classify(self, rx: float, ry: float) -> Optional[int]:
        """KNN으로 셀을 분류한다 (시간적 안정화 없이).

        Returns:
            셀 인덱스, 미학습 시 None
        """
        if not self._fitted:
            return None
        return self._knn_vote(rx, ry)

    def classify_stable(self, rx: float, ry: float) -> Tuple[Optional[int], float]:
        """KNN 분류 + 시간적 안정화.

        Returns:
            (안정화된 셀, 확신도)
        """
        if not self._fitted:
            return None, 0.0

        raw_cell = self._knn_vote(rx, ry)
        if raw_cell is None:
            return self._stable_cell, 0.0

        self._history.append(raw_cell)

        # 다수결
        counts = Counter(self._history)
        most_common_cell, most_common_count = counts.most_common(1)[0]

        if most_common_count >= self._temporal_threshold:
            self._stable_cell = most_common_cell

        # 확신도 = 다수 셀 비율
        confidence = most_common_count / len(self._history)

        return self._stable_cell if self._stable_cell is not None else raw_cell, confidence

    def classify_with_confidence(
        self, rx: float, ry: float
    ) -> Tuple[Optional[int], float]:
        """classify_stable의 별칭 (기존 호환)."""
        return self.classify_stable(rx, ry)

    def _knn_vote(self, rx: float, ry: float) -> Optional[int]:
        """K개 최근접 이웃의 다수결로 셀 결정."""
        if not self._samples:
            return None

        # 모든 샘플과의 거리 계산
        dists = []
        for sx, sy, cell in self._samples:
            d = math.hypot(rx - sx, ry - sy)
            dists.append((d, cell))
        dists.sort()

        # K개 이웃의 투표
        k = min(self._k, len(dists))
        votes = Counter(d[1] for d in dists[:k])
        winner, _ = votes.most_common(1)[0]
        return winner

    def _target_to_cell(self, tx: float, ty: float) -> int:
        """목표 화면 좌표를 셀 인덱스로 변환."""
        col = int(tx * self._cols)
        col = max(0, min(self._cols - 1, col))
        row = int(ty * self._rows)
        row = max(0, min(self._rows - 1, row))
        return row * self._cols + col

    def reset(self) -> None:
        """모든 상태를 초기화한다."""
        self._samples.clear()
        self._centroids.clear()
        self._history.clear()
        self._stable_cell = None
        self._fitted = False

    def reset_temporal(self) -> None:
        """시간적 안정화 버퍼만 초기화 (캘리브레이션 데이터는 유지)."""
        self._history.clear()
        self._stable_cell = None
