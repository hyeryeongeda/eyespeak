"""Hybrid gaze pipeline with runtime-quality stabilization."""

from __future__ import annotations

import logging
import math
import time
from collections import deque
from pathlib import Path
from typing import Any, Dict, List, Optional

import cv2
import numpy as np

from eye_speak.configs.loader import load_config
from eye_speak.iris_model.augmentation import preprocess_frame_cv
from eye_speak.iris_model.inference import GazeEstimator
from eye_speak.iris_tracker.blink_detector import TriggerDetector
from eye_speak.iris_tracker.calibration import PolynomialCalibrator
from eye_speak.iris_tracker.calibration import CalibrationRefiner
from eye_speak.iris_tracker.detector import MediaPipeDetector
from eye_speak.iris_tracker.grid_mapper import GridMapper
from eye_speak.iris_tracker.head_pose import head_pose_from_landmarks
from eye_speak.iris_tracker.iris_normalizer import IrisNormalizer
from eye_speak.iris_tracker.smoother import OneEuroRefiner, ScreenStabilizer

logger = logging.getLogger(__name__)

_FAIL: Dict[str, Any] = {
    "cell": None,
    "rx": None,
    "ry": None,
    "raw_rx": None,
    "raw_ry": None,
    "ear": 0.0,
    "face": False,
    "blink": False,
    "trigger": "none",
    "screen_x": 0.5,
    "screen_y": 0.5,
}


def _repo_root() -> Path:
    return Path(__file__).resolve().parent.parent.parent


class HybridTracker:
    """MediaPipe + optional AI fusion with calibration and runtime stabilization."""

    def __init__(
        self,
        config_path: str = "eye_speak/configs/default.yaml",
        use_ai: bool = False,
        ai_checkpoint: Optional[str] = None,
    ) -> None:
        cp = Path(config_path)
        self._cfg: Dict[str, Any] = load_config(cp if cp.is_file() else None)
        sm = self._cfg["smoothing"]
        gr = self._cfg["grid"]
        self._grid_yaw = float(gr["yaw_range"])
        self._grid_pitch = float(gr["pitch_range"])
        self._w_iris = float(self._cfg["weights"]["iris_gaze_weight"])
        self._w_head = float(self._cfg["weights"]["head_pose_weight"])
        self._w_l2 = float(self._cfg["weights"]["l2cs_weight"])

        bth = float(sm["blink_ear_threshold"])
        self.detector = MediaPipeDetector(0.3, 0.3)
        self.iris_normalizer = IrisNormalizer(bth)
        self._one_euro = OneEuroRefiner()
        self._screen_stabilizer = ScreenStabilizer()
        self._poly = PolynomialCalibrator()
        self._cal_refiner = CalibrationRefiner()
        self._recent_screen: deque = deque(maxlen=90)
        self._drift_baseline_x: Optional[float] = None
        self._drift_baseline_y: Optional[float] = None
        self._drift_offset_x: float = 0.0
        self._drift_offset_y: float = 0.0
        self._mapper = GridMapper(
            int(gr["rows"]),
            int(gr["cols"]),
            int(gr["cell_stability_count"]),
            buffer_size=5,
            hysteresis_threshold=float(gr.get("hysteresis_threshold", 0.05)),
        )
        self.trigger = TriggerDetector(blink_threshold=bth)
        self._ear_samples: deque[float] = deque(maxlen=120)
        self._calibrated = False
        self._screen_hold_sec = max(0.0, float(sm.get("screen_hold_ms", 280.0)) / 1000.0)
        self._readiness_valid_streak = max(1, int(sm.get("readiness_valid_streak", 2)))
        self._last_valid_output: Optional[Dict[str, Any]] = None
        self._last_valid_at: Optional[float] = None
        self._ready_streak = 0
        self._runtime_ready = False
        self._gaze: Optional[GazeEstimator] = None
        self._use_ai = use_ai
        if use_ai:
            ck = ai_checkpoint or self._find_l2cs_checkpoint()
            if ck and Path(ck).is_file():
                mname = "mobilegaze" if "mobile" in Path(ck).name.lower() else "l2cs"
                try:
                    est = GazeEstimator(checkpoint_path=ck, model_name=mname)
                    if est.model is not None or getattr(est, "_onnx_session", None) is not None:
                        self._gaze = est
                    else:
                        logger.warning("AI checkpoint not loaded; formula fallback only")
                except Exception as exc:
                    logger.warning("GazeEstimator failed (%s); formula fallback only", exc)
            else:
                logger.warning("use_ai=True but no valid checkpoint path")

    def _find_l2cs_checkpoint(self) -> Optional[str]:
        root = _repo_root()
        ck = root / "checkpoints"
        for fname in ("finetuned.pt", "l2cs_best.pt"):
            p = ck / fname
            if p.is_file():
                return str(p)
        return None

    def _reset_runtime_state(self, *, reset_trigger: bool = False) -> None:
        self._one_euro.reset()
        self._screen_stabilizer.reset()
        self._mapper.reset_stabilizer()
        self._last_valid_output = None
        self._last_valid_at = None
        self._ready_streak = 0
        self._runtime_ready = False
        if reset_trigger:
            self.trigger.reset()
            self._ear_samples.clear()
        self._recent_screen.clear()
        self._drift_offset_x = 0.0
        self._drift_offset_y = 0.0

    def _maybe_hold_last_output(
        self,
        *,
        timestamp: float,
        ear: float,
        blink: bool,
        trigger: str,
        reason: str,
    ) -> Optional[Dict[str, Any]]:
        if (
            self._last_valid_output is None
            or self._last_valid_at is None
            or timestamp - self._last_valid_at > self._screen_hold_sec
        ):
            return None
        held = dict(self._last_valid_output)
        held["ear"] = round(float(ear), 3)
        held["blink"] = bool(blink)
        held["trigger"] = trigger
        logger.debug("HybridTracker: short hold applied (%s)", reason)
        return held

    def _mark_valid_ready_frame(self) -> bool:
        if self._runtime_ready:
            return True
        self._ready_streak += 1
        if self._ready_streak >= self._readiness_valid_streak:
            self._runtime_ready = True
        return self._runtime_ready

    def set_calibration(self, points: List[Dict[str, Any]]) -> None:
        if self._ear_samples:
            mean_ear = sum(self._ear_samples) / len(self._ear_samples)
            th = max(0.10, mean_ear * 0.6)
            self.iris_normalizer.blink_threshold = th
            self.trigger.set_threshold(th)
            self._ear_samples.clear()
        cal = self._cfg["calibration"]
        trx: List[float] = [float(x) for x in cal["target_rx"]]
        try_: List[float] = [float(y) for y in cal["target_ry"]]
        n = min(len(trx), len(try_), len(points))
        raw_pts = [
            (float(points[i].get("rx", 0.5)), float(points[i].get("ry", 0.5)))
            for i in range(n)
        ]
        tgt_pts = [(trx[i], try_[i]) for i in range(n)]
        self._poly.fit(raw_pts, tgt_pts)
        self._cal_refiner.clear()
        for i in range(n):
            raw_rx = float(points[i].get("rx", 0.5))
            raw_ry = float(points[i].get("ry", 0.5))
            self._cal_refiner.add_sample(raw_rx, raw_ry, float(trx[i]), float(try_[i]))
        self._cal_refiner.fit()

        if self._recent_screen:
            n_screen = len(self._recent_screen)
            self._drift_baseline_x = sum(p[0] for p in self._recent_screen) / n_screen
            self._drift_baseline_y = sum(p[1] for p in self._recent_screen) / n_screen
        self._calibrated = True
        self._reset_runtime_state()
        logger.info("HybridTracker: calibration fitted (%s points)", n)

    def run(self, frame: np.ndarray) -> Dict[str, Any]:
        out = dict(_FAIL)
        now = time.monotonic()
        if frame is None or frame.size == 0:
            held = self._maybe_hold_last_output(
                timestamp=now,
                ear=0.0,
                blink=False,
                trigger="none",
                reason="empty_frame",
            )
            return held if held is not None else out

        h, w = frame.shape[:2]
        fb = frame
        if w < 480:
            scale = 480 / w
            fb = cv2.resize(fb, (480, int(h * scale)))
            h, w = fb.shape[:2]
        fb = preprocess_frame_cv(fb, use_clahe=True, use_denoise=False)
        det = self.detector.detect(fb)
        lm = det.get("landmarks")
        if lm is None:
            held = self._maybe_hold_last_output(
                timestamp=now,
                ear=0.0,
                blink=False,
                trigger="none",
                reason="no_landmarks",
            )
            if held is not None:
                return held
            self._reset_runtime_state(reset_trigger=True)
            return out

        rx, ry, ear, is_blink = self.iris_normalizer(lm)
        logger.debug(
            "[DIAG] iris raw: rx=%s ry=%s ear=%.3f blink=%s",
            f"{float(rx):.4f}" if rx is not None else "None",
            f"{float(ry):.4f}" if ry is not None else "None",
            ear,
            is_blink,
        )
        trig = self.trigger.update(ear, time.time())
        self._ear_samples.append(ear)

        yn: Optional[float] = None
        pn: Optional[float] = None
        if self._w_head > 0:
            hy, hp = head_pose_from_landmarks(lm, w, h)
            if hy is not None and hp is not None:
                yn = max(0.0, min(1.0, (hy + self._grid_yaw) / (2.0 * self._grid_yaw)))
                pn = max(0.0, min(1.0, (hp + self._grid_pitch) / (2.0 * self._grid_pitch)))

        used_head_pose_fallback = False
        if rx is None or ry is None:
            if yn is None or pn is None:
                held = self._maybe_hold_last_output(
                    timestamp=now,
                    ear=ear,
                    blink=is_blink,
                    trigger=trig,
                    reason="missing_gaze",
                )
                if held is not None:
                    return held
                self._reset_runtime_state(reset_trigger=True)
                out.update(
                    {
                        "face": True,
                        "ear": round(ear, 3),
                        "blink": bool(is_blink),
                        "trigger": trig,
                    }
                )
                return out
            fused_rx, fused_ry = yn, pn
            used_head_pose_fallback = True
            logger.debug("HybridTracker: iris unavailable; using head-pose fallback gaze")
        elif self._w_head > 0 and yn is not None and pn is not None:
            fused_rx = self._w_iris * rx + self._w_head * yn
            fused_ry = self._w_iris * ry + self._w_head * pn
        else:
            fused_rx, fused_ry = rx, ry

        if self._w_l2 > 0 and self._use_ai and self._gaze is not None:
            try:
                roi = det.get("face_roi")
                if roi and len(roi) >= 4:
                    fx, fy, fw, fh = int(roi[0]), int(roi[1]), int(roi[2]), int(roi[3])
                    if fw > 10 and fh > 10:
                        crop = fb[fy : fy + fh, fx : fx + fw]
                        face_rgb = cv2.cvtColor(cv2.resize(crop, (224, 224)), cv2.COLOR_BGR2RGB)
                        yaw_r, pit_r = self._gaze(face_rgb)
                        yd = math.degrees(yaw_r)
                        pd = math.degrees(pit_r)
                        lx = max(0.0, min(1.0, (yd + 45.0) / 90.0))
                        ly = max(0.0, min(1.0, (pd + 30.0) / 60.0))
                        fused_rx = (1.0 - self._w_l2) * fused_rx + self._w_l2 * lx
                        fused_ry = (1.0 - self._w_l2) * fused_ry + self._w_l2 * ly
            except Exception as exc:
                logger.warning("AI gaze fusion failed, using formula only: %s", exc)

        raw_rx, raw_ry = fused_rx, fused_ry
        logger.debug("[DIAG] fused: rx=%.4f ry=%.4f", fused_rx, fused_ry)
        rx_s, ry_s = self._one_euro.update(fused_rx, fused_ry)
        if rx_s is None or ry_s is None:
            rx_s, ry_s = fused_rx, fused_ry
        logger.debug("[DIAG] smoothed: rx=%.4f ry=%.4f", rx_s, ry_s)

        primary_space = "ratio"
        if self._calibrated and self._poly.is_fitted:
            px, py = self._poly.predict(float(rx_s), float(ry_s))
            primary_x, primary_y = float(px), float(py)
            primary_space = "screen"
        else:
            primary_x, primary_y = float(rx_s), float(ry_s)
        logger.debug(
            "[DIAG] calibrated: px=%.4f py=%.4f (space=%s)",
            primary_x,
            primary_y,
            primary_space,
        )

        stabilized = self._screen_stabilizer.stabilize(
            primary_x,
            primary_y,
            primary_space=primary_space,
            fallback_x=float(rx_s),
            fallback_y=float(ry_s),
            fallback_space="ratio",
            prefer_hold=used_head_pose_fallback or bool(is_blink),
        )
        if stabilized.used_fallback or stabilized.outlier_suppressed:
            logger.debug(
                "HybridTracker: screen stabilization reason=%s fallback=%s primary=(%.4f, %.4f) fallback=(%.4f, %.4f)",
                stabilized.reason,
                stabilized.used_fallback,
                primary_x,
                primary_y,
                float(rx_s),
                float(ry_s),
            )

        if stabilized.x is None or stabilized.y is None:
            held = self._maybe_hold_last_output(
                timestamp=now,
                ear=ear,
                blink=is_blink,
                trigger=trig,
                reason=stabilized.reason,
            )
            if held is not None:
                return held
            self._reset_runtime_state(reset_trigger=True)
            out.update(
                {
                    "face": True,
                    "ear": round(ear, 3),
                    "blink": bool(is_blink) if used_head_pose_fallback else False,
                    "trigger": trig,
                }
            )
            return out

        raw_cell = self._mapper.map_to_cell(
            stabilized.x,
            stabilized.y,
            from_screen_normalized=stabilized.space == "screen",
        )
        screen_x, screen_y = stabilized.x, stabilized.y
        # CalibrationRefiner 후보정
        if self._cal_refiner.is_fitted:
            screen_x, screen_y = self._cal_refiner.correct(screen_x, screen_y)
            screen_x = max(0.0, min(1.0, screen_x))
            screen_y = max(0.0, min(1.0, screen_y))

        # 드리프트 보정
        self._recent_screen.append((screen_x, screen_y))
        if self._drift_baseline_x is not None and self._recent_screen:
            n = len(self._recent_screen)
            moving_avg_x = sum(p[0] for p in self._recent_screen) / n
            moving_avg_y = sum(p[1] for p in self._recent_screen) / n
            if (
                abs(moving_avg_x - self._drift_baseline_x) >= 0.05
                or abs(moving_avg_y - self._drift_baseline_y) >= 0.05
            ):
                self._drift_offset_x = moving_avg_x - self._drift_baseline_x
                self._drift_offset_y = moving_avg_y - self._drift_baseline_y
                screen_x = max(0.0, min(1.0, screen_x - self._drift_offset_x))
                screen_y = max(0.0, min(1.0, screen_y - self._drift_offset_y))
        cell = self._mapper.stabilize(raw_cell)
        logger.debug("[DIAG] cell=%s stable=%s", cell, self._mapper.stable_cell)

        if not self._mark_valid_ready_frame():
            out.update(
                {
                    "cell": None,
                    "raw_rx": round(float(raw_rx), 4),
                    "raw_ry": round(float(raw_ry), 4),
                    "ear": round(ear, 3),
                    "face": True,
                    "blink": bool(is_blink) if used_head_pose_fallback else False,
                    "trigger": trig,
                    "screen_x": round(screen_x, 4),
                    "screen_y": round(screen_y, 4),
                }
            )
            return out

        result = {
            "cell": cell,
            "rx": round(float(rx_s), 4),
            "ry": round(float(ry_s), 4),
            "raw_rx": round(float(raw_rx), 4),
            "raw_ry": round(float(raw_ry), 4),
            "ear": round(ear, 3),
            "face": True,
            "blink": bool(is_blink) if used_head_pose_fallback else False,
            "trigger": trig,
            "screen_x": round(screen_x, 4),
            "screen_y": round(screen_y, 4),
        }
        self._last_valid_output = dict(result)
        self._last_valid_at = now
        return result
