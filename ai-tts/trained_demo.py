import os
import argparse
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


def parse_args():
    parser = argparse.ArgumentParser(description="XTTS v2 파인튜닝 모델 합성 테스트")
    parser.add_argument("--patient_id", type=str, required=True, help="화자 ID")
    parser.add_argument("--text", type=str, default="안녕하세요. 잘 지내고 계신가요?",
                        help="합성할 텍스트")
    parser.add_argument("--output", type=str, default=None,
                        help="출력 wav 경로 (기본: save/{patient_id}_output.wav)")
    parser.add_argument("--speed", type=float, default=1.2, help="말하기 속도 (기본: 1.2)")
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

    print(f" > 텍스트: '{args.text}'")
    print(f" > 레퍼런스: {len(refs)}개, 속도: {args.speed}x")

    outputs = model.synthesize(
        args.text,
        config,
        speaker_wav=refs if len(refs) > 1 else refs[0],
        language="ko",
        gpt_cond_len=12,
        temperature=0.72,
        length_penalty=1.0,
        repetition_penalty=2.5,
        top_k=50,
        top_p=0.88,
        speed=args.speed,
    )

    save_dir = os.path.join(PROJECT_ROOT, "save")
    os.makedirs(save_dir, exist_ok=True)
    output_path = args.output or os.path.join(save_dir, f"{args.patient_id}_output.wav")

    wav_tensor = torch.tensor(outputs["wav"]).unsqueeze(0)
    torchaudio.save(output_path, wav_tensor, 24000)

    print(f" > 완료: {output_path}")


if __name__ == "__main__":
    main()
