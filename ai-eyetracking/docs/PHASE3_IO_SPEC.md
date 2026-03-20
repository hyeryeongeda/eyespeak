# 3단계: 입출력 규격 및 파이프라인

> 베이스 모델·전처리·입출력이 gaze_server 및 9그리드 UI와 맞도록 정리. 오프라인/실시간 측정 후 수치를 이 문서 또는 별도 결과 파일에 기록한다.

**구현 파일**: `config_gaze.py`, `preprocess.py`, `eye_detector.py`, `model.py`, `pipeline.py`, `scripts/measure_offline_accuracy.py`, `scripts/measure_realtime_latency.py`, `requirements.txt`

---

## 입출력 규격

| 항목 | 값 | 비고 |
|------|-----|------|
| **입력** | 얼굴 BGR 프레임 또는 눈 크롭 RGB (H, W, 3) | eye_detector가 눈 크롭 128→224 리사이즈는 model 측 transform에서 수행 |
| **모델 입력 해상도** | 224×224 | [config_gaze.py](../config_gaze.py) GAZE_INPUT_SIZE |
| **모델 출력** | (yaw_rad, pitch_rad) | 도 단위로 변환해 API 응답 |
| **API 응답** | `{"left": {"yaw": deg, "pitch": deg}, "right": {...}}` | POST /api/gaze |
| **9그리드 범위** | yaw ±25°, pitch ±20° | [config_gaze.py](../config_gaze.py), 시선_예시/gaze_server_9grid.html과 동기화 |
| **그리드 인덱스** | 0~8 (row-major) | yawPitchToCell 공식으로 yaw/pitch → 0~8 |

---

## 파이프라인 순서

1. 프레임 수신 (BGR)
2. (선택) `preprocess.preprocess_frame()` — CLAHE/노이즈 제거
3. `EyeDetector.detect()` — 왼쪽/오른쪽 눈 크롭 RGB
4. (선택) `preprocess.preprocess_eye_crop()` — 눈 이미지 보정
5. Transform (Resize 224, ToTensor, Normalize) → 모델 입력
6. 모델 추론 → (yaw_rad, pitch_rad)
7. 라디안 → 도, API 응답 또는 그리드 인덱스로 변환

---

## 베이스 모델

- **현재 기본**: GazeNet (눈 이미지 → yaw, pitch). `model.py`, 체크포인트 `checkpoints/best.pt`.
- **추가 예정**: L2CS-Net 등 얼굴+눈 입력 모델. `GAZE_BACKEND=l2cs` 시 연동 (연동 후 구현).

---

## 측정 결과 기록 (3-4, 3-5)

| 항목 | 결과 | 측정일/조건 |
|------|------|-------------|
| **오프라인 각도 오차** | (MAE ° 등) | `python3 scripts/measure_offline_accuracy.py --data 경로 --checkpoint 경로` |
| **오프라인 그리드 정확도** | (% ) | 동일 스크립트 |
| **실시간 FPS** | | `python3 scripts/measure_realtime_latency.py --camera 0` |
| **캡처→그리드 반영 지연** | (ms) | 동일 스크립트 |

체크: 오프라인 수치와 실시간 지연이 문서/숫자로 남아 있는지.
