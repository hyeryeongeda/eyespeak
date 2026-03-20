# 실행 기록: Step 18 미래적 얼굴 스캐닝 오버레이

**일시:** 2026-03-19  
**대상 파일:** `시선_예시/gaze_server_9grid.html`

---

## 목표
캘리브레이션 시작 시 표시되는 `#faceGuideOverlay`를 미래적 얼굴 스캐닝 UI로 교체:
- 전체 배경에 라이브 웹캠 영상
- MediaPipe 랜드마크를 캔버스에 와이어프레임 형태로 실시간 렌더링
- 코너 브라켓/스캔 라인 애니메이션
- 시안/블루 테마 및 가이드 텍스트/카운트다운 표시

---

## 변경 요약
1. CSS: `#faceGuideOverlay` 관련 스타일 전체 교체(overlay 배경/캔버스/z-index/스캔 애니메이션 포함)
2. HTML: `#faceGuideOverlay` 내부를
   - `video#guideCam`, `canvas#meshCanvas`, `#scanFrame`(코너/라인), 텍스트/상태로 교체
3. JS:
   - `meshCanvas`, `meshCtx` DOM 참조 추가
   - `FACE_MESH_TESSELATION` 및 `drawFaceMesh(lm)` 추가
   - `faceGuidePhase` 동안 `drawFaceMesh(results.multiFaceLandmarks[0])` 호출
   - faceGuidePhase 종료 시 `guideCam.srcObject = null` 및 `meshCtx.clearRect(...)` 수행

---

## 린트
`ReadLints` 기준 오류 없음

