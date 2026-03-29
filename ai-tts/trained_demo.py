import os
import argparse
import random
import numpy as np
import torch

_original_load = torch.load
def _force_unsafe_load(*args, **kwargs):
    if "weights_only" not in kwargs:
        kwargs["weights_only"] = False
    return _original_load(*args, **kwargs)
torch.load = _force_unsafe_load

import transformers.pytorch_utils as _pt_utils
if not hasattr(_pt_utils, "isin_mps_friendly"):
    def _isin_mps_friendly(elements=None, test_elements=None, **kwargs):
        if elements is not None and test_elements is not None:
            return torch.isin(elements, test_elements)
        return torch.tensor(False, device=elements.device if hasattr(elements, "device") else None)
    _pt_utils.isin_mps_friendly = _isin_mps_friendly

import torchaudio
from TTS.tts.configs.xtts_config import XttsConfig
from TTS.tts.models.xtts import Xtts

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))

# 짧은 문장 패딩용 (생성 후 앞부분 잘라냄)
SHORT_TEXT_PAD_PREFIX = "사실 처음에는 좀 걱정이 됐는데 막상 시작해보니까 생각보다 할만하더라고요. "
SHORT_TEXT_MIN_LEN = 25


def set_seed(seed):
    """재현성을 위한 시드 고정"""
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    np.random.seed(seed)
    random.seed(seed)
    torch.backends.cudnn.deterministic = True


def trim_pad_prefix(full_wav, pad_len, target_len, sr=24000):
    """패딩 텍스트 비율 기반으로 앞부분 잘라내기.
    글자수 비율로 cut 지점 계산, 첫 글자가 잘리지 않도록 0.1초 앞에서 자름."""
    total_len = pad_len + target_len
    ratio = pad_len / total_len
    # 패딩 비율만큼 오디오 앞부분 제거 - 여유분 (첫 음절 보존)
    cut = int(len(full_wav) * ratio) - int(sr * 0.1)
    cut = max(0, cut)
    if cut >= len(full_wav):
        return full_wav
    return full_wav[cut:]


def parse_args():
    parser = argparse.ArgumentParser(description="XTTS v2 파인튜닝 모델 합성 테스트")
    parser.add_argument("--patient_id", type=str, required=True, help="화자 ID")
    parser.add_argument("--text", type=str, default="안녕하세요. 잘 지내고 계신가요?",
                        help="합성할 텍스트")
    parser.add_argument("--output", type=str, default=None,
                        help="출력 wav 경로 (기본: save/{patient_id}_output.wav)")
    # inference() 기본값 기반으로 조정
    parser.add_argument("--speed", type=float, default=1.2, help="말하기 속도 (기본: 1.2)")
    parser.add_argument("--temperature", type=float, default=0.8, help="Temperature (기본: 0.8)")
    parser.add_argument("--repetition_penalty", type=float, default=10.0, help="반복 억제 (기본: 10.0, XTTS 기본값)")
    parser.add_argument("--top_k", type=int, default=30, help="Top-K 샘플링 (기본: 30)")
    parser.add_argument("--top_p", type=float, default=0.85, help="Top-P 샘플링 (기본: 0.85)")
    parser.add_argument("--length_penalty", type=float, default=1.0, help="길이 페널티 (기본: 1.0)")
    parser.add_argument("--gpt_cond_len", type=int, default=6, help="GPT conditioning 길이 초 (기본: 6)")
    parser.add_argument("--seed", type=int, default=42, help="랜덤 시드 (기본: 42, -1=랜덤)")
    parser.add_argument("--no_pad_short", action="store_true", help="짧은 문장 패딩 비활성화")
    return parser.parse_args()


def main():
    args = parse_args()

    ckpt_dir = os.path.join(PROJECT_ROOT, "checkpoints", args.patient_id)
    if not os.path.isdir(ckpt_dir):
        print(f"체크포인트 디렉토리가 없습니다: {ckpt_dir}")
        print(f"먼저 pipeline.py로 학습을 실행하세요:")
        print(f"  python pipeline.py --patient_id {args.patient_id} --audio_path <음성파일>")
        return

    vocab_path = os.path.join(ckpt_dir, "vocab.json")
    if not os.path.isfile(vocab_path):
        vocab_path = os.path.join(
            PROJECT_ROOT, "run", "training", "XTTS_v2.0_original_model_files", "vocab.json"
        )

    print(f" > 모델 로드 중: {args.patient_id}")

    config = XttsConfig()
    config.load_json(os.path.join(ckpt_dir, "config.json"))

    model = Xtts.init_from_config(config)
    model.load_checkpoint(
        config,
        checkpoint_dir=ckpt_dir,
        checkpoint_path=os.path.join(ckpt_dir, "best_model.pth"),
        vocab_path=vocab_path,
        use_deepspeed=False,
    )

    if torch.cuda.is_available():
        model.cuda()
        print(" > GPU 사용")

    ref_names = ["speaker_ref.wav", "speaker_ref2.wav", "speaker_ref3.wav"]
    refs = [os.path.join(ckpt_dir, r) for r in ref_names if os.path.isfile(os.path.join(ckpt_dir, r))]
    if not refs:
        print("Speaker reference 파일이 없습니다.")
        return

    # speaker conditioning 사전 계산
    gpt_cond_latent, speaker_embedding = model.get_conditioning_latents(
        audio_path=refs,
        gpt_cond_len=args.gpt_cond_len,
        gpt_cond_chunk_len=min(args.gpt_cond_len, 4),
    )

    text = args.text
    is_short = len(text) < SHORT_TEXT_MIN_LEN and not args.no_pad_short
    if is_short:
        padded_text = SHORT_TEXT_PAD_PREFIX + text
        print(f" > 짧은 문장 감지 → 패딩 적용: '{padded_text}'")
    else:
        padded_text = None

    print(f" > 텍스트: '{text}'")
    print(f" > 레퍼런스: {len(refs)}개, 속도: {args.speed}x, seed: {args.seed}")
    print(f" > temp={args.temperature}, rep_penalty={args.repetition_penalty}, top_k={args.top_k}")

    # 시드 고정
    if args.seed >= 0:
        set_seed(args.seed)

    # inference() 직접 호출
    inference_params = dict(
        language="ko",
        gpt_cond_latent=gpt_cond_latent,
        speaker_embedding=speaker_embedding,
        temperature=args.temperature,
        length_penalty=args.length_penalty,
        repetition_penalty=args.repetition_penalty,
        top_k=args.top_k,
        top_p=args.top_p,
        speed=args.speed,
        enable_text_splitting=True,
    )

    if is_short:
        # 패딩 텍스트로 생성
        out_full = model.inference(text=padded_text, **inference_params)
        # 글자수 비율로 패딩 부분 잘라내기
        wav = trim_pad_prefix(out_full["wav"], len(SHORT_TEXT_PAD_PREFIX), len(text))
    else:
        out = model.inference(text=text, **inference_params)
        wav = out["wav"]

    save_dir = os.path.join(PROJECT_ROOT, "save")
    os.makedirs(save_dir, exist_ok=True)
    output_path = args.output or os.path.join(save_dir, f"{args.patient_id}_output.wav")

    wav_tensor = torch.tensor(wav).unsqueeze(0)
    torchaudio.save(output_path, wav_tensor, 24000)

    print(f" > 완료: {output_path}")


if __name__ == "__main__":
    main()
