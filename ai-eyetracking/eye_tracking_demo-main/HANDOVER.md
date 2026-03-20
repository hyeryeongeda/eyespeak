# 프로젝트 인수인계 가이드 (gaze-capture)

다른 팀원에게 **핵심 코드만** 넘기기 위해 대용량 데이터·학습 산출물은 Git에서 제외했습니다.  
아래 순서대로 환경을 맞추면 웹 데모와 학습을 다시 돌릴 수 있습니다.

---

## 1. Git에서 제외된 것 (추적 안 함)

| 구분 | 경로/패턴 | 설명 |
|------|-----------|------|
| **캐시** | `*.npy`, `*.pkl` | `build_aihub_cache.py` 등이 만드는 학습용 캐시 |
| **체크포인트** | `*.pt`, `*.pth` | PyTorch 학습 결과 (best.pt 등) |
| **내보낸 모델** | `*.onnx` | 웹 데모용 ONNX (학습 후 재생성) |
| **학습 산출물** | `runs/` | gaze_aihub, aihub_cache, yolo, iris_yolo 등 전체 |
| **원시 데이터** | `**/MPIIGaze/Data/`, `*.z01`, `*.zip` | AI Hub 126 등 원본 이미지/라벨 아카이브 |
| **기타** | `__pycache__/`, `.ipynb_checkpoints/` | Python/주피터 캐시 |

→ **저장소에는 코드, 설정, 문서만** 들어가고, 데이터·모델·캐시는 로컬에서 따로 준비합니다.

---

## 2. 인수인계 후 해야 할 일

### 2.1 환경

- **Python**: 3.8+ (가상환경 권장)
- **패키지**: `torch`, `torchvision`, `ultralytics`, `onnxruntime`, `numpy`, `Pillow` 등  
  (프로젝트에 `requirements.txt`가 있으면 `pip install -r requirements.txt`)

### 2.2 데이터 (학습을 돌릴 경우)

- **AI Hub 126**  
  - 원천 데이터(TS.z01, VS.z01)와 라벨(TL.zip, VL.zip)을  
    `GazeCapture/MPIIGAZE/MPIIGaze/Data/` 아래에 문서/스크립트가 기대하는 구조로 둡니다.
  - `build_aihub_cache.py` 실행 → `runs/aihub_cache/` 에 `train_eyes.npy`, `train_labels.npy` 등 생성.

- **눈 검출(YOLO)·홍채 YOLO**  
  - 사용 중인 데이터셋 경로는 각 학습 스크립트 상단 또는 문서를 참고해 동일하게 맞춥니다.

### 2.3 웹 데모만 켜서 확인할 때

- 학습은 생략하고, **이미 받은 ONNX**가 있다면:
  - `best.onnx` (눈 검출) → `GazeCapture/MPIIGAZE/web_demo/best.onnx`
  - `iris.onnx` (홍채) → `GazeCapture/MPIIGAZE/web_demo/iris.onnx`
  - `gaze_screen.onnx` (시선) → `GazeCapture/MPIIGAZE/web_demo/gaze_screen.onnx`
- `cd GazeCapture/MPIIGAZE/web_demo && python serve.py` 후 브라우저에서 `http://localhost:8080` 접속.

### 2.4 학습을 다시 돌릴 때

1. **캐시 생성** (AI Hub 126 기준):  
   `build_aihub_cache.py` 실행 → `runs/aihub_cache/` 생성.
2. **시선 모델**:  
   `train_gaze_aihub.py` 또는 `run_accuracy_boost.py` / `train_gaze_accuracy_boost.ipynb` 실행  
   → `runs/gaze_aihub/runN/` 에 `best.pt`, `gaze_screen.onnx` 생성.
3. **웹 데모 반영**:  
   생성된 `gaze_screen.onnx`를 `web_demo/gaze_screen.onnx`로 복사.

자세한 경로·옵션은 각 스크립트 주석과 `docs/`, `web_demo/ACCURACY_IMPROVEMENT.md` 등을 참고하면 됩니다.

---

## 3. 핵심 파일/폴더 구조 (참고)

```
gaze-capture/
├── .gitignore          # 대용량·산출물 제외 (현재 문서 기준)
├── HANDOVER.md         # 본 인수인계 가이드
├── gaze_model.py       # Dual-eye + head-pose 시선 모델 정의
├── gaze_dataset.py     # GazeCapture 데이터셋
├── docs/               # 설계/캘리브레이션 문서
├── TIL/                # 회고/정리
└── GazeCapture/
    ├── MPIIGAZE/
    │   ├── build_aihub_cache.py   # AI Hub 126 → 캐시
    │   ├── train_gaze_aihub.py     # 시선 학습 (스크립트)
    │   ├── run_accuracy_boost.py   # 시선 정확도 향상 학습
    │   ├── train_gaze_accuracy_boost.ipynb
    │   ├── train_iris_yolo.py      # 홍채 YOLO 학습
    │   ├── web_demo/               # 웹 데모 (HTML/JS, serve.py)
    │   │   ├── eye_mouse.html / main.js 등
    │   │   ├── serve.py
    │   │   └── ACCURACY_IMPROVEMENT.md
    │   └── runs/                   # Git 제외: 캐시·학습 결과 전부
    └── pytorch/                    # 레거시 GazeCapture 학습
```

데이터·모델이 없는 상태에서 **저장소만 clone하면** 위 트리에서 `runs/`, `*.npy`, `*.pt`, `*.onnx` 등은 보이지 않으며, 코드와 문서만 있습니다.

---

## 4. 요약

- **올라가는 것**: 핵심 코드, 설정, 문서 (`.gitignore` 기준).
- **올라가지 않는 것**: 대용량 학습/훈련 데이터, 캐시(`.npy`, `.pkl`), 체크포인트(`.pt`), ONNX, `runs/` 전체, 원시 데이터(`.z01`, `.zip`, `Data/`).
- **인수인계 후**: 데이터는 별도 전달·배치 후 캐시 생성 → 학습 → ONNX를 `web_demo/`에 복사해 사용.

추가로 필요한 설정이 있으면 팀 내부 문서나 스크립트 주석을 보완해 두면 됩니다.
