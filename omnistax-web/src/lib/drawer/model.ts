/* A drawing the reader has made: a page of ink with boxes and frames standing
   on it. The value is immutable and every operation here is a pure function
   from Drawing to Drawing, so the undo stack is nothing more than the values
   this module has handed back — a stroke is one of them, a drag is one of
   them — and they share everything they have not changed.

   Coordinates are canvas units at zoom 1, with the origin at the top left of
   the page; the view's pan and zoom are the tab's own and are never written
   down here. The page is as wide as the pane and as tall as it needs to be, so
   `height` grows as the reader draws near the foot of it and nothing else in
   the value knows about the screen. */
import { newDrawingId, type DrawingId } from '../types/ids';

/* One item of a drawing: the id it is named by within its own drawing, eight
   characters of base 36 as everything the reader owns is named. */
export type DrawItemId = string & { readonly __brand: 'DrawItemId' };
export const drawItemId = (s: string): DrawItemId => s as DrawItemId;
const base36 = (n: number): string => { let s = ''; while (s.length < n) s += Math.random().toString(36).slice(2); return s.slice(0, n); };
export const newDrawItemId = (): DrawItemId => drawItemId(base36(8));

/* The two tools that lay down ink. A highlighter is wide and half transparent
   and multiplies into what is under it; a pen is opaque and takes its width
   from the pressure the device reports. */
export const INK_TOOLS = ['pen', 'highlighter'] as const;
export type InkTool = (typeof INK_TOOLS)[number];
/* The four shapes the toolbar draws, each from one corner to another. */
export const SHAPE_KINDS = ['line', 'arrow', 'rect', 'ellipse'] as const;
export type ShapeKind = (typeof SHAPE_KINDS)[number];

/* A point of a stroke: where it was and how hard the pen was pressed. A device
   that reports no pressure sends 0.5, which is what the browser itself does. */
export type Point = readonly [x: number, y: number, pressure: number];
export type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

/* What a frame holds, as the text that writes it: the inner text of a `![[…]]`
   for a card the note renderer draws, or `asset:<id>` for a picture — a
   snapshot of a figure, or an image the reader dropped. A snapshot also says
   what it is a picture of, so that tapping it can open the live thing. */
export type FrameEmbed = string;

export type DrawItem =
  | { readonly kind: 'stroke'; readonly id: DrawItemId; readonly tool: InkTool; readonly color: string; readonly size: number; readonly points: readonly Point[] }
  | { readonly kind: 'shape'; readonly id: DrawItemId; readonly shape: ShapeKind; readonly color: string; readonly size: number; readonly fill: boolean; readonly from: readonly [number, number]; readonly to: readonly [number, number] }
  | { readonly kind: 'box'; readonly id: DrawItemId; readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly body: string }
  | { readonly kind: 'frame'; readonly id: DrawItemId; readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly embed: FrameEmbed; readonly open?: string };

export type Drawing = {
  readonly id: DrawingId;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly items: readonly DrawItem[];
  readonly created: number;
  readonly updated: number;
};

/* A fresh page: wide enough for a pane of the usual width and one screen tall,
   which is where the growth below starts from. */
export const PAGE_WIDTH = 1200;
export const PAGE_HEIGHT = 1600;
/* How much room is kept below the lowest ink, and how much the page grows by
   when the reader draws into it. */
export const GROW_MARGIN = 240;
export const GROW_STEP = 800;

export const emptyDrawing = (name: string, id: DrawingId = newDrawingId(), now: number = Date.now()): Drawing =>
  ({ id, name, width: PAGE_WIDTH, height: PAGE_HEIGHT, items: [], created: now, updated: now });

/* Every change goes through here, so that nothing can change a drawing without
   saying when it happened. */
const touched = (d: Drawing, items: readonly DrawItem[], now: number = Date.now()): Drawing =>
  items === d.items ? d : { ...d, items, updated: now };

export const itemById = (d: Drawing, id: DrawItemId): DrawItem | undefined => d.items.find((i) => i.id === id);

export const addItem = (d: Drawing, item: DrawItem, now?: number): Drawing => touched(d, [...d.items, item], now);

export const removeItems = (d: Drawing, ids: readonly DrawItemId[], now?: number): Drawing => {
  const gone = new Set<string>(ids);
  if (!d.items.some((i) => gone.has(i.id))) return d;
  return touched(d, d.items.filter((i) => !gone.has(i.id)), now);
};

/* One item replaced by another of the same id: what a text box being typed in
   and a frame being resized both come down to. */
export const replaceItem = (d: Drawing, item: DrawItem, now?: number): Drawing =>
  itemById(d, item.id) === undefined ? d : touched(d, d.items.map((i) => (i.id === item.id ? item : i)), now);

const shifted = (i: DrawItem, dx: number, dy: number): DrawItem => {
  if (i.kind === 'stroke') return { ...i, points: i.points.map(([x, y, p]) => [x + dx, y + dy, p] as Point) };
  if (i.kind === 'shape') return { ...i, from: [i.from[0] + dx, i.from[1] + dy], to: [i.to[0] + dx, i.to[1] + dy] };
  return { ...i, x: i.x + dx, y: i.y + dy };
};

export const moveItems = (d: Drawing, ids: readonly DrawItemId[], dx: number, dy: number, now?: number): Drawing => {
  const moving = new Set<string>(ids);
  if (!moving.size || (dx === 0 && dy === 0)) return d;
  return touched(d, d.items.map((i) => (moving.has(i.id) ? shifted(i, dx, dy) : i)), now);
};

/* A selection dragged by its handle: every point of it is mapped out of the box
   it stood in and into the box the handle has made. A stroke's width and a
   shape's are scaled by the smaller of the two factors, so that a circle
   stretched sideways does not grow a fat outline. */
const mapped = (i: DrawItem, from: Box, to: Box): DrawItem => {
  const kx = from.w === 0 ? 1 : to.w / from.w;
  const ky = from.h === 0 ? 1 : to.h / from.h;
  const k = Math.min(Math.abs(kx), Math.abs(ky));
  const at = (x: number, y: number): [number, number] => [to.x + (x - from.x) * kx, to.y + (y - from.y) * ky];
  if (i.kind === 'stroke') return { ...i, size: i.size * k, points: i.points.map(([x, y, p]) => { const [nx, ny] = at(x, y); return [nx, ny, p] as Point; }) };
  if (i.kind === 'shape') return { ...i, size: i.size * k, from: at(...i.from), to: at(...i.to) };
  const [x, y] = at(i.x, i.y);
  return { ...i, x, y, w: i.w * kx, h: i.h * ky };
};

export const scaleItems = (d: Drawing, ids: readonly DrawItemId[], from: Box, to: Box, now?: number): Drawing => {
  const scaling = new Set<string>(ids);
  if (!scaling.size || from.w <= 0 || from.h <= 0) return d;
  return touched(d, d.items.map((i) => (scaling.has(i.id) ? mapped(i, from, to) : i)), now);
};

export const setBoxBody = (d: Drawing, id: DrawItemId, body: string, now?: number): Drawing => {
  const box = itemById(d, id);
  if (!box || box.kind !== 'box' || box.body === body) return d;
  return replaceItem(d, { ...box, body }, now);
};

/* The page grows downward as the reader works near the foot of it, and never
   shrinks under what is already drawn: a stroke laid at the bottom and then
   rubbed out leaves the room it made, which is what a paper notebook does. */
export const grownTo = (d: Drawing, y: number): Drawing => {
  if (y + GROW_MARGIN <= d.height) return d;
  return { ...d, height: Math.ceil((y + GROW_MARGIN) / GROW_STEP) * GROW_STEP };
};

export const rename = (d: Drawing, name: string, now?: number): Drawing =>
  d.name === name ? d : { ...d, name, updated: now ?? Date.now() };

/* ── the undo stack ──────────────────────────────────────────────────────── */

/* Undo inside a drawing is the drawing's own, as it is in the note editor and
   the colour menu: Ctrl+Z here takes back a stroke, never a highlight made
   somewhere else. The stack is the values this module handed back, so a step
   costs only what that step changed. */
export type Timeline = { readonly past: readonly Drawing[]; readonly now: Drawing; readonly future: readonly Drawing[] };
/* Deep enough for a long sitting; a drawing shares all it has not changed, so
   the cost of a step is the stroke it added and nothing else. */
export const UNDO_DEPTH = 200;

export const timeline = (now: Drawing): Timeline => ({ past: [], now, future: [] });

/* One step. A change that changed nothing is not a step, which is what keeps a
   drag that went nowhere off the stack. */
export const step = (t: Timeline, next: Drawing): Timeline =>
  next === t.now ? t : { past: [...t.past, t.now].slice(-UNDO_DEPTH), now: next, future: [] };

/* A change that is not a step of its own: the live stroke as it is being laid
   down, and the page growing under it. The stack is untouched. */
export const amend = (t: Timeline, next: Drawing): Timeline => (next === t.now ? t : { ...t, now: next });

export const canUndo = (t: Timeline): boolean => t.past.length > 0;
export const canRedo = (t: Timeline): boolean => t.future.length > 0;

export const undo = (t: Timeline): Timeline => {
  const prev = t.past[t.past.length - 1];
  return prev === undefined ? t : { past: t.past.slice(0, -1), now: prev, future: [t.now, ...t.future] };
};

export const redo = (t: Timeline): Timeline => {
  const next = t.future[0];
  return next === undefined ? t : { past: [...t.past, t.now], now: next, future: t.future.slice(1) };
};

/* ── the storage boundary ────────────────────────────────────────────────── */

/* Anything that is not a sound drawing is refused rather than half read: a
   record written by a newer build, or one a restore has damaged, opens as
   nothing at all and the tab says the drawing is not here. An item that cannot
   be read is dropped, since one bad stroke should not cost the page. */
const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);

const parsePoint = (raw: unknown): Point | null => {
  if (!Array.isArray(raw) || raw.length < 2) return null;
  const [x, y, p] = raw as unknown[];
  if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  return [x, y, num(p, 0.5)];
};

const parseItem = (raw: unknown): DrawItem | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' && o.id ? drawItemId(o.id) : null;
  if (!id) return null;
  if (o.kind === 'stroke') {
    const tool = (INK_TOOLS as readonly string[]).includes(str(o.tool)) ? (o.tool as InkTool) : 'pen';
    const points = Array.isArray(o.points) ? o.points.map(parsePoint).filter((p): p is Point => p !== null) : [];
    return points.length ? { kind: 'stroke', id, tool, color: str(o.color, '#000000'), size: num(o.size, 2), points } : null;
  }
  if (o.kind === 'shape') {
    const shape = (SHAPE_KINDS as readonly string[]).includes(str(o.shape)) ? (o.shape as ShapeKind) : 'line';
    const from = parsePoint(o.from); const to = parsePoint(o.to);
    if (!from || !to) return null;
    return { kind: 'shape', id, shape, color: str(o.color, '#000000'), size: num(o.size, 2), fill: o.fill === true, from: [from[0], from[1]], to: [to[0], to[1]] };
  }
  if (o.kind === 'box') return { kind: 'box', id, x: num(o.x, 0), y: num(o.y, 0), w: num(o.w, 240), h: num(o.h, 80), body: str(o.body) };
  if (o.kind === 'frame') {
    const embed = str(o.embed);
    if (!embed) return null;
    const open = typeof o.open === 'string' && o.open ? o.open : undefined;
    return open ? { kind: 'frame', id, x: num(o.x, 0), y: num(o.y, 0), w: num(o.w, 280), h: num(o.h, 200), embed, open }
      : { kind: 'frame', id, x: num(o.x, 0), y: num(o.y, 0), w: num(o.w, 280), h: num(o.h, 200), embed };
  }
  return null;
};

export const parseDrawing = (raw: unknown): Drawing | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== 'string' || !o.id) return null;
  if (!Array.isArray(o.items)) return null;
  const now = Date.now();
  return {
    id: o.id as DrawingId,
    name: str(o.name, 'Untitled drawing'),
    width: Math.max(1, num(o.width, PAGE_WIDTH)),
    height: Math.max(1, num(o.height, PAGE_HEIGHT)),
    items: o.items.map(parseItem).filter((i): i is DrawItem => i !== null),
    created: num(o.created, now),
    updated: num(o.updated, now),
  };
};

/* The row the explorer and the link resolver read: a drawing's name without
   its ink, which is why it is mirrored in localStorage and this store is never
   opened to draw a row. */
export type DrawingRow = { readonly id: DrawingId; readonly name: string; readonly created: number; readonly updated: number };
export const rowOf = (d: Drawing): DrawingRow => ({ id: d.id, name: d.name, created: d.created, updated: d.updated });

export const parseRows = (raw: unknown): readonly DrawingRow[] => {
  if (!Array.isArray(raw)) return [];
  const now = Date.now();
  return raw.flatMap((r) => {
    if (typeof r !== 'object' || r === null) return [];
    const o = r as Record<string, unknown>;
    if (typeof o.id !== 'string' || !o.id) return [];
    return [{ id: o.id as DrawingId, name: str(o.name, 'Untitled drawing'), created: num(o.created, now), updated: num(o.updated, now) }];
  });
};

/* Wiki links name a drawing rather than pointing at its id, and readers do not
   think in capitals, so the match ignores case, as a note's does. */
export const rowByName = (rows: readonly DrawingRow[], name: string): DrawingRow | undefined => {
  const n = name.trim().toLowerCase();
  return rows.find((r) => r.name.trim().toLowerCase() === n);
};
