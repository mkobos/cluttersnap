import numpy as np
import pytest
from api.preprocessor import preprocess_image


def make_rgb_image(h: int, w: int) -> np.ndarray:
    return np.full((h, w, 3), 128, dtype=np.uint8)


def test_output_shape():
    img = make_rgb_image(480, 640)
    result = preprocess_image(img)
    assert result.shape == (1, 3, 224, 224)


def test_output_dtype_is_float32():
    img = make_rgb_image(480, 640)
    result = preprocess_image(img)
    assert result.dtype == np.float32


def test_rejects_grayscale_image():
    gray = np.full((100, 100), 128, dtype=np.uint8)
    with pytest.raises(ValueError, match="Expected HxWx3"):
        preprocess_image(gray)


def test_rejects_four_channel_image():
    rgba = np.full((100, 100, 4), 128, dtype=np.uint8)
    with pytest.raises(ValueError, match="Expected HxWx3"):
        preprocess_image(rgba)


@pytest.mark.parametrize("h,w", [(100, 200), (640, 480), (1, 1), (1024, 768)])
def test_various_input_sizes(h: int, w: int):
    img = make_rgb_image(h, w)
    result = preprocess_image(img)
    assert result.shape == (1, 3, 224, 224)
    assert result.dtype == np.float32
