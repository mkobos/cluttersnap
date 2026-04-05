import { useState, useRef } from 'react';
import type { HistoryEntry, AnalysisResult } from '../types';

interface HistoryListProps {
  entries: HistoryEntry[];
  isAvailable: boolean;
  onSelect: (imageUrl: string, result: AnalysisResult) => void;
  onDelete: (id: number) => void;
  onClose: () => void;
}

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const entryDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  if (entryDate.getTime() === today.getTime()) return `Today ${time}`;
  if (entryDate.getTime() === yesterday.getTime()) return `Yesterday ${time}`;

  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString([], { month: 'short' });
  return `${day} ${month} ${time}`;
}

function getScoreBandColor(score: number): string {
  const rounded = Math.round(score);
  if (rounded <= 3) return 'bg-green-500';
  if (rounded <= 6) return 'bg-amber-500';
  return 'bg-red-500';
}

interface SwipeableItemProps {
  entry: HistoryEntry;
  onSelect: () => void;
  onDelete: () => void;
}

function SwipeableItem({ entry, onSelect, onDelete }: SwipeableItemProps) {
  const [offsetX, setOffsetX] = useState(0);
  const startXRef = useRef(0);
  const isDraggingRef = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    isDraggingRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    const diff = e.touches[0].clientX - startXRef.current;
    setOffsetX(Math.min(0, diff)); // only allow left swipe
  };

  const handleTouchEnd = () => {
    isDraggingRef.current = false;
    // If swiped far enough, keep the delete button visible
    setOffsetX(prev => (prev < -80 ? -100 : 0));
  };

  return (
    <div className="relative overflow-hidden">
      {/* Delete button behind the item */}
      <div className="absolute right-0 top-0 bottom-0 flex items-center justify-center w-24 bg-red-600">
        <button onClick={onDelete} className="text-white font-semibold px-3">
          Delete
        </button>
      </div>
      {/* Swipeable item */}
      <div
        className="relative flex items-center gap-3 p-3 bg-slate-800 transition-transform"
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => offsetX === 0 && onSelect()}
      >
        <img
          src={entry.thumbnailDataUrl}
          alt="Thumbnail"
          className="w-16 h-16 object-cover rounded"
        />
        <div className="flex-1">
          <span className="text-sm text-slate-400">{formatTimestamp(entry.timestamp)}</span>
        </div>
        <span className={`px-2 py-1 rounded text-sm font-bold text-white ${getScoreBandColor(entry.score)}`}>
          {Math.round(entry.score)}
        </span>
      </div>
    </div>
  );
}

export function HistoryList({ entries, isAvailable, onSelect, onDelete, onClose }: HistoryListProps) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col animate-slide-down">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <h2 className="text-xl font-bold">History</h2>
        <button onClick={onClose} aria-label="Close" className="text-slate-400 text-2xl leading-none">&times;</button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!isAvailable ? (
          <div className="flex items-center justify-center h-full p-6 text-center">
            <p className="text-slate-400">History is unavailable in this browser mode.</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex items-center justify-center h-full p-6 text-center">
            <p className="text-slate-400">No analyses yet. Take a photo to get started!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {entries.map(entry => (
              <SwipeableItem
                key={entry.id ?? entry.timestamp}
                entry={entry}
                onSelect={() =>
                  onSelect(entry.imageDataUrl, {
                    score: entry.score,
                    heatmap: entry.heatmap,
                    heatmapWidth: entry.heatmapWidth,
                    heatmapHeight: entry.heatmapHeight,
                  })
                }
                onDelete={() => entry.id !== undefined && onDelete(entry.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
