"""시선 트래커 오프라인 평가 (각도·셀·지연·깜빡임)."""

from __future__ import annotations

import json
import logging
import math
import time
from pathlib import Path
from typing import Any, Dict, List, Mapping, MutableMapping, Optional, Protocol

import numpy as np

logger = logging.getLogger(__name__)

# 정규화 (rx,ry) L2 1.0을 대략 이 각도(도)로 환산하는 휴리스틱 스케일
_NORM_TO_DEG_SCALE = 45.0


class _TrackerProto(Protocol):
    def run(self, frame: np.ndarray) -> Mapping[str, Any]:
        ...


def _safe_float(x: Any, default: float = 0.0) -> float:
    try:
        if x is None:
            return default
        return float(x)
    except (TypeError, ValueError):
        return default


class GazeEvaluator:
    """``run(frame)`` API를 갖는 트래커에 대한 집계 지표."""

    def evaluate(
        self,
        tracker: _TrackerProto,
        test_samples: List[MutableMapping[str, Any]],
    ) -> Dict[str, Any]:
        """샘플 목록으로 지표를 계산한다.

        각 샘플은 최소 ``\"frame\"`` (``H×W×3`` BGR ``uint8``)을 포함한다.
        선택 키: ``gt_rx``, ``gt_ry`` (0~1), ``gt_cell`` (int), ``gt_blink`` (bool).

        Args:
            tracker: ``run(np.ndarray) -> dict`` 객체.
            test_samples: 평가 샘플 리스트 (in-place 변경 없음).

        Returns:
            ``angular_error_deg``, ``cell_accuracy_pct``, ``latency_ms``,
            ``blink_precision``, ``blink_recall`` 등.
        """
        lat: List[float] = []
        ang_errs: List[float] = []
        cell_ok: List[bool] = []
        blink_tp = blink_fp = blink_fn = blink_tn = 0
        blink_eval = False

        for s in test_samples:
            frame = s.get("frame")
            if frame is None or not isinstance(frame, np.ndarray):
                logger.warning("skip sample: missing frame")
                continue
            t0 = time.perf_counter()
            pred = tracker.run(frame)
            lat.append(time.perf_counter() - t0)

            prx = pred.get("rx")
            pry = pred.get("ry")
            if s.get("gt_rx") is not None and s.get("gt_ry") is not None and prx is not None and pry is not None:
                e = math.hypot(
                    _safe_float(prx) - _safe_float(s["gt_rx"]),
                    _safe_float(pry) - _safe_float(s["gt_ry"]),
                )
                ang_errs.append(e * _NORM_TO_DEG_SCALE)

            if s.get("gt_cell") is not None and pred.get("cell") is not None:
                cell_ok.append(int(pred["cell"]) == int(s["gt_cell"]))

            if s.get("gt_blink") is not None:
                blink_eval = True
                gt_b = bool(s["gt_blink"])
                pr_b = bool(pred.get("blink", False))
                if gt_b and pr_b:
                    blink_tp += 1
                elif not gt_b and pr_b:
                    blink_fp += 1
                elif gt_b and not pr_b:
                    blink_fn += 1
                else:
                    blink_tn += 1

        n = len(lat)
        result: Dict[str, Any] = {
            "n_samples": n,
            "latency_ms": (sum(lat) / n * 1000.0) if n else 0.0,
            "angular_error_deg": (sum(ang_errs) / len(ang_errs)) if ang_errs else None,
            "cell_accuracy_pct": (sum(cell_ok) / len(cell_ok) * 100.0) if cell_ok else None,
            "blink_precision": None,
            "blink_recall": None,
        }
        if blink_eval:
            prec_d = blink_tp + blink_fp
            rec_d = blink_tp + blink_fn
            result["blink_precision"] = (blink_tp / prec_d) if prec_d else None
            result["blink_recall"] = (blink_tp / rec_d) if rec_d else None
        logger.info("evaluate: %s", {k: result[k] for k in result if k != "n_samples"})
        return result

    def compare(
        self,
        tracker_a: _TrackerProto,
        tracker_b: _TrackerProto,
        test_samples: List[MutableMapping[str, Any]],
    ) -> Dict[str, Any]:
        """두 트래커에 동일 샘플로 평가해 비교한다.

        Args:
            tracker_a: 기준 트래커 (예: 수식).
            tracker_b: 비교 트래커 (예: AI 하이브리드).

        Returns:
            ``a``, ``b`` 평가 dict와 ``delta`` (b - a, 숫자 항목만).
        """
        ev_a = self.evaluate(tracker_a, test_samples)
        ev_b = self.evaluate(tracker_b, test_samples)
        delta: Dict[str, Any] = {}
        keys = (
            "latency_ms",
            "angular_error_deg",
            "cell_accuracy_pct",
            "blink_precision",
            "blink_recall",
        )
        for k in keys:
            va, vb = ev_a.get(k), ev_b.get(k)
            if isinstance(va, (int, float)) and isinstance(vb, (int, float)):
                delta[k] = float(vb) - float(va)
            else:
                delta[k] = None
        out = {"a": ev_a, "b": ev_b, "delta": delta}
        logger.info("compare delta: %s", delta)
        return out

    @staticmethod
    def save_json(path: str, data: Mapping[str, Any]) -> None:
        """평가 결과를 JSON으로 저장한다.

        Args:
            path: 출력 파일 경로.
            data: 직렬화 가능한 dict 구조.
        """
        p = Path(path)
        p.parent.mkdir(parents=True, exist_ok=True)
        with p.open("w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        logger.info("saved evaluation JSON -> %s", p)
