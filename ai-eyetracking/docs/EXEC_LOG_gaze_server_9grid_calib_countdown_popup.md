# 실행 기록: gaze_server_9grid 캘리 카운트다운 팝업/화살표

**일시:** 2026-03-19  
**대상 파일:** `시선_예시/gaze_server_9grid.html`

---

## 목표
캘리브레이션 각 점 카운트다운(3, 2, 1)을 화면 중앙에 `200px` 팝업과 함께 표시하고,
카운트다운이 끝나면 `여기를 보세요!` 텍스트와 캘리 도트 방향 바운스 화살표를 표시.

---

## 구현

1. CSS 추가 (`</style>` 바로 위)
   - `#countdownBig` (200px 큰 숫자 + countPop 애니메이션)
   - `#calibArrow` (방향 가리키는 SVG + arrowBounce 애니메이션)

2. HTML 추가 (`#calib` 안, `#calibText` 아래)
   - `<div id="countdownBig"></div>`
   - `<svg id="calibArrow" ...><polygon .../></svg>`

3. JS DOM 참조 추가
   - `const countdownBig = document.getElementById('countdownBig');`
   - `const calibArrow = document.getElementById('calibArrow');`

4. `onResults()` 캘리브레이션 모드의 `if (calibCounting)` 블록 교체
   - count>0: 큰 숫자 표시, 화살표 숨김
   - count<=0: `👀` 표시 + 화살표 표시(화면 중심→캘리도트 방향 각도 계산)
   - 카운트다운 종료(elapsed >= CALIB_COUNTDOWN_SEC) 시 팝업/화살표 숨김 처리
   - 기존 `calibText`는 정보 표시용으로 유지/갱신

5. `startCalibration()` 시작 시 팝업/화살표 숨김
6. 캘리 완료(피팅 완료) 시 팝업/화살표 숨김

---

## 금지사항 준수
- TriggerDetector, EAR 함수, getGazeNorm, 캘리 math/피팅 로직 변경 없음
- 트리거/수집/캘리 완료 및 systemState 전환 로직 변경 없음

---

## 검증
- `ReadLints` 기준 린트 에러 없음

