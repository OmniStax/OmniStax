/* The hover layer: one popover ("goto" card) for every underlinable thing in
   a document — a coloured symbol, a concept the builder marked, a figure
   reference, an example reference, a displayed equation.

   Integration, two lines each:
     Shell.svelte     import Hover from './Hover.svelte';   …   <Hover />          (once, anywhere in the ready block)
     registry prepare import { decorateProse } from '../hover';   …   if (doc === 'text') decorateProse(root);

   decorateProse(root): marks the example references in the article's prose
   (see terms.ts), marks the chemical formulas of a book that declares an
   elements sheet (see sheets/mark.ts), and makes symbols and concept spans
   focusable. Idempotent, touches only <p> and <li> elements, and leaves sims
   and exercise cards alone, so it may run after figures have booted.
   Hover.svelte: the card itself and its document-level listeners; mount once. */
import { wrapExampleRefs, exampleIds, IN_BLOCK } from './terms';
import { markFormulas } from '../sheets/mark';

export type { Card, Action, Kind } from './resolve';

/* The prose blocks a reference may be marked in: not a caption, not an exercise card, not a heading. */
const blocks = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>('p, li')).filter((b) => !b.closest('figure, .exercises, .hover-card') && !b.querySelector('p, li'));

export const decorateProse = (root: HTMLElement): void => {
  const examples = exampleIds(root.innerHTML);
  blocks(root).forEach((b) => { const h = wrapExampleRefs(b.innerHTML, examples, IN_BLOCK); if (h !== b.innerHTML) b.innerHTML = h; });
  root.querySelectorAll<HTMLElement>('.katex-html [data-sym], span[data-concept]:not(.book-word)').forEach((s) => { if (!s.hasAttribute('tabindex')) s.tabIndex = 0; });
  markFormulas(root);
};
