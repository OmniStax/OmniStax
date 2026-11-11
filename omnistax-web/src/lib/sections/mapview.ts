/* What the concept map does with its view and its selection, kept apart from
   the drawing so it can be reasoned about: the scale a level opens at, the
   subgraph a selection brings with it, where its own layout is put when the
   reader focuses on it, and where each level was left standing. */
import type { Edge, Laid, Positions, Pt } from './sugiyama';
import type { Target } from './scope';
import type { MapKind } from './layouts';
import { readerWritesAllowed } from '../backup/guard';

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

/* Where the reader left each level they walked, and what they had picked
   there. A level they have not walked has no entry and opens fresh; one they
   leave by the trail's menu, rather than by its crumbs, is let go. The pick
   outlives the map itself: a tab put away, a group opened beside it or the
   page it follows read elsewhere for a while, and the map that comes back
   finds the concepts it was focused on. All of it is kept in this browser, so
   a reload draws each map as it was left; it goes with the map's tab, and it
   is not one of the reader's records, so no backup carries it. */
/* The selection on a level, and the concepts its focus keeps while one is on. */
export type Picked = { readonly selected: readonly string[]; readonly focus: readonly string[] | null };
type Kept = { held: Map<ViewKey, Held>; picked: Map<ViewKey, Picked>; kinds: Map<string, MapKind>; hidden: Map<string, readonly string[]> };

const KEY = 'omnistax-map-views';
const SAVE_MS = 300;
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');
const entries = (v: unknown): [string, unknown][] => (v && typeof v === 'object' && !Array.isArray(v) ? Object.entries(v as Record<string, unknown>) : []);
/* What was written down, read back: anything that is not what it should be is left out. */
export const parseMapViews = (raw: unknown): Kept => {
  const r = (raw ?? {}) as Record<string, unknown>;
  const kept: Kept = { held: new Map(), picked: new Map(), kinds: new Map(), hidden: new Map() };
  for (const [k, v] of entries(r.held)) { const h = v as Partial<Held> | null; if (h && num(h.x) && num(h.y) && num(h.k) && h.k > 0) kept.held.set(k, { x: h.x, y: h.y, k: h.k }); }
  for (const [k, v] of entries(r.picked)) {
    const p = v as { selected?: unknown; focus?: unknown } | null;
    if (p && strings(p.selected) && (p.focus === null || strings(p.focus)) && (p.selected.length || p.focus)) kept.picked.set(k, { selected: p.selected, focus: p.focus });
  }
  for (const [k, v] of entries(r.kinds)) if (v === 'down' || v === 'right' || v === 'disk') kept.kinds.set(k, v);
  for (const [k, v] of entries(r.hidden)) if (strings(v) && v.length) kept.hidden.set(k, v);
  return kept;
};
export const writeMapViews = (k: Kept): unknown =>
  ({ held: Object.fromEntries(k.held), picked: Object.fromEntries(k.picked), kinds: Object.fromEntries(k.kinds), hidden: Object.fromEntries(k.hidden) });

const stored = (): Storage | null => { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } };
let kept: Kept | null = null;
const all = (): Kept => {
  if (kept) return kept;
  try { kept = parseMapViews(JSON.parse(stored()?.getItem(KEY) ?? 'null')); } catch { kept = parseMapViews(null); }
  return kept;
};
let timer: ReturnType<typeof setTimeout> | null = null;
const save = (): void => {
  const box = stored(); if (!box || timer) return;
  timer = setTimeout(() => {
    timer = null;
    if (!readerWritesAllowed()) return;
    try { box.setItem(KEY, JSON.stringify(writeMapViews(all()))); } catch { /* private mode */ }
  }, SAVE_MS);
};

export const mapViews = {
  get: (k: ViewKey): Held | undefined => all().held.get(k),
  keep: (k: ViewKey, v: Held): void => { all().held.set(k, { x: v.x, y: v.y, k: v.k }); save(); },
  picked: (k: ViewKey): Picked | undefined => all().picked.get(k),
  /* nothing picked is no entry, so a level let go and a level never touched read alike */
  pick: (k: ViewKey, p: Picked): void => {
    const had = all().picked.get(k);
    if (p.selected.length || p.focus) all().picked.set(k, { selected: [...p.selected], focus: p.focus && [...p.focus] }); else all().picked.delete(k);
    if (had || all().picked.has(k)) save();
  },
  forget: (k: ViewKey): void => { all().held.delete(k); all().picked.delete(k); save(); },
  /* Let go of what was kept for map tabs that no longer stand. */
  keepItems: (items: ReadonlySet<string>): void => {
    const a = all(), of = (k: string): boolean => items.has(k) || [...items].some((i) => k.startsWith(`${i}|`));
    let gone = false;
    for (const m of [a.held, a.picked, a.kinds, a.hidden] as const) for (const k of [...m.keys()]) if (!of(k)) { m.delete(k); gone = true; }
    if (gone) save();
  },
};

/* The layout each map tab was showing, so a map put away and drawn again comes back in it. */
export const mapKinds = {
  get: (item: string): MapKind | undefined => all().kinds.get(item),
  set: (item: string, k: MapKind): void => { all().kinds.set(item, k); save(); },
};
/* The kinds of concept each map tab's legend has switched off. */
export const mapHidden = {
  get: (item: string): readonly string[] => all().hidden.get(item) ?? [],
  set: (item: string, off: readonly string[]): void => { if (off.length) all().hidden.set(item, [...off]); else all().hidden.delete(item); save(); },
};
