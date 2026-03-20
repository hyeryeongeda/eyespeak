# 실행 기록: gaze_server_9grid 얼굴 가이드(5초) 오버레이

**일시:** 2026-03-19  
**대상 파일:** `시선_예시/gaze_server_9grid.html`

---

## 목표
캘리브레이션 시작 시 첫 캘리 포인트 전에 화면 정중앙에 큰 반투명 얼굴 가이드(5초)와
`여기에 얼굴을 맞추세요` + 카운트다운을 표시한 뒤 자동으로 사라지고
첫 포인트의 3,2,1 카운트다운을 시작한다.

---

## 구현 요약

1. CSS
   - `#faceGuideOverlay`(z-index 220, pulse 애니메이션) 추가.

2. HTML
   - `#calib` 내부, 기존 `#calibArrow` 아래에 `#faceGuideOverlay` 컨테이너 추가.

3. JS
   - `faceGuidePhase`, `faceGuideStart`, `FACE_GUIDE_SEC=5` 상태 변수 추가.
   - `faceGuideOverlay`, `.guide-countdown` DOM 참조 추가.
   - `startCalibration()`에서 즉시 포인트 카운트다운을 시작하지 않고,
     5초 얼굴 가이드 표시 + `calibDot/calibText` 숨김 처리.
   - `onResults()`의 `calibEl.show` 블록 초반에 `faceGuidePhase` 처리 로직 추가.
     5초 경과 시 오버레이 제거 후 첫 포인트(1번) 카운트다운 스타트하도록
     `calibCounting/calibCountdownStart` 및 `calibDot/calibText` 복원/초기화.
   - `btnReset`에서 오버레이/상태 초기화.

---

## 금지사항 준수
- 기존 `TriggerDetector`, `EAR/getEAR`, `getGazeNorm`, `CalibrationRegion` 수학/피팅 로직 수정 없음
- 캘리 완료(fetch) 및 `systemState` 전환 로직 수정 없음

---

## 검증
- `ReadLints` 기준 린트 에러 없음

