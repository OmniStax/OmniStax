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
/* A node as the layout sees it: an id, its depth, the radius the forces keep
   clear round it, and the box it is drawn in. */
export type LayoutNode = { readonly id: string; readonly depth: Depth; readonly r: number; readonly w: number; readonly h: number };
export type Edge = readonly [from: string, to: string];
/* A rectangle of map coordinates: what a viewport asks the grid for. */
export type Rect = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };

/* The least a ring may clear the one inside it by, how much slack a ring keeps
   round the nodes it carries, and the tick budget. */
const RING = 170, RING_GAP = 72, PACK = 1.18, TICKS = 300, SEED = 0x2f6e2b1;
/* However deep the prerequisites run, the map is drawn in no more bands than
   this. A book whose deepest concept stands fifty prerequisites down would
   otherwise be laid out fifty rings from the centre — tens of thousands of
   pixels across, which is a map nobody can read however correctly each node is
   placed. The depths are ranked and shared out over these bands instead, so
   what a concept is built on still lies inside it while the plane stays small
   enough to fit on a screen. */
const MAX_BANDS = 12;

/* A small linear congruential generator: d3's forces ask for random numbers to
   shake coincident nodes apart, and this keeps that shake the same every run. */
const lcg = (seed: number): (() => number) => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

type Sim = SimulationNodeDatum & { id: string; depth: Depth; r: number };

/* The rings a node set is drawn on: which ring each node belongs to, and how
   far out each ring stands. A ring is wide enough to carry its own nodes side
   by side — which is what keeps a crowded rank from piling up on one point —
   and always clears the ring inside it. */
export type Rings = { readonly at: ReadonlyMap<string, number>; readonly radius: readonly number[]; readonly held: readonly (readonly string[])[] };
export const ringsOf = (nodes: readonly LayoutNode[]): Rings => {
  /* The bands: the depths in order, shared out over the bands there is room
     for, so that a book fifty prerequisites deep is still drawn on a dozen. */
  const depths = [...new Set(nodes.map((n) => n.depth))].sort((a, b) => a - b);
  const span = Math.max(1, depths.length - 1);
  const band = new Map(depths.map((d, i) => [d, depths.length <= MAX_BANDS ? i : Math.round((i * (MAX_BANDS - 1)) / span)]));
  /* the nodes in the order they are laid down: band by band, and within a band
     the order they came in, so the result is the same on every run */
  const order = nodes.map((n, i) => ({ n, i }))
    .sort((a, b) => (band.get(a.n.depth)! - band.get(b.n.depth)!) || (a.i - b.i))
    .map((x) => x.n);
  /* A band is not one circle but as many as its nodes need. A rank that holds
     a quarter of the book would otherwise ask for a circle wide enough to
     carry them all side by side — and a map tens of thousands of pixels across
     is one nobody can fit on a screen. So a ring is filled to its
     circumference and the next one opened beyond it, which makes the whole map
     grow with the square root of the concepts in it rather than with them. */
  const radius: number[] = [], held: string[][] = [];
  let k = -1, used = 0, on = -1;
  const open = (): void => { k += 1; radius[k] = k === 0 ? 0 : radius[k - 1] + RING_GAP; held[k] = []; used = 0; };
  open();
  order.forEach((n) => {
    const w = (2 * n.r + 10) * PACK, b = band.get(n.depth)!;
    if (held[k].length && (b !== on || used + w > 2 * Math.PI * radius[k])) open();
    held[k].push(n.id); used += w; on = b;
  });
  const at = new Map<string, number>();
  held.forEach((ids, i) => ids.forEach((id) => at.set(id, i)));
  return { at, radius, held };
};

/* Where the nodes stand before the forces have settled them: each on its own
   ring, spread evenly round it and turned by the golden angle from the ring
   inside, so no two begin on the same point and the forces have only to settle
   them. This is also what is drawn while a large scope is being laid out. */
export const seedPositions = (nodes: readonly LayoutNode[]): Positions => {
  const { radius, held } = ringsOf(nodes);
  return new Map(held.flatMap((ids, k) => ids.map((id, i): [string, Pt] => {
    const a = (i / Math.max(1, ids.length)) * 2 * Math.PI + k * 2.399963229728653;
    return [id, { x: Math.cos(a) * radius[k], y: Math.sin(a) * radius[k] }];
  })));
};

export const layout = (nodes: readonly LayoutNode[], edges: readonly Edge[], ticks: number = TICKS): Positions => {
  if (!nodes.length) return new Map();
  const ids = new Set(nodes.map((n) => n.id));
  const rings = ringsOf(nodes);
  const ringAt = (id: string): number => rings.radius[rings.at.get(id) ?? 0] ?? 0;
  const seeds = seedPositions(nodes);
  const sims: Sim[] = nodes.map((n) => ({ ...n, ...seeds.get(n.id)! }));
  const links = edges.filter(([a, b]) => ids.has(a) && ids.has(b)).map(([source, target]) => ({ source, target }));
  const sim = forceSimulation<Sim>(sims)
    .randomSource(lcg(SEED))
    .force('link', forceLink<Sim, { source: string | Sim; target: string | Sim }>(links).id((d) => d.id).distance((l) => {
      const s = l.source as Sim, t = l.target as Sim;
      return Math.max(70, s.r + t.r + 40 + Math.abs(ringAt(t.id) - ringAt(s.id)) * 0.4);
    }).strength(0.3))
    .force('charge', forceManyBody<Sim>().strength((d) => -70 - d.r * 6).distanceMax(RING * 5))
    .force('radial', forceRadial<Sim>((d) => ringAt(d.id), 0, 0).strength(0.7))
    /* a weak pull home, so an island with no prerequisites cannot drift away */
    .force('cx', forceX<Sim>(0).strength(0.01))
    .force('cy', forceY<Sim>(0).strength(0.01))
    .force('collide', forceCollide<Sim>((d) => d.r + 6).strength(0.9).iterations(2))
    .alphaDecay(1 - Math.pow(0.001, 1 / Math.max(1, ticks)))
    .stop();
  for (let i = 0; i < ticks; i++) sim.tick();
  const round = (v: number): number => Math.round(v * 100) / 100;
  const forced: Positions = new Map(sims.map((n) => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }]));
  return new Map([...separated(nodes, forced)].map(([id, p]) => [id, { x: round(p.x), y: round(p.y) }]));
};

/* The least clear space between two boxes, edge to edge. */
export const GAP = 14;
/* The forces only keep circles apart, and only nearly: this settles what they
   leave. Every pair of boxes that comes nearer than the gap is pushed apart
   along the axis it overlaps least on, half each, sweep after sweep until none
   does. The pairs are found through a grid, and the order is the order the
   nodes came in, so the answer is as fixed as the forces' own. */
export const separated = (boxes: readonly { readonly id: string; readonly w: number; readonly h: number }[], pos: Positions, gap = GAP, sweeps = 400): Positions => {
  const at = boxes.filter((b) => pos.has(b.id)).map((b, i) => ({ ...b, i, x: pos.get(b.id)!.x, y: pos.get(b.id)!.y }));
  if (at.length < 2) return new Map(at.map((n) => [n.id, { x: n.x, y: n.y }]));
  const cell = Math.max(...at.map((n) => Math.max(n.w, n.h))) + gap;
  for (let s = 0; s < sweeps; s++) {
    const grid = new Map<string, typeof at>();
    at.forEach((n) => { const k = key(Math.floor(n.x / cell), Math.floor(n.y / cell)); grid.set(k, [...(grid.get(k) ?? []), n]); });
    let moved = false;
    at.forEach((a) => {
      const cx = Math.floor(a.x / cell), cy = Math.floor(a.y / cell);
      for (let gx = cx - 1; gx <= cx + 1; gx++) for (let gy = cy - 1; gy <= cy + 1; gy++) for (const b of grid.get(key(gx, gy)) ?? []) {
        if (b.i <= a.i) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const ox = (a.w + b.w) / 2 + gap - Math.abs(dx), oy = (a.h + b.h) / 2 + gap - Math.abs(dy);
        if (ox <= 0.01 || oy <= 0.01) continue;
        moved = true;
        /* two nodes on one point part along the line the order puts between them */
        const sx = dx > 0 || (dx === 0 && (a.i + b.i) % 2 === 0) ? 1 : -1, sy = dy > 0 || (dy === 0 && a.i % 2 === 0) ? 1 : -1;
        if (ox / (a.w + b.w) <= oy / (a.h + b.h)) { a.x -= (sx * ox) / 2; b.x += (sx * ox) / 2; }
        else { a.y -= (sy * oy) / 2; b.y += (sy * oy) / 2; }
      }
    });
    if (!moved) break;
  }
  return new Map(at.map((n) => [n.id, { x: n.x, y: n.y }]));
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
   build has no document to measure in. So the name is set the way the browser
   will set it — word by word into lines no wider than the widest node, each
   glyph as wide as the widest of the bundled faces makes it, and an inline
   formula as one piece that breaks only at its equals signs — and the box is
   that, with the node's padding round it. The node itself is drawn as wide as
   its lines are, so this box is the room it is kept, never smaller than it. */
export type Box = { readonly w: number; readonly h: number };
/* The node's type size and line, in the map's own pixels; the stylesheet sets the same. */
export const NODE_FONT = 12, NODE_LINE = 15;
const MAXW = 172, MINW = 48, PAD_X = 20, PAD_Y = 16, SEC_LINE = 12, SPACE = 0.3;
/* How wide a glyph runs, in ems of the node's type. */
const glyph = (ch: string): number =>
  /[ijl.,:;'`!|]/.test(ch) ? 0.3
  : /[ftrI()[\]/\-]/.test(ch) ? 0.4
  : /[mwMW]/.test(ch) ? 0.9
  : /[A-Z]/.test(ch) ? 0.72
  : /[0-9a-z]/.test(ch) ? 0.58
  : 0.65;
const runOf = (s: string): number => [...s].reduce((sum, ch) => sum + (ch === ' ' ? SPACE : glyph(ch)), 0);
/* An inline formula in ems of the node's type: KaTeX sets it larger and in
   italic, a fraction as wide as its wider half, a book's symbol macro as the
   two or three glyphs it prints, and room either side of a relation. */
const MATH = 1.2;
const mathRun = (tex: string): number => {
  const flat = tex
    .replace(/\\(?:t|d)?frac\{([^{}]*)\}\{([^{}]*)\}/g, (_, a: string, b: string) => (a.length > b.length ? a : b))
    .replace(/\\(?:text|mathrm|mathit|operatorname)\{([^{}]*)\}/g, '$1')
    .replace(/\\k[A-Za-z]+/g, 'XXq')
    .replace(/\\(?:Delta|times|cdot|theta|alpha|beta|gamma|omega|lambda|mu|pi|rho|sigma|tau|phi|kappa|epsilon|varepsilon|nu|eta)\b/g, 'X')
    .replace(/\\[;,:! ]|~/g, ' ')
    .replace(/\\[A-Za-z]+/g, 'x')
    .replace(/[{}]/g, '');
  const scripts = (flat.match(/[\^_]/g) ?? []).length;
  const ops = (flat.match(/[=+<>]|(?<=\S)\s*-\s*(?=\S)/g) ?? []).length;
  return (runOf(flat.replace(/[\^_\s]/g, '')) - scripts * 0.15 + ops * 0.6) * MATH;
};
/* The pieces a name breaks into: its words, and its formulas cut at each equals sign. */
type Piece = { readonly em: number; readonly tall: number };
const piecesOf = (name: string): Piece[] =>
  name.split(/(\$[^$]*\$)/).filter(Boolean).flatMap((part): Piece[] => {
    if (!part.startsWith('$')) return part.split(/\s+/).filter(Boolean).map((w) => ({ em: runOf(w), tall: 0 }));
    const tex = part.slice(1, -1);
    /* a line with a formula in it stands taller than one of words, the more so for a fraction or a power */
    const tall = /\\d?frac/.test(tex) ? 16 : /\\tfrac|\^/.test(tex) ? 9 : 6;
    return tex.split(/(?<==)/).map((t) => ({ em: mathRun(t), tall }));
  });
/* The pieces set into lines no wider than the widest node: how wide the widest line runs, and how tall each line stands. */
const linesOf = (pieces: readonly Piece[], max: number): { readonly w: number; readonly heights: readonly number[] } => {
  const lines = pieces.reduce<{ w: number; tall: number }[]>((acc, p) => {
    const last = acc[acc.length - 1], wide = p.em * NODE_FONT;
    if (last && last.w + SPACE * NODE_FONT + wide <= max) return [...acc.slice(0, -1), { w: last.w + SPACE * NODE_FONT + wide, tall: Math.max(last.tall, p.tall) }];
    return [...acc, { w: wide, tall: p.tall }];
  }, []);
  return { w: Math.max(0, ...lines.map((l) => Math.min(l.w, max))), heights: lines.map((l) => NODE_LINE + l.tall + Math.max(0, Math.ceil(l.w / max) - 1) * NODE_LINE) };
};
/* Axioms and results are set in a heavier weight, which runs wider. */
const HEAVY = 1.06;
export const boxOf = (c: { readonly name: string; readonly ext: boolean; readonly kind?: string }): Box => {
  const heavy = c.kind === 'axiom' || c.kind === 'result' ? HEAVY : 1;
  const skill = c.kind === 'skill' ? 1.2 : 0;
  const pieces = [...(skill ? [{ em: skill, tall: 0 }] : []), ...piecesOf(c.name).map((p) => ({ ...p, em: p.em * heavy }))];
  const { w, heights } = linesOf(pieces, MAXW - PAD_X);
  return { w: Math.ceil(Math.max(MINW, w + PAD_X)), h: Math.ceil(PAD_Y + Math.max(NODE_LINE, heights.reduce((a, b) => a + b, 0)) + (c.ext ? SEC_LINE : 0)) };
};

/* The concepts of a scope as the layout wants them: each on the ring its
   prerequisite depth puts it on, taking up the radius of its own box. */
export const layoutNodes = (list: readonly DagNode[]): LayoutNode[] => {
  const depth = depthsOf(list);
  return list.map((c) => { const b = boxOf(c); return { id: c.id, depth: depth.get(c.id) ?? 0, r: Math.hypot(b.w, b.h) / 2, w: b.w, h: b.h }; });
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
