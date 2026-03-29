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
from eye_speak.iris_tracker.snapshot_classifier import SnapshotClassifier
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
    "raw_iris_rx": None,
    "raw_iris_ry": None,
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
        self._snapshot = SnapshotClassifier(
            int(gr["rows"]),
            int(gr["cols"]),
            k=5,
            temporal_window=7,
            temporal_threshold=4,
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
        self._snapshot.reset_temporal()
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
            th = max(0.15, mean_ear * 0.75)
            self.iris_normalizer.blink_threshold = th
            self.trigger.set_threshold(th)
            self._ear_samples.clear()
        cal = self._cfg["calibration"]
        trx: List[float] = [float(x) for x in cal["target_rx"]]
        try_: List[float] = [float(y) for y in cal["target_ry"]]
        n = min(len(trx), len(try_), len(points))

        # --- Y축 동적 감도 계산 ---
        # 캘리브레이션 데이터에서 상단/하단 포인트의 ry 차이를 측정
        cal_cfg = self._cfg["calibration"]
        target_ry_list = [float(y) for y in cal_cfg["target_ry"]]
        n_cal = min(len(target_ry_list), len(points))

        top_rys: List[float] = []  # 상단 포인트 (target_ry < 0.3)
        bot_rys: List[float] = []  # 하단 포인트 (target_ry > 0.7)
        for i in range(n_cal):
            ry_val = float(points[i].get("ry", 0.5))
            ty = target_ry_list[i]
            if ty < 0.3:
                top_rys.append(ry_val)
            elif ty > 0.7:
                bot_rys.append(ry_val)

        if top_rys and bot_rys:
            top_mean = sum(top_rys) / len(top_rys)
            bot_mean = sum(bot_rys) / len(bot_rys)
            y_range = abs(bot_mean - top_mean)
            if y_range > 0.04:
                # 목표: 상단~하단의 iris 차이가 0.6 범위를 커버하도록
                dynamic_y_gain = 0.6 / y_range
                # gain 범위 제한: 최소 3.0, 최대 8.0
                dynamic_y_gain = max(3.0, min(8.0, dynamic_y_gain))
                self.iris_normalizer.set_y_gain(dynamic_y_gain)
                logger.info(
                    "Dynamic Y gain: %.2f (top_mean=%.4f bot_mean=%.4f range=%.4f)",
                    dynamic_y_gain,
                    top_mean,
                    bot_mean,
                    y_range,
                )
            else:
                logger.warning(
                    "Y range too small (%.4f), keeping default gain. top=%.4f bot=%.4f",
                    y_range,
                    top_mean,
                    bot_mean,
                )

        # --- 특징별 판별력 분석 → 동적 가중치 ---
        # 캘리브 포인트에서 4개 Y축 특징의 상단/하단 분리도 측정
        # 분리도가 큰 특징 = 이 사용자에게 판별력 높음 → 가중치 ↑
        if len(points) >= 12:  # 최소 12포인트 필요 (상단6 + 하단6)
            from eye_speak.iris_tracker.iris_normalizer import compute_iris_position

            _ = compute_iris_position  # 순환 import 방지용 지연 import 유지
            top_features: List[List[float]] = [[], [], [], []]  # iris, ear, sclera, lid
            bot_features: List[List[float]] = [[], [], [], []]

            for i in range(n_cal):
                ty = target_ry_list[i]
                if ty >= 0.3 and ty <= 0.7:
                    continue  # 중앙 포인트 제외

                # 해당 캘리브 포인트의 raw 특징값 추출을 위해
                # ry 값의 raw 구성요소를 근사적으로 사용
                ry_val = float(points[i].get("ry", 0.5))
                # 간단한 판별력 지표: 상단/하단 ry 분포 차이
                bucket = top_features if ty < 0.3 else bot_features
                bucket[0].append(ry_val)  # iris 기반 (ry 전체의 proxy)
                # EAR은 직접 측정 불가하므로 ry에서 간접 추정
                bucket[1].append(ry_val)
                bucket[2].append(ry_val)
                bucket[3].append(ry_val)

            # 상단/하단 ry 범위가 충분하면 가중치 계산
            # 현재는 모든 특징이 동일한 ry를 proxy로 사용하므로
            # 기본 가중치를 유지하되, Y-range 기반으로 iris vs EAR 비율만 조정
            if top_rys and bot_rys:
                y_range_val = abs(bot_mean - top_mean)
                if y_range_val > 0.02:
                    # Y range가 넓으면: iris 신호가 강함 → iris 가중치 ↑
                    # Y range가 좁으면: iris 신호가 약함 → sclera/lid 보조 ↑
                    iris_strength = min(1.0, y_range_val / 0.15)  # 0.15 이상이면 최대

                    w_iris = 0.25 + 0.20 * iris_strength  # 0.25 ~ 0.45
                    w_ear = 0.10 + 0.10 * (1.0 - iris_strength)  # 0.10 ~ 0.20
                    w_sclera = 0.25 + 0.10 * (1.0 - iris_strength)  # 0.25 ~ 0.35
                    w_lid = 0.15 + 0.05 * (1.0 - iris_strength)  # 0.15 ~ 0.20

                    self.iris_normalizer.set_feature_weights(w_iris, w_ear, w_sclera, w_lid)
                    logger.info(
                        "Dynamic feature weights: iris=%.2f ear=%.2f sclera=%.2f lid=%.2f (y_range=%.4f, iris_strength=%.2f)",
                        w_iris,
                        w_ear,
                        w_sclera,
                        w_lid,
                        y_range_val,
                        iris_strength,
                    )

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
        # 스냅샷 분류기 학습
        self._snapshot.fit(points, trx, try_)
        # 방향 검증 로그: 각 셀의 centroid가 올바른 위치인지 확인
        gr = self._cfg["grid"]
        for cell_idx, (crx, cry) in sorted(self._snapshot._centroids.items()):
            row, col = divmod(cell_idx, int(gr["cols"]))
            logger.info(
                "[DIRECTION] cell=%d (row=%d,col=%d) centroid_iris=(%.4f,%.4f)",
                cell_idx, row, col, crx, cry,
            )
        self._calibrated = True
        self.iris_normalizer.reset_center()
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
        raw_iris_rx, raw_iris_ry = rx, ry
        logger.debug(
            "[DIAG] iris raw: rx=%s ry=%s ear=%.3f blink=%s",
            f"{float(rx):.4f}" if rx is not None else "None",
            f"{float(ry):.4f}" if ry is not None else "None",
            ear,
            is_blink,
        )
        trig = self.trigger.update(ear, time.time())
        if trig != "none":
            logger.info(
                "[TRIGGER] event=%s ear=%.3f threshold=%.3f",
                trig,
                ear,
                self.iris_normalizer.blink_threshold,
            )
        elif hasattr(self, "_frame_count"):
            self._frame_count += 1
            if self._frame_count % 30 == 0:
                logger.info(
                    "[EAR-DIAG] ear=%.3f threshold=%.3f",
                    ear,
                    self.iris_normalizer.blink_threshold or 0.16,
                )
        else:
            self._frame_count = 0
        self._ear_samples.append(ear)

        yn: Optional[float] = None
        pn: Optional[float] = None
        if self._w_head > 0:
            hy, hp = head_pose_from_landmarks(lm, w, h)
            if hy is not None and hp is not None:
                yn = max(0.0, min(1.0, (hy + self._grid_yaw) / (2.0 * self._grid_yaw)))
                pitch_offset = float(self._cfg["grid"].get("pitch_offset_deg", 0.0))
                pn = max(
                    0.0,
                    min(1.0, (hp + pitch_offset + self._grid_pitch) / (2.0 * self._grid_pitch)),
                )

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
            # iris only — 루게릭 환자는 머리를 움직일 수 없으므로 head pose 사용 안 함
            fused_rx = rx
            fused_ry = ry
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

        # --- 셀 판정: SnapshotClassifier 우선, fallback으로 GridMapper ---
        raw_cell = self._mapper.map_to_cell(
            stabilized.x,
            stabilized.y,
            from_screen_normalized=stabilized.space == "screen",
        )
        if self._snapshot.is_fitted and raw_iris_rx is not None and raw_iris_ry is not None:
            snap_cell, snap_conf = self._snapshot.classify_stable(
                float(raw_iris_rx), float(raw_iris_ry)
            )
            if snap_cell is not None and snap_conf >= 0.4:
                raw_cell = snap_cell
                logger.debug(
                    "[SNAP] cell=%d conf=%.2f iris=(%.4f,%.4f)",
                    snap_cell, snap_conf, float(raw_iris_rx), float(raw_iris_ry),
                )
        cell = self._mapper.stabilize(raw_cell)
        logger.debug("[DIAG] cell=%s stable=%s", cell, self._mapper.stable_cell)
        # 캘리브 여부와 관계없이 연속 좌표 사용 (cell은 별도 전달)
        screen_x = stabilized.x if stabilized.x is not None else float(rx_s)
        screen_y = stabilized.y if stabilized.y is not None else float(ry_s)
        if self._cal_refiner.is_fitted:
            screen_x, screen_y = self._cal_refiner.correct(screen_x, screen_y)
            screen_x = max(0.0, min(1.0, screen_x))
            screen_y = max(0.0, min(1.0, screen_y))
        if not self._calibrated:
            # 드리프트 보정 (캘리브 전에만)
            self._recent_screen.append((screen_x, screen_y))
            if self._drift_baseline_x is not None and self._recent_screen:
                n_rs = len(self._recent_screen)
                moving_avg_x = sum(p[0] for p in self._recent_screen) / n_rs
                moving_avg_y = sum(p[1] for p in self._recent_screen) / n_rs
                if (
                    abs(moving_avg_x - self._drift_baseline_x) >= 0.05
                    or abs(moving_avg_y - self._drift_baseline_y) >= 0.05
                ):
                    self._drift_offset_x = moving_avg_x - self._drift_baseline_x
                    self._drift_offset_y = moving_avg_y - self._drift_baseline_y
                    screen_x = max(0.0, min(1.0, screen_x - self._drift_offset_x))
                    screen_y = max(0.0, min(1.0, screen_y - self._drift_offset_y))
        logger.debug(
            "[GAZE-DEBUG] iris_raw=(%.4f,%.4f) fused=(%.4f,%.4f) cell=%s screen=(%.4f,%.4f) calibrated=%s",
            float(raw_iris_rx) if raw_iris_rx is not None else 0.0,
            float(raw_iris_ry) if raw_iris_ry is not None else 0.0,
            fused_rx,
            fused_ry,
            cell,
            screen_x,
            screen_y,
            self._calibrated,
        )

        if not self._mark_valid_ready_frame():
            _iris_rx_val = round(float(raw_iris_rx), 4) if raw_iris_rx is not None else None
            _iris_ry_val = round(float(raw_iris_ry), 4) if raw_iris_ry is not None else None
            out.update(
                {
                    "cell": None,
                    "raw_rx": round(float(raw_rx), 4),
                    "raw_ry": round(float(raw_ry), 4),
                    "raw_iris_rx": _iris_rx_val,
                    "raw_iris_ry": _iris_ry_val,
                    "diag_iris_rx": _iris_rx_val,
                    "diag_iris_ry": _iris_ry_val,
                    "diag_gain_y": (
                        round(float(self.iris_normalizer.y_gain), 2)
                        if self.iris_normalizer.y_gain is not None
                        else 8.0
                    ),
                    "ear": round(ear, 3),
                    "face": True,
                    "blink": bool(is_blink) if used_head_pose_fallback else False,
                    "trigger": trig,
                    "screen_x": round(screen_x, 4),
                    "screen_y": round(screen_y, 4),
                }
            )
            return out

        _iris_rx_val = round(float(raw_iris_rx), 4) if raw_iris_rx is not None else None
        _iris_ry_val = round(float(raw_iris_ry), 4) if raw_iris_ry is not None else None
        result = {
            "cell": cell,
            "rx": round(float(rx_s), 4),
            "ry": round(float(ry_s), 4),
            "raw_rx": round(float(raw_rx), 4),
            "raw_ry": round(float(raw_ry), 4),
            "raw_iris_rx": _iris_rx_val,
            "raw_iris_ry": _iris_ry_val,
            "diag_iris_rx": _iris_rx_val,
            "diag_iris_ry": _iris_ry_val,
            "diag_gain_y": (
                round(float(self.iris_normalizer.y_gain), 2)
                if self.iris_normalizer.y_gain is not None
                else 8.0
            ),
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
