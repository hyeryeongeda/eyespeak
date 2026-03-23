"""
XTTS v2 GPT Fine-tuning 스크립트
tts_server.py의 POST /train/{patient_id} 에서 subprocess로 호출됩니다.

직접 실행 예시:
  python train_gpt_xtts.py --patient_id patient_01 --epochs 50 --batch_size 2

학습 데이터 구조 (REPO_ROOT 기준, cwd=REPO_ROOT 로 실행):
  data/{patient_id}/wavs_new/metadata.txt
  data/{patient_id}/wavs_new/audio1.wav ...

학습 결과물:
  run/training/{patient_id}/GPT_XTTS_*/best_model.pth
"""
import argparse
import glob
import os
import time
import torch

# ── 호환성 패치 (torch.load weights_only, isin_mps_friendly) ─────────────────
_original_load = torch.load

def _force_unsafe_load(*args, **kwargs):
    kwargs.setdefault("weights_only", False)
    return _original_load(*args, **kwargs)

torch.load = _force_unsafe_load

import transformers.pytorch_utils as _pt_utils
if not hasattr(_pt_utils, "isin_mps_friendly"):
    def _isin_mps_friendly(elements=None, test_elements=None, **kwargs):
        if elements is not None and test_elements is not None:
            return torch.isin(elements, test_elements)
        return torch.tensor(False, device=getattr(elements, "device", None))
    _pt_utils.isin_mps_friendly = _isin_mps_friendly
# ─────────────────────────────────────────────────────────────────────────────

import mlflow

from trainer import Trainer, TrainerArgs
from TTS.config.shared_configs import BaseDatasetConfig
from TTS.tts.datasets import load_tts_samples
from TTS.tts.layers.xtts.trainer.gpt_trainer import GPTArgs, GPTTrainer, GPTTrainerConfig
from TTS.tts.models.xtts import XttsAudioConfig
from TTS.utils.manage import ModelManager


def _find_best_model(out_path: str) -> str | None:
    """학습 완료 후 best_model.pth 경로를 탐색합니다."""
    matches = sorted(glob.glob(os.path.join(out_path, "GPT_XTTS_*", "best_model.pth")))
    return matches[-1] if matches else None


def parse_args():
    parser = argparse.ArgumentParser(description="XTTS v2 GPT Fine-tuning")
    parser.add_argument("--patient_id", type=str, default="default",
                        help="환자 식별자. 데이터 경로 및 출력 경로에 사용됩니다.")
    parser.add_argument("--epochs",     type=int, default=50,
                        help="학습 epoch 수 (기본값: 50)")
    parser.add_argument("--batch_size", type=int, default=2,
                        help="배치 크기 (기본값: 2). GRAD_ACCUM_STEPS는 자동 조정됩니다.")
    return parser.parse_args()


def main():
    args = parse_args()

    # ── 경로 설정 ────────────────────────────────────────────────────────────
    REPO_ROOT  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # ai-tts/ 의 부모
    PATIENT_ID = args.patient_id

    # 학습 출력: run/training/{patient_id}/
    OUT_PATH = os.path.join(REPO_ROOT, "run", "training", PATIENT_ID)

    # 학습 데이터: data/{patient_id}/wavs_new/
    DATA_ROOT    = os.path.join(REPO_ROOT, "data", PATIENT_ID, "wavs_new")
    META_FILE    = os.path.join(DATA_ROOT, "metadata.txt")
    SPEAKER_REF  = os.path.join(DATA_ROOT, "audio1.wav")

    # 사전학습 모델 파일 (공용 캐시)
    CHECKPOINTS_OUT_PATH = os.path.join(REPO_ROOT, "run", "training", "XTTS_v2.0_original_model_files")
    os.makedirs(CHECKPOINTS_OUT_PATH, exist_ok=True)

    # ── 하이퍼파라미터 ───────────────────────────────────────────────────────
    EPOCHS          = args.epochs          # 권장: 80 (--epochs 80)
    BATCH_SIZE      = args.batch_size
    GRAD_ACCUM_STEPS = max(1, 256 // BATCH_SIZE)  # BATCH * GRAD_ACCUM ≈ 256
    LR              = 2e-6                 # 1e-6→2e-6: 화자 특성 학습 강화 (5e-6은 망각 유발)

    OPTIMIZER_WD_ONLY_ON_WEIGHTS = True
    START_WITH_EVAL = True

    # ── 사전학습 파일 다운로드 ───────────────────────────────────────────────
    DVAE_LINK      = "https://coqui.gateway.scarf.sh/hf-coqui/XTTS-v2/main/dvae.pth"
    MEL_NORM_LINK  = "https://coqui.gateway.scarf.sh/hf-coqui/XTTS-v2/main/mel_stats.pth"
    TOKENIZER_LINK = "https://coqui.gateway.scarf.sh/hf-coqui/XTTS-v2/main/vocab.json"
    XTTS_CKPT_LINK = "https://coqui.gateway.scarf.sh/hf-coqui/XTTS-v2/main/model.pth"

    DVAE_CHECKPOINT = os.path.join(CHECKPOINTS_OUT_PATH, "dvae.pth")
    MEL_NORM_FILE   = os.path.join(CHECKPOINTS_OUT_PATH, "mel_stats.pth")
    TOKENIZER_FILE  = os.path.join(CHECKPOINTS_OUT_PATH, "vocab.json")
    XTTS_CHECKPOINT = os.path.join(CHECKPOINTS_OUT_PATH, "model.pth")

    if not os.path.isfile(DVAE_CHECKPOINT) or not os.path.isfile(MEL_NORM_FILE):
        print(" > DVAE 파일 다운로드 중...")
        ModelManager._download_model_files([MEL_NORM_LINK, DVAE_LINK], CHECKPOINTS_OUT_PATH, progress_bar=True)

    if not os.path.isfile(TOKENIZER_FILE) or not os.path.isfile(XTTS_CHECKPOINT):
        print(" > XTTS v2.0 기본 모델 다운로드 중...")
        ModelManager._download_model_files([TOKENIZER_LINK, XTTS_CKPT_LINK], CHECKPOINTS_OUT_PATH, progress_bar=True)

    # ── 데이터셋 설정 ────────────────────────────────────────────────────────
    config_dataset = BaseDatasetConfig(
        formatter="ljspeech",
        dataset_name="wavs_new",
        path=DATA_ROOT,
        meta_file_train=META_FILE,
        language="ko",
    )

    # ── 모델 args ────────────────────────────────────────────────────────────
    model_args = GPTArgs(
        max_conditioning_length=132300,  # 6 secs
        min_conditioning_length=66150,   # 3 secs
        debug_loading_failures=False,
        max_wav_length=255995,           # ~11.6 seconds
        max_text_length=200,
        mel_norm_file=MEL_NORM_FILE,
        dvae_checkpoint=DVAE_CHECKPOINT,
        xtts_checkpoint=XTTS_CHECKPOINT,
        tokenizer_file=TOKENIZER_FILE,
        gpt_num_audio_tokens=1026,
        gpt_start_audio_token=1024,
        gpt_stop_audio_token=1025,
        gpt_use_masking_gt_prompt_approach=True,
        gpt_use_perceiver_resampler=True,
    )

    audio_config = XttsAudioConfig(sample_rate=22050, output_sample_rate=24000)
    audio_config.dvae_sample_rate = 22050

    config = GPTTrainerConfig(
        output_path=OUT_PATH,
        model_args=model_args,
        run_name=f"GPT_XTTS_v2.0_KO_FT_ep{EPOCHS}",
        project_name="XTTS_trainer",
        dashboard_logger="tensorboard",
        logger_uri=None,
        audio=audio_config,
        epochs=EPOCHS,
        batch_size=BATCH_SIZE,
        batch_group_size=48,
        eval_batch_size=BATCH_SIZE,
        num_loader_workers=0,
        eval_split_max_size=256,
        eval_split_size=0.1,
        print_step=30,
        log_model_step=30,
        plot_step=243,
        save_step=243,
        save_n_checkpoints=1,
        save_checkpoints=True,
        save_best_after=0,
        print_eval=False,
        optimizer="AdamW",
        optimizer_wd_only_on_weights=OPTIMIZER_WD_ONLY_ON_WEIGHTS,
        optimizer_params={"betas": [0.9, 0.96], "eps": 1e-8, "weight_decay": 1e-2},
        lr=LR,
        lr_scheduler="CosineAnnealingWarmRestarts",
        lr_scheduler_params={"T_0": EPOCHS, "T_mult": 1, "eta_min": LR / 100},
        test_sentences=[
            {"text": "안녕하세요. 잘 지내고 계신가요?",        "speaker_wav": [SPEAKER_REF], "language": "ko"},
            {"text": "오늘 날씨가 정말 좋네요.",              "speaker_wav": [SPEAKER_REF], "language": "ko"},
            {"text": "목소리를 오래 기억할 수 있어서 감사합니다.", "speaker_wav": [SPEAKER_REF], "language": "ko"},
        ],
    )

    model = GPTTrainer.init_from_config(config)

    train_samples, eval_samples = load_tts_samples(
        [config_dataset],
        eval_split=True,
        eval_split_max_size=config.eval_split_max_size,
        eval_split_size=config.eval_split_size,
    )

    trainer = Trainer(
        TrainerArgs(
            restore_path=None,
            skip_train_epoch=False,
            start_with_eval=START_WITH_EVAL,
            grad_accum_steps=GRAD_ACCUM_STEPS,
        ),
        config,
        output_path=OUT_PATH,
        model=model,
        train_samples=train_samples,
        eval_samples=eval_samples,
    )

    # ── MLflow 실험 추적 ─────────────────────────────────────────────────────
    mlflow.set_experiment("xtts-ko-training")
    with mlflow.start_run(run_name=f"{PATIENT_ID}_ep{EPOCHS}_bs{BATCH_SIZE}"):
        mlflow.log_params({
            "patient_id":    PATIENT_ID,
            "epochs":        EPOCHS,
            "batch_size":    BATCH_SIZE,
            "grad_accum":    GRAD_ACCUM_STEPS,
            "learning_rate": LR,
            "optimizer":     "AdamW",
            "lr_scheduler":  "CosineAnnealingWarmRestarts",
            "train_samples": len(train_samples),
            "eval_samples":  len(eval_samples),
        })
        mlflow.set_tags({"model": "XTTS-v2", "language": "ko"})

        t0 = time.time()
        try:
            trainer.fit()
            elapsed = time.time() - t0
            mlflow.log_metric("training_duration_s", round(elapsed, 1))
            mlflow.log_metric("training_success", 1)

            best = _find_best_model(OUT_PATH)
            if best:
                mlflow.log_artifact(best, artifact_path="model")
                print(f" > MLflow: best_model.pth 아티팩트 저장 완료")
        except Exception as e:
            mlflow.log_metric("training_duration_s", round(time.time() - t0, 1))
            mlflow.log_metric("training_success", 0)
            mlflow.set_tag("error", str(e)[:250])
            raise


if __name__ == "__main__":
    main()
