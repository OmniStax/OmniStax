/* The colour rules a book wears: which classes the type colours reach, under
   the book's own attribute. A category is coloured on every page. They go into
   the book's colours.css at build time, one link per book in use. */
import type { BookManifest } from '../content/schema';

/* Types follow the reader's Concepts switch: with it off every quantity reads in
   ink, and the sliders that stand for a quantity wear its hue only while it is on.
   A run of words the text marks <span data-type> wears its type exactly as a symbol does. */
const typeRules = (m: BookManifest, book: string): string =>
  Object.keys(m.types)
    .map((k) => `${book} .kv-${k}{color:var(--c-${k})} ${book} [data-type="${k}"]{color:var(--c-${k})} html:not(.cc-concepts) ${book} .kv-${k}{color:inherit} html:not(.cc-concepts) ${book} [data-type="${k}"]{color:inherit} html.cc-concepts ${book} .s-${k}::-webkit-slider-thumb{background:var(--c-${k})} html.cc-concepts ${book} .s-${k}::-moz-range-thumb{background:var(--c-${k})}`)
    .join('\n');

const bookScope = (m: BookManifest): string => `[data-book="${m.id}"]`;
export const bookRulesCss = (m: BookManifest): string => typeRules(m, bookScope(m));
/* The book's stylesheet: its scheme's tokens and these rules together. */
export const bookColoursHref = (book: string): string => `/${book}/colours.css`;
