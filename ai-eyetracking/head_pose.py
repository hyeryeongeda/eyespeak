"""
MediaPipe Face Mesh 랜드마크로 헤드포즈(yaw, pitch) 추정. solvePnP + Rodrigues.
"""

import math
import numpy as np
import cv2

# 헤드포즈용 랜드마크 인덱스: 코끝(4), 턱(152), 왼쪽 눈(33), 오른쪽 눈(263), 왼쪽 입(61), 오른쪽 입(291)
HEAD_POSE_INDICES = [4, 152, 33, 263, 61, 291]

# 3D 얼굴 모델 좌표 (mm, 대략적). 2D 순서와 동일: nose, chin, left_eye, right_eye, left_mouth, right_mouth
FACE_3D_MODEL = np.array([
    [0.0, 0.0, 0.0],           # nose tip
    [0.0, -63.6, -12.5],       # chin
    [-43.3, 32.7, -26.0],      # left eye left corner
    [43.3, 32.7, -26.0],       # right eye right corner
    [-28.9, -28.9, -24.0],     # left mouth
    [28.9, -28.9, -24.0],      # right mouth
], dtype=np.float64)


def head_pose_from_landmarks(landmarks_px, frame_width: int, frame_height: int):
    """
    landmarks_px: list of (x, y) 픽셀 좌표 (468개 MediaPipe 순서).
    Returns: (yaw_deg, pitch_deg) 또는 (None, None) 실패 시.
    """
    if not landmarks_px or len(landmarks_px) < max(HEAD_POSE_INDICES) + 1:
        return (None, None)
    points_2d = np.array([
        [landmarks_px[i][0], landmarks_px[i][1]]
        for i in HEAD_POSE_INDICES
    ], dtype=np.float64)
    points_3d = FACE_3D_MODEL.copy()

    cam_matrix = np.array([
        [frame_width, 0, frame_width / 2],
        [0, frame_height, frame_height / 2],
        [0, 0, 1],
    ], dtype=np.float64)
    dist_coeffs = np.zeros((4, 1))

    success, rvec, tvec = cv2.solvePnP(
        points_3d, points_2d, cam_matrix, dist_coeffs,
        flags=cv2.SOLVEPNP_ITERATIVE,
    )
    if not success:
        return (None, None)

    R, _ = cv2.Rodrigues(rvec)
    # R: 3x3 rotation. ZYX 오일러: pitch(X), yaw(Y), roll(Z)
    # pitch = asin(-R[2,0]), yaw = atan2(R[2,1]/cos(pitch), R[2,2]/cos(pitch))
    pitch_rad = math.asin(max(-1, min(1, -R[2, 0])))
    cp = math.cos(pitch_rad)
    if abs(cp) > 1e-6:
        yaw_rad = math.atan2(R[2, 1] / cp, R[2, 2] / cp)
    else:
        yaw_rad = 0.0
    yaw_deg = math.degrees(yaw_rad)
    pitch_deg = math.degrees(pitch_rad)
    return (yaw_deg, pitch_deg)
