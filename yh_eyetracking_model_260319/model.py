"""
베이스 모델 인터페이스 (3-2). 눈/얼굴 이미지 → (yaw_rad, pitch_rad).
L2CS-Net(얼굴 입력) 또는 스텁 지원. 체크포인트 로드 시 추론.
"""

import math
import numpy as np

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False


def yaw_pitch_rad_to_deg(yaw_rad: float, pitch_rad: float) -> tuple:
    """라디안 → 도."""
    return (math.degrees(yaw_rad), math.degrees(pitch_rad))


def yaw_pitch_to_cell(yaw_deg: float, pitch_deg: float) -> int:
    """
    yaw, pitch(도) → 6그리드 셀 인덱스 0~5 (row-major).
    pitch 부호 규약: 양수 = 아래 봄(bottom row), 음수 = 위 봄(top row).
    config_gaze: yaw ±25°, pitch ±20°.
    """
    from config_gaze import GRID_YAW_RANGE, GRID_PITCH_RANGE, GRID_ROWS, GRID_COLS
    ny  = (yaw_deg   + GRID_YAW_RANGE)   / (2 * GRID_YAW_RANGE)
    np_ = (pitch_deg + GRID_PITCH_RANGE) / (2 * GRID_PITCH_RANGE)
    ny  = max(0.0, min(1.0, ny))
    np_ = max(0.0, min(1.0, np_))
    col = int(ny  * (GRID_COLS - 1) + 0.5)
    row = int(np_ * (GRID_ROWS - 1) + 0.5)   # 양수 pitch → 아래 row
    row = max(0, min(GRID_ROWS - 1, row))
    col = max(0, min(GRID_COLS - 1, col))
    return row * GRID_COLS + col


def cell_index_to_target_yaw_pitch(cell_index: int) -> tuple:
    """
    그리드 셀 인덱스(0 ~ GRID_NUM_CELLS-1)에 해당하는 목표 (yaw_deg, pitch_deg) 중심값.
    캘리브레이션 보정 매핑 시 "목표 각도"로 사용.
    """
    from config_gaze import GRID_YAW_RANGE, GRID_PITCH_RANGE, GRID_ROWS, GRID_COLS, GRID_NUM_CELLS
    if cell_index < 0 or cell_index >= GRID_NUM_CELLS:
        return (0.0, 0.0)
    row = cell_index // GRID_COLS
    col = cell_index % GRID_COLS
    # 셀 중심: col 0 = 왼쪽(yaw 최소), row 0 = 위(pitch 최대)
    yaw_center   = -GRID_YAW_RANGE   + (col + 0.5) * (2 * GRID_YAW_RANGE   / GRID_COLS)
    pitch_center = -GRID_PITCH_RANGE + (row + 0.5) * (2 * GRID_PITCH_RANGE / GRID_ROWS)
    return (yaw_center, pitch_center)


# L2CS-Net 전처리용
try:
    from models.l2cs_net import L2CSNet, IMAGENET_MEAN, IMAGENET_STD
    L2CS_AVAILABLE = True
except ImportError:
    L2CSNet = None
    IMAGENET_MEAN = [0.485, 0.456, 0.406]
    IMAGENET_STD = [0.229, 0.224, 0.225]
    L2CS_AVAILABLE = False


class GazeEstimator:
    """
    눈 이미지(RGB 224×224) 또는 얼굴 이미지(RGB 224×224) → (yaw_rad, pitch_rad).
    checkpoint_path 지정 시 L2CS-Net 로드 시도. L2CS는 얼굴 입력(face 모드).
    """

    def __init__(self, checkpoint_path: str = None, device: str = None):
        self.checkpoint_path = checkpoint_path
        self.device = device or ("cuda" if TORCH_AVAILABLE and torch.cuda.is_available() else "cpu")
        self.model = None
        self.use_face = False  # True면 파이프라인에서 얼굴 크롭 1회만 넣음
        if checkpoint_path and TORCH_AVAILABLE and L2CS_AVAILABLE:
            self._load_l2cs(checkpoint_path)

    def _remap_state_for_l2cs(self, state):
        """다른 L2CS 구현체 체크포인트 키를 우리 L2CSNet 형식으로 맞춤."""
        if not isinstance(state, dict):
            return state
        new_state = {}
        for k, v in state.items():
            key = k.replace("module.", "").replace("model.", "")
            new_state[key] = v
        return new_state

    def _load_l2cs(self, path: str):
        """L2CS-Net 체크포인트 로드. 실패 시 model=None 유지."""
        import os
        if not path or not os.path.isfile(path):
            return
        self.model = L2CSNet().to(self.device)
        try:
            state = torch.load(path, map_location=self.device, weights_only=False)
            if isinstance(state, dict) and "state_dict" in state:
                state = state["state_dict"]
            if not isinstance(state, dict):
                raise ValueError("state_dict not found")
            state = {k.replace("module.", ""): v for k, v in state.items()}
            state = self._remap_state_for_l2cs(state)
            # 백본만 맞으면 백본만 로드 (다른 레포 fc 구조가 다를 수 있음)
            our_sd = self.model.state_dict()
            loaded = {k: v for k, v in state.items() if k in our_sd and our_sd[k].shape == v.shape}
            if loaded:
                our_sd.update(loaded)
                self.model.load_state_dict(our_sd)
            else:
                self.model.load_state_dict(state, strict=False)
            self.model.eval()
            self.use_face = True
        except Exception as e:
            self.model = None
            self.use_face = False
            import warnings
            warnings.warn(f"L2CS-Net 체크포인트 로드 실패 (스텁 사용): {e}")

    def _preprocess_face(self, face_rgb: np.ndarray):
        """(224,224,3) uint8 RGB → (1,3,224,224) tensor, ImageNet norm."""
        if not TORCH_AVAILABLE or face_rgb is None or face_rgb.size == 0:
            return None
        x = torch.from_numpy(face_rgb).float().div(255.0)
        x = x.permute(2, 0, 1).unsqueeze(0)
        mean = torch.tensor(IMAGENET_MEAN).view(1, 3, 1, 1)
        std = torch.tensor(IMAGENET_STD).view(1, 3, 1, 1)
        x = (x - mean) / std
        return x.to(self.device)

    def __call__(self, image_rgb: np.ndarray) -> tuple:
        """
        image_rgb: (224, 224, 3) RGB uint8. 눈 크롭 또는 얼굴 크롭.
        Returns: (yaw_rad, pitch_rad)
        """
        if self.model is not None:
            x = self._preprocess_face(image_rgb)
            if x is not None:
                with torch.no_grad():
                    yaw_rad, pitch_rad = self.model(x)
                    yaw_rad = yaw_rad.cpu().item()
                    pitch_rad = pitch_rad.cpu().item()
                    return (float(yaw_rad), float(pitch_rad))
        return (0.0, 0.0)
