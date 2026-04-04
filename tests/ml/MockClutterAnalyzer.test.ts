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
