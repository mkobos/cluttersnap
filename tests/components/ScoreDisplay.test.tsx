import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { ScoreDisplay } from '../../src/components/ScoreDisplay';

describe('ScoreDisplay', () => {
  beforeEach(() => {
    // Mock requestAnimationFrame to run callback immediately with a timestamp
    // that's past the animation duration so the score jumps to final value
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(1000); // timestamp > 800ms animation duration
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders the rounded score and /10', () => {
    act(() => {
      render(<ScoreDisplay score={7.3} />);
    });
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('/ 10')).toBeInTheDocument();
  });

  it('shows "Tidy" in green for scores 1-3', () => {
    act(() => {
      render(<ScoreDisplay score={2.1} />);
    });
    expect(screen.getByText('Tidy')).toBeInTheDocument();
  });

  it('shows "Moderate clutter" in amber for scores 4-6', () => {
    act(() => {
      render(<ScoreDisplay score={5.0} />);
    });
    expect(screen.getByText('Moderate clutter')).toBeInTheDocument();
  });

  it('shows "Cluttered" in red for scores 7-10', () => {
    act(() => {
      render(<ScoreDisplay score={8.9} />);
    });
    expect(screen.getByText('Cluttered')).toBeInTheDocument();
  });
});
