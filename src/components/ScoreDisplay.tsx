import { useState, useEffect, useRef } from 'react';

interface ScoreDisplayProps {
  score: number;
}

function getScoreBand(rounded: number): { label: string; colorClass: string } {
  if (rounded <= 3) return { label: 'Tidy', colorClass: 'text-green-400' };
  if (rounded <= 6) return { label: 'Moderate clutter', colorClass: 'text-amber-400' };
  return { label: 'Cluttered', colorClass: 'text-red-400' };
}

const ANIMATION_DURATION_MS = 800;

export function ScoreDisplay({ score }: ScoreDisplayProps) {
  const rounded = Math.round(score);
  const [displayValue, setDisplayValue] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    startTimeRef.current = null;

    function animate(timestamp: number) {
      if (startTimeRef.current === null) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / ANIMATION_DURATION_MS, 1);
      setDisplayValue(Math.round(progress * rounded));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    }

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [rounded]);

  const { label, colorClass } = getScoreBand(rounded);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-6xl font-bold">
        <span>{displayValue}</span>
        <span className="text-3xl text-slate-400"> / 10</span>
      </div>
      <span className={`text-xl font-semibold ${colorClass}`}>{label}</span>
    </div>
  );
}
