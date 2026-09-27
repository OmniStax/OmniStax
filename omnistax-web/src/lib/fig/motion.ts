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
