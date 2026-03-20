"""YAML 기반 gaze 설정 로더 (환경변수 오버라이드)."""

from __future__ import annotations

import copy
import os
from pathlib import Path
from typing import Any, Final, Mapping, MutableMapping, Optional, Union

import yaml

_ENV_SPEC: Final[
    tuple[tuple[str, tuple[str, ...], str], ...]
] = (
    ("DETECTOR", ("detector", "type"), "str"),
    ("PITCH_OFFSET_DEG", ("grid", "pitch_offset_deg"), "float"),
    ("YAW_OFFSET_DEG", ("grid", "yaw_offset_deg"), "float"),
    ("USE_GAZE_REFINER", ("smoothing", "use_gaze_refiner"), "bool_01"),
    ("REFINER_TYPE", ("smoothing", "refiner_type"), "str"),
    ("ONE_EURO_MIN_CUTOFF", ("smoothing", "one_euro_min_cutoff"), "float"),
    ("ONE_EURO_BETA", ("smoothing", "one_euro_beta"), "float"),
    ("BLINK_EAR_THRESHOLD", ("smoothing", "blink_ear_threshold"), "float"),
    ("HEAD_POSE_WEIGHT", ("weights", "head_pose_weight"), "float"),
    ("IRIS_GAZE_WEIGHT", ("weights", "iris_gaze_weight"), "float"),
    ("CELL_STABILITY_COUNT", ("grid", "cell_stability_count"), "int"),
    ("GRID_ROWS", ("grid", "rows"), "int"),
    ("GRID_COLS", ("grid", "cols"), "int"),
    ("GRID_HYSTERESIS_THRESHOLD", ("grid", "hysteresis_threshold"), "float"),
    ("L2CS_WEIGHT", ("weights", "l2cs_weight"), "float"),
    ("BLINK_SELECT_MIN_SEC", ("trigger", "blink_select_min_sec"), "float"),
    ("BLINK_SELECT_MAX_SEC", ("trigger", "blink_select_max_sec"), "float"),
    ("DOUBLE_BLINK_WINDOW_SEC", ("trigger", "double_blink_window_sec"), "float"),
    ("LONG_CLOSE_SEC", ("trigger", "long_close_sec"), "float"),
    ("TRIPLE_BLINK_WINDOW_SEC", ("trigger", "triple_blink_window_sec"), "float"),
    ("BLINK_HISTORY_TTL_SEC", ("trigger", "blink_history_ttl_sec"), "float"),
    ("CALIB_SAVE_DIR", ("paths", "calib_save_dir"), "str"),
    ("DWELL_TIME_SEC", ("trigger", "dwell_time_sec"), "float"),
)


def _parse_env_value(raw: str, kind: str) -> Any:
    """환경변수 문자열을 설정 타입에 맞게 변환한다.

    Args:
        raw: 비어 있지 않은 환경변수 값.
        kind: ``\"str\"`` | ``\"float\"`` | ``\"int\"`` | ``\"bool_01\"``.

    Returns:
        파싱된 값.

    Raises:
        ValueError: ``bool_01``이 ``\"0\"``/``\"1\"``가 아닐 때.
    """
    if kind == "str":
        return raw.strip()
    if kind == "float":
        return float(raw)
    if kind == "int":
        return int(raw)
    if kind == "bool_01":
        s = raw.strip()
        if s == "1":
            return True
        if s == "0":
            return False
        raise ValueError(f"USE_GAZE_REFINER must be '0' or '1', got {raw!r}")
    raise ValueError(f"unknown env kind: {kind}")


def _get_nested(
    data: Mapping[str, Any], path: tuple[str, ...]
) -> Any:
    """중첩 매핑에서 경로로 값을 조회한다.

    Args:
        data: 최상위 설정 딕셔너리.
        path: 섹션 키 튜플 (예: ``(\"grid\", \"rows\")``).

    Returns:
        해당 경로의 값.

    Raises:
        KeyError: 경로가 존재하지 않을 때.
    """
    cur: Any = data
    for key in path:
        cur = cur[key]
    return cur


def _set_nested(
    data: MutableMapping[str, Any], path: tuple[str, ...], value: Any
) -> None:
    """중첩 매핑에 경로로 값을 설정한다 (중간 dict 자동 생성).

    Args:
        data: 갱신할 최상위 설정 (in-place).
        path: 섹션 키 튜플.
        value: 설정할 값.
    """
    cur: MutableMapping[str, Any] = data
    for key in path[:-1]:
        nxt = cur.get(key)
        if not isinstance(nxt, MutableMapping):
            nxt = {}
            cur[key] = nxt
        cur = nxt
    cur[path[-1]] = value


def _deep_copy_mapping(src: Mapping[str, Any]) -> dict[str, Any]:
    """설정 매핑을 재귀적으로 복사한다 (YAML 로드 결과 보호).

    Args:
        src: 원본 매핑.

    Returns:
        얕은/깊은 혼합이 아닌 ``dict`` 트리 복사본.
    """
    return copy.deepcopy(dict(src))


def _apply_env_overrides(cfg: MutableMapping[str, Any]) -> None:
    """``_ENV_SPEC``에 정의된 환경변수로 ``cfg``를 덮어쓴다.

    환경변수가 설정되어 있지 않으면 아무 것도 하지 않는다.

    Args:
        cfg: ``load_config``가 반환할 설정 (in-place).
    """
    for env_name, path, kind in _ENV_SPEC:
        raw = os.environ.get(env_name)
        if raw is None or raw == "":
            continue
        try:
            parsed = _parse_env_value(raw, kind)
        except ValueError:
            if env_name == "USE_GAZE_REFINER":
                raise
            raise ValueError(f"invalid value for {env_name}: {raw!r}") from None
        _set_nested(cfg, path, parsed)


def _normalize_detector_and_refiner(cfg: MutableMapping[str, Any]) -> None:
    """``config_gaze.py``와 동일하게 detector/refiner 문자열을 검증·정규화한다.

    Args:
        cfg: 검증 후 in-place로 수정할 설정.
    """
    det = cfg["detector"]
    t = str(det.get("type", "mediapipe")).strip().lower()
    if t not in ("haar", "mediapipe"):
        t = "mediapipe"
    det["type"] = t

    sm = cfg["smoothing"]
    rt = str(sm.get("refiner_type", "one_euro")).strip().lower()
    if rt not in ("ema", "one_euro"):
        rt = "one_euro"
    sm["refiner_type"] = rt


def _finalize_derived_fields(cfg: MutableMapping[str, Any]) -> None:
    """``config_gaze.py``의 파생 상수와 동일한 필드를 채운다.

    Args:
        cfg: in-place 갱신할 설정.
    """
    g = cfg["grid"]
    rows = int(g["rows"])
    cols = int(g["cols"])
    g["num_cells"] = rows * cols

    d = cfg["detector"]
    d["gaze_input_size"] = (int(d["gaze_input_h"]), int(d["gaze_input_w"]))


def load_config(
    path: Optional[Union[str, Path]] = None,
) -> dict[str, Any]:
    """기본 YAML을 로드하고 환경변수 오버라이드·정규화를 적용한다.

    Args:
        path: YAML 파일 경로. ``None``이면 패키지 내 ``default.yaml``을 사용한다.

    Returns:
        섹션 키 ``detector``, ``grid``, ``smoothing``, ``weights``,
        ``calibration``, ``trigger``, ``paths``를 갖는 설정 딕셔너리.
        ``grid``에 ``num_cells``, ``detector``에 ``gaze_input_size``가 추가된다.

    Raises:
        FileNotFoundError: ``path``가 주어졌으나 파일이 없을 때.
        yaml.YAMLError: YAML 파싱 실패 시.
    """
    if path is None:
        yaml_path = Path(__file__).resolve().parent / "default.yaml"
    else:
        yaml_path = Path(path)

    with yaml_path.open(encoding="utf-8") as f:
        loaded = yaml.safe_load(f)

    if not isinstance(loaded, Mapping):
        raise TypeError("YAML root must be a mapping")

    cfg = _deep_copy_mapping(loaded)
    _apply_env_overrides(cfg)
    _normalize_detector_and_refiner(cfg)
    _finalize_derived_fields(cfg)
    return cfg
