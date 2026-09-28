/* The pure half of the Manim layer: easing, a polyline drawn along its length,
   the story clock of a tour and the key matching of a formula morph. Nothing
   here touches the page; figlib wraps it in trackers, transports and KaTeX. */

/* ---------- easing ----------
   A map from linear progress on [0, 1] to eased progress, 0 at 0 and 1 at 1
   (thereAndBack returns to 0). `smooth` is Manim's default; `linear` is for
   time itself. */
export type Ease = (t: number) => number;
const unit = (t: number): number => Math.min(1, Math.max(0, t));
const sigmoid = (x: number): number => 1 / (1 + Math.exp(-x));
const SMOOTH_K = 10, SMOOTH_E = sigmoid(-SMOOTH_K / 2);
const smooth: Ease = (t) => unit((sigmoid(SMOOTH_K * (unit(t) - 0.5)) - SMOOTH_E) / (1 - 2 * SMOOTH_E));
export const ease = {
  linear: ((t) => unit(t)) as Ease,
  smooth,
  out: ((t) => 1 - (1 - unit(t)) ** 3) as Ease,
  inOut: ((t) => { const u = unit(t); return u < 0.5 ? 4 * u ** 3 : 1 - (-2 * u + 2) ** 3 / 2; }) as Ease,
  thereAndBack: ((t) => smooth(unit(t) < 0.5 ? 2 * unit(t) : 2 - 2 * unit(t))) as Ease,
} as const;

export const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

/* ---------- a polyline drawn along its length ----------
   The first fraction k of a polyline by arc length, its last point cut where
   the length runs out. Points may be 2D or 3D; a curve that arrives draws
   partial(pts, k) as k runs to 1, and an arrow grown from its tail puts its
   head on the last point. */
export type PointN = readonly number[];
export function partial<P extends PointN>(pts: readonly P[], k: number): P[] {
  if (pts.length < 2 || k >= 1) return pts.slice();
  if (k <= 0) return pts.slice(0, 1);
  const seg = pts.slice(1).map((p, i) => Math.hypot(...p.map((x, j) => x - pts[i][j])));
  let left = k * seg.reduce((s, x) => s + x, 0);
  const out: P[] = [pts[0]];
  for (let i = 0; i < seg.length; i += 1) {
    if (seg[i] >= left) { const f = seg[i] > 0 ? left / seg[i] : 1; out.push(pts[i].map((x, j) => lerp(x, pts[i + 1][j], f)) as unknown as P); return out; }
    left -= seg[i]; out.push(pts[i + 1]);
  }
  return out;
}

/* ---------- the story clock ----------
   A tour is a list of beats, each a motion of `ms` followed by a rest. The
   state at story time s depends only on s: a scripted value is the base
   value carried through every beat that scripts it, eased over the beat
   that is moving it. A number glides; anything else switches at the start
   of its beat. */
export type BeatTime = { readonly ms?: number; readonly rest?: number; readonly ease?: Ease };
export const BEAT_MS = 1200, REST_MS = 1000;
export type Timeline = { readonly starts: readonly number[]; readonly moves: readonly number[]; readonly total: number };
export function timeline(beats: readonly BeatTime[]): Timeline {
  const moves = beats.map((b) => Math.max(0, b.ms ?? BEAT_MS));
  const spans = beats.map((b, i) => moves[i] + Math.max(0, b.rest ?? REST_MS));
  const starts = spans.map((_, i) => spans.slice(0, i).reduce((s, x) => s + x, 0));
  return { starts, moves, total: spans.reduce((s, x) => s + x, 0) };
}
/* the beat under story time s (the last beat whose start is at or before s) */
export const beatAt = (tl: Timeline, s: number): number => Math.max(0, tl.starts.reduce((b, st, i) => (s >= st ? i : b), 0));
/* beat i's eased motion progress at story time s: 0 before it starts, 1 once it has moved */
export const progressAt = (tl: Timeline, beats: readonly BeatTime[], i: number, s: number): number => {
  const m = tl.moves[i], t = s - tl.starts[i];
  if (t < 0) return 0;
  return t < m ? (beats[i].ease ?? smooth)(t / m) : 1;
};
export type Scripted = number | string;
export function valueAt<V extends Scripted>(base: V, targets: readonly (V | undefined)[], tl: Timeline, beats: readonly BeatTime[], s: number): V {
  return targets.reduce<V>((v, target, i) => {
    if (target === undefined || s < tl.starts[i]) return v;
    if (typeof target !== 'number' || typeof v !== 'number') return target;
    return lerp(v, target, progressAt(tl, beats, i, s)) as V;
  }, base);
}

/* ---------- formula morph keys ----------
   A term is tagged \mk{key}{...}. Two renders with the same set of keys are
   the same formula with new numbers and swap plainly; otherwise the kept keys
   slide, the dropped fade and the added arrive. */
export const MK_MACRO = '\\htmlData{mk=#1}{#2}';
export const mkKeys = (tex: string): string[] => [...new Set(Array.from(tex.matchAll(/\\mk\{([^{}]*)\}/g), (m) => m[1]))];
export type MorphPlan = { readonly same: boolean; readonly keep: readonly string[]; readonly drop: readonly string[]; readonly add: readonly string[] };
export function morphPlan(prev: readonly string[], next: readonly string[]): MorphPlan {
  const keep = next.filter((k) => prev.includes(k)), drop = prev.filter((k) => !next.includes(k)), add = next.filter((k) => !prev.includes(k));
  return { same: !drop.length && !add.length, keep, drop, add };
}

/* ---------- special values: solving, snapping, stepping ----------
   A slider's special value is often the value of its variable that makes a
   relation hold with the others fixed: a root of g on the slider's range.
   The thumb catches a special value within CATCH of the track and lets go
   only beyond LET_GO, so a drag that has hit it does not jitter off. */
export function solve(g: (x: number) => number, lo: number, hi: number, n = 64): number | null {
  const at = (x: number): number => { const y = g(x); return Number.isFinite(y) ? y : NaN; };
  const xs = Array.from({ length: n + 1 }, (_, i) => lo + ((hi - lo) * i) / n);
  const ys = xs.map(at);
  const exact = xs.findIndex((_, i) => ys[i] === 0); if (exact >= 0) return xs[exact];
  const i = xs.slice(1).findIndex((_, j) => ys[j] * ys[j + 1] < 0); if (i < 0) return null;
  let a = xs[i], b = xs[i + 1], fa = ys[i];
  for (let k = 0; k < 200 && b - a > 1e-12 * Math.max(1, Math.abs(a)); k += 1) {
    const m = (a + b) / 2, fm = at(m);
    if (fm === 0) return m;
    if (fa * fm < 0) b = m; else { a = m; fa = fm; }
  }
  return (a + b) / 2;
}
export const CATCH = 0.015, LET_GO = 0.03;
export type Snap = { readonly v: number; readonly held: number | null };
/* the value a drag at raw settles on, given the special values and the one held (an index), if any */
export function snapTo(raw: number, specials: readonly (number | null)[], span: number, held: number | null): Snap {
  const s = held === null ? null : specials[held];
  if (s != null && Math.abs(raw - s) <= LET_GO * span) return { v: s, held };
  const best = specials.reduce<number | null>((b, x, i) => (x != null && Math.abs(raw - x) <= CATCH * span && (b === null || Math.abs(raw - x) < Math.abs(raw - specials[b]!)) ? i : b), null);
  return best === null ? { v: raw, held: null } : { v: specials[best]!, held: best };
}
/* the next special value strictly above (dir 1) or below (dir -1) x, or null */
export function nextSpecial(specials: readonly (number | null)[], x: number, dir: 1 | -1, eps = 1e-9): number | null {
  const on = specials.filter((s): s is number => s != null && dir * (s - x) > eps);
  return on.length ? (dir > 0 ? Math.min(...on) : Math.max(...on)) : null;
}
/* where on the track (0 to 1) a special value sits, null when it is off the range or not defined */
export const trackAt = (x: number | null, min: number, max: number): number | null =>
  x == null || !Number.isFinite(x) || x < min || x > max || max === min ? null : (x - min) / (max - min);

/* ---------- keyframes ----------
   Values keyed to a story or reader value s: each frame names s by `at` and
   any numbers or arrays of numbers; between neighbouring frames a value is
   eased (smooth, or the later frame's own ease), and it holds beyond the
   ends. A key a frame leaves out is carried from the frame before it. */
export type KeyVal = number | readonly number[];
export type Frame = { readonly at: number; readonly ease?: Ease } & { readonly [k: string]: KeyVal | Ease | undefined };
type Vals = Record<string, KeyVal>;
const valsOf = (f: Frame): Vals => Object.fromEntries(Object.entries(f).filter(([k, v]) => k !== 'at' && k !== 'ease' && v !== undefined)) as Vals;
const mix = (a: KeyVal, b: KeyVal, k: number): KeyVal =>
  typeof a === 'number' ? (typeof b === 'number' ? lerp(a, b, k) : b) : Array.isArray(b) ? a.map((x, i) => lerp(x, (b as readonly number[])[i] ?? x, k)) : b;
export function keyframes<T extends Vals = Vals>(s: number, frames: readonly Frame[]): T {
  const fs = [...frames].sort((a, b) => a.at - b.at);
  const full = fs.reduce<Vals[]>((acc, f) => [...acc, { ...(acc[acc.length - 1] ?? {}), ...valsOf(f) }], []);
  if (!fs.length) return {} as T;
  if (s <= fs[0].at) return full[0] as T;
  const j = fs.findIndex((f) => f.at >= s);
  if (j < 0) return full[fs.length - 1] as T;
  const a = fs[j - 1], b = fs[j], k = (b.ease ?? smooth)(b.at > a.at ? (s - a.at) / (b.at - a.at) : 1);
  const A = full[j - 1], B = full[j];
  return Object.fromEntries(Object.keys(B).map((key) => [key, key in A ? mix(A[key], B[key], k) : B[key]])) as T;
}

/* ---------- a choice that morphs ----------
   A discrete state changed at eased progress k (1 at rest): a derived value
   bends from the old option's to the new one's, and the parts only one option
   has fade and slide. The old option's parts are gone by LEAVE of the way,
   the new one's arrive over the last ARRIVE. */
export type Blendable = number | readonly number[] | { readonly [k: string]: number | readonly number[] };
const blendOne = (a: number | readonly number[], b: number | readonly number[], k: number): number | readonly number[] =>
  typeof a === 'number' ? (typeof b === 'number' ? lerp(a, b, k) : b)
    : typeof b === 'number' || a.length !== b.length ? b : b.map((x, i) => lerp(a[i], x, k));
const flat = (x: Blendable): x is number | readonly number[] => typeof x === 'number' || Array.isArray(x);
export function blend<T extends Blendable>(a: T, b: T, k: number): T {
  if (k >= 1) return b;
  if (flat(a) || flat(b)) return (flat(a) && flat(b) ? blendOne(a, b, k) : b) as T;
  const A = a as Record<string, number | readonly number[]>, B = b as Record<string, number | readonly number[]>;
  const ka = Object.keys(A), kb = Object.keys(B);
  if (ka.length !== kb.length || kb.some((key) => !(key in A))) return b;
  return Object.fromEntries(kb.map((key) => [key, blendOne(A[key], B[key], k)])) as T;
}
export const LEAVE = 0.6, ARRIVE = 0.6;
/* the opacity of the parts only option v has, mid-change from `from` to `to` at k */
export function partAlpha<V>(v: V, from: V, to: V, k: number): number {
  if (v === to && v === from) return 1;
  if (v === to) return unit((k - (1 - ARRIVE)) / ARRIVE);
  if (v === from) return 1 - unit(k / LEAVE);
  return 0;
}
/* their offset: arriving from -shift, leaving toward +shift */
export function partOff<V>(v: V, from: V, to: V, k: number, shift: readonly [number, number]): [number, number] {
  if (from === to || (v !== to && v !== from)) return [0, 0];
  const q = (1 - partAlpha(v, from, to, k)) * (v === to ? -1 : 1);
  return [q * shift[0] || 0, q * shift[1] || 0];
}

/* ---------- LaggedStart ----------
   Member i of n within a group's progress k, each starting lag of a member's
   span after the one before, the last ending at k = 1. */
export function stagger(k: number, i: number, n: number, lag = 0.1): number {
  const span = 1 / (1 + Math.max(0, n - 1) * lag);
  return unit((k - i * lag * span) / span);
}

/* ---------- shapes that bend into shapes ----------
   A polyline (2D or 3D) resampled to n points evenly by arc length; a closed
   outline runs round to its first point. Two polylines blend point by point
   once both have the larger count. */
export function resample<P extends PointN>(pts: readonly P[], n: number, closed = false): P[] {
  if (!pts.length || n < 1) return [];
  if (n === 1 || pts.length === 1) return Array.from({ length: n }, () => pts[0]);
  const ring = closed ? [...pts, pts[0]] : pts;
  const cum = ring.reduce<number[]>((acc, p, i) => [...acc, i ? acc[i - 1] + Math.hypot(...p.map((x, j) => x - ring[i - 1][j])) : 0], []);
  const L = cum[cum.length - 1];
  if (!(L > 0)) return Array.from({ length: n }, () => pts[0]);
  let seg = 0;
  return Array.from({ length: n }, (_, i) => {
    const s = (L * i) / (closed ? n : n - 1);
    while (seg < ring.length - 2 && cum[seg + 1] < s) seg += 1;
    const len = cum[seg + 1] - cum[seg], f = len > 0 ? Math.min(1, (s - cum[seg]) / len) : 0;
    return ring[seg].map((x, j) => lerp(x, ring[seg + 1][j], f)) as unknown as P;
  });
}
export function lerpPts<P extends PointN>(a: readonly P[], b: readonly P[], k: number, closed = false): P[] {
  if (!a.length || !b.length) return b.slice();
  const n = Math.max(a.length, b.length), A = resample(a, n, closed), B = resample(b, n, closed);
  return B.map((q, i) => q.map((x, j) => lerp(A[i][j] ?? x, x, k)) as unknown as P);
}
