import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { ResultView } from '../../src/components/ResultView';
import type { AnalysisResult } from '../../src/types';

const MOCK_RESULT: AnalysisResult = {
  score: 7.5,
  heatmap: new Float32Array(49).fill(0.5),
  heatmapWidth: 7,
  heatmapHeight: 7,
};

describe('ResultView', () => {
  let rafCallbacks: FrameRequestCallback[];

  beforeEach(() => {
    rafCallbacks = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  /**
   * Regression test for the cached-image bug on Android.
   *
   * When navigating from the Analyzing screen to the Result screen, the browser
   * already has the image cached. The img `load` event fires before the browser
   * has computed layout for the newly mounted ResultView, so clientWidth and
   * clientHeight on the container are 0 at that moment. Without the rAF deferral,
   * the heatmap overlay is never rendered because displaySize stays { 0, 0 }.
   *
   * This test reproduces that scenario:
   *   - fires `load` while the container still reports 0×0 (jsdom default)
   *   - sets real dimensions on the container element
   *   - fires the rAF callback (which is when the fix reads the dimensions)
   * and asserts the heatmap canvas becomes visible only after the rAF fires.
   */
  it('renders heatmap overlay after rAF when container dimensions were 0 at image load time', async () => {
    const { container } = render(
      <ResultView
        imageUrl="data:image/jpeg;base64,/9j/test"
        result={MOCK_RESULT}
        resultSource="capture"
        onRetake={vi.fn()}
        onBack={vi.fn()}
      />
    );

    const img = screen.getByAltText('Analyzed photo');

    // jsdom always returns 0 for naturalWidth/naturalHeight — override to simulate
    // a real image so the aspect-ratio calculation produces non-zero dimensions.
    Object.defineProperty(img, 'naturalWidth', { value: 1280, configurable: true });
    Object.defineProperty(img, 'naturalHeight', { value: 960, configurable: true });

    // Fire load with container still at 0×0. In jsdom clientWidth/clientHeight are
    // always 0 unless explicitly set — this naturally mirrors the cached-image
    // scenario where load fires before browser layout.
    fireEvent.load(img);

    // The heatmap canvas must not exist yet: the rAF callback hasn't fired.
    expect(container.querySelector('canvas')).toBeNull();

    // Simulate the browser finishing layout by giving the containerRef element
    // real dimensions. containerRef is the first div child of the root element.
    const imageContainer = container.firstElementChild!.firstElementChild as HTMLElement;
    Object.defineProperty(imageContainer, 'clientWidth', { value: 400, configurable: true });
    Object.defineProperty(imageContainer, 'clientHeight', { value: 300, configurable: true });

    // Fire all pending rAF callbacks — this is when ResultView reads the container
    // dimensions and calls setDisplaySize with non-zero values.
    await act(async () => {
      rafCallbacks.forEach(cb => cb(performance.now()));
    });

    // The heatmap canvas should now be in the DOM.
    expect(container.querySelector('canvas')).toBeInTheDocument();
  });
});
