/* The hover layer: one popover ("goto" card) for every underlinable thing in
   a document — a coloured symbol, a figure reference, a glossary term, an
   example reference, a displayed equation.

   Integration, two lines each:
     Shell.svelte     import Hover from './Hover.svelte';   …   <Hover />          (once, anywhere in the ready block)
     registry prepare import { decorateTerms } from '../hover';   …   if (doc === 'text') decorateTerms(root, sec);

   decorateTerms(root, section): marks every mention of the glossary terms of the book's
   concepts, each in its concept's type where the concept names one, and the example
   references in the article's prose (see terms.ts), marks the chemical formulas
   of a book that declares an elements sheet (see sheets/mark.ts), and makes
   symbols focusable.
   Idempotent, touches only <p> and <li> elements, and leaves sims and
   exercise cards alone, so it may run after figures have booted.
   Hover.svelte: the card itself and its document-level listeners; mount once. */
import { bookId, sectionRef, type BookId, type SectionId } from '../types/ids';
import { registry } from '../sections/registry.svelte';
import { wrapTerms, wrapExampleRefs, exampleIds, IN_BLOCK, type Term, type ExampleNumber } from './terms';
import { markFormulas } from '../sheets/mark';
import { bookTerms } from '../sections/reference';

export type { Card, Action, Kind } from './resolve';

/* The prose blocks a term may be marked in: not a caption, not an exercise card, not a heading. */
const blocks = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>('p, li')).filter((b) => !b.closest('figure, .exercises, .hover-card') && !b.querySelector('p, li'));

/* The book's terms once every chapter it has built is loaded; until then, the
   terms of the chapters loaded so far, the section's own among them. */
const wholeBook = new Map<BookId, Promise<readonly Term[]>>();
const settled = new Map<BookId, readonly Term[]>();
const glossaryOf = (book: BookId): Promise<readonly Term[]> => {
  const had = wholeBook.get(book); if (had) return had;
  const dirs = registry.manifest(book).chapters.filter((c) => c.sections.some((s) => s.built)).map((c) => c.dir);
  const run = registry.loadChapters(book, dirs).catch(() => {}).then(() => { const terms = bookTerms(registry.concepts(book)); settled.set(book, terms); return terms; });
  wholeBook.set(book, run);
  return run;
};

export const decorateTerms = (root: HTMLElement, section: SectionId): void => {
  const book = bookId(root.closest<HTMLElement>('[data-book]')?.dataset.book ?? '');
  const mark = (terms: readonly Term[], examples: ReadonlyMap<ExampleNumber, string>): void =>
    blocks(root).forEach((b) => { const h = wrapExampleRefs(wrapTerms(b.innerHTML, terms, IN_BLOCK), examples, IN_BLOCK); if (h !== b.innerHTML) b.innerHTML = h; });
  mark(settled.get(book) ?? bookTerms(registry.concepts(book)), exampleIds(root.innerHTML));
  root.querySelectorAll<HTMLElement>('.katex-html [data-sym]').forEach((s) => { if (!s.hasAttribute('tabindex')) s.tabIndex = 0; });
  markFormulas(root);
  if (settled.has(book) || !registry.chapterOf(sectionRef(book, section))) return;
  void glossaryOf(book).then((terms) => mark(terms, new Map()));
};
