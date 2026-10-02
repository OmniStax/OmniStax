/* What the concept map does with its view and its selection, kept apart from
   the drawing so it can be reasoned about: the scale a level opens at, the
   subgraph a selection brings with it, how that subgraph is packed closer when
   the reader focuses on it, and where each level was left standing. */
import { separated, type Box, type Edge, type Positions, type Pt, type Rect } from './forcelayout';
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

/* Which nodes a rectangle of map coordinates touches. */
export const touched = (r: Rect, ids: Iterable<string>, at: (id: string) => Pt | undefined, box: (id: string) => Box): string[] =>
  [...ids].filter((id) => {
    const p = at(id); if (!p) return false;
    const b = box(id);
    return p.x + b.w / 2 >= r.x && p.x - b.w / 2 <= r.x + r.w && p.y + b.h / 2 >= r.y && p.y - b.h / 2 <= r.y + r.h;
  });

/* ---------- packing a focus ---------- */

/* How much of the plane a packed focus may take up for each unit of box it
   carries: room enough for the edges to read between the nodes. */
const PACKED_ROOM = 2;
/* A focus drawn closer together: the nodes keep the places they stood in
   relative to each other, drawn in towards the selection's middle until the
   plane they cover is about what their boxes need, and then parted wherever
   that brought two of them too near. A focus already that close is left
   where it stands. */
export const packed = (pos: Positions, ids: ReadonlySet<string>, anchors: ReadonlySet<string>, box: (id: string) => Box): Positions => {
  const kept = [...ids].filter((id) => pos.has(id));
  if (kept.length < 2) return new Map(kept.map((id) => [id, pos.get(id)!]));
  const mid = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
  const hub = [...anchors].filter((id) => pos.has(id));
  const from = hub.length ? hub : kept;
  const c: Pt = { x: mid(from.map((id) => pos.get(id)!.x)), y: mid(from.map((id) => pos.get(id)!.y)) };
  const xs = kept.map((id) => pos.get(id)!.x), ys = kept.map((id) => pos.get(id)!.y);
  const spread = Math.max(1, (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys)));
  const need = kept.reduce((sum, id) => { const b = box(id); return sum + b.w * b.h; }, 0) * PACKED_ROOM;
  const s = Math.min(1, Math.sqrt(need / spread));
  const drawn: Positions = new Map(kept.map((id) => { const p = pos.get(id)!; return [id, { x: c.x + (p.x - c.x) * s, y: c.y + (p.y - c.y) * s }]; }));
  return separated(kept.map((id) => ({ id, ...box(id) })), drawn);
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
