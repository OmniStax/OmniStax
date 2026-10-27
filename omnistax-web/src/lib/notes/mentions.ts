/* What mentions a section: the reader's own words that link to it or to
   anything it holds — the section itself, an equation, a term, a symbol, a
   concept, a figure or an exercise of it, or a highlight made on it. A note, a
   chat message, a box written on a drawing and a highlight's annotation all
   write their links in the one grammar of links.ts, and a chat message also
   carries the chips the reader attached to it, whose keys are written in the
   same grammar. So every source is a text and a few keys, and this module asks
   nothing of any store.

   The index is made once over every source and kept by the caller while the
   sources stand still; a section reads its bubbles out of it. A source is one
   bubble however many times it names the section, and the bubble quotes the
   words around the first time it does. */
import type { BookId, SectionRef } from '../types/ids';
import { LINK_PATTERN, linkInner, linkKey, parseLink, type Link } from './md/links';

/* Where a mention was written, which is also where a click on it goes. */
export type MentionOrigin =
  | { readonly kind: 'note'; readonly note: string; readonly name: string }
  | { readonly kind: 'chat'; readonly chat: string; readonly name: string; readonly message: string; readonly role: 'user' | 'assistant' }
  | { readonly kind: 'drawing'; readonly drawing: string; readonly name: string; readonly item: string }
  | { readonly kind: 'annotation'; readonly highlight: string; readonly book: BookId; readonly section: string; readonly quote: string };

/* One thing the reader wrote: its words, when it was last changed, and, for a
   chat message, the keys of the chips sent with it. */
export type MentionSource = { readonly origin: MentionOrigin; readonly text: string; readonly at: number; readonly chips?: readonly string[] };

/* A bubble: where it is from, the words around the mention, and whether the
   section was attached as a chip rather than linked in the words. A link in the
   words also says what a rendering of it carries in its `data-link` or
   `data-embed`, so a click can land on it. */
export type Mention = { readonly origin: MentionOrigin; readonly at: number; readonly excerpt: string; readonly attached: boolean; readonly marks?: readonly string[] };

/* A highlight is named by its id alone; the caller says which section it was made on. */
export type HighlightPlace = { readonly book: BookId; readonly section: string; readonly quote: string };
export type HighlightAt = (id: string) => HighlightPlace | null;

type Place = { readonly book?: BookId; readonly section: string };
type Entry = Mention & { readonly book?: BookId; readonly key: string };
/* Entries by section number; a link written without its book is read against
   whatever book is being read, as a note reads it, so it is kept bookless. */
export type MentionIndex = ReadonlyMap<string, readonly Entry[]>;

export const originKey = (o: MentionOrigin): string =>
  o.kind === 'note' ? `note:${o.note}` : o.kind === 'chat' ? `chat:${o.chat}:${o.message}`
    : o.kind === 'drawing' ? `drawing:${o.drawing}:${o.item}` : `hl:${o.highlight}`;

const placeOf = (link: Link, highlightAt: HighlightAt): Place | null => {
  if (link.kind === 'highlight') { const h = highlightAt(link.id); return h ? { book: h.book, section: h.section } : null; }
  return 'section' in link ? { ...(link.book ? { book: link.book } : {}), section: link.section } : null;
};

/* ── the words around a mention ────────────────────────────────────────── */

/* An id a builder wrote reads as words once its kind's prefix is gone: `eq-static-friction` is "static friction". */
const idWords = (id: string): string => id.replace(/^(?:eq|fig|sim|concept)-/, '').replace(/-/g, ' ');
/* A link reads as what it would show: its alias, else the short part of its
   target. An embed is a card and not words, so it reads as nothing. */
const shown = (link: Link, embed: boolean, highlightAt: HighlightAt): string => {
  if (link.alias) return link.alias;
  if (embed) return '';
  switch (link.kind) {
    case 'section': return link.section;
    case 'term': return link.term;
    case 'symbol': return link.sym;
    case 'equation': case 'concept': case 'figure': case 'exercise': return idWords(link.id);
    case 'highlight': return `“${highlightAt(link.id)?.quote ?? ''}”`;
    case 'note': return link.name;
    default: return linkInner(link);
  }
};
/* The markdown with its links read as words and its marks of emphasis, heading and quote left out. */
const flat = (s: string): string => s.replace(/[*_`]+|^#+\s|^>\s?/gm, '').replace(/\s+/g, ' ');
const BEFORE = 50, AFTER = 110;

/* About a line of words: some before the mention and more after it, cut at spaces. */
const around = (text: string, at: number): string => {
  let from = Math.max(0, at - BEFORE), to = Math.min(text.length, at + AFTER);
  if (from > 0) { const sp = text.indexOf(' ', from); if (sp !== -1 && sp < at) from = sp + 1; }
  if (to < text.length) { const sp = text.lastIndexOf(' ', to); if (sp > at) to = sp; }
  return `${from > 0 ? '…' : ''}${text.slice(from, to).trim()}${to < text.length ? '…' : ''}`;
};

/* The words of a source with every link read as words, and where each link begins among them. */
const readable = (text: string, highlightAt: HighlightAt): { readonly text: string; readonly links: readonly { readonly link: Link; readonly at: number }[] } => {
  let out = '', last = 0;
  /* runs are flattened one at a time, so where two meet — around an embed that
     reads as nothing — a second space is dropped */
  const put = (run: string): void => { out += out.endsWith(' ') && run.startsWith(' ') ? run.slice(1) : run; };
  const links: { link: Link; at: number }[] = [];
  for (const m of text.matchAll(LINK_PATTERN)) {
    const link = parseLink(m[1]);
    put(flat(text.slice(last, m.index ?? 0)));
    links.push({ link, at: out.length });
    put(shown(link, m[0].startsWith('!'), highlightAt));
    last = (m.index ?? 0) + m[0].length;
  }
  put(flat(text.slice(last)));
  const lead = out.length - out.trimStart().length;
  return { text: out.trim(), links: links.map((l) => ({ link: l.link, at: Math.max(0, l.at - lead) })) };
};

/* ── the index ─────────────────────────────────────────────────────────── */

export const mentionIndex = (sources: readonly MentionSource[], highlightAt: HighlightAt): MentionIndex => {
  const index = new Map<string, Entry[]>();
  const add = (p: Place, e: Mention, key: string): void => {
    const list = index.get(p.section) ?? [];
    if (!list.some((x) => x.key === key && x.book === p.book)) list.push({ ...e, ...(p.book ? { book: p.book } : {}), key });
    index.set(p.section, list);
  };
  for (const s of sources) {
    const key = originKey(s.origin);
    const hasLinks = s.text.includes('[[');
    const words = hasLinks ? readable(s.text, highlightAt) : null;
    words?.links.forEach(({ link, at }) => {
      const p = placeOf(link, highlightAt);
      if (p) add(p, { origin: s.origin, at: s.at, excerpt: around(words.text, at), attached: false, marks: [...new Set([linkKey(link), linkInner(link)])] }, key);
    });
    (s.chips ?? []).forEach((chip) => {
      const p = placeOf(parseLink(chip), highlightAt);
      if (p) add(p, { origin: s.origin, at: s.at, excerpt: around((words?.text ?? flat(s.text)).trim(), 0), attached: true }, key);
    });
  }
  return index;
};

/* The bubbles of one section, newest first: one per source, its first mention
   that reads in this book. */
export const mentionsIn = (index: MentionIndex, ref: SectionRef): readonly Mention[] => {
  const seen = new Set<string>();
  return (index.get(ref.section) ?? [])
    .filter((e) => (e.book === undefined || e.book === ref.book) && !seen.has(e.key) && (seen.add(e.key), true))
    .map(({ book: _book, key: _key, ...m }) => m)
    .sort((a, b) => b.at - a.at);
};

export const mentionsOf = (ref: SectionRef, sources: readonly MentionSource[], highlightAt: HighlightAt): readonly Mention[] =>
  mentionsIn(mentionIndex(sources, highlightAt), ref);
