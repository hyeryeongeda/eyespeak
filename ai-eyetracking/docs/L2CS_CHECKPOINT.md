# L2CS-Net 체크포인트

gaze 추정에 **L2CS-Net**을 쓰려면 사전 학습된 체크포인트를 사용합니다.

## 빠른 사용 (다운로드 스크립트)

```bash
cd ~/yh_eyetracking_model
. .venv/bin/activate
python3 scripts/download_l2cs_checkpoint.py
export GAZE_CHECKPOINT=checkpoints/l2cs_best.pt
python3 app_gaze_web.py
```

- `download_l2cs_checkpoint.py`가 [Shohruh72/L2CSNet](https://github.com/Shohruh72/L2CSNet)의 ResNet18 Gaze360 `best.pt`를 받아 `checkpoints/l2cs_best.pt`로 저장합니다.
- 체크포인트 구조가 우리 모델과 다르면 **백본(ResNet)만** 로드되고, fc_yaw/fc_pitch는 랜덤일 수 있습니다. 그 경우에도 더미보다는 나을 수 있으며, 우리 구조로 학습한 체크포인트로 교체하면 더 정확해집니다.

## 수동 다운로드

- **URL**: https://github.com/Shohruh72/L2CSNet/releases/download/v.1.0.0/best.pt  
- 받은 파일을 `checkpoints/l2cs_best.pt`에 두고 위처럼 `GAZE_CHECKPOINT`로 지정해 사용합니다.

## 사용 방법 (공통)

1. 체크포인트를 `checkpoints/` 아래에 둡니다. 예: `checkpoints/l2cs_best.pt`
2. 서버 기동 시:
   ```bash
   export GAZE_CHECKPOINT=checkpoints/l2cs_best.pt
   python3 app_gaze_web.py
   ```

## 입력/출력

- **입력**: 얼굴 이미지 RGB 224×224 (파이프라인에서 얼굴 검출 후 크롭·리사이즈).
- **출력**: (yaw_rad, pitch_rad). 라디안 → 도 변환 후 9그리드 cell로 매핑합니다.

## 파인튜닝 권장 옵션

소량 데이터로 fine-tuning할 때 과적합을 줄이고 수렴을 안정화하려면 아래 옵션을 사용합니다.

```bash
python3 scripts/finetune_gaze.py --data labels.csv --checkpoint checkpoints/l2cs_best.pt \
  --output checkpoints/finetuned.pt \
  --freeze-backbone --warmup-epochs 2 --scheduler cosine --epochs 20
```

| 옵션 | 설명 |
|------|------|
| `--freeze-backbone` | 백본(ResNet) 고정, fc_yaw/fc_pitch만 학습. 소량 데이터 권장. |
| `--unfreeze-epoch N` | N 에폭부터 백본 unfreeze 후 소폭 lr로 함께 학습 (0이면 해제 안 함). |
| `--warmup-epochs N` | 처음 N 에폭 선형 LR warmup. |
| `--scheduler cosine` | warmup 이후 cosine annealing (기본). `step`은 기존 StepLR. |

사용 예: `export GAZE_CHECKPOINT=checkpoints/finetuned.pt && python3 app_gaze_web.py`
