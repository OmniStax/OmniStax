/* The bytes of an imported file, and the text pulled out of it. Both are far
   too heavy for the storage the file list uses, so they live in an IndexedDB
   of their own: `blobs` holds the file itself and `text` the pages of a PDF as
   strings, extracted once at import so that search never parses a PDF again.

   Blobs are stored as Blobs and not as data URLs — a data URL is a third
   larger and has to be built and parsed every time — and the backup exporter
   turns them into base64 on the way out. The transaction wrapper is the shape
   `notes/assets.ts` uses, written again here rather than shared: that module
   knows one store of one database, and this one knows two. */
import { readerWritesAllowed } from '../backup/guard';
import type { FileId } from '../types/ids';

export type FileBlob = { readonly id: FileId; readonly blob: Blob; readonly created: number };
/* The text of a PDF, page by page, in page order: `pages[0]` is page 1. */
export type FileText = { readonly id: FileId; readonly pages: readonly string[] };

const DB = 'omnistax-files';
export const BLOBS = 'blobs';
export const TEXT = 'text';
const VERSION = 1;

let pendingWrites = 0;
const idleWaiters = new Set<() => void>();

const noStore = (): boolean => typeof indexedDB === 'undefined';

const open = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  if (noStore()) { reject(new Error('no IndexedDB in this environment')); return; }
  const req = indexedDB.open(DB, VERSION);
  req.onupgradeneeded = () => {
    [BLOBS, TEXT].forEach((name) => { if (!req.result.objectStoreNames.contains(name)) req.result.createObjectStore(name, { keyPath: 'id' }); });
  };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error ?? new Error('IndexedDB refused to open'));
});

/* One transaction over one store, closed behind itself, wrapped in a promise. */
const withStore = async <T>(store: string, mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = f(tx.objectStore(store));
    let result: T;
    req.onsuccess = () => { result = req.result; };
    tx.oncomplete = () => { db.close(); resolve(result); };
    tx.onerror = () => { db.close(); reject(tx.error ?? req.error ?? new Error('IndexedDB refused the request')); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error('The file transaction was interrupted')); };
  });
};

const counted = async <T>(run: () => Promise<T>): Promise<T> => {
  pendingWrites++;
  try { return await run(); }
  finally {
    pendingWrites--;
    if (pendingWrites === 0) { idleWaiters.forEach((resolve) => resolve()); idleWaiters.clear(); }
  }
};

export const putBlob = (id: FileId, blob: Blob): Promise<void> => counted(async () => {
  if (!readerWritesAllowed()) throw new Error('Reader data is being restored.');
  await withStore(BLOBS, 'readwrite', (s) => s.put({ id, blob, created: Date.now() }));
});

/* A missing blob is not an error: the tab says the file's bytes are gone. */
export const getBlob = async (id: FileId): Promise<Blob | null> => {
  if (noStore()) return null;
  try { const rec = await withStore<FileBlob | undefined>(BLOBS, 'readonly', (s) => s.get(id)); return rec?.blob ?? null; } catch { return null; }
};

export const deleteBlob = async (id: FileId): Promise<void> => {
  if (noStore() || !readerWritesAllowed()) return;
  try { await withStore(BLOBS, 'readwrite', (s) => s.delete(id)); } catch { /* nothing to remove */ }
};

export const putText = (id: FileId, pages: readonly string[]): Promise<void> => counted(async () => {
  if (!readerWritesAllowed()) return;
  try { await withStore(TEXT, 'readwrite', (s) => s.put({ id, pages })); } catch { /* the corpus is a convenience, never a failure */ }
});

export const getText = async (id: FileId): Promise<readonly string[] | null> => {
  if (noStore()) return null;
  try { const rec = await withStore<FileText | undefined>(TEXT, 'readonly', (s) => s.get(id)); return rec?.pages ?? null; } catch { return null; }
};

export const allText = async (): Promise<readonly FileText[]> => {
  if (noStore()) return [];
  try { return await withStore<FileText[]>(TEXT, 'readonly', (s) => s.getAll()); } catch { return []; }
};

export const deleteText = async (id: FileId): Promise<void> => {
  if (noStore() || !readerWritesAllowed()) return;
  try { await withStore(TEXT, 'readwrite', (s) => s.delete(id)); } catch { /* nothing to remove */ }
};

export const exportBlobs = async (): Promise<readonly FileBlob[]> => {
  if (noStore()) return [];
  try { return await withStore<FileBlob[]>(BLOBS, 'readonly', (s) => s.getAll()); } catch { return []; }
};

export const waitForFileWrites = (): Promise<void> => (pendingWrites === 0 ? Promise.resolve() : new Promise((resolve) => idleWaiters.add(resolve)));

/* Backup restore owns the whole reader profile, so its list replaces this
   store outright, the way the asset store is replaced. The text store goes
   with it: the pages are derived from the blobs and are put back beside them. */
export const replaceBlobs = async (blobs: readonly FileBlob[], texts: readonly FileText[] = []): Promise<void> => {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([BLOBS, TEXT], 'readwrite');
    const blobStore = tx.objectStore(BLOBS); const textStore = tx.objectStore(TEXT);
    blobStore.clear(); blobs.forEach((b) => blobStore.put(b));
    textStore.clear(); texts.forEach((t) => textStore.put(t));
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error('IndexedDB refused the restore')); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error('IndexedDB aborted the restore')); };
  });
};

/* ── base64, which is how a blob travels in a backup ─────────────────────── */

export const base64Of = async (blob: Blob): Promise<string> => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  /* In chunks: one apply over a megabyte of arguments overflows the stack. */
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
};

export const blobOfBase64 = (base64: string, mime: string): Blob => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
};
