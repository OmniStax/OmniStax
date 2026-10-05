/* The concept map's layered layout: Sugiyama's method, top-down.

   A concept stands one layer below its deepest prerequisite (the longest path
   from the sources), so every edge points down. An edge that spans layers is
   cut at each layer it crosses by a dummy point, the rows are ordered by the
   barycentre of their neighbours over four sweeps down and up, and the places
   along each row are the median of the neighbours' places, weighted so long
   edges run straight, parted by the least gap a row allows. An edge is drawn as
   cubic curves through its dummy points. Pure and seedless: the same nodes and
   edges always land in the same places, so the build can settle it ahead. */

export type Pt = { readonly x: number; readonly y: number };
export type Positions = ReadonlyMap<string, Pt>;
export type Edge = readonly [from: string, to: string];
export type Rect = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
export type Box = { readonly w: number; readonly h: number };
export type LayoutNode = Box & { readonly id: string };
/* The dummy points an edge passes through, keyed by `edgeKey`. */
export type Bends = ReadonlyMap<string, readonly Pt[]>;
/* A settled layout. A hyperbolic one also names its spanning tree's edges, and
   where each node stands in its tree parent's frame. */
export type Laid = {
  readonly pos: Positions; readonly bends: Bends;
  readonly tree?: ReadonlySet<string>; readonly steps?: ReadonlyMap<string, readonly [parent: string, x: number, y: number]>;
};

export const edgeKey = (from: string, to: string): string => `${from}>${to}`;

/* The least clear space between two boxes on a row, between two dummies, and between layers. */
export const GAP = 14;
const DUMMY_W = 4, DUMMY_GAP = 6, LAYER_GAP = 56, SWEEPS = 4, PASSES = 8, DUMMY_WEIGHT = 8;

/* Each node's layer: the longest path to it from a source. An edge that closes a cycle is ignored. */
export const layersOf = (ids: readonly string[], edges: readonly Edge[]): Map<string, number> => {
  const ins = new Map<string, string[]>(ids.map((id) => [id, []]));
  edges.forEach(([a, b]) => { if (ins.has(a) && ins.has(b)) ins.get(b)!.push(a); });
  const layer = new Map<string, number>(), open = new Set<string>();
  const visit = (id: string): number => {
    const had = layer.get(id); if (had !== undefined) return had;
    open.add(id);
    const l = ins.get(id)!.reduce((m, p) => (open.has(p) ? m : Math.max(m, visit(p) + 1)), 0);
    open.delete(id); layer.set(id, l); return l;
  };
  ids.forEach(visit);
  return layer;
};

const mean = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/* Places along a row as near the wanted ones as the gaps allow, in the row's
   order: least squares under the spacing, by pooling adjacent violators. */
const spaced = (want: readonly number[], weight: readonly number[], sep: readonly number[]): number[] => {
  const off = want.map((_, i) => (i ? sep[i - 1] : 0));
  for (let i = 1; i < off.length; i++) off[i] += off[i - 1];
  const blocks: { s: number; w: number; n: number }[] = [];
  want.forEach((x, i) => {
    blocks.push({ s: (x - off[i]) * weight[i], w: weight[i], n: 1 });
    while (blocks.length > 1 && blocks[blocks.length - 2].s / blocks[blocks.length - 2].w > blocks[blocks.length - 1].s / blocks[blocks.length - 1].w) {
      const b = blocks.pop()!, a = blocks[blocks.length - 1];
      a.s += b.s; a.w += b.w; a.n += b.n;
    }
  });
  return blocks.flatMap((b) => Array<number>(b.n).fill(b.s / b.w)).map((y, i) => y + off[i]);
};

export const sugiyama = (nodes: readonly LayoutNode[], edges: readonly Edge[]): Laid => {
  if (!nodes.length) return { pos: new Map(), bends: new Map() };
  const layer = layersOf(nodes.map((n) => n.id), edges);
  type V = { readonly w: number; readonly h: number; readonly dummy: boolean };
  const v = new Map<string, V>(nodes.map((n) => [n.id, { w: n.w, h: n.h, dummy: false }]));
  const rows: string[][] = Array.from({ length: Math.max(...layer.values()) + 1 }, () => []);
  nodes.forEach((n) => rows[layer.get(n.id)!].push(n.id));
  const up = new Map<string, string[]>(), down = new Map<string, string[]>();
  const link = (a: string, b: string): void => { (down.get(a) ?? down.set(a, []).get(a)!).push(b); (up.get(b) ?? up.set(b, []).get(b)!).push(a); };
  const chains = edges.filter(([a, b]) => v.has(a) && v.has(b) && layer.get(a)! < layer.get(b)!).map(([a, b]) => {
    const chain = [a];
    for (let l = layer.get(a)! + 1; l < layer.get(b)!; l++) {
      const d = `\u0000${edgeKey(a, b)}#${l}`;
      v.set(d, { w: DUMMY_W, h: 0, dummy: true }); rows[l].push(d); chain.push(d);
    }
    chain.push(b);
    chain.forEach((id, i) => { if (i) link(chain[i - 1], id); });
    return { key: edgeKey(a, b), chain };
  });

  /* the order along each row */
  const order = new Map<string, number>();
  const number = (row: readonly string[]): void => row.forEach((id, i) => order.set(id, i));
  rows.forEach(number);
  const sortBy = (row: string[], nb: ReadonlyMap<string, readonly string[]>): void => {
    const bc = new Map(row.map((id) => { const ns = nb.get(id); return [id, ns?.length ? mean(ns.map((n) => order.get(n)!)) : order.get(id)!]; }));
    row.sort((a, b) => bc.get(a)! - bc.get(b)!); number(row);
  };
  for (let s = 0; s < SWEEPS; s++) {
    for (let l = 1; l < rows.length; l++) sortBy(rows[l], up);
    for (let l = rows.length - 2; l >= 0; l--) sortBy(rows[l], down);
  }

  /* the places along each row */
  const x = new Map<string, number>();
  const sepOf = (row: readonly string[]): number[] => row.slice(1).map((id, i) => {
    const a = v.get(row[i])!, b = v.get(id)!;
    return (a.w + b.w) / 2 + (a.dummy && b.dummy ? DUMMY_GAP : GAP);
  });
  const seps = rows.map(sepOf);
  rows.forEach((row, l) => {
    const xs = spaced(row.map(() => 0), row.map(() => 1), seps[l]);
    row.forEach((id, i) => x.set(id, xs[i]));
  });
  for (let p = 0; p < PASSES; p++) {
    const downward = p % 2 === 0, nb = downward ? up : down;
    const ls = rows.map((_, l) => l);
    (downward ? ls : ls.reverse()).forEach((l) => {
      const row = rows[l];
      const want = row.map((id) => { const ns = nb.get(id); return ns?.length ? median(ns.map((n) => x.get(n)!)) : x.get(id)!; });
      const xs = spaced(want, row.map((id) => (v.get(id)!.dummy ? DUMMY_WEIGHT : 1)), seps[l]);
      row.forEach((id, i) => x.set(id, xs[i]));
    });
  }

  /* the layers' heights */
  const ys: number[] = [];
  rows.forEach((row, l) => {
    const h = Math.max(0, ...row.map((id) => v.get(id)!.h));
    const prev = l ? Math.max(0, ...rows[l - 1].map((id) => v.get(id)!.h)) : 0;
    ys.push(l ? ys[l - 1] + prev / 2 + LAYER_GAP + h / 2 : 0);
  });
  const r = (n: number): number => Math.round(n * 10) / 10;
  const at = (id: string): Pt => ({ x: r(x.get(id)!), y: r(ys[layer.get(id) ?? Number(id.slice(id.lastIndexOf('#') + 1))]) });
  return {
    pos: new Map(nodes.map((n) => [n.id, at(n.id)])),
    bends: new Map(chains.filter((c) => c.chain.length > 2).map((c) => [c.key, c.chain.slice(1, -1).map(at)])),
  };
};

/* A layout turned on its side: what was down runs right. */
export const transposed = (laid: Laid): Laid => {
  const t = (p: Pt): Pt => ({ x: p.y, y: p.x });
  return { pos: new Map([...laid.pos].map(([id, p]) => [id, t(p)])), bends: new Map([...laid.bends].map(([k, ps]) => [k, ps.map(t)])) };
};

/* An edge as cubic curves from the bottom of one box, through its bends, to the
   top of the other; across, from the right side to the left. */
export const wireOf = (p: Pt, a: Box, q: Pt, b: Box, bends: readonly Pt[], across: boolean): string => {
  const pts = across ? [{ x: p.x + a.w / 2, y: p.y }, ...bends, { x: q.x - b.w / 2, y: q.y }] : [{ x: p.x, y: p.y + a.h / 2 }, ...bends, { x: q.x, y: q.y - b.h / 2 }];
  const f = (n: number): number => Math.round(n * 10) / 10;
  return pts.reduce((d, u, i) => {
    if (!i) return `M${f(u.x)},${f(u.y)}`;
    const o = pts[i - 1];
    if (across) { const m = f((o.x + u.x) / 2); return `${d}C${m},${f(o.y)} ${m},${f(u.y)} ${f(u.x)},${f(u.y)}`; }
    const m = f((o.y + u.y) / 2);
    return `${d}C${f(o.x)},${m} ${f(u.x)},${m} ${f(u.x)},${f(u.y)}`;
  }, '');
};
