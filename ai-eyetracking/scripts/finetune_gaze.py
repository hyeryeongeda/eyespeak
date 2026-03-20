#!/usr/bin/env python3
"""
L2CS-Net 파인튜닝 (6-3).
입력 CSV: path,yaw_deg,pitch_deg  (헤더 필수)
사용법:
  python3 scripts/finetune_gaze.py --data labels.csv --output checkpoints/finetuned.pt
  python3 scripts/finetune_gaze.py --data labels.csv --checkpoint checkpoints/l2cs_best.pt --epochs 20
"""

import argparse
import csv
import math
import sys
from pathlib import Path

_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))


def _load_image(path, mean, std, device):
    """이미지 경로 → (1,3,224,224) 정규화 텐서. 실패 시 None."""
    import cv2
    import torch
    img = cv2.imread(path)
    if img is None:
        return None
    img = cv2.cvtColor(cv2.resize(img, (224, 224)), cv2.COLOR_BGR2RGB)
    x = torch.from_numpy(img).float().div(255.0).permute(2, 0, 1).unsqueeze(0)
    return ((x - mean) / std).to(device)


def main():
    parser = argparse.ArgumentParser(description="L2CS-Net 파인튜닝")
    parser.add_argument("--data", required=True, help="학습 CSV (path,yaw_deg,pitch_deg)")
    parser.add_argument("--val", default=None, help="검증 CSV (없으면 학습셋의 10%% 사용)")
    parser.add_argument("--checkpoint", default=None, help="초기 체크포인트 (없으면 랜덤 초기화)")
    parser.add_argument("--output", default="checkpoints/finetuned.pt", help="저장 경로")
    parser.add_argument("--epochs", type=int, default=10)
    parser.add_argument("--lr", type=float, default=1e-4)
    parser.add_argument("--batch", type=int, default=16)
    parser.add_argument("--freeze-backbone", action="store_true", help="백본 고정, head만 학습 (소량 데이터 권장)")
    parser.add_argument("--unfreeze-epoch", type=int, default=0, help="이 에폭부터 백본 unfreeze (0=해제 안 함)")
    parser.add_argument("--warmup-epochs", type=int, default=1, help="LR 선형 warmup 에폭 수")
    parser.add_argument("--scheduler", choices=("cosine", "step"), default="cosine", help="warmup 이후 스케줄러")
    args = parser.parse_args()

    try:
        import torch
        import torch.nn as nn
        import torch.optim as optim
        from torch.optim.lr_scheduler import CosineAnnealingLR, LinearLR, SequentialLR, StepLR
    except ImportError:
        print("오류: torch 미설치. pip install torch torchvision")
        sys.exit(1)

    from models.l2cs_net import L2CSNet, IMAGENET_MEAN, IMAGENET_STD

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"디바이스: {device}")

    # 모델 초기화
    model = L2CSNet().to(device)
    if args.checkpoint and Path(args.checkpoint).is_file():
        state = torch.load(args.checkpoint, map_location=device, weights_only=False)
        if isinstance(state, dict) and "state_dict" in state:
            state = state["state_dict"]
        if isinstance(state, dict):
            state = {k.replace("module.", ""): v for k, v in state.items()}
            our_sd = model.state_dict()
            loaded = {k: v for k, v in state.items() if k in our_sd and our_sd[k].shape == v.shape}
            our_sd.update(loaded)
            model.load_state_dict(our_sd)
            print(f"체크포인트 로드: {args.checkpoint} ({len(loaded)}/{len(our_sd)} 레이어)")

    if args.freeze_backbone:
        for p in model.backbone.parameters():
            p.requires_grad = False
        n_trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
        print(f"백본 고정. 학습 가능 파라미터: {n_trainable}")

    # 데이터 로드
    data_path = Path(args.data)
    if not data_path.is_file():
        print(f"오류: 데이터 파일 없음 → {data_path}")
        sys.exit(1)

    all_rows = []
    with open(data_path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            try:
                float(row["yaw_deg"]); float(row["pitch_deg"])
                all_rows.append(row)
            except (KeyError, ValueError):
                pass

    # 학습/검증 분리
    if args.val and Path(args.val).is_file():
        train_rows = all_rows
        val_rows = []
        with open(args.val, newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                try:
                    float(row["yaw_deg"]); float(row["pitch_deg"])
                    val_rows.append(row)
                except (KeyError, ValueError):
                    pass
    else:
        split = max(1, int(len(all_rows) * 0.1))
        val_rows = all_rows[:split]
        train_rows = all_rows[split:]

    print(f"학습: {len(train_rows)}개  검증: {len(val_rows)}개")

    mean = torch.tensor(IMAGENET_MEAN).view(1, 3, 1, 1).to(device)
    std = torch.tensor(IMAGENET_STD).view(1, 3, 1, 1).to(device)
    criterion = nn.MSELoss()
    optimizer = optim.Adam([p for p in model.parameters() if p.requires_grad], lr=args.lr)
    warmup_epochs = max(0, min(args.warmup_epochs, args.epochs - 1))
    if warmup_epochs > 0 and args.scheduler == "cosine":
        warmup = LinearLR(optimizer, start_factor=0.01, total_iters=warmup_epochs)
        cosine = CosineAnnealingLR(optimizer, T_max=args.epochs - warmup_epochs, eta_min=1e-6)
        scheduler = SequentialLR(optimizer, [warmup, cosine], milestones=[warmup_epochs])
    elif warmup_epochs > 0:
        warmup = LinearLR(optimizer, start_factor=0.01, total_iters=warmup_epochs)
        step = StepLR(optimizer, step_size=max(1, (args.epochs - warmup_epochs) // 3), gamma=0.5)
        scheduler = SequentialLR(optimizer, [warmup, step], milestones=[warmup_epochs])
    else:
        scheduler = (
            CosineAnnealingLR(optimizer, T_max=args.epochs, eta_min=1e-6)
            if args.scheduler == "cosine"
            else StepLR(optimizer, step_size=max(1, args.epochs // 3), gamma=0.5)
        )
    print(f"스케줄: warmup={warmup_epochs}에폭, 이후 {args.scheduler}")

    best_val_loss = float("inf")
    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    for epoch in range(1, args.epochs + 1):
        if args.unfreeze_epoch and epoch == args.unfreeze_epoch:
            for p in model.backbone.parameters():
                p.requires_grad = True
            optimizer.add_param_group({"params": model.backbone.parameters(), "lr": args.lr * 0.1})
            print(f"에폭 {epoch}: 백본 unfreeze, lr=0.1*base 추가")
        # --- 학습 ---
        model.train()
        train_loss, train_n = 0.0, 0
        batch_x, batch_y, batch_p = [], [], []

        def _flush_batch():
            nonlocal train_loss, train_n
            if not batch_x:
                return
            imgs = torch.cat(batch_x).to(device)
            yaws = torch.tensor(batch_y, dtype=torch.float32).to(device)
            pitches = torch.tensor(batch_p, dtype=torch.float32).to(device)
            optimizer.zero_grad()
            pred_yaw, pred_pitch = model(imgs)
            loss = criterion(pred_yaw, yaws) + criterion(pred_pitch, pitches)
            loss.backward()
            optimizer.step()
            train_loss += loss.item() * len(batch_x)
            train_n += len(batch_x)
            batch_x.clear(); batch_y.clear(); batch_p.clear()

        for row in train_rows:
            x = _load_image(row["path"].strip(), mean, std, device)
            if x is None:
                continue
            batch_x.append(x)
            batch_y.append(math.radians(float(row["yaw_deg"])))
            batch_p.append(math.radians(float(row["pitch_deg"])))
            if len(batch_x) >= args.batch:
                _flush_batch()
        _flush_batch()

        # --- 검증 ---
        val_loss, val_n = 0.0, 0
        if val_rows:
            model.eval()
            with torch.no_grad():
                for row in val_rows:
                    x = _load_image(row["path"].strip(), mean, std, device)
                    if x is None:
                        continue
                    yaw_t = torch.tensor([math.radians(float(row["yaw_deg"]))], device=device)
                    pitch_t = torch.tensor([math.radians(float(row["pitch_deg"]))], device=device)
                    pred_yaw, pred_pitch = model(x)
                    val_loss += (criterion(pred_yaw, yaw_t) + criterion(pred_pitch, pitch_t)).item()
                    val_n += 1

        scheduler.step()
        avg_train = train_loss / max(train_n, 1)
        avg_val = val_loss / max(val_n, 1)
        print(f"Epoch {epoch:3d}/{args.epochs}  train_loss={avg_train:.5f}  val_loss={avg_val:.5f}  n={train_n}")

        if avg_val < best_val_loss and val_n > 0:
            best_val_loss = avg_val
            torch.save(model.state_dict(), out_path)
            print(f"  → 최고 val_loss 갱신, 저장: {out_path}")

    # 검증셋 없으면 마지막 에폭 저장
    if not val_rows:
        torch.save(model.state_dict(), out_path)

    print(f"\n파인튜닝 완료. 체크포인트: {out_path}")
    print(f"사용법: export GAZE_CHECKPOINT={out_path} && python3 app_gaze_web.py")


if __name__ == "__main__":
    main()
