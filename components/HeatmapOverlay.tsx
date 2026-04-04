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
 * Interpolates linearly (decreasing hue) through these stops.
 */
function heatmapValueToRgb(value: number): [number, number, number] {
  const hue = value <= 0.5
    ? 240 - (value / 0.5) * 180   // 240 → 60
    : 60 - ((value - 0.5) / 0.5) * 60; // 60 → 0

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
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
