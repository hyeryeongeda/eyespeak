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

import cv2
import numpy as np
from flask import Flask, request, jsonify, send_from_directory

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger("gaze")

from config_gaze import DWELL_TIME_SEC
from eye_speak.pipeline.legacy_gaze_pipeline import GazePipeline

app = Flask(__name__, static_folder=None)
ROOT = Path(__file__).resolve().parent
STATIC_DIR = ROOT / "시선_예시"

pipe = GazePipeline()


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
    frame = _decode_frame()
    if frame is None:
        return jsonify({"error": "no image"}), 400
    result = pipe.run(frame)
    return jsonify(result)


@app.route("/api/calibrate", methods=["POST"])
def api_calibrate():
    data = request.get_json(silent=True) or {}
    cal = data.get("calibration")
    if not cal or not isinstance(cal, list) or len(cal) < 6 or len(cal) > 12:
        return jsonify({"ok": False, "error": "need 6-12 calibration points"}), 400
    pipe.set_calibration(cal)
    log.info("%d포인트 캘리 적용: %s", len(cal), cal)
    coeff_x, coeff_y = pipe._poly.export_coefficients()
    return jsonify({
        "ok": True,
        "poly_coeff_x": coeff_x,
        "poly_coeff_y": coeff_y,
    })


@app.route("/api/calibrate/reset", methods=["POST"])
def api_calibrate_reset():
    pipe.reset_filters()
    return jsonify({"ok": True})


@app.route("/api/calibrate/save", methods=["POST"])
def api_calibrate_save():
    """캘리브레이션 상태를 user_id별 JSON으로 저장."""
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")
    if not user_id or not isinstance(user_id, str):
        return jsonify({"ok": False, "error": "need user_id"}), 400
    ok = pipe.save_calibration(user_id)
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
    ok = pipe.load_calibration(user_id)
    if ok:
        log.info("캘리 로드 완료: %s", user_id)
    if ok:
        coeff_x, coeff_y = pipe._poly.export_coefficients()
        return jsonify({
            "ok": True,
            "calibrated": pipe.calibration is not None,
            "poly_coeff_x": coeff_x,
            "poly_coeff_y": coeff_y,
        })
    return jsonify({"ok": False, "calibrated": pipe.calibration is not None})


@app.route("/api/selection", methods=["POST"])
def api_selection():
    """dwell time으로 셀 선택 확정 시 호출. 온라인 학습(implicit feedback)용."""
    data = request.get_json(silent=True) or {}
    cell = data.get("cell")
    if cell is None:
        return jsonify({"status": "error", "error": "missing cell"}), 400
    try:
        cell = int(cell)
    except (TypeError, ValueError):
        return jsonify({"status": "error", "error": "cell must be int"}), 400
    pipe.record_selection(cell)
    return jsonify({"status": "ok"})


@app.route("/api/runtime-config", methods=["GET"])
def api_runtime_config():
    return jsonify({
        "status": "ok",
        "dwell_time_sec": DWELL_TIME_SEC,
    })


@app.route("/api/health", methods=["GET"])
def api_health():
    return jsonify({
        "status": "ok",
        "calibrated": pipe.calibration is not None,
    })


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
