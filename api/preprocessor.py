import numpy as np
from PIL import Image

IMAGENET_MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
IMAGENET_STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)
MODEL_INPUT_SIZE = 224


def preprocess_image(img: Image.Image) -> np.ndarray:
    """
    img: PIL RGB image (any size)
    Returns: (1, 3, 224, 224) float32 NCHW, ImageNet-normalized
    """
    pil_img = img.resize(
        (MODEL_INPUT_SIZE, MODEL_INPUT_SIZE), Image.Resampling.BILINEAR
    )
    arr = np.array(pil_img, dtype=np.float32) / 255.0  # HxWx3 in [0, 1]
    arr = (arr - IMAGENET_MEAN) / IMAGENET_STD  # normalize
    arr = arr.transpose(2, 0, 1)  # CHW
    return arr[np.newaxis]  # NCHW
