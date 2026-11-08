/* F.ds: the data-structure primitives a debugger figure draws (docs/design-code-and-debugger.md §2.5). The
   first slice: an array strip, pointers into it, a shaded or bracketed region, and a count row. All in the
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

  return { strip, pointer, region, counts, stackOf };
}
export type Ds = ReturnType<typeof makeDs>;
