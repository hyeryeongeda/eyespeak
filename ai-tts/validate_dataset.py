"""
데이터셋 검증 스크립트
- wav 파일과 metadata.txt의 일관성 검증
- 실제 wav 길이 vs 메타데이터 기록 비교
- 빈 텍스트, 중복 텍스트, 짧은 오디오 탐지
- 수동 검수 지원: 문제 있는 항목 리스트업

실행: python validate_dataset.py --wavs_dir ./wavs_new --metadata_file ./wavs_new/metadata.txt
"""
import argparse
import os
import wave
from collections import Counter


def get_wav_duration(wav_path):
    """wav 파일의 실제 길이(초) 반환"""
    try:
        with wave.open(wav_path, 'rb') as wf:
            frames = wf.getnframes()
            rate = wf.getframerate()
            if rate == 0:
                return -1
            return frames / float(rate)
    except Exception:
        return -1


def load_metadata(metadata_file):
    """metadata.txt 파싱 → [(filename, text), ...]"""
    entries = []
    with open(metadata_file, "r", encoding="utf-8") as f:
        for line_no, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            parts = line.split("|")
            if len(parts) < 2:
                print(f"  ⚠️  라인 {line_no}: 파싱 실패 - '{line}'")
                continue
            entries.append((parts[0], parts[1], line_no))
    return entries


def validate(wavs_dir, metadata_file, min_duration=2.0, max_duration=12.0):
    """데이터셋 전체 검증"""
    print("=" * 60)
    print("데이터셋 검증 시작")
    print(f"  wavs_dir: {wavs_dir}")
    print(f"  metadata: {metadata_file}")
    print("=" * 60)

    if not os.path.exists(metadata_file):
        print(f"❌ metadata 파일이 없습니다: {metadata_file}")
        return

    entries = load_metadata(metadata_file)
    print(f"\n메타데이터 항목 수: {len(entries)}")

    # 실제 wav 파일 목록
    wav_files_on_disk = set()
    if os.path.isdir(wavs_dir):
        wav_files_on_disk = {f[:-4] for f in os.listdir(wavs_dir) if f.endswith('.wav')}
    print(f"디스크 wav 파일 수: {len(wav_files_on_disk)}")

    issues = []
    durations = []
    texts = []

    for filename, text, line_no in entries:
        wav_path = os.path.join(wavs_dir, f"{filename}.wav")

        # 1) wav 파일 존재 여부
        if not os.path.exists(wav_path):
            issues.append(f"[누락] 라인 {line_no}: {filename}.wav 파일 없음")
            continue

        # 2) wav 길이 검사
        dur = get_wav_duration(wav_path)
        if dur < 0:
            issues.append(f"[손상] 라인 {line_no}: {filename}.wav 읽기 실패")
            continue

        durations.append((filename, dur, text))

        if dur < min_duration:
            issues.append(f"[짧음] 라인 {line_no}: {filename}.wav = {dur:.1f}s (< {min_duration}s)")
        if dur > max_duration:
            issues.append(f"[긺] 라인 {line_no}: {filename}.wav = {dur:.1f}s (> {max_duration}s)")

        # 3) 빈 텍스트
        if not text.strip():
            issues.append(f"[빈텍스트] 라인 {line_no}: {filename}")

        texts.append(text.strip())

    # 4) 중복 텍스트 검사
    text_counts = Counter(texts)
    duplicates = {t: c for t, c in text_counts.items() if c > 1}
    if duplicates:
        for t, c in sorted(duplicates.items(), key=lambda x: -x[1])[:10]:
            issues.append(f"[중복] '{t[:40]}...' → {c}회 반복")

    # 5) metadata에 없지만 디스크에 있는 wav
    meta_filenames = {e[0] for e in entries}
    orphan_wavs = wav_files_on_disk - meta_filenames
    if orphan_wavs:
        for ow in sorted(orphan_wavs)[:10]:
            issues.append(f"[고아파일] {ow}.wav: 디스크에 있지만 metadata에 없음")
        if len(orphan_wavs) > 10:
            issues.append(f"  ... 외 {len(orphan_wavs) - 10}개 고아 파일")

    # 결과 출력
    print("\n" + "=" * 60)
    if not issues:
        print("✅ 검증 통과: 문제 없음!")
    else:
        print(f"⚠️  {len(issues)}개 문제 발견:")
        for issue in issues:
            print(f"  {issue}")

    if durations:
        total = sum(d for _, d, _ in durations)
        avg = total / len(durations)
        print(f"\n📊 유효 오디오 통계:")
        print(f"  유효 파일 수: {len(durations)}")
        print(f"  총 길이: {total:.1f}초 ({total/60:.1f}분)")
        print(f"  평균: {avg:.1f}초")
        print(f"  최소: {min(d for _, d, _ in durations):.1f}초")
        print(f"  최대: {max(d for _, d, _ in durations):.1f}초")
        if total / 60 < 15:
            print(f"\n  ⚠️  총 길이가 15분 미만입니다. 말투 학습에는 최소 15~20분을 권장합니다.")

    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="XTTS 데이터셋 검증")
    parser.add_argument("--wavs_dir", type=str, default="./wavs_new",
                        help="wav 파일 디렉토리 (기본: ./wavs_new)")
    parser.add_argument("--metadata_file", type=str, default="./wavs_new/metadata.txt",
                        help="메타데이터 파일 경로 (기본: ./wavs_new/metadata.txt)")
    parser.add_argument("--min_duration", type=float, default=2.0,
                        help="최소 유효 길이 (기본: 2.0초)")
    parser.add_argument("--max_duration", type=float, default=12.0,
                        help="최대 유효 길이 (기본: 12.0초)")
    args = parser.parse_args()

    validate(args.wavs_dir, args.metadata_file, args.min_duration, args.max_duration)


if __name__ == "__main__":
    main()
