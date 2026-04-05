import numpy as np
from PIL import Image

POWER_ITERATIONS = 25


def _dominant_right_singular_vector(M: np.ndarray, spatial_size: int) -> np.ndarray:
    """
    Finds the dominant right singular vector of M via power iteration.
    Returns a zero vector when M is degenerate (norm collapses below threshold).
    M: (C, spatial_size) float32
    Returns: (spatial_size,) float32
    """
    v = np.ones(spatial_size, dtype=np.float32)
    for _ in range(POWER_ITERATIONS):
        mv = M @ v           # (C,)
        mtmv = M.T @ mv      # (H*W,)
        norm = np.linalg.norm(mtmv)
        if norm < 1e-12:
            return np.zeros(spatial_size, dtype=np.float32)
        v = mtmv / norm
    return v


def compute_eigen_cam(
    feature_map: np.ndarray,
) -> np.ndarray:
    """
    Computes an Eigen-CAM heatmap from a CNN feature map.

    feature_map: (1, C, H, W) float32
    Returns: (H, W) float32, values in [0, 1]
    """
    _, C, H, W = feature_map.shape
    spatial_size = H * W
    M = feature_map[0].reshape(C, spatial_size).astype(np.float32)  # (C, H*W)

    v = _dominant_right_singular_vector(M, spatial_size)

    # ReLU
    v = np.maximum(v, 0.0)

    # Normalize to [0, 1]
    max_val = v.max()
    if max_val > 0:
        v = v / max_val

    v = v.reshape(H, W)
    return v

def upsample(img: np.ndarray, target_h: int, target_w: int) -> np.ndarray:
    # Upsample to target size using PIL (mode 'F' preserves float precision)
    pil_heat = Image.fromarray(img, mode='F')
    pil_heat = pil_heat.resize((target_w, target_h), Image.Resampling.BILINEAR)
    return np.array(pil_heat, dtype=np.float32)
