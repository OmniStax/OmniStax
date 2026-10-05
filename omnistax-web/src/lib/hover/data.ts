/* The data layer under a symbol popover. A coloured symbol in rendered math is
   <span class="enclosing kv-<type>"><span class="enclosing" data-sym="<key>">…</span></span>:
   the outer span carries the type (the hue), the inner one the key into the book's
   symbol table, which is also the `sym` of a chapter's variables. These helpers walk
   from a hovered node to those two spans and from a key to its variable. Pure; no
   state, no DOM beyond the element handed in. */
import type { VariableDTO } from '../content/schema';

export type SymKey = string & { readonly __brand: 'SymKey' };   /* a key of book.json `symbols`, e.g. "Δx", "F_app" */
export type KvType = string;                                     /* a key of book.json `types`, e.g. "position", "angular-rate" */
export const symKey = (s: string): SymKey => s as SymKey;

const SYM_ATTR = 'data-sym';
const KV_CLASS = /(?:^|\s)kv-([\w-]+)(?=\s|$)/;

/* The type named by a class list ("enclosing kv-position" → "position"); null when it names none. */
export const kvTypeFromClass = (className: string): KvType | null => KV_CLASS.exec(className)?.[1] ?? null;

const classOf = (el: Element): string => el.getAttribute('class') ?? '';
const ancestors = function* (el: Element): Generator<Element> { for (let n: Element | null = el; n; n = n.parentElement) yield n; };

/* The nearest .kv-* wrapper at or above the element: the span to underline. */
export const glyphOf = (el: Element): Element | null => {
  for (const n of ancestors(el)) if (kvTypeFromClass(classOf(n)) !== null) return n;
  return null;
};
/* The symbol key at or above the element, or null when the hover is not on a symbol. */
export const symOf = (el: Element): SymKey | null => {
  const sym = el.closest(`[${SYM_ATTR}]`)?.getAttribute(SYM_ATTR);
  return sym ? symKey(sym) : null;
};
/* The type of the symbol at or above the element. */
export const typeOf = (el: Element): KvType | null => {
  const glyph = glyphOf(el);
  return glyph ? kvTypeFromClass(classOf(glyph)) : null;
};

/* The variable a key names. A chapter may define one symbol per section (x in 2.1 and again in 2.5);
   the one from `section` wins when given, else the first. */
export const lookupVariable = (vars: readonly VariableDTO[], sym: SymKey, section?: string): VariableDTO | undefined =>
  (section !== undefined ? vars.find((v) => v.sym === sym && v.section === section) : undefined) ?? vars.find((v) => v.sym === sym);

/* What a hovered symbol opens: the concept its row names, where the row names
   one the book has, else the row alone, which is a symbol that names no concept. */
export type SymbolTarget<C> = { readonly kind: 'concept'; readonly concept: C; readonly variable: VariableDTO } | { readonly kind: 'row'; readonly variable?: VariableDTO };
export const symbolTarget = <C,>(vars: readonly VariableDTO[], sym: SymKey, section: string, conceptOf: (id: string) => C | undefined): SymbolTarget<C> => {
  const variable = lookupVariable(vars, sym, section);
  const concept = variable?.concept === undefined ? undefined : conceptOf(variable.concept);
  return variable && concept !== undefined ? { kind: 'concept', concept, variable } : { kind: 'row', variable };
};

/* Whether two rows of one symbol name different quantities. Every section words
   its row afresh, so the test is not equality: rows of different types differ,
   and rows of one type differ when their meanings share almost no content word
   (R as resultant and as range; W' as the Otto cycle's output and as the heat
   pump's input). A heuristic, tuned on both books to flag real redefinitions. */
const STOP = new Set('the and for from with its that which this into than then over under when where what whose their there these those been being'.split(' '));
const contentWords = (meaning: string): ReadonlySet<string> =>
  new Set((meaning.toLowerCase().match(/[a-z]+/g) ?? []).filter((w) => w.length >= 4 && !STOP.has(w)).map((w) => w.replace(/s$/, '')));
const OVERLAP = 0.15;
export const differentMeaning = (a: VariableDTO, b: VariableDTO): boolean => {
  if ((a.type ?? '') !== (b.type ?? '')) return true;
  const [x, y] = [contentWords(a.meaning), contentWords(b.meaning)];
  const shared = [...x].filter((w) => y.has(w)).length;
  return shared / Math.max(1, Math.min(x.size, y.size)) < OVERLAP;
};

/* The rows elsewhere in the chapter that give `sym` another meaning than the row of `section`. */
export const otherMeanings = (vars: readonly VariableDTO[], sym: SymKey, section: string): readonly VariableDTO[] => {
  const own = vars.find((v) => v.sym === sym && v.section === section);
  return own ? vars.filter((v) => v.sym === sym && v.section !== section && differentMeaning(own, v)) : [];
};

/* Pairs of rows in one chapter that give one symbol two meanings, unless the later
   row says `redefines`: the book itself reuses the symbol and the row was written to stand alone. */
export const unmarkedRedefinitions = (vars: readonly VariableDTO[]): readonly (readonly [VariableDTO, VariableDTO])[] =>
  vars.flatMap((b, j) => vars.slice(0, j).filter((a) => a.sym === b.sym && !b.redefines && differentMeaning(a, b)).map((a) => [a, b] as const));
