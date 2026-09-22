/* The colour rules a book wears: which classes the type colours reach, and
   which pages hold them back. They go into the book's colours.css at build
   time, and the shell links another book's when the reader walks into it
   without leaving the app. */
import type { BookManifest } from '../content/schema';
import { bookPagesOf } from '../content/roles';

/* Colour coding is a switch: with it off every quantity reads in ink, and the
   sliders that stand for a quantity wear its hue only while it is on. */
const typeRules = (m: BookManifest): string =>
  Object.keys(m.types)
    .map((k) => `.kv-${k}{color:var(--c-${k})} html:not(.cc) .kv-${k}{color:inherit} html.cc .s-${k}::-webkit-slider-thumb{background:var(--c-${k})} html.cc .s-${k}::-moz-range-thumb{background:var(--c-${k})}`)
    .join('\n');

/* A page colours only what it draws (rule: a page binds what it needs), so the
   types it does not bind read in ink on it. A page that binds nothing at all
   has said nothing, and keeps them all. */
const unboundRules = (m: BookManifest): string => {
  const keys = Object.keys(m.types);
  return bookPagesOf(m)
    .filter((s) => s.binds.length)
    .map((s) => {
      const off = keys.filter((k) => !s.binds.includes(k));
      return off.length ? `article[data-sec="${s.id}"] :is(${off.map((k) => `.kv-${k}`).join(',')}){color:inherit}` : '';
    })
    .join('\n');
};

export const BOOK_RULES_ID = 'omnistax-book-rules';
export const bookRulesCss = (m: BookManifest): string => `${typeRules(m)}\n${unboundRules(m)}`;
/* The book's stylesheet, its scheme's tokens and these rules together: the link every page of the book carries, by the id above. */
export const bookColoursHref = (book: string): string => `/${book}/colours.css`;
