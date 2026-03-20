# 실행 기록: gaze_server_9grid 캘리브레이션 카운트다운

**일시:** 2026-03-19  
**대상:** `시선_예시/gaze_server_9grid.html`

---

## 목표
캘리브레이션 각 점이 표시된 직후 바로 수집하지 않고, **3초 카운트다운 후** 2초 데이터를 수집하도록 UI/상태를 수정.

---

## 변경 사항

### 1) 설정 상수 추가
- `CALIB_COLLECT_MS` 아래에
  - `const CALIB_COUNTDOWN_SEC = 3;`

### 2) 상태 변수 추가
- 상태 영역에
  - `let calibCountdownStart = 0;`
  - `let calibCounting = true;  // true=카운트다운 중, false=수집 중`

### 3) `startCalibration()` 수정
- `systemState = 'CALIBRATING'` 시작 시
  - `calibCounting = true`
  - `calibCountdownStart = Date.now()`
- 초기 `calibText`를 `포인트 1 / 12 — 3...` 형태로 표시
- `lastCalibCollect = Date.now();` 제거(수집 시작은 카운트다운 종료 시점에 설정)

### 4) `collectCalibSample()` 다음 점 이동 시 카운트다운 재시작
- 다음 점 분기에서 기존 `lastCalibCollect = Date.now();`를
  - `calibCounting = true;`
  - `calibCountdownStart = Date.now();`
  로 교체

### 5) `onResults()` 캘리브레이션 모드 블록 교체
- `calibEl.classList.contains('show')` 내부 로직을:
  - **카운트다운 단계**(`calibCounting === true`): `3...2...1...` 표시, 카운트다운 끝나면 `calibCounting=false`로 전환하고 `lastCalibCollect=Date.now()` 설정
  - **수집 단계**(`calibCounting === false`): 매 프레임 `earSamples.push(getEAR(...))` 하고, 2초(`CALIB_COLLECT_MS`)가 지나면 `collectCalibSample()` 호출
  - 기존 `coef` 피팅 및 캘리 완료(fetch/systemState 전환 등)은 그대로 유지

---

## 금지사항 준수
- TriggerDetector, EAR 함수, getGazeNorm, CalibrationRegion/다항식 수학 로직: 변경하지 않음
- `systemState` 전환/캘리 완료(fetch 등) 로직은 유지

---

## 검증
- `ReadLints` 기준으로 `gaze_server_9grid.html` 린트 에러 없음

