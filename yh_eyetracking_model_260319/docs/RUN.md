# 시선 추적 웹 앱 실행 방법

## 1. 프로젝트 폴더로 이동

```bash
cd "/home/j-j14e205/yh_eyetracking_model_260317_PM2:53"
```

## 2. 가상환경 활성화

```bash
source .venv/bin/activate
```

(이미 `.venv`가 있으면 위만 실행. 없으면 먼저 `python3 -m venv .venv` 후 활성화.)

## 3. 의존성 설치 (최초 1회)

```bash
pip install -r requirements.txt
```

## 4. 시선 추적 서버 실행

```bash
python app_gaze_web.py
```

- 서버: **http://0.0.0.0:5000** (같은 머신에서는 http://localhost:5000)
- 브라우저에서 접속하면 9칸 그리드 시선 데모 페이지가 열립니다.

## API 요약

| 경로 | 메서드 | 설명 |
|------|--------|------|
| `/` | GET | 9칸 그리드 데모 HTML |
| `/api/health` | GET | 서버 상태 |
| `/api/gaze` | POST | 프레임 이미지 → 시선 셀·비율 |
| `/api/calibrate` | POST | 6~12포인트 캘리브레이션 |
| `/api/calibrate/reset` | POST | 캘리 초기화 |
| `/api/calibrate/save` | POST | 캘리브레이션 저장 (user_id 필요) |
| `/api/calibrate/load` | POST | 캘리브레이션 불러오기 (user_id 필요) |
| `/api/selection` | POST | dwell time 선택 확정 (온라인 학습용) |

## 종료

터미널에서 `Ctrl+C`로 서버를 종료할 수 있습니다.
