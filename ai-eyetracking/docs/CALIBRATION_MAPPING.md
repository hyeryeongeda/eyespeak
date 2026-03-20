# 캘리브레이션 보정 매핑

N점 캘리브레이션으로 수집한 "관측 (yaw, pitch)"를 그리드 셀의 "목표 각도"에 맞게 보정하는 기능입니다. 개인차(눈 위치, 카메라 각도 등)를 Ridge 회귀로 학습해 추론 시 적용합니다.

## 동작 방식

1. **목표 각도**: 각 그리드 셀 인덱스(0~5 또는 0~8)에 대해 `config_gaze`의 범위(yaw ±25°, pitch ±20°)로 **셀 중심 (yaw_deg, pitch_deg)** 를 계산. `model.cell_index_to_target_yaw_pitch(cell_index)` 사용.
2. **캘리 수집**: 사용자가 1~6번(또는 1~9번)을 순서대로 응시할 때 서버가 반환한 **(yaw, pitch)** 를 해당 셀의 **관측값**으로 저장.
3. **보정기 학습**: 관측 (yaw_i, pitch_i) → 목표 (target_yaw_i, target_pitch_i) 쌍으로 `CalibrationRefiner`(Ridge 회귀) 학습. 최소 **3점** 이상이면 fit. (few-shot 지원)
4. **추론 시 적용**: 이후 `/api/gaze` 응답 전에 `CalibrationRefiner.correct(pred_yaw, pred_pitch)`로 보정 후 `yaw_pitch_to_cell` 재계산.

## API

### POST /api/calibrate

N점 캘리 데이터를 한 번 등록합니다. 이후 `/api/gaze` 응답에 자동 보정이 적용됩니다.

- **Request**: `{ "calibration_points": [ { "cell": 0..N-1, "yaw": float, "pitch": float }, ... ] }`
- **최소 3점** 필요. 6점·9점 전체를 보내도 됨.
- **Response**: `{ "ok": true, "samples": 6 }` 또는 `{ "ok": false, "error": "..." }`

### POST /api/gaze

- 요청 본문에 `calibration_points`를 포함해 보내도 됨. 3점 이상이면 해당 요청에서 보정기를 재학습·적용.
- 캘리 완료 후 한 번만 `/api/calibrate`를 호출해 두면, 이후 gaze 요청에는 별도로 calibration_points를 보낼 필요 없음 (서버가 전역 보정기 유지).

## Few-shot (간편 캘리)

3~5점만 수집해도 보정 매핑이 동작합니다. UI에서 "간편 캘리(3점)" 옵션을 두고 1번·5번·9번 등만 응시하도록 안내할 수 있습니다. `calibration_points`에 3개만 넣어서 `/api/calibrate` 호출하면 됩니다.

## 구현 위치

- **보정기**: `iris_gaze_refine.CalibrationRefiner` (Ridge 또는 단순 오프셋 폴백)
- **셀→목표 각도**: `model.cell_index_to_target_yaw_pitch`
- **API 연동**: `app_gaze_web._fit_calibration_refiner`, `_apply_calibration_refiner`, `POST /api/calibrate`, `POST /api/gaze` 내 적용
- **프론트**: 6점 캘리 완료 후 `POST /api/calibrate` 호출 (`gaze_server_9grid.html`)

## 참고

- 기존 단일 오프셋 `calibration: { yaw, pitch }` 는 그대로 지원. `calibration_points`가 없고 보정기가 학습되지 않은 경우에만 사용됩니다.
