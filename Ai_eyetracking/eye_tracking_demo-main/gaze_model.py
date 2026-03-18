"""
gaze_model.py
=============
Dual-eye gaze regression model with head-pose conditioning.

Architecture overview
---------------------
                    ┌── LeftEye  (B,3,H,W) ──┐
                    │   MobileNetV3-Small     │
                    │   (shared weights)      ├──> cat ──> Regressor ──> (B,2)
                    │   MobileNetV3-Small     │   fused      FC×3       XCam,YCam
                    └── RightEye (B,3,H,W) ──┘    dim
                    HeadPose (B,3) ──────────────────────────────────────────┘
                    [yaw, pitch, scale]
                    HeadPoseEncoder MLP

Classes
-------
EyeEncoder        – MobileNetV3-Small feature extractor for one eye crop
HeadPoseEncoder   – Small MLP that embeds [yaw, pitch, scale]
GazeRegressor     – Full model: encodes both eyes + pose, regresses (x,y)
"""

import torch
import torch.nn as nn
from torchvision.models import mobilenet_v3_small, MobileNet_V3_Small_Weights


# ---------------------------------------------------------------------------
# Sub-modules
# ---------------------------------------------------------------------------

class EyeEncoder(nn.Module):
    """
    Lightweight feature extractor for a single eye-crop image.

    Uses MobileNetV3-Small as backbone with a small projection head.
    The global-average-pooled feature map (576-d) is projected to
    `out_features` dimensions.

    Parameters
    ----------
    pretrained    : Load ImageNet-1K weights for the backbone.
    out_features  : Output feature dimensionality.
    dropout       : Dropout probability in the projection head.
    """

    BACKBONE_FEAT_DIM = 576   # AdaptiveAvgPool output of MobileNetV3-Small

    def __init__(
        self,
        pretrained: bool = True,
        out_features: int = 128,
        dropout: float = 0.2,
    ) -> None:
        super().__init__()

        weights = MobileNet_V3_Small_Weights.IMAGENET1K_V1 if pretrained else None
        backbone = mobilenet_v3_small(weights=weights)

        # Keep only the convolutional feature extractor and adaptive pooling.
        # Discard the built-in classifier (Linear → Hardswish → Dropout → Linear).
        self.features = backbone.features          # (B, C, H', W')
        self.avgpool  = backbone.avgpool           # AdaptiveAvgPool2d(1, 1)

        self.proj = nn.Sequential(
            nn.Linear(self.BACKBONE_FEAT_DIM, out_features),
            nn.Hardswish(inplace=True),
            nn.Dropout(p=dropout),
        )
        self.out_features = out_features

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (B, 3, H, W)
        x = self.features(x)          # (B, 576, H', W')
        x = self.avgpool(x)           # (B, 576,  1,  1)
        x = x.flatten(start_dim=1)    # (B, 576)
        return self.proj(x)           # (B, out_features)


class HeadPoseEncoder(nn.Module):
    """
    Two-layer MLP that maps a 3-D head-pose vector to a fixed-size embedding.

    Input vector convention
    -----------------------
    [yaw, pitch, scale]
      yaw   – normalised horizontal head turn  in [-1, 1]
      pitch – normalised vertical tilt         in [-1, 1]
      scale – relative face area in frame      in [ 0, 1]

    For production inference, replace the proxy estimates in
    GazeCaptureDataset._estimate_head_pose() with output from a proper
    3-D estimator (e.g. MediaPipe Face Mesh, 6DRepNet) and remap to the
    same [-1,1] / [0,1] ranges.
    """

    def __init__(
        self,
        in_features: int = 3,
        hidden_dim: int = 64,
        out_features: int = 32,
    ) -> None:
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_features, hidden_dim),
            nn.ReLU(inplace=True),
            nn.Linear(hidden_dim, out_features),
            nn.ReLU(inplace=True),
        )
        self.out_features = out_features

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)   # (B, out_features)


# ---------------------------------------------------------------------------
# Full model
# ---------------------------------------------------------------------------

class GazeRegressor(nn.Module):
    """
    Dual-eye gaze regression model with head-pose conditioning.

    Inputs
    ------
    left_eye  : (B, 3, H, W)  – cropped left  eye region (ImageNet-normalised)
    right_eye : (B, 3, H, W)  – cropped right eye region
    head_pose : (B, 3)        – [yaw, pitch, scale]  (see HeadPoseEncoder)

    Output
    ------
    gaze_xy   : (B, 2)        – predicted [XCam, YCam] in centimetres
                                 relative to the device camera centre
                                 (same coordinate space as GazeCapture dotInfo)

    Parameters
    ----------
    eye_out_features    : Feature dim per eye branch.
    pose_out_features   : Feature dim of the head-pose branch.
    pretrained          : Use ImageNet weights for the MobileNetV3 backbone.
    shared_eye_weights  : Share the same EyeEncoder for both eyes (halves params).
    regressor_hidden    : Hidden dim of the regression MLP.
    dropout             : Dropout in the regression head.
    """

    def __init__(
        self,
        eye_out_features:  int  = 128,
        pose_out_features: int  = 32,
        pretrained:        bool = True,
        shared_eye_weights: bool = True,
        regressor_hidden:  int  = 256,
        dropout:           float = 0.3,
    ) -> None:
        super().__init__()

        self.shared_eye_weights = shared_eye_weights

        # ---- Eye branches ------------------------------------------------
        self.left_eye_enc = EyeEncoder(
            pretrained=pretrained,
            out_features=eye_out_features,
        )
        if shared_eye_weights:
            # Single set of backbone parameters, applied to both crops.
            self.right_eye_enc = self.left_eye_enc
        else:
            self.right_eye_enc = EyeEncoder(
                pretrained=pretrained,
                out_features=eye_out_features,
            )

        # ---- Head-pose branch --------------------------------------------
        self.pose_enc = HeadPoseEncoder(
            in_features=3,
            out_features=pose_out_features,
        )

        # ---- Fusion + regression head ------------------------------------
        fused_dim = 2 * eye_out_features + pose_out_features

        self.regressor = nn.Sequential(
            nn.Linear(fused_dim, regressor_hidden),
            nn.Hardswish(inplace=True),
            nn.Dropout(p=dropout),
            nn.Linear(regressor_hidden, 64),
            nn.Hardswish(inplace=True),
            nn.Linear(64, 2),     # → (XCam, YCam)
        )

        self._init_regressor_weights()

    def _init_regressor_weights(self) -> None:
        """Kaiming init for the regression head (backbone already has ImageNet weights)."""
        for m in self.regressor.modules():
            if isinstance(m, nn.Linear):
                nn.init.kaiming_normal_(m.weight, nonlinearity="relu")
                nn.init.zeros_(m.bias)

    # ------------------------------------------------------------------
    # Forward
    # ------------------------------------------------------------------

    def forward(
        self,
        left_eye:  torch.Tensor,   # (B, 3, H, W)
        right_eye: torch.Tensor,   # (B, 3, H, W)
        head_pose: torch.Tensor,   # (B, 3)
    ) -> torch.Tensor:             # (B, 2)

        feat_l = self.left_eye_enc(left_eye)    # (B, eye_out_features)
        feat_r = self.right_eye_enc(right_eye)  # (B, eye_out_features)
        feat_p = self.pose_enc(head_pose)        # (B, pose_out_features)

        fused = torch.cat([feat_l, feat_r, feat_p], dim=1)
        return self.regressor(fused)             # (B, 2)

    # ------------------------------------------------------------------
    # Convenience
    # ------------------------------------------------------------------

    def count_parameters(self) -> int:
        return sum(p.numel() for p in self.parameters() if p.requires_grad)


# ---------------------------------------------------------------------------
# Quick sanity-check
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    model = GazeRegressor(pretrained=False)
    B = 4
    le   = torch.randn(B, 3, 64, 64)
    re   = torch.randn(B, 3, 64, 64)
    pose = torch.randn(B, 3)
    out  = model(le, re, pose)
    print(f"Output shape : {out.shape}")           # (4, 2)
    print(f"Trainable params: {model.count_parameters():,}")
