import argparse
import os
import shutil
import subprocess
import torch
import yt_dlp
from faster_whisper import WhisperModel


# FFmpeg 실행 파일 경로: 환경변수 FFMPEG_PATH가 있으면 사용, 없으면 PATH에서 자동 탐색
def _find_ffmpeg() -> str:
    env_path = os.environ.get("FFMPEG_PATH")
    if env_path and os.path.isfile(env_path):
        return env_path
    found = shutil.which("ffmpeg")
    if found:
        return found
    raise FileNotFoundError(
        "ffmpeg를 찾을 수 없습니다. PATH에 ffmpeg를 추가하거나 "
        "환경변수 FFMPEG_PATH=/path/to/ffmpeg 로 지정하세요."
    )


# 세그먼트 필터링 기준 (XTTS v2 GPTArgs 설정과 일치)
FILTER_MIN_DURATION = 1.0    # 초
FILTER_MAX_DURATION = 11.6   # 초 (max_wav_length=255995 @ 22050Hz)
FILTER_MIN_LOGPROB  = -1.0   # avg_logprob 하한 (Whisper 품질 지표)
FILTER_MAX_TEXT_LEN = 200    # 문자 수 (max_text_length=200)

def download_youtube_audio(youtube_url, output_dir):
    """유튜브 영상에서 오디오만 다운로드"""
    print(f"유튜브 영상 다운로드 중: {youtube_url}")
    os.makedirs(output_dir, exist_ok=True)

    ffmpeg_exe = _find_ffmpeg()
    ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': os.path.join(output_dir, 'downloaded_youtube_audio.%(ext)s'),
            'ffmpeg_location': os.path.dirname(ffmpeg_exe),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
            }],
        }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([youtube_url])

    audio_path = os.path.join(output_dir, 'downloaded_youtube_audio.mp3')
    print(f"다운로드 완료: {audio_path}")
    return audio_path


def transcribe_audio(audio_path, whisper_model, language):
    """Whisper를 사용하여 오디오 transcribe"""
    print(f"Whisper 모델 로딩 중: {whisper_model}")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    compute_type = "float16" if device == "cuda" else "int8"

    model = WhisperModel(whisper_model, device=device, compute_type=compute_type)
    print(f"사용 중인 디바이스: {device}")

    print(f"오디오 transcribe 중: {audio_path}")
    segments, info = model.transcribe(audio_path, language=language)
    segments_list = list(segments)

    # 모델을 명시적으로 해제하여 CUDA 가비지 컬렉션 충돌 방지
    del model
    if device == "cuda":
        torch.cuda.empty_cache()

    print(f"총 {len(segments_list)}개의 세그먼트를 찾았습니다. (필터링 전)")

    # 전체 텍스트 출력
    text_list = [segment.text for segment in segments_list]
    full_text = "".join(text_list)
    print(f"\n전체 텍스트 길이: {len(full_text)} 문자")
    print(f"전체 텍스트 미리보기:\n{full_text[:300]}...\n")

    return segments_list


def filter_segments(segments_list):
    """XTTS v2 학습 기준에 맞는 세그먼트만 남깁니다.

    기준:
      - 길이: 1.0s ~ 11.6s
      - 품질: avg_logprob >= -1.0  (Whisper 신뢰도)
      - 텍스트: 200자 이하
    """
    kept, dropped = [], []
    for seg in segments_list:
        duration = seg.end - seg.start
        text = seg.text.strip()
        reasons = []

        if not (FILTER_MIN_DURATION <= duration <= FILTER_MAX_DURATION):
            reasons.append(f"duration={duration:.2f}s")
        if seg.avg_logprob < FILTER_MIN_LOGPROB:
            reasons.append(f"avg_logprob={seg.avg_logprob:.3f}")
        if len(text) > FILTER_MAX_TEXT_LEN:
            reasons.append(f"text_len={len(text)}")
        if not text:
            reasons.append("empty_text")

        if reasons:
            dropped.append((seg, reasons))
        else:
            kept.append(seg)

    print(f"필터링 결과: {len(kept)}개 통과 / {len(dropped)}개 제거")
    for seg, reasons in dropped[:10]:  # 최대 10개만 출력
        print(f"  [제거] {seg.start:.1f}s~{seg.end:.1f}s | {', '.join(reasons)} | {seg.text.strip()[:40]}")
    if len(dropped) > 10:
        print(f"  ... 외 {len(dropped) - 10}개 생략")

    return kept


import subprocess  # 코드 맨 위 import 문에 추가되어 있는지 확인하세요!

def split_audio_segments(audio_path, segments_list, wavs_dir):
    """세그먼트별로 오디오 파일 분할"""
    print(f"\n오디오 세그먼트 분할 중...")
    os.makedirs(wavs_dir, exist_ok=True)

    ffmpeg_exe = _find_ffmpeg()

    for i, segment in enumerate(segments_list):
        start = segment.start
        end = segment.end
        output_file = os.path.join(wavs_dir, f"audio{i+1}.wav")

        command = [
            ffmpeg_exe,
            "-y",
            "-i", audio_path,
            "-ss", str(start),
            "-to", str(end),
            output_file
        ]

        if i == 0:
            print(f"  [디버그] 실행 명령어: {' '.join(command)}")

        try:
            subprocess.run(command, check=True, capture_output=True, text=True)
        except subprocess.CalledProcessError as e:
            print(f"에러 발생 (audio{i+1}): {e}")
            print(f"FFmpeg 에러 상세:\n{e.stderr}")
            break  # 첫 에러에서 멈추고 확인

        if (i + 1) % 10 == 0:
            print(f"  {i+1}/{len(segments_list)} 세그먼트 처리 완료")

    print(f"총 {len(segments_list)}개의 오디오 파일이 {wavs_dir}에 저장되었습니다.")


def create_metadata(segments_list, metadata_file):
    """메타데이터 파일 생성 (LJSpeech 형식)"""
    print(f"\n메타데이터 파일 생성 중: {metadata_file}")

    with open(metadata_file, "w", encoding="utf-8") as f:
        for i, segment in enumerate(segments_list):
            text = segment.text.strip()
            f.write(f"audio{i+1}|{text}|{text}\n")

    print(f"메타데이터 파일 생성 완료: {metadata_file}")

    # 처음 5개 샘플 출력
    print("\n처음 5개 메타데이터 샘플:")
    with open(metadata_file, "r", encoding="utf-8") as f:
        for i, line in enumerate(f):
            if i < 5:
                print(f"  {line.strip()}")


def main():
    args = parse_args()

    print("=" * 60)
    print("XTTS 학습용 데이터셋 생성 시작")
    print("=" * 60)

    # 1. 오디오 파일 준비 (유튜브 다운로드 또는 기존 파일 사용)
    if args.youtube_url:
        audio_path = download_youtube_audio(args.youtube_url, args.output_dir)
    elif args.existing_audio:
        audio_path = args.existing_audio
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"오디오 파일을 찾을 수 없습니다: {audio_path}")
        print(f"기존 오디오 파일 사용: {audio_path}")
    else:
        raise ValueError("--youtube_url 또는 --existing_audio 중 하나를 반드시 지정해야 합니다.")

    # 2. Whisper로 transcribe
    segments_list = transcribe_audio(audio_path, args.whisper_model, args.language)
    print(f"[디버그] transcribe 완료, segments_list 타입: {type(segments_list)}, 길이: {len(segments_list)}")

    # 3. 세그먼트 필터링 (길이·품질·텍스트 길이)
    segments_list = filter_segments(segments_list)
    if not segments_list:
        raise ValueError("필터링 후 남은 세그먼트가 없습니다. 녹음 품질이나 필터 기준을 확인하세요.")

    # 4. 오디오 세그먼트 분할
    print("[디버그] split_audio_segments 호출 직전")
    try:
        split_audio_segments(audio_path, segments_list, args.wavs_dir)
    except Exception as e:
        import traceback
        print(f"split_audio_segments 에러: {e}")
        traceback.print_exc()
        raise

    # 5. 메타데이터 파일 생성
    create_metadata(segments_list, args.metadata_file)

    print("\n" + "=" * 60)
    print("데이터셋 생성 완료!")
    print("=" * 60)
    print(f"오디오 파일: {args.wavs_dir}")
    print(f"메타데이터: {args.metadata_file}")
    print(f"총 샘플 수: {len(segments_list)}")


def parse_args():
    parser = argparse.ArgumentParser(
        description="유튜브 영상을 다운로드하거나 기존 오디오 파일을 사용하여 Whisper로 transcribe하고 XTTS 학습용 데이터셋을 생성합니다."
    )
    parser.add_argument(
        "--youtube_url",
        type=str,
        default=None,
        help="다운로드할 유튜브 영상의 URL (--existing_audio와 함께 사용할 수 없음)"
    )
    parser.add_argument(
        "--existing_audio",
        type=str,
        default=None,
        help="기존 오디오 파일 경로 (예: ./data/my_voice_audio.mp3). --youtube_url과 함께 사용할 수 없음"
    )
    parser.add_argument(
        "--output_dir",
        type=str,
        default="./data",
        help="다운로드한 오디오를 저장할 디렉토리 (기본값: ./data)"
    )
    parser.add_argument(
        "--wavs_dir",
        type=str,
        default="./wavs",
        help="분할된 오디오 파일을 저장할 디렉토리 (기본값: ./wavs)"
    )
    parser.add_argument(
        "--metadata_file",
        type=str,
        default="./wavs/metadata.txt",
        help="메타데이터 파일 경로 (기본값: ./wavs/metadata.txt)"
    )
    parser.add_argument(
        "--whisper_model",
        type=str,
        default="large-v3",
        help="사용할 Whisper 모델 (기본값: large-v3)"
    )
    parser.add_argument(
        "--language",
        type=str,
        default="ko",
        help="transcribe할 언어 코드 (기본값: ko)"
    )

    args = parser.parse_args()

    # 유효성 검사: 둘 중 하나만 선택해야 함
    if args.youtube_url and args.existing_audio:
        parser.error("--youtube_url과 --existing_audio를 동시에 사용할 수 없습니다. 둘 중 하나만 선택하세요.")

    if not args.youtube_url and not args.existing_audio:
        parser.error("--youtube_url 또는 --existing_audio 중 하나를 반드시 지정해야 합니다.")

    return args


if __name__ == "__main__":
    main()

