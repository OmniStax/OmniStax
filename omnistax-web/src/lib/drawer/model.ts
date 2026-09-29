/* A drawing the reader has made: an unbounded plane of ink with boxes and
   frames standing on it. The value is immutable and every operation here is a
   pure function from Drawing to Drawing, so the undo stack is nothing more
   than the values this module has handed back — a stroke is one of them, a
   drag is one of them — and they share everything they have not changed.

   There is no page and no edge. Coordinates are canvas units at zoom 1 and
   they run as far either way as the reader cares to go; what the tab shows is
   a window onto them, and the only thing the value knows about that window is
   `view`, the corner the reader was last looking from, so that reopening a
   drawing lands where they left it. */
import { newDrawingId, type DrawingId } from '../types/ids';
import { readColour, type Colour } from './colour';

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
/* The shapes a drawing keeps, each from one corner to another. The toolbar
   offers an arrow too, which is a connector with two free ends. */
export const SHAPE_KINDS = ['line', 'rect', 'ellipse'] as const;
export type ShapeKind = (typeof SHAPE_KINDS)[number];
export const SHAPE_TOOLS = ['line', 'arrow', 'rect', 'ellipse'] as const;
export type ShapeTool = (typeof SHAPE_TOOLS)[number];

/* A connector's end: fixed to one side of an element, or free on the plane. */
export const SIDES = ['n', 'e', 's', 'w'] as const;
export type Side = (typeof SIDES)[number];
export type End = { readonly item: DrawItemId; readonly side: Side } | { readonly x: number; readonly y: number };
export const CURVES = ['straight', 'bezier'] as const;
export type Curve = (typeof CURVES)[number];
export type Heads = { readonly start: boolean; readonly end: boolean };

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
  | { readonly kind: 'stroke'; readonly id: DrawItemId; readonly tool: InkTool; readonly color: Colour; readonly size: number; readonly points: readonly Point[] }
  | { readonly kind: 'shape'; readonly id: DrawItemId; readonly shape: ShapeKind; readonly color: Colour; readonly size: number; readonly fill: boolean; readonly from: readonly [number, number]; readonly to: readonly [number, number] }
  | { readonly kind: 'box'; readonly id: DrawItemId; readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly body: string; readonly color?: Colour }
  | { readonly kind: 'frame'; readonly id: DrawItemId; readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly embed: FrameEmbed; readonly open?: string; readonly color?: Colour }
  | { readonly kind: 'link'; readonly id: DrawItemId; readonly from: End; readonly to: End; readonly curve: Curve; readonly heads: Heads; readonly color: Colour; readonly size: number; readonly label: string }
  | { readonly kind: 'group'; readonly id: DrawItemId; readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly label: string; readonly color?: Colour }
  | { readonly kind: 'chat'; readonly id: DrawItemId; readonly x: number; readonly y: number; readonly w: number; readonly h: number; readonly chat: string; readonly root?: string };

export type LinkItem = Extract<DrawItem, { kind: 'link' }>;
export type GroupItem = Extract<DrawItem, { kind: 'group' }>;
/* What stands in a rectangle of its own and so can be moved by its corner. */
export type Placed = Extract<DrawItem, { kind: 'box' | 'frame' | 'group' | 'chat' }>;
export const isPlaced = (i: DrawItem): i is Placed => i.kind === 'box' || i.kind === 'frame' || i.kind === 'group' || i.kind === 'chat';

/* The rectangle a connector can be fixed to. Ink and lines are not
   connectable; a rectangle and an ellipse are, by the box they are drawn in. */
export const rectOf = (i: DrawItem): Box | null => {
  if (isPlaced(i)) return { x: i.x, y: i.y, w: i.w, h: i.h };
  if (i.kind !== 'shape' || i.shape === 'line') return null;
  const x = Math.min(i.from[0], i.to[0]), y = Math.min(i.from[1], i.to[1]);
  return { x, y, w: Math.abs(i.to[0] - i.from[0]), h: Math.abs(i.to[1] - i.from[1]) };
};

export const sideAt = (b: Box, side: Side): readonly [number, number] =>
  side === 'n' ? [b.x + b.w / 2, b.y] : side === 's' ? [b.x + b.w / 2, b.y + b.h]
    : side === 'w' ? [b.x, b.y + b.h / 2] : [b.x + b.w, b.y + b.h / 2];

export const isFree = (e: End): e is { readonly x: number; readonly y: number } => !('item' in e);

/* Where an end stands now, and nothing when the element it names is gone. */
export const endPoint = (items: readonly DrawItem[], e: End): readonly [number, number] | null => {
  if (isFree(e)) return [e.x, e.y];
  const target = items.find((i) => i.id === e.item);
  const r = target ? rectOf(target) : null;
  return r ? sideAt(r, e.side) : null;
};

/* Where the reader is looking: the canvas point that stands at the top left of
   the pane, and the scale it is drawn at. It is the tab's own while the tab is
   open; it is written down here only so that opening the drawing again lands
   on the ink rather than on the origin. */
export type View = { readonly x: number; readonly y: number; readonly zoom: number };
export const ORIGIN: View = { x: 0, y: 0, zoom: 1 };
/* How far in and out the reader may go. Nearer than a tenth and a stroke is a
   speck; further in than eight and the nib is a wall. */
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 8;
export const clampZoom = (z: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

export type Drawing = {
  readonly id: DrawingId;
  readonly name: string;
  readonly items: readonly DrawItem[];
  readonly view: View;
  readonly created: number;
  readonly updated: number;
};

export const emptyDrawing = (name: string, id: DrawingId = newDrawingId(), now: number = Date.now()): Drawing =>
  ({ id, name, items: [], view: ORIGIN, created: now, updated: now });

/* Every change goes through here, so that nothing can change a drawing without
   saying when it happened. */
const touched = (d: Drawing, items: readonly DrawItem[], now: number = Date.now()): Drawing =>
  items === d.items ? d : { ...d, items, updated: now };

export const itemById = (d: Drawing, id: DrawItemId): DrawItem | undefined => d.items.find((i) => i.id === id);

export const addItem = (d: Drawing, item: DrawItem, now?: number): Drawing => touched(d, [...d.items, item], now);

/* A connector whose element is deleted keeps that end where it stood, free. */
const loosened = (items: readonly DrawItem[], gone: ReadonlySet<string>) => (e: End): End => {
  if (isFree(e) || !gone.has(e.item)) return e;
  const p = endPoint(items, e);
  return p ? { x: p[0], y: p[1] } : e;
};

export const removeItems = (d: Drawing, ids: readonly DrawItemId[], now?: number): Drawing => {
  const gone = new Set<string>(ids);
  if (!d.items.some((i) => gone.has(i.id))) return d;
  const loose = loosened(d.items, gone);
  const kept = d.items.filter((i) => !gone.has(i.id)).map((i) => {
    if (i.kind !== 'link') return i;
    const from = loose(i.from), to = loose(i.to);
    return from === i.from && to === i.to ? i : { ...i, from, to };
  });
  return touched(d, kept, now);
};

/* One item replaced by another of the same id: what a text box being typed in
   and a frame being resized both come down to. */
export const replaceItem = (d: Drawing, item: DrawItem, now?: number): Drawing =>
  itemById(d, item.id) === undefined ? d : touched(d, d.items.map((i) => (i.id === item.id ? item : i)), now);

const shifted = (i: DrawItem, dx: number, dy: number): DrawItem => {
  if (i.kind === 'stroke') return { ...i, points: i.points.map(([x, y, p]) => [x + dx, y + dy, p] as Point) };
  if (i.kind === 'shape') return { ...i, from: [i.from[0] + dx, i.from[1] + dy], to: [i.to[0] + dx, i.to[1] + dy] };
  if (i.kind === 'link') return { ...i, from: freeMapped(i.from, (x, y) => [x + dx, y + dy]), to: freeMapped(i.to, (x, y) => [x + dx, y + dy]) };
  return { ...i, x: i.x + dx, y: i.y + dy };
};

/* An attached end follows its element on its own; only a free end is moved. */
const freeMapped = (e: End, f: (x: number, y: number) => readonly [number, number]): End => {
  if (!isFree(e)) return e;
  const [x, y] = f(e.x, e.y);
  return { x, y };
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
  if (i.kind === 'link') return { ...i, from: freeMapped(i.from, at), to: freeMapped(i.to, at) };
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

const coloured = (i: DrawItem, color: Colour): DrawItem => {
  if (i.kind === 'chat' || ('color' in i && i.color === color)) return i;
  return { ...i, color } as DrawItem;
};

/* A swatch picked with something selected recolours it. */
export const setColour = (d: Drawing, ids: readonly DrawItemId[], color: Colour, now?: number): Drawing => {
  const picked = new Set<string>(ids);
  const items = d.items.map((i) => (picked.has(i.id) ? coloured(i, color) : i));
  return items.every((i, k) => i === d.items[k]) ? d : touched(d, items, now);
};

/* A group of what is selected: a rectangle round it, with a margin, laid
   beneath everything else. */
export const GROUP_PAD = 24;
export const groupAround = (d: Drawing, box: Box, id: DrawItemId = newDrawItemId(), label = 'Group', now?: number): Drawing =>
  touched(d, [{ kind: 'group', id, x: box.x - GROUP_PAD, y: box.y - GROUP_PAD - 20, w: box.w + 2 * GROUP_PAD, h: box.h + 2 * GROUP_PAD + 20, label }, ...d.items], now);

/* A new group drawn with the tool also goes beneath everything. */
export const addGroup = (d: Drawing, g: GroupItem, now?: number): Drawing => touched(d, [g, ...d.items], now);

/* Where the reader was looking, remembered. It is not a change to the drawing
   — nothing that is on the plane has moved — so it does not touch `updated`,
   which is what keeps a pan from making a new thumbnail and a new row. */
export const setView = (d: Drawing, view: View): Drawing =>
  d.view.x === view.x && d.view.y === view.y && d.view.zoom === view.zoom
    ? d : { ...d, view: { x: view.x, y: view.y, zoom: clampZoom(view.zoom) } };

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
    return points.length ? { kind: 'stroke', id, tool, color: readColour(o.color), size: num(o.size, 2), points } : null;
  }
  if (o.kind === 'shape') {
    const from = parsePoint(o.from); const to = parsePoint(o.to);
    if (!from || !to) return null;
    const color = readColour(o.color), size = num(o.size, 2);
    /* An arrow was a shape before connectors; it is one with two free ends. */
    if (o.shape === 'arrow') return { kind: 'link', id, from: { x: from[0], y: from[1] }, to: { x: to[0], y: to[1] }, curve: 'straight', heads: { start: false, end: true }, color, size, label: '' };
    const shape = (SHAPE_KINDS as readonly string[]).includes(str(o.shape)) ? (o.shape as ShapeKind) : 'line';
    return { kind: 'shape', id, shape, color, size, fill: o.fill === true, from: [from[0], from[1]], to: [to[0], to[1]] };
  }
  const rect = { x: num(o.x, 0), y: num(o.y, 0), w: num(o.w, 240), h: num(o.h, 80) };
  const tint = o.color === undefined ? {} : { color: readColour(o.color) };
  if (o.kind === 'box') return { kind: 'box', id, ...rect, body: str(o.body), ...tint };
  if (o.kind === 'frame') {
    const embed = str(o.embed);
    if (!embed) return null;
    const open = typeof o.open === 'string' && o.open ? { open: o.open } : {};
    return { kind: 'frame', id, ...rect, w: num(o.w, 280), h: num(o.h, 200), embed, ...open, ...tint };
  }
  if (o.kind === 'group') return { kind: 'group', id, ...rect, label: str(o.label), ...tint };
  if (o.kind === 'chat') {
    const chat = str(o.chat);
    if (!chat) return null;
    const root = typeof o.root === 'string' && o.root ? { root: o.root } : {};
    return { kind: 'chat', id, ...rect, w: num(o.w, 420), h: num(o.h, 300), chat, ...root };
  }
  if (o.kind === 'link') {
    const from = parseEnd(o.from), to = parseEnd(o.to);
    if (!from || !to) return null;
    const heads = (typeof o.heads === 'object' && o.heads !== null ? o.heads : {}) as Record<string, unknown>;
    const curve = (CURVES as readonly string[]).includes(str(o.curve)) ? (o.curve as Curve) : 'bezier';
    return { kind: 'link', id, from, to, curve, heads: { start: heads.start === true, end: heads.end !== false }, color: readColour(o.color), size: num(o.size, 2), label: str(o.label) };
  }
  return null;
};

const parseEnd = (raw: unknown): End | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.item === 'string' && o.item && (SIDES as readonly string[]).includes(str(o.side))) return { item: drawItemId(o.item), side: o.side as Side };
  return typeof o.x === 'number' && typeof o.y === 'number' && Number.isFinite(o.x) && Number.isFinite(o.y) ? { x: o.x, y: o.y } : null;
};

/* A record written before the plane was unbounded carries a `width` and a
   `height`, which named a page that no longer exists: they are read past
   rather than refused, so a backup made then still opens. */
const parseView = (raw: unknown): View => {
  if (typeof raw !== 'object' || raw === null) return ORIGIN;
  const o = raw as Record<string, unknown>;
  return { x: num(o.x, 0), y: num(o.y, 0), zoom: clampZoom(num(o.zoom, 1)) };
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
    items: o.items.map(parseItem).filter((i): i is DrawItem => i !== null),
    view: parseView(o.view),
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
