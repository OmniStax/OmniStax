/* OmniStax figure library: math rendering, palette, the animation loop and the drawing primitives.
   Shared by the shell and every section's figures.js. Exposed as window.FIG. */
window.FIG = (function () {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
/* ---------- math ---------- */
const macros = {"\\kt": "\\htmlClass{kv-t}{t}", "\\kx": "\\htmlClass{kv-x}{x}", "\\kxo": "\\htmlClass{kv-x}{x_0}", "\\kxf": "\\htmlClass{kv-x}{x_{\\text{f}}}", "\\kv": "\\htmlClass{kv-v}{v}", "\\kvo": "\\htmlClass{kv-v}{v_0}", "\\kvb": "\\htmlClass{kv-v}{\\bar{v}}", "\\ka": "\\htmlClass{kv-a}{a}", "\\kab": "\\htmlClass{kv-a}{\\bar{a}}", "\\kdx": "\\htmlClass{kv-x}{\\Delta x}", "\\kdt": "\\htmlClass{kv-t}{\\Delta t}", "\\kdv": "\\htmlClass{kv-v}{\\Delta v}"};
const KOPT = { macros, trust: (c) => c.command === '\\htmlClass', strict: false, throwOnError: false };
function tex(el, s, display) { katex.render(s, el, Object.assign({ displayMode: !!display }, KOPT)); }
function renderMath(root) {
  renderMathInElement(root, Object.assign({ delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }] }, KOPT));
}
const SYM = { t: '\\kt', x0: '\\kxo', xf: '\\kxf', x: '\\kx', 'Δx': '\\kdx', v0: '\\kvo', v: '\\kv', 'v̄': '\\kvb', 'Δv': '\\kdv', a: '\\ka' };

/* ---------- palette & color coding ---------- */
let CC = true;
const PAL = {};
const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
function readPal() {
  Object.assign(PAL, { t: cssVar('--c-t'), x: cssVar('--c-x'), v: cssVar('--c-v'), a: cssVar('--c-a'), ink: cssVar('--ink'), muted: cssVar('--muted'),
    rule: cssVar('--rule'), soft: cssVar('--soft'), soft2: cssVar('--soft2'), panel: cssVar('--panel'), bg: cssVar('--bg') });
}
const NEUTRAL = new Set(['ink', 'muted', 'rule', 'soft', 'soft2', 'panel', 'bg']);
function C(k) { return (CC || NEUTRAL.has(k)) ? PAL[k] : PAL.ink; }
function alpha(hex, a) {
  let h = hex.replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
const redraws = [];
function redrawAll() { readPal(); redraws.forEach((f) => { try { f(); } catch (e) { console.error(e); } }); }

/* ---------- DOM helpers ---------- */
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function fmt(n, d) { return (Math.abs(n) < 1e-9 ? 0 : n).toFixed(d); }
/* ---------- figure scaffolding ----------
   Every canvas is drawn in a fixed 1400-unit-wide logical space and scaled to
   the column, so type, strokes and markers stay large at every width.        */
const LW = 1400;
function makeCanvas(parent, H) { const c = document.createElement('canvas'); c.dataset.h = H; c.style.aspectRatio = LW + ' / ' + H; parent.appendChild(c); return c; }
function begin(c) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2), H = +c.dataset.h;
  const w = c.clientWidth || 800, k = w * dpr / LW, bw = Math.round(LW * k), bh = Math.round(H * k);
  if (c.width !== bw || c.height !== bh) { c.width = bw; c.height = bh; }
  const ctx = c.getContext('2d'); ctx.setTransform(k, 0, 0, k, 0, 0); ctx.clearRect(0, 0, LW, H);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.textBaseline = 'middle';
  return { ctx, W: LW, H };
}
function ctl(parent, o) {
  const lab = el('label'); const name = el('span', 'ctl-label'); tex(name, o.label);
  const inp = el('input'); inp.type = 'range'; inp.className = 's-' + o.cls; inp.min = o.min; inp.max = o.max; inp.step = o.step; inp.value = o.value;
  inp.setAttribute('aria-label', o.aria || o.label.replace(/\\k|[{}\\]/g, ''));
  const val = el('span', 'ctl-val kv-' + o.cls); const dec = o.dec == null ? 1 : o.dec;
  const upd = () => { val.textContent = fmt(+inp.value, dec) + ' ' + o.unit; };
  upd(); inp.addEventListener('input', () => { upd(); o.onInput && o.onInput(); });
  lab.append(name, inp, val); parent.appendChild(lab);
  return { get v() { return +inp.value; }, set(x) { inp.value = x; upd(); } };
}
function byId(root, id) { return root.querySelector('[id="' + root.dataset.sec + '-' + id + '"]'); }
function demo(root, id, H) {
  const fig = byId(root, id);
  const c = H ? makeCanvas(fig, H) : null;
  const controls = el('div', 'controls'); fig.appendChild(controls);
  const readout = el('div', 'readout'); fig.appendChild(readout);
  return { fig, c, controls, readout };
}

/* ---------- one animation loop for every figure ----------
   Figures animate on their own, like a diagram that is never still. Each one
   gets its own transport (play/pause, stop, speed) under the canvas;
   reduced-motion starts every figure stopped at its end state. Off-screen
   figures are not updated.                                                   */
let paused = false;
const demos = [], onScreen = new Set(), pendingCycles = [];
const vio = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting ? onScreen.add(e.target) : onScreen.delete(e.target)), { rootMargin: '120px' });
const SPEEDS = [1, 2, 4, 0.5], SPEED_LABEL = { 1: '1×', 2: '2×', 4: '4×', 0.5: '½×' };
const TICON = {
  play: '<svg viewBox="0 0 24 24"><path d="M7 5v14l12-7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
  stop: '<svg viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>',
};
function transport(d) {
  const bar = el('div', 'transport');
  const play = el('button', 'tbtn'), stop = el('button', 'tbtn'), speed = el('button', 'tbtn speed');
  [play, stop, speed].forEach((b) => { b.type = 'button'; });
  const sync = () => { play.innerHTML = d.playing ? TICON.pause : TICON.play; play.title = d.playing ? 'Pause' : 'Play'; play.setAttribute('aria-label', play.title); speed.textContent = SPEED_LABEL[d.speed]; bar.classList.toggle('playing', d.playing); };
  play.addEventListener('click', () => { d.playing = !d.playing; if (d.playing && d.cycles.every((c) => c.tau >= Infinity)) d.cycles.forEach((c) => { c.tau = 0; c.wait = 0; }); sync(); });
  stop.innerHTML = TICON.stop; stop.title = 'Stop and rewind'; stop.setAttribute('aria-label', stop.title);
  stop.addEventListener('click', () => { d.playing = false; d.cycles.forEach((c) => { c.tau = 0; c.wait = 0; }); d.draw(); sync(); });
  speed.title = 'Speed'; speed.setAttribute('aria-label', 'Playback speed');
  speed.addEventListener('click', () => { d.speed = SPEEDS[(SPEEDS.indexOf(d.speed) + 1) % SPEEDS.length]; sync(); });
  bar.append(play, stop, speed); sync();
  const ctls = d.fig.querySelector('.controls'); if (ctls) d.fig.insertBefore(bar, ctls); else d.fig.appendChild(bar);
  d.sync = sync;
}
function register(fig, d) {
  d.fig = fig; d.cycles = pendingCycles.splice(0); d.playing = !REDUCED; d.speed = 1;
  demos.push(d); vio.observe(fig); redraws.push(d.draw); transport(d);
}
let lastT = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  demos.forEach((d) => { if (!onScreen.has(d.fig)) return; if (!paused && d.playing) d.update(dt * d.speed); d.draw(); });
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
function cycle(period, hold) {
  // model time tau runs 0..period, waits `hold` real seconds, restarts
  const s = { tau: REDUCED ? Infinity : 0, wait: 0 };
  s.step = (dt, rate) => { if (s.tau >= period()) { s.wait += dt; if (s.wait > hold) { s.wait = 0; s.tau = 0; } return; } s.tau = Math.min(period(), s.tau + dt * rate()); };
  s.now = () => Math.min(s.tau, period());
  s.reset = () => { s.tau = REDUCED ? Infinity : 0; s.wait = 0; };
  pendingCycles.push(s);
  return s;
}
function setPaused(v) { paused = !!v; }

/* ---------- drawing primitives (logical units) ---------- */
const FONT = '"Source Sans 3", "Segoe UI", Helvetica, Arial, sans-serif';
function line(ctx, x1, y1, x2, y2, color, w, dash) { ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w || 3; if (dash) ctx.setLineDash(dash); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore(); }
function arrow(ctx, x1, y1, x2, y2, color, w) {
  const L = Math.hypot(x2 - x1, y2 - y1); if (L < 2) return;
  w = w || 4; const a = Math.atan2(y2 - y1, x2 - x1), hl = Math.min(18, L);
  ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - hl * 0.6 * Math.cos(a), y2 - hl * 0.6 * Math.sin(a)); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - hl * Math.cos(a - 0.42), y2 - hl * Math.sin(a - 0.42)); ctx.lineTo(x2 - hl * Math.cos(a + 0.42), y2 - hl * Math.sin(a + 0.42)); ctx.closePath(); ctx.fill(); ctx.restore();
}
function dot(ctx, x, y, color, filled, r) {
  // filled = current value, hollow = initial value (the book's subscript-0 convention)
  r = r || 9; ctx.save(); ctx.lineWidth = 3; ctx.strokeStyle = color; ctx.fillStyle = filled === false ? PAL.panel : color;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
}
function text(ctx, s, x, y, color, o) {
  o = o || {}; const size = o.size || 22;
  ctx.save(); ctx.font = (o.weight || 400) + ' ' + size + 'px ' + FONT; ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'middle';
  if (o.bg) { const m = ctx.measureText(s), pw = m.width + 14, ph = size + 8; let bx = x - 7; if (ctx.textAlign === 'center') bx = x - pw / 2; if (ctx.textAlign === 'right') bx = x - pw + 7; ctx.fillStyle = o.bg; ctx.fillRect(bx, y - ph / 2, pw, ph); }
  ctx.fillStyle = color; ctx.fillText(s, x, y); ctx.restore();
}
function headline(ctx, s, color) { text(ctx, s, LW / 2, 46, color || PAL.ink, { size: 26, align: 'center' }); }
function hbracket(ctx, x1, x2, y, color, label) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.moveTo(x1, y - 10); ctx.lineTo(x1, y + 10); ctx.moveTo(x2, y - 10); ctx.lineTo(x2, y + 10); ctx.stroke(); ctx.restore();
  if (label) text(ctx, label, (x1 + x2) / 2, y - 22, color, { align: 'center', weight: 600 });
}
function vbracket(ctx, x, y1, y2, color, label, side) {
  side = side || 1; ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.moveTo(x - 10, y1); ctx.lineTo(x + 10, y1); ctx.moveTo(x - 10, y2); ctx.lineTo(x + 10, y2); ctx.stroke(); ctx.restore();
  if (label) text(ctx, label, x + side * 16, (y1 + y2) / 2, color, { align: side > 0 ? 'left' : 'right', weight: 600 });
}
function strip(ctx, x1, x2, y, h) {
  // a road or track: soft slab with a dashed centre line
  ctx.save(); ctx.fillStyle = PAL.soft; ctx.fillRect(x1, y - h / 2, x2 - x1, h); ctx.restore();
  line(ctx, x1, y, x2, y, PAL.panel, 3, [22, 18]);
}
function scale(ctx, X, from, to, step, y, unit, every) {
  every = every || 1; let i = 0;
  for (let m = from; m <= to + 1e-9; m += step, i++) { line(ctx, X(m), y - 8, X(m), y + 8, PAL.muted, 2); if (i % every === 0) text(ctx, fmt(m, 0) + (unit ? ' ' + unit : ''), X(m), y + 28, PAL.muted, { size: 17, align: 'center' }); }
}
function axes(ctx, box, xr, yr, o) {
  // bold, sparse chart frame: two axis lines, a few faint gridlines, colored axis titles
  o = o || {};
  const X = (v) => box.l + (v - xr[0]) / (xr[1] - xr[0]) * (box.r - box.l);
  const Y = (v) => box.b - (v - yr[0]) / (yr[1] - yr[0]) * (box.b - box.t);
  const nx = o.nx || 4, ny = o.ny || 3;
  for (let i = 0; i <= nx; i++) { const v = xr[0] + (xr[1] - xr[0]) * i / nx; if (i) line(ctx, X(v), box.t, X(v), box.b, PAL.rule, 1.5); text(ctx, o.fx ? o.fx(v) : fmt(v, 0), X(v), box.b + 26, PAL.muted, { size: 17, align: 'center' }); }
  for (let i = 0; i <= ny; i++) { const v = yr[0] + (yr[1] - yr[0]) * i / ny; if (i) line(ctx, box.l, Y(v), box.r, Y(v), PAL.rule, 1.5); text(ctx, o.fy ? o.fy(v) : fmt(v, 0), box.l - 14, Y(v), PAL.muted, { size: 17, align: 'right' }); }
  line(ctx, box.l, box.t, box.l, box.b, PAL.muted, 2); line(ctx, box.l, box.b, box.r, box.b, PAL.muted, 2);
  if (xr[0] < 0 && xr[1] > 0) line(ctx, X(0), box.t, X(0), box.b, PAL.muted, 2);
  if (yr[0] < 0 && yr[1] > 0) line(ctx, box.l, Y(0), box.r, Y(0), PAL.muted, 2);
  if (o.xl) text(ctx, o.xl, box.r, box.b + 58, o.xc || PAL.ink, { align: 'right', weight: 600, size: 20 });
  if (o.yl) text(ctx, o.yl, box.l, box.t - 24, o.yc || PAL.ink, { align: 'left', weight: 600, size: 20 });
  return { X, Y };
}
function nice(lo, hi, want) {
  // round the range out to a step from {1,2,5}·10^k giving about `want` intervals
  want = want || 4; const raw = (hi - lo) / want, p = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 5, 10].map((m) => m * p).find((st) => raw <= st);
  const a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step;
  return { lo: a, hi: b, n: Math.round((b - a) / step) };
}
function curve(ctx, f, t0, t1, X, Y, color, w, n) {
  n = n || 80; ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w || 4; ctx.beginPath();
  for (let i = 0; i <= n; i++) { const s = t0 + (t1 - t0) * i / n; i ? ctx.lineTo(X(s), Y(f(s))) : ctx.moveTo(X(s), Y(f(s))); }
  ctx.stroke(); ctx.restore();
}
function runner(ctx, x, y, color, phase) {
  // stick figure, legs and arms swing with phase (0..2π)
  const sw = Math.sin(phase) * 12; ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(x, y - 44, 9, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x, y - 34); ctx.lineTo(x - 2, y - 6);
  ctx.moveTo(x - 2, y - 6); ctx.lineTo(x - 10 + sw, y + 18); ctx.moveTo(x - 2, y - 6); ctx.lineTo(x + 10 - sw, y + 18);
  ctx.moveTo(x - 1, y - 26); ctx.lineTo(x + 14 + sw * 0.6, y - 16); ctx.moveTo(x - 1, y - 26); ctx.lineTo(x - 14 - sw * 0.6, y - 16); ctx.stroke(); ctx.restore();
}
function car(ctx, x, y, color, s) {
  s = s || 1; ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = color;
  ctx.beginPath(); ctx.moveTo(-40, 6); ctx.lineTo(-40, -8); ctx.lineTo(-24, -10); ctx.lineTo(-12, -24); ctx.lineTo(16, -24); ctx.lineTo(30, -10); ctx.lineTo(42, -6); ctx.lineTo(42, 6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = PAL.panel; ctx.beginPath(); ctx.arc(-24, 8, 8, 0, Math.PI * 2); ctx.arc(24, 8, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(-24, 8, 4, 0, Math.PI * 2); ctx.arc(24, 8, 4, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}
function plane(ctx, x, y, color, s) {
  s = s || 1; ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(44, 0); ctx.lineTo(-30, -10); ctx.lineTo(-44, -26); ctx.lineTo(-58, -26); ctx.lineTo(-44, 0); ctx.lineTo(-58, 26); ctx.lineTo(-44, 26); ctx.lineTo(-30, 10); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(6, -6); ctx.lineTo(-12, -50); ctx.lineTo(-24, -50); ctx.lineTo(-16, -6); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(6, 6); ctx.lineTo(-12, 50); ctx.lineTo(-24, 50); ctx.lineTo(-16, 6); ctx.closePath(); ctx.fill(); ctx.restore();
}
function dragster(ctx, x, y, color, s) {
  s = s || 1; ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = color;
  ctx.fillRect(-60, -6, 90, 12); ctx.fillRect(20, -4, 26, 8); ctx.fillRect(-64, -22, 24, 6);
  ctx.beginPath(); ctx.arc(-44, 12, 14, 0, Math.PI * 2); ctx.arc(30, 8, 8, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

function setCC(on) { CC = !!on; }
return { $, $$, REDUCED, macros, KOPT, tex, renderMath, SYM, get PAL() { return PAL; }, get CC() { return CC; }, setCC, readPal, C, alpha, redraws, redrawAll, el, fmt, LW, makeCanvas, begin, ctl, byId, demo,
  register, cycle, setPaused, get paused() { return paused; }, line, arrow, dot, text, headline, hbracket, vbracket, strip, scale, axes, nice, curve, runner, car, plane, dragster, FONT };
})();
