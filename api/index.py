import io
import os
import sys

import numpy as np
from PIL import Image
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

# Allow sibling imports when running as a Vercel Python function
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from mock_analyzer import generate_mock_result  # noqa: E402

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST"],
    allow_headers=["*"],
)

# Module-level singleton so the ONNX session is reused across warm invocations
_onnx_analyzer = None


def _get_onnx_analyzer():
    global _onnx_analyzer
    if _onnx_analyzer is None:
        import urllib.request
        from analyzer import OnnxAnalyzer

        model_url = os.environ.get("MODEL_BLOB_URL")
        if not model_url:
            raise RuntimeError("MODEL_BLOB_URL environment variable is not set")

        tmp_path = "/tmp/clutter_model.onnx"
        if not os.path.exists(tmp_path):
            urllib.request.urlretrieve(model_url, tmp_path)

        _onnx_analyzer = OnnxAnalyzer(tmp_path)
        _onnx_analyzer.load()

    return _onnx_analyzer


@app.post("/api/analyze")
async def analyze(image: UploadFile = File(...)):
    data = await image.read()
    try:
        pil_img = Image.open(io.BytesIO(data)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")

    img = np.array(pil_img, dtype=np.uint8)
    h, w = img.shape[:2]

    if os.environ.get("USE_MOCK_MODEL") == "true":
        return generate_mock_result(width=w, height=h)

    try:
        analyzer = _get_onnx_analyzer()
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return analyzer.analyze(img)
