/* Splitting a label into the runs a fuzzy match hit and the runs it missed, so
   the palette and the browser bolden the same characters. Pure. */
export type Piece = { readonly t: string; readonly hit: boolean };

/* `offset` is where `s` starts inside the text that was matched (a command's label sits after its group). */
export const pieces = (s: string, offset: number, indices: readonly number[]): readonly Piece[] => {
  const hits = new Set(indices.map((i) => i - offset));
  return Array.from(s).reduce<Piece[]>((acc, ch, i) => {
    const hit = hits.has(i); const last = acc[acc.length - 1];
    return last && last.hit === hit ? [...acc.slice(0, -1), { t: last.t + ch, hit }] : [...acc, { t: ch, hit }];
  }, []);
};
