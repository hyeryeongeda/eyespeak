"""시선 추정용 신경망: L2CS-Net, 경량 MobileGaze, GazeCapsNet(스텁)."""

from __future__ import annotations

import logging
import math
from typing import Tuple

import torch
import torch.nn as nn
from torchvision.models import resnet18, resnet50

logger = logging.getLogger(__name__)

# L2CS / ImageNet 정규화 (추론 전처리와 동일)
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


class L2CSNet(nn.Module):
    """얼굴 RGB ``(B,3,224,224)`` → ``(yaw_rad, pitch_rad)`` 각각 ``(B,)``.

    90-bin softmax 기대값으로 연속 각도(라디안)를 산출한다.
    """

    def __init__(self, num_bins: int = 90, arch: str = "ResNet18") -> None:
        super().__init__()
        arch_norm = str(arch).strip().lower()
        if arch_norm == "resnet50":
            resnet = resnet50(weights=None)
            feat_dim = 2048
        else:
            resnet = resnet18(weights=None)
            feat_dim = 512

        # backbone의 fc를 제거하고 feature extractor로 사용
        resnet.fc = nn.Identity()
        self.backbone = resnet
        self.fc_yaw = nn.Linear(feat_dim, num_bins)
        self.fc_pitch = nn.Linear(feat_dim, num_bins)
        self.num_bins = num_bins
        bin_centers_deg = [-99.0 + i * (198.0 / (num_bins - 1)) for i in range(num_bins)]
        bin_centers_rad = torch.tensor(
            [math.radians(d) for d in bin_centers_deg], dtype=torch.float32
        )
        self.register_buffer("bin_centers_rad", bin_centers_rad)

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """Args:
            x: ``(B, 3, 224, 224)``.

        Returns:
            ``yaw_rad``, ``pitch_rad`` 각각 ``(B,)``.
        """
        feat = self.backbone(x)
        if feat.ndim > 2:
            feat = feat.view(x.size(0), -1)
        yaw_logits = self.fc_yaw(feat)
        pitch_logits = self.fc_pitch(feat)
        yaw_rad = (torch.softmax(yaw_logits, dim=1) * self.bin_centers_rad).sum(dim=1)
        pitch_rad = (torch.softmax(pitch_logits, dim=1) * self.bin_centers_rad).sum(dim=1)
        return yaw_rad, pitch_rad


class MobileGaze(nn.Module):
    """경량 CNN: 눈/얼굴 작은 입력용. ``(B,3,64,64)`` → yaw/pitch (라디안, 회귀)."""

    def __init__(self, in_ch: int = 3, base: int = 32) -> None:
        super().__init__()
        c1, c2, c3, c4 = base, base * 2, base * 4, base * 8
        self.features = nn.Sequential(
            nn.Conv2d(in_ch, c1, 3, padding=1),
            nn.BatchNorm2d(c1),
            nn.ReLU(inplace=True),
            nn.Conv2d(c1, c2, 3, padding=1),
            nn.BatchNorm2d(c2),
            nn.ReLU(inplace=True),
            nn.Conv2d(c2, c3, 3, padding=1),
            nn.BatchNorm2d(c3),
            nn.ReLU(inplace=True),
            nn.Conv2d(c3, c4, 3, padding=1),
            nn.BatchNorm2d(c4),
            nn.ReLU(inplace=True),
        )
        self.pool = nn.AdaptiveAvgPool2d(1)
        self.fc = nn.Linear(c4, 2)

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """Args:
            x: ``(B, 3, 64, 64)`` 권장.

        Returns:
            ``(yaw_rad, pitch_rad)`` 각 ``(B,)``.
        """
        z = self.features(x)
        z = self.pool(z).flatten(1)
        out = self.fc(z)
        return out[:, 0], out[:, 1]


class GazeCapsNet(nn.Module):
    """캡슐 기반 시선 추정 스텁 (향후 라우팅·디코더 구현)."""

    def __init__(self) -> None:
        super().__init__()

    def forward(self, x: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor]:
        """Args:
            x: 입력 배치.

        Returns:
            Placeholder ``(yaw, pitch)`` — 실제 캡슐 동역학은 미구현.

        Note:
            # TODO: implement GazeCapsNet (dynamic routing, gaze capsule regression)
        """
        b = x.size(0)
        dev = x.device
        logger.debug("GazeCapsNet.forward: TODO stub returning zeros")
        # TODO: implement GazeCapsNet algorithm
        return torch.zeros(b, device=dev), torch.zeros(b, device=dev)
