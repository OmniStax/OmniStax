import { bookUpdate, changesForAvailable, checkForUpdates, fetchManifest, inspectInstallation, installFromCatalog, listInstallations, reclaimPreviousRelease, removeDownload, type BookUpdate, type InstallProgress } from './service';
import { currentWorkerPin } from './register';
import type { InstallationRecord } from './storage';
import type { BookReleaseManifest, OfflineCatalog } from './schema';
import type { ReleaseChanges, SeenRelease } from './model';
import { bookMarks, releaseForBook } from './model';
import { readerWritesAllowed } from '../backup/guard';
import { t } from '../i18n/index';
import { SvelteMap } from 'svelte/reactivity';

const SEEN = 'omnistax-seen-releases-v2', AUTO = 'omnistax-auto-update-v1';
const readJson = <T extends object>(key: string): T => { try { const raw: unknown = JSON.parse(localStorage.getItem(key) ?? '{}'); return (typeof raw === 'object' && raw !== null ? raw : {}) as T; } catch { return {} as T; } };
const writeJson = (key: string, value: unknown): void => { if (readerWritesAllowed()) try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ } };
const artifactOf = (record: InstallationRecord | undefined): string | undefined => record?.installedArtifact ?? record?.manifest?.runtime.artifactId;
const CHECK_EVERY_MS = 10 * 60 * 1000;

class OfflineBooks {
  records = $state.raw<Readonly<Record<string, InstallationRecord>>>({});
  progress = $state.raw<Readonly<Record<string, InstallProgress>>>({});
  checking = $state(false); message = $state('');
  lastCheck = $state<number | null>(null);
  catalog = $state.raw<OfflineCatalog | null>(null);
  changes = $state.raw<Readonly<Record<string, { changes: ReleaseChanges; notes?: string; publishedAt: string }>>>({});
  seen = $state.raw<Readonly<Record<string, SeenRelease>>>(readJson(SEEN));
  auto = $state.raw<Readonly<Record<string, boolean>>>(readJson(AUTO));
  clientReleases = $state.raw<Readonly<Record<string, string>>>({});
  appUpdated = $state(false);
  /* The app this page runs: its snapshot's when the worker answered from one, else the first catalog's. */
  private knownArtifact: string | undefined;
  /* The downloaded book this page was answered from, whose install alone changes its app. */
  private pinnedBook: string | undefined;
  private tracked: readonly string[] = [];
  private recording = new Set<string>();
  private abort = new SvelteMap<string, AbortController>();
  private inFlight: Promise<void> | null = null;
  async init(): Promise<void> {
    const saved = await listInstallations();
    const inspected = await Promise.all(saved.map(async (record) => await inspectInstallation(record.bookId) ?? record));
    this.records = Object.fromEntries(inspected.map((record) => [record.bookId, record]));
    void this.recordSeen();
    this.refresh();
    addEventListener('focus', this.refresh); addEventListener('online', this.refresh);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') this.refresh(); });
  }
  private refresh = (): void => { if (navigator.onLine && (this.lastCheck === null || Date.now() - this.lastCheck > CHECK_EVERY_MS)) void this.check(); };
  async refreshClientPin(): Promise<void> {
    const pin = await currentWorkerPin();
    this.clientReleases = pin ? { [pin.bookId]: pin.release } : {};
    if (pin?.snapshot === 'fallback' || pin?.snapshot === 'downloaded') this.knownArtifact ??= pin.artifact;
    if (pin?.snapshot === 'downloaded') this.pinnedBook = pin.bookId;
  }
  async reclaim(): Promise<void> {
    const records = await Promise.all(Object.keys(this.records).map((bookId) => reclaimPreviousRelease(bookId)));
    this.records = { ...this.records, ...Object.fromEntries(records.filter((record): record is InstallationRecord => !!record).map((record) => [record.bookId, record])) };
  }
  async check(): Promise<void> {
    if (this.inFlight) return this.inFlight;
    this.checking = true; this.message = '';
    this.inFlight = checkForUpdates().then(({ records, catalog }) => {
      this.catalog = catalog; this.lastCheck = Date.now(); this.records = Object.fromEntries(records.map((record) => [record.bookId, record]));
      this.noteApp();
      for (const record of records) {
        const entry = catalog.books.find((book) => book.id === record.bookId);
        if (this.autoUpdate(record.bookId) && record.installedRelease && entry && (entry.releaseId !== record.installedRelease || entry.artifactId !== artifactOf(record))) void this.install(record.bookId, true);
      }
      void this.recordSeen();
    })
      .catch((error) => { this.message = error instanceof Error ? error.message : t('offline.error.checkFailed'); })
      .finally(() => { this.checking = false; this.inFlight = null; });
    return this.inFlight;
  }
  /* A background install is an update the catalog asked for; one that fails or is refused waits for the next check. */
  async install(bookId: string, background = false): Promise<void> {
    if (this.abort.has(bookId)) return;
    const controller = new AbortController(); this.abort.set(bookId, controller); if (!background) this.message = '';
    try {
      const record = await installFromCatalog(bookId, { signal: controller.signal, progress: (value) => { this.progress = { ...this.progress, [bookId]: value }; } });
      this.records = { ...this.records, [bookId]: record };
      this.noteApp(); void this.recordSeen();
    } catch (error) {
      const records = await listInstallations(); this.records = Object.fromEntries(records.map((record) => [record.bookId, record]));
      if (!background) this.message = error instanceof Error ? error.message : t('offline.error.downloadFailed');
    } finally { this.abort.delete(bookId); this.progress = Object.fromEntries(Object.entries(this.progress).filter(([id]) => id !== bookId)); }
  }
  cancel(bookId: string): void { this.abort.get(bookId)?.abort(); }
  dismissUpdate(): void { this.knownArtifact = this.appArtifact() ?? this.knownArtifact; this.appUpdated = false; }
  async remove(bookId: string): Promise<void> {
    try { await removeDownload(bookId); this.records = Object.fromEntries(Object.entries(this.records).filter(([id]) => id !== bookId)); }
    catch (error) { this.message = error instanceof Error ? error.message : t('offline.error.removeFailed'); }
  }
  downloading(bookId: string): boolean { return this.abort.has(bookId); }
  releaseOf(bookId: string): string | undefined {
    return releaseForBook(bookId, this.clientReleases, Object.fromEntries(Object.entries(this.records).map(([id, record]) => [id, record.installedRelease])), Object.fromEntries((this.catalog?.books ?? []).map((book) => [book.id, book.releaseId])));
  }
  async loadChanges(bookId: string): Promise<void> {
    try { this.changes = { ...this.changes, [bookId]: await changesForAvailable(bookId) }; }
    catch (error) { this.message = error instanceof Error ? error.message : t('offline.error.changesFailed'); }
  }
  /* A page answered from a download runs that download's app; any other runs the catalog's. */
  private appArtifact(): string | undefined {
    const record = this.pinnedBook ? this.records[this.pinnedBook] : undefined;
    return record?.installedRelease ? artifactOf(record) : this.catalog?.artifactId;
  }
  private noteApp(): void {
    const artifact = this.appArtifact();
    if (artifact) { this.knownArtifact ??= artifact; this.appUpdated = artifact !== this.knownArtifact; }
  }
  autoUpdate(bookId: string): boolean { return this.auto[bookId] !== false; }
  setAutoUpdate(bookId: string, on: boolean): void {
    this.auto = { ...this.auto, [bookId]: on }; writeJson(AUTO, this.auto);
    if (on && this.marks(bookId).update) void this.install(bookId, true);
  }
  marks(bookId: string): { readonly updated: boolean; readonly update: boolean } {
    const record = this.records[bookId];
    return bookMarks(this.seen[bookId], record?.installedRelease, this.catalog?.books.find((book) => book.id === bookId)?.releaseId ?? record?.availableRelease);
  }
  /* The rows of the reader's books; each is given a release to compare against the first time it is known. */
  track(bookIds: readonly string[]): void { this.tracked = bookIds; void this.recordSeen(); }
  private async current(bookId: string): Promise<BookReleaseManifest | undefined> {
    const record = this.records[bookId]; if (record?.installedRelease && record.manifest) return record.manifest;
    const entry = this.catalog?.books.find((book) => book.id === bookId); return entry && fetchManifest(entry.manifestUrl);
  }
  private see(manifest: BookReleaseManifest): void {
    this.seen = { ...this.seen, [manifest.book.id]: { release: manifest.releaseId, artifact: manifest.runtime.artifactId, sections: manifest.sections } };
    writeJson(SEEN, this.seen);
  }
  private async recordSeen(): Promise<void> {
    for (const bookId of this.tracked.filter((id) => !this.seen[id] && !this.recording.has(id))) {
      this.recording.add(bookId);
      try { const manifest = await this.current(bookId); if (manifest && !this.seen[bookId]) this.see(manifest); } catch { /* the next check tries again */ }
      finally { this.recording.delete(bookId); }
    }
  }
  /* Opening the changes is seeing them: the mark goes until the next release. */
  async openUpdate(bookId: string): Promise<BookUpdate> {
    const from = this.seen[bookId]; const to = await this.current(bookId);
    if (!from || !to) throw new Error(t('offline.error.noEarlierRelease'));
    this.see(to); return bookUpdate(from, to);
  }
}
export const offlineBooks = new OfflineBooks();
