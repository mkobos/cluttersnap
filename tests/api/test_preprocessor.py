import numpy as np
import pytest
from PIL import Image
from api.preprocessor import preprocess_image


def make_rgb_image(h: int, w: int) -> Image.Image:
    return Image.fromarray(np.full((h, w, 3), 128, dtype=np.uint8))


def test_output_shape():
    img = make_rgb_image(480, 640)
    result = preprocess_image(img)
    assert result.shape == (1, 3, 224, 224)


def test_output_dtype_is_float32():
    img = make_rgb_image(480, 640)
    result = preprocess_image(img)
    assert result.dtype == np.float32


@pytest.mark.parametrize("h,w", [(100, 200), (640, 480), (1, 1), (1024, 768)])
def test_various_input_sizes(h: int, w: int):
    img = make_rgb_image(h, w)
    result = preprocess_image(img)
    assert result.shape == (1, 3, 224, 224)
    assert result.dtype == np.float32
