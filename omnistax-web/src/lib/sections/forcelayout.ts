/* Where the concept map's nodes stand. The map is a mind map rather than a
   ladder of rows: a concept sits at a radius that grows with how deep its
   prerequisites run, so what the book takes for granted gathers at the centre
   and what it builds last lies at the rim, while the forces along the
   prerequisite edges pull the concepts that need each other into clusters.

   The layout is settled before anything is drawn — the simulation is ticked to
   convergence in a loop here, never animated on screen — and it is a pure
   function of its input: the one source of randomness the forces ask for is a
   seeded generator, so the same nodes and edges always land in the same places. */
import { depthsOf, edgesOf, type DagNode } from './dag';
import { forceSimulation, forceLink, forceManyBody, forceCollide, forceRadial, forceX, forceY, type SimulationNodeDatum } from 'd3-force';

/* How deep a node's prerequisites run: 0 for what the map takes as given. */
export type Depth = number;
/* A settled place, in the map's own coordinates; the view's transform is another matter. */
export type Pt = { readonly x: number; readonly y: number };
export type Positions = ReadonlyMap<string, Pt>;
/* A node as the layout sees it: an id, its depth, and the radius it takes up. */
export type LayoutNode = { readonly id: string; readonly depth: Depth; readonly r: number };
export type Edge = readonly [from: string, to: string];
/* A rectangle of map coordinates: what a viewport asks the grid for. */
export type Rect = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

/* The gap between one depth's ring and the next, and the tick budget. */
const RING = 170, TICKS = 300, SEED = 0x2f6e2b1;

/* A small linear congruential generator: d3's forces ask for random numbers to
   shake coincident nodes apart, and this keeps that shake the same every run. */
const lcg = (seed: number): (() => number) => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

type Sim = SimulationNodeDatum & { id: string; depth: Depth; r: number };

/* Where a node starts: a point on its own ring, spread by the golden angle, so
   that nodes of one depth begin apart and the forces need only settle them. */
const seedPlace = (i: number, depth: Depth): Pt => {
  const a = i * 2.399963229728653, rad = RING * depth;
  return { x: Math.cos(a) * rad, y: Math.sin(a) * rad };
};

export const layout = (nodes: readonly LayoutNode[], edges: readonly Edge[], ticks: number = TICKS): Positions => {
  if (!nodes.length) return new Map();
  const ids = new Set(nodes.map((n) => n.id));
  const sims: Sim[] = nodes.map((n, i) => ({ ...n, ...seedPlace(i, n.depth) }));
  const links = edges.filter(([a, b]) => ids.has(a) && ids.has(b)).map(([source, target]) => ({ source, target }));
  const sim = forceSimulation<Sim>(sims)
    .randomSource(lcg(SEED))
    .force('link', forceLink<Sim, { source: string | Sim; target: string | Sim }>(links).id((d) => d.id).distance((l) => {
      const s = l.source as Sim, t = l.target as Sim;
      return Math.max(70, s.r + t.r + 40 + RING * 0.4 * Math.abs(t.depth - s.depth));
    }).strength(0.3))
    .force('charge', forceManyBody<Sim>().strength((d) => -70 - d.r * 6).distanceMax(RING * 5))
    .force('radial', forceRadial<Sim>((d) => RING * d.depth, 0, 0).strength(0.7))
    /* a weak pull home, so an island with no prerequisites cannot drift away */
    .force('cx', forceX<Sim>(0).strength(0.01))
    .force('cy', forceY<Sim>(0).strength(0.01))
    .force('collide', forceCollide<Sim>((d) => d.r + 6).strength(0.9).iterations(2))
    .alphaDecay(1 - Math.pow(0.001, 1 / Math.max(1, ticks)))
    .stop();
  for (let i = 0; i < ticks; i++) sim.tick();
  const round = (v: number): number => Math.round(v * 100) / 100;
  return new Map(sims.map((n) => [n.id, { x: round(n.x ?? 0), y: round(n.y ?? 0) }]));
};

/* The extent the settled map covers, with room round the outermost node. */
export const extentOf = (pos: Positions, pad = 120): Rect => {
  const pts = [...pos.values()];
  if (!pts.length) return { x: -pad, y: -pad, w: pad * 2, h: pad * 2 };
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad;
  return { x: x0, y: y0, w: Math.max(...xs) + pad - x0, h: Math.max(...ys) + pad - y0 };
};

/* A bucket grid over the settled places, so that asking which nodes fall in the
   viewport costs the buckets the viewport touches rather than the whole book. */
export type Grid = { readonly cell: number; readonly buckets: ReadonlyMap<string, readonly string[]> };
const key = (cx: number, cy: number): string => `${cx},${cy}`;

export const gridOf = (pos: Positions, cell = RING): Grid => {
  const buckets = new Map<string, string[]>();
  pos.forEach((p, id) => {
    const k = key(Math.floor(p.x / cell), Math.floor(p.y / cell));
    buckets.set(k, [...(buckets.get(k) ?? []), id]);
  });
  return { cell, buckets };
};

/* Which nodes lie in a rectangle of map coordinates, the viewport's margin already in it. */
export const idsIn = (grid: Grid, pos: Positions, r: Rect): string[] => {
  const { cell } = grid, out: string[] = [];
  for (let cx = Math.floor(r.x / cell); cx <= Math.floor((r.x + r.w) / cell); cx++)
    for (let cy = Math.floor(r.y / cell); cy <= Math.floor((r.y + r.h) / cell); cy++)
      for (const id of grid.buckets.get(key(cx, cy)) ?? []) {
        const p = pos.get(id)!;
        if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) out.push(id);
      }
  return out;
};

/* ---------- what both sides of the map agree on ----------

   The same node set must land in the same places whether the build laid it out
   or the browser did, so everything that turns the concepts of a scope into a
   layout stands here: the box a node takes up, the ring it sits on, and the
   short name of the set. The build writes its answers under that name and the
   browser looks them up under it, so the only set laid out again in the reader's
   machine is one the build did not foresee. */

/* The box a node takes up, read off its name rather than measured: the layout
   has to know how much room to keep clear before anything is drawn, and the
   build has no document to measure in. */
export type Box = { readonly w: number; readonly h: number };
const CHAR = 6.4, MAXW = 150;
export const boxOf = (c: { readonly name: string; readonly ext: boolean }): Box => {
  const n = c.name.replace(/\$[^$]*\$/g, 'xxxx').length;
  const w = Math.min(MAXW, Math.max(62, n * CHAR + 18));
  const lines = Math.max(1, Math.ceil((n * CHAR) / (w - 16)));
  return { w, h: 16 + lines * 15 + (c.ext ? 12 : 0) };
};

/* The concepts of a scope as the layout wants them: each on the ring its
   prerequisite depth puts it on, taking up the radius of its own box. */
export const layoutNodes = (list: readonly DagNode[]): LayoutNode[] => {
  const depth = depthsOf(list);
  return list.map((c) => { const b = boxOf(c); return { id: c.id, depth: depth.get(c.id) ?? 0, r: Math.hypot(b.w, b.h) / 2 }; });
};

/* A node set's name: its ids, sorted, hashed to a short string. Two scopes that
   draw the same concepts are one layout and share one entry. */
export type LayoutKey = string;
export const hashOf = (ids: readonly string[]): LayoutKey => {
  let h = 2166136261;
  for (const s of [...ids].sort().join('\u0000')) { h ^= s.charCodeAt(0); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
};
export const keyOf = (list: readonly DagNode[]): LayoutKey => hashOf(list.map((c) => c.id));

/* The whole of it in one call: what the build endpoint runs, and what the
   worker runs for a set the build did not write. */
export const placesFor = (list: readonly DagNode[]): Positions => layout(layoutNodes(list), edgesOf(list));

/* Where the nodes stand before the forces have settled them — the seed rings
   themselves, drawn for the moment a large scope is being laid out off the main
   thread. Nothing here is random, so the map does not jump as it settles. */
export const seedPositions = (nodes: readonly LayoutNode[]): Positions =>
  new Map(nodes.map((n, i) => [n.id, seedPlace(i, n.depth)]));
