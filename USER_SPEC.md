# Clutter Detector — Product Specification

## Overview

A Progressive Web App (PWA) that allows the user to take a photo of a room and receive:
- A **clutter score** from 1 to 10 (1 = perfectly tidy, 10 = extremely cluttered)
- A **heatmap overlay** on the photo highlighting the most cluttered zones

All inference runs **fully in the browser**. There is no backend server. The app works offline after the first load. It is accessible on any modern mobile or desktop browser via a URL, and can be installed to the home screen as a PWA.

---

## Target Platforms

- **Primary:** Chrome for Android
- **Secondary:** Safari on iOS

---

## Screens

### Loading Screen

Shown on first visit while the ML model is initializing. Camera permission is requested at this point, in parallel with model loading.

- Full-screen loading spinner with an explanatory message (e.g. "Loading model…")
- The camera does not start until the model is fully loaded and camera permission is granted
- If the model file fails to load, replace the spinner with a full-screen error message and a retry button

### Camera Screen

Shown after the model has loaded and when the user returns from a result or history screen.

- Full-screen live camera feed using the rear-facing camera (falls back silently to any available camera if no rear camera is present)
- Circular capture button centered at the bottom
- History icon button in the top-right corner to open the history overlay
- Tapping the capture button freezes the frame and transitions to the Analyzing screen
- If IndexedDB is unavailable, a brief notice is shown once informing the user that the history feature is disabled
- If a new version of the app is available, a persistent banner is shown: "New version available — tap to reload". This banner only appears on the Camera screen and never interrupts analysis or results.

### Analyzing Screen

Shown while inference is running after a photo is captured.

- The captured photo is displayed
- A loading indicator communicates that analysis is in progress
- This screen is transient — it resolves to the Result screen on success, or returns to the Camera screen with a toast error on failure
- There is no cancel action; the screen remains until inference completes or fails

### Result Screen

Shown after a successful analysis, or when a historical result is opened from the History screen.

**Top section (60% of viewport height):**
- The captured photo as a base layer, letterboxed (object-fit: contain) to preserve aspect ratio
- Heatmap overlay rendered on top using a blue (low clutter) → yellow → red (high clutter) color scale, defaulting to 50% opacity
- Opacity range slider at the bottom of this section to control heatmap visibility

**Bottom section (40% of viewport height):**
- The clutter score displayed as a large animated number, e.g. `7 / 10` (integer, no decimal places)
- Score band label:
  - 1–3 → "Tidy" (green)
  - 4–6 → "Moderate clutter" (amber)
  - 7–10 → "Cluttered" (red)
- **When reached from a new capture:** a "Retake" button that returns to the Camera screen
- **When reached from History:** a "Back" button that returns to the History overlay; no "Retake" button

Each new result is automatically saved to history (full photo, heatmap data, and score stored in IndexedDB).

### History Screen

A full-screen overlay sliding down from the top, accessible via the History icon in the top-right corner of the Camera screen.

- Scrollable list of past analyses, newest first
- Each item shows:
  - Thumbnail of the captured photo
  - Score badge with the appropriate band color
  - Human-readable timestamp: "Today HH:MM" or "Yesterday HH:MM" for recent items; absolute date and time (e.g. "02 Apr 14:32") for older items
- Empty state message if no history exists
- Tapping an item opens the Result screen showing that historical photo, heatmap, and score
- Swipe left on an item to reveal a "Delete" button; tapping "Delete" removes the item from history
- Close button returns to the Camera screen

---

## Error Handling

| Scenario | User-facing behaviour |
|---|---|
| Camera permission denied | Clear message explaining why camera is needed, with plain-text instructions for how to enable it in browser settings |
| `getUserMedia` not supported | Message that the browser is not supported; suggest Chrome or Safari |
| Model file fails to load | Full-screen error with a retry button |
| ONNX inference fails | Toast error message; return to Camera screen |
| Page not served over HTTPS | Camera API unavailable — ensure HTTPS in all environments |
| IndexedDB unavailable (e.g. private browsing) | History feature disabled; a brief notice is shown once on the Camera screen |

---

## PWA & Offline Behaviour

- After the first load, the app works fully offline including inference
- The ML model is cached by the Service Worker on first load
- All history data (photos, heatmap data, scores) is stored in IndexedDB and available offline
- On iOS, the user must use Safari and "Add to Home Screen" for PWA installation
- On Android Chrome, the browser shows an automatic "Add to Home Screen" banner
