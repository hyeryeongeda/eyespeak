"""
==========================================================
[모델 모듈] L2CS-Net: 시선 추적을 위한 듀얼 브랜치 네트워크
==========================================================
L2CS-Net은 하나의 눈(또는 얼굴) 이미지로부터
시선 방향(Yaw, Pitch)을 예측하는 딥러닝 모델입니다.

핵심 아이디어:
    기존 시선 추적 모델은 "분류" 또는 "회귀" 중 하나만 사용하지만,
    L2CS-Net은 두 가지를 동시에 활용합니다.

    1. 분류 (Bin Classification):
       연속적인 각도를 여러 구간(bin)으로 나누어 "어느 구간인지" 예측
       → 대략적인 방향을 안정적으로 잡아줌

    2. 회귀 (Softmax 기대값):
       각 bin의 확률(softmax)을 가중치로 사용하여 연속 각도를 계산
       → bin 경계 사이의 세밀한 각도까지 표현 가능

    이 두 가지를 결합하면 "안정성 + 정밀도"를 모두 확보합니다.

네트워크 구조:

    입력 이미지 (3, 224, 224)
            │
            ▼
    ┌──────────────────┐
    │  ResNet50 백본     │  ← ImageNet 사전학습 가중치 사용
    │  (FC 레이어 제거)   │
    └────────┬─────────┘
             │
        (2048차원 특성 벡터)
             │
        ┌────┴────┐
        │         │
        ▼         ▼
    ┌────────┐ ┌────────┐
    │Yaw 분류 │ │Pitch분류│
    │FC(→90) │ │FC(→90) │
    └───┬────┘ └───┬────┘
        │         │
        ▼         ▼
    Softmax     Softmax
    기대값 계산  기대값 계산
        │         │
        ▼         ▼
    Yaw 예측    Pitch 예측
    (도, degree) (도, degree)
"""

import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models

import config


class L2CSNet(nn.Module):
    """
    L2CS-Net 모델 클래스.

    Args:
        num_bins:   각도 구간(bin) 수 (기본: 90)
        pretrained: True면 ImageNet 사전학습 가중치로 초기화 (권장)
    """

    def __init__(self, num_bins=config.NUM_BINS, pretrained=True):
        super().__init__()
        self.num_bins = num_bins

        # ──────────────────────────────────────
        # 1단계: ResNet50 백본 (특성 추출기)
        # ──────────────────────────────────────
        # ImageNet으로 사전학습된 ResNet50을 가져옵니다.
        # 마지막 FC(Fully Connected) 레이어는 제거하고,
        # 나머지 부분만 "특성 추출기"로 사용합니다.
        #
        # ResNet50 구조: conv1 → bn1 → relu → maxpool
        #                → layer1 → layer2 → layer3 → layer4
        #                → avgpool → fc (이 fc를 제거)
        #
        # avgpool 출력 크기: (batch, 2048, 1, 1)
        resnet = models.resnet50(
            weights=models.ResNet50_Weights.DEFAULT if pretrained else None
        )
        # children()으로 모든 하위 모듈을 가져온 뒤, 마지막(fc)을 제외
        self.backbone = nn.Sequential(*list(resnet.children())[:-1])

        # ──────────────────────────────────────
        # 2단계: Yaw(수평) 분류 브랜치
        # ──────────────────────────────────────
        # 2048차원 특성 → num_bins개 클래스에 대한 로짓(logit) 출력
        # 로짓 = softmax 적용 전의 원시 점수
        self.fc_yaw = nn.Linear(2048, num_bins)

        # ──────────────────────────────────────
        # 3단계: Pitch(수직) 분류 브랜치
        # ──────────────────────────────────────
        self.fc_pitch = nn.Linear(2048, num_bins)

        # ──────────────────────────────────────
        # Softmax 기대값 계산용 인덱스 텐서
        # ──────────────────────────────────────
        # [0, 1, 2, ..., 89] 형태의 텐서를 미리 만들어 둡니다.
        # 이 텐서는 학습 파라미터가 아니라 고정된 상수이므로
        # register_buffer로 등록합니다.
        # → model.to(device) 호출 시 자동으로 같은 디바이스로 이동
        # → model.state_dict()에 포함되지만 gradient 계산 대상은 아님
        idx_tensor = torch.arange(num_bins, dtype=torch.float32)
        self.register_buffer("idx_tensor", idx_tensor)

    def forward(self, x):
        """
        순전파(Forward Pass): 이미지 → 시선 각도 예측

        Args:
            x: (batch, 3, 224, 224) 입력 이미지 텐서

        Returns:
            yaw_logits:      (batch, num_bins) - Yaw 분류 로짓 (CrossEntropy용)
            pitch_logits:    (batch, num_bins) - Pitch 분류 로짓 (CrossEntropy용)
            yaw_predicted:   (batch,) - Yaw 예측 각도 (도) (MSE용)
            pitch_predicted: (batch,) - Pitch 예측 각도 (도) (MSE용)
        """
        # ── 1) 백본으로 이미지 특성 추출 ──
        features = self.backbone(x)              # (batch, 2048, 1, 1)
        features = features.flatten(start_dim=1)  # (batch, 2048)

        # ── 2) 각 브랜치에서 bin별 로짓 계산 ──
        yaw_logits = self.fc_yaw(features)       # (batch, 90)
        pitch_logits = self.fc_pitch(features)   # (batch, 90)

        # ── 3) Softmax 기대값으로 연속 각도 예측 ──
        yaw_predicted = self._softmax_expectation(yaw_logits)
        pitch_predicted = self._softmax_expectation(pitch_logits)

        return yaw_logits, pitch_logits, yaw_predicted, pitch_predicted

    def _softmax_expectation(self, logits):
        """
        Softmax 기반 기대값 계산 — L2CS-Net의 핵심 메커니즘입니다.

        ■ 일반적인 분류 (argmax):
            logits = [0.1, 0.3, 8.5, 0.2, ...]
            예측 bin = 2 (가장 큰 값의 인덱스)
            → bin 경계에 걸리면 정확도가 떨어짐

        ■ L2CS-Net (softmax 기대값):
            probs = softmax([0.1, 0.3, 8.5, 0.2, ...])
                  = [0.01, 0.02, 0.93, 0.01, ...]
            예측 = 0×0.01 + 1×0.02 + 2×0.93 + 3×0.01 + ...
                 = 1.91  (bin 사이의 세밀한 값도 표현 가능!)

            이 인덱스 값을 실제 각도로 변환:
            각도 = 1.91 × 4.0 + (-180.0) = -172.36도

        장점:
            1. bin 경계 사이의 값도 연속적으로 표현 가능
            2. softmax가 미분 가능하므로 end-to-end 역전파 학습 가능
            3. 분류의 안정성과 회귀의 정밀도를 동시에 확보

        Args:
            logits: (batch, num_bins) - 각 bin에 대한 로짓 값

        Returns:
            angles: (batch,) - 예측된 시선 각도 (도, degree)
        """
        # softmax로 각 bin의 확률 분포 계산
        probs = F.softmax(logits, dim=1)          # (batch, num_bins)

        # 확률 × 인덱스의 가중합 = 기대값 (Expected Value)
        expected_idx = torch.sum(
            probs * self.idx_tensor, dim=1        # (batch,)
        )

        # 인덱스 → 실제 각도(도)로 변환
        # 공식: angle = index × bin_width + angle_min
        angles = expected_idx * config.BIN_WIDTH + config.ANGLE_MIN

        return angles
