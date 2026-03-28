#!/usr/bin/env python3
"""
L2CS 파인튜닝용 CSV 생성.
- 예시 CSV 출력 (--example)
- 이미지 폴더에서 path,yaw_deg,pitch_deg CSV 생성 (--from-images). 각도는 0,0으로 두고 나중에 수정.
- (선택) AI Hub 폴더에서 XML 파싱 시도 (--from-aihub). XML 필드명은 데이터에 따라 스크립트 수정 필요.

사용법:
  python3 scripts/build_l2cs_csv.py --example > data/l2cs_finetune_labels.csv.example
  python3 scripts/build_l2cs_csv.py --from-images data/faces --output data/l2cs_labels.csv
  python3 scripts/build_l2cs_csv.py --from-aihub /path/to/eye_tracking_sample --output data/aihub_labels.csv
"""

import argparse
import csv
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp"}


def write_example(out_path=None):
    rows = [
        ["path", "yaw_deg", "pitch_deg"],
        ["data/faces/001.jpg", "0.0", "0.0"],
        ["data/faces/002.jpg", "-10.5", "5.2"],
        ["data/faces/003.jpg", "12.0", "-8.0"],
    ]
    if out_path:
        out_path = Path(out_path)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w", newline="", encoding="utf-8") as f:
            csv.writer(f).writerows(rows)
        print(f"예시 CSV 저장: {out_path}", file=sys.stderr)
        return 0
    w = csv.writer(sys.stdout)
    w.writerows(rows)
    return 0


def from_images(img_dir: Path, output: Path, base_path: str = None):
    """이미지 폴더를 스캔해 path,yaw_deg,pitch_deg CSV 생성. 각도는 0,0."""
    img_dir = Path(img_dir).resolve()
    if not img_dir.is_dir():
        print(f"오류: 디렉터리가 아닙니다: {img_dir}", file=sys.stderr)
        return 1
    cwd = Path.cwd()
    paths = []
    for ext in IMAGE_EXTS:
        paths.extend(img_dir.glob(f"*{ext}"))
    paths = sorted(paths)
    if not paths:
        print(f"오류: 이미지 파일 없음 ({img_dir}, {IMAGE_EXTS})", file=sys.stderr)
        return 1
    output = Path(output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    with open(output, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["path", "yaw_deg", "pitch_deg"])
        w.writeheader()
        for p in paths:
            if base_path:
                path_str = base_path.rstrip("/") + "/" + p.name
            else:
                try:
                    path_str = str(p.relative_to(cwd))
                except ValueError:
                    path_str = str(p)
            w.writerow({"path": path_str, "yaw_deg": "0.0", "pitch_deg": "0.0"})
    print(f"총 {len(paths)}개 행 저장: {output}", file=sys.stderr)
    print("yaw_deg, pitch_deg 컬럼을 실제 각도로 수정한 뒤 finetune_gaze.py --data 로 사용하세요.", file=sys.stderr)
    return 0


def from_aihub(aihub_dir: Path, output: Path, image_dir: Path = None):
    """
    AI Hub 라벨링데이터(TL/G1/참가자/30|50|VR/*.xml)에서 XML을 찾아 시선 필드를 파싱해 CSV 생성.
    XML 스키마에 따라 태그명이 다를 수 있으므로, 샘플 XML 확인 후 아래 _parse_aihub_xml 내 태그를 수정.
    """
    import xml.etree.ElementTree as ET

    aihub_dir = Path(aihub_dir).resolve()
    if not aihub_dir.is_dir():
        print(f"오류: 디렉터리가 아닙니다: {aihub_dir}", file=sys.stderr)
        return 1
    xmls = list(aihub_dir.rglob("*.xml"))
    if not xmls:
        print(f"오류: XML 파일 없음: {aihub_dir}", file=sys.stderr)
        return 1
    image_dir = Path(image_dir).resolve() if image_dir else None
    rows = []
    for xpath in sorted(xmls)[:5000]:  # 상위 5000개만
        yaw_deg, pitch_deg = _parse_aihub_xml(xpath)
        if yaw_deg is None:
            continue
        # 대응 이미지 경로: XML과 같은 이름으로 확장자만 jpg 등. 또는 image_dir 기준.
        stem = xpath.stem
        if image_dir and image_dir.is_dir():
            for ext in IMAGE_EXTS:
                cand = image_dir / f"{stem}{ext}"
                if cand.exists():
                    path = str(cand.relative_to(Path.cwd()) if not cand.is_absolute() else cand)
                    rows.append({"path": path, "yaw_deg": f"{yaw_deg:.4f}", "pitch_deg": f"{pitch_deg:.4f}"})
                    break
            else:
                path = str(image_dir / f"{stem}.jpg")
                rows.append({"path": path, "yaw_deg": f"{yaw_deg:.4f}", "pitch_deg": f"{pitch_deg:.4f}"})
        else:
            path = str(xpath.with_suffix(".jpg"))
            rows.append({"path": path, "yaw_deg": f"{yaw_deg:.4f}", "pitch_deg": f"{pitch_deg:.4f}"})
    if not rows:
        print("파싱된 레이블 없음. XML 내용을 확인하고 _parse_aihub_xml() 내 태그명을 수정하세요.", file=sys.stderr)
        return 1
    output = Path(output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    with open(output, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["path", "yaw_deg", "pitch_deg"])
        w.writeheader()
        w.writerows(rows)
    print(f"총 {len(rows)}개 행 저장: {output}", file=sys.stderr)
    return 0


def _parse_aihub_xml(xml_path: Path):
    """
    AI Hub NIA_EYE XML에서 시선 각도 추출.
    실제 XML 스키마에 맞게 태그/속성명을 수정해야 할 수 있음.
    라디안이면 도로 변환.
    """
    import xml.etree.ElementTree as ET
    import math

    try:
        tree = ET.parse(xml_path)
        root = tree.getroot()
    except Exception:
        return None, None
    # 일반적으로 시선 필드 후보: gaze_yaw, gaze_pitch, yaw, pitch (라디안일 수 있음)
    yaw, pitch = None, None
    for tag in ("gaze_yaw", "yaw", "gaze_y", "head_pose_yaw"):
        el = root.find(f".//{tag}")
        if el is not None and el.text:
            try:
                yaw = float(el.text)
                break
            except ValueError:
                continue
    for tag in ("gaze_pitch", "pitch", "gaze_x", "head_pose_pitch"):
        el = root.find(f".//{tag}")
        if el is not None and el.text:
            try:
                pitch = float(el.text)
                break
            except ValueError:
                continue
    if yaw is None or pitch is None:
        return None, None
    # 라디안이면 도로 (|값| > 10 이면 라디안 가정)
    if abs(yaw) > 10 or abs(pitch) > 10:
        yaw = math.degrees(yaw)
        pitch = math.degrees(pitch)
    return yaw, pitch


def main():
    parser = argparse.ArgumentParser(description="L2CS 파인튜닝용 CSV 생성")
    parser.add_argument("--example", action="store_true", help="예시 CSV 출력")
    parser.add_argument("--example-out", type=str, default=None, help="예시 CSV 저장 경로")
    parser.add_argument("--from-images", type=str, default=None, metavar="DIR", help="이미지 폴더에서 CSV 생성 (각도 0,0)")
    parser.add_argument("--from-aihub", type=str, default=None, metavar="DIR", help="AI Hub 라벨 폴더에서 XML 파싱 후 CSV 생성")
    parser.add_argument("--image-dir", type=str, default=None, help="--from-aihub 시 대응 이미지 폴더 (없으면 XML 경로 기준)")
    parser.add_argument("--base-path", type=str, default=None, help="--from-images 시 path 접두사 (예: data/faces)")
    parser.add_argument("--output", "-o", type=str, default=None, help="출력 CSV 경로")
    args = parser.parse_args()

    if args.example or args.example_out is not None:
        return write_example(args.example_out)
    if args.from_images:
        out = args.output or "data/l2cs_labels.csv"
        return from_images(args.from_images, out, args.base_path)
    if args.from_aihub:
        out = args.output or "data/aihub_l2cs_labels.csv"
        return from_aihub(Path(args.from_aihub), Path(out), Path(args.image_dir) if args.image_dir else None)
    parser.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())
