(function () {
'use strict';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const EX = JSON.parse($('#data-exercises').textContent);
const CON = JSON.parse($('#data-concepts').textContent);
const FORM = JSON.parse($('#data-formulas').textContent);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- math ---------- */
const macros = {
  '\\kt': '\\htmlClass{kv-t}{t}', '\\kx': '\\htmlClass{kv-x}{x}', '\\kxo': '\\htmlClass{kv-x}{x_0}',
  '\\kv': '\\htmlClass{kv-v}{v}', '\\kvo': '\\htmlClass{kv-v}{v_0}', '\\kvb': '\\htmlClass{kv-v}{\\bar{v}}',
  '\\ka': '\\htmlClass{kv-a}{a}', '\\kab': '\\htmlClass{kv-a}{\\bar{a}}',
  '\\kdx': '\\htmlClass{kv-x}{\\Delta x}', '\\kdt': '\\htmlClass{kv-t}{\\Delta t}', '\\kdv': '\\htmlClass{kv-v}{\\Delta v}',
};
const KOPT = { macros, trust: (c) => c.command === '\\htmlClass', strict: false, throwOnError: false };
function tex(el, s, display) { katex.render(s, el, Object.assign({ displayMode: !!display }, KOPT)); }
function renderMath(root) {
  renderMathInElement(root, Object.assign({ delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }] }, KOPT));
}
$$('article').forEach(renderMath);
const SYM = { t: '\\kt', x0: '\\kxo', x: '\\kx', 'Δx': '\\kdx', v0: '\\kvo', v: '\\kv', 'v̄': '\\kvb', 'Δv': '\\kdv', a: '\\ka' };

/* ---------- palette & color coding ---------- */
let CC = true;
let PAL = {};
const cssVar = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
function readPal() {
  PAL = { t: cssVar('--c-t'), x: cssVar('--c-x'), v: cssVar('--c-v'), a: cssVar('--c-a'), ink: cssVar('--ink'), muted: cssVar('--muted'),
    rule: cssVar('--rule'), soft: cssVar('--soft'), soft2: cssVar('--soft2'), panel: cssVar('--panel'), bg: cssVar('--bg') };
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
function demo(id, H) {
  const fig = $('#' + id);
  const c = H ? makeCanvas(fig, H) : null;
  const controls = el('div', 'controls'); fig.appendChild(controls);
  const readout = el('div', 'readout'); fig.appendChild(readout);
  return { fig, c, controls, readout };
}

/* ---------- one animation loop for every figure ----------
   Figures animate on their own, like a diagram that is never still. A global
   pause (bottom-right pill) stops them; reduced-motion starts paused at the
   end state. Off-screen figures are not updated.                             */
let paused = REDUCED;
const demos = [], onScreen = new Set();
const vio = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting ? onScreen.add(e.target) : onScreen.delete(e.target)), { rootMargin: '120px' });
function register(fig, d) { d.fig = fig; demos.push(d); vio.observe(fig); redraws.push(d.draw); }
let lastT = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  demos.forEach((d) => { if (!onScreen.has(d.fig)) return; if (!paused) d.update(dt); d.draw(); });
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
function cycle(period, hold) {
  // model time tau runs 0..period, waits `hold` real seconds, restarts
  const s = { tau: REDUCED ? Infinity : 0, wait: 0 };
  s.step = (dt, rate) => { if (s.tau >= period()) { s.wait += dt; if (s.wait > hold) { s.wait = 0; s.tau = 0; } return; } s.tau = Math.min(period(), s.tau + dt * rate()); };
  s.now = () => Math.min(s.tau, period());
  s.reset = () => { s.tau = REDUCED || paused ? Infinity : 0; s.wait = 0; };
  return s;
}
(function () {
  const b = $('#pause-btn'); if (!b) return;
  const label = () => { b.textContent = paused ? 'resume animations' : 'pause animations'; };
  label(); b.addEventListener('click', () => { paused = !paused; label(); });
})();

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

/* =====================================================================
   DEMO 1: notation. A number line, two positions, one stopwatch.
===================================================================== */
(function () {
  const d = demo('demo-notation', 460);
  const x0 = ctl(d.controls, { label: '\\kxo', cls: 'x', min: 0, max: 100, step: 1, value: 20, unit: 'm', dec: 0, onInput: reset });
  const x = ctl(d.controls, { label: '\\kx', cls: 'x', min: 0, max: 100, step: 1, value: 80, unit: 'm', dec: 0, onInput: reset });
  const t = ctl(d.controls, { label: '\\kt', cls: 't', min: 1, max: 60, step: 0.5, value: 12, unit: 's', dec: 1, onInput: reset });
  const cy = cycle(() => t.v, 1.2);
  function reset() { cy.reset(); }
  function draw() {
    const { ctx, W, H } = begin(d.c);
    const tau = cy.now(), dx = x.v - x0.v, f = tau / t.v;
    const L = 90, R = 1040, y = 300; const X = (m) => L + (R - L) * m / 100;
    line(ctx, L, y, R, y, PAL.muted, 3); scale(ctx, X, 0, 100, 10, y, '', 2);
    if (Math.abs(dx) >= 2) hbracket(ctx, X(x0.v), X(x.v), y - 92, C('x'), 'Δx = ' + dx + ' m');
    // the object in transit
    const xm = x0.v + dx * f; line(ctx, X(x0.v), y - 40, X(xm), y - 40, C('x'), 3, [6, 8]);
    dot(ctx, X(x0.v), y, C('x'), false, 11); dot(ctx, X(x.v), y, C('x'), true, 11);
    dot(ctx, X(xm), y - 40, PAL.ink, true, 8);
    text(ctx, 'x₀', X(x0.v), y + 60, C('x'), { align: 'center', weight: 600, size: 24 });
    text(ctx, 'x', X(x.v), y + 60, C('x'), { align: 'center', weight: 600, size: 24 });
    // stopwatch
    const cx = 1230, cyy = 250, r = 96;
    ctx.save(); ctx.lineWidth = 4; ctx.strokeStyle = C('t'); ctx.fillStyle = PAL.panel; ctx.beginPath(); ctx.arc(cx, cyy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C('t'); ctx.fillRect(cx - 10, cyy - r - 18, 20, 12);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; line(ctx, cx + (r - 8) * Math.sin(a), cyy - (r - 8) * Math.cos(a), cx + (r - 18) * Math.sin(a), cyy - (r - 18) * Math.cos(a), PAL.muted, 2.5); }
    const ang = f * Math.PI * 2;
    ctx.strokeStyle = C('t'); ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(cx, cyy, r - 30, -Math.PI / 2, -Math.PI / 2 + ang); ctx.stroke();
    line(ctx, cx, cyy, cx + (r - 26) * Math.sin(ang), cyy - (r - 26) * Math.cos(ang), C('t'), 4); dot(ctx, cx, cyy, C('t'), true, 5); ctx.restore();
    text(ctx, 't = ' + fmt(tau, 1) + ' s', cx, cyy + r + 34, C('t'), { align: 'center', weight: 600, size: 24 });
    text(ctx, 't₀ = 0', cx, cyy + r + 64, PAL.muted, { align: 'center', size: 17 });
    headline(ctx, 'the clock starts at 0 when the object is at x₀; after ' + fmt(t.v, 1) + ' s it is at x');
    tex(d.readout, `\\kdt = \\kt = ${fmt(t.v, 1)}\\ \\text{s}\\qquad \\kdx = \\kx - \\kxo = ${x.v} - ${x0.v} = ${dx}\\ \\text{m}`);
  }
  register(d.fig, { update: (dt) => cy.step(dt, () => t.v / 4), draw });
})();

/* =====================================================================
   DEMO 2: average velocity under constant acceleration is the midpoint
===================================================================== */
(function () {
  const d = demo('demo-avg', 600);
  const v0 = ctl(d.controls, { label: '\\kvo', cls: 'v', min: 0, max: 30, step: 0.5, value: 10, unit: 'm/s', onInput: reset });
  const v = ctl(d.controls, { label: '\\kv', cls: 'v', min: 0, max: 30, step: 0.5, value: 20, unit: 'm/s', onInput: reset });
  const t = ctl(d.controls, { label: '\\kt', cls: 't', min: 1, max: 20, step: 0.5, value: 10, unit: 's', onInput: reset });
  const cy = cycle(() => t.v, 1.2);
  function reset() { cy.reset(); }
  function draw() {
    const { ctx } = begin(d.c);
    const tau = cy.now(), vb = (v0.v + v.v) / 2, a = (v.v - v0.v) / t.v, vel = (s) => v0.v + a * s, area = (s) => v0.v * s + 0.5 * a * s * s;
    const box = { l: 130, r: 1180, t: 110, b: 500 };
    const { X, Y } = axes(ctx, box, [0, 20], [0, 30], { xl: 't (s)', xc: C('t'), yl: 'v (m/s)', yc: C('v'), nx: 4, ny: 3 });
    // area so far = displacement so far
    ctx.save(); ctx.fillStyle = alpha(C('x'), 0.2); ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(0), Y(v0.v)); ctx.lineTo(X(tau), Y(vel(tau))); ctx.lineTo(X(tau), Y(0)); ctx.closePath(); ctx.fill(); ctx.restore();
    line(ctx, X(0), Y(vb), X(t.v), Y(vb), C('v'), 3, [10, 10]);
    line(ctx, X(t.v), Y(0), X(t.v), Y(v.v), C('t'), 3, [4, 8]);
    line(ctx, X(0), Y(v0.v), X(t.v), Y(v.v), C('v'), 5);
    dot(ctx, X(0), Y(v0.v), C('v'), false, 11); dot(ctx, X(t.v), Y(v.v), C('v'), true, 11);
    dot(ctx, X(tau), Y(vel(tau)), PAL.ink, true, 9);
    vbracket(ctx, X(t.v) + 40, Y(v.v), Y(v0.v), C('v'), 'v − v₀', 1);
    text(ctx, 'v̄ = ' + fmt(vb, 1) + ' m/s', X(t.v / 2), Y(vb) - 22, C('v'), { align: 'center', weight: 600 });
    text(ctx, 'Δx = area = ' + fmt(area(tau), 0) + ' m', X(tau / 2), Y(Math.min(v0.v, vel(tau)) / 2), C('x'), { align: 'center', weight: 600, bg: alpha(PAL.panel, 0.7) });
    text(ctx, 'v₀', X(0) + 24, Y(v0.v) - 22, C('v'), { weight: 600, size: 24 });
    text(ctx, 'v', X(t.v), Y(v.v) - 30, C('v'), { align: 'center', weight: 600, size: 24 });
    text(ctx, 'slope = a = ' + fmt(a, 2) + ' m/s²', X(t.v) + 40, Y(Math.min(v0.v, v.v)) + 34, C('a'), { size: 18, weight: 600 });
    headline(ctx, 'the velocity line is straight, so its average sits halfway between v₀ and v');
    tex(d.readout, `\\kvb = \\frac{\\kvo + \\kv}{2} = \\frac{${fmt(v0.v, 1)} + ${fmt(v.v, 1)}}{2} = ${fmt(vb, 1)}\\ \\text{m/s}\\qquad \\kdx = \\kvb\\kt = ${fmt(area(t.v), 0)}\\ \\text{m}`);
  }
  register(d.fig, { update: (dt) => cy.step(dt, () => t.v / 4), draw });
})();

/* =====================================================================
   DEMO 3: the jogger, x = x0 + v̄ t
===================================================================== */
(function () {
  const d = demo('demo-jogger', 660);
  const vb = ctl(d.controls, { label: '\\kvb', cls: 'v', min: 0, max: 8, step: 0.05, value: 4, unit: 'm/s', dec: 2, onInput: reset });
  const t = ctl(d.controls, { label: '\\kt', cls: 't', min: 10, max: 180, step: 1, value: 120, unit: 's', dec: 0, onInput: reset });
  const x0 = ctl(d.controls, { label: '\\kxo', cls: 'x', min: -200, max: 200, step: 10, value: 0, unit: 'm', dec: 0, onInput: reset });
  const cy = cycle(() => t.v, 1.2); let ph = 0;
  function reset() { cy.reset(); }
  function draw() {
    const { ctx } = begin(d.c);
    const tau = cy.now(), x = x0.v + vb.v * t.v, xm = x0.v + vb.v * tau;
    const L = 80, R = 1320, y = 190; const X = (m) => L + (R - L) * (m + 200) / 1900;
    strip(ctx, L, R, y, 44); scale(ctx, X, 0, 1600, 200, y + 22, 'm', 2);
    dot(ctx, X(x0.v), y, C('x'), false, 10); text(ctx, 'x₀', X(x0.v), y + 76, C('x'), { align: 'center', weight: 600, size: 24 });
    if (Math.abs(x - x0.v) > 20) hbracket(ctx, X(x0.v), X(x), y - 100, C('x'), 'Δx = v̄ t = ' + fmt(x - x0.v, 0) + ' m');
    runner(ctx, X(xm), y, PAL.ink, ph);
    dot(ctx, X(x), y, C('x'), true, 10); text(ctx, 'x = ' + fmt(x, 0) + ' m', X(x), y + 76, C('x'), { align: 'center', weight: 600, size: 22 });
    arrow(ctx, X(xm) + 24, y - 60, X(xm) + 24 + vb.v * 22, y - 60, C('v'), 4); text(ctx, 'v̄', X(xm) + 34 + vb.v * 22, y - 60, C('v'), { weight: 600, size: 24 });
    // the book's Figure 2.26: final position against average velocity, a straight line of slope t
    const box = { l: 160, r: 1240, t: 360, b: 590 };
    const yr = nice(Math.min(0, x0.v), Math.max(400, x0.v + 8 * t.v), 3);
    const { X: GX, Y: GY } = axes(ctx, box, [0, 8], [yr.lo, yr.hi], { xl: 'v̄ (m/s)', xc: C('v'), yl: 'x (m)', yc: C('x'), nx: 4, ny: yr.n });
    line(ctx, GX(0), GY(x0.v), GX(8), GY(x0.v + 8 * t.v), C('x'), 5);
    line(ctx, GX(vb.v), GY(yr.lo), GX(vb.v), GY(x), C('v'), 3, [4, 8]); line(ctx, GX(0), GY(x), GX(vb.v), GY(x), C('x'), 3, [4, 8]);
    dot(ctx, GX(vb.v), GY(x), C('x'), true, 11); dot(ctx, GX(0), GY(x0.v), C('x'), false, 9);
    text(ctx, 'slope = t = ' + t.v + ' s', GX(8) - 20, GY(x0.v + 8 * t.v) + 34, C('t'), { align: 'right', weight: 600, size: 20 });
    headline(ctx, 't = ' + fmt(tau, 0) + ' s · the jogger is at x = ' + fmt(xm, 0) + ' m');
    tex(d.readout, `\\kx = \\kxo + \\kvb\\kt = ${fmt(x0.v, 0)} + (${fmt(vb.v, 2)}\\ \\text{m/s})(${t.v}\\ \\text{s}) = ${fmt(x, 0)}\\ \\text{m}`);
  }
  register(d.fig, { update: (dt) => { cy.step(dt, () => t.v / 5); if (cy.tau < t.v) ph += dt * 14; }, draw });
})();

/* =====================================================================
   DEMO 4: the airplane, v = v0 + a t
===================================================================== */
(function () {
  const d = demo('demo-plane', 680);
  const v0 = ctl(d.controls, { label: '\\kvo', cls: 'v', min: 0, max: 90, step: 1, value: 70, unit: 'm/s', dec: 1, onInput: reset });
  const a = ctl(d.controls, { label: '\\ka', cls: 'a', min: -4, max: 4, step: 0.05, value: -1.5, unit: 'm/s²', dec: 2, onInput: reset });
  const t = ctl(d.controls, { label: '\\kt', cls: 't', min: 1, max: 60, step: 0.5, value: 40, unit: 's', dec: 1, onInput: reset });
  const cy = cycle(() => t.v, 1.2);
  function reset() { cy.reset(); }
  const pos = (s) => v0.v * s + 0.5 * a.v * s * s, vel = (s) => v0.v + a.v * s;
  function draw() {
    const { ctx } = begin(d.c);
    const tau = cy.now();
    let smin = 0, smax = 1; for (let i = 0; i <= 60; i++) { const s = pos(t.v * i / 60); smin = Math.min(smin, s); smax = Math.max(smax, s); }
    const L = 80, R = 1320, y = 230; const X = (m) => L + (R - L) * (m - smin) / (smax - smin || 1);
    strip(ctx, L, R, y, 56);
    dot(ctx, X(0), y + 28, C('x'), false, 7); text(ctx, 'x₀ = 0', X(0), y + 64, C('x'), { align: 'center', size: 18, weight: 600 });
    line(ctx, X(smax), y - 28, X(smax), y + 28, C('x'), 3); text(ctx, fmt(smax, 0) + ' m', X(smax), y + 64, C('x'), { align: 'center', size: 18, weight: 600 });
    const px = X(pos(tau)), vv = vel(tau);
    plane(ctx, px, y - 2, PAL.ink, 1.1);
    arrow(ctx, px, y - 110, px + vv * 3.2, y - 110, C('v'), 5); text(ctx, 'v = ' + fmt(vv, 1) + ' m/s', px + (vv >= 0 ? -10 : 10), y - 142, C('v'), { align: vv >= 0 ? 'left' : 'right', weight: 600 });
    arrow(ctx, px, y + 110, px + a.v * 60, y + 110, C('a'), 5); text(ctx, 'a = ' + fmt(a.v, 2) + ' m/s²', px + (a.v >= 0 ? -10 : 10), y + 142, C('a'), { align: a.v >= 0 ? 'left' : 'right', weight: 600 });
    // v against t
    const box = { l: 160, r: 1240, t: 430, b: 610 };
    const vend = vel(t.v), vmin = Math.min(0, vend, v0.v), vmax = Math.max(10, vend, v0.v);
    const { X: GX, Y: GY } = axes(ctx, box, [0, t.v], [Math.floor(vmin / 10) * 10, Math.ceil(vmax / 10) * 10], { xl: 't (s)', xc: C('t'), yl: 'v (m/s)', yc: C('v'), nx: 4, ny: 2, fx: (v) => fmt(v, 0) });
    line(ctx, GX(0), GY(v0.v), GX(t.v), GY(vend), C('v'), 5);
    dot(ctx, GX(0), GY(v0.v), C('v'), false, 10); dot(ctx, GX(t.v), GY(vend), C('v'), true, 10);
    line(ctx, GX(tau), box.b, GX(tau), GY(vv), C('t'), 3, [4, 8]); dot(ctx, GX(tau), GY(vv), PAL.ink, true, 9);
    text(ctx, 'v₀', GX(0) + 26, GY(v0.v) + (a.v < 0 ? 30 : -30), C('v'), { weight: 600, size: 22 });
    headline(ctx, 't = ' + fmt(tau, 1) + ' s · the velocity arrow shrinks by a each second; the acceleration arrow never changes');
    tex(d.readout, `\\kv = \\kvo + \\ka\\kt = ${fmt(v0.v, 1)} + (${fmt(a.v, 2)})(${fmt(t.v, 1)}) = ${fmt(vend, 1)}\\ \\text{m/s}`);
  }
  register(d.fig, { update: (dt) => cy.step(dt, () => t.v / 6), draw });
})();

/* =====================================================================
   DEMO 5: the dragster, x = x0 + v0 t + ½ a t²
===================================================================== */
(function () {
  const d = demo('demo-dragster', 680);
  const v0 = ctl(d.controls, { label: '\\kvo', cls: 'v', min: 0, max: 20, step: 0.5, value: 0, unit: 'm/s', dec: 1, onInput: reset });
  const a = ctl(d.controls, { label: '\\ka', cls: 'a', min: 1, max: 30, step: 0.1, value: 26, unit: 'm/s²', dec: 1, onInput: reset });
  const t = ctl(d.controls, { label: '\\kt', cls: 't', min: 0.5, max: 8, step: 0.01, value: 5.56, unit: 's', dec: 2, onInput: reset });
  const cy = cycle(() => t.v, 1.4);
  function reset() { cy.reset(); }
  const pos = (s) => v0.v * s + 0.5 * a.v * s * s;
  function draw() {
    const { ctx } = begin(d.c);
    const tau = cy.now(), xe = pos(t.v), xh = pos(t.v / 2);
    const L = 80, R = 1320, y = 230; const X = (m) => L + (R - L) * m / (xe || 1);
    strip(ctx, L, R, y, 56);
    line(ctx, X(0), y - 40, X(0), y + 40, PAL.muted, 4); text(ctx, 'start', X(0), y + 66, PAL.muted, { align: 'center', size: 18 });
    line(ctx, X(xe), y - 40, X(xe), y + 40, C('x'), 4); text(ctx, 'x = ' + fmt(xe, 0) + ' m', X(xe), y + 66, C('x'), { align: 'center', size: 20, weight: 600 });
    dot(ctx, X(xh), y + 28, C('x'), false, 9); text(ctx, 'at t/2: ' + fmt(xh, 0) + ' m, ' + fmt(100 * xh / (xe || 1), 0) + '% of the way', X(xh), y + 66, C('x'), { align: 'center', size: 18, weight: 600 });
    const px = X(pos(tau)), vv = v0.v + a.v * tau;
    dragster(ctx, px, y - 4, PAL.ink, 1);
    arrow(ctx, px, y - 100, px + vv * 1.6, y - 100, C('v'), 5); text(ctx, 'v = ' + fmt(vv, 0) + ' m/s', px, y - 132, C('v'), { weight: 600 });
    arrow(ctx, px, y - 62, px + a.v * 3, y - 62, C('a'), 5); text(ctx, 'a', px + a.v * 3 + 14, y - 62, C('a'), { weight: 600, size: 24 });
    // x against t
    const box = { l: 160, r: 1240, t: 420, b: 610 };
    const { X: GX, Y: GY } = axes(ctx, box, [0, t.v], [0, Math.max(10, xe)], { xl: 't (s)', xc: C('t'), yl: 'x (m)', yc: C('x'), nx: 4, ny: 2, fx: (v) => fmt(v, 1), fy: (v) => fmt(v, 0) });
    curve(ctx, pos, 0, t.v, GX, GY, C('x'), 5);
    line(ctx, GX(t.v / 2), box.b, GX(t.v / 2), GY(xh), C('t'), 2, [4, 8]);
    dot(ctx, GX(t.v / 2), GY(xh), C('x'), false, 10); dot(ctx, GX(t.v), GY(xe), C('x'), true, 10);
    dot(ctx, GX(tau), GY(pos(tau)), PAL.ink, true, 9);
    headline(ctx, 't = ' + fmt(tau, 2) + ' s · x = ' + fmt(pos(tau), 0) + ' m · distance grows with the square of time');
    tex(d.readout, `\\kx = \\kxo + \\kvo\\kt + \\tfrac{1}{2}\\ka\\kt^2 = 0 + (${fmt(v0.v, 1)})(${fmt(t.v, 2)}) + \\tfrac{1}{2}(${fmt(a.v, 1)})(${fmt(t.v, 2)})^2 = ${fmt(xe, 0)}\\ \\text{m}`);
    const s = el('small', null, 'At half the time, t/2 = ' + fmt(t.v / 2, 2) + ' s, the dragster has gone ' + fmt(xh, 0) + ' m' + (v0.v === 0 ? ', exactly one fourth of the distance.' : '. With a running start it is more than a fourth.')); d.readout.appendChild(s);
  }
  register(d.fig, { update: (dt) => cy.step(dt, () => 1), draw });
})();

/* =====================================================================
   DEMO 6 (3D): braking on dry vs wet concrete, v² = v0² + 2aΔx
===================================================================== */
(function () {
  const fig = $('#demo-braking');
  const wrap = el('div', 'three-wrap'); fig.appendChild(wrap);
  const d = demo('demo-braking', 300);
  const v0 = ctl(d.controls, { label: '\\kvo', cls: 'v', min: 5, max: 40, step: 0.5, value: 30, unit: 'm/s', dec: 1, onInput: reset });
  const tr = ctl(d.controls, { label: 't_{\\text{react}}', cls: 't', min: 0, max: 1.5, step: 0.05, value: 0.5, unit: 's', dec: 2, onInput: reset, aria: 'reaction time' });
  const ad = ctl(d.controls, { label: '\\ka_{\\text{dry}}', cls: 'a', min: -10, max: -2, step: 0.1, value: -7, unit: 'm/s²', dec: 2, onInput: reset, aria: 'deceleration on dry concrete' });
  const aw = ctl(d.controls, { label: '\\ka_{\\text{wet}}', cls: 'a', min: -10, max: -2, step: 0.1, value: -5, unit: 'm/s²', dec: 2, onInput: reset, aria: 'deceleration on wet concrete' });
  const react = () => v0.v * tr.v, brake = (a) => v0.v * v0.v / (2 * -a), tstop = (a) => tr.v + v0.v / -a;
  const T = () => Math.max(tstop(ad.v), tstop(aw.v));
  function pos(a, s) { if (s <= tr.v) return v0.v * s; const tb = Math.min(s - tr.v, v0.v / -a); return v0.v * tr.v + v0.v * tb + 0.5 * a * tb * tb; }
  function vel(a, s) { if (s <= tr.v) return v0.v; return Math.max(0, v0.v + a * (s - tr.v)); }
  const cy = cycle(T, 1.6);
  function reset() { cy.reset(); }
  let three = null;
  try {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); wrap.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(36, 16 / 9, 0.5, 3000);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x556070, 1.0));
    const sun = new THREE.DirectionalLight(0xffffff, 0.7); sun.position.set(-80, 120, 60); scene.add(sun);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(2400, 800), new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.set(300, -0.02, 0); scene.add(ground);
    const laneDry = new THREE.Mesh(new THREE.PlaneGeometry(900, 8), new THREE.MeshStandardMaterial({ color: 0x8c9199, roughness: 0.95 })); laneDry.rotation.x = -Math.PI / 2; laneDry.position.set(350, 0, -5); scene.add(laneDry);
    const laneWet = new THREE.Mesh(new THREE.PlaneGeometry(900, 8), new THREE.MeshStandardMaterial({ color: 0x4f5964, roughness: 0.15, metalness: 0.35 })); laneWet.rotation.x = -Math.PI / 2; laneWet.position.set(350, 0, 5); scene.add(laneWet);
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0xf2f2f2 });
    [-9.1, -0.9, 0.9, 9.1].forEach((z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(900, 0.02, 0.2), edgeMat); m.position.set(350, 0.01, z); scene.add(m); });
    for (let x = 0; x <= 400; x += 10) { const tick = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.02, x % 50 ? 1 : 2.4), edgeMat); tick.position.set(x, 0.012, -9.1 - (x % 50 ? 0.6 : 1.3)); scene.add(tick); const t2 = tick.clone(); t2.position.z = 9.1 + (x % 50 ? 0.6 : 1.3); scene.add(t2); }
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 7, 12), new THREE.MeshStandardMaterial({ color: 0x333333 })); pole.position.set(0, 3.5, -10.5); scene.add(pole);
    const housing = new THREE.Mesh(new THREE.BoxGeometry(1, 2.6, 1), new THREE.MeshStandardMaterial({ color: 0x222222 })); housing.position.set(0, 7.5, -10.5); scene.add(housing);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff2020 })); lamp.position.set(0.55, 8.2, -10.5); scene.add(lamp);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.02, 21), new THREE.MeshBasicMaterial({ color: 0xff4040 })); beam.position.set(0, 0.015, 0); scene.add(beam);
    function makeCar() {
      const g = new THREE.Group(); const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.5, metalness: 0.2 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.1, 2.1), bodyMat); body.position.y = 0.95; g.add(body);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.9, 1.9), new THREE.MeshStandardMaterial({ color: 0x9fb4c8, roughness: 0.2, metalness: 0.3 })); cabin.position.set(-0.3, 1.9, 0); g.add(cabin);
      const wmat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
      [[1.5, 1.05], [1.5, -1.05], [-1.5, 1.05], [-1.5, -1.05]].forEach(([x, z]) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.35, 16), wmat); w.rotation.x = Math.PI / 2; w.position.set(x, 0.42, z); g.add(w); });
      const vArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 3.2, 0), 8, 0xff0000, 1.8, 1.2); g.add(vArrow);
      const aArrow = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 4.8, 0), 5, 0x8000ff, 1.8, 1.2); g.add(aArrow);
      g.userData = { vArrow, aArrow }; return g;
    }
    const carDry = makeCar(); carDry.position.z = -5; scene.add(carDry);
    const carWet = makeCar(); carWet.position.z = 5; scene.add(carWet);
    function bar(z) { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 1.4), new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0.85 })); m.position.set(0, 0.05, z); scene.add(m); return m; }
    const bars = { rDry: bar(-5), bDry: bar(-5), rWet: bar(5), bWet: bar(5) };
    bars.rDry.material.opacity = bars.rWet.material.opacity = 0.45;
    const labDry = el('span', 'lab3d', 'dry concrete'), labWet = el('span', 'lab3d', 'wet concrete'); wrap.append(labDry, labWet);
    let yaw = -0.72, pitch = 0.34, dist = 74, drag = null;
    const target = new THREE.Vector3(60, 0, 0);
    wrap.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, yaw, pitch }; wrap.setPointerCapture(e.pointerId); });
    wrap.addEventListener('pointermove', (e) => { if (!drag) return; yaw = drag.yaw - (e.clientX - drag.x) * 0.006; pitch = Math.min(1.3, Math.max(0.08, drag.pitch + (e.clientY - drag.y) * 0.005)); });
    wrap.addEventListener('pointerup', () => { drag = null; }); wrap.addEventListener('pointercancel', () => { drag = null; });
    wrap.addEventListener('wheel', (e) => { e.preventDefault(); dist = Math.min(200, Math.max(20, dist * (1 + e.deltaY * 0.001))); }, { passive: false });
    function project(v) { const p = v.clone().project(cam); return [(p.x + 1) / 2 * wrap.clientWidth, (1 - p.y) / 2 * wrap.clientHeight]; }
    function applyColors() {
      const cv = new THREE.Color(C('v')), ca = new THREE.Color(C('a')), cx = new THREE.Color(C('x'));
      [carDry, carWet].forEach((c) => { c.userData.vArrow.setColor(cv); c.userData.aArrow.setColor(ca); });
      Object.values(bars).forEach((b) => b.material.color.copy(cx));
      ground.material.color.set(PAL.soft2); scene.background = null;
    }
    function render(tau) {
      const xd = pos(ad.v, tau), xw = pos(aw.v, tau);
      carDry.position.x = xd; carWet.position.x = xw;
      const vd = vel(ad.v, tau), vw = vel(aw.v, tau);
      carDry.userData.vArrow.setLength(Math.max(0.01, vd * 0.35), 1.6, 1.1); carWet.userData.vArrow.setLength(Math.max(0.01, vw * 0.35), 1.6, 1.1);
      carDry.userData.aArrow.visible = tau > tr.v && vd > 0; carDry.userData.aArrow.setLength(-ad.v * 0.9, 1.6, 1.1);
      carWet.userData.aArrow.visible = tau > tr.v && vw > 0; carWet.userData.aArrow.setLength(-aw.v * 0.9, 1.6, 1.1);
      const rd = react(), bd = brake(ad.v), bw = brake(aw.v);
      bars.rDry.scale.x = Math.max(0.01, rd); bars.rDry.position.x = rd / 2; bars.bDry.scale.x = bd; bars.bDry.position.x = rd + bd / 2;
      bars.rWet.scale.x = Math.max(0.01, rd); bars.rWet.position.x = rd / 2; bars.bWet.scale.x = bw; bars.bWet.position.x = rd + bw / 2;
      target.x = (rd + Math.max(bd, bw)) * 0.5;
      cam.position.set(target.x + dist * Math.cos(pitch) * Math.sin(yaw), dist * Math.sin(pitch), dist * Math.cos(pitch) * Math.cos(yaw));
      cam.lookAt(target);
      const wpx = wrap.clientWidth, hpx = wrap.clientHeight;
      if (wpx && renderer.domElement.width !== Math.round(wpx * renderer.getPixelRatio())) { renderer.setSize(wpx, hpx, false); cam.aspect = wpx / hpx; cam.updateProjectionMatrix(); }
      renderer.render(scene, cam);
      const pd = project(new THREE.Vector3(xd, 6.2, -5)), pw = project(new THREE.Vector3(xw, 6.2, 5));
      labDry.style.left = pd[0] + 'px'; labDry.style.top = pd[1] + 'px'; labWet.style.left = pw[0] + 'px'; labWet.style.top = pw[1] + 'px';
    }
    three = { render, applyColors };
  } catch (e) { console.error(e); wrap.innerHTML = '<p style="padding:20px;color:var(--muted)">3D view needs WebGL. The distance bars below still work.</p>'; }
  function draw() {
    const tau = cy.now();
    if (three) { three.applyColors(); three.render(tau); }
    // distance bars: what the equation is really about
    const { ctx } = begin(d.c);
    const rd = react(), bd = brake(ad.v), bw = brake(aw.v), total = rd + Math.max(bd, bw);
    const L = 190, R = 1110; const X = (m) => L + (R - L) * m / total;
    [['dry', ad.v, bd, 120], ['wet', aw.v, bw, 220]].forEach(([name, a, b, y]) => {
      text(ctx, name, L - 24, y, PAL.ink, { align: 'right', weight: 600, size: 22 });
      ctx.save(); ctx.fillStyle = alpha(C('v'), 0.28); ctx.fillRect(X(0), y - 18, X(rd) - X(0), 36); ctx.fillStyle = alpha(C('x'), 0.55); ctx.fillRect(X(rd), y - 18, X(rd + b) - X(rd), 36); ctx.restore();
      if (rd > 0.5) text(ctx, 'reaction ' + fmt(rd, 1) + ' m', (X(0) + X(rd)) / 2, y - 36, C('v'), { align: 'center', size: 17, weight: 600 });
      text(ctx, 'braking ' + fmt(b, 1) + ' m', (X(rd) + X(rd + b)) / 2, y - 36, C('x'), { align: 'center', size: 17, weight: 600 });
      text(ctx, fmt(rd + b, 1) + ' m in ' + fmt(tstop(a), 2) + ' s', X(rd + b) + 16, y, PAL.muted, { size: 17 });
      dot(ctx, X(pos(a, tau)), y, PAL.ink, true, 9);
    });
    line(ctx, X(0), 80, X(0), 260, C('v'), 3, [4, 8]); text(ctx, 'light turns red', X(0), 282, PAL.muted, { align: 'center', size: 16 });
    headline(ctx, 't = ' + fmt(tau, 2) + ' s · same speed, same driver; only the road differs');
    tex(d.readout, `\\kx_{\\text{braking}} = \\frac{\\kv^2 - \\kvo^2}{2\\ka}:\\quad \\text{dry } \\frac{0 - (${fmt(v0.v, 1)})^2}{2(${fmt(ad.v, 2)})} = ${fmt(bd, 1)}\\ \\text{m},\\quad \\text{wet } ${fmt(bw, 1)}\\ \\text{m}`);
  }
  new ResizeObserver(() => draw()).observe(wrap);
  register(fig, { update: (dt) => cy.step(dt, () => 1), draw });
})();

/* =====================================================================
   DEMO 7: merging car, two roots of the quadratic
===================================================================== */
(function () {
  const d = demo('demo-merge', 700);
  const x = ctl(d.controls, { label: '\\kx', cls: 'x', min: 50, max: 400, step: 10, value: 200, unit: 'm', dec: 0, onInput: reset });
  const v0 = ctl(d.controls, { label: '\\kvo', cls: 'v', min: 0, max: 20, step: 0.5, value: 10, unit: 'm/s', dec: 1, onInput: reset });
  const a = ctl(d.controls, { label: '\\ka', cls: 'a', min: 0.5, max: 4, step: 0.05, value: 2, unit: 'm/s²', dec: 2, onInput: reset });
  const roots = () => { const disc = Math.sqrt(v0.v * v0.v + 2 * a.v * x.v); return [(-v0.v + disc) / a.v, (-v0.v - disc) / a.v]; };
  const cy = cycle(() => roots()[0], 1.4);
  function reset() { cy.reset(); }
  function draw() {
    const { ctx } = begin(d.c);
    const tau = cy.now(), [rp, rm] = roots(), pos = (s) => v0.v * s + 0.5 * a.v * s * s;
    // the ramp
    const L = 80, R = 1320, y = 170; const X = (m) => L + (R - L) * m / x.v;
    strip(ctx, L, R, y, 50);
    dot(ctx, X(0), y + 25, C('x'), false, 7); text(ctx, 'x₀ = 0', X(0), y + 62, C('x'), { align: 'center', size: 18, weight: 600 });
    line(ctx, X(x.v), y - 36, X(x.v), y + 36, C('x'), 4); text(ctx, 'end of ramp, x = ' + x.v + ' m', X(x.v) - 14, y + 62, C('x'), { align: 'right', size: 18, weight: 600 });
    const px = X(pos(tau)), vv = v0.v + a.v * tau;
    car(ctx, px, y - 6, PAL.ink, 1);
    arrow(ctx, px, y - 64, px + vv * 5, y - 64, C('v'), 5); text(ctx, 'v = ' + fmt(vv, 1) + ' m/s', px + vv * 5 + 16, y - 64, C('v'), { weight: 600, size: 20 });
    // the parabola with both roots
    const tmin = rm * 1.25 - 2, tmax = rp * 1.25 + 2, xmin = Math.min(0, -v0.v * v0.v / (2 * a.v)) * 1.3 - 5, xmax = Math.max(pos(tmin), pos(tmax));
    const box = { l: 160, r: 1240, t: 300, b: 620 };
    const tr = nice(tmin, tmax, 5), xr = nice(xmin, xmax, 4), t0 = tr.lo, t1 = tr.hi;
    const { X: GX, Y: GY } = axes(ctx, box, [t0, t1], [xr.lo, xr.hi], { xl: 't (s)', xc: C('t'), yl: 'x (m)', yc: C('x'), nx: tr.n, ny: xr.n });
    ctx.save(); ctx.fillStyle = alpha(PAL.muted, 0.08); ctx.fillRect(GX(t0), box.t, GX(0) - GX(t0), box.b - box.t); ctx.restore();
    curve(ctx, pos, t0, t1, GX, GY, C('x'), 5, 120);
    line(ctx, box.l, GY(x.v), box.r, GY(x.v), C('x'), 3, [10, 10]); text(ctx, 'end of ramp, x = ' + x.v + ' m', GX((rm + rp) / 2), GY(x.v) - 22, C('x'), { align: 'center', weight: 600, size: 18 });
    line(ctx, GX(rp), GY(0), GX(rp), GY(x.v), C('t'), 3, [4, 8]); line(ctx, GX(rm), GY(0), GX(rm), GY(x.v), PAL.muted, 3, [4, 8]);
    dot(ctx, GX(rp), GY(x.v), C('t'), true, 11); dot(ctx, GX(rm), GY(x.v), PAL.muted, false, 11);
    dot(ctx, GX(tau), GY(pos(tau)), PAL.ink, true, 9);
    text(ctx, 't = ' + fmt(rp, 1) + ' s', GX(rp) + 16, GY(0) - 22, C('t'), { weight: 600, size: 20 });
    text(ctx, 't = ' + fmt(rm, 1) + ' s, before the motion began', GX(rm) + 16, GY(0) + 26, PAL.muted, { weight: 600, size: 18 });
    text(ctx, 'past', GX(0) - 14, box.b - 22, PAL.muted, { size: 17, align: 'right' }); text(ctx, 'future', GX(0) + 14, box.b - 22, PAL.muted, { size: 17 });
    headline(ctx, 't = ' + fmt(tau, 1) + ' s · the parabola crosses the ramp length twice; only one crossing is in the future');
    tex(d.readout, `\\tfrac{1}{2}\\ka\\kt^2 + \\kvo\\kt - \\kx = 0 \\;\\Rightarrow\\; \\kt = \\frac{-\\kvo \\pm \\sqrt{\\kvo^2 + 2\\ka\\kx}}{\\ka} = ${fmt(rp, 1)}\\ \\text{s}\\ \\text{or}\\ ${fmt(rm, 1)}\\ \\text{s}`);
  }
  register(d.fig, { update: (dt) => cy.step(dt, () => roots()[0] / 5), draw });
})();


/* =====================================================================
   Exercises
===================================================================== */
const KIND = { 'check-understanding': 'Check Your Understanding', 'problem': 'Problem', 'ap-test-prep': 'AP test prep', 'equation-relationship': 'Relationship question' };
const conceptName = (id) => { const c = CON.concepts.find((k) => k.id === id); return c ? c.name : id; };
function cite(sectionId) {
  const sec = $('#' + sectionId); if (!sec) return; const tgt = sec.querySelector('.cite-target') || sec;
  jump(tgt, 'center'); tgt.classList.add('flash'); setTimeout(() => tgt.classList.remove('flash'), 2000);
}
function nearly(input, value) { const tol = Math.max(Math.abs(value) * 0.02, 0.005); return Math.abs(input - value) <= tol; }
function exerciseCard(ex) {
  const card = el('div', 'exercise'); card.id = 'ex-' + ex.id;
  const meta = el('div', 'meta');
  meta.appendChild(el('span', 'chip', KIND[ex.kind] || ex.kind));
  if (ex.tag) meta.appendChild(el('span', 'chip', ex.tag));
  meta.appendChild(el('span', 'chip bloom', ex.bloom));
  ex.concepts.forEach((c) => { const k = CON.concepts.find((q) => q.id === c); const ch = el('button', 'chip concept k-' + (k ? k.kind : 'idea'), conceptName(c)); ch.type = 'button'; ch.dataset.concept = c; ch.title = k ? k.kind + ': click to pin' : c; ch.addEventListener('click', () => { pin(c); nodes[c] && jump(nodes[c], 'nearest'); }); meta.appendChild(ch); });
  if (ex.generated_by === 'ai') meta.appendChild(el('span', 'chip ai', 'AI-generated'));
  card.appendChild(meta);
  card.appendChild(el('div', 'prompt', '<p>' + ex.prompt + '</p>'));
  const ans = ex.answer, fb = el('div', 'feedback');
  if (ans.type === 'number') {
    const row = el('div', 'answer-row');
    if (ans.part) row.appendChild(el('span', null, ans.part));
    const inp = el('input'); inp.type = 'text'; inp.inputMode = 'decimal'; inp.placeholder = 'answer'; inp.setAttribute('aria-label', 'your answer');
    const unit = el('span', 'unit', ans.unit); const btn = el('button', 'btn', 'Check'); btn.type = 'button';
    const check = () => { const v = parseFloat(inp.value.replace(/,/g, '')); if (isNaN(v)) { fb.className = 'feedback bad'; fb.textContent = 'Enter a number.'; return; }
      if (nearly(v, ans.value)) { fb.className = 'feedback ok'; fb.textContent = 'Correct: ' + ans.value + ' ' + ans.unit + (ans.generated_by === 'ai' ? ' (AI-computed answer)' : ''); }
      else if (nearly(-v, ans.value)) { fb.className = 'feedback bad'; fb.textContent = 'Right magnitude, wrong sign. Which direction is positive?'; }
      else { fb.className = 'feedback bad'; fb.textContent = 'Not quite. Check units and which equation has only this one unknown.'; } };
    btn.addEventListener('click', check); inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
    row.append(inp, unit, btn); card.appendChild(row);
  } else if (ans.type === 'choice') {
    const ch = el('div', 'choices'); const name = 'c-' + ex.id;
    ans.options.forEach((o, i) => { const l = el('label'); const r = el('input'); r.type = 'radio'; r.name = name; r.value = i; const s = el('span', null, o); l.append(r, s); ch.appendChild(l); });
    const btn = el('button', 'btn', 'Check'); btn.type = 'button';
    btn.addEventListener('click', () => { const sel = ch.querySelector('input:checked'); if (!sel) { fb.className = 'feedback bad'; fb.textContent = 'Pick one.'; return; }
      if (+sel.value === ans.correct) { fb.className = 'feedback ok'; fb.textContent = 'Correct.'; } else { fb.className = 'feedback bad'; fb.textContent = 'Not that one. Look at how the variable enters the equation: linearly, or squared?'; } });
    card.append(ch, btn);
  }
  card.appendChild(fb);
  const foot = el('div', 'answer-row'); foot.style.marginTop = '6px';
  if (ex.cite) { const b = el('button', 'cite-link', 'Show me the passage'); b.type = 'button'; b.addEventListener('click', () => cite(ex.cite)); foot.appendChild(b); }
  if (ans.solution) { const det = el('details', 'solution'); det.innerHTML = '<summary>' + (ans.type === 'open' ? 'Suggested approach' : 'Solution') + (ans.generated_by === 'ai' ? ' (AI)' : ' (book)') + '</summary><div>' + ans.solution + '</div>'; card.appendChild(det); }
  if (foot.children.length) card.appendChild(foot);
  renderMath(card);
  return card;
}
(function () {
  EX.exercises.forEach((ex) => { const host = $(`.exercises[data-place="${ex.place}"]`) || $('.exercises[data-place="end"]'); host.appendChild(exerciseCard(ex)); });
  $$('.exercises').forEach((h) => { if (!h.children.length) return; const e = el('div', 'eyebrow', h.dataset.place === 'end' ? 'All problems for this section' : 'Try it'); h.prepend(e); });
})();

/* =====================================================================
   Left floater: concept map (nodes = testable units) + contents (headers)
===================================================================== */
const EXT_URL = { displacement: 'https://openstax.org/books/college-physics-2e/pages/2-1-displacement', 'average-velocity': 'https://openstax.org/books/college-physics-2e/pages/2-3-time-velocity-and-speed', acceleration: 'https://openstax.org/books/college-physics-2e/pages/2-4-acceleration' };
const dagEl = $('#dag'), whyEl = $('#dag-why'), nodes = {};
const byId = {}; CON.concepts.forEach((c) => byId[c.id] = c); CON.external_prerequisites.forEach((c) => byId[c.id] = c);
// coverage indexes: span -> {introduces, uses, reinforces}; concept -> spans
const COV = {}; CON.coverage.forEach((c) => COV[c.span] = c);
const introSpan = {}, useSpans = {};
CON.coverage.forEach((c) => { (c.introduces || []).forEach((id) => { if (!introSpan[id]) introSpan[id] = c.span; }); [...(c.uses || []), ...(c.reinforces || [])].forEach((id) => (useSpans[id] = useSpans[id] || []).push(c.span)); });
const testedBy = {}; EX.exercises.forEach((e) => e.concepts.forEach((id) => (testedBy[id] = testedBy[id] || []).push(e.id)));
const spanTitle = (id) => { const s = $('#' + id); const h = s && s.querySelector('h2, h3'); if (!h) return id; const hc = h.cloneNode(true); $$('.katex-mathml', hc).forEach((m) => m.remove()); return hc.textContent.replace(/^Example [\d.]+ · /, ''); };

// rows: external prereqs, ideas, results by depth within results, skills
function dagRows() {
  const ext = CON.external_prerequisites.map((c) => c.id);
  const ideas = CON.concepts.filter((c) => c.kind === 'idea').map((c) => c.id);
  const results = CON.concepts.filter((c) => c.kind === 'result');
  const depth = {}; const d = (c) => depth[c.id] ?? (depth[c.id] = 1 + Math.max(0, ...c.prereqs.map((p) => { const q = results.find((r) => r.id === p); return q ? d(q) : 0; })));
  const byDepth = {}; results.forEach((c) => (byDepth[d(c)] = byDepth[d(c)] || []).push(c.id));
  const skills = CON.concepts.filter((c) => c.kind === 'skill').map((c) => c.id);
  return [ext, ideas, ...Object.keys(byDepth).sort().map((k) => byDepth[k]), skills].filter((r) => r.length);
}

let pinned = null;
function spansOf(id) { return { intro: introSpan[id] ? [introSpan[id]] : [], uses: useSpans[id] || [] }; }
function pin(id) {
  pinned = (pinned === id) ? null : id;
  Object.values(nodes).forEach((n) => n.classList.toggle('pinned', n.dataset.id === pinned));
  $$('.span-intro, .span-uses').forEach((s) => s.classList.remove('span-intro', 'span-uses'));
  $$('.exercise.ex-hot').forEach((e) => e.classList.remove('ex-hot'));
  $$('.chip.concept.hot').forEach((e) => e.classList.remove('hot'));
  if (!pinned) return;
  const sp = spansOf(pinned);
  sp.intro.forEach((s) => { const e = $('#' + s); if (e) e.classList.add('span-intro'); });
  sp.uses.forEach((s) => { const e = $('#' + s); if (e) e.classList.add('span-uses'); });
  (testedBy[pinned] || []).forEach((x) => { const e = $('#ex-' + x); if (e) e.classList.add('ex-hot'); });
  $$(`.chip.concept[data-concept="${pinned}"]`).forEach((e) => e.classList.add('hot'));
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && pinned) pin(pinned); });

(function () {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); dagEl.appendChild(svg);
  dagRows().forEach((row) => {
    const r = el('div', 'row'); if (row.length >= 3) r.classList.add('dense');
    row.forEach((id) => {
      const c = byId[id]; const ext = !c.kind || CON.external_prerequisites.includes(c);
      const b = el('button', 'node k-' + c.kind + (ext ? ' ext' : '')); b.type = 'button'; b.dataset.id = id;
      b.innerHTML = c.name; renderMath(b);
      b.addEventListener('click', () => {
        if (ext) { window.open(EXT_URL[id], '_blank', 'noopener'); return; }
        const wasPinned = pinned === id; pin(id);
        const target = spansOf(id).intro[0] || spansOf(id).uses[0];
        if (!wasPinned && target) go(target, 'start');
      });
      const why = ext
        ? `<b>${c.name}.</b> <span class="kind">prerequisite · section ${c.section}</span><br>Covered earlier; opens the OpenStax page.`
        : `<b>${c.name}.</b> <span class="kind">${c.kind}${introSpan[id] ? ' · introduced in “' + spanTitle(introSpan[id]) + '”' : ''} · tested by ${(testedBy[id] || []).length} exercise${(testedBy[id] || []).length === 1 ? '' : 's'}</span><br>${c.why}<br><span class="kind">Click to pin: highlights where it is introduced, used and tested.</span>`;
      const showWhy = () => { whyEl.innerHTML = why; renderMath(whyEl); hot(id, true); };
      b.addEventListener('mouseenter', showWhy); b.addEventListener('focus', showWhy);
      b.addEventListener('mouseleave', () => hot(id, false)); b.addEventListener('blur', () => hot(id, false));
      r.appendChild(b); nodes[id] = b;
    });
    dagEl.appendChild(r);
  });
  const edges = [];
  CON.concepts.forEach((c) => c.prereqs.forEach((p) => edges.push([p, c.id])));
  const paths = {};
  function layout() {
    const R = dagEl.getBoundingClientRect(); svg.setAttribute('viewBox', `0 0 ${R.width} ${R.height}`); svg.innerHTML = '';
    edges.forEach(([from, to]) => {
      if (!nodes[from] || !nodes[to]) return;
      const a = nodes[from].getBoundingClientRect(), b = nodes[to].getBoundingClientRect();
      const x1 = a.left + a.width / 2 - R.left, y1 = a.bottom - R.top, x2 = b.left + b.width / 2 - R.left, y2 = b.top - R.top;
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', `M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}`);
      svg.appendChild(p); (paths[from] = paths[from] || []).push(p); (paths[to] = paths[to] || []).push(p);
    });
  }
  function hot(id, on) { (paths[id] || []).forEach((p) => p.classList.toggle('hot', on)); }
  new ResizeObserver(layout).observe(dagEl); document.fonts && document.fonts.ready.then(layout); setTimeout(layout, 300);

  // Contents: the book's headers, for jumping back. Separate from the concept map on purpose.
  const toc = $('#toc'); const secs = $$('article section[id]');
  secs.forEach((s) => { const h = s.querySelector('h2, h3'); if (!h) return; const a = el('a'); a.href = '#' + s.id; a.textContent = spanTitle(s.id); a.dataset.anchor = s.id; toc.appendChild(a); });

})();

// scroll-spy on the focused pane: TOC follows the section; concept nodes follow the innermost span's coverage
function spy(pane) {
  const doc = pane && pane.querySelector('[data-doc]'); let current = null;
  if (doc) { const line = pane.getBoundingClientRect().top + pane.clientHeight * 0.25; $$('section[id], .example[id]', doc).forEach((sp) => { const r = sp.getBoundingClientRect(); if (r.top <= line && r.bottom > line) current = sp; }); }
  const sec = current && current.closest('section'); const secId = sec ? sec.id : current ? current.id : null;
  $$('#toc a').forEach((a) => a.classList.toggle('active', a.dataset.anchor === secId));
  const cov = current ? (COV[current.id] || COV[secId] || {}) : {};
  Object.values(nodes).forEach((n) => { n.classList.toggle('active', (cov.introduces || []).includes(n.dataset.id)); n.classList.toggle('active-weak', (cov.uses || []).includes(n.dataset.id)); });
}

/* =====================================================================
   Right floater: formulas & definitions
===================================================================== */
(function () {
  const F = { 'eq-x-vbar': '\\kx = \\kxo + \\kvb\\kt', 'eq-vbar': '\\kvb = \\frac{\\kvo + \\kv}{2}', 'eq-v': '\\kv = \\kvo + \\ka\\kt', 'eq-x': '\\kx = \\kxo + \\kvo\\kt + \\tfrac{1}{2}\\ka\\kt^2', 'eq-v2': '\\kv^2 = \\kvo^2 + 2\\ka(\\kx - \\kxo)' };
  const tf = $('#tab-formulas');
  tf.appendChild(el('div', 'eyebrow', 'Kinematic equations, constant a'));
  FORM.equations.filter((e) => e.important).forEach((e) => {
    const b = el('button', 'formula'); b.type = 'button'; const m = el('div'); tex(m, F[e.id]); b.appendChild(m);
    b.appendChild(el('small', null, (e.constant_a ? 'requires constant a · ' : 'always true · ') + 'derived in “' + (function(){ const hc = $('#' + e.anchor + ' h2').cloneNode(true); $$('.katex-mathml', hc).forEach((m) => m.remove()); return hc.textContent; })() + '”'));
    b.addEventListener('click', () => go(e.anchor));
    tf.appendChild(b);
  });
  const td = $('#tab-defs'); td.appendChild(el('div', 'eyebrow', 'Symbols in this section'));
  const ul = el('ul', 'defs');
  FORM.variables.forEach((v) => { const li = el('li'); const s = el('span', 'sym'); tex(s, SYM[v.sym] || v.sym); const m = el('span', null, v.meaning + '<span class="unit">' + v.unit + '</span>'); li.append(s, m); ul.appendChild(li); });
  td.appendChild(ul);
  const lg = $('#legend'); [['t', 'time'], ['x', 'position, displacement'], ['v', 'velocity'], ['a', 'acceleration']].forEach(([k, n]) => { lg.appendChild(el('i', null)); lg.lastChild.style.background = 'var(--c-' + k + ')'; lg.appendChild(el('span', null, n)); });
})();

/* =====================================================================
   Shell: activity rails, sidebars of views, tabbed document groups.
   Documents ([data-doc]) and views (.view) are persistent DOM elements that
   get reparented into a sidebar box, a tab pane, or back into #pool.
===================================================================== */
const ICON = {
  text: '<svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12h7M9 16h7M9 8h3"/></svg>',
  exercises: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 12l3 3 5-6"/></svg>',
  contents: '<svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="5" cy="6" r="1" fill="currentColor"/><circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="5" cy="18" r="1" fill="currentColor"/></svg>',
  concepts: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M11 7.2 7 15.8M13 7.2l4 8.6"/></svg>',
  formulas: '<svg viewBox="0 0 24 24"><path d="M17 5H7l6 7-6 7h10"/></svg>',
  definitions: '<svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>',
  split: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/></svg>',
};
const pool = $('#pool');
const ITEMS = {};
$$('[data-doc]', pool).forEach((e) => { ITEMS['doc:' + e.dataset.doc] = { id: 'doc:' + e.dataset.doc, kind: 'doc', title: e.dataset.title, icon: ICON[e.dataset.doc], el: e }; });
$$('.view', pool).forEach((e) => { ITEMS['view:' + e.dataset.view] = { id: 'view:' + e.dataset.view, kind: 'view', title: e.dataset.title, icon: ICON[e.dataset.view], side: e.dataset.side, el: e }; });
const ORDER = ['doc:text', 'doc:exercises', 'view:concepts', 'view:contents', 'view:formulas', 'view:definitions'];

const LKEY = 'omnia-layout-v1';
const DEFAULT = () => ({ sides: { left: { width: 270, items: ['view:concepts', 'view:contents'] }, right: { width: 300, items: ['view:formulas', 'view:definitions'] } }, home: {}, collapsed: [], groups: [{ tabs: ['doc:text', 'doc:exercises'], active: 'doc:text' }], focus: 0 });
function validLayout(s) {
  try { return s && s.sides && s.groups && s.groups.length && s.groups.every((g) => g.tabs.every((t) => ITEMS[t]) && (g.tabs.length === 0 || g.tabs.includes(g.active))) && ['left', 'right'].every((k) => s.sides[k] && s.sides[k].items.every((t) => ITEMS[t] && ITEMS[t].kind === 'view')); } catch (e) { return false; }
}
let LAY = (() => { try { const s = JSON.parse(localStorage.getItem(LKEY)); if (validLayout(s)) return s; } catch (e) { } return DEFAULT(); })();
function save() { try { localStorage.setItem(LKEY, JSON.stringify(LAY)); } catch (e) { } }
const homeSide = (id) => LAY.home[id] || ITEMS[id].side || 'left';
const narrowMQ = matchMedia('(max-width: 900px)'); let overlay = null; // on narrow screens only one sidebar shows, as an overlay
narrowMQ.addEventListener('change', () => { overlay = null; render(); });

function where(id) {
  for (const side of ['left', 'right']) if (LAY.sides[side].items.includes(id)) return { type: 'side', side };
  for (let g = 0; g < LAY.groups.length; g++) if (LAY.groups[g].tabs.includes(id)) return { type: 'group', g };
  return null;
}
function detach(id) {
  ['left', 'right'].forEach((side) => { const it = LAY.sides[side].items; const i = it.indexOf(id); if (i >= 0) it.splice(i, 1); });
  LAY.groups.forEach((g) => { const i = g.tabs.indexOf(id); if (i < 0) return; g.tabs.splice(i, 1); if (g.active === id) g.active = g.tabs[Math.min(i, g.tabs.length - 1)] || null; });
}
function pruneGroups() {
  if (LAY.groups.length > 1) LAY.groups = LAY.groups.filter((g) => g.tabs.length);
  if (!LAY.groups.length) LAY.groups = [{ tabs: [], active: null }];
  LAY.focus = Math.min(LAY.focus, LAY.groups.length - 1);
}
function openSide(id, side) { if (ITEMS[id].kind !== 'view') return openTab(id, LAY.focus); detach(id); LAY.sides[side].items.push(id); LAY.home[id] = side; overlay = side; pruneGroups(); render(); }
function openTab(id, g, { before } = {}) {
  detach(id); g = Math.min(g, LAY.groups.length - 1); const G = LAY.groups[g];
  const at = before ? G.tabs.indexOf(before) : -1; if (at >= 0) G.tabs.splice(at, 0, id); else G.tabs.push(id);
  G.active = id; LAY.focus = g; pruneGroups(); render();
}
function splitRight(g, id) {
  if (LAY.groups.length >= 2) return openTab(id || LAY.groups[g].active, 1);
  if (!id) { const G = LAY.groups[g]; id = G.tabs.find((t) => t !== G.active) || ORDER.find((k) => !where(k)); if (!id) return; }
  detach(id); LAY.groups.splice(g + 1, 0, { tabs: [id], active: id }); LAY.focus = g + 1; pruneGroups(); render();
}
function closeItem(id) { detach(id); pruneGroups(); render(); }
function toggleCollapsed(id) { const i = LAY.collapsed.indexOf(id); if (i >= 0) LAY.collapsed.splice(i, 1); else LAY.collapsed.push(id); render(); }

/* reveal(node): make sure the document or view containing node is visible; returns true if the layout changed */
function reveal(node) {
  const host = node.closest('[data-doc], .view'); if (!host) return false;
  const id = host.dataset.doc ? 'doc:' + host.dataset.doc : 'view:' + host.dataset.view; const it = ITEMS[id]; if (!it) return false;
  const loc = where(id); let changed = false;
  if (it.kind === 'doc' && overlay) { overlay = null; changed = true; }
  if (it.kind === 'view' && loc && loc.type === 'side' && narrowMQ.matches && overlay !== loc.side) { overlay = loc.side; changed = true; }
  if (!loc) { if (it.kind === 'doc') openTab(id, LAY.focus); else openSide(id, homeSide(id)); return true; }
  if (loc.type === 'side') { const i = LAY.collapsed.indexOf(id); if (i >= 0) { LAY.collapsed.splice(i, 1); changed = true; } }
  else { const G = LAY.groups[loc.g]; if (G.active !== id || LAY.focus !== loc.g) { G.active = id; LAY.focus = loc.g; changed = true; } }
  if (changed) render(); return changed;
}
function jump(target, block = 'start') { if (!target) return; reveal(target); requestAnimationFrame(() => target.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block })); }
function go(id, block = 'start') { jump(document.getElementById(id), block); }

/* ----- drag and drop (rail icons, sidebar box headers, tabs) ----- */
let drag = null;
function dragStart(e, id) { drag = { id }; e.dataTransfer.setData('text/plain', id); e.dataTransfer.effectAllowed = 'move'; }
function dropZone(zone, { over, leave, drop }) {
  zone.addEventListener('dragover', (e) => { if (!drag) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; over(e); });
  zone.addEventListener('dragleave', (e) => { if (!zone.contains(e.relatedTarget)) leave(e); });
  zone.addEventListener('drop', (e) => { if (!drag) return; e.preventDefault(); leave(e); const id = drag.id; drag = null; drop(id, e); });
}
document.addEventListener('dragend', () => { drag = null; $$('.drop, .drop-right').forEach((z) => z.classList.remove('drop', 'drop-right')); });

/* ----- rails ----- */
function buildRails() {
  ['left', 'right'].forEach((side) => {
    const rail = $('#rail-' + side); rail.replaceChildren();
    const mk = (it) => {
      const b = el('button'); b.type = 'button'; b.innerHTML = it.icon; b.title = it.title; b.setAttribute('aria-label', it.title); b.draggable = true; b.dataset.item = it.id;
      const loc = where(it.id); b.classList.toggle('on', !!loc); b.classList.toggle('tab', !!loc && loc.type === 'group' && it.kind === 'view');
      b.addEventListener('click', () => {
        const l = where(it.id);
        if (!l) return it.kind === 'doc' ? openTab(it.id, LAY.focus) : openSide(it.id, side);
        if (l.type === 'side') { if (narrowMQ.matches) { overlay = overlay === l.side ? null : l.side; return render(); } return closeItem(it.id); }
        const G = LAY.groups[l.g]; G.active = it.id; LAY.focus = l.g; render();
      });
      b.addEventListener('dragstart', (e) => dragStart(e, it.id));
      rail.appendChild(b);
    };
    if (side === 'left') { Object.values(ITEMS).filter((i) => i.kind === 'doc').forEach(mk); rail.appendChild(el('div', 'sep')); }
    Object.values(ITEMS).filter((i) => i.kind === 'view' && homeSide(i.id) === side).forEach(mk);
    rail.appendChild(el('div', 'spacer'));
    if (side === 'left') { const g = el('button'); g.type = 'button'; g.innerHTML = ICON.gear; g.title = 'Settings'; g.setAttribute('aria-label', 'Settings'); g.id = 'gear'; g.addEventListener('click', (e) => { e.stopPropagation(); const p = $('#settings'); p.hidden = !p.hidden; }); rail.appendChild(g); }
  });
}
['left', 'right'].forEach((side) => {
  const rail = $('#rail-' + side), aside = $('#side-' + side);
  const z = { over: () => rail.classList.add('drop'), leave: () => rail.classList.remove('drop'), drop: (id) => ITEMS[id].kind === 'view' ? openSide(id, side) : openTab(id, LAY.focus) };
  dropZone(rail, z);
  dropZone(aside, { over: () => aside.classList.add('drop'), leave: () => aside.classList.remove('drop'), drop: z.drop });
  // resize grip
  const grip = $('.grip', aside);
  grip.addEventListener('pointerdown', (e) => {
    e.preventDefault(); grip.setPointerCapture(e.pointerId);
    const move = (ev) => { const r = aside.getBoundingClientRect(); const w = side === 'left' ? ev.clientX - r.left : r.right - ev.clientX; LAY.sides[side].width = Math.max(200, Math.min(520, Math.round(w))); aside.style.width = LAY.sides[side].width + 'px'; };
    const up = () => { grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', up); save(); redrawAll(); };
    grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', up);
  });
});

/* ----- sidebars ----- */
const vboxes = {};
function vboxFor(id) {
  if (vboxes[id]) return vboxes[id];
  const it = ITEMS[id]; const box = el('div', 'vbox'); box.dataset.item = id;
  const head = el('header'); head.draggable = true;
  const chev = el('button', 'chev', '▾'); chev.type = 'button'; chev.title = 'Collapse'; chev.addEventListener('click', () => toggleCollapsed(id));
  const ttl = el('span', 'eyebrow', it.title);
  const x = el('button', 'x', '×'); x.type = 'button'; x.title = 'Close'; x.addEventListener('click', () => closeItem(id));
  head.append(chev, ttl, x); head.addEventListener('dragstart', (e) => dragStart(e, id));
  const body = el('div', 'body'); box.append(head, body); box.body = body;
  return (vboxes[id] = box);
}

/* ----- document groups ----- */
const panes = {}, groupEls = [];
function paneFor(id) {
  if (panes[id]) return panes[id];
  const p = el('div', 'pane'); p.dataset.tab = id;
  p.addEventListener('scroll', () => { if (+p.dataset.group === LAY.focus) spy(p); }, { passive: true });
  return (panes[id] = p);
}
function groupFor(i) {
  if (groupEls[i]) return groupEls[i];
  const g = el('div', 'group'); const strip = el('div', 'tabstrip'); strip.setAttribute('role', 'tablist'); const body = el('div', 'group-body');
  g.append(strip, body); g.strip = strip; g.body = body;
  g.addEventListener('pointerdown', () => { if (LAY.focus !== i) { LAY.focus = i; save(); markFocus(); spyFocused(); } });
  dropZone(strip, { over: () => strip.classList.add('drop'), leave: () => strip.classList.remove('drop'), drop: (id, e) => { const t = e.target.closest('.tab'); openTab(id, i, { before: t ? t.dataset.tab : null }); } });
  dropZone(body, {
    over: (e) => { const r = body.getBoundingClientRect(); const right = LAY.groups.length < 2 && e.clientX > r.left + r.width * 0.5; g.classList.toggle('drop-right', right); g.classList.toggle('drop', !right); },
    leave: () => g.classList.remove('drop', 'drop-right'),
    drop: (id, e) => { const r = body.getBoundingClientRect(); if (LAY.groups.length < 2 && e.clientX > r.left + r.width * 0.5) splitRight(i, id); else openTab(id, i); },
  });
  return (groupEls[i] = g);
}
function buildStrip(i, G) {
  const strip = groupFor(i).strip; strip.replaceChildren();
  G.tabs.forEach((id) => {
    const it = ITEMS[id]; const t = el('div', 'tab' + (id === G.active ? ' active' : '')); t.draggable = true; t.dataset.tab = id; t.setAttribute('role', 'tab'); t.setAttribute('aria-selected', id === G.active);
    t.appendChild(el('span', 'ttl', it.title));
    const x = el('button', 'x', '×'); x.type = 'button'; x.title = 'Close'; x.setAttribute('aria-label', 'Close ' + it.title); x.addEventListener('click', (e) => { e.stopPropagation(); closeItem(id); });
    t.appendChild(x);
    t.addEventListener('click', () => { G.active = id; LAY.focus = i; render(); });
    t.addEventListener('dragstart', (e) => dragStart(e, id));
    strip.appendChild(t);
  });
  strip.appendChild(el('span', 'spacer'));
  if (LAY.groups.length < 2) { const b = el('button', 'act'); b.type = 'button'; b.title = 'Split right'; b.setAttribute('aria-label', 'Split right'); b.innerHTML = ICON.split; b.addEventListener('click', () => splitRight(i)); strip.appendChild(b); }
}
function markFocus() { groupEls.forEach((g, i) => g.classList.toggle('focus', i === LAY.focus && LAY.groups.length > 1)); }
function activePane(i) { const G = LAY.groups[i]; return G && G.active ? panes[G.active] : null; }
function spyFocused() { spy(activePane(LAY.focus)); }

function render() {
  const scroll = {}; Object.entries(panes).forEach(([id, p]) => scroll[id] = p.scrollTop);
  ['left', 'right'].forEach((side) => {
    const S = LAY.sides[side], aside = $('#side-' + side), stack = $('.stack', aside);
    aside.hidden = !S.items.length || (narrowMQ.matches && overlay !== side); aside.style.width = S.width + 'px';
    const boxes = S.items.map(vboxFor); stack.replaceChildren(...boxes);
    boxes.forEach((b) => { const it = ITEMS[b.dataset.item]; if (it.el.parentNode !== b.body) b.body.appendChild(it.el); b.classList.toggle('collapsed', LAY.collapsed.includes(it.id)); });
  });
  const docs = $('#docs');
  LAY.groups.forEach((G, i) => {
    const g = groupFor(i); buildStrip(i, G);
    G.tabs.forEach((id) => { const p = paneFor(id); const it = ITEMS[id]; if (it.el.parentNode !== p) p.appendChild(it.el); if (p.parentNode !== g.body) g.body.appendChild(p); p.dataset.group = i; p.hidden = id !== G.active; });
    $$('.pane', g.body).forEach((p) => { if (!G.tabs.includes(p.dataset.tab)) p.remove(); });
    const empty = $('.empty', g.body); if (!G.tabs.length && !empty) g.body.appendChild(el('div', 'empty', 'Nothing open. Click a rail icon, or drag one here.')); else if (G.tabs.length && empty) empty.remove();
    if (g.parentNode !== docs || docs.children[i] !== g) docs.insertBefore(g, docs.children[i] || null);
  });
  while (docs.children.length > LAY.groups.length) docs.lastChild.remove();
  groupEls.length = LAY.groups.length;
  Object.values(ITEMS).forEach((it) => { if (!where(it.id) && it.el.parentNode !== pool) pool.appendChild(it.el); });
  Object.entries(panes).forEach(([id, p]) => { if (p.isConnected) p.scrollTop = scroll[id] || 0; });
  buildRails(); markFocus(); save();
  requestAnimationFrame(() => { redrawAll(); spyFocused(); });
}

$('#docs').addEventListener('pointerdown', () => { if (overlay) { overlay = null; render(); } });

/* ----- settings popover ----- */
document.addEventListener('click', (e) => { const p = $('#settings'); if (!p.hidden && !p.contains(e.target)) p.hidden = true; });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('#settings').hidden = true; });
$('#reset-layout').addEventListener('click', () => { LAY = DEFAULT(); render(); });
// in-page anchors (TOC and any href="#id") go through the tab layer
document.addEventListener('click', (e) => { const a = e.target.closest('a[href^="#"]'); if (!a) return; const t = document.getElementById(a.getAttribute('href').slice(1)); if (!t) return; e.preventDefault(); jump(t); });

/* ---------- toggle, theme ---------- */
const toggle = $('#cc-toggle');
try { const s = localStorage.getItem('omnia-cc'); if (s === '0') toggle.checked = false; } catch (e) { }
function applyCC() { CC = toggle.checked; document.documentElement.classList.toggle('cc', CC); try { localStorage.setItem('omnia-cc', CC ? '1' : '0'); } catch (e) { } redrawAll(); }
toggle.addEventListener('change', applyCC);
const themeToggle = $('#theme-toggle');
const sysDark = matchMedia('(prefers-color-scheme: dark)');
function isDark() { const t = document.documentElement.getAttribute('data-theme'); return t ? t === 'dark' : sysDark.matches; }
function syncThemeToggle() { themeToggle.checked = isDark(); }
themeToggle.addEventListener('change', () => {
  const t = themeToggle.checked ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem('omnia-theme', t); } catch (e) { }
});
sysDark.addEventListener('change', () => { syncThemeToggle(); redrawAll(); });
new MutationObserver(redrawAll).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
window.addEventListener('resize', redrawAll);

/* ---------- boot ---------- */
applyCC();
syncThemeToggle();
render();
document.fonts && document.fonts.ready.then(redrawAll);
})();
