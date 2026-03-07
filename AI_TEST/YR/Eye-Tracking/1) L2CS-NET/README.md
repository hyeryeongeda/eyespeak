# 아이스피크 – 시선 추적 기반 ALS 보조 시스템

루게릭병(ALS) 환우분들이 눈의 움직임만으로 화면을 조작할 수 있도록,
웹캠 시선 추적과 체류 시간(Dwell-Time) 클릭을 구현한 프로젝트입니다.

---

## 전체 구조

```
웹캠 영상
  ↓  MediaPipe Face Mesh (홍채 랜드마크 추출)
얼굴 크롭 224×224
  ↓  L2CS-Net (ONNX)
pitch / yaw 각도 예측
  ↓  2단계 캘리브레이션 (선형 → RBF)
화면 좌표 (x, y)
  ↓  중앙값 필터 + 적응형 EMA 스무딩
시선 커서
  ↓  Dwell-Time 감지 (2초 체류)
SOS 클릭 이벤트
```

---

## 파일 구성

```
L2CS-Net/
├── train_gaze.ipynb                     # 모델 학습 노트북
├── dwell_click_demo.html                # 브라우저 데모 (서버 불필요)
├── checkpoints/
│   └── run_YYYYMMDD_HHMMSS_bins28_ep40/
│       ├── best_model.pth               # PyTorch 체크포인트
│       ├── l2csnet_gaze.onnx            # ONNX 내보내기 (웹 추론용)
│       ├── angle_distribution.png       # 각도 분포 시각화
│       ├── training_curves.png          # 손실·MAE 곡선
│       ├── predictions.png              # 검증 예측 샘플
│       └── sample_images.png            # 얼굴 크롭 샘플
├── mlruns/                              # MLflow 실험 기록
└── Data/
    └── 01.원천데이터/                    # 1920×1080 PNG 322장
        └── 02.라벨링데이터/json_rgb/     # 시선 각도 JSON 322개
```

---

## 데이터셋

| 항목 | 내용 |
|---|---|
| 출처 | AI Hub – NIA22EYE (디스플레이 중심 안구운동 데이터) |
| 이미지 수 | 322장 (1920×1080 RGB) |
| 라벨 형식 | JSON – `pose.head[pitch°, yaw°, roll°]` |
| 시선 타겟 | 16개 고유 화면 위치 |
| pitch 범위 | -9.38° ~ +4.44° |
| yaw 범위 | -2.71° ~ +3.57° |

### JSON 라벨 구조

```json
{
  "Annotations": {
    "annotations": [
      {"label": "l_center", "points": [[895, 706]]},
      {"label": "r_center", "points": [[990, 708]]}
    ],
    "pose": {
      "head": [pitch_deg, yaw_deg, roll_deg],
      "point": [screen_x, screen_y]
    }
  }
}
```

> **주의**: `pose.head` 값은 이미 **도(°) 단위**입니다. 라디안으로 오해하면 안 됩니다.

### 얼굴 크롭 방법

```
IED = 두 눈 사이 거리 (약 95px)
크롭 크기 = IED × 3.5
크롭 중심 Y = 눈 중심 Y + IED × 0.25  (턱 포함)
결과: 약 332×333px → resize 224×224
```

---

## 모델 – L2CS-Net

### 구조

```
입력 [B, 3, 224, 224]
  ↓  ResNet50 (ImageNet 사전학습, 백본)
  ↓  Global Average Pooling
특징 [B, 2048]
  ↓  Dropout(0.3)
  ├── fc_pitch → logits [B, 28]
  └── fc_yaw   → logits [B, 28]
          ↓  softmax → 구간별 확률
          ↓  · BIN_CENTERS (soft-argmax)
       pitch°, yaw° (연속 각도)
```

### 각도 구간(Bin) 설정

| 항목 | 값 |
|---|---|
| 구간 수 (NUM_BINS) | 28 |
| 각도 범위 | -15° ~ +15° |
| 구간 크기 (BIN_SIZE) | ≈ 1.07° |

### 손실 함수

```
L = CrossEntropy(pitch_bin) + CrossEntropy(yaw_bin)
  + α × MSE(pitch_pred, pitch_true)
  + α × MSE(yaw_pred, yaw_true)

α = 1.0 (회귀 손실 가중치)
```

---

## 학습

### 환경

| 항목 | 내용 |
|---|---|
| GPU | NVIDIA RTX 4070 Laptop (8GB VRAM) |
| 프레임워크 | PyTorch 2.5.1+cu121 |
| Python | 3.12 (base conda 환경) |

### 하이퍼파라미터

| 항목 | 값 |
|---|---|
| 배치 크기 | 16 (VRAM ~1.4GB) |
| 에포크 | 40 |
| 학습률 | 백본 1e-5 / 헤드 1e-4 (차등) |
| Weight Decay | 1e-4 |
| 스케줄러 | CosineAnnealingLR |
| 훈련:검증 | 257장 : 65장 (8:2) |

### 데이터 증강 (학습 시만)

- ColorJitter (밝기·대비·채도 ±30%)
- RandomGrayscale (확률 10%)
- RandomAffine (±8° 회전, ±5% 이동, 0.9~1.1배 스케일)

### 학습 실행

```bash
# Jupyter에서 train_gaze.ipynb 전체 셀 실행
# 커널: base (Python 3.12)
```

### MLflow 실험 관리

```bash
cd "c:/Users/SSAFY/Desktop/AI/eye_tracking/L2CS-Net"
mlflow ui
# → http://127.0.0.1:5000
```

실행할 때마다 `checkpoints/run_날짜_시간_bins28_ep40/` 폴더가 새로 생성되어 이전 결과가 보존됩니다.

---

## 브라우저 데모 – dwell_click_demo.html

서버 없이 파일을 브라우저에서 바로 열면 됩니다.

### 사용 라이브러리 (CDN)

| 라이브러리 | 용도 |
|---|---|
| ONNX Runtime Web 1.19.2 | 브라우저에서 `.onnx` 모델 추론 |
| MediaPipe Face Mesh 0.4 | 홍채 랜드마크 추출 (랜드마크 468=왼쪽, 473=오른쪽) |

### 추론 파이프라인

```
웹캠 프레임 (640×480)
  ↓  MediaPipe Face Mesh → 홍채 좌표 468, 473
  ↓  IED 계산 → 얼굴 크롭 (Python 학습 코드와 동일 로직)
  ↓  224×224 resize → ImageNet 정규화 → Float32 NCHW 텐서
  ↓  ONNX 추론 → pitch_logits, yaw_logits (각 28차원)
  ↓  soft-argmax → pitch°, yaw°
  ↓  각도 버퍼 (최근 5프레임 중앙값 필터)
  ↓  캘리브레이션 매핑 → 화면 좌표 (x, y)
  ↓  적응형 EMA 스무딩
  ↓  Dwell-Time 감지 → SOS 이벤트
```

### 2단계 캘리브레이션

#### 1단계 – 기초보정 (5포인트, 선형 회귀)

```
●           ●       ← 코너 4개 + 중앙 1개
      ●
●           ●
```

- 전체 스케일과 오프셋을 빠르게 잡음
- 완료 후 `2단계` 버튼 활성화

#### 2단계 – 정밀보정 (4포인트 추가, RBF)

```
      ●
  ●       ●          ← 엣지 중간 4개 추가
      ●
```

- 총 9포인트로 위치별 비선형 왜곡을 개별 보정
- RBF(Gaussian Kernel, σ=3°): 가까운 캘리브레이션 포인트에 높은 가중치

#### 포인트당 타이밍

| 단계 | 시간 |
|---|---|
| 대기 (점 찾기) | 2.5초 |
| 수집 | 4.0초 |
| 합계 / 포인트 | 6.5초 |

### 스무딩 구조

```
[모델 출력: pitch, yaw]
  ↓  중앙값 필터 – 최근 5프레임 → 스파이크 제거
  ↓  angleToScreen()
[화면 좌표]
  ↓  적응형 EMA
     · 이동 중 (>80px): α=0.20 (빠른 반응)
     · 고정시선 (~노이즈): α=0.05 (떨림 억제)
[최종 커서 위치]
```

### Dwell-Time 클릭

- 기준 시간: **2초** 체류
- 시각 피드백: 빨간→초록 원형 프로그레스 아크
- 클릭 후 쿨다운: 1.5초 (중복 클릭 방지)
- SOS 발동 시 `onSOSFired()` 호출 → 서버 연동 TODO 위치

### 모드

| 모드 | 설명 |
|---|---|
| 마우스 테스트 | 마우스 커서로 Dwell-Time 동작 확인 |
| L2CS-Net | 웹캠 + ONNX 모델 실제 시선 추적 |

---

## 사용 순서

### 1. 모델 학습

```bash
# Jupyter Notebook 실행
jupyter notebook train_gaze.ipynb
# base 커널 선택 후 전체 셀 실행
```

### 2. 브라우저 데모 실행

1. `dwell_click_demo.html`을 브라우저에서 열기
2. 모드를 **L2CS-Net**으로 전환
3. ONNX 모델 파일 선택 (`checkpoints/.../l2csnet_gaze.onnx`)
4. MediaPipe 초기화 완료 대기 (첫 실행 시 ~20MB 다운로드)
5. **1단계 기초보정** 클릭 → 5개 점 응시
6. **2단계 정밀보정** 클릭 → 4개 점 추가 응시
7. SOS 버튼을 2초 응시하면 클릭 이벤트 발동

---

## 향후 개선 방향

| 항목 | 내용 |
|---|---|
| 데이터 확보 | 현재 322장 → 수천 장 이상으로 정확도 향상 |
| 모델 경량화 | ResNet50(90MB) → MobileNet/EfficientNet (지식 증류) |
| 양자화 | float32 → int8 (4배 경량화, 추론 속도 향상) |
| 웹 경량화 | ONNX → TensorFlow.js 변환 |
| SOS 서버 연동 | `onSOSFired()`에 `fetch('/api/sos', ...)` 추가 |
| UI 확장 | SOS 외 다중 버튼, 자판 등 추가 |
