/* Honest graphs of y = f(x), with no canvas: where the curve is drawn, where it
   breaks, and the numbers a figure writes beside it (an area, a Riemann sum, a
   slope). figlib draws what these return. */
type Scale = (v: number) => number;
type Box = { readonly l: number; readonly r: number; readonly t: number; readonly b: number };
export type Frame = { readonly X: Scale; readonly Y: Scale; readonly box: Box };
export type XY = readonly [number, number];

const LEN = 6;      /* the longest chord drawn, in logical units */
const DEPTH = 10;   /* halvings of a first step before a chord still too long is a break */
const FAR = 1e4;    /* a point this far past the box is drawn at that distance */

/* The polylines of y = f(x) on [a, b] in canvas units. A chord is halved until it is short; one that
   stays long after DEPTH halvings spans a jump or a pole and is not drawn. A value that is not finite
   (outside the domain, at a pole, 0/0 at a hole) breaks the line, and the halving finds the edge.
   Chords wholly above or wholly below the box are not refined. */
export function trace(f: (x: number) => number, a: number, b: number, { X, Y, box }: Frame, n = 96): XY[][] {
  const runs: XY[][] = []; let run: XY[] = [];
  const brk = (): void => { if (run.length > 1) runs.push(run); run = []; };
  const at = (x: number): XY | null => { const y = f(x); return Number.isFinite(y) ? [X(x), Math.min(box.b + FAR, Math.max(box.t - FAR, Y(y)))] : null; };
  const side = (p: XY): number => (p[1] < box.t ? -1 : p[1] > box.b ? 1 : 0);
  const go = (x0: number, p0: XY | null, x1: number, p1: XY | null, d: number): void => {
    if (!p0 && !p1) return;
    if (p0 && p1) { const s = side(p0); if ((s && s === side(p1)) || Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) <= LEN) { run.push(p1); return; } }
    if (d >= DEPTH) { brk(); if (p1) run.push(p1); return; }
    const xm = (x0 + x1) / 2, pm = at(xm);
    go(x0, p0, xm, pm, d + 1); go(xm, pm, x1, p1, d + 1);
  };
  let x0 = a, p0 = at(a); if (p0) run.push(p0);
  for (let i = 1; i <= n; i++) { const x1 = a + ((b - a) * i) / n, p1 = at(x1); go(x0, p0, x1, p1, 0); x0 = x1; p0 = p1; }
  brk();
  return runs;
}

const eps = (x: number): number => 1e-7 * Math.max(1, Math.abs(x));
/* f approached from the side dir (1 from the right, -1 from the left), or both sides averaged (0) */
export const limit = (f: (x: number) => number, x: number, dir: -1 | 0 | 1 = 0): number =>
  dir ? f(x + dir * eps(x)) : (f(x - eps(x)) + f(x + eps(x))) / 2;
export const slope = (f: (x: number) => number, x: number): number => { const h = 1e3 * eps(x); return (f(x + h) - f(x - h)) / (2 * h); };

/* ∫ from a to b of f − g, by Simpson's rule */
export function area(f: (x: number) => number, g: (x: number) => number, a: number, b: number, n = 200): number {
  const h = (b - a) / n, d = (x: number): number => f(x) - g(x);
  let s = d(a) + d(b);
  for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * d(a + i * h);
  return (s * h) / 3;
}

/* The n cells of a Riemann sum on [a, b]: each cell's left and right heights (equal for a rectangle,
   the curve's two values for a trapezoid), and the sum of their signed areas. */
export type Rule = 'left' | 'right' | 'mid' | 'trap' | 'upper' | 'lower';
export type Cell = { readonly x0: number; readonly x1: number; readonly yl: number; readonly yr: number };
export function cells(f: (x: number) => number, a: number, b: number, n: number, rule: Rule = 'left'): { cells: Cell[]; sum: number } {
  const w = (b - a) / n;
  const height = (x0: number, x1: number): number => {
    if (rule === 'left') return f(x0);
    if (rule === 'right') return f(x1);
    if (rule === 'mid') return f((x0 + x1) / 2);
    const ys = Array.from({ length: 25 }, (_, i) => f(x0 + (w * i) / 24));
    return rule === 'upper' ? Math.max(...ys) : Math.min(...ys);
  };
  const out = Array.from({ length: n }, (_, i): Cell => {
    const x0 = a + i * w, x1 = x0 + w;
    if (rule === 'trap') return { x0, x1, yl: f(x0), yr: f(x1) };
    const y = height(x0, x1); return { x0, x1, yl: y, yr: y };
  });
  return { cells: out, sum: out.reduce((s, c) => s + ((c.yl + c.yr) / 2) * (c.x1 - c.x0), 0) };
}

/* The part of the line through (x0, y0) with slope m that lies in [xr] × [yr], or null */
export function clipLine(x0: number, y0: number, m: number, xr: readonly [number, number], yr: readonly [number, number]): readonly [XY, XY] | null {
  let lo = xr[0], hi = xr[1];
  if (m !== 0) { const xa = x0 + (yr[0] - y0) / m, xb = x0 + (yr[1] - y0) / m; lo = Math.max(lo, Math.min(xa, xb)); hi = Math.min(hi, Math.max(xa, xb)); }
  else if (y0 < yr[0] || y0 > yr[1]) return null;
  return lo < hi ? [[lo, y0 + m * (lo - x0)], [hi, y0 + m * (hi - x0)]] : null;
}

/* The ε–δ claim about f near a: the target band (L − ε, L + ε), or y > M (to 1) or y < M (to −1)
   for an infinite limit, and the side of a it is judged on (0 both, 1 the right, −1 the left). */
export type Target = { readonly L: number; readonly eps: number } | { readonly M: number; readonly to?: 1 | -1 };
export const within = (y: number, t: Target): boolean =>
  'L' in t ? Math.abs(y - t.L) < t.eps : (t.to ?? 1) > 0 ? y > t.M : y < t.M;

const STEPS = 12000;   /* samples from 1e-9·reach to reach, each 0.17 % farther than the last */
/* How far from a, on the side dir, f first leaves the target: the distance found between the last
   sample in and the first out, Infinity when f stays in out to reach. x = a and x where f is not
   finite (outside the domain) are not judged. ponytail: an excursion narrower than the sample
   spacing (0.17 % of its distance from a) is missed. */
export function escape(f: (x: number) => number, a: number, dir: -1 | 1, t: Target, reach: number): number {
  const out = (d: number): boolean => { const y = f(a + dir * d); return Number.isFinite(y) && !within(y, t); };
  const r = Math.pow(1e9, 1 / STEPS);
  let lo = 0;
  for (let i = 0, d = reach * 1e-9; i <= STEPS; i++, d *= r) {
    if (!out(d)) { lo = d; continue; }
    let hi = d;
    for (let k = 0; k < 60 && hi - lo > 1e-12 * Math.max(1, hi); k++) { const m = (lo + hi) / 2; if (out(m)) hi = m; else lo = m; }
    return hi;
  }
  return Infinity;
}

/* Whether δ works for the target on the side asked, the largest δ that does, and how far f stays
   in on each side (NaN on a side not judged). */
export function judge(f: (x: number) => number, a: number, delta: number, t: Target, side: -1 | 0 | 1, reach: number): { ok: boolean; best: number; left: number; right: number } {
  const left = side <= 0 ? escape(f, a, -1, t, reach) : NaN, right = side >= 0 ? escape(f, a, 1, t, reach) : NaN;
  const best = Math.min(...[left, right].filter((v) => !Number.isNaN(v)));
  return { ok: delta <= best * (1 + 1e-9), best, left, right };
}

/* Ticks at round values across [lo, hi], about want of them, and the decimals their step needs. */
export function ticks(lo: number, hi: number, want = 4): { vals: number[]; dec: number } {
  const raw = (hi - lo) / want, p = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 5, 10].map((m) => m * p).find((st) => raw <= st * 1.0000001) ?? 10 * p;
  const vals: number[] = [];
  for (let i = Math.ceil(lo / step - 1e-9); i * step <= hi + step * 1e-9; i++) vals.push(i * step || 0);
  return { vals, dec: Math.max(0, -Math.floor(Math.log10(step) + 1e-9)) };
}
