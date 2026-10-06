/* Figure text is set as the page's own text over the canvas rather than painted
   into it, so the browser hints and smooths it as it does the prose. A draw
   records every string with where the canvas would have put it; once the draw
   is over the list is reconciled with the spans of a layer lying exactly over
   the canvas, reusing spans by order and writing only what changed. */

export type Px = number;                      /* CSS pixels in the canvas's own box */
export type Em = number;                      /* a length in the glyph's own font size */
export type Matrix = { readonly a: number; readonly b: number; readonly c: number; readonly d: number; readonly e: number; readonly f: number };
export type Align = 'left' | 'center' | 'right';
/* a piece of one string: a subscript or superscript run, plain text or a TeX run (`html` holds KaTeX's
   setting of the source in `s`), and the glow a changed number carries (0 for none) */
export type Piece = { readonly s: string; readonly sub: boolean; readonly sup?: boolean; readonly lit: number; readonly html?: string };
export type Glyph = {
  readonly pieces: readonly Piece[];
  readonly x: Px; readonly y: Px;             /* the anchor: the point the canvas's align and baseline refer to */
  readonly size: Px; readonly rot: number;
  readonly color: string; readonly alpha: number;
  readonly align: Align;
  readonly base: Em;                          /* how far the alphabetic baseline lies below the anchor */
  readonly weight: number; readonly italic: boolean;
  readonly family: string;
};
export type Box = { readonly l: Px; readonly t: Px; readonly w: Px; readonly h: Px };

export const FLOOR: Px = 11;
const SUB = 0.72, SUB_DROP = 0.22, SUP_DROP = -0.36, SUB_FLOOR: Px = 10;

/* ---------- the pure parts ---------- */
/* a point under the context's transform, in backing pixels, taken to CSS pixels by r */
export const mapPoint = (m: Matrix, x: number, y: number, r: number): readonly [Px, Px] => [(m.a * x + m.c * y + m.e) * r, (m.b * x + m.d * y + m.f) * r];
export const scaleOf = (m: Matrix): number => Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
export const angleOf = (m: Matrix): number => Math.atan2(m.b, m.a);
export const isSerif = (family: string): boolean => !/sans-serif\s*$/i.test(family.trim());
/* the serif faces are bundled at 400 and 700 only, and a synthesised 600 smears at label sizes */
export const shownWeight = (weight: number, family: string): number => (isSerif(family) && weight > 400 ? 400 : weight);
export const shownSize = (size: Px): Px => Math.max(FLOOR, size);
/* the sizes a string asked for at `size` is shown at, its main runs and its subscripts, in a unit
   k CSS pixels long: the canvas's own units when k is its pane's scale, and the size asked for
   where k is not known yet */
export function shownIn(size: number, k: number): readonly [number, number] {
  if (!(k > 0)) return [size, size * SUB];
  const px = shownSize(size * k);
  return [px / k, Math.max(SUB_FLOOR, px * SUB) / k];
}
/* where a subscript's baseline sits below the main one, in the main font's em: the canvas lowers
   the subscript's own anchor by SUB_DROP (a superscript's by SUP_DROP, which raises it), and the
   anchor lies `base` above each run's baseline */
export const subDrop = (base: Em, sup = false): Em => (sup ? SUP_DROP : SUB_DROP) - base * (1 - SUB);
const small = (p: Piece): boolean => p.sub || !!p.sup;

type Style = { readonly text: string; readonly shape: string; readonly transform: string; readonly font: string; readonly color: string; readonly opacity: string; readonly lit: string };
const round = (v: number): number => Math.round(v * 100) / 100;
const SHIFT: Record<Align, number> = { left: 0, center: -50, right: -100 };
/* top of a line box of height 1em lies half the box less half the face above the baseline */
export const topOf = (base: Em, ascent: Em, descent: Em): Em => base - (1 + ascent - descent) / 2;
const litOf = (a: number): string => (a > 0 ? `color-mix(in srgb, var(--hl-yellow, #FDE68A) ${round(a * 100)}%, transparent)` : '');
export function styleOf(g: Glyph, top: Em): Style {
  const turn = g.rot ? ` rotate(${round(g.rot)}rad)` : '';
  return {
    text: g.pieces.map((p) => p.s).join('\u0001'),
    shape: g.pieces.map((p) => (p.html !== undefined ? '$' : p.sup ? '^' : p.sub ? '_' : '.')).join(''),
    transform: `translate(${round(g.x)}px,${round(g.y)}px)${turn} translate(${SHIFT[g.align]}%,${round(top)}em)`,
    font: `${g.italic ? 'italic ' : ''}${g.weight} ${round(shownSize(g.size))}px/1 var(--figure)`,
    color: g.color, opacity: g.alpha >= 1 ? '' : String(round(g.alpha)),
    lit: g.pieces.map((p) => litOf(p.lit)).join('|'),
  };
}
export type Edges = { readonly l: Px; readonly t: Px; readonly r: Px; readonly b: Px };
/* how far a span must move to lie inside a w by h layer; one wider than the layer keeps its start inside */
const into = (lo: Px, hi: Px, span: Px): Px => (lo < 0 ? -lo : hi > span ? span - hi : 0);
export const inward = (e: Edges, w: Px, h: Px): readonly [Px, Px] => [into(e.l, e.r, w), into(e.t, e.b, h)];
export type Write ={ readonly i: number; readonly changed: readonly (keyof Style)[]; readonly next: Style };
export type Plan = { readonly writes: readonly Write[]; readonly drop: number };
/* what the layer must do to go from the spans it shows to the ones just drawn: spans are
   reused by order, each writes only the properties that differ, and extras are dropped */
export function plan(prev: readonly Style[], next: readonly Style[]): Plan {
  const keys = (s: Style): (keyof Style)[] => Object.keys(s) as (keyof Style)[];
  const writes = next.flatMap((s, i): Write[] => {
    const was = prev[i];
    const changed = was ? keys(s).filter((k) => s[k] !== was[k]) : keys(s);
    return changed.length ? [{ i, changed, next: s }] : [];
  });
  return { writes, drop: Math.max(0, prev.length - next.length) };
}

/* ---------- the face's metrics, per font and baseline ---------- */
type Face = { readonly ascent: Em; readonly descent: Em };
const faces = new Map<string, Face>();
const baseCache = new Map<string, Em>();
let probeCtx: CanvasRenderingContext2D | null = null;
const probe = (): CanvasRenderingContext2D | null => (probeCtx ??= typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d'));
function measure(font: string, baseline: CanvasTextBaseline): number {
  const p = probe(); if (!p) return 0;
  p.font = font; p.textBaseline = baseline;
  return p.measureText('Hx').fontBoundingBoxAscent ?? 0;
}
const faceOf = (font: string): Face => {
  const got = faces.get(font); if (got) return got;
  const p = probe();
  if (!p) return { ascent: 0.8, descent: 0.2 };
  p.font = font; p.textBaseline = 'alphabetic';
  const m = p.measureText('Hx'), f = { ascent: (m.fontBoundingBoxAscent ?? 80) / 100, descent: (m.fontBoundingBoxDescent ?? 20) / 100 };
  faces.set(font, f); return f;
};
/* the metrics are read at 100 px so the ratios carry to any size; a face still loading is read
   again on the redraw its load asks for, since the cache is cleared then */
const at100 = (weight: number, italic: boolean, family: string): string => `${italic ? 'italic ' : ''}${weight} 100px ${family}`;
export function baseOf(weight: number, italic: boolean, family: string, baseline: CanvasTextBaseline): Em {
  const font = at100(weight, italic, family), key = font + '|' + baseline;
  const got = baseCache.get(key); if (got !== undefined) return got;
  const v = (faceOf(font).ascent * 100 - measure(font, baseline)) / 100;
  baseCache.set(key, v); return v;
}
export const forgetFaces = (): void => { faces.clear(); baseCache.clear(); };
const topFor = (g: Glyph): Em => { const f = faceOf(at100(g.weight, g.italic, g.family)); return topOf(g.base, f.ascent, f.descent); };

/* ---------- the layer ---------- */
type Layer = { el: HTMLDivElement; shown: Style[]; box: string };
const layers = new Map<HTMLCanvasElement, Layer>();
const drawn = new WeakMap<HTMLCanvasElement, readonly Glyph[]>();
function layerOf(c: HTMLCanvasElement): Layer {
  const got = layers.get(c);
  if (got) { if (c.nextSibling !== got.el) c.after(got.el); return got; }
  const el = document.createElement('div'); el.className = 'fig-text'; el.setAttribute('aria-hidden', 'true');
  c.after(el);
  const l: Layer = { el, shown: [], box: '' }; layers.set(c, l); return l;
}
const texSet = new WeakMap<HTMLElement, string>();
function fill(span: HTMLElement, g: Glyph, rebuild: boolean): void {
  if (rebuild) span.replaceChildren(...g.pieces.map((p) => {
    const e = document.createElement('span');
    if (small(p)) e.className = 'sub';
    if (p.html !== undefined) e.className = 'tex';
    return e;
  }));
  const kids = span.children as HTMLCollectionOf<HTMLElement>;
  g.pieces.forEach((p, i) => {
    const e = kids[i]; if (!e) return;
    if (p.html !== undefined) { if (texSet.get(e) !== p.html) { e.innerHTML = p.html; texSet.set(e, p.html); } }
    else if (e.textContent !== p.s) e.textContent = p.s;
    const bg = litOf(p.lit); if (e.style.backgroundColor !== bg) e.style.backgroundColor = bg;
    if (small(p)) { const top = `${round(subDrop(g.base, p.sup) / SUB)}em`; if (e.style.top !== top) e.style.top = top; }
  });
}
/* Shows what a canvas's last draw recorded. `box` is the canvas's place under its offset parent.
   What it hands back measures the spans it placed, and what that hands back moves them inside:
   every canvas of a frame is written, then measured, then moved, so the page is laid out once
   for all of them rather than once a canvas. */
export type Measure = () => () => void;
export function commit(c: HTMLCanvasElement, box: Box, glyphs: readonly Glyph[]): Measure {
  drawn.set(c, glyphs);
  const l = layerOf(c);
  const key = `${box.l},${box.t},${box.w},${box.h}`;
  if (key !== l.box) { l.box = key; Object.assign(l.el.style, { left: `${box.l}px`, top: `${box.t}px`, width: `${box.w}px`, height: `${box.h}px` }); }
  const next = glyphs.map((g) => styleOf(g, topFor(g)));
  const p = plan(l.shown, next);
  const spans = l.el.children as HTMLCollectionOf<HTMLElement>;
  for (let k = 0; k < p.drop; k++) l.el.lastElementChild?.remove();
  p.writes.forEach(({ i, changed, next: s }) => {
    const span = spans[i] ?? l.el.appendChild(document.createElement('span'));
    if (changed.includes('transform')) span.style.transform = s.transform;
    if (changed.includes('font')) span.style.font = s.font;
    if (changed.includes('color')) span.style.color = s.color;
    if (changed.includes('opacity')) span.style.opacity = s.opacity;
    if (changed.some((k) => k === 'text' || k === 'shape' || k === 'lit' || k === 'transform')) fill(span, glyphs[i], changed.includes('shape') || !span.childElementCount);
  });
  l.shown = next;
  sync(c, l);
  return keepInside(l, box, p.writes.map((w) => spans[w.i]));
}
/* a span the draw placed past the layer's edge is moved back in by the overflow, never clipped */
const NOTHING = (): void => {};
function keepInside(l: Layer, box: Box, moved: readonly HTMLElement[]): Measure {
  if (!moved.length || l.el.hidden) return () => NOTHING;
  moved.forEach((s) => { if (s.style.translate) s.style.translate = ''; });
  return () => {
    const at = l.el.getBoundingClientRect(); if (!at.width) return NOTHING;
    const k = box.w / at.width;
    const shifts = moved.map((s) => {
      const r = s.getBoundingClientRect();
      return [s, inward({ l: (r.left - at.left) * k, t: (r.top - at.top) * k, r: (r.right - at.left) * k, b: (r.bottom - at.top) * k }, box.w, box.h)] as const;
    });
    return () => shifts.forEach(([s, [dx, dy]]) => { if (dx || dy) s.style.translate = `${round(dx)}px ${round(dy)}px`; });
  };
}
/* the layer hides, stacks and leaves with its canvas */
function sync(c: HTMLCanvasElement, l: Layer): void {
  const hide = c.style.display === 'none' || c.style.visibility === 'hidden';
  if (l.el.hidden !== hide) l.el.hidden = hide;
  if (l.el.style.zIndex !== c.style.zIndex) l.el.style.zIndex = c.style.zIndex;
}
export function syncLayers(): void {
  layers.forEach((l, c) => { if (c.isConnected) { sync(c, l); return; } l.el.remove(); layers.delete(c); });
}

/* ---------- TeX runs ----------
   A run's width, which a headline wraps by, is read once per setting from a hidden span and kept. */
const texEms = new Map<string, Em>();
let texProbe: HTMLElement | null = null;
export function texEm(html: string): Em {
  const got = texEms.get(html); if (got !== undefined) return got;
  if (typeof document === 'undefined') return 0;
  if (!texProbe?.isConnected) {
    const host = document.createElement('div'); host.className = 'fig-text'; host.setAttribute('aria-hidden', 'true');
    Object.assign(host.style, { visibility: 'hidden', left: '-9999px', top: '0' });
    texProbe = host.appendChild(document.createElement('span')); texProbe.style.font = '400 100px/1 var(--figure)';
    document.body.appendChild(host);
  }
  texProbe.innerHTML = `<span class="tex">${html}</span>`;
  const w = (texProbe.firstElementChild?.getBoundingClientRect().width ?? 0) / 100;
  if (texEms.size > 2000) texEms.clear();
  texEms.set(html, w); return w;
}
/* a face that lands changes every width read before it */
export const forgetTex = (): void => texEms.clear();
const plainTex = (s: string): string => s.replace(/\\k|[{}\\]/g, '');

/* ---------- a picture of the canvas with its text ---------- */
/* Paints what the canvas's layer shows into another context, the canvas's CSS box scaled by k:
   a snapshot of a figure carries its labels. */
export function paintText(c: HTMLCanvasElement, ctx: CanvasRenderingContext2D, k: number): void {
  (drawn.get(c) ?? []).forEach((g) => {
    const [size, subSize] = shownIn(g.size, 1), font = (sub: boolean): string => `${g.italic ? 'italic ' : ''}${g.weight} ${sub ? subSize : size}px ${g.family}`;
    const shown = g.pieces.map((p) => (p.html !== undefined ? plainTex(p.s) : p.s));
    const widths = g.pieces.map((p, i) => { ctx.font = font(small(p)); return ctx.measureText(shown[i]).width; });
    const total = widths.reduce((a, b) => a + b, 0);
    ctx.save();
    ctx.translate(g.x * k, g.y * k); ctx.rotate(g.rot); ctx.scale(k, k);
    ctx.globalAlpha = g.alpha; ctx.fillStyle = g.color; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    let x = (SHIFT[g.align] / 100) * total;
    const y = g.base * size;
    g.pieces.forEach((p, i) => { ctx.font = font(small(p)); ctx.fillText(shown[i], x, small(p) ? y + subDrop(g.base, p.sup) * size : y); x += widths[i]; });
    ctx.restore();
  });
}
