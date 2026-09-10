/* A small fuzzy matcher for the palette: every query character must appear in
   order; runs, word starts and an early first hit score higher. Exhaustive over
   positions with a memo, which is cheap for labels under a hundred characters. */
export type FuzzyMatch = { readonly score: number; readonly indices: readonly number[] };

const isWordStart = (text: string, i: number): boolean => i === 0 || !/[\p{L}\p{N}]/u.test(text[i - 1]);

export const fuzzy = (query: string, text: string): FuzzyMatch | null => {
  const q = query.trim().toLowerCase(); if (!q) return { score: 0, indices: [] };
  const raw = query.trim(); const t = text.toLowerCase();
  const memo = new Map<string, FuzzyMatch | null>();
  const best = (qi: number, from: number, prev: number): FuzzyMatch | null => {
    if (qi === q.length) return { score: 0, indices: [] };
    const key = `${qi}:${from}:${prev}`; const hit = memo.get(key); if (hit !== undefined) return hit;
    let top: FuzzyMatch | null = null;
    for (let i = t.indexOf(q[qi], from); i >= 0; i = t.indexOf(q[qi], i + 1)) {
      const rest = best(qi + 1, i + 1, i); if (!rest) break;   /* no later position can match either */
      const gap = prev < 0 ? Math.min(i, 30) * 0.1 : Math.min(i - prev - 1, 10) * 0.2;
      const here = 1 + (prev >= 0 && i === prev + 1 ? 2 : 0) + (isWordStart(text, i) ? 2 : 0) + (text[i] === raw[qi] ? 0.25 : 0) - gap;
      const score = here + rest.score;
      if (!top || score > top.score) top = { score, indices: [i, ...rest.indices] };
    }
    memo.set(key, top); return top;
  };
  return best(0, 0, -1);
};
/* Items in best-first order, ties keeping the given order. */
export const rank = <T>(query: string, items: readonly T[], text: (x: T) => string): readonly { readonly item: T; readonly match: FuzzyMatch }[] =>
  items.map((item) => ({ item, match: fuzzy(query, text(item)) })).filter((x): x is { item: T; match: FuzzyMatch } => x.match !== null).sort((a, b) => b.match.score - a.match.score);
