"""다항식 캘리브레이션."""

from __future__ import annotations

import numpy as np
import pytest

from eye_speak.iris_tracker.calibration import CalibrationRefiner, PolynomialCalibrator


def test_polynomial_calibrator_nine_point_identity() -> None:
    raw = [(i / 3.0, j / 3.0) for j in range(3) for i in range(3)]
    tgt = list(raw)
    poly = PolynomialCalibrator()
    poly.fit(raw, tgt)
    assert poly.is_fitted
    px, py = poly.predict(0.5, 0.5)
    assert abs(px - 0.5) < 1e-4
    assert abs(py - 0.5) < 1e-4


def test_polynomial_predict_before_fit_raises() -> None:
    poly = PolynomialCalibrator()
    with pytest.raises(RuntimeError):
        poly.predict(0.5, 0.5)


def test_polynomial_fit_mismatched_lengths() -> None:
    poly = PolynomialCalibrator()
    with pytest.raises(ValueError):
        poly.fit([(0.0, 0.0)], [(0.0, 0.0), (1.0, 1.0)])


def test_calibration_refiner_ridge_or_fallback() -> None:
    cr = CalibrationRefiner()
    cr.add_sample(0.0, 0.0, 0.1, 0.1)
    cr.add_sample(0.5, 0.5, 0.5, 0.5)
    cr.add_sample(1.0, 1.0, 0.9, 0.9)
    ok = cr.fit()
    assert ok is True
    assert cr.is_fitted
    y, p = cr.correct(0.5, 0.5)
    assert np.isfinite(y) and np.isfinite(p)


def test_calibration_refiner_too_few_samples() -> None:
    cr = CalibrationRefiner()
    cr.add_sample(0.0, 0.0, 0.0, 0.0)
    assert cr.fit() is False
