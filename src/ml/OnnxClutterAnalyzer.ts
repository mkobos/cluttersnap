import type { ClutterAnalyzer, AnalysisResult } from '../types';
import type { InferenceSession } from 'onnxruntime-web';
import { preprocessImage } from './imagePreprocessor';
import { computeEigenCam } from './eigenCam';

export class OnnxClutterAnalyzer implements ClutterAnalyzer {
  private session: InferenceSession | null = null;
  private readonly modelUrl: string;

  constructor(modelUrl: string) {
    this.modelUrl = modelUrl;
  }

  async load(): Promise<void> {
    // Dynamic import keeps onnxruntime-web out of Vite's pre-bundling (see vite.config.ts optimizeDeps.exclude)
    const ort = await import('onnxruntime-web');
    this.session = await ort.InferenceSession.create(this.modelUrl, {
      executionProviders: ['webgl', 'wasm'],
    });
  }

  async analyze(imageData: ImageData): Promise<AnalysisResult> {
    if (!this.session) throw new Error('Model not loaded. Call load() first.');

    const ort = await import('onnxruntime-web');
    const inputTensor = preprocessImage(imageData);
    const tensor = new ort.Tensor('float32', inputTensor, [1, 3, 224, 224]);
    const feeds: Record<string, typeof tensor> = { input: tensor };
    const results = await this.session.run(feeds);

    // Extract score
    const scoreData = results['score'].data as Float32Array;
    const score = scoreData[0];
    if (score < 1 || score > 10) {
      throw new Error(`Score out of range: ${score}`);
    }

    // Extract feature map and compute heatmap
    const featureMapTensor = results['feature_map'];
    const featureMapData = featureMapTensor.data as Float32Array;
    const [, C, H, W] = featureMapTensor.dims as [number, number, number, number];
    const heatmap = computeEigenCam(featureMapData, C, H, W);

    return { score, heatmap, heatmapWidth: W, heatmapHeight: H };
  }
}
