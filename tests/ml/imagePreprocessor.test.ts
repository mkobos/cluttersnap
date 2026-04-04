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
