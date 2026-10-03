/* An answer is markdown, and it is read with the note renderer, so a model
   that writes `[[16.4]]` or `[[eq:16.1:eq-hooke]]` gives the reader a link into
   the book rather than a string of punctuation. The renderer knows nothing by
   itself: it asks a resolver, and this builds the one a chat needs, out of the
   same registry the note view reads.

   A chat resolves less than a note does. There are no pasted images in an
   answer and no highlights of the model's own, so those two answer nothing;
   what the book holds, and what the reader owns and might be pointed back at,
   answer as they do everywhere else. */
import { tick } from 'svelte';
import { noteDocs } from '../notes/docs.svelte';
import { BookResolver } from '../notes/resolve';
import { isBook, parseLink } from '../notes/md/links';
import { registry } from '../sections/registry.svelte';
import { searchStore } from '../search/store.svelte';
import { wrapExampleRefs, wrapFigureRefs, wrapTerms, IN_BLOCK, type ExampleNumber } from '../hover/terms';
import { bookId, sectionId, sectionRef, type BookId, type ChatId, type SectionId } from '../types/ids';
import type { MathScope, Resolver } from '../notes/md/render';
import type { Chip } from './context';
import { chats } from './store.svelte';
import { firstWords, messageOf, spokenIn, type Chat, type Message, type MessageId } from './model';

export const chatBooks = new BookResolver();

/* ── the book an answer reads in ───────────────────────────────────────── */

/* The latest thing of a book the reader put before the chat on the way to a
   message — a book, a chapter, a section or a thing a section holds — names
   the book its maths is set in and its words are looked up in. With none,
   the answer belongs to no book and its maths is KaTeX's own. */
export type AnswerPlace = { readonly book: BookId | null; readonly section: SectionId | null; readonly chapter: string | null };
export const NOWHERE: AnswerPlace = { book: null, section: null, chapter: null };

const chipPlace = (c: Chip): AnswerPlace | null => {
  if (c.kind === 'book') { const b = c.key.replace(/^book:/, ''); return b ? { ...NOWHERE, book: bookId(b) } : null; }
  if (c.kind === 'chapter') { const m = /^chapter:([^/]+)\/(.+)$/.exec(c.key); return m ? { ...NOWHERE, book: bookId(m[1]), chapter: m[2] } : null; }
  const t = parseLink(c.key);
  return 'section' in t && t.book ? { ...NOWHERE, book: t.book, section: sectionId(t.section) } : null;
};
/* One value per place, so a bubble whose place is unchanged by a word of an
   answer arriving is not drawn again. */
const placeKey = (p: AnswerPlace): string => `${p.book}|${p.section}|${p.chapter}`;
const places = new Map<string, AnswerPlace>([[placeKey(NOWHERE), NOWHERE]]);
const interned = (p: AnswerPlace): AnswerPlace => {
  const had = places.get(placeKey(p)); if (had) return had;
  places.set(placeKey(p), p); return p;
};
/* The place of a message is its own last chip that names one, else its
   parent's; worked out once per message of a chat and kept with the chat. */
const ownPlace = (m: Message): AnswerPlace | null => m.chips.reduceRight<AnswerPlace | null>((got, c) => got ?? chipPlace(c), null);
const placesIn = new WeakMap<Chat, Map<MessageId, AnswerPlace>>();
export const placeOf = (chat: Chat, id: MessageId): AnswerPlace => {
  const known = placesIn.get(chat) ?? new Map<MessageId, AnswerPlace>();
  placesIn.set(chat, known);
  const up: Message[] = [];
  const seen = new Set<string>();
  let at: MessageId | null = id, place = NOWHERE;
  while (at !== null && !seen.has(at)) {
    const had = known.get(at); if (had) { place = had; break; }
    seen.add(at);
    const m = messageOf(chat, at); if (!m) break;
    up.push(m); at = m.parent;
  }
  for (const m of up.reverse()) { place = interned(ownPlace(m) ?? place); known.set(m.id, place); }
  return place;
};

/* The chapter folder a place's colours are scoped by, once its book has come. */
const chapterDir = (p: AnswerPlace): string | undefined => {
  if (!p.book || !registry.hasBook(p.book)) return undefined;
  if (p.section) return registry.chapterOf(sectionRef(p.book, p.section))?.dir;
  return p.chapter ? registry.manifest(p.book).chapters.find((c) => c.id === p.chapter)?.dir : undefined;
};
/* What a bubble wears so the book's colours and hover cards reach into it. */
export const placeAttrs = (p: AnswerPlace): Readonly<Record<string, string>> => {
  const dir = chapterDir(p);
  return { ...(p.book ? { 'data-book': p.book } : {}), ...(p.section ? { 'data-sec': p.section } : {}), ...(dir ? { 'data-chapter': dir } : {}) };
};

const scopeOf = (book: BookId | null, section?: string): MathScope | null => {
  if (!book || !registry.hasBook(book)) return null;
  const chapter = section ? registry.chapterOf(sectionRef(book, sectionId(section)))?.dir : undefined;
  return { book, macros: registry.manifest(book).macros, ...(section ? { section } : {}), ...(chapter ? { chapter } : {}) };
};

export const chatResolver = (place: AnswerPlace = NOWHERE): Resolver => ({
  ...(place.book ? new BookResolver(() => place.book) : chatBooks).lookups(),
  scope: (book, section) => (book ? scopeOf(book, section) : scopeOf(place.book, place.section ?? undefined)),
  note: (name) => noteDocs.byName(name)?.id ?? null,
  asset: () => null,
  /* A chat, and one message of it: what the card over a `[[chat:…]]` says.
     The index names every chat whether it has been opened or not; a message is
     only known once its chat has been read, and until then the card says the
     chat's name, which is still the truth about where the link goes. */
  chat: (id) => {
    const chat = chats.get(id as ChatId);
    const entry = chats.entry(id as ChatId);
    if (!chat && !entry) return null;
    return { name: chat?.name || entry?.name || 'Chat' };
  },
  chatMessage: (id, message) => {
    const chat = chats.get(id as ChatId); if (!chat) return null;
    const m = chat.messages[message as keyof typeof chat.messages];
    if (!m) return null;
    return { name: chat.name || 'Chat', role: m.role, line: firstWords(m.text, 18) };
  },
});

/* The first words of a chat, for a card that has nothing else to show: the
   opening question, which is what a reader remembers a chat by. */
export const openingOf = (id: ChatId): string => {
  const chat = chats.get(id);
  const first = chat ? spokenIn(chat)[0] : null;
  return first ? firstWords(first.text, 12) : '';
};

/* ── what an answer marks of its own accord ────────────────────────────── */

/* The terms of the book, each at the section of the concept it names: every
   concept's where the search has read the book, and otherwise what the
   chapters already fetched hold. */
const glossaryOf = (book: BookId): ReadonlyMap<string, string> =>
  new Map([...(searchStore.corpora[book]?.concepts ?? []), ...registry.concepts(book)].flatMap((c) => c.terms.map((t) => [t, c.section] as const)));
/* Every figure the book draws, by the numbers its eyebrow prints. */
const figuresOf = (book: BookId): ReadonlyMap<string, string> =>
  new Map(registry.manifest(book).chapters.flatMap((c) => c.sections.flatMap((s) =>
    s.figures.flatMap((f) => (/^Figures? ([^·]+)/.exec(f.label)?.[1].match(/\d+\.\d+/g) ?? []).map((n) => [n, `${s.id}-${f.id}`] as const)))));
/* Every worked example the book holds, by number: from the search's reading of
   the book, and from every section of it already open. */
const EXAMPLE = /^Example (\d+\.\d+)\b/;
const examplesOf = (book: BookId): ReadonlyMap<ExampleNumber, string> => {
  const read = (searchStore.corpora[book]?.pages ?? []).flatMap((p) => p.blocks.map((b) => [EXAMPLE.exec(b.head)?.[1], b.span] as const));
  const open = registry.manifest(book).chapters.flatMap((c) => c.sections.flatMap((s) =>
    Array.from(registry.state(sectionRef(book, sectionId(s.id)))?.docs.text?.querySelectorAll<HTMLElement>('.example[id]') ?? [], (e) => [EXAMPLE.exec(e.querySelector('h3')?.textContent?.trim() ?? '')?.[1], e.id] as const)));
  return new Map([...read, ...open].flatMap(([n, id]) => (n ? [[n as ExampleNumber, id] as const] : [])));
};

/* The prose of an answer, a paragraph or a list item at a time: the first
   mention of each of the book's terms in it, and every "Figure 16.4" and
   "Example 16.2" the book holds, become what the book makes of them. A block
   is marked once; a block drawn again is a new block. */
const proseOf = (el: HTMLElement): HTMLElement[] =>
  Array.from(el.querySelectorAll<HTMLElement>('p, li')).filter((b) => !b.closest('pre, [data-embed], .hover-card') && !b.querySelector('p, li') && b.dataset.marked !== '1');
/* What marking reads of a book, gathered once for all the answers drawn in
   one task (a transcript draws every one of its answers together) and afresh
   in the next, when more of the book may have come. */
type Marks = {
  readonly glossary: ReadonlyMap<string, string>; readonly terms: readonly string[]; readonly lower: readonly string[];
  readonly figures: ReadonlyMap<string, string>; readonly examples: ReadonlyMap<ExampleNumber, string>;
};
const marksNow = new Map<BookId, Marks>();
const marksOf = (book: BookId): Marks => {
  const had = marksNow.get(book); if (had) return had;
  if (marksNow.size === 0) setTimeout(() => marksNow.clear(), 0);
  const glossary = glossaryOf(book);
  /* the longer term first, so "kinetic energy" is marked whole before "energy" can be */
  const terms = [...glossary.keys()].sort((a, b) => b.length - a.length);
  const marks: Marks = { glossary, terms, lower: terms.map((t) => t.toLowerCase()), figures: figuresOf(book), examples: examplesOf(book) };
  marksNow.set(book, marks);
  return marks;
};
const markProse = (el: HTMLElement, place: AnswerPlace): void => {
  const book = place.book; if (!book || !registry.hasBook(book)) return;
  const { glossary, terms, lower, figures, examples } = marksOf(book);
  for (const b of proseOf(el)) {
    const words = (b.textContent ?? '').toLowerCase();
    const here = terms.filter((_, i) => words.includes(lower[i]));
    const html = wrapExampleRefs(wrapFigureRefs(wrapTerms(b.innerHTML, here, IN_BLOCK), figures, IN_BLOCK), examples, IN_BLOCK);
    if (html !== b.innerHTML) b.innerHTML = html;
    b.dataset.marked = '1';
  }
  for (const t of el.querySelectorAll<HTMLElement>('.term[data-term]:not([data-sec])')) {
    const sec = glossary.get(t.dataset.term ?? ''); if (sec) t.dataset.sec = sec;
  }
};

/* What an answer needs fetched before it can say all it has to: the book it
   reads in and the chapter in context, the books its links and maths name,
   and the chapter of every thing of a book that resolved to nothing. Each is
   asked for once a session, so a book that is not there is not asked again. */
const asked = new Set<string>();
const once = (key: string, load: () => Promise<unknown>): Promise<unknown>[] => {
  if (asked.has(key)) return [];
  asked.add(key);
  return [load().catch(() => null)];
};
const placeDir = (book: BookId | null, section: string): string | undefined =>
  (book && registry.hasBook(book) ? registry.chapterOf(sectionRef(book, sectionId(section)))?.dir : undefined);
const wanted = (el: HTMLElement, place: AnswerPlace): Promise<unknown>[] => {
  const gone = Array.from(el.querySelectorAll<HTMLElement>('.wiki.dead[data-embed]'), (d) => parseLink(d.dataset.embed ?? ''));
  const named = gone.flatMap((t) => ('book' in t && t.book ? [t.book] : []));
  const books = new Set<BookId>([...(place.book ? [place.book] : []), ...named, ...Array.from(el.querySelectorAll<HTMLElement>('[data-book]'), (n) => bookId(n.dataset.book ?? ''))]);
  const ensure = [...books].filter((b) => b !== '' && !registry.hasBook(b)).flatMap((b) => once(`book:${b}`, () => registry.ensureBook(b)));
  const dead = gone.filter(isBook);
  const homes = [...dead.map((t) => ({ book: t.book ?? place.book, dir: placeDir(t.book ?? place.book, t.section) })), { book: place.book, dir: chapterDir(place) }];
  const chapters = homes.flatMap(({ book, dir }) =>
    (book && dir && registry.chapterStatusOf(book, dir) !== 'loaded' ? once(`chapter:${book}/${dir}`, () => registry.loadChapter(book, dir)) : []));
  return [...ensure, ...chapters];
};

/* An answer drawn: its maths and cards set in its book, its prose marked, and
   whatever it is still waiting on asked for, after which `again` draws the
   decorations once more over what the fetch has changed. */
export const decorateAnswer = (el: HTMLElement, place: AnswerPlace, again: () => void): void => {
  (place.book ? new BookResolver(() => place.book) : chatBooks).setMath(el);
  markProse(el, place);
  const waits = wanted(el, place);
  if (waits.length) void Promise.all(waits).then(() => tick()).then(() => { if (el.isConnected) again(); });
};
