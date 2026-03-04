"""
==========================================================
[학습 모듈] L2CS-Net 학습 및 검증 파이프라인
==========================================================
이 파일을 실행하면 전체 학습 프로세스가 자동으로 진행됩니다.

실행 방법:
    python train.py

학습 과정:
    1. MPIIGaze p00 데이터 로드 및 전처리
    2. L2CS-Net 모델 생성 (ResNet50 사전학습 가중치)
    3. 에폭별 학습/검증 반복
    4. MLflow로 실험 기록 (하이퍼파라미터, Loss, Accuracy)
    5. 체크포인트 저장 (runs/exp1/best.pth 등)

생성되는 파일 구조:
    runs/
    └── exp1/                    ← 첫 번째 실험
        ├── epoch_01.pth         ← 매 에폭 체크포인트
        ├── epoch_02.pth
        ├── ...
        ├── best.pth             ← 검증 손실이 가장 낮은 모델
        └── last.pth             ← 마지막 에폭 모델

    mlruns/                      ← MLflow 실험 기록
    └── (자동 생성)
"""

import os
import time
import torch
import torch.nn as nn
import mlflow

import config
from dataset import create_dataloaders
from model import L2CSNet


# ==========================================================
#  유틸리티 함수
# ==========================================================

def get_next_exp_dir():
    """
    다음 실험 번호의 디렉토리를 자동 생성합니다.

    기존 폴더를 확인하여 가장 큰 번호 + 1로 새 폴더를 만듭니다.
    예: runs/exp1이 있으면 → runs/exp2를 생성

    Returns:
        exp_dir: 생성된 디렉토리 경로 (예: "runs/exp3")
        exp_num: 실험 번호 (예: 3)
    """
    os.makedirs(config.CHECKPOINT_BASE_DIR, exist_ok=True)

    # 기존 exp 폴더들의 번호 추출
    existing_nums = []
    for d in os.listdir(config.CHECKPOINT_BASE_DIR):
        full_path = os.path.join(config.CHECKPOINT_BASE_DIR, d)
        if d.startswith("exp") and os.path.isdir(full_path):
            try:
                existing_nums.append(int(d.replace("exp", "")))
            except ValueError:
                pass  # "exp_backup" 같은 비표준 이름은 무시

    # 다음 번호 결정 (기존이 없으면 1부터 시작)
    next_num = max(existing_nums, default=0) + 1
    exp_dir = os.path.join(config.CHECKPOINT_BASE_DIR, f"exp{next_num}")
    os.makedirs(exp_dir, exist_ok=True)

    return exp_dir, next_num


# ==========================================================
#  학습 함수 (1 에폭)
# ==========================================================

def train_one_epoch(model, dataloader, criterion_cls, criterion_reg,
                    optimizer, device):
    """
    1 에폭 동안 모델을 학습합니다.

    학습 과정 (매 배치마다):
        1. 이미지를 모델에 입력 → Yaw/Pitch 로짓 + 예측 각도 출력
        2. 분류 손실(CrossEntropy) + 회귀 손실(MSE) 계산
        3. 역전파(backward)로 그래디언트 계산
        4. 옵티마이저로 가중치 업데이트

    Args:
        model:         L2CSNet 모델
        dataloader:    학습 DataLoader
        criterion_cls: CrossEntropyLoss (분류 손실)
        criterion_reg: MSELoss (회귀 손실)
        optimizer:     AdamW 옵티마이저
        device:        연산 장치 (cuda 또는 cpu)

    Returns:
        metrics: 딕셔너리 - 평균 손실, 정확도, 각도 오차
    """
    model.train()  # 학습 모드 (Dropout, BatchNorm 활성화)

    # 누적 지표 변수들
    total_loss = 0.0
    total_cls_loss = 0.0
    total_reg_loss = 0.0
    correct_yaw = 0       # Yaw bin 정확히 맞춘 횟수
    correct_pitch = 0     # Pitch bin 정확히 맞춘 횟수
    total_angular_error = 0.0  # 각도 오차 누적
    total_samples = 0     # 처리한 전체 샘플 수

    for images, yaw_bins, pitch_bins, yaw_degs, pitch_degs in dataloader:
        # ── 데이터를 GPU(또는 CPU)로 전송 ──
        images = images.to(device)
        yaw_bins = yaw_bins.to(device)
        pitch_bins = pitch_bins.to(device)
        yaw_degs = yaw_degs.to(device)
        pitch_degs = pitch_degs.to(device)

        # ── 순전파 (Forward) ──
        yaw_logits, pitch_logits, yaw_pred, pitch_pred = model(images)

        # ── 손실 계산 ──
        # 분류 손실: 각 bin을 정확히 맞추도록 학습
        cls_loss = (
            criterion_cls(yaw_logits, yaw_bins)
            + criterion_cls(pitch_logits, pitch_bins)
        )
        # 회귀 손실: 실제 각도와의 차이를 줄이도록 학습
        reg_loss = (
            criterion_reg(yaw_pred, yaw_degs)
            + criterion_reg(pitch_pred, pitch_degs)
        )
        # 전체 손실 = 가중합
        loss = config.ALPHA_CLS * cls_loss + config.ALPHA_REG * reg_loss

        # ── 역전파 및 가중치 업데이트 ──
        optimizer.zero_grad()  # 이전 그래디언트 초기화
        loss.backward()        # 그래디언트 계산
        optimizer.step()       # 가중치 업데이트

        # ── 지표 누적 ──
        batch_size = images.size(0)
        total_loss += loss.item() * batch_size
        total_cls_loss += cls_loss.item() * batch_size
        total_reg_loss += reg_loss.item() * batch_size

        # Bin 분류 정확도: 예측 bin == 정답 bin
        yaw_pred_bin = yaw_logits.argmax(dim=1)
        pitch_pred_bin = pitch_logits.argmax(dim=1)
        correct_yaw += (yaw_pred_bin == yaw_bins).sum().item()
        correct_pitch += (pitch_pred_bin == pitch_bins).sum().item()

        # 각도 오차 (유클리드 거리, 도 단위)
        angular_err = torch.sqrt(
            (yaw_pred - yaw_degs) ** 2 + (pitch_pred - pitch_degs) ** 2
        )
        total_angular_error += angular_err.sum().item()
        total_samples += batch_size

    # ── 에폭 평균 지표 계산 ──
    metrics = {
        "loss": total_loss / total_samples,
        "cls_loss": total_cls_loss / total_samples,
        "reg_loss": total_reg_loss / total_samples,
        "yaw_acc": correct_yaw / total_samples,
        "pitch_acc": correct_pitch / total_samples,
        "angular_error": total_angular_error / total_samples,
    }
    return metrics


# ==========================================================
#  검증 함수 (1 에폭)
# ==========================================================

def validate(model, dataloader, criterion_cls, criterion_reg, device):
    """
    검증 데이터로 모델 성능을 평가합니다.

    학습 함수와 비슷하지만 핵심 차이점:
        - model.eval()로 평가 모드 전환 (Dropout 비활성화)
        - torch.no_grad()로 그래디언트 계산 비활성화 (메모리 절약)
        - 역전파/가중치 업데이트 없음

    Args:
        (train_one_epoch과 동일)

    Returns:
        metrics: 딕셔너리 - 평균 손실, 정확도, 각도 오차
    """
    model.eval()  # 평가 모드 (Dropout, BatchNorm 고정)

    total_loss = 0.0
    total_cls_loss = 0.0
    total_reg_loss = 0.0
    correct_yaw = 0
    correct_pitch = 0
    total_angular_error = 0.0
    total_samples = 0

    # 그래디언트 계산을 끄면 메모리 사용량이 줄고 속도가 빨라짐
    with torch.no_grad():
        for images, yaw_bins, pitch_bins, yaw_degs, pitch_degs in dataloader:
            images = images.to(device)
            yaw_bins = yaw_bins.to(device)
            pitch_bins = pitch_bins.to(device)
            yaw_degs = yaw_degs.to(device)
            pitch_degs = pitch_degs.to(device)

            # 순전파만 수행 (역전파 없음)
            yaw_logits, pitch_logits, yaw_pred, pitch_pred = model(images)

            cls_loss = (
                criterion_cls(yaw_logits, yaw_bins)
                + criterion_cls(pitch_logits, pitch_bins)
            )
            reg_loss = (
                criterion_reg(yaw_pred, yaw_degs)
                + criterion_reg(pitch_pred, pitch_degs)
            )
            loss = config.ALPHA_CLS * cls_loss + config.ALPHA_REG * reg_loss

            batch_size = images.size(0)
            total_loss += loss.item() * batch_size
            total_cls_loss += cls_loss.item() * batch_size
            total_reg_loss += reg_loss.item() * batch_size

            yaw_pred_bin = yaw_logits.argmax(dim=1)
            pitch_pred_bin = pitch_logits.argmax(dim=1)
            correct_yaw += (yaw_pred_bin == yaw_bins).sum().item()
            correct_pitch += (pitch_pred_bin == pitch_bins).sum().item()

            angular_err = torch.sqrt(
                (yaw_pred - yaw_degs) ** 2 + (pitch_pred - pitch_degs) ** 2
            )
            total_angular_error += angular_err.sum().item()
            total_samples += batch_size

    metrics = {
        "loss": total_loss / total_samples,
        "cls_loss": total_cls_loss / total_samples,
        "reg_loss": total_reg_loss / total_samples,
        "yaw_acc": correct_yaw / total_samples,
        "pitch_acc": correct_pitch / total_samples,
        "angular_error": total_angular_error / total_samples,
    }
    return metrics


# ==========================================================
#  메인 학습 파이프라인
# ==========================================================

def main():
    """
    전체 학습 파이프라인을 실행합니다.

    1. 환경 정보 출력
    2. DataLoader 생성
    3. 모델/손실함수/옵티마이저 초기화
    4. 에폭 반복 (학습 → 검증 → 기록 → 저장)
    5. 최종 결과 출력
    """
    # ── 환경 정보 출력 ──
    print("=" * 60)
    print("  L2CS-Net 학습 시작")
    print("=" * 60)
    print(f"  디바이스       : {config.DEVICE}")
    print(f"  배치 크기      : {config.BATCH_SIZE}")
    print(f"  학습률         : {config.LEARNING_RATE}")
    print(f"  에폭 수        : {config.NUM_EPOCHS}")
    print(f"  Bin 수         : {config.NUM_BINS}")
    print(f"  손실 가중치    : CLS={config.ALPHA_CLS}, REG={config.ALPHA_REG}")
    print("=" * 60)

    # ── 1단계: DataLoader 생성 ──
    print("\n[1/5] 데이터 로딩 중...")
    train_loader, val_loader = create_dataloaders()

    # ── 2단계: 모델 생성 ──
    print("\n[2/5] L2CS-Net 모델 생성 중...")
    model = L2CSNet(num_bins=config.NUM_BINS, pretrained=True)
    model = model.to(config.DEVICE)

    # 모델 파라미터 수 출력 (학습 가능한 것만)
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"  학습 가능 파라미터: {trainable_params:,}개")

    # ── 3단계: 손실함수 & 옵티마이저 설정 ──
    print("\n[3/5] 손실함수 & 옵티마이저 설정...")

    # 분류 손실: CrossEntropyLoss
    # → 모델이 정확한 bin을 선택하도록 학습
    criterion_cls = nn.CrossEntropyLoss()

    # 회귀 손실: MSELoss (Mean Squared Error)
    # → softmax 기대값이 실제 각도에 가까워지도록 학습
    criterion_reg = nn.MSELoss()

    # 옵티마이저: AdamW (Adam + Weight Decay 정규화)
    # → Adam보다 일반화 성능이 좋아 최근 선호되는 옵티마이저
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=config.LEARNING_RATE,
        weight_decay=config.WEIGHT_DECAY,
    )

    # ── 4단계: 체크포인트 디렉토리 생성 ──
    exp_dir, exp_num = get_next_exp_dir()
    print(f"\n[4/5] 체크포인트 저장 경로: {exp_dir}")

    # ── 5단계: MLflow 실험 설정 ──
    print(f"\n[5/5] MLflow 실험 설정: '{config.MLFLOW_EXPERIMENT_NAME}'")
    mlflow.set_tracking_uri(config.MLFLOW_TRACKING_URI)
    mlflow.set_experiment(config.MLFLOW_EXPERIMENT_NAME)

    # ── 학습 루프 시작 ──
    print("\n" + "=" * 60)
    print("  학습 루프 시작")
    print("=" * 60 + "\n")

    with mlflow.start_run(run_name=f"exp{exp_num}"):
        # ── MLflow에 하이퍼파라미터 기록 ──
        mlflow.log_params({
            "learning_rate": config.LEARNING_RATE,
            "batch_size": config.BATCH_SIZE,
            "num_epochs": config.NUM_EPOCHS,
            "num_bins": config.NUM_BINS,
            "bin_width": config.BIN_WIDTH,
            "weight_decay": config.WEIGHT_DECAY,
            "alpha_cls": config.ALPHA_CLS,
            "alpha_reg": config.ALPHA_REG,
            "optimizer": "AdamW",
            "backbone": "ResNet50",
            "image_size": config.IMAGE_SIZE,
            "use_both_eyes": config.USE_BOTH_EYES,
        })

        best_val_loss = float("inf")  # 최고 검증 손실 (작을수록 좋음)

        for epoch in range(1, config.NUM_EPOCHS + 1):
            start_time = time.time()

            # ── 학습 ──
            train_metrics = train_one_epoch(
                model, train_loader,
                criterion_cls, criterion_reg,
                optimizer, config.DEVICE,
            )

            # ── 검증 ──
            val_metrics = validate(
                model, val_loader,
                criterion_cls, criterion_reg,
                config.DEVICE,
            )

            elapsed = time.time() - start_time

            # ── 콘솔에 결과 출력 ──
            print(
                f"[Epoch {epoch:02d}/{config.NUM_EPOCHS}] "
                f"Train Loss: {train_metrics['loss']:.4f} | "
                f"Val Loss: {val_metrics['loss']:.4f} | "
                f"Angular Err: {val_metrics['angular_error']:.2f}° | "
                f"Yaw Acc: {val_metrics['yaw_acc']:.1%} | "
                f"Pitch Acc: {val_metrics['pitch_acc']:.1%} | "
                f"{elapsed:.1f}s"
            )

            # ── MLflow에 에폭별 메트릭 기록 ──
            mlflow.log_metrics(
                {
                    "train_loss": train_metrics["loss"],
                    "train_cls_loss": train_metrics["cls_loss"],
                    "train_reg_loss": train_metrics["reg_loss"],
                    "train_yaw_acc": train_metrics["yaw_acc"],
                    "train_pitch_acc": train_metrics["pitch_acc"],
                    "train_angular_error": train_metrics["angular_error"],
                    "val_loss": val_metrics["loss"],
                    "val_cls_loss": val_metrics["cls_loss"],
                    "val_reg_loss": val_metrics["reg_loss"],
                    "val_yaw_acc": val_metrics["yaw_acc"],
                    "val_pitch_acc": val_metrics["pitch_acc"],
                    "val_angular_error": val_metrics["angular_error"],
                },
                step=epoch,
            )

            # ── 체크포인트 저장 ──
            # 모델 가중치뿐 아니라 옵티마이저 상태, 에폭 정보도 함께 저장
            # → 나중에 이어서 학습하거나 웹 서비스에서 모델만 로드할 때 활용
            checkpoint = {
                "epoch": epoch,
                "model_state_dict": model.state_dict(),
                "optimizer_state_dict": optimizer.state_dict(),
                "train_loss": train_metrics["loss"],
                "val_loss": val_metrics["loss"],
                "val_angular_error": val_metrics["angular_error"],
            }

            # 매 에폭마다 체크포인트 저장
            torch.save(
                checkpoint,
                os.path.join(exp_dir, f"epoch_{epoch:02d}.pth"),
            )

            # 검증 손실이 최소인 모델을 별도로 저장 (best.pth)
            if val_metrics["loss"] < best_val_loss:
                best_val_loss = val_metrics["loss"]
                torch.save(checkpoint, os.path.join(exp_dir, "best.pth"))
                print(
                    f"  >> Best 모델 저장! "
                    f"(Val Loss: {best_val_loss:.4f}, "
                    f"Angular Err: {val_metrics['angular_error']:.2f}°)"
                )

        # ── 마지막 에폭 모델 저장 ──
        torch.save(checkpoint, os.path.join(exp_dir, "last.pth"))

    # ── 학습 완료 요약 ──
    print("\n" + "=" * 60)
    print("  학습 완료!")
    print("=" * 60)
    print(f"  체크포인트 경로 : {exp_dir}")
    print(f"  Best Val Loss  : {best_val_loss:.4f}")
    print(f"  MLflow 기록     : {config.MLFLOW_TRACKING_URI}")
    print("=" * 60)
    print("\n[TIP] MLflow UI로 실험 결과를 확인하려면:")
    print(f"  cd {config.PROJECT_ROOT}")
    print(f"  mlflow ui --backend-store-uri {config.MLFLOW_TRACKING_URI}")
    print("  → 브라우저에서 http://127.0.0.1:5000 접속")


if __name__ == "__main__":
    main()
