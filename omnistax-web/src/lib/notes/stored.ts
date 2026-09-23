/* The shape of the reader's notes in this browser: one key per book, each
   holding that book's notes without the book, which the key already says. */
import type { Anchor } from './anchor';
import { bookId, type BookId, type SectionId, type DocKind } from '../types/ids';

export const HL_COLORS = ['yellow', 'green', 'blue', 'pink'] as const;
export type HlColor = (typeof HL_COLORS)[number];
export type Note = {
  readonly id: string; readonly book: BookId; readonly section: SectionId; readonly doc: DocKind; readonly anchor: Anchor;
  readonly color: HlColor; readonly text: string; readonly created: number; readonly updated: number;
};
export type StoredNote = Omit<Note, 'book'>;

const isColor = (c: unknown): c is HlColor => (HL_COLORS as readonly unknown[]).includes(c);
export const parseNotes = (book: BookId, raw: unknown): Note[] => {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((n) => {
    if (typeof n !== 'object' || n === null) return [];
    const o = n as Record<string, unknown>; const a = o.anchor as Record<string, unknown> | undefined;
    if (typeof o.id !== 'string' || typeof o.section !== 'string' || !a || typeof a.quote !== 'string') return [];
    return [{ id: o.id, book, section: o.section as SectionId, doc: 'text', anchor: { quote: a.quote, prefix: String(a.prefix ?? ''), suffix: String(a.suffix ?? '') },
      color: isColor(o.color) ? o.color : 'yellow', text: typeof o.text === 'string' ? o.text : '', created: Number(o.created) || Date.now(), updated: Number(o.updated) || Date.now() }];
  });
};

const PREFIX = 'omnistax-notes-';
export const notesKey = (book: BookId): string => `${PREFIX}${book}`;
export const bookOfNotesKey = (key: string): BookId | null => (/^omnistax-notes-[a-z0-9-]+$/.test(key) ? bookId(key.slice(PREFIX.length)) : null);
export const notesOfBook = (list: readonly Note[], book: BookId): readonly StoredNote[] =>
  list.filter((n) => n.book === book).map(({ book: _book, ...rest }) => rest);
