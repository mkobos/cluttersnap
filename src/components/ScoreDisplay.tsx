interface ScoreDisplayProps {
  score: number;
}

function getScoreBand(rounded: number): { label: string; colorClass: string } {
  if (rounded <= 3) return { label: 'Tidy', colorClass: 'text-green-400' };
  if (rounded <= 6) return { label: 'Moderate clutter', colorClass: 'text-amber-400' };
  return { label: 'Cluttered', colorClass: 'text-red-400' };
}

export function ScoreDisplay({ score }: ScoreDisplayProps) {
  const rounded = Math.round(score);
  const { label, colorClass } = getScoreBand(rounded);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-6xl font-bold">
        <span>{rounded}</span>
        <span className="text-3xl text-slate-400"> / 10</span>
      </div>
      <span className={`text-xl font-semibold ${colorClass}`}>{label}</span>
    </div>
  );
}
