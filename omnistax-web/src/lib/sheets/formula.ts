/* The chemical formulas of a book's prose, found and read.

   By analogy with a language server, the gestures are the app's and the tokens
   are the book's: physics declares typed symbols and chemistry declares element
   symbols and formulas, so this file is the chemistry side of "what counts as a
   token". It is pure — HTML in, HTML out, and a formula in, its composition out
   — and it runs at runtime, in the same pass that marks glossary terms, for
   three reasons: the table a symbol must resolve against is the book's elements
   sheet, which is data the build has no reason to fold into every page; the
   prose a formula stands in is already being walked for terms and example
   references, so one scan does both; and a reader who turns the layer off gets
   a page with nothing extra in it.

   A formula is a run of text whose every symbol is an element: H<sub>2</sub>O,
   Ca(OH)<sub>2</sub>, SO<sub>4</sub><sup>2−</sup>, CuSO<sub>4</sub>·5H<sub>2</sub>O.
   The run may reach through <sub> and <sup> elements, which is why the scan
   flattens a block into one line with the subscripts written {2} and the
   superscripts [2−] before it parses: a match then begins and ends either
   inside a text run or exactly at an element boundary, and the wrapper can be
   spliced back in without touching the markup between. */
import { type Context, type Token, IN_BLOCK, contexts, tokens, wrappable } from '../hover/terms';

/* An element's symbol as the table writes it, which is the key the sheet is read by. */
export type ElementSymbol = string & { readonly __brand: 'ElementSymbol' };
export const elementSymbol = (s: string): ElementSymbol => s as ElementSymbol;
/* A formula as it is written in the prose, flattened to one line: "H2O", "CuSO4·5H2O". */
export type Formula = string & { readonly __brand: 'Formula' };
/* How many atoms of each element one formula unit has, in the order the formula writes them. */
export type Composition = readonly { readonly symbol: ElementSymbol; readonly count: number }[];
/* What the table can say about an element, which is all the recogniser and the card need of the sheet. */
export type ElementTable = ReadonlyMap<ElementSymbol, { readonly name: string; readonly weight: number }>;

/* ---------- the flattened line ---------- */

/* The characters the flattening uses for a subscript and a superscript. A
   literal one in the prose is blanked, so that nothing in the text can be read
   as a subscript that is not one. */
const SUB_OPEN = '{', SUB_CLOSE = '}', SUP_OPEN = '[', SUP_CLOSE = ']';
const RESERVED = /[{}[\]\u0000]/g;
const BREAK = '\u0000';                                    /* a tag that is neither sub nor sup: nothing may be read across it */
const DOT = /[·⋅∙]/;                        /* the dot of a hydrate, however the text writes it */
const MINUS = /[-−–]/;                           /* the minus of a charge */

/* One piece of the flattened line and where it came from. */
type Piece = { readonly token: number; readonly at: number; readonly tag: boolean; readonly raw: number };
type Flat = { readonly line: string; readonly pieces: readonly Piece[] };

const tagName = (t: Token): string => /^<\/?([a-zA-Z][\w-]*)/.exec(t)?.[1]?.toLowerCase() ?? '';
const isTag = (t: Token): boolean => t.startsWith('<');

/* A block's tokens as one line: text as it is written, a <sub> as {…}, a <sup>
   as […], and anything else as a break nothing may be read across. A token that
   may not be marked up at all — inside a link, a heading, rendered math — is a
   break too, so no formula is ever found there. */
const flatten = (ts: readonly Token[], cs: readonly Context[]): Flat => {
  const pieces: Piece[] = [];
  let line = '';
  const push = (token: number, tag: boolean, raw: number, text: string): void => { pieces.push({ token, at: line.length, tag, raw }); line += text; };
  ts.forEach((t, i) => {
    if (!isTag(t)) { push(i, false, t.length, wrappable(cs[i]) ? t.replace(RESERVED, BREAK) : BREAK.repeat(t.length)); return; }
    const name = tagName(t), close = t.startsWith('</');
    const mark = name === 'sub' ? (close ? SUB_CLOSE : SUB_OPEN) : name === 'sup' ? (close ? SUP_CLOSE : SUP_OPEN) : BREAK;
    push(i, true, t.length, mark);
  });
  return { line, pieces };
};
/* Which token a place in the line lies in, and how far into it. A text token
   keeps its offsets, since the flattening is one character for one character;
   a tag stands for one mark, so a place inside it is either before it or after
   it and never in the middle. */
const placeOf = (flat: Flat, at: number): { readonly token: number; readonly offset: number } => {
  const p = [...flat.pieces].reverse().find((x) => x.at <= at) ?? flat.pieces[0];
  const into = at - p.at;
  return { token: p.token, offset: p.tag ? (into > 0 ? p.raw : 0) : into };
};

/* ---------- the grammar ---------- */

/* A parse that got somewhere: how far it read and what it found. */
type Parsed = { readonly end: number; readonly atoms: Composition };
const SYMBOL = /^[A-Z][a-z]{0,2}/;
const add = (atoms: Composition, more: Composition, times: number): Composition => [...atoms, ...more.map((a) => ({ ...a, count: a.count * times }))];

/* The count that follows a symbol or a group, whether the text sets it as a
   subscript or writes it on the line; one where the formula writes none. */
const COUNT = /^(?:\{(\d+)\}|(\d+))/;
const count = (line: string, at: number): { readonly n: number; readonly end: number } => {
  const m = COUNT.exec(line.slice(at));
  return m ? { n: Number(m[1] ?? m[2]), end: at + m[0].length } : { n: 1, end: at };
};

/* One part: an element symbol the table names, or a bracketed group, each with
   the count that may follow it. The longest symbol wins, so "Cl" is chlorine
   and not carbon followed by a stray letter. */
const part = (line: string, at: number, table: ElementTable): Parsed | null => {
  if (line[at] === '(') {
    const inner = group(line, at + 1, table);
    if (!inner || line[inner.end] !== ')') return null;
    const c = count(line, inner.end + 1);
    return { end: c.end, atoms: add([], inner.atoms, c.n) };
  }
  const m = SYMBOL.exec(line.slice(at));
  if (!m) return null;
  for (let len = m[0].length; len >= 1; len--) {
    const sym = elementSymbol(m[0].slice(0, len));
    if (!table.has(sym)) continue;
    const c = count(line, at + len);
    return { end: c.end, atoms: [{ symbol: sym, count: c.n }] };
  }
  return null;
};
/* A run of parts, which is what a formula unit and a bracketed group both are. */
const group = (line: string, at: number, table: ElementTable): Parsed | null => {
  let end = at, atoms: Composition = [];
  for (;;) {
    const p = part(line, end, table);
    if (!p) break;
    end = p.end; atoms = add(atoms, p.atoms, 1);
  }
  return atoms.length === 0 ? null : { end, atoms };
};
/* The charge a superscript writes, "[2−]" or "[+]", which ends a formula unit. */
const charge = (line: string, at: number): number => {
  const m = /^\[(\d*)([^\]]?)\]/.exec(line.slice(at));
  return m && (m[2] === '+' || MINUS.test(m[2])) ? m[0].length : 0;
};
/* The state a formula may close on, "(aq)". */
const state = (line: string, at: number): number => (/^\((?:s|l|g|aq)\)/.exec(line.slice(at))?.[0].length ?? 0);

/* One whole formula from a place in the line: its units, the hydrate dots
   between them and the multiplier each may carry. */
const formulaAt = (line: string, at: number, table: ElementTable): Parsed | null => {
  let end = at, atoms: Composition = [], units = 0;
  for (;;) {
    const times = /^\d+/.exec(line.slice(end));
    const start = end + (units > 0 && times ? times[0].length : 0);
    const g = group(line, start, table);
    if (!g) break;
    atoms = add(atoms, g.atoms, units > 0 && times ? Number(times[0]) : 1);
    end = g.end + charge(line, g.end); units += 1;
    if (!DOT.test(line[end] ?? '')) break;
    end += 1;
  }
  if (units === 0) return null;
  return { end: end + state(line, end), atoms };
};

/* ---------- what counts, and what does not ---------- */

/* A run written entirely in capitals with no count, no charge and no group is
   as likely to be a word, an abbreviation or a roman numeral as a compound —
   "IT", "PV", "FCV", "mercury(II) oxide" — so only the handful that a chemistry
   text really does write that way are let through. Anything with a subscript, a
   charge or a bracket is a formula on the strength of that, and any formula
   with a lowercase letter in a symbol ("NaCl", "HCl") was never in doubt. */
const CAPS = /^[A-Z]+$/;
const CAPS_FORMULAS: ReadonlySet<string> = new Set(['CO', 'NO', 'HF', 'HI', 'HCN', 'CN', 'OH', 'NH']);
const LETTER = /[A-Za-z]/;
/* The plain text of a match: the line with the subscript and superscript marks taken out. */
export const plainOf = (run: string): Formula => run.replace(/[{}[\]]/g, '') as Formula;

/* Whether a run of the line is a formula the app should mark. A run must end
   where a word ends; a bare symbol is never one, since a lone V is a volume and
   a lone T a temperature in every book that has both; and a run in capitals
   alone is a word unless the app knows it as a compound. */
const counts = (line: string, at: number, p: Parsed): boolean => {
  const before = line[at - 1] ?? ' ', after = line[p.end] ?? ' ';
  if (LETTER.test(before) || /[A-Za-z0-9]/.test(after)) return false;
  const run = line.slice(at, p.end), plain = plainOf(run);
  const marked = /[{[]/.test(run);
  if (!marked && p.atoms.length === 1 && p.atoms[0].count === 1) return false;
  return marked || !CAPS.test(plain) || CAPS_FORMULAS.has(plain);
};

/* ---------- marking up a block ---------- */

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
/* The composition as one attribute: "H:2,O:1", which the card reads back rather than parsing the formula again. */
export const compositionAttr = (atoms: Composition): string => atoms.map((a) => `${a.symbol}:${a.count}`).join(',');
export const parseComposition = (s: string): Composition =>
  s.split(',').flatMap((p) => { const [sym, n] = p.split(':'); return sym ? [{ symbol: elementSymbol(sym), count: Number(n) || 1 }] : []; });

/* One formula found in a block: where it is and what it holds. */
export type Found = { readonly at: number; readonly end: number; readonly formula: Formula; readonly atoms: Composition };
/* Every formula of a flattened line, left to right and never overlapping. */
export const findFormulas = (line: string, table: ElementTable): readonly Found[] => {
  const out: Found[] = [];
  for (let at = 0; at < line.length; at++) {
    if (!/[A-Z]/.test(line[at])) continue;
    const p = formulaAt(line, at, table);
    if (!p || !counts(line, at, p)) continue;
    out.push({ at, end: p.end, formula: plainOf(line.slice(at, p.end)), atoms: p.atoms });
    at = p.end - 1;
  }
  return out;
};

const OPEN = (f: Found): string => `<span class="formula" data-formula="${esc(f.formula)}" data-composition="${esc(compositionAttr(f.atoms))}" tabindex="0">`;

/* The block's HTML with every formula wrapped. The splices are applied from the
   end backwards, so that an earlier one never moves a later one. */
export const wrapFormulas = (html: string, table: ElementTable, start: Context = IN_BLOCK): string => {
  if (table.size === 0 || html.includes('data-formula=')) return html;
  const ts = tokens(html);
  const flat = flatten(ts, contexts(ts, start));
  const found = findFormulas(flat.line, table);
  if (found.length === 0) return html;
  const out = [...ts];
  [...found].reverse().forEach((f) => {
    const a = placeOf(flat, f.at), b = placeOf(flat, f.end);
    out[b.token] = out[b.token].slice(0, b.offset) + '</span>' + out[b.token].slice(b.offset);
    out[a.token] = out[a.token].slice(0, a.offset) + OPEN(f) + out[a.token].slice(a.offset);
  });
  return out.join('');
};

/* ---------- what a card says ---------- */

/* The molar mass of a composition, and the arithmetic behind it on one line.
   Nothing is said where the table does not name every element of the formula. */
export type MolarMass = { readonly total: number; readonly working: string };
/* Four significant figures, the style the weights are written in, with a trailing zero dropped. */
const round = (n: number): string => Number(n.toPrecision(4)).toString();
export const molarMass = (atoms: Composition, table: ElementTable): MolarMass | null => {
  const rows = atoms.map((a) => ({ ...a, weight: table.get(a.symbol)?.weight }));
  if (rows.some((r) => r.weight === undefined)) return null;
  const total = rows.reduce((sum, r) => sum + r.count * (r.weight ?? 0), 0);
  const terms = rows.map((r) => (r.count === 1 ? `${r.weight}` : `${r.count} × ${r.weight}`));
  return { total, working: `${terms.join(' + ')} = ${round(total)} g/mol` };
};
