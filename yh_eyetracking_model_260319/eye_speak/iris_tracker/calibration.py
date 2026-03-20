"""캘리브레이션: Ridge 회귀 보정 및 2차 다항식 (rx, ry) → 화면 좌표 매핑."""

from __future__ import annotations

import logging
from typing import Any, List, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)


class PolynomialCalibrator:
    """홍채 비율 ``(rx, ry)``를 목표 정규화 좌표 ``(tx, ty)``에 맞추는 2차 다항식.

    특징 벡터: ``[1, rx, ry, rx*ry, rx², ry²]``. 계수는 최소 제곱으로 추정한다.
    """

    def __init__(self) -> None:
        self._coeff_x: Optional[np.ndarray] = None
        self._coeff_y: Optional[np.ndarray] = None

    def fit(
        self,
        raw_points: List[Tuple[float, float]],
        target_points: List[Tuple[float, float]],
    ) -> None:
        """샘플로 다항식 계수를 추정한다.

        Args:
            raw_points: 관측 ``(rx, ry)`` 목록.
            target_points: 대응 목표 ``(tx, ty)`` 목록 (예: 화면 정규화 좌표).

        Raises:
            ValueError: 두 리스트 길이가 다르거나 비어 있을 때.
        """
        if len(raw_points) != len(target_points):
            raise ValueError("raw_points and target_points must have the same length")
        n = len(raw_points)
        if n < 1:
            raise ValueError("at least one sample is required")
        a = np.zeros((n, 6), dtype=np.float64)
        for i, (rx, ry) in enumerate(raw_points):
            a[i] = [1.0, rx, ry, rx * ry, rx * rx, ry * ry]
        tx = np.array([p[0] for p in target_points], dtype=np.float64)
        ty = np.array([p[1] for p in target_points], dtype=np.float64)
        self._coeff_x, _, _, _ = np.linalg.lstsq(a, tx, rcond=None)
        self._coeff_y, _, _, _ = np.linalg.lstsq(a, ty, rcond=None)
        logger.info("PolynomialCalibrator fit: %s points", n)

    def predict(self, rx: float, ry: float) -> Tuple[float, float]:
        """학습된 다항식으로 ``(rx, ry)``에 대한 목표 좌표를 예측한다.

        Args:
            rx: 수평 비율.
            ry: 수직 비율.

        Returns:
            ``(pred_x, pred_y)``.

        Raises:
            RuntimeError: :meth:`fit` 호출 전.
        """
        if self._coeff_x is None or self._coeff_y is None:
            raise RuntimeError("PolynomialCalibrator: call fit() before predict()")
        features = np.array(
            [1.0, rx, ry, rx * ry, rx * rx, ry * ry],
            dtype=np.float64,
        )
        pred_x = float(np.dot(features, self._coeff_x))
        pred_y = float(np.dot(features, self._coeff_y))
        return (pred_x, pred_y)

    @property
    def is_fitted(self) -> bool:
        """계수가 학습되었는지 여부."""
        return self._coeff_x is not None and self._coeff_y is not None

    def export_coefficients(self) -> Tuple[List[float], List[float]]:
        """JSON 저장용 계수 리스트.

        Returns:
            ``(coeff_x, coeff_y)`` 각 6원소.

        Raises:
            RuntimeError: 미적합 시.
        """
        if not self.is_fitted:
            raise RuntimeError("PolynomialCalibrator: not fitted")
        assert self._coeff_x is not None and self._coeff_y is not None
        return self._coeff_x.tolist(), self._coeff_y.tolist()

    def import_coefficients(
        self, coeff_x: List[float], coeff_y: List[float]
    ) -> None:
        """저장된 계수로 복원한다.

        Args:
            coeff_x: ``lstsq`` x 출력 6차원.
            coeff_y: ``lstsq`` y 출력 6차원.
        """
        self._coeff_x = np.array(coeff_x, dtype=np.float64)
        self._coeff_y = np.array(coeff_y, dtype=np.float64)


class CalibrationRefiner:
    """캘리브레이션 샘플로 학습한 Ridge 회귀 보정기.

    사용 순서:
        #. :meth:`add_sample` 로 포인트 수집
        #. :meth:`fit` 으로 학습
        #. :meth:`correct` 로 실시간 보정
    """

    def __init__(self) -> None:
        self._raw: List[List[float]] = []
        self._target: List[List[float]] = []
        self._model_yaw: Any = None
        self._model_pitch: Any = None
        self._offset: Optional[np.ndarray] = None
        self._fitted = False

    def add_sample(
        self,
        raw_yaw: float,
        raw_pitch: float,
        target_yaw: float,
        target_pitch: float,
    ) -> None:
        """캘리 포인트 1개 추가."""
        self._raw.append([raw_yaw, raw_pitch])
        self._target.append([target_yaw, target_pitch])
        self._fitted = False

    def fit(self) -> bool:
        """수집된 샘플로 학습. 최소 3개 필요.

        Returns:
            학습 성공 여부.
        """
        if len(self._raw) < 3:
            logger.debug("CalibrationRefiner.fit: need at least 3 samples, got %s", len(self._raw))
            return False
        try:
            from sklearn.linear_model import Ridge

            x_arr = np.array(self._raw)
            y_arr = np.array(self._target)
            self._model_yaw = Ridge(alpha=1.0).fit(x_arr, y_arr[:, 0])
            self._model_pitch = Ridge(alpha=1.0).fit(x_arr, y_arr[:, 1])
            self._offset = None
            self._fitted = True
            logger.info("CalibrationRefiner: Ridge fit on %s samples", len(self._raw))
            return True
        except ImportError:
            raw = np.array(self._raw)
            tgt = np.array(self._target)
            self._offset = (tgt - raw).mean(axis=0)
            self._model_yaw = None
            self._model_pitch = None
            self._fitted = True
            logger.warning(
                "CalibrationRefiner: sklearn unavailable, using mean offset fallback",
            )
            return True

    def correct(self, raw_yaw: float, raw_pitch: float) -> Tuple[float, float]:
        """보정된 ``(yaw_deg, pitch_deg)`` 반환. 미학습 시 입력 그대로."""
        if not self._fitted:
            return (raw_yaw, raw_pitch)
        try:
            x = np.array([[raw_yaw, raw_pitch]])
            if self._model_yaw is not None and self._model_pitch is not None:
                yaw = float(self._model_yaw.predict(x)[0])
                pitch = float(self._model_pitch.predict(x)[0])
            elif self._offset is not None:
                yaw = raw_yaw + float(self._offset[0])
                pitch = raw_pitch + float(self._offset[1])
            else:
                return (raw_yaw, raw_pitch)
            return (yaw, pitch)
        except Exception as exc:
            logger.warning("CalibrationRefiner.correct failed: %s", exc)
            return (raw_yaw, raw_pitch)

    def clear(self) -> None:
        """수집 데이터·모델 초기화."""
        self._raw.clear()
        self._target.clear()
        self._model_yaw = None
        self._model_pitch = None
        self._offset = None
        self._fitted = False

    @property
    def sample_count(self) -> int:
        """수집된 샘플 수."""
        return len(self._raw)

    @property
    def is_fitted(self) -> bool:
        """학습 완료 여부."""
        return self._fitted
