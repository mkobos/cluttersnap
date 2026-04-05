import { openDB, type IDBPDatabase } from 'idb';
import type { HistoryEntry } from '../types';

const DB_NAME = 'cluttersnap';
const STORE_NAME = 'history';
const DB_VERSION = 1;

let _db: IDBPDatabase | null = null;

async function getDb(): Promise<IDBPDatabase> {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
  return _db;
}

async function isAvailable(): Promise<boolean> {
  try {
    await getDb();
    return true;
  } catch {
    return false;
  }
}

async function saveEntry(entry: HistoryEntry): Promise<number> {
  const db = await getDb();
  return await db.add(STORE_NAME, entry) as number;
}

async function getAllEntries(): Promise<HistoryEntry[]> {
  const db = await getDb();
  const entries = await db.getAll(STORE_NAME) as HistoryEntry[];
  return entries.sort((a, b) => b.timestamp - a.timestamp);
}

async function deleteEntry(id: number): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, id);
}

export const historyDb = { isAvailable, saveEntry, getAllEntries, deleteEntry };

/** Drop the cached connection. Call this in tests that reset the fake IndexedDB. */
export function _resetDbForTests(): void {
  _db = null;
}
