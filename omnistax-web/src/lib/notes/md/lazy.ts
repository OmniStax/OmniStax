/* The markdown renderer, fetched when a note is first read. render.ts carries
   marked and KaTeX with it, and no page of the book needs either — the book's
   own maths is set at build time — so the shell boots without them and asks
   for them here. The promise is kept, so the second note read waits on the
   first fetch rather than starting another, and `loaded` is the same function
   to call synchronously once it has arrived. */
import type { Resolver } from './render';

export type RenderFn = (markdown: string, r: Resolver) => string;

let fn: RenderFn | null = null;
let pending: Promise<RenderFn> | null = null;

/* What is here now, or nothing: a caller that must not wait reads this. */
export const loaded = (): RenderFn | null => fn;

export const loadRenderer = (): Promise<RenderFn> =>
  (pending ??= import('./render').then((m) => (fn = m.render)));
