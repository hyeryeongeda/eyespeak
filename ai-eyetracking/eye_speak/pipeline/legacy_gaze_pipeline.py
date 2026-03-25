"""웹 앱·레거시 API용 ``GazePipeline`` (:class:`HybridTracker` 확장).

``app_gaze_web.py`` 등에서 사용: ``run``, ``set_calibration``, ``reset_filters``,
``save_calibration``, ``load_calibration``, ``record_selection``, ``calibration`` 속성.
"""

from __future__ import annotations

import json
import logging
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np

from eye_speak.iris_tracker.blink_detector import TriggerDetector
from eye_speak.iris_tracker.calibration import CalibrationRefiner, PolynomialCalibrator
from eye_speak.pipeline.hybrid_tracker import HybridTracker

logger = logging.getLogger(__name__)

CELL_CENTER_RX = [1 / 6, 0.5, 5 / 6, 1 / 6, 0.5, 5 / 6]
CELL_CENTER_RY = [0.25, 0.25, 0.25, 0.75, 0.75, 0.75]
ONLINE_FIT_AFTER_SAMPLES = 10


class GazePipeline(HybridTracker):
    """``HybridTracker`` + Flask 웹 서버가 기대하는 메서드."""

    def __init__(
        self,
        use_l2cs: bool = False,
        config_path: str = "eye_speak/configs/default.yaml",
        ai_checkpoint: Optional[str] = None,
    ) -> None:
        super().__init__(
            config_path=config_path,
            use_ai=use_l2cs,
            ai_checkpoint=ai_checkpoint,
        )
        self._cal_refiner = CalibrationRefiner()
        self._last_screen_x: Optional[float] = None
        self._last_screen_y: Optional[float] = None

    @property
    def calibration(self) -> Optional[bool]:
        """캘리 적용 여부 (``None`` = 미적용, ``True`` = 적용)."""
        return True if self._calibrated else None

    def run(self, frame: np.ndarray) -> Dict[str, Any]:
        out = super().run(frame)
        sx, sy = out.get("screen_x"), out.get("screen_y")
        if sx is not None and sy is not None and out.get("face"):
            self._last_screen_x = float(sx)
            self._last_screen_y = float(sy)
        return out

    def record_selection(self, cell_index: Optional[int]) -> None:
        """Dwell 확정 시 온라인 Ridge 샘플 축적."""
        if cell_index is None or cell_index < 0 or cell_index >= 6:
            return
        if self._last_screen_x is None or self._last_screen_y is None:
            return
        target_rx = CELL_CENTER_RX[cell_index]
        target_ry = CELL_CENTER_RY[cell_index]
        self._cal_refiner.add_sample(
            self._last_screen_x, self._last_screen_y, target_rx, target_ry
        )
        if self._cal_refiner.sample_count >= ONLINE_FIT_AFTER_SAMPLES:
            self._cal_refiner.fit()

    def reset_filters(self) -> None:
        """캘리·스무딩·트리거·온라인 학습 초기화."""
        self._reset_runtime_state(reset_trigger=True)
        self._calibrated = False
        self._poly = PolynomialCalibrator()
        bth = float(self._cfg["smoothing"]["blink_ear_threshold"])
        self.iris_normalizer.blink_threshold = bth
        self.trigger = TriggerDetector(blink_threshold=bth)
        self._ear_samples.clear()
        self._cal_refiner.clear()
        self._last_screen_x = None
        self._last_screen_y = None

    def save_calibration(self, user_id: str) -> bool:
        if not self._calibrated or not self._poly.is_fitted:
            logger.error(
                "save_calibration BLOCKED: _calibrated=%s, poly_fitted=%s",
                self._calibrated,
                self._poly.is_fitted,
            )
            return False
        if not user_id or "/" in user_id or "\\" in user_id or ".." in user_id:
            logger.error("save_calibration BLOCKED: invalid user_id=%r", user_id)
            return False
        save_dir = Path(str(self._cfg["paths"]["calib_save_dir"]))
        save_dir.mkdir(parents=True, exist_ok=True)
        try:
            cx, cy = self._poly.export_coefficients()
        except RuntimeError:
            logger.error("save_calibration BLOCKED: export_coefficients failed")
            return False
        bth_snap = float(
            self.iris_normalizer.blink_threshold
            or self._cfg["smoothing"]["blink_ear_threshold"]
        )
        data = {
            "user_id": user_id,
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
            "blink_threshold": bth_snap,
            "poly_coeff_x": cx,
            "poly_coeff_y": cy,
            "cal_refiner_raw": self._cal_refiner._raw,
            "cal_refiner_target": self._cal_refiner._target,
        }
        filepath = save_dir / f"{user_id}.json"
        try:
            filepath.write_text(
                json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
            )
            logger.info("캘리 저장: %s", filepath)
            return True
        except OSError as exc:
            logger.error("캘리 저장 실패: %s", exc)
            return False

    def load_calibration(self, user_id: str) -> bool:
        if not user_id or "/" in user_id or "\\" in user_id or ".." in user_id:
            return False
        save_dir = Path(str(self._cfg["paths"]["calib_save_dir"]))
        filepath = save_dir / f"{user_id}.json"
        if not filepath.is_file():
            logger.warning("캘리 파일 없음: %s", filepath)
            return False
        try:
            data = json.loads(filepath.read_text(encoding="utf-8"))
            self._poly.import_coefficients(
                list(data["poly_coeff_x"]), list(data["poly_coeff_y"])
            )
            th = float(data.get("blink_threshold", 0.18))
            self.iris_normalizer.blink_threshold = th
            self.trigger.set_threshold(th)
            self._cal_refiner.clear()
            for raw, tgt in zip(
                data.get("cal_refiner_raw", []),
                data.get("cal_refiner_target", []),
            ):
                self._cal_refiner.add_sample(
                    float(raw[0]), float(raw[1]), float(tgt[0]), float(tgt[1])
                )
            if self._cal_refiner.sample_count >= 3:
                self._cal_refiner.fit()
            self._calibrated = True
            self._reset_runtime_state()
            logger.info("캘리 로드: %s", filepath)
            return True
        except Exception as exc:
            logger.error("캘리 로드 실패: %s", exc)
            return False
