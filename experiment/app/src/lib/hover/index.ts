/* The hover layer: one popover ("goto" card) for every underlinable thing in
   a document — a coloured symbol, a figure reference, a glossary term, an
   example reference, a displayed equation.

   Integration, two lines each:
     Shell.svelte     import Hover from './Hover.svelte';   …   <Hover />          (once, anywhere in the ready block)
     registry prepare import { decorateTerms } from '../hover';   …   if (doc === 'text') decorateTerms(root, sec);

   decorateTerms(root, section): marks the section's glossary terms and example
   references in the article's prose (see terms.ts) and makes symbols focusable.
   Idempotent, touches only <p> and <li> elements, and leaves demos and
   exercise cards alone, so it may run after figures have booted.
   Hover.svelte: the card itself and its document-level listeners; mount once. */
import type { SectionId } from '../types/ids';
import { registry } from '../sections/registry.svelte';
import { wrapEmTerms, wrapPlainTerms, wrapExampleRefs, exampleIds, IN_BLOCK, type Term, type Wrapped } from './terms';

export type { Card, Action, Kind } from './resolve';

/* The prose blocks a term may be marked in: not a caption, not an exercise card, not a heading. */
const blocks = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>('p, li')).filter((b) => !b.closest('figure, .exercises, .hover-card') && !b.querySelector('p, li'));

const glossaryOf = (section: SectionId): readonly Term[] => {
  const dir = registry.chapterOf(section)?.dir; const data = dir ? registry.chapters[dir] : undefined;
  return data ? data.formulas.glossary.map((g) => g.term) : [];
};

export const decorateTerms = (root: HTMLElement, section: SectionId): void => {
  const bs = blocks(root); const terms = glossaryOf(section);
  const examples = exampleIds(root.innerHTML);
  const done0 = new Set<Term>(Array.from(root.querySelectorAll<HTMLElement>('.term[data-term]')).map((t) => t.dataset.term ?? ''));
  const apply = (pass: (html: string, terms: readonly Term[], done: ReadonlySet<Term>) => Wrapped, done: ReadonlySet<Term>): ReadonlySet<Term> =>
    bs.reduce<ReadonlySet<Term>>((d, b) => { const w = pass(b.innerHTML, terms, d); if (w.html !== b.innerHTML) b.innerHTML = w.html; return w.done; }, done);
  const afterEm = apply((h, t, d) => wrapEmTerms(h, t, d, IN_BLOCK), done0);
  apply((h, t, d) => wrapPlainTerms(h, t, d, IN_BLOCK), afterEm);
  bs.forEach((b) => { const h = wrapExampleRefs(b.innerHTML, examples, IN_BLOCK); if (h !== b.innerHTML) b.innerHTML = h; });
  root.querySelectorAll<HTMLElement>('.katex-html [data-sym]').forEach((s) => { if (!s.hasAttribute('tabindex')) s.tabIndex = 0; });
};
