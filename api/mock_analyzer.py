import numpy as np


def generate_mock_result(width: int, height: int) -> dict:
    """Returns a synthetic clutter score and Gaussian-blob heatmap."""
    rng = np.random.default_rng()
    score = float(rng.uniform(1.0, 10.0))

    heatmap = np.zeros((height, width), dtype=np.float32)
    num_spots = int(rng.integers(1, 4))

    for _ in range(num_spots):
        cx = rng.uniform(0, width - 1)
        cy = rng.uniform(0, height - 1)
        intensity = rng.uniform(0.5, 1.0)
        sigma = rng.uniform(max(width, height) * 0.05, max(width, height) * 0.2)

        xx, yy = np.meshgrid(np.arange(width), np.arange(height))
        dist_sq = (xx - cx) ** 2 + (yy - cy) ** 2
        heatmap += float(intensity) * np.exp(-dist_sq / (2 * sigma ** 2))

    max_val = heatmap.max()
    if max_val > 0:
        heatmap /= max_val

    return {"score": score, "heatmap": heatmap.tolist()}
