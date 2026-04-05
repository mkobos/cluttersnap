import numpy as np
import onnxruntime as ort

from .preprocessor import preprocess_image
from .eigen_cam import compute_eigen_cam
from .models import AnalysisResult


class OnnxAnalyzer:
    def __init__(self, model_path: str) -> None:
        self._model_path = model_path
        self._session: ort.InferenceSession | None = None

    def load(self) -> None:
        self._session = ort.InferenceSession(
            self._model_path,
            providers=["CPUExecutionProvider"],
        )

    def analyze(self, img: np.ndarray) -> AnalysisResult:
        """
        img: HxWx3 uint8 RGB array
        Returns: AnalysisResult with score and heatmap fields
        """
        if self._session is None:
            raise RuntimeError("OnnxAnalyzer.load() must be called before analyze()")

        h, w = img.shape[:2]
        input_tensor = preprocess_image(img)

        outputs = self._session.run(["score", "feature_map"], {"input": input_tensor})

        score = float(outputs[0].flat[0])
        if not np.isfinite(score) or not (1.0 <= score <= 10.0):
            raise ValueError(f"Score out of range or invalid: {score}")

        feature_map = outputs[1]  # (1, C, H_feat, W_feat)
        heatmap = compute_eigen_cam(feature_map, target_h=h, target_w=w)

        return AnalysisResult(score=score, heatmap=heatmap.tolist())
