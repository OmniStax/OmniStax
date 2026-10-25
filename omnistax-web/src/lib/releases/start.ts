/* What the app opens as it starts, by the release notes and whether this is
   the reader's first visit (firstvisit.ts). */
import { readerWritesAllowed } from '../backup/guard';
import { firstVisit } from '../firstvisit';
import { aboutItem, itemKey, whatsNewItem, type ItemId } from '../types/ids';
import { startOf, version, type Version } from './version';

export const SEEN_NOTES = 'omnistax-seen-notes-v1';

const readSeen = (): Version | null => {
  try { const v = JSON.parse(localStorage.getItem(SEEN_NOTES) ?? 'null'); return typeof v === 'string' ? version(v) : null; } catch { return null; }
};
const newestNote = async (): Promise<Version | null> => {
  try {
    const r = await fetch('/whatsnew.json'); if (!r.ok) return null;
    const { notes } = await r.json() as { notes?: { version?: string }[] };
    return version(notes?.[0]?.version ?? '');
  } catch { return null; }
};

/* `page` is what the shell opened for the address; `open` opens a tab, or
   brings it forward where it stands. */
export const openAtStart = async (page: ItemId, open: (key: string) => Promise<void>): Promise<void> => {
  const newest = await newestNote();
  const start = startOf(!firstVisit, readSeen(), newest);
  if (newest && start !== 'none' && readerWritesAllowed()) { try { localStorage.setItem(SEEN_NOTES, JSON.stringify(newest)); } catch { /* private mode */ } }
  if (start === 'notes') await open(itemKey(whatsNewItem()));
  if (start === 'fresh' && page.kind !== 'page') { await open(itemKey(aboutItem())); await open(itemKey(page)); }
};
