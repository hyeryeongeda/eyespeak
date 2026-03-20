# 실행 기록: config_gaze.py 상수 추가

**일시:** 2025-03-17  
**대상 파일:** `config_gaze.py` (기존 56줄 유지, 하단 추가)

---

## 목표

1. 캘리브레이션 12점 좌표 상수 추가  
2. 트리거 상수 5개 추가 (ALS 환자용)  
3. 캘리 저장 경로 상수 추가  

---

## 수행 내용

### 행위 1: 캘리브레이션 12점 좌표

- `CALIB_POINTS = 12`
- `CALIB_TARGET_RX`: 12개 값 (row 0~2 각 3점 + 보강 3점)
- `CALIB_TARGET_RY`: 12개 값 (동일 구조)

### 행위 2: 트리거 상수

- `BLINK_SELECT_MIN_SEC` (기본 0.3)
- `BLINK_SELECT_MAX_SEC` (기본 1.0)
- `DOUBLE_BLINK_WINDOW_SEC` (기본 2.0)
- `LONG_CLOSE_SEC` (기본 3.0)
- `TRIPLE_BLINK_WINDOW_SEC` (기본 3.0)  
- 모두 `os.environ.get(..., "기본값")` 사용

### 행위 3: 캘리 저장 경로

- `CALIB_SAVE_DIR` (기본 `"calibration_data"`, 환경변수 `CALIB_SAVE_DIR`로 오버라이드 가능)

---

## 금지 사항 준수

- 기존 56줄 수정 없음 (추가만 수행)
- `os` 재 import 없음 (line 6 기존 사용 유지)

---

## 완료 기준 검증

```bash
python -c "from config_gaze import CALIB_POINTS, CALIB_TARGET_RX, BLINK_SELECT_MIN_SEC, CALIB_SAVE_DIR; print('OK')"
```

**결과:** `OK` 출력, exit code 0  
**린트:** `config_gaze.py` 에러 없음

---

## 요약

- `config_gaze.py` 하단에 CALIB 3개, 트리거 5개, CALIB_SAVE_DIR 1개 상수 추가 완료.
- 검증 명령 및 린트 통과.
