/* The database the drawings live in. It is a module of its own, apart from the
   store that makes them reactive, because the backup reads and writes it and
   the backup must be readable outside a browser and outside Svelte: a module
   carrying runes cannot be imported by a plain test, and the export of a
   reader's profile is exactly the thing most worth testing.

   Two stores: `drawings`, one record per drawing under its own id, and
   `scratch`, one page per exercise under the key that names it. */
import { readerWritesAllowed } from '../backup/guard';
import { parseDrawing, type Drawing } from './model';

export const DB = 'omnistax-drawings';
export const DRAWINGS = 'drawings';
export const SCRATCH = 'scratch';
const VERSION = 1;

export const noStore = (): boolean => typeof indexedDB === 'undefined';

export const open = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  if (noStore()) { reject(new Error('no IndexedDB in this environment')); return; }
  const req = indexedDB.open(DB, VERSION);
  req.onupgradeneeded = () => {
    const db = req.result;
    /* One store is keyed by the drawing's own id, the other by the exercise
       the page belongs to, which is not in the value at all. */
    if (!db.objectStoreNames.contains(DRAWINGS)) db.createObjectStore(DRAWINGS, { keyPath: 'id' });
    if (!db.objectStoreNames.contains(SCRATCH)) db.createObjectStore(SCRATCH);
  };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error ?? new Error('IndexedDB refused to open'));
});

/* One transaction, closed behind itself, wrapped in a promise, as the asset
   store does it. */
export const withStore = async <T>(name: string, mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(name, mode);
    const req = f(tx.objectStore(name));
    let result: T;
    req.onsuccess = () => { result = req.result; };
    tx.oncomplete = () => { db.close(); resolve(result); };
    tx.onerror = () => { db.close(); reject(tx.error ?? req.error ?? new Error('IndexedDB refused the request')); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error('The drawing transaction was interrupted')); };
  });
};

export const putDrawing = async (drawing: Drawing): Promise<void> => {
  if (noStore() || !readerWritesAllowed()) return;
  try { await withStore(DRAWINGS, 'readwrite', (s) => s.put(drawing)); } catch { /* the drawing stays in this session */ }
};
export const getDrawing = async (id: string): Promise<Drawing | null> => {
  if (noStore()) return null;
  try { return parseDrawing(await withStore<unknown>(DRAWINGS, 'readonly', (s) => s.get(id))); } catch { return null; }
};
export const deleteDrawingRecord = async (id: string): Promise<void> => {
  if (noStore() || !readerWritesAllowed()) return;
  try { await withStore(DRAWINGS, 'readwrite', (s) => s.delete(id)); } catch { /* nothing to remove */ }
};

export const putScratchRecord = async (key: string, drawing: Drawing): Promise<void> => {
  if (noStore() || !readerWritesAllowed()) return;
  try { await withStore(SCRATCH, 'readwrite', (s) => s.put(drawing, key)); } catch { /* the work stays in this session */ }
};
export const getScratchRecord = async (key: string): Promise<Drawing | null> => {
  if (noStore()) return null;
  try { return parseDrawing(await withStore<unknown>(SCRATCH, 'readonly', (s) => s.get(key))); } catch { return null; }
};
export const deleteScratchRecord = async (key: string): Promise<void> => {
  if (noStore() || !readerWritesAllowed()) return;
  try { await withStore(SCRATCH, 'readwrite', (s) => s.delete(key)); } catch { /* nothing to remove */ }
};

/* ── what a backup carries ───────────────────────────────────────────────── */

export type ScratchRecord = { readonly key: string; readonly drawing: Drawing };

export const exportDrawings = async (): Promise<Drawing[]> => {
  if (noStore()) return [];
  try { return (await withStore<unknown[]>(DRAWINGS, 'readonly', (s) => s.getAll())).flatMap((d) => { const p = parseDrawing(d); return p ? [p] : []; }); }
  catch { return []; }
};

export const exportScratch = async (): Promise<ScratchRecord[]> => {
  if (noStore()) return [];
  try {
    const keys = await withStore<IDBValidKey[]>(SCRATCH, 'readonly', (s) => s.getAllKeys());
    const values = await withStore<unknown[]>(SCRATCH, 'readonly', (s) => s.getAll());
    return keys.flatMap((k, i) => { const d = parseDrawing(values[i]); return d ? [{ key: String(k), drawing: d }] : []; });
  } catch { return []; }
};

/* A restore owns the whole of the reader's profile, so its lists replace each
   store exactly as the asset store is replaced. */
const replaceStore = async (name: string, put: (s: IDBObjectStore) => void): Promise<void> => {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(name, 'readwrite');
    const store = tx.objectStore(name);
    store.clear();
    put(store);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error('IndexedDB refused the restore')); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error('IndexedDB aborted the restore')); };
  });
};

export const replaceDrawings = async (list: readonly Drawing[]): Promise<void> => {
  if (noStore()) return;
  await replaceStore(DRAWINGS, (s) => list.forEach((d) => s.put(d)));
};
export const replaceScratch = async (list: readonly ScratchRecord[]): Promise<void> => {
  if (noStore()) return;
  await replaceStore(SCRATCH, (s) => list.forEach((r) => s.put(r.drawing, r.key)));
};
