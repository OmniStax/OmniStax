/* The concept map in the Poincaré disk: Lamping, Rao and Pirolli's hyperbolic tree.

   The map is cut down to a spanning tree: a virtual root over every source, and
   under each concept its deepest prerequisite (the first in table order on a
   tie). Each node shares its parent's wedge among its children by how many
   leaves each child's subtree holds, and each child stands a fixed hyperbolic
   distance out along the middle of its share. The wedge a child hands on is its
   share as the child sees it, which is wider: that is how the disk makes room
   at the rim. The other edges are drawn as geodesic arcs.

   A point is a complex number in the unit disk. The view is a disk
   automorphism, held as the matrix [[a, b], [b̄, ā]] scaled so |a| = 1 (the
   map is the same at any scale, and this one never overflows):
   dragging composes a translation that keeps the dragged point under the
   pointer, and centring a node glides it to 0 along the diameter it lies on. */
import { edgeKey, layersOf, type Edge, type Laid, type Pt } from './sugiyama';

export type C = Pt;
const c = (x: number, y: number): C => ({ x, y });
const add = (p: C, q: C): C => c(p.x + q.x, p.y + q.y);
const mul = (p: C, q: C): C => c(p.x * q.x - p.y * q.y, p.x * q.y + p.y * q.x);
const div = (p: C, q: C): C => { const d = q.x * q.x + q.y * q.y; return c((p.x * q.x + p.y * q.y) / d, (p.y * q.x - p.x * q.y) / d); };
const conj = (p: C): C => c(p.x, -p.y);
const scale = (p: C, k: number): C => c(p.x * k, p.y * k);
export const abs2 = (p: C): number => p.x * p.x + p.y * p.y;
const polar = (r: number, a: number): C => c(r * Math.cos(a), r * Math.sin(a));

export type Mobius = { readonly a: C; readonly b: C };
export const IDENTITY: Mobius = { a: c(1, 0), b: c(0, 0) };
export const apply = (m: Mobius, z: C): C => div(add(mul(m.a, z), m.b), add(mul(conj(m.b), z), conj(m.a)));
/* The translation that carries 0 to t. */
export const translation = (t: C): Mobius => ({ a: c(1, 0), b: t });
/* m after n. */
export const compose = (m: Mobius, n: Mobius): Mobius => {
  const a = add(mul(m.a, n.a), mul(m.b, conj(n.b))), b = add(mul(m.a, n.b), mul(m.b, conj(n.a)));
  const k = 1 / Math.sqrt(abs2(a));
  return { a: scale(a, k), b: scale(b, k) };
};
const RIM = 0.995;
const inside = (z: C): C => { const r = Math.sqrt(abs2(z)); return r < RIM ? z : scale(z, RIM / r); };
/* The view after a drag: what stood at `from` stands at `to`. */
export const dragged = (m: Mobius, from: C, to: C): Mobius =>
  compose(compose(translation(inside(to)), translation(scale(inside(from), -1))), m);
/* The view a fraction u of the way to centring the point that stands at w. */
export const centring = (m: Mobius, w: C, u: number): Mobius => {
  const r = Math.sqrt(abs2(w)); if (r < 1e-9) return m;
  const s = Math.tanh(u * Math.atanh(Math.min(r, RIM))) / r;
  return compose(translation(scale(w, -s)), m);
};

/* How far out a child stands from its parent, as a radius in the parent's own frame. */
export const STEP = 0.42;
/* The widest wedge a child hands on, so its children never fold back past it. */
const MAX_WEDGE = Math.PI;

/* The virtual root over every source. */
export const ROOT = '\u0000';

/* The tree is laid out in local frames, each child where it stands in its
   parent's frame, because a book fifty prerequisites deep would put its leaves
   closer to the rim than a float can tell from it. Positions are then read
   relative to whichever node the view is anchored on, so the nodes near the
   middle of the screen are always the ones computed exactly. */
export type Steps = NonNullable<Laid['steps']>;

export const hyperTree = (ids: readonly string[], edges: readonly Edge[]): Laid & { readonly steps: Steps } => {
  const layer = layersOf(ids, edges), order = new Map(ids.map((id, i) => [id, i]));
  const parent = new Map<string, string>();
  edges.forEach(([a, b]) => {
    if (!layer.has(a) || !layer.has(b) || layer.get(a)! >= layer.get(b)!) return;
    const p = parent.get(b);
    if (!p || layer.get(a)! > layer.get(p)! || (layer.get(a) === layer.get(p) && order.get(a)! < order.get(p)!)) parent.set(b, a);
  });
  const kids = new Map<string, string[]>();
  ids.forEach((id) => { const p = parent.get(id) ?? ROOT; (kids.get(p) ?? kids.set(p, []).get(p)!).push(id); });
  const leaves = new Map<string, number>();
  const leafCount = (id: string): number => leaves.get(id) ?? leaves.set(id, (kids.get(id) ?? []).reduce((n, k) => n + leafCount(k), 0) || 1).get(id)!;
  const steps = new Map<string, readonly [string, number, number]>();
  const r = (n: number): number => Math.round(n * 1e9) / 1e9;
  /* a node at the origin of its own frame shares the wedge a0..a1 among its children */
  const lay = (id: string, a0: number, a1: number): void => {
    const ks = kids.get(id) ?? [], total = ks.reduce((n, k) => n + leafCount(k), 0);
    let a = a0;
    ks.forEach((k) => {
      const span = ((a1 - a0) * leafCount(k)) / total;
      const l = polar(STEP, a + span / 2);
      steps.set(k, [id, r(l.x), r(l.y)]);
      const seen = translation(scale(l, -1));
      const e0 = apply(seen, polar(1, a)), e1 = apply(seen, polar(1, a + span));
      const b0 = Math.atan2(e0.y, e0.x);
      let b1 = Math.atan2(e1.y, e1.x);
      while (b1 <= b0 + 1e-9) b1 += 2 * Math.PI;
      const mid = (b0 + b1) / 2, half = Math.min((b1 - b0) / 2, MAX_WEDGE / 2);
      lay(k, mid - half, mid + half);
      a += span;
    });
  };
  lay(ROOT, 0, 2 * Math.PI);
  return { pos: positionsFrom(steps, ROOT), bends: new Map(), tree: new Set([...parent].map(([b, a]) => edgeKey(a, b))), steps };
};

/* Every node's frame as seen from the anchor's, by walking the tree out from it. */
const framesFrom = (steps: Steps, anchor: string): Map<string, Mobius> => {
  const kids = new Map<string, string[]>();
  steps.forEach(([p], id) => (kids.get(p) ?? kids.set(p, []).get(p)!).push(id));
  const frames = new Map<string, Mobius>([[anchor, IDENTITY]]), queue = [anchor];
  const reach = (id: string, f: Mobius): void => { if (!frames.has(id)) { frames.set(id, f); queue.push(id); } };
  while (queue.length) {
    const id = queue.pop()!, f = frames.get(id)!, up = steps.get(id);
    if (up) reach(up[0], compose(f, translation(c(-up[1], -up[2]))));
    (kids.get(id) ?? []).forEach((k) => { const s = steps.get(k)!; reach(k, compose(f, translation(c(s[1], s[2])))); });
  }
  return frames;
};
export const positionsFrom = (steps: Steps, anchor: string): Map<string, Pt> => {
  const out = new Map<string, Pt>();
  framesFrom(steps, anchor).forEach((f, id) => { if (id !== ROOT) out.set(id, div(f.b, conj(f.a))); });
  return out;
};
/* The same view anchored on another node: every point stays where it is drawn. */
export const reanchored = (steps: Steps, from: string, to: string, view: Mobius): Mobius => {
  const f = framesFrom(steps, from).get(to);
  return f ? compose(view, f) : view;
};

/* The geodesic between two points of the disk, scaled by R about a centre: an
   arc of the circle through both that meets the rim at right angles, or the
   straight line when they lie on a diameter. */
export const geodesic = (p: C, q: C, R: number, o: Pt): string => {
  const P = (z: C): string => `${Math.round((o.x + z.x * R) * 10) / 10},${Math.round((o.y + z.y * R) * 10) / 10}`;
  const det = p.x * q.y - p.y * q.x;
  if (Math.abs(det) < 1e-6) return `M${P(p)}L${P(q)}`;
  const u = (abs2(p) + 1) / 2, v = (abs2(q) + 1) / 2;
  const centre = c((u * q.y - v * p.y) / det, (p.x * v - q.x * u) / det);
  const rho = Math.sqrt(Math.max(0, abs2(centre) - 1));
  const cross = (p.x - centre.x) * (q.y - centre.y) - (p.y - centre.y) * (q.x - centre.x);
  return `M${P(p)}A${Math.round(rho * R * 10) / 10},${Math.round(rho * R * 10) / 10} 0 0 ${cross > 0 ? 1 : 0} ${P(q)}`;
};
