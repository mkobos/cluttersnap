# Clutter Detector — Technical Specification

## Model Contract

The ONNX model file (`clutter_model.onnx`) is served as a static asset. It is assumed to already be trained and exported.

- **Input:** single tensor of shape `[1, 3, 224, 224]` (batch, channels, height, width), normalized using ImageNet mean and std
- **Output 1 — `score`:** single float. Must be in [1, 10]; if outside this range, treat as an inference error
- **Output 2 — `feature_map`:** tensor of shape `[1, C, H, W]` from the last convolutional layer. Typical values: C=1280, H=7, W=7 for EfficientNet-B2

---

## Tech Stack

| Concern | Library / Tool |
|---|---|
| Language | TypeScript |
| Framework | React 18 |
| Build tool | Vite |
| ML Inference | onnxruntime-web |
| Camera | `getUserMedia` browser API |
| Canvas rendering | HTML5 Canvas 2D API |
| Styling | Tailwind CSS |
| State management | React Context + `useReducer` |
| History persistence | IndexedDB via `idb` |
| PWA | `vite-plugin-pwa` + Workbox |
| Hosting | Vercel |

---

## Project Structure

```
/
├── public/
│   ├── models/
│   │   └── clutter_model.onnx
│   ├── icons/                        # PWA icons (192px, 512px)
│   ├── manifest.webmanifest
│   └── favicon.ico
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── ml/
│   │   ├── ClutterAnalyzer.ts        # Interface + AnalysisResult type
│   │   ├── MockClutterAnalyzer.ts
│   │   ├── OnnxClutterAnalyzer.ts
│   │   ├── analyzerFactory.ts
│   │   ├── imagePreprocessor.ts
│   │   └── eigenCam.ts
│   ├── components/
│   │   ├── CameraView.tsx
│   │   ├── AnalyzingView.tsx
│   │   ├── ResultView.tsx
│   │   ├── HeatmapOverlay.tsx
│   │   ├── ScoreDisplay.tsx
│   │   └── HistoryList.tsx
│   ├── context/
│   │   └── AppContext.tsx             # Global state via useReducer
│   ├── hooks/
│   │   ├── useCameraPermission.ts
│   │   ├── useCamera.ts
│   │   └── useHistory.ts
│   ├── db/
│   │   └── historyDb.ts              # IndexedDB wrapper via idb
│   └── types/
│       └── index.ts
├── .env.development
├── .env.production
├── vite.config.ts
├── tailwind.config.ts
└── package.json
```

---

## Package Dependencies

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "onnxruntime-web": "^1.18.0",
    "idb": "^8.0.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vite": "^5.2.0",
    "vite-plugin-pwa": "^0.20.0",
    "@vitejs/plugin-react": "^4.2.0",
    "tailwindcss": "^3.4.0",
    "workbox-window": "^7.1.0"
  }
}
```

---

## Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',  // controls browser install prompt; app-level update banner uses workbox-window's 'waiting' event (see App.tsx)
      workbox: {
        // Cache the model file on first load for offline use.
        // revision is VITE_MODEL_VERSION (set in .env files) — only bump when the model file itself changes,
        // not on every UI deploy, to avoid unnecessary re-downloads of a 10–30MB file.
        additionalManifestEntries: [
          { url: '/models/clutter_model.onnx', revision: process.env.VITE_MODEL_VERSION ?? null }
        ],
        maximumFileSizeToCacheInBytes: 100 * 1024 * 1024  // 100MB
      },
      manifest: {
        name: 'Clutter Detector',
        short_name: 'Clutter',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'any',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  optimizeDeps: {
    // onnxruntime-web must be excluded from Vite's dependency pre-bundling because it
    // loads WASM files and web workers via dynamic imports that break under Vite's optimizer.
    exclude: ['onnxruntime-web']
  }
});
```

---

## Mock Model

During development the real ONNX model will not be available. A mock implementation is used in its place.

### ClutterAnalyzer Interface

```typescript
export interface AnalysisResult {
  score: number;           // 1.0–10.0
  heatmap: Float32Array;   // flattened [H*W], normalized 0–1, row-major
  heatmapWidth: number;    // e.g. 7
  heatmapHeight: number;   // e.g. 7
}

export interface ClutterAnalyzer {
  load(): Promise<void>;
  analyze(imageData: ImageData): Promise<AnalysisResult>;
}
```

### MockClutterAnalyzer.ts

```typescript
export class MockClutterAnalyzer implements ClutterAnalyzer {

  async load(): Promise<void> {
    // Simulate model loading delay
    await delay(800);
  }

  async analyze(_imageData: ImageData): Promise<AnalysisResult> {
    // Simulate inference latency
    await delay(1200);

    const score = randomFloat(1.0, 10.0);
    const W = 7, H = 7;
    const heatmap = generateMockHeatmap(W, H);

    return { score, heatmap, heatmapWidth: W, heatmapHeight: H };
  }
}

function generateMockHeatmap(W: number, H: number): Float32Array {
  // Place 1–3 gaussian hot spots for a spatially coherent result
  const grid = new Float32Array(W * H);
  const numSpots = randomInt(1, 3);

  for (let i = 0; i < numSpots; i++) {
    const cx = randomFloat(0, W - 1);
    const cy = randomFloat(0, H - 1);
    const intensity = randomFloat(0.5, 1.0);
    const sigma = randomFloat(1.0, 2.5);

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const dist = (x - cx) ** 2 + (y - cy) ** 2;
        grid[y * W + x] += intensity * Math.exp(-dist / (2 * sigma ** 2));
      }
    }
  }

  const max = Math.max(...grid);
  return max > 0 ? grid.map(v => v / max) : grid;
}
```

### Switching Between Mock and Real

```typescript
// src/ml/analyzerFactory.ts
import { MockClutterAnalyzer } from './MockClutterAnalyzer';
import { OnnxClutterAnalyzer } from './OnnxClutterAnalyzer';

export function createAnalyzer(): ClutterAnalyzer {
  if (import.meta.env.VITE_USE_MOCK_MODEL === 'true') {
    return new MockClutterAnalyzer();
  }
  return new OnnxClutterAnalyzer('/models/clutter_model.onnx');
}
```

In `.env.development`:
```
VITE_USE_MOCK_MODEL=true
VITE_MODEL_VERSION=dev
```

In `.env.production`:
```
VITE_USE_MOCK_MODEL=false
VITE_MODEL_VERSION=1
```

Bump `VITE_MODEL_VERSION` in `.env.production` only when the ONNX model file itself is updated.

---

## ML Modules

### imagePreprocessor.ts

Converts an `ImageData` object (from a canvas capture) to a normalized `Float32Array` for model input.

- Resize the captured frame to 224×224 using an offscreen canvas
- Convert RGBA pixel data to float, scale from [0, 255] to [0.0, 1.0]
- Normalize each channel using ImageNet statistics:
  - mean = [0.485, 0.456, 0.406]
  - std  = [0.229, 0.224, 0.225]
- Output tensor layout: CHW (channels first), shape [3, 224, 224]
- Return as a `Float32Array` of length 150528

### OnnxClutterAnalyzer.ts

Wraps the ONNX Runtime Web session.

- `load()` fetches and initializes the ONNX session. Use the WebGL execution provider first, falling back to WASM:
  ```typescript
  const session = await InferenceSession.create(modelUrl, {
    executionProviders: ['webgl', 'wasm']
  });
  ```
- `analyze(imageData)` runs the full pipeline:
  1. Call `imagePreprocessor` to get the input tensor
  2. Run the ONNX session
  3. Extract `score` from the output; throw if outside [1, 10]
  4. Extract `feature_map` tensor and pass to `eigenCam`
  5. Return `AnalysisResult`

### eigenCam.ts

Computes a spatial heatmap from the feature map using Eigen-CAM.

**Algorithm:**
1. Receive feature map of shape `[C, H, W]` (batch dimension stripped)
2. Reshape to a 2D matrix `M` of shape `[C, H*W]`
3. Compute the dominant right singular vector of `M` via power iteration on `M^T M` (full SVD is too expensive in-browser):
   - Initialize vector `v` with all-ones of length `H*W`
   - Each iteration: `v = M^T (M v)`, then normalize `v` by its L2 norm
   - Run 20–30 iterations (sufficient for convergence on a 7×7 feature map)
   - If the norm of `v` is zero at any iteration, return a flat all-zeros heatmap (no spatial signal)
4. The result is a vector of length `H*W` — the raw heatmap
5. Apply ReLU (clamp negatives to zero)
6. Normalize to [0.0, 1.0]
7. Return as `Float32Array` of length `H*W` in row-major order

---

## Camera Module

### useCameraPermission.ts

Handles camera permission request only — used by the Loading screen.

- Detects iOS via `typeof DeviceMotionEvent.requestPermission === 'function'`
- On iOS: exposes a `requestPermission()` function to be called from a user gesture (a button tap on the Loading screen)
- On non-iOS: calls `navigator.mediaDevices.getUserMedia()` automatically on mount to trigger the permission prompt; discards the stream immediately after permission is granted
- Exposes `{ isIos, permissionState: 'prompt' | 'granted' | 'denied' | 'unsupported' }`

### useCamera.ts

Manages the `getUserMedia` stream and frame capture. Mounted only inside `CameraView`.

- Creates and returns a `videoRef` for the component to attach to the `<video>` element
- On mount, acquires the camera stream:
  ```typescript
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: 'environment' },  // rear camera on mobile; ideal (not exact) falls back silently if unavailable
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }
  });
  ```
- Attaches the stream to the video element via the ref
- Exposes a `capture()` function that:
  1. Draws the current video frame to an offscreen canvas
  2. Returns `{ imageData: ImageData, dataUrl: string }`
- Cleans up the stream on unmount

**iOS:** the `<video>` element must have `playsinline` and `muted` attributes.

---

## Application State

```typescript
type Screen = 'camera' | 'analyzing' | 'result' | 'history';

interface AppState {
  screen: Screen;
  capturedImageUrl: string | null;
  analysisResult: AnalysisResult | null;
  error: string | null;
  isModelLoading: boolean;
  resultSource: 'capture' | 'history' | null;  // tracks how the result screen was reached
  updateAvailable: boolean;                     // true when a new SW version is waiting
}

type Action =
  | { type: 'MODEL_LOADED' }
  | { type: 'CAPTURE'; imageUrl: string }
  | { type: 'ANALYSIS_COMPLETE'; result: AnalysisResult }
  | { type: 'ERROR'; message: string }
  | { type: 'RETAKE' }              // clears capturedImageUrl + analysisResult, returns to camera
  | { type: 'SHOW_HISTORY' }
  | { type: 'HIDE_HISTORY' }        // returns to camera without clearing capture state
  | { type: 'VIEW_HISTORY_RESULT'; imageUrl: string; result: AnalysisResult }  // opens a historical result
  | { type: 'BACK_TO_HISTORY' }     // from result screen back to history overlay
  | { type: 'UPDATE_AVAILABLE' };   // service worker has a new version ready

// Note: ImageData for inference is NOT stored in AppState. CameraView stores it in a
// local ref after capture() and passes it directly to analyzer.analyze().
```

---

## UI Components

### App.tsx

- On mount, calls `analyzer.load()` and dispatches `MODEL_LOADED` when ready
- Renders the correct screen based on `AppState.screen`; does not mount `CameraView` until `isModelLoading` is false
- Listens for service worker updates using `workbox-window`'s `Workbox` class: registers the SW, listens for the `waiting` event, and dispatches `UPDATE_AVAILABLE` when a new version is ready. Note: `registerType: 'prompt'` in `vite-plugin-pwa` only controls the browser's install prompt — the app-level "New version available" banner requires this explicit `waiting` event listener.
- The banner is rendered only when `AppState.screen === 'camera'` — never on the analyzing or result screens.

### CameraView.tsx

- Uses `useCamera()` which returns `{ videoRef, capture }`
- On capture button tap:
  1. Calls `capture()` to get `{ imageData, dataUrl }`
  2. Stores `imageData` in a local ref
  3. Dispatches `CAPTURE` with `imageUrl: dataUrl`
  4. Calls `analyzer.analyze(imageData)` using the local ref
  5. On success dispatches `ANALYSIS_COMPLETE`; on error dispatches `ERROR`

### AnalyzingView.tsx

- Renders the captured photo (`capturedImageUrl` from state) full-width
- Shows a loading indicator overlay to communicate that inference is in progress

### ResultView.tsx

- Renders the captured photo letterboxed (object-fit: contain) in the top 60% of the viewport
- Renders the `HeatmapOverlay` absolutely positioned over the photo
- Passes the opacity slider value (default 50%) as a prop to `HeatmapOverlay`
- When `resultSource === 'capture'`: shows a "Retake" button that dispatches `RETAKE`
- When `resultSource === 'history'`: shows a "Back" button that dispatches `BACK_TO_HISTORY`; no "Retake" button

### HeatmapOverlay.tsx

Props: `heatmap: Float32Array`, `heatmapWidth: number`, `heatmapHeight: number`, `displayWidth: number`, `displayHeight: number`, `opacity: number`

- `displayWidth` and `displayHeight` are the pixel dimensions of the letterboxed photo as rendered — computed by `ResultView` from the image's natural aspect ratio on `onLoad` and passed as props
- Uses a `<canvas>` element sized to `displayWidth × displayHeight`, absolutely positioned over the photo
- Bilinearly interpolates the heatmap grid up to the canvas display dimensions before rendering
- Color mapping — interpolate linearly through HSV in the clockwise (decreasing hue) direction between these stops:
  - 0.0 → blue (HSV 240°, 100%, 100%)
  - 0.5 → yellow (HSV 60°, 100%, 100%)
  - 1.0 → red (HSV 0°, 100%, 100%)

### ScoreDisplay.tsx

- Rounds the raw float score to the nearest integer; uses that integer for both display and band assignment
- Animates from 0 to the rounded value over ~800ms using `requestAnimationFrame`
- Displays as a large integer, e.g. `7 / 10`
- Color and label reflect the score band: 1–3 green ("Tidy"), 4–6 amber ("Moderate clutter"), 7–10 red ("Cluttered")

### HistoryList.tsx

- On mount, reads history entries from the `useHistory` hook
- On item tap, dispatches `VIEW_HISTORY_RESULT` with the entry's `imageDataUrl` and reconstructed `AnalysisResult`
- Swipe left on an item reveals a "Delete" button; tapping "Delete" calls `useHistory.deleteEntry(id)` and removes the item from the local list
- Close button dispatches `HIDE_HISTORY`
- If `useHistory.isAvailable` is false, renders the empty state with an explanation that history is unavailable

---

## History Hook

### useHistory.ts

Owns all IndexedDB interaction. Mounted in `App.tsx`.

- On mount, calls `historyDb.isAvailable()` and sets `isAvailable`
- If available, calls `historyDb.getAllEntries()` to populate the local entries list
- Exposes:
  - `entries: HistoryEntry[]` — all history entries, newest first
  - `isAvailable: boolean` — false if IndexedDB is unavailable (e.g. private browsing)
  - `saveEntry(result: AnalysisResult, imageDataUrl: string): Promise<void>` — generates a 200px-wide JPEG thumbnail (quality 0.7) from `imageDataUrl` using an offscreen canvas, then saves the full entry to IndexedDB and prepends it to `entries`
  - `deleteEntry(id: number): Promise<void>` — removes from IndexedDB and from `entries`
  - `saveError: string | null` — set if a `saveEntry` call fails (e.g. storage quota exceeded); cleared on the next successful save

`CameraView` calls `saveEntry` after `ANALYSIS_COMPLETE` is dispatched. If `saveError` is set, `CameraView` shows a brief toast.

---

## History Persistence

Database: `"cluttersnap"`, object store: `"history"` (via `idb`).

```typescript
interface HistoryEntry {
  id?: number;
  score: number;
  imageDataUrl: string;          // base64 JPEG of the full captured photo
  thumbnailDataUrl: string;      // base64 JPEG thumbnail, 200px width, for list rendering
  heatmap: Float32Array;         // flattened heatmap, normalized 0–1, row-major
  heatmapWidth: number;
  heatmapHeight: number;
  timestamp: number;             // Date.now()
}
```

- `isAvailable(): Promise<boolean>` — attempts to open the DB; returns false on any error (e.g. private browsing, security restrictions)
- `saveEntry(entry: HistoryEntry): Promise<number>` — saves and returns the generated id
- `getAllEntries(): Promise<HistoryEntry[]>` — returns all entries ordered by timestamp descending
- `deleteEntry(id: number): Promise<void>`

Both the full photo and a 200px-wide JPEG thumbnail (quality 0.7) are stored. The thumbnail is used for the history list; the full photo is used when reopening a result from history.

---

## Implementation Notes

- **HTTPS is required.** `getUserMedia` is blocked on non-HTTPS origins. Use `vite --https` locally; Vercel serves over HTTPS by default.
- **Model loading is slow on first visit.** The ONNX file may be 10–30MB. After the first load the Service Worker caches it and subsequent loads are instant.
- **WebGL vs WASM.** WebGL inference is significantly faster on mobile but has compatibility gaps on some iOS versions. Always keep the WASM fallback.
- **Preprocessing must exactly match training.** Validate that running the same test image through Python and `imagePreprocessor.ts` produces the same score (tolerance ~0.1). A larger mismatch indicates a preprocessing bug.
- **Memory.** Release `ImageData` and intermediate canvas objects after inference to avoid leaks during repeated captures in a single session.
