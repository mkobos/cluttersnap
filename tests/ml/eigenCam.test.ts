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
    // Deterministic input: linear ramp to test full value range
    const featureMap = new Float32Array(C * H * W);
    for (let i = 0; i < featureMap.length; i++) {
      featureMap[i] = (i % 7) * 1.5; // varies 0..9, no pattern-based bias
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
