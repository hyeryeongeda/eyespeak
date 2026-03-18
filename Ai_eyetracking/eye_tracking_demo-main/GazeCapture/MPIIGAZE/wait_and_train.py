"""Wait for cache build to complete, then run training."""
import time, subprocess, sys
from pathlib import Path

CACHE_DIR  = Path('C:/Users/SSAFY/Desktop/GAZE-CAPTURE/GazeCapture/MPIIGAZE/runs/aihub_cache')
TRAIN_SCRIPT = Path('C:/Users/SSAFY/Desktop/GAZE-CAPTURE/GazeCapture/MPIIGAZE/train_gaze_aihub.py')
LOG_PATH   = Path('C:/Users/SSAFY/Desktop/GAZE-CAPTURE/GazeCapture/MPIIGAZE/runs/gaze_aihub_train3.log')

NEEDED = ['train_eyes.npy', 'train_labels.npy', 'val_eyes.npy', 'val_labels.npy']

print('Waiting for cache files...', flush=True)
while True:
    missing = [f for f in NEEDED if not (CACHE_DIR / f).exists()]
    if not missing:
        break
    print(f'  Still waiting: {missing}', flush=True)
    time.sleep(30)

print('Cache ready! Starting training...', flush=True)
with open(LOG_PATH, 'w', encoding='utf-8') as log:
    proc = subprocess.Popen(
        [sys.executable, str(TRAIN_SCRIPT)],
        stdout=log, stderr=log,
        cwd=str(TRAIN_SCRIPT.parent),
    )
    print(f'Training started (PID {proc.pid})', flush=True)
    proc.wait()
    print(f'Training done (exit {proc.returncode})', flush=True)
