# Clutter Detector — Browser PWA Specification

## Overview

A Progressive Web App (PWA) that allows the user to take a photo of a room and receive:
- A **clutter score** from 1 to 10 (1 = perfectly tidy, 10 = extremely cluttered)
- A **heatmap overlay** on the photo highlighting the most cluttered zones

All inference runs **fully in the browser** using ONNX Runtime Web. There is no backend server. The app works offline after the first load. It is accessible on any modern mobile or desktop browser via a URL, and can be installed to the home screen as a PWA.

---

## Assumptions

- The ONNX model file (`clutter_model.onnx`) is already trained and exported. It is served as a static asset alongside the app.
- The model accepts a single input tensor of shape `[1, 3, 224, 224]` (batch, channels, height, width), normalized using ImageNet mean and std.
- The model produces two named outputs:
  - `score` — a single float in range [1, 10]
  - `feature_map` — a tensor of shape `[1, C, H, W]` from the last convolutional layer. Typical values: C=1280, H=7, W=7 for EfficientNet-B2.
- Target browsers: Chrome for Android (primary), Safari on iOS (secondary).

---

## Mock Model (Development Phase)

During development the real ONNX model will not be available. A mock implementation is used in its place so the full UI and data pipeline can be built and tested independently.

### ClutterAnalyzer Interface

Define a shared TypeScript interface so the real and mock implementations are interchangeable:

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

    const score = randomFloat(3.0, 9.5);
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

Control which implementation is used via a single environment variable:

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
```

In `.env.production`:
```
VITE_USE_MOCK_MODEL=false
```

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
| Hosting | Vercel or Netlify (static) |

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
│   │   ├── AnalysisView.tsx
│   │   ├── HeatmapOverlay.tsx
│   │   ├── ScoreDisplay.tsx
│   │   └── HistoryList.tsx
│   ├── context/
│   │   └── AppContext.tsx             # Global state via useReducer
│   ├── hooks/
│   │   ├── useCamera.ts
│   │   └── useAnalyzer.ts
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
      registerType: 'autoUpdate',
      workbox: {
        // Cache the model file on first load for offline use
        additionalManifestEntries: [
          { url: '/models/clutter_model.onnx', revision: null }
        ],
        maximumFileSizeToCacheInBytes: 100 * 1024 * 1024  // 100MB
      },
      manifest: {
        name: 'Clutter Detector',
        short_name: 'Clutter',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  optimizeDeps: {
    exclude: ['onnxruntime-web']
  }
});
```

---

## ML Module

### imagePreprocessor.ts

Converts an `ImageData` object (from a Canvas capture) to a normalized `Float32Array` for model input.

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
  3. Extract `score` from the output
  4. Extract `feature_map` tensor and pass to `eigenCam`
  5. Return `AnalysisResult`

### eigenCam.ts

Computes a spatial heatmap from the feature map using Eigen-CAM.

**Algorithm:**
1. Receive feature map of shape `[C, H, W]` (batch dimension stripped)
2. Reshape to a 2D matrix of shape `[C, H*W]`
3. Compute the first principal component via power iteration (full SVD is too expensive in-browser)
4. The result is a vector of length `H*W` — the raw heatmap
5. Apply ReLU (clamp negatives to zero)
6. Normalize to [0.0, 1.0]
7. Return as `Float32Array` of length `H*W` in row-major order

**Power iteration implementation note:** run for 20–30 iterations, which is sufficient for convergence on a 7×7 feature map.

---

## Camera Module

### useCamera.ts (custom hook)

Manages the `getUserMedia` stream and frame capture.

- On mount, request camera access:
  ```typescript
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: 'environment',  // rear camera on mobile
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }
  });
  ```
- Attach the stream to a `<video>` element via a ref
- Expose a `capture()` function that:
  1. Draws the current video frame to an offscreen canvas
  2. Returns the canvas as both an `ImageData` (for the model) and a data URL (for display)
- Clean up the stream on unmount

**iOS note:** on Safari, `getUserMedia` requires the page to be served over HTTPS. Ensure your hosting and local dev setup both use HTTPS.

---

## Application State

Manage global state with React Context + `useReducer`. No external state library needed.

```typescript
type Screen = 'camera' | 'analyzing' | 'result' | 'history';

interface AppState {
  screen: Screen;
  capturedImageUrl: string | null;
  analysisResult: AnalysisResult | null;
  error: string | null;
  isModelLoading: boolean;
}

type Action =
  | { type: 'MODEL_LOADED' }
  | { type: 'CAPTURE'; imageUrl: string }
  | { type: 'ANALYSIS_COMPLETE'; result: AnalysisResult }
  | { type: 'ERROR'; message: string }
  | { type: 'RETAKE' }
  | { type: 'SHOW_HISTORY' }
  | { type: 'HIDE_HISTORY' };
```

---

## UI Components

### App.tsx

- On mount, call `analyzer.load()` and dispatch `MODEL_LOADED` when ready
- Render the correct screen based on `AppState.screen`
- Show a full-screen loading spinner while `isModelLoading` is true

### CameraView.tsx

**Layout:**
- Full-screen `<video>` element showing the live camera feed
- Circular capture button centered at the bottom
- History icon button in the top-right corner
- Brief loading overlay while model is loading on first visit

**Behavior:**
- On capture button tap:
  - Call `useCamera.capture()` to freeze the frame
  - Dispatch `CAPTURE` action and transition to `analyzing` screen
  - Call `analyzer.analyze()` in the background
  - On success dispatch `ANALYSIS_COMPLETE`
  - On error dispatch `ERROR` and return to `camera` screen with a toast message

### AnalysisView.tsx

**Layout:**
- Top section (60% of viewport height):
  - The captured photo as a `<img>` or `<canvas>` base layer
  - `HeatmapOverlay` component rendered on top using absolute positioning
  - Opacity range slider at the bottom of this section
- Bottom section (40% of viewport height):
  - `ScoreDisplay` component with the animated score
  - Score band label ("Tidy" / "Moderate clutter" / "Cluttered")
  - "Retake" button that dispatches `RETAKE` and returns to camera

### HeatmapOverlay.tsx

Renders the heatmap grid as a semi-transparent canvas overlay on top of the photo.

- Accepts `heatmap: Float32Array`, `width: number`, `height: number`, `opacity: number`
- Uses a `<canvas>` element sized to match the photo
- Renders each grid cell as a filled rectangle colored by value:
  - 0.0 → blue `rgb(0, 0, 255)`
  - 0.5 → yellow `rgb(255, 255, 0)`
  - 1.0 → red `rgb(255, 0, 0)`
  - Interpolate linearly through HSV between these stops
- Apply bilinear interpolation across grid cell values before rendering for a smooth appearance
- Re-renders when `opacity` slider changes

### ScoreDisplay.tsx

- Animates the numeric score from 0 to its final value over ~800ms using `requestAnimationFrame`
- Displays as a large number, e.g. `7.4 / 10`
- Color of the number reflects the score band:
  - 1–3: green
  - 4–6: amber
  - 7–10: red

### HistoryList.tsx

**Layout:**
- Full-screen overlay sliding up from the bottom
- Scrollable list of past analyses, newest first
- Each item shows:
  - Thumbnail of the captured photo
  - Score badge with appropriate color
  - Human-readable timestamp ("Today 14:32", "Yesterday 09:15")
- Empty state message if no history exists
- Tapping an item navigates to `AnalysisView` showing that historical result
- Close button returns to camera screen

---

## History Persistence

Use IndexedDB via the `idb` library to persist analysis history across sessions.

### historyDb.ts

```typescript
interface HistoryEntry {
  id?: number;
  score: number;
  imageDataUrl: string;   // base64 JPEG thumbnail (resized to 200px width)
  timestamp: number;      // Date.now()
}
```

- `saveEntry(entry: HistoryEntry): Promise<number>` — saves and returns the generated id
- `getAllEntries(): Promise<HistoryEntry[]>` — returns all entries ordered by timestamp descending
- `deleteEntry(id: number): Promise<void>`

Store thumbnails as small resized JPEGs (200px width) to keep IndexedDB storage reasonable. Do not store the full-resolution image.

---

## PWA & Offline Behaviour

- The Service Worker (generated by Workbox via `vite-plugin-pwa`) caches:
  - All app JS/CSS/HTML bundles
  - The ONNX model file (`clutter_model.onnx`)
- After the first load, the app works fully offline including inference
- On iOS, the user must use Safari and "Add to Home Screen" for PWA installation
- On Android Chrome, the browser shows an automatic "Add to Home Screen" banner

---

## Error Handling

| Scenario | Handling |
|---|---|
| Camera permission denied | Show a clear message explaining why camera is needed, with a link to browser settings |
| `getUserMedia` not supported | Show a message that the browser is not supported, suggest Chrome or Safari |
| Model file fails to load | Show a full-screen error with a retry button |
| ONNX inference throws | Show a toast error, return to camera screen |
| Page not served over HTTPS | Camera API will be unavailable — ensure HTTPS in all environments |
| IndexedDB unavailable (private browsing on some browsers) | Catch the error silently, disable history feature, show a notice |

---

## Implementation Notes

- **HTTPS is required.** `getUserMedia` is blocked on non-HTTPS origins in all modern browsers. Use `vite --https` locally with a self-signed cert, and ensure your hosting provider serves over HTTPS (Vercel and Netlify do this by default).
- **Model loading is slow on first visit.** The ONNX file may be 10–30MB. Show a prominent loading indicator. After the first load the Service Worker caches it and subsequent loads are instant.
- **WebGL vs WASM.** WebGL inference is significantly faster on mobile but has compatibility gaps (particularly on some iOS versions). Always implement the WASM fallback.
- **Preprocessing must exactly match training.** Before integrating the real model, validate that running the same test image through Python and through `imagePreprocessor.ts` produces identical scores. A mismatch of more than ~0.1 indicates a preprocessing bug.
- **iOS Safari quirks.** On iOS, the video stream may not autoplay without the `playsinline` and `muted` attributes on the `<video>` element. Camera access also requires explicit user gesture — do not attempt to start the stream automatically on page load.
- **Memory.** Release `ImageData` and intermediate canvas objects after inference to avoid memory leaks, especially relevant during repeated captures in a single session.

---

## Build & Deployment

```bash
# Development (mock model, HTTPS)
npm run dev -- --https

# Production build
npm run build

# Preview production build locally
npm run preview
```

Deploy the contents of `dist/` to Vercel or Netlify by connecting the Git repository. Both platforms detect Vite projects automatically and configure the build command and output directory correctly. The app is then accessible at a public HTTPS URL that can be opened on any phone.
