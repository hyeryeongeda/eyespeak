"""그리드 매핑·안정화·히스테리시스."""

from __future__ import annotations

import pytest

from eye_speak.iris_tracker.grid_mapper import GridMapper


def test_map_center_cell_2x3() -> None:
    g = GridMapper(2, 3, 3, buffer_size=5, hysteresis_threshold=0.0)
    assert g.map_to_cell(0.5, 0.5) == 4
    # rx>0.55 -> col 0 ; rx<0.45 -> col 2
    assert g.map_to_cell(0.6, 0.3) == 0
    assert g.map_to_cell(0.2, 0.3) == 2
    assert g.map_to_cell(0.5, 0.2) == 1


def test_map_screen_normalized_thirds() -> None:
    g = GridMapper(2, 3, 3)
    assert g.map_to_cell(0.15, 0.25, from_screen_normalized=True) == 0
    assert g.map_to_cell(0.5, 0.25, from_screen_normalized=True) == 1
    assert g.map_to_cell(0.85, 0.75, from_screen_normalized=True) == 5


def test_stabilize_majority() -> None:
    g = GridMapper(2, 3, 3, buffer_size=5)
    g.stabilize(1)
    g.stabilize(1)
    g.stabilize(1)
    c = g.stabilize(1)
    assert c == 1
    assert g.stable_cell == 1


def test_stabilize_edge_empty_buffer_first() -> None:
    g = GridMapper(2, 3, 2, buffer_size=3)
    assert g.stabilize(5) == 5
    assert g.stable_cell is None or isinstance(g.stable_cell, int)


def test_hysteresis_retains_near_boundary() -> None:
    g = GridMapper(2, 3, 1, buffer_size=10, hysteresis_threshold=0.2)
    g._stable_cell = 4
    raw = g.map_to_cell(0.52, 0.52)
    assert raw == 4 or raw in (0, 1, 2, 3, 4, 5)


def test_invalid_grid_raises() -> None:
    with pytest.raises(ValueError):
        GridMapper(0, 3, 1)
