import { assetId, exportAssets } from '../notes/assets';
import { BACKUP_FORMAT, BACKUP_VERSION, MAX_BACKUP_BYTES, categoryOf, parseBackupText, type ReaderBackup, type ReaderRecord } from './schema';
import { restoreWithJournal } from './journal';

export const readerRecords = (): ReaderRecord[] => {
  const out: ReaderRecord[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i); if (!key) continue;
    const category = categoryOf(key); const value = localStorage.getItem(key);
    if (category && value !== null) out.push({ key, value, category });
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

export const createBackup = async (): Promise<ReaderBackup> => {
  const records = readerRecords();
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), app: { readerFormat: 1 }, records, assets: await exportAssets(), books: booksOf(records) };
};

export const downloadBackup = async (): Promise<void> => {
  const backup = await createBackup();
  const text = `${JSON.stringify(backup, null, 2)}\n`;
  const blob = new Blob([text], { type: 'application/json' });
  if (blob.size > MAX_BACKUP_BYTES) throw new Error('This profile is larger than the 50 MB backup limit. Remove large pasted note images and try again.');
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: `omnistax-reader-${backup.exportedAt.slice(0, 10)}.json` });
  a.click(); URL.revokeObjectURL(url);
};

export const readBackupFile = async (file: File): Promise<ReaderBackup> => {
  if (file.size > MAX_BACKUP_BYTES) throw new Error('This backup exceeds the 50 MB import limit.');
  return parseBackupText(await file.text());
};

export const importBackup = async (backup: ReaderBackup): Promise<void> => {
  await restoreWithJournal(backup.records, backup.assets.map((asset) => ({ ...asset, id: assetId(asset.id) })));
};
