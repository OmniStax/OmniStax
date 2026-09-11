/* Folding headings and hiding figures: the pure part. Which elements fold,
   which heading carries a span's toggle, and the set arithmetic on the
   remembered ids, so tests need no DOM or Svelte runtime. The stores and the
   buttons live in fold.svelte.ts. */

/* A span folds when it has an id: a section or an example. Bare h3 subheadings
   with no container of their own are not spans and cannot fold. */
export const FOLDABLE = 'section[id], .example[id]';
/* A figure hides when it has an id: a sim or a photograph kept from the book. */
export const HIDEABLE = 'figure.sim[id], figure.photo[id]';
export const FOLDED_CLASS = 'folded';
export const HIDDEN_CLASS = 'fig-hidden';
/* The element that holds a span's heading when the heading is not a direct
   child (a section that opens with an example and has no h2 of its own). */
export const FOLD_HEAD_CLASS = 'fold-head';

export const foldableOf = (root: ParentNode): HTMLElement[] => Array.from(root.querySelectorAll<HTMLElement>(FOLDABLE));
export const hideableOf = (root: ParentNode): HTMLElement[] => Array.from(root.querySelectorAll<HTMLElement>(HIDEABLE));

/* A section's heading is its h2, or the first h3 anywhere inside it when it has
   none; an example's heading is its own h3. */
export const headingOf = (span: HTMLElement): HTMLElement | null =>
  span.tagName === 'SECTION' ? span.querySelector<HTMLElement>(':scope > h2') ?? span.querySelector<HTMLElement>('h3') : span.querySelector<HTMLElement>(':scope > h3');

export const toggleId = (ids: readonly string[], id: string): readonly string[] => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
export const addIds = (ids: readonly string[], more: readonly string[]): readonly string[] => [...ids, ...more.filter((m) => !ids.includes(m))];
export const removeIds = (ids: readonly string[], drop: readonly string[]): readonly string[] => ids.filter((x) => !drop.includes(x));

/* A figure id remembered before the sim rename of 2026-09-11 says "2.5-demo-avg" where the figure now says "2.5-sim-avg". */
export const renamedSimId = (id: string): string => id.replace(/^(\d+\.\d+)-demo-/, '$1-sim-');
/* What was remembered, kept only when it is a list of strings. */
export const parseIds = (raw: unknown): readonly string[] | null => (Array.isArray(raw) && raw.every((x) => typeof x === 'string') ? raw : null);
