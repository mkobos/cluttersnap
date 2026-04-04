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
