import numpy as np
import onnxruntime as ort
from PIL import Image

from .preprocessor import preprocess_image
from .eigen_cam import compute_eigen_cam, upsample
from .result import Result


class OnnxAnalyzer:
    def __init__(self, model_path: str) -> None:
        self._model_path = model_path
        self._session = ort.InferenceSession(
            self._model_path,
            providers=["CPUExecutionProvider"],
        )

    def analyze(self, img: Image.Image) -> Result:
        """
        img: PIL RGB image (any size)
        Returns: AnalysisResult with score and heatmap fields
        """
        
        w, h = img.size
        input_tensor = preprocess_image(img)

        outputs = self._session.run(["score", "feature_map"], {"input": input_tensor})

        score = float(outputs[0].flat[0])
        if not np.isfinite(score) or not (1.0 <= score <= 10.0):
            raise ValueError(f"Score out of range or invalid: {score}")

        feature_map = outputs[1]  # (1, C, H_feat, W_feat)
        heatmap = compute_eigen_cam(feature_map)
        heatmap_upsampled = upsample(heatmap, target_h=h, target_w=w)

        return Result(score=score, heatmap=heatmap_upsampled.tolist())
