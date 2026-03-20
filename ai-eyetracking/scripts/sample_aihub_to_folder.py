#!/usr/bin/env python3
"""
AI Hub 안구 움직임 데이터 샘플링 스크립트
라벨링데이터/TL/G1 아래 참가자(001, 002, ...) 중 처음 N명만 복사해 샘플 폴더를 만든다.

source에 데이터 루트(033.안구 움직임 영상 데이터) 또는 1.Training 경로를 줄 수 있다.
- 루트를 주면 01.데이터/1.Training 을 자동으로 찾는다.
사용법:
  python scripts/sample_aihub_to_folder.py "C:/Users/SSAFY/Desktop/eye tracking data Ai hub/033.안구 움직임 영상 데이터" -n 2
  python scripts/sample_aihub_to_folder.py "/c/Users/SSAFY/Desktop/eye tracking data Ai hub/033.안구 움직임 영상 데이터" -n 2
  python scripts/sample_aihub_to_folder.py /path/to/1.Training --dest /path/to/eye_tracking_sample -n 2
"""

import argparse
import shutil
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(
        description="AI Hub 안구 데이터에서 참가자 N명만 복사해 샘플 폴더 생성 (라벨링데이터/TL/G1/001,002,...)"
    )
    parser.add_argument(
        "source",
        help="원본 경로: 데이터 루트(033.안구 움직임 영상 데이터) 또는 1.Training 폴더",
    )
    parser.add_argument(
        "--dest",
        default=None,
        help="샘플 저장 경로 (기본: source와 같은 위치의 eye_tracking_sample)",
    )
    parser.add_argument(
        "-n", "--num-participants",
        type=int,
        default=2,
        help="복사할 참가자 수 (001, 002, ... 순서, 기본 2)",
    )
    args = parser.parse_args()

    raw_src = Path(args.source).resolve()
    if not raw_src.is_dir():
        print(f"오류: 디렉터리가 아닙니다: {raw_src}")
        return 1

    # source가 데이터 루트(01.데이터 있음)면 01.데이터/1.Training 사용, 아니면 1.Training로 간주
    if (raw_src / "01.데이터" / "1.Training").is_dir():
        src = raw_src / "01.데이터" / "1.Training"
        data_root = raw_src
        print(f"데이터 루트 사용: {raw_src}")
        print(f"  → 1.Training: {src}")
    elif (raw_src / "라벨링데이터" / "TL" / "G1").is_dir():
        src = raw_src
        data_root = raw_src.parent.parent  # 01.데이터 기준 상위
        print(f"1.Training 경로 사용: {src}")
    else:
        print(f"오류: '01.데이터/1.Training' 또는 '라벨링데이터/TL/G1' 구조를 찾을 수 없습니다: {raw_src}")
        return 1

    dest = Path(args.dest).resolve() if args.dest else (data_root / "eye_tracking_sample")
    dest.mkdir(parents=True, exist_ok=True)

    # 라벨링데이터/TL/G1 아래 참가자 폴더 목록 (001, 002, ...)
    g1 = src / "라벨링데이터" / "TL" / "G1"
    if not g1.is_dir():
        print(f"오류: 경로를 찾을 수 없습니다: {g1}")
        return 1
    participants = sorted([p.name for p in g1.iterdir() if p.is_dir() and p.name.isdigit()])
    if not participants:
        print(f"오류: G1 아래 참가자 폴더(001, 002, ...)가 없습니다: {g1}")
        return 1
    to_copy = participants[: args.num_participants]
    print(f"복사할 참가자: {to_copy} (총 {len(participants)}명 중 상위 {len(to_copy)}명)")

    # 라벨링데이터/TL/G1/001, 002 복사
    dest_label = dest / "라벨링데이터" / "TL" / "G1"
    dest_label.mkdir(parents=True, exist_ok=True)
    for pid in to_copy:
        src_p = g1 / pid
        dst_p = dest_label / pid
        if dst_p.exists():
            shutil.rmtree(dst_p)
        shutil.copytree(src_p, dst_p)
        print(f"  라벨링: {pid}")

    # 같은 1.Training 아래 다른 상위 폴더(원본데이터 등)에 G1/001,002 구조가 있으면 동일하게 복사
    for top in src.iterdir():
        if not top.is_dir() or top.name == "라벨링데이터":
            continue
        other_g1 = top / "TL" / "G1"
        if not other_g1.is_dir():
            continue
        dest_other = dest / top.name / "TL" / "G1"
        dest_other.mkdir(parents=True, exist_ok=True)
        for pid in to_copy:
            src_p = other_g1 / pid
            if not src_p.is_dir():
                continue
            dst_p = dest_other / pid
            if dst_p.exists():
                shutil.rmtree(dst_p)
            shutil.copytree(src_p, dst_p)
        print(f"  {top.name}: {to_copy}")

    print(f"\n샘플 경로: {dest}")
    print("서버 업로드 시 프로젝트 폴더 안으로 올리기 (예: SSAFY 서버):")
    print('  scp -i KEY -r "로컬_eye_tracking_sample_경로" USER@HOST:~/yh_eyetracking_model/')
    return 0


if __name__ == "__main__":
    exit(main())
