/* A word takes its category's colour wherever it names a concept of that
   category (rule 7.4): the build marks every mention <span data-type="…"> in
   the prose the reader sees, as a pure transform of the rendered HTML. The
   words are the concepts' names and glossary terms, matched whole and longest
   first, with a plural and a possessive. The scan is the tag-splitting walk
   the build already uses for figure references (content/fragment.ts), and it
   never enters rendered math, a heading or eyebrow, a link, code, a subscript,
   or a span the author marked as a type, a referent or ink. */
import type { ConceptRowDTO } from './schema';
import type { TypeId } from '../types/ids';

/* One word of a phrase as the scan compares it: lower case, every apostrophe straight. */
type Word = string;
/* A concept's word as a run of words, and the type it wears: null for an untyped
   concept's word, which is matched only so that a typed word inside it ("kinetic
   friction" in "coefficient of kinetic friction") stays ink with the phrase it belongs to. */
type Phrase = { readonly words: readonly Word[]; readonly key: string; readonly type: TypeId | null };
/* Two concepts of different types sharing a word: the earlier in the book's table wins. */
export type WordConflict = { readonly word: string; readonly chosen: TypeId; readonly concepts: readonly { readonly id: string; readonly type: TypeId }[] };
/* Every phrase, under each of its first words, longest first. */
export type WordIndex = { readonly byFirst: ReadonlyMap<Word, readonly Phrase[]>; readonly conflicts: readonly WordConflict[] };

/* ---------- the words of a concept ---------- */

const WORD = /&#?\w+;|[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*['’]?/gu;
const isEntity = (s: string): boolean => s.startsWith('&');
const fold = (w: string): Word => w.toLowerCase().replace(/’/g, "'");

/* "potential difference (or voltage)" is two words, "frequency (ν)" one: a trailing
   parenthesis is cut off, and kept as a word of its own where it offers one with "or". */
export const wordsOfLabel = (label: string): readonly string[] => {
  const m = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(label);
  if (!m) return [label.trim()];
  const alt = /^or\s+(.+)$/i.exec(m[2].trim());
  return alt ? [m[1].trim(), alt[1].trim()] : [m[1].trim()];
};
const letters = (s: string): number => (s.match(/\p{L}/gu) ?? []).length;
/* Long enough to be a word and not a symbol: three letters, or a short word in mixed case such as pH. */
const wordLike = (s: string): boolean => /^[\p{L}\p{N}\s'’-]+$/u.test(s) && (letters(s) >= 3 || /\p{Ll}\p{Lu}/u.test(s));
const phraseWords = (s: string): readonly Word[] => Array.from(s.matchAll(WORD), (m) => m[0]).filter((w) => !isEntity(w)).map(fold);

type Entry = { readonly key: string; readonly words: readonly Word[]; readonly id: string; readonly type: TypeId | null };
const entriesOf = (c: ConceptRowDTO): readonly Entry[] =>
  [...new Set([c.name, ...c.terms].flatMap(wordsOfLabel).filter(wordLike))].map((w) => phraseWords(w))
    .filter((ws) => ws.length > 0)
    .map((ws) => ({ key: ws.join(' '), words: ws, id: c.id, type: c.type ?? null }));

const group = <T>(xs: readonly T[], keyOf: (x: T) => string): ReadonlyMap<string, readonly T[]> =>
  xs.reduce((m, x) => m.set(keyOf(x), [...(m.get(keyOf(x)) ?? []), x]), new Map<string, T[]>());

const typedOf = (es: readonly Entry[]): readonly (Entry & { readonly type: TypeId })[] => es.filter((e): e is Entry & { readonly type: TypeId } => e.type !== null);
/* A typed word wins over an untyped one; among typed ones, the first concept of the table. */
const resolve = (es: readonly Entry[]): Phrase => {
  const typed = typedOf(es);
  return { words: es[0].words, key: es[0].key, type: typed[0]?.type ?? null };
};
const conflictOf = (key: string, es: readonly Entry[]): readonly WordConflict[] => {
  const typed = typedOf(es);
  return new Set(typed.map((e) => e.type)).size > 1 ? [{ word: key, chosen: typed[0].type, concepts: typed.map((e) => ({ id: e.id, type: e.type })) }] : [];
};
const longestFirst = (a: Phrase, b: Phrase): number => b.words.length - a.words.length || b.key.length - a.key.length;

/* The book's index, built once: every concept's words, the typed and the untyped. */
export const wordIndex = (concepts: readonly ConceptRowDTO[]): WordIndex => {
  const byKey = group(concepts.flatMap(entriesOf), (e) => e.key);
  const phrases = [...byKey.values()].map(resolve);
  const byFirst = new Map([...group(phrases, (p) => p.words[0])].map(([w, ps]) => [w, [...ps].sort(longestFirst)] as const));
  return { byFirst, conflicts: [...byKey].flatMap(([key, es]) => conflictOf(key, es)) };
};

/* ---------- matching a run of text ---------- */

/* A word of the text with where it stands in its run. */
type Found = { readonly text: string; readonly at: number; readonly end: number };
/* One mention: where it stands in its run of text, the type it wears, and the concept word it matched. */
export type Mark = { readonly from: number; readonly to: number; readonly type: TypeId; readonly phrase: string };

/* Plurals that never name the singular's quantity: "three times the speed". */
const NOT_PLURALS: ReadonlySet<Word> = new Set(['times']);
/* What a word of the text may stand for as the last word of a phrase: itself, without a possessive, and singular. */
const lastForms = (w: string): ReadonlySet<Word> => {
  const l = fold(w);
  const base = l.replace(/'s$|'$/, '');
  if (NOT_PLURALS.has(base)) return new Set([l, base]);
  return new Set([l, base, ...(base.endsWith('ies') ? [`${base.slice(0, -3)}y`] : []), ...(base.endsWith('es') ? [base.slice(0, -2)] : []), ...(base.endsWith('s') ? [base.slice(0, -1)] : [])]);
};
const GAP = /^(?:\s|&nbsp;|&#160;)+$/;
const matches = (p: Phrase, ws: readonly Found[], i: number, run: string): boolean => {
  const n = p.words.length;
  if (i + n > ws.length) return false;
  const last = n - 1;
  return p.words.every((w, j) =>
    (j === 0 || GAP.test(run.slice(ws[i + j - 1].end, ws[i + j].at)))
    && (j === last ? lastForms(ws[i + j].text).has(w) : fold(ws[i + j].text) === w));
};
const candidates = (index: WordIndex, w: Found): readonly Phrase[] =>
  [...new Set([fold(w.text), ...lastForms(w.text)])].flatMap((k) => index.byFirst.get(k) ?? []).sort(longestFirst);

/* Every mention in one run of text, left to right, each the longest phrase that starts where it does. */
export const marksOf = (index: WordIndex, run: string): readonly Mark[] => {
  const ws: readonly Found[] = Array.from(run.matchAll(WORD), (m) => ({ text: m[0], at: m.index, end: m.index + m[0].length })).filter((w) => !isEntity(w.text));
  const step = (i: number, out: readonly Mark[]): readonly Mark[] => {
    if (i >= ws.length) return out;
    const p = candidates(index, ws[i]).find((c) => matches(c, ws, i, run));
    if (!p) return step(i + 1, out);
    const next = i + p.words.length;
    return step(next, p.type === null ? out : [...out, { from: ws[i].at, to: ws[next - 1].end, type: p.type, phrase: p.key }]);
  };
  return step(0, []);
};

/* ---------- walking the HTML ---------- */

type Token = string;
const tokens = (html: string): readonly Token[] => html.split(/(<[^>]+>)/).filter((t) => t !== '');
const isTag = (t: Token): boolean => t.startsWith('<');
const tagName = (t: Token): string => /^<\/?([a-zA-Z][\w-]*)/.exec(t)?.[1]?.toLowerCase() ?? '';
const closes = (t: Token): boolean => t.startsWith('</');
const VOID = new Set(['img', 'br', 'hr', 'input', 'wbr', 'col', 'source', 'meta', 'link', 'area', 'embed', 'track', 'param', 'base']);
const opens = (t: Token): boolean => isTag(t) && !closes(t) && !t.endsWith('/>') && !t.startsWith('<!') && !VOID.has(tagName(t));

const UNSEEN = new Set(['script', 'style', 'math']);
const SKIPPED = new Set(['a', 'code', 'pre', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'sub', 'sup', 'svg', 'canvas', 'button', 'select', 'textarea', ...UNSEEN]);
const classed = (t: Token, c: RegExp): boolean => c.test(/\bclass="([^"]*)"/.exec(t)?.[1] ?? '');
const isMath = (t: Token): boolean => UNSEEN.has(tagName(t)) || classed(t, /(^|\s)katex/);
/* An element whose words are never marked: rendered math, a heading or an eyebrow, a link, code,
   a figure's own controls, and a span the author already marked as a type, a referent or ink. */
const skips = (t: Token): boolean =>
  SKIPPED.has(tagName(t)) || isMath(t) || classed(t, /(^|\s)(eyebrow|note-title|controls)(\s|$)/) || /\sdata-(type|ref|ink)\b/.test(t);

/* One token of the page: a tag, or a run of text with the mentions it holds;
   `seen` is false inside rendered math, whose text the reader never reads as prose. */
export type Piece = { readonly html: string; readonly text: boolean; readonly seen: boolean; readonly marks: readonly Mark[] };
/* The element a skipped run sits in: its tag name, how deep the same tag nests inside it, and whether it is math. */
type Shut = { readonly name: string; readonly depth: number; readonly math: boolean };

const enter = (shut: Shut | null, t: Token): Shut | null => {
  if (!isTag(t)) return shut;
  if (shut === null) return opens(t) && skips(t) ? { name: tagName(t), depth: 1, math: isMath(t) } : null;
  if (tagName(t) !== shut.name) return shut;
  const depth = shut.depth + (closes(t) ? -1 : opens(t) ? 1 : 0);
  return depth === 0 ? null : { ...shut, depth };
};
const pieceOf = (index: WordIndex, t: Token, shut: Shut | null): Piece =>
  (isTag(t) ? { html: t, text: false, seen: true, marks: [] }
    : { html: t, text: true, seen: !shut?.math, marks: shut === null ? marksOf(index, t) : [] });

/* The page as pieces, each run of text with the mentions it holds. */
export const piecesOf = (index: WordIndex, html: string): readonly Piece[] => {
  let shut: Shut | null = null;
  return tokens(html).map((t) => {
    const piece = pieceOf(index, t, shut);
    shut = enter(shut, t);
    return piece;
  });
};

const spanned = (p: Piece): string =>
  p.marks.reduceRight((s, m) => `${s.slice(0, m.from)}<span data-type="${m.type}">${s.slice(m.from, m.to)}</span>${s.slice(m.to)}`, p.html);

/* The HTML with every mention of a typed concept's word marked as its type. Running it twice changes nothing. */
export const markTypeWords = (index: WordIndex, html: string): string =>
  (html === '' ? html : piecesOf(index, html).map(spanned).join(''));
