import numpy as np
from PIL import Image

from .result import Result


class MockAnalyzer:
    def analyze(self, img: Image.Image) -> Result:
        w, h = img.size
        rng = np.random.default_rng()
        score = float(rng.uniform(1.0, 10.0))

        heatmap = np.zeros((h, w), dtype=np.float32)
        num_spots = int(rng.integers(1, 4))

        # Pre-compute coordinate grids once outside the loop
        xx, yy = np.meshgrid(np.arange(w), np.arange(h))

        for _ in range(num_spots):
            cx = rng.uniform(0, w - 1)
            cy = rng.uniform(0, h - 1)
            intensity = rng.uniform(0.5, 1.0)
            sigma = rng.uniform(max(w, h) * 0.05, max(w, h) * 0.2)

            dist_sq = (xx - cx) ** 2 + (yy - cy) ** 2
            heatmap += float(intensity) * np.exp(-dist_sq / (2 * sigma ** 2))

        max_val = heatmap.max()
        if max_val > 0:
            heatmap /= max_val

        return Result(score=score, heatmap=heatmap.tolist())
