import { openDB } from 'idb';
import type { HistoryEntry } from '../types';

const DB_NAME = 'cluttersnap';
const STORE_NAME = 'history';
const DB_VERSION = 1;

function getDb() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
}

async function isAvailable(): Promise<boolean> {
  try {
    const db = await getDb();
    db.close();
    return true;
  } catch {
    return false;
  }
}

async function saveEntry(entry: HistoryEntry): Promise<number> {
  const db = await getDb();
  const id = await db.add(STORE_NAME, entry) as number;
  db.close();
  return id;
}

async function getAllEntries(): Promise<HistoryEntry[]> {
  const db = await getDb();
  const entries = await db.getAll(STORE_NAME) as HistoryEntry[];
  db.close();
  return entries.sort((a, b) => b.timestamp - a.timestamp);
}

async function deleteEntry(id: number): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, id);
  db.close();
}

export const historyDb = { isAvailable, saveEntry, getAllEntries, deleteEntry };
