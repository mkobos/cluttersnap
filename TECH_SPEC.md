# Clutter Detector — Technical Specification

## Architecture

The app is split into two independently deployable layers:

```
┌─────────────────────────────────┐       ┌──────────────────────────────────┐
│  React UI (TypeScript)          │       │  Python API (FastAPI)             │
│                                 │       │                                   │
│  - Camera capture               │ POST  │  - Image decode + resize 224×224  │
│  - Send image → API             │──────►│  - ImageNet normalization          │
│  - Render heatmap overlay       │◄──────│  - ONNX Runtime inference          │
│  - Show score                   │ JSON  │  - Eigen-CAM heatmap               │
│  - History (IndexedDB)          │       │  - Return score + heatmap          │
└─────────────────────────────────┘       └──────────────────────────────────┘
```

---

## API Contract

```
POST /api/analyze
Content-Type: multipart/form-data
Body: image (JPEG/PNG, any size)

Response 200:
{
  "score": 7.3,      // float, 1.0–10.0
  "heatmap": [       // 2D array, same H×W as the input image, values 0.0–1.0
    [0.1, 0.3, ...],
    ...
  ]
}
```

The server returns the heatmap at the same pixel dimensions as the uploaded image, so the frontend renders it directly over the photo without client-side interpolation.

---

## Model Contract

The ONNX model (`clutter_model.onnx`) is stored in Vercel Blob and downloaded by the Python API on first invocation.

- **Input:** single tensor of shape `[1, 3, 224, 224]` (batch, channels, height, width), normalized using ImageNet mean and std
- **Output 1 — `score`:** single float, must be in [1, 10]
- **Output 2 — `feature_map`:** tensor of shape `[1, C, H, W]` from the last convolutional layer. Typical values: C=1280, H=7, W=7 for EfficientNet-B2

---

## Tech Stack

### Python API

| Concern | Library / Tool |
|---|---|
| Language | Python 3.14 |
| Web framework | FastAPI |
| ML Inference | onnxruntime (CPU) |
| Image processing | Pillow, NumPy |
| Hosting | Vercel Python serverless function |

### React UI

| Concern | Library / Tool |
|---|---|
| Language | TypeScript |
| Framework | React 18 |
| Build tool | Vite |
| Camera | `getUserMedia` browser API |
| Canvas rendering | HTML5 Canvas 2D API, OffscreenCanvas |
| Styling | Tailwind CSS |
| State management | React Context + `useReducer` |
| History persistence | IndexedDB via `idb` |
| PWA | `vite-plugin-pwa` + Workbox |
| Hosting | Vercel |

---

## Project Structure

```
/
├── api/
│   ├── index.py              # FastAPI app — POST /api/analyze
│   ├── preprocessor.py       # Image resize + ImageNet normalization
│   ├── eigen_cam.py          # Eigen-CAM heatmap computation + upsample
│   ├── analyzer.py           # OnnxAnalyzer: wraps onnxruntime session
│   ├── mock_analyzer.py      # Synthetic score + Gaussian heatmap
│   └── requirements.txt
├── public/
│   ├── icons/                # PWA icons (192px, 512px)
│   ├── manifest.webmanifest
│   └── favicon.ico
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── ml/
│   │   ├── ApiClutterAnalyzer.ts   # POSTs to /api/analyze, parses response
│   │   └── analyzerFactory.ts      # Returns ApiClutterAnalyzer instance
│   ├── components/
│   │   ├── CameraView.tsx
│   │   ├── AnalyzingView.tsx
│   │   ├── ResultView.tsx
│   │   ├── HeatmapOverlay.tsx
│   │   ├── ScoreDisplay.tsx
│   │   └── HistoryList.tsx
│   ├── context/
│   │   └── AppContext.tsx           # Global state via useReducer
│   ├── hooks/
│   │   ├── useCameraPermission.ts
│   │   ├── useCamera.ts
│   │   └── useHistory.ts
│   ├── db/
│   │   └── historyDb.ts             # IndexedDB wrapper via idb
│   └── types/
│       └── index.ts
├── tests/
│   ├── python/
│   │   ├── test_preprocessor.py
│   │   ├── test_eigen_cam.py
│   │   └── test_index.py
│   ├── ml/
│   │   └── ApiClutterAnalyzer.test.ts
│   ├── components/
│   ├── context/
│   └── db/
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

---

## Python API Modules

### preprocessor.py

Converts a raw image to the normalized tensor expected by the ONNX model.

- Accept any size `HxWx3` uint8 RGB NumPy array
- Resize to 224×224 using Pillow BILINEAR
- Scale pixel values to [0.0, 1.0] and apply ImageNet statistics:
  - mean = [0.485, 0.456, 0.406]
  - std  = [0.229, 0.224, 0.225]
- Output layout: NCHW float32, shape `[1, 3, 224, 224]`

### eigen_cam.py

Computes a spatial heatmap from the model's feature map and upsamples it to the original image dimensions.

**Algorithm:**
1. Receive feature map of shape `[1, C, H, W]`; strip batch dimension → `[C, H*W]` matrix M
2. Find the dominant right singular vector of M via power iteration on M^T M:
   - Initialize vector `v` = all-ones, length `H*W`
   - Each iteration: `v = M^T (M v)`, normalize by L2 norm (25 iterations)
   - If norm is zero, return all-zeros heatmap
3. Apply ReLU (clamp negatives to zero)
4. Normalize to [0.0, 1.0]
5. Reshape to `[H, W]` and bilinearly upsample to `[target_h, target_w]` using Pillow mode `'F'` (preserves float precision)
6. Return as `(target_h, target_w)` float32 array

### mock_analyzer.py

Returns a synthetic result when `USE_MOCK_MODEL=true`. Places 1–3 Gaussian hot spots at random positions on a zero-filled grid of the input image's dimensions, then normalizes the result to [0, 1]. Score is a uniform random float in [1.0, 10.0].

### analyzer.py

Wraps an `onnxruntime.InferenceSession`. `load()` creates the session from the model path. `analyze(img)` calls `preprocessor → onnxruntime.run → eigen_cam` and returns `{"score": float, "heatmap": list[list[float]]}`.

### index.py

FastAPI entry point. On cold start, downloads the ONNX model from `MODEL_BLOB_URL` to `/tmp/clutter_model.onnx` and creates the singleton `OnnxAnalyzer`. Warm invocations reuse the cached session. When `USE_MOCK_MODEL=true`, skips model loading entirely and delegates to `mock_analyzer`.

---

## Frontend — ClutterAnalyzer Interface

`ClutterAnalyzer` (`src/types/index.ts`) exposes two methods:
- `load(): Promise<void>` — no-op for the API client (nothing to load on the browser side)
- `analyze(imageData: ImageData): Promise<AnalysisResult>`

`AnalysisResult`:
```typescript
interface AnalysisResult {
  score: number;          // 1.0–10.0
  heatmap: Float32Array;  // flattened [H*W], normalized 0–1, row-major
  heatmapWidth: number;   // = original image width
  heatmapHeight: number;  // = original image height
}
```

### ApiClutterAnalyzer.ts

Implements `ClutterAnalyzer` against the Python API.

1. Convert `ImageData` → JPEG blob via `OffscreenCanvas.convertToBlob()`
2. POST to `/api/analyze` as `multipart/form-data`
3. Parse JSON response: `{ score, heatmap: number[][] }`
4. Derive `heatmapWidth = heatmap[0].length`, `heatmapHeight = heatmap.length`
5. Flatten 2D array row-major into `Float32Array`
6. Return `AnalysisResult`

---

## Camera Module

### useCameraPermission.ts

Handles camera permission request — used by the Loading screen.

- Detects iOS via `typeof DeviceMotionEvent.requestPermission === 'function'`
- On iOS: exposes `requestPermission()` to be called from a user gesture (button tap)
- On non-iOS: calls `navigator.mediaDevices.getUserMedia()` automatically on mount; discards stream after permission is granted
- Exposes `{ isIos, permissionState: 'prompt' | 'granted' | 'denied' | 'unsupported' }`

### useCamera.ts

Manages the `getUserMedia` stream and frame capture. Mounted only inside `CameraView`.

- Creates and returns a `videoRef` for the `<video>` element
- Acquires the camera stream: `facingMode: { ideal: 'environment' }`, `width: { ideal: 1280 }`, `height: { ideal: 720 }`
- Exposes `capture()`: draws the current frame to an offscreen canvas, returns `{ imageData: ImageData, dataUrl: string }`
- Cleans up the stream on unmount

**iOS:** the `<video>` element must have `playsinline` and `muted` attributes.

---

## Application State

Managed in `AppContext.tsx` via `useReducer`. Screens: `camera`, `analyzing`, `result`, `history`. State tracks: captured image URL, last analysis result, error message, how the result screen was reached (`resultSource: 'capture' | 'history'`), and whether a service worker update is waiting.

Actions: `CAPTURE`, `ANALYSIS_COMPLETE`, `ERROR`, `RETAKE`, `SHOW_HISTORY`, `HIDE_HISTORY`, `VIEW_HISTORY_RESULT`, `BACK_TO_HISTORY`, `UPDATE_AVAILABLE`.

The app starts directly on the Camera screen — there is no model loading phase.

---

## UI Components

### App.tsx

- Creates an `ApiClutterAnalyzer('/api/analyze')` instance once via `useRef` (no async init)
- Shows `LoadingScreen` while camera permission is not yet granted (`permissionState !== 'granted'`)
- Renders the correct screen based on `AppState.screen`
- Listens for service worker updates using `workbox-window`'s `Workbox` class

### CameraView.tsx

- On capture button tap:
  1. Calls `capture()` → `{ imageData, dataUrl }`
  2. Dispatches `CAPTURE`
  3. Calls `analyzer.analyze(imageData)` — sends image to API
  4. On success dispatches `ANALYSIS_COMPLETE`; on error dispatches `ERROR`

### HeatmapOverlay.tsx

Props: `heatmap: Float32Array`, `heatmapWidth: number`, `heatmapHeight: number`, `displayWidth: number`, `displayHeight: number`, `opacity: number`

- `displayWidth`/`displayHeight` are the pixel dimensions of the letterboxed photo as rendered — computed by `ResultView` from the image's natural aspect ratio in an `onLoad` + `requestAnimationFrame` callback
- Draws heatmap at native resolution onto an `OffscreenCanvas`, then scales it to display dimensions in a single `drawImage` call (GPU-accelerated)
- Color mapping (linear HSV decreasing-hue interpolation):
  - 0.0 → blue (HSV 240°)
  - 0.5 → yellow (HSV 60°)
  - 1.0 → red (HSV 0°)

### ScoreDisplay.tsx

- Rounds the raw float score to the nearest integer
- Animates from 0 to the rounded value over ~800ms via `requestAnimationFrame`
- Color and label: 1–3 green ("Tidy"), 4–6 amber ("Moderate clutter"), 7–10 red ("Cluttered")

---

## History Persistence

Database: `"cluttersnap"`, object store: `"history"` (via `idb`).

Each `HistoryEntry` stores: `id`, `score`, `imageDataUrl` (full JPEG), `thumbnailDataUrl` (200px-wide JPEG, quality 0.7), `heatmap` (Float32Array, flattened), `heatmapWidth`, `heatmapHeight`, `timestamp`.

`useHistory.ts` owns all IndexedDB interaction. `saveEntry` generates a thumbnail via an offscreen canvas, writes to IndexedDB, and prepends to the local list. `deleteEntry` removes from both.

---

## Implementation Notes

- **HTTPS is required.** `getUserMedia` is blocked on non-HTTPS origins. Use `vite --https` locally; Vercel serves over HTTPS by default.
- **Model on Vercel Blob.** The Python function downloads the ONNX file from `MODEL_BLOB_URL` on cold start and caches it to `/tmp`. Warm invocations skip the download. Update the URL when the model changes.
- **Preprocessing must exactly match training.** Running the same test image through `preprocessor.py` and through the original training pipeline should produce the same ONNX output (score tolerance ~0.1). A larger mismatch indicates a normalization bug.
- **No offline inference.** The app requires network access to call the API. History viewing works offline (IndexedDB), but capture and analysis require connectivity.
- **Bundle size.** Removing `onnxruntime-web` eliminates ~15 MB from the JS bundle and the 10–30 MB model download on first visit.
