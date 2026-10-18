/* The figure library: math rendering, palette, the animation loop with a
   transport per figure, and the drawing primitives in a fixed 1400-unit
   logical space. Section figure modules receive it as `F` and it is also
   exposed as window.FIG for classic scripts. */
import { elementColor, isElementSymbol, type ElementSymbol } from './elements';
import { DEFAULT_REFERENTS, TARGET_DEFAULT, dealGroup, huesOfGroups, pickWrapped, referentHues, unnamedOrder } from '../colours/referents';
import { DEFAULT_VISION } from '../colours/palettes';
import { type GroupReferents, type PageReferents, groupsOf } from '../colours/model';
import type { ColourShown } from '../colours/switches';
import type { BookManifest, RefGroupEntry, ReferentEntry } from '../content/schema';
import { bookPagesOf } from '../content/roles';
import { morph as texMorph, morphAt as texMorphAt, setFallback as setMorphFallback, type MorphOpts } from './texmorph';
import { lazy, importing } from './lazy';
import { step as glowStep, glowOf, byHand, inputSeq, skeletonOf, tokensOf, type Trace } from './glow';
import { FLOOR as TEXT_FLOOR, commit as commitText, syncLayers, forgetFaces, forgetTex, texEm, baseOf as baselineOf, mapPoint, scaleOf, angleOf, shownWeight, shownIn, type Glyph, type Piece, type Box as TextBox } from './textlayer';
import { handParts, GRIP, type HandBody, type HandPart, type Thumb } from './hand';
import { enrol } from './params';
import { layoutPlan, rangeAt as rangeFrame, type SliderRange, type RangeFrame } from './regroup';
import { trace, limit, slope, area, cells, clipLine, judge, ticks, type Rule, type Target } from './plot';
import * as REV from './solid';
import { widen, sides } from './deriv';
import * as SLOPE from './slope';
import * as SPACE from './space';
import * as POLAR from './polar';
import * as Q from './quantum';
import { ease, lerp, partial, timeline, beatAt, progressAt, valueAt, MK_MACRO, solve, snapTo, nextSpecial, trackAt, keyframes, blend, partAlpha, partOff, stagger, resample, lerpPts, blendFn, parseRgba, mixRgba, BEAT_MS, REST_MS, type Rgba, type Blendable, type Ease, type BeatTime, type Scripted } from './motion';

export type Ctx = CanvasRenderingContext2D;
export type Color = string;
export type Logical = number;                 /* a coordinate in the 1400-wide canvas space */
export type Macros = Readonly<Record<string, string>>;
export type SymbolMap = Readonly<Record<string, string>>;
type Box = { readonly l: Logical; readonly r: Logical; readonly t: Logical; readonly b: Logical };
type Range = readonly [number, number];
type Scale = (v: number) => Logical;
type Cycle = { tau: number; wait: number; period: () => number; step: (dt: number, rate: () => number) => void; now: () => number; reset: () => void };
type Sim = { fig: HTMLElement; update: (dt: number) => void; draw: () => void; cycles: Cycle[]; playing: boolean; speed: number; sync?: () => void; scrub?: HTMLInputElement; dirty: boolean; arrive: boolean; arriveT0?: number; arriving?: boolean };
type Label = { s: string; x: Logical; y: Logical; hx: Logical; hy: Logical; color: Color; sz: number; align: CanvasTextAlign };
export type Seg = { readonly x1: Logical; readonly y1: Logical; readonly x2: Logical; readonly y2: Logical };
export type BesideOpts = { offset?: number; gap?: Logical };   /* where along the line the label sits, 0 at the tail and 1 at the head, and how far out it starts */
export type Labeller = {
  block: (l: Logical, t: Logical, r: Logical, b: Logical) => void;
  add: (s: string, hx: Logical, hy: Logical, ux: number, uy: number, color: Color, size?: number, start?: number) => void;
  beside: (seg: Seg, side: 'left' | 'right' | number, s: string, color?: Color, size?: number, o?: BesideOpts) => void;
  place: (box: LabelBox, s?: string) => LabelBox;
  halo: (seg: Seg, w?: Logical) => void;
  flush: () => string[];
};
export type LabelBox = { readonly l: Logical; readonly r: Logical; readonly t: Logical; readonly b: Logical };
export type Vec3 = readonly [number, number, number];   /* a point or direction in the scene: y up, z toward the viewer */
export type Pt = readonly [Logical, Logical];                 /* a projected point on the canvas */
type ViewOpts = { yaw: number; pitch: number; dist: number; cx: Logical; cy: Logical };
export type View = { P: (p: Vec3) => Pt; shade: (n: Vec3) => number };
type TextOpts = { size?: number; weight?: number; italic?: boolean; align?: CanvasTextAlign; base?: CanvasTextBaseline; bg?: Color; tex?: boolean };
type CtlOpts = { label: string; cls: string; key?: string; min: number; max: number; step: number; value: number; unit: string; dec?: number; aria?: string; detents?: readonly Detent[]; snap?: boolean; specials?: readonly Special[]; onInput?: () => void; disabled?: boolean };
type AxesOpts = { xl?: string; yl?: string; xc?: Color; yc?: Color; nx?: number; ny?: number; fx?: (v: number) => string; fy?: (v: number) => string; nice?: boolean };

const $ = <T extends Element = Element>(s: string, r: ParentNode = document): T | null => r.querySelector<T>(s);
const $$ = <T extends Element = Element>(s: string, r: ParentNode = document): T[] => Array.from(r.querySelectorAll<T>(s));
const REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- math ---------- */
/* What a book hands the drawing layer: its macros, its symbol table and its types. Two books may
   spell the same macro or the same type differently, so every call that sets TeX runs under one
   book's table, the one `cur` holds while it runs, and the boot book's otherwise. */
export type FigBookConfig = { readonly macros: Macros; readonly symbols: SymbolMap; readonly colorKeys: readonly string[]; readonly pages?: Readonly<Record<string, FigPage>> };
/* What a page declares about its colours: its referents in table order and by what they are seen with, and the macros it sets otherwise than the book. */
export type FigPage = { readonly referents: readonly ReferentEntry[]; readonly refGroups?: readonly RefGroupEntry[]; readonly macros?: Macros };
export type FigBook = FigBookConfig & { readonly id: string };
const NO_BOOK: FigBookConfig = { macros: {}, symbols: {}, colorKeys: [] };
const figBooks = new Map<string, FigBookConfig>();
let bootBook = '';
let cur: FigBookConfig | null = null;
const configOf = (book: string): FigBookConfig => figBooks.get(book) ?? NO_BOOK;
const active = (): FigBookConfig => cur ?? configOf(bootBook);
const TRUSTED: ReadonlySet<string> = new Set(['\\htmlClass', '\\htmlData']);   /* the book's colour macros: a type class and a symbol key */
/* A book's table with the motion macro beside it, made once per table rather than for every formula set. */
const withMk = new WeakMap<Macros, Macros>();
const macrosOf = (m: Macros): Macros => { const had = withMk.get(m); if (had) return had; const all = { '\\mk': MK_MACRO, ...m } as Macros; withMk.set(m, all); return all; };
/* The macros TeX is set with at an element: its own book's, under what the page it stands in sets otherwise.
   A figure redraws outside the call that made it, so the element names its book, not `active()`. */
const pageMacros = new WeakMap<FigPage, Macros>();
const macrosAt = (el?: Element): Macros => {
  const own = el?.closest<HTMLElement>('[data-book]')?.dataset.book;
  const book = (own && figBooks.get(own)) || active();
  const page = el ? pageOf(placeOf(el)) : undefined;
  if (!page?.macros) return book.macros;
  const had = pageMacros.get(page); if (had) return had;
  const all = { ...book.macros, ...page.macros }; pageMacros.set(page, all);
  return all;
};
const KOPT = (el?: Element) => ({ macros: macrosOf(macrosAt(el)), trust: (c: { command: string }) => TRUSTED.has(c.command), strict: false as const, throwOnError: false });

/* KaTeX is the heaviest thing the shell can ask for, and a page of the book
   arrives with its maths already set at build time, so the library is fetched
   only when something on the client actually has TeX to set: an exercise
   prompt, a hover card, a note. The two calls below keep the signature the
   figure scripts are written against — they are handed `F.tex` and
   `F.renderMath` and neither waits on them — so where the library has not
   landed yet the work is queued and done once, in order, when it does. */
type Katex = typeof import('katex').default;
type AutoRender = typeof import('katex/contrib/auto-render').default;
/* Apart, because auto-render imports KaTeX's chunk: where that failed, auto-render stays failed
   until a reload, but KaTeX itself comes back under a fresh address and `tex` with it. */
const katexChunk = importing(() => import('katex')), autoChunk = importing(() => import('katex/contrib/auto-render'));
const katexLib = lazy((): Promise<Katex> => katexChunk().then((m) => m.default)), withKatex = katexLib.use;
const withAuto = lazy((): Promise<AutoRender> => autoChunk().then((m) => m.default)).use;

export type TexOpts = { readonly values?: boolean };
function tex(el: HTMLElement, s: string, display = false, o: TexOpts = {}): void {
  const opts = KOPT(el);
  withKatex((katex) => { katex.render(s, el, { ...opts, displayMode: display }); fitReadout(el); if (o.values !== false) texGlow(el); });
}
/* A readout wider than its box where it cannot break (a table of rows, one long product) is set
   smaller until it fits, though never below the figure text's floor. */
function fitReadout(el: HTMLElement): void {
  const k = el.querySelector<HTMLElement>(':scope > .katex');
  if (!k || !el.closest('.readout')) return;
  const cs = getComputedStyle(el), room = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const need = Math.max(k.getBoundingClientRect().width, room + el.scrollWidth - el.clientWidth);   /* a piece may stand out past the run's own box */
  if (room > 0 && need > room + 0.5) k.style.fontSize = Math.max(TEXT_FLOOR, parseFloat(getComputedStyle(k).fontSize) * room / need) + 'px';
}

/* ---------- the glow under a changed number in a formula ----------
   A figure's KaTeX readout is known again by the skeleton of its rendered text; a number in it
   the reader's hand changed gets the pale yellow box behind it (glow.ts), painted on a layer
   behind the formula that animates its own fade. Text on another row of a stack (a superscript,
   a numerator) never joins the number beside it. */
type TexHost = { traces: Map<string, Trace>; raf: number };
const texHosts = new WeakMap<HTMLElement, TexHost>();
type Spot = { node: Text; at: number };
function texText(root: Element): { s: string; spots: Spot[] } {
  const rowOf = (n: Node): Element | null => { let e = n.parentElement; while (e && e !== root && !e.parentElement?.classList.contains('vlist')) e = e.parentElement; return e; };
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let s = '', row: Element | null | undefined; const spots: Spot[] = [];
  for (let n = walk.nextNode() as Text | null; n; n = walk.nextNode() as Text | null) {
    const r = rowOf(n);
    if (row !== undefined && r !== row) { s += '\u0001'; spots.push({ node: n, at: -1 }); }
    row = r;
    for (let i = 0; i < n.data.length; i += 1) spots.push({ node: n, at: i });
    s += n.data;
  }
  return { s, spots };
}
function texGlow(el: HTMLElement): void {
  const fig = el.closest<HTMLElement>('figure.sim'), root = el.querySelector('.katex-html');
  if (!fig || !root) return;
  const h = texHosts.get(el) ?? (texHosts.set(el, { traces: new Map(), raf: 0 }), texHosts.get(el)!);
  cancelAnimationFrame(h.raf); h.raf = 0;
  const { s, spots } = texText(root), toks = tokensOf(s).map((t) => (/^[-−]/.test(t.s) ? { s: t.s, i: t.i + 1, j: t.j } : t));
  const now = performance.now(), sk = skeletonOf(s);
  const tr = glowStep(h.traces.get(sk), toks.map((t) => t.s), inputSeq(), now, byHand(now, fig));
  h.traces.set(sk, tr);
  if (!toks.some((_, i) => glowOf(tr.lit[i], now, REDUCED) > 0)) return;
  if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
  el.style.isolation = 'isolate';
  const er = el.getBoundingClientRect(), ox = er.left + el.clientLeft - el.scrollLeft, oy = er.top + el.clientTop - el.scrollTop;
  const layer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  layer.setAttribute('aria-hidden', 'true'); layer.classList.add('tm-glow');
  /* the padding box, or the scrolled extent where the text overflows it: never the border box, whose extra pixel would itself overflow and scroll */
  layer.style.width = el.scrollWidth > el.clientWidth ? el.scrollWidth + 'px' : '100%'; layer.style.height = el.scrollHeight > el.clientHeight ? el.scrollHeight + 'px' : '100%';
  const bars = toks.flatMap((t, i) => {
    if (tr.lit[i] === -Infinity) return [];
    const a = spots[t.i], b = spots[t.j - 1];
    const range = document.createRange(); range.setStart(a.node, a.at); range.setEnd(b.node, b.at + 1);
    const r = range.getBoundingClientRect();
    if (!(r.width > 0)) return [];
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    Object.entries({ x: r.left - ox - 1.5, y: r.top - oy + 1, width: r.width + 3, height: Math.max(0, r.height - 2), rx: 2 }).forEach(([k, v]) => rect.setAttribute(k, String(v)));
    layer.appendChild(rect);
    return [{ rect, t: tr.lit[i] }];
  });
  el.insertBefore(layer, el.firstChild);
  const paint = (t: number): void => {
    h.raf = 0;
    const alive = bars.map(({ rect, t: lt }) => { const a = glowOf(lt, t, REDUCED); rect.setAttribute('opacity', a.toFixed(3)); return a > 0; }).some(Boolean);
    if (alive && layer.isConnected) h.raf = requestAnimationFrame(paint); else layer.remove();
  };
  paint(performance.now());
}
/* KaTeX's HTML for s under the macros at `at`, set once per string and kept. Text drawn on a canvas
   cannot wait for the library, so this is null until it has landed, and every figure redraws when it does. */
const typesetSeen = new WeakMap<Macros, Map<string, string>>();
function typeset(s: string, at?: Element): string | null {
  const k = katexLib.now();
  if (!k) { withKatex(() => sims.forEach((d) => { d.dirty = true; })); return null; }
  const opts = KOPT(at), seen = typesetSeen.get(opts.macros) ?? new Map<string, string>();
  typesetSeen.set(opts.macros, seen);
  const got = seen.get(s); if (got !== undefined) return got;
  const html = k.renderToString(s, opts); seen.set(s, html); return html;
}
function renderMath(root: HTMLElement): void {
  if (!root.textContent?.includes('$')) return;
  const opts = KOPT(root);
  withAuto((auto) => auto(root, { ...opts, delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }] }));
}

/* ---------- palette & colour switches ---------- */
/* What each of the reader's colour families shows (RULES item 7): facts and conventions, referents, concepts. */
let SHOWN: ColourShown = { facts: true, refs: true, concepts: true };
const PAL: Record<string, Color> = {};
const NEUTRAL = new Set(['ink', 'muted', 'rule', 'soft', 'soft2', 'panel', 'bg', 'bad']);
const cssVar = (n: string, el: Element = document.documentElement): string => getComputedStyle(el).getPropertyValue(n).trim();
/* The element palette is not a type and takes nothing from the scheme, so it is
   read beside the palette rather than out of it: the only thing it needs from
   the page is which of the two themes is showing, which the shell settles on
   the root element and which `readPal` reads again on every theme change. */
let darkTheme = false;
const readTheme = (): boolean => (getComputedStyle(document.documentElement).colorScheme || '').includes('dark');
const elColor = (s: ElementSymbol | string): Color => elementColor(s, darkTheme);
/* The page's neutral inks, each book's scheme, and the hues a figure's own chapter and section bind.
   A book's scheme lives on its own attribute, so it is read off a hidden element that carries it. */
let neutral: Record<string, Color> = {};
const bookPal = new Map<string, Record<string, Color>>();
const scopePal = new Map<string, Record<string, Color>>();
const makeProbe = (book: string): HTMLElement => {
  const d = document.createElement('div'); d.hidden = true; d.dataset.book = book; d.dataset.figProbe = book;
  return document.body.appendChild(d);
};
const probe = (book: string): HTMLElement => document.body.querySelector<HTMLElement>(`[data-fig-probe="${book}"]`) ?? makeProbe(book);
const varsAt = (book: string, el: Element): Record<string, Color> =>
  Object.fromEntries(configOf(book).colorKeys.map((k) => [k, cssVar('--c-' + k, el)]).filter(([, v]) => v));
const baseOf = (book: string): Record<string, Color> => {
  const got = bookPal.get(book) ?? varsAt(book, probe(book));
  bookPal.set(book, got);
  return got;
};
function readPal(): void {
  darkTheme = readTheme();
  neutral = { ink: cssVar('--ink'), muted: cssVar('--muted'), rule: cssVar('--rule'), soft: cssVar('--soft'), soft2: cssVar('--soft2'), panel: cssVar('--panel'), bg: cssVar('--bg'), bad: cssVar('--bad') };
  bookPal.clear(); scopePal.clear(); hued.clear(); unnamed.clear(); bound.clear(); Object.assign(PAL, neutral, baseOf(bootBook));
}
/* A figure draws with the palette of its own book and of the article it sits in, and a section may
   colour a type differently from its chapter, so the scope is the nearest element that names either —
   a section's root, which names both. */
type Place = { readonly book: string; readonly scope: HTMLElement | null };
const placeOf = (el: Element): Place => {
  const scope = el.closest<HTMLElement>('[data-sec], [data-chapter]');
  return { book: el.closest<HTMLElement>('[data-book]')?.dataset.book ?? bootBook, scope: scope === document.documentElement ? null : scope };
};
const pageOf = ({ book, scope }: Place): FigPage | undefined => configOf(book).pages?.[scope?.dataset.sec ?? ''];
const palAt = ({ book, scope }: Place): Record<string, Color> => {
  if (!scope) return { ...neutral, ...baseOf(book) };
  const key = `${book}|${scope.dataset.chapter ?? ''}|${scope.dataset.sec ?? ''}`;
  const over = scopePal.get(key) ?? varsAt(book, scope);
  scopePal.set(key, over);
  return { ...neutral, ...baseOf(book), ...over };
};
/* Where the figure being drawn sits, which `F.ref` reads its section's referents from, and the figure's own id
   in its section, which `F.cat` finds its referent group by. */
let drawing: Place = { book: '', scope: null };
let drawingFigure = '';
const localFigureId = (fig: Element, at: Place): string => {
  const id = fig.closest('figure[id]')?.id ?? '';
  const sec = at.scope?.dataset.sec;
  return sec && id.startsWith(`${sec}-`) ? id.slice(sec.length + 1) : id;
};
function usePal(fig: Element): void {
  drawing = placeOf(fig);
  drawingFigure = localFigureId(fig, drawing);
  Object.assign(PAL, palAt(drawing));
}
/* The type hues drawn so far: every hue `C` has handed out since the palette was
   last read. `F.cat` skips the referent hues too close to these, so a figure
   never draws a referent in a hue it has given a type. Concepts off draws
   no type hue, since every type is then ink. */
const bound = new Set<Color>();
function C(k: string): Color {
  if (!SHOWN.concepts && !NEUTRAL.has(k)) return PAL.ink;
  const c = PAL[k];
  if (!NEUTRAL.has(k) && c) bound.add(c);
  return c;
}
/* A referent is one thing of one example that the text and a figure both point at. Referents seen together
   take their colours together from the reader's referent palette, dealt by the colour store
   (colours/referents.ts), so the text and every figure agree. A book the store does not hold deals the
   default palette in order. Worked out once per section until the palette is read again. */
export type ReferentSource = (book: string, page: string) => PageReferents | null;
let referentSource: ReferentSource = () => null;
const hued = new Map<string, PageReferents>();
export const setReferentSource = (f: ReferentSource): void => { referentSource = f; hued.clear(); };
const dealtByDefault = (page: FigPage | undefined): PageReferents => {
  const palette = referentHues(DEFAULT_REFERENTS, DEFAULT_VISION);
  const deal = { palette, mode: 'order' as const, vision: DEFAULT_VISION, target: TARGET_DEFAULT };
  const groups = groupsOf(page ?? {}).map((g): GroupReferents => ({ ...dealGroup({ ids: g.referents, shown: [] }, deal), figures: g.figures }));
  return { hues: huesOfGroups(groups), groups, palette, vision: DEFAULT_VISION };
};
const refsAt = (at: Place): PageReferents => {
  const sec = at.scope?.dataset.sec ?? '';
  const key = `${at.book}|${sec}`;
  const got = hued.get(key) ?? referentSource(at.book, sec) ?? dealtByDefault(pageOf(at));
  hued.set(key, got);
  return got;
};
const referentOf = (at: Place, id: string): ReferentEntry | undefined => pageOf(at)?.referents.find((r) => r.id === id);
const refColor = (at: Place, id: string, pal: Readonly<Record<string, Color>>): Color => {
  const h = refsAt(at).hues.get(id);
  if (!SHOWN.refs || !h) return pal.ink;
  return darkTheme ? h.dark : h.light;
};
/* The referent palette by index, for things a figure tells apart that no referents row names. It follows
   the Referents switch as `F.ref` does, skips the colours the referents of the figure's group wear, and orders
   the rest farthest first from the type hues the figure has drawn and those referents. */
const unnamed = new Map<string, readonly Color[]>();
const unnamedAt = (i: number): Color => {
  const refs = refsAt(drawing);
  const group = refs.groups.find((g) => g.figures.includes(drawingFigure));
  const drawn = [...bound];
  const key = `${drawing.book}|${drawing.scope?.dataset.sec ?? ''}|${drawingFigure}|${darkTheme}|${drawn.join()}`;
  const order = unnamed.get(key) ?? unnamedOrder(refs.palette, group?.hues ?? [], group?.ids.length ?? 0, drawn, darkTheme, refs.vision);
  unnamed.set(key, order);
  return pickWrapped(order, i);
};
const cat = (i: number): Color => (SHOWN.refs ? unnamedAt(i) : PAL.ink);
const ref = (id: string): Color => refColor(drawing, id, PAL);
/* The text's <span data-ref> under a root, a split symbol's subscript among them, coloured here again on
   every repaint. A span that names several referents ("the two skaters") wears their colours in bands
   stacked top to bottom, on every line it runs over. With Referents off a span keeps no colour of its own, so a split subscript wears its
   symbol's. */
const refIds = (s: HTMLElement): readonly string[] => (s.dataset.ref ?? '').split(/\s+/).filter(Boolean);
export const bands = (cs: readonly Color[]): string =>
  `linear-gradient(180deg, ${cs.map((c, i) => `${c} ${(i * 100) / cs.length}% ${((i + 1) * 100) / cs.length}%`).join(', ')})`;
function paintRefs(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-ref]').forEach((s) => {
    const at = placeOf(s); const rs = refIds(s).flatMap((id) => referentOf(at, id) ?? []);
    ['color', 'background-image', '-webkit-background-clip', 'background-clip', '-webkit-text-fill-color', '-webkit-box-decoration-break', 'box-decoration-break'].forEach((k) => s.style.removeProperty(k));
    if (!SHOWN.refs) return;
    if (rs.length > 1) {
      const pal = palAt(at);
      s.style.backgroundImage = bands(rs.map((r) => refColor(at, r.id, pal)));
      s.style.setProperty('-webkit-background-clip', 'text'); s.style.backgroundClip = 'text'; s.style.setProperty('-webkit-text-fill-color', 'transparent');
      s.style.setProperty('-webkit-box-decoration-break', 'clone'); s.style.setProperty('box-decoration-break', 'clone');
      return;
    }
    const r = rs[0];
    if (r) s.style.color = refColor(at, r.id, palAt(at));
  });
}
function alpha(hex: Color, a: number): Color {
  if (!hex || hex[0] !== '#') return hex;   /* a colour the palette has not set, or one already given as rgb */
  let h = hex.replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
/* A redraw asked for across the book — a theme change, a colour, a resize, the
   layout settling after a tab opened or closed — reads the palette again and
   marks every figure rather than drawing it. The one animation loop below then
   draws the figures that are on screen, together in the next frame, and leaves
   the rest until they scroll into view. Drawing a figure measures its canvas
   back out of the page, so drawing every figure of every loaded section in a
   row costs a forced layout apiece: a shell with five sections open spent a
   third of a second of that on every tab. */
function redrawAll(): void { readFont(); readPal(); paintRefs(); sims.forEach((d) => { d.dirty = true; }); }

/* ---------- DOM helpers ---------- */
function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string | null, html?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e;
}
/* `F.el` is one door onto two things that never collide: an element's symbol is
   capitalised and named by the element map, an HTML tag is neither, so a figure
   asking for `F.el('O')` gets oxygen's red and the library asking for
   `F.el('div')` gets a div. */
function elOf(s: ElementSymbol): Color;
function elOf<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string | null, html?: string): HTMLElementTagNameMap[K];
function elOf(s: string, cls?: string | null, html?: string): Color | HTMLElement {
  if (isElementSymbol(s) || /^[A-Z]/.test(s)) return SHOWN.facts ? elColor(s) : PAL.ink;
  return el(s as keyof HTMLElementTagNameMap, cls, html);
}

/* A colour that is the physical fact (a wavelength, a flame, a material's own colour), drawn through here so
   the Facts and conventions switch reaches it. */
const fact = (c: Color): Color => (SHOWN.facts ? c : PAL.ink);

/* a negative is written with a true minus (U+2212), and one that rounds to zero without a sign */
const fmt = (n: number, d: number): string => { const s = n.toFixed(d); return /^-[0.]*$/.test(s) ? s.slice(1) : s.replace('-', '\u2212'); };

/* ---------- figure scaffolding ---------- */
const LW: Logical = 1400;
function makeCanvas(parent: HTMLElement, H: Logical): HTMLCanvasElement { const c = document.createElement('canvas'); c.dataset.h = String(H); c.style.aspectRatio = `${LW} / ${H}`; parent.appendChild(c); return c; }
/* A canvas draws at the device's pixels times the pinch zoom, so text stays crisp at
   any zoom; only its area is capped, and past the cap the density gives way. */
const CANVAS_BUDGET = 16e6, WEBGL_BUDGET = 8e6;
export type Backing = { bw: number; bh: number; k: number };
function backing(cssW: number, lw: Logical, H: Logical, dpr: number, scale: number, budget: number): Backing {
  const want = cssW * dpr * scale, area = want * want * (H / lw);
  const px = area > budget ? Math.sqrt((budget * lw) / H) : want, k = px / lw;
  return { bw: Math.round(lw * k), bh: Math.round(H * k), k };
}
/* the pixel ratio a WebGL canvas of w × h CSS pixels renders at, under the same rule */
const glRatio = (w: number, h: number, dpr: number, scale: number): number => Math.min(dpr * scale, Math.sqrt(WEBGL_BUDGET / Math.max(1, w * h)));
const pinch = (): number => (typeof window !== 'undefined' && window.visualViewport?.scale) || 1;
const devRatio = (): number => (typeof window !== 'undefined' && window.devicePixelRatio) || 1;
/* Density changes reach every canvas: a browser zoom at once, a pinch 150 ms after it
   settles, the stretched bitmap covering the gap. */
const densityWatchers = new Set<() => void>();
function watchDensity(): void {
  if (typeof window === 'undefined') return;
  const fire = (): void => { sims.forEach((d) => { d.dirty = true; }); densityWatchers.forEach((f) => f()); };
  let seenScale = pinch(), timer = 0;
  window.visualViewport?.addEventListener('resize', () => {
    if (pinch() === seenScale) return;
    clearTimeout(timer); timer = window.setTimeout(() => { seenScale = pinch(); fire(); }, 150);
  });
  const arm = (): void => {
    if (typeof matchMedia !== 'function') return;
    matchMedia(`(resolution: ${devRatio()}dppx)`).addEventListener('change', () => { fire(); arm(); }, { once: true });
  };
  arm();
}
function begin(c: HTMLCanvasElement): { ctx: Ctx; W: Logical; H: Logical } {
  const H = +(c.dataset.h ?? 0);
  const { bw, bh, k } = backing(c.clientWidth || 800, LW, H, devRatio(), pinch(), CANVAS_BUDGET);
  if (c.width !== bw || c.height !== bh) { c.width = bw; c.height = bh; }
  const ctx = c.getContext('2d')!; ctx.setTransform(k, 0, 0, k, 0, 0); ctx.clearRect(0, 0, LW, H);
  openText(c);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.textBaseline = 'middle';
  return { ctx, W: LW, H };
}
/* A control a tour can move: `drive` sets it and fires the events a reader's hand fires, so the
   figure's own code reacts unchanged. `driving` is up while it does, which tells the tour's own
   motion from the reader's. */
let driving = false;
const driven = (f: () => void): void => { driving = true; try { f(); } finally { driving = false; } };
/* A story carries a slider over to the next quantity: `relabel` bends its label into the new one,
   `range` eases its thumb into a new range, `show` fades it in or out while the row regroups;
   the `…At` forms are frames at k, for a story's own value. */
export type Slider = {
  readonly v: number; set: (x: number) => void; disable: (held: boolean) => void; drive: (x: number) => void; refresh: () => void; mark: (sp: readonly Special[]) => void; readonly el: HTMLLabelElement;
  relabel: (label: string, aria?: string) => void; relabelAt: (a: string, b: string, k: number) => void;
  range: (r: SliderRange) => void; rangeAt: (a: SliderRange, b: SliderRange, k: number) => void;
  show: (on: boolean, o?: FadeOpts) => void; readonly shown: boolean;
};
/* A track under this many pixels is too short to set a value on (RULES §26): it takes a line of its own under its label and value. */
export const MIN_TRACK_PX = 120;
const CTL_GAP_PX = 10;
const roomy = (lab: HTMLElement): void => {
  if (typeof ResizeObserver === 'undefined') return;
  const fit = (): void => {
    const [name, , val] = Array.from(lab.children) as HTMLElement[];
    if (!name || !val || !lab.clientWidth) return;
    const room = lab.clientWidth - name.getBoundingClientRect().width - val.getBoundingClientRect().width - 2 * CTL_GAP_PX;
    lab.classList.toggle('ctl-wrap', room < MIN_TRACK_PX);
  };
  const ro = new ResizeObserver(fit);
  [lab, ...Array.from(lab.children)].forEach((e) => ro.observe(e));
};
const ariaOfLabel = (label: string): string => label.replace(/\\k|[{}\\]/g, '');
function ctl(parent: HTMLElement, o: CtlOpts): Slider {
  const lab = el('label'); const name = el('span', 'ctl-label ctl-faces');
  const inp = el('input'); inp.type = 'range'; inp.className = 's-' + o.cls; inp.min = String(o.min); inp.max = String(o.max); inp.step = String(o.step); inp.value = String(o.value);
  inp.setAttribute('aria-label', o.aria ?? ariaOfLabel(o.label));
  const val = el('span', 'ctl-val kv-' + o.cls);
  let unit = o.unit, dec = o.dec ?? 1, held: number | null = null;
  const sp = specialsOf(inp, o);
  const upd = () => { val.textContent = fmt(held ?? +inp.value, dec) + ' ' + unit; sp.lit(); };
  inp.addEventListener('input', () => { held = null; sp.snap(); upd(); o.onInput?.(); });
  const face = (t: string): HTMLElement => { const f = el('span', 'ctl-face'); f.dataset.tex = t; tex(f, t); name.appendChild(f); return f; };
  const faceOf = (t: string): HTMLElement => Array.from(name.children as HTMLCollectionOf<HTMLElement>).find((f) => f.dataset.tex === t) ?? face(t);
  let current = face(o.label), lastLabelKey = '';
  const relabelAt = (a: string, b: string, k: number): void => {
    const key = `${a}|${b}|${k}`; if (key === lastLabelKey) return; lastLabelKey = key;
    const e = ease.smooth(Math.min(1, Math.max(0, k))), fa = faceOf(a), fb = a === b ? fa : faceOf(b);
    Array.from(name.children as HTMLCollectionOf<HTMLElement>).forEach((f) => { if (f !== fa && f !== fb) f.remove(); });
    fa.style.transition = fb.style.transition = '';
    fa.style.opacity = String(1 - e); fb.style.opacity = String(e);
    current = e < 0.5 ? fa : fb;
  };
  const relabel = (t: string, aria?: string): void => {
    inp.setAttribute('aria-label', aria ?? ariaOfLabel(t)); lastLabelKey = '';
    if (current.dataset.tex === t) return;
    const was = current, now = faceOf(t), ms = REDUCED ? 0 : RELABEL_MS;
    Array.from(name.children as HTMLCollectionOf<HTMLElement>).forEach((f) => { if (f !== was && f !== now) f.remove(); });
    now.style.transition = ''; now.style.opacity = '0'; void now.offsetWidth;
    const trans = ms ? `opacity ${ms}ms ${SMOOTH_EASE}` : '';
    was.style.transition = now.style.transition = trans; was.style.opacity = '0'; now.style.opacity = '1'; current = now;
    const drop = (): void => { if (current !== was) was.remove(); };
    if (ms) setTimeout(drop, ms); else drop();
  };
  const within = (r: SliderRange, x: number): number => Math.min(r.max, Math.max(r.min, x));
  const settle = (r: SliderRange, x: number): void => {
    inp.min = String(r.min); inp.max = String(r.max); inp.step = String(r.step); inp.value = String(within(r, x));
    unit = r.unit ?? unit; dec = r.dec ?? dec; held = null; sp.place(); upd();
    if (ticks) { const t = ticksOf(detentsIn(r), r); ticks.replaceWith(t); ticks = t; }
  };
  const frame = (f: RangeFrame, x: number): void => {
    inp.step = 'any'; inp.min = String(f.min); inp.max = String(f.max); inp.value = String(f.min + f.frac * (f.max - f.min));
    unit = f.near.unit ?? unit; dec = f.near.dec ?? dec; held = x; upd();
  };
  let lastRangeKey = '', easing = 0;
  const rangeAt = (a: SliderRange, b: SliderRange, k: number): void => {
    const va = within(a, a.value ?? held ?? +inp.value), vb = within(b, b.value ?? held ?? +inp.value);
    const key = JSON.stringify([a, b, va, vb, k]); if (key === lastRangeKey) return; lastRangeKey = key;
    const f = rangeFrame(a, b, va, vb, k);
    if (f.done) settle(f.near, k < 0.5 ? va : vb); else frame(f, k < 0.5 ? va : vb);
  };
  const range = (r: SliderRange): void => {
    const was: SliderRange = { min: +inp.min, max: +inp.max, step: +inp.step || 1, unit, dec }, x = held ?? +inp.value, to = within(r, r.value ?? x);
    lastRangeKey = ''; cancelAnimationFrame(easing);
    if (REDUCED) { settle(r, to); return; }
    const t0 = performance.now(), go = { ...r, value: to };
    const step = (t: number): void => {
      const k = Math.min(1, (t - t0) / REGROUP_MS), f = rangeFrame(was, go, x, to, k);
      if (k >= 1) { settle(r, to); return; }
      frame(f, to); easing = requestAnimationFrame(step);
    };
    held = to; upd(); easing = requestAnimationFrame(step);
  };
  const ds = o.detents ?? [];
  const detentsIn = (r: Span): readonly Detent[] => ds.filter((d) => detentValue(d) >= r.min && detentValue(d) <= r.max);
  const track = el('span', 'ctl-track'); track.append(inp, sp.box);
  let ticks = ds.length ? ticksOf(ds, o) : null;
  if (ticks) track.appendChild(ticks);
  lab.append(name, track, val);
  if (ds.length && (o.snap ?? snapsByDefault(ds, o.step))) {
    inp.addEventListener('change', () => {
      const r = { min: +inp.min, max: +inp.max }, live = detentsIn(r); if (!live.length) return;
      const n = nearestDetent(live, +inp.value, snapReach(live, r)); if (n === null || n === +inp.value) return; inp.value = String(n); upd(); o.onInput?.();
    });
  }
  /* A slider a held law has taken over is disabled and greyed, never moved and snapped back. */
  const disable = (held: boolean): void => { inp.disabled = held; lab.classList.toggle('ctl-held', held); };
  if (o.disabled) disable(true);
  parent.appendChild(lab);
  sp.watch(parent); upd(); roomy(lab);
  const drive = (x: number): void => { const was = inp.value; inp.value = String(x); if (inp.value !== was) driven(() => inp.dispatchEvent(new Event('input', { bubbles: true }))); };
  enrol(parent.closest('figure'), o.key ?? o.cls, (id) => ({
    id, input: inp, drive: (x) => drive(+x),
    param: () => ({ id, label: ariaOfLabel(current.dataset.tex ?? o.label), kind: 'range', value: held ?? +inp.value, min: +inp.min, max: +inp.max, step: +inp.step || undefined, unit }),
  }));
  const shown = (): boolean => lab.dataset.out === undefined && lab.style.display !== 'none';
  const show = (to: boolean, f?: FadeOpts): void => { if (to !== shown()) regroup(parent, to ? [lab] : [], to ? [] : [lab], f); };
  return {
    get v() { return held ?? +inp.value; }, set(x: number) { held = null; inp.value = String(x); upd(); }, disable, drive, refresh: () => { sp.place(); upd(); }, mark: (l) => { sp.mark(l); upd(); }, el: lab,
    relabel, relabelAt, range, rangeAt, show, get shown() { return shown(); },
  };
}
/* `F.regroup(row, enter, leave)`: parts enter and leave a controls row while the others slide to
   their new places and the row's height eases, so the two layouts never show at once. */
const RELABEL_MS = 400, REGROUP_MS = 350;
function regroup(row: HTMLElement, enter: readonly HTMLElement[], leave: readonly HTMLElement[], f: FadeOpts = {}): void {
  const ms = REDUCED ? 0 : f.ms ?? REGROUP_MS, shift = f.shift ?? [0, 6];
  const ins = enter.filter((e) => e.dataset.out !== undefined || e.style.display === 'none'), outs = leave.filter((e) => e.dataset.out === undefined);
  if (!ins.length && !outs.length) return;
  const kids = Array.from(row.children as HTMLCollectionOf<HTMLElement>).filter((k) => k.style.display !== 'none' && k.dataset.out === undefined && !outs.includes(k));
  const box = row.getBoundingClientRect(), h0 = box.height;
  const was = new Map(kids.map((k) => [k, k.getBoundingClientRect()]));
  kids.forEach((k) => { k.style.transition = ''; k.style.transform = ''; });
  outs.forEach((e) => {
    const r = e.getBoundingClientRect(); e.dataset.out = '';
    Object.assign(e.style, { position: 'absolute', left: `${r.left - box.left - row.clientLeft}px`, top: `${r.top - box.top - row.clientTop}px`, width: `${r.width}px` });
    fadeEl(e, false, { ms, shift });
    const gone = (): void => { if (e.dataset.out === undefined) return; Object.assign(e.style, { display: 'none', position: '', left: '', top: '', width: '' }); };
    if (ms) setTimeout(gone, ms); else gone();
  });
  ins.forEach((e) => { delete e.dataset.out; Object.assign(e.style, { display: '', position: '', left: '', top: '', width: '' }); if (ms) e.style.visibility = 'hidden'; fadeEl(e, true, { ms, shift }); });
  if (!ms) return;
  const h1 = row.getBoundingClientRect().height;
  kids.forEach((k) => {
    const a = was.get(k)!, b = k.getBoundingClientRect(), dx = a.left - b.left, dy = a.top - b.top;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
    k.style.transform = `translate(${dx}px, ${dy}px)`;
  });
  row.style.height = `${h0}px`; row.style.overflow = 'visible';
  void row.offsetWidth;
  const trans = `transform ${ms}ms ${SMOOTH_EASE}`;
  kids.forEach((k) => { if (!k.style.transform) return; k.style.transition = trans; k.style.transform = ''; });
  row.style.transition = `height ${ms}ms ${SMOOTH_EASE}`; row.style.height = `${h1}px`;
  clearTimeout(+(row.dataset.regroup ?? 0));
  row.dataset.regroup = String(window.setTimeout(() => { row.style.height = row.style.transition = ''; kids.forEach((k) => { k.style.transition = ''; }); }, ms));
}
const byId = (root: HTMLElement, id: string): HTMLElement | null => root.querySelector<HTMLElement>(`[id="${root.dataset.sec}-${id}"]`);
function sim(root: HTMLElement, id: string, H?: Logical) {
  /* A root holding one figure (a split-out figure pane) boots the whole section script; the other figures get a detached scaffold and never draw. */
  const fig = byId(root, id) ?? (root.dataset.one ? el('figure', 'sim') : null); if (!fig) throw new Error(`no figure "${id}" in ${root.dataset.sec}`);
  const stage = el('div', 'stage'); fig.appendChild(stage);   /* the drawing and its transport */
  const c = H ? makeCanvas(stage, H) : null;
  const controls = el('div', 'controls'); fig.appendChild(controls);
  const readout = el('div', 'readout'); fig.appendChild(readout);
  return { fig, c, stage, controls, readout };
}

/* ---------- one animation loop for every figure ----------
   Figures animate on their own. Each gets a transport (play/pause, a time scrubber
   when the motion has a finite period, speed) under
   its canvas; a global switch pauses them all; reduced-motion starts every
   figure stopped at its end state. A figure that registers no cycle is a
   still picture that answers its sliders: it gets no transport and never
   plays, since it has no time to play through. A figure draws only when something
   changed: its time advanced, a slider or drag touched it, it scrolled into
   view, or a global redraw was asked for. A paused figure costs nothing. */
let paused = false;
const sims: Sim[] = [], onScreen = new Set<Element>(), pendingCycles: Cycle[] = [];
const vio = typeof IntersectionObserver === 'function' ? new IntersectionObserver((es) => es.forEach((e) => {
  if (!e.isIntersecting) { onScreen.delete(e.target); return; }
  onScreen.add(e.target); const d = sims.find((x) => x.fig === e.target); if (d) d.dirty = true;
}), { rootMargin: '120px' }) : null;
const SPEEDS = [1, 2, 4, 0.5] as const; const SPEED_LABEL: Record<number, string> = { 1: '1×', 2: '2×', 4: '4×', 0.5: '½×' };
const TICON = { play: '<svg viewBox="0 0 24 24"><path d="M7 5v14l12-7z"/></svg>', pause: '<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>' };
/* the speed button every transport ends with: cycles 1×, 2×, 4×, ½× */
function speedBtn(get: () => number, set: (x: number) => void, sync: () => void): HTMLButtonElement {
  const b = el('button', 'tbtn speed'); b.type = 'button'; b.title = 'Speed'; b.setAttribute('aria-label', 'Playback speed');
  b.addEventListener('click', () => { set(SPEEDS[(SPEEDS.indexOf(get() as 1) + 1) % SPEEDS.length]); sync(); });
  return b;
}
const rewind = (d: Sim) => d.cycles.forEach((c) => { c.tau = 0; c.wait = 0; });
const periodOf = (d: Sim): number => Math.max(0, ...d.cycles.map((c) => c.period()));
/* The scrubber follows the motion while it plays; dragging it pauses and sets the time. */
function syncScrub(d: Sim): void {
  const s = d.scrub; if (!s) return; const P = periodOf(d); if (!(P > 0)) return;
  s.max = String(P); s.value = String(Math.min(d.cycles[0].tau, P));
}
function transport(d: Sim): void {
  const bar = el('div', 'transport'); const play = el('button', 'tbtn'); play.type = 'button';
  const speed = speedBtn(() => d.speed, (x) => { d.speed = x; }, () => sync());
  const sync = () => { play.innerHTML = d.playing ? TICON.pause : TICON.play; play.title = d.playing ? 'Pause' : 'Play'; play.setAttribute('aria-label', play.title); speed.textContent = SPEED_LABEL[d.speed]; bar.classList.toggle('playing', d.playing); syncScrub(d); };
  play.addEventListener('click', () => { d.playing = !d.playing; if (d.playing && d.cycles.every((c) => c.tau === Infinity)) rewind(d); sync(); });
  if (d.cycles.length && isFinite(periodOf(d))) {   /* a steady oscillation runs endlessly and has nothing to scrub */
    const scrub = el('input', 'scrub s-t'); scrub.type = 'range'; scrub.min = '0'; scrub.step = 'any'; scrub.setAttribute('aria-label', 'Time');
    scrub.addEventListener('input', () => { d.playing = false; const v = +scrub.value; d.cycles.forEach((c) => { c.tau = v; c.wait = 0; }); d.draw(); sync(); });
    d.scrub = scrub; bar.append(play, scrub, speed);
  } else bar.append(play, speed);
  sync();
  const stage = d.fig.querySelector('.stage'); if (stage) stage.appendChild(bar); else d.fig.appendChild(bar);
  d.sync = sync;
}
function register(fig: HTMLElement, d: { update: (dt: number) => void; draw: () => void; arrive?: boolean }): void {
  const cycles = pendingCycles.splice(0), still = !cycles.length;
  const full: Sim = { ...d, fig, cycles, playing: !REDUCED && !still, speed: 1, dirty: true, arrive: d.arrive !== false && !REDUCED };
  if (!still && storied.has(fig)) console.error('F.register: this figure is a story; a figure has one timeline');
  sims.push(full); vio?.observe(fig); if (!still) transport(full);
  fig.addEventListener('input', () => { full.dirty = true; });                                   /* sliders, scrubber, segmented controls */
  fig.addEventListener('change', () => { full.dirty = true; });                                  /* a thumb settling on a detent */
  fig.addEventListener('pointermove', (e) => { if (e.buttons) full.dirty = true; });              /* orbit drags in a 3D view */
}
/* A figure taken out of the page for good — a copy a pane dropped, one a note held
   and then let go — leaves the loop, and a three-dimensional view under it gives
   back its WebGL context. Nothing else ends a view: an article the page keeps
   may be out of the document a while and come back, and a view drawing nothing
   while it is away costs nothing. */
const views3d = new Set<{ readonly wrap: HTMLElement; readonly dispose: () => void }>();
function release(root: HTMLElement): void {
  views3d.forEach((v) => { if (root.contains(v.wrap)) v.dispose(); });
  for (let i = sims.length - 1; i >= 0; i -= 1) {
    const d = sims[i]; if (!root.contains(d.fig)) continue;
    vio?.unobserve(d.fig); onScreen.delete(d.fig); sims.splice(i, 1);
  }
  tourTicks.forEach((fig, t) => { if (root.contains(fig)) { tickers.delete(t); tourTicks.delete(t); } });
}
/* story-time motion (tweens, tours, camera glides) steps here each frame, beside the sims' physical time */
const tickers = new Set<(now: number, dt: number) => void>();
const tourTicks = new Map<(now: number, dt: number) => void, HTMLElement>();
let lastT = typeof performance !== 'undefined' ? performance.now() : 0;
function loop(now: number): void {
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  frameNo++;
  tickers.forEach((t) => { try { t(now, dt); } catch (e) { console.error(e); } });
  sims.forEach((d) => {
    if (!onScreen.has(d.fig)) return;
    if (!paused && d.playing) {
      const before = d.cycles.map((c) => c.tau); d.update(dt * d.speed);
      if (d.cycles.some((c, i) => c.tau !== before[i])) { d.dirty = true; syncScrub(d); }   /* the end-of-loop hold changes nothing */
    }
    /* Every redraw the book asks for now comes through here, so one figure that
       throws must not take the loop — and with it every other figure — down. */
    if (d.dirty) {
      d.dirty = false; usePal(d.fig);
      if (d.arrive) d.arriveT0 ??= now; d.arriving = false;
      try { d.draw(); } catch (e) { console.error(e); }
      if (d.arriving) d.dirty = true;
    }
  });
  requestAnimationFrame(loop);
}
if (typeof requestAnimationFrame === 'function') requestAnimationFrame(loop);
watchDensity();
function cycle(period: () => number, hold: number): Cycle {
  const s: Cycle = {
    tau: REDUCED ? Infinity : 0, wait: 0, period,
    step(dt, rate) { if (s.tau >= period()) { s.wait += dt; if (s.wait > hold) { s.wait = 0; s.tau = 0; } return; } s.tau = Math.min(period(), s.tau + dt * rate()); },
    now: () => Math.min(s.tau, period()),
    reset() { s.tau = REDUCED ? Infinity : 0; s.wait = 0; },
  };
  pendingCycles.push(s); return s;
}
/* ---------- arrival ----------
   The first time a figure is drawn on screen its graphs arrive: axes draw their frame, then
   curves draw along their length. `arrivalOf` is that progress, 1 once arrived or opted out;
   a figure that asked for it while it ran keeps drawing. */
const ARRIVE_MS = 1100;
const simByCanvas = new WeakMap<object, Sim>();
function arrivalOf(d: Sim | undefined): number {
  if (!d || !d.arrive) return 1;
  const k = d.arriveT0 === undefined ? 0 : Math.min(1, (performance.now() - d.arriveT0) / ARRIVE_MS);
  if (k >= 1) d.arrive = false; else d.arriving = true;
  return k;
}
const arrivalAt = (ctx: Ctx): number => {
  const c = (ctx as { canvas?: unknown }).canvas;
  if (!(typeof HTMLCanvasElement === 'function' && c instanceof HTMLCanvasElement)) return 1;
  const d = simByCanvas.get(c) ?? simOf(c); if (d) simByCanvas.set(c, d);
  return arrivalOf(d);
};
const arrival = (d: FigRef): number => { const fig = figOf(d); return arrivalOf(sims.find((x) => x.fig === fig)); };
const during = (k: number, a: number, b: number): number => ease.smooth((k - a) / (b - a));
const setPaused = (v: boolean): void => { paused = v; };
const setShown = (shown: ColourShown): void => { SHOWN = shown; };

/* ---------- drawing primitives (logical units) ---------- */
const FIGURE_FALLBACK = "'New Computer Modern Book', Georgia, 'Times New Roman', serif";
/* The reader's figure font, read off `--figure` with the palette, so a redraw-all
   after the face loads draws and measures every label in it. */
let FONT = FIGURE_FALLBACK;
const readFont = (): void => { FONT = cssVar('--figure') || FIGURE_FALLBACK; forgetFaces(); };
/* the weight a label is measured and shown at */
const weightOf = (w: number): number => shownWeight(w, FONT);
/* a CSS font string with its weight taken to the one shown, for a figure measuring its own runs */
const shownFont = (f: string): string => f.replace(/\b([1-9]00)\b/, (w) => String(weightOf(+w)));
function line(ctx: Ctx, x1: Logical, y1: Logical, x2: Logical, y2: Logical, color: Color, w = 3, dash?: number[]): void { ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; if (dash) ctx.setLineDash(dash); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore(); }
function arrow(ctx: Ctx, x1: Logical, y1: Logical, x2: Logical, y2: Logical, color: Color, w = 4): void {
  const L = Math.hypot(x2 - x1, y2 - y1); if (L < 2) return;
  const a = Math.atan2(y2 - y1, x2 - x1), hl = Math.min(18, L);
  ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - hl * 0.6 * Math.cos(a), y2 - hl * 0.6 * Math.sin(a)); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - hl * Math.cos(a - 0.42), y2 - hl * Math.sin(a - 0.42)); ctx.lineTo(x2 - hl * Math.cos(a + 0.42), y2 - hl * Math.sin(a + 0.42)); ctx.closePath(); ctx.fill(); ctx.restore();
}
function dot(ctx: Ctx, x: Logical, y: Logical, color: Color, filled = true, r = 9): void {
  ctx.save(); ctx.lineWidth = 3; ctx.strokeStyle = color; ctx.fillStyle = filled ? color : PAL.panel;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
}
/* A label may carry subscripts the way the book's symbols do: `F_net`, `T_{L}`, `w_{box}`, and
   superscripts the same way: `m^2`, `10^{-3}`, `Na^+`. An underscore or caret followed by a braced
   group or a run of word characters is drawn smaller, lowered or raised; a plain underscore is never
   printed. Alignment and the panel behind the label measure the whole run. */
type Run = { s: string; sub: boolean; sup?: boolean; html?: string };
const SCRIPTS = /[_^]/;
function runsOf(s: string): Run[] {
  const out: Run[] = []; const re = /([_^])(?:\{([^}]*)\}|([A-Za-z0-9\u2080-\u209c\u03b1-\u03c9+\-\u2212]+))/g; let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(s))) { if (m.index > last) out.push({ s: s.slice(last, m.index), sub: false }); out.push({ s: m[2] ?? m[3] ?? '', sub: m[1] === '_', sup: m[1] === '^' }); last = re.lastIndex; }
  if (last < s.length) out.push({ s: s.slice(last), sub: false });
  return out;
}
/* A headline's `$…$` runs, each one piece set by KaTeX under the figure's macros so its symbols wear
   their type colours; plain, macros stripped, where the canvas is not in the page or KaTeX has not landed. */
const TEX_RUN = /\$([^$]+)\$/;   /* a lone $ ("$100 bills") stays a dollar sign */
function runsTex(s: string, canvas: unknown): Run[] {
  return s.split(TEX_RUN).flatMap((part, i): Run[] => {
    if (i % 2 === 0) return !part ? [] : SCRIPTS.test(part) ? runsOf(part) : [{ s: part, sub: false }];
    const html = inPage(canvas) ? typeset(part, canvas) : null;
    return html === null ? [{ s: plain(part), sub: false }] : [{ s: part, sub: false, html }];
  });
}
const runsFor = (s: string, canvas: unknown, tex?: boolean): Run[] =>
  tex && s.includes('$') ? runsTex(s, canvas) : SCRIPTS.test(s) ? runsOf(s) : [{ s, sub: false }];
/* ---------- the text over the canvas ----------
   What `text` sets on a canvas that is in the page is recorded and shown as the page's own
   text over it (textlayer.ts). A draw's record opens at `begin`, or at its first string on a
   canvas drawn without it, and is shown once the task that drew it is over. */
type TextRecord = { box: TextBox; r: number; glyphs: Glyph[] };
const records = new Map<HTMLCanvasElement, TextRecord>();
let flushing = false;
function flushText(): void {
  flushing = false;
  const measures = [...records].map(([c, rec]) => commitText(c, rec.box, rec.glyphs));
  records.clear();
  measures.map((measure) => measure()).forEach((move) => move());
}
function openText(c: HTMLCanvasElement): TextRecord {
  const w = c.offsetWidth, rec: TextRecord = { box: { l: c.offsetLeft, t: c.offsetTop, w, h: c.offsetHeight }, r: c.width ? w / c.width : 0, glyphs: [] };
  records.set(c, rec);
  if (!flushing) { flushing = true; queueMicrotask(flushText); }
  return rec;
}
const inPage = (c: unknown): c is HTMLCanvasElement => typeof HTMLCanvasElement === 'function' && c instanceof HTMLCanvasElement && !!c.parentElement;

/* ---------- the glow under a changed number ----------
   A string drawn on a figure's canvas is known again next frame by its skeleton (numbers
   blanked) and its place among the strings of that skeleton drawn this frame. A number in it
   that the reader's hand changed is set as its own piece with a faint highlight behind it
   (glow.ts); a figure with a highlight still fading keeps drawing. */
let frameNo = 0;
type GlowCanvas = { frame: number; seen: Map<string, number>; traces: Map<string, Trace> };
const glowCanvases = new WeakMap<HTMLCanvasElement, GlowCanvas>();
const glowing = new Set<HTMLCanvasElement>();
const simOf = (c: HTMLCanvasElement): Sim | undefined => sims.find((d) => d.fig.contains(c));
/* the string's runs cut into pieces, every number its own piece with the glow it carries */
const pieceOf = (r: Run, s: string, lit: number): Piece => (r.html === undefined ? { s, sub: r.sub, sup: r.sup, lit } : { s, sub: false, lit: 0, html: r.html });
function piecesOf(canvas: HTMLCanvasElement, s: string, runs: readonly Run[]): Piece[] {
  if (!/\d/.test(s)) return runs.map((r) => pieceOf(r, r.s, 0));
  const g = glowCanvases.get(canvas) ?? (glowCanvases.set(canvas, { frame: -1, seen: new Map(), traces: new Map() }), glowCanvases.get(canvas)!);
  if (g.frame !== frameNo) { g.frame = frameNo; g.seen.clear(); }
  const sk = skeletonOf(s), nth = g.seen.get(sk) ?? 0, key = sk + '\u0000' + nth;
  g.seen.set(sk, nth + 1);
  const toks = runs.map((r) => (r.html === undefined ? tokensOf(r.s) : []));
  const now = performance.now(), fig = simOf(canvas)?.fig;
  const tr = glowStep(g.traces.get(key), toks.flat().map((t) => t.s), inputSeq(), now, byHand(now, fig));
  g.traces.set(key, tr);
  let n = 0;
  const out = runs.flatMap((r, i): Piece[] => {
    let at = 0;
    const cut = toks[i].flatMap((t): Piece[] => {
      const lit = glowOf(tr.lit[n++], now, REDUCED), before = r.s.slice(at, t.i); at = t.j;
      return [...(before ? [pieceOf(r, before, 0)] : []), pieceOf(r, r.s.slice(t.i, t.j), lit)];
    });
    return at < r.s.length || !cut.length ? [...cut, pieceOf(r, r.s.slice(at), 0)] : cut;
  });
  if (out.some((p) => p.lit > 0)) glowing.add(canvas);
  return out;
}
tickers.add(() => { glowing.forEach((c) => { const d = simOf(c); if (d) d.dirty = true; }); glowing.clear(); syncLayers(); });
if (typeof document !== 'undefined') document.fonts?.addEventListener?.('loadingdone', () => { forgetTex(); sims.forEach((d) => { d.dirty = true; }); });

/* The sizes the text layer shows a string asked for at `size`, main runs and subscripts, in the
   units the context draws in: the floor and the pane's scale read back from CSS pixels, the way
   `text` records them. A canvas not laid out yet answers the size asked for, and its next draw
   measures again. */
function shownAt(ctx: Ctx, size: number): readonly [Logical, Logical] {
  const c = (ctx as { canvas?: { offsetWidth?: number; width?: number } }).canvas;
  return shownIn(size, c?.width && c.offsetWidth && ctx.getTransform ? (scaleOf(ctx.getTransform()) * c.offsetWidth) / c.width : 0);
}
const fontOf = (weight: number, italic: boolean, px: number): string => `${italic ? 'italic ' : ''}${weightOf(weight)} ${px}px ${FONT}`;
/* each run's width on the canvas as the layer sets it */
function widthsOf(ctx: Ctx, runs: readonly Run[], [main, sub]: readonly [Logical, Logical], weight: number, italic: boolean): Logical[] {
  return runs.map((r) => { if (r.html !== undefined) return texEm(r.html) * main; ctx.font = fontOf(weight, italic, r.sub || r.sup ? sub : main); return ctx.measureText(r.s).width; });
}
function text(ctx: Ctx, s: string, x: Logical, y: Logical, color: Color, o: TextOpts = {}): void {
  const size = o.size ?? 22, weight = weightOf(o.weight ?? 400), italic = !!o.italic, shown = shownAt(ctx, size);
  const canvas = (ctx as { canvas?: unknown }).canvas, runs = runsFor(s, canvas, o.tex);
  const base = o.base ?? 'middle', align = o.align ?? 'left';
  ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = base;
  const widths = widthsOf(ctx, runs, shown, weight, italic);
  const total = widths.reduce((a, b) => a + b, 0);
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  if (o.bg) { const pw = total + 14, ph = shown[0] + 8; ctx.fillStyle = o.bg; ctx.fillRect(cx - 7, y - ph / 2, pw, ph); }
  if (inPage(canvas)) {
    const rec = records.get(canvas) ?? openText(canvas), m = ctx.getTransform(), [px, py] = mapPoint(m, x, y, rec.r);
    rec.glyphs.push({
      pieces: piecesOf(canvas, s, runs), x: px, y: py, size: size * scaleOf(m) * rec.r, rot: angleOf(m),
      color, alpha: ctx.globalAlpha, align: align === 'center' ? 'center' : align === 'right' || align === 'end' ? 'right' : 'left',
      base: baselineOf(weight, italic, FONT, base), weight, italic, family: FONT,
    });
  } else {
    ctx.fillStyle = color;
    runs.forEach((r, i) => { ctx.font = fontOf(weight, italic, shown[r.sub || r.sup ? 1 : 0]); ctx.fillText(r.s, cx, r.sub ? y + shown[0] * 0.22 : r.sup ? y - shown[0] * 0.36 : y); cx += widths[i]; });
  }
  ctx.restore();
}
/* `measure(ctx, s, { size, weight })`: the width `text` gives s as the layer shows it, in logical units */
function measure(ctx: Ctx, s: string, o: Pick<TextOpts, 'size' | 'weight' | 'italic' | 'tex'> = {}): Logical {
  const runs = runsFor(s, (ctx as { canvas?: unknown }).canvas, o.tex);
  ctx.save(); const w = widthsOf(ctx, runs, shownAt(ctx, o.size ?? 22), o.weight ?? 400, !!o.italic).reduce((a, b) => a + b, 0); ctx.restore();
  return w;
}
/* the height a size is shown at, in logical units */
const shownH = (ctx: Ctx, size: number): Logical => shownAt(ctx, size)[0];
const oneline = (ctx: Ctx, s: string, color?: Color): void => text(ctx, s, LW / 2, 46, color ?? PAL.ink, { size: 26, align: 'center', tex: true });
/* The headline of a figure. It wraps exactly as `topline` does — one line where it
   fits and two otherwise — so a headline built from live numbers can never run off
   the canvas, and it returns the number of lines it took. A `$…$` run in it is set
   as TeX under the figure's macros, so a formula there wears its type colours. */
const headline = (ctx: Ctx, s: string, color?: Color): 1 | 2 => topline(ctx, s, color);
/* The side a bracket's label is set on, and the canvas height it is kept inside.
   A bracket over a short span carries a label wider than the span, so the label is
   clamped to the canvas rather than allowed to hang off the edge. */
export type BracketSide = 'above' | 'below' | 'left' | 'right';
type BracketOpts = { side?: BracketSide; H?: Logical; size?: number };
const canvasH = (ctx: Ctx, o?: { H?: Logical }): Logical => o?.H ?? +((ctx as { canvas?: { dataset?: Record<string, string> } }).canvas?.dataset?.h ?? 0);
/* the label's half width at the weight and size a bracket and a note set their text */
const halfWidth = (ctx: Ctx, s: string, size: number): Logical => measure(ctx, s, { size, weight: 600 }) / 2 + 9;
function hbracket(ctx: Ctx, x1: Logical, x2: Logical, y: Logical, color: Color, label?: string, o: BracketOpts = {}): void {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.moveTo(x1, y - 10); ctx.lineTo(x1, y + 10); ctx.moveTo(x2, y - 10); ctx.lineTo(x2, y + 10); ctx.stroke(); ctx.restore();
  if (!label) return;
  const sz = o.size ?? 22, H = canvasH(ctx, o), below = o.side === 'below';
  const half = halfWidth(ctx, label, sz);
  const x = Math.min(Math.max((x1 + x2) / 2, 16 + half), LW - 16 - half);
  let ly = below ? y + 24 : y - 22;
  if (H > 0) ly = Math.min(Math.max(ly, 16 + shownH(ctx, sz) / 2), H - 16 - shownH(ctx, sz) / 2);
  text(ctx, label, x, ly, color, { align: 'center', weight: 600, size: sz });
}
function vbracket(ctx: Ctx, x: Logical, y1: Logical, y2: Logical, color: Color, label?: string, side = 1, o: BracketOpts = {}): void {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.moveTo(x - 10, y1); ctx.lineTo(x + 10, y1); ctx.moveTo(x - 10, y2); ctx.lineTo(x + 10, y2); ctx.stroke(); ctx.restore();
  if (!label) return;
  const sz = o.size ?? 22, H = canvasH(ctx, o);
  const s = o.side === 'left' ? -1 : o.side === 'right' ? 1 : side;
  const half = halfWidth(ctx, label, sz) * 2;
  /* a label that would leave the canvas on the side asked for is set on the other side */
  const turn = s > 0 && x + 16 + half > LW - 16 ? -1 : s < 0 && x - 16 - half < 16 ? 1 : s;
  let ly = (y1 + y2) / 2;
  if (H > 0) ly = Math.min(Math.max(ly, 16 + shownH(ctx, sz) / 2), H - 16 - shownH(ctx, sz) / 2);
  text(ctx, label, x + turn * 16, ly, color, { align: turn > 0 ? 'left' : 'right', weight: 600, size: sz });
}
function strip(ctx: Ctx, x1: Logical, x2: Logical, y: Logical, h: Logical): void {
  ctx.save(); ctx.fillStyle = PAL.soft; ctx.fillRect(x1, y - h / 2, x2 - x1, h); ctx.restore();
  line(ctx, x1, y, x2, y, PAL.panel, 3, [22, 18]);
}
function scale(ctx: Ctx, X: Scale, from: number, to: number, step: number, y: Logical, unit?: string, every = 1): void {
  let i = 0;
  for (let m = from; m <= to + 1e-9; m += step, i++) { line(ctx, X(m), y - 8, X(m), y + 8, PAL.muted, 2); if (i % every === 0) text(ctx, fmt(m, 0) + (unit ? ' ' + unit : ''), X(m), y + 28, PAL.muted, { size: 17, align: 'center' }); }
}
export type Axes = { readonly X: Scale; readonly Y: Scale; readonly box: Box; readonly xr: Range; readonly yr: Range };
function axes(ctx: Ctx, box: Box, xr: Range, yr: Range, o: AxesOpts = {}): Axes {
  const X: Scale = (v) => box.l + ((v - xr[0]) / (xr[1] - xr[0])) * (box.r - box.l);
  const Y: Scale = (v) => box.b - ((v - yr[0]) / (yr[1] - yr[0])) * (box.b - box.t);
  const nx = o.nx ?? 4, ny = o.ny ?? 3;
  const k = arrivalAt(ctx), grow = during(k, 0, 0.25), fade = during(k, 0.15, 0.4);
  ctx.save(); ctx.globalAlpha *= fade;
  /* nice: ticks at round values for whatever range this frame has, as a zoom needs */
  const at = (r: Range, n: number): { vals: number[]; dec: number } => n <= 0 ? { vals: [], dec: 0 } : o.nice ? ticks(r[0], r[1], n) : { vals: Array.from({ length: n + 1 }, (_, i) => r[0] + ((r[1] - r[0]) * i) / n), dec: 0 };
  const tx = at(xr, nx), ty = at(yr, ny);
  tx.vals.forEach((v) => { if (v !== xr[0]) line(ctx, X(v), box.t, X(v), box.b, PAL.rule, 1.5); text(ctx, o.fx ? o.fx(v) : fmt(v, tx.dec), X(v), box.b + 26, PAL.muted, { size: 17, align: 'center' }); });
  ty.vals.forEach((v) => { if (v !== yr[0]) line(ctx, box.l, Y(v), box.r, Y(v), PAL.rule, 1.5); text(ctx, o.fy ? o.fy(v) : fmt(v, ty.dec), box.l - 14, Y(v), PAL.muted, { size: 17, align: 'right' }); });
  if (o.xl) text(ctx, o.xl, box.r, box.b + 58, o.xc ?? PAL.ink, { align: 'right', weight: 600, size: 20 });
  if (o.yl) text(ctx, o.yl, box.l, box.t - 24, o.yc ?? PAL.ink, { align: 'left', weight: 600, size: 20 });
  ctx.restore();
  if (!(grow > 0)) return { X, Y, box, xr, yr };
  const up = box.b - (box.b - box.t) * grow, across = box.l + (box.r - box.l) * grow;
  line(ctx, box.l, box.b, box.l, up, PAL.muted, 2); line(ctx, box.l, box.b, across, box.b, PAL.muted, 2);
  if (xr[0] < 0 && xr[1] > 0) line(ctx, X(0), box.b, X(0), up, PAL.muted, 2);
  if (yr[0] < 0 && yr[1] > 0) line(ctx, box.l, Y(0), across, Y(0), PAL.muted, 2);
  return { X, Y, box, xr, yr };
}
function nice(lo: number, hi: number, want = 4): { lo: number; hi: number; n: number } {
  const raw = (hi - lo) / want, p = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 5, 10].map((m) => m * p).find((st) => raw <= st) ?? 10 * p;
  const a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step;
  return { lo: a, hi: b, n: Math.round((b - a) / step) };
}
/* A point on axes whose ranges are fixed. Inside the box it is an ordinary dot; past an edge it is
   pinned at that edge as a hollow marker with its value written beside it, so the axes never rescale
   to follow it. Returns the pinned coordinates for whatever the figure draws next. */
function pinned(ctx: Ctx, box: Box, X: Scale, Y: Scale, xv: number, yv: number, color: Color, label?: string): { x: Logical; y: Logical; out: boolean } {
  const px = X(xv), py = Y(yv);
  const x = Math.min(Math.max(px, box.l), box.r), y = Math.min(Math.max(py, box.t), box.b), out = x !== px || y !== py;
  if (!out) { dot(ctx, x, y, color, true, 9); return { x, y, out }; }
  dot(ctx, x, y, color, false, 9);
  const dx = px > box.r ? 1 : px < box.l ? -1 : 0, dy = py < box.t ? -1 : py > box.b ? 1 : 0;
  arrow(ctx, x - dx * 26, y - dy * 26, x - dx * 4, y - dy * 4, color, 3);
  if (label) text(ctx, label, x - dx * 16 - (dx ? 0 : 16), y - dy * 16 + (dy ? 0 : -22), color, { size: 17, weight: 600, align: dx > 0 ? 'right' : 'left', bg: PAL.panel });
  return { x, y, out };
}
function curve(ctx: Ctx, f: (t: number) => number, t0: number, t1: number, X: Scale, Y: Scale, color: Color, w = 4, n = 80): void {
  const q = during(arrivalAt(ctx), 0.3, 1); if (!(q > 0)) return;
  const all = Array.from({ length: n + 1 }, (_, i) => { const s = t0 + ((t1 - t0) * i) / n; return [X(s), Y(f(s))] as const; });
  const pts = q < 1 ? partial(all.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y)), q) : all;
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath();
  pts.forEach(([x, y], i) => { if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
  ctx.stroke(); ctx.restore();
}
/* `F.blendCurve`: curve of fa bending into fb, both sampled at the same t */
function blendCurve(ctx: Ctx, fa: (t: number) => number, fb: (t: number) => number, k: number, t0: number, t1: number, X: Scale, Y: Scale, color: Color, w = 4, n = 80): void {
  curve(ctx, blendFn(fa, fb, k), t0, t1, X, Y, color, w, n);
}
/* ---------- graphs of functions ----------
   `plot` draws y = f(x) honestly on the axes it is given: no line across a jump or a pole, the
   domain's edge found, an open circle at a hole and at an open end, a filled one at a closed end
   and at a point the function takes off its curve. A piecewise function is a list of pieces, each
   on its own interval with its ends written as an interval is ('[)', '(]', '[]', '()'). */
export type PlotPiece = { readonly f: (x: number) => number; readonly x: Range; readonly ends?: string };
export type PlotOpts = { w?: number; x?: Range; holes?: readonly (number | readonly [number, number])[]; dots?: readonly (readonly [number, number])[]; poles?: readonly number[] };
const PLOT_PAD = 6;
const clipTo = (ctx: Ctx, box: Box, right = box.r): void => { ctx.beginPath(); ctx.rect(box.l - PLOT_PAD, box.t - PLOT_PAD, right - box.l + 2 * PLOT_PAD, box.b - box.t + 2 * PLOT_PAD); ctx.clip(); };
function plot(ctx: Ctx, ax: Axes, fn: ((x: number) => number) | readonly PlotPiece[], color: Color, o: PlotOpts = {}): void {
  const q = during(arrivalAt(ctx), 0.3, 1); if (!(q > 0)) return;
  const { box, X, Y } = ax, reach = box.l + (box.r - box.l) * q;
  const pieces: readonly PlotPiece[] = typeof fn === 'function' ? [{ f: fn, x: o.x ?? ax.xr }] : fn;
  ctx.save(); clipTo(ctx, box, reach);
  (o.poles ?? []).forEach((p) => line(ctx, X(p), box.t, X(p), box.b, PAL.muted, 2, [10, 10]));
  ctx.strokeStyle = color; ctx.lineWidth = o.w ?? 5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  pieces.forEach((p) => trace(p.f, p.x[0], p.x[1], ax).forEach((run) => {
    ctx.beginPath(); run.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
  }));
  ctx.restore();
  const mark = (x: number, y: number, filled: boolean): void => {
    const px = X(x), py = Y(y);
    if (Number.isFinite(py) && px <= reach + 1 && py >= box.t - 1 && py <= box.b + 1) dot(ctx, px, py, color, filled, 8);
  };
  const end = (c: string | undefined, f: (x: number) => number, x: number, dir: -1 | 1): void => {
    if (c === '(' || c === ')') mark(x, limit(f, x, dir), false);
    else if (c === '[' || c === ']') { const y = f(x); mark(x, Number.isFinite(y) ? y : limit(f, x, dir), true); }
  };
  pieces.forEach((p) => { const [l, r] = Array.from(p.ends ?? ''); end(l, p.f, p.x[0], 1); end(r, p.f, p.x[1], -1); });
  const fAt = (x: number): ((x: number) => number) | undefined => pieces.find((p) => p.x[0] <= x && x <= p.x[1])?.f;
  (o.holes ?? []).forEach((h) => { if (typeof h !== 'number') { mark(h[0], h[1], false); return; } const f = fAt(h); if (f) mark(h, limit(f, h), false); });
  (o.dots ?? []).forEach(([x, y]) => mark(x, y, true));
}
/* `shade`: the region between f and g (a function, or a level; the axis by default) over [a, b],
   filled once its curve has arrived; returns the signed area ∫(f − g). */
function shade(ctx: Ctx, ax: Axes, f: (x: number) => number, g: number | ((x: number) => number), a: number, b: number, color: Color, o: { alpha?: number } = {}): number {
  const gf = typeof g === 'number' ? () => g : g, A = area(f, gf, a, b);
  const q = during(arrivalAt(ctx), 0.6, 1); if (!(q > 0)) return A;
  const { box, X, Y } = ax, n = 160, xs = Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);
  const y = (v: number): Logical => Math.min(box.b + 1e4, Math.max(box.t - 1e4, Y(v)));
  const pts = [...xs.map((x) => [x, f(x)]), ...xs.reverse().map((x) => [x, gf(x)])].filter(([, v]) => Number.isFinite(v));
  ctx.save(); clipTo(ctx, box); ctx.globalAlpha *= (o.alpha ?? 0.25) * q; ctx.fillStyle = color; ctx.beginPath();
  pts.forEach(([x, v], i) => (i ? ctx.lineTo(X(x), y(v)) : ctx.moveTo(X(x), y(v)))); ctx.closePath(); ctx.fill(); ctx.restore();
  return A;
}
/* `riemann`: n cells from the axis to f on [a, b] by a rule ('left', 'right', 'mid', 'trap', 'upper',
   'lower'), arriving one after another; returns their sum. */
function riemann(ctx: Ctx, ax: Axes, f: (x: number) => number, a: number, b: number, n: number, color: Color, o: { rule?: Rule } = {}): number {
  const { cells: cs, sum } = cells(f, a, b, n, o.rule), k = during(arrivalAt(ctx), 0.3, 1), { box, X, Y } = ax;
  ctx.save(); clipTo(ctx, box); ctx.fillStyle = ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round';
  const base = ctx.globalAlpha;
  cs.forEach((c, i) => {
    const e = stagger(k, i, cs.length); if (!(e > 0) || !Number.isFinite(c.yl) || !Number.isFinite(c.yr)) return;
    ctx.beginPath(); ctx.moveTo(X(c.x0), Y(0)); ctx.lineTo(X(c.x0), Y(c.yl)); ctx.lineTo(X(c.x1), Y(c.yr)); ctx.lineTo(X(c.x1), Y(0)); ctx.closePath();
    ctx.globalAlpha = base * 0.22 * e; ctx.fill(); ctx.globalAlpha = base * e; ctx.stroke();
  });
  ctx.restore();
  return sum;
}
/* `tangent` at a (slope from df, or a central difference) and `secant` through a and b: each drawn
   across the axes' box, growing from the point on arrival; each returns its slope. */
function through(ctx: Ctx, ax: Axes, x0: number, y0: number, m: number, color: Color, w: number, dash?: number[]): void {
  if (!Number.isFinite(m) || !Number.isFinite(y0)) return;
  const seg = clipLine(x0, y0, m, ax.xr, ax.yr); if (!seg) return;
  const q = during(arrivalAt(ctx), 0.3, 1); if (!(q > 0)) return;
  const [[xa, ya], [xb, yb]] = seg, at = (x: number, y: number): [Logical, Logical] => [ax.X(x0 + (x - x0) * q), ax.Y(y0 + (y - y0) * q)];
  const [p, r] = [at(xa, ya), at(xb, yb)];
  ctx.save(); clipTo(ctx, ax.box); line(ctx, p[0], p[1], r[0], r[1], color, w, dash); ctx.restore();
}
type LineOpts = { w?: number; dash?: number[] };
function tangent(ctx: Ctx, ax: Axes, f: (x: number) => number, a: number, color: Color, o: LineOpts & { df?: (x: number) => number } = {}): number {
  const m = o.df ? o.df(a) : slope(f, a); through(ctx, ax, a, f(a), m, color, o.w ?? 3, o.dash); return m;
}
function secant(ctx: Ctx, ax: Axes, f: (x: number) => number, a: number, b: number, color: Color, o: LineOpts = {}): number {
  const m = (f(b) - f(a)) / (b - a); through(ctx, ax, a, f(a), m, color, o.w ?? 3, o.dash); return m;
}
/* `band`: the ε–δ picture of a limit claim about f at a. The target (L ± ε, or past M for an infinite
   limit) is a strip across the box in color, the δ window about a (or on one side of it) a strip in
   ink, where the graph first leaves the target on each side is dropped to the x-axis, and the box
   window × target is outlined in color when δ works; when it does not, the graph's escaping part over
   the window is drawn in bad. Returns judge's verdict: ok, best (the largest δ that works), left, right. */
type BandOpts = { side?: -1 | 0 | 1; reach?: number };
function band(ctx: Ctx, ax: Axes, f: (x: number) => number, a: number, t: Target, delta: number, color: Color, o: BandOpts = {}): ReturnType<typeof judge> {
  const { box, X, Y, xr, yr } = ax, side = o.side ?? 0;
  const v = judge(f, a, delta, t, side, o.reach ?? Math.max(side > 0 ? 0 : a - xr[0], side < 0 ? 0 : xr[1] - a));
  const q = during(arrivalAt(ctx), 0.3, 1); if (!(q > 0)) return v;
  const [y0, y1] = 'L' in t ? [t.L - t.eps, t.L + t.eps] : (t.to ?? 1) > 0 ? [t.M, Infinity] : [-Infinity, t.M];
  const [x0, x1] = [side > 0 ? a : a - delta, side < 0 ? a : a + delta];
  const T = Math.max(box.t, Math.min(box.b, Y(y1))), B = Math.max(box.t, Math.min(box.b, Y(y0)));
  const L = Math.max(box.l, X(x0)), R = Math.min(box.r, X(x1));
  ctx.save(); ctx.globalAlpha *= q; clipTo(ctx, box);
  const fill = (c: Color, k: number, x: Logical, y: Logical, w: Logical, h: Logical): void => faded(ctx, k, [0, 0], () => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); });
  fill(color, 0.14, box.l, T, box.r - box.l, B - T); fill(PAL.ink, 0.07, L, box.t, R - L, box.b - box.t);
  [y0, y1].filter(Number.isFinite).forEach((y) => line(ctx, box.l, Y(y), box.r, Y(y), color, 2, [10, 10]));
  [x0, x1].filter((x) => x !== a).forEach((x) => line(ctx, X(x), box.t, X(x), box.b, alpha(PAL.ink, 0.5), 2, [10, 10]));
  line(ctx, X(a), box.t, X(a), box.b, alpha(PAL.ink, 0.35), 2, [4, 8]);
  const axisY = yr[0] < 0 && yr[1] > 0 ? Y(0) : box.b;
  ([[-1, v.left], [1, v.right]] as const).forEach(([s, d]) => {
    if (!Number.isFinite(d)) return; const x = a + s * d, y = limit(f, x, s === 1 ? -1 : 1);
    if (!Number.isFinite(y) || X(x) < box.l || X(x) > box.r) return;
    line(ctx, X(x), Y(y), X(x), axisY, color, 2, [4, 8]); dot(ctx, X(x), Math.max(box.t, Math.min(box.b, Y(y))), color, true, 6);
  });
  const stroke = (c: Color): void => {
    ctx.strokeStyle = c; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const e = 1e-9 * Math.max(1, Math.abs(a));
    [[x0, a - e], [a + e, x1]].filter(([p, r]) => r > p).forEach(([p, r]) => trace(f, p, r, ax).forEach((run) => {
      ctx.beginPath(); run.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
    }));
  };
  if (v.ok) { ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.strokeRect(L, T, R - L, B - T); }
  else { ctx.beginPath(); ctx.rect(L, box.t - PLOT_PAD, R - L, T - box.t + PLOT_PAD); ctx.rect(L, B, R - L, box.b - B + PLOT_PAD); ctx.clip(); stroke(PAL.bad); }
  ctx.restore();
  return v;
}

/* ---------- a point the reader drags ----------
   `drag(d, { x, y })`: a point on the canvas held by sliders, so it steps by keyboard, catches on
   their dashed circles and is stored by a note under their keys. y is a slider (free in the plane),
   a function (along its graph) or a level (along x; 0 by default). Dragging the point moves its
   sliders as a hand on them would; the point draws through `draw(ctx, ax, color)` each frame,
   pinned at the edge when it leaves the box, and its ring brightens while held or focused. */
export type DragOpts = { readonly x: Slider; readonly y?: Slider | ((x: number) => number) | number };
export type Drag = { draw: (ctx: Ctx, ax: Axes, color: Color) => { x: Logical; y: Logical; out: boolean } | null; readonly at: readonly [number, number] };
type Grip = { spot: () => Pt | null; move: (p: Pt) => void; done: () => void };
type Grips = { list: Grip[]; held: Grip | null };
const gripsBy = new WeakMap<HTMLCanvasElement, Grips>();
function gripsOf(c: HTMLCanvasElement): Grips {
  const had = gripsBy.get(c); if (had) return had;
  const g: Grips = { list: [], held: null }; gripsBy.set(c, g);
  let off: Pt = [0, 0];
  const local = (e: PointerEvent): Pt | null => { const r = c.getBoundingClientRect(), H = +(c.dataset.h ?? 0); return r.width && H ? [((e.clientX - r.left) / r.width) * LW, ((e.clientY - r.top) / r.height) * H] : null; };
  const nearest = (p: Pt): { grip: Grip; at: Pt } | null => {
    let best: { grip: Grip; at: Pt } | null = null, bd = Math.max(34, (22 * LW) / (c.getBoundingClientRect().width || LW));
    g.list.forEach((grip) => { const q = grip.spot(); if (!q) return; const dd = Math.hypot(q[0] - p[0], q[1] - p[1]); if (dd <= bd) { best = { grip, at: q }; bd = dd; } });
    return best;
  };
  c.addEventListener('pointerdown', (e) => {
    const p = local(e), hit = p && nearest(p); if (!p || !hit) return;
    e.preventDefault(); c.setPointerCapture?.(e.pointerId); c.style.cursor = 'grabbing';
    g.held = hit.grip; off = [hit.at[0] - p[0], hit.at[1] - p[1]];
  });
  c.addEventListener('pointermove', (e) => {
    const p = local(e); if (!p) return;
    if (g.held) { g.held.move([p[0] + off[0], p[1] + off[1]]); return; }
    c.style.cursor = nearest(p) ? 'grab' : '';
  });
  const letGo = (): void => { const h = g.held; if (!h) return; g.held = null; c.style.cursor = ''; h.done(); };
  c.addEventListener('pointerup', letGo); c.addEventListener('pointercancel', letGo);
  return g;
}
const inputOf = (s: Slider): HTMLInputElement => s.el.querySelector('input')!;
const handOn = (s: Slider, v: number): void => {
  const inp = inputOf(s), was = inp.value; inp.value = String(clampTo(v, +inp.min, +inp.max));
  if (inp.value !== was) inp.dispatchEvent(new Event('input', { bubbles: true }));
};
function drag(d: { readonly fig: HTMLElement; readonly c: HTMLCanvasElement | null; readonly stage: HTMLElement }, o: DragOpts): Drag {
  const c = d.c ?? d.stage.querySelector('canvas'); if (!c) throw new Error('F.drag: the figure has no canvas');
  const ys = typeof o.y === 'object' ? o.y : null, y = o.y, yOf = (x: number): number => (ys ? ys.v : typeof y === 'function' ? y(x) : typeof y === 'number' ? y : 0);
  const g = gripsOf(c), sliders = ys ? [o.x, ys] : [o.x];
  let ax: Axes | null = null, spot: Pt | null = null;
  const grip: Grip = {
    spot: () => spot,
    move: ([px, py]) => {
      if (!ax) return; const { box, xr, yr } = ax;
      handOn(o.x, xr[0] + ((px - box.l) / (box.r - box.l)) * (xr[1] - xr[0]));
      if (ys) handOn(ys, yr[0] + ((box.b - py) / (box.b - box.t)) * (yr[1] - yr[0]));
    },
    done: () => { sliders.forEach((s) => inputOf(s).dispatchEvent(new Event('change', { bubbles: true }))); touch(d.fig); },
  };
  g.list.push(grip);
  if (ys) c.style.touchAction = 'none'; else if (c.style.touchAction !== 'none') c.style.touchAction = 'pan-y';
  sliders.forEach((s) => ['focus', 'blur'].forEach((t) => inputOf(s).addEventListener(t, () => touch(d.fig))));
  return {
    get at() { return [o.x.v, yOf(o.x.v)] as const; },
    draw(ctx, a, color) {
      ax = a; const xv = o.x.v, yv = yOf(xv);
      if (!Number.isFinite(yv)) { spot = null; return null; }
      const p = pinned(ctx, a.box, a.X, a.Y, xv, yv, color); spot = [p.x, p.y];
      const hot = g.held === grip || sliders.some((s) => document.activeElement === inputOf(s));
      ctx.save(); ctx.globalAlpha *= hot ? 0.6 : 0.28; ctx.strokeStyle = color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, 17, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      return p;
    },
  };
}
/* `F.faded(ctx, alpha, [dx, dy], draw)`: draw under globalAlpha × alpha, translated; skipped at 0 */
function faded(ctx: Ctx, a: number, off: readonly [number, number], draw: () => void): void {
  if (!(a > 0)) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(off[0], off[1]); draw(); ctx.restore();
}
/* `F.mixColor(a, b, k)`: two CSS colours blended in sRGB; one the canvas cannot read back as rgb switches at half way */
let colorCtx: CanvasRenderingContext2D | null = null;
const rgbaSeen = new Map<string, Rgba | null>();
function rgbaOf(c: string): Rgba | null {
  const got = rgbaSeen.get(c); if (got !== undefined || rgbaSeen.has(c)) return got ?? null;
  colorCtx ??= document.createElement('canvas').getContext('2d');
  let norm = c;
  if (colorCtx) { colorCtx.fillStyle = '#000'; colorCtx.fillStyle = c; norm = String(colorCtx.fillStyle); }
  const v = parseRgba(norm); rgbaSeen.set(c, v); return v;
}
function mixColor(a: Color, b: Color, k: number): Color {
  if (k <= 0 || a === b) return a; if (k >= 1) return b;
  const A = rgbaOf(a), B = rgbaOf(b);
  return A && B ? mixRgba(A, B, k) : k < 0.5 ? a : b;
}
/* sprites: tiny ink drawings, 80 to 120 units long at scale 1 */
function runner(ctx: Ctx, x: Logical, y: Logical, color: Color, phase: number): void {
  const sw = Math.sin(phase) * 12; ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(x, y - 44, 9, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x, y - 34); ctx.lineTo(x - 2, y - 6);
  ctx.moveTo(x - 2, y - 6); ctx.lineTo(x - 10 + sw, y + 18); ctx.moveTo(x - 2, y - 6); ctx.lineTo(x + 10 - sw, y + 18);
  ctx.moveTo(x - 1, y - 26); ctx.lineTo(x + 14 + sw * 0.6, y - 16); ctx.moveTo(x - 1, y - 26); ctx.lineTo(x - 14 - sw * 0.6, y - 16); ctx.stroke(); ctx.restore();
}
/* a person of about 84 units, feet on the surface at (x, y): a filled head and torso
   and two-segment limbs whose knees and elbows are placed by the reach of each limb.
   `face` is +1 walking right and -1 left; `phase` runs the walk (0 stands still);
   `lean` tips the torso forward in radians (a climber, a pusher); `crouch` in 0..1
   bends the knees; `reach` puts both hands on a point in canvas units, such as the
   side of a crate or the rail of a ladder; `s` scales the whole figure. */
type Reach = { x: Logical; y: Logical };
function joint(a: Reach, b: Reach, l1: number, l2: number, side: number): Reach {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.max(1e-6, Math.min(Math.hypot(dx, dy), l1 + l2 - 1e-3));
  const t = Math.atan2(dy, dx), bend = Math.acos(Math.min(1, Math.max(-1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  return { x: a.x + l1 * Math.cos(t - side * bend), y: a.y + l1 * Math.sin(t - side * bend) };
}
function person(ctx: Ctx, x: Logical, y: Logical, color: Color, o: { face?: number; phase?: number; lean?: number; crouch?: number; reach?: Reach; s?: number } = {}): void {
  const face = o.face ?? 1, ph = o.phase ?? 0, lean = o.lean ?? 0, crouch = o.crouch ?? 0, s = o.s ?? 1;
  const walking = ph !== 0, sw = walking ? Math.sin(ph) : 0;
  const hip: Reach = { x: 0, y: -(40 - 12 * crouch) };
  const sh: Reach = { x: hip.x + 30 * Math.sin(lean), y: hip.y - 30 * Math.cos(lean) };
  const head: Reach = { x: sh.x + 14 * Math.sin(lean), y: sh.y - 14 * Math.cos(lean) };
  const feet: Reach[] = [{ x: 12 * sw, y: -6 * Math.max(0, sw) }, { x: -12 * sw, y: -6 * Math.max(0, -sw) }];
  const stance = walking ? 0 : 6 + 6 * crouch;
  const hands: Reach[] = o.reach ? [{ x: (o.reach.x - x) / s * face, y: (o.reach.y - y) / s }, { x: (o.reach.x - x) / s * face - 3, y: (o.reach.y - y) / s + 3 }]
    : [{ x: sh.x - 9 * sw + 3, y: sh.y + 27 }, { x: sh.x + 9 * sw - 3, y: sh.y + 27 }];
  ctx.save(); ctx.translate(x, y); ctx.scale(s * face, s); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  /* the limbs behind the body first, then the body, then the near limbs */
  const limb = (a: Reach, b: Reach, l1: number, l2: number, side: number, w: number) => {
    const k = joint(a, b, l1, l2, side); ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(k.x, k.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  };
  const foot = (f: Reach, w: number) => { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(f.x - 3, f.y); ctx.lineTo(f.x + 9, f.y); ctx.stroke(); };
  const far = walking ? 1 : 0;
  limb(hip, { x: feet[far].x - stance, y: feet[far].y }, 22, 22, 1, 4.5); foot({ x: feet[far].x - stance, y: feet[far].y }, 4.5);
  limb(sh, hands[1], 18, 18, -1, 4);
  ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(hip.x - 5, hip.y); ctx.lineTo(sh.x - 7, sh.y); ctx.lineTo(sh.x + 7, sh.y); ctx.lineTo(hip.x + 5, hip.y); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(head.x, head.y); ctx.stroke();
  ctx.beginPath(); ctx.arc(head.x, head.y - 4, 9, 0, Math.PI * 2); ctx.fill();
  limb(hip, { x: feet[1 - far].x + stance, y: feet[1 - far].y }, 22, 22, 1, 5); foot({ x: feet[1 - far].x + stance, y: feet[1 - far].y }, 5);
  limb(sh, hands[0], 18, 18, -1, 4.5);
  ctx.restore();
}
function car(ctx: Ctx, x: Logical, y: Logical, color: Color, s = 1): void {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(-40, 6); ctx.lineTo(-40, -8); ctx.lineTo(-24, -10); ctx.lineTo(-12, -24); ctx.lineTo(16, -24); ctx.lineTo(30, -10); ctx.lineTo(42, -6); ctx.lineTo(42, 6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = PAL.panel; ctx.beginPath(); ctx.arc(-24, 8, 8, 0, Math.PI * 2); ctx.arc(24, 8, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(-24, 8, 4, 0, Math.PI * 2); ctx.arc(24, 8, 4, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function plane(ctx: Ctx, x: Logical, y: Logical, color: Color, s = 1): void {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(44, 0); ctx.lineTo(-30, -10); ctx.lineTo(-44, -26); ctx.lineTo(-58, -26); ctx.lineTo(-44, 0); ctx.lineTo(-58, 26); ctx.lineTo(-44, 26); ctx.lineTo(-30, 10); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(6, -6); ctx.lineTo(-12, -50); ctx.lineTo(-24, -50); ctx.lineTo(-16, -6); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(6, 6); ctx.lineTo(-12, 50); ctx.lineTo(-24, 50); ctx.lineTo(-16, 6); ctx.closePath(); ctx.fill(); ctx.restore();
}
/* a dragster, its nose to the right and its wheels on (x, y): a long low body with the engine and
   the wing behind the driver, a big slick at the back and a small wheel at the front; its footprint
   at s = 1 is about 140 by 60 */
function dragster(ctx: Ctx, x: Logical, y: Logical, color: Color, s = 1): void {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = color; ctx.strokeStyle = color; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-62, 8); ctx.lineTo(-62, -14); ctx.lineTo(-40, -22); ctx.lineTo(-16, -22); ctx.lineTo(-6, -10); ctx.lineTo(50, -6); ctx.lineTo(68, 0); ctx.lineTo(68, 8); ctx.closePath(); ctx.fill();
  ctx.fillRect(-70, -40, 26, 5); ctx.fillRect(-52, -36, 4, 14);            /* the wing on its strut */
  ctx.beginPath(); ctx.arc(-40, 8, 16, 0, Math.PI * 2); ctx.fill();        /* the rear slick */
  ctx.beginPath(); ctx.arc(52, 12, 7, 0, Math.PI * 2); ctx.fill();         /* the front wheel */
  ctx.fillStyle = PAL.panel; ctx.beginPath(); ctx.arc(-40, 8, 6, 0, Math.PI * 2); ctx.arc(52, 12, 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-14, -22); ctx.lineTo(-8, -30); ctx.lineTo(-2, -22); ctx.closePath(); ctx.fill();   /* the driver's helmet */
  ctx.restore();
}
/* A locked view of a solid the book draws in perspective. The drawing layer has no
   3D primitive, so the projection is done here: a pinhole camera stands at a fixed
   yaw and pitch about the origin, dist away, and each face is lit by one fixed lamp
   from the upper left front. P takes a point [x, y, z] (y up, z toward the viewer)
   to the canvas, and shade takes a face's outward normal to the share of ink laid
   over the face colour. Any figure whose original is a perspective view can reuse
   it: choose the yaw and pitch that match the book's picture and never change them. */
function view({ yaw, pitch, dist, cx, cy }: ViewOpts): View {
  const e: Vec3 = [dist * Math.sin(yaw) * Math.cos(pitch), dist * Math.sin(pitch), dist * Math.cos(yaw) * Math.cos(pitch)];
  const unit = (v: Vec3): Vec3 => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
  const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dotp = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const f = unit([-e[0], -e[1], -e[2]]), r = unit(cross(f, [0, 1, 0])), u = cross(r, f), lamp = unit([-0.45, 0.85, 0.55]);
  return {
    P: (p: Vec3): Pt => { const q: Vec3 = [p[0] - e[0], p[1] - e[1], p[2] - e[2]], z = dotp(q, f); return [cx + dist * dotp(q, r) / z, cy - dist * dotp(q, u) / z]; },
    shade: (n: Vec3): number => 0.34 * (1 - Math.max(0, dotp(unit(n), lamp))),
  };
}
/* one face of the solid on the canvas: the face colour, then k of ink over it for its shading, then an outline of the given width; a null k fills nothing */
function face(ctx: Ctx, pts: readonly Pt[], k: number | null, stroke?: Logical): void {
  ctx.save(); ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
  if (k !== null) { ctx.fillStyle = PAL.soft; ctx.fill(); ctx.fillStyle = alpha(PAL.ink, k); ctx.fill(); }
  if (stroke) { ctx.strokeStyle = PAL.ink; ctx.lineWidth = stroke; ctx.lineJoin = 'round'; ctx.stroke(); }
  ctx.restore();
}
/* a coil spring between two points: n coils of half-width a */
function spring(ctx: Ctx, x1: Logical, y1: Logical, x2: Logical, y2: Logical, n: number, a: Logical, color: Color, w = 4): void {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, px = -uy, py = ux;
  const lead = Math.min(24, L * 0.1), seg = (L - 2 * lead) / (2 * n);
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + ux * lead, y1 + uy * lead);
  for (let i = 0; i < 2 * n; i++) { const s = lead + seg * (i + 0.5), side = i % 2 ? -1 : 1; ctx.lineTo(x1 + ux * s + px * a * side, y1 + uy * s + py * a * side); }
  ctx.lineTo(x2 - ux * lead, y2 - uy * lead); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
}
/* a block hanging from or resting against something, centred on (x, y) */
function block(ctx: Ctx, x: Logical, y: Logical, w: Logical, h: Logical, color: Color): void {
  ctx.save(); ctx.fillStyle = PAL.panel; ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.fillRect(x - w / 2, y - h / 2, w, h); ctx.strokeRect(x - w / 2, y - h / 2, w, h); ctx.restore();
}
/* a fixed surface: a beam, a clamp, a wall; hatched, with (x, y) its top-left corner */
function fixed(ctx: Ctx, x: Logical, y: Logical, w: Logical, h: Logical): void {
  ctx.save(); ctx.fillStyle = PAL.soft; ctx.fillRect(x, y, w, h); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.strokeStyle = PAL.muted; ctx.lineWidth = 2; ctx.beginPath(); for (let s = x - h; s < x + w; s += 14) { ctx.moveTo(s, y + h); ctx.lineTo(s + h, y); } ctx.stroke(); ctx.restore();
  line(ctx, x, y, x + w, y, PAL.muted, 3); line(ctx, x, y + h, x + w, y + h, PAL.muted, 3);
}

/* ---------- a scene's scale ----------
   A figure that must state one fixed scale — a track ruled in metres, a column of
   air a kilometre deep — works out its units per metre once, from the box the
   scene is drawn in and the greatest extents the sliders can reach, and never
   rescales afterwards. The scale is the smaller of the two fits, so nothing the
   sliders can do sends the scene past the box. */
export type Extents = { readonly w: number; readonly h: number };   /* the scene's greatest width and height, in metres */
function fitScale(box: Box, ext: Extents): number {
  const bw = Math.abs(box.r - box.l), bh = Math.abs(box.b - box.t);
  const kx = ext.w > 0 ? bw / ext.w : Infinity, ky = ext.h > 0 ? bh / ext.h : Infinity;
  const k = Math.min(kx, ky);
  return isFinite(k) ? k : 0;
}

/* ---------- a label on its own ----------
   The labeller places a whole figure's labels against one another. One label set
   beside one thing — the name of a body, a reading beside a gauge — needs no
   queue: `label` sets the text in a panel on the side asked for, keeps it inside
   the canvas whatever the sliders do, and draws a dotted leader back to the point
   where the clamp has moved it away. It returns the box it took, so a figure may
   hand that box to `note` or to `labeller.block`. */
type LabelOpts = { side?: BracketSide; size?: number; weight?: number; color?: Color; gap?: Logical; leader?: boolean; H?: Logical; bg?: Color };
function label(ctx: Ctx, s: string, x: Logical, y: Logical, o: LabelOpts = {}): Box {
  const sz = o.size ?? 20, gap = o.gap ?? 20, H = canvasH(ctx, o), side = o.side ?? 'above';
  const ux = side === 'left' ? -1 : side === 'right' ? 1 : 0, uy = side === 'above' ? -1 : side === 'below' ? 1 : 0;
  const align: CanvasTextAlign = ux < 0 ? 'right' : ux > 0 ? 'left' : 'center';
  const half = halfWidth(ctx, s, sz), bh = shownH(ctx, sz) + 8;
  let lx = x + ux * gap, ly = y + uy * gap;
  const l0 = align === 'center' ? lx - half : align === 'right' ? lx - 2 * half + 9 : lx - 9;
  const dx = l0 < 16 ? 16 - l0 : l0 + 2 * half > LW - 16 ? LW - 16 - l0 - 2 * half : 0;
  lx += dx;
  if (H > 0) ly = Math.min(Math.max(ly, 16 + bh / 2), H - 16 - bh / 2);
  const box: Box = { l: lx - (align === 'center' ? half : align === 'right' ? 2 * half - 9 : 9), r: 0, t: ly - bh / 2, b: ly + bh / 2 } as Box;
  const out: Box = { l: box.l, r: box.l + 2 * half, t: box.t, b: box.b };
  const d = Math.hypot(lx - x, ly - y);
  if ((o.leader ?? true) && d > 40) line(ctx, x + ((lx - x) / d) * 14, y + ((ly - y) / d) * 14, lx - ((lx - x) / d) * 16, ly - ((ly - y) / d) * 16, alpha(o.color ?? PAL.ink, 0.5), 1.5, [5, 6]);
  text(ctx, s, lx, ly, o.color ?? PAL.ink, { weight: o.weight ?? 600, size: sz, align, bg: o.bg ?? PAL.panel });
  return out;
}

/* ---------- a note in a clear corner of a graph ----------
   A sentence a graph carries — what the shaded area is, why the curve levels off —
   goes in whichever corner of the box nothing else has taken. The figure hands over
   the boxes already spoken for (the curve's own bounding box, a legend, a pinned
   marker) and the corner with the least overlap wins. Returns the box the note took. */
function note(ctx: Ctx, box: Box, s: string, avoid: readonly Box[] = [], size = 17): Box {
  const half = halfWidth(ctx, s, size), bh = shownH(ctx, size) + 8, pad = 12;
  const corners: readonly Pt[] = [[box.l + pad + half, box.t + pad + bh / 2], [box.r - pad - half, box.t + pad + bh / 2], [box.r - pad - half, box.b - pad - bh / 2], [box.l + pad + half, box.b - pad - bh / 2]];
  const boxAt = (p: Pt): Box => ({ l: p[0] - half, r: p[0] + half, t: p[1] - bh / 2, b: p[1] + bh / 2 });
  const overlap = (a: Box): number => avoid.reduce((sum, b) => sum + Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t)), 0);
  const best = corners.map(boxAt).reduce((a, b) => (overlap(b) < overlap(a) ? b : a));
  text(ctx, s, (best.l + best.r) / 2, (best.t + best.b) / 2, PAL.muted, { size, align: 'center', bg: PAL.panel });
  return best;
}

/* ---------- the arc of an angle ----------
   The angle at p between the directions a0 and a1, both counterclockwise from +x
   on the page, drawn as an arc of radius r with two faint arms and its name set
   outside the arc at the bisector. Given a labeller it queues the name there
   instead, so the angle's name takes its turn with the rest of the figure's text. */
function angleArc(ctx: Ctx, p: { x: Logical; y: Logical }, r: Logical, a0: number, a1: number, s?: string, lab?: Labeller, color?: Color): void {
  const c = color ?? PAL.ink;
  ctx.save(); ctx.strokeStyle = alpha(c, 0.9); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(p.x, p.y, r, -a0, -a1, a1 > a0); ctx.stroke(); ctx.restore();
  [a0, a1].forEach((a) => line(ctx, p.x, p.y, p.x + (r + 14) * Math.cos(a), p.y - (r + 14) * Math.sin(a), alpha(c, 0.35), 2, [6, 6]));
  if (!s) return;
  const m = (a0 + a1) / 2, ux = Math.cos(m), uy = -Math.sin(m);
  if (lab) lab.add(s, p.x + r * ux, p.y + r * uy, ux, uy, c, 20, 16);
  else text(ctx, s, p.x + (r + 20) * ux, p.y + (r + 20) * uy, c, { size: 20, weight: 600, align: ux < -0.3 ? 'right' : ux > 0.3 ? 'left' : 'center', bg: PAL.panel });
}

/* ---------- the silhouette ----------
   A person drawn as a filled body rather than a stick figure: a round head, a solid
   torso, and limbs that bend at the knee and the elbow toward the point each one
   reaches. The joints are given in a frame 150 units tall with the feet at the
   origin and the person facing +x; `face` of -1 turns the drawing round and `s`
   scales it, so a caller scales to the scene with `F.silhouette.height(s)`. The
   limbs are bodies, not lines, but they are never drawn heavier than 3 units, which
   keeps every one of them thinner than the force arrows set beside it. A pose names
   a set of joints; any joint given in the options overrides the pose's own. */
export type Joint = { x: Logical; y: Logical };
export type Pose = 'stand' | 'walk' | 'run' | 'lean' | 'crouch' | 'push' | 'pull' | 'sit' | 'reach';
/* The side each knee is thrown to: one sign for both legs, or one for the near leg and
   one for the far leg, which is what a frontal crouch needs. */
export type KneeSide = number | readonly [number, number];
type Skeleton = { hip: Joint; shoulder: Joint; head: Joint; feet: readonly [Joint, Joint]; hands: readonly [Joint, Joint]; kneeSide?: KneeSide; elbowSide?: number };
type SilhouetteOpts = Partial<Skeleton> & { x: Logical; y: Logical; s?: number; face?: number; pose?: Pose; color?: Color; phase?: number; front?: boolean };
const SIL_H = 150;
const ARM = 60;                  /* the reach of an arm, shoulder to hand */
const POSES: Readonly<Record<Pose, Skeleton>> = {
  stand: { hip: { x: 0, y: -72 }, shoulder: { x: 2, y: -118 }, head: { x: 6, y: -140 }, feet: [{ x: 9, y: 0 }, { x: -9, y: 0 }], hands: [{ x: 9, y: -76 }, { x: -6, y: -76 }] },
  walk: { hip: { x: 0, y: -72 }, shoulder: { x: 4, y: -118 }, head: { x: 9, y: -140 }, feet: [{ x: 24, y: 0 }, { x: -24, y: 0 }], hands: [{ x: 20, y: -76 }, { x: -16, y: -80 }] },
  run: { hip: { x: -4, y: -74 }, shoulder: { x: 18, y: -114 }, head: { x: 28, y: -134 }, feet: [{ x: 32, y: -10 }, { x: -30, y: -4 }], hands: [{ x: 36, y: -96 }, { x: -22, y: -92 }] },
  lean: { hip: { x: 0, y: -70 }, shoulder: { x: 22, y: -110 }, head: { x: 33, y: -128 }, feet: [{ x: 10, y: 0 }, { x: -24, y: 0 }], hands: [{ x: 44, y: -96 }, { x: 40, y: -88 }] },
  crouch: { hip: { x: 0, y: -54 }, shoulder: { x: 8, y: -98 }, head: { x: 14, y: -118 }, feet: [{ x: 15, y: 0 }, { x: -15, y: 0 }], hands: [{ x: 28, y: -70 }, { x: 22, y: -66 }] },
  push: { hip: { x: 2, y: -68 }, shoulder: { x: 26, y: -108 }, head: { x: 37, y: -126 }, feet: [{ x: 8, y: 0 }, { x: -34, y: 0 }], hands: [{ x: 56, y: -100 }, { x: 58, y: -92 }] },
  pull: { hip: { x: 4, y: -68 }, shoulder: { x: 22, y: -110 }, head: { x: 34, y: -130 }, feet: [{ x: 30, y: 0 }, { x: -32, y: 0 }], hands: [{ x: 50, y: -98 }, { x: 54, y: -92 }] },
  sit: { hip: { x: -10, y: -46 }, shoulder: { x: -6, y: -92 }, head: { x: -2, y: -112 }, feet: [{ x: 36, y: 0 }, { x: 28, y: 0 }], hands: [{ x: 8, y: -52 }, { x: 2, y: -50 }] },
  reach: { hip: { x: 0, y: -72 }, shoulder: { x: 4, y: -116 }, head: { x: 10, y: -136 }, feet: [{ x: 10, y: 0 }, { x: -12, y: 0 }], hands: [{ x: 38, y: -148 }, { x: 32, y: -144 }] },
};
/* How far the feet and the hands swing, and how high the leading foot lifts, in the two
   poses that carry a stride. `phase` runs 0 to 1 over one full cycle: at 0 the figure
   stands square, at a quarter the near foot is forward and the near hand back. */
const STRIDE: Partial<Record<Pose, { foot: Logical; hand: Logical; lift: Logical }>> = {
  walk: { foot: 24, hand: 18, lift: 6 },
  run: { foot: 32, hand: 30, lift: 12 },
};
/* the bend of a two-segment limb from a to b, lengths l1 and l2, the joint thrown to the side given */
function bend(a: Joint, b: Joint, l1: number, l2: number, side: number): Joint {
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
  if (L >= l1 + l2) return { x: a.x + (dx * l1) / (l1 + l2), y: a.y + (dy * l1) / (l1 + l2) };
  const q = (l1 * l1 - l2 * l2 + L * L) / (2 * L), h = Math.sqrt(Math.max(0, l1 * l1 - q * q));
  return { x: a.x + (dx * q) / L - (dy * h * side) / L, y: a.y + (dy * q) / L + (dx * h * side) / L };
}
/* A hand asked for beyond the arm's reach is brought back to the reach along the same
   direction, so an arm never straightens into a line longer than the body it belongs to:
   a figure may name any grip it likes and the drawing stays a person. */
const capped = (a: Joint, b: Joint, reach: number): Joint => {
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy);
  return L <= reach ? b : { x: a.x + (dx / L) * reach, y: a.y + (dy / L) * reach };
};
/* a joint the caller named, ignoring one passed as undefined so that a figure may write
   `kneeSide: front ? 1 : undefined` without losing the pose's own joint */
const given = <T>(v: T | undefined, fallback: T): T => (v === undefined ? fallback : v);
/* the feet and hands of a stride at phase p, where the pose carries one and the caller has not set them */
function strideOf(pose: Pose, base: Skeleton, p: number): Pick<Skeleton, 'feet' | 'hands'> {
  const st = STRIDE[pose]; if (!st) return { feet: base.feet, hands: base.hands };
  const sw = Math.sin(p * 2 * Math.PI), sx = base.shoulder.x;
  return {
    feet: [{ x: st.foot * sw, y: -st.lift * Math.max(0, sw) }, { x: -st.foot * sw, y: -st.lift * Math.max(0, -sw) }],
    hands: [{ x: sx - st.hand * sw, y: base.hands[0].y }, { x: sx + st.hand * sw, y: base.hands[1].y }],
  };
}
function drawSilhouette(ctx: Ctx, o: SilhouetteOpts): void {
  const pose = o.pose ?? 'stand', base = POSES[pose], s = o.s ?? 1, face = o.face ?? 1, color = o.color ?? PAL.ink;
  const swung = o.phase === undefined ? { feet: base.feet, hands: base.hands } : strideOf(pose, base, o.phase);
  const hip = given(o.hip, base.hip), shoulder = given(o.shoulder, base.shoulder);
  const feet = given(o.feet, swung.feet), hands0 = given(o.hands, swung.hands);
  const P: Skeleton = {
    hip, shoulder, head: given(o.head, base.head), feet,
    hands: [capped(shoulder, hands0[0], ARM), capped(shoulder, hands0[1], ARM)],
    kneeSide: given(o.kneeSide, base.kneeSide), elbowSide: given(o.elbowSide, base.elbowSide),
  };
  /* the limb stroke is set in canvas units and never passes 3, so every limb stays thinner than a force arrow */
  const W = Math.min(3, 3 * s) / (s || 1);
  ctx.save(); ctx.translate(o.x, o.y); ctx.scale(s * face, s); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const limb = (a: Joint, b: Joint, l1: number, l2: number, side: number, k: number): void => {
    const j = bend(a, b, l1, l2, side); ctx.lineWidth = W * k; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(j.x, j.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  };
  /* one knee side for both legs, or one apiece; `front` splays them outward, which is
     how a crouch reads when the figure faces the reader rather than the side */
  const ks = P.kneeSide ?? (o.front ? ([1, -1] as const) : -1), es = P.elbowSide ?? 1;
  const knee = (i: number): number => (typeof ks === 'number' ? ks : ks[i]);
  limb(P.hip, P.feet[1], 38, 38, knee(1), 2.6); limb(P.shoulder, P.hands[1], 30, 30, es, 2.1);
  const tx = P.shoulder.x - P.hip.x, ty = P.shoulder.y - P.hip.y, L = Math.hypot(tx, ty) || 1, nx = -ty / L, ny = tx / L;
  ctx.lineWidth = W; ctx.beginPath();
  ctx.moveTo(P.hip.x + nx * 7, P.hip.y + ny * 7); ctx.lineTo(P.shoulder.x + nx * 11, P.shoulder.y + ny * 11);
  ctx.lineTo(P.shoulder.x - nx * 11, P.shoulder.y - ny * 11); ctx.lineTo(P.hip.x - nx * 7, P.hip.y - ny * 7); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.lineWidth = W * 2; ctx.beginPath(); ctx.moveTo(P.shoulder.x, P.shoulder.y); ctx.lineTo(P.head.x, P.head.y); ctx.stroke();
  ctx.beginPath(); ctx.arc(P.head.x, P.head.y, 12, 0, Math.PI * 2); ctx.fill();
  limb(P.hip, P.feet[0], 38, 38, knee(0), 3); limb(P.shoulder, P.hands[0], 30, 30, es, 2.4);
  ctx.restore();
}
/* `F.silhouette.height(s)` is the person's height in canvas units, so a scene with a
   scale of its own places the feet and asks the library how tall the drawing stands.
   `F.silhouette.reach(s)` is how far a hand may be set from the shoulder, and a hand
   set further is drawn at the reach. */
const silhouette = Object.assign(drawSilhouette, {
  height: (s = 1): Logical => SIL_H * s,
  reach: (s = 1): Logical => ARM * s,
  pose: (p: Pose): Skeleton => POSES[p],
});

/* ---------- sprites with a stated footprint ----------
   Each takes its place and its size and draws in ink unless a colour is given, so a
   figure never carries the body itself. The footprint is the rectangle the drawing
   fills, which is what a caller needs to set its arrows and labels clear of it. */
/* a wooden crate centred on (x, y), filling w by h: a framed box of horizontal planks with a batten down each end */
function crate(ctx: Ctx, x: Logical, y: Logical, w: Logical, h: Logical, color?: Color): void {
  const c = color ?? PAL.ink, l = x - w / 2, t = y - h / 2;
  ctx.save(); ctx.fillStyle = PAL.panel; ctx.strokeStyle = c; ctx.lineWidth = 4; ctx.lineJoin = 'round';
  ctx.fillRect(l, t, w, h); ctx.strokeRect(l, t, w, h);
  ctx.strokeStyle = PAL.muted; ctx.lineWidth = 2;
  ctx.beginPath(); for (let i = 1; i < 4; i++) { ctx.moveTo(l + 4, t + (h * i) / 4); ctx.lineTo(l + w - 4, t + (h * i) / 4); } ctx.stroke();
  ctx.strokeStyle = c; ctx.lineWidth = 3;
  const b = Math.min(22, w / 5);
  ctx.beginPath(); ctx.moveTo(l + b, t + 2); ctx.lineTo(l + b, t + h - 2); ctx.moveTo(l + w - b, t + 2); ctx.lineTo(l + w - b, t + h - 2); ctx.stroke();
  ctx.restore();
}
/* a house standing on (x, y) — the ground line — w wide, with `stories` stories.
   Its footprint is w by the height returned: 0.62 w a story and a roof half as wide again. */
function house(ctx: Ctx, x: Logical, y: Logical, w: Logical, stories = 1, color?: Color): Logical {
  const c = color ?? PAL.ink, sh = w * 0.62, wallH = sh * Math.max(1, stories), roof = w * 0.5, H = wallH + roof;
  ctx.save(); ctx.fillStyle = PAL.panel; ctx.strokeStyle = c; ctx.lineWidth = 4;
  ctx.fillRect(x - w / 2, y - wallH, w, wallH); ctx.strokeRect(x - w / 2, y - wallH, w, wallH);
  ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x - w / 2 - 8, y - wallH); ctx.lineTo(x, y - wallH - roof); ctx.lineTo(x + w / 2 + 8, y - wallH); ctx.closePath(); ctx.fill();
  ctx.fillRect(x - w * 0.11, y - sh * 0.52, w * 0.22, sh * 0.52);                             /* the door */
  for (let i = 1; i < Math.max(1, stories); i++) { ctx.fillRect(x - w * 0.34, y - sh * i - sh * 0.46, w * 0.2, sh * 0.26); ctx.fillRect(x + w * 0.14, y - sh * i - sh * 0.46, w * 0.2, sh * 0.26); }
  ctx.restore();
  return H;
}
/* a shopfront standing on (x, y), w by h, its name on the sign above a scalloped awning */
function shopfront(ctx: Ctx, x: Logical, y: Logical, w: Logical, h: Logical, name = 'CAFÉ', color?: Color): void {
  const c = color ?? PAL.ink, l = x - w / 2, t = y - h, sign = h * 0.2;
  ctx.save(); ctx.fillStyle = PAL.panel; ctx.strokeStyle = c; ctx.lineWidth = 3;
  ctx.fillRect(l, t + sign, w, h - sign); ctx.strokeRect(l, t + sign, w, h - sign);            /* the front */
  ctx.fillStyle = c; ctx.fillRect(l - w * 0.06, t, w * 1.12, sign);                            /* the sign */
  const n = Math.max(3, Math.round(w / 17)), r = (w * 1.12) / (2 * n);
  ctx.beginPath(); for (let i = 0; i < n; i++) ctx.arc(l - w * 0.06 + r + 2 * r * i, t + sign + h * 0.13, r, 0, Math.PI); ctx.fill();   /* the awning */
  ctx.fillRect(x - w * 0.13, y - h * 0.36, w * 0.26, h * 0.36);                                /* the door */
  ctx.strokeRect(x + w * 0.2, y - h * 0.33, w * 0.2, h * 0.17);                                /* the window */
  ctx.restore();
  text(ctx, name, x, t + sign / 2, PAL.panel, { size: Math.max(9, sign * 0.7), weight: 700, align: 'center' });
}
/* a horse standing on (x, y) at scale s, `phase` running its gallop and `face` of -1 turning it round;
   its footprint at s = 1 is about 156 by 120 */
function horse(ctx: Ctx, x: Logical, y: Logical, s = 1, phase = 0, color?: Color, face = 1): void {
  const c = color ?? PAL.ink, sw = Math.sin(phase) * 16;
  ctx.save(); ctx.translate(x, y); ctx.scale(s * face, s); ctx.fillStyle = c; ctx.strokeStyle = c; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.lineWidth = 6; ctx.beginPath();                                                          /* the legs, so the barrel covers their tops */
  ctx.moveTo(-36, -40); ctx.lineTo(-44 - sw, -18); ctx.lineTo(-48 - sw * 1.4, 0);
  ctx.moveTo(-24, -40); ctx.lineTo(-18 + sw * 0.6, -18); ctx.lineTo(-14 + sw, 0);
  ctx.moveTo(26, -40); ctx.lineTo(22 - sw * 0.6, -18); ctx.lineTo(16 - sw, 0);
  ctx.moveTo(40, -40); ctx.lineTo(48 + sw, -18); ctx.lineTo(54 + sw * 1.4, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-32, -66); ctx.lineTo(32, -66); ctx.quadraticCurveTo(46, -66, 46, -50); ctx.quadraticCurveTo(46, -34, 32, -34); ctx.lineTo(-32, -34); ctx.quadraticCurveTo(-46, -34, -46, -50); ctx.quadraticCurveTo(-46, -66, -32, -66); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(30, -62); ctx.quadraticCurveTo(48, -80, 58, -104); ctx.lineTo(72, -108); ctx.lineTo(84, -96); ctx.lineTo(84, -86); ctx.lineTo(66, -84); ctx.quadraticCurveTo(56, -72, 46, -46); ctx.closePath(); ctx.fill();
  ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(64, -106); ctx.lineTo(60, -118); ctx.moveTo(72, -108); ctx.lineTo(74, -120); ctx.stroke();   /* the ears */
  ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(40, -74); ctx.quadraticCurveTo(48, -88, 60, -104); ctx.stroke();                            /* the mane */
  ctx.beginPath(); ctx.moveTo(-44, -60); ctx.quadraticCurveTo(-66, -56, -72, -30 + sw * 0.3); ctx.stroke();                                  /* the tail */
  ctx.restore();
}
/* a helicopter seen from above, centred on (x, y) at scale s, its nose turned to `a` radians
   counterclockwise on the page and its rotor to `r`; its footprint at s = 1 is about 150 by 88 */
function helicopterTop(ctx: Ctx, x: Logical, y: Logical, s = 1, a = 0, r = 0, color?: Color): void {
  const c = color ?? PAL.ink;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-a); ctx.fillStyle = c; ctx.strokeStyle = c; ctx.lineCap = 'round';
  ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-14, -20); ctx.lineTo(14, -20); ctx.moveTo(-14, 20); ctx.lineTo(14, 20); ctx.stroke();      /* the skids */
  ctx.beginPath(); ctx.moveTo(24, 0); ctx.quadraticCurveTo(22, -16, 4, -16); ctx.lineTo(-18, -12); ctx.lineTo(-18, 12); ctx.lineTo(4, 16); ctx.quadraticCurveTo(22, 16, 24, 0); ctx.closePath(); ctx.fill();
  ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-62, 0); ctx.stroke();                                                  /* the tail boom */
  ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-62, -14); ctx.lineTo(-62, 14); ctx.moveTo(-58, -4); ctx.lineTo(-66, -4); ctx.stroke();
  ctx.fillStyle = alpha(c, 0.12); ctx.beginPath(); ctx.arc(0, 0, 44, 0, Math.PI * 2); ctx.fill();                                            /* the rotor disc */
  ctx.rotate(r); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-44, 0); ctx.lineTo(44, 0); ctx.moveTo(0, -44); ctx.lineTo(0, 44); ctx.stroke();
  ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
/* a rowing boat seen from above, centred on (x, y) at scale s, its bow along `heading` degrees
   counterclockwise from +x; its footprint at s = 1 is about 64 by 66, oars included */
function rowboat(ctx: Ctx, x: Logical, y: Logical, s = 1, heading = 0, color?: Color): void {
  const c = color ?? PAL.ink;
  ctx.save(); ctx.translate(x, y); ctx.rotate((-heading * Math.PI) / 180); ctx.scale(s, s); ctx.fillStyle = c; ctx.strokeStyle = c; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(34, 0); ctx.quadraticCurveTo(14, -14, -20, -14); ctx.quadraticCurveTo(-30, -14, -30, 0); ctx.quadraticCurveTo(-30, 14, -20, 14); ctx.quadraticCurveTo(14, 14, 34, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = PAL.panel; ctx.beginPath(); ctx.moveTo(24, 0); ctx.quadraticCurveTo(10, -8, -18, -8); ctx.quadraticCurveTo(-24, -8, -24, 0); ctx.quadraticCurveTo(-24, 8, -18, 8); ctx.quadraticCurveTo(10, 8, 24, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = c; ctx.fillRect(-6, -8, 5, 16); ctx.fillRect(12, -8, 4, 16);                                                               /* two thwarts */
  ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(2, -10); ctx.lineTo(-14, -30); ctx.moveTo(2, 10); ctx.lineTo(-14, 30); ctx.stroke();        /* the oars */
  ctx.beginPath(); ctx.ellipse(-16, -33, 6, 3, 0.9, 0, Math.PI * 2); ctx.ellipse(-16, 33, 6, 3, -0.9, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
/* a sailing boat whose waterline is at (x, y), at scale s; its footprint at s = 1 is about 78 by 76 */
function sailboat(ctx: Ctx, x: Logical, y: Logical, s = 1, color?: Color): void {
  const c = color ?? PAL.ink;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = c; ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-38, 0); ctx.lineTo(40, 0); ctx.lineTo(30, 14); ctx.quadraticCurveTo(0, 20, -26, 14); ctx.closePath(); ctx.fill();   /* the hull */
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -56); ctx.stroke();                                                                             /* the mast */
  ctx.fillStyle = PAL.panel; ctx.beginPath(); ctx.moveTo(3, -52); ctx.lineTo(34, -8); ctx.lineTo(3, -8); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-3, -44); ctx.lineTo(-30, -8); ctx.lineTo(-3, -8); ctx.closePath(); ctx.fill(); ctx.stroke();                         /* the jib */
  ctx.restore();
}
/* a skydiver spread-eagled, belly to the earth and seen from below, centred on (x, y) at scale s;
   its footprint at s = 1 is about 92 by 112 */
function skydiver(ctx: Ctx, x: Logical, y: Logical, s = 1, color?: Color): void {
  const c = color ?? PAL.ink;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const limb = (pts: readonly (readonly number[])[], w: number): void => { ctx.lineWidth = w; ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke(); };
  limb([[-11, -24], [-30, -34], [-46, -50]], 8); limb([[11, -24], [30, -34], [46, -50]], 8);
  limb([[-7, 10], [-22, 30], [-36, 54]], 9); limb([[7, 10], [22, 30], [36, 54]], 9);
  ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(-11, -26); ctx.lineTo(11, -26); ctx.lineTo(8, 12); ctx.lineTo(-8, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, -44, 12, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/* a fist gripping at (x, y) with the forearm reaching back along the unit vector (ux, uy):
   a tapered forearm, a rounded fist, the knuckles along its leading edge and a thumb closed
   over the grip. The grip point is the drawing's origin, so a figure sets it on the bar, the
   rope or the rim it holds; its footprint at s = 1 reaches about 40 units ahead of the grip
   and 115 back along (ux, uy), and about 25 either side. */
function fist(ctx: Ctx, x: Logical, y: Logical, ux: number, uy: number, s = 1, color?: Color): void {
  const L = Math.hypot(ux, uy) || 1, vx = ux / L, vy = uy / L, px = -vy, py = vx;
  const c = color ?? PAL.ink, ang = Math.atan2(vy, vx);
  const P = (a: number, b: number): readonly [Logical, Logical] => [x + vx * a * s + px * b * s, y + vy * a * s + py * b * s];
  ctx.save(); ctx.fillStyle = PAL.panel; ctx.strokeStyle = c; ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(...P(26, 15)); ctx.lineTo(...P(112, 12)); ctx.lineTo(...P(112, -12)); ctx.lineTo(...P(26, -15)); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(...P(12, 0), 23 * s, 19 * s, ang, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  for (const b of [-11, 0, 11]) { ctx.beginPath(); ctx.arc(...P(-8, b), 5 * s, ang + Math.PI / 2, ang + (3 * Math.PI) / 2); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(...P(14, -16)); ctx.quadraticCurveTo(...P(-6, -22), ...P(-10, -4)); ctx.stroke();
  ctx.restore();
}
/* The same hand flat (hand.ts), its wrist at (x, y) and its straight fingers along `aim`, about 110
   units wrist to fingertip at s = 1. `view` is the side the reader sees: the palm, the back, or the
   side, where the palm faces aim turned a quarter clockwise and the curl shows in profile. Each
   finger, the thumb and the palm are outlined where nothing nearer covers them, the way the 3D
   hand's back-face rim falls, and the whole is filled once at half opacity. */
export type HandView = 'palm' | 'back' | 'side';
export type Hand2Opts = { aim?: readonly [number, number]; view?: HandView; curl?: number; thumb?: Thumb; right?: boolean; s?: number; color?: Color; ink?: Color };
const HAND_PX = 240, HAND_LW = 3;
type HandShape = { depth: number; trace: (c: Ctx) => void };
function handShapes(x: Logical, y: Logical, o: Hand2Opts): HandShape[] {
  const [ax, ay] = o.aim ?? [0, -1], al = Math.hypot(ax, ay) || 1, A: Vec3 = [ax / al, ay / al, 0], k = HAND_PX * (o.s ?? 1);
  const N: Vec3 = o.view === 'back' ? [0, 0, 1] : o.view === 'side' ? [-A[1], A[0], 0] : [0, 0, -1];
  const Y = o.right === false ? cross3(N, A) : cross3(A, N), Z = V3.mul(N, -1);
  const W = (p: Vec3): Vec3 => V3.add(V3.add(V3.mul(A, p[0]), V3.mul(Y, p[1])), V3.mul(Z, p[2]));
  const at = (p: Vec3): Vec3 => { const w = W(p); return [x + w[0] * k, y + w[1] * k, w[2]]; };
  const shapeOf = (p: HandPart): HandShape => {
    if ('c' in p) {
      const c = at(p.c), v = [W([p.r[0], 0, 0]), W([0, p.r[1], 0]), W([0, 0, p.r[2]])].map((u) => [u[0] * k, u[1] * k]);
      const sxx = v.reduce((t, u) => t + u[0] * u[0], 0), syy = v.reduce((t, u) => t + u[1] * u[1], 0), sxy = v.reduce((t, u) => t + u[0] * u[1], 0);
      const th = 0.5 * Math.atan2(2 * sxy, sxx - syy), m = (sxx + syy) / 2, d = Math.hypot((sxx - syy) / 2, sxy);
      const R1 = Math.sqrt(m + d), R2 = Math.sqrt(Math.max(0, m - d));
      return { depth: c[2], trace: (g) => { g.moveTo(c[0] + R1 * Math.cos(th), c[1] + R1 * Math.sin(th)); g.ellipse(c[0], c[1], R1, R2, th, 0, Math.PI * 2); } };
    }
    const a = at(p.a), b = at(p.b), r = p.r * k, t = Math.atan2(b[1] - a[1], b[0] - a[0]);
    return { depth: (a[2] + b[2]) / 2, trace: (g) => {
      g.moveTo(a[0] + r * Math.cos(t + Math.PI / 2), a[1] + r * Math.sin(t + Math.PI / 2));
      g.arc(a[0], a[1], r, t + Math.PI / 2, t + (3 * Math.PI) / 2); g.arc(b[0], b[1], r, t - Math.PI / 2, t + Math.PI / 2); g.closePath();
    } };
  };
  const bodies = new Map<HandBody, HandShape[]>();
  handParts(o).forEach((p) => { const b = p.body === 'wrist' ? 'palm' : p.body; bodies.set(b, [...(bodies.get(b) ?? []), shapeOf(p)]); });
  return [...bodies.values()]
    .map((ss) => ({ depth: ss.reduce((t, q) => t + q.depth, 0) / ss.length, trace: (g: Ctx) => ss.forEach((q) => q.trace(g)) }))
    .sort((p, q) => q.depth - p.depth);
}
let handScratch: HTMLCanvasElement | null = null;
/* a context over a scratch canvas the size of c, under the same transform, cleared */
function scratchOver(ctx: Ctx): Ctx | null {
  const c = (ctx as { canvas?: unknown }).canvas;
  if (!inPage(c)) return null;
  handScratch ??= document.createElement('canvas');
  if (handScratch.width !== c.width || handScratch.height !== c.height) { handScratch.width = c.width; handScratch.height = c.height; }
  const g = handScratch.getContext('2d'); if (!g) return null;
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, c.width, c.height);
  g.setTransform(ctx.getTransform()); return g;
}
function hand2(ctx: Ctx, x: Logical, y: Logical, o: Hand2Opts = {}): void {
  const shapes = handShapes(x, y, o), ink = o.ink ?? PAL.ink, fill = o.color ?? PAL.muted;
  const all = (g: Ctx): void => { g.beginPath(); shapes.forEach((q) => q.trace(g)); };
  const g = scratchOver(ctx);
  if (!g) {
    ctx.save(); ctx.globalAlpha *= 0.5; ctx.fillStyle = fill; all(ctx); ctx.fill(); ctx.globalAlpha /= 0.5;
    ctx.strokeStyle = ink; ctx.lineWidth = HAND_LW; ctx.lineJoin = 'round';
    shapes.forEach((q) => { ctx.beginPath(); q.trace(ctx); ctx.stroke(); }); ctx.restore(); return;
  }
  g.lineJoin = 'round'; g.lineWidth = 2 * HAND_LW; g.strokeStyle = ink; g.fillStyle = '#000';
  shapes.forEach((q) => {
    g.beginPath(); q.trace(g);
    g.globalCompositeOperation = 'source-over'; g.stroke();
    g.globalCompositeOperation = 'destination-out'; g.fill();
  });
  g.globalCompositeOperation = 'destination-over'; g.globalAlpha = 0.5; g.fillStyle = fill; all(g); g.fill();
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(handScratch!, 0, 0); ctx.restore();
}
/* a cart in side view: a body w by h whose floor rests on two wheels, centred on (x, y) with
   the wheels standing on the line y + h / 2. Its footprint is w by h + 2 r, the wheels a
   twelfth of the width, so a caller puts the track at y + h / 2 + 2 r. */
function cart(ctx: Ctx, x: Logical, y: Logical, w: Logical, h: Logical, color?: Color): void {
  const c = color ?? PAL.ink, r = Math.max(6, Math.min(w, h) / 6);
  block(ctx, x, y, w, h, c);
  ctx.save(); ctx.fillStyle = c; ctx.beginPath();
  ctx.arc(x - w / 2 + r + 4, y + h / 2 + r, r, 0, Math.PI * 2); ctx.arc(x + w / 2 - r - 4, y + h / 2 + r, r, 0, Math.PI * 2);
  ctx.fill(); ctx.restore();
}
/* a person seen from above at (x, y), s times the base size: the shoulders as a lens across
   `heading` radians counterclockwise from +x, the head on them, and the arms reaching to the
   two points given, in canvas units. Its footprint at s = 1 is about 56 by 26, the reach apart. */
function personTop(ctx: Ctx, x: Logical, y: Logical, s = 1, heading = 0, color?: Color, reach?: readonly [Joint, Joint]): void {
  const c = color ?? PAL.ink, ux = Math.cos(heading), uy = Math.sin(heading), px = -uy, py = ux;
  const L: Joint = { x: x + px * 24 * s, y: y + py * 24 * s }, R: Joint = { x: x - px * 24 * s, y: y - py * 24 * s };
  ctx.save(); ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineCap = 'round'; ctx.lineWidth = 3;
  if (reach) for (const [sh, to] of [[L, reach[0]], [R, reach[1]]] as const) { ctx.lineWidth = 7 * Math.min(1, s); ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(to.x, to.y); ctx.stroke(); }
  ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, 26 * s, 11 * s, heading + Math.PI / 2, 0, Math.PI * 2); ctx.fill();   /* the lens lies across the heading, where the arms leave */
  ctx.fillStyle = PAL.panel; ctx.beginPath(); ctx.arc(x + ux * 3 * s, y + uy * 3 * s, 12 * s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.restore();
}
/* a motorcycle in side view facing right, its wheel hubs on the line y and its wheelbase s
   times the base 300 units: two wheels, a swing arm and a fork, an engine, a tank, a seat,
   fenders, a headlight, handlebars, an exhaust and a footpeg. (x, y) is the rear hub, and its
   footprint at s = 1 is about 330 wide and 200 tall, the wheels of radius 52 included. */
function motorcycle(ctx: Ctx, x: Logical, y: Logical, s = 1, color?: Color): void {
  const c = color ?? PAL.ink;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const rw = 52, rear = 0, front = 300, bx = 150;
  ctx.strokeStyle = c; ctx.fillStyle = PAL.soft;
  for (const h of [rear, front]) { ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(h, 0, rw, 0, Math.PI * 2); ctx.stroke(); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(h, 0, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  line(ctx, rear, 0, bx - 46, -34, c, 7);                                        /* the swing arm */
  line(ctx, front, 0, front - 34, -116, c, 7);                                   /* the fork */
  ctx.strokeStyle = c; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.arc(rear, 0, rw + 12, -2.55, -0.75); ctx.stroke();        /* the rear fender */
  ctx.beginPath(); ctx.arc(front, 0, rw + 12, -2.45, -0.55); ctx.stroke();       /* the front fender */
  line(ctx, bx - 4, -12, rear + 34, -2, c, 8);                                   /* the exhaust */
  ctx.fillStyle = PAL.soft; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.rect(bx - 62, -74, 104, 64); ctx.fill(); ctx.stroke();    /* the engine */
  ctx.beginPath(); ctx.moveTo(bx - 32, -84); ctx.lineTo(bx - 32, -100); ctx.quadraticCurveTo(bx + 14, -134, bx + 84, -106);
  ctx.lineTo(bx + 78, -84); ctx.closePath(); ctx.fill(); ctx.stroke();           /* the tank */
  ctx.fillStyle = c;
  ctx.beginPath(); ctx.moveTo(bx - 30, -100); ctx.lineTo(bx - 138, -92); ctx.quadraticCurveTo(bx - 152, -108, bx - 130, -112);
  ctx.lineTo(bx - 34, -110); ctx.closePath(); ctx.fill();                        /* the seat */
  ctx.fillStyle = PAL.soft; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(front - 40, -126, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke();   /* the headlight */
  line(ctx, front - 66, -118, front - 14, -128, c, 6);                           /* the handlebars */
  line(ctx, bx - 4, 4, bx + 24, 4, c, 5);                                        /* the footpeg */
  ctx.restore();
}
/* a helicopter in side view, nose to the right, centred on its cabin at (x, y) at scale s; the
   main rotor is a bar the caller may turn by drawing over it. Its footprint at s = 1 is about
   215 by 110, from the tail rotor to the nose and from the rotor disc to the skids. */
function helicopterSide(ctx: Ctx, x: Logical, y: Logical, s = 1, color?: Color): void {
  const c = color ?? PAL.ink;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = PAL.soft; ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-40, -12); ctx.lineTo(-152, -2); ctx.lineTo(-152, 8); ctx.lineTo(-36, 20); ctx.closePath(); ctx.fill(); ctx.stroke();       /* the tail boom */
  ctx.beginPath(); ctx.moveTo(-150, -2); ctx.lineTo(-162, -44); ctx.lineTo(-142, -44); ctx.lineTo(-136, -2); ctx.closePath(); ctx.fill(); ctx.stroke();   /* the fin */
  ctx.beginPath(); ctx.moveTo(-152, -26); ctx.lineTo(-152, -62); ctx.stroke();                                                   /* the tail rotor */
  ctx.fillStyle = c; ctx.beginPath(); ctx.arc(-152, -44, 3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = PAL.soft;
  ctx.beginPath(); ctx.moveTo(-48, -30); ctx.quadraticCurveTo(20, -42, 60, -12); ctx.quadraticCurveTo(80, 10, 52, 28);           /* the cabin */
  ctx.lineTo(-30, 30); ctx.quadraticCurveTo(-58, 22, -48, -30); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = alpha(c, 0.28); ctx.beginPath(); ctx.moveTo(6, -32); ctx.quadraticCurveTo(46, -30, 64, -8); ctx.lineTo(6, -8); ctx.closePath(); ctx.fill();   /* the window */
  ctx.strokeStyle = c; ctx.beginPath(); ctx.moveTo(-20, 30); ctx.lineTo(-26, 46); ctx.moveTo(28, 30); ctx.lineTo(34, 46); ctx.moveTo(-46, 46); ctx.lineTo(56, 46); ctx.stroke();   /* the skids */
  ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-2, -34); ctx.lineTo(-2, -44); ctx.moveTo(-58, -44); ctx.lineTo(54, -44); ctx.stroke();                 /* the mast and the rotor */
  ctx.restore();
}
/* a roller-coaster car with one rider in side view, its wheels on the rail at (x, y) and its
   floor level; its footprint at s = 1 is about 62 wide and 58 tall above the rail. A car on a
   banked or looping rail is drawn by turning the context about (x, y) first. */
function coasterCar(ctx: Ctx, x: Logical, y: Logical, s = 1, color?: Color): void {
  const c = color ?? PAL.ink;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = c; ctx.fillStyle = PAL.panel; ctx.lineWidth = 3; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(-30, -6); ctx.lineTo(-26, -34); ctx.lineTo(26, -34); ctx.lineTo(30, -6); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = c; ctx.beginPath(); ctx.arc(-18, -4, 5, 0, Math.PI * 2); ctx.arc(18, -4, 5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(2, -48, 8, 0, Math.PI * 2); ctx.fill();                                    /* the rider's head */
  ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(2, -40); ctx.lineTo(2, -30); ctx.stroke();
  ctx.restore();
}
/* a cardboard box centred on (x, y), filling w by h on the front face, with the lid's flaps and
   the tape drawn in perspective above it. Its footprint is w + h / 4 by h + h / 4, the perspective
   depth running up and to the right, so a caller that must clear the whole drawing allows for it. */
function cardboardBox(ctx: Ctx, x: Logical, y: Logical, w: Logical, h: Logical, color?: Color): void {
  const c = color ?? PAL.ink, l = x - w / 2, r = x + w / 2, t = y - h / 2, b = y + h / 2, dp = Math.max(8, h / 4);
  ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.lineJoin = 'round';
  ctx.fillStyle = PAL.soft; ctx.beginPath(); ctx.rect(l, t, w, h); ctx.fill(); ctx.stroke();
  ctx.fillStyle = alpha(c, 0.35); ctx.beginPath(); ctx.moveTo(r, t); ctx.lineTo(r + dp, t - dp); ctx.lineTo(r + dp, b - dp); ctx.lineTo(r, b); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = alpha(c, 0.12); ctx.beginPath(); ctx.moveTo(l, t); ctx.lineTo(l + dp, t - dp); ctx.lineTo(r + dp, t - dp); ctx.lineTo(r, t); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(l + dp / 2, t - dp / 2); ctx.lineTo(r + dp / 2, t - dp / 2); ctx.stroke();      /* the seam */
  ctx.fillStyle = PAL.panel; ctx.strokeStyle = alpha(c, 0.6); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x - 7, t); ctx.lineTo(x - 7 + dp, t - dp); ctx.lineTo(x + 7 + dp, t - dp); ctx.lineTo(x + 7, t); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.rect(x - 7, t, 14, h); ctx.fill(); ctx.stroke();                                                          /* the tape */
  ctx.restore();
}
/* a foam cup lying on its side, its mouth at (x, y) and its base s times 84 units to the right:
   the drink a cooling problem pours. Its footprint at s = 1 is about 84 by 66, above (x, y). */
function cupOnSide(ctx: Ctx, x: Logical, y: Logical, s = 1, color?: Color): void {
  const c = color ?? PAL.ink;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = c; ctx.fillStyle = PAL.panel; ctx.lineWidth = 4; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -66); ctx.lineTo(84, -52); ctx.lineTo(84, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(4, -2); ctx.lineTo(4, -64); ctx.stroke();                     /* the rim */
  ctx.lineWidth = 2; ctx.strokeStyle = PAL.muted; ctx.beginPath(); ctx.moveTo(72, -50); ctx.lineTo(72, -2); ctx.stroke();
  ctx.restore();
}
/* a classical guitar lying on its side, nut to the left and bridge to the right, its string along
   the line y at scale s: the body a figure of eight, the neck with its frets, the sound hole, the
   headstock and its pegs. Its footprint at s = 1 is about 980 by 280, from (x, y) at the headstock;
   `F.guitar.string(x, s)` gives the two ends of the string a figure then plucks itself. */
function guitar(ctx: Ctx, x: Logical, y: Logical, s = 1, color?: Color): void {
  const c = color ?? PAL.ink;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = PAL.soft; ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.lineJoin = 'round';
  const nut = 84, bridge = 834, bl = 494, br = 974;
  ctx.beginPath(); ctx.moveTo(bl + 26, -70);
  ctx.bezierCurveTo(bl - 10, -70, bl - 10, 70, bl + 26, 70);
  ctx.bezierCurveTo(bl + 90, 100, bl + 150, 100, bl + 200, 66);
  ctx.bezierCurveTo(bl + 250, 40, bl + 300, 40, bl + 340, 80);
  ctx.bezierCurveTo(bl + 400, 135, br + 30, 110, br, 0);
  ctx.bezierCurveTo(br + 30, -110, bl + 400, -135, bl + 340, -80);
  ctx.bezierCurveTo(bl + 300, -40, bl + 250, -40, bl + 200, -66);
  ctx.bezierCurveTo(bl + 150, -100, bl + 90, -100, bl + 26, -70);
  ctx.closePath(); ctx.fill(); ctx.stroke();                                                    /* the body */
  ctx.beginPath(); ctx.moveTo(nut, -22); ctx.lineTo(12, -32); ctx.lineTo(0, -18); ctx.lineTo(0, 18); ctx.lineTo(12, 32); ctx.lineTo(nut, 22); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 2; for (const px of [20, 42, 64]) { ctx.beginPath(); ctx.moveTo(px, -26); ctx.lineTo(px, -46); ctx.moveTo(px - 6, -46); ctx.lineTo(px + 6, -46); ctx.stroke(); }
  ctx.lineWidth = 3; ctx.fillStyle = alpha(c, 0.12); ctx.beginPath(); ctx.rect(nut, -19, 500, 38); ctx.fill(); ctx.stroke();      /* the neck */
  ctx.lineWidth = 2; for (let i = 1; i <= 14; i++) { const fx = nut + 520 * (1 - Math.pow(2, -i / 12)); ctx.beginPath(); ctx.moveTo(fx, -19); ctx.lineTo(fx, 19); ctx.stroke(); }
  ctx.fillStyle = PAL.muted; for (const i of [3, 5, 7, 9, 12]) { const fx = nut + 520 * (1 - Math.pow(2, -(i - 0.5) / 12)); ctx.beginPath(); ctx.arc(fx, 9, 3, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = alpha(c, 0.55); ctx.strokeStyle = PAL.muted; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(656, 0, 42, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(656, 0, 36, 0, Math.PI * 2); ctx.fill();                                                              /* the sound hole */
  ctx.fillStyle = c; ctx.fillRect(nut - 5, -24, 10, 48); ctx.fillRect(bridge - 10, -50, 20, 100);                                /* the nut and the bridge */
  ctx.fillStyle = PAL.panel; for (const o of [-36, -18, 0, 18, 36]) { ctx.beginPath(); ctx.arc(bridge, o, 3, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
/* the two ends of the string of a guitar drawn at (x, y) at scale s: the nut and the bridge,
   in canvas units, which is what a figure that plucks the string needs */
const guitarSprite = Object.assign(guitar, { string: (x: Logical, s = 1): { nut: Logical; bridge: Logical } => ({ nut: x + 84 * s, bridge: x + 834 * s }) });
/* a book standing closed, filling w by h centred on (x, y): a cover, a spine and its pages */
function book(ctx: Ctx, x: Logical, y: Logical, w: Logical, h: Logical, color?: Color): void {
  const c = color ?? PAL.ink, l = x - w / 2, t = y - h / 2;
  ctx.save(); ctx.fillStyle = PAL.panel; ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.lineJoin = 'round';
  ctx.fillRect(l, t, w, h); ctx.strokeRect(l, t, w, h);
  ctx.fillStyle = c; ctx.fillRect(l, t, w, Math.max(5, h / 12));                                  /* the cover */
  ctx.strokeStyle = PAL.muted; ctx.lineWidth = 1.5; ctx.beginPath();
  for (let q = t + h / 6; q < t + h - 4; q += Math.max(5, h / 9)) { ctx.moveTo(l + 6, q); ctx.lineTo(l + w - 6, q); }
  ctx.stroke(); ctx.restore();
}
/* a backpack hanging by its straps, the top of the pack at (x, y) and s times the base size:
   a rounded pack, a lid with its buckle and two shoulder straps. Its footprint at s = 1 is
   about 96 wide and 130 tall below (x, y), the straps included. */
function backpack(ctx: Ctx, x: Logical, y: Logical, s = 1, color?: Color): void {
  const c = color ?? PAL.ink;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = PAL.soft; ctx.strokeStyle = c; ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-40, 8); ctx.quadraticCurveTo(-48, 0, -40, -6); ctx.quadraticCurveTo(0, -26, 40, -6);
  ctx.quadraticCurveTo(48, 0, 40, 8); ctx.lineTo(44, 96); ctx.quadraticCurveTo(44, 112, 28, 112);
  ctx.lineTo(-28, 112); ctx.quadraticCurveTo(-44, 112, -44, 96); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = alpha(c, 0.22); ctx.beginPath(); ctx.moveTo(-42, 24); ctx.quadraticCurveTo(0, 42, 42, 24); ctx.lineTo(42, 8);
  ctx.quadraticCurveTo(0, -18, -42, 8); ctx.closePath(); ctx.fill(); ctx.stroke();                 /* the lid */
  ctx.fillStyle = c; ctx.fillRect(-9, 26, 18, 14);                                                 /* the buckle */
  ctx.fillStyle = alpha(c, 0.18); ctx.beginPath(); ctx.moveTo(-26, 58); ctx.lineTo(26, 58); ctx.lineTo(26, 96); ctx.quadraticCurveTo(0, 104, -26, 96); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-22, 2); ctx.quadraticCurveTo(-56, 30, -34, 96); ctx.moveTo(22, 2); ctx.quadraticCurveTo(56, 30, 34, 96); ctx.stroke();   /* the straps */
  ctx.restore();
}

/* ---------- two vectors from one tail ----------
   A difference of vectors is read twice: once with both drawn from the same tail, where the
   difference closes the triangle between their heads, and once with that difference set out on
   its own a row below, where its length and direction can be measured. The helper draws both:
   the two vectors from `tail`, the closing side dashed between the heads, and b - a from a tail
   `dy` below the first, in the difference's own colour. It hands back the tail and head of that
   copy, so the figure may label or dimension it. */
export type VectorTriangleOpts = { color?: Color; color2?: Color; diff?: Color; names?: readonly [string, string, string]; dy?: Logical; lab?: Labeller };
function vectorTriangle(ctx: Ctx, tail: Joint, a: Joint, b: Joint, o: VectorTriangleOpts = {}): { tail: Joint; head: Joint } {
  const c1 = o.color ?? PAL.ink, c2 = o.color2 ?? c1, cd = o.diff ?? PAL.muted, dy = o.dy ?? 170;
  const A: Joint = { x: tail.x + a.x, y: tail.y + a.y }, B: Joint = { x: tail.x + b.x, y: tail.y + b.y };
  arrow(ctx, tail.x, tail.y, A.x, A.y, c1, 5); arrow(ctx, tail.x, tail.y, B.x, B.y, c2, 5);
  line(ctx, A.x, A.y, B.x, B.y, alpha(cd, 0.7), 2.5, [9, 7]);
  const t2: Joint = { x: tail.x, y: tail.y + dy }, h2: Joint = { x: t2.x + (b.x - a.x), y: t2.y + (b.y - a.y) };
  arrow(ctx, t2.x, t2.y, h2.x, h2.y, cd, 5);
  dot(ctx, t2.x, t2.y, cd, false, 5);
  if (o.names) {
    const put = (s: string, p: Joint, q: Joint, c: Color): void => {
      const dx = p.x - q.x, dyy = p.y - q.y, L = Math.hypot(dx, dyy) || 1;
      if (o.lab) o.lab.add(s, p.x, p.y, dx / L, dyy / L, c, 20, 20);
      else label(ctx, s, p.x, p.y, { side: dyy < 0 ? 'above' : 'below', color: c });
    };
    put(o.names[0], A, tail, c1); put(o.names[1], B, tail, c2); put(o.names[2], h2, t2, cd);
  }
  return { tail: t2, head: h2 };
}

/* ---------- a cable round pulleys ----------
   A cable is one line, so it is drawn as one: the two ends in `path` — where it leaves the load
   and where it is anchored or held — with the pulley centres it passes over in between, all of
   radius r. Between consecutive points it runs along the outside tangent, round each pulley it
   follows the rim on the side the turn asks for, and each pulley is drawn as a wheel on its axle.
   A cable that passes no pulley is the straight line between its ends. */
function wrap(ctx: Ctx, path: readonly Joint[], pulleys: readonly Joint[], r: Logical, color?: Color): void {
  const c = color ?? PAL.ink;
  const pts: Joint[] = [path[0], ...pulleys, ...path.slice(1)];
  ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  /* the rim point of pulley i on the side the cable passes, for the run that arrives from `from` and leaves toward `to` */
  const side = (p: Joint, from: Joint, to: Joint): number => {
    const ax = p.x - from.x, ay = p.y - from.y, bx = to.x - p.x, by = to.y - p.y;
    return Math.sign(ax * by - ay * bx) || 1;
  };
  const offs = (p: Joint, q: Joint, sgn: number): Joint => {
    const dx = q.x - p.x, dy = q.y - p.y, L = Math.hypot(dx, dy) || 1;
    return { x: (-dy / L) * r * sgn, y: (dx / L) * r * sgn };
  };
  ctx.beginPath();
  let prev = pts[0];
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i], next = pts[i + 1], sgn = side(p, prev, next);
    const oIn = offs(prev, p, sgn), oOut = offs(p, next, sgn);
    ctx.moveTo(prev.x + oIn.x, prev.y + oIn.y); ctx.lineTo(p.x + oIn.x, p.y + oIn.y);
    ctx.arc(p.x, p.y, r, Math.atan2(oIn.y, oIn.x), Math.atan2(oOut.y, oOut.x), sgn > 0);
    ctx.moveTo(p.x + oOut.x, p.y + oOut.y); ctx.lineTo(next.x + oOut.x, next.y + oOut.y);
    prev = next;
  }
  if (pts.length === 2) { ctx.moveTo(pts[0].x, pts[0].y); ctx.lineTo(pts[1].x, pts[1].y); }
  ctx.stroke();
  for (const p of pulleys) { ctx.fillStyle = PAL.panel; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.fillStyle = c; ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(3, r / 5), 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

/* ---------- the label discipline ----------
   A label is set beside the thing it names and never on it. It starts one
   gap beyond the arrowhead, along the arrow's own direction; where that slot
   is already taken, or would fall off the canvas, it steps further out and a
   dotted leader in the label's own colour ties it back to the head. Every
   label is drawn in a small panel the colour of the page, so a line it
   crosses does not run through the letters, and every label is kept inside
   the canvas at every slider position. Labels are collected and flushed
   last, which puts text above the arrows and the arrows above the bodies.
   block() reserves a region, such as the headline band, that no label may
   enter. */
export type LabellerOpts = { headline?: boolean | 1 | 2 };
function labeller(ctx: Ctx, H: Logical, o: LabellerOpts = {}): Labeller {
  const placed: Box[] = [], queue: Label[] = [];
  const boxOf = (s: string, x: Logical, y: Logical, size: number, align: CanvasTextAlign): Box => {
    const bw = measure(ctx, s, { size, weight: 600 }) + 14, bh = shownH(ctx, size) + 8;
    const l = align === 'center' ? x - bw / 2 : align === 'right' ? x - bw + 7 : x - 7;
    return { l, r: l + bw, t: y - bh / 2, b: y + bh / 2 };
  };
  const clash = (a: Box): boolean => placed.some((b) => a.l < b.r + 8 && b.l < a.r + 8 && a.t < b.b + 6 && b.t < a.b + 6);
  const missed: string[] = [];
  const self: Labeller = {
    block(l, t, r, b) { placed.push({ l, t, r, b }); },
    /* A box a figure drew itself — the panel `label` returned, a readout, a legend — joins the
       collision set, so the queued labels step around it instead of landing on top of it. The
       text is optional and only names the box in what `flush` reports. */
    place(box, s) { placed.push({ l: box.l, t: box.t, r: box.r, b: box.b }); if (s && clash({ l: box.l, t: box.t, r: box.r, b: box.b })) missed.push(s); return box; },
    /* A panel the colour of the page laid along a segment before the arrow is drawn over it, so
       an arrow that crosses a body reads as being in front of it rather than drawn into it. */
    halo(seg, w = 14) {
      ctx.save(); ctx.strokeStyle = PAL.panel; ctx.lineWidth = w; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(seg.x1, seg.y1); ctx.lineTo(seg.x2, seg.y2); ctx.stroke(); ctx.restore();
    },
    /* Beside the midpoint of a segment, on the side asked for: the label starts one
       gap out along the segment's own normal and steps further out, with a leader,
       where that slot is taken. `side` is 'left' or 'right' of the segment's
       direction, or a sign for the same two. */
    beside(seg, side, s, color, size, o2 = {}) {
      const dx = seg.x2 - seg.x1, dy = seg.y2 - seg.y1, L = Math.hypot(dx, dy) || 1;
      const sign = side === 'left' || side === -1 ? -1 : 1, f = o2.offset ?? 0.5;
      self.add(s, seg.x1 + dx * f, seg.y1 + dy * f, (sign * -dy) / L, (sign * dx) / L, color ?? PAL.ink, size, o2.gap ?? 22);
    },
    add(s, hx, hy, ux, uy, color, size, start) {
      const sz = size || 20, gaps = [start || 20, 58, 96, 138, 184];
      const align: CanvasTextAlign = ux < -0.3 ? 'right' : ux > 0.3 ? 'left' : 'center';
      for (let i = 0; i < gaps.length; i++) {
        let x = hx + ux * gaps[i], y = hy + uy * gaps[i];
        let b = boxOf(s, x, y, sz, align);
        const dx = b.l < 16 ? 16 - b.l : b.r > LW - 16 ? LW - 16 - b.r : 0;
        const dy = b.t < 16 ? 16 - b.t : b.b > H - 16 ? H - 16 - b.b : 0;
        if (dx || dy) { x += dx; y += dy; b = boxOf(s, x, y, sz, align); }
        if (clash(b) && i < gaps.length - 1) continue;
        if (clash(b)) missed.push(s);   /* every slot was taken: it is drawn all the same, and flush reports it */
        placed.push(b); queue.push({ s, x, y, hx, hy, color, sz, align });
        return;
      }
    },
    /* Draws the queue, text above the arrows, and hands back the labels that found no
       clear slot, so a figure can say in its own check which ones to move by hand. */
    flush() {
      for (const q of queue) {
        const dx = q.x - q.hx, dy = q.y - q.hy, L = Math.hypot(dx, dy);
        if (L > 40) line(ctx, q.hx + (dx / L) * 15, q.hy + (dy / L) * 15, q.x - (dx / L) * 17, q.y - (dy / L) * 17, alpha(q.color, 0.5), 1.5, [5, 6]);
        text(ctx, q.s, q.x, q.y, q.color, { weight: 600, size: q.sz, align: q.align, bg: PAL.panel });
      }
      return missed.slice();
    },
  };
  /* The headline band, blocked on construction so that no label may enter it: one line
     deep by default and two where the figure says its headline wrapped, which is what
     `F.headline` returns. */
  if (o.headline) self.block(0, 0, LW, o.headline === 2 ? 96 : 68);
  return self;
}
/* a headline that never runs to the border: one line where it fits, and
   otherwise two, broken at the space that leaves the two halves most even */
const WORDS = /(?:\$[^$]+\$|\S)+/g;   /* a TeX run is one word, its spaces and all */
function topline(ctx: Ctx, s: string, color?: Color): 1 | 2 {
  const wide = (t: string): number => measure(ctx, t, { size: 26, tex: true });
  if (wide(s) <= LW - 220) { oneline(ctx, s, color); return 1; }
  const words = s.match(WORDS) ?? [];
  let cut = 1, best = Infinity;
  for (let i = 1; i < words.length; i++) {
    const q = Math.abs(wide(words.slice(0, i).join(' ')) - wide(words.slice(i).join(' ')));
    if (q < best) { best = q; cut = i; }
  }
  text(ctx, words.slice(0, cut).join(' '), LW / 2, 38, color ?? PAL.ink, { size: 26, align: 'center', tex: true });
  text(ctx, words.slice(cut).join(' '), LW / 2, 74, color ?? PAL.ink, { size: 26, align: 'center', tex: true });
  return 2;
}

/* ---------- discrete controls ----------
   A state the figure switches between rather than slides through — solid,
   liquid, gas; cis and trans; one of the four gas laws — is a row of buttons
   with the current one marked, and a dropdown where the list is long enough
   that a row would wrap. Both read and write like a slider does, both sit in
   the same controls grid as the sliders, and both raise the figure's own
   input event, so a figure that only draws on demand redraws when one is
   pressed. The row is a radio group: arrow keys walk it and only the marked
   option is in the tab order. */
export type Choice = { readonly value: string; readonly label: string };
export type Picker = {
  readonly value: string; set: (v: string) => void; drive: (v: string) => void;
  /* a new option list: the value stays where the list still has it, else takes `value`, else the first */
  options: (list: readonly Choice[], value?: string) => void;
  readonly k: number; readonly from: string;
  mix: <T extends Blendable>(f: (v: string) => T) => T; a: (v: string) => number; off: (v: string, shift: Shift) => [number, number];
  only: (ctx: Ctx, v: string, draw: () => void, shift?: Shift) => void;
  mixColor: (f: (v: string) => Color) => Color;
  curve: (ctx: Ctx, fOf: (v: string) => (t: number) => number, t0: number, t1: number, X: Scale, Y: Scale, color: Color, w?: number, n?: number) => void;
};
type ChoiceOpts = { label?: string; key?: string; options: readonly Choice[]; value?: string; aria?: string; onInput?: (v: string) => void; ms?: number };

/* A change of state morphs over `ms`: `k` runs 0 to 1 (smooth) and the figure owning the control
   redraws every frame till it lands; `set` cuts. */
const TURN_MS = 900;
function turning(host: HTMLElement, first: string, ms: number, cur: () => string) {
  let from = first, t0 = -Infinity, tick: ((t: number) => void) | null = null;
  const k = (): number => (REDUCED || ms <= 0 ? 1 : ease.smooth((now() - t0) / ms));
  const turn = (prev: string): void => {
    from = prev; t0 = now();
    const fig = host.closest<HTMLElement>('figure');
    if (tick || !fig || k() >= 1) return;
    const t = (): void => { touch(fig); if (k() >= 1) { tickers.delete(t); tick = null; } };
    tick = t; tickers.add(t);
  };
  const cut = (v: string): void => { from = v; t0 = -Infinity; };
  const handle = {
    get k() { return k(); }, get from() { return from; },
    mix: <T extends Blendable>(f: (v: string) => T): T => { const q = k(); return q >= 1 || from === cur() ? f(cur()) : blend(f(from), f(cur()), q); },
    a: (v: string): number => partAlpha(v, from, cur(), k()),
    off: (v: string, shift: Shift): [number, number] => partOff(v, from, cur(), k(), shift),
    only: (ctx: Ctx, v: string, draw: () => void, shift: Shift = [0, 12]): void => faded(ctx, partAlpha(v, from, cur(), k()), partOff(v, from, cur(), k(), shift), draw),
    mixColor: (f: (v: string) => Color): Color => mixColor(f(from), f(cur()), from === cur() ? 1 : k()),
    curve: (ctx: Ctx, fOf: (v: string) => (t: number) => number, t0: number, t1: number, X: Scale, Y: Scale, color: Color, w = 4, n = 80): void =>
      blendCurve(ctx, fOf(from), fOf(cur()), from === cur() ? 1 : k(), t0, t1, X, Y, color, w, n),
  };
  return { turn, cut, handle };
}

const plain = (s: string): string => s.replace(/\\k|[{}\\]/g, '');
const ariaOf = (o: ChoiceOpts): string => o.aria ?? (o.label ? plain(o.label) : 'Choice');
function ctlLabel(lab: HTMLElement, o: ChoiceOpts): void { if (!o.label) return; const name = el('span', 'ctl-label'); tex(name, o.label); lab.appendChild(name); }

const enrolPicker = (host: HTMLElement, o: ChoiceOpts, input: EventTarget, value: () => string, drive: (v: string) => void, list: () => readonly Choice[]): void =>
  enrol(host.closest('figure'), o.key ?? 'choice', (id) => ({
    id, input, drive: (x) => drive(String(x)),
    param: () => ({ id, label: ariaOf(o), kind: 'choice', value: value(), options: list().map((c) => c.value) }),
  }));
const kept = (values: readonly string[], v: string, value?: string): string =>
  values.includes(v) ? v : value !== undefined && values.includes(value) ? value : values[0] ?? '';

function choice(host: HTMLElement, o: ChoiceOpts): Picker {
  const lab = el('label', 'ctl-seg'); ctlLabel(lab, o);
  const row = el('div', 'ctlseg'); row.setAttribute('role', 'radiogroup'); row.setAttribute('aria-label', ariaOf(o));
  let list = o.options, values = list.map((c) => c.value), buttons: HTMLButtonElement[] = [];
  let v = kept(values, o.value ?? '');
  const mark = (): void => buttons.forEach((b) => { const on = b.dataset.value === v; b.setAttribute('aria-checked', String(on)); b.classList.toggle('on', on); b.tabIndex = on ? 0 : -1; });
  const tw = turning(host, v, o.ms ?? TURN_MS, () => v);
  const pick = (next: string, focus: boolean): void => {
    if (next === v || !values.includes(next)) return;
    tw.turn(v); v = next; mark(); if (focus) buttons[values.indexOf(v)].focus();
    o.onInput?.(v); row.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const build = (): void => {
    buttons = list.map((c) => {
      const b = el('button', 'segbtn', c.label); b.type = 'button'; b.dataset.value = c.value; b.setAttribute('role', 'radio');
      b.addEventListener('click', () => pick(c.value, false)); return b;
    });
    row.replaceChildren(...buttons); mark();
  };
  build();
  row.addEventListener('keydown', (e) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault(); pick(values[(values.indexOf(v) + step + values.length) % values.length], true);
  });
  lab.appendChild(row); host.appendChild(lab);
  enrolPicker(host, o, row, () => v, (x) => driven(() => pick(x, false)), () => list);
  const options = (next: readonly Choice[], value?: string): void => {
    list = next; values = list.map((c) => c.value);
    const to = kept(values, v, value); if (to !== v) { v = to; tw.cut(v); }
    build();
  };
  return Object.defineProperties(tw.handle, Object.getOwnPropertyDescriptors({
    get value() { return v; }, set(x: string) { if (!values.includes(x)) return; v = x; tw.cut(x); mark(); }, drive: (x: string) => driven(() => pick(x, false)), options,
  })) as Picker;
}

function select(host: HTMLElement, o: ChoiceOpts): Picker {
  const lab = el('label', 'ctl-pick'); ctlLabel(lab, o);
  const sel = el('select', 'ctl-select'); sel.setAttribute('aria-label', ariaOf(o));
  let list = o.options;
  const build = (): void => sel.replaceChildren(...list.map((c) => { const op = el('option'); op.value = c.value; op.textContent = c.label; return op; }));
  build(); sel.value = o.value ?? list[0]?.value ?? '';
  let v = sel.value;
  const tw = turning(host, v, o.ms ?? TURN_MS, () => v);
  sel.addEventListener('input', () => { if (sel.value !== v) { tw.turn(v); v = sel.value; } o.onInput?.(sel.value); });
  lab.appendChild(sel); host.appendChild(lab);
  const drive = (x: string): void => { if (sel.value === x) return; sel.value = x; driven(() => sel.dispatchEvent(new Event('input', { bubbles: true }))); };
  enrolPicker(host, o, sel, () => sel.value, drive, () => list);
  const options = (next: readonly Choice[], value?: string): void => {
    list = next; build();
    const to = kept(list.map((c) => c.value), v, value); sel.value = to; if (to !== v) { v = to; tw.cut(v); }
  };
  return Object.defineProperties(tw.handle, Object.getOwnPropertyDescriptors({
    get value() { return sel.value; }, set(x: string) { sel.value = x; v = sel.value; tw.cut(v); }, drive, options,
  })) as Picker;
}

/* ---------- a slider with soft detents ----------
   A quantity that takes a few preset values — none, one, two, three lone
   pairs, the materials the book lists — stays a slider, and the presets are
   drawn as ticks under its track with their labels where they carry one. The
   thumb settles on the nearest of them when it is released close enough, so
   the reader lands on the book's values without being barred from the ones
   between. A slider given no detents is the slider it always was. */
export type Detent = number | { readonly v: number; readonly label?: string };
const detentValue = (d: Detent): number => (typeof d === 'number' ? d : d.v);
const detentLabel = (d: Detent): string => (typeof d === 'number' ? '' : d.label ?? '');
const gapsOf = (ds: readonly Detent[]): readonly number[] => ds.map(detentValue).slice(1).map((v, i) => v - detentValue(ds[i]));
/* A step that already walks the detents snaps by itself; anything finer snaps only if asked. */
const snapsByDefault = (ds: readonly Detent[], step: number): boolean => { const g = gapsOf(ds); return g.length > 0 && g.every((x) => Math.abs(x - step) < 1e-9); };
/* a third of the closest gap between detents, but never more than a fortieth of the track: detents far apart would otherwise swallow most of the slider */
type Span = { readonly min: number; readonly max: number };
const snapReach = (ds: readonly Detent[], o: Span): number => { const g = gapsOf(ds).map(Math.abs).filter((x) => x > 0); return Math.min(0.34 * (g.length ? Math.min(...g) : (o.max - o.min) * 0.2), 0.025 * (o.max - o.min)); };
function nearestDetent(ds: readonly Detent[], x: number, reach: number): number | null {
  const best = ds.map(detentValue).reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a));
  return Math.abs(best - x) <= reach ? best : null;
}
function ticksOf(ds: readonly Detent[], o: Span): HTMLElement {
  const box = el('span', 'ctl-ticks'); box.setAttribute('aria-hidden', 'true');
  ds.forEach((d) => {
    const t = el('span', 'tick'); t.style.left = (100 * (detentValue(d) - o.min)) / (o.max - o.min) + '%';
    const s = detentLabel(d); if (s) t.appendChild(el('span', 'tick-lab', s));
    box.appendChild(t);
  });
  return box;
}

/* ---------- special values on a slider ----------
   A value the relation singles out (resonance, the stop of a story) is a
   dashed circle on the track, smaller than the thumb, in the slider's hue;
   `at` may be a function of the figure's state, recomputed whenever any
   control of the figure moves, and null or out of range hides it. A drag
   catches on a circle and lets go past it; Page Up and Page Down jump from
   circle to circle; the circle the thumb sits on is filled. */
export type Special = { readonly at: number | (() => number | null); readonly label?: string };
function specialsOf(inp: HTMLInputElement, o: CtlOpts) {
  const box = el('span', 'ctl-specials'); box.setAttribute('aria-hidden', 'true');
  let list: readonly Special[] = [], vals: (number | null)[] = [], dots: HTMLElement[] = [], held: number | null = null, keyed = false;
  /* bounds follow the input, since a slider's range() may move them after the circles are made */
  let lo = o.min, hi = o.max, span = hi - lo, step = o.step;
  const grid = (x: number): number => clampTo(lo + Math.round((x - lo) / step) * step, lo, hi);
  const place = (): void => {
    lo = +inp.min; hi = +inp.max; span = hi - lo;
    if (inp.step !== 'any' && +inp.step > 0) step = +inp.step;
    if (list.length) inp.step = 'any';
    vals = list.map((s) => { try { const x = typeof s.at === 'function' ? s.at() : s.at; return trackAt(x, lo, hi) === null ? null : x; } catch { return null; } });
    dots.forEach((d, i) => { const k = trackAt(vals[i], lo, hi); d.hidden = k === null; if (k !== null) d.style.setProperty('--at', String(k)); });
  };
  const lit = (): void => { const v = +inp.value; dots.forEach((d, i) => d.classList.toggle('on', vals[i] != null && Math.abs(v - vals[i]!) <= 1e-9 * Math.max(1, span))); };
  const mark = (l: readonly Special[]): void => {
    list = l; box.replaceChildren(); held = null;
    dots = l.map((s) => { const d = el('span', 'ctl-sp kv-' + o.cls); if (s.label) d.title = s.label; box.appendChild(d); return d; });
    inp.step = l.length ? 'any' : String(step); place();
  };
  /* with circles the input steps freely so a caught value is exact; the drag keeps the step grid by hand */
  const snap = (): void => {
    if (!list.length || driving) return;
    if (keyed) { keyed = false; held = null; return; }
    const r = snapTo(+inp.value, vals, span, held); held = r.held;
    inp.value = String(r.held === null ? grid(r.v) : r.v);
  };
  inp.addEventListener('keydown', (e) => {
    if (!list.length) return;
    const v = +inp.value, big = Math.max(step, span / 10);
    const to = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? grid(v + step) + (grid(v + step) <= v ? step : 0)
      : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? grid(v - step) - (grid(v - step) >= v ? step : 0)
      : e.key === 'PageUp' ? nextSpecial(vals, v, 1) ?? grid(v + big)
      : e.key === 'PageDown' ? nextSpecial(vals, v, -1) ?? grid(v - big)
      : e.key === 'Home' ? lo : e.key === 'End' ? hi : null;
    if (to === null) return;
    e.preventDefault(); const x = clampTo(to, lo, hi); if (x === v) return;
    inp.value = String(x); keyed = true; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true }));
  });
  inp.addEventListener('pointerdown', () => { held = null; });
  const watch = (parent: HTMLElement): void => {
    const fig = parent.closest('figure') ?? parent;
    const re = (): void => { if (!list.length) return; place(); lit(); };
    fig.addEventListener('input', re); fig.addEventListener('change', re);
    /* a circle placed from a slider declared after this one finds it once the figure is built */
    queueMicrotask(re);
  };
  if (o.specials?.length) mark(o.specials);
  return { box, place, lit, snap, mark, watch };
}
const clampTo = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));

/* ---------- hover names ----------
   Rule 26.6: nothing a figure draws is an unnamed coloured ball. A figure
   that cannot fit a label beside every body hands over the circles it drew,
   in the 1400-unit space, and the reader gets the name under the pointer.
   The list is asked for on each move, so a figure whose bodies travel needs
   to register nothing again. */
export type Hit = { readonly x: Logical; readonly y: Logical; readonly r: Logical; readonly name: string };
type Tip = { show: (x: number, y: number, s: string) => void; hide: () => void };
function tipOf(host: HTMLElement): Tip {
  const t = el('div', 'fig-tip'); t.hidden = true; host.appendChild(t);
  return {
    show(x, y, s) { if (t.textContent !== s) t.textContent = s; t.style.left = x + 'px'; t.style.top = y + 'px'; t.hidden = false; },
    hide() { t.hidden = true; },
  };
}
function hover(stage: HTMLElement, hits: () => readonly Hit[], canvas?: HTMLCanvasElement): Tip {
  const tip = tipOf(stage); const c = canvas ?? stage.querySelector('canvas');
  if (!c) return tip;
  c.addEventListener('pointermove', (e) => {
    const r = c.getBoundingClientRect(), s = stage.getBoundingClientRect(), H = +(c.dataset.h ?? 0);
    if (!r.width || !H) return;
    const x = ((e.clientX - r.left) / r.width) * LW, y = ((e.clientY - r.top) / r.height) * H;
    const found = hits().find((h) => Math.hypot(h.x - x, h.y - y) <= h.r);
    if (found) tip.show(e.clientX - s.left, e.clientY - s.top - 12, found.name); else tip.hide();
  });
  c.addEventListener('pointerleave', () => tip.hide());
  return tip;
}

/* ---------- three dimensions ----------
   three.js (r128) is a classic script the shell loads on demand, the first
   time a section's figures need it, so it has no types of its own here:
   `Three` names that global and `Obj3` the scene objects the helpers below
   pass back to the figure.
   A viewer mounts a WebGL renderer with a transparent clear colour inside the
   figure's stage, so the page's own panel shows through in both themes, and
   every colour of the scene is read from the palette as it is built, so a
   theme change rebuilds it. The reader turns the scene by dragging; the
   buttons under it say what dragging cannot, and each is the figure's to ask
   for: auto-rotate on and off (`spin: 'idle'`), zoom (`zoom: true`; the wheel
   zooms over the canvas either way) and the viewpoints that carry meaning
   (`views`). With none asked for there is no button row. The orbit is a turntable whose yaw and pitch the figure may bound,
   so a scene with a bench is never turned to show its underside. The renderer
   draws only when something changed and only while the figure is on screen,
   follows the container's size and the device pixel ratio, and disposes
   itself when the figure leaves the document. Labels are HTML (.lab3d) laid
   over the canvas at the projected point, so they set in the page's face. */
type Three = Record<string, any>;                        /* the r128 global */
type Obj3 = any;                                         /* a mesh, a line, a group */
export type Radians = number;
export type ViewPreset = { readonly label: string; readonly yaw: Radians; readonly pitch: Radians };
type Spin = 'idle' | 'off';
type View3dOpts = {
  h?: Logical; dist?: number; tilt?: Radians;
  spin?: Spin; zoom?: boolean; views?: readonly ViewPreset[];
  pitch?: readonly [Radians, Radians] | 'free'; yaw?: readonly [Radians, Radians] | 'free';
  zoomMin?: number; zoomMax?: number; onRender?: () => void;
};
export type View3d = {
  readonly wrap: HTMLElement; readonly scene: Obj3; readonly camera: Obj3;
  part: (x?: number) => Obj3;
  label: (s: string, p: Vec3, g: Obj3, dy?: number, cls?: string) => HTMLElement;
  headline: (s: string) => HTMLElement;
  clear: () => void;
  project: (p: Vec3, g: Obj3) => Pt;
  move: (e: HTMLElement, p: Vec3) => void;
  invalidate: () => void;
  pickable: (m: Obj3, name: string) => Obj3;
  setView: (yaw: Radians, pitch: Radians) => void;
  dispose: () => void;
  readonly turned: boolean;
  /* the camera as code sets it: `look` jumps, `glide` eases there and resolves on arrival or when the reader takes over */
  readonly at: CamView;
  look: (to: CamAim) => void;
  glide: (to: CamAim, ms?: number, e?: Ease) => Promise<void>;
  /* called whenever the reader turns, zooms or spins the camera by hand; returns its own removal */
  onReader: (f: () => void) => () => void;
};
export type CamView = { readonly yaw: Radians; readonly pitch: Radians; readonly zoom: number; readonly target: Vec3 };
export type CamAim = Partial<CamView>;

const three = (): Three | null => (window as unknown as { THREE?: Three }).THREE ?? null;
/* drawn: the object and every group above it visible */
const shownAll = (o: Obj3): boolean => { for (let x = o; x; x = x.parent) if (!x.visible) return false; return true; };
const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));
/* The shared geometries every mesh helper instances, made once the global is there. */
let GEO: Record<string, Obj3> | null = null;
function geo(): Record<string, Obj3> {
  const T = three(); if (!T) return {};
  if (!GEO) GEO = { sphere: new T.SphereGeometry(1, 28, 20), cyl: new T.CylinderGeometry(1, 1, 1, 14, 1, true), cone: new T.ConeGeometry(1, 1, 18) };
  return GEO;
}
const V3 = {
  add: (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  mul: (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  unit: (a: Vec3): Vec3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
};
/* a point on the great circle from unit a to unit b, t from 0 to 1 */
function slerp3(a: Vec3, b: Vec3, t: number): Vec3 {
  const w = Math.acos(clamp(V3.dot(a, b), -1, 1)); if (w < 1e-6) return a;
  const s = Math.sin(w);
  return V3.add(V3.mul(a, Math.sin((1 - t) * w) / s), V3.mul(b, Math.sin(t * w) / s));
}

/* The bodies a three-dimensional figure is built from: balls, sticks between
   two points, the lobe of a lone pair, an arrow with a cone for a head, a
   polyline and the arc of an angle. A figure carries none of this itself. */
const vec3 = (p: Vec3): Obj3 => { const T = three()!; return new T.Vector3(p[0], p[1], p[2]); };
const up3 = (): Obj3 => vec3([0, 1, 0]);
const mat3 = (c: Color, extra: Record<string, unknown> = {}): Obj3 => { const T = three()!; return new T.MeshPhongMaterial({ color: new T.Color(c), shininess: 24, ...extra }); };
function sphere3(g: Obj3, p: Vec3, r: number, c: Color, extra?: Record<string, unknown>): Obj3 {
  const T = three()!; const m = new T.Mesh(geo().sphere, mat3(c, extra)); m.position.copy(vec3(p)); m.scale.setScalar(r); g.add(m); return m;
}
function setStick3(m: Obj3, a: Vec3, b: Vec3): Obj3 {
  const A = vec3(a), B = vec3(b), d = B.clone().sub(A), L = d.length() || 1e-6;
  m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(up3(), d.normalize()); m.scale.y = L; return m;
}
function stick3(g: Obj3, a: Vec3, b: Vec3, r: number, c: Color, extra?: Record<string, unknown>): Obj3 {
  const T = three()!; const m = new T.Mesh(geo().cyl, mat3(c, extra)); m.scale.set(r, 1, r); setStick3(m, a, b); g.add(m); return m;
}
function setLobe3(m: Obj3, from: Vec3, dir: Vec3, len: number): Obj3 {
  const d = vec3(dir).normalize();
  m.position.copy(vec3(from)).add(d.clone().multiplyScalar(len * 0.6)); m.quaternion.setFromUnitVectors(up3(), d); m.scale.set(len * 0.3, len * 0.56, len * 0.3); return m;
}
function lobe3(g: Obj3, from: Vec3, dir: Vec3, len: number, c?: Color): Obj3 {
  const T = three()!; const m = new T.Mesh(geo().sphere, mat3(c ?? PAL.ink, { transparent: true, opacity: 0.5 })); setLobe3(m, from, dir, len); g.add(m); return m;
}
/* one, two or three parallel sticks between two atoms */
function bond3(g: Obj3, a: Vec3, b: Vec3, order = 1, r = 0.07, c?: Color): readonly Obj3[] {
  const T = three()!; const A = vec3(a), B = vec3(b), d = B.clone().sub(A).normalize();
  const side = Math.abs(d.y) < 0.9 ? new T.Vector3().crossVectors(d, up3()).normalize() : new T.Vector3(1, 0, 0);
  const offs = order === 1 ? [0] : order === 2 ? [-1.6, 1.6] : [-2.2, 0, 2.2];
  return offs.map((o) => stick3(g, A.clone().add(side.clone().multiplyScalar(o * r)).toArray() as unknown as Vec3, B.clone().add(side.clone().multiplyScalar(o * r)).toArray() as unknown as Vec3, order === 1 ? r : r * 0.75, c ?? PAL.ink));
}
/* an arrow from a to b of shaft radius r; the head is a cone, and the tip comes back for a label */
function arrow3(g: Obj3, a: Vec3, b: Vec3, r = 0.045, c?: Color): Obj3 {
  const T = three()!; const A = vec3(a), B = vec3(b), d = B.clone().sub(A), L = d.length(), hl = Math.min(0.32, L * 0.45), u = d.clone().normalize(), base = B.clone().sub(u.clone().multiplyScalar(hl));
  stick3(g, A.toArray() as unknown as Vec3, base.toArray() as unknown as Vec3, r, c ?? PAL.ink);
  const cone = new T.Mesh(geo().cone, mat3(c ?? PAL.ink)); cone.position.copy(base).add(u.clone().multiplyScalar(hl / 2)); cone.quaternion.setFromUnitVectors(up3(), u); cone.scale.set(r * 3.2, hl, r * 3.2); g.add(cone);
  return B;
}
function polyline3(g: Obj3, pts: readonly Vec3[], c?: Color): Obj3 {
  const T = three()!; const l = new T.Line(new T.BufferGeometry().setFromPoints(pts.map(vec3)), new T.LineBasicMaterial({ color: new T.Color(c ?? PAL.ink) })); g.add(l); return l;
}
/* the arc of the angle between directions a and b about centre c at radius R, and its midpoint pushed out for a label */
function arc3(g: Obj3, a: Vec3, b: Vec3, R: number, c: Vec3 = [0, 0, 0], col?: Color): Vec3 {
  const ua = V3.unit(a), ub = V3.unit(b), pts: Vec3[] = [];
  for (let i = 0; i <= 24; i++) pts.push(V3.add(c, V3.mul(slerp3(ua, ub, i / 24), R)));
  polyline3(g, pts, col); return V3.add(c, V3.mul(V3.unit(slerp3(ua, ub, 0.5)), R + 0.18));
}
function box3(g: Obj3, p: Vec3, size: readonly [number, number, number], c: Color, extra?: Record<string, unknown>): Obj3 {
  const T = three()!; const m = new T.Mesh(new T.BoxGeometry(size[0], size[1], size[2]), mat3(c, extra)); m.position.copy(vec3(p)); g.add(m); return m;
}
/* A hand the figure poses rather than draws (hand.ts): `aim` is the way the straight fingers point,
   `palm` the way the palm faces and the fingers curl, and the thumb lies along aim × palm on a right
   hand. Three passes make it read as one body over whatever is behind it: a depth pass, an ink
   outline from the back faces of a slightly larger hand, and the fill at half opacity. The wrist
   sits at `at`, or the hand is placed so its fingers close round `grip`. The ink and fill
   materials ride on userData for a figure that recolours without rebuilding, and every mesh
   names its part (palm, wrist, thumb, index, middle, ring, little) in userData.part. */
export type HandOpts = {
  curl?: number; thumb?: Thumb; right?: boolean; scale?: number; color?: Color; ink?: Color; opacity?: number;
  aim?: Vec3; palm?: Vec3; at?: Vec3; grip?: Vec3;
};
const HAND_RIM = 0.0065;
const cross3 = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
/* the palm's direction made square to aim, or a default one where it is missing or along aim */
function palmOf(A: Vec3, palm?: Vec3): Vec3 {
  const fall: Vec3 = Math.abs(A[2]) > 0.9 ? [0, -1, 0] : [0, 0, 1];
  const sq = (p: Vec3): Vec3 => V3.add(p, V3.mul(A, -V3.dot(A, p)));
  const N = sq(palm ?? fall);
  return Math.hypot(N[0], N[1], N[2]) > 1e-6 ? V3.unit(N) : V3.unit(sq(fall));
}
function hand3(o: HandOpts = {}): Obj3 {
  const T = three()!, G = geo(), op = o.opacity ?? 1, k = o.scale ?? 1;
  const h = new T.Group();
  const pre = new T.MeshBasicMaterial({ colorWrite: false, transparent: true, depthWrite: true });
  const ink = new T.MeshBasicMaterial({ color: new T.Color(o.ink ?? PAL.ink), side: T.BackSide, transparent: true, opacity: op, depthWrite: false });
  const fill = new T.MeshBasicMaterial({ color: new T.Color(o.color ?? PAL.muted), transparent: true, opacity: 0.5 * op, depthWrite: false });
  const parts = handParts(o);
  ([[pre, 10, 0], [ink, 11, HAND_RIM], [fill, 12, 0]] as const).forEach(([mat, order, dd]) => parts.forEach((p) => {
    const put = (g: Obj3, place: (m: Obj3) => void): void => { const m = new T.Mesh(g, mat); m.renderOrder = order; m.userData.part = p.body; place(m); h.add(m); };
    if ('c' in p) { put(G.sphere, (m) => { m.position.set(...p.c); m.scale.set(p.r[0] + dd, p.r[1] + dd, p.r[2] + dd); }); return; }
    put(G.cyl, (m) => { m.scale.set(p.r + dd, 1, p.r + dd); setStick3(m, p.a, p.b); });
    [p.a, p.b].forEach((q) => put(G.sphere, (m) => { m.position.set(...q); m.scale.setScalar(p.r + dd); }));
  }));
  const A = V3.unit(o.aim ?? [1, 0, 0]), N = palmOf(A, o.palm);
  h.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(vec3(A), vec3(cross3(A, N)), vec3(V3.mul(N, -1))));
  h.scale.set(k, o.right === false ? -k : k, k);
  if (o.grip) h.position.copy(vec3(o.grip)).sub(vec3(GRIP).multiply(h.scale).applyQuaternion(h.quaternion));
  else if (o.at) h.position.copy(vec3(o.at));
  h.userData.ink = ink; h.userData.fill = fill;
  return h;
}
const MESH = { vec: vec3, mat: mat3, geo, sphere: sphere3, stick: stick3, setStick: setStick3, lobe: lobe3, setLobe: setLobe3, bond: bond3, arrow: arrow3, polyline: polyline3, arc: arc3, box: box3, hand: hand3 };

const VICON = {
  spin: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v4h-4"/></svg>',
  out: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="M8 11h6M20 20l-4.5-4.5"/></svg>',
  in: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="M8 11h6M11 8v6M20 20l-4.5-4.5"/></svg>',
};
function vbtn(bar: HTMLElement, html: string, title: string, cls = ''): HTMLButtonElement {
  const b = el('button', 'vbtn' + (cls ? ' ' + cls : ''), html); b.type = 'button'; b.title = title; b.setAttribute('aria-label', title); bar.appendChild(b); return b;
}
/* Without three.js an object that takes any call, property or assignment, so a figure's scene code
   runs on to its end; with it the stub hands out real groups that are never drawn. */
function inert(): Obj3 {
  const own: Record<PropertyKey, unknown> = { children: [], userData: {}, visible: true };
  const p: Obj3 = new Proxy(() => p, {
    get: (_, k) => (k in own ? own[k] : k === 'then' ? undefined : k === Symbol.toPrimitive ? () => 0 : (own[k] = inert())),
    set: (_, k, v) => { own[k] = v; return true; },
  });
  return p;
}
const stub = (stage: HTMLElement): View3d => {
  const T = three(), wrap = el('p', 'three-none', 'This figure needs WebGL, which this browser does not provide.'); stage.appendChild(wrap);
  const nil = (): void => {};
  return { wrap, scene: T ? new T.Scene() : inert(), camera: T ? new T.PerspectiveCamera() : inert(), part: () => (T ? new T.Group() : inert()), label: () => el('span'), headline: () => el('span'), clear: nil, project: () => [0, 0] as Pt, move: nil, invalidate: nil, pickable: (m: Obj3) => m, setView: nil, dispose: nil, get turned() { return false; },
    at: { yaw: 0, pitch: 0, zoom: 1, target: [0, 0, 0] }, look: nil, glide: () => Promise.resolve(), onReader: () => nil };
};

function view3d(stage: HTMLElement, opts: View3dOpts = {}): View3d {
  const T = three(); if (!T) return stub(stage);
  const H = +(stage.dataset.h ?? 0) || opts.h || 480;
  const dist = opts.dist ?? 7, zoomMin = opts.zoomMin ?? 0.55, zoomMax = opts.zoomMax ?? 2.6;
  const pitchLim = opts.pitch ?? ([-Math.PI / 2, Math.PI / 2] as const);
  const yawLim = opts.yaw ?? 'free';
  const spinMode: Spin = opts.spin ?? 'off';
  let renderer: Obj3 = null;
  try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true }); } catch { return stub(stage); }
  const wrap = el('div', 'three-wrap'); wrap.style.setProperty('--three-h', String(H)); stage.appendChild(wrap);
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(30, 2, 0.1, 100); camera.position.set(0, 0, dist); camera.lookAt(0, 0, 0);
  const lamp = new T.DirectionalLight(0xffffff, 0.8); lamp.position.set(-3, 5, 7); scene.add(lamp); scene.add(new T.AmbientLight(0xffffff, 0.62));
  let head: HTMLElement | null = null;
  const book = cur;   /* the headline's TeX is set under the book the scene was made for */
  const parts: Obj3[] = [], labels: { el: HTMLElement; p: Obj3; g: Obj3; dy: number }[] = [], picks: { m: Obj3; name: string }[] = [];
  let yaw = 0, pitch = opts.tilt ?? 0.32, zoom = 1, target: Vec3 = [0, 0, 0];
  let gliding: { from: CamView; to: CamView; t0: number; ms: number; e: Ease; done: () => void } | null = null;
  const readers = new Set<() => void>();
  const byHand = (): void => { if (gliding) { const g = gliding; gliding = null; g.done(); } readers.forEach((f) => f()); };
  let spinning = spinMode === 'idle' && !REDUCED, dragging = false, last: readonly [number, number] = [0, 0], need = true, alive = true, seen = true, turned = false;
  const orbit = new T.Quaternion(), qy = new T.Quaternion(), turn = new T.Quaternion(), AX = new T.Vector3(1, 0, 0), UP = new T.Vector3(0, 1, 0);
  const orient = (): void => { orbit.setFromAxisAngle(AX, pitch).multiply(qy.setFromAxisAngle(UP, yaw)); need = true; };
  const aim = (y: Radians, p: Radians): void => {
    yaw = yawLim === 'free' ? y : clamp(y, yawLim[0], yawLim[1]);
    pitch = pitchLim === 'free' ? p : clamp(p, pitchLim[0], pitchLim[1]); orient();
  };
  const setZoom = (z: number): void => { zoom = clamp(z, zoomMin, zoomMax); camera.position.set(target[0], target[1], target[2] + dist / zoom); camera.updateProjectionMatrix(); need = true; };
  const viewNow = (): CamView => ({ yaw, pitch, zoom, target });
  const fill = (to: CamAim): CamView => ({ ...viewNow(), ...to });
  const put = (c: CamView): void => { target = c.target; aim(c.yaw, c.pitch); setZoom(c.zoom); };
  const look = (to: CamAim): void => { gliding?.done(); gliding = null; spinning = false; markSpin(); put(fill(to)); };
  const glide = (to: CamAim, ms = 2000, e: Ease = ease.smooth): Promise<void> => new Promise((done) => {
    look({});
    if (REDUCED || ms <= 0) { put(fill(to)); done(); return; }
    gliding = { from: viewNow(), to: fill(to), t0: performance.now(), ms, e, done };
  });
  const glideStep = (now: number): void => {
    if (!gliding) return;
    const g = gliding, k = Math.min(1, (now - g.t0) / g.ms), q = g.e(k);
    put({ yaw: lerp(g.from.yaw, g.to.yaw, q), pitch: lerp(g.from.pitch, g.to.pitch, q), zoom: lerp(g.from.zoom, g.to.zoom, q), target: g.from.target.map((x, i) => lerp(x, g.to.target[i], q)) as unknown as Vec3 });
    if (k >= 1) { gliding = null; g.done(); }
  };
  const v: View3d = {
    wrap, scene, camera,
    /* a group the drag turns about its own centre, placed at x; a figure with panels has several.
       The orbit is composed outside the group's own rotation, so a turn the figure gives it holds. */
    part(x = 0) {
      const g = new T.Group(); g.position.set(x, 0, 0);
      g.updateMatrix = (): void => { g.matrix.compose(g.position, turn.multiplyQuaternions(orbit, g.quaternion), g.scale); g.matrixWorldNeedsUpdate = true; };
      scene.add(g); parts.push(g); orient(); return g;
    },
    /* the label s at point p of group g, in the page's face, kept dy pixels above the point */
    label(s, p, g, dy = 0, cls = '') { const e = el('div', 'lab3d' + (cls ? ' ' + cls : ''), s); wrap.appendChild(e); labels.push({ el: e, p: vec3(p), g, dy }); return e; },
    /* The scene's headline. A `.lab3d` label is one line pinned to a point of the scene; a
       headline belongs to the stage rather than to the scene, so it sits centred at the top
       edge and wraps over as many lines as the sentence takes, the way `F.headline` does on
       a canvas. Calling it again rewrites the same band. */
    headline(s) {
      if (!head) { head = el('div', 'lab3d head3d'); wrap.appendChild(head); }
      if (head.dataset.s === s) return head;
      head.dataset.s = s; head.innerHTML = s;
      const prev = cur; cur = book;
      try { renderMath(head); } finally { cur = prev; }
      return head;
    },
    clear() {
      const shared = Object.values(geo());
      /* A mesh may wear several materials — a box with a different face on each
         side — and a list of them has no dispose of its own; letting that throw
         would leave the renderer itself undisposed, since the teardown runs
         through here. */
      const drop = (m: Obj3): void => { (Array.isArray(m) ? m : [m]).forEach((x: Obj3) => x?.dispose?.()); };
      parts.forEach((g: Obj3) => { g.traverse((o: Obj3) => { if (o.material) drop(o.material); if (o.geometry && !shared.includes(o.geometry)) o.geometry.dispose(); }); g.clear(); });
      labels.forEach((l) => l.el.remove()); labels.length = 0; picks.length = 0; need = true;
    },
    /* the point p of group g on the canvas, in canvas pixels */
    project(p, g) { const w = vec3(p); g.localToWorld(w); w.project(camera); return [((w.x + 1) / 2) * wrap.clientWidth, ((1 - w.y) / 2) * wrap.clientHeight]; },
    move(e, p) { const l = labels.find((x) => x.el === e); if (l) l.p.set(p[0], p[1], p[2]); need = true; },
    invalidate() { need = true; },
    pickable(m, name) {
      const inScene = (o: Obj3): boolean => { for (let x = o; x; x = x.parent) if (x === scene) return true; return false; };
      for (let i = picks.length - 1; i >= 0; i--) if (!inScene(picks[i].m)) picks.splice(i, 1);   /* a rebuilt layer's old meshes */
      picks.push({ m, name }); return m;
    },
    setView: aim,
    dispose,
    get turned() { return turned; },
    get at() { return viewNow(); },
    look, glide,
    onReader(f) { readers.add(f); return () => { readers.delete(f); }; },
  };
  renderer.setClearColor(0x000000, 0); wrap.appendChild(renderer.domElement);
  const live = { wrap, dispose }; views3d.add(live);
  renderer.domElement.addEventListener('webglcontextlost', (e: Event) => e.preventDefault());
  renderer.domElement.addEventListener('webglcontextrestored', () => { need = true; });
  function size(): void {
    const w = wrap.clientWidth || 800, h = wrap.clientHeight || Math.round((w * H) / LW);
    renderer.setPixelRatio(glRatio(w, h, devRatio(), pinch())); renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix(); need = true;
  }
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(size) : null; ro?.observe(wrap); size(); densityWatchers.add(size);
  const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver((es) => es.forEach((e) => { seen = e.isIntersecting; if (seen) need = true; }), { rootMargin: '120px' }) : null; io?.observe(wrap);

  /* the button row: what dragging cannot say, and only what the figure asked for */
  const bar = el('div', 'view3d-bar');
  const spinBtn = spinMode === 'idle' ? vbtn(bar, VICON.spin, 'Auto-rotate', 'spin') : null;
  function markSpin(): void { spinBtn?.setAttribute('aria-pressed', String(spinning)); spinBtn?.classList.toggle('on', spinning); }
  spinBtn?.addEventListener('click', () => { byHand(); spinning = !spinning; markSpin(); need = true; }); markSpin();
  (opts.views ?? []).forEach((p) => vbtn(bar, p.label, 'View: ' + p.label, 'named').addEventListener('click', () => { byHand(); spinning = false; markSpin(); turned = true; aim(p.yaw, p.pitch); }));
  if (opts.zoom) {
    vbtn(bar, VICON.out, 'Zoom out').addEventListener('click', () => { byHand(); setZoom(zoom / 1.25); });
    vbtn(bar, VICON.in, 'Zoom in').addEventListener('click', () => { byHand(); setZoom(zoom * 1.25); });
  }
  if (bar.childElementCount) stage.appendChild(bar);

  /* the orbit: a turntable within the bounds the figure set, and the wheel zooms over the canvas */
  wrap.addEventListener('pointerdown', (e) => { byHand(); dragging = true; spinning = false; markSpin(); last = [e.clientX, e.clientY]; wrap.setPointerCapture(e.pointerId); wrap.style.cursor = 'grabbing'; e.preventDefault(); });
  wrap.addEventListener('pointermove', (e) => {
    if (dragging) { turned = true; aim(yaw + (e.clientX - last[0]) * 0.009, pitch + (e.clientY - last[1]) * 0.009); last = [e.clientX, e.clientY]; return; }
    pick(e);
  });
  const up = (): void => { dragging = false; wrap.style.cursor = 'grab'; };
  wrap.addEventListener('pointerup', up); wrap.addEventListener('pointercancel', up);
  wrap.addEventListener('pointerleave', () => tip.hide());
  wrap.addEventListener('wheel', (e) => { e.preventDefault(); byHand(); setZoom(zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12)); }, { passive: false });

  /* the name of the body under the pointer, for the figures that register one */
  const tip = tipOf(stage), ray = new T.Raycaster(), ndc = new T.Vector2();
  function pick(e: PointerEvent): void {
    if (!picks.length) return;
    const r = wrap.getBoundingClientRect(), s = stage.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(picks.filter((p) => shownAll(p.m)).map((p) => p.m), false)[0];
    const name = hit ? picks.find((p) => p.m === hit.object)?.name : undefined;
    if (name) tip.show(e.clientX - s.left, e.clientY - s.top - 12, name); else tip.hide();
  }

  /* a label stands clear of the headline's band: its foot no higher than the band's foot plus its own height */
  function place(): void {
    const w = wrap.clientWidth, h = wrap.clientHeight, t = vec3([0, 0, 0]);
    const band = head ? head.offsetTop + head.offsetHeight : 0, tall = labels.map((l) => (band ? l.el.offsetHeight : 0));
    labels.forEach((l, i) => { t.copy(l.p); l.g.localToWorld(t); t.project(camera); l.el.style.left = ((t.x + 1) / 2) * w + 'px'; l.el.style.top = Math.max(band + tall[i], ((1 - t.y) / 2) * h - l.dy) + 'px'; });
  }
  function dispose(): void { if (!alive) return; alive = false; views3d.delete(live); densityWatchers.delete(size); ro?.disconnect(); io?.disconnect(); v.clear(); renderer?.dispose(); }
  let prev = performance.now(), away = false;
  function frame(now: number): void {
    if (!alive) return;
    if (away !== !wrap.isConnected) { away = !away; need = true; }
    const shown = seen && !away;
    const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
    glideStep(now);
    if (spinning && shown && !paused) aim(yaw + 0.22 * dt, pitch);
    if (need && shown) { renderer.render(scene, camera); place(); need = false; opts.onRender?.(); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return v;
}

/* ---------- story time: trackers, tours and formula morphs ----------
   Physical time is a sim's cycles, linear, under its own transport. Story
   time is authored: eased, in beats, and never mixed with the first. A
   tracker holds a number the draw reads and eases it to a new value; a tour
   is a script of beats that moves the same controls a reader could and the
   camera, under a transport of its own; a morph re-typesets a formula and
   carries its tagged terms from the old layout to the new. */
type FigRef = { readonly fig: HTMLElement } | HTMLElement;
const figOf = (d: FigRef): HTMLElement => ('fig' in d ? d.fig : d);
const touch = (fig: HTMLElement): void => { const s = sims.find((x) => x.fig === fig); if (s) s.dirty = true; };
const now = (): number => performance.now();

/* `F.tween(d, v0)`: `.v` for the draw; `.to(v, ms, ease)` eases there and keeps the figure redrawing,
   resolving on arrival or when a later `.to`/`.set` takes over. Reduced motion jumps. */
export type Tween = { readonly v: number; to: (x: number, ms?: number, e?: Ease) => Promise<void>; set: (x: number) => void };
function tween(d: FigRef, v0 = 0): Tween {
  const fig = figOf(d); let v = v0;
  let run: { tick: (t: number) => void; done: () => void } | null = null;
  const stop = (): void => { if (!run) return; const r = run; run = null; tickers.delete(r.tick); r.done(); };
  return {
    get v() { return v; },
    set(x) { stop(); v = x; touch(fig); },
    to(x, ms = 1000, e = ease.smooth) {
      stop();
      if (REDUCED || ms <= 0) { v = x; touch(fig); return Promise.resolve(); }
      return new Promise<void>((done) => {
        const from = v, t0 = now();
        const tick = (t: number): void => { const k = Math.min(1, (t - t0) / ms); v = lerp(from, x, e(k)); touch(fig); if (k >= 1) { tickers.delete(tick); run = null; done(); } };
        run = { tick, done }; tickers.add(tick);
      });
    },
  };
}

/* A tour: beats played on the story clock. A beat's knobs are [control, value] pairs naming the
   objects `ctl`, `choice` and `select` returned; its view is a camera aim for `spec.camera`; `run(k)`
   receives the beat's eased progress and `enter()` fires when the beat becomes the current one. */
type Knob = Slider | Picker;
export type Beat = BeatTime & {
  readonly name: string;
  readonly knobs?: readonly (readonly [Knob, Scripted])[];
  readonly view?: CamAim;
  readonly run?: (k: number) => void;
  readonly enter?: () => void;
};
export type TourSpec = { readonly beats: readonly Beat[]; readonly camera?: View3d };
export type Tour = {
  play: () => void; pause: () => void; seek: (s: number) => void; next: () => void; prev: () => void;
  readonly t: number; readonly total: number; readonly playing: boolean; readonly bar: HTMLElement;
};
const HAND_BACK_MS = 800;
const knobNow = (k: Knob): Scripted => ('v' in k ? k.v : k.value);
const driveKnob = (k: Knob, x: Scripted): void => { if ('v' in k) { if (typeof x === 'number') k.drive(x); } else k.drive(String(x)); };
const CAM_KEYS = ['yaw', 'pitch', 'zoom', 't0', 't1', 't2'] as const;
type CamKey = typeof CAM_KEYS[number];
const camFlat = (c: CamView): Record<CamKey, number> => ({ yaw: c.yaw, pitch: c.pitch, zoom: c.zoom, t0: c.target[0], t1: c.target[1], t2: c.target[2] });
const camOf = (f: Record<CamKey, number>): CamView => ({ yaw: f.yaw, pitch: f.pitch, zoom: f.zoom, target: [f.t0, f.t1, f.t2] });
const camAim = (a: CamAim | undefined, key: CamKey): number | undefined => {
  if (!a) return undefined;
  if (key === 'yaw' || key === 'pitch' || key === 'zoom') return a[key];
  return a.target?.[+key[1]];
};

function tour(d: FigRef, spec: TourSpec): Tour {
  const fig = figOf(d), beats = spec.beats, cam = spec.camera, tl = timeline(beats);
  const knobs = [...new Set(beats.flatMap((b) => (b.knobs ?? []).map(([k]) => k)))];
  const knobBase = new Map(knobs.map((k) => [k, knobNow(k)] as const));
  const knobTargets = new Map(knobs.map((k) => [k, beats.map((b) => b.knobs?.find(([x]) => x === k)?.[1])] as const));
  const camScripted = !!cam && beats.some((b) => b.view);
  const camBase = cam ? camFlat(cam.at) : null;
  const scriptAt = (s: number): { knobs: Map<Knob, Scripted>; cam: CamView | null } => ({
    knobs: new Map(knobs.map((k) => [k, valueAt(knobBase.get(k)!, knobTargets.get(k)!, tl, beats, s)] as const)),
    cam: camScripted && camBase ? camOf(Object.fromEntries(CAM_KEYS.map((key) => [key, valueAt(camBase[key], beats.map((b) => camAim(b.view, key)), tl, beats, s)])) as Record<CamKey, number>) : null,
  });

  let t = 0, playing = false, started = false, handed = false, current = -1, speed = 1;
  let back: { t0: number; from: Map<Knob, Scripted>; cam: CamView | null } | null = null;
  const runK = beats.map(() => NaN);
  const apply = (s: number): void => {
    const st = scriptAt(s);
    st.knobs.forEach((x, k) => driveKnob(k, x));
    if (st.cam && cam) cam.look(st.cam);
    beats.forEach((b, i) => { if (!b.run) return; const k = progressAt(tl, beats, i, s); if (k !== runK[i]) { runK[i] = k; b.run(k); } });
    const i = beatAt(tl, s); if (i !== current) { current = i; beats[i]?.enter?.(); }
    touch(fig); sync();
  };
  const blend = (k: number): void => {
    if (!back) return;
    const st = scriptAt(t), q = ease.smooth(k);
    st.knobs.forEach((x, kn) => { const f = back!.from.get(kn); driveKnob(kn, typeof x === 'number' && typeof f === 'number' ? lerp(f, x, q) : x); });
    if (st.cam && back.cam && cam) { const a = camFlat(back.cam), b = camFlat(st.cam); cam.look(camOf(Object.fromEntries(CAM_KEYS.map((key) => [key, lerp(a[key], b[key], q)])) as Record<CamKey, number>)); }
    touch(fig);
  };

  const bar = el('div', 'transport tour'); bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Tour');
  const btn = (html: string, title: string): HTMLButtonElement => { const b = el('button', 'tbtn', html); b.type = 'button'; b.title = title; b.setAttribute('aria-label', title); return b; };
  const playB = btn(TICON.play, 'Play'), speedB = speedBtn(() => speed, (x) => { speed = x; }, () => sync());
  const track = el('span', 'tour-track');
  const scrub = el('input', 'scrub s-t'); scrub.type = 'range'; scrub.min = '0'; scrub.max = String(tl.total); scrub.step = 'any'; scrub.setAttribute('aria-label', 'Story time');
  track.appendChild(scrub);
  tl.starts.forEach((s0, i) => {
    const tick = el('span', 'tour-tick'); tick.style.setProperty('--at', String(tl.total > 0 ? s0 / tl.total : 0)); tick.title = beats[i].name;
    tick.addEventListener('click', () => seek(s0)); track.appendChild(tick);
  });
  bar.append(playB, track, speedB);
  function sync(): void {
    const name = beats[beatAt(tl, t)]?.name ?? '';
    playB.innerHTML = playing ? TICON.pause : TICON.play;
    playB.title = (playing ? 'Pause: ' : 'Play: ') + name; playB.setAttribute('aria-label', playB.title);
    bar.classList.toggle('playing', playing); scrub.value = String(t); speedB.textContent = SPEED_LABEL[speed];
  }
  const endOf = (i: number): number => tl.starts[i] + tl.moves[i];
  function seek(s: number): void { playing = false; back = null; handed = false; t = clamp(s, 0, tl.total); apply(t); }
  function pause(): void { playing = false; back = null; sync(); }
  function play(): void {
    if (REDUCED) { next(); return; }
    if (t >= tl.total) { t = 0; handed = true; }
    playing = true;
    if (handed) { handed = false; back = { t0: now(), from: new Map(knobs.map((k) => [k, knobNow(k)] as const)), cam: cam ? cam.at : null }; const i = beatAt(tl, t); if (i !== current) { current = i; beats[i]?.enter?.(); } }
    sync();
  }
  function next(): void { const i = beatAt(tl, t); const j = Math.min(beats.length - 1, t < tl.starts[i] ? i : i + 1); seek(REDUCED ? endOf(j) : (j === i ? tl.total : tl.starts[j])); }
  function prev(): void { const i = beatAt(tl, t); const j = t > (REDUCED ? endOf(i) : tl.starts[i] + 300) ? i : Math.max(0, i - 1); seek(REDUCED ? endOf(j) : tl.starts[j]); }
  playB.addEventListener('click', () => { if (playing) pause(); else play(); });
  scrub.addEventListener('input', () => seek(+scrub.value));

  /* the reader's hand: anything on the figure the tour did not cause pauses it and leaves the reader in charge */
  const takeOver = (e: Event): void => { if (driving || bar.contains(e.target as Node)) return; if (playing || back) pause(); handed = true; };
  ['input', 'change', 'pointerdown', 'wheel'].forEach((ev) => fig.addEventListener(ev, takeOver, { capture: true, passive: true }));
  cam?.onReader(() => { if (playing || back) pause(); handed = true; });

  const tick = (at: number, dt: number): void => {
    if (!fig.isConnected || !onScreen.has(fig)) return;
    if (!started) { started = true; if (!REDUCED) play(); }
    if (paused) return;
    if (back) { const k = Math.min(1, (at - back.t0) / HAND_BACK_MS); blend(k); if (k >= 1) { back = null; apply(t); } return; }
    if (!playing) return;
    t = Math.min(tl.total, t + dt * 1000 * speed); apply(t);
    if (t >= tl.total) { playing = false; sync(); }
  };
  vio?.observe(fig); tickers.add(tick); tourTicks.set(tick, fig);
  const stage = fig.querySelector('.stage'); (stage ?? fig).appendChild(bar);
  apply(0);
  return { play, pause, seek, next, prev, get t() { return t; }, get total() { return tl.total; }, get playing() { return playing; }, bar };
}

/* A story slider: the slider is the figure's one timeline. Its transport plays it stop to stop, each
   an eased move and a rest, by `drive`, so the figure reacts as to a hand; dragging it scrubs, and
   the stops are its special values. A figure with physical cycles has that clock and no story. */
export type StoryStop = number | { readonly v: number; readonly label?: string };
export type StoryOpts = { readonly stops: readonly StoryStop[]; readonly ms?: number; readonly rest?: number; readonly ease?: Ease };
export type Story = { play: () => void; pause: () => void; next: () => void; prev: () => void; readonly playing: boolean; readonly bar: HTMLElement };
const storied = new WeakSet<HTMLElement>();
const hasCycles = (fig: HTMLElement): boolean => sims.some((x) => x.fig === fig && x.cycles.length > 0);
function story(d: FigRef, slider: Slider, o: StoryOpts): Story | null {
  const fig = figOf(d);
  if (hasCycles(fig) || pendingCycles.length) { console.error('F.story: this figure already runs on physical cycles; a figure has one timeline'); return null; }
  storied.add(fig);
  const stops = o.stops.map((x) => (typeof x === 'number' ? x : x.v)), ms = o.ms ?? BEAT_MS, rest = o.rest ?? REST_MS, e = o.ease ?? ease.smooth;
  slider.mark(o.stops.map((x) => (typeof x === 'number' ? { at: x } : { at: x.v, label: x.label })));
  let playing = false, started = false, move: { from: number; to: number; t0: number } | null = null, restUntil = 0, speed = 1;
  const after = (v: number): number => stops.findIndex((x) => x > v + 1e-9);
  const before = (v: number): number => stops.reduce((b, x, i) => (x < v - 1e-9 ? i : b), -1);
  const go = (i: number): void => { const to = stops[i]; if (REDUCED) { move = null; slider.drive(to); return; } move = { from: slider.v, to, t0: now() }; };
  const bar = el('div', 'transport tour story'); bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', 'Story');
  const btn = (html: string, title: string): HTMLButtonElement => { const b = el('button', 'tbtn', html); b.type = 'button'; b.title = title; b.setAttribute('aria-label', title); return b; };
  const playB = btn(TICON.play, 'Play'), speedB = speedBtn(() => speed, (x) => { speed = x; }, () => sync());
  bar.append(playB);
  const sync = (): void => { playB.innerHTML = playing ? TICON.pause : TICON.play; playB.title = playing ? 'Pause' : 'Play'; playB.setAttribute('aria-label', playB.title); speedB.textContent = SPEED_LABEL[speed]; bar.classList.toggle('playing', playing); };
  function pause(): void { playing = false; move = null; sync(); }
  function play(): void {
    if (REDUCED) { next(); return; }
    playing = true; restUntil = 0;
    const i = after(slider.v); go(i < 0 ? 0 : i); sync();
  }
  function next(): void { const i = after(slider.v); playing = false; if (i >= 0) go(i); sync(); }
  function prev(): void { const i = before(slider.v); playing = false; if (i >= 0) go(i); sync(); }
  playB.addEventListener('click', () => { if (playing) pause(); else play(); });
  const takeOver = (ev: Event): void => { if (driving || [playB, speedB].some((b) => b.contains(ev.target as Node))) return; if (playing || move) pause(); };
  ['input', 'pointerdown'].forEach((ev) => fig.addEventListener(ev, takeOver, { capture: true, passive: true }));
  const tick = (at: number): void => {
    if (!fig.isConnected || !onScreen.has(fig)) return;
    if (!started) { started = true; if (!REDUCED) play(); }
    if (paused) return;
    if (move) {
      const k = Math.min(1, (at - move.t0) * speed / ms); slider.drive(lerp(move.from, move.to, e(k)));
      if (k >= 1) { move = null; restUntil = at + rest / speed; }
      return;
    }
    if (!playing || at < restUntil) return;
    const i = after(slider.v);
    if (i >= 0) go(i); else { playing = false; sync(); }
  };
  vio?.observe(fig); tickers.add(tick); tourTicks.set(tick, fig);
  const stage = fig.querySelector('.stage'); (stage ?? fig).appendChild(bar); sync();
  storyScrubber(fig, bar, slider, o.stops.map((x, i) => ({ v: stops[i], label: typeof x === 'number' ? '' : x.label ?? '' })));
  bar.appendChild(speedB);
  return { play, pause, next, prev, get playing() { return playing; }, bar };
}
/* The story slider's track leaves the controls row for the transport, as its scrubber: the stops'
   names beneath their circles, the current one emphasised; names that would collide hide, the
   current one and then the ends kept first. */
function storyScrubber(fig: HTMLElement, bar: HTMLElement, slider: Slider, stops: readonly { v: number; label: string }[]): void {
  const track = slider.el.querySelector<HTMLElement>('.ctl-track'), inp = track?.querySelector<HTMLInputElement>('input');
  if (!track || !inp) return;
  const lo = +inp.min, hi = +inp.max;
  track.classList.add('story-track'); slider.el.remove(); bar.appendChild(track);
  const labs = el('span', 'story-labs'); labs.setAttribute('aria-hidden', 'true'); track.appendChild(labs);
  const tags = stops.map((s) => { const t = el('span', 'story-lab', s.label); labs.appendChild(t); return t; });
  const current = (): number => stops.reduce((b, s, i) => (s.v <= slider.v + 1e-9 ? i : b), 0);
  const GAP = 8;
  const lay = (): void => {
    const W = labs.clientWidth; if (!W) return;
    const cur = current();
    tags.forEach((t, i) => t.classList.toggle('on', i === cur));
    const box = tags.map((t, i) => { const w = t.offsetWidth, x = W * (stops[i].v - lo) / (hi - lo || 1); const l = clampTo(x - w / 2, -8, W + 8 - w); return { l, r: l + w }; });
    const order = [cur, 0, tags.length - 1, ...tags.map((_, i) => i)].filter((i, k, a) => a.indexOf(i) === k && stops[i].label);
    const kept: number[] = [];
    order.forEach((i) => { if (kept.every((j) => box[i].r + GAP <= box[j].l || box[j].r + GAP <= box[i].l)) kept.push(i); });
    tags.forEach((t, i) => { t.style.left = box[i].l + 'px'; t.classList.toggle('off', !kept.includes(i)); });
  };
  fig.addEventListener('input', lay); fig.addEventListener('change', lay);
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(lay).observe(labs);
  requestAnimationFrame(lay);
}

/* `F.presence(d)`: an alpha per named layer that fades in and out, with an optional shift (Manim's
   fade with a shift), and keeps the figure redrawing. A layer never shown or hidden is present. */
export type Shift = readonly [Logical, Logical];
export type FadeOpts = { readonly ms?: number; readonly shift?: Shift };
export type Presence = {
  show: (key: string, on: boolean, o?: FadeOpts) => void;
  swap: (from: string, to: string, o?: FadeOpts) => void;
  a: (key: string) => number;
  off: (key: string) => Shift;
  draw: (ctx: Ctx, key: string, draw: () => void) => void;
};
const FADE_MS = 500, SMOOTH_EASE = 'cubic-bezier(0.45, 0, 0.55, 1)';
type Layer = { a: number; from: number; to: number; t0: number; ms: number; shift: Shift; tick: ((t: number) => void) | null };
function presence(d: FigRef): Presence {
  const fig = figOf(d), layers = new Map<string, Layer>();
  const show = (key: string, on: boolean, o: FadeOpts = {}): void => {
    const L = layers.get(key) ?? { a: 1, from: 1, to: 1, t0: 0, ms: 0, shift: [0, 0], tick: null }; layers.set(key, L);
    const to = on ? 1 : 0; if (L.tick && L.to === to) return;
    if (L.tick) { tickers.delete(L.tick); L.tick = null; }
    const ms = o.ms ?? FADE_MS; L.shift = o.shift ?? [0, 0];
    if (REDUCED || ms <= 0 || L.a === to) { L.a = L.from = L.to = to; touch(fig); return; }
    Object.assign(L, { from: L.a, to, t0: now(), ms });
    const tick = (t: number): void => { const k = Math.min(1, (t - L.t0) / L.ms); L.a = lerp(L.from, L.to, ease.smooth(k)); touch(fig); if (k >= 1) { tickers.delete(tick); L.tick = null; } };
    L.tick = tick; tickers.add(tick);
  };
  /* arriving, a layer slides in from -shift; leaving, it slides out toward +shift */
  const off = (key: string): Shift => {
    const L = layers.get(key); if (!L) return [0, 0];
    const q = (1 - L.a) * (L.to > L.from ? -1 : 1);
    return [q * L.shift[0], q * L.shift[1]];
  };
  const a = (key: string): number => layers.get(key)?.a ?? 1;
  return { show, swap: (from, to, o) => { show(from, false, o); show(to, true, o); }, a, off, draw: (ctx, key, f) => faded(ctx, a(key), off(key), f) };
}

/* `F.fade3(group, a)`: a three.js group at opacity a; its materials go transparent below 1, get back
   their own transparency and depth writing at 1, and the group is hidden at 0. */
type Fade3Mat = { opacity: number; transparent: boolean; depthWrite: boolean; needsUpdate: boolean; userData: Record<string, unknown> };
type Own3 = { opacity: number; transparent: boolean; depthWrite: boolean };
function fade3(obj: Obj3, a: number): void {
  obj.visible = a > 0.001;
  obj.traverse((o: { material?: Fade3Mat | Fade3Mat[] }) => {
    const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    ms.forEach((m) => {
      const own = (m.userData.fade3 ??= { opacity: m.opacity, transparent: m.transparent, depthWrite: m.depthWrite }) as Own3;
      const t = a < 1 || own.transparent; if (t !== m.transparent) m.needsUpdate = true;
      m.opacity = own.opacity * a; m.transparent = t; m.depthWrite = a < 1 ? false : own.depthWrite;
    });
  });
}
/* `F.fadeEl(el, on, { ms, shift })`: the same for a DOM part (a label, a graph panel); shift in pixels. */
function fadeEl(node: HTMLElement, on: boolean, o: FadeOpts = {}): void {
  const ms = REDUCED ? 0 : o.ms ?? FADE_MS, [dx, dy] = o.shift ?? [0, 0];
  const trans = ms ? `opacity ${ms}ms ${SMOOTH_EASE}, transform ${ms}ms ${SMOOTH_EASE}` : '';
  if (on) {
    if (node.style.visibility === 'hidden' && ms) { node.style.transition = ''; node.style.transform = `translate(${-dx}px, ${-dy}px)`; void node.offsetWidth; }
    node.style.transition = trans; node.style.visibility = ''; node.removeAttribute('aria-hidden'); node.style.opacity = '1'; node.style.transform = '';
    return;
  }
  node.style.transition = trans; node.setAttribute('aria-hidden', 'true'); node.style.opacity = '0'; node.style.transform = `translate(${dx}px, ${dy}px)`;
  const hide = (): void => { if (node.style.opacity === '0') node.style.visibility = 'hidden'; };
  if (ms) setTimeout(hide, ms); else hide();
}

/* `F.morph(host, tex, display?, opts?)`: a formula whose glyphs bend into the next one when its
   set of \mk{key}{…} terms changes, and whose values bend as the reader drags;
   `F.morphAt(host, a, b, k)` is a key-set morph's frame at k.
   Both set MathJax outlines under the active book's macros (texmorph), and KaTeX while MathJax cannot be had. */
const morphOpts = (d: boolean | MorphOpts | undefined, o: MorphOpts | undefined): [boolean, MorphOpts] =>
  typeof d === 'object' ? [false, d] : [d ?? false, o ?? {}];
setMorphFallback((host, s, display) => tex(host, s, display));
function morph(host: HTMLElement, s: string, display?: boolean | MorphOpts, opts?: MorphOpts): void {
  const [d, o] = morphOpts(display, opts);
  texMorph(host, s, d, o, macrosAt(host));
}
function morphAt(host: HTMLElement, a: string, b: string, k: number, display?: boolean | MorphOpts, opts?: MorphOpts): void {
  const [d, o] = morphOpts(display, opts);
  texMorphAt(host, a, b, k, d, o, macrosAt(host));
}

/* `F.readout(d)`: a readout of a morphing formula over a note line. The note is for a fact the
   figure makes visible and nothing else says: a figure whose caption or readout already says it has
   no note, and the parts of a figure (headline, scene, controls, readout, note) are never a form to
   fill in (root rule 26.13). `set(tex, note?, { form, ...morph opts })`
   morphs the formula, forcing a morph by meaning when `form` differs from the last call's; the note is
   left as it was when not given, and its `$…$` is set under the page's macros. */
export type Readout = { readonly formula: HTMLElement; readonly note: HTMLElement; set: (tex: string, note?: string, o?: MorphOpts & { readonly form?: unknown }) => void };
function readout(d: { readonly readout: HTMLElement }): Readout {
  const formula = el('div'), note = el('small');
  d.readout.append(formula, note);
  let last: { form: unknown } | null = null, said: string | undefined;
  const set = (s: string, n?: string, o: MorphOpts & { readonly form?: unknown } = {}): void => {
    const { form, ...opts } = o;
    const force = !!opts.force || (last !== null && form !== last.form);
    last = { form };
    morph(formula, s, force ? { ...opts, force } : opts);
    if (n === undefined || n === said) return;
    said = n; note.textContent = n; renderMath(note);
  };
  return { formula, note, set };
}

/* ---------- Calculus Chapter 6: solids of revolution ----------
   A region of the book's plane turned about a line of that plane (solid.ts holds the geometry, pure).
   `F.revolve.mesh` lays the body the region sweeps into a view3d group, lit, in its colour, with the rims
   and, where the turn stops short, the outline at each cut in ink; `F.revolve.paint` draws faces as a
   locked view on the canvas, far to near, for the still figures of a page that already holds its 3D
   scenes. Both take the region as its closed outline (`between`, `betweenY`, `rect`, `strips`) or, for a
   surface of revolution, a curve with `closed: false`. */
type RevOpts = { readonly sweep?: REV.Sweep; readonly closed?: boolean; readonly alpha?: number; readonly edges?: Color | null };
function revMesh(g: Obj3, line: readonly REV.P2[], axis: REV.Axis, color: Color, o: RevOpts = {}): Obj3 {
  const T = three(); if (!T) return inert();
  const { sweep = {}, closed = true, alpha: a = 1, edges = PAL.ink } = o;
  const body = new T.Group();
  const mat = new T.MeshPhongMaterial({ color: new T.Color(color), shininess: 24, side: T.DoubleSide, transparent: a < 1, opacity: a, depthWrite: a >= 1, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const sheet = (pts: readonly REV.P3[], tris: readonly (readonly [number, number, number])[]): void => {
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pts.flatMap((p) => [p[0], p[1], p[2]]), 3));
    geo.setIndex(tris.flatMap((t) => [t[0], t[1], t[2]])); geo.computeVertexNormals();
    body.add(new T.Mesh(geo, mat));
  };
  REV.runs(line, closed).forEach((run) => {
    const rows = REV.grid(run, axis, sweep), w = run.length, tris: [number, number, number][] = [];
    for (let j = 0; j + 1 < rows.length; j++) for (let i = 0; i + 1 < w; i++) { const k = j * w + i; tris.push([k, k + 1, k + w + 1], [k, k + w + 1, k + w]); }
    sheet(rows.flat(), tris);
  });
  const cut = !REV.full(sweep), tris = closed && cut ? REV.triangulate(line) : [];
  if (closed && cut) [sweep.from ?? 0, sweep.to ?? 2 * Math.PI].forEach((ang) => sheet(line.map((p) => REV.turn(p, axis, ang)), tris));
  if (edges) {
    const ink = new T.LineBasicMaterial({ color: new T.Color(edges) });
    const poly = (pts: readonly REV.P3[]): void => { body.add(new T.Line(new T.BufferGeometry().setFromPoints(pts.map((p) => new T.Vector3(p[0], p[1], p[2]))), ink)); };
    const runs = REV.runs(line, closed);
    runs.forEach((run, i) => { if (closed || i > 0) poly(REV.ring(run[0], axis, sweep)); });
    if (!closed) poly(REV.ring(line[line.length - 1], axis, sweep));
    if (cut) [sweep.from ?? 0, sweep.to ?? 2 * Math.PI].forEach((ang) => poly((closed ? [...line, line[0]] : line).map((p) => REV.turn(p, axis, ang))));
  }
  g.add(body); return body;
}
/* one layer of a painted scene: faces in a colour, at an opacity */
type RevLayer = { readonly faces: readonly REV.Face[]; readonly color: Color; readonly alpha?: number };
function revPaint(ctx: Ctx, cam: REV.Cam, layers: readonly RevLayer[]): void {
  const all = layers.flatMap((l) => l.faces.map((f) => ({ f, l, d: f.reduce((s, p) => s + cam.depth(p), 0) / f.length })));
  all.sort((p, q) => q.d - p.d);
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineWidth = 1;
  all.forEach(({ f, l }) => {
    const c = mixColor(l.color, PAL.ink, cam.light(REV.normal(f)));
    const a = l.alpha ?? 1;
    ctx.globalAlpha = a; ctx.fillStyle = c; ctx.strokeStyle = c;
    ctx.beginPath(); f.forEach((p, i) => { const [x, y] = cam.P(p); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.closePath();
    ctx.fill(); if (a >= 1) ctx.stroke();   /* the hairline hides the seams between opaque faces; on a translucent one it would show as a grid */
  });
  ctx.restore();
}
const revolve = { ...REV, mesh: revMesh, paint: revPaint };

/* ---------- Calculus Chapter 3: the derivative traced, and one-sided secants ----------
   `F.deriv({ f, df })` keeps the stretch of x its point has been dragged over. Its draw(ctx, top, below,
   x, { fc, lc, dc }) plots f on the top axes with the tangent at x, and on the axes below, on the same
   x-range, f′ faint over the whole range and solid over the stretch traced, a dot at (x, f′(x)) pinned
   at the edge when it is off the box, and a dashed drop joining the two points; it returns f′(x).
   reset(x?) forgets the stretch. `F.secants(ctx, ax, f, a, h, color)` draws the secants from (a, f(a))
   through the points at a − h, dashed, and a + h, dotted, and returns their slopes { left, right }. */
type DerivColors = { readonly fc: Color; readonly lc: Color; readonly dc: Color };
export type Tracer = { draw: (ctx: Ctx, top: Axes, below: Axes, x: number, c: DerivColors) => number; reset: (x?: number) => void; readonly seen: Range | null };
function deriv(o: { readonly f: (x: number) => number; readonly df?: (x: number) => number }): Tracer {
  const df = o.df ?? ((x: number): number => slope(o.f, x));
  let seen: Range | null = null;
  const draw = (ctx: Ctx, top: Axes, below: Axes, x: number, { fc, lc, dc }: DerivColors): number => {
    const sp = widen(seen, x); seen = sp;
    plot(ctx, top, o.f, fc);
    const m = tangent(ctx, top, o.f, x, lc, { df, w: 4 });
    plot(ctx, below, df, alpha(dc, 0.3), { w: 3 });
    if (sp[1] > sp[0]) plot(ctx, below, df, dc, { x: sp });
    const y = o.f(x), inY = (ax: Axes, v: number): Logical => Math.min(ax.box.b, Math.max(ax.box.t, ax.Y(v)));
    if (Number.isFinite(y) && Number.isFinite(m)) line(ctx, top.X(x), inY(top, y), below.X(x), inY(below, m), alpha(PAL.ink, 0.4), 2.5, [4, 8]);
    if (Number.isFinite(m)) pinned(ctx, below.box, below.X, below.Y, x, m, dc);
    return m;
  };
  return { draw, reset: (x) => { seen = x === undefined ? null : [x, x]; }, get seen() { return seen; } };
}
function secants(ctx: Ctx, ax: Axes, f: (x: number) => number, a: number, h: number, color: Color, o: { w?: number } = {}): { left: number; right: number } {
  const s = sides(f, a, h), fa = f(a), w = o.w ?? 4;
  through(ctx, ax, a, fa, s.left, color, w, [10, 10]); through(ctx, ax, a, fa, s.right, color, w, [3, 7]);
  return s;
}

/* ---------- Calculus Chapter 8: direction fields ----------
   `F.slopefield.field(ctx, ax, f, color, { n, len, w })` draws the direction field of y′ = f(x, y): a
   short segment of slope f(x, y) at the centre of each cell of an n[0] by n[1] grid (by default one cell
   about every 60 canvas units), len canvas units long (by default 0.62 of the smaller cell side), the
   same length on the canvas whatever its slope, clipped to the box; where f is not a number there is
   none, and an infinite slope is vertical. `.curve(ctx, ax, f, p, color, { w })` traces the solution
   through p = [x₀, y₀] both ways across the box and draws it, returning its points; with `F.drag(d,
   { x, y })` on two sliders, p is the point the reader drags. `.euler(ctx, ax, f, p, h, n, color, { w,
   dots })` draws Euler's polyline of n steps of size h from p, its vertices dotted, and returns its
   points. `.trace`, `.steps` (Euler's points), `.grid` and `.segment` are the pure geometry of slope.ts. */
type FieldOpts = { readonly n?: readonly [number, number]; readonly len?: number; readonly w?: number };
function slopeField(ctx: Ctx, ax: Axes, f: SLOPE.Fxy, color: Color, o: FieldOpts = {}): void {
  const q = during(arrivalAt(ctx), 0, 0.5); if (!(q > 0)) return;
  const { box, X, Y, xr, yr } = ax, W = box.r - box.l, H = box.b - box.t;
  const n = o.n ?? [Math.max(2, Math.round(W / 60)), Math.max(2, Math.round(H / 60))];
  const len = o.len ?? 0.62 * Math.min(W / n[0], H / n[1]), sx = W / (xr[1] - xr[0]), sy = H / (yr[1] - yr[0]);
  ctx.save(); clipTo(ctx, box); ctx.globalAlpha *= q; ctx.strokeStyle = color; ctx.lineWidth = o.w ?? 2.5; ctx.lineCap = 'round';
  ctx.beginPath();
  SLOPE.grid(xr, yr, n).forEach(([x, y]) => {
    const s = SLOPE.segment(x, y, f(x, y), len, sx, sy); if (!s) return;
    ctx.moveTo(X(s[0][0]), Y(s[0][1])); ctx.lineTo(X(s[1][0]), Y(s[1][1]));
  });
  ctx.stroke(); ctx.restore();
}
function polyIn(ctx: Ctx, ax: Axes, pts: readonly SLOPE.P2[], color: Color, w: number, q: number): void {
  const { box, X, Y } = ax, far = (v: number): Logical => Math.min(box.b + 1e4, Math.max(box.t - 1e4, Y(v)));
  ctx.save(); clipTo(ctx, box, box.l + (box.r - box.l) * q); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(X(x), far(y)) : ctx.moveTo(X(x), far(y)))); ctx.stroke(); ctx.restore();
}
function slopeCurve(ctx: Ctx, ax: Axes, f: SLOPE.Fxy, p: SLOPE.P2, color: Color, o: { readonly w?: number } = {}): SLOPE.P2[] {
  const pts = SLOPE.trace(f, p, ax.xr, ax.yr), q = during(arrivalAt(ctx), 0.3, 1);
  if (q > 0) polyIn(ctx, ax, pts, color, o.w ?? 5, q);
  return pts;
}
function slopeEuler(ctx: Ctx, ax: Axes, f: SLOPE.Fxy, p: SLOPE.P2, h: number, n: number, color: Color, o: { readonly w?: number; readonly dots?: boolean } = {}): SLOPE.P2[] {
  const pts = SLOPE.euler(f, p, h, n), q = during(arrivalAt(ctx), 0.3, 1); if (!(q > 0)) return pts;
  polyIn(ctx, ax, pts, color, o.w ?? 4, q);
  const { box, X, Y } = ax, reach = box.l + (box.r - box.l) * q;
  if (o.dots ?? true) pts.forEach(([x, y]) => { const px = X(x), py = Y(y); if (px <= reach + 1 && px >= box.l - 1 && py >= box.t - 1 && py <= box.b + 1) dot(ctx, px, py, color, true, 6); });
  return pts;
}
const slopefield = { field: slopeField, curve: slopeCurve, euler: slopeEuler, trace: SLOPE.trace, steps: SLOPE.euler, grid: SLOPE.grid, segment: SLOPE.segment };

/* ---------- Calculus Chapters 12 to 16: space ----------
   `F.space3d(d, { box, h, turn, tilt, spin, zoom, ... })` is a mathematical 3D scene (root rule 28.3) in
   the book's coordinates, z up, framed on the box [[x0, x1], [y0, y1], [z0, z1]]: free orbit, ink and type
   hues, no ground. `turn` and `tilt` are the opening yaw and pitch (the book's view by default, x toward
   the reader); the rest are view3d's. The scene is layers of marks (space.ts builds them): `S.set(key,
   marks)` replaces one layer, rebuilt only when its marks or colours changed, so a moving point costs one
   small layer a frame. `S.headline(s)` is the stage's band. `S.drag({ at, on, move })` lets the reader
   take the point at() (within 24 px of it) and slide it over the sheet of layer `on`; move gets what the
   sheet reports ([x, y] on a graph, [u, v] on a surface) and the 3D point. Labels are page text over the
   scene. Without WebGL the same layers are painted on a canvas from the opening view, still and flat,
   and drag is left to the sliders. `F.space` holds the builders, the pure geometry and four flat parts
   drawn on `axes`: field2, flow2, region2, cells2. */
type SpaceOpts = View3dOpts & { readonly box: SPACE.Box3; readonly turn?: Radians; readonly fit?: number; readonly locked?: boolean };
type SpaceDrag = { readonly at: () => SPACE.V3 | null; readonly on: string; readonly move: (q: readonly number[], p: SPACE.V3) => void };
export type Space3d = {
  readonly v: View3d | null; readonly flat: boolean; readonly box: SPACE.Box3;
  set: (key: string, marks: readonly SPACE.Mark[]) => void;
  headline: (s: string) => void;
  drag: (o: SpaceDrag) => void;
};
type SpaceLab = { readonly el: HTMLElement; p: SPACE.V3; s: string };
type SpaceLayer = { sig: number; marks: readonly SPACE.Mark[]; g: Obj3 | null; labs: SpaceLab[] };
const SPACE_TOKENS: Readonly<Record<string, () => Color>> = { ink: () => PAL.ink, muted: () => PAL.muted, guide: () => alpha(PAL.ink, 0.4) };
const tone = (c: Color): Color => SPACE_TOKENS[c]?.() ?? c;
/* a cheap signature of a layer's marks, its colours as drawn now */
function sigOf(x: unknown, h = 7): number {
  if (typeof x === 'number') return (Math.imul(h, 31) + Math.round(x * 4096)) | 0;
  if (typeof x === 'string') { const t = tone(x); for (let i = 0; i < t.length; i++) h = (Math.imul(h, 31) + t.charCodeAt(i)) | 0; return h; }
  if (Array.isArray(x)) { for (const y of x) h = sigOf(y, h); return (Math.imul(h, 37) + x.length) | 0; }
  if (x && typeof x === 'object') for (const y of Object.values(x)) h = sigOf(y, h);
  return h;
}
/* a polyline cut into its dashes, on and off in scene units */
function dashed(pts: readonly SPACE.V3[], on: number, off: number): SPACE.V3[][] {
  const out: SPACE.V3[][] = []; let cur: SPACE.V3[] = [], left = on, drawing = true;
  for (let i = 0; i + 1 < pts.length; i++) {
    let a = pts[i]; const b = pts[i + 1]; let L = SPACE.norm(SPACE.sub(b, a));
    if (drawing && !cur.length) cur.push(a);
    while (L > left) {
      const q = SPACE.add(a, SPACE.mul(SPACE.sub(b, a), left / L));
      if (drawing) { cur.push(q); out.push(cur); cur = []; } else cur = [q];
      L -= left; a = q; drawing = !drawing; left = drawing ? on : off;
    }
    left -= L; if (drawing) cur.push(b);
  }
  if (cur.length > 1) out.push(cur);
  return out;
}
const m2r = (p: SPACE.V3): REV.P3 => [p[0], p[2], -p[1]];   /* the book's z-up frame into the y-up frame of the scene and the painter */

function space3d(d: { readonly stage: HTMLElement; readonly fig: HTMLElement }, opts: SpaceOpts): Space3d {
  const box = opts.box, H = +(d.stage.dataset.h ?? 0) || opts.h || 480, book = cur;
  const centre = box.map(([a, b]) => (a + b) / 2) as unknown as SPACE.V3, R = Math.hypot(...box.map(([a, b]) => (b - a) / 2));
  const turn = opts.turn ?? -2.25, tilt = opts.tilt ?? 0.42, dist = opts.dist ?? 7;
  const layers = new Map<string, SpaceLayer>();
  let headS = '', headEl: HTMLElement | null = null;
  const T0 = three(), T = T0 as Three;
  /* Calculus Chapter 12: locked paints the opening view on a canvas and opens no WebGL context, for a still copy of a book figure, since a page holds only a few live scenes */
  const v = opts.locked ? stub(d.stage) : view3d(d.stage, { ...opts, h: H, dist, tilt, onRender: () => { place(); opts.onRender?.(); } });
  const flat = !!opts.locked || !T0 || !v.wrap.classList.contains('three-wrap');
  const s = (opts.fit ?? 2.1) / R, px = (2 * dist * Math.tan(Math.PI / 12)) / H / s;
  let inner: Obj3 = null;
  if (!flat) {
    v.setView(turn, tilt);
    const part = v.part(0); part.rotation.x = -Math.PI / 2;
    inner = new T.Group(); inner.scale.setScalar(s); inner.position.set(-centre[0] * s, -centre[1] * s, -centre[2] * s); part.add(inner);
  }
  const canvas = flat ? makeCanvas(d.stage, H) : null;
  if (canvas) { v.wrap.replaceWith(canvas); }

  /* ---- three.js ---- */
  /* a dark hue glows a little of itself, so the face turned from the lamp still reads as its colour */
  const lum = (c: Obj3): number => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  const rgb = (c: Color): { c: Obj3; a: number } => { const q = parseRgba(tone(c)) ?? [0, 0, 0, 1]; return { c: new T.Color(q[0] / 255, q[1] / 255, q[2] / 255), a: q[3] }; };
  function build(g: Obj3, marks: readonly SPACE.Mark[]): void {
    const mats = new Map<string, Obj3>();
    const mat = (kind: 'basic' | 'lit', c: Color, a = 1): Obj3 => {
      const key = `${kind}|${tone(c)}|${a}`, got = mats.get(key); if (got) return got;
      const { c: col, a: a0 } = rgb(c), op = a * a0, see = op < 1;
      const m = kind === 'basic' ? new T.MeshBasicMaterial({ color: col, transparent: see, opacity: op, depthWrite: !see })
        : new T.MeshPhongMaterial({ color: col, emissive: col.clone().multiplyScalar(0.4 * (1 - lum(col))), shininess: 24, side: T.DoubleSide, transparent: see, opacity: op, depthWrite: !see, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
      mats.set(key, m); return m;
    };
    const lineMat = (c: Color): Obj3 => { const key = `line|${tone(c)}`, got = mats.get(key); if (got) return got; const { c: col, a } = rgb(c); const m = new T.LineBasicMaterial({ color: col, transparent: a < 1, opacity: a }); mats.set(key, m); return m; };
    const mesh = (pos: readonly number[], idx: readonly number[] | null, m: Obj3, uv?: readonly number[]): Obj3 => {
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      if (uv) geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
      if (idx) geo.setIndex([...idx]); geo.computeVertexNormals();
      const o = new T.Mesh(geo, m); g.add(o); return o;
    };
    const tubes = (runs: readonly (readonly SPACE.V3[])[], w: number, c: Color): Obj3 => {
      const pos: number[] = [], idx: number[] = [];
      runs.forEach((pts) => { const t = SPACE.tube(pts, (w / 2) * px, 6), base = pos.length / 3; pos.push(...t.pos); t.idx.forEach((i) => idx.push(i + base)); });
      return pos.length ? mesh(pos, idx, mat('basic', c)) : null;
    };
    const thin = (runs: readonly (readonly SPACE.V3[])[], c: Color, pairs: boolean): Obj3 => {
      const pts = runs.flatMap((r) => (pairs ? r : r.flatMap((p, i) => (i && i < r.length - 1 ? [p, p] : [p]))));
      if (pts.length < 2) return null;
      const o = new T.LineSegments(new T.BufferGeometry().setFromPoints(pts.map(vec3)), lineMat(c)); g.add(o); return o;
    };
    const stroke = (runs: readonly (readonly SPACE.V3[])[], w: number, c: Color, pairs = false): Obj3 => (w > 1.5 ? tubes(runs, w, c) : thin(runs, c, pairs));
    const named = (m: SPACE.Mark, o: Obj3): void => { if (o && m.name) v.pickable(o, m.name); };
    marks.forEach((m) => {
      if (m.k === 'line') named(m, stroke(m.dash ? dashed(m.pts, m.dash[0] * px, m.dash[1] * px) : [m.pts], m.w ?? 4, m.color));
      else if (m.k === 'segs') named(m, stroke(m.segs, m.w ?? 2, m.color, true));
      else if (m.k === 'arrow') {
        const d3 = SPACE.sub(m.b, m.a), L = SPACE.norm(d3); if (L < px) return;
        const u = SPACE.mul(d3, 1 / L), w = m.w ?? 5, hl = Math.min(0.4 * L, 18 * px), base = SPACE.sub(m.b, SPACE.mul(u, hl));
        named(m, stroke([[m.a, base]], w, m.color));
        const cone = new T.Mesh(geo().cone, mat('basic', m.color)); cone.position.copy(vec3(SPACE.add(base, SPACE.mul(u, hl / 2)))); cone.quaternion.setFromUnitVectors(up3(), vec3(u)); cone.scale.set(Math.max(w * 1.3, 7) * px, hl, Math.max(w * 1.3, 7) * px); g.add(cone); named(m, cone);
      } else if (m.k === 'dot') {
        const o = new T.Mesh(geo().sphere, mat('lit', m.hollow ? PAL.panel : m.color)); o.position.copy(vec3(m.p)); o.scale.setScalar((m.r ?? 8) * px); g.add(o); named(m, o);
      } else if (m.k === 'sheet') {
        const nj = m.rows.length, ni = m.rows[0]?.length ?? 0, pos: number[] = [], uv: number[] = [], idx: number[] = [];
        m.rows.forEach((row, j) => row.forEach((p, i) => { pos.push(p[0], p[1], p[2]); uv.push(i / Math.max(1, ni - 1), j / Math.max(1, nj - 1)); }));
        for (let j = 0; j + 1 < nj; j++) for (let i = 0; i + 1 < ni; i++) { const k = j * ni + i; idx.push(k, k + 1, k + ni + 1, k, k + ni + 1, k + ni); }
        const o = mesh(pos, idx, mat('lit', m.color, m.alpha ?? 0.8), uv); o.userData.param = m.param; named(m, o);
      } else if (m.k === 'faces') {
        const pos: number[] = [];
        m.faces.forEach((f) => { for (let i = 1; i + 1 < f.length; i++) [f[0], f[i], f[i + 1]].forEach((p) => pos.push(p[0], p[1], p[2])); });
        if (pos.length) named(m, mesh(pos, null, mat('lit', m.color, m.alpha ?? 0.8)));
      }
    });
  }
  function drop(g: Obj3): void {
    const shared = Object.values(geo());
    g.traverse((o: Obj3) => { if (o !== g) { o.material?.dispose?.(); if (o.geometry && !shared.includes(o.geometry)) o.geometry.dispose(); } });
    g.clear();
  }
  /* the labels of a layer, reusing its elements; a changed string is set again, under the scene's book */
  function labelsOf(L: SpaceLayer, marks: readonly SPACE.Mark[]): void {
    const want = marks.filter((m): m is Extract<SPACE.Mark, { k: 'label' }> => m.k === 'label');
    while (L.labs.length > want.length) L.labs.pop()!.el.remove();
    want.forEach((m, i) => {
      const lab = L.labs[i] ?? (L.labs[i] = { el: el('div', 'lab3d' + (m.cls ? ' ' + m.cls : '')), p: m.p, s: '' });
      if (!lab.el.isConnected) v.wrap.appendChild(lab.el);
      lab.p = m.p; lab.el.style.color = m.color ? tone(m.color) : '';
      if (lab.s !== m.s) { lab.s = m.s; lab.el.innerHTML = m.s; const prev = cur; cur = book; try { renderMath(lab.el); } finally { cur = prev; } }
    });
  }
  function place(): void {
    if (flat) return;
    const band = headEl ? headEl.offsetTop + headEl.offsetHeight : 0;
    layers.forEach((L) => L.labs.forEach(({ el: e, p }) => {
      const [x, y] = v.project(p, inner), lift = e.classList.contains('tick') || e.classList.contains('bare') ? 0 : 10;
      e.style.left = x + 'px'; e.style.top = Math.max(band + e.offsetHeight, y - lift) + 'px';
    }));
  }

  /* ---- the flat view ---- */
  let queued = false;
  const flatHits: Hit[] = [];
  if (canvas) hover(d.stage, () => flatHits, canvas);
  function paint(): void {
    queued = false; if (!canvas) return;
    flatHits.length = 0;
    const { ctx } = begin(canvas), k = ((0.5 * Math.min(H, LW)) / R) * ((opts.fit ?? 2.1) / 2.1);   /* Calculus Ch 12: the painted view takes fit too */
    const cam = REV.camera({ yaw: -turn, pitch: tilt, dist: 2600, cx: LW / 2, cy: H / 2 + (headS ? 18 : 0), s: k, at: m2r(centre) });
    const P = (p: SPACE.V3): Pt => cam.P(m2r(p)) as unknown as Pt;
    const all = [...layers.values()].flatMap((L) => L.marks);
    revPaint(ctx, cam, all.flatMap((m) => (m.k === 'sheet' ? [{ faces: SPACE.quads(m.rows).map((f) => f.map(m2r)), color: tone(m.color), alpha: m.alpha ?? 0.8 }]
      : m.k === 'faces' ? [{ faces: m.faces.map((f) => f.map(m2r)), color: tone(m.color), alpha: m.alpha ?? 0.8 }] : [])));
    const path = (pts: readonly SPACE.V3[], c: Color, w: number, dash?: SPACE.Dash): void => {
      ctx.save(); ctx.strokeStyle = tone(c); ctx.lineWidth = w; if (dash) ctx.setLineDash([...dash]); ctx.beginPath();
      pts.forEach((p, i) => { const [x, y] = P(p); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }); ctx.stroke(); ctx.restore();
    };
    all.forEach((m) => {
      if (!m.name) return;
      const at = (p: SPACE.V3, r: number): void => { const [x, y] = P(p); flatHits.push({ x, y, r, name: m.name! }); };
      if (m.k === 'arrow') at(m.b, 22); else if (m.k === 'dot') at(m.p, 16);
      else if (m.k === 'line') m.pts.forEach((p, i) => { if (i % 6 === 0) at(p, 12); });
      else if (m.k === 'sheet') m.rows.forEach((row, j) => row.forEach((p, i) => { if (i % 4 === 0 && j % 4 === 0) at(p, 26); }));
    });
    flatHits.sort((p, q) => p.r - q.r);
    all.forEach((m) => {
      if (m.k === 'line') path(m.pts, m.color, m.w ?? 4, m.dash);
      else if (m.k === 'segs') m.segs.forEach((q) => path(q, m.color, m.w ?? 2));
      else if (m.k === 'arrow') { const a = P(m.a), b = P(m.b); arrow(ctx, a[0], a[1], b[0], b[1], tone(m.color), m.w ?? 5); }
      else if (m.k === 'dot') { const p = P(m.p); dot(ctx, p[0], p[1], tone(m.color), !m.hollow, m.r ?? 8); }
    });
    all.forEach((m) => {
      if (m.k !== 'label') return;
      const [x, y] = P(m.p), c = m.color ? tone(m.color) : PAL.ink;
      if (m.cls === 'tick') text(ctx, m.s, x, y, PAL.muted, { size: 17, align: 'center', tex: true });
      else text(ctx, m.s, x, m.cls ? y : y - 22, c, { size: 22, weight: 600, align: 'center', tex: true, bg: m.cls ? undefined : PAL.panel });
    });
    if (headS) headline(ctx, headS);
  }
  const repaint = (): void => { if (!queued) { queued = true; queueMicrotask(paint); } };

  return {
    v: flat ? null : v, flat, box,
    set(key, marks) {
      const L = layers.get(key) ?? (layers.set(key, { sig: 0, marks: [], g: null, labs: [] }), layers.get(key)!);
      L.marks = marks;
      if (flat) { repaint(); return; }
      const sig = sigOf(marks); if (sig === L.sig && L.g) return;
      L.sig = sig;
      if (!L.g) { L.g = new T.Group(); inner.add(L.g); } else drop(L.g);
      build(L.g, marks); labelsOf(L, marks); v.invalidate();
    },
    headline(str) { headS = str; if (flat) repaint(); else headEl = v.headline(str); },
    drag(o) {
      if (flat) return;
      const wrap = v.wrap, ray = new T.Raycaster(), ndc = new T.Vector2(); let held = false;
      const near = (e: PointerEvent): boolean => { const q = o.at(); if (!q) return false; const [x, y] = v.project(q, inner), r = wrap.getBoundingClientRect(); return Math.hypot(e.clientX - r.left - x, e.clientY - r.top - y) < 24; };
      const slide = (e: PointerEvent): void => {
        const L = layers.get(o.on); if (!L?.g) return;
        const r = wrap.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, v.camera);
        const hit = ray.intersectObjects(L.g.children.filter((m: Obj3) => m.userData.param), false)[0]; if (!hit?.uv) return;
        const p = inner.worldToLocal(hit.point.clone());
        o.move(hit.object.userData.param(hit.uv.x, hit.uv.y), [p.x, p.y, p.z]);
      };
      wrap.addEventListener('pointerdown', (e) => { if (!near(e)) return; e.stopPropagation(); e.preventDefault(); held = true; wrap.setPointerCapture(e.pointerId); }, true);
      wrap.addEventListener('pointermove', (e) => { if (held) { e.stopPropagation(); slide(e); } else if (!e.buttons) wrap.style.cursor = near(e) ? 'move' : ''; }, true);
      const up = (): void => { held = false; };
      wrap.addEventListener('pointerup', up, true); wrap.addEventListener('pointercancel', up, true);
    },
  };
}

/* the flat parts, on a graph's axes */
type Field2 = (p: readonly number[]) => readonly number[];
/* A plane field as arrows at the centres of an n[0] by n[1] grid of cells (one about every 70 canvas
   units by default), the longest 0.85 of a cell on the canvas, or scale graph units long per unit of F. */
function field2(ctx: Ctx, ax: Axes, F: Field2, color: Color, o: { readonly n?: readonly [number, number]; readonly scale?: number; readonly w?: number } = {}): void {
  const q = during(arrivalAt(ctx), 0, 0.5); if (!(q > 0)) return;
  const { box, X, Y, xr, yr } = ax, W = box.r - box.l, Hh = box.b - box.t;
  const n = o.n ?? [Math.max(2, Math.round(W / 70)), Math.max(2, Math.round(Hh / 70))], cell = Math.min(W / n[0], Hh / n[1]);
  const sx = W / (xr[1] - xr[0]), sy = Hh / (yr[1] - yr[0]);
  const at = SLOPE.grid(xr, yr, n), vs = at.map((p) => F(p)).map(([a, b]): readonly [number, number] => [a * sx, -b * sy]);
  const big = Math.max(...vs.map(([a, b]) => (Number.isFinite(a) && Number.isFinite(b) ? Math.hypot(a, b) : 0)));
  const k = o.scale ?? (big > 0 ? (0.85 * cell) / big : 0);
  ctx.save(); ctx.globalAlpha *= q;
  at.forEach((p, i) => {
    const [a, b] = vs[i]; if (!(Math.hypot(a, b) * k > 3)) return;
    const x = X(p[0]) - (a * k) / 2, y = Y(p[1]) - (b * k) / 2;
    arrow(ctx, x, y, x + a * k, y + b * k, color, o.w ?? 3);
  });
  ctx.restore();
}
/* the flow line through seed traced across the box both ways, an arrowhead just past the seed; returns its points */
function flow2(ctx: Ctx, ax: Axes, F: Field2, seed: readonly [number, number], color: Color, o: { readonly w?: number } = {}): number[][] {
  const pts = SPACE.flow(F, seed, [ax.xr, ax.yr]), q = during(arrivalAt(ctx), 0.3, 1);
  if (!(q > 0)) return pts;
  polyIn(ctx, ax, pts as unknown as SLOPE.P2[], color, o.w ?? 5, q);
  const i = pts.findIndex((p) => p[0] === seed[0] && p[1] === seed[1]), j = Math.min(pts.length - 1, i + 8);
  if (i >= 0 && j > i && q >= 1) { const [a, b] = [pts[i], pts[j]]; arrow(ctx, ax.X(a[0]), ax.Y(a[1]), ax.X(b[0]), ax.Y(b[1]), color, o.w ?? 5); }
  return pts;
}
/* a plane region filled at alpha with its edges stroked; returns its outline */
function region2(ctx: Ctx, ax: Axes, R: SPACE.Region, color: Color, o: { readonly alpha?: number; readonly w?: number } = {}): SPACE.V3[] {
  const ol = SPACE.outline(R), q = during(arrivalAt(ctx), 0, 0.6);
  if (!(q > 0)) return ol;
  ctx.save(); clipTo(ctx, ax.box); ctx.globalAlpha *= q;
  ctx.fillStyle = alpha(color, o.alpha ?? 0.25); ctx.beginPath(); ol.forEach((p, i) => (i ? ctx.lineTo(ax.X(p[0]), ax.Y(p[1])) : ctx.moveTo(ax.X(p[0]), ax.Y(p[1])))); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = o.w ?? 3;
  SPACE.edges(R).forEach((e) => { ctx.beginPath(); e.forEach((p, i) => (i ? ctx.lineTo(ax.X(p[0]), ax.Y(p[1])) : ctx.moveTo(ax.X(p[0]), ax.Y(p[1])))); ctx.stroke(); });
  ctx.restore();
  return ol;
}
/* the cells of a double Riemann sum seen from above, each filled faintly and outlined, its sample point dotted */
function cells2(ctx: Ctx, ax: Axes, cells: readonly SPACE.Cell[], color: Color, o: { readonly alpha?: number; readonly dots?: boolean } = {}): void {
  const k = during(arrivalAt(ctx), 0, 0.6); if (!(k > 0)) return;
  ctx.save(); ctx.globalAlpha *= k; ctx.lineWidth = 1.5; ctx.strokeStyle = color; ctx.fillStyle = alpha(color, o.alpha ?? 0.18);
  cells.forEach((c, i) => {
    ctx.save(); ctx.globalAlpha *= stagger(k, i, cells.length, 0.02);
    ctx.beginPath(); c.outline.forEach((p, j) => (j ? ctx.lineTo(ax.X(p[0]), ax.Y(p[1])) : ctx.moveTo(ax.X(p[0]), ax.Y(p[1])))); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  });
  ctx.restore();
  if (o.dots ?? true) cells.forEach((c) => dot(ctx, ax.X(c.at[0]), ax.Y(c.at[1]), color, true, 5));
}
const space = { ...SPACE, field2, flow2, region2, cells2 };

/* ---------- Calculus Chapter 11: polar frames, polar curves and traced paths ----------
   `F.polar.frame(ctx, box, win, o)` sets an equal-scale frame on box holding the window
   win = { x: [x0, x1], y: [y0, y1] } (graph units, centred) and draws the polar grid under it: circles
   about the pole every o.ring units (1), spokes every 2π/o.spokes (12, so π/6), faint x- and y-axes,
   the radii of the rings along the polar axis and, unless o.angles is false, each spoke's angle
   beyond the largest ring the box holds; it returns axes as `axes` does. `.path(ctx, ax, p, [t0, t1],
   color, { w, upto, faint, marks, gap })` draws the path p(t) faint over its range and solid from t0
   to upto (all of it by default), arriving along its length, with marks arrowheads along the solid
   part pointing the way t runs, and no line across a jump wider than gap; `.curve(ctx, ax, f, [α, β],
   color, o)` does the same for r = f(θ). `.ray(ctx, ax, θ, r, color)` draws the ray from the pole at
   angle θ to the box's edge, and the opposite ray dashed where r < 0, and returns the canvas point of
   (r, θ). `.grip(d, { t, at, span })` lets the reader drag the point at(t) along its path, t a slider
   it moves (a polar curve's at is `polar.of(f)`), never farther than span from where the point is;
   `.grip(d, { t: θ slider, r: r slider })` drags a free polar point, θ turning with the pointer about
   the pole and r its distance, keeping its sign; each returns { draw(ctx, ax, color), at } as `drag`
   does. `.sectors(ctx, ax, f, α, β, n, color)` draws the n sectors of the Riemann sum of ½∫f² dθ
   (rᵢ = f(θᵢ)) and `.strips(ctx, ax, p, t0, t1, n, color)` the n rectangles under a path of the sum
   Σ y(tᵢ₋₁)(x(tᵢ) − x(tᵢ₋₁)), each cascading in and returning the sum. The pure geometry of polar.ts
   rides along (`cells` and `stripCells` are its sectors and strips). */
type PolarWin = { readonly x: Range; readonly y: Range };
type PolarFrameOpts = { readonly ring?: number; readonly spokes?: number; readonly angles?: boolean };
const piFrac = (k: number, n: number): string => {
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a), g = gcd(2 * k, n), p = (2 * k) / g, q = n / g;
  return k === 0 ? '0' : `${p === 1 ? '' : p}π${q === 1 ? '' : '/' + q}`;
};
function polarFrame(ctx: Ctx, box: Box, win: PolarWin, o: PolarFrameOpts = {}): Axes {
  const W = box.r - box.l, H = box.b - box.t, s = Math.min(W / (win.x[1] - win.x[0]), H / (win.y[1] - win.y[0]));
  const cx = (win.x[0] + win.x[1]) / 2, cy = (win.y[0] + win.y[1]) / 2;
  const xr: Range = [cx - W / (2 * s), cx + W / (2 * s)], yr: Range = [cy - H / (2 * s), cy + H / (2 * s)];
  const X: Scale = (v) => box.l + (v - xr[0]) * s, Y: Scale = (v) => box.b - (v - yr[0]) * s;
  const px = X(0), py = Y(0), ring = o.ring ?? 1, nsp = o.spokes ?? 12;
  const far = Math.max(...[[box.l, box.t], [box.r, box.t], [box.l, box.b], [box.r, box.b]].map(([x, y]) => Math.hypot(x - px, y - py)));
  const inner = Math.min(px - box.l, box.r - px, py - box.t, box.b - py);
  const fade = during(arrivalAt(ctx), 0, 0.4);
  ctx.save(); ctx.globalAlpha *= fade; clipTo(ctx, box); ctx.strokeStyle = PAL.rule; ctx.lineWidth = 1.5;
  for (let r = ring; r * s <= far; r += ring) { ctx.beginPath(); ctx.arc(px, py, r * s, 0, 2 * Math.PI); ctx.stroke(); }
  for (let i = 0; i < nsp; i++) { const a = (2 * Math.PI * i) / nsp; line(ctx, px, py, px + far * Math.cos(a), py - far * Math.sin(a), PAL.rule, 1.5); }
  line(ctx, box.l, py, box.r, py, PAL.muted, 2); line(ctx, px, box.t, px, box.b, PAL.muted, 2);
  ctx.restore();
  ctx.save(); ctx.globalAlpha *= fade;
  const R = Math.floor((inner - 34) / s / ring) * ring;
  for (let r = ring; r <= R && r * s < box.r - px - 14; r += ring) text(ctx, fmt(r, ring < 1 ? 1 : 0), px + r * s, py + 18, PAL.muted, { size: 17, align: 'center', bg: PAL.panel });
  const every = Math.max(1, Math.round(nsp / 12));
  if (o.angles !== false && R >= ring) for (let i = 0; i < nsp; i += every) {
    const a = (2 * Math.PI * i) / nsp, lx = px + (R * s + 26) * Math.cos(a), ly = py - (R * s + 22) * Math.sin(a);
    if (lx > box.l && lx < box.r && ly > box.t && ly < box.b) text(ctx, piFrac(i, nsp), lx, ly, PAL.muted, { size: 17, align: 'center', bg: PAL.panel });
  }
  ctx.restore();
  return { X, Y, box, xr, yr };
}
type PolarPathOpts = { readonly w?: number; readonly upto?: number; readonly faint?: number; readonly marks?: number; readonly gap?: number; readonly n?: number };
function strokeRuns(ctx: Ctx, ax: Axes, rs: readonly (readonly POLAR.P2[])[], color: Color, w: number): void {
  ctx.strokeStyle = color; ctx.lineWidth = w;
  rs.forEach((run) => { ctx.beginPath(); run.forEach(([x, y], i) => (i ? ctx.lineTo(ax.X(x), ax.Y(y)) : ctx.moveTo(ax.X(x), ax.Y(y)))); ctx.stroke(); });
}
function polarPathDraw(ctx: Ctx, ax: Axes, p: POLAR.Path, span: Range, color: Color, o: PolarPathOpts = {}): void {
  const q = during(arrivalAt(ctx), 0.3, 1); if (!(q > 0)) return;
  const [t0, t1] = span, up = Math.min(t1, Math.max(t0, o.upto ?? t1)), end = t0 + (up - t0) * q;
  const n = o.n ?? 900, gap = o.gap ?? (ax.xr[1] - ax.xr[0]) / 3, w = o.w ?? 5, faint = o.faint ?? 0.28;
  ctx.save(); clipTo(ctx, ax.box); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (faint > 0 && up < t1) strokeRuns(ctx, ax, POLAR.runs(p, t0, t1, n, gap), alpha(color, faint), Math.max(2, w - 2));
  if (end > t0) strokeRuns(ctx, ax, POLAR.runs(p, t0, end, Math.max(12, Math.round((n * (end - t0)) / (t1 - t0))), gap), color, w);
  const m = o.marks ?? 0, e = (t1 - t0) * 1e-4;
  for (let j = 1; j <= m && end > t0; j++) {
    const t = t0 + ((end - t0) * (j - 0.5)) / m, [x, y] = p(t), [xa, ya] = p(t - e), [xb, yb] = p(t + e);
    if (![x, y, xa, ya, xb, yb].every(Number.isFinite)) continue;
    const a = Math.atan2(ax.Y(yb) - ax.Y(ya), ax.X(xb) - ax.X(xa)), cx = ax.X(x), cy = ax.Y(y), hl = 16;
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(cx + hl * 0.6 * Math.cos(a), cy + hl * 0.6 * Math.sin(a));
    ctx.lineTo(cx - hl * 0.6 * Math.cos(a) + hl * 0.5 * Math.cos(a + Math.PI / 2), cy - hl * 0.6 * Math.sin(a) + hl * 0.5 * Math.sin(a + Math.PI / 2));
    ctx.lineTo(cx - hl * 0.6 * Math.cos(a) - hl * 0.5 * Math.cos(a + Math.PI / 2), cy - hl * 0.6 * Math.sin(a) - hl * 0.5 * Math.sin(a + Math.PI / 2));
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
const polarCurveDraw = (ctx: Ctx, ax: Axes, f: (th: number) => number, span: Range, color: Color, o: PolarPathOpts = {}): void => polarPathDraw(ctx, ax, POLAR.polarPath(f), span, color, o);
function polarRay(ctx: Ctx, ax: Axes, th: number, r: number, color: Color, o: { readonly w?: number } = {}): { x: Logical; y: Logical } {
  const px = ax.X(0), py = ax.Y(0), far = Math.hypot(ax.box.r - ax.box.l, ax.box.b - ax.box.t) * 2, c = Math.cos(th), s = Math.sin(th);
  ctx.save(); clipTo(ctx, ax.box);
  line(ctx, px, py, px + far * c, py - far * s, color, o.w ?? 3);
  if (r < 0) line(ctx, px, py, px - far * c, py + far * s, color, 2.5, [10, 10]);
  ctx.restore();
  const [x, y] = POLAR.xy(r, th); return { x: ax.X(x), y: ax.Y(y) };
}
type PolarGripOpts = { readonly t: Slider; readonly at?: POLAR.Path; readonly r?: Slider; readonly span?: number };
function polarGrip(d: { readonly fig: HTMLElement; readonly c: HTMLCanvasElement | null; readonly stage: HTMLElement }, o: PolarGripOpts): Drag {
  const c = d.c ?? d.stage.querySelector('canvas'); if (!c) throw new Error('F.polar.grip: the figure has no canvas');
  const g = gripsOf(c), sliders = o.r ? [o.t, o.r] : [o.t], tin = inputOf(o.t);
  const pos = (): POLAR.P2 => (o.r ? POLAR.xy(o.r.v, o.t.v) : o.at ? o.at(o.t.v) : POLAR.xy(1, o.t.v));
  let ax: Axes | null = null, spot: Pt | null = null;
  const grip: Grip = {
    spot: () => spot,
    move: ([px, py]) => {
      if (!ax) return; const { box, xr, yr } = ax;
      const q: POLAR.P2 = [xr[0] + ((px - box.l) / (box.r - box.l)) * (xr[1] - xr[0]), yr[0] + ((box.b - py) / (box.b - box.t)) * (yr[1] - yr[0])];
      if (o.r) { const a = POLAR.aim(q, o.t.v, o.r.v); handOn(o.t, a.th); handOn(o.r, a.r); }
      else if (o.at) handOn(o.t, POLAR.nearest(o.at, q, o.t.v, +tin.min, +tin.max, o.span ?? Math.PI));
      else handOn(o.t, POLAR.unwrap(Math.atan2(q[1], q[0]), o.t.v));
    },
    done: () => { sliders.forEach((s) => inputOf(s).dispatchEvent(new Event('change', { bubbles: true }))); touch(d.fig); },
  };
  g.list.push(grip); c.style.touchAction = 'none';
  sliders.forEach((s) => ['focus', 'blur'].forEach((t) => inputOf(s).addEventListener(t, () => touch(d.fig))));
  return {
    get at() { return pos(); },
    draw(ctx, a, color) {
      ax = a; const [xv, yv] = pos();
      if (!Number.isFinite(xv) || !Number.isFinite(yv)) { spot = null; return null; }
      const p = pinned(ctx, a.box, a.X, a.Y, xv, yv, color); spot = [p.x, p.y];
      const hot = g.held === grip || sliders.some((s) => document.activeElement === inputOf(s));
      ctx.save(); ctx.globalAlpha *= hot ? 0.6 : 0.28; ctx.strokeStyle = color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, 17, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      return p;
    },
  };
}
function polarSectors(ctx: Ctx, ax: Axes, f: (th: number) => number, a: number, b: number, n: number, color: Color): number {
  const { cells, sum } = POLAR.sectors(f, a, b, n), k = during(arrivalAt(ctx), 0.3, 1);
  const px = ax.X(0), py = ax.Y(0), s = (ax.box.r - ax.box.l) / (ax.xr[1] - ax.xr[0]);
  ctx.save(); clipTo(ctx, ax.box); ctx.fillStyle = ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round';
  const base = ctx.globalAlpha;
  cells.forEach((cl, i) => {
    const e = stagger(k, i, cells.length); if (!(e > 0) || !Number.isFinite(cl.r)) return;
    const flip = cl.r < 0 ? Math.PI : 0;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, Math.abs(cl.r) * s, -(cl.t0 + flip), -(cl.t1 + flip), true); ctx.closePath();
    ctx.globalAlpha = base * 0.22 * e; ctx.fill(); ctx.globalAlpha = base * e; ctx.stroke();
  });
  ctx.restore();
  return sum;
}
function polarStrips(ctx: Ctx, ax: Axes, p: POLAR.Path, t0: number, t1: number, n: number, color: Color): number {
  const { cells, sum } = POLAR.strips(p, t0, t1, n), k = during(arrivalAt(ctx), 0.3, 1), { box, X, Y } = ax;
  ctx.save(); clipTo(ctx, box); ctx.fillStyle = ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round';
  const base = ctx.globalAlpha;
  cells.forEach((cl, i) => {
    const e = stagger(k, i, cells.length); if (!(e > 0) || !Number.isFinite(cl.h)) return;
    ctx.beginPath(); ctx.rect(X(Math.min(cl.x0, cl.x1)), Y(Math.max(0, cl.h)), Math.abs(X(cl.x1) - X(cl.x0)), Math.abs(Y(cl.h) - Y(0)));
    ctx.globalAlpha = base * 0.22 * e; ctx.fill(); ctx.globalAlpha = base * e; ctx.stroke();
  });
  ctx.restore();
  return sum;
}
const polar = {
  xy: POLAR.xy, of: POLAR.polarPath, runs: POLAR.runs, unwrap: POLAR.unwrap, nearest: POLAR.nearest, aim: POLAR.aim,
  cells: POLAR.sectors, stripCells: POLAR.strips, area: POLAR.area, length: POLAR.length, chords: POLAR.chords, under: POLAR.under, extent: POLAR.extent,
  frame: polarFrame, path: polarPathDraw, curve: polarCurveDraw, ray: polarRay, grip: polarGrip, sectors: polarSectors, strips: polarStrips,
};

/* ---------- Preskill's quantum information: the Bloch ball and circuits ----------
   `F.bloch(d, opts)` is the Bloch ball, a mathematical 3D scene (root 28.3) on F.space3d: an ink
   wireframe ball with its equator, axes x, y, z and the poles |0⟩ (up) and |1⟩, state vectors that
   arrive from the centre, trails, an axis and a channel's image ellipsoid that bends out of the
   ball. Without WebGL it is painted flat from the opening view. The figure calls its parts in its
   draw; each is one layer, rebuilt only when it changed. `F.bloch.rho(P)` is the readout's ρ. */
type BlochOpts = View3dOpts & { readonly turn?: Radians; readonly fit?: number; readonly poles?: readonly [string, string] };
type BlochState = { readonly color?: Color; readonly name?: string; readonly label?: string; readonly trail?: readonly Q.V3[]; readonly hollow?: boolean };
type BlochMap = { readonly M: Q.M3; readonly c: Q.V3 };
export type Bloch = {
  readonly S: Space3d; readonly flat: boolean;
  state: (key: string, P: Q.V3 | null, o?: BlochState) => void;
  rotate: (key: string, P0: Q.V3, n: Q.V3, a: number, o?: BlochState) => Q.V3;
  axis: (n: Q.V3 | null, o?: { readonly color?: Color; readonly name?: string; readonly label?: string; readonly key?: string }) => void;
  image: (map: BlochMap | null, o?: { readonly k?: number; readonly color?: Color; readonly name?: string }) => void;
  headline: (s: string) => void;
};
const BALL: SPACE.Box3 = [[-1, 1], [-1, 1], [-1, 1]];
const ringOf = (f: (a: number) => Q.V3, n = 96): Q.V3[] => Array.from({ length: n + 1 }, (_, i) => f((2 * Math.PI * i) / n));
const vecName = (P: Q.V3): string => {
  const r = Math.hypot(...P);
  return `the Bloch vector P = (${P.map((x) => fmt(x, 2)).join(', ')}), |P| = ${fmt(r, 2)}: ${r > 0.995 ? 'a pure state' : r < 0.005 ? 'the maximally mixed state' : 'a mixed state'}`;
};
function blochScene(d: { readonly stage: HTMLElement; readonly fig: HTMLElement }, opts: BlochOpts = {}): Bloch {
  const S = space3d(d, { h: 820, fit: 1.85, ...opts, box: BALL });
  /* a narrow pane gets a taller stage, so the ball keeps room for its labels */
  const wrap = S.v?.wrap;
  if (wrap && typeof ResizeObserver === 'function') {
    const tall = (): void => { const want = wrap.clientWidth > 0 && wrap.clientWidth < 520 ? '1400 / 1300' : ''; if (wrap.style.aspectRatio !== want) wrap.style.aspectRatio = want; };
    new ResizeObserver(tall).observe(d.stage); tall();
  }
  let along: Q.V3 | null = null;   /* the labelled axis: its label takes the place of the coordinate label it lies along */
  const [top, bottom] = opts.poles ?? ['|0\\rangle', '|1\\rangle'];
  const grown = (): number => ease.smooth(arrival(d));
  function ball(): void {
    const k = grown(), on = (pts: Q.V3[]): Q.V3[] => partial(pts, k) as Q.V3[];
    const marks: SPACE.Mark[] = [
      { k: 'sheet', rows: Q.ellipsoid(Q.I3, [0, 0, 0], 32, 16), color: PAL.ink, alpha: 0.05 * k },
      { k: 'line', pts: on(ringOf((a) => [Math.cos(a), Math.sin(a), 0])), color: 'ink', w: 2.5, name: 'the equator: the states (|0⟩ + e^{iφ}|1⟩)/√2' },
      { k: 'line', pts: on(ringOf((a) => [Math.cos(a), 0, Math.sin(a)])), color: 'guide', w: 2 },
      { k: 'line', pts: on(ringOf((a) => [0, Math.cos(a), Math.sin(a)])), color: 'guide', w: 2 },
    ];
    (['x', 'y', 'z'] as const).forEach((nm, i) => {
      const u: Q.V3 = [i === 0 ? 1 : 0, i === 1 ? 1 : 0, i === 2 ? 1 : 0], m = (s: number): Q.V3 => [u[0] * s, u[1] * s, u[2] * s];
      marks.push({ k: 'line', pts: on([m(-1), m(1.22)]), color: 'guide', w: 2, name: `the ${nm} axis` });
      if (k > 0.5 && !(along && SPACE.dot(along, u) > 0.97)) marks.push({ k: 'label', s: `$${nm}$`, p: m(nm === 'z' ? 1.42 : 1.36), color: 'muted', cls: 'bare' });
    });
    marks.push({ k: 'dot', p: [0, 0, 1], color: 'ink', r: 5, name: `the pure state ${top.replace(/\\rangle/, '⟩')}, P along +z` },
      { k: 'dot', p: [0, 0, -1], color: 'ink', r: 5, name: `the pure state ${bottom.replace(/\\rangle/, '⟩')}, P along −z` });
    if (k > 0.5) marks.push({ k: 'label', s: `$${top}$`, p: [0, -0.3, 1], color: 'ink' }, { k: 'label', s: `$${bottom}$`, p: [0, -0.3, -1.12], color: 'ink', cls: 'bare' });
    S.set('ball', marks);
  }
  const scale = (P: Q.V3, k: number): Q.V3 => [P[0] * k, P[1] * k, P[2] * k];
  const B: Bloch = {
    S, flat: S.flat,
    state(key, P, o = {}) {
      ball();
      if (!P) { S.set('state:' + key, []); return; }
      const k = grown(), col = o.color ?? C('state'), tip = scale(P, k), name = o.name ?? vecName(P), marks: SPACE.Mark[] = [];
      if (o.trail?.length) marks.push({ k: 'line', pts: partial(o.trail, k) as Q.V3[], color: alpha(col, 0.6), w: 3, name: name + ' (its path)' });
      if (o.hollow) marks.push({ k: 'line', pts: [[0, 0, 0], tip], color: col, w: 4, dash: [10, 8], name }, { k: 'dot', p: tip, color: col, r: 8, hollow: true, name });
      else marks.push({ k: 'arrow', a: [0, 0, 0], b: tip, color: col, w: 6, name });
      if (o.label && k > 0.5) marks.push({ k: 'label', s: o.label, p: tip, color: col });
      S.set('state:' + key, marks);
    },
    rotate(key, P0, n, a, o = {}) {
      const P = Q.rotate(P0, n, a);
      B.state(key, P, { ...o, trail: Q.arc(P0, n, 0, a, Math.max(8, Math.ceil((Math.abs(a) / (2 * Math.PI)) * 96))) });
      return P;
    },
    axis(n, o = {}) {
      along = n && o.label ? SPACE.unit(n) : null; ball();
      const key = 'axis:' + (o.key ?? 'axis');
      if (!n) { S.set(key, []); return; }
      const u = SPACE.unit(n), k = grown(), col = o.color ?? C('operator');
      const marks: SPACE.Mark[] = [{ k: 'arrow', a: scale(u, -1.3 * k), b: scale(u, 1.3 * k), color: col, w: 3, name: o.name ?? `the axis n = (${u.map((x) => fmt(x, 2)).join(', ')})` }];
      if (o.label && k > 0.5) marks.push({ k: 'label', s: o.label, p: scale(u, 1.44), color: col, cls: 'bare' });
      S.set(key, marks);
    },
    image(map, o = {}) {
      ball();
      if (!map) { S.set('image', []); return; }
      const t = Q.toward(map.M, map.c, (o.k ?? 1) * grown()), col = o.color ?? C('channel');
      S.set('image', [
        { k: 'sheet', rows: Q.ellipsoid(t.M, t.c, 32, 16), color: col, alpha: 0.2 },
        { k: 'line', pts: ringOf((a) => Q.affine(t.M, t.c, [Math.cos(a), Math.sin(a), 0])), color: col, w: 3, name: o.name ?? 'the image of the ball under the channel' },
      ]);
    },
    headline(s) { ball(); S.headline(s); },
  };
  return B;
}
/* ρ = ½(1 + P·σ) with its entries as numbers, set in the state's colour */
function rhoTex(P: Q.V3, o: { readonly dec?: number; readonly lhs?: string; readonly vec?: string } = {}): string {
  const dec = o.dec ?? 2, n = (x: number): string => { const s = x.toFixed(dec); return /^-0\.?0*$/.test(s) ? s.slice(1) : s; };
  const z = ([re, im]: Q.Cx): string => (Math.abs(im) < 0.5 * 10 ** -dec ? n(re) : Math.abs(re) < 0.5 * 10 ** -dec ? `${n(im)}i` : `${n(re)} ${im < 0 ? '-' : '+'} ${n(Math.abs(im))}i`);
  const r = Q.rho(P);
  return `${o.lhs ?? '\\rho'} = \\tfrac{1}{2}\\left(1 + ${o.vec ?? '\\vec{P}'}\\cdot\\vec{\\sigma}\\right) = \\htmlClass{kv-state}{\\begin{pmatrix} ${z(r[0][0])} & ${z(r[0][1])} \\\\ ${z(r[1][0])} & ${z(r[1][1])} \\end{pmatrix}}`;
}
const bloch = Object.assign(blochScene, {
  rho: rhoTex, rotate: Q.rotate, arc: Q.arc, affine: Q.affine, toward: Q.toward, ellipsoid: Q.ellipsoid, of: Q.blochOf, channels: Q.channels,
});

/* `F.circuit(d, opts)`: a quantum or reversible classical circuit, 2D, that steps gate by gate on the
   transport (root 14: the circuit's time is the clock), a dot on the scrubber for every state, each
   exact in either direction. Wires run left to right with labels at both ends; gates are ink boxes,
   controls dots (open for control-on-0), ⊕ targets, SWAP crosses, meters, registers a double line
   with a slash and their width. A wire wears a colour only where the figure gives one. Beneath, one
   bar per basis state, its length |a_x| and its dial arg a_x; a classical circuit shows the bits on
   the wires at the cursor instead. The input is a choice (a select beyond four). */
type WireSpec = { readonly in?: string; readonly out?: string; readonly name?: string; readonly color?: Color; readonly width?: number };
type CircuitInput = { readonly value: string; readonly label: string; readonly state: Q.Input; readonly ins?: readonly string[] };
type CircuitOpts = {
  readonly wires: number | readonly WireSpec[]; readonly steps: readonly Q.Step[];
  readonly input?: Q.Input; readonly inputs?: readonly CircuitInput[]; readonly value?: string;
  readonly classical?: boolean; readonly probs?: boolean; readonly beat?: number;
  readonly ket?: (x: number) => string;
  readonly headline?: (c: Circuit) => string | null; readonly onDraw?: (c: Circuit) => void;
};
export type Circuit = {
  readonly states: readonly Q.Amps[]; readonly layout: Q.Layout; readonly at: number; readonly t: number; readonly input: Picker | null;
  state: (i?: number) => Q.Amps; ket: (i?: number, o?: { readonly dec?: number }) => string; bits: (i?: number) => number[];
  set: (o: { readonly steps?: readonly Q.Step[]; readonly input?: Q.Input }) => void;
};
const SUBS = '₀₁₂₃₄₅₆₇₈₉', SUPS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sub = (i: number): string => String(i).split('').map((c) => SUBS[+c]).join('');
const sup = (i: number): string => String(i).split('').map((c) => SUPS[+c]).join('');
const GATE_LABEL: Readonly<Record<string, string>> = { Rx: 'R_x', Ry: 'R_y', Rz: 'R_z' };
const GATE_NAME: Readonly<Record<string, string>> = {
  H: 'the Hadamard gate H', X: 'the NOT gate X', Y: 'the Pauli gate Y', Z: 'the phase flip Z', S: 'the phase gate S', T: 'the π/8 gate T',
  P: 'a phase gate', Rx: 'a rotation about x', Ry: 'a rotation about y', Rz: 'a rotation about z', SWAP: 'the SWAP gate', M: 'a measurement in the basis |0⟩, |1⟩',
};
const labelOf = (g: Q.GateSpec): string => g.label ?? (g.g === 'R' ? `R_${g.k ?? 1}` : GATE_LABEL[g.g] ?? g.g);
const isNot = (g: Q.GateSpec): boolean => g.g === 'X' && !g.label && Q.controls(g).on.length + Q.controls(g).off.length > 0;
function circuitFig(d: { readonly stage: HTMLElement; readonly fig: HTMLElement; readonly controls: HTMLElement }, o: CircuitOpts): Circuit {
  const wires: readonly WireSpec[] = typeof o.wires === 'number' ? Array.from({ length: o.wires }, () => ({})) : o.wires;
  const L = Q.layoutOf(wires.map((w) => w.width ?? 1)), nW = wires.length, classical = !!o.classical, beat = o.beat ?? 1.4;
  let steps = o.steps, inputs = o.inputs ?? [], states: Q.Amps[] = [];
  const wname = (w: number): string => wires[w].name ?? `q${sub(w)}`;
  const nameOf = (g: Q.GateSpec): string => {
    const { on, off } = Q.controls(g), cs = on.length + off.length, T = Q.targets(g).map(wname).join(', ');
    const plain = labelOf(g).replace(/[_{}$]/g, '');
    const base = g.name ?? (isNot(g) ? (cs === 1 ? 'the controlled-NOT (XOR) gate' : `the Toffoli gate θ${sup(cs + 1)}`) : cs ? `the controlled-${plain} gate` : GATE_NAME[g.g] ?? `the gate ${plain}`);
    const ctl = [...on.map((w) => wname(w)), ...off.map((w) => `${wname(w)} (on 0)`)];
    return `${base}${ctl.length ? `, control ${ctl.join(', ')}, target ${T}` : ` on ${T}`}`;
  };
  const stepName = (j: number): string => 'After ' + Q.stepGates(steps[j]).map((g) => `${g.g === 'M' ? 'measuring' : isNot(g) ? 'the controlled-NOT' : labelOf(g).replace(/[_{}$]/g, '')} on ${Q.targets(g).map(wname).join(', ')}`).join(' and ');
  const measuredAt = (w: number): number => steps.findIndex((s) => Q.stepGates(s).some((g) => g.g === 'M' && Q.targets(g).includes(w)));
  /* the basis states drawn: all of them up to four qubits, else those any step reaches (ponytail: at most 32 bars, wider registers need a register-level view) */
  let shown: number[] = [];
  let inState: Q.Input = o.input ?? inputs.find((x) => x.value === o.value)?.state ?? inputs[0]?.state ?? 0;
  const recompute = (): void => {
    states = Q.run(inState, L, steps);
    const N = 1 << L.n;
    shown = L.n <= 4 ? Array.from({ length: N }, (_, x) => x) : Array.from({ length: N }, (_, x) => x).filter((x) => states.some((s) => Q.modulus(s, x) > 1e-9)).slice(0, 32);
  };
  recompute();
  const ins = (): readonly string[] => {
    const own = inputs.find((x) => x.state === inState)?.ins;
    if (own) return own;
    const s = inState;
    if (typeof s === 'string' || typeof s === 'number') {
      const bits = Q.bitsOf(Q.prepare(s, L), L);
      return bits.map((b, w) => (classical ? Q.basisLabel(b, L.width[w]) : `|${Q.basisLabel(b, L.width[w])}⟩`));
    }
    if ('wires' in s) return s.wires.map((x, w) => (typeof x === 'number' || typeof x === 'string' ? (classical ? String(x) : `|${typeof x === 'number' ? Q.basisLabel(x, L.width[w]) : x}⟩`) : ''));
    return wires.map(() => '');
  };

  /* the canvas: the wires, then for a quantum circuit the bars */
  const S = 96, headH = o.headline ? 92 : 36, yw = (w: number): Logical => headH + 44 + w * S, cBot = yw(nW - 1) + 56;
  const yD = cBot + 34, yT = yD + 32, BH = 150, yB = yT + BH, yL = yB + 30, yP = yL + 30;
  const H = classical ? cBot + 10 : (o.probs ? yP : yL) + 26;
  const c = makeCanvas(d.stage, H);
  const hits: Hit[] = []; hover(d.stage, () => hits, c);
  const cy = cycle(() => steps.length, 1.2);
  const input = inputs.length > 1 ? (inputs.length > 4 ? select : choice)(d.controls, {
    label: '\\text{input}', key: 'input', value: o.value ?? inputs[0].value, aria: 'the input state', ms: 0,
    options: inputs.map((x) => ({ value: x.value, label: x.label })),
    onInput: (v) => { inState = inputs.find((x) => x.value === v)?.state ?? inState; recompute(); cy.reset(); },
  }) : null;

  let tau = 0, at = 0;
  const api: Circuit = {
    get states() { return states; }, layout: L, get at() { return at; }, get t() { return tau; }, input,
    state: (i = at) => states[i], ket: (i = at, ko = {}) => Q.ketTex(states[i], L.n, ko), bits: (i = at) => Q.bitsOf(states[i], L),
    set(x) { if (x.steps) steps = x.steps; if (x.input !== undefined) inState = x.input; recompute(); dots(); touch(d.fig); },
  };

  /* the step dots on the scrubber, one per state; a click jumps there as a drag of the scrubber would */
  let dotEls: HTMLElement[] = [];
  function dots(): void {
    const s = d.fig.querySelector<HTMLInputElement>('.transport .scrub'); if (!s) return;
    let w = s.parentElement!;
    if (!w.classList.contains('dv-track')) { w = el('span', 'dv-track'); s.replaceWith(w); w.appendChild(s); }
    dotEls.forEach((b) => b.remove());
    const N = steps.length;
    dotEls = Array.from({ length: N + 1 }, (_, i) => {
      const b = w.appendChild(el('button', 'dv-dot')); b.type = 'button';
      const t = i === 0 ? 'Input' : stepName(i - 1); b.title = t; b.setAttribute('aria-label', t);
      b.style.left = `calc(8px + (100% - 16px) * ${i / N})`;
      b.addEventListener('click', () => { s.max = String(N); s.value = String(i); s.dispatchEvent(new Event('input', { bubbles: true })); });
      return b;
    });
  }

  function gate(ctx: Ctx, g: Q.GateSpec, x: Logical, j: number, box: Logical, glow: number, a: number): void {
    const T = Q.targets(g), { on, off } = Q.controls(g), ys = [...T, ...on, ...off].map(yw), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const ink = PAL.ink, name = nameOf(g), half = box / 2;
    ctx.save(); ctx.globalAlpha *= a;
    if (y1 > y0) {
      const cl = [...on, ...off].some((w) => { const m = measuredAt(w); return m >= 0 && m < j; });
      if (cl) { line(ctx, x - 3.5, y0, x - 3.5, y1, ink, 2); line(ctx, x + 3.5, y0, x + 3.5, y1, ink, 2); } else line(ctx, x, y0, x, y1, ink, 3);
    }
    on.forEach((w) => { dot(ctx, x, yw(w), ink, true, 10); hits.push({ x, y: yw(w), r: 16, name }); });
    off.forEach((w) => { ctx.save(); ctx.fillStyle = PAL.panel; ctx.beginPath(); ctx.arc(x, yw(w), 10, 0, 2 * Math.PI); ctx.fill(); ctx.restore(); dot(ctx, x, yw(w), ink, false, 10); hits.push({ x, y: yw(w), r: 16, name }); });
    const panel = (bx: Logical, by: Logical, bw: Logical, bh: Logical): void => {
      ctx.save(); ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 6); ctx.fillStyle = PAL.panel; ctx.fill();
      if (glow > 0) { ctx.fillStyle = alpha(ink, 0.14 * glow); ctx.fill(); }
      ctx.strokeStyle = ink; ctx.lineWidth = 3 + 1.5 * glow; ctx.stroke(); ctx.restore();
    };
    if (isNot(g)) T.forEach((w) => {
      const y = yw(w), r = 21 * (1 + 0.12 * glow);
      ctx.save(); ctx.fillStyle = PAL.panel; ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke(); ctx.restore();
      hits.push({ x, y, r: r + 6, name });
    });
    else if (g.g === 'SWAP') T.forEach((w) => {
      const y = yw(w), s = 13 * (1 + 0.15 * glow);
      line(ctx, x - s, y - s, x + s, y + s, ink, 3.5); line(ctx, x - s, y + s, x + s, y - s, ink, 3.5); hits.push({ x, y, r: 20, name });
    });
    else if (g.g === 'M') T.forEach((w) => {
      const y = yw(w), bw = box * 1.1, bh = box * 0.82; panel(x - bw / 2, y - bh / 2, bw, bh);
      ctx.save(); ctx.strokeStyle = ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y + bh * 0.28, bw * 0.32, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke(); ctx.restore();
      arrow(ctx, x, y + bh * 0.28, x + bw * 0.24, y - bh * 0.3, ink, 2.5);
      hits.push({ x, y, r: half + 6, name: g.outcome === undefined ? name : `${name}; outcome ${g.outcome}` });
    });
    else {
      /* a matrix gate on several wires is one box over them; a known one-qubit gate is a box on each */
      const spans = g.m && T.length > 1 ? [[Math.min(...T), Math.max(...T)]] : T.map((w) => [w, w]);
      spans.forEach(([a0, a1]) => {
        const yt = yw(a0) - half, h = yw(a1) - yw(a0) + box, lab = labelOf(g);
        panel(x - half, yt, box, h);
        const size = Math.min(28, (28 * (box - 12)) / Math.max(1, measure(ctx, lab, { size: 28, weight: 600, tex: lab.includes('$') })));
        text(ctx, lab, x, yt + h / 2, ink, { size, weight: 600, align: 'center', tex: lab.includes('$') });
        hits.push({ x, y: yt + h / 2, r: Math.max(half, h / 2) + 4, name });
      });
    }
    ctx.restore();
  }

  function draw(): void {
    const { ctx } = begin(c), N = steps.length, ink = PAL.ink; hits.length = 0;
    tau = Math.min(cy.now(), N);
    const i = Math.min(N - 1, Math.floor(tau)), f = tau - i, move = ease.smooth(Math.min(1, f / 0.6));
    at = move < 0.5 ? i : i + 1;
    dotEls.forEach((b, j) => b.classList.toggle('at', j === at));
    const ka = arrival(d), kw = ease.smooth(Math.min(1, ka / 0.5)), kg = ease.smooth(Math.max(0, (ka - 0.3) / 0.7));
    if (o.headline) { const s = o.headline(api); if (s) topline(ctx, s); }

    /* the end labels, then the columns between them */
    const inL = ins(), outL = wires.map((w) => w.out ?? ''), lsz = 26;
    const tx = (s: string): boolean => s.includes('$');
    const wOf = (s: string): Logical => (s ? measure(ctx, s, { size: lsz, weight: 600, tex: tx(s) }) : 0);
    const inW = Math.max(0, ...inL.map(wOf)), outW = Math.max(0, ...outL.map(wOf));
    /* the cursor rests a third of a column inside each end of the wires, clear of the end labels */
    const xs = 24 + inW + (inW ? 18 : 0), xe = LW - 24 - outW - (outW ? 18 : 0), colW = (xe - xs) / (N + 0.6), box = Math.min(72, colW * 0.62);
    const px = (k: number): Logical => xs + (k + 0.3) * colW, col = (j: number): Logical => px(j + 0.5);
    const ket = classical ? C('bit-string') : C('state');

    wires.forEach((ws, w) => {
      const y = yw(w), wc = ws.color ?? ink, m = measuredAt(w), xr = xs + (xe - xs) * kw, bundle = (ws.width ?? 1) > 1;
      const dbl = (a: Logical, b: Logical): void => { if (b > a) { line(ctx, a, y - 3.5, b, y - 3.5, wc, 2); line(ctx, a, y + 3.5, b, y + 3.5, wc, 2); } };
      if (bundle) dbl(xs, xr);
      else if (m >= 0) { const xm = col(m); line(ctx, xs, y, Math.min(xr, xm), y, wc, 3); dbl(xm, xr); }
      else line(ctx, xs, y, xr, y, wc, 3);
      if (bundle) { line(ctx, xs + 22, y + 12, xs + 38, y - 12, wc, 2.5); text(ctx, String(ws.width), xs + 34, y - 26, wc, { size: 17, align: 'center' }); }
      for (let x = xs + 30; x < xe; x += 110) hits.push({ x, y, r: 12, name: `the ${classical ? 'bit' : bundle ? 'register' : 'qubit'} ${wname(w)}` });
      const a = Math.min(1, ka * 2);
      ctx.save(); ctx.globalAlpha *= a;
      if (inL[w]) { text(ctx, inL[w], xs - 16, y, ws.color ?? ket, { size: lsz, weight: 600, align: 'right', tex: tx(inL[w]) }); hits.push({ x: xs - 16 - wOf(inL[w]) / 2, y, r: 22, name: `${wname(w)} starts in ${inL[w].replace(/\$/g, '')}` }); }
      if (outL[w]) { text(ctx, outL[w], xe + 16, y, ws.color ?? ket, { size: lsz, weight: 600, tex: tx(outL[w]) }); hits.push({ x: xe + 16 + wOf(outL[w]) / 2, y, r: 22, name: `${wname(w)} ends in ${outL[w].replace(/\$/g, '')}` }); }
      ctx.restore();
    });
    const cur = px(i) + (px(i + 1) - px(i)) * move;
    steps.forEach((s, j) => {
      const glow = j === i && f < 0.6 && move > 0 ? ease.thereAndBack(move) : 0;
      Q.stepGates(s).forEach((g) => gate(ctx, g, col(j), j, box, glow, stagger(kg, j, N)));
    });

    /* the cursor: now, between the gate just done and the next */
    const tc = C('time');
    ctx.save(); ctx.globalAlpha *= kg; line(ctx, cur, yw(0) - 50, cur, yw(nW - 1) + 46, alpha(tc, 0.75), 3, [8, 7]);
    ctx.fillStyle = tc; ctx.beginPath(); ctx.moveTo(cur - 9, yw(0) - 62); ctx.lineTo(cur + 9, yw(0) - 62); ctx.lineTo(cur, yw(0) - 50); ctx.fill(); ctx.restore();
    hits.push({ x: cur, y: yw(0) - 58, r: 16, name: at === 0 ? 'now: the input' : `now: ${stepName(at - 1).toLowerCase()}` });

    const s0 = states[i], s1 = states[i + 1];
    if (classical) {
      const bits = Q.bitsOf(move < 0.5 ? s0 : s1, L), bc = C('bit-string');
      wires.forEach((_, w) => {
        const y = yw(w), s = String(bits[w]), bw = Math.max(34, measure(ctx, s, { size: 24, weight: 600 }) + 14), bh = Math.max(36, shownH(ctx, 24) + 10);
        ctx.save(); ctx.globalAlpha *= kg; ctx.beginPath(); ctx.roundRect(cur - bw / 2, y - bh / 2, bw, bh, 6); ctx.fillStyle = PAL.panel; ctx.fill(); ctx.strokeStyle = bc; ctx.lineWidth = 2.5; ctx.stroke();
        text(ctx, s, cur, y, bc, { size: 24, weight: 600, align: 'center' }); ctx.restore();
        hits.push({ x: cur, y, r: 20, name: `${wname(w)} = ${s} now` });
      });
    } else {
      const ac = C('amplitude'), pc = C('probability'), B = shown.length, cb = (LW - 120) / B, bw = Math.min(64, cb * 0.5);
      const ls = cb >= 130 ? 24 : cb >= 90 ? 20 : 17, kb = kg;
      line(ctx, 50, yB, LW - 50, yB, alpha(ink, 0.4), 2);
      line(ctx, 50, yT, LW - 50, yT, alpha(ink, 0.22), 2, [10, 10]);
      text(ctx, '1', LW - 44, yT, PAL.muted, { size: 17 }); text(ctx, '0', LW - 44, yB, PAL.muted, { size: 17 });
      shown.forEach((x, n) => {
        const cx0 = 60 + (n + 0.5) * cb, m0 = Q.modulus(s0, x), m1 = Q.modulus(s1, x), p0 = Q.phase(s0, x), p1 = Q.phase(s1, x);
        let dp = p1 - p0; dp -= 2 * Math.PI * Math.round(dp / (2 * Math.PI));
        const m = m0 + (m1 - m0) * move, ph = m0 < 1e-9 ? p1 : m1 < 1e-9 ? p0 : p0 + dp * move, h = m * BH * kb;
        if (h > 0.5) { ctx.save(); ctx.fillStyle = ac; ctx.fillRect(cx0 - bw / 2, yB - h, bw, h); ctx.restore(); }
        ctx.save(); ctx.strokeStyle = alpha(ink, 0.35); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx0, yD, 15, 0, 2 * Math.PI); ctx.stroke(); ctx.restore();
        if (m > 1e-6) { ctx.save(); ctx.globalAlpha *= Math.min(1, m * 5) * kb; line(ctx, cx0, yD, cx0 + 15 * Math.cos(ph), yD - 15 * Math.sin(ph), ac, 3.5); ctx.restore(); }
        const lab = o.ket ? o.ket(x) : `|${Q.basisLabel(x, L.n)}⟩`;
        text(ctx, lab, cx0, yL, ink, { size: ls, align: 'center', tex: lab.includes('$') });
        const shownS = move < 0.5 ? s0 : s1, ms = Q.modulus(shownS, x), pr = ms * ms;
        if (o.probs) text(ctx, fmt(pr, 2), cx0, yP, pc, { size: ls - 2, align: 'center' });
        const nm = `${lab.replace(/\$/g, '')}: amplitude modulus ${fmt(ms, 3)}${ms > 1e-9 ? `, phase ${fmt((Q.phase(shownS, x) * 180) / Math.PI, 0)}°` : ''}${o.probs ? `, probability ${fmt(pr, 3)}` : ''}`;
        hits.push({ x: cx0, y: yB - Math.max(h, 30) / 2, r: Math.max(24, Math.min(bw, h / 2)), name: nm }, { x: cx0, y: yD, r: 18, name: nm });
      });
    }
    o.onDraw?.(api);
  }
  register(d.fig, { update: (dt) => cy.step(dt, () => 1 / beat), draw });
  dots();
  return api;
}
const circuit = Object.assign(circuitFig, { run: Q.run, layout: Q.layoutOf, ket: Q.ketTex, bits: Q.bitsOf, prepare: Q.prepare });

export const FIG = {
  $, $$, REDUCED, get macros() { return active().macros; }, get KOPT() { return KOPT(); }, tex, typeset, renderMath, get SYM() { return active().symbols; },
  get PAL() { return PAL; }, get CC() { return SHOWN.concepts; }, get shown() { return SHOWN; }, setShown, readPal, C, cat, ref, paintRefs, alpha, redrawAll, el: elOf, fact, fmt, LW, makeCanvas, begin, ctl, byId, sim,
  backing, glRatio,
  register, release, cycle, setPaused, get paused() { return paused; }, choice, select, hover, view3d, mesh: MESH, line, arrow, dot, text, shownFont, headline, hbracket, vbracket, strip, scale, axes, nice, pinned, curve, labeller, topline, runner, person, silhouette, car, plane, dragster, spring, block, fixed, view, face, get FONT() { return FONT; },
  label, note, fitScale, angleArc, crate, house, shopfront, horse, helicopterTop, rowboat, sailboat, skydiver,
  fist, hand: hand2, cart, personTop, motorcycle, helicopterSide, coasterCar, cardboardBox, cupOnSide, guitar: guitarSprite, book, backpack,
  vectorTriangle, wrap,
  story, keyframes, solve, presence, fade3, fadeEl, regroup, layoutPlan,
  ease, lerp, partial, tween, tour, morph, morphAt,
  arrival, stagger, resample, lerpPts, measure,
  faded, mixColor, blendCurve, readout,
  plot, shade, riemann, tangent, secant, drag, band, judge,
  revolve,
  deriv, secants,
  slopefield,
  space, space3d,
  polar,
  bloch, circuit,
};
export type Fig = typeof FIG;

/* A book's table, kept for every Fig handed out for it, those already handed out included. */
export function registerFigBook(book: FigBook): void {
  figBooks.set(book.id, { macros: book.macros, symbols: book.symbols, colorKeys: book.colorKeys, pages: book.pages });
  bookPal.delete(book.id);
}

/* The Fig a book's figure scripts and TeX go through: the same surface as FIG, with every call run
   under that book's table, so `F.tex`, `F.ctl` and `F.SYM` read its macros and symbols. */
const withBook = (book: string) => <A extends unknown[], R>(f: (...a: A) => R) => (...a: A): R => {
  const prev = cur; cur = configOf(book);
  try { return f(...a); } finally { cur = prev; }
};
const figs = new Map<string, Fig>();
const bookFig = (book: string): Fig => {
  const run = withBook(book);
  const own = Object.entries(Object.getOwnPropertyDescriptors(FIG)).map(([k, d]): [string, PropertyDescriptor] =>
    [k, typeof d.value === 'function' ? { ...d, value: Object.assign(run(d.value as (...a: unknown[]) => unknown), d.value) } : d]);
  return Object.defineProperties({}, {
    ...Object.fromEntries(own),
    macros: { get: () => configOf(book).macros, enumerable: true },
    SYM: { get: () => configOf(book).symbols, enumerable: true },
    KOPT: { get: run(KOPT), enumerable: true },
  }) as Fig;
};
export const figFor = (book: string): Fig => {
  const got = figs.get(book) ?? bookFig(book);
  figs.set(book, got);
  return got;
};

/* What the drawing layer takes from a book's manifest. */
export const figBookOf = (m: BookManifest): FigBook => ({
  id: m.id, macros: m.macros, symbols: m.symbols, colorKeys: Object.keys(m.types),
  pages: Object.fromEntries(bookPagesOf(m).flatMap((p) => (p.referents || p.macros ? [[p.id, { referents: p.referents ?? [], ...(p.refGroups ? { refGroups: p.refGroups } : {}), ...(p.macros ? { macros: p.macros } : {}) }]] : []))),
});

/* The boot book: registered, made the default table, and exposed as window.FIG. */
export function initFig(book: FigBookConfig & { readonly id?: string }): Fig {
  bootBook = book.id ?? document.documentElement.dataset.book ?? '';
  registerFigBook({ ...book, id: bootBook });
  readFont(); readPal();
  (window as unknown as { FIG: Fig }).FIG = FIG;
  return FIG;
}
