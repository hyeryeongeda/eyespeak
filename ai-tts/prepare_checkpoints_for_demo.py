"""
학습이 끝난 뒤 run/training/ 에 있는 best 모델을 checkpoints/ 로 복사합니다.
복사 후 optimizer/training state를 제거하여 파일 크기를 경량화합니다.

실행: python prepare_checkpoints_for_demo.py [--fp16] [--no-optimize]
"""
import os
import re
import shutil
import glob
import argparse

RUN_DIR = "./run/training"
CHECKPOINTS_DIR = "./checkpoints"


def optimize_checkpoint(pth_path, fp16=False):
    """체크포인트에서 optimizer/training state를 제거하고, 선택적으로 fp16 변환.

    Coqui Trainer는 {config, model, optimizer, scaler, step, epoch, date}를 저장하지만
    XTTS load_checkpoint()는 checkpoint["model"]만 사용.
    AdamW optimizer state가 모델 가중치의 ~2배 크기를 차지.
    """
    import torch

    original_size = os.path.getsize(pth_path)

    checkpoint = torch.load(pth_path, map_location="cpu", weights_only=False)

    if "model" not in checkpoint:
        print(f"  경고: 'model' 키가 없습니다. 최적화를 건너뜁니다.")
        return

    # 이미 최적화된 파일이면 건너뛰기
    if len(checkpoint) == 1 and "model" in checkpoint and not fp16:
        print(f"  이미 최적화된 체크포인트입니다. 건너뜁니다.")
        return

    state_dict = checkpoint["model"]

    if fp16:
        for key in state_dict:
            if state_dict[key].dtype == torch.float32:
                state_dict[key] = state_dict[key].half()

    torch.save({"model": state_dict}, pth_path)

    new_size = os.path.getsize(pth_path)
    ratio = (1 - new_size / original_size) * 100
    print(f"  체크포인트 최적화 완료:")
    print(f"    {original_size / (1024**3):.2f} GB → {new_size / (1024**3):.2f} GB ({ratio:.0f}% 감소)")
    if fp16:
        print(f"    fp16 변환 적용됨")


def find_latest_run():
    """run/training/ 아래에서 가장 최근 학습 run 폴더 찾기 (GPT_XTTS_... 형식)"""
    if not os.path.isdir(RUN_DIR):
        return None
    dirs = [
        d for d in os.listdir(RUN_DIR)
        if os.path.isdir(os.path.join(RUN_DIR, d)) and d.startswith("GPT_XTTS_")
    ]
    if not dirs:
        return None
    # 폴더 이름에 날짜+시간이 있으므로 정렬하면 최신이 마지막
    dirs.sort()
    return os.path.join(RUN_DIR, dirs[-1])


def find_latest_best_model(run_path):
    """run 폴더 안에서 번호가 가장 큰 best_model_XXX.pth 찾기"""
    pattern = os.path.join(run_path, "best_model_*.pth")
    files = glob.glob(pattern)
    if not files:
        return None
    def num(f):
        m = re.search(r"best_model_(\d+)\.pth", os.path.basename(f))
        return int(m.group(1)) if m else 0
    return max(files, key=num)


def parse_args():
    parser = argparse.ArgumentParser(description="학습 체크포인트를 데모용으로 준비 (경량화 포함)")
    parser.add_argument("--no-optimize", action="store_true",
                        help="체크포인트 최적화 건너뛰기 (optimizer state 유지)")
    parser.add_argument("--fp16", action="store_true",
                        help="가중치를 float16으로 변환 (용량 추가 절감, ~50%%)")
    return parser.parse_args()


def main():
    args = parse_args()
    os.makedirs(CHECKPOINTS_DIR, exist_ok=True)

    run_path = find_latest_run()
    if not run_path:
        print("run/training/ 아래에 GPT_XTTS_... 폴더가 없습니다. 학습을 먼저 완료하세요.")
        return

    best_pth = find_latest_best_model(run_path)
    config_src = os.path.join(run_path, "config.json")

    if not best_pth or not os.path.isfile(best_pth):
        print(f"해당 run 폴더에 best_model_*.pth가 없습니다: {run_path}")
        return
    if not os.path.isfile(config_src):
        print(f"config.json이 없습니다: {config_src}")
        return

    dest_pth = os.path.join(CHECKPOINTS_DIR, "best_model.pth")
    dest_config = os.path.join(CHECKPOINTS_DIR, "config.json")

    shutil.copy2(best_pth, dest_pth)
    shutil.copy2(config_src, dest_config)

    print(f"복사 완료:")
    print(f"  {best_pth} -> {dest_pth}")
    print(f"  {config_src} -> {dest_config}")

    if not args.no_optimize:
        print(f"\n체크포인트 경량화 중...")
        optimize_checkpoint(dest_pth, fp16=args.fp16)

    print("\n다음으로 데모 실행: python trained_demo.py")


if __name__ == "__main__":
    main()
