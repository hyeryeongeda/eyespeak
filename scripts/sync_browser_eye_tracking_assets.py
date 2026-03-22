from __future__ import annotations

import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
MODEL_SOURCE = ROOT / 'ai-eyetracking' / 'checkpoints' / 'face_landmarker.task'
MODEL_TARGET = ROOT / 'frontend' / 'public' / 'models' / 'face_landmarker.task'
WASM_SOURCE = ROOT / 'frontend' / 'node_modules' / '@mediapipe' / 'tasks-vision' / 'wasm'
WASM_TARGET = ROOT / 'frontend' / 'public' / 'vendor' / 'mediapipe'


def ensure_directory(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def main() -> None:
    if not MODEL_SOURCE.is_file():
        raise FileNotFoundError(f'Model not found: {MODEL_SOURCE}')

    if not WASM_SOURCE.is_dir():
        raise FileNotFoundError(f'WASM runtime not found: {WASM_SOURCE}')

    ensure_directory(MODEL_TARGET.parent)
    ensure_directory(WASM_TARGET)

    shutil.copy2(MODEL_SOURCE, MODEL_TARGET)

    for item in WASM_SOURCE.iterdir():
        target = WASM_TARGET / item.name

        if item.is_dir():
            shutil.copytree(item, target, dirs_exist_ok=True)
        else:
            shutil.copy2(item, target)

    print(f'Synced model: {MODEL_SOURCE} -> {MODEL_TARGET}')
    print(f'Synced wasm : {WASM_SOURCE} -> {WASM_TARGET}')


if __name__ == '__main__':
    main()
