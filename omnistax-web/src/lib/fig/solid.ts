/* Solids and surfaces of revolution, with no canvas and no three.js: a region of the
   book's plane as its closed outline, the outline turned about a line of that plane,
   the faces of the skin it sweeps, and the numbers a figure writes beside it. figlib
   draws what these return, as a three.js mesh or as a locked view on the canvas.
   The plane is the book's: x right, y up, z toward the reader. */
export type P2 = readonly [number, number];
export type P3 = readonly [number, number, number];
export type Face = readonly P3[];
export type Fn = (v: number) => number;
/* the axis of revolution, a line of the plane: the vertical line x = c or the horizontal line y = c */
export type Axis = { readonly x: number } | { readonly y: number };
/* the angles turned through, in radians, and the steps a full turn is cut into */
export type Sweep = { readonly from?: number; readonly to?: number; readonly m?: number };
export type Rule = 'left' | 'right' | 'mid';

const TAU = 2 * Math.PI;
const span = (n: number, a: number, b: number): number[] => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);

/* The outline of the region between y = top(x) and y = bottom(x) over [a, b]: along the bottom left to right, then back along the top. */
export function between(top: Fn, bottom: Fn, a: number, b: number, n = 64): P2[] {
  const xs = span(n, a, b);
  return [...xs.map((x): P2 => [x, bottom(x)]), ...xs.reverse().map((x): P2 => [x, top(x)])];
}
/* The outline of the region between x = right(y) and x = left(y) over [c, d]. */
export function betweenY(right: Fn, left: Fn, c: number, d: number, n = 64): P2[] {
  const ys = span(n, c, d);
  return [...ys.map((y): P2 => [left(y), y]), ...ys.reverse().map((y): P2 => [right(y), y])];
}
export const rect = (x0: number, x1: number, y0: number, y1: number): P2[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

/* The n rectangles of a Riemann sum for the region between top and bottom, each from bottom(x*) to top(x*): turned about
   a horizontal axis they are disks or washers, about a vertical one cylindrical shells. */
export function strips(top: Fn, bottom: Fn, a: number, b: number, n: number, rule: Rule = 'mid'): P2[][] {
  const w = (b - a) / n, at = (x0: number): number => (rule === 'left' ? x0 : rule === 'right' ? x0 + w : x0 + w / 2);
  return Array.from({ length: n }, (_, i) => { const x0 = a + i * w, s = at(x0); return rect(x0, x0 + w, bottom(s), top(s)); });
}
/* The same for the region between x = right(y) and x = left(y), in horizontal rectangles. */
export function stripsY(right: Fn, left: Fn, c: number, d: number, n: number, rule: Rule = 'mid'): P2[][] {
  const h = (d - c) / n, at = (y0: number): number => (rule === 'left' ? y0 : rule === 'right' ? y0 + h : y0 + h / 2);
  return Array.from({ length: n }, (_, i) => { const y0 = c + i * h, s = at(y0); return rect(left(s), right(s), y0, y0 + h); });
}

/* A point of the plane turned by phi about the axis; at phi = π/2 it stands toward the reader. */
export function turn(p: P2, axis: Axis, phi: number): P3 {
  if ('y' in axis) { const r = p[1] - axis.y; return [p[0], axis.y + r * Math.cos(phi), r * Math.sin(phi)]; }
  const r = p[0] - axis.x; return [axis.x + r * Math.cos(phi), p[1], r * Math.sin(phi)];
}
const angles = ({ from = 0, to = TAU, m = 48 }: Sweep): number[] => span(Math.max(1, Math.ceil((m * Math.abs(to - from)) / TAU)), from, to);
export const full = ({ from = 0, to = TAU }: Sweep): boolean => Math.abs(to - from) >= TAU - 1e-9;
/* the circle, or the arc of it, that one point traces */
export const ring = (p: P2, axis: Axis, sweep: Sweep = {}): P3[] => angles(sweep).map((a) => turn(p, axis, a));

/* The outline cut where it turns sharply, so a mesh keeps its edges crisp: each run is smooth within itself. A closed
   outline with no sharp corner is one run that ends where it began. */
export function runs(line: readonly P2[], closed = true, creaseDeg = 35): P2[][] {
  const n = line.length, cos = Math.cos((creaseDeg * Math.PI) / 180);
  const sharp = (i: number): boolean => {
    const p = line[(i - 1 + n) % n], q = line[i], r = line[(i + 1) % n];
    const u = [q[0] - p[0], q[1] - p[1]], v = [r[0] - q[0], r[1] - q[1]], lu = Math.hypot(u[0], u[1]), lv = Math.hypot(v[0], v[1]);
    return lu > 0 && lv > 0 && (u[0] * v[0] + u[1] * v[1]) / (lu * lv) < cos;
  };
  const cut = Array.from({ length: n }, (_, i) => (closed || (i > 0 && i < n - 1)) && sharp(i));
  const first = cut.indexOf(true);
  if (!closed) {
    const out: P2[][] = []; let cur: P2[] = [line[0]];
    for (let i = 1; i < n; i++) { cur.push(line[i]); if (cut[i] && i < n - 1) { out.push(cur); cur = [line[i]]; } }
    out.push(cur); return out;
  }
  if (first < 0) return [[...line, line[0]]];
  const out: P2[][] = []; let cur: P2[] = [line[first]];
  for (let k = 1; k <= n; k++) { const i = (first + k) % n; cur.push(line[i]); if (cut[i]) { out.push(cur); cur = [line[i]]; } }
  return out;
}

/* The grid a run sweeps: one row of turned points per angle. */
export const grid = (run: readonly P2[], axis: Axis, sweep: Sweep = {}): P3[][] => angles(sweep).map((a) => run.map((p) => turn(p, axis, a)));

/* The skin the outline sweeps turning through the sweep: four-cornered faces, one per outline edge per step. A closed
   outline sweeps the skin of a solid; an open one (a curve) a surface of revolution. */
export function lathe(line: readonly P2[], axis: Axis, sweep: Sweep = {}, closed = true): Face[] {
  const pts = closed ? [...line, line[0]] : [...line], rows = grid(pts, axis, sweep), out: Face[] = [];
  for (let j = 0; j + 1 < rows.length; j++) for (let i = 0; i + 1 < pts.length; i++) out.push([rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]]);
  return out;
}

/* The triangles of a simple polygon, by clipping ears: index triples into the polygon. */
export function triangulate(poly: readonly P2[]): [number, number, number][] {
  const signed = poly.reduce((s, p, i) => { const q = poly[(i + 1) % poly.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0);
  const idx = poly.map((_, i) => i), out: [number, number, number][] = [];
  const cross = (a: P2, b: P2, c: P2): number => ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) * Math.sign(signed || 1);
  /* on an edge counts as inside, so a reflex corner lying on the diagonal blocks the ear */
  const inside = (p: P2, a: P2, b: P2, c: P2): boolean => cross(a, b, p) >= -1e-12 && cross(b, c, p) >= -1e-12 && cross(c, a, p) >= -1e-12;
  const same = (p: P2, q: P2): boolean => Math.abs(p[0] - q[0]) < 1e-12 && Math.abs(p[1] - q[1]) < 1e-12;
  let guard = 0;
  while (idx.length > 3 && guard++ < 10000) {
    let clipped = false;
    for (let k = 0; k < idx.length; k++) {
      const i0 = idx[(k - 1 + idx.length) % idx.length], i1 = idx[k], i2 = idx[(k + 1) % idx.length];
      const [a, b, c] = [poly[i0], poly[i1], poly[i2]];
      if (cross(a, b, c) <= 1e-14) continue;
      if (idx.some((j) => j !== i0 && j !== i1 && j !== i2 && !same(poly[j], a) && !same(poly[j], b) && !same(poly[j], c) && inside(poly[j], a, b, c))) continue;
      out.push([i0, i1, i2]); idx.splice(k, 1); clipped = true; break;
    }
    if (!clipped) { const [i0, i1, i2] = idx; out.push([i0, i1, i2]); idx.splice(1, 1); }   /* a degenerate run: drop a corner */
  }
  if (idx.length === 3) out.push([idx[0], idx[1], idx[2]]);
  return out;
}

/* The two flat faces where a sweep short of a full turn is cut, the region itself at each end, as triangles. */
export function cuts(line: readonly P2[], axis: Axis, sweep: Sweep = {}): Face[] {
  if (full(sweep)) return [];
  const tris = triangulate(line), { from = 0, to = TAU } = sweep;
  return [from, to].flatMap((a) => tris.map((t) => t.map((i) => turn(line[i], axis, a))));
}
/* the closed skin of the solid the region sweeps */
export const solid = (line: readonly P2[], axis: Axis, sweep: Sweep = {}): Face[] => [...lathe(line, axis, sweep), ...cuts(line, axis, sweep)];

const sub = (a: P3, b: P3): P3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const crossP = (a: P3, b: P3): P3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: P3, b: P3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/* a face's normal, by Newell's method, unit length (zero for a degenerate face) */
export function normal(f: Face): P3 {
  let x = 0, y = 0, z = 0;
  f.forEach((p, i) => { const q = f[(i + 1) % f.length]; x += (p[1] - q[1]) * (p[2] + q[2]); y += (p[2] - q[2]) * (p[0] + q[0]); z += (p[0] - q[0]) * (p[1] + q[1]); });
  const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l];
}
/* The volume the faces enclose, by the divergence theorem over a fan of each face; the faces of a closed skin, wound
   either way consistently. */
export function volume(faces: readonly Face[]): number {
  const c = faces.length ? faces[0][0] : ([0, 0, 0] as P3);
  return Math.abs(faces.reduce((s, f) => {
    let v = 0; for (let i = 1; i + 1 < f.length; i++) v += dot(sub(f[0], c), crossP(sub(f[i], c), sub(f[i + 1], c)));
    return s + v;
  }, 0)) / 6;
}
/* the area of the faces */
export const area = (faces: readonly Face[]): number => faces.reduce((s, f) => {
  let a = 0; for (let i = 1; i + 1 < f.length; i++) { const n = crossP(sub(f[i], f[0]), sub(f[i + 1], f[0])); a += Math.hypot(n[0], n[1], n[2]) / 2; }
  return s + a;
}, 0);

/* A locked camera for the canvas, the same pinhole and lamp as figlib's `view`: it stands at yaw and pitch about `at`,
   dist logical units away, a scene unit drawn s units long. P is the point on the canvas, depth its distance in front
   of the camera, light the share of ink a face facing n takes (0 lit, 0.34 in the dark), either side counting as its front. */
export type CamOpts = { readonly yaw: number; readonly pitch: number; readonly dist: number; readonly cx: number; readonly cy: number; readonly s: number; readonly at?: P3 };
export type Cam = { readonly P: (p: P3) => P2; readonly depth: (p: P3) => number; readonly light: (n: P3) => number };
export function camera({ yaw, pitch, dist, cx, cy, s, at = [0, 0, 0] }: CamOpts): Cam {
  const unit = (v: P3): P3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const e: P3 = [dist * Math.sin(yaw) * Math.cos(pitch), dist * Math.sin(pitch), dist * Math.cos(yaw) * Math.cos(pitch)];
  const f = unit([-e[0], -e[1], -e[2]]), r = unit(crossP(f, [0, 1, 0])), u = crossP(r, f), lamp = unit([-0.45, 0.85, 0.55]);
  const q = (p: P3): P3 => sub([(p[0] - at[0]) * s, (p[1] - at[1]) * s, (p[2] - at[2]) * s], e);
  return {
    P: (p) => { const v = q(p), z = dot(v, f); return [cx + (dist * dot(v, r)) / z, cy - (dist * dot(v, u)) / z]; },
    depth: (p) => dot(q(p), f),
    light: (n) => 0.34 * (1 - Math.abs(dot(unit(n), lamp))),
  };
}
/* the faces from the farthest to the nearest, for a painter */
export const backToFront = (faces: readonly Face[], cam: Cam): Face[] =>
  faces.map((f) => ({ f, d: f.reduce((s, p) => s + cam.depth(p), 0) / f.length })).sort((a, b) => b.d - a.d).map((x) => x.f);
