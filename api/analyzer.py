import os
import sys

import numpy as np
import onnxruntime as ort

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from preprocessor import preprocess_image  # noqa: E402
from eigen_cam import compute_eigen_cam    # noqa: E402


class OnnxAnalyzer:
    def __init__(self, model_path: str) -> None:
        self._model_path = model_path
        self._session: ort.InferenceSession | None = None

    def load(self) -> None:
        self._session = ort.InferenceSession(
            self._model_path,
            providers=["CPUExecutionProvider"],
        )

    def analyze(self, img: np.ndarray) -> dict:
        """
        img: HxWx3 uint8 RGB array
        Returns: {"score": float, "heatmap": list[list[float]]}
        """
        if self._session is None:
            raise RuntimeError("OnnxAnalyzer.load() must be called before analyze()")

        h, w = img.shape[:2]
        input_tensor = preprocess_image(img)

        outputs = self._session.run(["score", "feature_map"], {"input": input_tensor})

        score = float(outputs[0].flat[0])
        if not (1.0 <= score <= 10.0):
            raise ValueError(f"Score out of range: {score}")

        feature_map = outputs[1]  # (1, C, H_feat, W_feat)
        heatmap = compute_eigen_cam(feature_map, target_h=h, target_w=w)

        return {"score": score, "heatmap": heatmap.tolist()}
