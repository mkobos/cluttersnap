export function getScoreBand(score: number): { label: string; textColor: string; bgColor: string } {
  const rounded = Math.round(score);
  if (rounded <= 3) return { label: 'Tidy', textColor: 'text-green-400', bgColor: 'bg-green-500' };
  if (rounded <= 6) return { label: 'Moderate clutter', textColor: 'text-amber-400', bgColor: 'bg-amber-500' };
  return { label: 'Cluttered', textColor: 'text-red-400', bgColor: 'bg-red-500' };
}
