import numpy as np
import pytest
from api.preprocessor import preprocess_image


def make_image(h: int, w: int, fill: int = 128) -> np.ndarray:
    return np.full((h, w, 3), fill, dtype=np.uint8)


def test_output_shape_is_nchw_224():
    img = make_image(100, 100)
    result = preprocess_image(img)
    assert result.shape == (1, 3, 224, 224)


def test_output_dtype_is_float32():
    img = make_image(100, 100)
    result = preprocess_image(img)
    assert result.dtype == np.float32


def test_accepts_image_already_at_224():
    img = make_image(224, 224)
    result = preprocess_image(img)
    assert result.shape == (1, 3, 224, 224)


def test_accepts_non_square_image():
    img = make_image(480, 640)
    result = preprocess_image(img)
    assert result.shape == (1, 3, 224, 224)


def test_white_image_normalized_correctly():
    # Pure white (255, 255, 255): pixel value = 1.0 after /255
    # Normalized: (1.0 - mean) / std per channel
    img = make_image(10, 10, fill=255)
    result = preprocess_image(img)
    expected_r = (1.0 - 0.485) / 0.229
    expected_g = (1.0 - 0.456) / 0.224
    expected_b = (1.0 - 0.406) / 0.225
    assert abs(result[0, 0, 0, 0] - expected_r) < 0.01
    assert abs(result[0, 1, 0, 0] - expected_g) < 0.01
    assert abs(result[0, 2, 0, 0] - expected_b) < 0.01


def test_black_image_normalized_correctly():
    img = make_image(10, 10, fill=0)
    result = preprocess_image(img)
    expected_r = (0.0 - 0.485) / 0.229
    expected_g = (0.0 - 0.456) / 0.224
    expected_b = (0.0 - 0.406) / 0.225
    assert abs(result[0, 0, 0, 0] - expected_r) < 0.01
    assert abs(result[0, 1, 0, 0] - expected_g) < 0.01
    assert abs(result[0, 2, 0, 0] - expected_b) < 0.01
