# 환경 설정 (가상환경)

시스템 Python이 externally managed 인 경우, **가상환경**을 만들어서 `pip install -r requirements.txt` 를 실행하세요.

---

## 방법 1: venv (권장)

```bash
cd ~/yh_eyetracking_model

# 가상환경 생성 (최초 1회)
python3 -m venv .venv

# 활성화 (bash)
source .venv/bin/activate   # Linux / Mac
# sh 사용 시: source 대신 . (dot) 사용
. .venv/bin/activate
# Windows Git Bash: source .venv/Scripts/activate

# 의존성 설치
pip install -r requirements.txt

# 이후 실행 시에도 먼저 활성화 (source 또는 . .venv/bin/activate)
source .venv/bin/activate
python3 scripts/inspect_aihub_format.py eye_tracking_sample
```

비활성화: `deactivate`

---

## 방법 2: conda (SSAFY 서버 등)

이미 conda·eyespeak 환경을 쓰는 경우:

```bash
conda activate eyespeak
pip install -r requirements.txt
```

(conda 환경이므로 시스템 Python 제한에 걸리지 않음.)

---

## MediaPipe 0.10 (얼굴 검출)

MediaPipe 0.10에서는 `mp.solutions.face_mesh`가 제거되었습니다. 이 프로젝트는 **Face Landmarker Task API**와 `.task` 모델을 사용합니다.

- **최초 실행 시**: `checkpoints/face_landmarker.task`가 없으면 자동으로 다운로드됩니다.
- **수동 지정**: 환경변수 `FACE_LANDMARKER_MODEL=/경로/face_landmarker.task` 로 경로를 지정할 수 있습니다.
- **오류 시**: 모델 다운로드나 Task API 실패 시 자동으로 Haar 검출기로 폴백됩니다. 이전 API를 쓰려면 `pip install 'mediapipe>=0.9,<0.10'` 로 0.9.x를 설치할 수 있습니다.

---

## 요약

| 환경 | 명령 |
|------|------|
| **venv** | `python3 -m venv .venv` → `source .venv/bin/activate` (또는 `. .venv/bin/activate`) → `pip install -r requirements.txt` |
| **conda** | `conda activate eyespeak` → `pip install -r requirements.txt` |
