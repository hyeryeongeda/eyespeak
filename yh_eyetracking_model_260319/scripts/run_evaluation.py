"""오프라인 시선 파이프라인 평가 (단일 / A·B 비교).

예::

    python scripts/run_evaluation.py --config eye_speak/configs/default.yaml --trials 50
    python scripts/run_evaluation.py --mode compare --config eye_speak/configs/default.yaml \\
        --ai_model checkpoints/mobilegaze_best.pth --trials 30
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path
from typing import Any, Dict, List

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from eye_speak.pipeline.evaluator import GazeEvaluator  # noqa: E402
from eye_speak.pipeline.hybrid_tracker import HybridTracker  # noqa: E402

logger = logging.getLogger(__name__)


def _synthetic_samples(n: int, h: int = 480, w: int = 640) -> List[Dict[str, Any]]:
    """MediaPipe 없이도 지표 파이프라인을 점검하기 위한 더미 샘플."""
    rng = np.random.default_rng(0)
    out: List[Dict[str, Any]] = []
    for i in range(n):
        frame = rng.integers(0, 256, size=(h, w, 3), dtype=np.uint8)
        out.append(
            {
                "frame": frame,
                "gt_rx": float(rng.random()),
                "gt_ry": float(rng.random()),
                "gt_cell": int(rng.integers(0, 6)),
                "gt_blink": bool(rng.integers(0, 2)),
            }
        )
    return out


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    parser = argparse.ArgumentParser(description="Gaze pipeline evaluation")
    parser.add_argument(
        "--config",
        type=str,
        default="eye_speak/configs/default.yaml",
        help="YAML config path (project root 기준)",
    )
    parser.add_argument("--trials", type=int, default=50, help="평가에 사용할 샘플 수")
    parser.add_argument(
        "--mode",
        type=str,
        default="single",
        choices=["single", "compare"],
        help="single: 한 트래커 / compare: 수식 vs AI 하이브리드",
    )
    parser.add_argument(
        "--ai_model",
        type=str,
        default=None,
        help="compare 모드에서 B 트래커용 체크포인트 (선택). 있으면 use_ai=True",
    )
    parser.add_argument(
        "--output_json",
        type=str,
        default=None,
        help="결과를 저장할 JSON 경로 (미지정 시 저장 안 함)",
    )
    args = parser.parse_args()

    cp = Path(args.config)
    cfg_path = str(cp) if cp.is_file() else str(
        ROOT / "eye_speak" / "configs" / "default.yaml"
    )

    samples = _synthetic_samples(args.trials)
    ev = GazeEvaluator()

    if args.mode == "single":
        use_ai = bool(args.ai_model)
        tracker = HybridTracker(
            config_path=cfg_path,
            use_ai=use_ai,
            ai_checkpoint=args.ai_model,
        )
        result = ev.evaluate(tracker, samples)
        result["mode"] = "single"
        result["config"] = cfg_path
        logger.info("single evaluation done")
    else:
        ta = HybridTracker(config_path=cfg_path, use_ai=False)
        tb = HybridTracker(
            config_path=cfg_path,
            use_ai=bool(args.ai_model),
            ai_checkpoint=args.ai_model,
        )
        result = ev.compare(ta, tb, samples)
        result["mode"] = "compare"
        result["config"] = cfg_path
        result["ai_model"] = args.ai_model
        logger.info("compare evaluation done")

    if args.output_json:
        GazeEvaluator.save_json(args.output_json, result)


if __name__ == "__main__":
    main()
