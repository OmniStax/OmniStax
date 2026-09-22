/* The search in the rail: what a query finds across every textbook of the
   library, and how the finds are laid out. A book comes here as a corpus — its
   concepts, its symbols and terms, its formula sheet and the blocks of its text
   — and a query finds a thing when every word of it is somewhere in the thing,
   case aside. The reader may ask for one kind of thing or for all of them; with
   all, the things the book names stand first — a concept, a definition, a
   formula — and the prose that merely mentions the words comes after, cut off
   at a count that keeps the list readable. What a query finds is worked out over
   an inverted index (index.ts); this file is what the index is built of and what
   a hit looks like. Pure: the store fetches, this only reads. */
import type { ConceptDTO, EquationDTO, GlossaryDTO, VariableDTO } from '../content/schema';
import { tokensOf, type TextPageDTO } from '../content/textindex';
import { type Piece, pieces } from '../commands/pieces';
/* The marked pieces of an excerpt travel with a hit, so whoever draws one
   needs the type; it is the search's to hand on. */
export type { Piece };

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

/* The words of a query, lowercased and cut the way the index cuts a line; a blank
   query has none and finds nothing. */
export const wordsOf = (query: string): readonly string[] => tokensOf(query);

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
export const conceptText = (c: ConceptDTO): string => `${c.id} ${c.name} ${c.status === 'built' ? c.why ?? '' : ''}`;
export const symbolText = (v: VariableDTO): string => `${v.sym} ${v.meaning} ${v.unit}`;
export const termText = (t: GlossaryDTO): string => `${t.term} ${t.definition}`;
export const equationText = (e: EquationDTO): string => `${e.id} ${e.latex} ${e.condition ?? ''}`;
