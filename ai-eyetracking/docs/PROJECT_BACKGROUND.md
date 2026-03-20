# EYESPEAK 프로젝트 기획 배경

## 목적

실사용 환경(침대/휠체어, 일반 웹캠)에서 **시선으로 UI 선택**이 안정적으로 동작하도록, 아이트래킹 파이프라인과 UI를 단계적으로 구축하는 것.

---

## 타깃 사용자와 환경

- **타깃**: 루게릭병(ALS) 등으로 말·손 동작이 제한된 사용자.
- **환경**: 침대에 누운 상태 또는 휠체어, 카메라 거리 약 60cm, 일반 RGB 웹캠(ruz webcam UHD 2160 등).

---

## 기성 솔루션의 한계 (B-3)

MediaPipe 등 **기성 얼굴/시선 솔루션은 얼굴 전체가 프레임에 정상적으로 들어와야** 안정적으로 동작한다.  
**루게릭병(ALS) 등 환자**는 고개 움직임이 제한적이거나 부자연스러운 경우가 많아, **얼굴 각도가 조금만 틀어져도** 인식 실패나 좌표 오류가 발생한다.

이를 보완하기 위해, **안구(홍채) 영역만으로도** Eye-tracking이 가능한 모델·파이프라인을 목표로 한다.  
(단기에는 MediaPipe + 헤드포즈·홍채 수식으로 동작 보장, 중장기에는 안구 전용 학습 모델 검토.)

---

## 관련 문서

- [WORK_ORDER_GAZE_DEVELOPMENT.md](WORK_ORDER_GAZE_DEVELOPMENT.md): 단계별 작업 순서
- [PHASE1_HARDWARE_DECISION.md](PHASE1_HARDWARE_DECISION.md): 하드웨어·환경 결정
- [IRIS_GAZE_FORMULA.md](IRIS_GAZE_FORMULA.md): 홍채/흰자 랜드마크 수식
