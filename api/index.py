import asyncio
import io
import os

from PIL import Image
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from api.onnx_analyzer import OnnxAnalyzer
from api.mock_analyzer import MockAnalyzer

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


def _download_in_chunks(url: str, dest_path: str) -> None:
    """Download a URL to a file in fixed-size chunks.

    Reading the response in chunks rather than all at once keeps peak memory
    usage proportional to a given `chunk_size` regardless of file
    size, which matters on memory-constrained serverless instances where
    loading a large model binary in a single call could exhaust available RAM.
    """
    import urllib.request

    chunk_size: int = 1024 * 1024  # 1024 * 1024 = 1 MiB
    with urllib.request.urlopen(url, timeout=30) as resp, open(dest_path, "wb") as f:
        while chunk := resp.read(chunk_size):
            f.write(chunk)


def _download_model() -> OnnxAnalyzer:
    """Blocking helper -- runs in a thread executor."""
    model_url = os.environ.get("MODEL_BLOB_URL")
    if not model_url:
        raise RuntimeError("MODEL_BLOB_URL environment variable is not set")

    tmp_path = "/tmp/clutter_model.onnx"
    if not os.path.exists(tmp_path):
        _download_in_chunks(model_url, tmp_path)

    analyzer = OnnxAnalyzer(tmp_path)
    return analyzer


async def _get_onnx_analyzer() -> OnnxAnalyzer:
    """Async function so it doesn't block the event loop while downloading or
    loading the model."""
    global _onnx_analyzer
    if _onnx_analyzer is not None:
        return _onnx_analyzer
    async with _onnx_lock:
        if _onnx_analyzer is not None:
            return _onnx_analyzer
        loop = asyncio.get_event_loop()
        _onnx_analyzer = await loop.run_in_executor(None, _download_model)
    return _onnx_analyzer


@app.post("/api/analyze")
async def analyze(image: UploadFile = File(...)):
    data = await image.read()
    try:
        img = Image.open(io.BytesIO(data)).convert("RGB")
    except (IOError, OSError, ValueError):
        raise HTTPException(status_code=400, detail="Invalid image file")

    if os.environ.get("USE_MOCK_MODEL") == "true":
        return MockAnalyzer().analyze(img)

    try:
        analyzer = await _get_onnx_analyzer()
        return analyzer.analyze(img)
    except (ValueError, RuntimeError) as exc:
        raise HTTPException(status_code=500, detail=str(exc))
