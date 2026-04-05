# Clutter Detector

[![Tests](https://github.com/mkobos/cluttersnap/actions/workflows/test.yml/badge.svg)](https://github.com/mkobos/cluttersnap/actions/workflows/test.yml)

A Progressive Web App that analyzes room photos and produces a clutter score and heatmap overlay. The React UI captures photos and sends them to a Python API, which runs ML inference server-side and returns a score plus a full-resolution heatmap.

## Development

### Python API

```bash
# Create a virtual environment and install dependencies
python3 -m venv .venv
.venv/bin/pip install -r api/requirements.txt

# Start the API with mock model (MODEL_URL environment variable not set)
uvicorn api.index:app --reload

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

### First-time setup

```bash
# Install the Vercel CLI
brew install vercel-cli

# Log in to your Vercel account
vercel login

# Link the repo to a Vercel project (run from the repo root)
vercel link

# Pull environment variables to a local .env file
vercel env pull
```

### Deploy

```bash
# Preview deployment
vercel deploy

# Production deployment
vercel --prod
```

The Vite frontend is built automatically by Vercel's build step (`npm run build`). The FastAPI app under `api/` is served as a Vercel Function at `/api/*`.

### Required environment variables

- `MODEL_URL` — Public URL of the `.onnx` model file in Vercel Blob. If missing, ONNX inference is skipped and the API returns synthetic data (development / staging).

Set or update variables via the Vercel dashboard or CLI:

```bash
# Add a variable (prompts for value and target environments)
vercel env add MODEL_URL

# List current variables
vercel env ls
```

### Updating the model

1. Train with PyTorch and export: `torch.onnx.export(...)`
2. Upload `clutter_model.onnx` to Vercel Blob
3. Update `MODEL_URL` in the Vercel project settings (`vercel env add MODEL_URL` or via the dashboard)
4. Redeploy: `vercel --prod`

## Documentation

- `USER_SPEC.md` — product specification (screens, interactions, error handling)
- `TECH_SPEC.md` — technical specification (architecture, modules, algorithms, data structures)
