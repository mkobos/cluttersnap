import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClutterAnalyzer } from '../../../frontend/ml/ApiClutterAnalyzer';

const ENDPOINT = '/api/analyze';

// OffscreenCanvas is not available in jsdom — provide a minimal stub.
vi.stubGlobal('OffscreenCanvas', class {
  constructor(public width: number, public height: number) {}
  getContext() { return { putImageData: vi.fn() }; }
  convertToBlob() { return Promise.resolve(new Blob(['img'], { type: 'image/jpeg' })); }
});

function mockFetch(responseBody: object, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => responseBody,
  });
}

// Match the pattern used elsewhere in the test suite: plain object cast to ImageData.
function makeImageData(width = 4, height = 4): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  return { data, width, height, colorSpace: 'srgb' } as ImageData;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('ApiClutterAnalyzer', () => {
  describe('analyze()', () => {
    it('returns score and heatmap matching image dimensions', async () => {
      const heatmap = [[0.1, 0.2], [0.3, 0.4]];
      globalThis.fetch = mockFetch({ score: 7.3, heatmap });

      const analyzer = new ApiClutterAnalyzer(ENDPOINT);
      const result = await analyzer.analyze(makeImageData(2, 2));

      expect(result.score).toBe(7.3);
      expect(result.heatmapWidth).toBe(2);
      expect(result.heatmapHeight).toBe(2);
      expect(result.heatmap).toBeInstanceOf(Float32Array);
      expect(result.heatmap.length).toBe(4);
    });

    it('flattens the 2D heatmap in row-major order', async () => {
      const heatmap = [[0.1, 0.2], [0.3, 0.4]];
      globalThis.fetch = mockFetch({ score: 5.0, heatmap });

      const analyzer = new ApiClutterAnalyzer(ENDPOINT);
      const result = await analyzer.analyze(makeImageData(2, 2));

      expect(result.heatmap[0]).toBeCloseTo(0.1);
      expect(result.heatmap[1]).toBeCloseTo(0.2);
      expect(result.heatmap[2]).toBeCloseTo(0.3);
      expect(result.heatmap[3]).toBeCloseTo(0.4);
    });

    it('throws when the API returns a non-ok status', async () => {
      globalThis.fetch = mockFetch({ detail: 'Invalid image' }, 400);

      const analyzer = new ApiClutterAnalyzer(ENDPOINT);
      await expect(analyzer.analyze(makeImageData())).rejects.toThrow();
    });

    it('POSTs to the configured endpoint', async () => {
      const heatmap = [[0.5]];
      const fetchMock = mockFetch({ score: 3.0, heatmap });
      globalThis.fetch = fetchMock;

      const analyzer = new ApiClutterAnalyzer(ENDPOINT);
      await analyzer.analyze(makeImageData(1, 1));

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, options] = fetchMock.mock.calls[0];
      expect(url).toBe(ENDPOINT);
      expect(options.method).toBe('POST');
    });
  });
});

