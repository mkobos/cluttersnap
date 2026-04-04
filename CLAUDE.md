# Clutter Detector — Project Configuration

## Project Overview

A Progressive Web App (PWA) that analyzes room photos to produce:
- A **clutter score** (1–10)
- A **heatmap overlay** highlighting cluttered zones

All ML inference runs fully in-browser via ONNX Runtime Web. No backend server.

Full specification: `SPEC.md`

---

## Two Workstreams

### 1. Model Training

Train a PyTorch model and export it as `clutter_model.onnx`.

**Model requirements (from SPEC.md):**
- Input: `[1, 3, 224, 224]` float32 tensor, ImageNet-normalized
- Output 1: `score` — single float in [1, 10]
- Output 2: `feature_map` — `[1, C, H, W]` from last conv layer (e.g. C=1280, H=7, W=7 for EfficientNet-B2)

**Model file placement after export:**
```
public/models/clutter_model.onnx
```

### 2. Web Application

React 18 + TypeScript PWA built with Vite. See `SPEC.md` for full component and module specs.

---

## Tech Stack

| Concern | Choice |
|---|---|
| Language | TypeScript |
| Framework | React 18 |
| Build tool | Vite |
| ML Inference | onnxruntime-web |
| Styling | Tailwind CSS |
| State | React Context + useReducer |
| History | IndexedDB via `idb` |
| PWA | vite-plugin-pwa + Workbox |

---

## Project Structure

```
/
├── public/
│   ├── models/clutter_model.onnx   # trained model (static asset)
│   ├── icons/                      # PWA icons
│   └── manifest.webmanifest
├── src/
│   ├── ml/                         # ML modules (analyzer, preprocessor, eigenCam)
│   ├── components/                 # React UI components
│   ├── context/                    # AppContext (useReducer)
│   ├── hooks/                      # useCamera, useAnalyzer
│   ├── db/                         # IndexedDB wrapper
│   └── types/
├── .env.development                 # VITE_USE_MOCK_MODEL=true
├── .env.production                  # VITE_USE_MOCK_MODEL=false
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

---

## Dev Commands

```bash
# Install dependencies
npm install

# Development (mock model, HTTPS required for camera)
npm run dev -- --https

# Production build
npm run build

# Preview production build
npm run preview
```

---

## Mock vs Real Model

Controlled by `VITE_USE_MOCK_MODEL` env var:
- `true` → `MockClutterAnalyzer` (fake score + gaussian heatmap, no ONNX needed)
- `false` → `OnnxClutterAnalyzer` (loads `public/models/clutter_model.onnx`)

Build and test the full UI with the mock before the real model is ready.

---

## Key Implementation Notes

- **HTTPS required** — `getUserMedia` is blocked on non-HTTPS. Use `vite --https` locally.
- **iOS Safari** — `<video>` needs `playsinline muted` attributes; camera requires user gesture.
- **Preprocessing must match training** — validate that the same test image produces the same score in Python and in `imagePreprocessor.ts` (tolerance ~0.1).
- **WebGL + WASM fallback** — use `executionProviders: ['webgl', 'wasm']` in ONNX session.
- **EigenCAM heatmap** — power iteration (20–30 iterations) on feature map `[C, H*W]` to get first principal component.
