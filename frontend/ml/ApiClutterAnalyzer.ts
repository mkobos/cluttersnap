import type { AnalysisResult, ClutterAnalyzer } from '../types';

export class ApiClutterAnalyzer implements ClutterAnalyzer {
  private readonly endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  async load(): Promise<void> {
    // No model to load — the API is always ready.
  }

  async analyze(imageData: ImageData): Promise<AnalysisResult> {
    const blob = await imageDataToBlob(imageData);
    const body = new FormData();
    body.append('image', blob, 'image.jpg');

    const response = await fetch(this.endpoint, { method: 'POST', body });
    if (!response.ok) {
      throw new Error(`API error ${response.status}`);
    }

    const data = (await response.json()) as { score: number; heatmap: number[][] };
    if (
      typeof data.score !== 'number' ||
      !Array.isArray(data.heatmap) ||
      data.heatmap.length === 0 ||
      !Array.isArray(data.heatmap[0])
    ) {
      throw new Error('Invalid API response shape');
    }
    const height = data.heatmap.length;
    const width = data.heatmap[0].length;
    const flat = new Float32Array(data.heatmap.flat());

    return { score: data.score, heatmap: flat, heatmapWidth: width, heatmapHeight: height };
  }
}

async function imageDataToBlob(imageData: ImageData): Promise<Blob> {
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2d context unavailable');
  ctx.putImageData(imageData, 0, 0);
  return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 });
}
