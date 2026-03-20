"""
YOLOv8 홍채/흰자 검출 모델 학습
==================================
Classes:
  0: iris   (홍채/검은자)
  1: sclera (흰자/공막)

사용법:
  # 1단계: 데이터 준비
  python prepare_iris_yolo_data.py

  # 2단계: 학습
  python train_iris_yolo.py

  # (선택) 빠른 테스트용 소규모 학습
  python train_iris_yolo.py --epochs 10 --imgsz 640
"""

import argparse
from pathlib import Path

BASE    = Path(__file__).parent
DATASET = BASE / 'runs' / 'iris_yolo_dataset' / 'dataset.yaml'

def main(args):
    from ultralytics import YOLO

    if not DATASET.exists():
        raise FileNotFoundError(
            f'데이터셋을 찾을 수 없습니다: {DATASET}\n'
            'python prepare_iris_yolo_data.py 를 먼저 실행하세요.'
        )

    # 모델 선택: n(nano) → 웹 데모용 경량 모델
    model = YOLO('yolov8n.pt')

    results = model.train(
        data      = str(DATASET),
        epochs    = args.epochs,
        imgsz     = args.imgsz,
        batch     = args.batch,
        device    = args.device,
        project   = str(BASE / 'runs' / 'iris_yolo'),
        name      = 'train',
        # 학습률
        lr0       = 0.01,
        lrf       = 0.01,
        warmup_epochs = 3,
        # 증강
        hsv_h     = 0.015,
        hsv_s     = 0.3,
        hsv_v     = 0.3,
        flipud    = 0.0,
        fliplr    = 0.5,
        mosaic    = 0.5,
        # 조기 종료
        patience  = 30,
        # 저장
        save      = True,
        save_period = 10,
        # 기타
        workers   = 4,
        amp       = True,
        cache     = False,   # 디스크 여유 공간 절약
        verbose   = True,
    )

    # best.pt → ONNX 변환 (웹 데모용)
    best = Path(results.save_dir) / 'weights' / 'best.pt'
    if best.exists():
        print(f'\n[ONNX 변환] {best}', flush=True)
        model_best = YOLO(str(best))
        model_best.export(
            format  = 'onnx',
            imgsz   = args.imgsz,
            opset   = 12,
            simplify= True,
            dynamic = False,
        )
        onnx_out = best.with_suffix('.onnx')
        print(f'ONNX 저장: {onnx_out}', flush=True)
    else:
        print('best.pt 없음, ONNX 변환 건너뜀')

    print('\n학습 완료!')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--epochs', type=int, default=50)
    parser.add_argument('--imgsz',  type=int, default=640)
    parser.add_argument('--batch',  type=int, default=16)
    parser.add_argument('--device', type=str, default='0',
                        help='GPU index(0) 또는 cpu')
    args = parser.parse_args()
    main(args)
