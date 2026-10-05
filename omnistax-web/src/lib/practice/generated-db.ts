/* Where generated exercises are kept: one IndexedDB store of their own, the
   same shape as the chats', read whole at boot since a library's worth is
   small, and carried in a backup beside the chats. */
import { readerWritesAllowed } from '../backup/guard';
import type { GeneratedExercise } from './generated';

const DB = 'omnistax-generated';
const STORE = 'generated';
const VERSION = 1;

const noStore = (): boolean => typeof indexedDB === 'undefined';

const open = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  if (noStore()) { reject(new Error('no IndexedDB in this environment')); return; }
  const req = indexedDB.open(DB, VERSION);
  req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' }); };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error ?? new Error('IndexedDB refused to open'));
});

const withStore = async <T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T> => {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = f(tx.objectStore(STORE));
    let result: T;
    if (req) req.onsuccess = () => { result = req.result; };
    tx.oncomplete = () => { db.close(); resolve(result); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error('IndexedDB refused the request')); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error('The transaction was interrupted')); };
  });
};

export const exportGenerated = async (): Promise<readonly GeneratedExercise[]> => {
  if (noStore()) return [];
  try { return await withStore<GeneratedExercise[]>('readonly', (s) => s.getAll()); } catch { return []; }
};

export const putGenerated = async (list: readonly GeneratedExercise[]): Promise<void> => {
  if (noStore() || !readerWritesAllowed() || !list.length) return;
  /* A reactive proxy cannot be structured-cloned, so what goes in is plain. */
  const plain = JSON.parse(JSON.stringify(list)) as GeneratedExercise[];
  try { await withStore('readwrite', (s) => { plain.forEach((g) => s.put(g)); }); } catch { /* private mode */ }
};

export const deleteGenerated = async (id: string): Promise<void> => {
  if (noStore() || !readerWritesAllowed()) return;
  try { await withStore('readwrite', (s) => s.delete(id)); } catch { /* nothing to remove */ }
};

/* A restore owns the whole profile, so its generated exercises replace these. */
export const replaceGenerated = async (list: readonly GeneratedExercise[]): Promise<void> => {
  if (noStore()) return;
  await withStore('readwrite', (s) => { s.clear(); list.forEach((g) => s.put(g)); });
};
