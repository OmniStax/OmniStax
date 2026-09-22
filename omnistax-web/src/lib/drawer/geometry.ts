/* The sums a drawing needs and the canvas does not do for it: where an item
   stands, what a lasso has caught, what the eraser has crossed, and the corner
   a shape snaps to when Shift is held. Everything here is pure, so the tests
   read it directly and the tab only calls it. */
import { clampZoom, type Box, type DrawItem, type Point, type ShapeKind, type View } from './model';

export type Vec = readonly [number, number];

/* ── where an item stands ────────────────────────────────────────────────── */

const boxOf = (xs: readonly number[], ys: readonly number[]): Box => {
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
};

/* The rectangle an item occupies, its ink width included: a stroke laid with a
   fat nib reaches half a nib beyond the points it was drawn through.

   An item is immutable, so its box is the same every time it is asked for and
   is kept against the item itself. That is what makes culling a filter rather
   than a walk of every point on the plane: a pan asks a thousand strokes where
   they stand and a thousand answers come out of the map. */
const boxes = new WeakMap<DrawItem & object, Box>();
export const bounds = (i: DrawItem): Box => {
  const had = boxes.get(i);
  if (had) return had;
  const made = measure(i);
  boxes.set(i, made);
  return made;
};

const measure = (i: DrawItem): Box => {
  if (i.kind === 'stroke') {
    const b = boxOf(i.points.map((p) => p[0]), i.points.map((p) => p[1]));
    const pad = i.size / 2;
    return { x: b.x - pad, y: b.y - pad, w: b.w + i.size, h: b.h + i.size };
  }
  if (i.kind === 'shape') {
    const b = boxOf([i.from[0], i.to[0]], [i.from[1], i.to[1]]);
    const pad = i.size / 2;
    return { x: b.x - pad, y: b.y - pad, w: b.w + i.size, h: b.h + i.size };
  }
  return { x: i.x, y: i.y, w: i.w, h: i.h };
};

/* The rectangle a set of items occupies together, and nothing at all when the
   set is empty: a selection of nothing has no handles to draw. */
export const boundsOf = (items: readonly DrawItem[]): Box | null => {
  if (!items.length) return null;
  const bs = items.map(bounds);
  return boxOf(bs.flatMap((b) => [b.x, b.x + b.w]), bs.flatMap((b) => [b.y, b.y + b.h]));
};

export const inBox = (b: Box, x: number, y: number): boolean => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;

/* Whether two rectangles touch at all, which is the whole of the culling: an
   item whose box does not meet the window is not drawn this frame. */
export const meets = (a: Box, b: Box): boolean =>
  a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h;

/* ── the window onto the plane ───────────────────────────────────────────── */

/* The rectangle of the plane a pane of this size shows from this view. */
export const viewBox = (v: View, paneW: number, paneH: number): Box =>
  ({ x: v.x, y: v.y, w: paneW / v.zoom, h: paneH / v.zoom });

/* The view that frames everything drawn, with a margin round it, and nothing
   at all when there is nothing to frame. It never zooms in past 1: a single
   small stroke should be shown at the size it was drawn, not blown up to fill
   the pane. */
export const fitView = (items: readonly DrawItem[], paneW: number, paneH: number, pad = 48): View | null => {
  const b = boundsOf(items);
  if (!b || paneW <= 0 || paneH <= 0) return null;
  const w = b.w + 2 * pad, h = b.h + 2 * pad;
  const zoom = clampZoom(Math.min(1, Math.min(paneW / Math.max(1, w), paneH / Math.max(1, h))));
  return { x: b.x + b.w / 2 - paneW / (2 * zoom), y: b.y + b.h / 2 - paneH / (2 * zoom), zoom };
};

/* ── the lasso ───────────────────────────────────────────────────────────── */

/* A point inside a closed path, by the crossing rule: a ray cast to the right
   crosses the edges an odd number of times when the point is within. */
export const inPolygon = (poly: readonly Vec[], x: number, y: number): boolean => {
  if (poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};

/* The points that stand for an item when the lasso asks whether it caught it:
   a stroke is its own points, and everything with a rectangle is its four
   corners and its middle, so a card lassoed by its centre comes too. */
const probes = (i: DrawItem): readonly Vec[] => {
  if (i.kind === 'stroke') return i.points.map(([x, y]) => [x, y] as Vec);
  if (i.kind === 'shape') return [i.from, i.to, [(i.from[0] + i.to[0]) / 2, (i.from[1] + i.to[1]) / 2]];
  const b = bounds(i);
  return [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h], [b.x + b.w / 2, b.y + b.h / 2]];
};

/* What a lasso has caught. A stroke is caught when most of it is inside, so
   that a line crossed at one end is left where it lies; a box and a frame are
   caught when their middle is, which is how a reader means to pick one up. */
export const lassoed = (items: readonly DrawItem[], poly: readonly Vec[]): readonly DrawItem[] => {
  if (poly.length < 3) return [];
  return items.filter((i) => {
    const ps = probes(i);
    if (i.kind === 'box' || i.kind === 'frame') { const b = bounds(i); return inPolygon(poly, b.x + b.w / 2, b.y + b.h / 2); }
    const hits = ps.filter(([x, y]) => inPolygon(poly, x, y)).length;
    return hits * 2 > ps.length;
  });
};

/* ── the eraser ──────────────────────────────────────────────────────────── */

/* How near a point lies to a segment: the distance to the nearest place on it,
   which is what a stroke-wise eraser is asking as it is dragged across. */
export const distanceToSegment = (px: number, py: number, ax: number, ay: number, bx: number, by: number): number => {
  const dx = bx - ax, dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
};

const nearItem = (i: DrawItem, x: number, y: number, r: number): boolean => {
  if (i.kind === 'stroke') {
    const reach = r + i.size / 2;
    if (i.points.length === 1) return Math.hypot(x - i.points[0][0], y - i.points[0][1]) <= reach;
    for (let k = 1; k < i.points.length; k++) {
      if (distanceToSegment(x, y, i.points[k - 1][0], i.points[k - 1][1], i.points[k][0], i.points[k][1]) <= reach) return true;
    }
    return false;
  }
  if (i.kind === 'shape') {
    const reach = r + i.size / 2;
    /* A rectangle and an ellipse are rubbed out by their outline, as they are
       drawn: the eraser takes a whole item, so touching its edge is enough. */
    if (i.shape === 'line' || i.shape === 'arrow') return distanceToSegment(x, y, i.from[0], i.from[1], i.to[0], i.to[1]) <= reach;
    const b = bounds(i);
    return inBox({ x: b.x - r, y: b.y - r, w: b.w + 2 * r, h: b.h + 2 * r }, x, y) && !inBox({ x: b.x + reach, y: b.y + reach, w: Math.max(0, b.w - 2 * reach), h: Math.max(0, b.h - 2 * reach) }, x, y);
  }
  return false;
};

/* Which items the eraser is standing on. It takes strokes and shapes only: a
   text box and a frame are picked up with the lasso and removed with Delete,
   which is what stops a stray swipe from rubbing out a card. */
export const erasedAt = (items: readonly DrawItem[], x: number, y: number, r: number): readonly DrawItem[] =>
  items.filter((i) => nearItem(i, x, y, r));

/* ── the ink ─────────────────────────────────────────────────────────────── */

/* A pointer reports more points than a stroke needs, and the ones it reports
   in a straight run add nothing: a point is kept when it is far enough from
   the last one kept, and the last point of all is always kept so that the
   stroke ends where the pen left off. */
export const simplify = (points: readonly Point[], tolerance = 1): readonly Point[] => {
  if (points.length < 3) return points;
  const out: Point[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const last = out[out.length - 1];
    if (Math.hypot(points[i][0] - last[0], points[i][1] - last[1]) >= tolerance) out.push(points[i]);
  }
  out.push(points[points.length - 1]);
  return out;
};

/* The width of the nib at one point: pressure either side of the nominal size,
   so a pen pressed hard is half again as wide and a pen barely touching is
   half as wide. A device reporting nothing sends 0.5 and draws at its size. */
export const nib = (size: number, pressure: number): number => size * (0.5 + Math.min(1, Math.max(0, pressure)));

/* ── the shapes ──────────────────────────────────────────────────────────── */

const QUARTER = Math.PI / 4;

/* Shift held: a line snaps to the nearest eighth of the circle, and a
   rectangle or an ellipse becomes a square or a circle on the corner the
   pointer is nearest to. */
export const snapped = (shape: ShapeKind, from: Vec, to: Vec): Vec => {
  const dx = to[0] - from[0], dy = to[1] - from[1];
  if (shape === 'line' || shape === 'arrow') {
    const len = Math.hypot(dx, dy);
    const a = Math.round(Math.atan2(dy, dx) / QUARTER) * QUARTER;
    return [from[0] + Math.cos(a) * len, from[1] + Math.sin(a) * len];
  }
  const side = Math.max(Math.abs(dx), Math.abs(dy));
  return [from[0] + Math.sign(dx || 1) * side, from[1] + Math.sign(dy || 1) * side];
};

/* ── the handles ─────────────────────────────────────────────────────────── */

/* The eight places a selection can be taken hold of, named the way a compass
   names them, and the box a drag of one of them makes. */
export const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;
export type Handle = (typeof HANDLES)[number];

export const handleAt = (b: Box, k: Handle): Vec => {
  const x = k.includes('w') ? b.x : k.includes('e') ? b.x + b.w : b.x + b.w / 2;
  const y = k.startsWith('n') ? b.y : k.startsWith('s') ? b.y + b.h : b.y + b.h / 2;
  return [x, y];
};

/* The handle the pointer is on, within a reach given in canvas units so that
   the grip is the same size on the screen however far the page is zoomed. */
export const handleUnder = (b: Box, x: number, y: number, reach: number): Handle | null =>
  HANDLES.find((k) => { const [hx, hy] = handleAt(b, k); return Math.hypot(x - hx, y - hy) <= reach; }) ?? null;

/* Dragging a handle: the edges it owns move with it and the others stay. A box
   is never allowed to turn inside out, so each side is kept a little away from
   the one opposite it. */
const MIN_SIDE = 8;
export const resized = (b: Box, k: Handle, dx: number, dy: number): Box => {
  const west = k.includes('w') ? Math.min(b.x + dx, b.x + b.w - MIN_SIDE) : b.x;
  const east = k.includes('e') ? Math.max(b.x + b.w + dx, west + MIN_SIDE) : b.x + b.w;
  const north = k.startsWith('n') ? Math.min(b.y + dy, b.y + b.h - MIN_SIDE) : b.y;
  const south = k.startsWith('s') ? Math.max(b.y + b.h + dy, north + MIN_SIDE) : b.y + b.h;
  return { x: west, y: north, w: east - west, h: south - north };
};
