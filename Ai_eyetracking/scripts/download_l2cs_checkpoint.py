#!/usr/bin/env python3
"""
L2CS-Net 사전학습 체크포인트 다운로드.
ResNet18 Gaze360 (Shohruh72/L2CSNet) best.pt → checkpoints/l2cs_best.pt
"""

import os
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHECKPOINT_DIR = ROOT / "checkpoints"
URL = "https://github.com/Shohruh72/L2CSNet/releases/download/v.1.0.0/best.pt"
OUT_NAME = "l2cs_best.pt"


def main():
    CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = CHECKPOINT_DIR / OUT_NAME
    if out_path.is_file():
        print(f"이미 존재함: {out_path}")
        print("사용: export GAZE_CHECKPOINT=checkpoints/l2cs_best.pt && python3 app_gaze_web.py")
        return 0
    print(f"다운로드 중: {URL}")
    try:
        urllib.request.urlretrieve(URL, out_path)
        print(f"저장됨: {out_path}")
        print("사용: export GAZE_CHECKPOINT=checkpoints/l2cs_best.pt && python3 app_gaze_web.py")
    except Exception as e:
        print(f"다운로드 실패: {e}")
        print("수동: 브라우저에서 위 URL 열어 받은 뒤 checkpoints/ 에 넣고 l2cs_best.pt 로 이름 변경.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
