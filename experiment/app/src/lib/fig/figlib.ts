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
type Demo = { fig: HTMLElement; update: (dt: number) => void; draw: () => void; cycles: Cycle[]; playing: boolean; speed: number; sync?: () => void; scrub?: HTMLInputElement; dirty: boolean };
type TextOpts = { size?: number; weight?: number; align?: CanvasTextAlign; base?: CanvasTextBaseline; bg?: Color };
type CtlOpts = { label: string; cls: string; min: number; max: number; step: number; value: number; unit: string; dec?: number; aria?: string; onInput?: () => void };
type AxesOpts = { xl?: string; yl?: string; xc?: Color; yc?: Color; nx?: number; ny?: number; fx?: (v: number) => string; fy?: (v: number) => string };

const $ = <T extends Element = Element>(s: string, r: ParentNode = document): T | null => r.querySelector<T>(s);
const $$ = <T extends Element = Element>(s: string, r: ParentNode = document): T[] => Array.from(r.querySelectorAll<T>(s));
const REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- math ---------- */
let macros: Macros = {};
let SYM: SymbolMap = {};
const KOPT = () => ({ macros: { ...macros }, trust: (c: { command: string }) => c.command === '\\htmlClass', strict: false as const, throwOnError: false });
function tex(el: HTMLElement, s: string, display = false): void { katex.render(s, el, { ...KOPT(), displayMode: display }); }
function renderMath(root: HTMLElement): void {
  renderMathInElement(root, { ...KOPT(), delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }] });
}

/* ---------- palette & colour coding ---------- */
let CC = true;
const PAL: Record<string, Color> = {};
const NEUTRAL = new Set(['ink', 'muted', 'rule', 'soft', 'soft2', 'panel', 'bg']);
let colorKeys: readonly string[] = [];
const cssVar = (n: string): string => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
function readPal(): void {
  const named = Object.fromEntries(colorKeys.map((k) => [k, cssVar('--c-' + k)]));
  Object.assign(PAL, named, { ink: cssVar('--ink'), muted: cssVar('--muted'), rule: cssVar('--rule'), soft: cssVar('--soft'), soft2: cssVar('--soft2'), panel: cssVar('--panel'), bg: cssVar('--bg') });
}
const C = (k: string): Color => (CC || NEUTRAL.has(k) ? PAL[k] : PAL.ink);
function alpha(hex: Color, a: number): Color {
  let h = hex.replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
const redraws: Array<() => void> = [];
function redrawAll(): void { readPal(); redraws.forEach((f) => { try { f(); } catch (e) { console.error(e); } }); }

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
function demo(root: HTMLElement, id: string, H?: Logical) {
  /* A root holding one figure (a split-out figure pane) boots the whole section script; the other figures get a detached scaffold and never draw. */
  const fig = byId(root, id) ?? (root.dataset.one ? el('figure', 'demo') : null); if (!fig) throw new Error(`no figure "${id}" in ${root.dataset.sec}`);
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
   figure stopped at its end state. A figure draws only when something
   changed: its time advanced, a slider or drag touched it, it scrolled into
   view, or a global redraw was asked for. A paused figure costs nothing. */
let paused = false;
const demos: Demo[] = [], onScreen = new Set<Element>(), pendingCycles: Cycle[] = [];
const vio = typeof IntersectionObserver === 'function' ? new IntersectionObserver((es) => es.forEach((e) => {
  if (!e.isIntersecting) { onScreen.delete(e.target); return; }
  onScreen.add(e.target); const d = demos.find((x) => x.fig === e.target); if (d) d.dirty = true;
}), { rootMargin: '120px' }) : null;
const SPEEDS = [1, 2, 4, 0.5] as const; const SPEED_LABEL: Record<number, string> = { 1: '1×', 2: '2×', 4: '4×', 0.5: '½×' };
const TICON = { play: '<svg viewBox="0 0 24 24"><path d="M7 5v14l12-7z"/></svg>', pause: '<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>', stop: '<svg viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>' };
const rewind = (d: Demo) => d.cycles.forEach((c) => { c.tau = 0; c.wait = 0; });
const periodOf = (d: Demo): number => Math.max(0, ...d.cycles.map((c) => c.period()));
/* The scrubber follows the motion while it plays; dragging it pauses and sets the time. */
function syncScrub(d: Demo): void {
  const s = d.scrub; if (!s) return; const P = periodOf(d); if (!(P > 0)) return;
  s.max = String(P); s.value = String(Math.min(d.cycles[0].tau, P));
}
function transport(d: Demo): void {
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
  const full: Demo = { ...d, fig, cycles: pendingCycles.splice(0), playing: !REDUCED, speed: 1, dirty: true };
  demos.push(full); vio?.observe(fig); redraws.push(full.draw); transport(full);
  fig.addEventListener('input', () => { full.dirty = true; });                                   /* sliders, scrubber */
  fig.addEventListener('pointermove', (e) => { if (e.buttons) full.dirty = true; });              /* orbit drags in a 3D view */
}
let lastT = typeof performance !== 'undefined' ? performance.now() : 0;
function loop(now: number): void {
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  demos.forEach((d) => {
    if (!onScreen.has(d.fig)) return;
    if (!paused && d.playing) {
      const before = d.cycles.map((c) => c.tau); d.update(dt * d.speed);
      if (!d.cycles.length || d.cycles.some((c, i) => c.tau !== before[i])) { d.dirty = true; syncScrub(d); }   /* the end-of-loop hold changes nothing */
    }
    if (d.dirty) { d.dirty = false; d.draw(); }
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

export const FIG = {
  $, $$, REDUCED, get macros() { return macros; }, get KOPT() { return KOPT(); }, tex, renderMath, get SYM() { return SYM; },
  get PAL() { return PAL; }, get CC() { return CC; }, setCC, readPal, C, alpha, redraws, redrawAll, el, fmt, LW, makeCanvas, begin, ctl, byId, demo,
  register, cycle, setPaused, get paused() { return paused; }, line, arrow, dot, text, headline, hbracket, vbracket, strip, scale, axes, nice, curve, runner, car, plane, dragster, spring, block, fixed, FONT,
};
export type Fig = typeof FIG;

/* Called once by the shell with the book's macros and symbol table. */
export function initFig(book: { macros: Macros; symbols: SymbolMap; colorKeys: readonly string[] }): Fig {
  macros = book.macros; SYM = book.symbols; colorKeys = book.colorKeys; readPal();
  (window as unknown as { FIG: Fig }).FIG = FIG;
  return FIG;
}
