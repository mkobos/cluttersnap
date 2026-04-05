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
  const v = Math.max(0, Math.min(1, value));
  const hue = v <= 0.5
    ? 240 - (v / 0.5) * 180
    : 60 - ((v - 0.5) / 0.5) * 60;

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

/** Pre-computed 256-entry colour LUT to avoid per-pixel function calls. */
const HEATMAP_LUT = new Uint8Array(256 * 3);
(() => {
  for (let i = 0; i < 256; i++) {
    const [r, g, b] = heatmapValueToRgb(i / 255);
    HEATMAP_LUT[i * 3] = r;
    HEATMAP_LUT[i * 3 + 1] = g;
    HEATMAP_LUT[i * 3 + 2] = b;
  }
})();

export function HeatmapOverlay({
  heatmap,
  heatmapWidth,
  heatmapHeight,
  displayWidth,
  displayHeight,
  opacity,
}: HeatmapOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || displayWidth === 0 || displayHeight === 0) return;

    canvas.width = displayWidth;
    canvas.height = displayHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw heatmap at native resolution onto an offscreen canvas,
    // then scale it to display size in a single GPU-accelerated drawImage call.
    const offscreen = new OffscreenCanvas(heatmapWidth, heatmapHeight);
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;
    const imageData = offCtx.createImageData(heatmapWidth, heatmapHeight);

    for (let i = 0; i < heatmap.length; i++) {
      const idx = Math.round(Math.max(0, Math.min(1, heatmap[i])) * 255) * 3;
      imageData.data[i * 4]     = HEATMAP_LUT[idx];
      imageData.data[i * 4 + 1] = HEATMAP_LUT[idx + 1];
      imageData.data[i * 4 + 2] = HEATMAP_LUT[idx + 2];
      imageData.data[i * 4 + 3] = 255;
    }

    offCtx.putImageData(imageData, 0, 0);
    ctx.drawImage(offscreen, 0, 0, displayWidth, displayHeight);
  }, [heatmap, heatmapWidth, heatmapHeight, displayWidth, displayHeight]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0"
      style={{ opacity }}
    />
  );
}
