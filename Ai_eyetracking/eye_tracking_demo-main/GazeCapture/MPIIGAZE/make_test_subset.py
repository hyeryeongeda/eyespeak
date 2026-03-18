"""Create small test subset to verify workers=4 speed."""
import os, random
from pathlib import Path

os.environ['PYTHONIOENCODING'] = 'utf-8'

BASE_DIR = Path('C:/Users/SSAFY/Desktop/GAZE-CAPTURE/GazeCapture/MPIIGAZE')
YOLO_DIR = BASE_DIR / 'yolo_dataset'

random.seed(42)
train_all = (YOLO_DIR / 'train.txt').read_text().strip().split('\n')
val_all   = (YOLO_DIR / 'val.txt').read_text().strip().split('\n')
random.shuffle(train_all)
random.shuffle(val_all)

(YOLO_DIR / 'train_test.txt').write_text('\n'.join(train_all[:500]))
(YOLO_DIR / 'val_test.txt').write_text('\n'.join(val_all[:200]))

yaml_path = YOLO_DIR / 'dataset_test.yaml'
yaml_path.write_text(f"""# Test subset (500 train / 200 val)
path: {str(YOLO_DIR).replace(chr(92), '/')}
train: train_test.txt
val:   val_test.txt
nc: 2
names:
  0: right_eye
  1: left_eye
""")
print('Test subset created: 500 train / 200 val')
print(f'YAML: {yaml_path}')

if __name__ == '__main__':
    pass
