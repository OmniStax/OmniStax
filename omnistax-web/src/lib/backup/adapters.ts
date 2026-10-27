import { assetId, exportAssets } from '../notes/assets';
import { exportChats, replaceChats } from '../chat/db';
import { AI_KEY, parseAi, withoutKeys } from '../chat/settings';
import type { Chat } from '../chat/model';
import { exportDrawings, exportScratch, replaceDrawings, replaceScratch } from '../drawer/db';
import type { Drawing } from '../drawer/model';
import { base64Of, blobOfBase64, exportBlobs, replaceBlobs } from '../files/blobs';
import { FILES_KEY, parseFiles } from '../files/model';
import type { FileId } from '../types/ids';
import { BACKUP_FORMAT, BACKUP_VERSION, MAX_BACKUP_BYTES, MAX_BACKUP_LABEL, categoryOf, parseBackupText, staysOnDevice, type BackupFile, type ParsedBackup, type ReaderBackup, type ReaderRecord, type SkippedRecord } from './schema';
import { restoreWithJournal } from './journal';
import { t } from '../i18n/index';
import { exportGenerated, replaceGenerated } from '../practice/generated-db';
import type { GeneratedExercise } from '../practice/generated';

/* The AI block goes into a backup with the reader's models and endpoints and
   without the keys they pasted: a backup travels between machines and is sent
   to other people for help, and a key that could be spent travels with it. A
   record that cannot even be read is left out altogether. */
const stripKeys = (value: string): string | null => {
  try { return JSON.stringify(withoutKeys(parseAi(JSON.parse(value)))); } catch { return null; }
};

export const readerRecords = (): ReaderRecord[] => {
  const out: ReaderRecord[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i); if (!key) continue;
    const category = categoryOf(key); const raw = localStorage.getItem(key);
    if (!category || raw === null) continue;
    const value = key === AI_KEY ? stripKeys(raw) : raw;
    if (value !== null) out.push({ key, value, category });
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
};

const booksOf = (records: readonly ReaderRecord[]): { id: string }[] => {
  const ids = new Set<string>();
  records.forEach(({ key }) => {
    const match = /^omnistax-(?:notes|colours|highlights)-(.+)$/.exec(key); if (match?.[1]) ids.add(match[1]);
  });
  return [...ids].sort().map((id) => ({ id }));
};

/* The imported files' bytes, base64 and paired with what the file list says
   they are: the blob store knows the bytes and the record knows the kind, and
   a backup carries both so that a restore can put the record back beside them.
   A blob whose record has gone is left behind — it is an orphan the next boot
   would sweep anyway. */
const filesOf = async (records: readonly ReaderRecord[]): Promise<BackupFile[]> => {
  const listed = records.find((r) => r.key === FILES_KEY);
  if (!listed) return [];
  const known = new Map(parseFiles(JSON.parse(listed.value)).map((f) => [f.id as string, f] as const));
  const blobs = (await exportBlobs()).filter((b) => known.has(b.id));
  return Promise.all(blobs.map(async (b) => {
    const doc = known.get(b.id);
    return { id: b.id as string, type: doc?.type ?? 'image', mime: doc?.mime || b.blob.type || 'application/octet-stream', base64: await base64Of(b.blob), created: b.created };
  }));
};

export const createBackup = async (): Promise<ReaderBackup> => {
  const records = readerRecords();
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), app: { readerFormat: 1 }, records, assets: await exportAssets(), chats: [...await exportChats()] as unknown as ReaderBackup['chats'], files: await filesOf(records), drawings: await exportDrawings() as unknown as ReaderBackup['drawings'], scratch: await exportScratch() as unknown as ReaderBackup['scratch'], generated: [...await exportGenerated()] as unknown as ReaderBackup['generated'], books: booksOf(records) };
};

export const downloadBackup = async (): Promise<void> => {
  const backup = await createBackup();
  const text = `${JSON.stringify(backup, null, 2)}\n`;
  const blob = new Blob([text], { type: 'application/json' });
  if (blob.size > MAX_BACKUP_BYTES) throw new Error(t('shell.backup.exportTooLarge', { limit: MAX_BACKUP_LABEL }));
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: `omnistax-reader-${backup.exportedAt.slice(0, 10)}.json` });
  a.click(); URL.revokeObjectURL(url);
};

export const readBackupFile = async (file: File): Promise<ParsedBackup> => {
  if (file.size > MAX_BACKUP_BYTES) throw new Error(t('shell.backup.importTooLarge', { limit: MAX_BACKUP_LABEL }));
  return parseBackupText(await file.text());
};

/* This device's own value for each record the backup carried but this
   version could not read: a restore replaces every record, so what is kept
   must be written back with the rest or it would go. */
export const keptRecords = (skipped: readonly SkippedRecord[], read: (key: string) => string | null = (key) => localStorage.getItem(key)): ReaderRecord[] =>
  skipped.flatMap(({ key }) => {
    const category = categoryOf(key), value = category ? read(key) : null;
    return category && value !== null ? [{ key, value, category }] : [];
  });

/* The records a restore writes: the backup's, with this device's own value in
   place of each one it set aside and, when the profile came from a sync, of
   the workspace, which a sync never carries: a pull leaves this device's tabs
   and splits as they are. `keys` are the keys this device holds. */
export const recordsToRestore = (backup: { readonly records: readonly ReaderRecord[]; readonly skipped?: readonly SkippedRecord[] }, keepWorkspace: boolean, keys: readonly string[], read: (key: string) => string | null): ReaderRecord[] => {
  const own = keepWorkspace ? keys.filter(staysOnDevice).map((key) => ({ key, why: '' })) : [];
  const kept = keptRecords([...(backup.skipped ?? []), ...own], read);
  return [...backup.records.filter((r) => !kept.some((k) => k.key === r.key) && !(keepWorkspace && staysOnDevice(r.key))), ...kept];
};

const storedKeys = (): string[] => Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).filter((k): k is string => k !== null);

export const importBackup = async (backup: ReaderBackup & { readonly skipped?: readonly SkippedRecord[] }, opts: { readonly keepWorkspace?: boolean } = {}): Promise<void> => {
  const records = recordsToRestore(backup, opts.keepWorkspace === true, storedKeys(), (key) => localStorage.getItem(key));
  await restoreWithJournal(records, backup.assets.map((asset) => ({ ...asset, id: assetId(asset.id) })));
  /* The chats follow the journalled records rather than standing in them: the
     index they are listed under has already been restored, so a chat that
     cannot be written leaves a row whose record is gone, which a tab opens
     empty rather than breaking on. */
  await replaceChats(backup.chats as unknown as readonly Chat[]);
  /* The files follow the same way. The text pulled out of a PDF is not in the
     backup — it is derived from these very bytes — so the store is replaced
     with none, and the search extracts what it needs the first time it looks. */
  await replaceBlobs(backup.files.map((f) => ({ id: f.id as FileId, blob: blobOfBase64(f.base64, f.mime), created: f.created })));
  /* The ink of the drawings and the scratch pages, on the same footing: the
     rows and the scratch index are journalled records and are already back, so
     these two only have to put the pages under them. */
  await replaceDrawings(backup.drawings as unknown as readonly Drawing[]);
  await replaceScratch(backup.scratch.map((s) => ({ key: s.key, drawing: s.drawing as unknown as Drawing })));
  await replaceGenerated(backup.generated as unknown as readonly GeneratedExercise[]);
};
