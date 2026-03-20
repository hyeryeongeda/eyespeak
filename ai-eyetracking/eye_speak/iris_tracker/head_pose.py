"""MediaPipe Face Mesh 랜드마크로 헤드포즈(yaw, pitch) 추정. solvePnP + Rodrigues."""

from __future__ import annotations

import math
from typing import List, Optional, Sequence, Tuple

import cv2
import numpy as np

HEAD_POSE_INDICES: List[int] = [4, 152, 33, 263, 61, 291]

FACE_3D_MODEL = np.array(
    [
        [0.0, 0.0, 0.0],
        [0.0, -63.6, -12.5],
        [-43.3, 32.7, -26.0],
        [43.3, 32.7, -26.0],
        [-28.9, -28.9, -24.0],
        [28.9, -28.9, -24.0],
    ],
    dtype=np.float64,
)


def head_pose_from_landmarks(
    landmarks_px: Optional[Sequence[Tuple[float, float]]],
    frame_width: int,
    frame_height: int,
) -> Tuple[Optional[float], Optional[float]]:
    """랜드마크에서 헤드 yaw/pitch(도)를 추정한다.

    Args:
        landmarks_px: MediaPipe 순서 ``(x, y)`` 픽셀 리스트.
        frame_width: 프레임 너비.
        frame_height: 프레임 높이.

    Returns:
        ``(yaw_deg, pitch_deg)`` 또는 실패 시 ``(None, None)``.
    """
    if not landmarks_px or len(landmarks_px) < max(HEAD_POSE_INDICES) + 1:
        return (None, None)
    points_2d = np.array(
        [[landmarks_px[i][0], landmarks_px[i][1]] for i in HEAD_POSE_INDICES],
        dtype=np.float64,
    )
    points_3d = FACE_3D_MODEL.copy()
    cam_matrix = np.array(
        [
            [frame_width, 0, frame_width / 2],
            [0, frame_height, frame_height / 2],
            [0, 0, 1],
        ],
        dtype=np.float64,
    )
    dist_coeffs = np.zeros((4, 1))
    success, rvec, tvec = cv2.solvePnP(
        points_3d,
        points_2d,
        cam_matrix,
        dist_coeffs,
        flags=cv2.SOLVEPNP_ITERATIVE,
    )
    if not success:
        return (None, None)
    rmat, _ = cv2.Rodrigues(rvec)
    pitch_rad = math.asin(max(-1.0, min(1.0, -rmat[2, 0])))
    cp = math.cos(pitch_rad)
    if abs(cp) > 1e-6:
        yaw_rad = math.atan2(rmat[2, 1] / cp, rmat[2, 2] / cp)
    else:
        yaw_rad = 0.0
    return (math.degrees(yaw_rad), math.degrees(pitch_rad))
