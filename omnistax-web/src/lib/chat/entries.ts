/* The index of the chats, pure: the row each chat has in localStorage, what
   it names a chat by without reading it, and the book it is filed under. A
   chat belongs to the book that was being read when it was started, else the
   first book its chips come from, else to no book; a row written before chats
   were filed has no book yet, and is given one from its chips when the chat is
   read. */
import type { ChatId } from '../types/ids';
import type { Chip, ChipKind } from './context';
import type { Chat } from './model';

/* `book` is a book's id, `''` a chat that names no book, and absent a row not
   filed yet. */
export type ChatEntry = { readonly id: ChatId; readonly name: string; readonly created: number; readonly updated: number; readonly book?: string };

export const NO_BOOK = '';

export const parseIndex = (raw: unknown): ChatEntry[] => {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((e) => {
    if (typeof e !== 'object' || e === null) return [];
    const o = e as Record<string, unknown>;
    if (typeof o.id !== 'string' || !/^[a-z0-9]{8}$/.test(o.id)) return [];
    const now = Date.now();
    const book = typeof o.book === 'string' ? { book: o.book } : {};
    return [{ id: o.id as ChatId, name: typeof o.name === 'string' ? o.name : '', created: Number(o.created) || now, updated: Number(o.updated) || now, ...book }];
  });
};

/* The rows as the first index held them, for a tab still open on a build that
   reads only that key. */
export const unfiled = (rows: readonly ChatEntry[]): readonly ChatEntry[] => rows.map(({ book: _book, ...row }) => row);

/* The index this build keeps beside the one an older build may still be
   writing: every row of either, each chat's name and dates from whichever
   touched it last, and its book from the row that has one. */
export const mergeIndex = (now: readonly ChatEntry[], old: readonly ChatEntry[]): ChatEntry[] => {
  const out = new Map<string, ChatEntry>(now.map((e) => [e.id, e]));
  for (const e of old) {
    const had = out.get(e.id);
    if (!had) { out.set(e.id, e); continue; }
    if (e.updated > had.updated) out.set(e.id, { ...e, ...(had.book !== undefined ? { book: had.book } : {}) });
  }
  return [...out.values()];
};

/* ── the book of a chat ─────────────────────────────────────────────────── */

const OF_A_BOOK: ReadonlySet<ChipKind> = new Set(['book', 'chapter', 'section', 'figure', 'concept', 'equation', 'definition', 'exercise']);
const BOOK_ID = /^[a-z0-9][a-z0-9-]*$/;

/* The book a chip comes from, read off its key: `college-physics-2e/16.4`,
   `fig:college-physics-2e/16.4:f1`, `book:calculus`. A thing of the reader's
   own, and a key that names no book (`16.4` alone), come from none. */
export const bookOfChip = (c: Chip): string | null => {
  if (!OF_A_BOOK.has(c.kind)) return null;
  const rest = c.key.replace(/^[a-z]+:/, '');
  if (c.kind === 'book') return BOOK_ID.test(rest) ? rest : null;
  const slash = rest.indexOf('/');
  const book = slash > 0 ? rest.slice(0, slash) : '';
  return BOOK_ID.test(book) ? book : null;
};

export const bookOfChips = (chips: readonly Chip[]): string | null => {
  for (const c of chips) { const b = bookOfChip(c); if (b) return b; }
  return null;
};

/* The first book the chat's chips name, in the order they were sent. */
export const bookOfChat = (chat: Chat): string | null =>
  bookOfChips(Object.values(chat.messages).sort((a, b) => a.at - b.at).flatMap((m) => m.chips));

/* ── the conversations, by book ─────────────────────────────────────────── */

export type BookShelf = { readonly book: string; readonly entries: readonly ChatEntry[] };

/* The rows cut by book, the most recent first within each, and the books in
   the order of their most recent chat; the chats of no book, and the rows not
   yet filed, come last under one heading. */
export const byBook = (rows: readonly ChatEntry[]): readonly BookShelf[] => {
  const groups = new Map<string, ChatEntry[]>();
  for (const e of [...rows].sort((a, b) => b.updated - a.updated)) {
    const key = e.book ?? NO_BOOK;
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  const shelves = [...groups].map(([book, entries]) => ({ book, entries }));
  return [...shelves.filter((s) => s.book !== NO_BOOK), ...shelves.filter((s) => s.book === NO_BOOK)];
};

/* The books the rows are filed under, for the row of filters: each once, the
   most recently talked about first, no book last. */
export const booksOf = (rows: readonly ChatEntry[]): readonly string[] => byBook(rows).map((s) => s.book);
