# L2CS 파인튜닝용 CSV 준비

`scripts/finetune_gaze.py`는 **path,yaw_deg,pitch_deg** 세 컬럼이 있는 CSV를 입력으로 사용합니다.

## 형식

- **헤더**: 반드시 `path,yaw_deg,pitch_deg` (컬럼명 일치).
- **path**: 얼굴 이미지 파일 경로. 절대 경로 또는 **스크립트 실행 시 현재 작업 디렉터리 기준** 상대 경로.
- **yaw_deg**, **pitch_deg**: 시선 각도(도 단위). yaw는 좌(-)우(+), pitch는 위(+)/아래(-) 등 프로젝트 규칙에 맞게 기입.

## 예시 파일

프로젝트에 예시 템플릿이 있습니다.

- **[data/l2cs_finetune_labels.csv.example](../data/l2cs_finetune_labels.csv.example)**

이 파일을 복사한 뒤 경로와 각도를 실제 데이터에 맞게 수정하면 됩니다.

## CSV 만드는 방법

### 1) 실환경에서 수집

- 웹캠으로 얼굴을 찍고, 캘리브레이션 또는 “N번 셀 응시” 세션에서 **프레임별로 (yaw_deg, pitch_deg)** 를 기록.
- 각 프레임을 얼굴 크롭해 저장한 뒤, 해당하는 yaw/pitch와 함께 CSV 한 행으로 나열.
- 또는 `scripts/build_l2cs_csv.py --from-images ...` 로 이미지 목록 CSV를 만든 다음, 레이블만 채워 넣기.

### 2) 이미지 폴더만 있을 때 (레이블 나중에 채우기)

이미지 파일만 있고 아직 각도를 모를 때:

```bash
python3 scripts/build_l2cs_csv.py --from-images data/faces --output data/l2cs_labels.csv
```

- `data/faces` 아래의 `.jpg`, `.jpeg`, `.png` 파일마다 `path,0.0,0.0` 행이 생성됩니다.
- 생성된 CSV에서 `yaw_deg`, `pitch_deg` 컬럼만 실제 값으로 수정하면 됩니다.

### 3) AI Hub(033 안구 움직임) 데이터

- AI Hub는 **XML 레이블** + 영상/이미지가 별도 경로에 있을 수 있음.
- XML 안에 시선 관련 필드(yaw, pitch 또는 gaze_x, gaze_y 등)가 있으면, 해당 필드명을 확인한 뒤 `scripts/build_l2cs_csv.py --from-aihub ...` 로 CSV 생성을 시도할 수 있음.
- XML 스키마가 다르면 스크립트 내 태그명/경로 매핑을 수정해야 합니다. 먼저 샘플 XML 한 개를 열어 필드명을 확인하세요.

## 실행

CSV가 준비되면:

```bash
python3 scripts/finetune_gaze.py --data data/l2cs_finetune_labels.csv \
  --checkpoint checkpoints/l2cs_best.pt --output checkpoints/finetuned.pt \
  --freeze-backbone --warmup-epochs 2 --scheduler cosine --epochs 20
```

- **path**는 `finetune_gaze.py`를 실행하는 **현재 작업 디렉터리** 기준으로 해석됩니다. 다른 디렉터리에서 실행하면 상대 경로가 깨지므로, 프로젝트 루트에서 실행하거나 path에 절대 경로를 넣으세요.
