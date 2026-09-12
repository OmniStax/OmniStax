/* The figure library: math rendering, palette, the animation loop with a
   transport per figure, and the drawing primitives in a fixed 1400-unit
   logical space. Section figure modules receive it as `F` and it is also
   exposed as window.FIG for classic scripts. */
import katex from 'katex';
import renderMathInElement from 'katex/contrib/auto-render';

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
export type Labeller = {
  block: (l: Logical, t: Logical, r: Logical, b: Logical) => void;
  add: (s: string, hx: Logical, hy: Logical, ux: number, uy: number, color: Color, size?: number, start?: number) => void;
  flush: () => void;
};
export type Vec3 = readonly [number, number, number];   /* a point or direction in the scene: y up, z toward the viewer */
export type Pt = readonly [Logical, Logical];                 /* a projected point on the canvas */
type ViewOpts = { yaw: number; pitch: number; dist: number; cx: Logical; cy: Logical };
export type View = { P: (p: Vec3) => Pt; shade: (n: Vec3) => number };
type TextOpts = { size?: number; weight?: number; align?: CanvasTextAlign; base?: CanvasTextBaseline; bg?: Color };
type CtlOpts = { label: string; cls: string; min: number; max: number; step: number; value: number; unit: string; dec?: number; aria?: string; onInput?: () => void };
type AxesOpts = { xl?: string; yl?: string; xc?: Color; yc?: Color; nx?: number; ny?: number; fx?: (v: number) => string; fy?: (v: number) => string };

const $ = <T extends Element = Element>(s: string, r: ParentNode = document): T | null => r.querySelector<T>(s);
const $$ = <T extends Element = Element>(s: string, r: ParentNode = document): T[] => Array.from(r.querySelectorAll<T>(s));
const REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- math ---------- */
let macros: Macros = {};
let SYM: SymbolMap = {};
const TRUSTED: ReadonlySet<string> = new Set(['\\htmlClass', '\\htmlData']);   /* the book's colour macros: a type class and a symbol key */
const KOPT = () => ({ macros: { ...macros }, trust: (c: { command: string }) => TRUSTED.has(c.command), strict: false as const, throwOnError: false });
function tex(el: HTMLElement, s: string, display = false): void { katex.render(s, el, { ...KOPT(), displayMode: display }); }
function renderMath(root: HTMLElement): void {
  renderMathInElement(root, { ...KOPT(), delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }] });
}

/* ---------- palette & colour coding ---------- */
let CC = true;
const PAL: Record<string, Color> = {};
const NEUTRAL = new Set(['ink', 'muted', 'rule', 'soft', 'soft2', 'panel', 'bg']);
let colorKeys: readonly string[] = [];
const cssVar = (n: string, el: Element = document.documentElement): string => getComputedStyle(el).getPropertyValue(n).trim();
/* The page's palette, plus the hues a figure's own chapter and section bind. */
let base: Record<string, Color> = {};
const chapterPal = new Map<string, Record<string, Color>>();
function readPal(): void {
  const named = Object.fromEntries(colorKeys.map((k) => [k, cssVar('--c-' + k)]));
  base = { ...named, ink: cssVar('--ink'), muted: cssVar('--muted'), rule: cssVar('--rule'), soft: cssVar('--soft'), soft2: cssVar('--soft2'), panel: cssVar('--panel'), bg: cssVar('--bg') };
  chapterPal.clear(); Object.assign(PAL, base);
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
const C = (k: string): Color => (CC || NEUTRAL.has(k) ? PAL[k] : PAL.ink);
function alpha(hex: Color, a: number): Color {
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
function ctl(parent: HTMLElement, o: CtlOpts): { readonly v: number; set: (x: number) => void } {
  const lab = el('label'); const name = el('span', 'ctl-label'); tex(name, o.label);
  const inp = el('input'); inp.type = 'range'; inp.className = 's-' + o.cls; inp.min = String(o.min); inp.max = String(o.max); inp.step = String(o.step); inp.value = String(o.value);
  inp.setAttribute('aria-label', o.aria ?? o.label.replace(/\\k|[{}\\]/g, ''));
  const val = el('span', 'ctl-val kv-' + o.cls); const dec = o.dec ?? 1;
  const upd = () => { val.textContent = fmt(+inp.value, dec) + ' ' + o.unit; };
  upd(); inp.addEventListener('input', () => { upd(); o.onInput?.(); });
  lab.append(name, inp, val); parent.appendChild(lab);
  return { get v() { return +inp.value; }, set(x: number) { inp.value = String(x); upd(); } };
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
  fig.addEventListener('input', () => { full.dirty = true; });                                   /* sliders, scrubber */
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
function text(ctx: Ctx, s: string, x: Logical, y: Logical, color: Color, o: TextOpts = {}): void {
  const size = o.size ?? 22;
  ctx.save(); ctx.font = `${o.weight ?? 400} ${size}px ${FONT}`; ctx.textAlign = o.align ?? 'left'; ctx.textBaseline = o.base ?? 'middle';
  if (o.bg) { const m = ctx.measureText(s), pw = m.width + 14, ph = size + 8; const bx = ctx.textAlign === 'center' ? x - pw / 2 : ctx.textAlign === 'right' ? x - pw + 7 : x - 7; ctx.fillStyle = o.bg; ctx.fillRect(bx, y - ph / 2, pw, ph); }
  ctx.fillStyle = color; ctx.fillText(s, x, y); ctx.restore();
}
const headline = (ctx: Ctx, s: string, color?: Color): void => text(ctx, s, LW / 2, 46, color ?? PAL.ink, { size: 26, align: 'center' });
function hbracket(ctx: Ctx, x1: Logical, x2: Logical, y: Logical, color: Color, label?: string): void {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.moveTo(x1, y - 10); ctx.lineTo(x1, y + 10); ctx.moveTo(x2, y - 10); ctx.lineTo(x2, y + 10); ctx.stroke(); ctx.restore();
  if (label) text(ctx, label, (x1 + x2) / 2, y - 22, color, { align: 'center', weight: 600 });
}
function vbracket(ctx: Ctx, x: Logical, y1: Logical, y2: Logical, color: Color, label?: string, side = 1): void {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.moveTo(x - 10, y1); ctx.lineTo(x + 10, y1); ctx.moveTo(x - 10, y2); ctx.lineTo(x + 10, y2); ctx.stroke(); ctx.restore();
  if (label) text(ctx, label, x + side * 16, (y1 + y2) / 2, color, { align: side > 0 ? 'left' : 'right', weight: 600 });
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
function dragster(ctx: Ctx, x: Logical, y: Logical, color: Color, s = 1): void {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = color;
  ctx.fillRect(-60, -6, 90, 12); ctx.fillRect(20, -4, 26, 8); ctx.fillRect(-64, -22, 24, 6);
  ctx.beginPath(); ctx.arc(-44, 12, 14, 0, Math.PI * 2); ctx.arc(30, 8, 8, 0, Math.PI * 2); ctx.fill(); ctx.restore();
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
function labeller(ctx: Ctx, H: Logical): Labeller {
  const placed: Box[] = [], queue: Label[] = [];
  const boxOf = (s: string, x: Logical, y: Logical, size: number, align: CanvasTextAlign): Box => {
    ctx.save(); ctx.font = '600 ' + size + 'px ' + FONT; const tw = ctx.measureText(s).width; ctx.restore();
    const bw = tw + 14, bh = size + 8;
    const l = align === 'center' ? x - bw / 2 : align === 'right' ? x - bw + 7 : x - 7;
    return { l, r: l + bw, t: y - bh / 2, b: y + bh / 2 };
  };
  const clash = (a: Box): boolean => placed.some((b) => a.l < b.r + 8 && b.l < a.r + 8 && a.t < b.b + 6 && b.t < a.b + 6);
  return {
    block(l, t, r, b) { placed.push({ l, t, r, b }); },
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
        placed.push(b); queue.push({ s, x, y, hx, hy, color, sz, align });
        return;
      }
    },
    flush() {
      for (const q of queue) {
        const dx = q.x - q.hx, dy = q.y - q.hy, L = Math.hypot(dx, dy);
        if (L > 40) line(ctx, q.hx + (dx / L) * 15, q.hy + (dy / L) * 15, q.x - (dx / L) * 17, q.y - (dy / L) * 17, alpha(q.color, 0.5), 1.5, [5, 6]);
        text(ctx, q.s, q.x, q.y, q.color, { weight: 600, size: q.sz, align: q.align, bg: PAL.panel });
      }
    },
  };
}
/* a headline that never runs to the border: one line where it fits, and
   otherwise two, broken at the space that leaves the two halves most even */
function topline(ctx: Ctx, s: string): 1 | 2 {
  const wide = (t: string): number => { ctx.save(); ctx.font = '400 26px ' + FONT; const q = ctx.measureText(t).width; ctx.restore(); return q; };
  if (wide(s) <= LW - 220) { headline(ctx, s); return 1; }
  const words = s.split(' ');
  let cut = 1, best = Infinity;
  for (let i = 1; i < words.length; i++) {
    const q = Math.abs(wide(words.slice(0, i).join(' ')) - wide(words.slice(i).join(' ')));
    if (q < best) { best = q; cut = i; }
  }
  text(ctx, words.slice(0, cut).join(' '), LW / 2, 38, PAL.ink, { size: 26, align: 'center' });
  text(ctx, words.slice(cut).join(' '), LW / 2, 74, PAL.ink, { size: 26, align: 'center' });
  return 2;
}

export const FIG = {
  $, $$, REDUCED, get macros() { return macros; }, get KOPT() { return KOPT(); }, tex, renderMath, get SYM() { return SYM; },
  get PAL() { return PAL; }, get CC() { return CC; }, setCC, readPal, C, alpha, redrawAll, el, fmt, LW, makeCanvas, begin, ctl, byId, sim,
  register, cycle, setPaused, get paused() { return paused; }, line, arrow, dot, text, headline, hbracket, vbracket, strip, scale, axes, nice, pinned, curve, labeller, topline, runner, person, car, plane, dragster, spring, block, fixed, view, face, FONT,
};
export type Fig = typeof FIG;

/* Called once by the shell with the book's macros and symbol table. */
export function initFig(book: { macros: Macros; symbols: SymbolMap; colorKeys: readonly string[] }): Fig {
  macros = book.macros; SYM = book.symbols; colorKeys = book.colorKeys; readPal();
  (window as unknown as { FIG: Fig }).FIG = FIG;
  return FIG;
}
