import os
import argparse
import torch

_original_load = torch.load

def _force_unsafe_load(*args, **kwargs):
    if 'weights_only' not in kwargs:
        kwargs['weights_only'] = False
    return _original_load(*args, **kwargs)

torch.load = _force_unsafe_load

import transformers.pytorch_utils as _pt_utils
if not hasattr(_pt_utils, "isin_mps_friendly"):
    def _isin_mps_friendly(elements=None, test_elements=None, **kwargs):
        if elements is not None and test_elements is not None:
            return torch.isin(elements, test_elements)
        return torch.tensor(False, device=elements.device if hasattr(elements, "device") else None)
    _pt_utils.isin_mps_friendly = _isin_mps_friendly

from trainer import Trainer, TrainerArgs

from TTS.config.shared_configs import BaseDatasetConfig
from TTS.tts.datasets import load_tts_samples
from TTS.tts.layers.xtts.trainer.gpt_trainer import GPTArgs, GPTTrainer, GPTTrainerConfig
from TTS.tts.models.xtts import XttsAudioConfig
from TTS.utils.manage import ModelManager


RUN_NAME = "GPT_XTTS_v2.0_KO_FT"
PROJECT_NAME = "XTTS_trainer"
DASHBOARD_LOGGER = "tensorboard"
LOGGER_URI = None

OUT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "run", "training")
CHECKPOINTS_OUT_PATH = os.path.join(OUT_PATH, "XTTS_v2.0_original_model_files/")

SAFE_MAX_LR = 3e-6
SAFE_MAX_EPOCHS = 100
SAFE_MAX_CONDITIONING_LENGTH = 132300


def ensure_base_models():
    """DVAE, mel_stats, vocab, XTTS checkpoint 다운로드 (없으면)"""
    os.makedirs(CHECKPOINTS_OUT_PATH, exist_ok=True)

    dvae_link = "https://coqui.gateway.scarf.sh/hf-coqui/XTTS-v2/main/dvae.pth"
    mel_link = "https://coqui.gateway.scarf.sh/hf-coqui/XTTS-v2/main/mel_stats.pth"
    tokenizer_link = "https://coqui.gateway.scarf.sh/hf-coqui/XTTS-v2/main/vocab.json"
    xtts_link = "https://coqui.gateway.scarf.sh/hf-coqui/XTTS-v2/main/model.pth"

    dvae = os.path.join(CHECKPOINTS_OUT_PATH, "dvae.pth")
    mel = os.path.join(CHECKPOINTS_OUT_PATH, "mel_stats.pth")
    tokenizer = os.path.join(CHECKPOINTS_OUT_PATH, "vocab.json")
    xtts = os.path.join(CHECKPOINTS_OUT_PATH, "model.pth")

    if not os.path.isfile(dvae) or not os.path.isfile(mel):
        print(" > Downloading DVAE files!")
        ModelManager._download_model_files(
            [mel_link, dvae_link], CHECKPOINTS_OUT_PATH, progress_bar=True
        )
    if not os.path.isfile(tokenizer) or not os.path.isfile(xtts):
        print(" > Downloading XTTS v2.0 files!")
        ModelManager._download_model_files(
            [tokenizer_link, xtts_link], CHECKPOINTS_OUT_PATH, progress_bar=True
        )

    return dvae, mel, tokenizer, xtts


def find_speaker_refs(wavs_dir, max_refs=3):
    """wavs 디렉토리에서 파일 크기(=길이) 순 상위 N개 선택"""
    wavs = []
    if not os.path.isdir(wavs_dir):
        return []
    for f in os.listdir(wavs_dir):
        if f.startswith("audio") and f.endswith(".wav"):
            path = os.path.join(wavs_dir, f)
            wavs.append((os.path.getsize(path), path))
    wavs.sort(reverse=True)
    return [path for _, path in wavs[:max_refs]]


def parse_args():
    parser = argparse.ArgumentParser(description="XTTS v2 GPT 파인튜닝")
    parser.add_argument("--patient_id", type=str, required=True, help="화자 ID")
    parser.add_argument("--epochs", type=int, default=60)
    parser.add_argument("--batch_size", type=int, default=2)
    parser.add_argument("--lr", type=float, default=1e-6)
    parser.add_argument("--data_dir", type=str, default=None,
                        help="데이터 디렉토리 (기본: data/{patient_id})")
    parser.add_argument("--restore_path", type=str, default=None,
                        help="이어받기할 체크포인트 경로 (기본: None → 처음부터)")
    return parser.parse_args()


def main():
    args = parse_args()

    if args.lr > SAFE_MAX_LR:
        print(f" > LR {args.lr} → {SAFE_MAX_LR} (안전 상한)")
        args.lr = SAFE_MAX_LR
    if args.epochs > SAFE_MAX_EPOCHS:
        print(f" > Epochs {args.epochs} → {SAFE_MAX_EPOCHS} (안전 상한)")
        args.epochs = SAFE_MAX_EPOCHS

    data_dir = args.data_dir or os.path.join("data", args.patient_id)
    wavs_dir = os.path.join(data_dir, "wavs")
    metadata_file = os.path.join(data_dir, "metadata.txt")

    if not os.path.isfile(metadata_file):
        raise FileNotFoundError(f"메타데이터 파일이 없습니다: {metadata_file}")

    dvae_ckpt, mel_norm, tokenizer_file, xtts_ckpt = ensure_base_models()

    speaker_refs = find_speaker_refs(wavs_dir)
    if not speaker_refs:
        raise FileNotFoundError(f"Speaker reference wav 없음: {wavs_dir}")

    config_dataset = BaseDatasetConfig(
        formatter="ljspeech",
        dataset_name="wavs",
        path=data_dir,
        meta_file_train="metadata.txt",
        language="ko",
    )

    model_args = GPTArgs(
        max_conditioning_length=SAFE_MAX_CONDITIONING_LENGTH,
        min_conditioning_length=44100,    # 2.0 seconds (짧은 세그먼트도 conditioning 활용)
        debug_loading_failures=False,
        max_wav_length=255995,
        max_text_length=200,
        mel_norm_file=mel_norm,
        dvae_checkpoint=dvae_ckpt,
        xtts_checkpoint=xtts_ckpt,
        tokenizer_file=tokenizer_file,
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
        run_name=f"{RUN_NAME}_{args.patient_id}_ep{args.epochs}",
        project_name=PROJECT_NAME,
        run_description=f"XTTS fine-tuning for {args.patient_id}",
        dashboard_logger=DASHBOARD_LOGGER,
        logger_uri=LOGGER_URI,
        audio=audio_config,
        epochs=args.epochs,
        batch_size=args.batch_size,
        batch_group_size=48,
        eval_batch_size=args.batch_size,
        num_loader_workers=0,
        eval_split_max_size=256,
        eval_split_size=0.1,
        print_step=30,
        log_model_step=30,
        plot_step=100,
        save_step=100,
        save_n_checkpoints=3,
        save_checkpoints=True,
        save_best_after=0,
        print_eval=False,
        optimizer="AdamW",
        optimizer_wd_only_on_weights=True,
        optimizer_params={"betas": [0.9, 0.96], "eps": 1e-8, "weight_decay": 1e-2},
        lr=args.lr,
        lr_scheduler="CosineAnnealingWarmRestarts",
        lr_scheduler_params={"T_0": args.epochs, "T_mult": 1, "eta_min": args.lr / 100},
        test_sentences=[
            {
                "text": "안녕하세요. 반갑습니다.",
                "speaker_wav": speaker_refs,
                "language": "ko",
            },
            {
                "text": "오늘 날씨 진짜 좋다 어디 놀러 가고 싶다",
                "speaker_wav": speaker_refs,
                "language": "ko",
            },
            {
                "text": "솔직히 처음에는 좀 걱정됐는데 막상 해보니까 별 거 아니더라고",
                "speaker_wav": speaker_refs,
                "language": "ko",
            },
        ],
    )

    model = GPTTrainer.init_from_config(config)

    train_samples, eval_samples = load_tts_samples(
        [config_dataset],
        eval_split=True,
        eval_split_max_size=config.eval_split_max_size,
        eval_split_size=config.eval_split_size,
    )

    restore = args.restore_path
    if restore and not os.path.isfile(restore):
        print(f" > restore_path가 존재하지 않음, 무시: {restore}")
        restore = None
    if restore:
        print(f" > 체크포인트에서 이어받기: {restore}")

    trainer = Trainer(
        TrainerArgs(
            restore_path=restore,
            skip_train_epoch=False,
            start_with_eval=True,
            grad_accum_steps=128,
        ),
        config,
        output_path=OUT_PATH,
        model=model,
        train_samples=train_samples,
        eval_samples=eval_samples,
    )
    trainer.fit()


if __name__ == "__main__":
    main()
