/* What the reader has written into a code exercise, kept in this browser per
   book, section, exercise and language, so a card opened again opens on their
   own code. A draft equal to the starter is no draft and is let go. One record
   holds them all; a backup and a sync carry it with the practice records. */
import { readerWritesAllowed } from '../backup/guard';
import type { Lang } from './types';

export const DRAFTS_KEY = 'omnistax-code-drafts';
export type DraftAt = { readonly book: string; readonly section: string; readonly ex: string; readonly lang: Lang };
export const draftKey = (at: DraftAt): string => [at.book, at.section, at.ex, at.lang].join('|');

type Drafts = Readonly<Record<string, string>>;
const read = (): Drafts => {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(DRAFTS_KEY) ?? '{}');
    return v !== null && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).filter(([, s]) => typeof s === 'string')) as Drafts : {};
  } catch { return {}; }
};

/* The drafts with one written, or let go where it is the starter again. Pure. */
export const withDraft = (drafts: Drafts, key: string, code: string, starter: string): Drafts => {
  const { [key]: _, ...rest } = drafts;
  return code === starter ? rest : { ...rest, [key]: code };
};

export const loadDraft = (at: DraftAt, starter: string): string => (typeof localStorage === 'undefined' ? starter : read()[draftKey(at)] ?? starter);
export const saveDraft = (at: DraftAt, code: string, starter: string): void => {
  if (typeof localStorage === 'undefined' || !readerWritesAllowed()) return;
  try { localStorage.setItem(DRAFTS_KEY, JSON.stringify(withDraft(read(), draftKey(at), code, starter))); } catch { /* private mode */ }
};
