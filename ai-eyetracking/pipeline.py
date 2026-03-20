"""
파이프라인: 프레임(BGR) → MediaPipe → 홍채 비율 → 셀
6~12포인트 캘리브레이션: 각 셀 극단 위치에서 홍채 비율 측정 → 경계 기반 매핑
L2CS-Net 선택적 3번째 시선 시그널 (use_l2cs=True 시 퓨전).

호환 / 마이그레이션
-------------------
신규 코드·웹 서버는 ``eye_speak`` 패키지 사용을 권장합니다.

- 핵심 구현: ``eye_speak.pipeline.hybrid_tracker.HybridTracker``
- Flask/레거시 API 동일 클래스: ``eye_speak.pipeline.legacy_gaze_pipeline.GazePipeline``
- 한 번에 임포트: ``from eye_speak.pipeline.compat import HybridTracker, GazePipeline``

이 파일(루트 ``pipeline.py``)의 ``GazePipeline`` 클래스는 기존 스크립트 하위 호환용으로
유지합니다. 기능 동기화는 ``legacy_gaze_pipeline.GazePipeline`` 기준으로 진행합니다.
"""

import collections
import json
import os
import cv2
import numpy as np
import time, math
from pathlib import Path

from mediapipe_detector import MediaPipeDetector
from iris_gaze import compute_iris_position
from head_pose import head_pose_from_landmarks
from config_gaze import (
    HEAD_POSE_WEIGHT,
    IRIS_GAZE_WEIGHT,
    GRID_YAW_RANGE,
    GRID_PITCH_RANGE,
    L2CS_WEIGHT,
    CALIB_TARGET_RX,
    CALIB_TARGET_RY,
    CALIB_SAVE_DIR,
)
from Ai_eyetracking.trigger_detector import TriggerDetector
from preprocess import preprocess_frame
from iris_gaze_refine import CalibrationRefiner

# 캘리브레이션용 → config에서 import한 CALIB_TARGET_RX, CALIB_TARGET_RY 사용
# 온라인 학습(record_selection)용 6셀 중심 좌표는 별도 유지
CELL_CENTER_RX = [1/6, 0.5, 5/6, 1/6, 0.5, 5/6]
CELL_CENTER_RY = [0.25, 0.25, 0.25, 0.75, 0.75, 0.75]
DRIFT_THRESHOLD = 0.05
ONLINE_FIT_AFTER_SAMPLES = 10

# ── One-Euro 필터 ──
def _one_euro_alpha(fc, te):
    if te <= 0: return 1.0
    tau = 1.0 / (2.0 * math.pi * fc)
    return 1.0 / (1.0 + tau / te)

class _Axis1Euro:
    def __init__(self, fc_min=1.2, beta=0.15):
        self.fc_min, self.beta = fc_min, beta
        self.x_prev = None
        self.dx_prev = 0.0
    def __call__(self, x, te):
        if te <= 0: te = 0.033
        if self.x_prev is None:
            self.x_prev = x; return x
        dx = (x - self.x_prev) / te
        a_d = _one_euro_alpha(self.fc_min, te)
        dx_f = a_d * dx + (1 - a_d) * self.dx_prev
        fc = self.fc_min + self.beta * abs(dx_f)
        a_x = _one_euro_alpha(fc, te)
        x_f = a_x * x + (1 - a_x) * self.x_prev
        self.x_prev, self.dx_prev = x_f, dx_f
        return x_f
    def reset(self):
        self.x_prev = None; self.dx_prev = 0.0


class GazePipeline:
    def __init__(self, use_l2cs=False):
        self.detector = MediaPipeDetector(
            min_detection_confidence=0.3,
            min_tracking_confidence=0.3,
        )
        self._fx = _Axis1Euro(fc_min=1.2, beta=0.15)  # 수평 유지
        self._fy = _Axis1Euro(fc_min=0.8, beta=0.05)   # 수직 강한 스무딩
        self._last_t = None

        # 셀 안정화: 5프레임 중 3표 이상
        self._cell_buf = collections.deque(maxlen=5)
        self._stable_cell = None

        # 6~12포인트 캘리: 2차 다항식 회귀 (rx,ry) → (target_x, target_y)
        self.calibration = None
        self._poly_coeff_x = None
        self._poly_coeff_y = None
        self._cal_refiner = CalibrationRefiner()
        self._blink_threshold = 0.18
        self._trigger = TriggerDetector(blink_threshold=self._blink_threshold)
        self._ear_samples = collections.deque(maxlen=120)
        self._last_raw_rx = None
        self._last_raw_ry = None
        self._last_screen_x = None
        self._last_screen_y = None
        self._drift_baseline_x = None
        self._drift_baseline_y = None
        self._drift_offset_x = 0.0
        self._drift_offset_y = 0.0
        self._recent_screen = collections.deque(maxlen=90)

        self._gaze_estimator = None
        if use_l2cs:
            ckpt = "checkpoints/finetuned.pt"
            if not (os.path.isfile(ckpt)):
                ckpt = "checkpoints/l2cs_best.pt"
            if os.path.isfile(ckpt):
                try:
                    from model import GazeEstimator
                    self._gaze_estimator = GazeEstimator(checkpoint_path=ckpt)
                    if self._gaze_estimator.model is None:
                        self._gaze_estimator = None
                except Exception:
                    self._gaze_estimator = None

    def _smooth(self, rx, ry):
        t = time.time()
        te = (t - self._last_t) if self._last_t else 0.033
        self._last_t = t
        return self._fx(rx, te), self._fy(ry, te)

    def _ratio_to_cell_default(self, rx, ry):
        if rx > 0.55: col = 0
        elif rx < 0.45: col = 2
        else: col = 1
        row = 0 if ry < 0.45 else 1
        return row * 3 + col

    def _poly_predict(self, rx, ry):
        """2차 다항식: [1, rx, ry, rx*ry, rx², ry²] · coeff → (pred_x, pred_y)."""
        features = np.array([1.0, rx, ry, rx * ry, rx * rx, ry * ry], dtype=np.float64)
        pred_x = float(np.dot(features, self._poly_coeff_x))
        pred_y = float(np.dot(features, self._poly_coeff_y))
        return (pred_x, pred_y)

    def _ratio_to_cell_calibrated(self, rx, ry):
        pred_x, pred_y = self._poly_predict(rx, ry)
        pred_x = max(0.0, min(1.0, pred_x))
        pred_y = max(0.0, min(1.0, pred_y))
        col = 0 if pred_x < 1/3 else (1 if pred_x < 2/3 else 2)
        row = 0 if pred_y < 0.5 else 1
        return row * 3 + col

    def _stabilize_cell(self, raw_cell):
        self._cell_buf.append(raw_cell)
        counts = collections.Counter(self._cell_buf)
        most, cnt = counts.most_common(1)[0]
        if cnt >= 3:
            self._stable_cell = most
        return self._stable_cell if self._stable_cell is not None else raw_cell

    def run(self, frame_bgr):
        fail = {"cell": None, "rx": None, "ry": None, "raw_rx": None, "raw_ry": None,
                "ear": 0.0, "face": False, "blink": False, "trigger": "none", "screen_x": 0.5, "screen_y": 0.5}
        if frame_bgr is None or frame_bgr.size == 0:
            return fail

        h, w = frame_bgr.shape[:2]
        if w < 480:
            s = 480 / w
            frame_bgr = cv2.resize(frame_bgr, (480, int(h * s)))
            h, w = frame_bgr.shape[:2]

        frame_bgr = preprocess_frame(frame_bgr, use_clahe=True, use_denoise=False)
        det = self.detector.detect(frame_bgr)
        if det.get("landmarks") is None:
            return fail

        landmarks = det["landmarks"]
        rx, ry, ear, is_blinking = compute_iris_position(landmarks, blink_threshold=self._blink_threshold)
        trigger = self._trigger.update(ear, time.time())
        self._ear_samples.append(ear)

        if rx is None:
            return {**fail, "face": True, "ear": round(ear, 3), "blink": is_blinking, "trigger": trigger}

        # 헤드포즈 + 홍채 비율 퓨전 (헤드포즈 실패 시 홍채 비율만 사용)
        head_yaw, head_pitch = head_pose_from_landmarks(landmarks, w, h)
        if head_yaw is not None and head_pitch is not None:
            yaw_norm = (head_yaw + GRID_YAW_RANGE) / (2.0 * GRID_YAW_RANGE)
            yaw_norm = max(0.0, min(1.0, yaw_norm))
            pitch_norm = (head_pitch + GRID_PITCH_RANGE) / (2.0 * GRID_PITCH_RANGE)
            pitch_norm = max(0.0, min(1.0, pitch_norm))
            fused_rx = IRIS_GAZE_WEIGHT * rx + HEAD_POSE_WEIGHT * yaw_norm
            fused_ry = IRIS_GAZE_WEIGHT * ry + HEAD_POSE_WEIGHT * pitch_norm
        else:
            fused_rx, fused_ry = rx, ry

        # CalibrationRefiner.correct() 비활성화 — 다항식(_poly_predict)만 사용, 과보정 방지 (PHASE 3-3에서 재활용 예정)
        # if self._cal_refiner.is_fitted:
        #     fused_rx, fused_ry = self._cal_refiner.correct(fused_rx, fused_ry)
        # L2CS-Net 3번째 시선 시그널 (방법A: fused 비중 1-L2CS_WEIGHT, L2CS 비중 L2CS_WEIGHT)
        if self._gaze_estimator is not None:
            face_roi = det.get("face_roi")
            if face_roi and len(face_roi) >= 4:
                try:
                    fx, fy, fw, fh = face_roi[0], face_roi[1], face_roi[2], face_roi[3]
                    if fw > 10 and fh > 10:
                        face_crop = frame_bgr[fy : fy + fh, fx : fx + fw]
                        face_rgb = cv2.cvtColor(cv2.resize(face_crop, (224, 224)), cv2.COLOR_BGR2RGB)
                        yaw_rad, pitch_rad = self._gaze_estimator(face_rgb)
                        yaw_deg = math.degrees(yaw_rad)
                        pitch_deg = math.degrees(pitch_rad)
                        l2cs_x = (yaw_deg + 45.0) / 90.0
                        l2cs_y = (pitch_deg + 30.0) / 60.0
                        l2cs_x = max(0.0, min(1.0, l2cs_x))
                        l2cs_y = max(0.0, min(1.0, l2cs_y))
                        fused_rx = (1.0 - L2CS_WEIGHT) * fused_rx + L2CS_WEIGHT * l2cs_x
                        fused_ry = (1.0 - L2CS_WEIGHT) * fused_ry + L2CS_WEIGHT * l2cs_y
                except Exception:
                    pass
        raw_rx, raw_ry = fused_rx, fused_ry
        self._last_raw_rx = raw_rx
        self._last_raw_ry = raw_ry
        rx, ry = self._smooth(fused_rx, fused_ry)

        if self.calibration:
            raw_cell = self._ratio_to_cell_calibrated(rx, ry)
        else:
            raw_cell = self._ratio_to_cell_default(rx, ry)

        cell = self._stabilize_cell(raw_cell)

        if self.calibration and self._poly_coeff_x is not None:
            screen_x, screen_y = self._poly_predict(rx, ry)
            screen_x = max(0.0, min(1.0, screen_x))
            screen_y = max(0.0, min(1.0, screen_y))
        else:
            screen_x, screen_y = rx, ry
        if self._cal_refiner.is_fitted:
            screen_x, screen_y = self._cal_refiner.correct(screen_x, screen_y)
            screen_x = max(0.0, min(1.0, screen_x))
            screen_y = max(0.0, min(1.0, screen_y))
        self._recent_screen.append((screen_x, screen_y))
        if self._drift_baseline_x is not None and self._recent_screen:
            n = len(self._recent_screen)
            moving_avg_x = sum(p[0] for p in self._recent_screen) / n
            moving_avg_y = sum(p[1] for p in self._recent_screen) / n
            if abs(moving_avg_x - self._drift_baseline_x) >= DRIFT_THRESHOLD or abs(moving_avg_y - self._drift_baseline_y) >= DRIFT_THRESHOLD:
                self._drift_offset_x = moving_avg_x - self._drift_baseline_x
                self._drift_offset_y = moving_avg_y - self._drift_baseline_y
                screen_x = screen_x - self._drift_offset_x
                screen_y = screen_y - self._drift_offset_y
                screen_x = max(0.0, min(1.0, screen_x))
                screen_y = max(0.0, min(1.0, screen_y))

        self._last_screen_x = screen_x
        self._last_screen_y = screen_y
        return {
            "cell": cell,
            "rx": round(rx, 4),
            "ry": round(ry, 4),
            "raw_rx": round(raw_rx, 4),
            "raw_ry": round(raw_ry, 4),
            "ear": round(ear, 3),
            "face": True,
            "blink": False,
            "trigger": trigger,
            "screen_x": round(screen_x, 4),
            "screen_y": round(screen_y, 4),
        }

    def set_calibration(self, points):
        """
        6~12포인트 캘리: points = [{rx, ry}, ...] 6~12개
        순서: 좌상(0), 중상(1), 우상(2), 좌하(3), 중하(4), 우하(5)
        캘리 중 수집된 EAR 평균의 60%를 깜빡임 임계값으로 설정 (ptosis 대응).
        """
        if self._ear_samples:
            mean_ear = sum(self._ear_samples) / len(self._ear_samples)
            self._blink_threshold = max(0.10, mean_ear * 0.6)
            self._trigger.set_threshold(self._blink_threshold)
            self._ear_samples.clear()
        n_pts = min(len(CALIB_TARGET_RX), len(points))
        CELL_TARGET_RX_arr = np.array(CALIB_TARGET_RX[:n_pts], dtype=np.float64)
        CELL_TARGET_RY_arr = np.array(CALIB_TARGET_RY[:n_pts], dtype=np.float64)
        A = np.zeros((n_pts, 6), dtype=np.float64)
        for i in range(n_pts):
            rx = points[i].get('rx', 0.5)
            ry = points[i].get('ry', 0.5)
            A[i] = [1, rx, ry, rx * ry, rx * rx, ry * ry]
        target_x = CELL_TARGET_RX_arr[:n_pts]
        target_y = CELL_TARGET_RY_arr[:n_pts]
        self._poly_coeff_x, _, _, _ = np.linalg.lstsq(A, target_x, rcond=None)
        self._poly_coeff_y, _, _, _ = np.linalg.lstsq(A, target_y, rcond=None)

        self._cal_refiner.clear()
        for i in range(n_pts):
            raw_rx = points[i].get('rx', 0.5)
            raw_ry = points[i].get('ry', 0.5)
            self._cal_refiner.add_sample(raw_rx, raw_ry, float(CALIB_TARGET_RX[i]), float(CALIB_TARGET_RY[i]))
        self._cal_refiner.fit()

        self.calibration = True
        self._cell_buf.clear()
        self._stable_cell = None
        self._fx.reset()
        self._fy.reset()
        self._last_t = None
        if self._recent_screen:
            n = len(self._recent_screen)
            self._drift_baseline_x = sum(p[0] for p in self._recent_screen) / n
            self._drift_baseline_y = sum(p[1] for p in self._recent_screen) / n

    def record_selection(self, cell_index):
        """dwell time으로 셀 선택 확정 시 호출. (screen_x, screen_y) ↔ 셀 중심 페어링 후 CalibrationRefiner에 추가, 10개 시 fit."""
        if cell_index is None or cell_index < 0 or cell_index >= 6:
            return
        if self._last_screen_x is None or self._last_screen_y is None:
            return
        target_rx = CELL_CENTER_RX[cell_index]
        target_ry = CELL_CENTER_RY[cell_index]
        self._cal_refiner.add_sample(self._last_screen_x, self._last_screen_y, target_rx, target_ry)
        if self._cal_refiner.sample_count >= ONLINE_FIT_AFTER_SAMPLES:
            self._cal_refiner.fit()

    def reset_filters(self):
        self._fx.reset()
        self._fy.reset()
        self._last_t = None
        self._cell_buf.clear()
        self._stable_cell = None
        self.calibration = None
        self._poly_coeff_x = None
        self._poly_coeff_y = None
        self._cal_refiner.clear()
        self._blink_threshold = 0.18
        self._trigger.reset()
        self._ear_samples.clear()
        self._last_raw_rx = None
        self._last_raw_ry = None
        self._last_screen_x = None
        self._last_screen_y = None
        self._recent_screen.clear()
        self._drift_baseline_x = None
        self._drift_baseline_y = None
        self._drift_offset_x = 0.0
        self._drift_offset_y = 0.0

    def save_calibration(self, user_id: str) -> bool:
        """캘리브레이션 상태를 JSON 파일로 저장.

        Args:
            user_id: 사용자 식별자 (파일명에 사용).

        Returns:
            저장 성공 여부.
        """
        if not self.calibration or self._poly_coeff_x is None:
            return False
        if not user_id or "/" in user_id or "\\" in user_id or ".." in user_id:
            return False
        import logging
        log = logging.getLogger(__name__)
        save_dir = Path(CALIB_SAVE_DIR)
        save_dir.mkdir(parents=True, exist_ok=True)
        data = {
            "user_id": user_id,
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
            "blink_threshold": self._blink_threshold,
            "poly_coeff_x": self._poly_coeff_x.tolist(),
            "poly_coeff_y": self._poly_coeff_y.tolist(),
            "cal_refiner_raw": self._cal_refiner._raw,
            "cal_refiner_target": self._cal_refiner._target,
        }
        filepath = save_dir / f"{user_id}.json"
        try:
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            log.info("캘리 저장: %s", filepath)
            return True
        except Exception as e:
            log.error("캘리 저장 실패: %s", e)
            return False

    def load_calibration(self, user_id: str) -> bool:
        """JSON 파일에서 캘리브레이션 상태 복원.

        Args:
            user_id: 사용자 식별자.

        Returns:
            로드 성공 여부.
        """
        if not user_id or "/" in user_id or "\\" in user_id or ".." in user_id:
            return False
        import logging
        log = logging.getLogger(__name__)
        filepath = Path(CALIB_SAVE_DIR) / f"{user_id}.json"
        if not filepath.is_file():
            log.warning("캘리 파일 없음: %s", filepath)
            return False
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)
            self._poly_coeff_x = np.array(data["poly_coeff_x"], dtype=np.float64)
            self._poly_coeff_y = np.array(data["poly_coeff_y"], dtype=np.float64)
            self._blink_threshold = float(data.get("blink_threshold", 0.18))
            self._trigger.set_threshold(self._blink_threshold)
            self._cal_refiner.clear()
            for raw, tgt in zip(data.get("cal_refiner_raw", []),
                                data.get("cal_refiner_target", [])):
                self._cal_refiner.add_sample(raw[0], raw[1], tgt[0], tgt[1])
            if self._cal_refiner.sample_count >= 3:
                self._cal_refiner.fit()
            self.calibration = True
            self._cell_buf.clear()
            self._stable_cell = None
            self._fx.reset()
            self._fy.reset()
            self._last_t = None
            log.info("캘리 로드: %s", filepath)
            return True
        except Exception as e:
            log.error("캘리 로드 실패: %s", e)
            return False
