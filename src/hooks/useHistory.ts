import { useState, useEffect, useCallback } from 'react';
import { historyDb } from '../db/historyDb';
import type { HistoryEntry, AnalysisResult } from '../types';

interface UseHistoryReturn {
  entries: HistoryEntry[];
  isAvailable: boolean;
  saveEntry: (result: AnalysisResult, imageDataUrl: string) => Promise<void>;
  deleteEntry: (id: number) => Promise<void>;
  saveError: string | null;
}

export function useHistory(): UseHistoryReturn {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isAvailable, setIsAvailable] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const available = await historyDb.isAvailable();
      if (cancelled) return;
      setIsAvailable(available);
      if (available) {
        const all = await historyDb.getAllEntries();
        if (!cancelled) setEntries(all);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const saveEntry = useCallback(async (result: AnalysisResult, imageDataUrl: string) => {
    try {
      const thumbnailDataUrl = await generateThumbnail(imageDataUrl);
      const entry: HistoryEntry = {
        score: result.score,
        imageDataUrl,
        thumbnailDataUrl,
        heatmap: result.heatmap,
        heatmapWidth: result.heatmapWidth,
        heatmapHeight: result.heatmapHeight,
        timestamp: Date.now(),
      };
      const id = await historyDb.saveEntry(entry);
      entry.id = id;
      setEntries(prev => [entry, ...prev]);
      setSaveError(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save history entry');
    }
  }, []);

  const deleteEntry = useCallback(async (id: number) => {
    try {
      await historyDb.deleteEntry(id);
      setEntries(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to delete history entry');
    }
  }, []);

  return { entries, isAvailable, saveEntry, deleteEntry, saveError };
}

function generateThumbnail(imageDataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const targetWidth = 200;
      const scale = targetWidth / img.width;
      const targetHeight = Math.round(img.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => reject(new Error('Image failed to load'));
    img.src = imageDataUrl;
  });
}
