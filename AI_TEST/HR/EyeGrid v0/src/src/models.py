import torch
import torch.nn as nn
import timm

class GazeRegressor(nn.Module):
    def __init__(self, backbone="mobilenetv3_small_100", pretrained=True):
        super().__init__()
        self.backbone = timm.create_model(backbone, pretrained=pretrained, num_classes=0, global_pool="avg")

        # ✅ 실제 출력 차원으로 head 입력 차원 설정
        with torch.no_grad():
            feat_dim = self.backbone(torch.zeros(1, 3, 224, 224)).shape[1]

        self.head = nn.Sequential(
            nn.Linear(feat_dim, 256),
            nn.ReLU(inplace=True),
            nn.Dropout(0.2),
            nn.Linear(256, 2),
        )

    def forward(self, x):
        f = self.backbone(x)
        return self.head(f)

class BlinkClassifier(nn.Module):
    def __init__(self, backbone="mobilenetv3_small_100", pretrained=True):
        super().__init__()
        self.backbone = timm.create_model(backbone, pretrained=pretrained, num_classes=0, global_pool="avg")

        # ✅ 입력이 128x128이니까 더미도 그 사이즈로
        with torch.no_grad():
            feat_dim = self.backbone(torch.zeros(1, 3, 128, 128)).shape[1]

        self.head = nn.Sequential(
            nn.Linear(feat_dim, 128),
            nn.ReLU(inplace=True),
            nn.Dropout(0.2),
            nn.Linear(128, 1),
        )

    def forward(self, x):
        f = self.backbone(x)
        return self.head(f)