/* A line diff of two versions of a file, and the changed stretches of it with
   a few unchanged lines around each. Pure. */
export type Line = { readonly kind: 'same' | 'del' | 'add'; readonly text: string; readonly a: number | null; readonly b: number | null };
/* `skipped` unchanged lines stand before the hunk's own. */
export type Hunk = { readonly skipped: number; readonly lines: readonly Line[] };

// ponytail: quadratic table; past this many cells the middle reads as replaced whole. Myers if large files need true diffs.
const MAX_CELLS = 4_000_000;

export const lineDiff = (a: readonly string[], b: readonly string[]): readonly Line[] => {
  let s = 0; while (s < a.length && s < b.length && a[s] === b[s]) s++;
  let e = 0; while (e < a.length - s && e < b.length - s && a[a.length - 1 - e] === b[b.length - 1 - e]) e++;
  const n = a.length - s - e, m = b.length - s - e;
  const out: Line[] = a.slice(0, s).map((text, i) => ({ kind: 'same', text, a: i + 1, b: i + 1 }));
  const del = (i: number): void => { out.push({ kind: 'del', text: a[s + i], a: s + i + 1, b: null }); };
  const add = (j: number): void => { out.push({ kind: 'add', text: b[s + j], a: null, b: s + j + 1 }); };
  if (n * m > MAX_CELLS) { for (let i = 0; i < n; i++) del(i); for (let j = 0; j < m; j++) add(j); }
  else {
    /* t[i][j]: the longest run of lines a from i and b from j share, in order. */
    const w = m + 1, t = new Uint16Array((n + 1) * w);
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
      t[i * w + j] = a[s + i] === b[s + j] ? t[(i + 1) * w + j + 1] + 1 : Math.max(t[(i + 1) * w + j], t[i * w + j + 1]);
    let i = 0, j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && a[s + i] === b[s + j]) { out.push({ kind: 'same', text: a[s + i], a: s + i + 1, b: s + j + 1 }); i++; j++; }
      else if (j >= m || (i < n && t[(i + 1) * w + j] >= t[i * w + j + 1])) del(i++);
      else add(j++);
    }
  }
  for (let k = e; k > 0; k--) out.push({ kind: 'same', text: a[a.length - k], a: a.length - k + 1, b: b.length - k + 1 });
  return out;
};

export const hunksOf = (lines: readonly Line[], context = 3): { readonly hunks: readonly Hunk[]; readonly tail: number } => {
  const keep = new Uint8Array(lines.length);
  lines.forEach((l, i) => { if (l.kind !== 'same') keep.fill(1, Math.max(0, i - context), Math.min(lines.length, i + context + 1)); });
  const hunks: Hunk[] = [];
  let skipped = 0, run: Line[] = [];
  lines.forEach((l, i) => {
    if (keep[i]) { run.push(l); return; }
    if (run.length) { hunks.push({ skipped, lines: run }); run = []; skipped = 0; }
    skipped++;
  });
  if (run.length) { hunks.push({ skipped, lines: run }); skipped = 0; }
  return { hunks, tail: skipped };
};
