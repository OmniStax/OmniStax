/* The index the search asks. Every thing a book holds — a concept, a symbol, a
   form, a block of prose — is one entry, and every word of it points
   at that entry, so a query is answered by looking words up rather than by
   reading the library again at each keystroke. The words of a block come off
   the build (search.json carries a page's dictionary); everything else is cut
   here, once, when the books arrive. A query's words are prefixes: "per" finds
   period, "period" does not find hyperbola. The entries are laid out kind by
   kind and book by book in the order the list wants them, so the hits of a
   query, taken in the order they were built, are already ranked. Pure. */
import type { ConceptDTO, FormDTO, VariableDTO } from '../content/schema';
import { tokensOf, unpackToks, type TextBlockDTO, type TextPageDTO } from '../content/textindex';
import { conceptText, excerpt, formText, symbolText, wordsOf, type Corpus, type Filter, type Hit, type SearchKind } from './model';

/* One thing the index holds, with the book it belongs to. An entry becomes a hit
   as it is found; a block of prose gets its marked window only then. */
type Entry =
  | { readonly kind: 'concept'; readonly book: string; readonly concept: ConceptDTO; readonly also: string }
  | { readonly kind: 'definition'; readonly book: string; readonly symbol: VariableDTO }
  | { readonly kind: 'formula'; readonly book: string; readonly form: FormDTO; readonly concept: ConceptDTO }
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

/* A concept is found by the words that name it in the book's tables as well
   as its own, the symbols of its quantity and the glossary's terms for it, and
   a form by the name of the concept it states. Every concept's main form comes
   before any concept's other forms. */
const symbolsOf = (c: Corpus): ReadonlyMap<string, string> =>
  c.variables.reduce((m, v) => (v.concept ? m.set(v.concept, `${m.get(v.concept) ?? ''} ${v.sym}`) : m), new Map<string, string>());
const namedOf = (corpora: readonly Corpus[]): Entry[] => [
  ...corpora.flatMap((c) => { const syms = symbolsOf(c); return c.concepts.map((concept): Entry => ({ kind: 'concept', book: c.book, concept, also: `${syms.get(concept.id) ?? ''} ${concept.terms.join(' ')}` })); }),
  ...corpora.flatMap((c) => c.variables.map((symbol): Entry => ({ kind: 'definition', book: c.book, symbol }))),
  ...[0, 1].flatMap((extra) => corpora.flatMap((c) => c.concepts.flatMap((concept) =>
    (extra ? concept.forms.slice(1) : concept.forms.slice(0, 1)).map((form): Entry => ({ kind: 'formula', book: c.book, form, concept }))))),
];
const proseOf = (corpora: readonly Corpus[]): Entry[] =>
  corpora.flatMap((c) => c.pages.flatMap((page) => page.blocks.map((block): Entry => ({ kind: 'text', book: c.book, page, block }))));

const wordsIn = (e: Entry): readonly string[] =>
  e.kind === 'text' ? blockTokens(e.page, e.block)
    : tokensOf(e.kind === 'concept' ? `${conceptText(e.concept)} ${e.also}`
      : e.kind === 'formula' ? `${formText(e.form)} ${e.concept.name}`
        : symbolText(e.symbol));

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
  e.kind === 'text' ? { kind: 'text', book: e.book, page: e.page, span: e.block.span, head: e.block.head, text: e.block.text, excerpt: excerpt(e.block.text, words) }
    : e.kind === 'concept' ? { kind: 'concept', book: e.book, concept: e.concept } : e;

/* How a thing ranks among the others of its kind that a query found: the
   thing named by exactly the query first, then the one whose name and the
   query hold the same words one within the other, then the one holding every
   word of the query whole rather than as the opening of a longer word. */
const nameOf = (e: Entry): string =>
  e.kind === 'concept' ? e.concept.name : e.kind === 'formula' ? e.form.id : e.kind === 'definition' ? e.symbol.sym : '';
const closeness = (e: Entry, words: readonly string[]): number => {
  if (e.kind === 'text') return 3;
  const name = tokensOf(nameOf(e)); const has = (ws: readonly string[]) => (w: string) => ws.includes(w);
  if (name.join(' ') === words.join(' ')) return 0;
  if (name.length && (name.every(has(words)) || words.every(has(name)))) return 1;
  return words.every(has(wordsIn(e))) ? 2 : 3;
};
const KIND_ORDER: Readonly<Record<SearchKind, number>> = { concept: 0, definition: 1, formula: 2, text: 3 };

/* Words a question is phrased with rather than about, dropped from a loose
   query so that "the definition of work" asks after definition and work. */
const STOP = new Set(['a', 'an', 'the', 'of', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'by', 'with', 'is', 'are', 'was', 'be', 'what', 'which', 'how', 'why', 'does', 'do', 'about']);
const looseWords = (words: readonly string[]): readonly string[] => { const kept = words.filter((w) => !STOP.has(w)); return kept.length ? kept : words; };

/* Every entry holding any word of the query, with how many of the words it holds. */
const matchingAny = (ix: Index, words: readonly string[], upto: number): ReadonlyMap<number, number> =>
  words.reduce((got, w) => { for (const id of matching(ix, w, upto)) got.set(id, (got.get(id) ?? 0) + 1); return got; }, new Map<number, number>());

/* Everything the query finds: the things the books name first, kind by kind,
   the nearest of each kind first and each kind cut at its cap, the prose after
   them, and how many blocks of prose were found beyond the cap. A query of one
   letter does not go through the prose. `keep` sifts the hits before they are
   counted against the cap. A loose query, the kind a question is asked in,
   drops its function words and, where no one thing holds every word left,
   takes what holds any of them, those holding more first. */
export type Found = { readonly hits: readonly Hit[]; readonly cut: number };
export type FindOptions = { readonly keep?: (h: Hit) => boolean; readonly loose?: boolean };
export const NOTHING: Found = { hits: [], cut: 0 };
/* The hits among the entries held, each with how many words of the query it holds. */
const take = (ix: Index, held: ReadonlyMap<number, number>, words: readonly string[], filter: Filter, want: (k: SearchKind) => boolean, keepHit?: (h: Hit) => boolean): Found => {
  const key = (id: number): readonly number[] => { const e = ix.entries[id]; return [KIND_ORDER[e.kind], -(held.get(id) ?? 0), closeness(e, words), id]; };
  const before = (a: readonly number[], b: readonly number[]): number => { const i = a.findIndex((x, k) => x !== b[k]); return i < 0 ? 0 : a[i] - b[i]; };
  const ids = [...held.keys()].map((id) => ({ id, k: key(id) })).sort((a, b) => before(a.k, b.k)).map((x) => x.id);
  const cap = filter === 'text' ? TEXT_CAP.text : TEXT_CAP.all;
  const count: Partial<Record<SearchKind, number>> = {};
  const hits: Hit[] = [];
  let cut = 0;
  for (const id of ids) {
    const e = ix.entries[id];
    if (!want(e.kind)) continue;
    const hit = keepHit ? hitOf(e, words) : null;
    if (hit && keepHit && !keepHit(hit)) continue;
    const n = (count[e.kind] ?? 0) + 1;
    count[e.kind] = n;
    if (n > (e.kind === 'text' ? cap : KIND_CAP)) { if (e.kind === 'text') cut += 1; continue; }
    hits.push(hit ?? hitOf(e, words));
  }
  return { hits, cut };
};

export const find = (query: string, ix: Index, filter: Filter, opts: FindOptions = {}): Found => {
  const words = opts.loose ? looseWords(wordsOf(query)) : wordsOf(query);
  if (!words.length || !ix.entries.length) return NOTHING;
  const deep = query.trim().length >= MIN_TEXT;
  const want = (k: SearchKind): boolean => (k === 'text' ? deep && (filter === 'all' || filter === 'text') : filter === 'all' || filter === k);
  /* where to stop looking: at the prose where none of it is wanted, and a query
     that wants only the prose still starts there, the named entries thrown away below */
  const upto = want('text') ? ix.entries.length : ix.prose;
  /* the narrowest word of the query goes first: what it finds is what the rest sift */
  const [seed, ...rest] = [...words].sort((a, b) => weight(ix, a) - weight(ix, b));
  const every = rest.reduce((acc, w) => (acc.length ? keep(ix, acc, w, upto) : acc), matching(ix, seed, upto));
  const found = take(ix, new Map(every.map((id) => [id, words.length])), words, filter, want, opts.keep);
  return found.hits.length || !opts.loose || words.length < 2 ? found : take(ix, matchingAny(ix, words, upto), words, filter, want, opts.keep);
};

/* The library searched from scratch: the index built and asked in one breath. The
   views keep an index and ask it; this is for a one-off ask and for the tests. */
export const search = (query: string, corpora: readonly Corpus[], filter: Filter, opts: FindOptions = {}): Found => find(query, buildIndex(corpora), filter, opts);
