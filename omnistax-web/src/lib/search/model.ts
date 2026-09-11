/* The search in the rail: what a query finds across every textbook of the
   library, and how the finds are laid out. A book comes here as a corpus — its
   concepts, its symbols and terms, its formula sheet and the blocks of its text
   — and a query finds a thing when every word of it is somewhere in the thing,
   case aside. The reader may ask for one kind of thing or for all of them; with
   all, the things the book names stand first — a concept, a definition, a
   formula — and the prose that merely mentions the words comes after, cut off
   at a count that keeps the list readable. Pure: the store fetches, this only
   reads. */
import type { ConceptDTO, EquationDTO, GlossaryDTO, VariableDTO } from '../content/schema';
import type { TextPageDTO } from '../content/textindex';
import { type Piece, pieces } from '../commands/pieces';

export const SEARCH_KINDS = ['concept', 'definition', 'formula', 'text'] as const;
export type SearchKind = (typeof SEARCH_KINDS)[number];
/* What the reader asks for: one kind, or everything. */
export type Filter = 'all' | SearchKind;
export const FILTERS: readonly Filter[] = ['all', ...SEARCH_KINDS];
export const FILTER_LABEL: Readonly<Record<Filter, string>> = { all: 'All', concept: 'Concepts', definition: 'Definitions', formula: 'Formulas', text: 'Text' };

/* One book as the search reads it. The id is the book's, the title what to call it. */
export type Corpus = {
  readonly book: string;
  readonly title: string;
  readonly concepts: readonly ConceptDTO[];
  readonly variables: readonly VariableDTO[];
  readonly glossary: readonly GlossaryDTO[];
  readonly equations: readonly EquationDTO[];
  readonly pages: readonly TextPageDTO[];
  readonly urls: Readonly<Record<string, string>>;   /* the address of every built page, by its id: where a hit in another book is gone to */
};
export const emptyCorpus = (book: string, title: string): Corpus => ({ book, title, concepts: [], variables: [], glossary: [], equations: [], pages: [], urls: {} });

/* One thing found, and the book it was found in. A text hit carries the page and
   the span it lies in, and the words round the first word found, marked. */
export type Hit =
  | { readonly kind: 'concept'; readonly book: string; readonly concept: ConceptDTO }
  | { readonly kind: 'definition'; readonly book: string; readonly def: { readonly kind: 'symbol'; readonly symbol: VariableDTO } | { readonly kind: 'term'; readonly term: GlossaryDTO } }
  | { readonly kind: 'formula'; readonly book: string; readonly equation: EquationDTO }
  | { readonly kind: 'text'; readonly book: string; readonly page: TextPageDTO; readonly span: string; readonly head: string; readonly text: string; readonly excerpt: readonly Piece[] };

/* The words of a query, lowercased; a blank query has none and finds nothing. */
export const wordsOf = (query: string): readonly string[] => query.toLowerCase().split(/\s+/).filter((w) => w.length > 0);
const hasAll = (s: string, words: readonly string[]): boolean => { const l = s.toLowerCase(); return words.every((w) => l.includes(w)); };

/* The window of a block shown for a hit: from a little before the first word found to
   the width, cut on word boundaries and marked with an ellipsis where it was cut, and
   every occurrence of every word inside it marked. */
export const WIDTH = 160;
export const excerpt = (text: string, words: readonly string[], width = WIDTH): readonly Piece[] => {
  const lower = text.toLowerCase();
  const first = Math.min(...words.map((w) => lower.indexOf(w)).filter((i) => i >= 0), text.length);
  let start = Math.max(0, first - Math.floor(width / 3));
  if (start > 0) { const sp = text.lastIndexOf(' ', start); start = sp > 0 ? sp + 1 : start; }
  let end = Math.min(text.length, start + width);
  if (end < text.length) { const sp = text.indexOf(' ', end); end = sp > 0 ? sp : end; }
  const window = text.slice(start, end);
  const wl = window.toLowerCase();
  const indices = words.flatMap((w) => { const out: number[] = []; for (let i = wl.indexOf(w); i >= 0; i = wl.indexOf(w, i + 1)) for (let k = 0; k < w.length; k++) out.push(i + k); return out; });
  const marked = pieces(window, 0, indices);
  return [...(start > 0 ? [{ t: '…', hit: false }] : []), ...marked, ...(end < text.length ? [{ t: '…', hit: false }] : [])];
};

/* What each thing is searched by: the name it is printed under and the line beside it. */
const conceptText = (c: ConceptDTO): string => `${c.id} ${c.name} ${c.status === 'built' ? c.why ?? '' : ''}`;
const symbolText = (v: VariableDTO): string => `${v.sym} ${v.meaning} ${v.unit}`;
const termText = (t: GlossaryDTO): string => `${t.term} ${t.definition}`;
const equationText = (e: EquationDTO): string => `${e.id} ${e.latex} ${e.condition ?? ''}`;

/* How many blocks of prose the list will hold with everything asked for; asked for on its own, the prose runs longer. */
export const TEXT_CAP = { all: 60, text: 300 } as const;

const conceptsOf = (c: Corpus, words: readonly string[]): Hit[] => c.concepts.filter((k) => hasAll(conceptText(k), words)).map((concept) => ({ kind: 'concept', book: c.book, concept }));
const definitionsOf = (c: Corpus, words: readonly string[]): Hit[] => [
  ...c.variables.filter((v) => hasAll(symbolText(v), words)).map((symbol): Hit => ({ kind: 'definition', book: c.book, def: { kind: 'symbol', symbol } })),
  ...c.glossary.filter((t) => hasAll(termText(t), words)).map((term): Hit => ({ kind: 'definition', book: c.book, def: { kind: 'term', term } })),
];
const formulasOf = (c: Corpus, words: readonly string[]): Hit[] => c.equations.filter((e) => e.important && hasAll(equationText(e), words)).map((equation) => ({ kind: 'formula', book: c.book, equation }));
const textOf = (c: Corpus, words: readonly string[]): Hit[] =>
  c.pages.flatMap((page) => page.blocks.filter((b) => hasAll(b.text, words)).map((b): Hit => ({ kind: 'text', book: c.book, page, span: b.span, head: b.head, text: b.text, excerpt: excerpt(b.text, words) })));

/* Everything the query finds across the corpora given, in the order the books were given:
   the things the books name first, each kind in turn, and the prose after them, with
   how many blocks of prose were found beyond the cap. */
export type Found = { readonly hits: readonly Hit[]; readonly cut: number };
export const NOTHING: Found = { hits: [], cut: 0 };
export const search = (query: string, corpora: readonly Corpus[], filter: Filter): Found => {
  const words = wordsOf(query);
  if (!words.length) return NOTHING;
  const want = (k: SearchKind): boolean => filter === 'all' || filter === k;
  const named = [
    ...(want('concept') ? corpora.flatMap((c) => conceptsOf(c, words)) : []),
    ...(want('definition') ? corpora.flatMap((c) => definitionsOf(c, words)) : []),
    ...(want('formula') ? corpora.flatMap((c) => formulasOf(c, words)) : []),
  ];
  const prose = want('text') ? corpora.flatMap((c) => textOf(c, words)) : [];
  const cap = filter === 'text' ? TEXT_CAP.text : TEXT_CAP.all;
  return { hits: [...named, ...prose.slice(0, cap)], cut: Math.max(0, prose.length - cap) };
};
