/* Drawing a function honestly: a curve is sampled over the window and broken
   wherever the function is, so an asymptote is never bridged by a line, a jump
   is two pieces with the open and the filled end marked, and a hole the
   samples would step over (sin x / x at 0) is found from the expression itself,
   at the zeros of its denominators and of its piecewise boundaries, and drawn as
   an open circle. The rest is the arithmetic a grapher needs beside the curve:
   the level set of an equation, a slope, an integral and the ticks of an axis. */
import { breaksOf, compile, curveFn, readRow, type Env, type Node } from './expr';

export type Win = { readonly x0: number; readonly x1: number; readonly y0: number; readonly y1: number };
export type P = readonly [number, number];
/* An end the curve stops at: filled where the function takes that value, open where it only comes near it. */
export type Mark = { readonly x: number; readonly y: number; readonly open: boolean };
export type Trace = { readonly pieces: readonly (readonly P[])[]; readonly marks: readonly Mark[] };

const fin = Number.isFinite;

/* The zeros of g in [a, b]: every sign change, and every dip that touches zero
   (x² in a denominator never changes sign), kept only where g really is zero,
   so a sign change across a pole of g is not one. */
export const zerosOf = (g: (x: number) => number, a: number, b: number, n: number): readonly number[] => {
  const xs = Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n); const ys = xs.map(g);
  const tol = 1e-9 * Math.max(1, ...ys.filter(fin).map(Math.abs).slice(0, 50));
  const out: number[] = [];
  const bisect = (lo: number, hi: number): number => {
    let gl = g(lo);
    for (let k = 0; k < 80 && hi - lo > 0; k++) { const m = (lo + hi) / 2; if (m === lo || m === hi) break; const gm = g(m); if (gm === 0) return m; if (Math.sign(gm) === Math.sign(gl)) { lo = m; gl = gm; } else hi = m; }
    return Math.abs(g(lo)) <= Math.abs(g(hi)) ? lo : hi;
  };
  const dip = (lo: number, hi: number): number => {
    for (let k = 0; k < 100; k++) { const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3; if (Math.abs(g(m1)) < Math.abs(g(m2))) hi = m2; else lo = m1; }
    return (lo + hi) / 2;
  };
  for (let i = 0; i <= n; i++) {
    const y = ys[i];
    if (y === 0) { out.push(xs[i]); continue; }
    if (i < n && fin(y) && fin(ys[i + 1]) && ys[i + 1] !== 0 && Math.sign(y) !== Math.sign(ys[i + 1])) out.push(bisect(xs[i], xs[i + 1]));
    else if (i > 0 && i < n && fin(y) && Math.abs(y) < Math.abs(ys[i - 1]) && Math.abs(y) < Math.abs(ys[i + 1])) out.push(dip(xs[i - 1], xs[i + 1]));
  }
  const span = (b - a) * 1e-9;
  return out.filter((r) => Math.abs(g(r)) <= tol).sort((p, q) => p - q).filter((r, i, all) => i === 0 || r - all[i - 1] > span);
};

/* What happens to f at a zero of one of its breaks: nothing, a hole, a jump or an asymptote. */
const atBreak = (f: (x: number) => number, r: number, w: Win): { readonly cut: boolean; readonly marks: readonly Mark[] } => {
  const d = (w.x1 - w.x0) * 1e-7, tol = (w.y1 - w.y0) * 1e-3, big = (w.y1 - w.y0) * 1e3;
  const near = (p: number, q: number): boolean => Math.abs(p - q) <= tol;
  const L = f(r - d), R = f(r + d), V = f(r);
  if (fin(L) && fin(R) && fin(V) && near(L, R) && near(L, V)) return { cut: false, marks: [] };
  const sides = [L, R].filter((s) => fin(s) && Math.abs(s) < big).filter((s, i, all) => i === 0 || !near(s, all[0]));
  const marks: Mark[] = sides.map((s) => ({ x: r, y: s, open: !(fin(V) && near(V, s)) }));
  if (fin(V) && !sides.some((s) => near(s, V))) marks.push({ x: r, y: V, open: false });
  return { cut: true, marks };
};

/* One curve y = f(x) over the window, `px` the window's width in pixels. */
export const traceCurve = (f: (x: number) => number, breaks: readonly ((x: number) => number)[], w: Win, px: number): Trace => {
  const n = Math.max(64, Math.round(px * 1.5));
  const span = w.y1 - w.y0, lo = w.y0 - 8 * span, hi = w.y1 + 8 * span;
  const clampY = (y: number): number => Math.min(hi, Math.max(lo, y));
  const found = breaks.flatMap((g) => zerosOf(g, w.x0, w.x1, n).map((r) => ({ r, ...atBreak(f, r, w) })));
  const cuts = [...new Set(found.filter((b) => b.cut).map((b) => b.r))].sort((a, b) => a - b);
  const marks = found.flatMap((b) => b.marks);
  const pieces: P[][] = []; let cur: P[] = [];
  const end = (): void => { if (cur.length > 1) pieces.push(cur); cur = []; };
  const push = (x: number, y: number): void => { if (fin(y)) cur.push([x, clampY(y)]); else end(); };
  /* A step too steep to trust is halved until it is either smooth or plainly a jump. */
  const off = (y: number): number => (y > w.y1 ? 1 : y < w.y0 ? -1 : 0);
  const refine = (a: number, fa: number, b: number, fb: number, depth: number): void => {
    if (Math.abs(fb - fa) <= span / 6 || (off(fa) !== 0 && off(fa) === off(fb))) return;
    if (depth === 0) { if (Math.abs(fb - fa) > span / 2) end(); return; }
    const m = (a + b) / 2, fm = f(m);
    refine(a, fa, m, fm, depth - 1); push(m, fm); if (fin(fm)) refine(m, fm, b, fb, depth - 1);
  };
  /* Where the function stops being defined between two samples, the edge is found and the curve run up to it. */
  const edge = (inside: number, outside: number): number => {
    for (let k = 0; k < 50; k++) { const m = (inside + outside) / 2; if (fin(f(m))) inside = m; else outside = m; }
    return inside;
  };
  const stops = [w.x0, ...cuts.filter((c) => c > w.x0 && c < w.x1), w.x1];
  const gap = (w.x1 - w.x0) * 1e-9;
  stops.slice(1).forEach((b, k) => {
    const a = stops[k]; const from = k === 0 ? a : a + gap, to = k === stops.length - 2 ? b : b - gap;
    const m = Math.max(2, Math.ceil((n * (to - from)) / (w.x1 - w.x0)));
    let px0 = from, py0 = f(from);
    push(px0, py0);
    for (let i = 1; i <= m; i++) {
      const x = from + ((to - from) * i) / m, y = f(x);
      if (fin(py0) && !fin(y)) { const e = edge(px0, x); push(e, f(e)); }
      else if (!fin(py0) && fin(y)) { const e = edge(x, px0); end(); push(e, f(e)); }
      else if (fin(py0) && fin(y)) refine(px0, py0, x, y, 8);
      push(x, y); px0 = x; py0 = y;
    }
    end();
  });
  return { pieces, marks };
};

/* The level set F(x, y) = 0 by marching squares, as segments. A sign change
   across a pole of F (1/x = y crossing x = 0) is not a crossing and is left out. */
export const traceEquation = (F: (x: number, y: number) => number, w: Win, nx: number, ny: number): readonly (readonly P[])[] => {
  const X = (i: number): number => w.x0 + ((w.x1 - w.x0) * i) / nx, Y = (j: number): number => w.y0 + ((w.y1 - w.y0) * j) / ny;
  const v = Array.from({ length: nx + 1 }, (_, i) => Array.from({ length: ny + 1 }, (_, j) => F(X(i), Y(j))));
  const out: P[][] = [];
  const cross = (xa: number, ya: number, fa: number, xb: number, yb: number, fb: number): P | null => {
    if (!fin(fa) || !fin(fb) || Math.sign(fa) === Math.sign(fb) || fa === fb) return null;
    const t = fa / (fa - fb); const p: P = [xa + (xb - xa) * t, ya + (yb - ya) * t];
    return Math.abs(F(p[0], p[1])) <= 0.5 * Math.max(Math.abs(fa), Math.abs(fb)) ? p : null;
  };
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const [x0, x1, y0, y1] = [X(i), X(i + 1), Y(j), Y(j + 1)];
    const [a, b, c, d] = [v[i][j], v[i + 1][j], v[i + 1][j + 1], v[i][j + 1]];
    const ps = [cross(x0, y0, a, x1, y0, b), cross(x1, y0, b, x1, y1, c), cross(x1, y1, c, x0, y1, d), cross(x0, y1, d, x0, y0, a)].filter((p): p is P => p !== null);
    if (ps.length === 2) out.push(ps);
    if (ps.length === 4) out.push([ps[0], ps[1]], [ps[2], ps[3]]);
  }
  return out;
};

/* The slope of f at x, by central differences. */
export const slopeAt = (f: (x: number) => number, x: number): number => { const h = 1e-5 * (1 + Math.abs(x)); return (f(x + h) - f(x - h)) / (2 * h); };
/* ∫ₐᵇ f by Simpson's rule; nothing where f is undefined anywhere on the way, since the area is then not a number. */
export const integrate = (f: (x: number) => number, a: number, b: number, n = 2000): number => {
  const h = (b - a) / n; let s = 0;
  for (let i = 0; i <= n; i++) { const y = f(a + h * i); if (!fin(y)) return NaN; s += (i === 0 || i === n ? 1 : i % 2 ? 4 : 2) * y; }
  return (s * h) / 3;
};

/* The step between ticks: 1, 2 or 5 times a power of ten, about `want` to the span. */
export const tickStep = (span: number, want: number): number => {
  const raw = span / want, p = Math.pow(10, Math.floor(Math.log10(raw)));
  return [1, 2, 5, 10].map((m) => m * p).find((s) => raw <= s * 1.0001) ?? 10 * p;
};
export const ticks = (lo: number, hi: number, step: number): readonly number[] => {
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
  return out;
};
/* A number as a readout writes it: four significant figures, a true minus. */
export const fmt = (v: number, digits = 4): string => {
  if (!fin(v)) return v > 0 ? '∞' : v < 0 ? '−∞' : 'undefined';
  if (v === 0) return '0';
  const s = Math.abs(v) >= 1e6 || Math.abs(v) < 1e-4 ? v.toExponential(digits - 1) : String(Number(v.toPrecision(digits)));
  return s.replace('-', '−');
};

/* An SVG path through pieces, the window mapped to a box of w by h pixels. */
export const pathOf = (pieces: readonly (readonly P[])[], win: Win, w: number, h: number): string => {
  const sx = w / (win.x1 - win.x0), sy = h / (win.y1 - win.y0);
  return pieces.map((pc) => pc.map(([x, y], i) => `${i ? 'L' : 'M'}${((x - win.x0) * sx).toFixed(1)} ${((win.y1 - y) * sy).toFixed(1)}`).join('')).join('');
};

/* A function as a hover card shows it: x from −5 to 5 and y fitted to what the
   curve does there, its outliers left off so that a pole does not flatten it. */
export type Sketch = { readonly win: Win; readonly trace: Trace };
export const sketch = (expr: string, w: number): Sketch | null => {
  const row = readRow(expr);
  if (row.kind !== 'curve') return null;
  const env: Env = { vars: {}, fns: {} };
  const f = curveFn(row, env);
  const x0 = -5, x1 = 5;
  const ys = Array.from({ length: 201 }, (_, i) => f(x0 + ((x1 - x0) * i) / 200)).filter(fin).sort((a, b) => a - b);
  if (ys.length === 0) return null;
  const lo = ys[Math.floor(ys.length * 0.05)], hi = ys[Math.ceil(ys.length * 0.95) - 1];
  const pad = Math.max((hi - lo) * 0.15, 0.5);
  const win: Win = { x0, x1, y0: Math.min(lo - pad, -pad / 3), y1: Math.max(hi + pad, pad / 3) };
  return { win, trace: traceCurve(f, breakFns(row.node, row.arg, env), win, w) };
};
/* A curve's breaks as functions of its argument. */
export const breakFns = (node: Node, arg: string, env: Env): readonly ((x: number) => number)[] =>
  breaksOf(node).map((b) => { const g = compile(b); const local: Env = { vars: { ...env.vars }, fns: env.fns }; return (x: number) => { local.vars[arg] = x; return g(local); }; });
