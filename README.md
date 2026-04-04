# Clutter Detector

[![Tests](https://github.com/mkobos/cluttersnap/actions/workflows/test.yml/badge.svg)](https://github.com/mkobos/cluttersnap/actions/workflows/test.yml)

A Progressive Web App that analyzes room photos and produces a clutter score and heatmap overlay. All ML inference runs fully in the browser via ONNX Runtime Web.

## Development

```bash
# Install dependencies
npm install

# Development server (mock model, HTTPS required for camera)
npm run dev -- --https

# Production build
npm run build

# Preview production build locally
npm run preview
```

## Deployment

Hosted on Vercel. Connect the Git repository in the Vercel dashboard — it detects Vite projects automatically and sets the build command (`vite build`) and output directory (`dist`) correctly. The app is served over HTTPS at the assigned Vercel URL.

## Documentation

- `USER_SPEC.md` — product specification (screens, interactions, error handling)
- `TECH_SPEC.md` — technical specification (architecture, modules, algorithms, data structures)
