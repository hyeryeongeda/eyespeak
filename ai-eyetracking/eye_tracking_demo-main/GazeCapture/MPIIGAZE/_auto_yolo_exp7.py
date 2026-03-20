
import os
os.environ['PYTHONIOENCODING'] = 'utf-8'
from ultralytics import YOLO
from pathlib import Path
model = YOLO('yolov8s.pt')
model.train(
    data=r'C:\Users\SSAFY\Desktop\GAZE-CAPTURE\GazeCapture\MPIIGAZE\yolo_dataset\dataset_exp7.yaml', epochs=50, imgsz=640, batch=16,
    workers=4, device=0, project=r'C:\Users\SSAFY\Desktop\GAZE-CAPTURE\GazeCapture\MPIIGAZE\runs\yolo', name='exp7',
    exist_ok=True, save=True, save_period=5, plots=True,
    optimizer='AdamW', lr0=0.001, lrf=0.1, momentum=0.937,
    weight_decay=0.0005, warmup_epochs=5.0,
    hsv_h=0.015, hsv_s=0.7, hsv_v=0.4, degrees=5.0, translate=0.1,
    scale=0.5, flipud=0.0, fliplr=0.5, mosaic=1.0, mixup=0.1,
    copy_paste=0.1, amp=True, patience=15, seed=42,
    verbose=True,
)
from ultralytics import YOLO as Y2
best = Y2(r'C:\Users\SSAFY\Desktop\GAZE-CAPTURE\GazeCapture\MPIIGAZE\runs\yolo/exp7/weights/best.pt')
best.export(format='onnx', imgsz=640, opset=17, simplify=True, dynamic=True)
print('DONE')
