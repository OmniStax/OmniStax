import { changesForAvailable, checkForUpdates, inspectInstallation, installFromCatalog, listInstallations, reclaimPreviousRelease, removeDownload, type InstallProgress } from './service';
import { currentWorkerPin } from './register';
import type { InstallationRecord } from './storage';
import type { OfflineCatalog } from './schema';
import type { ReleaseChanges } from './model';
import { releaseChanges, releaseForBook } from './model';
import { readerWritesAllowed } from '../backup/guard';
import { SvelteMap } from 'svelte/reactivity';

const SEEN = 'omnistax-seen-releases-v1';
type Seen = Readonly<Record<string, Readonly<Record<string, string>>>>;
const readSeen = (): Seen => { try { const raw: unknown = JSON.parse(localStorage.getItem(SEEN) ?? '{}'); return typeof raw === 'object' && raw !== null ? raw as Seen : {}; } catch { return {}; } };

class OfflineBooks {
  records = $state.raw<Readonly<Record<string, InstallationRecord>>>({});
  progress = $state.raw<Readonly<Record<string, InstallProgress>>>({});
  checking = $state(false); message = $state('');
  lastCheck = $state<number | null>(null);
  catalog = $state.raw<OfflineCatalog | null>(null);
  changes = $state.raw<Readonly<Record<string, { changes: ReleaseChanges; notes?: string; publishedAt: string }>>>({});
  updatedSections = $state.raw<Readonly<Record<string, readonly string[]>>>({});
  clientReleases = $state.raw<Readonly<Record<string, string>>>({});
  private abort = new SvelteMap<string, AbortController>();
  private inFlight: Promise<void> | null = null;
  async init(): Promise<void> {
    const saved = await listInstallations();
    const inspected = await Promise.all(saved.map(async (record) => await inspectInstallation(record.bookId) ?? record));
    this.records = Object.fromEntries(inspected.map((record) => [record.bookId, record]));
    const seen = readSeen();
    this.updatedSections = Object.fromEntries(inspected.map((record) => {
      if (!record.manifest || !record.previousManifest || !record.installedRelease) return [record.bookId, []];
      const changed = releaseChanges(record.previousManifest, record.manifest).sections;
      return [record.bookId, [...changed.added, ...changed.changed].filter((section) => seen[record.bookId]?.[section] !== record.installedRelease)];
    }));
    const last = Math.max(0, ...Object.values(this.records).map((record) => record.lastCheck ?? 0));
    if (navigator.onLine && Date.now() - last > 24 * 60 * 60 * 1000) void this.check();
  }
  async refreshClientPin(): Promise<void> {
    const pin = await currentWorkerPin();
    this.clientReleases = pin ? { [pin.bookId]: pin.release } : {};
  }
  async reclaim(): Promise<void> {
    const records = await Promise.all(Object.keys(this.records).map((bookId) => reclaimPreviousRelease(bookId)));
    this.records = { ...this.records, ...Object.fromEntries(records.filter((record): record is InstallationRecord => !!record).map((record) => [record.bookId, record])) };
  }
  async check(): Promise<void> {
    if (this.inFlight) return this.inFlight;
    this.checking = true; this.message = '';
    this.inFlight = checkForUpdates().then(({ records, catalog }) => { this.catalog = catalog; this.lastCheck = Date.now(); this.records = Object.fromEntries(records.map((record) => [record.bookId, record])); })
      .catch((error) => { this.message = error instanceof Error ? error.message : 'Update check failed.'; })
      .finally(() => { this.checking = false; this.inFlight = null; });
    return this.inFlight;
  }
  async install(bookId: string): Promise<void> {
    if (this.abort.has(bookId)) return;
    const controller = new AbortController(); this.abort.set(bookId, controller); this.message = '';
    try {
      const record = await installFromCatalog(bookId, { signal: controller.signal, progress: (value) => { this.progress = { ...this.progress, [bookId]: value }; } });
      this.records = { ...this.records, [bookId]: record };
    } catch (error) {
      const records = await listInstallations(); this.records = Object.fromEntries(records.map((record) => [record.bookId, record]));
      this.message = error instanceof Error ? error.message : 'Download failed.';
    } finally { this.abort.delete(bookId); this.progress = Object.fromEntries(Object.entries(this.progress).filter(([id]) => id !== bookId)); }
  }
  cancel(bookId: string): void { this.abort.get(bookId)?.abort(); }
  async remove(bookId: string): Promise<void> {
    try { await removeDownload(bookId); this.records = Object.fromEntries(Object.entries(this.records).filter(([id]) => id !== bookId)); }
    catch (error) { this.message = error instanceof Error ? error.message : 'The offline download could not be removed.'; }
  }
  downloading(bookId: string): boolean { return this.abort.has(bookId); }
  releaseOf(bookId: string): string | undefined {
    return releaseForBook(bookId, this.clientReleases, Object.fromEntries(Object.entries(this.records).map(([id, record]) => [id, record.installedRelease])), Object.fromEntries((this.catalog?.books ?? []).map((book) => [book.id, book.releaseId])));
  }
  async loadChanges(bookId: string): Promise<void> {
    try { this.changes = { ...this.changes, [bookId]: await changesForAvailable(bookId) }; }
    catch (error) { this.message = error instanceof Error ? error.message : 'Changes could not be loaded.'; }
  }
  markSeen(bookId: string, section: string): void {
    const release = this.records[bookId]?.installedRelease; if (!release) return;
    const seen = readSeen(); const next = { ...seen, [bookId]: { ...seen[bookId], [section]: release } };
    if (readerWritesAllowed()) try { localStorage.setItem(SEEN, JSON.stringify(next)); } catch { /* private mode */ }
    this.updatedSections = { ...this.updatedSections, [bookId]: (this.updatedSections[bookId] ?? []).filter((id) => id !== section) };
  }
}
export const offlineBooks = new OfflineBooks();
