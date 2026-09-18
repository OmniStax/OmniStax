import type { BookReleaseManifest } from './schema';

export type InstallStatus = 'downloading' | 'failed' | 'ready';
export type InstallationRecord = {
  readonly bookId: string; readonly title: string; readonly status: InstallStatus;
  readonly installedRelease?: string; readonly installedArtifact?: string;
  readonly previousRelease?: string; readonly previousArtifact?: string;
  readonly availableRelease?: string; readonly availableArtifact?: string; readonly publishedAt?: string;
  readonly manifest?: BookReleaseManifest; readonly previousManifest?: BookReleaseManifest;
  readonly stagingRelease?: string; readonly stagingArtifact?: string; readonly completed?: readonly string[];
  readonly error?: string; readonly lastCheck?: number; readonly updatedAt: number;
};

const DB = 'omnistax-offline'; const STORE = 'installations'; const VERSION = 2;
const open = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB, VERSION);
  request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'bookId' }); if (!request.result.objectStoreNames.contains('clientPins')) request.result.createObjectStore('clientPins', { keyPath: 'clientId' }); };
  request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error ?? new Error('Offline storage could not be opened.'));
});
const transaction = <T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> => open().then((db) => new Promise((resolve, reject) => {
  const tx = db.transaction(STORE, mode); const request = operation(tx.objectStore(STORE)); let result: T;
  request.onsuccess = () => { result = request.result; };
  tx.oncomplete = () => { db.close(); resolve(result); };
  tx.onerror = () => { db.close(); reject(tx.error ?? request.error ?? new Error('Offline storage failed.')); };
  tx.onabort = () => { db.close(); reject(tx.error ?? new Error('Offline storage was interrupted.')); };
}));

export const listInstallations = async (): Promise<InstallationRecord[]> => typeof indexedDB === 'undefined' ? [] : transaction('readonly', (store) => store.getAll());
export const getInstallation = async (bookId: string): Promise<InstallationRecord | undefined> => typeof indexedDB === 'undefined' ? undefined : transaction('readonly', (store) => store.get(bookId));
export const putInstallation = (record: InstallationRecord): Promise<IDBValidKey> => transaction('readwrite', (store) => store.put(record));
export const deleteInstallation = (bookId: string): Promise<undefined> => transaction('readwrite', (store) => store.delete(bookId));

export const cacheName = (bookId: string, releaseId: string, artifactId: string): string => `omnistax-book:${bookId}:${releaseId}:${artifactId}`;
