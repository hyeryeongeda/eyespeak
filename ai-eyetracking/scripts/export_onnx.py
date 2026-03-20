"""PyTorch 시선 모델을 ONNX로보낸다."""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

import torch

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from eye_speak.iris_model.model import L2CSNet, MobileGaze  # noqa: E402

logger = logging.getLogger(__name__)


def _build_model(model_type: str) -> torch.nn.Module:
    t = model_type.lower().strip()
    if t == "l2cs":
        return L2CSNet()
    if t in ("mobilegaze", "mobile"):
        return MobileGaze()
    raise ValueError(f"unknown model_type: {model_type}")


def _dummy_input(model_type: str) -> torch.Tensor:
    if model_type.lower().strip() in ("l2cs",):
        return torch.randn(1, 3, 224, 224)
    return torch.randn(1, 3, 64, 64)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    p = argparse.ArgumentParser(description="Export gaze model to ONNX")
    p.add_argument("--checkpoint", type=str, required=True, help="PyTorch state_dict path")
    p.add_argument("--output", type=str, required=True, help="Output .onnx path")
    p.add_argument(
        "--model_type",
        type=str,
        default="mobilegaze",
        choices=["mobilegaze", "l2cs"],
        help="Architecture to instantiate before loading weights",
    )
    args = p.parse_args()

    device = torch.device("cpu")
    model = _build_model(args.model_type).to(device).eval()
    ckpt = torch.load(args.checkpoint, map_location=device, weights_only=False)
    if isinstance(ckpt, dict) and "state_dict" in ckpt:
        ckpt = ckpt["state_dict"]
    if isinstance(ckpt, dict):
        ckpt = {k.replace("module.", ""): v for k, v in ckpt.items()}
        model.load_state_dict(ckpt, strict=False)
    dummy = _dummy_input(args.model_type)
    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    torch.onnx.export(
        model,
        dummy,
        str(out_path),
        input_names=["input"],
        output_names=["yaw", "pitch"],
        dynamic_axes={
            "input": {0: "batch"},
            "yaw": {0: "batch"},
            "pitch": {0: "batch"},
        },
        opset_version=17,
    )
    logger.info("exported ONNX -> %s", out_path)


if __name__ == "__main__":
    main()
