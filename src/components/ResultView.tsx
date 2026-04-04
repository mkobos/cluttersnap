import { useState, useCallback, useRef, useEffect } from 'react';
import { HeatmapOverlay } from './HeatmapOverlay';
import { ScoreDisplay } from './ScoreDisplay';
import type { AnalysisResult } from '../types';

interface ResultViewProps {
  imageUrl: string;
  result: AnalysisResult;
  resultSource: 'capture' | 'history';
  onRetake: () => void;
  onBack: () => void;
}

export function ResultView({ imageUrl, result, resultSource, onRetake, onBack }: ResultViewProps) {
  const [opacity, setOpacity] = useState(0.5);
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null!);

  useEffect(() => {
    setDisplaySize({ width: 0, height: 0 });
  }, [imageUrl]);

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const imgAspect = img.naturalWidth / img.naturalHeight;
    const containerAspect = containerWidth / containerHeight;

    let renderedWidth: number;
    let renderedHeight: number;

    if (imgAspect > containerAspect) {
      renderedWidth = containerWidth;
      renderedHeight = containerWidth / imgAspect;
    } else {
      renderedHeight = containerHeight;
      renderedWidth = containerHeight * imgAspect;
    }

    setDisplaySize({ width: Math.round(renderedWidth), height: Math.round(renderedHeight) });
  }, []);

  return (
    <div className="flex flex-col h-screen bg-slate-900">
      {/* Top section: photo + heatmap (60vh) */}
      <div ref={containerRef} className="relative flex items-center justify-center h-[60vh] bg-black overflow-hidden">
        <img
          src={imageUrl}
          alt="Analyzed photo"
          className="max-w-full max-h-full object-contain"
          onLoad={handleImageLoad}
        />
        {displaySize.width > 0 && (
          <div
            className="absolute"
            style={{
              width: displaySize.width,
              height: displaySize.height,
            }}
          >
            <HeatmapOverlay
              heatmap={result.heatmap}
              heatmapWidth={result.heatmapWidth}
              heatmapHeight={result.heatmapHeight}
              displayWidth={displaySize.width}
              displayHeight={displaySize.height}
              opacity={opacity}
            />
          </div>
        )}
        {/* Opacity slider */}
        <div className="absolute bottom-4 left-4 right-4">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={opacity}
            onChange={e => setOpacity(parseFloat(e.target.value))}
            className="w-full"
            aria-label="Heatmap opacity"
          />
        </div>
      </div>

      {/* Bottom section: score + actions (40vh) */}
      <div className="flex flex-col items-center justify-center h-[40vh] gap-6 p-4">
        <ScoreDisplay score={result.score} />

        {resultSource === 'capture' ? (
          <button
            onClick={onRetake}
            className="px-8 py-3 bg-slate-700 rounded-lg text-white font-semibold text-lg"
          >
            Retake
          </button>
        ) : (
          <button
            onClick={onBack}
            className="px-8 py-3 bg-slate-700 rounded-lg text-white font-semibold text-lg"
          >
            Back
          </button>
        )}
      </div>
    </div>
  );
}
