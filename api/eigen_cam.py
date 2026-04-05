import numpy as np
from PIL import Image

POWER_ITERATIONS = 25


def compute_eigen_cam(
    feature_map: np.ndarray,
    target_h: int,
    target_w: int,
) -> np.ndarray:
    """
    Computes an Eigen-CAM heatmap from a CNN feature map and upsamples it.

    feature_map: (1, C, H, W) float32
    Returns: (target_h, target_w) float32, values in [0, 1]
    """
    _, C, H, W = feature_map.shape
    spatial_size = H * W
    M = feature_map[0].reshape(C, spatial_size).astype(np.float32)  # (C, H*W)

    # Power iteration: find dominant right singular vector of M
    v = np.ones(spatial_size, dtype=np.float32)
    for _ in range(POWER_ITERATIONS):
        mv = M @ v           # (C,)
        mtmv = M.T @ mv      # (H*W,)
        norm = np.linalg.norm(mtmv)
        if norm == 0:
            return np.zeros((target_h, target_w), dtype=np.float32)
        v = mtmv / norm

    # ReLU
    v = np.maximum(v, 0.0)

    # Normalize to [0, 1]
    max_val = v.max()
    if max_val > 0:
        v = v / max_val

    v = v.reshape(H, W)

    # Upsample to target size using PIL (mode 'F' preserves float precision)
    pil_heat = Image.fromarray(v, mode='F')
    pil_heat = pil_heat.resize((target_w, target_h), Image.BILINEAR)
    return np.array(pil_heat, dtype=np.float32)
