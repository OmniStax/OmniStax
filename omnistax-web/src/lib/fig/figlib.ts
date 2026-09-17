/* The figure library: math rendering, palette, the animation loop with a
   transport per figure, and the drawing primitives in a fixed 1400-unit
   logical space. Section figure modules receive it as `F` and it is also
   exposed as window.FIG for classic scripts. */
import { elementColor, isElementSymbol, type ElementSymbol } from './elements';
import { cat as catOf } from './cat';

export type Ctx = CanvasRenderingContext2D;
export type Color = string;
export type Logical = number;                 /* a coordinate in the 1400-wide canvas space */
export type Macros = Readonly<Record<string, string>>;
export type SymbolMap = Readonly<Record<string, string>>;
type Box = { readonly l: Logical; readonly r: Logical; readonly t: Logical; readonly b: Logical };
type Range = readonly [number, number];
type Scale = (v: number) => Logical;
type Cycle = { tau: number; wait: number; period: () => number; step: (dt: number, rate: () => number) => void; now: () => number; reset: () => void };
type Sim = { fig: HTMLElement; update: (dt: number) => void; draw: () => void; cycles: Cycle[]; playing: boolean; speed: number; sync?: () => void; scrub?: HTMLInputElement; dirty: boolean };
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
type TextOpts = { size?: number; weight?: number; align?: CanvasTextAlign; base?: CanvasTextBaseline; bg?: Color };
type CtlOpts = { label: string; cls: string; min: number; max: number; step: number; value: number; unit: string; dec?: number; aria?: string; detents?: readonly Detent[]; snap?: boolean; onInput?: () => void; disabled?: boolean };
type AxesOpts = { xl?: string; yl?: string; xc?: Color; yc?: Color; nx?: number; ny?: number; fx?: (v: number) => string; fy?: (v: number) => string };

const $ = <T extends Element = Element>(s: string, r: ParentNode = document): T | null => r.querySelector<T>(s);
const $$ = <T extends Element = Element>(s: string, r: ParentNode = document): T[] => Array.from(r.querySelectorAll<T>(s));
const REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- math ---------- */
let macros: Macros = {};
let SYM: SymbolMap = {};
const TRUSTED: ReadonlySet<string> = new Set(['\\htmlClass', '\\htmlData']);   /* the book's colour macros: a type class and a symbol key */
const KOPT = () => ({ macros: { ...macros }, trust: (c: { command: string }) => TRUSTED.has(c.command), strict: false as const, throwOnError: false });

/* KaTeX is the heaviest thing the shell can ask for, and a page of the book
   arrives with its maths already set at build time, so the library is fetched
   only when something on the client actually has TeX to set: an exercise
   prompt, a hover card, a note. The two calls below keep the signature the
   figure scripts are written against — they are handed `F.tex` and
   `F.renderMath` and neither waits on them — so where the library has not
   landed yet the work is queued and done once, in order, when it does. */
type Katex = typeof import('katex').default;
type AutoRender = typeof import('katex/contrib/auto-render').default;
type MathLib = { readonly katex: Katex; readonly auto: AutoRender };
let mathLib: MathLib | null = null;
let mathPending: Promise<MathLib> | null = null;
const loadMath = (): Promise<MathLib> =>
  (mathPending ??= Promise.all([import('katex'), import('katex/contrib/auto-render')])
    .then(([k, a]): MathLib => (mathLib = { katex: k.default, auto: a.default })));
/* Do this now if the library is here, otherwise once it is. Nothing is set twice:
   the call is made on exactly one of the two paths. */
const withMath = (use: (m: MathLib) => void): void => { if (mathLib) use(mathLib); else void loadMath().then(use).catch(() => {}); };

function tex(el: HTMLElement, s: string, display = false): void {
  withMath((m) => m.katex.render(s, el, { ...KOPT(), displayMode: display }));
}
function renderMath(root: HTMLElement): void {
  withMath((m) => m.auto(root, { ...KOPT(), delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }] }));
}

/* ---------- palette & colour coding ---------- */
let CC = true;
const PAL: Record<string, Color> = {};
const NEUTRAL = new Set(['ink', 'muted', 'rule', 'soft', 'soft2', 'panel', 'bg']);
let colorKeys: readonly string[] = [];
const cssVar = (n: string, el: Element = document.documentElement): string => getComputedStyle(el).getPropertyValue(n).trim();
/* The element palette is not a type and takes nothing from the scheme, so it is
   read beside the palette rather than out of it: the only thing it needs from
   the page is which of the two themes is showing, which the shell settles on
   the root element and which `readPal` reads again on every theme change. */
let darkTheme = false;
const readTheme = (): boolean => (getComputedStyle(document.documentElement).colorScheme || '').includes('dark');
const elColor = (s: ElementSymbol | string): Color => elementColor(s, darkTheme);
/* The page's palette, plus the hues a figure's own chapter and section bind. */
let base: Record<string, Color> = {};
const chapterPal = new Map<string, Record<string, Color>>();
function readPal(): void {
  const named = Object.fromEntries(colorKeys.map((k) => [k, cssVar('--c-' + k)]));
  darkTheme = readTheme();
  base = { ...named, ink: cssVar('--ink'), muted: cssVar('--muted'), rule: cssVar('--rule'), soft: cssVar('--soft'), soft2: cssVar('--soft2'), panel: cssVar('--panel'), bg: cssVar('--bg') };
  chapterPal.clear(); bound.clear(); Object.assign(PAL, base);
}
/* A figure draws with the palette of the article it sits in, and a section may
   colour a type differently from its chapter, so the scope is the nearest
   element that names either — a section's root, which names both. */
function usePal(fig: Element): void {
  const scope = fig.closest<HTMLElement>('[data-sec], [data-chapter]'); const key = `${scope?.dataset.chapter ?? ''}|${scope?.dataset.sec ?? ''}`;
  if (!scope || scope === document.documentElement) { Object.assign(PAL, base); return; }
  const cached = chapterPal.get(key);
  const over: Record<string, Color> = cached ?? Object.fromEntries(colorKeys.map((k) => [k, cssVar('--c-' + k, scope)]).filter(([, v]) => v));
  if (!cached) chapterPal.set(key, over);
  Object.assign(PAL, base, over);
}
/* The type hues the page has drawn so far. The book's types reach the page as
   CSS variables for all of them at once, so what a page actually binds is what
   its figures ask for: every hue `C` has handed out since the palette was last
   read. `F.cat` skips the categorical hues too close to these, which is the
   rule that a page never draws a categorical hue in one it has bound to a type.
   Colour coding off binds nothing, since every type is then ink. */
const bound = new Set<Color>();
function C(k: string): Color {
  if (!CC && !NEUTRAL.has(k)) return PAL.ink;
  const c = PAL[k];
  if (!NEUTRAL.has(k) && c) bound.add(c);
  return c;
}
/* The categorical palette. It is the book's own convention rather than the
   app's signal, so it keeps its colours when colour coding is switched off,
   exactly as `F.el` does; all it takes from the page is the theme and the type
   hues already drawn. */
const cat = (i: number): Color => catOf(i, darkTheme, [...bound]);
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
function redrawAll(): void { readPal(); sims.forEach((d) => { d.dirty = true; }); }

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
  if (isElementSymbol(s)) return elColor(s);
  return el(s as keyof HTMLElementTagNameMap, cls, html);
}

const fmt = (n: number, d: number): string => (Math.abs(n) < 1e-9 ? 0 : n).toFixed(d);

/* ---------- figure scaffolding ---------- */
const LW: Logical = 1400;
function makeCanvas(parent: HTMLElement, H: Logical): HTMLCanvasElement { const c = document.createElement('canvas'); c.dataset.h = String(H); c.style.aspectRatio = `${LW} / ${H}`; parent.appendChild(c); return c; }
function begin(c: HTMLCanvasElement): { ctx: Ctx; W: Logical; H: Logical } {
  const dpr = Math.min(window.devicePixelRatio || 1, 2), H = +(c.dataset.h ?? 0);
  const w = c.clientWidth || 800, k = (w * dpr) / LW, bw = Math.round(LW * k), bh = Math.round(H * k);
  if (c.width !== bw || c.height !== bh) { c.width = bw; c.height = bh; }
  const ctx = c.getContext('2d')!; ctx.setTransform(k, 0, 0, k, 0, 0); ctx.clearRect(0, 0, LW, H);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.textBaseline = 'middle';
  return { ctx, W: LW, H };
}
function ctl(parent: HTMLElement, o: CtlOpts): { readonly v: number; set: (x: number) => void; disable: (held: boolean) => void } {
  const lab = el('label'); const name = el('span', 'ctl-label'); tex(name, o.label);
  const inp = el('input'); inp.type = 'range'; inp.className = 's-' + o.cls; inp.min = String(o.min); inp.max = String(o.max); inp.step = String(o.step); inp.value = String(o.value);
  inp.setAttribute('aria-label', o.aria ?? o.label.replace(/\\k|[{}\\]/g, ''));
  const val = el('span', 'ctl-val kv-' + o.cls); const dec = o.dec ?? 1;
  const upd = () => { val.textContent = fmt(+inp.value, dec) + ' ' + o.unit; };
  upd(); inp.addEventListener('input', () => { upd(); o.onInput?.(); });
  const ds = o.detents ?? [];
  if (!ds.length) lab.append(name, inp, val);
  else {
    const track = el('span', 'ctl-track'); track.append(inp, ticksOf(ds, o)); lab.append(name, track, val);
    if (o.snap ?? snapsByDefault(ds, o.step)) {
      const reach = snapReach(ds, o);
      inp.addEventListener('change', () => { const n = nearestDetent(ds, +inp.value, reach); if (n === null || n === +inp.value) return; inp.value = String(n); upd(); o.onInput?.(); });
    }
  }
  /* A slider a held law has taken over is disabled and greyed, never moved and snapped back. */
  const disable = (held: boolean): void => { inp.disabled = held; lab.classList.toggle('ctl-held', held); };
  if (o.disabled) disable(true);
  parent.appendChild(lab);
  return { get v() { return +inp.value; }, set(x: number) { inp.value = String(x); upd(); }, disable };
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
   Figures animate on their own. Each gets a transport (play/pause, stop and
   rewind, a time scrubber when the motion has a finite period, speed) under
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
const TICON = { play: '<svg viewBox="0 0 24 24"><path d="M7 5v14l12-7z"/></svg>', pause: '<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>', stop: '<svg viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>' };
const rewind = (d: Sim) => d.cycles.forEach((c) => { c.tau = 0; c.wait = 0; });
const periodOf = (d: Sim): number => Math.max(0, ...d.cycles.map((c) => c.period()));
/* The scrubber follows the motion while it plays; dragging it pauses and sets the time. */
function syncScrub(d: Sim): void {
  const s = d.scrub; if (!s) return; const P = periodOf(d); if (!(P > 0)) return;
  s.max = String(P); s.value = String(Math.min(d.cycles[0].tau, P));
}
function transport(d: Sim): void {
  const bar = el('div', 'transport'); const play = el('button', 'tbtn'), stop = el('button', 'tbtn'), speed = el('button', 'tbtn speed');
  [play, stop, speed].forEach((b) => { b.type = 'button'; });
  const sync = () => { play.innerHTML = d.playing ? TICON.pause : TICON.play; play.title = d.playing ? 'Pause' : 'Play'; play.setAttribute('aria-label', play.title); speed.textContent = SPEED_LABEL[d.speed]; bar.classList.toggle('playing', d.playing); syncScrub(d); };
  play.addEventListener('click', () => { d.playing = !d.playing; if (d.playing && d.cycles.every((c) => c.tau === Infinity)) rewind(d); sync(); });
  stop.innerHTML = TICON.stop; stop.title = 'Stop and rewind'; stop.setAttribute('aria-label', stop.title);
  stop.addEventListener('click', () => { d.playing = false; rewind(d); d.draw(); sync(); });
  speed.title = 'Speed'; speed.setAttribute('aria-label', 'Playback speed');
  speed.addEventListener('click', () => { d.speed = SPEEDS[(SPEEDS.indexOf(d.speed as 1) + 1) % SPEEDS.length]; sync(); });
  if (d.cycles.length && isFinite(periodOf(d))) {   /* a steady oscillation runs endlessly and has nothing to scrub */
    const scrub = el('input', 'scrub s-t'); scrub.type = 'range'; scrub.min = '0'; scrub.step = 'any'; scrub.setAttribute('aria-label', 'Time');
    scrub.addEventListener('input', () => { d.playing = false; const v = +scrub.value; d.cycles.forEach((c) => { c.tau = v; c.wait = 0; }); d.draw(); sync(); });
    d.scrub = scrub; bar.append(play, stop, scrub, speed);
  } else bar.append(play, stop, speed);
  sync();
  const stage = d.fig.querySelector('.stage'); if (stage) stage.appendChild(bar); else d.fig.appendChild(bar);
  d.sync = sync;
}
function register(fig: HTMLElement, d: { update: (dt: number) => void; draw: () => void }): void {
  const cycles = pendingCycles.splice(0), still = !cycles.length;
  const full: Sim = { ...d, fig, cycles, playing: !REDUCED && !still, speed: 1, dirty: true };
  sims.push(full); vio?.observe(fig); if (!still) transport(full);
  fig.addEventListener('input', () => { full.dirty = true; });                                   /* sliders, scrubber, segmented controls */
  fig.addEventListener('change', () => { full.dirty = true; });                                  /* a thumb settling on a detent */
  fig.addEventListener('pointermove', (e) => { if (e.buttons) full.dirty = true; });              /* orbit drags in a 3D view */
}
let lastT = typeof performance !== 'undefined' ? performance.now() : 0;
function loop(now: number): void {
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  sims.forEach((d) => {
    if (!onScreen.has(d.fig)) return;
    if (!paused && d.playing) {
      const before = d.cycles.map((c) => c.tau); d.update(dt * d.speed);
      if (d.cycles.some((c, i) => c.tau !== before[i])) { d.dirty = true; syncScrub(d); }   /* the end-of-loop hold changes nothing */
    }
    /* Every redraw the book asks for now comes through here, so one figure that
       throws must not take the loop — and with it every other figure — down. */
    if (d.dirty) { d.dirty = false; usePal(d.fig); try { d.draw(); } catch (e) { console.error(e); } }
  });
  requestAnimationFrame(loop);
}
if (typeof requestAnimationFrame === 'function') requestAnimationFrame(loop);
function cycle(period: () => number, hold: number): Cycle {
  const s: Cycle = {
    tau: REDUCED ? Infinity : 0, wait: 0, period,
    step(dt, rate) { if (s.tau >= period()) { s.wait += dt; if (s.wait > hold) { s.wait = 0; s.tau = 0; } return; } s.tau = Math.min(period(), s.tau + dt * rate()); },
    now: () => Math.min(s.tau, period()),
    reset() { s.tau = REDUCED ? Infinity : 0; s.wait = 0; },
  };
  pendingCycles.push(s); return s;
}
const setPaused = (v: boolean): void => { paused = v; };
const setCC = (on: boolean): void => { CC = on; };

/* ---------- drawing primitives (logical units) ---------- */
const FONT = '"Source Sans 3", "Segoe UI", Helvetica, Arial, sans-serif';
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
/* A label may carry subscripts the way the book's symbols do: `F_net`, `T_{L}`, `w_{box}`. An underscore
   followed by a braced group or one word character is drawn as a subscript, smaller and lowered; a
   plain underscore is never printed. Alignment and the panel behind the label measure the whole run. */
type Run = { s: string; sub: boolean };
function runsOf(s: string): Run[] {
  const out: Run[] = []; const re = /_\{([^}]*)\}|_([A-Za-z0-9\u2080-\u209c\u03b1-\u03c9+\-]+)/g; let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(s))) { if (m.index > last) out.push({ s: s.slice(last, m.index), sub: false }); out.push({ s: m[1] ?? m[2] ?? '', sub: true }); last = re.lastIndex; }
  if (last < s.length) out.push({ s: s.slice(last), sub: false });
  return out;
}
function text(ctx: Ctx, s: string, x: Logical, y: Logical, color: Color, o: TextOpts = {}): void {
  const size = o.size ?? 22, weight = o.weight ?? 400, font = (k: number) => `${weight} ${size * k}px ${FONT}`;
  const runs = s.includes('_') ? runsOf(s) : [{ s, sub: false }];
  ctx.save(); ctx.textAlign = 'left'; ctx.textBaseline = o.base ?? 'middle';
  const widths = runs.map((r) => { ctx.font = font(r.sub ? 0.72 : 1); return ctx.measureText(r.s).width; });
  const total = widths.reduce((a, b) => a + b, 0), align = o.align ?? 'left';
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  if (o.bg) { const pw = total + 14, ph = size + 8; ctx.fillStyle = o.bg; ctx.fillRect(cx - 7, y - ph / 2, pw, ph); }
  ctx.fillStyle = color;
  runs.forEach((r, i) => { ctx.font = font(r.sub ? 0.72 : 1); ctx.fillText(r.s, cx, r.sub ? y + size * 0.22 : y); cx += widths[i]; });
  ctx.restore();
}
const oneline = (ctx: Ctx, s: string, color?: Color): void => text(ctx, s, LW / 2, 46, color ?? PAL.ink, { size: 26, align: 'center' });
/* The headline of a figure. It wraps exactly as `topline` does — one line where it
   fits and two otherwise — so a headline built from live numbers can never run off
   the canvas, and it returns the number of lines it took. */
const headline = (ctx: Ctx, s: string, color?: Color): 1 | 2 => topline(ctx, s, color);
/* The side a bracket's label is set on, and the canvas height it is kept inside.
   A bracket over a short span carries a label wider than the span, so the label is
   clamped to the canvas rather than allowed to hang off the edge. */
export type BracketSide = 'above' | 'below' | 'left' | 'right';
type BracketOpts = { side?: BracketSide; H?: Logical; size?: number };
const canvasH = (ctx: Ctx, o?: { H?: Logical }): Logical => o?.H ?? +((ctx as { canvas?: { dataset?: Record<string, string> } }).canvas?.dataset?.h ?? 0);
/* the label's half width at the weight and size a bracket and a note set their text */
function halfWidth(ctx: Ctx, s: string, size: number): Logical {
  ctx.save(); ctx.font = '600 ' + size + 'px ' + FONT; const w = ctx.measureText(s).width; ctx.restore(); return w / 2 + 9;
}
function hbracket(ctx: Ctx, x1: Logical, x2: Logical, y: Logical, color: Color, label?: string, o: BracketOpts = {}): void {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.moveTo(x1, y - 10); ctx.lineTo(x1, y + 10); ctx.moveTo(x2, y - 10); ctx.lineTo(x2, y + 10); ctx.stroke(); ctx.restore();
  if (!label) return;
  const sz = o.size ?? 22, H = canvasH(ctx, o), below = o.side === 'below';
  const half = halfWidth(ctx, label, sz);
  const x = Math.min(Math.max((x1 + x2) / 2, 16 + half), LW - 16 - half);
  let ly = below ? y + 24 : y - 22;
  if (H > 0) ly = Math.min(Math.max(ly, 16 + sz / 2), H - 16 - sz / 2);
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
  if (H > 0) ly = Math.min(Math.max(ly, 16 + sz / 2), H - 16 - sz / 2);
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
function axes(ctx: Ctx, box: Box, xr: Range, yr: Range, o: AxesOpts = {}): { X: Scale; Y: Scale } {
  const X: Scale = (v) => box.l + ((v - xr[0]) / (xr[1] - xr[0])) * (box.r - box.l);
  const Y: Scale = (v) => box.b - ((v - yr[0]) / (yr[1] - yr[0])) * (box.b - box.t);
  const nx = o.nx ?? 4, ny = o.ny ?? 3;
  for (let i = 0; i <= nx; i++) { const v = xr[0] + ((xr[1] - xr[0]) * i) / nx; if (i) line(ctx, X(v), box.t, X(v), box.b, PAL.rule, 1.5); text(ctx, o.fx ? o.fx(v) : fmt(v, 0), X(v), box.b + 26, PAL.muted, { size: 17, align: 'center' }); }
  for (let i = 0; i <= ny; i++) { const v = yr[0] + ((yr[1] - yr[0]) * i) / ny; if (i) line(ctx, box.l, Y(v), box.r, Y(v), PAL.rule, 1.5); text(ctx, o.fy ? o.fy(v) : fmt(v, 0), box.l - 14, Y(v), PAL.muted, { size: 17, align: 'right' }); }
  line(ctx, box.l, box.t, box.l, box.b, PAL.muted, 2); line(ctx, box.l, box.b, box.r, box.b, PAL.muted, 2);
  if (xr[0] < 0 && xr[1] > 0) line(ctx, X(0), box.t, X(0), box.b, PAL.muted, 2);
  if (yr[0] < 0 && yr[1] > 0) line(ctx, box.l, Y(0), box.r, Y(0), PAL.muted, 2);
  if (o.xl) text(ctx, o.xl, box.r, box.b + 58, o.xc ?? PAL.ink, { align: 'right', weight: 600, size: 20 });
  if (o.yl) text(ctx, o.yl, box.l, box.t - 24, o.yc ?? PAL.ink, { align: 'left', weight: 600, size: 20 });
  return { X, Y };
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
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath();
  for (let i = 0; i <= n; i++) { const s = t0 + ((t1 - t0) * i) / n; if (i) ctx.lineTo(X(s), Y(f(s))); else ctx.moveTo(X(s), Y(f(s))); }
  ctx.stroke(); ctx.restore();
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
  const half = halfWidth(ctx, s, sz), bh = sz + 8;
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
  const half = halfWidth(ctx, s, size), bh = size + 8, pad = 12;
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
  ctx.fillStyle = PAL.panel; ctx.font = '700 ' + Math.max(9, sign * 0.7) + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(name, x, t + sign / 2);
  ctx.restore();
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
  ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, 26 * s, 11 * s, heading, 0, Math.PI * 2); ctx.fill();
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
    ctx.save(); ctx.font = '600 ' + size + 'px ' + FONT; const tw = ctx.measureText(s).width; ctx.restore();
    const bw = tw + 14, bh = size + 8;
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
function topline(ctx: Ctx, s: string, color?: Color): 1 | 2 {
  const wide = (t: string): number => { ctx.save(); ctx.font = '400 26px ' + FONT; const q = ctx.measureText(t).width; ctx.restore(); return q; };
  if (wide(s) <= LW - 220) { oneline(ctx, s, color); return 1; }
  const words = s.split(' ');
  let cut = 1, best = Infinity;
  for (let i = 1; i < words.length; i++) {
    const q = Math.abs(wide(words.slice(0, i).join(' ')) - wide(words.slice(i).join(' ')));
    if (q < best) { best = q; cut = i; }
  }
  text(ctx, words.slice(0, cut).join(' '), LW / 2, 38, color ?? PAL.ink, { size: 26, align: 'center' });
  text(ctx, words.slice(cut).join(' '), LW / 2, 74, color ?? PAL.ink, { size: 26, align: 'center' });
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
export type Picker = { readonly value: string; set: (v: string) => void };
type ChoiceOpts = { label?: string; options: readonly Choice[]; value?: string; aria?: string; onInput?: (v: string) => void };

const plain = (s: string): string => s.replace(/\\k|[{}\\]/g, '');
const ariaOf = (o: ChoiceOpts): string => o.aria ?? (o.label ? plain(o.label) : 'Choice');
function ctlLabel(lab: HTMLElement, o: ChoiceOpts): void { if (!o.label) return; const name = el('span', 'ctl-label'); tex(name, o.label); lab.appendChild(name); }

function choice(host: HTMLElement, o: ChoiceOpts): Picker {
  const lab = el('label', 'ctl-seg'); ctlLabel(lab, o);
  const row = el('div', 'ctlseg'); row.setAttribute('role', 'radiogroup'); row.setAttribute('aria-label', ariaOf(o));
  const values = o.options.map((c) => c.value);
  let v = values.includes(o.value ?? '') ? (o.value as string) : (values[0] ?? '');
  const buttons = o.options.map((c) => {
    const b = el('button', 'segbtn', c.label); b.type = 'button'; b.dataset.value = c.value; b.setAttribute('role', 'radio');
    row.appendChild(b); return b;
  });
  const mark = (): void => buttons.forEach((b) => { const on = b.dataset.value === v; b.setAttribute('aria-checked', String(on)); b.classList.toggle('on', on); b.tabIndex = on ? 0 : -1; });
  const pick = (next: string, focus: boolean): void => {
    if (next === v || !values.includes(next)) return;
    v = next; mark(); if (focus) buttons[values.indexOf(v)].focus();
    o.onInput?.(v); row.dispatchEvent(new Event('input', { bubbles: true }));
  };
  buttons.forEach((b) => b.addEventListener('click', () => pick(b.dataset.value ?? '', false)));
  row.addEventListener('keydown', (e) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault(); pick(values[(values.indexOf(v) + step + values.length) % values.length], true);
  });
  mark(); lab.appendChild(row); host.appendChild(lab);
  return { get value() { return v; }, set(x: string) { if (!values.includes(x)) return; v = x; mark(); } };
}

function select(host: HTMLElement, o: ChoiceOpts): Picker {
  const lab = el('label', 'ctl-pick'); ctlLabel(lab, o);
  const sel = el('select', 'ctl-select'); sel.setAttribute('aria-label', ariaOf(o));
  o.options.forEach((c) => { const op = el('option'); op.value = c.value; op.textContent = c.label; sel.appendChild(op); });
  sel.value = o.value ?? o.options[0]?.value ?? '';
  sel.addEventListener('input', () => o.onInput?.(sel.value));
  lab.appendChild(sel); host.appendChild(lab);
  return { get value() { return sel.value; }, set(x: string) { sel.value = x; } };
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
const snapReach = (ds: readonly Detent[], o: CtlOpts): number => { const g = gapsOf(ds).map(Math.abs).filter((x) => x > 0); return 0.34 * (g.length ? Math.min(...g) : (o.max - o.min) * 0.2); };
function nearestDetent(ds: readonly Detent[], x: number, reach: number): number | null {
  const best = ds.map(detentValue).reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a));
  return Math.abs(best - x) <= reach ? best : null;
}
function ticksOf(ds: readonly Detent[], o: CtlOpts): HTMLElement {
  const box = el('span', 'ctl-ticks'); box.setAttribute('aria-hidden', 'true');
  ds.forEach((d) => {
    const t = el('span', 'tick'); t.style.left = (100 * (detentValue(d) - o.min)) / (o.max - o.min) + '%';
    const s = detentLabel(d); if (s) t.appendChild(el('span', 'tick-lab', s));
    box.appendChild(t);
  });
  return box;
}

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
function hover(stage: HTMLElement, hits: () => readonly Hit[]): Tip {
  const tip = tipOf(stage); const c = stage.querySelector('canvas');
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
   buttons under it say what dragging cannot — auto-rotate on and off, the
   viewpoints that carry meaning, and zoom, which the wheel also does over the
   canvas. The orbit is a turntable whose yaw and pitch the figure may bound,
   so a scene with a bench is never turned to show its underside. The renderer
   draws only when something changed and only while the figure is on screen,
   follows the container's size and the device pixel ratio, and disposes
   itself when the figure leaves the document. Labels are HTML (.lab3d) laid
   over the canvas at the projected point, so they set in the page's face. */
type Three = Record<string, any>;                        /* the r128 global */
type Obj3 = any;                                         /* a mesh, a line, a group */
export type Radians = number;
export type ViewPreset = { readonly label: string; readonly yaw: Radians; readonly pitch: Radians };
type Spin = 'idle' | 'off' | 'none';
type View3dOpts = {
  h?: Logical; dist?: number; tilt?: Radians;
  spin?: Spin; views?: readonly ViewPreset[];
  pitch?: readonly [Radians, Radians]; yaw?: readonly [Radians, Radians] | 'free';
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
};

const three = (): Three | null => (window as unknown as { THREE?: Three }).THREE ?? null;
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
const MESH = { vec: vec3, mat: mat3, geo, sphere: sphere3, stick: stick3, setStick: setStick3, lobe: lobe3, setLobe: setLobe3, bond: bond3, arrow: arrow3, polyline: polyline3, arc: arc3, box: box3 };

const VICON = {
  spin: '<svg viewBox="0 0 24 24"><path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v4h-4"/></svg>',
  out: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="M8 11h6M20 20l-4.5-4.5"/></svg>',
  in: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="M8 11h6M11 8v6M20 20l-4.5-4.5"/></svg>',
};
function vbtn(bar: HTMLElement, html: string, title: string, cls = ''): HTMLButtonElement {
  const b = el('button', 'vbtn' + (cls ? ' ' + cls : ''), html); b.type = 'button'; b.title = title; b.setAttribute('aria-label', title); bar.appendChild(b); return b;
}
const stub = (stage: HTMLElement): View3d => {
  const wrap = el('div', 'three-wrap'); wrap.appendChild(el('p', 'lab3d', 'This figure needs WebGL, which this browser does not provide.')); stage.appendChild(wrap);
  const nil = (): void => {};
  return { wrap, scene: null, camera: null, part: () => null, label: () => el('span'), headline: () => el('span'), clear: nil, project: () => [0, 0] as Pt, move: nil, invalidate: nil, pickable: (m: Obj3) => m, setView: nil, dispose: nil, get turned() { return false; } };
};

function view3d(stage: HTMLElement, opts: View3dOpts = {}): View3d {
  const T = three(); if (!T) return stub(stage);
  const H = +(stage.dataset.h ?? 0) || opts.h || 480;
  const dist = opts.dist ?? 7, zoomMin = opts.zoomMin ?? 0.55, zoomMax = opts.zoomMax ?? 2.6;
  const pitchLim = opts.pitch ?? ([-Math.PI / 2, Math.PI / 2] as const);
  const yawLim = opts.yaw ?? 'free';
  const spinMode: Spin = opts.spin ?? 'idle';
  const wrap = el('div', 'three-wrap'); wrap.style.setProperty('--three-h', String(H)); stage.appendChild(wrap);
  let renderer: Obj3 = null;
  try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true }); } catch { return stub(stage); }
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(30, 2, 0.1, 100); camera.position.set(0, 0, dist); camera.lookAt(0, 0, 0);
  const lamp = new T.DirectionalLight(0xffffff, 0.8); lamp.position.set(-3, 5, 7); scene.add(lamp); scene.add(new T.AmbientLight(0xffffff, 0.62));
  let head: HTMLElement | null = null;
  const parts: Obj3[] = [], labels: { el: HTMLElement; p: Obj3; g: Obj3; dy: number }[] = [], picks: { m: Obj3; name: string }[] = [];
  let yaw = 0, pitch = opts.tilt ?? 0.32, zoom = 1;
  let spinning = spinMode === 'idle' && !REDUCED, dragging = false, last: readonly [number, number] = [0, 0], need = true, alive = true, seen = true, turned = false;
  const qx = new T.Quaternion(), qy = new T.Quaternion(), AX = new T.Vector3(1, 0, 0), UP = new T.Vector3(0, 1, 0);
  const orient = (): void => { parts.forEach((g: Obj3) => g.quaternion.copy(qx.setFromAxisAngle(AX, pitch).multiply(qy.setFromAxisAngle(UP, yaw)))); need = true; };
  const aim = (y: Radians, p: Radians): void => {
    yaw = yawLim === 'free' ? y : clamp(y, yawLim[0], yawLim[1]);
    pitch = clamp(p, pitchLim[0], pitchLim[1]); orient();
  };
  const setZoom = (z: number): void => { zoom = clamp(z, zoomMin, zoomMax); camera.position.set(0, 0, dist / zoom); camera.updateProjectionMatrix(); need = true; };
  const v: View3d = {
    wrap, scene, camera,
    /* a group the drag turns about its own centre, placed at x; a figure with panels has several */
    part(x = 0) { const g = new T.Group(); g.position.set(x, 0, 0); scene.add(g); parts.push(g); orient(); return g; },
    /* the label s at point p of group g, in the page's face, kept dy pixels above the point */
    label(s, p, g, dy = 0, cls = '') { const e = el('div', 'lab3d' + (cls ? ' ' + cls : ''), s); wrap.appendChild(e); labels.push({ el: e, p: vec3(p), g, dy }); return e; },
    /* The scene's headline. A `.lab3d` label is one line pinned to a point of the scene; a
       headline belongs to the stage rather than to the scene, so it sits centred at the top
       edge and wraps over as many lines as the sentence takes, the way `F.headline` does on
       a canvas. Calling it again rewrites the same band. */
    headline(s) {
      if (!head) { head = el('div', 'lab3d head3d'); wrap.appendChild(head); }
      head.innerHTML = s; return head;
    },
    clear() {
      const shared = Object.values(geo());
      parts.forEach((g: Obj3) => { g.traverse((o: Obj3) => { if (o.material) o.material.dispose(); if (o.geometry && !shared.includes(o.geometry)) o.geometry.dispose(); }); g.clear(); });
      labels.forEach((l) => l.el.remove()); labels.length = 0; picks.length = 0; need = true;
    },
    /* the point p of group g on the canvas, in canvas pixels */
    project(p, g) { const w = vec3(p); g.localToWorld(w); w.project(camera); return [((w.x + 1) / 2) * wrap.clientWidth, ((1 - w.y) / 2) * wrap.clientHeight]; },
    move(e, p) { const l = labels.find((x) => x.el === e); if (l) l.p.set(p[0], p[1], p[2]); need = true; },
    invalidate() { need = true; },
    pickable(m, name) { picks.push({ m, name }); return m; },
    setView: aim,
    dispose,
    get turned() { return turned; },
  };
  renderer.setClearColor(0x000000, 0); wrap.appendChild(renderer.domElement);
  function size(): void {
    const w = wrap.clientWidth || 800, h = wrap.clientHeight || Math.round((w * H) / LW);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix(); need = true;
  }
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(size) : null; ro?.observe(wrap); size();
  const io = typeof IntersectionObserver === 'function' ? new IntersectionObserver((es) => es.forEach((e) => { seen = e.isIntersecting; if (seen) need = true; }), { rootMargin: '120px' }) : null; io?.observe(wrap);

  /* the button row: what dragging cannot say */
  const bar = el('div', 'view3d-bar'); stage.appendChild(bar);
  const spinBtn = spinMode === 'none' ? null : vbtn(bar, VICON.spin, 'Auto-rotate', 'spin');
  const markSpin = (): void => { spinBtn?.setAttribute('aria-pressed', String(spinning)); spinBtn?.classList.toggle('on', spinning); };
  spinBtn?.addEventListener('click', () => { spinning = !spinning; markSpin(); need = true; }); markSpin();
  (opts.views ?? []).forEach((p) => vbtn(bar, p.label, 'View: ' + p.label, 'named').addEventListener('click', () => { spinning = false; markSpin(); turned = true; aim(p.yaw, p.pitch); }));
  vbtn(bar, VICON.out, 'Zoom out').addEventListener('click', () => setZoom(zoom / 1.25));
  vbtn(bar, VICON.in, 'Zoom in').addEventListener('click', () => setZoom(zoom * 1.25));

  /* the orbit: a turntable within the bounds the figure set, and the wheel zooms over the canvas */
  wrap.addEventListener('pointerdown', (e) => { dragging = true; spinning = false; markSpin(); last = [e.clientX, e.clientY]; wrap.setPointerCapture(e.pointerId); wrap.style.cursor = 'grabbing'; e.preventDefault(); });
  wrap.addEventListener('pointermove', (e) => {
    if (dragging) { turned = true; aim(yaw + (e.clientX - last[0]) * 0.009, pitch + (e.clientY - last[1]) * 0.009); last = [e.clientX, e.clientY]; return; }
    pick(e);
  });
  const up = (): void => { dragging = false; wrap.style.cursor = 'grab'; };
  wrap.addEventListener('pointerup', up); wrap.addEventListener('pointercancel', up);
  wrap.addEventListener('pointerleave', () => tip.hide());
  wrap.addEventListener('wheel', (e) => { e.preventDefault(); setZoom(zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12)); }, { passive: false });

  /* the name of the body under the pointer, for the figures that register one */
  const tip = tipOf(stage), ray = new T.Raycaster(), ndc = new T.Vector2();
  function pick(e: PointerEvent): void {
    if (!picks.length) return;
    const r = wrap.getBoundingClientRect(), s = stage.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(picks.map((p) => p.m), false)[0];
    const name = hit ? picks.find((p) => p.m === hit.object)?.name : undefined;
    if (name) tip.show(e.clientX - s.left, e.clientY - s.top - 12, name); else tip.hide();
  }

  function place(): void {
    const w = wrap.clientWidth, h = wrap.clientHeight, t = vec3([0, 0, 0]);
    labels.forEach((l) => { t.copy(l.p); l.g.localToWorld(t); t.project(camera); l.el.style.left = ((t.x + 1) / 2) * w + 'px'; l.el.style.top = ((1 - t.y) / 2) * h - l.dy + 'px'; });
  }
  function dispose(): void { if (!alive) return; alive = false; ro?.disconnect(); io?.disconnect(); v.clear(); renderer?.dispose(); }
  let prev = performance.now(), gone = 0;
  function frame(now: number): void {
    if (!alive) return;
    if (!wrap.isConnected && ++gone > 300) { dispose(); return; }   /* torn down: five seconds out of the document */
    const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
    if (spinning && seen && !paused) aim(yaw + 0.22 * dt, pitch);
    if (need && seen) { renderer.render(scene, camera); place(); need = false; opts.onRender?.(); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return v;
}

export const FIG = {
  $, $$, REDUCED, get macros() { return macros; }, get KOPT() { return KOPT(); }, tex, renderMath, get SYM() { return SYM; },
  get PAL() { return PAL; }, get CC() { return CC; }, setCC, readPal, C, cat, alpha, redrawAll, el: elOf, fmt, LW, makeCanvas, begin, ctl, byId, sim,
  register, cycle, setPaused, get paused() { return paused; }, choice, select, hover, view3d, mesh: MESH, line, arrow, dot, text, headline, hbracket, vbracket, strip, scale, axes, nice, pinned, curve, labeller, topline, runner, person, silhouette, car, plane, dragster, spring, block, fixed, view, face, FONT,
  label, note, fitScale, angleArc, crate, house, shopfront, horse, helicopterTop, rowboat, sailboat, skydiver,
  fist, cart, personTop, motorcycle, helicopterSide, coasterCar, cardboardBox, cupOnSide, guitar: guitarSprite, book, backpack,
  vectorTriangle, wrap,
};
export type Fig = typeof FIG;

/* Called once by the shell with the book's macros and symbol table. */
export function initFig(book: { macros: Macros; symbols: SymbolMap; colorKeys: readonly string[] }): Fig {
  macros = book.macros; SYM = book.symbols; colorKeys = book.colorKeys; readPal();
  (window as unknown as { FIG: Fig }).FIG = FIG;
  return FIG;
}
