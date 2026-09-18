import { categoryOf, type ReaderRecord } from './schema';
import { exportAssets, replaceAssets, waitForAssetWrites, type Asset } from '../notes/assets';
import { setReaderWritesAllowed, withExclusiveReaderLock } from './guard';

const DB = 'omnistax-reader-restore';
const STORE = 'journal';
const ACTIVE = 'active';
const PENDING = 'omnistax-restore-pending';
type Journal = { readonly id: typeof ACTIVE; readonly state: 'prepared' | 'applied'; readonly before: readonly ReaderRecord[]; readonly after: readonly ReaderRecord[]; readonly beforeAssets: readonly Asset[]; readonly afterAssets: readonly Asset[] };

const open = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB, 1);
  request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' }); };
  request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
});
const request = <T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> => open().then((db) => new Promise((resolve, reject) => {
  const tx = db.transaction(STORE, mode); const req = operation(tx.objectStore(STORE)); let result: T;
  req.onsuccess = () => { result = req.result; }; req.onerror = () => { /* transaction handlers reject */ };
  tx.oncomplete = () => { db.close(); resolve(result); };
  tx.onerror = () => { db.close(); reject(tx.error ?? req.error ?? new Error('restore journal failed')); };
  tx.onabort = () => { db.close(); reject(tx.error ?? new Error('restore journal aborted')); };
}));
const getJournal = (): Promise<Journal | undefined> => request('readonly', (store) => store.get(ACTIVE));
const putJournal = (journal: Journal): Promise<IDBValidKey> => request('readwrite', (store) => store.put(journal));
const clearJournal = (): Promise<undefined> => request('readwrite', (store) => store.delete(ACTIVE));

const snapshot = (): ReaderRecord[] => {
  const records: ReaderRecord[] = [];
  for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (!key) continue; const category = categoryOf(key); const value = localStorage.getItem(key); if (category && value !== null) records.push({ key, value, category }); }
  return records;
};
const apply = (records: readonly ReaderRecord[]): void => {
  const target = new Set(records.map((r) => r.key));
  const remove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key && categoryOf(key) && !target.has(key)) remove.push(key); }
  remove.forEach((key) => localStorage.removeItem(key));
  records.forEach(({ key, value }) => localStorage.setItem(key, value));
};

export const hasInterruptedRestore = async (): Promise<boolean> => {
  if (typeof indexedDB === 'undefined') return false;
  try { return (await getJournal()) !== undefined; }
  catch (error) {
    /* A browser with unavailable IndexedDB may still read normally when no
       restore was underway. The local marker distinguishes that from a journal
       we must not ignore merely because its database cannot currently open. */
    if (localStorage.getItem(PENDING) === null) return false;
    throw error;
  }
};

export const recoverInterruptedRestore = async (): Promise<void> => {
  if (typeof indexedDB === 'undefined' || typeof localStorage === 'undefined') return;
  await withExclusiveReaderLock(async () => {
    /* Re-read under the exclusive lock. A restore may have committed or
       created the journal while this tab was waiting to enter. */
    const journal = await getJournal(); if (!journal) return;
    apply(journal.state === 'applied' ? journal.after : journal.before);
    await replaceAssets(journal.state === 'applied' ? journal.afterAssets : journal.beforeAssets);
    await clearJournal();
    localStorage.removeItem(PENDING);
  }, false);
};

export const restoreWithJournal = async (after: readonly ReaderRecord[], afterAssets: readonly Asset[]): Promise<void> => {
  if (typeof indexedDB === 'undefined') throw new Error('This browser cannot provide safe transactional restore because IndexedDB is unavailable.');
  /* A pasted image whose transaction started before the button press must be
     represented in the before snapshot rather than arriving during restore. */
  setReaderWritesAllowed(false);
  await waitForAssetWrites();
  await withExclusiveReaderLock(async () => {
    let journal: Journal | null = null;
    try {
      localStorage.setItem(PENDING, new Date().toISOString());
      journal = { id: ACTIVE, state: 'prepared', before: snapshot(), after, beforeAssets: await exportAssets(), afterAssets };
      await putJournal(journal);
      apply(after);
      await replaceAssets(afterAssets);
      await putJournal({ ...journal, state: 'applied' });
      await clearJournal();
      localStorage.removeItem(PENDING);
    } catch (error) {
      if (journal) {
        apply(journal.before);
        try { await replaceAssets(journal.beforeAssets); await clearJournal(); localStorage.removeItem(PENDING); } catch { /* Leave the marker and journal for startup recovery. */ }
      }
      throw error;
    }
  }, true);
};
