"""
시선 추적 서버 (단순화).
POST /api/gaze           → 프레임 → 셀 + 비율
POST /api/calibrate      → 6~12포인트 캘리브레이션
POST /api/calibrate/reset → 캘리 초기화
GET  /api/health         → 상태
"""

import base64
import logging
from pathlib import Path
from threading import Lock

import cv2
import numpy as np
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger("gaze")

from eye_speak.pipeline.legacy_gaze_pipeline import GazePipeline

app = Flask(__name__, static_folder=None)
CORS(app)
ROOT = Path(__file__).resolve().parent
STATIC_DIR = ROOT / "시선_예시"

_pipelines: dict = {}
_pipelines_lock = Lock()


def _get_pipeline(user_id: str = "default") -> GazePipeline:
    """user_id별 GazePipeline 인스턴스를 반환한다. 없으면 새로 생성."""
    with _pipelines_lock:
        if user_id not in _pipelines:
            _pipelines[user_id] = GazePipeline()
        return _pipelines[user_id]


def _decode_frame():
    data = request.get_json(silent=True) or {}
    b64 = data.get("image")
    if not b64:
        return None
    raw = base64.b64decode(b64)
    arr = np.frombuffer(raw, dtype=np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)


@app.route("/api/gaze", methods=["POST"])
def api_gaze():
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id", "default")
    if not isinstance(user_id, str):
        user_id = "default"
    frame = _decode_frame()
    if frame is None:
        return jsonify({"error": "no image"}), 400
    result = _get_pipeline(user_id).run(frame)
    return jsonify(result)


@app.route("/api/calibrate", methods=["POST"])
def api_calibrate():
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id", "default")
    if not isinstance(user_id, str):
        user_id = "default"
    cal = data.get("calibration")
    if not cal or not isinstance(cal, list) or len(cal) < 6 or len(cal) > 25:
        return jsonify({"ok": False, "error": "need 6-25 calibration points"}), 400
    log.info("api_calibrate: user_id=%s, points=%d", user_id, len(cal))
    _get_pipeline(user_id).set_calibration(cal)
    log.info("api_calibrate: pipeline calibrated=%s", _get_pipeline(user_id).calibration)
    log.info("%d포인트 캘리 적용: %s", len(cal), cal)
    return jsonify({"ok": True})


@app.route("/api/calibrate/reset", methods=["POST"])
def api_calibrate_reset():
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id", "default")
    if not isinstance(user_id, str):
        user_id = "default"
    _get_pipeline(user_id).reset_filters()
    return jsonify({"ok": True})


@app.route("/api/calibrate/save", methods=["POST"])
def api_calibrate_save():
    """캘리브레이션 상태를 user_id별 JSON으로 저장."""
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")
    if not user_id or not isinstance(user_id, str):
        return jsonify({"ok": False, "error": "need user_id"}), 400
    log.info(
        "api_calibrate_save: user_id=%s, pipeline_calibrated=%s, poly_fitted=%s",
        user_id,
        _get_pipeline(user_id)._calibrated,
        _get_pipeline(user_id)._poly.is_fitted,
    )
    ok = _get_pipeline(user_id).save_calibration(user_id)
    log.info("api_calibrate_save: result ok=%s", ok)
    if ok:
        log.info("캘리 저장 완료: %s", user_id)
    return jsonify({"ok": ok})


@app.route("/api/calibrate/load", methods=["POST"])
def api_calibrate_load():
    """user_id별 JSON에서 캘리브레이션 상태 복원."""
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")
    if not user_id or not isinstance(user_id, str):
        return jsonify({"ok": False, "error": "need user_id"}), 400
    pl = _get_pipeline(user_id)
    ok = pl.load_calibration(user_id)
    if ok:
        log.info("캘리 로드 완료: %s", user_id)
    return jsonify({"ok": ok, "calibrated": pl.calibration is not None})


@app.route("/api/selection", methods=["POST"])
def api_selection():
    """dwell time으로 셀 선택 확정 시 호출. 온라인 학습(implicit feedback)용."""
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id", "default")
    if not isinstance(user_id, str):
        user_id = "default"
    cell = data.get("cell")
    if cell is None:
        return jsonify({"status": "error", "error": "missing cell"}), 400
    try:
        cell = int(cell)
    except (TypeError, ValueError):
        return jsonify({"status": "error", "error": "cell must be int"}), 400
    _get_pipeline(user_id).record_selection(cell)
    return jsonify({"status": "ok"})


@app.route("/api/health", methods=["GET"])
def api_health():
    return jsonify({
        "status": "ok",
        "calibrated": _get_pipeline("default").calibration is not None,
    })


@app.route("/api/runtime-config", methods=["GET"])
def api_runtime_config():
    runtime = dict(_get_pipeline("default")._cfg.get("runtime", {}))
    trigger = dict(_get_pipeline("default")._cfg.get("trigger", {}))
    return jsonify(
        {
            "poll_interval_ms": int(runtime.get("poll_interval_ms", 100)),
            "frame_max_width": int(runtime.get("frame_max_width", 480)),
            "jpeg_quality": float(runtime.get("frame_jpeg_quality", 0.72)),
            "lerp_factor": float(runtime.get("lerp_factor", 0.15)),
            "dwell_time_sec": float(trigger.get("dwell_time_sec", 1.5)),
        }
    )


@app.route("/")
def index():
    if STATIC_DIR.is_dir():
        return send_from_directory(STATIC_DIR, "gaze_server_9grid.html")
    return "<p>Put gaze_server_9grid.html in 시선_예시/</p>"


@app.route("/<path:path>")
def static_file(path):
    if STATIC_DIR.is_dir():
        return send_from_directory(STATIC_DIR, path)
    return "", 404


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
