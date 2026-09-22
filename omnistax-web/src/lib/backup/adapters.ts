import { assetId, exportAssets } from '../notes/assets';
import { exportChats, replaceChats } from '../chat/db';
import { AI_KEY, parseAi, withoutKeys } from '../chat/settings';
import type { Chat } from '../chat/model';
import { exportDrawings, exportScratch, replaceDrawings, replaceScratch } from '../drawer/db';
import type { Drawing } from '../drawer/model';
import { base64Of, blobOfBase64, exportBlobs, replaceBlobs } from '../files/blobs';
import { FILES_KEY, parseFiles } from '../files/model';
import type { FileId } from '../types/ids';
import { BACKUP_FORMAT, BACKUP_VERSION, MAX_BACKUP_BYTES, MAX_BACKUP_LABEL, categoryOf, parseBackupText, type BackupFile, type ReaderBackup, type ReaderRecord } from './schema';
import { restoreWithJournal } from './journal';

/* The AI block goes into a backup with the reader's provider and model and
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
    const match = /^omnistax-(?:notes|colours)-(.+)$/.exec(key); if (match?.[1]) ids.add(match[1]);
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
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), app: { readerFormat: 1 }, records, assets: await exportAssets(), chats: [...await exportChats()] as unknown as ReaderBackup['chats'], files: await filesOf(records), drawings: await exportDrawings() as unknown as ReaderBackup['drawings'], scratch: await exportScratch() as unknown as ReaderBackup['scratch'], books: booksOf(records) };
};

/* What the export will weigh, for the line the Storage block shows before the
   reader asks for it. The JSON is built once and measured, which is the only
   honest answer: base64 and the indentation are most of the size. */
export const backupSize = async (): Promise<number> => new Blob([`${JSON.stringify(await createBackup(), null, 2)}\n`]).size;

export const downloadBackup = async (): Promise<void> => {
  const backup = await createBackup();
  const text = `${JSON.stringify(backup, null, 2)}\n`;
  const blob = new Blob([text], { type: 'application/json' });
  if (blob.size > MAX_BACKUP_BYTES) throw new Error(`This profile is larger than the ${MAX_BACKUP_LABEL} backup limit. Remove large imported files or pasted note images and try again.`);
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: `omnistax-reader-${backup.exportedAt.slice(0, 10)}.json` });
  a.click(); URL.revokeObjectURL(url);
};

export const readBackupFile = async (file: File): Promise<ReaderBackup> => {
  if (file.size > MAX_BACKUP_BYTES) throw new Error(`This backup exceeds the ${MAX_BACKUP_LABEL} import limit.`);
  return parseBackupText(await file.text());
};

export const importBackup = async (backup: ReaderBackup): Promise<void> => {
  await restoreWithJournal(backup.records, backup.assets.map((asset) => ({ ...asset, id: assetId(asset.id) })));
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
};
