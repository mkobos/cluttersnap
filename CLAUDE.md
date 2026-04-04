# Clutter Detector — Project Configuration

## Project Overview

A Progressive Web App (PWA) that analyzes room photos to produce a clutter score (1–10) and a heatmap overlay. All ML inference runs fully in-browser via ONNX Runtime Web. No backend server.

- Product specification: `USER_SPEC.md`
- Technical specification: `TECH_SPEC.md`
- Dev setup & deployment: `README.md`

---

## Two Workstreams

### 1. Model Training

Train a PyTorch model and export it as `clutter_model.onnx`. See `TECH_SPEC.md` → Model Contract for the required input/output tensor specification.

**Model file placement after export:**
```
public/models/clutter_model.onnx
```

### 2. Web Application

React 18 + TypeScript PWA built with Vite. Build and test the full UI with the mock model (`VITE_USE_MOCK_MODEL=true`) before the real model is ready.
