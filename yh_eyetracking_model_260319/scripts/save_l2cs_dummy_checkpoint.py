#!/usr/bin/env python3
"""
우리 L2CSNet 구조에 맞는 더미 체크포인트 저장.
실제 학습 전에 파이프라인 테스트용. 학습된 체크포인트로 교체하면 정확도 향상.
"""

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from models.l2cs_net import L2CSNet
import torch

def main():
    out_dir = ROOT / "checkpoints"
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / "l2cs_dummy.pt"
    model = L2CSNet()
    torch.save(model.state_dict(), path)
    print(f"Saved: {path}")
    print("Use: export GAZE_CHECKPOINT=checkpoints/l2cs_dummy.pt && python3 app_gaze_web.py")

if __name__ == "__main__":
    main()
