"""MPIIGaze 스타일 디렉터리용 ``Dataset`` (이미지 + ``label.txt``)."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Callable, Dict, List, Optional, Tuple, Union

import numpy as np
import torch
from PIL import Image
from torch.utils.data import Dataset

logger = logging.getLogger(__name__)


def _parse_label_file(path: Path) -> Dict[str, Tuple[float, float]]:
    """``label.txt``를 ``파일명 → (yaw, pitch)`` 맵으로 파싱.

    한 줄 형식: ``<image_filename> <yaw> <pitch>`` (공백 구분).
    ``#`` 로 시작하는 줄과 빈 줄은 무시. 값은 라디안을 가정.

    Args:
        path: ``label.txt`` 경로.

    Returns:
        이미지 파일명(베이스네임) 키 맵.
    """
    out: Dict[str, Tuple[float, float]] = {}
    if not path.is_file():
        return out
    text = path.read_text(encoding="utf-8", errors="replace")
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split()
        if len(parts) < 3:
            continue
        name, ys, ps = parts[0], float(parts[1]), float(parts[2])
        out[Path(name).name] = (ys, ps)
    return out


class MPIIGazeDataset(Dataset):
    """디렉터리 구조: ``data_root/pXX/day01/*.jpg`` + 동일 폴더 ``label.txt``.

    ``label.txt``는 각 줄에 ``파일명 yaw_rad pitch_rad`` 형식이어야 한다.
    """

    def __init__(
        self,
        data_root: Union[str, Path],
        subject_id: int,
        transform: Optional[Callable[[Image.Image], torch.Tensor]] = None,
    ) -> None:
        """Args:
            data_root: 데이터 루트 (예: ``.../MPIIGaze/``).
            subject_id: 피험자 번호 (1 → ``p01``).
            transform: ``PIL.Image`` → 텐서. ``None``이면 ``CHW`` float ``[0,1]``만 적용.
        """
        self.data_root = Path(data_root)
        self.subject_id = subject_id
        self.transform = transform
        sub_dir = self.data_root / f"p{subject_id:02d}"
        self._items: List[Tuple[Path, float, float]] = []
        if not sub_dir.is_dir():
            logger.warning("Subject directory missing: %s", sub_dir)
        else:
            for day_dir in sorted(sub_dir.iterdir()):
                if not day_dir.is_dir():
                    continue
                labels = _parse_label_file(day_dir / "label.txt")
                for img_path in sorted(day_dir.glob("*.jpg")):
                    key = img_path.name
                    if key not in labels:
                        continue
                    y, p = labels[key]
                    self._items.append((img_path, y, p))
                for img_path in sorted(day_dir.glob("*.png")):
                    key = img_path.name
                    if key not in labels:
                        continue
                    y, p = labels[key]
                    self._items.append((img_path, y, p))
        logger.info(
            "MPIIGazeDataset p%02d: %s samples",
            subject_id,
            len(self._items),
        )

    def __len__(self) -> int:
        return len(self._items)

    def __getitem__(self, index: int) -> Tuple[torch.Tensor, torch.Tensor]:
        """Args:
            index: 샘플 인덱스.

        Returns:
            ``(eye_image_tensor, gaze_label_tensor)``. 라벨은 ``(2,)`` ``[yaw, pitch]``.
        """
        path, yaw, pitch = self._items[index]
        img = Image.open(path).convert("RGB")
        if self.transform is not None:
            eye_tensor = self.transform(img)
        else:
            arr = np.asarray(img, dtype=np.float32) / 255.0
            eye_tensor = torch.from_numpy(arr).permute(2, 0, 1)
        gaze_tensor = torch.tensor([yaw, pitch], dtype=torch.float32)
        return eye_tensor, gaze_tensor
