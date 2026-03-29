"""
XTTS v2 한국어 화자 파인튜닝 자동 파이프라인

새로운 화자의 음성 파일 하나만 넣으면 전처리 → 학습 → 모델 저장까지 자동 실행.

사용법:
  python pipeline.py --patient_id <ID> --audio_path <음성파일>

예시:
  python pipeline.py --patient_id yh --audio_path ./yh_audio.m4a
  python pipeline.py --patient_id kim --audio_path /path/to/kim.mp3 --gpu 1
  python pipeline.py --patient_id lee --audio_path ./lee.wav --epochs 60 --lr 1e-6

생성 구조:
  data/{patient_id}/
    ├── {patient_id}_full.wav   (변환된 전체 wav)
    ├── wavs/                   (분할된 세그먼트)
    │   ├── audio1.wav ...
    └── metadata.txt            (전사 결과)
  checkpoints/{patient_id}/
    ├── best_model.pth          (파인튜닝 모델)
    ├── config.json
    ├── vocab.json, dvae.pth, mel_stats.pth
    └── speaker_ref.wav, ref2, ref3
"""
import argparse
import os
import re
import shutil
import subprocess
import sys
import time

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
FFMPEG_EXE = "/home/j-j14e205/.conda/envs/eyespeak/bin/ffmpeg"
PYTHON_EXE = "/home/j-j14e205/.conda/envs/eyespeak/bin/python"


def parse_args():
    parser = argparse.ArgumentParser(
        description="XTTS v2 한국어 화자 파인튜닝 자동 파이프라인",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="예시:\n"
               "  python pipeline.py --patient_id yh --audio_path ./yh_audio.m4a\n"
               "  python pipeline.py --patient_id kim --audio_path ./kim.mp3 --gpu 1\n",
    )
    parser.add_argument("--patient_id", required=True, help="화자 ID (예: yh, kim)")
    parser.add_argument("--audio_path", required=True, help="원본 음성 파일 (m4a, mp3, wav 등)")
    parser.add_argument("--epochs", type=int, default=60, help="학습 에포크 (기본: 60, 최대: 100)")
    parser.add_argument("--batch_size", type=int, default=2, help="배치 크기 (기본: 2)")
    parser.add_argument("--lr", type=float, default=2e-6, help="학습률 (기본: 2e-6, 최대: 3e-6)")
    parser.add_argument("--gpu", type=int, default=0, help="GPU 번호 (기본: 0)")
    parser.add_argument("--skip_preprocess", action="store_true", help="전처리 건너뛰기 (이미 완료된 경우)")
    parser.add_argument("--skip_training", action="store_true", help="학습 건너뛰기")
    parser.add_argument("--skip_test", action="store_true", help="합성 테스트 건너뛰기")
    parser.add_argument("--fp16", action="store_true", help="체크포인트 가중치를 fp16으로 변환 (용량 ~50%% 추가 절감)")
    return parser.parse_args()


def validate_args(args):
    if args.lr > 3e-6:
        print(f"  LR {args.lr} → 3e-6 (최대 허용값)")
        args.lr = 3e-6
    if args.epochs > 100:
        print(f"  Epochs {args.epochs} → 100 (최대 허용값)")
        args.epochs = 100
    audio = os.path.abspath(args.audio_path)
    if not os.path.isfile(audio):
        print(f"  오디오 파일을 찾을 수 없습니다: {audio}")
        sys.exit(1)
    args.audio_path = audio


def step_preprocess(audio_path, patient_id, data_dir):
    """[1/4] 오디오 변환 + Whisper 전사 + 분할"""
    wavs_dir = os.path.join(data_dir, "wavs")
    metadata_file = os.path.join(data_dir, "metadata.txt")
    os.makedirs(wavs_dir, exist_ok=True)

    wav_full = os.path.join(data_dir, f"{patient_id}_full.wav")
    print(f"\n  오디오 변환: {os.path.basename(audio_path)} → wav (22050Hz, mono)")
    subprocess.run(
        [FFMPEG_EXE, "-y", "-i", audio_path, "-ar", "22050", "-ac", "1", wav_full],
        check=True, capture_output=True,
    )

    duration_out = subprocess.run(
        [FFMPEG_EXE, "-i", wav_full],
        capture_output=True, text=True,
    )
    dur_match = re.search(r"Duration:\s*(\d+:\d+:\d+\.\d+)", duration_out.stderr)
    if dur_match:
        print(f"  원본 길이: {dur_match.group(1)}")

    print(f"\n  Whisper 전사 + 분할 (loudnorm 정규화, 2~12초)")
    subprocess.run(
        [
            PYTHON_EXE, os.path.join(PROJECT_ROOT, "build_dataset.py"),
            "--existing_audio", wav_full,
            "--wavs_dir", wavs_dir,
            "--metadata_file", metadata_file,
            "--whisper_model", "large-v3",
            "--language", "ko",
            "--min_duration", "2",
            "--max_duration", "12",
        ],
        check=True, cwd=PROJECT_ROOT,
    )

    if not os.path.isfile(metadata_file):
        return 0
    with open(metadata_file, "r", encoding="utf-8") as f:
        num = sum(1 for line in f if line.strip())
    return num


def find_latest_checkpoint(patient_id):
    """최신 run 디렉토리에서 가장 최근 full checkpoint (optimizer state 포함) 찾기"""
    latest_run = find_latest_run(patient_id)
    if not latest_run:
        return None

    # checkpoint_XXXX.pth 파일 중 가장 큰 step 번호 찾기 (full state 포함)
    import glob
    ckpts = glob.glob(os.path.join(latest_run, "checkpoint_*.pth"))
    if not ckpts:
        return None

    # step 번호로 정렬하여 최신 것 반환
    def get_step(path):
        base = os.path.basename(path)
        try:
            return int(base.replace("checkpoint_", "").replace(".pth", ""))
        except ValueError:
            return -1

    ckpts.sort(key=get_step)
    return ckpts[-1] if ckpts else None


def step_train(patient_id, data_dir, epochs, batch_size, lr, gpu, max_retries=5):
    """[2/4] 학습 실행 (중단 시 자동 재시작)"""
    env = os.environ.copy()
    env["CUDA_VISIBLE_DEVICES"] = str(gpu)

    restore_path = None
    for attempt in range(max_retries + 1):
        cmd = [
            PYTHON_EXE, os.path.join(PROJECT_ROOT, "train_gpt_xtts.py"),
            "--patient_id", patient_id,
            "--epochs", str(epochs),
            "--batch_size", str(batch_size),
            "--lr", str(lr),
            "--data_dir", data_dir,
        ]
        if restore_path:
            cmd.extend(["--restore_path", restore_path])

        label = f"(시도 {attempt + 1}/{max_retries + 1})"
        if restore_path:
            print(f"\n  {label} 체크포인트에서 이어받기: {os.path.basename(restore_path)}")
        else:
            print(f"\n  {label} 학습 시작")

        result = subprocess.run(cmd, cwd=PROJECT_ROOT, env=env)

        if result.returncode == 0:
            return  # 정상 완료

        print(f"\n  학습이 중단되었습니다 (exit code: {result.returncode})")

        if attempt < max_retries:
            # 최신 체크포인트 찾아서 이어받기 준비
            restore_path = find_latest_checkpoint(patient_id)
            if restore_path:
                print(f"  최신 체크포인트 발견: {os.path.basename(restore_path)}")
                print(f"  5초 후 자동 재시작...")
                time.sleep(5)
            else:
                print(f"  체크포인트를 찾을 수 없어 재시작 불가")
                raise RuntimeError("학습 실패: 체크포인트 없음")
        else:
            raise RuntimeError(f"학습 실패: {max_retries + 1}회 시도 후 포기")


def find_latest_run(patient_id=None):
    """최신 학습 run 디렉토리 찾기. patient_id 지정 시 해당 run만 검색."""
    run_dir = os.path.join(PROJECT_ROOT, "run", "training")
    if not os.path.isdir(run_dir):
        return None

    prefix = f"GPT_XTTS_v2.0_KO_FT_{patient_id}_" if patient_id else "GPT_XTTS_"
    runs = sorted([
        os.path.join(run_dir, d)
        for d in os.listdir(run_dir)
        if d.startswith(prefix) and os.path.isdir(os.path.join(run_dir, d))
    ])
    return runs[-1] if runs else None


def step_save(patient_id, data_dir, fp16=False):
    """[3/4] 모델 저장 + speaker reference 자동 선택 + 체크포인트 경량화"""
    ckpt_dir = os.path.join(PROJECT_ROOT, "checkpoints", patient_id)
    os.makedirs(ckpt_dir, exist_ok=True)

    latest_run = find_latest_run(patient_id) or find_latest_run()
    if not latest_run:
        raise FileNotFoundError("학습 결과를 찾을 수 없습니다.")

    best_pth = os.path.join(latest_run, "best_model.pth")
    config_json = os.path.join(latest_run, "config.json")
    if not os.path.isfile(best_pth):
        raise FileNotFoundError(f"best_model.pth가 없습니다: {latest_run}")

    dest_pth = os.path.join(ckpt_dir, "best_model.pth")
    shutil.copy2(best_pth, dest_pth)
    shutil.copy2(config_json, os.path.join(ckpt_dir, "config.json"))
    print(f"  best_model.pth + config.json 복사 완료")

    # 체크포인트 경량화 (optimizer state 제거, 선택적 fp16 변환)
    from prepare_checkpoints_for_demo import optimize_checkpoint
    optimize_checkpoint(dest_pth, fp16=fp16)

    orig_dir = os.path.join(PROJECT_ROOT, "run", "training", "XTTS_v2.0_original_model_files")
    for fname in ["vocab.json", "dvae.pth", "mel_stats.pth"]:
        src = os.path.join(orig_dir, fname)
        if os.path.isfile(src):
            shutil.copy2(src, os.path.join(ckpt_dir, fname))
    print(f"  vocab.json, dvae.pth, mel_stats.pth 복사 완료")

    wavs_dir = os.path.join(data_dir, "wavs")
    wav_files = []
    for f in os.listdir(wavs_dir):
        if f.startswith("audio") and f.endswith(".wav"):
            path = os.path.join(wavs_dir, f)
            size = os.path.getsize(path)
            dur = size / (22050 * 2)
            wav_files.append((dur, f, path))

    wav_files.sort(reverse=True)
    ref_names = ["speaker_ref.wav", "speaker_ref2.wav", "speaker_ref3.wav"]
    for i, (dur, fname, path) in enumerate(wav_files[:3]):
        shutil.copy2(path, os.path.join(ckpt_dir, ref_names[i]))
        print(f"  {ref_names[i]} ← {fname} ({dur:.1f}초)")

    return ckpt_dir


def step_test(patient_id, gpu):
    """[4/4] 합성 테스트"""
    env = os.environ.copy()
    env["CUDA_VISIBLE_DEVICES"] = str(gpu)

    subprocess.run(
        [
            PYTHON_EXE, os.path.join(PROJECT_ROOT, "trained_demo.py"),
            "--patient_id", patient_id,
            "--text", "안녕하세요. 잘 지내고 계신가요?",
        ],
        check=True, cwd=PROJECT_ROOT, env=env,
    )


def main():
    args = parse_args()

    print(f"\n{'#'*60}")
    print(f"  XTTS v2 한국어 화자 파인튜닝 파이프라인")
    print(f"  화자: {args.patient_id}")
    print(f"  음성: {args.audio_path}")
    print(f"  설정: epochs={args.epochs}, lr={args.lr}, GPU={args.gpu}")
    print(f"{'#'*60}")

    validate_args(args)

    data_dir = os.path.join(PROJECT_ROOT, "data", args.patient_id)
    start = time.time()

    # [1/4] 전처리
    if not args.skip_preprocess:
        print(f"\n{'='*60}")
        print(f"  [1/4] 음성 데이터 전처리")
        print(f"{'='*60}")
        num_segments = step_preprocess(args.audio_path, args.patient_id, data_dir)
        if num_segments == 0:
            print("\n  세그먼트가 생성되지 않았습니다. 오디오 파일을 확인하세요.")
            sys.exit(1)
        print(f"\n  전처리 완료: {num_segments}개 세그먼트")
    else:
        print("\n  [1/4] 전처리 건너뜀 (--skip_preprocess)")

    # [2/4] 학습
    if not args.skip_training:
        print(f"\n{'='*60}")
        print(f"  [2/4] 학습 시작 (epochs={args.epochs}, lr={args.lr})")
        print(f"{'='*60}")
        step_train(args.patient_id, data_dir, args.epochs, args.batch_size, args.lr, args.gpu)
        print(f"\n  학습 완료")
    else:
        print("\n  [2/4] 학습 건너뜀 (--skip_training)")

    # [3/4] 모델 저장
    print(f"\n{'='*60}")
    print(f"  [3/4] 모델 저장 + Speaker Reference 선택")
    print(f"{'='*60}")
    ckpt_dir = step_save(args.patient_id, data_dir, fp16=args.fp16)

    # [4/4] 합성 테스트
    if not args.skip_test:
        print(f"\n{'='*60}")
        print(f"  [4/4] 합성 테스트")
        print(f"{'='*60}")
        step_test(args.patient_id, args.gpu)
    else:
        print("\n  [4/4] 합성 테스트 건너뜀 (--skip_test)")

    elapsed = time.time() - start
    print(f"\n{'#'*60}")
    print(f"  파이프라인 완료! ({elapsed/60:.1f}분 소요)")
    print(f"{'#'*60}")
    print(f"  모델 위치:  checkpoints/{args.patient_id}/")
    print(f"  데이터 위치: data/{args.patient_id}/")
    print(f"\n  합성 테스트:")
    print(f"    python trained_demo.py --patient_id {args.patient_id} --text \"원하는 문장\"")
    print()


if __name__ == "__main__":
    main()
