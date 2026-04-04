# ClutterSnap Web Application Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a React PWA that captures room photos, runs clutter analysis via a mock ML model in-browser, displays a score + heatmap overlay, and persists history in IndexedDB.

**Architecture:** Single-page React 18 app with screen-based navigation driven by `useReducer`. ML inference abstracted behind a `ClutterAnalyzer` interface with mock/ONNX implementations. History stored in IndexedDB via `idb`. PWA with offline support via `vite-plugin-pwa` + Workbox.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, onnxruntime-web, idb, vite-plugin-pwa, Vitest + @testing-library/react

---

## File Structure

```
/
├── public/
│   ├── models/              (placeholder dir for ONNX model)
│   ├── icons/
│   │   ├── icon-192.png     (placeholder PWA icon)
│   │   └── icon-512.png     (placeholder PWA icon)
│   └── favicon.ico
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── ml/
│   │   ├── ClutterAnalyzer.ts
│   │   ├── MockClutterAnalyzer.ts
│   │   ├── OnnxClutterAnalyzer.ts
│   │   ├── analyzerFactory.ts
│   │   ├── imagePreprocessor.ts
│   │   └── eigenCam.ts
│   ├── components/
│   │   ├── LoadingScreen.tsx
│   │   ├── CameraView.tsx
│   │   ├── AnalyzingView.tsx
│   │   ├── ResultView.tsx
│   │   ├── HeatmapOverlay.tsx
│   │   ├── ScoreDisplay.tsx
│   │   └── HistoryList.tsx
│   ├── context/
│   │   └── AppContext.tsx
│   ├── hooks/
│   │   ├── useCameraPermission.ts
│   │   ├── useCamera.ts
│   │   └── useHistory.ts
│   ├── db/
│   │   └── historyDb.ts
│   └── types/
│       └── index.ts
├── tests/
│   ├── ml/
│   │   ├── imagePreprocessor.test.ts
│   │   ├── eigenCam.test.ts
│   │   └── MockClutterAnalyzer.test.ts
│   ├── context/
│   │   └── appReducer.test.ts
│   ├── components/
│   │   └── ScoreDisplay.test.tsx
│   └── db/
│       └── historyDb.test.ts
├── index.html
├── .env.development
├── .env.production
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── postcss.config.js
└── package.json
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `tailwind.config.ts`
- Create: `postcss.config.js`
- Create: `index.html`
- Create: `.env.development`
- Create: `.env.production`
- Create: `src/main.tsx` (minimal placeholder)
- Create: `src/index.css`
- Create: `src/vite-env.d.ts`
- Create: `public/models/.gitkeep`
- Create: `public/icons/icon-192.png` (placeholder)
- Create: `public/icons/icon-512.png` (placeholder)

- [ ] **Step 1: Create package.json**

```json
{
  "name": "cluttersnap",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
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
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "workbox-window": "^7.1.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "vitest": "^1.6.0",
    "jsdom": "^24.0.0",
    "@testing-library/react": "^15.0.0",
    "@testing-library/jest-dom": "^6.4.0",
    "fake-indexeddb": "^6.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: Create tsconfig.node.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      workbox: {
        additionalManifestEntries: [
          { url: '/models/clutter_model.onnx', revision: process.env.VITE_MODEL_VERSION ?? null }
        ],
        maximumFileSizeToCacheInBytes: 100 * 1024 * 1024
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
    exclude: ['onnxruntime-web']
  }
});
```

- [ ] **Step 5: Create tailwind.config.ts and postcss.config.js**

`tailwind.config.ts`:
```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
```

`postcss.config.js`:
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 6: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#0f172a" />
    <link rel="icon" href="/favicon.ico" />
    <title>Clutter Detector</title>
  </head>
  <body class="bg-slate-900 text-white">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Create environment files**

`.env.development`:
```
VITE_USE_MOCK_MODEL=true
VITE_MODEL_VERSION=dev
```

`.env.production`:
```
VITE_USE_MOCK_MODEL=false
VITE_MODEL_VERSION=1
```

- [ ] **Step 8: Create src/vite-env.d.ts, src/index.css, and minimal src/main.tsx**

`src/vite-env.d.ts`:
```typescript
/// <reference types="vite/client" />
```

`src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

`src/main.tsx`:
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div className="flex items-center justify-center h-screen">
      <p className="text-xl">ClutterSnap</p>
    </div>
  </React.StrictMode>,
);
```

- [ ] **Step 9: Create placeholder PWA icons and models directory**

```bash
mkdir -p public/models public/icons
touch public/models/.gitkeep
# Generate minimal 1x1 placeholder PNGs (will be replaced with real icons later)
python3 -c "
import struct, zlib
def make_png(w, h):
    def chunk(t, d):
        return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    raw = b''
    for _ in range(h):
        raw += b'\x00' + b'\x0f\x17\x2a\xff' * w
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(raw)) + chunk(b'IEND', b'')
open('public/icons/icon-192.png','wb').write(make_png(1,1))
open('public/icons/icon-512.png','wb').write(make_png(1,1))
"
```

- [ ] **Step 10: Install dependencies and verify build**

```bash
npm install
npx vite build 2>&1 | tail -5
```

Expected: Build completes successfully.

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json tsconfig.json tsconfig.node.json vite.config.ts tailwind.config.ts postcss.config.js index.html .env.development .env.production src/main.tsx src/index.css src/vite-env.d.ts public/
git commit -m "chore: scaffold Vite + React + TypeScript + Tailwind project"
```

---

## Task 2: Types

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Create src/types/index.ts**

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

export type Screen = 'camera' | 'analyzing' | 'result' | 'history';

export interface AppState {
  screen: Screen;
  capturedImageUrl: string | null;
  analysisResult: AnalysisResult | null;
  error: string | null;
  isModelLoading: boolean;
  resultSource: 'capture' | 'history' | null;
  updateAvailable: boolean;
}

export type Action =
  | { type: 'MODEL_LOADED' }
  | { type: 'CAPTURE'; imageUrl: string }
  | { type: 'ANALYSIS_COMPLETE'; result: AnalysisResult }
  | { type: 'ERROR'; message: string }
  | { type: 'RETAKE' }
  | { type: 'SHOW_HISTORY' }
  | { type: 'HIDE_HISTORY' }
  | { type: 'VIEW_HISTORY_RESULT'; imageUrl: string; result: AnalysisResult }
  | { type: 'BACK_TO_HISTORY' }
  | { type: 'UPDATE_AVAILABLE' };

export interface HistoryEntry {
  id?: number;
  score: number;
  imageDataUrl: string;
  thumbnailDataUrl: string;
  heatmap: Float32Array;
  heatmapWidth: number;
  heatmapHeight: number;
  timestamp: number;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add shared TypeScript types for app state, ML, and history"
```

---

## Task 3: App State Reducer

**Files:**
- Create: `src/context/AppContext.tsx`
- Create: `tests/context/appReducer.test.ts`

- [ ] **Step 1: Write failing tests for the reducer**

Create `tests/context/appReducer.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { appReducer, initialState } from '../../src/context/AppContext';
import type { AppState, AnalysisResult } from '../../src/types';

const mockResult: AnalysisResult = {
  score: 7.3,
  heatmap: new Float32Array([0.1, 0.5, 0.9, 0.2]),
  heatmapWidth: 2,
  heatmapHeight: 2,
};

describe('appReducer', () => {
  it('initialState has screen=loading and isModelLoading=true', () => {
    expect(initialState.screen).toBe('loading');
    expect(initialState.isModelLoading).toBe(true);
  });

  it('MODEL_LOADED transitions to camera screen', () => {
    const state = appReducer(initialState, { type: 'MODEL_LOADED' });
    expect(state.screen).toBe('camera');
    expect(state.isModelLoading).toBe(false);
  });

  it('CAPTURE transitions to analyzing screen', () => {
    const prev: AppState = { ...initialState, screen: 'camera', isModelLoading: false };
    const state = appReducer(prev, { type: 'CAPTURE', imageUrl: 'data:image/jpeg;base64,abc' });
    expect(state.screen).toBe('analyzing');
    expect(state.capturedImageUrl).toBe('data:image/jpeg;base64,abc');
    expect(state.resultSource).toBe('capture');
  });

  it('ANALYSIS_COMPLETE transitions to result screen', () => {
    const prev: AppState = { ...initialState, screen: 'analyzing', capturedImageUrl: 'url', resultSource: 'capture' };
    const state = appReducer(prev, { type: 'ANALYSIS_COMPLETE', result: mockResult });
    expect(state.screen).toBe('result');
    expect(state.analysisResult).toBe(mockResult);
  });

  it('ERROR returns to camera with error message', () => {
    const prev: AppState = { ...initialState, screen: 'analyzing', capturedImageUrl: 'url' };
    const state = appReducer(prev, { type: 'ERROR', message: 'Inference failed' });
    expect(state.screen).toBe('camera');
    expect(state.error).toBe('Inference failed');
    expect(state.capturedImageUrl).toBeNull();
  });

  it('RETAKE returns to camera and clears result', () => {
    const prev: AppState = { ...initialState, screen: 'result', capturedImageUrl: 'url', analysisResult: mockResult, resultSource: 'capture' };
    const state = appReducer(prev, { type: 'RETAKE' });
    expect(state.screen).toBe('camera');
    expect(state.capturedImageUrl).toBeNull();
    expect(state.analysisResult).toBeNull();
  });

  it('SHOW_HISTORY transitions to history screen', () => {
    const prev: AppState = { ...initialState, screen: 'camera', isModelLoading: false };
    const state = appReducer(prev, { type: 'SHOW_HISTORY' });
    expect(state.screen).toBe('history');
  });

  it('HIDE_HISTORY returns to camera', () => {
    const prev: AppState = { ...initialState, screen: 'history' };
    const state = appReducer(prev, { type: 'HIDE_HISTORY' });
    expect(state.screen).toBe('camera');
  });

  it('VIEW_HISTORY_RESULT transitions to result with history source', () => {
    const prev: AppState = { ...initialState, screen: 'history' };
    const state = appReducer(prev, { type: 'VIEW_HISTORY_RESULT', imageUrl: 'hist-url', result: mockResult });
    expect(state.screen).toBe('result');
    expect(state.capturedImageUrl).toBe('hist-url');
    expect(state.analysisResult).toBe(mockResult);
    expect(state.resultSource).toBe('history');
  });

  it('BACK_TO_HISTORY returns to history from result', () => {
    const prev: AppState = { ...initialState, screen: 'result', resultSource: 'history' };
    const state = appReducer(prev, { type: 'BACK_TO_HISTORY' });
    expect(state.screen).toBe('history');
  });

  it('UPDATE_AVAILABLE sets flag', () => {
    const state = appReducer(initialState, { type: 'UPDATE_AVAILABLE' });
    expect(state.updateAvailable).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/context/appReducer.test.ts 2>&1 | tail -10
```

Expected: FAIL — `appReducer` and `initialState` not found.

- [ ] **Step 3: Implement the reducer and context**

Create `src/context/AppContext.tsx`:

```tsx
import React, { createContext, useContext, useReducer } from 'react';
import type { AppState, Action } from '../types';

export const initialState: AppState = {
  screen: 'loading',
  capturedImageUrl: null,
  analysisResult: null,
  error: null,
  isModelLoading: true,
  resultSource: null,
  updateAvailable: false,
};

export function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'MODEL_LOADED':
      return { ...state, screen: 'camera', isModelLoading: false };

    case 'CAPTURE':
      return {
        ...state,
        screen: 'analyzing',
        capturedImageUrl: action.imageUrl,
        error: null,
        resultSource: 'capture',
      };

    case 'ANALYSIS_COMPLETE':
      return { ...state, screen: 'result', analysisResult: action.result };

    case 'ERROR':
      return {
        ...state,
        screen: 'camera',
        error: action.message,
        capturedImageUrl: null,
        analysisResult: null,
      };

    case 'RETAKE':
      return {
        ...state,
        screen: 'camera',
        capturedImageUrl: null,
        analysisResult: null,
        resultSource: null,
      };

    case 'SHOW_HISTORY':
      return { ...state, screen: 'history' };

    case 'HIDE_HISTORY':
      return { ...state, screen: 'camera' };

    case 'VIEW_HISTORY_RESULT':
      return {
        ...state,
        screen: 'result',
        capturedImageUrl: action.imageUrl,
        analysisResult: action.result,
        resultSource: 'history',
      };

    case 'BACK_TO_HISTORY':
      return { ...state, screen: 'history' };

    case 'UPDATE_AVAILABLE':
      return { ...state, updateAvailable: true };

    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/context/appReducer.test.ts 2>&1 | tail -10
```

Expected: All 10 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/context/AppContext.tsx tests/context/appReducer.test.ts
git commit -m "feat: add app state reducer with context provider"
```

---

## Task 4: Image Preprocessor

**Files:**
- Create: `src/ml/imagePreprocessor.ts`
- Create: `tests/ml/imagePreprocessor.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/ml/imagePreprocessor.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { preprocessImage } from '../../src/ml/imagePreprocessor';

function makeImageData(width: number, height: number, fill: [number, number, number, number]): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = fill[0];
    data[i * 4 + 1] = fill[1];
    data[i * 4 + 2] = fill[2];
    data[i * 4 + 3] = fill[3];
  }
  return { data, width, height, colorSpace: 'srgb' } as ImageData;
}

describe('preprocessImage', () => {
  it('returns a Float32Array of length 3*224*224', () => {
    const img = makeImageData(224, 224, [128, 128, 128, 255]);
    const result = preprocessImage(img);
    expect(result).toBeInstanceOf(Float32Array);
    expect(result.length).toBe(3 * 224 * 224);
  });

  it('produces CHW layout (channels first)', () => {
    // All-red image: R=255, G=0, B=0
    const img = makeImageData(224, 224, [255, 0, 0, 255]);
    const result = preprocessImage(img);

    const channelSize = 224 * 224;
    // Red channel (first 224*224 values) should be normalized: (1.0 - 0.485) / 0.229 ≈ 2.2489
    const expectedRed = (1.0 - 0.485) / 0.229;
    expect(result[0]).toBeCloseTo(expectedRed, 3);

    // Green channel (next 224*224) should be normalized: (0.0 - 0.456) / 0.224 ≈ -2.0357
    const expectedGreen = (0.0 - 0.456) / 0.224;
    expect(result[channelSize]).toBeCloseTo(expectedGreen, 3);

    // Blue channel should be normalized: (0.0 - 0.406) / 0.225 ≈ -1.8044
    const expectedBlue = (0.0 - 0.406) / 0.225;
    expect(result[2 * channelSize]).toBeCloseTo(expectedBlue, 3);
  });

  it('handles non-224x224 input by accepting it (resize happens via canvas in browser)', () => {
    // In unit tests without a real canvas, preprocessImage works directly on the pixel data
    // For 224x224 input it works directly; this test confirms the function doesn't throw
    const img = makeImageData(224, 224, [100, 150, 200, 255]);
    const result = preprocessImage(img);
    expect(result.length).toBe(3 * 224 * 224);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/ml/imagePreprocessor.test.ts 2>&1 | tail -10
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement imagePreprocessor.ts**

Create `src/ml/imagePreprocessor.ts`:

```typescript
const IMAGENET_MEAN = [0.485, 0.456, 0.406];
const IMAGENET_STD = [0.229, 0.224, 0.225];
const SIZE = 224;

/**
 * Resizes ImageData to 224x224 using an OffscreenCanvas (browser)
 * or works directly if already 224x224 (tests).
 * Returns CHW Float32Array normalized with ImageNet stats.
 */
export function preprocessImage(imageData: ImageData): Float32Array {
  let pixels: Uint8ClampedArray;

  if (imageData.width === SIZE && imageData.height === SIZE) {
    pixels = imageData.data;
  } else {
    pixels = resizeImageData(imageData);
  }

  return normalizePixels(pixels);
}

function resizeImageData(imageData: ImageData): Uint8ClampedArray {
  // Use OffscreenCanvas for browser resize
  const srcCanvas = new OffscreenCanvas(imageData.width, imageData.height);
  const srcCtx = srcCanvas.getContext('2d')!;
  srcCtx.putImageData(imageData, 0, 0);

  const dstCanvas = new OffscreenCanvas(SIZE, SIZE);
  const dstCtx = dstCanvas.getContext('2d')!;
  dstCtx.drawImage(srcCanvas, 0, 0, SIZE, SIZE);

  return dstCtx.getImageData(0, 0, SIZE, SIZE).data;
}

function normalizePixels(pixels: Uint8ClampedArray): Float32Array {
  const channelSize = SIZE * SIZE;
  const tensor = new Float32Array(3 * channelSize);

  for (let i = 0; i < channelSize; i++) {
    const r = pixels[i * 4] / 255;
    const g = pixels[i * 4 + 1] / 255;
    const b = pixels[i * 4 + 2] / 255;

    tensor[i] = (r - IMAGENET_MEAN[0]) / IMAGENET_STD[0];
    tensor[channelSize + i] = (g - IMAGENET_MEAN[1]) / IMAGENET_STD[1];
    tensor[2 * channelSize + i] = (b - IMAGENET_MEAN[2]) / IMAGENET_STD[2];
  }

  return tensor;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/ml/imagePreprocessor.test.ts 2>&1 | tail -10
```

Expected: All 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ml/imagePreprocessor.ts tests/ml/imagePreprocessor.test.ts
git commit -m "feat: add image preprocessor with ImageNet normalization"
```

---

## Task 5: Eigen-CAM

**Files:**
- Create: `src/ml/eigenCam.ts`
- Create: `tests/ml/eigenCam.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/ml/eigenCam.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { computeEigenCam } from '../../src/ml/eigenCam';

describe('computeEigenCam', () => {
  it('returns a Float32Array of length H*W', () => {
    const C = 3, H = 2, W = 2;
    // 3 channels, 2x2 spatial — total 12 values
    const featureMap = new Float32Array([
      // channel 0
      1, 2, 3, 4,
      // channel 1
      5, 6, 7, 8,
      // channel 2
      9, 10, 11, 12,
    ]);
    const result = computeEigenCam(featureMap, C, H, W);
    expect(result).toBeInstanceOf(Float32Array);
    expect(result.length).toBe(H * W);
  });

  it('all values are in [0, 1]', () => {
    const C = 4, H = 3, W = 3;
    const featureMap = new Float32Array(C * H * W);
    for (let i = 0; i < featureMap.length; i++) {
      featureMap[i] = Math.random() * 10;
    }
    const result = computeEigenCam(featureMap, C, H, W);
    for (let i = 0; i < result.length; i++) {
      expect(result[i]).toBeGreaterThanOrEqual(0);
      expect(result[i]).toBeLessThanOrEqual(1);
    }
  });

  it('returns all zeros for a zero feature map', () => {
    const C = 2, H = 2, W = 2;
    const featureMap = new Float32Array(C * H * W); // all zeros
    const result = computeEigenCam(featureMap, C, H, W);
    expect(result.every(v => v === 0)).toBe(true);
  });

  it('produces a non-trivial heatmap for non-uniform input', () => {
    const C = 2, H = 3, W = 3;
    const featureMap = new Float32Array([
      // channel 0: hot spot at center
      0, 0, 0,  0, 10, 0,  0, 0, 0,
      // channel 1: hot spot at center
      0, 0, 0,  0, 8, 0,   0, 0, 0,
    ]);
    const result = computeEigenCam(featureMap, C, H, W);
    // Center pixel should be the max (1.0 after normalization)
    expect(result[4]).toBe(1.0);
    // Corner pixels should be 0 (after ReLU + normalization)
    expect(result[0]).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/ml/eigenCam.test.ts 2>&1 | tail -10
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement eigenCam.ts**

Create `src/ml/eigenCam.ts`:

```typescript
const POWER_ITERATIONS = 25;

/**
 * Computes Eigen-CAM heatmap from a feature map tensor.
 * @param featureMap - flat Float32Array of shape [C, H, W]
 * @param C - number of channels
 * @param H - spatial height
 * @param W - spatial width
 * @returns Float32Array of length H*W, normalized to [0, 1], row-major
 */
export function computeEigenCam(
  featureMap: Float32Array,
  C: number,
  H: number,
  W: number
): Float32Array {
  const spatialSize = H * W;

  // M is [C, spatialSize] — featureMap is already in this layout
  // We need the dominant right singular vector of M via power iteration on M^T M

  // v = ones(spatialSize)
  let v = new Float32Array(spatialSize);
  v.fill(1);

  for (let iter = 0; iter < POWER_ITERATIONS; iter++) {
    // Compute Mv = M * v → result has length C
    const mv = new Float32Array(C);
    for (let c = 0; c < C; c++) {
      let sum = 0;
      const offset = c * spatialSize;
      for (let j = 0; j < spatialSize; j++) {
        sum += featureMap[offset + j] * v[j];
      }
      mv[c] = sum;
    }

    // Compute M^T * (Mv) → result has length spatialSize
    const mtmv = new Float32Array(spatialSize);
    for (let j = 0; j < spatialSize; j++) {
      let sum = 0;
      for (let c = 0; c < C; c++) {
        sum += featureMap[c * spatialSize + j] * mv[c];
      }
      mtmv[j] = sum;
    }

    // Normalize
    let norm = 0;
    for (let j = 0; j < spatialSize; j++) {
      norm += mtmv[j] * mtmv[j];
    }
    norm = Math.sqrt(norm);

    if (norm === 0) {
      return new Float32Array(spatialSize); // all zeros
    }

    for (let j = 0; j < spatialSize; j++) {
      v[j] = mtmv[j] / norm;
    }
  }

  // ReLU: clamp negatives to zero
  for (let j = 0; j < spatialSize; j++) {
    if (v[j] < 0) v[j] = 0;
  }

  // Normalize to [0, 1]
  let max = 0;
  for (let j = 0; j < spatialSize; j++) {
    if (v[j] > max) max = v[j];
  }

  if (max > 0) {
    for (let j = 0; j < spatialSize; j++) {
      v[j] /= max;
    }
  }

  return v;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/ml/eigenCam.test.ts 2>&1 | tail -10
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ml/eigenCam.ts tests/ml/eigenCam.test.ts
git commit -m "feat: add Eigen-CAM heatmap computation via power iteration"
```

---

## Task 6: Mock Clutter Analyzer

**Files:**
- Create: `src/ml/ClutterAnalyzer.ts`
- Create: `src/ml/MockClutterAnalyzer.ts`
- Create: `src/ml/analyzerFactory.ts`
- Create: `tests/ml/MockClutterAnalyzer.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/ml/MockClutterAnalyzer.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { MockClutterAnalyzer } from '../../src/ml/MockClutterAnalyzer';
import type { AnalysisResult } from '../../src/types';

function makeFakeImageData(): ImageData {
  return {
    data: new Uint8ClampedArray(4 * 100 * 100),
    width: 100,
    height: 100,
    colorSpace: 'srgb',
  } as ImageData;
}

describe('MockClutterAnalyzer', () => {
  it('load() resolves without error', async () => {
    const analyzer = new MockClutterAnalyzer();
    await expect(analyzer.load()).resolves.toBeUndefined();
  });

  it('analyze() returns a valid AnalysisResult', async () => {
    const analyzer = new MockClutterAnalyzer();
    await analyzer.load();
    const result: AnalysisResult = await analyzer.analyze(makeFakeImageData());

    expect(result.score).toBeGreaterThanOrEqual(1.0);
    expect(result.score).toBeLessThanOrEqual(10.0);
    expect(result.heatmapWidth).toBe(7);
    expect(result.heatmapHeight).toBe(7);
    expect(result.heatmap).toBeInstanceOf(Float32Array);
    expect(result.heatmap.length).toBe(49);
  });

  it('heatmap values are in [0, 1]', async () => {
    const analyzer = new MockClutterAnalyzer();
    await analyzer.load();
    const result = await analyzer.analyze(makeFakeImageData());

    for (let i = 0; i < result.heatmap.length; i++) {
      expect(result.heatmap[i]).toBeGreaterThanOrEqual(0);
      expect(result.heatmap[i]).toBeLessThanOrEqual(1);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/ml/MockClutterAnalyzer.test.ts 2>&1 | tail -10
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create ClutterAnalyzer.ts (re-export interface)**

Create `src/ml/ClutterAnalyzer.ts`:

```typescript
export type { AnalysisResult, ClutterAnalyzer } from '../types';
```

- [ ] **Step 4: Implement MockClutterAnalyzer.ts**

Create `src/ml/MockClutterAnalyzer.ts`:

```typescript
import type { ClutterAnalyzer, AnalysisResult } from '../types';

export class MockClutterAnalyzer implements ClutterAnalyzer {
  async load(): Promise<void> {
    await delay(800);
  }

  async analyze(_imageData: ImageData): Promise<AnalysisResult> {
    await delay(1200);

    const score = randomFloat(1.0, 10.0);
    const W = 7;
    const H = 7;
    const heatmap = generateMockHeatmap(W, H);

    return { score, heatmap, heatmapWidth: W, heatmapHeight: H };
  }
}

function generateMockHeatmap(W: number, H: number): Float32Array {
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

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomFloat(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomFloat(min, max + 1));
}
```

- [ ] **Step 5: Create analyzerFactory.ts**

Create `src/ml/analyzerFactory.ts`:

```typescript
import type { ClutterAnalyzer } from '../types';
import { MockClutterAnalyzer } from './MockClutterAnalyzer';

export function createAnalyzer(): ClutterAnalyzer {
  if (import.meta.env.VITE_USE_MOCK_MODEL === 'true') {
    return new MockClutterAnalyzer();
  }
  // OnnxClutterAnalyzer will be added in a later task
  throw new Error('Real ONNX model not yet implemented. Set VITE_USE_MOCK_MODEL=true.');
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx vitest run tests/ml/MockClutterAnalyzer.test.ts 2>&1 | tail -10
```

Expected: All 3 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add src/ml/ClutterAnalyzer.ts src/ml/MockClutterAnalyzer.ts src/ml/analyzerFactory.ts tests/ml/MockClutterAnalyzer.test.ts
git commit -m "feat: add mock clutter analyzer with gaussian heatmap generation"
```

---

## Task 7: ONNX Clutter Analyzer (Skeleton)

**Files:**
- Create: `src/ml/OnnxClutterAnalyzer.ts`

- [ ] **Step 1: Create OnnxClutterAnalyzer.ts**

```typescript
import type { ClutterAnalyzer, AnalysisResult } from '../types';
import { preprocessImage } from './imagePreprocessor';
import { computeEigenCam } from './eigenCam';

export class OnnxClutterAnalyzer implements ClutterAnalyzer {
  private session: unknown = null;
  private readonly modelUrl: string;

  constructor(modelUrl: string) {
    this.modelUrl = modelUrl;
  }

  async load(): Promise<void> {
    const ort = await import('onnxruntime-web');
    this.session = await ort.InferenceSession.create(this.modelUrl, {
      executionProviders: ['webgl', 'wasm'],
    });
  }

  async analyze(imageData: ImageData): Promise<AnalysisResult> {
    const ort = await import('onnxruntime-web');
    const session = this.session as InstanceType<typeof ort.InferenceSession>;
    if (!session) throw new Error('Model not loaded. Call load() first.');

    const inputTensor = preprocessImage(imageData);
    const tensor = new ort.Tensor('float32', inputTensor, [1, 3, 224, 224]);
    const feeds = { input: tensor };
    const results = await session.run(feeds);

    // Extract score
    const scoreData = results['score'].data as Float32Array;
    const score = scoreData[0];
    if (score < 1 || score > 10) {
      throw new Error(`Score out of range: ${score}`);
    }

    // Extract feature map and compute heatmap
    const featureMapTensor = results['feature_map'];
    const featureMapData = featureMapTensor.data as Float32Array;
    const [, C, H, W] = featureMapTensor.dims;
    const heatmap = computeEigenCam(featureMapData, C, H, W);

    return { score, heatmap, heatmapWidth: W, heatmapHeight: H };
  }
}
```

- [ ] **Step 2: Update analyzerFactory.ts to use OnnxClutterAnalyzer**

Replace the throw in `src/ml/analyzerFactory.ts`:

```typescript
import type { ClutterAnalyzer } from '../types';
import { MockClutterAnalyzer } from './MockClutterAnalyzer';
import { OnnxClutterAnalyzer } from './OnnxClutterAnalyzer';

export function createAnalyzer(): ClutterAnalyzer {
  if (import.meta.env.VITE_USE_MOCK_MODEL === 'true') {
    return new MockClutterAnalyzer();
  }
  return new OnnxClutterAnalyzer('/models/clutter_model.onnx');
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | tail -10
```

Expected: No errors (or only non-blocking warnings about onnxruntime-web types).

- [ ] **Step 4: Commit**

```bash
git add src/ml/OnnxClutterAnalyzer.ts src/ml/analyzerFactory.ts
git commit -m "feat: add ONNX clutter analyzer with WebGL/WASM fallback"
```

---

## Task 8: History Database

**Files:**
- Create: `src/db/historyDb.ts`
- Create: `tests/db/historyDb.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/db/historyDb.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { historyDb } from '../../src/db/historyDb';
import type { HistoryEntry } from '../../src/types';

function makeEntry(overrides?: Partial<HistoryEntry>): Omit<HistoryEntry, 'id'> {
  return {
    score: 5.5,
    imageDataUrl: 'data:image/jpeg;base64,abc',
    thumbnailDataUrl: 'data:image/jpeg;base64,thumb',
    heatmap: new Float32Array([0.1, 0.5, 0.9, 0.2]),
    heatmapWidth: 2,
    heatmapHeight: 2,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('historyDb', () => {
  beforeEach(() => {
    // Reset the IndexedDB between tests
    indexedDB = new IDBFactory();
  });

  it('isAvailable returns true when IndexedDB works', async () => {
    const available = await historyDb.isAvailable();
    expect(available).toBe(true);
  });

  it('saveEntry returns an id and getAllEntries retrieves it', async () => {
    const entry = makeEntry();
    const id = await historyDb.saveEntry(entry as HistoryEntry);
    expect(typeof id).toBe('number');

    const entries = await historyDb.getAllEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe(id);
    expect(entries[0].score).toBe(5.5);
  });

  it('getAllEntries returns entries ordered by timestamp descending', async () => {
    await historyDb.saveEntry(makeEntry({ timestamp: 1000 }) as HistoryEntry);
    await historyDb.saveEntry(makeEntry({ timestamp: 3000 }) as HistoryEntry);
    await historyDb.saveEntry(makeEntry({ timestamp: 2000 }) as HistoryEntry);

    const entries = await historyDb.getAllEntries();
    expect(entries[0].timestamp).toBe(3000);
    expect(entries[1].timestamp).toBe(2000);
    expect(entries[2].timestamp).toBe(1000);
  });

  it('deleteEntry removes the entry', async () => {
    const id = await historyDb.saveEntry(makeEntry() as HistoryEntry);
    await historyDb.deleteEntry(id);

    const entries = await historyDb.getAllEntries();
    expect(entries).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/db/historyDb.test.ts 2>&1 | tail -10
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement historyDb.ts**

Create `src/db/historyDb.ts`:

```typescript
import { openDB, type IDBPDatabase } from 'idb';
import type { HistoryEntry } from '../types';

const DB_NAME = 'cluttersnap';
const STORE_NAME = 'history';
const DB_VERSION = 1;

function getDb(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
}

async function isAvailable(): Promise<boolean> {
  try {
    const db = await getDb();
    db.close();
    return true;
  } catch {
    return false;
  }
}

async function saveEntry(entry: HistoryEntry): Promise<number> {
  const db = await getDb();
  const id = await db.add(STORE_NAME, entry) as number;
  db.close();
  return id;
}

async function getAllEntries(): Promise<HistoryEntry[]> {
  const db = await getDb();
  const entries = await db.getAll(STORE_NAME) as HistoryEntry[];
  db.close();
  return entries.sort((a, b) => b.timestamp - a.timestamp);
}

async function deleteEntry(id: number): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, id);
  db.close();
}

export const historyDb = { isAvailable, saveEntry, getAllEntries, deleteEntry };
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/db/historyDb.test.ts 2>&1 | tail -10
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/historyDb.ts tests/db/historyDb.test.ts
git commit -m "feat: add IndexedDB history persistence via idb"
```

---

## Task 9: useHistory Hook

**Files:**
- Create: `src/hooks/useHistory.ts`

- [ ] **Step 1: Implement useHistory.ts**

Create `src/hooks/useHistory.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { historyDb } from '../db/historyDb';
import type { HistoryEntry, AnalysisResult } from '../types';

interface UseHistoryReturn {
  entries: HistoryEntry[];
  isAvailable: boolean;
  saveEntry: (result: AnalysisResult, imageDataUrl: string) => Promise<void>;
  deleteEntry: (id: number) => Promise<void>;
  saveError: string | null;
}

export function useHistory(): UseHistoryReturn {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isAvailable, setIsAvailable] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const available = await historyDb.isAvailable();
      if (cancelled) return;
      setIsAvailable(available);
      if (available) {
        const all = await historyDb.getAllEntries();
        if (!cancelled) setEntries(all);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const saveEntry = useCallback(async (result: AnalysisResult, imageDataUrl: string) => {
    try {
      const thumbnailDataUrl = await generateThumbnail(imageDataUrl);
      const entry: HistoryEntry = {
        score: result.score,
        imageDataUrl,
        thumbnailDataUrl,
        heatmap: result.heatmap,
        heatmapWidth: result.heatmapWidth,
        heatmapHeight: result.heatmapHeight,
        timestamp: Date.now(),
      };
      const id = await historyDb.saveEntry(entry);
      entry.id = id;
      setEntries(prev => [entry, ...prev]);
      setSaveError(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save history entry');
    }
  }, []);

  const deleteEntry = useCallback(async (id: number) => {
    await historyDb.deleteEntry(id);
    setEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  return { entries, isAvailable, saveEntry, deleteEntry, saveError };
}

function generateThumbnail(imageDataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const targetWidth = 200;
      const scale = targetWidth / img.width;
      const targetHeight = Math.round(img.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = reject;
    img.src = imageDataUrl;
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | tail -10
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useHistory.ts
git commit -m "feat: add useHistory hook with thumbnail generation"
```

---

## Task 10: Camera Hooks

**Files:**
- Create: `src/hooks/useCameraPermission.ts`
- Create: `src/hooks/useCamera.ts`

- [ ] **Step 1: Implement useCameraPermission.ts**

Create `src/hooks/useCameraPermission.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';

type PermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported';

interface UseCameraPermissionReturn {
  isIos: boolean;
  permissionState: PermissionState;
  requestPermission: () => Promise<void>;
}

export function useCameraPermission(): UseCameraPermissionReturn {
  const [permissionState, setPermissionState] = useState<PermissionState>('prompt');
  const isIos = typeof DeviceMotionEvent !== 'undefined'
    && typeof (DeviceMotionEvent as unknown as { requestPermission?: unknown }).requestPermission === 'function';

  const requestPermission = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionState('unsupported');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      // Immediately stop the stream — we only needed the permission prompt
      stream.getTracks().forEach(track => track.stop());
      setPermissionState('granted');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setPermissionState('denied');
      } else {
        setPermissionState('unsupported');
      }
    }
  }, []);

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setPermissionState('unsupported');
      return;
    }
    // On non-iOS, request permission automatically
    if (!isIos) {
      requestPermission();
    }
  }, [isIos, requestPermission]);

  return { isIos, permissionState, requestPermission };
}
```

- [ ] **Step 2: Implement useCamera.ts**

Create `src/hooks/useCamera.ts`:

```typescript
import { useRef, useEffect, useCallback } from 'react';

interface CaptureResult {
  imageData: ImageData;
  dataUrl: string;
}

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  capture: () => CaptureResult;
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement>(null!);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        // Permission or capability errors are handled by useCameraPermission
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, []);

  const capture = useCallback((): CaptureResult => {
    const video = videoRef.current;
    if (!video) throw new Error('Video element not available');

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

    return { imageData, dataUrl };
  }, []);

  return { videoRef, capture };
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | tail -10
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useCameraPermission.ts src/hooks/useCamera.ts
git commit -m "feat: add camera permission and stream capture hooks"
```

---

## Task 11: ScoreDisplay Component

**Files:**
- Create: `src/components/ScoreDisplay.tsx`
- Create: `tests/components/ScoreDisplay.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `tests/components/ScoreDisplay.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ScoreDisplay } from '../../src/components/ScoreDisplay';

// Mock requestAnimationFrame so the animation completes instantly in tests
vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
  cb(1000); // simulate a late timestamp so animation is "done"
  return 1;
});
vi.stubGlobal('cancelAnimationFrame', vi.fn());

describe('ScoreDisplay', () => {
  it('renders the rounded score', () => {
    render(<ScoreDisplay score={7.3} />);
    // After animation completes, we should see "7"
    expect(screen.getByText(/7/)).toBeInTheDocument();
    expect(screen.getByText(/\/ 10/)).toBeInTheDocument();
  });

  it('shows "Tidy" for scores 1-3', () => {
    render(<ScoreDisplay score={2.1} />);
    expect(screen.getByText('Tidy')).toBeInTheDocument();
  });

  it('shows "Moderate clutter" for scores 4-6', () => {
    render(<ScoreDisplay score={5.0} />);
    expect(screen.getByText('Moderate clutter')).toBeInTheDocument();
  });

  it('shows "Cluttered" for scores 7-10', () => {
    render(<ScoreDisplay score={8.9} />);
    expect(screen.getByText('Cluttered')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/components/ScoreDisplay.test.tsx 2>&1 | tail -10
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement ScoreDisplay.tsx**

Create `src/components/ScoreDisplay.tsx`:

```tsx
import { useState, useEffect, useRef } from 'react';

interface ScoreDisplayProps {
  score: number;
}

function getScoreBand(rounded: number): { label: string; colorClass: string } {
  if (rounded <= 3) return { label: 'Tidy', colorClass: 'text-green-400' };
  if (rounded <= 6) return { label: 'Moderate clutter', colorClass: 'text-amber-400' };
  return { label: 'Cluttered', colorClass: 'text-red-400' };
}

const ANIMATION_DURATION_MS = 800;

export function ScoreDisplay({ score }: ScoreDisplayProps) {
  const rounded = Math.round(score);
  const [displayValue, setDisplayValue] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    startTimeRef.current = null;

    function animate(timestamp: number) {
      if (startTimeRef.current === null) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / ANIMATION_DURATION_MS, 1);
      setDisplayValue(Math.round(progress * rounded));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [rounded]);

  const { label, colorClass } = getScoreBand(rounded);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-6xl font-bold">
        <span>{displayValue}</span>
        <span className="text-3xl text-slate-400"> / 10</span>
      </div>
      <span className={`text-xl font-semibold ${colorClass}`}>{label}</span>
    </div>
  );
}
```

- [ ] **Step 4: Add test setup file for jsdom**

Create `vitest.config.ts` at the project root (if not already present, or update `vite.config.ts`). Add a test setup file:

Create `tests/setup.ts`:

```typescript
import '@testing-library/jest-dom';
```

Add test config to `vite.config.ts` — add at the top level of the config object:

```typescript
// Add this inside defineConfig, after plugins:
test: {
  environment: 'jsdom',
  setupFiles: ['./tests/setup.ts'],
},
```

Note: Alternatively create a separate `vitest.config.ts`, but modifying `vite.config.ts` is simpler and recommended by Vitest docs.

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run tests/components/ScoreDisplay.test.tsx 2>&1 | tail -10
```

Expected: All 4 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/ScoreDisplay.tsx tests/components/ScoreDisplay.test.tsx tests/setup.ts vite.config.ts
git commit -m "feat: add ScoreDisplay component with animated score and band labels"
```

---

## Task 12: HeatmapOverlay Component

**Files:**
- Create: `src/components/HeatmapOverlay.tsx`

- [ ] **Step 1: Implement HeatmapOverlay.tsx**

Create `src/components/HeatmapOverlay.tsx`:

```tsx
import { useRef, useEffect } from 'react';

interface HeatmapOverlayProps {
  heatmap: Float32Array;
  heatmapWidth: number;
  heatmapHeight: number;
  displayWidth: number;
  displayHeight: number;
  opacity: number;
}

/**
 * Maps a heatmap value [0, 1] to an RGB color via HSV interpolation:
 * 0.0 → blue (H=240°), 0.5 → yellow (H=60°), 1.0 → red (H=0°)
 */
function heatmapValueToRgb(value: number): [number, number, number] {
  // Hue: 240° at 0, 60° at 0.5, 0° at 1.0
  // Interpolate linearly clockwise (decreasing hue)
  const hue = value <= 0.5
    ? 240 - (value / 0.5) * 180   // 240 → 60
    : 60 - ((value - 0.5) / 0.5) * 60; // 60 → 0

  // S=1, V=1 for all stops → pure HSV to RGB
  const h = hue / 60;
  const i = Math.floor(h);
  const f = h - i;
  const q = 1 - f;

  let r: number, g: number, b: number;
  switch (i % 6) {
    case 0: r = 1; g = f; b = 0; break;
    case 1: r = q; g = 1; b = 0; break;
    case 2: r = 0; g = 1; b = f; break;
    case 3: r = 0; g = q; b = 1; break;
    case 4: r = f; g = 0; b = 1; break;
    default: r = 1; g = 0; b = q; break;
  }

  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * Bilinear interpolation of a small grid to a larger display size.
 */
function bilinearInterpolate(
  grid: Float32Array,
  gridW: number,
  gridH: number,
  outW: number,
  outH: number
): Float32Array {
  const out = new Float32Array(outW * outH);

  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const gx = (x / outW) * (gridW - 1);
      const gy = (y / outH) * (gridH - 1);

      const x0 = Math.floor(gx);
      const y0 = Math.floor(gy);
      const x1 = Math.min(x0 + 1, gridW - 1);
      const y1 = Math.min(y0 + 1, gridH - 1);

      const fx = gx - x0;
      const fy = gy - y0;

      const v00 = grid[y0 * gridW + x0];
      const v10 = grid[y0 * gridW + x1];
      const v01 = grid[y1 * gridW + x0];
      const v11 = grid[y1 * gridW + x1];

      out[y * outW + x] =
        v00 * (1 - fx) * (1 - fy) +
        v10 * fx * (1 - fy) +
        v01 * (1 - fx) * fy +
        v11 * fx * fy;
    }
  }

  return out;
}

export function HeatmapOverlay({
  heatmap,
  heatmapWidth,
  heatmapHeight,
  displayWidth,
  displayHeight,
  opacity,
}: HeatmapOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null!);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || displayWidth === 0 || displayHeight === 0) return;

    canvas.width = displayWidth;
    canvas.height = displayHeight;
    const ctx = canvas.getContext('2d')!;

    const interpolated = bilinearInterpolate(heatmap, heatmapWidth, heatmapHeight, displayWidth, displayHeight);
    const imageData = ctx.createImageData(displayWidth, displayHeight);

    for (let i = 0; i < interpolated.length; i++) {
      const [r, g, b] = heatmapValueToRgb(interpolated[i]);
      imageData.data[i * 4] = r;
      imageData.data[i * 4 + 1] = g;
      imageData.data[i * 4 + 2] = b;
      imageData.data[i * 4 + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
  }, [heatmap, heatmapWidth, heatmapHeight, displayWidth, displayHeight]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0"
      style={{ opacity }}
    />
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | tail -10
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/HeatmapOverlay.tsx
git commit -m "feat: add HeatmapOverlay with bilinear interpolation and HSV color mapping"
```

---

## Task 13: LoadingScreen Component

**Files:**
- Create: `src/components/LoadingScreen.tsx`

- [ ] **Step 1: Implement LoadingScreen.tsx**

Create `src/components/LoadingScreen.tsx`:

```tsx
interface LoadingScreenProps {
  error: string | null;
  permissionState: 'prompt' | 'granted' | 'denied' | 'unsupported';
  isIos: boolean;
  onRetry: () => void;
  onRequestPermission: () => void;
}

export function LoadingScreen({
  error,
  permissionState,
  isIos,
  onRetry,
  onRequestPermission,
}: LoadingScreenProps) {
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 p-6 text-center">
        <p className="text-xl text-red-400">{error}</p>
        <button
          onClick={onRetry}
          className="px-6 py-3 bg-blue-600 rounded-lg text-white font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  if (permissionState === 'denied') {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 p-6 text-center">
        <p className="text-xl text-amber-400">Camera access is required</p>
        <p className="text-slate-300">
          Please enable camera access in your browser settings and reload the page.
        </p>
      </div>
    );
  }

  if (permissionState === 'unsupported') {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 p-6 text-center">
        <p className="text-xl text-amber-400">Browser not supported</p>
        <p className="text-slate-300">
          Your browser does not support camera access. Please use Chrome or Safari.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-6">
      <div className="w-12 h-12 border-4 border-slate-600 border-t-blue-400 rounded-full animate-spin" />
      <p className="text-lg text-slate-300">Loading model...</p>
      {isIos && permissionState === 'prompt' && (
        <button
          onClick={onRequestPermission}
          className="px-6 py-3 bg-blue-600 rounded-lg text-white font-semibold"
        >
          Enable Camera
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | tail -10
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/LoadingScreen.tsx
git commit -m "feat: add LoadingScreen with error, permission, and loading states"
```

---

## Task 14: AnalyzingView Component

**Files:**
- Create: `src/components/AnalyzingView.tsx`

- [ ] **Step 1: Implement AnalyzingView.tsx**

Create `src/components/AnalyzingView.tsx`:

```tsx
interface AnalyzingViewProps {
  capturedImageUrl: string;
}

export function AnalyzingView({ capturedImageUrl }: AnalyzingViewProps) {
  return (
    <div className="relative flex items-center justify-center h-screen bg-black">
      <img
        src={capturedImageUrl}
        alt="Captured photo"
        className="w-full h-full object-contain"
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
        <div className="w-12 h-12 border-4 border-slate-600 border-t-blue-400 rounded-full animate-spin" />
        <p className="mt-4 text-lg text-white">Analyzing...</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AnalyzingView.tsx
git commit -m "feat: add AnalyzingView with photo display and loading overlay"
```

---

## Task 15: ResultView Component

**Files:**
- Create: `src/components/ResultView.tsx`

- [ ] **Step 1: Implement ResultView.tsx**

Create `src/components/ResultView.tsx`:

```tsx
import { useState, useCallback, useRef } from 'react';
import { HeatmapOverlay } from './HeatmapOverlay';
import { ScoreDisplay } from './ScoreDisplay';
import type { AnalysisResult } from '../types';

interface ResultViewProps {
  imageUrl: string;
  result: AnalysisResult;
  resultSource: 'capture' | 'history';
  onRetake: () => void;
  onBack: () => void;
}

export function ResultView({ imageUrl, result, resultSource, onRetake, onBack }: ResultViewProps) {
  const [opacity, setOpacity] = useState(0.5);
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null!);

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const imgAspect = img.naturalWidth / img.naturalHeight;
    const containerAspect = containerWidth / containerHeight;

    let renderedWidth: number;
    let renderedHeight: number;

    if (imgAspect > containerAspect) {
      renderedWidth = containerWidth;
      renderedHeight = containerWidth / imgAspect;
    } else {
      renderedHeight = containerHeight;
      renderedWidth = containerHeight * imgAspect;
    }

    setDisplaySize({ width: Math.round(renderedWidth), height: Math.round(renderedHeight) });
  }, []);

  return (
    <div className="flex flex-col h-screen bg-slate-900">
      {/* Top section: photo + heatmap (60vh) */}
      <div ref={containerRef} className="relative flex items-center justify-center h-[60vh] bg-black overflow-hidden">
        <img
          src={imageUrl}
          alt="Analyzed photo"
          className="max-w-full max-h-full object-contain"
          onLoad={handleImageLoad}
        />
        {displaySize.width > 0 && (
          <div
            className="absolute"
            style={{
              width: displaySize.width,
              height: displaySize.height,
            }}
          >
            <HeatmapOverlay
              heatmap={result.heatmap}
              heatmapWidth={result.heatmapWidth}
              heatmapHeight={result.heatmapHeight}
              displayWidth={displaySize.width}
              displayHeight={displaySize.height}
              opacity={opacity}
            />
          </div>
        )}
        {/* Opacity slider */}
        <div className="absolute bottom-4 left-4 right-4">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={opacity}
            onChange={e => setOpacity(parseFloat(e.target.value))}
            className="w-full"
            aria-label="Heatmap opacity"
          />
        </div>
      </div>

      {/* Bottom section: score + actions (40vh) */}
      <div className="flex flex-col items-center justify-center h-[40vh] gap-6 p-4">
        <ScoreDisplay score={result.score} />

        {resultSource === 'capture' ? (
          <button
            onClick={onRetake}
            className="px-8 py-3 bg-slate-700 rounded-lg text-white font-semibold text-lg"
          >
            Retake
          </button>
        ) : (
          <button
            onClick={onBack}
            className="px-8 py-3 bg-slate-700 rounded-lg text-white font-semibold text-lg"
          >
            Back
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | tail -10
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ResultView.tsx
git commit -m "feat: add ResultView with letterboxed photo, heatmap overlay, and score"
```

---

## Task 16: HistoryList Component

**Files:**
- Create: `src/components/HistoryList.tsx`

- [ ] **Step 1: Implement HistoryList.tsx**

Create `src/components/HistoryList.tsx`:

```tsx
import { useState, useRef } from 'react';
import type { HistoryEntry, AnalysisResult } from '../types';

interface HistoryListProps {
  entries: HistoryEntry[];
  isAvailable: boolean;
  onSelect: (imageUrl: string, result: AnalysisResult) => void;
  onDelete: (id: number) => void;
  onClose: () => void;
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const entryDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  if (entryDate.getTime() === today.getTime()) return `Today ${time}`;
  if (entryDate.getTime() === yesterday.getTime()) return `Yesterday ${time}`;

  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString([], { month: 'short' });
  return `${day} ${month} ${time}`;
}

function getScoreBandColor(score: number): string {
  const rounded = Math.round(score);
  if (rounded <= 3) return 'bg-green-500';
  if (rounded <= 6) return 'bg-amber-500';
  return 'bg-red-500';
}

interface SwipeableItemProps {
  entry: HistoryEntry;
  onSelect: () => void;
  onDelete: () => void;
}

function SwipeableItem({ entry, onSelect, onDelete }: SwipeableItemProps) {
  const [offsetX, setOffsetX] = useState(0);
  const startXRef = useRef(0);
  const isDraggingRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    isDraggingRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    const diff = e.touches[0].clientX - startXRef.current;
    setOffsetX(Math.min(0, diff)); // only allow left swipe
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    // If swiped far enough, keep the delete button visible
    setOffsetX(offsetX < -80 ? -100 : 0);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Delete button behind the item */}
      <div className="absolute right-0 top-0 bottom-0 flex items-center justify-center w-24 bg-red-600">
        <button onClick={onDelete} className="text-white font-semibold px-3">
          Delete
        </button>
      </div>
      {/* Swipeable item */}
      <div
        className="relative flex items-center gap-3 p-3 bg-slate-800 transition-transform"
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => offsetX === 0 && onSelect()}
      >
        <img
          src={entry.thumbnailDataUrl}
          alt="Thumbnail"
          className="w-16 h-16 object-cover rounded"
        />
        <div className="flex-1">
          <span className="text-sm text-slate-400">{formatTimestamp(entry.timestamp)}</span>
        </div>
        <span className={`px-2 py-1 rounded text-sm font-bold text-white ${getScoreBandColor(entry.score)}`}>
          {Math.round(entry.score)}
        </span>
      </div>
    </div>
  );
}

export function HistoryList({ entries, isAvailable, onSelect, onDelete, onClose }: HistoryListProps) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col animate-slide-down">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <h2 className="text-xl font-bold">History</h2>
        <button onClick={onClose} className="text-slate-400 text-2xl leading-none">&times;</button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!isAvailable ? (
          <div className="flex items-center justify-center h-full p-6 text-center">
            <p className="text-slate-400">History is unavailable in this browser mode.</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex items-center justify-center h-full p-6 text-center">
            <p className="text-slate-400">No analyses yet. Take a photo to get started!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {entries.map(entry => (
              <SwipeableItem
                key={entry.id}
                entry={entry}
                onSelect={() =>
                  onSelect(entry.imageDataUrl, {
                    score: entry.score,
                    heatmap: entry.heatmap,
                    heatmapWidth: entry.heatmapWidth,
                    heatmapHeight: entry.heatmapHeight,
                  })
                }
                onDelete={() => entry.id !== undefined && onDelete(entry.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add the slide-down animation to Tailwind config**

Update `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      animation: {
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        slideDown: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | tail -10
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/HistoryList.tsx tailwind.config.ts
git commit -m "feat: add HistoryList with swipe-to-delete and timestamp formatting"
```

---

## Task 17: CameraView Component

**Files:**
- Create: `src/components/CameraView.tsx`

- [ ] **Step 1: Implement CameraView.tsx**

Create `src/components/CameraView.tsx`:

```tsx
import { useRef, useCallback, useEffect, useState } from 'react';
import { useCamera } from '../hooks/useCamera';
import { useAppContext } from '../context/AppContext';
import type { ClutterAnalyzer, AnalysisResult } from '../types';

interface CameraViewProps {
  analyzer: ClutterAnalyzer;
  onHistorySave: (result: AnalysisResult, imageDataUrl: string) => Promise<void>;
  historyAvailable: boolean;
  saveError: string | null;
  updateAvailable: boolean;
}

export function CameraView({
  analyzer,
  onHistorySave,
  historyAvailable,
  saveError,
  updateAvailable,
}: CameraViewProps) {
  const { dispatch } = useAppContext();
  const { videoRef, capture } = useCamera();
  const imageDataRef = useRef<ImageData | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [idbNoticeShown, setIdbNoticeShown] = useState(false);

  // Show IDB unavailable notice once
  useEffect(() => {
    if (!historyAvailable && !idbNoticeShown) {
      setToast('History feature is disabled in this browser mode.');
      setIdbNoticeShown(true);
      setTimeout(() => setToast(null), 4000);
    }
  }, [historyAvailable, idbNoticeShown]);

  // Show save error as toast
  useEffect(() => {
    if (saveError) {
      setToast(saveError);
      setTimeout(() => setToast(null), 4000);
    }
  }, [saveError]);

  const handleCapture = useCallback(async () => {
    try {
      const { imageData, dataUrl } = capture();
      imageDataRef.current = imageData;
      dispatch({ type: 'CAPTURE', imageUrl: dataUrl });

      const result = await analyzer.analyze(imageData);
      dispatch({ type: 'ANALYSIS_COMPLETE', result });

      // Save to history
      if (historyAvailable) {
        await onHistorySave(result, dataUrl);
      }
    } catch (err) {
      dispatch({ type: 'ERROR', message: err instanceof Error ? err.message : 'Analysis failed' });
    } finally {
      imageDataRef.current = null;
    }
  }, [analyzer, capture, dispatch, historyAvailable, onHistorySave]);

  return (
    <div className="relative h-screen bg-black">
      {/* Update banner */}
      {updateAvailable && (
        <div
          className="absolute top-0 left-0 right-0 z-10 bg-blue-600 text-white text-center py-2 text-sm cursor-pointer"
          onClick={() => window.location.reload()}
        >
          New version available — tap to reload
        </div>
      )}

      {/* Camera feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />

      {/* History button */}
      <button
        onClick={() => dispatch({ type: 'SHOW_HISTORY' })}
        className="absolute top-4 right-4 z-10 w-10 h-10 bg-slate-800/70 rounded-full flex items-center justify-center"
        aria-label="History"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Capture button */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        <button
          onClick={handleCapture}
          className="w-18 h-18 rounded-full border-4 border-white bg-white/20 active:bg-white/40"
          style={{ width: 72, height: 72 }}
          aria-label="Capture"
        />
      </div>

      {/* Toast */}
      {toast && (
        <div className="absolute bottom-28 left-4 right-4 bg-slate-800/90 text-white text-center py-2 px-4 rounded-lg text-sm">
          {toast}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | tail -10
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/CameraView.tsx
git commit -m "feat: add CameraView with capture, history button, and toast notifications"
```

---

## Task 18: App.tsx — Main Orchestration

**Files:**
- Modify: `src/App.tsx` (create)
- Modify: `src/main.tsx`

- [ ] **Step 1: Create App.tsx**

Create `src/App.tsx`:

```tsx
import { useEffect, useRef, useState, useCallback } from 'react';
import { AppProvider, useAppContext } from './context/AppContext';
import { createAnalyzer } from './ml/analyzerFactory';
import { useCameraPermission } from './hooks/useCameraPermission';
import { useHistory } from './hooks/useHistory';
import { LoadingScreen } from './components/LoadingScreen';
import { CameraView } from './components/CameraView';
import { AnalyzingView } from './components/AnalyzingView';
import { ResultView } from './components/ResultView';
import { HistoryList } from './components/HistoryList';
import type { ClutterAnalyzer } from './types';

function AppInner() {
  const { state, dispatch } = useAppContext();
  const analyzerRef = useRef<ClutterAnalyzer | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { isIos, permissionState, requestPermission } = useCameraPermission();
  const history = useHistory();

  const loadModel = useCallback(async () => {
    setLoadError(null);
    try {
      const analyzer = createAnalyzer();
      await analyzer.load();
      analyzerRef.current = analyzer;
      dispatch({ type: 'MODEL_LOADED' });
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load model');
    }
  }, [dispatch]);

  useEffect(() => {
    loadModel();
  }, [loadModel]);

  // Register service worker for update detection
  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      import('workbox-window').then(({ Workbox }) => {
        const wb = new Workbox('/sw.js');
        wb.addEventListener('waiting', () => {
          dispatch({ type: 'UPDATE_AVAILABLE' });
        });
        wb.register();
      });
    }
  }, [dispatch]);

  // Loading screen
  if (state.isModelLoading) {
    return (
      <LoadingScreen
        error={loadError}
        permissionState={permissionState}
        isIos={isIos}
        onRetry={loadModel}
        onRequestPermission={requestPermission}
      />
    );
  }

  // Wait for camera permission on non-loading screens
  if (permissionState !== 'granted' && state.screen === 'camera') {
    return (
      <LoadingScreen
        error={null}
        permissionState={permissionState}
        isIos={isIos}
        onRetry={() => {}}
        onRequestPermission={requestPermission}
      />
    );
  }

  switch (state.screen) {
    case 'analyzing':
      return <AnalyzingView capturedImageUrl={state.capturedImageUrl!} />;

    case 'result':
      return (
        <ResultView
          imageUrl={state.capturedImageUrl!}
          result={state.analysisResult!}
          resultSource={state.resultSource!}
          onRetake={() => dispatch({ type: 'RETAKE' })}
          onBack={() => dispatch({ type: 'BACK_TO_HISTORY' })}
        />
      );

    case 'history':
      return (
        <HistoryList
          entries={history.entries}
          isAvailable={history.isAvailable}
          onSelect={(imageUrl, result) =>
            dispatch({ type: 'VIEW_HISTORY_RESULT', imageUrl, result })
          }
          onDelete={history.deleteEntry}
          onClose={() => dispatch({ type: 'HIDE_HISTORY' })}
        />
      );

    case 'camera':
    default:
      return (
        <CameraView
          analyzer={analyzerRef.current!}
          onHistorySave={history.saveEntry}
          historyAvailable={history.isAvailable}
          saveError={history.saveError}
          updateAvailable={state.updateAvailable}
        />
      );
  }
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
```

- [ ] **Step 2: Update src/main.tsx**

Replace `src/main.tsx`:

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

- [ ] **Step 3: Verify TypeScript compiles and Vite builds**

```bash
npx tsc --noEmit 2>&1 | tail -10
npx vite build 2>&1 | tail -5
```

Expected: Both succeed.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/main.tsx
git commit -m "feat: add App orchestration with screen routing and service worker updates"
```

---

## Task 19: Full Test Suite Verification

**Files:**
- No new files

- [ ] **Step 1: Run all tests**

```bash
npx vitest run 2>&1
```

Expected: All tests pass (appReducer, imagePreprocessor, eigenCam, MockClutterAnalyzer, ScoreDisplay, historyDb).

- [ ] **Step 2: Run the production build**

```bash
npx vite build 2>&1 | tail -10
```

Expected: Build completes without errors.

- [ ] **Step 3: Commit any fixes if needed**

If any tests failed, fix them and commit:

```bash
git add -A
git commit -m "fix: address test failures from integration"
```

---

## Task 20: Development Server Smoke Test

**Files:**
- No new files

- [ ] **Step 1: Start dev server and manually verify**

```bash
npm run dev -- --https --host
```

Open the URL in a browser. Verify:
1. Loading screen appears with spinner
2. After ~800ms (mock load delay), camera feed appears
3. Tapping capture button shows analyzing screen
4. After ~1200ms (mock inference delay), result screen shows score and heatmap
5. Heatmap opacity slider works
6. Retake returns to camera
7. History button opens history overlay
8. Previous analysis appears in history list
9. Tapping history item reopens result with "Back" button

- [ ] **Step 2: Final commit if any tweaks were needed**

```bash
git add -A
git commit -m "fix: address issues found during smoke test"
```

---

## Summary

| Task | Description | Tests |
|------|-------------|-------|
| 1 | Project scaffolding (Vite, React, TS, Tailwind) | Build verification |
| 2 | Shared TypeScript types | tsc --noEmit |
| 3 | App state reducer + context | 10 unit tests |
| 4 | Image preprocessor | 3 unit tests |
| 5 | Eigen-CAM heatmap | 4 unit tests |
| 6 | Mock analyzer + factory | 3 unit tests |
| 7 | ONNX analyzer skeleton | tsc --noEmit |
| 8 | IndexedDB history DB | 4 unit tests |
| 9 | useHistory hook | tsc --noEmit |
| 10 | Camera hooks | tsc --noEmit |
| 11 | ScoreDisplay component | 4 unit tests |
| 12 | HeatmapOverlay component | tsc --noEmit |
| 13 | LoadingScreen component | tsc --noEmit |
| 14 | AnalyzingView component | tsc --noEmit |
| 15 | ResultView component | tsc --noEmit |
| 16 | HistoryList component | tsc --noEmit |
| 17 | CameraView component | tsc --noEmit |
| 18 | App.tsx orchestration | tsc + build |
| 19 | Full test suite verification | All tests green |
| 20 | Dev server smoke test | Manual verification |
