import { getScoreBand } from '../utils/scoreBand';

interface ScoreDisplayProps {
  score: number;
}

export function ScoreDisplay({ score }: ScoreDisplayProps) {
  const rounded = Math.round(score);
  const { label, textColor } = getScoreBand(score);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-6xl font-bold">
        <span>{rounded}</span>
        <span className="text-3xl text-slate-400"> / 10</span>
      </div>
      <span className={`text-xl font-semibold ${textColor}`}>{label}</span>
    </div>
  );
}
