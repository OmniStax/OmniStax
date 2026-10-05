/* What the concept map does with its view and its selection, kept apart from
   the drawing so it can be reasoned about: the scale a level opens at, the
   subgraph a selection brings with it, where its own layout is put when the
   reader focuses on it, and where each level was left standing. */
import type { Edge, Laid, Positions, Pt } from './sugiyama';
import type { Target } from './scope';

/* ---------- the opening view ---------- */

/* The most nodes a level opens on: past this a fitted view is a field of specks. */
export const OPENING_MOST = 100;
/* The scale at which a viewport of w by h, centred on a point, holds no more
   than `most` node centres. A node is inside while its distance from the
   centre — across, or down scaled by the viewport's shape — is under half the
   viewport's width, so sorting the nodes by that distance names the node that
   must fall just outside, and the scale is read off it directly. */
export const crowdScale = (pts: readonly Pt[], centre: Pt, w: number, h: number, most = OPENING_MOST): number | null => {
  if (pts.length <= most || w <= 0 || h <= 0) return null;
  const d = pts.map((p) => Math.max(Math.abs(p.x - centre.x), (Math.abs(p.y - centre.y) * w) / h)).sort((a, b) => a - b);
  const inside = d[most - 1], outside = d[most];
  const half = outside > inside ? (inside + outside) / 2 : outside * 0.999;
  return half > 0 ? w / (2 * half) : null;
};

/* ---------- the subgraph a selection brings ---------- */

/* Every prerequisite of the selected concepts and every concept built on them,
   however many steps away, with the selection itself: what a focus keeps. */
export const connectedOf = (edges: readonly Edge[], seeds: Iterable<string>): ReadonlySet<string> => {
  const up = new Map<string, string[]>(), down = new Map<string, string[]>();
  edges.forEach(([a, b]) => { down.set(a, [...(down.get(a) ?? []), b]); up.set(b, [...(up.get(b) ?? []), a]); });
  const reach = (from: readonly string[], next: ReadonlyMap<string, readonly string[]>): Set<string> => {
    const seen = new Set<string>(from), queue = [...from];
    while (queue.length) for (const n of next.get(queue.pop()!) ?? []) if (!seen.has(n)) { seen.add(n); queue.push(n); }
    return seen;
  };
  const start = [...seeds];
  return new Set([...reach(start, up), ...reach(start, down)]);
};

/* ---------- placing a focus ---------- */

/* A focus laid out on its own, moved so the selection's middle stands where it
   stood on the whole map: the focus gathers round what was chosen, and the
   view need not move. */
export const alignedTo = (home: Positions, to: Laid, anchors: ReadonlySet<string>): Laid => {
  const hub = [...anchors].filter((id) => home.has(id) && to.pos.has(id));
  if (!hub.length) return to;
  const mid = (m: Positions, k: 'x' | 'y'): number => hub.reduce((s, id) => s + m.get(id)![k], 0) / hub.length;
  const dx = mid(home, 'x') - mid(to.pos, 'x'), dy = mid(home, 'y') - mid(to.pos, 'y');
  const move = (p: Pt): Pt => ({ x: p.x + dx, y: p.y + dy });
  return { pos: new Map([...to.pos].map(([id, p]) => [id, move(p)])), bends: new Map([...to.bends].map(([k, ps]) => [k, ps.map(move)])) };
};

/* ---------- where each level was left ---------- */

/* A view as d3-zoom holds it: a translation and a scale. */
export type Held = { readonly x: number; readonly y: number; readonly k: number };
/* One map tab standing at one place. */
export type ViewKey = string;
export const viewKeyOf = (item: string, t: Target): ViewKey =>
  [item, t.book, t.level, t.level === 'chapter' ? t.chapter : t.level === 'section' ? t.section : ''].join('|');

/* Where the reader left each level they walked, for as long as the page is
   open. A level they have not walked has no entry and opens fresh; one they
   leave by the trail's menu, rather than by its crumbs, is let go. */
const held = new Map<ViewKey, Held>();
export const mapViews = {
  get: (k: ViewKey): Held | undefined => held.get(k),
  keep: (k: ViewKey, v: Held): void => { held.set(k, { x: v.x, y: v.y, k: v.k }); },
  forget: (k: ViewKey): void => { held.delete(k); },
};
