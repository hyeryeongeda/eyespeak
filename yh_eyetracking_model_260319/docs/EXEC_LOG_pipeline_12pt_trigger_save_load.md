# 실행 기록: pipeline.py — 12점 캘리, TriggerDetector, save/load

**일시:** 2025-03-17  
**대상 파일:** `pipeline.py` (프로젝트 루트. 지시서의 Ai_eyetracking/pipeline.py는 미존재하여 루트 pipeline.py 적용)

---

## 목표

1. 12점 캘리 지원 (CALIB_TARGET_RX/RY, n_pts 유동)
2. TriggerDetector 통합 (run 반환 trigger, set_calibration/reset 시 연동)
3. save_calibration / load_calibration 메서드 추가

---

## 수행 내용

### 행위 1: import 추가

- `import json`, `from pathlib import Path`
- `from Ai_eyetracking.trigger_detector import TriggerDetector`
- config_gaze에서 `CALIB_TARGET_RX`, `CALIB_TARGET_RY`, `CALIB_SAVE_DIR` 추가
- `Ai_eyetracking/__init__.py` 생성 (TriggerDetector import를 위한 패키지)

### 행위 2: 셀 중심 좌표 분리

- `CELL_TARGET_RX`/`CELL_TARGET_RY` → `CELL_CENTER_RX`/`CELL_CENTER_RY` 로 이름 변경
- 캘리브레이션용은 config의 CALIB_TARGET_* 사용, 온라인 학습용은 CELL_CENTER_* 유지

### 행위 3: GazePipeline.__init__

- `self._blink_threshold = 0.18` 다음에 `self._trigger = TriggerDetector(blink_threshold=self._blink_threshold)` 추가

### 행위 4: run() 수정

- `compute_iris_position(...)` 직후 `trigger = self._trigger.update(ear, time.time())` 추가
- 반환 dict에 `"trigger": trigger` 추가
- fail dict에 `"trigger": "none"` 추가
- rx is None 일 때 early return에도 `"trigger": trigger` 포함

### 행위 5: set_calibration() 수정

- `n_pts = min(len(CALIB_TARGET_RX), len(points))`
- `CELL_TARGET_RX_arr`/`CELL_TARGET_RY_arr` → `CALIB_TARGET_RX`/`CALIB_TARGET_RY` 기반, `[:n_pts]`
- cal_refiner 루프에서 `CALIB_TARGET_RX[i]`, `CALIB_TARGET_RY[i]` 사용
- blink threshold 설정 직후 `self._trigger.set_threshold(self._blink_threshold)` 추가

### 행위 6: record_selection()

- `CELL_TARGET_RX`/`CELL_TARGET_RY` → `CELL_CENTER_RX`/`CELL_CENTER_RY` 로 변경

### 행위 7: reset_filters()

- `self._blink_threshold = 0.18` 근처에 `self._trigger.reset()` 추가

### 행위 8·9: save_calibration(), load_calibration()

- 클래스 하단(reset_filters 아래)에 두 메서드 추가
- save: user_id 검증, CALIB_SAVE_DIR 하위 JSON 저장 (poly_coeff_x/y, blink_threshold, cal_refiner _raw/_target)
- load: JSON 로드 후 poly, threshold, trigger.set_threshold, cal_refiner 복원, 필터/버퍼 초기화

---

## 금지 사항 준수

- `_ratio_to_cell_calibrated()` 로직 변경 없음
- `_Axis1Euro` 클래스 변경 없음
- record_selection은 CELL_CENTER_RX/RY만 사용 (CALIB_TARGET 아님)
- 다항식 차수(2차, 6 feature) 변경 없음

---

## 완료 기준 검증

**명령 (가상환경 활성화 후):**

```bash
source .venv/bin/activate
python -c "from pipeline import GazePipeline; p = GazePipeline(use_l2cs=False); print('trigger' in p.run(None))"
```

**기대:** `True`  
**결과:** `True` (exit code 0).  
**린트:** pipeline.py 에러 없음.

---

## 참고

- TriggerDetector는 `Ai_eyetracking.trigger_detector`에서 import. 프로젝트 루트에서 실행 시 `Ai_eyetracking/__init__.py` 필요.
- 지시서의 "Ai_eyetracking/pipeline.py"는 해당 경로에 파일이 없어, 동일 내용을 **루트 pipeline.py**에 반영함.
