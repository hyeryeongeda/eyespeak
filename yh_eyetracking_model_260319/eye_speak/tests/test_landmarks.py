"""랜드마크 상수 (CLAUDE.md / MediaPipe)."""

from __future__ import annotations

import pytest

from eye_speak.iris_tracker import landmarks as lm


def test_iris_centers_and_rings() -> None:
    assert lm.LEFT_IRIS_CENTER == 468
    assert lm.RIGHT_IRIS_CENTER == 473
    assert lm.LEFT_IRIS == [469, 470, 471, 472]
    assert lm.RIGHT_IRIS == [474, 475, 476, 477]
    assert len(lm.LEFT_IRIS) == 4
    assert 468 not in lm.LEFT_IRIS


def test_eye_contour_indices() -> None:
    assert lm.LEFT_EYE_INNER == 133 and lm.LEFT_EYE_OUTER == 33
    assert lm.LEFT_EYE_UPPER == 159 and lm.LEFT_EYE_LOWER == 145
    assert lm.RIGHT_EYE_INNER == 362 and lm.RIGHT_EYE_OUTER == 263
    assert lm.RIGHT_EYE_UPPER == 386 and lm.RIGHT_EYE_LOWER == 374


def test_ear_lists_length_and_legacy_alias() -> None:
    assert len(lm.R_EAR) == 6 and len(lm.L_EAR) == 6
    assert lm.R_IRIS is lm.LEFT_IRIS
    assert lm.L_IRIS is lm.RIGHT_IRIS
    assert lm.R_EYE_OUTER == lm.LEFT_EYE_OUTER


@pytest.mark.parametrize("name", ["R_EAR", "L_EAR"])
def test_ear_indices_positive(name: str) -> None:
    arr = getattr(lm, name)
    assert all(isinstance(i, int) and i >= 0 and i < 478 for i in arr)
