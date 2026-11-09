/* F.ds: the data-structure primitives a debugger figure draws (docs/design-code-and-debugger.md §2.5). The
   first slice: an array strip, pointers into it, a shaded or bracketed region, and a count row; then linked
   nodes, the links between them and the pointers to them (the CS book's 2.5 and the lists after it). All in the
   figure's logical units, every string through figlib's text, every colour the caller's (a referent's
   through F.ref, a category's through C), ink and muted otherwise. Each returns its layout so a figure can
   place more by it, and a test can check it without a canvas. */
import type { Ctx, Color, Logical } from './figlib';

/* the part of figlib these draw through (figlib passes itself in, as derivation.ts is passed FIG) */
type Align = 'left' | 'center' | 'right';
export type DsHost = {
  readonly LW: Logical; readonly PAL: Readonly<Record<string, Color>>;
  alpha(c: Color, a: number): Color;
  text(ctx: Ctx, s: string, x: Logical, y: Logical, color: Color, o?: { size?: number; weight?: number; align?: Align }): void;
  arrow(ctx: Ctx, x1: Logical, y1: Logical, x2: Logical, y2: Logical, color: Color, w?: number): void;
  dot(ctx: Ctx, x: Logical, y: Logical, color: Color, filled?: boolean, r?: number): void;
  hbracket(ctx: Ctx, x1: Logical, x2: Logical, y: Logical, color: Color, label?: string, o?: { side?: 'above' | 'below' }): void;
};

export type StripOpts = {
  readonly x?: Logical; readonly y: Logical; readonly w?: Logical;   /* the strip is centred on x (default the canvas's middle), at most w wide */
  readonly cell?: Logical; readonly h?: Logical;                     /* the largest cell, and the cells' height */
  readonly values: readonly (number | string)[];
  readonly base?: 0 | 1;                                             /* 1-based draws a sentinel a₀ before the first cell */
  readonly index?: boolean;                                          /* indices under the cells (default true) */
  readonly dim?: readonly number[];                                  /* indices drawn faint: out of play */
  readonly color?: Color;                                            /* the cells' outline */
  readonly name?: string;                                            /* the array's name, left of the strip */
  readonly size?: number;
};
export type Strip = {
  readonly l: Logical; readonly r: Logical; readonly t: Logical; readonly b: Logical; readonly cell: Logical;
  readonly n: number; readonly base: 0 | 1;
  /* the centre of the cell at index i (fractional between cells), the sentinel at 0 of a 1-based strip */
  readonly x: (i: number) => Logical;
  readonly y: Logical;
};
export type PointerSpec = { readonly at: number; readonly name: string; readonly color?: Color };
export type PointerOpts = { readonly side?: 'above' | 'below'; readonly gap?: Logical; readonly size?: number };
export type Placed = { readonly name: string; readonly x: Logical; readonly y: Logical; readonly lean: number };
export type RegionOpts = {
  readonly from: number; readonly to: number;       /* indices, inclusive, fractional while moving */
  readonly color: Color; readonly kind?: 'shade' | 'bracket'; readonly label?: string;
  readonly side?: 'above' | 'below'; readonly alpha?: number; readonly gap?: Logical;
};
export type CountsOpts = { readonly counts: Readonly<Record<string, number>>; readonly y?: Logical; readonly color?: Color; readonly name?: string; readonly hot?: string };
export type Counts = { readonly x: (key: string) => Logical; readonly y: Logical; readonly l: Logical; readonly r: Logical };

/* Linked nodes. A node is a value cell beside a link cell (the `next` field); a node with no value is one
   link cell alone: a pointer variable such as a list's head, or a record's field. The figure places each
   node by its centre, so it moves a node by moving its x and y. A status is decoration, never a hue
   (the CS book's COLOR.md): live solid, unreached dashed, discarded faded to ink. */
export type Point = { readonly x: Logical; readonly y: Logical };
export type NodeSpec = {
  readonly id: string; readonly x: Logical; readonly y: Logical;
  readonly value?: number | string;                    /* absent: a link cell alone */
  readonly name?: string;                              /* a label under (or over) the node: "node.next", "head" */
  readonly nameColor?: Color; readonly nameSide?: 'above' | 'below' | 'left';
  readonly color?: Color;                              /* the outline (ink by default) */
  readonly valueColor?: Color;                         /* the value's colour and its cell's tint */
  readonly status?: 'live' | 'unreached' | 'discarded';
  readonly alpha?: number;                             /* the whole node's opacity, for a node arriving or leaving */
};
export type NodesOpts = { readonly items: readonly NodeSpec[]; readonly cell?: Logical; readonly h?: Logical; readonly size?: number };
export type NodeBox = {
  readonly id: string; readonly x: Logical; readonly y: Logical;
  readonly l: Logical; readonly r: Logical; readonly t: Logical; readonly b: Logical;
  readonly link: Point;                                /* the link cell's centre, where a link leaves from */
  readonly valueX: Logical;                            /* the value cell's centre (the link cell's on a pointer box) */
  readonly single: boolean;
};
export type Nodes = { readonly at: (id: string) => NodeBox | undefined; readonly boxes: readonly NodeBox[]; readonly cell: Logical; readonly h: Logical;
  /* where a link from `from` lands on node `id`: its left edge, or its top or bottom where it sits well above or below */
  readonly entry: (id: string, from: Point) => Point };
export type LinkSpec = {
  readonly from: string | Point;                      /* a node's link cell, or a point (a link being drawn in) */
  readonly to: string | Point | null;                 /* a node, a point, or null: the end-of-list terminator */
  readonly color?: Color; readonly w?: number; readonly dash?: readonly number[];
  readonly bend?: Logical;                             /* the curve's sag at its middle, negative over the top */
  readonly alpha?: number;
};
export type LinksOpts = { readonly nullLabel?: string };
export type Drawn = { readonly from: Point; readonly to: Point; readonly mid: Point };
export type NodePointerSpec = { readonly at: string; readonly name: string; readonly color?: Color; readonly field?: 'value' | 'link' };

const SPREAD = 0.22;   /* how far a pointer sharing a cell leans aside, in cells */
export function makeDs(F: () => DsHost) {
  /* the strip's cells, values in them, indices beneath */
  function strip(ctx: Ctx, o: StripOpts): Strip {
    const f = F(), base = o.base ?? 0, n = o.values.length, slots = n + base, h = o.h ?? 64;
    const w = o.w ?? f.LW - 160, cx = o.x ?? f.LW / 2;
    const cell = Math.min(o.cell ?? 84, w / Math.max(1, slots));
    const l = cx - (slots * cell) / 2, t = o.y - h / 2;
    const S: Strip = { l, r: l + slots * cell, t, b: t + h, cell, n, base, y: o.y, x: (i) => l + (i + 0.5) * cell };
    const ink = f.PAL.ink, line = o.color ?? ink, size = o.size ?? Math.min(26, cell * 0.42);
    const dim = new Set(o.dim ?? []);
    const box = (x0: Logical, dashed: boolean, faint: boolean): void => {
      ctx.save();
      ctx.fillStyle = f.PAL.panel; ctx.fillRect(x0, t, cell, h);
      ctx.strokeStyle = faint ? f.alpha(line, 0.35) : line; ctx.lineWidth = 3; if (dashed) ctx.setLineDash([6, 6]);
      ctx.strokeRect(x0, t, cell, h); ctx.restore();
    };
    if (base === 1) {
      box(l, true, true);
      f.text(ctx, 'a_0', S.x(0), o.y, f.PAL.muted, { size: size * 0.8, align: 'center' });
    }
    o.values.forEach((v, k) => {
      const i = k + base, faint = dim.has(i);
      box(S.x(i) - cell / 2, false, faint);
      f.text(ctx, String(v), S.x(i), o.y, faint ? f.alpha(ink, 0.4) : ink, { size, align: 'center' });
    });
    if (o.index !== false) for (let i = 0; i < slots; i += 1) f.text(ctx, String(i), S.x(i), S.b + 20, f.PAL.muted, { size: 17, align: 'center' });
    if (o.name) f.text(ctx, o.name, l - 18, o.y, ink, { size: 22, weight: 600, align: 'right' });
    return S;
  }

  /* how far each pointer leans aside, in cells: pointers sharing a cell stand side by side over it, the
     earlier on the left, and ease back to its middle as they part (a pointer stacked above another would
     cross the name beneath it with its arrow) */
  function stackOf(list: readonly PointerSpec[]): number[] {
    const near = (a: PointerSpec, b: PointerSpec): number => Math.max(0, Math.min(1, 1 - Math.abs(a.at - b.at)));
    return list.map((p, j) => list.reduce((s, q, k) => (k === j ? s : s + (k < j ? 1 : -1) * near(p, q)), 0) * SPREAD);
  }
  /* pointers into a strip: an arrow to the cell's edge and the pointer's name at its tail, in its colour */
  function pointer(ctx: Ctx, S: Strip, list: PointerSpec | readonly PointerSpec[], o: PointerOpts = {}): Placed[] {
    const f = F(), ps = Array.isArray(list) ? (list as readonly PointerSpec[]) : [list as PointerSpec];
    const up = (o.side ?? 'above') === 'above', gap = o.gap ?? 10, size = o.size ?? 24, lean = stackOf(ps);
    return ps.map((p, j) => {
      const x = S.x(p.at) + lean[j] * S.cell, c = p.color ?? f.PAL.ink;
      const edge = up ? S.t - gap : S.b + gap + 26;               /* below, clear of the index row */
      const len = 34, tail = up ? edge - len : edge + len;
      f.arrow(ctx, x, tail, x, edge, c, 4);
      const ly = up ? tail - 18 : tail + 18;
      f.text(ctx, p.name, x, ly, c, { size, weight: 600, align: 'center' });
      return { name: p.name, x, y: ly, lean: lean[j] };
    });
  }

  /* a run of cells: shaded behind them, or bracketed with a label (the window, an invariant's part) */
  function region(ctx: Ctx, S: Strip, o: RegionOpts): { l: Logical; r: Logical } {
    const f = F(), lo = Math.min(o.from, o.to), hi = Math.max(o.from, o.to);
    const l = S.x(lo) - S.cell / 2, r = S.x(hi) + S.cell / 2;
    if (hi < lo || r <= l) return { l, r: l };
    if ((o.kind ?? 'shade') === 'shade') {
      ctx.save(); ctx.fillStyle = f.alpha(o.color, o.alpha ?? 0.18); ctx.fillRect(l, S.t - 6, r - l, S.b - S.t + 12); ctx.restore();
      if (o.label) f.text(ctx, o.label, (l + r) / 2, (o.side ?? 'below') === 'below' ? S.b + 46 : S.t - 22, o.color, { size: 17, align: 'center' });
    } else {
      const below = (o.side ?? 'below') === 'below', y = below ? S.b + (o.gap ?? 40) : S.t - (o.gap ?? 16);
      f.hbracket(ctx, l + 4, r - 4, y, o.color, o.label, { side: below ? 'below' : 'above' });
    }
    return { l, r };
  }

  /* the counts of the values in a window, one key over its count, in a row centred under the strip */
  function counts(ctx: Ctx, S: Strip, o: CountsOpts): Counts {
    const f = F(), keys = Object.keys(o.counts), cell = Math.min(S.cell, 72), y = o.y ?? S.b + 92;
    const w = keys.length * cell, l = (S.l + S.r) / 2 - w / 2, c = o.color ?? f.PAL.ink;
    const x = (k: string): Logical => l + (keys.indexOf(k) + 0.5) * cell;
    if (o.name) f.text(ctx, o.name, l - 18, y + 14, f.PAL.ink, { size: 22, weight: 600, align: 'right' });
    keys.forEach((k) => {
      const n = o.counts[k], hot = o.hot === k, faint = n === 0;
      ctx.save(); ctx.strokeStyle = hot ? c : f.alpha(f.PAL.ink, faint ? 0.25 : 0.5); ctx.lineWidth = hot ? 3 : 2;
      ctx.strokeRect(x(k) - cell / 2 + 3, y - 4, cell - 6, 48); ctx.restore();
      f.text(ctx, k, x(k), y + 6, faint ? f.PAL.muted : f.PAL.ink, { size: 17, align: 'center' });
      f.text(ctx, String(n), x(k), y + 30, faint ? f.PAL.muted : c, { size: 22, weight: 600, align: 'center' });
    });
    return { x, y, l, r: l + w };
  }

  /* ---------- linked nodes ---------- */
  const LINK = 0.62;   /* a link cell's width, in value cells */
  function boxOf(o: NodeSpec, cell: Logical, h: Logical): NodeBox {
    const single = o.value === undefined, lw = cell * LINK, w = single ? lw : cell + lw;
    const l = o.x - w / 2, t = o.y - h / 2;
    return { id: o.id, x: o.x, y: o.y, l, r: l + w, t, b: t + h, single,
      link: { x: l + w - lw / 2, y: o.y }, valueX: single ? o.x : l + cell / 2 };
  }
  function layout(items: readonly NodeSpec[], cell: Logical, h: Logical): Nodes {
    const boxes = items.map((o) => boxOf(o, cell, h)), by = new Map(boxes.map((b) => [b.id, b]));
    const entry = (id: string, from: Point): Point => {
      const B = by.get(id); if (!B) return from;
      /* well above or below, and nearer in height than in reach of the left edge: land on its top or bottom */
      const reach = Math.max(0, B.l - from.x);
      if (from.y < B.t - h * 0.4 && B.t - from.y > reach) return { x: B.valueX, y: B.t };
      if (from.y > B.b + h * 0.4 && from.y - B.b > reach) return { x: B.valueX, y: B.b };
      return { x: B.l, y: Math.max(B.t + 8, Math.min(B.b - 8, from.y)) };
    };
    return { at: (id) => by.get(id), boxes, cell, h, entry };
  }
  /* the nodes, each a value cell and a link cell; returns their layout, which links() and nodePointer() read */
  function nodes(ctx: Ctx, o: NodesOpts): Nodes {
    const f = F(), cell = o.cell ?? 78, h = o.h ?? 58, N = layout(o.items, cell, h);
    const ink = f.PAL.ink, size = o.size ?? Math.min(28, h * 0.48);
    o.items.forEach((spec, k) => {
      const B = N.boxes[k], gone = spec.status === 'discarded', dashed = spec.status === 'unreached';
      const line = gone ? f.alpha(ink, 0.3) : (spec.color ?? ink), vc = spec.valueColor ?? ink;
      ctx.save(); ctx.globalAlpha *= spec.alpha ?? 1;
      ctx.fillStyle = f.PAL.panel; ctx.fillRect(B.l, B.t, B.r - B.l, h);
      if (!B.single && spec.valueColor && !gone) { ctx.fillStyle = f.alpha(vc, 0.14); ctx.fillRect(B.l, B.t, cell, h); }
      ctx.strokeStyle = line; ctx.lineWidth = 3; if (dashed) ctx.setLineDash([6, 6]);
      ctx.strokeRect(B.l, B.t, B.r - B.l, h);
      if (!B.single) { ctx.beginPath(); ctx.moveTo(B.l + cell, B.t); ctx.lineTo(B.l + cell, B.b); ctx.stroke(); }
      ctx.restore();
      ctx.save(); ctx.globalAlpha *= spec.alpha ?? 1;
      if (!B.single) f.text(ctx, String(spec.value), B.valueX, B.y, gone ? f.alpha(ink, 0.35) : vc, { size, weight: 600, align: 'center' });
      if (spec.name) {
        const side = spec.nameSide ?? 'below', nc = gone ? f.alpha(ink, 0.35) : (spec.nameColor ?? f.PAL.muted);
        if (side === 'left') f.text(ctx, spec.name, B.l - 14, B.y, nc, { size: 22, weight: 600, align: 'right' });
        else f.text(ctx, spec.name, (B.l + B.r) / 2, side === 'below' ? B.b + 24 : B.t - 22, nc, { size: 20, align: 'center' });
      }
      ctx.restore();
    });
    return N;
  }
  /* a quadratic curve's point and direction at t */
  const qAt = (a: Point, c: Point, b: Point, t: number): Point => ({ x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * c.x + t * t * b.x, y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * c.y + t * t * b.y });
  /* the links: an arrow from a node's link cell (a dot in it) to the node it names, curving by `bend`; to null,
     a short arrow into the terminator bar */
  function links(ctx: Ctx, N: Nodes, list: LinkSpec | readonly LinkSpec[], o: LinksOpts = {}): Drawn[] {
    const f = F(), ls = Array.isArray(list) ? (list as readonly LinkSpec[]) : [list as LinkSpec];
    return ls.map((s) => {
      const c = s.color ?? f.PAL.ink, w = s.w ?? 3;
      const fromBox = typeof s.from === 'string' ? N.at(s.from) : undefined;
      const a: Point = fromBox ? fromBox.link : (s.from as Point);
      let b: Point;
      if (s.to === null) b = { x: a.x + N.cell * 1.1, y: a.y };
      else if (typeof s.to === 'string') b = N.entry(s.to, a);
      else b = s.to;
      const bend = s.bend ?? 0, mid0 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      /* the control point straight above or below the chord's middle: the curve's middle sits `bend` off it */
      const ctl = { x: mid0.x, y: mid0.y + 2 * bend };
      ctx.save(); ctx.globalAlpha *= s.alpha ?? 1;
      if (fromBox) f.dot(ctx, a.x, a.y, c, true, 7);
      if (Math.abs(bend) < 0.5) {
        if (s.dash) { ctx.save(); ctx.setLineDash(s.dash as number[]); }
        f.arrow(ctx, a.x, a.y, b.x, b.y, c, w);
        if (s.dash) ctx.restore();
      } else {
        const tail = qAt(a, ctl, b, 0.9);
        ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = w; if (s.dash) ctx.setLineDash(s.dash as number[]);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.quadraticCurveTo(ctl.x, ctl.y, tail.x, tail.y); ctx.stroke(); ctx.restore();
        f.arrow(ctx, tail.x, tail.y, b.x, b.y, c, w);
      }
      if (s.to === null) {
        ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(b.x + 3, b.y - 16); ctx.lineTo(b.x + 3, b.y + 16); ctx.stroke(); ctx.restore();
        if (o.nullLabel) f.text(ctx, o.nullLabel, b.x + 14, b.y, f.PAL.muted, { size: 20, align: 'left' });
      }
      ctx.restore();
      const mid = Math.abs(bend) < 0.5 ? mid0 : qAt(a, ctl, b, 0.5);
      return { from: a, to: b, mid };
    });
  }
  /* pointer variables at nodes: an arrow down to the node (or up to it from below) and the name at its tail,
     in its colour; aimed at the value cell, or at the link cell (a pointer to a link field); pointers at one
     node stand side by side */
  function nodePointer(ctx: Ctx, N: Nodes, list: NodePointerSpec | readonly NodePointerSpec[], o: PointerOpts = {}): Placed[] {
    const f = F(), ps = Array.isArray(list) ? (list as readonly NodePointerSpec[]) : [list as NodePointerSpec];
    const up = (o.side ?? 'above') === 'above', gap = o.gap ?? 8, size = o.size ?? 24;
    const xs = ps.map((p) => { const B = N.at(p.at); return B ? (p.field === 'link' ? B.link.x : B.valueX) : NaN; });
    const lean = stackOf(ps.map((p, j) => ({ at: xs[j] / N.cell, name: p.name })));
    return ps.flatMap((p, j) => {
      const B = N.at(p.at); if (!B) return [];
      const x = xs[j] + lean[j] * N.cell * 1.6, c = p.color ?? f.PAL.ink;
      const edge = up ? B.t - gap : B.b + gap, len = 34, tail = up ? edge - len : edge + len;
      f.arrow(ctx, x, tail, xs[j] + lean[j] * N.cell * 0.4, edge, c, 4);
      const ly = up ? tail - 18 : tail + 18;
      f.text(ctx, p.name, x, ly, c, { size, weight: 600, align: 'center' });
      return [{ name: p.name, x, y: ly, lean: lean[j] }];
    });
  }

  return { strip, pointer, region, counts, stackOf, nodes, links, nodePointer, layout };
}
export type Ds = ReturnType<typeof makeDs>;
