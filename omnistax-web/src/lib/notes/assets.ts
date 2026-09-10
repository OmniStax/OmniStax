/* The images a reader pastes or drops into a note. They are far too heavy for
   the storage the notes themselves use, so each one is read as a data URL and
   kept in an IndexedDB of its own; the markdown carries only "asset:<id>",
   which the note view resolves through here. */

export type AssetId = string & { readonly __brand: 'AssetId' };
export const assetId = (s: string): AssetId => s as AssetId;
const newAssetId = (): AssetId => { let s = ''; while (s.length < 12) s += Math.random().toString(36).slice(2); return assetId(s.slice(0, 12)); };

export type Asset = { readonly id: AssetId; readonly type: string; readonly dataUrl: string; readonly created: number };

const DB = 'omnistax-assets';
const STORE = 'assets';
const VERSION = 1;

const noStore = (): boolean => typeof indexedDB === 'undefined';

const open = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  if (noStore()) { reject(new Error('no IndexedDB in this environment')); return; }
  const req = indexedDB.open(DB, VERSION);
  req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' }); };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error ?? new Error('IndexedDB refused to open'));
});

/* One transaction, closed behind itself, wrapped in a promise. */
const withStore = async <T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = f(tx.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB refused the request'));
    tx.oncomplete = () => db.close();
  });
};

const dataUrlOf = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  if (typeof FileReader === 'undefined') { reject(new Error('no FileReader in this environment')); return; }
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error ?? new Error('the file could not be read'));
  reader.readAsDataURL(blob);
});

export const putAsset = async (file: File | Blob): Promise<AssetId> => {
  const asset: Asset = { id: newAssetId(), type: file.type || 'application/octet-stream', dataUrl: await dataUrlOf(file), created: Date.now() };
  await withStore('readwrite', (s) => s.put(asset));
  return asset.id;
};

/* A missing asset is not an error: the note simply shows a broken image. */
export const getAsset = async (id: AssetId): Promise<string | null> => {
  if (noStore()) return null;
  try { const a = await withStore<Asset | undefined>('readonly', (s) => s.get(id)); return a?.dataUrl ?? null; } catch { return null; }
};

export const deleteAsset = async (id: AssetId): Promise<void> => {
  if (noStore()) return;
  try { await withStore('readwrite', (s) => s.delete(id)); } catch { /* nothing to remove */ }
};
