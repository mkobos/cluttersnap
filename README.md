# Clutter Detector

[![Tests](https://github.com/mkobos/cluttersnap/actions/workflows/test.yml/badge.svg)](https://github.com/mkobos/cluttersnap/actions/workflows/test.yml)

A Progressive Web App that analyzes room photos and produces a clutter score and heatmap overlay. The React UI captures photos and sends them to a Python API, which runs ML inference server-side and returns a score plus a full-resolution heatmap.

## Development

### Python API

```bash
# Create a virtual environment and install dependencies
python3 -m venv .venv
.venv/bin/pip install -r api/requirements.txt

# Start the API with mock model (no ONNX file required)
USE_MOCK_MODEL=true uvicorn api.index:app --reload

# Run Python tests
.venv/bin/pytest tests/api/
```

### React UI

```bash
# Install dependencies
npm install

# Development server (HTTPS + API proxy are configured in vite.config.ts)
npm run dev

# Run TypeScript tests
npm test

# Production build
npm run build
```

## Deployment

Hosted on Vercel. The project contains both the Vite React frontend and the FastAPI Python API under `api/`.

### Required environment variables

| Variable | Description |
|---|---|
| `MODEL_BLOB_URL` | Public URL of the `.onnx` model file in Vercel Blob |
| `USE_MOCK_MODEL` | Set to `true` to skip ONNX inference (development / staging) |

### Updating the model

1. Train with PyTorch and export: `torch.onnx.export(...)`
2. Upload `clutter_model.onnx` to Vercel Blob
3. Update `MODEL_BLOB_URL` in the Vercel project settings
4. Redeploy the API

## Documentation

- `USER_SPEC.md` — product specification (screens, interactions, error handling)
- `TECH_SPEC.md` — technical specification (architecture, modules, algorithms, data structures)
