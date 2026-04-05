import numpy as np
import pytest
from api.eigen_cam import compute_eigen_cam


def make_feature_map(C: int, H: int, W: int, fill: float = 1.0) -> np.ndarray:
    return np.full((1, C, H, W), fill, dtype=np.float32)


def test_output_shape_matches_target_dimensions():
    fm = make_feature_map(4, 7, 7)
    result = compute_eigen_cam(fm, target_h=100, target_w=150)
    assert result.shape == (100, 150)


def test_output_dtype_is_float32():
    fm = make_feature_map(4, 7, 7)
    result = compute_eigen_cam(fm, target_h=50, target_w=50)
    assert result.dtype == np.float32


def test_all_values_in_0_1():
    rng = np.random.default_rng(42)
    fm = rng.random((1, 8, 7, 7), dtype=np.float32)
    result = compute_eigen_cam(fm, target_h=64, target_w=64)
    assert result.min() >= 0.0
    assert result.max() <= 1.0


def test_zero_feature_map_returns_zeros():
    fm = np.zeros((1, 4, 7, 7), dtype=np.float32)
    result = compute_eigen_cam(fm, target_h=20, target_w=20)
    assert np.all(result == 0.0)


def test_hot_spot_at_center_is_maximum():
    C, H, W = 2, 7, 7
    fm = np.zeros((1, C, H, W), dtype=np.float32)
    cy, cx = H // 2, W // 2
    fm[0, 0, cy, cx] = 10.0
    fm[0, 1, cy, cx] = 8.0
    result = compute_eigen_cam(fm, target_h=H, target_w=W)
    assert result.max() == pytest.approx(1.0)
    assert result[cy, cx] == pytest.approx(1.0)


def test_upsamples_to_larger_target():
    fm = make_feature_map(4, 7, 7, fill=1.0)
    result = compute_eigen_map = compute_eigen_cam(fm, target_h=480, target_w=640)
    assert result.shape == (480, 640)
