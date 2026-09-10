/* Anchoring a highlight to text without DOM: a quote plus a little context on
   each side. Pure, so it is tested on strings; the painter maps it onto text
   nodes. The same HTML yields the same text, so an anchor found in one copy of
   a document is found in every copy. */
export type Anchor = { readonly quote: string; readonly prefix: string; readonly suffix: string };
export type Span = { readonly start: number; readonly end: number };
export const CONTEXT = 32;

export const makeAnchor = (full: string, s: Span): Anchor => ({
  quote: full.slice(s.start, s.end), prefix: full.slice(Math.max(0, s.start - CONTEXT), s.start), suffix: full.slice(s.end, s.end + CONTEXT),
});

const common = (a: string, b: string, fromEnd: boolean): number => {
  let n = 0;
  while (n < a.length && n < b.length && (fromEnd ? a[a.length - 1 - n] === b[b.length - 1 - n] : a[n] === b[n])) n++;
  return n;
};
/* Every occurrence of the quote, scored by how much context agrees; the best wins, none if the quote is gone. */
export const locate = (full: string, a: Anchor): Span | null => {
  if (!a.quote) return null;
  const hits: Span[] = [];
  for (let i = full.indexOf(a.quote); i >= 0; i = full.indexOf(a.quote, i + 1)) hits.push({ start: i, end: i + a.quote.length });
  if (!hits.length) return null;
  if (hits.length === 1) return hits[0];
  const score = (h: Span) => common(full.slice(Math.max(0, h.start - CONTEXT), h.start), a.prefix, true) + common(full.slice(h.end, h.end + CONTEXT), a.suffix, false);
  return hits.reduce((best, h) => (score(h) > score(best) ? h : best), hits[0]);
};
export const overlaps = (a: Span, b: Span): boolean => a.start < b.end && b.start < a.end;
