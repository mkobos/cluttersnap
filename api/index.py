import asyncio
import io
import os

import numpy as np
from PIL import Image
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .mock_analyzer import generate_mock_result

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST"],
    allow_headers=["*"],
)

# Module-level singleton so the ONNX session is reused across warm invocations
_onnx_analyzer = None
_onnx_lock = asyncio.Lock()


def _download_and_load_model():
    """Blocking helper -- runs in a thread executor."""
    import urllib.request
    from .analyzer import OnnxAnalyzer

    model_url = os.environ.get("MODEL_BLOB_URL")
    if not model_url:
        raise RuntimeError("MODEL_BLOB_URL environment variable is not set")

    tmp_path = "/tmp/clutter_model.onnx"
    if not os.path.exists(tmp_path):
        with urllib.request.urlopen(model_url, timeout=30) as resp, open(tmp_path, "wb") as f:
            while chunk := resp.read(1 << 20):
                f.write(chunk)

    analyzer = OnnxAnalyzer(tmp_path)
    analyzer.load()
    return analyzer


async def _get_onnx_analyzer():
    global _onnx_analyzer
    if _onnx_analyzer is not None:
        return _onnx_analyzer
    async with _onnx_lock:
        if _onnx_analyzer is not None:
            return _onnx_analyzer
        loop = asyncio.get_event_loop()
        _onnx_analyzer = await loop.run_in_executor(None, _download_and_load_model)
    return _onnx_analyzer


@app.post("/api/analyze")
async def analyze(image: UploadFile = File(...)):
    data = await image.read()
    try:
        pil_img = Image.open(io.BytesIO(data)).convert("RGB")
    except (IOError, OSError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid image file")

    img = np.array(pil_img, dtype=np.uint8)
    h, w = img.shape[:2]

    if os.environ.get("USE_MOCK_MODEL") == "true":
        return generate_mock_result(width=w, height=h)

    try:
        analyzer = await _get_onnx_analyzer()
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    try:
        return analyzer.analyze(img)
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=500, detail=str(exc))
