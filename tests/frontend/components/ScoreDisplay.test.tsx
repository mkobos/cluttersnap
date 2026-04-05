import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { ScoreDisplay } from '../../../frontend/components/ScoreDisplay';

describe('ScoreDisplay', () => {
  beforeEach(() => {
    // Mock requestAnimationFrame to simulate animation by calling the callback twice
    // per effect instance with timestamps that complete the animation
    const instances = new WeakMap<FrameRequestCallback, number>();
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      let count = instances.get(cb) || 0;
      count++;
      instances.set(cb, count);

      if (count === 1) {
        // First frame call - will set startTimeRef to this timestamp
        cb(0);
      } else if (count === 2) {
        // Second frame call - elapsed > 800ms to complete animation
        cb(1000);
      }
      // Further calls won't invoke callback
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders the rounded score and /10', async () => {
    await act(async () => {
      render(<ScoreDisplay score={7.3} />);
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('/ 10')).toBeInTheDocument();
  });

  it('shows "Tidy" in green for scores 1-3', async () => {
    await act(async () => {
      render(<ScoreDisplay score={2.1} />);
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(screen.getByText('Tidy')).toBeInTheDocument();
  });

  it('shows "Moderate clutter" in amber for scores 4-6', async () => {
    await act(async () => {
      render(<ScoreDisplay score={5.0} />);
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(screen.getByText('Moderate clutter')).toBeInTheDocument();
  });

  it('shows "Cluttered" in red for scores 7-10', async () => {
    await act(async () => {
      render(<ScoreDisplay score={8.9} />);
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(screen.getByText('Cluttered')).toBeInTheDocument();
  });

  it('resets animation when score prop changes', async () => {
    const { rerender } = render(<ScoreDisplay score={3.0} />);
    // First render: score 3 → "Tidy"
    expect(screen.getByText('Tidy')).toBeInTheDocument();

    // Re-render with new score: 8 → "Cluttered"
    await act(async () => {
      rerender(<ScoreDisplay score={8.0} />);
      // Wait for RAF to complete
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(screen.getByText('Cluttered')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });
});
