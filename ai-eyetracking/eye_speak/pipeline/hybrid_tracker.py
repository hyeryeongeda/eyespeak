"""1~7단계 모듈을 묶은 하이브리드 시선 파이프라인 (수식 + 선택적 AI)."""

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
from eye_speak.iris_tracker.detector import MediaPipeDetector
from eye_speak.iris_tracker.grid_mapper import GridMapper
from eye_speak.iris_tracker.head_pose import head_pose_from_landmarks
from eye_speak.iris_tracker.iris_normalizer import IrisNormalizer
from eye_speak.iris_tracker.smoother import OneEuroRefiner

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
    """MediaPipe → 홍채 정규화 → 헤드 퓨전 → One-Euro → 다항식 캘리 → 그리드 → 트리거."""

    def __init__(
        self,
        config_path: str = "eye_speak/configs/default.yaml",
        use_ai: bool = False,
        ai_checkpoint: Optional[str] = None,
    ) -> None:
        """Args:
            config_path: YAML 경로. 없으면 패키지 기본 설정.
            use_ai: ``True``면 AI ``GazeEstimator`` 로드 시도 (실패 시 수식만).
            ai_checkpoint: 우선 사용할 ``.pt`` 경로. ``None``이면 기본 탐색.
        """
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
        self._poly = PolynomialCalibrator()
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
            elif use_ai:
                logger.warning("use_ai=True but no valid checkpoint path")

    def _find_l2cs_checkpoint(self) -> Optional[str]:
        root = _repo_root()
        ck = root / "checkpoints"
        for fname in ("finetuned.pt", "l2cs_best.pt"):
            p = ck / fname
            if p.is_file():
                return str(p)
        return None

    def set_calibration(self, points: List[Dict[str, Any]]) -> None:
        """다항식 캘리브레이션 적용. ``points``: ``{\"rx\",\"ry\"}`` 목록."""
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
        self._calibrated = True
        self._one_euro.reset()
        self._mapper.reset_stabilizer()
        logger.info("HybridTracker: calibration fitted (%s points)", n)

    def run(self, frame: np.ndarray) -> Dict[str, Any]:
        """BGR 프레임 한 장 처리."""
        out = dict(_FAIL)
        if frame is None or frame.size == 0:
            return out
        h, w = frame.shape[:2]
        fb = frame
        if w < 480:
            s = 480 / w
            fb = cv2.resize(fb, (480, int(h * s)))
            h, w = fb.shape[:2]
        fb = preprocess_frame_cv(fb, use_clahe=True, use_denoise=False)
        det = self.detector.detect(fb)
        lm = det.get("landmarks")
        if lm is None:
            return out
        rx, ry, ear, is_blink = self.iris_normalizer(lm)
        trig = self.trigger.update(ear, time.time())
        self._ear_samples.append(ear)

        hy, hp = head_pose_from_landmarks(lm, w, h)
        yn: Optional[float] = None
        pn: Optional[float] = None
        if hy is not None and hp is not None:
            yn = max(0.0, min(1.0, (hy + self._grid_yaw) / (2.0 * self._grid_yaw)))
            pn = max(0.0, min(1.0, (hp + self._grid_pitch) / (2.0 * self._grid_pitch)))

        # 홍채 비율이 없을 때(깜빡임·검출 실패) 조기 반환하면 rx/ry가 null이라
        # 웹 프론트가 tracking-unstable로 처리해 시선 포인트가 갱신되지 않는다.
        # 얼굴·랜드마크가 있으면 헤드 포즈만으로 0~1 시선 대용 값을 채운다.
        used_head_pose_fallback = False
        if rx is None or ry is None:
            if yn is None or pn is None:
                out.update(
                    {
                        "face": True,
                        "ear": round(ear, 3),
                        "blink": is_blink,
                        "trigger": trig,
                    }
                )
                return out
            fused_rx, fused_ry = yn, pn
            used_head_pose_fallback = True
            logger.debug("HybridTracker: iris unavailable; using head-pose fallback gaze")
        elif yn is not None and pn is not None:
            fused_rx = self._w_iris * rx + self._w_head * yn
            fused_ry = self._w_iris * ry + self._w_head * pn
        else:
            fused_rx, fused_ry = rx, ry

        if self._use_ai and self._gaze is not None:
            try:
                roi = det.get("face_roi")
                if roi and len(roi) >= 4:
                    fx, fy, fw, fh = int(roi[0]), int(roi[1]), int(roi[2]), int(roi[3])
                    if fw > 10 and fh > 10:
                        crop = fb[fy : fy + fh, fx : fx + fw]
                        face_rgb = cv2.cvtColor(
                            cv2.resize(crop, (224, 224)), cv2.COLOR_BGR2RGB
                        )
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
        rx_s, ry_s = self._one_euro.update(fused_rx, fused_ry)
        if rx_s is None or ry_s is None:
            rx_s, ry_s = fused_rx, fused_ry

        if self._calibrated and self._poly.is_fitted:
            px, py = self._poly.predict(float(rx_s), float(ry_s))
            px = max(0.0, min(1.0, px))
            py = max(0.0, min(1.0, py))
            raw_cell = self._mapper.map_to_cell(px, py, from_screen_normalized=True)
            screen_x, screen_y = px, py
        else:
            raw_cell = self._mapper.map_to_cell(float(rx_s), float(ry_s))
            screen_x, screen_y = float(rx_s), float(ry_s)

        cell = self._mapper.stabilize(raw_cell)
        return {
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
