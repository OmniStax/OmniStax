/* Where the chats themselves live. A conversation with a model grows far too
   heavy for the storage the layout and the notes share, so each chat is one
   record of an IndexedDB of its own; localStorage keeps only the index — the
   id, the name and the two times — which is all the picker, the search and a
   `[[chat:…]]` link need to name one without reading it.

   The shape follows notes/assets.ts, which keeps the reader's pasted images
   the same way, so that a backup restore has one story for both. */
import { readerWritesAllowed } from '../backup/guard';
import type { ChatId } from '../types/ids';
import type { Chat } from './model';

const DB = 'omnistax-chats';
const STORE = 'chats';
const VERSION = 1;

const noStore = (): boolean => typeof indexedDB === 'undefined';

const open = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  if (noStore()) { reject(new Error('no IndexedDB in this environment')); return; }
  const req = indexedDB.open(DB, VERSION);
  req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' }); };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error ?? new Error('IndexedDB refused to open'));
});

const withStore = async <T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = f(tx.objectStore(STORE));
    let result: T;
    req.onsuccess = () => { result = req.result; };
    tx.oncomplete = () => { db.close(); resolve(result); };
    tx.onerror = () => { db.close(); reject(tx.error ?? req.error ?? new Error('IndexedDB refused the request')); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error('The chat transaction was interrupted')); };
  });
};

export const getChat = async (id: ChatId): Promise<Chat | null> => {
  if (noStore()) return null;
  try { return (await withStore<Chat | undefined>('readonly', (s) => s.get(id))) ?? null; } catch { return null; }
};

export const putChat = async (chat: Chat): Promise<void> => {
  if (noStore() || !readerWritesAllowed()) return;
  /* A reactive proxy cannot be structured-cloned, so what goes in is plain. */
  try { await withStore('readwrite', (s) => s.put(JSON.parse(JSON.stringify(chat)) as Chat)); } catch { /* private mode */ }
};

export const deleteChat = async (id: ChatId): Promise<void> => {
  if (noStore() || !readerWritesAllowed()) return;
  try { await withStore('readwrite', (s) => s.delete(id)); } catch { /* nothing to remove */ }
};

export const exportChats = async (): Promise<readonly Chat[]> => {
  if (noStore()) return [];
  try { return await withStore<Chat[]>('readonly', (s) => s.getAll()); } catch { return []; }
};

/* A restore owns the whole profile, so its chats replace this store entirely,
   as the assets do. */
export const replaceChats = async (chats: readonly Chat[]): Promise<void> => {
  if (noStore()) return;
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite'); const store = tx.objectStore(STORE);
    store.clear(); chats.forEach((c) => store.put(c));
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error('IndexedDB refused the restore')); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error('IndexedDB aborted the restore')); };
  });
};
