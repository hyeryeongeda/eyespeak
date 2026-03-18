"""
L2CS-Net: 얼굴 이미지 → (yaw_rad, pitch_rad).
원본 논문 방식: ResNet18 백본 + 90-bin softmax + expectation (가중 합산).
  - 90개 빈: ±99° 범위, 빈 간격 약 2.2°
  - forward: softmax(logits) * bin_centers → scalar 각도(rad)
  - 이 방식이 직접 회귀보다 안정적이고 공식 체크포인트와 구조 호환.
입력 224×224 RGB.
"""

import torch
import torch.nn as nn
from torchvision.models import resnet18


class L2CSNet(nn.Module):
    """
    Face image (B, 3, 224, 224) → (yaw_rad (B,), pitch_rad (B,)).
    90-bin softmax expectation: 각 빈 확률 * 빈 중심각 합산 → 연속 각도.
    """

    def __init__(self, num_bins: int = 90):
        super().__init__()
        resnet = resnet18(weights=None)
        # avgpool까지 포함, fc 제외 → (B, 512, 1, 1) 출력
        self.backbone = nn.Sequential(*list(resnet.children())[:-1])
        self.fc_yaw = nn.Linear(512, num_bins)
        self.fc_pitch = nn.Linear(512, num_bins)
        self.num_bins = num_bins

        # 빈 중심: -99° ~ +99° 를 num_bins 등분 → 라디안으로 등록
        import math
        bin_centers_deg = [
            -99.0 + i * (198.0 / (num_bins - 1)) for i in range(num_bins)
        ]
        bin_centers_rad = torch.tensor(
            [math.radians(d) for d in bin_centers_deg], dtype=torch.float32
        )
        self.register_buffer("bin_centers_rad", bin_centers_rad)  # (num_bins,)

    def forward(self, x: torch.Tensor):
        """
        x: (B, 3, 224, 224)
        Returns: (yaw_rad, pitch_rad) 각각 (B,) 텐서.
        """
        feat = self.backbone(x).view(x.size(0), -1)          # (B, 512)
        yaw_logits = self.fc_yaw(feat)                        # (B, num_bins)
        pitch_logits = self.fc_pitch(feat)                    # (B, num_bins)
        # softmax + expectation
        yaw_rad = (torch.softmax(yaw_logits, dim=1) * self.bin_centers_rad).sum(dim=1)
        pitch_rad = (torch.softmax(pitch_logits, dim=1) * self.bin_centers_rad).sum(dim=1)
        return yaw_rad, pitch_rad


# ImageNet 정규화 (L2CS 학습 시 흔히 사용)
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]
