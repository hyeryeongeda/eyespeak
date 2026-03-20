#!/usr/bin/env python3
"""
AI Hub 안구 움직임 데이터 포맷 검사 스크립트 (2단계 2-1용)
샘플 폴더 경로를 인자로 주면 폴더 구조·파일 종류·메타데이터 후보를 출력한다.
사용법: python scripts/inspect_aihub_format.py /path/to/aihub_eye/sample/
"""

import argparse
import os
from pathlib import Path
from collections import defaultdict


def get_ext(path: Path) -> str:
    return path.suffix.lower() if path.suffix else "(no ext)"


def inspect_dir(root: Path, max_depth: int = 4, max_entries: int = 50) -> None:
    root = Path(root).resolve()
    if not root.is_dir():
        print(f"오류: 디렉터리가 아닙니다: {root}")
        return

    print("=" * 60)
    print("AI Hub(안구 움직임) 데이터 포맷 검사")
    print("=" * 60)
    print(f"샘플 경로: {root}\n")

    # 1. 폴더 구조 (제한된 깊이/개수)
    print("--- 폴더 구조 (상위 몇 단계) ---")
    seen_dirs = 0
    for dirpath, dirnames, filenames in os.walk(root):
        depth = len(Path(dirpath).relative_to(root).parts)
        if depth >= max_depth:
            dirnames.clear()
            continue
        indent = "  " * depth
        name = Path(dirpath).name or str(dirpath)
        if depth == 0:
            print(f"{indent}{name}/")
        else:
            print(f"{indent}{name}/")
        for d in sorted(dirnames)[:10]:
            print(f"{indent}  {d}/")
        if len(dirnames) > 10:
            print(f"{indent}  ... 외 {len(dirnames) - 10}개 디렉터리")
        seen_dirs += 1
        if seen_dirs > 20:
            print("  ... (생략)")
            break
    print()

    # 2. 파일 형식 통계
    print("--- 파일 형식 통계 ---")
    by_ext = defaultdict(list)
    meta_candidates = []
    for dirpath, _, filenames in os.walk(root):
        for f in filenames:
            path = Path(dirpath) / f
            ext = get_ext(path)
            by_ext[ext].append(path)
            if ext in (".csv", ".json", ".xml") or "meta" in path.name.lower():
                meta_candidates.append(path.relative_to(root))

    for ext in sorted(by_ext.keys(), key=lambda x: -len(by_ext[x])):
        paths = by_ext[ext]
        print(f"  {ext or '(없음)'}: {len(paths)}개")
        for p in paths[:3]:
            print(f"    예: {p.relative_to(root)}")
        if len(paths) > 3:
            print(f"    ... 외 {len(paths) - 3}개")
    print()

    # 3. 메타데이터 후보
    print("--- 메타데이터 후보 (CSV/JSON/XML) ---")
    if meta_candidates:
        for c in meta_candidates[:20]:
            print(f"  {c}")
        if len(meta_candidates) > 20:
            print(f"  ... 외 {len(meta_candidates) - 20}개")
    else:
        csv_json_xml = [p for paths in by_ext.values() for p in paths if get_ext(p) in (".csv", ".json", ".xml")]
        for p in csv_json_xml[:15]:
            print(f"  {p.relative_to(root)}")
        if not csv_json_xml:
            print("  (해당 확장자 파일 없음)")
    print()

    # 4. 영상/이미지 요약
    video_exts = {".mp4", ".avi", ".mov", ".mkv", ".webm"}
    image_exts = {".jpg", ".jpeg", ".png", ".bmp", ".gif"}
    videos = [p for paths in by_ext.values() for p in paths if get_ext(p) in video_exts]
    images = [p for paths in by_ext.values() for p in paths if get_ext(p) in image_exts]
    print("--- 영상/이미지 요약 ---")
    print(f"  영상 파일: {len(videos)}개 {tuple(video_exts)}")
    print(f"  이미지 파일: {len(images)}개 {tuple(image_exts)}")
    print()
    print("(위 결과를 PHASE2_DATA_STRATEGY.md 2-1 표에 옮겨 적고, 레이블 유무는 메타/XML 등 내용 확인 후 기입)")


def main():
    parser = argparse.ArgumentParser(description="AI Hub 안구 데이터 샘플 폴더 포맷 검사")
    parser.add_argument("sample_path", type=str, nargs="?", default="", help="샘플 폴더 경로 (예: /data/aihub_eye/sample/)")
    parser.add_argument("--max-depth", type=int, default=4, help="폴더 구조 출력 깊이")
    args = parser.parse_args()

    if not args.sample_path:
        print("사용법: python scripts/inspect_aihub_format.py /path/to/aihub_eye/sample/")
        print("샘플 폴더 경로를 인자로 넣어 실행하세요. (AI Hub 데이터에서 소량만 복사한 경로)")
        return
    inspect_dir(Path(args.sample_path), max_depth=args.max_depth)


if __name__ == "__main__":
    main()
