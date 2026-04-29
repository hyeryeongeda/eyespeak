import argparse
import os
import sys
import subprocess
import torch
import yt_dlp

sys.stdout.reconfigure(line_buffering=True)
sys.stderr.reconfigure(line_buffering=True)
from faster_whisper import WhisperModel

# ── 필터링 기준값 ──
FILTER_MIN_LOGPROB = -0.8      # Whisper 전사 신뢰도 하한 (완화: 더 많은 세그먼트 확보)
FILTER_MIN_DURATION = 2.0      # 최소 세그먼트 길이 (초) - 짧은 세그먼트도 포함
FILTER_MAX_DURATION = 12.0     # 최대 세그먼트 길이 (초) - 긴 세그먼트도 포함
FILTER_MIN_TEXT_LEN = 4        # 전사 텍스트 최소 글자수 ("네" 같은 단답 제거)

FFMPEG_EXE = '/home/j-j14e205/.conda/envs/eyespeak/bin/ffmpeg'
FFMPEG_BIN_DIR = '/home/j-j14e205/.conda/envs/eyespeak/bin'


def download_youtube_audio(youtube_url, output_dir, index=1):
    """유튜브 영상에서 오디오만 다운로드. index로 파일명 구분."""
    print(f"\n유튜브 영상 다운로드 중 [{index}]: {youtube_url}")
    os.makedirs(output_dir, exist_ok=True)

    filename = f"youtube_audio_{index}"
    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': os.path.join(output_dir, f'{filename}.%(ext)s'),
        'ffmpeg_location': FFMPEG_BIN_DIR,
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
        }],
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([youtube_url])

    audio_path = os.path.join(output_dir, f'{filename}.mp3')
    print(f"다운로드 완료: {audio_path}")
    return audio_path


def load_whisper_model(whisper_model_name):
    """Whisper 모델을 한 번만 로드 (여러 오디오 처리 시 재사용)"""
    print(f"Whisper 모델 로딩 중: {whisper_model_name}")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    compute_type = "float16" if device == "cuda" else "int8"
    model = WhisperModel(whisper_model_name, device=device, compute_type=compute_type)
    print(f"사용 중인 디바이스: {device}")
    return model, device


def transcribe_audio(audio_path, model, language):
    """이미 로드된 Whisper 모델로 오디오 전사"""
    print(f"오디오 transcribe 중: {audio_path}")
    segments, info = model.transcribe(
        audio_path,
        language=language,
        word_timestamps=True,
    )
    segments_list = list(segments)

    print(f"  → {len(segments_list)}개의 원본 세그먼트")

    text_list = [segment.text for segment in segments_list]
    full_text = "".join(text_list)
    print(f"  → 텍스트 길이: {len(full_text)} 문자")
    print(f"  → 미리보기: {full_text[:200]}...")

    return segments_list


def filter_segments(segments_list,
                    min_logprob=FILTER_MIN_LOGPROB,
                    min_duration=FILTER_MIN_DURATION,
                    max_duration=FILTER_MAX_DURATION,
                    min_text_len=FILTER_MIN_TEXT_LEN):
    """세그먼트 품질 필터링: logprob, 길이, 텍스트 길이 기반"""
    filtered = []
    stats = {"total": len(segments_list), "low_confidence": 0,
             "too_short": 0, "too_long": 0, "short_text": 0, "passed": 0}

    for seg in segments_list:
        duration = seg.end - seg.start
        text = seg.text.strip()
        avg_logprob = seg.avg_logprob

        if avg_logprob < min_logprob:
            stats["low_confidence"] += 1
            continue
        if duration < min_duration:
            stats["too_short"] += 1
            continue
        if duration > max_duration:
            stats["too_long"] += 1
            continue
        if len(text) < min_text_len:
            stats["short_text"] += 1
            continue

        filtered.append(seg)
        stats["passed"] += 1

    print("\n" + "=" * 50)
    print("세그먼트 필터링 결과:")
    print(f"  원본: {stats['total']}개")
    print(f"  낮은 신뢰도 (logprob < {min_logprob}): {stats['low_confidence']}개 제거")
    print(f"  너무 짧음 (< {min_duration}s): {stats['too_short']}개 제거")
    print(f"  너무 긺 (> {max_duration}s): {stats['too_long']}개 제거")
    print(f"  텍스트 짧음 (< {min_text_len}자): {stats['short_text']}개 제거")
    print(f"  통과: {stats['passed']}개")
    print("=" * 50)

    return filtered


def split_audio_segments(audio_path, segments_list, wavs_dir, start_index=1, normalize=True):
    """
    세그먼트별 오디오 분할 + 정규화.
    start_index: 파일 번호 시작값 (여러 소스 합칠 때 이어서 번호 매기기용)
    반환: 성공 개수
    """
    print(f"\n오디오 세그먼트 분할 중... (정규화: {'ON' if normalize else 'OFF'}, 시작번호: {start_index})")
    os.makedirs(wavs_dir, exist_ok=True)

    success_count = 0
    for i, segment in enumerate(segments_list):
        file_index = start_index + i
        start = segment.start
        end = segment.end
        output_file = os.path.join(wavs_dir, f"audio{file_index}.wav")

        if normalize:
            af_filters = [
                "loudnorm=I=-23:LRA=7:TP=-2",
            ]
            af_str = ",".join(af_filters)
            command = [
                FFMPEG_EXE, "-y",
                "-i", audio_path,
                "-ss", str(start),
                "-to", str(end),
                "-af", af_str,
                "-ar", "22050",
                "-ac", "1",
                output_file
            ]
        else:
            command = [
                FFMPEG_EXE, "-y",
                "-i", audio_path,
                "-ss", str(start),
                "-to", str(end),
                "-ar", "22050",
                "-ac", "1",
                output_file
            ]

        if i == 0:
            print(f"  [디버그] 실행 명령어: {' '.join(command)}")

        try:
            subprocess.run(command, check=True, capture_output=True, text=True)
            success_count += 1
        except subprocess.CalledProcessError as e:
            print(f"에러 발생 (audio{file_index}): {e}")
            print(f"FFmpeg 에러 상세:\n{e.stderr}")
            continue

        if (i + 1) % 10 == 0:
            print(f"  {i+1}/{len(segments_list)} 세그먼트 처리 완료")

    print(f"  → {success_count}/{len(segments_list)}개 저장 완료")
    return success_count


def create_metadata(segments_list, metadata_file, start_index=1, mode="w"):
    """
    메타데이터 파일 생성 (LJSpeech 형식).
    mode="a"로 여러 소스 결과를 이어쓰기 가능.
    """
    print(f"\n메타데이터 {'추가' if mode == 'a' else '생성'} 중: {metadata_file}")

    with open(metadata_file, mode, encoding="utf-8") as f:
        for i, segment in enumerate(segments_list):
            file_index = start_index + i
            text = segment.text.strip()
            f.write(f"audio{file_index}|{text}|{text}\n")

    print(f"  → {len(segments_list)}개 항목 기록")


def print_dataset_summary(all_segments):
    """데이터셋 요약 통계 출력"""
    durations = [seg.end - seg.start for seg in all_segments]
    if not durations:
        print("데이터셋이 비어 있습니다.")
        return

    total_dur = sum(durations)
    avg_dur = total_dur / len(durations)

    print("\n" + "=" * 50)
    print("최종 데이터셋 요약:")
    print(f"  총 샘플 수: {len(durations)}")
    print(f"  총 길이: {total_dur:.1f}초 ({total_dur/60:.1f}분)")
    print(f"  평균 길이: {avg_dur:.1f}초")
    print(f"  최소/최대: {min(durations):.1f}초 / {max(durations):.1f}초")

    avg_logprob = sum(seg.avg_logprob for seg in all_segments) / len(all_segments)
    print(f"  평균 logprob: {avg_logprob:.3f}")

    if total_dur / 60 < 15:
        print(f"\n  ⚠️  총 {total_dur/60:.1f}분 — 말투 학습에는 최소 15~20분 권장")
    else:
        print(f"\n  ✅  충분한 데이터 길이 ({total_dur/60:.1f}분)")
    print("=" * 50)


def process_single_source(audio_path, whisper_model, language, args, start_index):
    """단일 오디오 소스 처리: 전사 → 필터링 → 분할. 필터링된 세그먼트 반환."""
    segments_list = transcribe_audio(audio_path, whisper_model, language)

    filtered = filter_segments(
        segments_list,
        min_logprob=args.min_logprob,
        min_duration=args.min_duration,
        max_duration=args.max_duration,
        min_text_len=args.min_text_len,
    )

    if not filtered:
        print("  → 이 소스에서 통과한 세그먼트 없음, 건너뜀")
        return []

    split_audio_segments(
        audio_path, filtered, args.wavs_dir,
        start_index=start_index,
        normalize=not args.no_normalize,
    )

    return filtered


def main():
    args = parse_args()

    print("=" * 60)
    print("XTTS 학습용 데이터셋 생성 (v2 - 필터링+정규화)")
    print("=" * 60)

    # 오디오 소스 목록 준비
    audio_paths = []

    if args.youtube_url:
        print(f"\n유튜브 URL {len(args.youtube_url)}개 다운로드 시작...")
        for idx, url in enumerate(args.youtube_url, 1):
            path = download_youtube_audio(url, args.output_dir, index=idx)
            audio_paths.append(path)

    if args.urls_file:
        with open(args.urls_file, "r", encoding="utf-8") as f:
            urls = [line.strip() for line in f if line.strip() and not line.startswith("#")]
        print(f"\nURL 파일에서 {len(urls)}개 로드: {args.urls_file}")
        offset = len(audio_paths)
        for idx, url in enumerate(urls, offset + 1):
            path = download_youtube_audio(url, args.output_dir, index=idx)
            audio_paths.append(path)

    if args.existing_audio:
        for path in args.existing_audio:
            if not os.path.exists(path):
                print(f"⚠️  파일 없음, 건너뜀: {path}")
                continue
            audio_paths.append(path)

    if not audio_paths:
        print("처리할 오디오 소스가 없습니다.")
        return

    print(f"\n총 {len(audio_paths)}개의 오디오 소스를 처리합니다.")

    # Whisper 모델 1회 로드
    whisper_model, device = load_whisper_model(args.whisper_model)

    # append 모드: 기존 메타데이터에서 마지막 번호를 찾아서 이어서 시작
    all_filtered = []
    current_index = 1

    if args.append and os.path.exists(args.metadata_file):
        with open(args.metadata_file, "r", encoding="utf-8") as f:
            lines = [l.strip() for l in f if l.strip()]
        if lines:
            import re
            nums = [int(m.group(1)) for l in lines if (m := re.match(r"audio(\d+)\|", l))]
            if nums:
                current_index = max(nums) + 1
                print(f"📎 Append 모드: 기존 {len(lines)}개 항목, audio{current_index}부터 시작")

    for src_idx, audio_path in enumerate(audio_paths, 1):
        print(f"\n{'─'*60}")
        print(f"[{src_idx}/{len(audio_paths)}] 처리 중: {audio_path}")
        print(f"{'─'*60}")

        filtered = process_single_source(
            audio_path, whisper_model, args.language, args, current_index
        )

        if filtered:
            write_mode = "a" if args.append or current_index > 1 else "w"
            create_metadata(filtered, args.metadata_file, start_index=current_index, mode=write_mode)
            current_index += len(filtered)
            all_filtered.extend(filtered)

    # Whisper 모델 해제
    del whisper_model
    if device == "cuda":
        torch.cuda.empty_cache()

    if not all_filtered:
        print("\n모든 소스에서 통과한 세그먼트가 없습니다. 필터 기준을 완화하세요.")
        return

    # 최종 요약
    print_dataset_summary(all_filtered)

    print("\n" + "=" * 60)
    print("데이터셋 생성 완료!")
    print("=" * 60)
    print(f"  오디오 파일: {args.wavs_dir}/")
    print(f"  메타데이터: {args.metadata_file}")
    print(f"  총 샘플 수: {len(all_filtered)}")
    print(f"  소스 수: {len(audio_paths)}개")
    print(f"\n⚠️  수동 검수를 권장합니다:")
    print(f"   python validate_dataset.py --wavs_dir {args.wavs_dir} --metadata_file {args.metadata_file}")


def parse_args():
    parser = argparse.ArgumentParser(
        description="XTTS 학습용 데이터셋 생성 (v2: 여러 소스 지원, 필터링 + 오디오 정규화)"
    )

    # 소스 옵션 (여러 개 가능)
    parser.add_argument("--youtube_url", type=str, nargs="+", default=None,
                        help="유튜브 URL (여러 개 가능: --youtube_url URL1 URL2 URL3)")
    parser.add_argument("--urls_file", type=str, default=None,
                        help="유튜브 URL 목록 텍스트 파일 (한 줄에 하나씩, #으로 주석)")
    parser.add_argument("--existing_audio", type=str, nargs="+", default=None,
                        help="기존 오디오 파일 경로 (여러 개 가능)")

    # 출력 설정
    parser.add_argument("--output_dir", type=str, default="./data",
                        help="다운로드 오디오 저장 디렉토리 (기본: ./data)")
    parser.add_argument("--wavs_dir", type=str, default="./wavs_new",
                        help="분할 오디오 저장 디렉토리 (기본: ./wavs_new)")
    parser.add_argument("--metadata_file", type=str, default="./wavs_new/metadata.txt",
                        help="메타데이터 파일 경로 (기본: ./wavs_new/metadata.txt)")
    parser.add_argument("--whisper_model", type=str, default="large-v3",
                        help="Whisper 모델 (기본: large-v3)")
    parser.add_argument("--language", type=str, default="ko",
                        help="전사 언어 코드 (기본: ko)")

    # 필터링 파라미터
    parser.add_argument("--min_logprob", type=float, default=FILTER_MIN_LOGPROB,
                        help=f"최소 avg_logprob (기본: {FILTER_MIN_LOGPROB})")
    parser.add_argument("--min_duration", type=float, default=FILTER_MIN_DURATION,
                        help=f"최소 세그먼트 길이 초 (기본: {FILTER_MIN_DURATION})")
    parser.add_argument("--max_duration", type=float, default=FILTER_MAX_DURATION,
                        help=f"최대 세그먼트 길이 초 (기본: {FILTER_MAX_DURATION})")
    parser.add_argument("--min_text_len", type=int, default=FILTER_MIN_TEXT_LEN,
                        help=f"최소 텍스트 길이 (기본: {FILTER_MIN_TEXT_LEN})")

    # 정규화 옵션
    parser.add_argument("--no_normalize", action="store_true",
                        help="오디오 정규화 비활성화")

    # 추가 모드
    parser.add_argument("--append", action="store_true",
                        help="기존 데이터셋에 이어서 추가 (metadata, wav 번호 이어가기)")

    args = parser.parse_args()

    if not args.youtube_url and not args.urls_file and not args.existing_audio:
        parser.error("--youtube_url, --urls_file, --existing_audio 중 하나 이상 지정해야 합니다.")

    return args


if __name__ == "__main__":
    main()
