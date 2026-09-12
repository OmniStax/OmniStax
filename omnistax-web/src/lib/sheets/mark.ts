/* Marking a document's formulas, which is the one place the recogniser meets a
   real document. It runs in the same pass that marks glossary terms and example
   references, over the same blocks, so a document is walked once; and it does
   nothing at all for a book that declares no elements sheet, which is how the
   physics book stays as it was. */
import { sheets } from './store.svelte';
import { wrapFormulas } from './formula';
import { IN_BLOCK } from '../hover/terms';

/* The prose blocks a formula may be marked in — the same rule the terms use:
   not a caption, not an exercise card, not a heading, and never inside a card. */
const blocks = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>('p, li, td, th')).filter((b) => !b.closest('figure, .exercises, .hover-card') && !b.querySelector('p, li, td, th'));

export const markFormulas = (root: HTMLElement): void => {
  if (!sheets.elementsEntry) return;
  const table = sheets.table;
  if (table.size === 0) { sheets.wantElements(root); return; }
  blocks(root).forEach((b) => { const html = wrapFormulas(b.innerHTML, table, IN_BLOCK); if (html !== b.innerHTML) b.innerHTML = html; });
};
