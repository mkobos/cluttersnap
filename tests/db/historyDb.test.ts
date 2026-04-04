import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { historyDb } from '../../src/db/historyDb';
import type { HistoryEntry } from '../../src/types';

function makeEntry(overrides?: Partial<HistoryEntry>): Omit<HistoryEntry, 'id'> {
  return {
    score: 5.5,
    imageDataUrl: 'data:image/jpeg;base64,abc',
    thumbnailDataUrl: 'data:image/jpeg;base64,thumb',
    heatmap: new Float32Array([0.1, 0.5, 0.9, 0.2]),
    heatmapWidth: 2,
    heatmapHeight: 2,
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('historyDb', () => {
  beforeEach(() => {
    // Reset the IndexedDB between tests
    indexedDB = new IDBFactory();
  });

  it('isAvailable returns true when IndexedDB works', async () => {
    const available = await historyDb.isAvailable();
    expect(available).toBe(true);
  });

  it('saveEntry returns an id and getAllEntries retrieves it', async () => {
    const entry = makeEntry();
    const id = await historyDb.saveEntry(entry as HistoryEntry);
    expect(typeof id).toBe('number');

    const entries = await historyDb.getAllEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe(id);
    expect(entries[0].score).toBe(5.5);
  });

  it('getAllEntries returns entries ordered by timestamp descending', async () => {
    await historyDb.saveEntry(makeEntry({ timestamp: 1000 }) as HistoryEntry);
    await historyDb.saveEntry(makeEntry({ timestamp: 3000 }) as HistoryEntry);
    await historyDb.saveEntry(makeEntry({ timestamp: 2000 }) as HistoryEntry);

    const entries = await historyDb.getAllEntries();
    expect(entries[0].timestamp).toBe(3000);
    expect(entries[1].timestamp).toBe(2000);
    expect(entries[2].timestamp).toBe(1000);
  });

  it('deleteEntry removes the entry', async () => {
    const id = await historyDb.saveEntry(makeEntry() as HistoryEntry);
    await historyDb.deleteEntry(id);

    const entries = await historyDb.getAllEntries();
    expect(entries).toHaveLength(0);
  });
});
