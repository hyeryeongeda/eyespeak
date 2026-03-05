# 📝 Eye-tracking Model Test Report: **EyeGrid v0 (GazeNet + BlinkNet + Calibration)**

**작성일**: 2026-03-05  
**테스트 담당자**: HR

---

## 1. 테스트 개요

- **모델명**: **EyeGrid v0**
  - **GazeNet v0**: MobileNetV3 기반 **시선각(yaw, pitch) 회귀**
  - **BlinkNet v0**: MobileNetV3 기반 **블링크(눈 감김) 분류**
  - **Calibration v0**: Ridge Regression 기반 **개인 보정(시선각 → 화면 좌표 매핑)**
- **선정 이유**
  - **웹캠 단일 입력(Webcam-only)** 환경에서 동작하는 MVP 파이프라인 검증 목적
  - 시선(포인터)과 클릭(트리거)을 분리하여 **오작동 감소 + 모듈 단위 개선** 가능
  - 사용자별 편차가 크므로 **캘리브레이션(4/9점 보정)**이 필요
- **주요 기능**
  - 웹캠 영상 입력 → **시선각(yaw, pitch)** 추정
  - 캘리브레이션 → **시선각 → 화면 좌표(x, y)** 변환
  - **4-grid / 9-grid 구역 선택**으로 포인터 생성
  - **더블 블링크**를 클릭 이벤트로 사용
  - (개선 예정) 스무딩(EMA/OneEuro/Kalman), FSM(쿨다운/윈도우) 강화

---

## 2. 테스트 환경

| 항목 | 상세 내용 |
| :-- | :-- |
| OS | Windows 10/11 |
| Runtime / Framework | Python 3.x, PyTorch, OpenCV |
| Webcam | 내장 웹캠 720p |
| Lighting | 실내등(기본), 조건별 추가 측정 예정 |

---

## 3. 데이터셋

- **Gaze**: MPIIFaceGaze (≈ 899MB)
- **Blink**: RT-BENE (RT-GENE 기반 blink label dataset)
- (Optional) **Pupil**: LPW (미적용)

---

## 4. 학습 결과(현재까지)

### 4.1 BlinkNet v0 (RT-BENE)
- **val accuracy ~ 0.98~0.99대**로 수렴(로그 기준)
- best checkpoint 저장 정상(`checkpoints/blink_best.pt`)
- **평가 메모**
  - acc는 높지만, 실사용에선 **False Click(오탐)** 지표가 더 중요
  - 추후 threshold sweep / precision-recall / confusion matrix 측정 필요

### 4.2 GazeNet v0 (MPIIFaceGaze)
- 학습은 정상 진행되나, 시선 정확도는 **“grid hit rate”로 최종 판단 필요**
- yaw 래핑(±π 경계) 등으로 MAE 해석이 어려울 수 있어 **grid 기반 평가 권장**

---

## 5. 시스템 동작 결과(실사용 관점)

### ✅ 5.1 4-grid(2x2) 동작
- **결론**: *캘리브레이션 적용 시 “동작 가능” 범위 확인*
- **관찰**
  - 4구역은 구분 난이도가 낮아, 포인터 떨림/오차가 있어도 선택이 가능한 편
  - 사용자 UX 측면에서 “간편 모드”로 현실적 후보

### ⚠️ 5.2 9-grid(3x3) 동작
- **결론**: *현재 설정/상태에서는 “불안정”*
- **증상(관찰)**
  - 칸 간 경계가 촘촘해져서 포인터가 쉽게 “이웃 칸”으로 튐
  - 중앙/가장자리 구역에서 오차가 더 크게 체감
- **가능 원인(가설)**
  1) **캘리브레이션 점 수/품질 부족**: 9-grid는 4-grid보다 더 정밀한 보정이 필요
  2) **스무딩/히스테리시스 부족**: 선택 안정화 로직(EMA + hold + margin)이 9-grid에선 필수
  3) **ROI(얼굴/눈 crop) 흔들림**: 작은 흔들림이 9-grid에서 바로 칸 이동으로 이어짐
  4) **Gaze 모델 자체 오차**: yaw/pitch 오차가 9-grid 분리 임계보다 큼

---

## 6. 응답 속도 / 리소스 (측정 예정)

| 항목 | 결과 |
| :-- | :-- |
| 평균 FPS | ⏳ 측정 예정 |
| 체감 지연 | ⏳ 측정 예정 |
| CPU/GPU 점유 | ⏳ 측정 예정 |

---

## 7. 결론

- **현재 결론**: “웹캠 only + grid 선택”은 **4-grid는 가능성 높음**, **9-grid는 추가 안정화 필요**
- **서비스 적용 방향 제안**
  - MVP: **4-grid(간편 모드)** + 더블블링크 클릭 + 쿨다운/오작동 방지
  - 고도화: 9-grid는 아래 개선을 적용한 뒤 재평가

---

## 8. 다음 액션(우선순위)

1) **9-grid 안정화 로직 추가**
   - (필수) EMA/OneEuro + hysteresis(margin) + switch hold time
2) **캘리브레이션 강화**
   - 9점 캘리브 + 점당 수집 시간/샘플 수 증가(노이즈 감소)
3) **ROI 개선**
   - face/eye detector + tracking으로 crop 안정화
4) **평가 지표 확정**
   - 4-grid/9-grid 각각 **Grid Hit Rate(%)** 측정
   - blink는 acc 외에 **false click rate** 측정

---

## 9. 참고/스크린샷
- (추가 예정) 4-grid 동작 캡처, 9-grid 흔들림 상황 캡처