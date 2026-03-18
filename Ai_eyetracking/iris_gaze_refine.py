"""
B-2: 1-1에서 얻은 (yaw, pitch) 또는 비율 좌표를 스무딩·보정하여 방향 고도화.
- EMA(지수이동평균)로 떨림 감소.
- One-Euro Filter: 속도 적응형 스무딩 (느리면 강하게, 빠르면 지연 최소화).
- (선택) 경량 ML: scikit-learn 회귀/분류로 캘리 데이터 학습 후 보정.
"""

import math
import time
from typing import Optional, Tuple


def _one_euro_alpha(fc: float, te: float) -> float:
    """One-Euro Filter: cutoff frequency fc(Hz), time delta te(s) → alpha."""
    if te <= 0:
        return 1.0
    tau = 1.0 / (2.0 * math.pi * fc)
    return 1.0 / (1.0 + tau / te)


class _OneEuroAxis:
    """단일 축(yaw 또는 pitch)에 대한 One-Euro Filter 상태."""

    def __init__(self, min_cutoff: float = 1.0, beta: float = 0.007):
        self.min_cutoff = min_cutoff
        self.beta = beta
        self._x_prev: Optional[float] = None
        self._dx_prev: float = 0.0

    def update(self, x: float, te: float) -> float:
        if te <= 0:
            te = 0.02
        if self._x_prev is None:
            self._x_prev = x
            return x
        dx_raw = (x - self._x_prev) / te
        alpha_d = _one_euro_alpha(self.min_cutoff, te)
        dx_filtered = alpha_d * dx_raw + (1.0 - alpha_d) * self._dx_prev
        fc = self.min_cutoff + self.beta * abs(dx_filtered)
        alpha_x = _one_euro_alpha(fc, te)
        x_filtered = alpha_x * x + (1.0 - alpha_x) * self._x_prev
        self._x_prev = x_filtered
        self._dx_prev = dx_filtered
        return x_filtered

    def reset(self):
        self._x_prev = None
        self._dx_prev = 0.0


class OneEuroRefiner:
    """
    One-Euro Filter 기반 (yaw, pitch) 스무딩.
    느린 움직임: 강한 스무딩. 빠른 시선 이동(saccade): 지연 최소화.
    """

    def __init__(self, min_cutoff: float = 1.0, beta: float = 0.007):
        self._yaw_filter = _OneEuroAxis(min_cutoff, beta)
        self._pitch_filter = _OneEuroAxis(min_cutoff, beta)
        self._last_t: Optional[float] = None

    def update(self, yaw_deg: Optional[float], pitch_deg: Optional[float]) -> Tuple[Optional[float], Optional[float]]:
        if yaw_deg is None or pitch_deg is None:
            return (self._yaw_filter._x_prev, self._pitch_filter._x_prev)
        t = time.time()
        te = (t - self._last_t) if self._last_t is not None else 0.02
        self._last_t = t
        yaw_out = self._yaw_filter.update(yaw_deg, te)
        pitch_out = self._pitch_filter.update(pitch_deg, te)
        return (yaw_out, pitch_out)

    def reset(self):
        self._yaw_filter.reset()
        self._pitch_filter.reset()
        self._last_t = None


class GazeRefiner:
    """
    (yaw_deg, pitch_deg) 스트림에 EMA 적용. 첫 값은 그대로, 이후 alpha로 스무딩.
    """

    def __init__(self, alpha: float = 0.3):
        """
        alpha: 0에 가까울수록 부드럽지만 지연 증가. 0.2~0.4 권장.
        """
        self.alpha = max(0.01, min(1.0, alpha))
        self._yaw: Optional[float] = None
        self._pitch: Optional[float] = None

    def update(self, yaw_deg: Optional[float], pitch_deg: Optional[float]) -> Tuple[Optional[float], Optional[float]]:
        """한 프레임 (yaw, pitch) 입력 → 스무딩된 (yaw, pitch) 반환."""
        if yaw_deg is None or pitch_deg is None:
            return (self._yaw, self._pitch)
        if self._yaw is None:
            self._yaw, self._pitch = yaw_deg, pitch_deg
            return (yaw_deg, pitch_deg)
        self._yaw = self.alpha * yaw_deg + (1 - self.alpha) * self._yaw
        self._pitch = self.alpha * pitch_deg + (1 - self.alpha) * self._pitch
        return (self._yaw, self._pitch)

    def reset(self):
        """상태 초기화 (캘리 후 등)."""
        self._yaw = None
        self._pitch = None


def moving_average(values: list, window: int = 3) -> float:
    """리스트 마지막 window개 이동평균. 비어 있으면 0."""
    if not values or window <= 0:
        return 0.0
    subset = values[-window:]
    return sum(subset) / len(subset)


class CalibrationRefiner:
    """
    캘리브레이션 데이터로 학습한 선형 회귀 보정기.
    사용법:
      1) cal = CalibrationRefiner()
      2) 캘리 포인트마다: cal.add_sample(raw_yaw, raw_pitch, target_yaw, target_pitch)
      3) cal.fit()  ← sklearn Ridge 학습
      4) 실시간: yaw, pitch = cal.correct(raw_yaw, raw_pitch)
    """

    def __init__(self):
        self._raw: list = []      # [(yaw, pitch), ...]
        self._target: list = []   # [(yaw, pitch), ...]
        self._model_yaw = None
        self._model_pitch = None
        self._fitted = False

    def add_sample(self, raw_yaw: float, raw_pitch: float,
                   target_yaw: float, target_pitch: float):
        """캘리 포인트 1개 추가. raw=모델 출력, target=실제 화면 좌표 → 각도."""
        self._raw.append([raw_yaw, raw_pitch])
        self._target.append([target_yaw, target_pitch])
        self._fitted = False

    def fit(self) -> bool:
        """수집된 샘플로 Ridge 회귀 학습. 최소 3개 필요. 성공 시 True."""
        if len(self._raw) < 3:
            return False
        try:
            from sklearn.linear_model import Ridge
            import numpy as np
            X = np.array(self._raw)
            Y = np.array(self._target)
            self._model_yaw = Ridge(alpha=1.0).fit(X, Y[:, 0])
            self._model_pitch = Ridge(alpha=1.0).fit(X, Y[:, 1])
            self._fitted = True
            return True
        except ImportError:
            # scikit-learn 없으면 단순 오프셋 폴백
            import numpy as np
            raw = np.array(self._raw)
            tgt = np.array(self._target)
            self._offset = (tgt - raw).mean(axis=0)
            self._fitted = True
            return True

    def correct(self, raw_yaw: float, raw_pitch: float) -> Tuple[float, float]:
        """보정된 (yaw_deg, pitch_deg) 반환. 미학습 시 입력 그대로."""
        if not self._fitted:
            return (raw_yaw, raw_pitch)
        try:
            import numpy as np
            x = np.array([[raw_yaw, raw_pitch]])
            if self._model_yaw is not None:
                yaw = float(self._model_yaw.predict(x)[0])
                pitch = float(self._model_pitch.predict(x)[0])
            else:
                yaw = raw_yaw + float(self._offset[0])
                pitch = raw_pitch + float(self._offset[1])
            return (yaw, pitch)
        except Exception:
            return (raw_yaw, raw_pitch)

    def clear(self):
        """수집 데이터·모델 초기화."""
        self._raw.clear()
        self._target.clear()
        self._model_yaw = None
        self._model_pitch = None
        self._fitted = False

    @property
    def sample_count(self) -> int:
        return len(self._raw)

    @property
    def is_fitted(self) -> bool:
        return self._fitted
