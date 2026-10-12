/* Calculus Chapter 11, with no canvas: points given by polar coordinates, curves traced by a parameter
   (a polar curve is traced by θ), the parameter of a curve nearest a point, the sectors of a polar
   area's Riemann sum, and the areas and lengths the book computes. figlib draws what these return;
   every point is in the graph's own units. */
export type P2 = readonly [number, number];
export type Path = (t: number) => P2;
type Range = readonly [number, number];

/* the point with polar coordinates (r, θ) */
export const xy = (r: number, th: number): P2 => [r * Math.cos(th), r * Math.sin(th)];

/* the polar curve r = f(θ) as a path traced by θ */
export const polarPath = (f: (th: number) => number): Path => (th) => xy(f(th), th);

/* The path over [t0, t1] at n + 1 evenly spaced parameters, split into runs where a point is not
   finite or where two neighbours lie farther apart than gap (a pole the curve jumps across). */
export function runs(p: Path, t0: number, t1: number, n = 600, gap = Infinity): P2[][] {
  const out: P2[][] = []; let cur: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const q = p(t0 + ((t1 - t0) * i) / n);
    if (!Number.isFinite(q[0]) || !Number.isFinite(q[1])) { if (cur.length > 1) out.push(cur); cur = []; continue; }
    const last = cur[cur.length - 1];
    if (last && Math.hypot(q[0] - last[0], q[1] - last[1]) > gap) { if (cur.length > 1) out.push(cur); cur = []; }
    cur.push(q);
  }
  if (cur.length > 1) out.push(cur);
  return out;
}

/* the angle a + 2πk nearest to near */
export const unwrap = (a: number, near: number): number => a + 2 * Math.PI * Math.round((near - a) / (2 * Math.PI));

/* The parameter in [lo, hi], within span of t, whose point on the path lies nearest q: a dragged point
   follows the curve from where it is and never jumps to a far stretch that passes close by. */
export function nearest(p: Path, q: P2, t: number, lo: number, hi: number, span: number, n = 240): number {
  const a = Math.max(lo, t - span), b = Math.min(hi, t + span);
  let best = t, bd = Infinity;
  for (let i = 0; i <= n; i++) {
    const s = a + ((b - a) * i) / n, [x, y] = p(s), d = Math.hypot(x - q[0], y - q[1]);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

/* The polar coordinates of q for a point that was at (r, θ): the angle wound to stay near θ, and r
   keeping its sign, so a point behind the pole (r < 0) stays behind it as it is dragged. */
export function aim(q: P2, th: number, r: number): { th: number; r: number } {
  const d = Math.hypot(q[0], q[1]); if (!(d > 0)) return { th, r: 0 };
  const a = Math.atan2(q[1], q[0]);
  return r < 0 ? { th: unwrap(a + Math.PI, th), r: -d } : { th: unwrap(a, th), r: d };
}

/* The sectors of the Riemann sum for ½∫f² over [α, β]: n equal-width subintervals, the ith from θᵢ₋₁
   to θᵢ with radius rᵢ = f(θᵢ), as the book takes them, and the sum of their areas ½Δθ rᵢ². */
export type Sector = { readonly t0: number; readonly t1: number; readonly r: number };
export function sectors(f: (th: number) => number, a: number, b: number, n: number): { cells: Sector[]; sum: number } {
  const dt = (b - a) / n, cells: Sector[] = [];
  for (let i = 1; i <= n; i++) cells.push({ t0: a + (i - 1) * dt, t1: a + i * dt, r: f(a + i * dt) });
  return { cells, sum: cells.reduce((s, c) => s + 0.5 * dt * c.r * c.r, 0) };
}

/* ∫ g over [a, b] by Simpson's rule on n (even) panels */
function simpson(g: (t: number) => number, a: number, b: number, n = 2000): number {
  const h = (b - a) / n; let s = g(a) + g(b);
  for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * g(a + i * h);
  return (s * h) / 3;
}

/* the area ½∫ f(θ)² dθ swept by the polar curve r = f(θ) from α to β */
export const area = (f: (th: number) => number, a: number, b: number): number => 0.5 * simpson((t) => f(t) ** 2, a, b);

/* the length of a path from t0 to t1, as the limit of its chords */
export function length(p: Path, t0: number, t1: number, n = 4000): number {
  let s = 0, [x, y] = p(t0);
  for (let i = 1; i <= n; i++) { const [u, v] = p(t0 + ((t1 - t0) * i) / n); s += Math.hypot(u - x, v - y); x = u; y = v; }
  return s;
}

/* the sum of the lengths of the n chords joining the points at n equal steps of the parameter */
export function chords(p: Path, t0: number, t1: number, n: number): number { return length(p, t0, t1, n); }

/* ∫ y(t) x′(t) dt from t0 to t1, the signed area under a path (x′ by central differences) */
export function under(p: Path, t0: number, t1: number, n = 4000): number {
  const e = 1e-6 * Math.max(1, Math.abs(t1 - t0));
  return simpson((t) => p(t)[1] * (p(t + e)[0] - p(t - e)[0]) / (2 * e), t0, t1, n);
}

/* The rectangles of a parametric area's Riemann sum on n equal steps of t: the ith over [x(tᵢ₋₁), x(tᵢ)]
   with height y(tᵢ₋₁), and their sum Σ y(tᵢ₋₁)(x(tᵢ) − x(tᵢ₋₁)). */
export type Strip = { readonly x0: number; readonly x1: number; readonly h: number };
export function strips(p: Path, t0: number, t1: number, n: number): { cells: Strip[]; sum: number } {
  const cells: Strip[] = [];
  for (let i = 1; i <= n; i++) {
    const [xa, ya] = p(t0 + ((t1 - t0) * (i - 1)) / n), [xb] = p(t0 + ((t1 - t0) * i) / n);
    cells.push({ x0: xa, x1: xb, h: ya });
  }
  return { cells, sum: cells.reduce((s, c) => s + c.h * (c.x1 - c.x0), 0) };
}

/* the window [lo, hi] of each coordinate a path reaches over [t0, t1] */
export function extent(p: Path, t0: number, t1: number, n = 600): { x: Range; y: Range } {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i <= n; i++) {
    const [x, y] = p(t0 + ((t1 - t0) * i) / n); if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  return { x: [x0, x1], y: [y0, y1] };
}
