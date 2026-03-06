
# 👁️ GAZE_GRID — Webcam Gaze(4/9-grid) + Blink Click (Training & Demo)

웹캠 입력만으로 **시선 기반 구역 선택(4/9-grid)** 과 **더블블링크 클릭**을 구현하기 위한 최소 학습/실행 파이프라인입니다.

- **Gaze 모델**: 얼굴(face crop) 이미지 → `(yaw, pitch)` 회귀  
- **Calibration**: `(yaw, pitch)` → 화면 좌표 `(x, y)` 매핑 → 4/9-grid로 양자화  
- **Blink 모델**: 눈 patch 이미지 → `blink probability` → 더블블링크를 “클릭” 트리거로 사용

---

## 🎯 목표 (Why)

- **웹캠 only** 환경에서 사용자가
  - 화면을 응시하여 **4/9칸 구역 선택**
  - **더블블링크**로 “선택/클릭”
- IR 카메라/전용 장비 없이, **학습된 모델 + 캘리브레이션**으로 동작

---

## 📦 사용 데이터셋 (Datasets)

### 1) MPIIFaceGaze
- 목적: **얼굴 전체 appearance 기반 gaze(yaw/pitch) 추정**
- 구성:
  - `p00 ~ p14` 참가자 폴더
  - 각 참가자 폴더 내 `pXX.txt` annotation
- 라벨 사용:
  - `fc(22~24)` Face center (camera coord)
  - `gt(25~27)` 3D gaze target location (camera coord)
  - **`gaze_dir = fc - gt` → yaw/pitch로 변환**
    - *(초기에는 `gt - fc`를 사용했으나 yaw가 ±π 근처에 몰리는 분포 이슈가 있어 방향을 반대로 정의하여 안정화함)*

### 2) RT-BENE (blink)
- 목적: **눈 감김(blink) 분류**
- 구성:
  - `s000_blink_labels.csv` ~ `s016_blink_labels.csv`
  - `s000_noglasses/...` ~ `s016_noglasses/...` (left/right eye images)
- 라벨:
  - `label = 0` open
  - `label = 1` blink
  - `label = 0.5` (disagreement) → 학습에서 제외

> 📌 현재 로컬 폴더 구조 기준 RT-BENE 이미지 경로는  
> `data/rtbene/s000_noglasses/natural/left/*.png` 형태입니다.

---

## 🗂️ 프로젝트 구조

```txt
gaze_grid/
  .venv/
  checkpoints/
    gaze_best.pt
    blink_best.pt
    calib_4.pkl
    calib_9.pkl
  data/
    mpiifacegaze/
    rtbene/
  src/
    models.py
    roi_cv2.py
    train_gaze.py
    train_blink.py
    infer_webcam.py
    calib_and_grid.py
    calib_web.py
    make_mpiifacegaze_index.py
    make_rtbene_index.py
    datasets/
      mpiifacegaze.py
      rtbene.py
  calib.html
  requirements.txt
  readme.md
````

---

## ⚙️ 설치 (Setup)

```bash
python -m venv .venv
# Windows
.venv\Scripts\activate

pip install -r requirements.txt
# HTML 캘리브 사용 시
pip install websockets
```

---

## 🧱 핵심 파일 설명 (What each file does)

### `src/models.py`

* `GazeRegressor`: 이미지 → `(yaw, pitch)` 회귀 모델
* `BlinkClassifier`: eye patch → blink 확률(logits) 출력
* 특징:

  * `timm` backbone 사용
  * backbone 출력 feature dim은 더미 forward로 자동 계산하도록 구성(차원 mismatch 방지)

### `src/roi_cv2.py`

* OpenCV HaarCascade 기반 **Face/Eye ROI 검출 + bbox 스무딩**
* 추론 시 중앙 crop 대신 사용하여 안정성 개선 (재학습 없이 적용 가능)

### `src/make_mpiifacegaze_index.py`

* MPIIFaceGaze의 `pXX.txt`를 파싱해 학습용 CSV 생성
* 생성물:

  * `data/mpiifacegaze/train_index.csv`
  * `data/mpiifacegaze/val_index.csv`
* CSV 포맷: `img_path, yaw, pitch, pid`

### `src/train_gaze.py`

* MPIIFaceGaze로 gaze 회귀 학습
* loss: `SmoothL1Loss`
* metric:

  * **yaw는 원형 값이므로 wrap MAE로 계산(`mae_wrap`)**
* 저장:

  * validation `mae_wrap`이 개선되면 `checkpoints/gaze_best.pt` 갱신
* 기본 epoch 수: `1~10`

### `src/make_rtbene_index.py`

* RT-BENE subject별 라벨 CSV를 합쳐 train/val CSV 생성
* 생성물:

  * `data/rtbene/train_blink_labels.csv`
  * `data/rtbene/val_blink_labels.csv`
* split:

  * val subjects: `s014, s015, s016` (고정)

### `src/train_blink.py`

* RT-BENE로 blink 분류 학습
* loss: `BCEWithLogitsLoss`
* metric: validation accuracy
* 저장:

  * validation acc 개선 시 `checkpoints/blink_best.pt` 갱신
* Windows 권장:

  * `num_workers=0`가 안정적인 경우가 많음

### `src/calib_and_grid.py`

* `Calibrator2D`: `(yaw,pitch)` → `(x,y)` 보정(릿지 회귀)
* `to_grid`: `(x,y)` → 4-grid(2x2) 또는 9-grid(3x3) index 변환

### `calib.html` + `src/calib_web.py`

* 브라우저에서 **4점/9점 타겟 UI**를 띄우고
* Python이 웹캠으로 yaw/pitch를 수집해 **캘리브 모델 저장**
* 결과:

  * `checkpoints/calib_4.pkl`
  * `checkpoints/calib_9.pkl`

### `src/infer_webcam.py`

* 웹캠 실시간 추론 데모
* 동작:

  1. ROI(얼굴/눈) 검출로 crop
  2. gaze로 `(yaw,pitch)` 예측
  3. calibration이 있으면 `(x,y)` → grid index 출력
  4. blink로 `blink_prob` 추정 → 더블블링크면 “CLICK”
* 실행 옵션:

  * `--grid 4|9`
  * `--calib checkpoints/calib_4.pkl` 등

---

## 🚀 실행 방법 (How to run)

### 1) MPIIFaceGaze index 생성

```bash
python src/make_mpiifacegaze_index.py --root data/mpiifacegaze
```

### 2) Gaze 학습

```bash
python src/train_gaze.py
# 결과: checkpoints/gaze_best.pt
```

### 3) RT-BENE index 생성

```bash
python src/make_rtbene_index.py
```

### 4) Blink 학습

```bash
python src/train_blink.py
# 결과: checkpoints/blink_best.pt
```

### 5) (권장) HTML 캘리브 (4점 → 9점)

```bash
python src/calib_web.py
# 브라우저: http://localhost:8000/calib.html
# Start 4-point -> checkpoints/calib_4.pkl
# Start 9-point -> checkpoints/calib_9.pkl
```

### 6) 웹캠 데모 실행

```bash
# 4-grid
python src/infer_webcam.py --grid 4 --calib checkpoints/calib_4.pkl

# 9-grid
python src/infer_webcam.py --grid 9 --calib checkpoints/calib_9.pkl
```

---

## ✅ 현재 학습 설정 요약 (Configs)

### Gaze

* backbone: `mobilenetv3_small_100` (timm)
* input: `224x224`
* batch_size: 64
* optimizer: AdamW(lr=3e-4)
* epochs: 10
* metric: **wrap MAE (yaw wrap + pitch abs)**

### Blink

* backbone: `mobilenetv3_small_100` (timm)
* input: `128x128`
* batch_size: 64
* optimizer: AdamW(lr=3e-4)
* epochs: 10
* metric: validation accuracy

---

## 🧪 Known Issues / TODO

* [ ] ROI 검출(haar) 한계: 저조도/강한 반사/측면 얼굴에서 불안정 → tracker/landmark 기반 개선 필요
* [ ] 캘리브 타겟 UI에서 hold 게이지/실패 재시도 UX 개선
* [ ] 최종 목표는 4/9-grid “정확도”와 “오클릭률”을 함께 관리하는 것

---

## 🔖 Notes

* 본 레포는 “작동하는 최소 파이프라인(MVP)”을 우선으로 구성했습니다.
* 모델 성능보다 **캘리브레이션 + ROI 안정화 + 클릭 FSM**이 실제 사용자 경험을 좌우합니다.

