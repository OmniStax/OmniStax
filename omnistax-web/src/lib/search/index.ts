/* The index the search asks. Every thing a book holds — a concept, a symbol, a
   term, a formula, a block of prose — is one entry, and every word of it points
   at that entry, so a query is answered by looking words up rather than by
   reading the library again at each keystroke. The words of a block come off
   the build (search.json carries a page's dictionary); everything else is cut
   here, once, when the books arrive. A query's words are prefixes: "per" finds
   period, "period" does not find hyperbola. The entries are laid out kind by
   kind and book by book in the order the list wants them, so the hits of a
   query, taken in the order they were built, are already ranked. Pure. */
import type { ConceptDTO, EquationDTO, GlossaryDTO, VariableDTO } from '../content/schema';
import { tokensOf, unpackToks, type TextBlockDTO, type TextPageDTO } from '../content/textindex';
import { conceptText, equationText, excerpt, symbolText, termText, wordsOf, type Corpus, type Filter, type Hit, type SearchKind } from './model';

/* One thing the index holds, with the book it belongs to. An entry becomes a hit
   as it is found; a block of prose gets its marked window only then. */
type Entry =
  | { readonly kind: 'concept'; readonly book: string; readonly concept: ConceptDTO }
  | { readonly kind: 'definition'; readonly book: string; readonly def: { readonly kind: 'symbol'; readonly symbol: VariableDTO } | { readonly kind: 'term'; readonly term: GlossaryDTO } }
  | { readonly kind: 'formula'; readonly book: string; readonly equation: EquationDTO }
  | { readonly kind: 'text'; readonly book: string; readonly page: TextPageDTO; readonly block: TextBlockDTO };

/* How many of each kind the list will hold, and how many blocks of prose: with
   everything asked for the prose is kept short, asked for on its own it runs longer. */
export const KIND_CAP = 40;
export const TEXT_CAP = { all: 60, text: 300 } as const;
/* Below this many characters a query is too broad to look through the prose with;
   the things the books name are still found by a single letter. */
export const MIN_TEXT = 2;

export type Index = {
  readonly entries: readonly Entry[];
  readonly tokens: readonly string[];                /* every word of the library, once, sorted */
  readonly postings: readonly (readonly number[])[]; /* beside each word, the entries holding it, in entry order */
  readonly prose: number;                            /* where the blocks of prose begin: the entries before it are what the books name */
  readonly stamp: Int32Array;                        /* scratch, one slot per entry: which lookup last touched it */
};
export const EMPTY: Index = { entries: [], tokens: [], postings: [], prose: 0, stamp: new Int32Array(0) };

/* The words of one block: what the build wrote down where it did, the text cut here where it did not. */
const blockTokens = (page: TextPageDTO, b: TextBlockDTO): readonly string[] => {
  const terms = page.terms ?? [];
  if (!b.toks || !terms.length) return tokensOf(b.text);
  return unpackToks(b.toks).flatMap((i) => (terms[i] === undefined ? [] : [terms[i]]));
};

const namedOf = (corpora: readonly Corpus[]): Entry[] => [
  ...corpora.flatMap((c) => c.concepts.map((concept): Entry => ({ kind: 'concept', book: c.book, concept }))),
  ...corpora.flatMap((c) => [
    ...c.variables.map((symbol): Entry => ({ kind: 'definition', book: c.book, def: { kind: 'symbol', symbol } })),
    ...c.glossary.map((term): Entry => ({ kind: 'definition', book: c.book, def: { kind: 'term', term } })),
  ]),
  ...corpora.flatMap((c) => c.equations.filter((e) => e.important).map((equation): Entry => ({ kind: 'formula', book: c.book, equation }))),
];
const proseOf = (corpora: readonly Corpus[]): Entry[] =>
  corpora.flatMap((c) => c.pages.flatMap((page) => page.blocks.map((block): Entry => ({ kind: 'text', book: c.book, page, block }))));

const wordsIn = (e: Entry): readonly string[] =>
  e.kind === 'text' ? blockTokens(e.page, e.block)
    : tokensOf(e.kind === 'concept' ? conceptText(e.concept)
      : e.kind === 'formula' ? equationText(e.equation)
        : e.def.kind === 'symbol' ? symbolText(e.def.symbol) : termText(e.def.term));

/* The index of a library: the entries in the order the list wants them, and beside
   every word the entries that hold it, ascending, since the entries are walked in order. */
export const buildIndex = (corpora: readonly Corpus[]): Index => {
  const named = namedOf(corpora);
  const entries = [...named, ...proseOf(corpora)];
  const by = new Map<string, number[]>();
  entries.forEach((e, id) => {
    for (const w of wordsIn(e)) {
      const posts = by.get(w);
      if (posts === undefined) by.set(w, [id]);
      else if (posts[posts.length - 1] !== id) posts.push(id);
    }
  });
  const tokens = [...by.keys()].sort();
  return { entries, tokens, postings: tokens.map((t) => by.get(t) ?? []), prose: named.length, stamp: new Int32Array(entries.length) };
};

/* The first word of the index not before p, found by halving. */
const lower = (tokens: readonly string[], p: string): number => {
  let lo = 0, hi = tokens.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (tokens[mid] < p) lo = mid + 1; else hi = mid; }
  return lo;
};
/* The stretch of the index whose words open with p: [from, to). */
const range = (tokens: readonly string[], p: string): readonly [number, number] => {
  const from = lower(tokens, p);
  let to = from;
  while (to < tokens.length && tokens[to].startsWith(p)) to += 1;
  return [from, to];
};

/* How many entries a word of a query reaches at all: what it costs to start there. */
const weight = (ix: Index, p: string): number => {
  const [from, to] = range(ix.tokens, p);
  let n = 0;
  for (let t = from; t < to; t++) n += ix.postings[t].length;
  return n;
};

let clock = 0;
/* Every entry holding a word that opens with p, ascending. */
const matching = (ix: Index, p: string, upto: number): number[] => {
  const [from, to] = range(ix.tokens, p);
  if (from === to) return [];
  const mark = (clock += 1);
  const out: number[] = [];
  /* the postings run in entry order, so a query that wants none of the prose stops
     at the first block of it rather than walking the rest of the library */
  for (let t = from; t < to; t++) for (const id of ix.postings[t]) { if (id >= upto) break; if (ix.stamp[id] !== mark) { ix.stamp[id] = mark; out.push(id); } }
  return to - from === 1 ? out : out.sort((a, b) => a - b);
};
/* Those of ids that also hold a word opening with p; the order is kept. */
const keep = (ix: Index, ids: readonly number[], p: string, upto: number): number[] => {
  const [from, to] = range(ix.tokens, p);
  if (from === to) return [];
  const mark = (clock += 1);
  for (let t = from; t < to; t++) for (const id of ix.postings[t]) { if (id >= upto) break; ix.stamp[id] = mark; }
  return ids.filter((id) => ix.stamp[id] === mark);
};

const hitOf = (e: Entry, words: readonly string[]): Hit =>
  e.kind === 'text' ? { kind: 'text', book: e.book, page: e.page, span: e.block.span, head: e.block.head, text: e.block.text, excerpt: excerpt(e.block.text, words) } : e;

/* Everything the query finds: the things the books name first, kind by kind and each
   kind cut at its cap, the prose after them, and how many blocks of prose were found
   beyond the cap. A query of one letter does not go through the prose. */
export type Found = { readonly hits: readonly Hit[]; readonly cut: number };
export const NOTHING: Found = { hits: [], cut: 0 };
export const find = (query: string, ix: Index, filter: Filter): Found => {
  const words = wordsOf(query);
  if (!words.length || !ix.entries.length) return NOTHING;
  const deep = query.trim().length >= MIN_TEXT;
  const want = (k: SearchKind): boolean => (k === 'text' ? deep && (filter === 'all' || filter === 'text') : filter === 'all' || filter === k);
  /* where to stop looking: at the prose where none of it is wanted, and a query
     that wants only the prose still starts there, the named entries thrown away below */
  const upto = want('text') ? ix.entries.length : ix.prose;
  /* the narrowest word of the query goes first: what it finds is what the rest sift */
  const [seed, ...rest] = [...words].sort((a, b) => weight(ix, a) - weight(ix, b));
  const ids = rest.reduce((acc, w) => (acc.length ? keep(ix, acc, w, upto) : acc), matching(ix, seed, upto));
  if (!ids.length) return NOTHING;
  const cap = filter === 'text' ? TEXT_CAP.text : TEXT_CAP.all;
  const count: Partial<Record<SearchKind, number>> = {};
  const hits: Hit[] = [];
  let cut = 0;
  for (const id of ids) {
    const e = ix.entries[id];
    if (!want(e.kind)) continue;
    const n = (count[e.kind] ?? 0) + 1;
    count[e.kind] = n;
    if (n > (e.kind === 'text' ? cap : KIND_CAP)) { if (e.kind === 'text') cut += 1; continue; }
    hits.push(hitOf(e, words));
  }
  return { hits, cut };
};

/* The library searched from scratch: the index built and asked in one breath. The
   views keep an index and ask it; this is for a one-off ask and for the tests. */
export const search = (query: string, corpora: readonly Corpus[], filter: Filter): Found => find(query, buildIndex(corpora), filter);
