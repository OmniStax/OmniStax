/* The index of the chats, pure: the row each chat has in localStorage, what
   it names a chat by without reading it, when it last said something, and the
   places of the books it is filed at.

   A chat is filed by what the reader handed it, never by what the answers
   reached for: the chips of every message the reader sent, on every branch.
   Each chip stands at a place of a book — the book, a chapter, or a section —
   and the places of one book are joined to the least place that holds them
   all, so two concepts of 2.3 file the chat at 2.3, a concept of 2.3 and one
   of 2.7 at chapter 2, and one of 1.8 and one of 5.3 at the book. A chat that
   names several books is filed once in each. */
import type { ChatId } from '../types/ids';
import { parseLink } from '../notes/md/links';
import type { Chip } from './context';
import type { Chat } from './model';

/* A place of a book: the book alone, a chapter of it, or a section, which
   always carries its chapter. */
export type Place = { readonly book: string; readonly chapter?: string; readonly section?: string };

/* `said` is when the chat's last message was sent and `answered` when its last
   answer finished, both absent on a row written before they were kept; `places`
   is where the chat is filed, empty for a chat of no book, and absent on a row
   not filed yet. */
export type ChatEntry = {
  readonly id: ChatId; readonly name: string; readonly created: number; readonly updated: number;
  readonly said?: number; readonly answered?: number; readonly places?: readonly Place[];
};

const BOOK_ID = /^[a-z0-9][a-z0-9-]*$/;
const PART = /^[\w.-]+$/;

const parsePlace = (raw: unknown): Place | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.book !== 'string' || !BOOK_ID.test(o.book)) return null;
  const chapter = typeof o.chapter === 'string' && PART.test(o.chapter) ? o.chapter : undefined;
  const section = chapter !== undefined && typeof o.section === 'string' && PART.test(o.section) ? o.section : undefined;
  return { book: o.book, ...(chapter !== undefined ? { chapter } : {}), ...(section !== undefined ? { section } : {}) };
};

const time = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : undefined);

/* Any of the three indexes: the first held no more than the name and dates, the
   second a `book` this build no longer reads, the third the rest. */
export const parseIndex = (raw: unknown): ChatEntry[] => {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((e) => {
    if (typeof e !== 'object' || e === null) return [];
    const o = e as Record<string, unknown>;
    if (typeof o.id !== 'string' || !/^[a-z0-9]{8}$/.test(o.id)) return [];
    const now = Date.now();
    const said = time(o.said), answered = time(o.answered);
    const places = Array.isArray(o.places) ? o.places.flatMap((p) => { const q = parsePlace(p); return q ? [q] : []; }) : undefined;
    return [{
      id: o.id as ChatId, name: typeof o.name === 'string' ? o.name : '', created: Number(o.created) || now, updated: Number(o.updated) || now,
      ...(said !== undefined ? { said } : {}), ...(answered !== undefined ? { answered } : {}), ...(places ? { places } : {}),
    }];
  });
};

/* The rows as the first index held them, for a tab still open on a build that
   reads only that key. */
export const unfiled = (rows: readonly ChatEntry[]): readonly ChatEntry[] =>
  rows.map(({ id, name, created, updated }) => ({ id, name, created, updated }));

/* The index this build keeps beside the first one, which an older build may
   still be writing: every row of either. A chat the older build touched since
   is taken with its name and dates and filed again from its messages, since
   it may have been asked something there; when it last answered is kept. */
export const mergeIndex = (now: readonly ChatEntry[], old: readonly ChatEntry[]): ChatEntry[] => {
  const out = new Map<string, ChatEntry>(now.map((e) => [e.id, e]));
  for (const e of old) {
    const had = out.get(e.id);
    if (!had) { out.set(e.id, e); continue; }
    if (e.updated > had.updated) out.set(e.id, { ...unfiled([e])[0], ...(had.answered !== undefined ? { answered: had.answered } : {}) });
  }
  return [...out.values()];
};

/* ── the places of a chat ───────────────────────────────────────────────── */

/* A page of a chapter is numbered under it, `2.3` and `2.intro`; a page with
   no chapter before its dot is one of the book's own, and stands at the book. */
export const placeOfSection = (book: string, section: string): Place => {
  const dot = section.indexOf('.');
  return dot > 0 ? { book, chapter: section.slice(0, dot), section } : { book };
};

/* Where a highlight is, which its chip does not say: the reader's notes know. */
export type HighlightAt = (id: string) => { readonly book: string; readonly section: string } | null;

/* The place one chip stands at, read off its key: `book:calculus`,
   `chapter:calculus/2`, `calculus/2.3`, `concept:calculus/2.3:limit`,
   `fig:…`, `eq:…`, `def:…`, `sym:…`, `ex:…`, or a highlight by its id. The
   reader's own things, and a key that names no book (`16.4` alone), stand at
   none. */
export const placeOfChip = (c: Chip, highlight: HighlightAt = () => null): Place | null => {
  const rest = c.key.replace(/^[a-z]+:/, '');
  if (c.kind === 'book') return BOOK_ID.test(rest) ? { book: rest } : null;
  if (c.kind === 'chapter') {
    const [book, chapter] = rest.split('/');
    return book && BOOK_ID.test(book) && chapter && PART.test(chapter) ? { book, chapter } : null;
  }
  if (c.kind === 'selection') { const at = highlight(rest); return at && BOOK_ID.test(at.book) ? placeOfSection(at.book, at.section) : null; }
  /* a section is its book and its page, whatever the page: `calculus/intro` is the book's own */
  if (c.kind === 'section') {
    const slash = c.key.indexOf('/'), book = c.key.slice(0, slash), page = c.key.slice(slash + 1);
    return slash > 0 && BOOK_ID.test(book) && PART.test(page) ? placeOfSection(book, page) : null;
  }
  if (!['figure', 'concept', 'equation', 'definition', 'exercise'].includes(c.kind)) return null;
  const link = parseLink(c.key);
  if (!('section' in link) || !link.book) return null;
  return placeOfSection(link.book, link.section);
};

/* The least place holding both, of one book. */
export const joinPlaces = (a: Place, b: Place): Place =>
  a.section !== undefined && a.section === b.section ? a
    : a.chapter !== undefined && a.chapter === b.chapter ? { book: a.book, chapter: a.chapter }
      : { book: a.book };

/* One place per book the chips name, in the order the books first came. */
export const placesOfChips = (chips: readonly Chip[], highlight?: HighlightAt): readonly Place[] => {
  const out = new Map<string, Place>();
  for (const c of chips) {
    const p = placeOfChip(c, highlight); if (!p) continue;
    const had = out.get(p.book);
    out.set(p.book, had ? joinPlaces(had, p) : p);
  }
  return [...out.values()];
};

/* Every message the reader sent, on every branch, in the order sent. */
export const placesOfChat = (chat: Chat, highlight?: HighlightAt): readonly Place[] =>
  placesOfChips(Object.values(chat.messages).filter((m) => m.role === 'user').sort((a, b) => a.at - b.at).flatMap((m) => m.chips), highlight);

/* When the chat last said something, either side: a rename is not a message. */
export const saidOf = (chat: Chat): number =>
  Object.values(chat.messages).reduce((t, m) => (m.id === chat.root ? t : Math.max(t, m.at)), chat.created);

export const entryOfChat = (chat: Chat, highlight?: HighlightAt): ChatEntry =>
  ({ id: chat.id, name: chat.name, created: chat.created, updated: chat.updated, said: saidOf(chat), places: placesOfChat(chat, highlight) });

/* ── the list ───────────────────────────────────────────────────────────── */

export const lastSaid = (e: ChatEntry): number => e.said ?? e.updated;

/* Every chat, the one that last said something first. */
export const recent = (rows: readonly ChatEntry[]): readonly ChatEntry[] => [...rows].sort((a, b) => lastSaid(b) - lastSaid(a));

/* ── the list, filed ────────────────────────────────────────────────────── */

export const NO_BOOK = '';

export type SectionShelf = { readonly section: string; readonly entries: readonly ChatEntry[] };
export type ChapterShelf = { readonly chapter: string; readonly entries: readonly ChatEntry[]; readonly sections: readonly SectionShelf[] };
export type BookShelf = { readonly book: string; readonly entries: readonly ChatEntry[]; readonly chapters: readonly ChapterShelf[] };

/* The order of a book's chapters and pages, ids in reading order, as its
   manifest has them; a book not to hand, or an id it does not list, falls
   back on the numbers. */
export type ReadingOrder = (book: string) => readonly string[] | null;

/* `2` before `10`, a chapter's introduction before its sections and its
   summary after them. */
const rankOfPart = (p: string): readonly [number, number, string] =>
  p === 'intro' ? [0, 0, ''] : /^\d+$/.test(p) ? [1, Number(p), ''] : p === 'summary' ? [2, 0, ''] : [3, 0, p];
export const compareIds = (a: string, b: string): number => {
  const pa = a.split('.'), pb = b.split('.');
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if (pa[i] === undefined) return -1;
    if (pb[i] === undefined) return 1;
    const [ka, na, sa] = rankOfPart(pa[i]), [kb, nb, sb] = rankOfPart(pb[i]);
    if (ka !== kb) return ka - kb;
    if (na !== nb) return na - nb;
    if (sa !== sb) return sa < sb ? -1 : 1;
  }
  return 0;
};
const inOrder = (order: readonly string[] | null) => (a: string, b: string): number => {
  const ia = order?.indexOf(a) ?? -1, ib = order?.indexOf(b) ?? -1;
  if (ia >= 0 && ib >= 0) return ia - ib;
  if (ia >= 0 || ib >= 0) return ia >= 0 ? -1 : 1;
  return compareIds(a, b);
};

/* The rows filed by book, chapter and section, each chat at the place it is
   filed at and once in every book it names. Only places that hold a chat are
   there, a chapter standing over its sections that do; chapters and sections
   go in the book's order, the chats newest first at every place, the books in
   the order of their latest chat, and the chats of no book last, the rows not
   filed yet among them. */
export const filed = (rows: readonly ChatEntry[], order: ReadingOrder = () => null): readonly BookShelf[] => {
  type Node = { entries: ChatEntry[]; chapters: Map<string, { entries: ChatEntry[]; sections: Map<string, ChatEntry[]> }> };
  const books = new Map<string, Node>();
  const nodeOf = (book: string): Node => { let n = books.get(book); if (!n) books.set(book, n = { entries: [], chapters: new Map() }); return n; };
  for (const e of recent(rows)) {
    const places = e.places ?? [];
    if (places.length === 0) { nodeOf(NO_BOOK).entries.push(e); continue; }
    for (const p of places) {
      const b = nodeOf(p.book);
      if (p.chapter === undefined) { b.entries.push(e); continue; }
      let ch = b.chapters.get(p.chapter); if (!ch) b.chapters.set(p.chapter, ch = { entries: [], sections: new Map() });
      if (p.section === undefined) { ch.entries.push(e); continue; }
      ch.sections.set(p.section, [...(ch.sections.get(p.section) ?? []), e]);
    }
  }
  const shelves = [...books].map(([book, n]): BookShelf => {
    const by = inOrder(order(book));
    return {
      book, entries: n.entries,
      chapters: [...n.chapters].sort(([a], [b]) => by(a, b)).map(([chapter, ch]) => ({
        chapter, entries: ch.entries,
        sections: [...ch.sections].sort(([a], [b]) => by(a, b)).map(([section, entries]) => ({ section, entries })),
      })),
    };
  });
  /* rows are walked newest first, so a book's first chat met is its latest */
  return [...shelves.filter((s) => s.book !== NO_BOOK), ...shelves.filter((s) => s.book === NO_BOOK)];
};

