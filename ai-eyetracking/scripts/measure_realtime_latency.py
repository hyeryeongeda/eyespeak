#!/usr/bin/env python3
"""
실시간 지연 측정 (3-5). FPS, 캡처→그리드 반영 지연(ms).
사용법: python3 scripts/measure_realtime_latency.py [--camera 0] [--frames 100] [--checkpoint 경로]
"""

import argparse
import statistics
import sys
import time
from pathlib import Path

_root = Path(__file__).resolve().parent.parent
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))


def main():
    parser = argparse.ArgumentParser(description="아이트래킹 실시간 FPS·지연 측정")
    parser.add_argument("--camera", type=int, default=0, help="캠 인덱스 (기본 0)")
    parser.add_argument("--frames", type=int, default=100, help="측정 프레임 수 (기본 100)")
    parser.add_argument("--checkpoint", type=str, default=None, help="모델 체크포인트 경로")
    parser.add_argument("--output", type=str, default=None, help="결과 저장 경로 (JSON)")
    args = parser.parse_args()

    import cv2
    from pipeline import GazePipeline

    print(f"파이프라인 초기화 중... (checkpoint={args.checkpoint or '없음'})")
    pipeline = GazePipeline(checkpoint_path=args.checkpoint)

    cap = cv2.VideoCapture(args.camera)
    if not cap.isOpened():
        print(f"오류: 카메라 {args.camera} 열기 실패")
        sys.exit(1)

    # 워밍업 (첫 몇 프레임은 초기화 지연 제외)
    for _ in range(3):
        ret, frame = cap.read()
        if ret:
            pipeline.run(frame)

    latencies_ms = []
    detect_count = 0
    frame_count = 0
    t_start = time.perf_counter()

    print(f"측정 시작 ({args.frames}프레임)...")
    while frame_count < args.frames:
        ret, frame = cap.read()
        if not ret:
            print("캠에서 프레임 읽기 실패 — 중단")
            break
        t0 = time.perf_counter()
        result = pipeline.run(frame)
        t1 = time.perf_counter()

        latencies_ms.append((t1 - t0) * 1000)
        if result.get("left") is not None or result.get("right") is not None:
            detect_count += 1
        frame_count += 1

    cap.release()
    total_sec = time.perf_counter() - t_start

    if not latencies_ms:
        print("측정된 프레임 없음")
        return

    fps = frame_count / total_sec
    mean_ms = statistics.mean(latencies_ms)
    median_ms = statistics.median(latencies_ms)
    max_ms = max(latencies_ms)
    min_ms = min(latencies_ms)
    p95_ms = sorted(latencies_ms)[int(len(latencies_ms) * 0.95)]
    detect_rate = detect_count / frame_count * 100

    print(f"\n=== 실시간 지연 측정 결과 ({frame_count}프레임) ===")
    print(f"FPS:            {fps:.1f}")
    print(f"평균 지연:      {mean_ms:.1f} ms")
    print(f"중앙값 지연:    {median_ms:.1f} ms")
    print(f"P95 지연:       {p95_ms:.1f} ms")
    print(f"최대 지연:      {max_ms:.1f} ms")
    print(f"최소 지연:      {min_ms:.1f} ms")
    print(f"시선 감지율:    {detect_rate:.1f}% ({detect_count}/{frame_count})")

    if args.output:
        import json
        out = {
            "frames": frame_count,
            "fps": round(fps, 2),
            "mean_latency_ms": round(mean_ms, 2),
            "median_latency_ms": round(median_ms, 2),
            "p95_latency_ms": round(p95_ms, 2),
            "max_latency_ms": round(max_ms, 2),
            "min_latency_ms": round(min_ms, 2),
            "detect_rate_pct": round(detect_rate, 1),
        }
        Path(args.output).write_text(json.dumps(out, indent=2, ensure_ascii=False))
        print(f"결과 저장: {args.output}")


if __name__ == "__main__":
    main()
