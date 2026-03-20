"""신경망 forward (CPU)."""

from __future__ import annotations

import pytest

torch = pytest.importorskip("torch")

from eye_speak.iris_model.model import MobileGaze  # noqa: E402


def test_mobilegaze_forward_shape_cpu() -> None:
    m = MobileGaze()
    m.eval()
    x = torch.randn(2, 3, 64, 64)
    with torch.no_grad():
        yaw, pitch = m(x)
    assert yaw.shape == (2,) and pitch.shape == (2,)
    assert torch.isfinite(yaw).all() and torch.isfinite(pitch).all()


def test_mobilegaze_batch1() -> None:
    m = MobileGaze()
    y, p = m(torch.zeros(1, 3, 64, 64))
    assert y.numel() == 1 and p.numel() == 1


def test_mobilegaze_parameters_finite() -> None:
    m = MobileGaze()
    for v in m.parameters():
        assert torch.isfinite(v).all()


@pytest.mark.skipif(not torch.cuda.is_available(), reason="CUDA optional")
def test_mobilegaze_forward_cuda_smoke() -> None:
    m = MobileGaze().cuda().eval()
    x = torch.zeros(1, 3, 64, 64, device="cuda")
    with torch.no_grad():
        y, p = m(x)
    assert y.device.type == "cuda"
    assert torch.isfinite(y).all()
