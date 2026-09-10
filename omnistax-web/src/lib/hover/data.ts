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
