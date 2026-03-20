# 홍채/흰자 랜드마크 기반 시선 방향 수식 (B-1)

MediaPipe Face Mesh(468+ 홍채 10점) 랜드마크 좌표만으로 시선 방향을 계산하는 수식 정리.

## 1. 랜드마크 인덱스 (refine_landmarks=True 시 478점)

| 용도 | 인덱스 | 비고 |
|------|--------|------|
| 왼쪽 눈 영역(흰자/눈테두리) | 33, 7, 163, 144, 145, 153, 154, 155, 133, 246, 161, 160, 159, 158, 157, 173 | RIGHT_EYE (이미지 기준) |
| 오른쪽 눈 영역 | 263, 249, 390, 373, 374, 380, 381, 382, 362, 466, 388, 387, 386, 385, 384, 398 | LEFT_EYE |
| 왼쪽 홍채(iris) | 468, 469, 470, 471, 472 | 5점 (또는 474–477 등 구현체별 상이) |
| 오른쪽 홍채 | 473, 474, 475, 476, 477 | 5점 |

- 실제 MediaPipe Python `refine_landmarks=True` 시 **홍채 10점**: 왼쪽 469–472(4점), 오른쪽 474–477(4점) 등으로 문서화된 경우 있음. 구현 시 `iris_gaze.py`에서 사용하는 인덱스를 여기와 맞춘다.

## 2. 기본 수식: 홍채 상대 위치 → 방향 비율

- **눈 영역**: 해당 눈의 흰자/눈테두리 랜드마크로 bbox 또는 중심·폭 계산.
  - `eye_cx = mean(x of eye_landmarks)`, `eye_cy = mean(y of eye_landmarks)`
  - `eye_w = max(x) - min(x)`, `eye_h = max(y) - min(y)` (패딩 가능)
- **홍채 중심**:
  - `iris_cx = mean(x of iris_landmarks)`, `iris_cy = mean(y of iris_landmarks)`
- **정규화 비율** (눈 영역 내에서 홍채가 어디 있는지, 대략 -1~1):
  - `ratio_x = (iris_cx - eye_cx) / (eye_w / 2)`  (클리핑으로 -1~1 유지)
  - `ratio_y = (iris_cy - eye_cy) / (eye_h / 2)`
- **의미**: `ratio_x > 0` → 시선이 해당 눈 기준 오른쪽, `ratio_y > 0` → 아래쪽.

## 3. 시선 방향으로의 매핑

- **단일 눈**: `(ratio_x, ratio_y)`를 그대로 사용하거나, 스케일링해서 `(yaw_deg, pitch_deg)` 근사.
  - 예: `yaw_deg = k_yaw * ratio_x`, `pitch_deg = k_pitch * ratio_y` (k는 캘리 또는 고정 계수).
- **양쪽 눈**: 왼쪽·오른쪽 각각 `(ratio_x, ratio_y)` 계산 후 평균.
  - `yaw_ratio = (ratio_x_left + ratio_x_right) / 2`
  - `pitch_ratio = (ratio_y_left + ratio_y_right) / 2`
- **9그리드 셀**: `yaw_ratio`, `pitch_ratio`를 `config_gaze`의 `yaw_pitch_to_cell`에 넣을 수 있도록, 비율을 각도로 변환한 뒤 기존 `yaw_pitch_to_cell(yaw_deg, pitch_deg)` 호출.
  - 또는 비율 구간을 3등분해 직접 셀 인덱스(0~8) 계산.

## 4. 수식 요약 (코드용)

```
눈_중심_x = mean(눈_랜드마크_x)
눈_중심_y = mean(눈_랜드마크_y)
눈_폭 = max(눈_랜드마크_x) - min(눈_랜드마크_x) + ε
눈_높이 = max(눈_랜드마크_y) - min(눈_랜드마크_y) + ε

홍채_중심_x = mean(홍채_랜드마크_x)
홍채_중심_y = mean(홍채_랜드마크_y)

ratio_x = (홍채_중심_x - 눈_중심_x) / (눈_폭 / 2)
ratio_y = (홍채_중심_y - 눈_중심_y) / (눈_높이 / 2)

# 클리핑
ratio_x = clip(ratio_x, -1, 1)
ratio_y = clip(ratio_y, -1, 1)

# 선택: 각도 근사 (캘리로 k 조정)
yaw_deg  ≈ k_yaw  * ratio_x
pitch_deg ≈ k_pitch * ratio_y
```

## 5. 구현 위치

- 수식 적용 코드: `iris_gaze.py` (MediaPipe 랜드마크 입력 → ratio 또는 yaw/pitch/cell 반환).
- 파이프라인 연동: MediaPipe 검출 후 `landmarks`가 있으면 `iris_gaze` 모듈로 (yaw, pitch) 또는 셀을 계산해, 헤드포즈 대신 또는 보정값으로 사용할 수 있음.
