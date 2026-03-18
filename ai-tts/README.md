# TTS 서버 실행 가이드

XTTS v2 기반 개인화 음성 합성(Voice Banking) 서버입니다.

---

## 목차

1. [필수 환경](#1-필수-환경)
2. [패키지 설치](#2-패키지-설치)
3. [필수 파일 구조](#3-필수-파일-구조)
4. [서버 실행](#4-서버-실행)
5. [API 사용법](#5-api-사용법)
6. [데이터셋 빌드 및 학습](#6-데이터셋-빌드-및-학습)
7. [테스트](#7-테스트)
8. [환경변수 옵션](#8-환경변수-옵션)

---

## 1. 필수 환경

- Python 3.9+
- CUDA 지원 GPU (권장, CPU도 동작하지만 느림)
- FFmpeg (PATH에 등록되어 있어야 함)

**FFmpeg 설치 확인:**

```bash
ffmpeg -version
```

없으면 [ffmpeg.org](https://ffmpeg.org/download.html)에서 설치 후 PATH에 추가하거나, 환경변수로 지정:

```bash
export FFMPEG_PATH=/path/to/ffmpeg  # Linux/Mac
set FFMPEG_PATH=C:\path\to\ffmpeg.exe  # Windows
```

---

## 2. 패키지 설치

```bash
pip install -r requirements.txt
```

서버만 띄울 경우 (데이터셋 빌드 제외):

```bash
pip install TTS fastapi uvicorn[standard] torch torchaudio transformers numpy pydantic
```

---

## 3. 필수 파일 구조

서버 기동 전에 아래 파일들이 반드시 있어야 합니다.

```
(리포 루트)/
├── ai-tts/
│   ├── tts_server.py
│   ├── compat_patches.py       ← tts_server.py와 같은 폴더에 있어야 함
│   ├── train_gpt_xtts.py
│   └── build_dataset.py
│
├── run/
│   └── training/
│       └── XTTS_v2.0_original_model_files/
│           └── vocab.json      ← XTTS v2 공식 모델 파일에서 가져와야 함
│
└── checkpoints/
    └── {patient_id}/           ← 환자 ID (예: patient_01, default)
        ├── best_model.pth      ← 파인튜닝된 체크포인트
        ├── config.json
        └── speaker_ref.wav     ← 화자 참조 음성 (5~15초 권장)
```

### vocab.json 받는 방법

Hugging Face에서 XTTS v2 공식 모델 파일을 받아 `run/training/XTTS_v2.0_original_model_files/` 안에 넣습니다.

```bash
# huggingface-hub 설치 후
pip install huggingface-hub

python -c "
from huggingface_hub import hf_hub_download
hf_hub_download(
    repo_id='coqui/XTTS-v2',
    filename='vocab.json',
    local_dir='run/training/XTTS_v2.0_original_model_files'
)
"
```

### 체크포인트 준비

`best_model.pth`, `config.json`, `speaker_ref.wav`는 팀에서 공유받아 위 경로에 배치합니다.

---

## 4. 서버 실행

**반드시 `ai-tts/` 폴더에서 실행해야 합니다.**

```bash
cd ai-tts
uvicorn tts_server:app --host 0.0.0.0 --port 8000
```

또는:

```bash
cd ai-tts
python tts_server.py
```

서버가 정상 기동되면 아래와 같이 출력됩니다:

```
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

> **Swagger UI**: 브라우저에서 `http://localhost:8000/docs` 접속하면 API를 UI로 테스트할 수 있습니다.

---

## 5. API 사용법

### 사용 가능한 환자 모델 확인

```bash
curl http://localhost:8000/patients
```

### TTS 요청 (wav 파일 반환)

```bash
curl -X POST http://localhost:8000/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "안녕하세요", "patient_id": "default"}' \
  -o output.wav
```

### TTS 요청 (base64 반환)

```bash
curl -X POST "http://localhost:8000/tts?format=base64" \
  -H "Content-Type: application/json" \
  -d '{"text": "안녕하세요", "patient_id": "default"}'
```

### 캐시 통계 확인

```bash
curl http://localhost:8000/cache/stats
```

### 캐시 초기화

```bash
# 전체 삭제
curl -X DELETE http://localhost:8000/cache

# 특정 환자만 삭제
curl -X DELETE "http://localhost:8000/cache?patient_id=patient_01"
```

---

## 6. 데이터셋 빌드 및 학습

> 이미 체크포인트가 있다면 이 단계는 건너뛰어도 됩니다.

### 6-1. 데이터셋 빌드

오디오 파일(wav/mp4/m4a 등) 또는 유튜브 URL에서 학습 데이터를 준비합니다.

```bash
# 리포 루트에서 실행
python ai-tts/build_dataset.py --patient_id patient_01 --audio_path /path/to/audio.wav
```

실행 결과로 `data/patient_01/wavs_new/` 폴더에 학습용 wav 파일과 `metadata.txt`가 생성됩니다.

### 6-2. 학습 (API로 시작)

서버가 떠 있는 상태에서 API로 학습을 시작할 수 있습니다.

```bash
curl -X POST http://localhost:8000/train/patient_01 \
  -H "Content-Type: application/json" \
  -d '{"epochs": 50, "batch_size": 2}'
```

### 6-3. 학습 상태 확인

```bash
curl http://localhost:8000/train/patient_01/status
```

### 6-4. 학습 취소

```bash
curl -X DELETE http://localhost:8000/train/patient_01
```

학습이 완료되면 `best_model.pth`가 자동으로 `checkpoints/patient_01/`에 배포됩니다.

### 6-5. 학습 (직접 스크립트 실행)

```bash
# 리포 루트에서 실행
python ai-tts/train_gpt_xtts.py --patient_id patient_01 --epochs 50 --batch_size 2
```

---

## 7. 테스트

서버가 떠 있는 상태에서:

```bash
cd ai-tts
pytest test_tts_server.py -v
```

다른 서버 주소를 테스트하려면:

```bash
TTS_BASE_URL=http://192.168.0.10:8000 pytest test_tts_server.py -v
```

---

## 8. 환경변수 옵션

| 환경변수 | 기본값 | 설명 |
|---|---|---|
| `TTS_MAX_LOADED_MODELS` | `3` | GPU에 동시에 올릴 최대 환자 모델 수 (LRU 방식) |
| `TTS_CACHE_MAX_SIZE` | `200` | 인메모리 TTS 캐시 최대 항목 수 (LRU 방식) |
| `FFMPEG_PATH` | (PATH 자동 탐색) | FFmpeg 실행 파일 절대 경로 |

예시:

```bash
TTS_MAX_LOADED_MODELS=2 TTS_CACHE_MAX_SIZE=100 uvicorn tts_server:app --host 0.0.0.0 --port 8000
```

---

## 트러블슈팅

| 증상 | 확인 사항 |
|---|---|
| `vocab.json을 찾을 수 없습니다` | `run/training/XTTS_v2.0_original_model_files/vocab.json` 경로 확인 |
| `환자 '...' 모델을 찾을 수 없습니다` | `checkpoints/{patient_id}/` 안에 `best_model.pth`, `config.json`, `speaker_ref.wav` 세 파일 모두 있는지 확인 |
| `합성 결과가 비어 있습니다` | `speaker_ref.wav` 품질 확인 (5~15초, 잡음 없는 음성 권장) |
| `CUDA out of memory` | `TTS_MAX_LOADED_MODELS` 값을 줄이거나, GPU 메모리 확인 |
| `ffmpeg를 찾을 수 없습니다` | FFmpeg PATH 등록 또는 `FFMPEG_PATH` 환경변수 설정 |
| `ModuleNotFoundError: compat_patches` | `ai-tts/` 폴더에서 실행하고 있는지 확인 |
