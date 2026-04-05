# Clutter Detector — Project Configuration

## Project Overview

A Progressive Web App (PWA) that analyzes room photos to produce a clutter score (1–10) and a heatmap overlay. The app is split into two layers:

1. **Python API** (`api/`) — ML inference runs server-side via ONNX Runtime. Takes an image, returns a clutter score and a full-resolution heatmap.
2. **React UI** (`frontend/`) — Captures photos, calls the API, and renders results. No ML code in the frontend.

- Product specification: `USER_SPEC.md`
- Technical specification: `TECH_SPEC.md`
- Dev setup & deployment: `README.md`

---

## Two Workstreams

### 1. Model Training

Train a PyTorch model and export it as `clutter_model.onnx`. See `TECH_SPEC.md` → Model Contract for the required input/output tensor specification.

**After export, upload to Vercel Blob and set `MODEL_URL`** — the Python API downloads the model on cold start and caches it in `/tmp`.

### 2. Web Application

#### Python API
FastAPI app in `api/`. Run locally with:
```bash
uvicorn api.index:app --reload
```
Leave `MODEL_URL` unset to skip ONNX inference and return synthetic data.

#### React UI
React 18 + TypeScript PWA built with Vite. The UI expects the API at `/api/analyze`. Run locally with:
```bash
npm run dev
```
The mock is now server-side; no frontend env var is needed during UI development.
