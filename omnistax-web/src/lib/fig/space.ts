/* Calculus Chapters 12 to 16 with no canvas and no three.js: points and vectors in space, curves and
   their frames, graphs z = f(x, y) and surfaces r(u, v), planes and lines, vector fields and their flow
   lines, regions of integration and the Riemann boxes over them. Everything is in the book's
   coordinates, z up. The builders return marks, plain records that figlib draws as a three.js scene or,
   without WebGL, as a locked view on a canvas; a colour may be a token (ink, muted, guide) the scene
   reads off the palette when it draws. */
export type V3 = readonly [number, number, number];
export type Range = readonly [number, number];
export type Color = string;
export type Box3 = readonly [Range, Range, Range];
export type Rv = (t: number) => V3;
export type Ruv = (u: number, v: number) => V3;
export type Fxy = (x: number, y: number) => number;
export type Field = (p: readonly number[]) => readonly number[];
export type Dash = readonly [number, number];

/* w and r are canvas units, as a flat figure's strokes are; a sheet's `param` turns its grid
   coordinates (s, t) in [0, 1]² into what a drag on it reports */
export type Mark = (
  | { readonly k: 'line'; readonly pts: readonly V3[]; readonly color: Color; readonly w?: number; readonly dash?: Dash }
  | { readonly k: 'segs'; readonly segs: readonly (readonly [V3, V3])[]; readonly color: Color; readonly w?: number }
  | { readonly k: 'arrow'; readonly a: V3; readonly b: V3; readonly color: Color; readonly w?: number }
  | { readonly k: 'dot'; readonly p: V3; readonly color: Color; readonly r?: number; readonly hollow?: boolean }
  | { readonly k: 'label'; readonly s: string; readonly p: V3; readonly color?: Color; readonly cls?: 'tick' | 'bare' }
  | { readonly k: 'sheet'; readonly rows: readonly (readonly V3[])[]; readonly color: Color; readonly alpha?: number; readonly param?: (s: number, t: number) => readonly number[] }
  | { readonly k: 'faces'; readonly faces: readonly (readonly V3[])[]; readonly color: Color; readonly alpha?: number }
) & { readonly name?: string };   /* a named mark shows its name under the pointer (root 26.6) */

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = (a: V3): number => Math.hypot(a[0], a[1], a[2]);
export const unit = (a: V3): V3 => mul(a, 1 / (norm(a) || 1));
const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;
const span = (n: number, a: number, b: number): number[] => Array.from({ length: n + 1 }, (_, i) => lerp(a, b, i / n));
const TAU = 2 * Math.PI;

/* a unit vector square to n */
export const perp = (n: V3): V3 => unit(cross(n, Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]));

/* ---------- curves ---------- */
export type Frenet = { readonly p: V3; readonly v: V3; readonly a: V3; readonly T: V3; readonly N: V3 | null; readonly B: V3 | null; readonly kappa: number };
/* r(t) with its velocity, acceleration, unit tangent, normal and binormal and its curvature, by central
   differences; where r′ × r″ vanishes (a straight stretch) N and B are null and κ is 0 */
export function frenet(r: Rv, t: number, h = 1e-3): Frenet {
  const p = r(t), f = r(t + h), b = r(t - h);
  const v = mul(sub(f, b), 1 / (2 * h)), a = mul(add(sub(f, mul(p, 2)), b), 1 / (h * h));
  const T = unit(v), c = cross(v, a), cn = norm(c), sp = norm(v);
  if (cn < 1e-9 * Math.max(1, sp ** 3)) return { p, v, a, T, N: null, B: null, kappa: 0 };
  const B = mul(c, 1 / cn);
  return { p, v, a, T, N: cross(B, T), B, kappa: cn / sp ** 3 };
}
/* the circle of radius R about c in the plane square to n */
export function circle(c: V3, n: V3, R: number, m = 72): V3[] {
  const u = perp(n), w = cross(unit(n), u);
  return span(m, 0, TAU).map((a) => add(c, add(mul(u, R * Math.cos(a)), mul(w, R * Math.sin(a)))));
}
export const sample = (r: Rv, [t0, t1]: Range, n = 200): V3[] => span(n, t0, t1).map(r);

/* ---------- surfaces ---------- */
export const partials = (f: Fxy, x: number, y: number, h = 1e-5): readonly [number, number] =>
  [(f(x + h, y) - f(x - h, y)) / (2 * h), (f(x, y + h) - f(x, y - h)) / (2 * h)];
/* r_u and r_v, and their cross product, the normal the parameterisation gives (not unit) */
export function tangents(r: Ruv, u: number, v: number, h = 1e-5): { readonly tu: V3; readonly tv: V3; readonly n: V3 } {
  const tu = mul(sub(r(u + h, v), r(u - h, v)), 1 / (2 * h)), tv = mul(sub(r(u, v + h), r(u, v - h)), 1 / (2 * h));
  return { tu, tv, n: cross(tu, tv) };
}
/* rows[j][i] = r at the (i, j)th point of an n[0] by n[1] grid on U × V */
export const gridOf = (r: Ruv, U: Range, V: Range, n: readonly [number, number]): V3[][] =>
  span(n[1], V[0], V[1]).map((v) => span(n[0], U[0], U[1]).map((u) => r(u, v)));
/* every k-th row and column of a grid as segments, the grid curves drawn over a sheet */
export function gridLines(rows: readonly (readonly V3[])[], k: readonly [number, number]): [V3, V3][] {
  const out: [V3, V3][] = [], nj = rows.length, ni = rows[0]?.length ?? 0;
  const every = (n: number, s: number): number[] => { const st = Math.max(1, Math.round((n - 1) / s)); return Array.from({ length: n }, (_, i) => i).filter((i) => i % st === 0 || i === n - 1); };
  every(nj, k[1]).forEach((j) => { for (let i = 0; i + 1 < ni; i++) out.push([rows[j][i], rows[j][i + 1]]); });
  every(ni, k[0]).forEach((i) => { for (let j = 0; j + 1 < nj; j++) out.push([rows[j][i], rows[j + 1][i]]); });
  return out;
}

/* The level curves g = c of a function on the unit square, by marching squares on an n by n grid of
   cells, joined into polylines of (s, t) points. An edge's crossing is computed once and shared by the
   cells on either side, so the pieces meet exactly; a cell with a corner that is not a number has none. */
export function contours(g: (s: number, t: number) => number, c: number, n = 48): (readonly [number, number])[][] {
  const val = span(n, 0, 1).map((t) => span(n, 0, 1).map((s) => g(s, t) - c));
  const at = new Map<string, readonly [number, number]>();
  const cut = (i: number, j: number, h: boolean): string => {
    const key = `${h ? 'h' : 'v'}${i},${j}`;
    if (!at.has(key)) {
      const a = val[j][i], b = h ? val[j][i + 1] : val[j + 1][i], k = a / (a - b);
      at.set(key, h ? [(i + k) / n, j / n] : [i / n, (j + k) / n]);
    }
    return key;
  };
  const links = new Map<string, string[]>();
  const link = (p: string, q: string): void => { (links.get(p) ?? (links.set(p, []), links.get(p)!)).push(q); (links.get(q) ?? (links.set(q, []), links.get(q)!)).push(p); };
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const a = val[j][i], b = val[j][i + 1], d = val[j + 1][i], e = val[j + 1][i + 1];
    if (![a, b, d, e].every(Number.isFinite)) continue;
    /* the four edges, counterclockwise from the bottom, and which of them the level crosses */
    const edges = [[a, b, () => cut(i, j, true)], [b, e, () => cut(i + 1, j, false)], [d, e, () => cut(i, j + 1, true)], [a, d, () => cut(i, j, false)]] as const;
    const hit = edges.filter(([p, q]) => (p < 0) !== (q < 0)).map(([, , k]) => k());
    if (hit.length === 2) link(hit[0], hit[1]);
    else if (hit.length === 4) {
      const mid = (a + b + d + e) / 4;
      if ((mid < 0) === (a < 0)) { link(hit[0], hit[1]); link(hit[2], hit[3]); } else { link(hit[0], hit[3]); link(hit[1], hit[2]); }
    }
  }
  const used = new Set<string>(), out: (readonly [number, number])[][] = [];
  const walk = (start: string): string[] => {
    const path = [start]; used.add(start);
    for (let cur = start; ;) { const nx = (links.get(cur) ?? []).find((q) => !used.has(q)); if (!nx) break; used.add(nx); path.push(nx); cur = nx; }
    return path;
  };
  [...links.keys()].filter((k) => links.get(k)!.length === 1).concat([...links.keys()]).forEach((k) => {
    if (used.has(k)) return;
    const path = walk(k);
    if (path.length > 2 && (links.get(path[path.length - 1]) ?? []).includes(path[0])) path.push(path[0]);
    out.push(path.map((q) => at.get(q)!));
  });
  return out;
}

/* ---------- regions of integration ----------
   A region is its iterated integral's bounds, its keys written from the outermost integral in:
   { x: [0, 2], y: [(x) => x / 2, 1] } is Type I, { y: [0, 1], x: [0, (y) => 2 * y] } Type II,
   { theta: [0, π], r: [0, (t) => 1 + Math.cos(t)] } polar. In space a third key: z, r and theta with z
   (cylindrical), or rho, phi and theta (spherical). An inner bound is a function of the outer values, in
   order. A point of the region is placed by its coordinates s in the unit square or cube. */
export type Bound = number | ((...outer: number[]) => number);
export type Region = Readonly<Record<string, readonly [Bound, Bound]>>;
const boundAt = (b: Bound, outer: readonly number[]): number => (typeof b === 'number' ? b : b(...outer));
/* the region's own coordinates at s in the unit cube */
export function place(R: Region, s: readonly number[]): number[] {
  const out: number[] = [];
  Object.values(R).forEach(([lo, hi], i) => out.push(lerp(boundAt(lo, out), boundAt(hi, out), s[i])));
  return out;
}
/* a point given by the region's own coordinates, in x, y, z */
export function toXYZ(R: Region, vals: readonly number[]): V3 {
  const v: Record<string, number> = {}; Object.keys(R).forEach((k, i) => { v[k] = vals[i]; });
  if ('rho' in v) { const sp = Math.sin(v.phi); return [v.rho * sp * Math.cos(v.theta), v.rho * sp * Math.sin(v.theta), v.rho * Math.cos(v.phi)]; }
  if ('r' in v) return [v.r * Math.cos(v.theta), v.r * Math.sin(v.theta), v.z ?? 0];
  return [v.x ?? 0, v.y ?? 0, v.z ?? 0];
}
export const regionAt = (R: Region, s: readonly number[]): V3 => toXYZ(R, place(R, s));
/* the keys whose ends are one seam: an angle with constant bounds a full turn apart */
const seams = (R: Region): boolean[] => Object.entries(R).map(([k, [lo, hi]]) => k === 'theta' && typeof lo === 'number' && typeof hi === 'number' && Math.abs(hi - lo) >= TAU - 1e-9);
const extent = (pts: readonly V3[]): number => pts.reduce((m, p) => Math.max(m, norm(sub(p, pts[0]))), 0);
/* A plane region's boundary, counterclockwise in its own coordinates and closed: for a fill, seams included. */
export function outline(R: Region, n = 64): V3[] {
  const e = (f: (k: number) => readonly number[]): V3[] => span(n, 0, 1).map((k) => regionAt(R, f(k)));
  return [...e((k) => [k, 0]), ...e((k) => [1, k]), ...e((k) => [1 - k, 1]), ...e((k) => [0, 1 - k])];
}
/* The region's edges as polylines, for a stroke: the unit square's or cube's edges mapped, leaving out
   the seams of a full turn and those that shrink to a point. */
export function edges(R: Region, n = 64): V3[][] {
  const dims = Object.keys(R).length, seam = seams(R), out: V3[][] = [];
  for (let free = 0; free < dims; free++) {
    const fixed = Array.from({ length: dims }, (_, i) => i).filter((i) => i !== free);
    if (fixed.some((i) => seam[i])) continue;
    for (let m = 0; m < 1 << fixed.length; m++) {
      const pts = span(n, 0, 1).map((k) => { const s = Array(dims).fill(0); s[free] = k; fixed.forEach((i, b) => { s[i] = (m >> b) & 1; }); return regionAt(R, s); });
      if (extent(pts) > 1e-9) out.push(pts);
    }
  }
  return out;
}
/* A solid's boundary: the six faces of the unit cube mapped, each a grid of points wound outward in the
   region's coordinates, leaving out the seams of a full turn and the faces that shrink to a curve. */
export function skins(R: Region, n = 32): V3[][][] {
  const seam = seams(R), out: V3[][][] = [];
  for (let a = 0; a < 3; a++) for (const side of [0, 1]) {
    if (seam[a]) continue;
    const b = (a + 1) % 3, c = (a + 2) % 3, ks = span(n, 0, 1);
    const rows = ks.map((tc) => (side ? ks : [...ks].reverse()).map((tb) => { const s = [0, 0, 0]; s[a] = side; s[b] = tb; s[c] = tc; return regionAt(R, s); }));
    if (area(rows) > 1e-9) out.push(rows);
  }
  return out;
}
/* the four corners of each cell of a grid, as faces */
export const quads = (rows: readonly (readonly V3[])[]): V3[][] => {
  const out: V3[][] = [];
  for (let j = 0; j + 1 < rows.length; j++) for (let i = 0; i + 1 < rows[j].length; i++) out.push([rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]]);
  return out;
};
const area = (rows: readonly (readonly V3[])[]): number => quads(rows).reduce((s, q) => s + norm(cross(sub(q[2], q[0]), sub(q[3], q[1]))) / 2, 0);

/* ---------- Riemann boxes ---------- */
export type Rule = 'mid' | 'll' | 'lr' | 'ul' | 'ur';
export type Cell = { readonly outline: readonly V3[]; readonly at: V3; readonly dA: number; readonly h: number };
/* The double Riemann sum of f over a plane region: its own coordinates' bounding rectangle cut m by n
   (rectangles in x and y, polar rectangles in r and θ), the cells whose sample point lies in the region
   kept. The rule places the sample: mid, or a corner, lower or upper in the second coordinate and left
   or right in the first (y and x for a Cartesian region). dA is the cell's exact area. */
export function riemann2(R: Region, f: Fxy, m: number, n: number, rule: Rule = 'mid'): { readonly cells: Cell[]; readonly sum: number } {
  const [[lo0, hi0], [lo1, hi1]] = Object.values(R), keys = Object.keys(R), polar = keys.includes('r');
  const a0 = boundAt(lo0, []), b0 = boundAt(hi0, []);
  const ends = span(64, a0, b0).flatMap((u) => [boundAt(lo1, [u]), boundAt(hi1, [u])]);
  const a1 = Math.min(...ends), b1 = Math.max(...ends), d0 = (b0 - a0) / m, d1 = (b1 - a1) / n;
  const xyOf = (u: number, w: number): V3 => toXYZ(R, [u, w]);
  /* which way each coordinate's corner lies: the x (or r) one from the second letter, y (or θ) from the first */
  const pick = (k: string, lo: number, d: number): number => {
    if (rule === 'mid') return lo + d / 2;
    const first = k === 'x' || k === 'r';
    return lo + (first ? (rule[1] === 'r' ? d : 0) : (rule[0] === 'u' ? d : 0));
  };
  const cells: Cell[] = []; let sum = 0;
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) {
    const u0 = a0 + i * d0, w0 = a1 + j * d1, su = pick(keys[0], u0, d0), sw = pick(keys[1], w0, d1);
    if (sw < boundAt(lo1, [su]) - 1e-12 || sw > boundAt(hi1, [su]) + 1e-12) continue;
    const dA = polar ? rMid(keys, u0, d0, w0, d1) * d0 * d1 : d0 * d1;
    const at = xyOf(su, sw), h = f(at[0], at[1]);
    const k = polar ? 12 : 1, edge = (p: number, q: number, P: number, Q: number): V3[] => span(k, 0, 1).slice(0, -1).map((t) => xyOf(lerp(p, P, t), lerp(q, Q, t)));
    const ol = [...edge(u0, w0, u0 + d0, w0), ...edge(u0 + d0, w0, u0 + d0, w0 + d1), ...edge(u0 + d0, w0 + d1, u0, w0 + d1), ...edge(u0, w0 + d1, u0, w0)];
    cells.push({ outline: ol, at: [at[0], at[1], h], dA, h }); sum += h * dA;
  }
  return { cells, sum };
}
/* the radius at the middle of a polar cell, which makes r Δr Δθ its exact area */
const rMid = (keys: readonly string[], u0: number, d0: number, w0: number, d1: number): number => (keys[0] === 'r' ? u0 + d0 / 2 : w0 + d1 / 2);

/* ---------- flow lines ---------- */
/* The flow line of a field through p, in two or three dimensions: fourth-order Runge–Kutta steps of
   length h along the field's direction, backward then forward, stopping outside the box, where the field
   vanishes or is not a number, or where the line comes back round to p (a closed orbit, joined). */
export function flow(F: Field, p: readonly number[], box: readonly Range[], o: { readonly h?: number; readonly n?: number } = {}): number[][] {
  const diag = Math.hypot(...box.map(([a, b]) => b - a)), h = o.h ?? diag / 240, n = o.n ?? 2000;
  const dir = (q: readonly number[]): number[] | null => { const v = F(q), l = Math.hypot(...v); return Number.isFinite(l) && l > 1e-12 ? v.map((x) => x / l) : null; };
  const inBox = (q: readonly number[]): boolean => q.every((x, i) => x >= box[i][0] && x <= box[i][1]);
  const step = (q: readonly number[], s: number): number[] | null => {
    const k1 = dir(q); if (!k1) return null;
    const k2 = dir(q.map((x, i) => x + (s / 2) * k1[i])); if (!k2) return null;
    const k3 = dir(q.map((x, i) => x + (s / 2) * k2[i])); if (!k3) return null;
    const k4 = dir(q.map((x, i) => x + s * k3[i])); if (!k4) return null;
    return q.map((x, i) => x + (s / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
  };
  const run = (s: number): { pts: number[][]; closed: boolean } => {
    const pts: number[][] = []; let q = [...p];
    for (let i = 0; i < n; i++) {
      const nx = step(q, s); if (!nx || !inBox(nx)) break;
      if (i > 20 && Math.hypot(...nx.map((x, k) => x - p[k])) < Math.abs(s) * 0.75) return { pts: [...pts, nx, [...p]], closed: true };
      pts.push(nx); q = nx;
    }
    return { pts, closed: false };
  };
  const fwd = run(h);
  if (fwd.closed) return [[...p], ...fwd.pts];
  return [...run(-h).pts.reverse(), [...p], ...fwd.pts];
}

/* ---------- planes and lines ---------- */
const BOX_EDGES = (b: Box3): (readonly [V3, V3])[] => {
  const c = (i: number): V3 => [b[0][i & 1], b[1][(i >> 1) & 1], b[2][(i >> 2) & 1]], out: (readonly [V3, V3])[] = [];
  for (let i = 0; i < 8; i++) for (const bit of [1, 2, 4]) if (!(i & bit)) out.push([c(i), c(i | bit)]);
  return out;
};
/* the polygon in which the plane through p square to n cuts the box, in order round it; [] where it misses */
export function clipPlane(p: V3, n: V3, box: Box3): V3[] {
  const pts: V3[] = [];
  BOX_EDGES(box).forEach(([a, b]) => {
    const da = dot(n, sub(a, p)), db = dot(n, sub(b, p));
    if (da === 0) pts.push(a);
    if ((da < 0 && db > 0) || (da > 0 && db < 0)) pts.push(add(a, mul(sub(b, a), da / (da - db))));
  });
  const uniq = pts.filter((q, i) => pts.findIndex((r) => norm(sub(q, r)) < 1e-9) === i);
  if (uniq.length < 3) return [];
  const c = mul(uniq.reduce(add, [0, 0, 0] as V3), 1 / uniq.length), u = perp(n), w = cross(unit(n), u);
  return uniq.sort((q, r) => Math.atan2(dot(sub(q, c), w), dot(sub(q, c), u)) - Math.atan2(dot(sub(r, c), w), dot(sub(r, c), u)));
}
/* the stretch of the line p + t d inside the box, as its two ends; null where it misses */
export function clipLine(p: V3, d: V3, box: Box3): [V3, V3] | null {
  let lo = -Infinity, hi = Infinity;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-12) { if (p[i] < box[i][0] || p[i] > box[i][1]) return null; continue; }
    const t0 = (box[i][0] - p[i]) / d[i], t1 = (box[i][1] - p[i]) / d[i];
    lo = Math.max(lo, Math.min(t0, t1)); hi = Math.min(hi, Math.max(t0, t1));
  }
  return lo <= hi ? [add(p, mul(d, lo)), add(p, mul(d, hi))] : null;
}

/* ---------- a stroke in three dimensions ---------- */
/* The skin of a tube of radius r along a polyline, sides faces round: positions and triangle indices for
   a buffer geometry. The ring at each point is carried along the line so it does not twist. */
export function tube(pts: readonly V3[], r: number, sides = 6): { readonly pos: number[]; readonly idx: number[] } {
  const pos: number[] = [], idx: number[] = [];
  if (pts.length < 2) return { pos, idx };
  let nrm: V3 | null = null;
  pts.forEach((p, i) => {
    const t = unit(sub(pts[Math.min(i + 1, pts.length - 1)], pts[Math.max(i - 1, 0)]));
    nrm = nrm ? unit(sub(nrm, mul(t, dot(nrm, t)))) : perp(t);
    if (!Number.isFinite(nrm[0]) || norm(nrm) < 0.5) nrm = perp(t);
    const bi = cross(t, nrm);
    for (let k = 0; k < sides; k++) { const a = (k / sides) * TAU, q = add(p, add(mul(nrm, r * Math.cos(a)), mul(bi, r * Math.sin(a)))); pos.push(q[0], q[1], q[2]); }
    if (i) for (let k = 0; k < sides; k++) { const a = (i - 1) * sides + k, b = (i - 1) * sides + ((k + 1) % sides), c = a + sides, d = b + sides; idx.push(a, b, d, a, d, c); }
  });
  return { pos, idx };
}

/* ---------- builders: what a figure draws ---------- */
type Named = { readonly name?: string };
const named = (s: string | undefined, p: V3, color?: Color): Mark[] => (s ? [{ k: 'label', s, p, color }] : []);
/* the dashed path from a along x, then y, then z to b: the components laid along the axes */
const legs = (a: V3, b: V3): Mark => ({ k: 'line', pts: [a, [b[0], a[1], a[2]], [b[0], b[1], a[2]], b], color: 'guide', w: 2.5, dash: [4, 8] });
const niceStep = (lo: number, hi: number): number => { const raw = (hi - lo) / 5, p = 10 ** Math.floor(Math.log10(raw)), m = raw / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; };
const fmtTick = (v: number): string => String(+v.toFixed(6)).replace('-', '−');

/* The axes through the origin (or the box's near corner where the origin is outside), an arrowhead at
   each positive end with its name, and ticks at round steps labelled as page text, the negative ones only
   where the axis runs two steps below zero. ticks is a step, one per axis, or 0 for none. */
export function axes(box: Box3, o: { readonly ticks?: number | readonly [number, number, number]; readonly names?: readonly [string, string, string]; readonly color?: Color } = {}): Mark[] {
  const color = o.color ?? 'muted', names = o.names ?? ['$x$', '$y$', '$z$'];
  const org = box.map(([a, b]) => (a <= 0 && b >= 0 ? 0 : a)) as unknown as V3;
  const diag = Math.hypot(...box.map(([a, b]) => b - a)), tl = diag * 0.012, out: Mark[] = [];
  const along = (i: number, v: number): V3 => { const q = [...org]; q[i] = v; return q as unknown as V3; };
  const across: readonly V3[] = [[0, 1, 0], [1, 0, 0], [0, 1, 0]];
  box.forEach(([lo, hi], i) => {
    out.push({ k: 'arrow', a: along(i, lo), b: along(i, hi), color, w: 2.5 });
    out.push({ k: 'label', s: names[i], p: along(i, hi + diag * 0.035), cls: 'bare' });
    const st = o.ticks === undefined ? niceStep(lo, hi) : typeof o.ticks === 'number' ? o.ticks : o.ticks[i];
    if (!(st > 0)) return;
    for (let v = Math.ceil(lo / st) * st; v < hi - st * 0.4; v += st) {
      if (Math.abs(v - org[i]) < st * 1e-6) continue;
      const q = along(i, v), d = mul(across[i], tl);
      out.push({ k: 'segs', segs: [[sub(q, d), add(q, d)]], color, w: 2 });
      if (v > 0 || lo <= -2 * st) out.push({ k: 'label', s: fmtTick(v), p: sub(q, mul(across[i], tl * 4)), cls: 'tick' });
    }
  });
  return out;
}
/* a point, its name, and with drop its feet in the xy-plane and on the axes */
export const point = (p: V3, color: Color, o: Named & { readonly drop?: boolean; readonly r?: number } = {}): Mark[] => [
  ...(o.drop ? [legs([0, 0, 0], p)] : []), { k: 'dot', p, color, r: o.r }, ...named(o.name, p, color),
];
/* the arrow from a to b, its name at the head, and with drop its components laid from the tail along the axes */
export const vector = (a: V3, b: V3, color: Color, o: Named & { readonly drop?: boolean; readonly w?: number } = {}): Mark[] => [
  ...(o.drop ? [legs(a, b)] : []), { k: 'arrow', a, b, color, w: o.w ?? 5 }, ...named(o.name, b, color),
];
export const curve = (r: Rv, T: Range, color: Color, o: { readonly n?: number; readonly w?: number; readonly dash?: Dash } = {}): Mark[] =>
  [{ k: 'line', pts: sample(r, T, o.n), color, w: o.w ?? 5, dash: o.dash }];
/* the point r(t) and its unit tangent, normal and binormal, len long, in their three colours */
export function frame(r: Rv, t: number, colors: readonly [Color, Color, Color], o: { readonly len?: number; readonly names?: readonly [string, string, string] | null } = {}): Mark[] {
  const f = frenet(r, t), len = o.len ?? 1, names = o.names === undefined ? ['$\\mathbf{T}$', '$\\mathbf{N}$', '$\\mathbf{B}$'] : o.names;
  return [f.T, f.N, f.B].flatMap((u, i): Mark[] => (u ? vector(f.p, add(f.p, mul(u, len)), colors[i], { name: names?.[i], w: 4 }) : [])).concat([{ k: 'dot', p: f.p, color: 'ink' }]);
}
/* a sheet and its grid curves, grid lines each way */
const sheet = (rows: V3[][], color: Color, alpha: number, grid: number, param: (s: number, t: number) => readonly number[]): Mark[] => [
  { k: 'sheet', rows, color, alpha, param },
  ...(grid > 0 ? [{ k: 'segs', segs: gridLines(rows, [grid, grid]), color: 'ink', w: 1 } as Mark] : []),
];
/* The graph z = f(x, y) over a plane region, n by n, its grid curves, and its level curves f = c for
   each of levels drawn on the floor beneath (z = floor), and with lift on the surface too. A drag on it
   reports [x, y]. */
export function graph(f: Fxy, R: Region, color: Color, o: { readonly n?: number; readonly grid?: number; readonly alpha?: number; readonly levels?: readonly number[]; readonly floor?: number; readonly levelColor?: Color; readonly lift?: boolean } = {}): Mark[] {
  const n = o.n ?? 40, xy = (s: number, t: number): V3 => regionAt(R, [s, t]);
  const rows = gridOf((s, t) => { const p = xy(s, t); return [p[0], p[1], f(p[0], p[1])]; }, [0, 1], [0, 1], [n, n]);
  const lc = o.levelColor ?? color, floor = o.floor ?? 0;
  const levels = (o.levels ?? []).flatMap((c) => contours((s, t) => { const p = xy(s, t); return f(p[0], p[1]); }, c, n).flatMap((line): Mark[] => {
    const pts = line.map(([s, t]) => xy(s, t));
    return [{ k: 'line', pts: pts.map((p) => [p[0], p[1], floor] as V3), color: lc, w: 3 }, ...(o.lift ? [{ k: 'line', pts: pts.map((p) => [p[0], p[1], c] as V3), color: lc, w: 3 } as Mark] : [])];
  }));
  return [...sheet(rows, color, o.alpha ?? 0.8, o.grid ?? 10, (s, t) => xy(s, t).slice(0, 2)), ...levels];
}
/* the tangent plane to z = f(x, y) at (x₀, y₀), a square patch 2 size across, and the point */
export function tangent(f: Fxy, x0: number, y0: number, color: Color, o: { readonly size?: number; readonly alpha?: number } = {}): Mark[] {
  const [fx, fy] = partials(f, x0, y0), z0 = f(x0, y0), s = o.size ?? 1, L = (x: number, y: number): V3 => [x, y, z0 + fx * (x - x0) + fy * (y - y0)];
  const rows = gridOf(L, [x0 - s, x0 + s], [y0 - s, y0 + s], [4, 4]);
  return [{ k: 'sheet', rows, color, alpha: o.alpha ?? 0.55 }, { k: 'line', pts: [rows[0][0], rows[0][4], rows[4][4], rows[4][0], rows[0][0]], color, w: 2.5 }, { k: 'dot', p: [x0, y0, z0], color: 'ink' }];
}
/* the surface r(u, v) on U × V and its grid curves; a drag on it reports [u, v] */
export const surface = (r: Ruv, U: Range, V: Range, color: Color, o: { readonly n?: readonly [number, number]; readonly grid?: number; readonly alpha?: number } = {}): Mark[] =>
  sheet(gridOf(r, U, V, o.n ?? [40, 40]), color, o.alpha ?? 0.8, o.grid ?? 10, (s, t) => [lerp(U[0], U[1], s), lerp(V[0], V[1], t)]);
/* the unit normals r_u × r_v, len long, at the centres of an n[0] by n[1] grid on U × V */
export function normals(r: Ruv, U: Range, V: Range, color: Color, o: { readonly n?: readonly [number, number]; readonly len?: number } = {}): Mark[] {
  const [nu, nv] = o.n ?? [4, 4], len = o.len ?? 0.6, out: Mark[] = [];
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const u = lerp(U[0], U[1], (i + 0.5) / nu), v = lerp(V[0], V[1], (j + 0.5) / nv), { n } = tangents(r, u, v);
    if (norm(n) > 1e-12) out.push({ k: 'arrow', a: r(u, v), b: add(r(u, v), mul(unit(n), len)), color, w: 3.5 });
  }
  return out;
}
/* The patch r([u, u + du] × [v, v + dv]) over the surface, its edge, and at its corner the tangent
   vectors t_u du and t_v dv with the parallelogram they span, the patch's linear stand-in. */
export function patch(r: Ruv, u: number, v: number, du: number, dv: number, color: Color, o: { readonly names?: readonly [string, string] | null } = {}): Mark[] {
  const rows = gridOf(r, [u, u + du], [v, v + dv], [8, 8]), p = r(u, v), { tu, tv } = tangents(r, u, v), a = add(p, mul(tu, du)), b = add(p, mul(tv, dv));
  const names = o.names === undefined ? ['$\\mathbf{t}_u\\Delta u$', '$\\mathbf{t}_v\\Delta v$'] : o.names;
  return [
    { k: 'sheet', rows, color, alpha: 0.95 },
    { k: 'line', pts: [...rows[0], ...rows.map((row) => row[8]), ...[...rows[8]].reverse(), ...rows.map((row) => row[0]).reverse()], color: 'ink', w: 2.5 },
    { k: 'line', pts: [a, add(a, sub(b, p)), b], color: 'guide', w: 2.5, dash: [10, 10] },
    ...vector(p, a, 'ink', { name: names?.[0], w: 4 }), ...vector(p, b, 'ink', { name: names?.[1], w: 4 }),
  ];
}
/* The plane through p square to n: its polygon inside the box, or a square of half-side size about p. */
export function plane(p: V3, n: V3, color: Color, o: { readonly box?: Box3; readonly size?: number; readonly alpha?: number } = {}): Mark[] {
  const u = perp(n), w = cross(unit(n), u), s = o.size ?? 2;
  const poly = o.box ? clipPlane(p, n, o.box) : [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => add(p, add(mul(u, a * s), mul(w, b * s))));
  return poly.length ? [{ k: 'faces', faces: [poly], color, alpha: o.alpha ?? 0.45 }, { k: 'line', pts: [...poly, poly[0]], color, w: 2.5 }] : [];
}
/* the line p + t d for t in T, or its stretch inside the box */
export function line(p: V3, d: V3, color: Color, o: { readonly t?: Range; readonly box?: Box3; readonly w?: number; readonly dash?: Dash } = {}): Mark[] {
  const T = o.t ?? [-1, 1], ends = o.box ? clipLine(p, d, o.box) : [add(p, mul(d, T[0])), add(p, mul(d, T[1]))];
  return ends ? [{ k: 'line', pts: ends, color, w: o.w ?? 4, dash: o.dash }] : [];
}
/* A field in space as arrows at the centres of an n[0] × n[1] × n[2] grid of the box, the longest 0.9 of
   a cell, or scale long per unit of |F|. */
export function field(F: (p: V3) => V3, box: Box3, color: Color, o: { readonly n?: readonly [number, number, number]; readonly scale?: number } = {}): Mark[] {
  const n = o.n ?? [5, 5, 5], at: V3[] = [];
  for (let i = 0; i < n[0]; i++) for (let j = 0; j < n[1]; j++) for (let k = 0; k < n[2]; k++)
    at.push([lerp(box[0][0], box[0][1], (i + 0.5) / n[0]), lerp(box[1][0], box[1][1], (j + 0.5) / n[1]), lerp(box[2][0], box[2][1], (k + 0.5) / n[2])]);
  const vs = at.map((p) => F(p)), big = Math.max(...vs.map((v) => (Number.isFinite(norm(v)) ? norm(v) : 0)));
  const cell = Math.min(...box.map(([a, b], i) => (b - a) / n[i])), k = o.scale ?? (big > 0 ? (0.9 * cell) / big : 0);
  return at.flatMap((p, i): Mark[] => (Number.isFinite(norm(vs[i])) && norm(vs[i]) * k > cell * 0.04 ? [{ k: 'arrow', a: p, b: add(p, mul(vs[i], k)), color, w: 3 }] : []));
}
/* a solid region's boundary as translucent sheets, its edges in ink */
export const solid = (R: Region, color: Color, o: { readonly n?: number; readonly alpha?: number } = {}): Mark[] => [
  ...skins(R, o.n ?? 32).map((rows): Mark => ({ k: 'sheet', rows, color, alpha: o.alpha ?? 0.55 })),
  ...edges(R, 2 * (o.n ?? 32)).map((pts): Mark => ({ k: 'line', pts, color: 'ink', w: 2.5 })),
];
/* the column over each cell of a Riemann sum, from the plane up (or down) to its height, its edges in ink */
export function boxes(cells: readonly Cell[], color: Color, o: { readonly alpha?: number } = {}): Mark[] {
  const faces: V3[][] = [], segs: [V3, V3][] = [];
  cells.forEach(({ outline: ol, h }) => {
    const top = ol.map((p): V3 => [p[0], p[1], h]), bot = ol.map((p): V3 => [p[0], p[1], 0]);
    faces.push(top, [...bot].reverse());
    ol.forEach((_, i) => { const j = (i + 1) % ol.length; faces.push([bot[i], bot[j], top[j], top[i]]); segs.push([top[i], top[j]], [bot[i], bot[j]]); });
    [0, Math.floor(ol.length / 4), Math.floor(ol.length / 2), Math.floor((3 * ol.length) / 4)].forEach((i) => segs.push([bot[i], top[i]]));
  });
  return [{ k: 'faces', faces, color, alpha: o.alpha ?? 0.75 }, { k: 'segs', segs, color: 'ink', w: 1 }];
}
