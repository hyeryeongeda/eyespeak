# 실행 기록: app_gaze_web.py — 캘리 6~12점, save/load 엔드포인트

**일시:** 2025-03-19  
**대상 파일:** `app_gaze_web.py` (프로젝트 루트)

---

## 목표

1. /api/calibrate가 6~12점 캘리 수용
2. /api/calibrate/save, /api/calibrate/load 엔드포인트 추가

---

## 수행 내용

### 행위 1: api_calibrate 수정

- 검증: `len(cal) != 6` → `len(cal) < 6 or len(cal) > 12`
- 에러 메시지: `"need 6 calibration points"` → `"need 6-12 calibration points"`
- 로그: `log.info("6포인트 캘리 적용: %s", cal)` → `log.info("%d포인트 캘리 적용: %s", len(cal), cal)`

### 행위 2: /api/calibrate/save 추가

- `POST /api/calibrate/save`
- body: `{"user_id": "string"}` 필수
- `pipe.save_calibration(user_id)` 호출 후 `{"ok": bool}` 반환
- api_calibrate_reset 함수 바로 아래에 배치

### 행위 3: /api/calibrate/load 추가

- `POST /api/calibrate/load`
- body: `{"user_id": "string"}` 필수
- `pipe.load_calibration(user_id)` 호출 후 `{"ok": bool, "calibrated": bool}` 반환
- api_calibrate_save 아래에 배치

---

## 금지 사항 준수

- /api/gaze, /api/health, /api/selection 변경 없음
- static 서빙 로직 변경 없음

---

## 완료 기준 검증

**1) 9점 캘리 수용**

```bash
python -c "from app_gaze_web import app; client = app.test_client(); r = client.post('/api/calibrate', json={'calibration': [{'rx':0.5,'ry':0.5}]*9}); print(r.get_json()['ok'])"
```

**기대:** True  
**결과:** True

**2) /api/calibrate/save 200**

```bash
python -c "from app_gaze_web import app; client = app.test_client(); r = client.post('/api/calibrate/save', json={'user_id':'test'}); print(r.status_code)"
```

**기대:** 200  
**결과:** 200

**린트:** app_gaze_web.py 에러 없음.

---

## 요약

- /api/calibrate는 6~12점 캘리 수용.
- /api/calibrate/save, /api/calibrate/load 추가 완료.
- 검증 두 건 및 린트 통과.
