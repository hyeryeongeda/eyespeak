#!/usr/bin/env python3
"""
오프라인 정확도 측정 (3-4). 각도 오차(MAE), 그리드 정확도.
입력 CSV 형식: path,yaw_deg,pitch_deg  (헤더 필수)
사용법: python3 scripts/measure_offline_accuracy.py --data labels.csv [--checkpoint 경로] [--output result.json]
"""

import argparse
import csv
import sys
from pathlib import Path

_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))


def main():
    parser = argparse.ArgumentParser(description="아이트래킹 오프라인 정확도 측정")
    parser.add_argument("--data", type=str, required=True,
                        help="레이블 CSV (columns: path,yaw_deg,pitch_deg)")
    parser.add_argument("--checkpoint", type=str, default=None, help="모델 체크포인트 경로")
    parser.add_argument("--output", type=str, default=None, help="결과 저장 경로 (JSON)")
    args = parser.parse_args()

    data_path = Path(args.data)
    if not data_path.is_file():
        print(f"오류: 데이터 파일 없음 → {data_path}")
        sys.exit(1)

    import cv2
    from eye_speak.pipeline import GazePipeline

    def yaw_pitch_to_cell(yaw_deg, pitch_deg, yaw_range=25.0, pitch_range=20.0, rows=2, cols=3):
        ny = max(0.0, min(1.0, (yaw_deg + yaw_range) / (2 * yaw_range)))
        np_ = max(0.0, min(1.0, (pitch_deg + pitch_range) / (2 * pitch_range)))
        col = max(0, min(cols - 1, int(ny * (cols - 1) + 0.5)))
        row = max(0, min(rows - 1, int(np_ * (rows - 1) + 0.5)))
        return row * cols + col

    print(f"파이프라인 초기화 중... (checkpoint={args.checkpoint or '없음'})")
    pipeline = GazePipeline(checkpoint_path=args.checkpoint)

    rows = []
    with open(data_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)
    print(f"총 샘플: {len(rows)}개")

    yaw_errors = []
    pitch_errors = []
    cell_correct = 0
    skip_count = 0
    cell_changes = 0
    prev_pred_cell = None

    for i, row in enumerate(rows):
        img_path = row.get("path", "").strip()
        try:
            gt_yaw = float(row["yaw_deg"])
            gt_pitch = float(row["pitch_deg"])
        except (KeyError, ValueError):
            skip_count += 1
            continue

        frame = cv2.imread(img_path)
        if frame is None:
            skip_count += 1
            continue

        result = pipeline.run(frame)
        pred = result.get("left") or result.get("right")
        if pred is None:
            skip_count += 1
            continue

        gt_cell = yaw_pitch_to_cell(gt_yaw, gt_pitch)
        yaw_errors.append(abs(pred["yaw"] - gt_yaw))
        pitch_errors.append(abs(pred["pitch"] - gt_pitch))
        if pred["cell"] == gt_cell:
            cell_correct += 1
        if prev_pred_cell is not None and pred["cell"] != prev_pred_cell:
            cell_changes += 1
        prev_pred_cell = pred["cell"]

        if (i + 1) % 50 == 0:
            print(f"  진행: {i + 1}/{len(rows)} ...")

    total = len(yaw_errors)
    if total == 0:
        print("유효한 샘플 없음 (이미지 로드 실패 또는 시선 감지 실패)")
        return

    mae_yaw = sum(yaw_errors) / total
    mae_pitch = sum(pitch_errors) / total
    grid_acc = cell_correct / total * 100
    pairs = max(1, total - 1)
    cell_transition_rate = cell_changes / pairs

    print(f"\n=== 오프라인 정확도 측정 결과 ({total}/{len(rows)} 유효, {skip_count} 스킵) ===")
    print(f"MAE yaw:        {mae_yaw:.2f}°")
    print(f"MAE pitch:      {mae_pitch:.2f}°")
    print(f"그리드 정확도:  {grid_acc:.1f}%  ({cell_correct}/{total})")
    print(f"셀 전환률:      {cell_transition_rate:.3f}  (연속 프레임 간 셀 변경 비율, 낮을수록 안정)")

    if args.output:
        import json
        out = {
            "total_samples": len(rows),
            "valid_samples": total,
            "skipped": skip_count,
            "mae_yaw_deg": round(mae_yaw, 3),
            "mae_pitch_deg": round(mae_pitch, 3),
            "grid_accuracy_pct": round(grid_acc, 1),
            "cell_correct": cell_correct,
            "cell_transition_rate": round(cell_transition_rate, 4),
        }
        Path(args.output).write_text(json.dumps(out, indent=2, ensure_ascii=False))
        print(f"결과 저장: {args.output}")


if __name__ == "__main__":
    main()
