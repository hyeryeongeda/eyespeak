"""L2CS-Net 프리트레인 가중치를 다운로드하여 checkpoints/에 저장한다."""
import subprocess
import sys
from pathlib import Path


def main() -> None:
    ck_dir = Path(__file__).resolve().parent.parent / "checkpoints"
    ck_dir.mkdir(exist_ok=True)
    out_path = ck_dir / "l2cs_best.pt"

    if out_path.exists():
        print(f"Already exists: {out_path}")
        return

    # l2cs 패키지에서 모델 가중치 추출
    try:
        import l2cs
        import torch

        # l2cs Pipeline은 내부적으로 가중치를 로드할 수 있음
        # Gaze360 프리트레인 모델 사용
        model_dir = Path(l2cs.__file__).parent / "models"
        if model_dir.exists():
            for f in model_dir.glob("*.pkl"):
                print(f"Found l2cs model: {f}")
                # pkl → pt 변환
                state = torch.load(str(f), map_location="cpu", weights_only=False)
                torch.save(state, str(out_path))
                print(f"Saved to: {out_path}")
                return

        # 패키지에 모델이 없으면 직접 다운로드 안내
        print("l2cs 패키지에 프리트레인 모델이 포함되어 있지 않습니다.")
        print("다음 중 하나를 수행하세요:")
        print("  1. https://github.com/Ahmednull/L2CS-Net 에서 Gaze360 가중치 다운로드")
        print(f"  2. 다운로드한 파일을 {out_path} 으로 저장")
        print("  3. 또는 직접 학습: python -m eye_speak.iris_model.train --model l2cs ...")
    except ImportError:
        print("l2cs 패키지가 설치되지 않았습니다. pip install l2cs 실행 후 재시도하세요.")


if __name__ == "__main__":
    main()
