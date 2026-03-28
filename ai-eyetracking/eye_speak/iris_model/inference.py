"""PyTorch / ONNX 시선 추론 및 폴백 체인 (ONNX → PyTorch → 영벡터)."""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, Optional, Tuple

import numpy as np
import torch
import torch.nn.functional as F

from eye_speak.iris_model.model import IMAGENET_MEAN, IMAGENET_STD, L2CSNet, MobileGaze

logger = logging.getLogger(__name__)

TORCH_AVAILABLE = True


class GazeEstimator:
    """RGB 이미지 ``(224,224,3)`` uint8 → ``(yaw_rad, pitch_rad)``.

    폴백 순서: ONNX Runtime → PyTorch → ``(0.0, 0.0)`` (CLAUDE.md).
    """

    def __init__(
        self,
        checkpoint_path: Optional[str] = None,
        onnx_path: Optional[str] = None,
        device: Optional[str] = None,
        model_name: str = "l2cs",
    ) -> None:
        """Args:
            checkpoint_path: ``.pth`` / ``.pt`` 가중치 (PyTorch).
            onnx_path: ONNX 모델 경로 (우선 시도).
            device: ``cuda`` / ``cpu``. ``None``이면 자동.
            model_name: ``l2cs`` | ``mobilegaze`` (체크포인트 구조 선택).
        """
        self.checkpoint_path = checkpoint_path
        self.onnx_path = onnx_path
        self.device = device or (
            "cuda" if torch.cuda.is_available() else "cpu"
        )
        self.model_name = model_name.lower().strip()
        self.model: Optional[torch.nn.Module] = None
        self.use_face: bool = True
        self._onnx_session: Any = None
        self._onnx_input_name: Optional[str] = None

        if onnx_path and os.path.isfile(onnx_path):
            self._try_load_onnx(onnx_path)
        if self.model is None and checkpoint_path and TORCH_AVAILABLE:
            self._load_pytorch(checkpoint_path)

    def _try_load_onnx(self, path: str) -> None:
        try:
            import onnxruntime as ort

            prov = ["CPUExecutionProvider"]
            if torch.cuda.is_available():
                prov = ["CUDAExecutionProvider", "CPUExecutionProvider"]
            self._onnx_session = ort.InferenceSession(path, providers=prov)
            self._onnx_input_name = self._onnx_session.get_inputs()[0].name
            logger.info("GazeEstimator: ONNX loaded %s", path)
        except Exception as exc:
            self._onnx_session = None
            logger.warning("ONNX load failed, will try PyTorch: %s", exc)

    def _remap_state(self, state: Dict[str, torch.Tensor]) -> Dict[str, torch.Tensor]:
        out: Dict[str, torch.Tensor] = {}
        for k, v in state.items():
            key = k.replace("module.", "").replace("model.", "")
            out[key] = v
        return out

    def _load_pytorch(self, path: str) -> None:
        if not path or not os.path.isfile(path):
            return
        try:
            if self.model_name == "mobilegaze":
                net: torch.nn.Module = MobileGaze().to(self.device)
            else:
                net = L2CSNet(arch="ResNet50").to(self.device)
            state = torch.load(path, map_location=self.device, weights_only=False)
            if isinstance(state, dict) and "state_dict" in state:
                state = state["state_dict"]
            if not isinstance(state, dict):
                raise ValueError("invalid checkpoint")
            state = {k.replace("module.", ""): v for k, v in state.items()}
            state = self._remap_state(state)
            our_sd = net.state_dict()
            loaded = {
                k: v for k, v in state.items() if k in our_sd and our_sd[k].shape == v.shape
            }
            if loaded:
                our_sd.update(loaded)
                net.load_state_dict(our_sd)
            else:
                net.load_state_dict(state, strict=False)
            net.eval()
            self.model = net
            self.use_face = True
            logger.info("GazeEstimator: PyTorch loaded %s (%s)", path, self.model_name)
        except Exception as exc:
            self.model = None
            logger.warning("PyTorch checkpoint load failed: %s", exc)

    def _preprocess_face(self, face_rgb: np.ndarray) -> Optional[torch.Tensor]:
        if face_rgb is None or face_rgb.size == 0:
            return None
        x = torch.from_numpy(face_rgb).float().div(255.0)
        x = x.permute(2, 0, 1).unsqueeze(0).to(self.device)
        if self.model_name == "mobilegaze":
            x = F.interpolate(x, size=(64, 64), mode="bilinear", align_corners=False)
            return x
        mean = torch.tensor(IMAGENET_MEAN, device=self.device).view(1, 3, 1, 1)
        std = torch.tensor(IMAGENET_STD, device=self.device).view(1, 3, 1, 1)
        x = (x - mean) / std
        if x.shape[-1] != 224 or x.shape[-2] != 224:
            x = F.interpolate(x, size=(224, 224), mode="bilinear", align_corners=False)
        return x

    def _infer_onnx(self, face_rgb: np.ndarray) -> Optional[Tuple[float, float]]:
        if self._onnx_session is None or self._onnx_input_name is None:
            return None
        x = self._preprocess_face(face_rgb)
        if x is None:
            return None
        inp = x.detach().cpu().numpy().astype(np.float32)
        try:
            outs = self._onnx_session.run(None, {self._onnx_input_name: inp})
            if not outs:
                return None
            if len(outs) >= 2:
                y0 = float(np.asarray(outs[0]).reshape(-1)[0])
                p0 = float(np.asarray(outs[1]).reshape(-1)[0])
                return (y0, p0)
            o0 = np.asarray(outs[0]).reshape(-1)
            if o0.size >= 2:
                return float(o0[0]), float(o0[1])
            return None
        except Exception as exc:
            logger.debug("ONNX inference failed: %s", exc)
            return None

    def _infer_torch(self, face_rgb: np.ndarray) -> Optional[Tuple[float, float]]:
        if self.model is None:
            return None
        x = self._preprocess_face(face_rgb)
        if x is None:
            return None
        try:
            with torch.no_grad():
                yaw_t, pitch_t = self.model(x)
                return float(yaw_t.cpu().item()), float(pitch_t.cpu().item())
        except Exception as exc:
            logger.debug("PyTorch inference failed: %s", exc)
            return None

    def __call__(self, image_rgb: np.ndarray) -> Tuple[float, float]:
        """추론: ONNX → PyTorch → ``(0.0, 0.0)``."""
        onnx_out = self._infer_onnx(image_rgb)
        if onnx_out is not None:
            return onnx_out
        torch_out = self._infer_torch(image_rgb)
        if torch_out is not None:
            return torch_out
        logger.debug("GazeEstimator: fallback zero gaze")
        return (0.0, 0.0)
