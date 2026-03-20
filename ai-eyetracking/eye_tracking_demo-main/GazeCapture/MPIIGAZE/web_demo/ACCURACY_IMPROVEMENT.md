# 웹 데모 시선 정확도 개선 가이드

## 현재 구조 요약

- **웹 데모**는 다음 순서로 시선을 추정합니다.
  1. **Gaze NN** (`gaze_screen.onnx`) — 있으면 **우선 사용** (AI Hub 학습 모델)
  2. **홍채 YOLO** (`iris.onnx`) — 홍채/흰자 검출 후 정규화
  3. **동공 검출** — 어두운 픽셀 중심 (fallback)
- 그 다음 **9점 캘리브레이션**으로 (xNorm, yNorm) → 화면 픽셀으로 변환합니다.

---

## 1. 학습이 끝나면 정확도가 좋아지나요?

**학습만 끝나면 자동으로 좋아지지 않습니다.**  
`train_gaze_aihub.py`가 만드는 `gaze_screen.onnx`를 **웹 데모에서 쓰도록** 해야 합니다.

### 학습 후 해야 할 일

1. 학습이 끝나면 다음 파일이 생성됩니다.  
   `runs/gaze_aihub/runN/gaze_screen.onnx` (N = run 번호)
2. 이 파일을 **web_demo 폴더로 복사**해서 `gaze_screen.onnx`로 두세요.
   ```text
   copy runs\gaze_aihub\run1\gaze_screen.onnx web_demo\gaze_screen.onnx
   ```
3. 웹 데모를 다시 열면 **Gaze NN**이 로드되고, 시선 추정에 이 모델이 우선 사용됩니다.  
   (기존에는 홍채/동공 방식만 쓰고 있어서 정확도가 낮았을 수 있습니다.)

---

## 2. 정확도를 더 높이는 방법

### A. 학습된 모델 사용 (권장)

- 위처럼 `gaze_screen.onnx`를 web_demo에 두고 사용하는 것이 가장 효과적입니다.
- 학습 데이터(AI Hub 126)와 같은 전처리(64×64, ImageNet 정규화)를 웹에서도 동일하게 쓰고 있으므로, 학습이 잘 되었다면 정확도가 눈에 띄게 나아질 수 있습니다.

### B. 캘리브레이션 품질

- **캘리브레이션**은 “모델 출력 → 실제 화면 좌표” 보정용이므로 중요합니다.
- 9점 캘리 시 **각 점을 정확히 보기**, **수집 시간**(현재 2.5초)을 약간 늘리거나,  
  화면/조명이 바뀌면 **재캘리브레이션**을 하는 것이 좋습니다.
- 필요하면 `CALIB_COLLECT_MS`(수집 시간), `CALIB_PTS`(포인트 개수/위치)를 조정해 보세요.

### C. 스무딩

- `GAZE_SMOOTH_ALPHA`(기본 0.15)를 낮추면 커서가 더 부드러워지고 떨림이 줄어듭니다.  
  너무 낮추면 반응이 느려지므로 0.1~0.2 사이에서 조정하는 것을 권장합니다.

### D. 정확도 향상 전용 학습 (주피터 + GPU)

이미 Gaze NN을 쓰고 있는데 **조금 더 정확도를 올리고 싶을 때**:

- **`train_gaze_accuracy_boost.ipynb`** (MPIIGAZE 폴더) 실행
  - **강한 augmentation**: RandomPerspective, ColorJitter 확대, RandomGrayscale 등
  - **더 큰 regression head**: 128→256 hidden
  - **동일 데이터** (`runs/aihub_cache`) 사용, GPU·AMP 지원
- 학습 후 `runs/gaze_aihub/runN/gaze_screen.onnx` 를 `web_demo/gaze_screen.onnx` 로 복사해 적용

### E. 학습 방향 (추가 개선 시)

- **데이터**: AI Hub 126만 쓰는 경우, Laptop+Monitor 등 실제 사용 환경과 비슷한 기기/해상도 비율이 많을수록 좋습니다.
- **전처리 일치**: 학습 시 `build_aihub_cache.py`는 **눈꺼풀 bbox + margin**으로 크롭합니다.  
  웹에서는 **YOLO 눈 bbox**로 크롭하므로, 가능하면 학습 데이터의 크롭 방식과 비슷하게 맞추면 도메인 갭이 줄어듭니다.
- **에포크/early stopping**: `train_gaze_aihub.py`의 Phase 2 early stopping(15 에포크 개선 없으면 종료)으로 과적합을 막고 있습니다.  
  validation pixel error가 수렴했으면 학습 방향을 크게 바꿀 필요는 없습니다.

---

## 3. 정리

| 질문 | 답변 |
|------|------|
| 학습 끝나면 웹이 저절로 좋아지나요? | 아니요. `gaze_screen.onnx`를 web_demo에 복사해 두어야 합니다. |
| 학습 방향을 바꿔야 하나요? | 우선은 현재 학습 완료 후 **웹에 ONNX 연동**만 해보고, 그다음에 캘리/스무딩을 조정하는 것을 권장합니다. |
| 정확도가 여전히 낮다면? | ① Gaze NN 사용 여부 확인 ② 캘리브레이션 다시 하기 ③ 스무딩 조정 ④ 필요 시 학습 데이터/크롭 방식 점검 |
