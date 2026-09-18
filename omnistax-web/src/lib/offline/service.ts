import { BookReleaseManifestSchema, OfflineCatalogSchema, type BookReleaseManifest, type OfflineCatalog, type OfflineResource } from './schema';
import { cacheName, deleteInstallation, getInstallation, listInstallations, putInstallation, type InstallationRecord } from './storage';
import { releaseChanges, type ReleaseChanges } from './model';

export type InstallProgress = { readonly files: number; readonly totalFiles: number; readonly bytes: number; readonly totalBytes: number };
export type InstallOptions = { readonly signal?: AbortSignal; readonly progress?: (progress: InstallProgress) => void };
const localLocks = new Map<string, Promise<unknown>>();

const lock = async <T>(bookId: string, operation: () => Promise<T>): Promise<T> => {
  if (navigator.locks) return navigator.locks.request(`omnistax-install:${bookId}`, { mode: 'exclusive' }, operation);
  const before = localLocks.get(bookId) ?? Promise.resolve();
  const running = before.catch(() => undefined).then(operation); localLocks.set(bookId, running);
  try { return await running; } finally { if (localLocks.get(bookId) === running) localLocks.delete(bookId); }
};
const digest = async (body: ArrayBuffer): Promise<string> => [...new Uint8Array(await crypto.subtle.digest('SHA-256', body))].map((byte) => byte.toString(16).padStart(2, '0')).join('');
const verified = async (resource: OfflineResource, response: Response): Promise<Response> => {
  if (!response.ok) throw new Error(`${resource.logicalUrl} returned ${response.status}.`);
  const body = await response.arrayBuffer();
  if (body.byteLength !== resource.bytes || await digest(body) !== resource.sha256) throw new Error(`${resource.logicalUrl} failed integrity verification.`);
  return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers });
};
const fetchManifest = async (url: string, signal?: AbortSignal): Promise<BookReleaseManifest> => {
  const response = await fetch(url, { cache: 'no-store', signal });
  if (!response.ok) throw new Error(`Release manifest returned ${response.status}.`);
  const parsed = BookReleaseManifestSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error('The release manifest is invalid.');
  return parsed.data;
};
export const fetchCatalog = async (signal?: AbortSignal): Promise<OfflineCatalog> => {
  const response = await fetch('/offline-catalog.json', { cache: 'no-store', signal });
  if (!response.ok) throw new Error(`Update catalogue returned ${response.status}.`);
  const parsed = OfflineCatalogSchema.safeParse(await response.json());
  if (!parsed.success) throw new Error('The update catalogue is invalid.');
  return parsed.data;
};

const enoughSpace = async (bytes: number): Promise<void> => {
  const estimate = await navigator.storage?.estimate?.().catch(() => undefined);
  if (estimate?.quota !== undefined && estimate.usage !== undefined && estimate.quota - estimate.usage < bytes) throw new Error('The browser reports too little storage for this download.');
};

export const installRelease = async (manifest: BookReleaseManifest, options: InstallOptions = {}): Promise<InstallationRecord> => lock(manifest.book.id, async () => {
  if (!('caches' in globalThis) || typeof indexedDB === 'undefined') throw new Error('This browser does not support offline textbook storage.');
  await enoughSpace(manifest.totalBytes);
  void navigator.storage?.persist?.().catch(() => false);
  const existing = await getInstallation(manifest.book.id);
  const completed = existing?.stagingRelease === manifest.releaseId && existing.stagingArtifact === manifest.runtime.artifactId ? new Set(existing.completed ?? []) : new Set<string>();
  const cache = await caches.open(cacheName(manifest.book.id, manifest.releaseId, manifest.runtime.artifactId));
  for (const resource of manifest.resources.filter((item) => completed.has(item.logicalUrl))) {
    const saved = await cache.match(new URL(resource.logicalUrl, location.origin));
    try { if (!saved) throw new Error('missing'); await verified(resource, saved); }
    catch { completed.delete(resource.logicalUrl); await cache.delete(new URL(resource.logicalUrl, location.origin)); }
  }
  let bytes = manifest.resources.filter((resource) => completed.has(resource.logicalUrl)).reduce((sum, resource) => sum + resource.bytes, 0);
  const base: InstallationRecord = { ...existing, bookId: manifest.book.id, title: manifest.book.title, status: existing?.installedRelease ? 'ready' : 'downloading', stagingRelease: manifest.releaseId, stagingArtifact: manifest.runtime.artifactId, completed: [...completed], error: undefined, updatedAt: Date.now() };
  await putInstallation(base);
  const pending = manifest.resources.filter((resource) => !completed.has(resource.logicalUrl));
  let cursor = 0; let failure: unknown;
  const worker = async () => {
    while (cursor < pending.length && !failure) {
      const resource = pending[cursor++];
      try {
        options.signal?.throwIfAborted();
        const response = await verified(resource, await fetch(resource.downloadUrl, { cache: 'no-store', signal: options.signal }));
        await cache.put(new Request(new URL(resource.logicalUrl, location.origin)), response);
        completed.add(resource.logicalUrl); bytes += resource.bytes;
        await putInstallation({ ...base, completed: [...completed], updatedAt: Date.now() });
        options.progress?.({ files: completed.size, totalFiles: manifest.resources.length, bytes, totalBytes: manifest.totalBytes });
      } catch (error) { failure = error; }
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, pending.length) }, worker));
  if (failure) {
    const message = failure instanceof DOMException && failure.name === 'AbortError' ? 'Download cancelled.' : failure instanceof Error ? failure.message : 'Download failed.';
    const failed: InstallationRecord = { ...base, status: existing?.installedRelease ? 'ready' : 'failed', completed: [...completed], error: message, updatedAt: Date.now() };
    await putInstallation(failed); throw new Error(message);
  }
  const ready: InstallationRecord = {
    bookId: manifest.book.id, title: manifest.book.title, status: 'ready', installedRelease: manifest.releaseId, installedArtifact: manifest.runtime.artifactId,
    previousRelease: existing?.installedRelease && (existing.installedRelease !== manifest.releaseId || existing.installedArtifact !== manifest.runtime.artifactId) ? existing.installedRelease : existing?.previousRelease,
    previousArtifact: existing?.installedRelease && (existing.installedRelease !== manifest.releaseId || existing.installedArtifact !== manifest.runtime.artifactId) ? (existing.installedArtifact ?? existing.manifest?.runtime.artifactId) : existing?.previousArtifact,
    previousManifest: existing?.installedRelease && (existing.installedRelease !== manifest.releaseId || existing.installedArtifact !== manifest.runtime.artifactId) ? existing.manifest : existing?.previousManifest,
    availableRelease: manifest.releaseId, availableArtifact: manifest.runtime.artifactId, publishedAt: manifest.publishedAt, manifest, lastCheck: existing?.lastCheck, updatedAt: Date.now(),
  };
  await putInstallation(ready); return ready;
});

export const installFromCatalog = async (bookId: string, options?: InstallOptions): Promise<InstallationRecord> => {
  const catalog = await fetchCatalog(options?.signal); const entry = catalog.books.find((book) => book.id === bookId);
  if (!entry) throw new Error('This book is not in the offline catalogue.');
  return installRelease(await fetchManifest(entry.manifestUrl, options?.signal), options);
};

export const inspectInstallation = async (bookId: string): Promise<InstallationRecord | undefined> => {
  const record = await getInstallation(bookId); if (!record?.manifest || !record.installedRelease) return record;
  const artifact = record.installedArtifact ?? record.manifest.runtime.artifactId;
  const cache = await caches.open(cacheName(bookId, record.installedRelease, artifact));
  const presence = await Promise.all(record.manifest.resources.map(async (resource) => ({ logicalUrl: resource.logicalUrl, present: !!await cache.match(resource.logicalUrl) })));
  const missing = presence.filter((item) => !item.present).map((item) => item.logicalUrl);
  if (!missing.length) return record;
  const failed = { ...record, status: 'failed' as const, stagingRelease: record.installedRelease, stagingArtifact: artifact, completed: presence.filter((item) => item.present).map((item) => item.logicalUrl), error: `${missing.length} downloaded resource${missing.length === 1 ? ' is' : 's are'} missing. Repair the download.`, updatedAt: Date.now() };
  await putInstallation(failed); return failed;
};

export const removeDownload = async (bookId: string): Promise<void> => lock(bookId, async () => {
  const record = await getInstallation(bookId); if (!record) return;
  const snapshots = [
    [record.installedRelease, record.installedArtifact ?? record.manifest?.runtime.artifactId],
    [record.previousRelease, record.previousArtifact ?? record.previousManifest?.runtime.artifactId],
    [record.stagingRelease, record.stagingArtifact],
  ] as const;
  for (const [release, artifact] of snapshots) if (release && artifact) await caches.delete(cacheName(bookId, release, artifact));
  await deleteInstallation(bookId);
});

export const checkForUpdates = async (): Promise<{ catalog: OfflineCatalog; records: InstallationRecord[] }> => {
  const catalog = await fetchCatalog(); const records = await listInstallations(); const now = Date.now();
  const updated = await Promise.all(records.map(async (record) => {
    const available = catalog.books.find((book) => book.id === record.bookId);
    const next = { ...record, availableRelease: available?.releaseId ?? record.availableRelease, availableArtifact: available?.artifactId ?? record.availableArtifact, lastCheck: now, updatedAt: now };
    await putInstallation(next); return next;
  }));
  return { catalog, records: updated };
};

export const changesForAvailable = async (bookId: string): Promise<{ readonly changes: ReleaseChanges; readonly notes?: string; readonly publishedAt: string }> => {
  const record = await getInstallation(bookId); if (!record?.manifest) throw new Error('No installed release is available to compare.');
  const catalog = await fetchCatalog(); const entry = catalog.books.find((book) => book.id === bookId);
  if (!entry) throw new Error('This book is not in the update catalogue.');
  const available = await fetchManifest(entry.manifestUrl);
  return { changes: releaseChanges(record.manifest, available), notes: available.releaseNotes, publishedAt: available.publishedAt };
};

export { listInstallations };
