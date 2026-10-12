/* Calculus Chapter 8, with no canvas: the segments of a direction field of y′ = f(x, y), the solution
   through a point traced both ways by fourth-order Runge–Kutta steps, and Euler's Method. figlib draws
   what these return; every point is in the graph's own units. */
export type Fxy = (x: number, y: number) => number;
export type P2 = readonly [number, number];
type Range = readonly [number, number];

/* the centres of an n[0] by n[1] grid of cells over the window */
export function grid(xr: Range, yr: Range, n: readonly [number, number]): P2[] {
  const out: P2[] = [];
  for (let j = 0; j < n[1]; j++) for (let i = 0; i < n[0]; i++)
    out.push([xr[0] + ((i + 0.5) * (xr[1] - xr[0])) / n[0], yr[0] + ((j + 0.5) * (yr[1] - yr[0])) / n[1]]);
  return out;
}

/* The two ends of the segment of slope m centred on (x, y) that is len canvas units long, where the
   frame draws sx canvas units per unit of x and sy per unit of y (both positive). A slope that is not
   a number has no segment; an infinite one is vertical. */
export function segment(x: number, y: number, m: number, len: number, sx: number, sy: number): [P2, P2] | null {
  if (Number.isNaN(m)) return null;
  if (!Number.isFinite(m)) { const d = len / 2 / sy; return [[x, y - d], [x, y + d]]; }
  const a = Math.atan(m * (sy / sx)), dx = (Math.cos(a) * len) / 2 / sx;
  return [[x - dx, y - m * dx], [x + dx, y + m * dx]];
}

/* The solution of y′ = f(x, y) through p, from the window's left edge to its right, left to right.
   The step shrinks where the solution is steep against the window's shape, and the trace stops
   where a value is not finite or the solution has run a window's height beyond it. */
export function trace(f: Fxy, p: P2, xr: Range, yr: Range, o: { readonly n?: number } = {}): P2[] {
  const span = yr[1] - yr[0], h0 = (xr[1] - xr[0]) / (o.n ?? 400), k = (xr[1] - xr[0]) / span;
  const out = (y: number): boolean => !Number.isFinite(y) || y < yr[0] - span || y > yr[1] + span;
  const run = (dir: 1 | -1): P2[] => {
    const pts: P2[] = []; let [x, y] = p;
    for (let i = 0; i < 40000; i++) {
      if (dir > 0 ? x >= xr[1] : x <= xr[0]) break;
      const m = f(x, y); if (!Number.isFinite(m)) break;
      const h = dir * Math.min(h0 / Math.max(1, Math.abs(m) * k), Math.abs((dir > 0 ? xr[1] : xr[0]) - x));
      const k1 = m, k2 = f(x + h / 2, y + (h / 2) * k1), k3 = f(x + h / 2, y + (h / 2) * k2), k4 = f(x + h, y + h * k3);
      const yn = y + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
      if (out(yn)) { if (Number.isFinite(yn)) pts.push([x + h, yn]); break; }
      x += h; y = yn; pts.push([x, y]);
    }
    return pts;
  };
  return [...run(-1).reverse(), p, ...run(1)];
}

/* Euler's Method from p with step h for n steps: xₙ = x₀ + nh, yₙ = yₙ₋₁ + h f(xₙ₋₁, yₙ₋₁) */
export function euler(f: Fxy, p: P2, h: number, n: number): P2[] {
  const pts: P2[] = [p];
  for (let i = 1; i <= n; i++) { const [x, y] = pts[i - 1]; pts.push([p[0] + i * h, y + h * f(x, y)]); }
  return pts;
}
