/* Figures for section 2.6 The geometry of matrix transformations. */
window.OMNISTAX_FIGURES = window.OMNISTAX_FIGURES || {};
window.OMNISTAX_FIGURES['2.6'] = function (root, F) {
const { C, PAL, alpha, ctl, choice, select, begin, axes, drag, line, arrow, dot, text, headline, register, readout, hover, ease, arrival, pinned } = F;
const SP = F.space;
const sim = (id, H) => F.sim(root, id, H);
const still = (d, draw) => register(d.fig, { update: () => {}, draw });
const DEG = Math.PI / 180;
/* a number as the figure writes it: at most two decimals, no trailing zeros, never −0 */
const r2 = (v) => { const r = Math.round(v * 100) / 100; return Object.is(r, -0) ? 0 : r; };
const r1 = (v) => { const r = Math.round(v * 10) / 10; return Object.is(r, -0) ? 0 : r; };
const num = (v) => String(r2(v));
const numT = (v) => num(v).replace('-', '−');            /* the same in figure text, with a true minus */
const pt = (v) => `(${num(v[0])}, ${num(v[1])})`;         /* a point in TeX */
const ptT = (v) => pt(v).replace(/-/g, '−');              /* the same in figure text */
const lerp = (a, b, k) => a + (b - a) * k;
const lerpN = (a, b, k) => a.map((x, i) => lerp(x, b[i], k));
const tag = (ctx, s, x, y, color, align = 'center', size = 22) => text(ctx, s, x, y, color, { size, weight: 600, tex: true, bg: PAL.panel, align });
/* a column vector in TeX; a 2 × 2 matrix wearing the matrix type's colour */
const col = (v) => `\\begin{bmatrix} ${v.map(num).join(' \\\\ ')} \\end{bmatrix}`;
const colS = (v) => `\\begin{bmatrix} ${v.join(' \\\\ ')} \\end{bmatrix}`;
const mat2 = (m) => `\\htmlClass{kv-matrix}{\\left[\\begin{array}{rr} ${num(m[0])} & ${num(m[1])} \\\\ ${num(m[2])} & ${num(m[3])} \\end{array}\\right]}`;
const mat3 = (m) => `\\htmlClass{kv-matrix}{\\left[\\begin{array}{rrr} ${m.slice(0, 3).map(num).join(' & ')} \\\\ ${m.slice(3, 6).map(num).join(' & ')} \\\\ 0 & 0 & 1 \\end{array}\\right]}`;
/* a x + b y + c as TeX, zero terms left out, unit coefficients bare: x + 2, 0.71x − 0.71y, −y */
function linTex(a, b, c) {
  const terms = [];
  const push = (k, v) => { const r = r2(k); if (r === 0) return; const mag = Math.abs(r) === 1 ? '' : num(Math.abs(r)); terms.push(terms.length === 0 ? `${r < 0 ? '-' : ''}${mag}${v}` : ` ${r < 0 ? '-' : '+'} ${mag}${v}`); };
  push(a, 'x'); push(b, 'y');
  const rc = r2(c); if (rc !== 0) terms.push(terms.length === 0 ? num(rc) : ` ${rc < 0 ? '-' : '+'} ${num(Math.abs(rc))}`);
  return terms.join('') || '0';
}
/* A = [a b; c d] applied to [x, y] */
const ap2 = (m, v) => [m[0] * v[0] + m[1] * v[1], m[2] * v[0] + m[3] * v[1]];
/* the 3 × 3 homogeneous matrices [a b c; d e f; 0 0 1] as six numbers; their product and their action on a point */
const mul3 = (p, q) => [
  p[0] * q[0] + p[1] * q[3], p[0] * q[1] + p[1] * q[4], p[0] * q[2] + p[1] * q[5] + p[2],
  p[3] * q[0] + p[4] * q[3], p[3] * q[1] + p[4] * q[4], p[3] * q[2] + p[4] * q[5] + p[5],
];
const ap3 = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2], m[3] * v[0] + m[4] * v[1] + m[5]];
const ID3 = [1, 0, 0, 0, 1, 0];
const rot = (th) => [Math.cos(th), -Math.sin(th), Math.sin(th), Math.cos(th)];

/* An arrow of the plane from t to h on axes ax, clipped to its box; a head past the box is pinned at the edge. */
function vec(ctx, ax, t, h, color, w = 5, dash, a = 1) {
  if (!(a > 0.001)) return;
  const { X, Y, box } = ax, x1 = X(t[0]), y1 = Y(t[1]), x2 = X(h[0]), y2 = Y(h[1]), L = Math.hypot(x2 - x1, y2 - y1);
  if (!(L > 2)) return;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip();
  const ux = (x2 - x1) / L, uy = (y2 - y1) / L, hl = Math.min(18, L);
  line(ctx, x1, y1, x2 - ux * hl * 0.6, y2 - uy * hl * 0.6, color, w, dash);
  arrow(ctx, x2 - ux * hl, y2 - uy * hl, x2, y2, color, w);
  ctx.restore();
  if (x2 < box.l || x2 > box.r || y2 < box.t || y2 > box.b) { ctx.save(); ctx.globalAlpha *= a; pinned(ctx, box, X, Y, h[0], h[1], color); ctx.restore(); }
}
/* a label just past the head of the arrow t → h, along its direction, inside the box; a label that would sit on one
   placed earlier in the same draw steps up or down until it is clear (LAB is emptied at the start of every draw) */
let LAB = [];
function past(ctx, ax, t, h, s, color, a = 1, gap = 30) {
  if (!(a > 0.001)) return;
  const { X, Y, box } = ax, x1 = X(t[0]), y1 = Y(t[1]), x2 = X(h[0]), y2 = Y(h[1]), L = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = L < 3 ? 0.6 : (x2 - x1) / L, uy = L < 3 ? -0.6 : (y2 - y1) / L;
  const align = ux > 0.55 ? 'left' : ux < -0.55 ? 'right' : 'center';
  const w = F.measure(ctx, s, { size: 22, weight: 600, tex: true }) + 12, hgt = 30;
  const lx = Math.min(Math.max(x2 + ux * gap, box.l + 34), box.r - 34);
  let ly = Math.min(Math.max(y2 + uy * (gap - 6), box.t + 16), box.b - 16);
  const l = align === 'left' ? lx : align === 'right' ? lx - w : lx - w / 2, r = l + w;
  const clash = () => LAB.find((b) => l < b.r && r > b.l && ly - hgt / 2 < b.b && ly + hgt / 2 > b.t);
  for (let i = 0, b = clash(); b && i < 4; i++, b = clash()) ly += ly >= (b.t + b.b) / 2 ? hgt : -hgt;
  LAB.push({ l, r, t: ly - hgt / 2, b: ly + hgt / 2 });
  ctx.save(); ctx.globalAlpha *= a;
  tag(ctx, s, lx, ly, color, align);
  ctx.restore();
}
/* the faint unit grid of a pane under its axes */
function unitGrid(ctx, box, U, n) {
  const cx = (box.l + box.r) / 2, cy = (box.t + box.b) / 2;
  ctx.save(); ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip();
  for (let i = -n; i <= n; i++) { line(ctx, cx + i * U, box.t, cx + i * U, box.b, alpha(PAL.ink, 0.07), 1.5); line(ctx, box.l, cy - i * U, box.r, cy - i * U, alpha(PAL.ink, 0.07), 1.5); }
  ctx.restore();
}
const frame = (ctx, box, n, o = {}) => axes(ctx, box, [-n, n], [-n, n], { xl: 'x', yl: 'y', nx: 2 * n, ny: 2 * n, fx: (q) => numT(q), fy: (q) => numT(q), ...o });
const tname = (ctx, box, s, color) => text(ctx, s, (box.l + box.r) / 2, box.t - 22, color, { size: 20, align: 'center' });
/* the canvas angle of a plane direction (y up) */
const ang = (v) => Math.atan2(v[1], v[0]);
/* the arc from direction a0 to a1 (plane angles, counterclockwise) about (x, y) */
function arc(ctx, x, y, r, a0, a1, color, w = 2.5) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath();
  ctx.arc(x, y, r, -a0, -a1, true); ctx.stroke(); ctx.restore();
}

/* The stick figure of the book (the PreFigure `animate-char`): legs from (0.5, 0) to (0, 0.5) to (−0.5, 0), the
   arms one line from (0.5, 1.5) to (−0.5, 0.5), the body from (0, 0.5) to (0, 1.5), the head the ellipse
   (0.25 sin t, 2 − 0.5 cos t). As polylines in the plane, so that a matrix can carry every point. */
const CHAR = (() => {
  const head = []; for (let i = 0; i <= 48; i++) { const t = (2 * Math.PI * i) / 48; head.push([0.25 * Math.sin(t), 2 - 0.5 * Math.cos(t)]); }
  return [[[0.5, 0], [0, 0.5], [-0.5, 0]], [[0.5, 1.5], [-0.5, 0.5]], [[0, 0.5], [0, 1.5]], head];
})();
function character(ctx, ax, M, color, w = 4, a = 1) {
  if (!(a > 0.001)) return;
  const { X, Y, box } = ax;
  ctx.save(); ctx.globalAlpha *= a; ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip();
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  CHAR.forEach((poly) => { ctx.beginPath(); poly.forEach((p, i) => { const q = ap3(M, p); if (i === 0) ctx.moveTo(X(q[0]), Y(q[1])); else ctx.lineTo(X(q[0]), Y(q[1])); }); ctx.stroke(); });
  ctx.restore();
}

/* Figure 2.6.1: a vector x = (3, 2) and its reflection T(x) = (3, −2) across the horizontal axis. The head of x
   is dragged (sliders x, y, −4 to 4, detents at the integers, the preview's (2, 4) among them) and T(x) mirrors
   it; the readout writes T(x) = Ax with A = [1 0; 0 −1] and the live numbers. One plane, ±4 at 60 units to 1.
   Still: a vector has no clock. */
(function () {
  const d = sim('sim-reflection', 640);
  const U = 60, BOX = { l: 460, r: 460 + 8 * U, t: 120, b: 120 + 8 * U };
  const sx = ctl(d.controls, { label: 'x', cls: '', key: 'x', min: -4, max: 4, step: 0.1, value: 3, unit: '', dec: 1, aria: 'the first component of x', detents: [-4, -3, -2, -1, 0, 1, 2, 3, 4] });
  const sy = ctl(d.controls, { label: 'y', cls: '', key: 'y', min: -4, max: 4, step: 0.1, value: 2, unit: '', dec: 1, aria: 'the second component of x', detents: [-4, -3, -2, -1, 0, 1, 2, 3, 4] });
  const P = drag(d, { x: sx, y: sy });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  function draw() {
    const { ctx } = begin(d.c); LAB = [];
    const vc = C('vector'), mc = C('matrix'), g = ease.smooth(arrival(d));
    const x = [r1(sx.v), r1(sy.v)], Tx = [x[0], -x[1]];
    hits = [];
    unitGrid(ctx, BOX, U, 4);
    const ax = frame(ctx, BOX, 4);
    /* the mirror: a dashed drop from the head of x through the axis to the head of T(x) */
    if (Math.abs(x[1]) > 0.05) line(ctx, ax.X(x[0]), ax.Y(g * x[1]), ax.X(x[0]), ax.Y(-g * x[1]), alpha(PAL.ink, 0.35), 2, [4, 8]);
    vec(ctx, ax, [0, 0], [g * x[0], g * x[1]], vc, 5);
    vec(ctx, ax, [0, 0], [g * Tx[0], g * Tx[1]], mc, 5);
    past(ctx, ax, [0, 0], x, '$\\kvecx$', vc, g);
    past(ctx, ax, [0, 0], Tx, '$\\kT(\\kvecx)$', mc, g);
    P.draw(ctx, ax, vc);
    hits.push({ x: ax.X(x[0]), y: ax.Y(x[1]), r: 18, name: `x = ${ptT(x)}: drag its head` });
    hits.push({ x: ax.X(Tx[0]), y: ax.Y(Tx[1]), r: 18, name: `T(x) = ${ptT(Tx)}: the reflection of x across the horizontal axis` });
    headline(ctx, Math.abs(x[1]) < 0.05 ? `$\\kvecx = ${pt(x)}$ lies on the horizontal axis, so its reflection is itself: $\\kT(\\kvecx) = \\kvecx$.`
      : `$\\kT$ reflects $\\kvecx = ${pt(x)}$ across the horizontal axis onto $\\kT(\\kvecx) = ${pt(Tx)}$.`);
    ro.set(`\\kT(\\kvecx) = \\kA\\kvecx = ${mat2([1, 0, 0, -1])} ${col(x)} = ${col(Tx)}`);
  }
  still(d, draw);
})();

/* Figure 2.6.2: the author's matrix-transformation interactive. Left, the unit grid, the unit square, e₁, e₂ and
   a vector x; right, their images under A = [a b; c d]: e₁ lands on the first column, e₂ on the second, the grid
   on the grid of parallelograms the columns span. The entries are sliders (−2 to 2, the identity the default,
   as the author's); a select sets them to the book's matrices, labelled by their place in the book, not by their
   effect, since naming the effect is Activity 2.6.2's question; the image bends from the last matrix to the new
   one over the choice's morph. x has a draggable head (default (1.5, 2)). Two panes, ±4 at 62 units to 1. Still. */
(function () {
  const d = sim('sim-matrix-transformation', 720);
  const U = 62, W = 8 * U, L = { l: 110, r: 110 + W, t: 140, b: 140 + W }, R = { l: 794, r: 794 + W, t: 140, b: 140 + W };
  const PRESETS = {
    id: { label: 'the identity', m: [1, 0, 0, 1] },
    a: { label: 'Activity 2.6.2 (a)', m: [2, 0, 0, 1] }, b: { label: 'Activity 2.6.2 (b)', m: [2, 0, 0, 2] },
    c: { label: 'Activity 2.6.2 (c)', m: [0, 1, -1, 0] }, d: { label: 'Activity 2.6.2 (d)', m: [1, 1, 0, 1] },
    e: { label: 'Activity 2.6.2 (e)', m: [-1, 0, 0, 1] }, f: { label: 'Activity 2.6.2 (f)', m: [1, 0, 0, 0] },
    g: { label: 'Activity 2.6.2 (g)', m: [1, 0, 0, 1] }, h: { label: 'Activity 2.6.2 (h)', m: [1, -1, -2, 2] },
    pre: { label: 'Preview Activity 2.6.1: the reflection', m: [1, 0, 0, -1] },
    rot: { label: 'Example 2.6.4: the rotation by 45°', m: [0.71, -0.71, 0.71, 0.71] },
    custom: { label: 'your own matrix', m: null },
  };
  let sl = [], prev = [1, 0, 0, 1];
  const sel = select(d.controls, {
    label: 'matrix', key: 'matrix', value: 'id', aria: 'one of the book’s matrices',
    options: Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label })),
    onInput: (v) => { const m = PRESETS[v].m; if (!m) return; prev = sl.map((s) => s.v); sl.forEach((s, i) => s.set(m[i])); },
  });
  const entry = (label, key, value) => ctl(d.controls, { label, cls: '', key, min: -2, max: 2, step: 0.1, value, unit: '', dec: 1, aria: `the entry ${label} of A`, detents: [-2, -1, 0, 1, 2], onInput: () => { sel.set('custom'); } });
  sl = [entry('a', 'a', 1), entry('b', 'b', 0), entry('c', 'c', 0), entry('d', 'd', 1)];
  const sx = ctl(d.controls, { label: 'x', cls: '', key: 'x', min: -4, max: 4, step: 0.1, value: 1.5, unit: '', dec: 1, aria: 'the first component of x', detents: [-4, -3, -2, -1, 0, 1, 2, 3, 4] });
  const sy = ctl(d.controls, { label: 'y', cls: '', key: 'y', min: -4, max: 4, step: 0.1, value: 2, unit: '', dec: 1, aria: 'the second component of x', detents: [-4, -3, -2, -1, 0, 1, 2, 3, 4] });
  const P = drag(d, { x: sx, y: sy });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  const entriesOf = (v) => (v === sel.value ? sl.map((s) => r1(s.v)) : PRESETS[v].m ?? prev);
  /* the image of the grid line {(i, t)} or {(t, i)} under m, across the pane */
  function imageGrid(ctx, ax, m, color) {
    const { X, Y, box } = ax;
    ctx.save(); ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip();
    for (let i = -4; i <= 4; i++) {
      const p = ap2(m, [i, -40]), q = ap2(m, [i, 40]); line(ctx, X(p[0]), Y(p[1]), X(q[0]), Y(q[1]), color, 1.5);
      const s = ap2(m, [-40, i]), t = ap2(m, [40, i]); line(ctx, X(s[0]), Y(s[1]), X(t[0]), Y(t[1]), color, 1.5);
    }
    ctx.restore();
  }
  function square(ctx, ax, m, color, a) {
    const { X, Y, box } = ax, P4 = [[0, 0], [1, 0], [1, 1], [0, 1]].map((p) => ap2(m, p));
    ctx.save(); ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip();
    ctx.beginPath(); P4.forEach((p, i) => (i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])))); ctx.closePath();
    ctx.fillStyle = alpha(color, a); ctx.fill(); ctx.strokeStyle = alpha(color, 0.8); ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
  }
  function draw() {
    const { ctx } = begin(d.c); LAB = [];
    const vc = C('vector'), mc = C('matrix'), ink = PAL.ink, mu = PAL.muted;
    const m = sl.map((s) => r1(s.v)), md = sel.k >= 1 ? m : sel.mix(entriesOf);   /* the matrix drawn, blending from the last choice */
    const x = [r1(sx.v), r1(sy.v)], Tx = ap2(m, x), Txd = ap2(md, x), c1 = [m[0], m[2]], c2 = [m[1], m[3]];
    hits = [];
    /* left: the plane before */
    tname(ctx, L, 'the plane, before', mu);
    unitGrid(ctx, L, U, 4);
    const al = frame(ctx, L, 4);
    square(ctx, al, [1, 0, 0, 1], ink, 0.12);
    vec(ctx, al, [0, 0], [1, 0], vc, 4); vec(ctx, al, [0, 0], [0, 1], vc, 4);
    vec(ctx, al, [0, 0], x, vc, 5);
    tag(ctx, '$\\kveceone$', al.X(1) + 4, al.Y(0) + 22, vc, 'left', 20);
    tag(ctx, '$\\kvecetwo$', al.X(0) - 10, al.Y(1) - 6, vc, 'right', 20);
    past(ctx, al, [0, 0], x, '$\\kvecx$', vc);
    P.draw(ctx, al, vc);
    hits.push({ x: al.X(1), y: al.Y(0), r: 14, name: 'e₁ = (1, 0)' }, { x: al.X(0), y: al.Y(1), r: 14, name: 'e₂ = (0, 1)' });
    hits.push({ x: al.X(x[0]), y: al.Y(x[1]), r: 18, name: `x = ${ptT(x)}: drag its head` });
    hits.push({ x: al.X(0.5), y: al.Y(0.5), r: 20, name: 'the unit square, with corners (0, 0), (1, 0), (1, 1), (0, 1)' });
    /* right: the plane after */
    tname(ctx, R, 'the plane, after T(x) = Ax', mu);
    unitGrid(ctx, R, U, 4);
    const ar = frame(ctx, R, 4);
    imageGrid(ctx, ar, md, alpha(mc, 0.35));
    square(ctx, ar, md, mc, 0.18);
    const d1 = [md[0], md[2]], d2 = [md[1], md[3]];
    vec(ctx, ar, [0, 0], d1, mc, 4); vec(ctx, ar, [0, 0], d2, mc, 4);
    vec(ctx, ar, [0, 0], Txd, mc, 5);
    if (Math.hypot(...c1) > 0.3) past(ctx, ar, [0, 0], d1, '$\\kT(\\kveceone)$', mc, 1, 36);
    if (Math.hypot(...c2) > 0.3) past(ctx, ar, [0, 0], d2, '$\\kT(\\kvecetwo)$', mc, 1, 36);
    if (Math.hypot(...Tx) > 0.3) past(ctx, ar, [0, 0], Txd, '$\\kT(\\kvecx)$', mc, 1, 36);
    hits.push({ x: ar.X(c1[0]), y: ar.Y(c1[1]), r: 14, name: `T(e₁) = ${ptT(c1)}, the first column of A` });
    hits.push({ x: ar.X(c2[0]), y: ar.Y(c2[1]), r: 14, name: `T(e₂) = ${ptT(c2)}, the second column of A` });
    hits.push({ x: ar.X(Tx[0]), y: ar.Y(Tx[1]), r: 18, name: `T(x) = Ax = ${ptT(Tx)}` });
    const ctr = ap2(m, [0.5, 0.5]);
    hits.push({ x: ar.X(ctr[0]), y: ar.Y(ctr[1]), r: 20, name: `the image of the unit square: the parallelogram with sides T(e₁) and T(e₂), area ${numT(Math.abs(m[0] * m[3] - m[1] * m[2]))}` });
    /* headline and readout */
    const det = m[0] * m[3] - m[1] * m[2];
    const same = m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1;
    let h = `$\\kA$ has columns $${pt(c1)}$ and $${pt(c2)}$: $\\kveceone$ lands on the first and $\\kvecetwo$ on the second.`;
    if (same) h = '$\\kA$ is the identity matrix: $\\kveceone$, $\\kvecetwo$ and every other vector land on themselves.';
    else if (Math.abs(det) < 1e-9) h = Math.hypot(...c1) + Math.hypot(...c2) < 1e-9 ? '$\\kA$ is the zero matrix: every vector lands on the origin.'
      : `The columns $${pt(c1)}$ and $${pt(c2)}$ of $\\kA$ lie on one line, so the plane lands on that line.`;
    headline(ctx, h);
    ro.set(`\\kT(\\kvecx) = \\kA\\kvecx = ${mat2(m)} ${col(x)} = ${col(Tx)}`,
      `The columns of A are T(e₁) = ${ptT(c1)} and T(e₂) = ${ptT(c2)}.`);
  }
  still(d, draw);
})();

/* Figure 2.6.5 + 2.6.6 + 2.6.7 + 2.6.8: the rotation T of Example 2.6.4. What is rotated is a choice: x = (3, 1);
   v = (2, 1) and cv (c a slider, the book's 1.8); v, w = (−1, 3) and the parallelogram of v + w; e₁ and e₂. The
   angle is a slider (0° to 360°, the example's 45° the default, specials at 90° and 180°, the rotations of 2.5).
   Originals on the left in vector, images on the right in matrix; a change of choice fades the parts only one
   choice has. Two panes, ±5 at 48 units to 1. Still: the angle is a slider, not a clock. */
(function () {
  const d = sim('sim-rotation-45', 690);
  const U = 48, W = 10 * U, L = { l: 120, r: 120 + W, t: 140, b: 140 + W }, R = { l: 800, r: 800 + W, t: 140, b: 140 + W };
  const XV = [3, 1], V = [2, 1], Wv = [-1, 3];
  let cs = null;
  const what = choice(d.controls, {
    label: 'rotate', key: 'what', value: 'x', aria: 'what the rotation acts on',
    options: [{ value: 'x', label: 'a vector' }, { value: 'mult', label: 'a multiple' }, { value: 'sum', label: 'a sum' }, { value: 'basis', label: 'e₁ and e₂' }],
    onInput: (v) => cs.show(v === 'mult'),
  });
  const th = ctl(d.controls, { label: '\\theta', cls: '', key: 'theta', min: 0, max: 360, step: 1, value: 45, unit: '°', dec: 0, aria: 'the angle of the rotation', specials: [{ at: 90, label: 'a quarter turn' }, { at: 180, label: 'a half turn' }], detents: [45] });
  cs = ctl(d.controls, { label: 'c', cls: '', key: 'c', min: -2, max: 3, step: 0.1, value: 1.8, unit: '', dec: 1, aria: 'the scalar c', detents: [-1, 0, 1, 1.8, 2, 3] });
  cs.show(false, { ms: 0 });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  /* the parallelogram of v and w with its diagonal, the other two sides dashed */
  function para(ctx, ax, v, w, color, dashColor, a, labels) {
    const s = [v[0] + w[0], v[1] + w[1]];
    vec(ctx, ax, v, s, dashColor, 2.5, [8, 8], a); vec(ctx, ax, w, s, dashColor, 2.5, [8, 8], a);
    vec(ctx, ax, [0, 0], v, color, 4, undefined, a); vec(ctx, ax, [0, 0], w, color, 4, undefined, a);
    vec(ctx, ax, [0, 0], s, color, 5, undefined, a);
    past(ctx, ax, [0, 0], v, labels[0], color, a); past(ctx, ax, [0, 0], w, labels[1], color, a); past(ctx, ax, [0, 0], s, labels[2], color, a, 40);
    return s;
  }
  function draw() {
    const { ctx } = begin(d.c); LAB = [];
    const vc = C('vector'), mc = C('matrix'), ink = PAL.ink, mu = PAL.muted;
    const t = th.v * DEG, A = rot(t), c = r1(cs.v), v = what.value;
    const T = (p) => ap2(A, p).map(r2);
    hits = [];
    tname(ctx, L, 'before', mu); tname(ctx, R, `after the rotation by ${numT(th.v)}°`, mu);
    unitGrid(ctx, L, U, 5); unitGrid(ctx, R, U, 5);
    const al = frame(ctx, L, 5, { nx: 10, ny: 10 }), ar = frame(ctx, R, 5, { nx: 10, ny: 10 });
    const hit = (ax, p, name) => hits.push({ x: ax.X(p[0]), y: ax.Y(p[1]), r: 16, name });
    /* a vector */
    { const a = what.a('x'); if (a > 0.001) {
      const Tx = T(XV);
      vec(ctx, al, [0, 0], XV, vc, 5, undefined, a); past(ctx, al, [0, 0], XV, '$\\kvecx$', vc, a);
      vec(ctx, ar, [0, 0], XV, alpha(ink, 0.3), 3, [6, 8], a);
      vec(ctx, ar, [0, 0], Tx, mc, 5, undefined, a); past(ctx, ar, [0, 0], Tx, '$\\kT(\\kvecx)$', mc, a);
      ctx.save(); ctx.globalAlpha *= a; arc(ctx, ar.X(0), ar.Y(0), 40, ang(XV), ang(XV) + t, mu); ctx.restore();
      if (a > 0.5) { hit(al, XV, `x = ${ptT(XV)}`); hit(ar, Tx, `T(x) = ${ptT(Tx)}, x rotated by ${numT(th.v)}°`); }
    } }
    /* a multiple */
    { const a = what.a('mult'); if (a > 0.001) {
      const cv = [c * V[0], c * V[1]], Tv = T(V), Tcv = T(cv);
      vec(ctx, al, [0, 0], cv, vc, 5, undefined, a); vec(ctx, al, [0, 0], V, vc, 4, undefined, a);
      past(ctx, al, [0, 0], V, '$\\kvecv$', vc, a, 26); past(ctx, al, [0, 0], cv, '$c\\kvecv$', vc, a, 40);
      vec(ctx, ar, [0, 0], Tcv, mc, 5, undefined, a); vec(ctx, ar, [0, 0], Tv, mc, 4, undefined, a);
      past(ctx, ar, [0, 0], Tv, '$\\kT(\\kvecv)$', mc, a, 26); past(ctx, ar, [0, 0], Tcv, '$\\kT(c\\kvecv)$', mc, a, 44);
      if (a > 0.5) { hit(al, V, `v = ${ptT(V)}`); hit(al, cv, `cv = ${ptT(cv)}, c = ${numT(c)}`); hit(ar, Tv, `T(v) = ${ptT(Tv)}`); hit(ar, Tcv, `T(cv) = ${ptT(Tcv)} = cT(v)`); }
    } }
    /* a sum */
    { const a = what.a('sum'); if (a > 0.001) {
      const s = para(ctx, al, V, Wv, vc, alpha(ink, 0.5), a, ['$\\kvecv$', '$\\kvecw$', '$\\kvecv + \\kvecw$']);
      const Tv = T(V), Tw = T(Wv), Ts = para(ctx, ar, Tv, Tw, mc, alpha(ink, 0.5), a, ['$\\kT(\\kvecv)$', '$\\kT(\\kvecw)$', '$\\kT(\\kvecv + \\kvecw)$']);
      if (a > 0.5) { hit(al, V, `v = ${ptT(V)}`); hit(al, Wv, `w = ${ptT(Wv)}`); hit(al, s, `v + w = ${ptT(s)}, the diagonal of the parallelogram`); hit(ar, Tv, `T(v) = ${ptT(Tv)}`); hit(ar, Tw, `T(w) = ${ptT(Tw)}`); hit(ar, Ts, `T(v + w) = ${ptT(Ts)} = T(v) + T(w)`); }
    } }
    /* the standard vectors */
    { const a = what.a('basis'); if (a > 0.001) {
      const E1 = [1, 0], E2 = [0, 1], T1 = T(E1), T2 = T(E2);
      vec(ctx, al, [0, 0], E1, vc, 5, undefined, a); vec(ctx, al, [0, 0], E2, vc, 5, undefined, a);
      past(ctx, al, [0, 0], E1, '$\\kveceone$', vc, a, 26); past(ctx, al, [0, 0], E2, '$\\kvecetwo$', vc, a, 26);
      vec(ctx, ar, [0, 0], E1, alpha(ink, 0.3), 3, [6, 8], a); vec(ctx, ar, [0, 0], E2, alpha(ink, 0.3), 3, [6, 8], a);
      vec(ctx, ar, [0, 0], T1, mc, 5, undefined, a); vec(ctx, ar, [0, 0], T2, mc, 5, undefined, a);
      past(ctx, ar, [0, 0], T1, '$\\kT(\\kveceone)$', mc, a, 34); past(ctx, ar, [0, 0], T2, '$\\kT(\\kvecetwo)$', mc, a, 34);
      if (a > 0.5) { hit(al, E1, 'e₁ = (1, 0)'); hit(al, E2, 'e₂ = (0, 1)'); hit(ar, T1, `T(e₁) = ${ptT(T1)} = (cos θ, sin θ), the first column of A`); hit(ar, T2, `T(e₂) = ${ptT(T2)} = (−sin θ, cos θ), the second column of A`); }
    } }
    /* headline and readout */
    const deg = numT(th.v), Am = A.map(r2);
    if (v === 'x') { const Tx = T(XV); headline(ctx, `$\\kT$ rotates $\\kvecx = ${pt(XV)}$ counterclockwise by ${num(th.v)}° to $\\kT(\\kvecx) = ${pt(Tx)}$.`); ro.set(`\\kT(\\kvecx) = \\kA\\kvecx = ${mat2(Am)} ${col(XV)} = ${col(Tx)}`, `A is the matrix of the rotation by ${deg}°.`, { form: 'x' }); }
    else if (v === 'mult') { const Tv = T(V), Tcv = T([c * V[0], c * V[1]]); headline(ctx, `Rotating $c\\kvecv$ gives $c$ times the rotation of $\\kvecv$: $\\kT(c\\kvecv) = c\\kT(\\kvecv)$, here with $c = ${num(c)}$.`); ro.set(`\\kT(${num(c)}\\kvecv) = ${num(c)}\\,\\kT(\\kvecv) = ${num(c)} ${col(Tv)} = ${col(Tcv)}`, `v = ${ptT(V)}, c = ${numT(c)}.`, { form: 'mult' }); }
    else if (v === 'sum') { const Tv = T(V), Tw = T(Wv), Ts = T([V[0] + Wv[0], V[1] + Wv[1]]); headline(ctx, `The parallelogram of $\\kvecv$, $\\kvecw$ rotates to that of $\\kT(\\kvecv)$, $\\kT(\\kvecw)$, so $\\kT(\\kvecv + \\kvecw) = \\kT(\\kvecv) + \\kT(\\kvecw)$.`); ro.set(`\\kT(\\kvecv + \\kvecw) = \\kT(\\kvecv) + \\kT(\\kvecw) = ${col(Tv)} + ${col(Tw)} = ${col(Ts)}`, `v = ${ptT(V)}, w = ${ptT(Wv)}.`, { form: 'sum' }); }
    else { const T1 = T([1, 0]), T2 = T([0, 1]); headline(ctx, `Rotating $\\kveceone$ and $\\kvecetwo$ by ${num(th.v)}° gives the columns of $\\kA$: $${pt(T1)}$ and $${pt(T2)}$.`); ro.set(`\\kA = \\left[\\begin{array}{rr} \\kT(\\kveceone) & \\kT(\\kvecetwo) \\end{array}\\right] = \\left[\\begin{array}{rr} \\cos\\theta & -\\sin\\theta \\\\ \\sin\\theta & \\cos\\theta \\end{array}\\right] = ${mat2(Am)}`, `θ = ${deg}°.`, { form: 'basis' }); }
  }
  still(d, draw);
})();

/* Figure 2.6.9: T(e₁) as the hypotenuse of the right triangle whose legs are its components. The angle is a
   slider (0° to 360°, the example's 45° the default with a special labelled 1/√2); at 45° the triangle is
   isosceles and each leg is 1/√2, and at θ the legs are cos θ and sin θ, the first column of the rotation
   matrix. One plane, −1.25 to 1.25, 180 units to 1. Still. */
(function () {
  const d = sim('sim-rotation-triangle', 600);
  const U = 180, BOX = { l: 475, r: 475 + 2.5 * U, t: 110, b: 110 + 2.5 * U };
  const th = ctl(d.controls, { label: '\\theta', cls: '', key: 'theta', min: 0, max: 360, step: 1, value: 45, unit: '°', dec: 0, aria: 'the angle of the rotation', specials: [{ at: 45, label: '1/√2' }], detents: [90, 180, 270] });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  function draw() {
    const { ctx } = begin(d.c); LAB = [];
    const vc = C('vector'), mc = C('matrix'), ink = PAL.ink, mu = PAL.muted, g = ease.smooth(arrival(d));
    const t = th.v * DEG, cx = Math.cos(t), cy = Math.sin(t), T1 = [r2(cx), r2(cy)];
    hits = [];
    unitGrid(ctx, BOX, U / 2, 2.5);
    const ax = axes(ctx, BOX, [-1.25, 1.25], [-1.25, 1.25], { xl: 'x', yl: 'y', nx: 5, ny: 5, fx: (q) => (Math.abs(q) > 1.2 ? '' : numT(q)), fy: (q) => (Math.abs(q) > 1.2 ? '' : numT(q)) });
    const X = ax.X, Y = ax.Y;
    /* the triangle: its legs along and up from the axis */
    ctx.save(); ctx.globalAlpha *= g;
    ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(cx), Y(0)); ctx.lineTo(X(cx), Y(cy)); ctx.closePath();
    ctx.fillStyle = alpha(mc, 0.12); ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 2.5; ctx.stroke();
    /* the right angle's mark */
    if (Math.abs(cx) > 0.08 && Math.abs(cy) > 0.08) { const s = 14, ex = cx > 0 ? -1 : 1, ey = cy > 0 ? -1 : 1; ctx.beginPath(); ctx.moveTo(X(cx) + ex * s, Y(0)); ctx.lineTo(X(cx) + ex * s, Y(0) + ey * s); ctx.lineTo(X(cx), Y(0) + ey * s); ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.stroke(); }
    ctx.restore();
    vec(ctx, ax, [0, 0], [1, 0], alpha(vc, 0.45), 3, [6, 8], g);
    if (th.v > 2) { ctx.save(); ctx.globalAlpha *= g; arc(ctx, X(0), Y(0), 40, 0, t, mu); const mid = t / 2; tag(ctx, `$\\theta = ${num(th.v)}°$`, X(0) + 96 * Math.cos(mid), Y(0) - 96 * Math.sin(mid), mu, 'center', 20); ctx.restore(); }
    vec(ctx, ax, [0, 0], [g * cx, g * cy], mc, 5);
    past(ctx, ax, [0, 0], [cx, cy], '$\\kT(\\kveceone)$', mc, g, 40);
    tag(ctx, '$\\kveceone$', X(1) + 8, Y(0) + 24, alpha(vc, 0.8), 'left', 20);
    /* the lengths: 1 on the hypotenuse, the legs' values beside them */
    const nx = -cy, ny = cx;   /* the normal to the hypotenuse, on the side away from the triangle's corner (cx, 0) */
    const side = (nx * (cx - cx / 2) + ny * (0 - cy / 2)) > 0 ? -1 : 1;
    ctx.save(); ctx.globalAlpha *= g;
    tag(ctx, '$1$', X(cx / 2) + side * nx * 26, Y(cy / 2) - side * ny * 26, mc, 'center', 22);
    if (Math.abs(cx) > 0.12) tag(ctx, `$${num(Math.abs(cx))}$`, X(cx / 2), Y(0) + (cy >= 0 ? 24 : -24), ink, 'center', 20);
    if (Math.abs(cy) > 0.12) tag(ctx, `$${num(Math.abs(cy))}$`, X(cx) + (cx >= 0 ? 14 : -14), Y(cy / 2), ink, cx >= 0 ? 'left' : 'right', 20);
    ctx.restore();
    hits.push({ x: X(cx), y: Y(cy), r: 18, name: `T(e₁) = ${ptT(T1)}: e₁ rotated by ${numT(th.v)}°, still of length 1` });
    hits.push({ x: X(cx / 2), y: Y(0), r: 16, name: `the horizontal leg, cos θ = ${numT(cx)}` });
    hits.push({ x: X(cx), y: Y(cy / 2), r: 16, name: `the vertical leg, sin θ = ${numT(cy)}` });
    const is45 = th.v === 45;
    headline(ctx, is45 ? 'At $45°$ the right triangle is isosceles: $\\kT(\\kveceone)$ has length 1, so each leg is $1/\\sqrt{2} \\approx 0.71$.'
      : `At $${num(th.v)}°$ the legs are $\\cos\\theta = ${num(cx)}$ and $\\sin\\theta = ${num(cy)}$, and the hypotenuse $\\kT(\\kveceone)$ still has length 1.`);
    ro.set(`\\kT(\\kveceone) = \\begin{bmatrix} \\cos\\theta \\\\ \\sin\\theta \\end{bmatrix} = ${col(T1)}`, is45 ? 'cos 45° = sin 45° = 1/√2 ≈ 0.71, and 0.71² + 0.71² ≈ 1.' : `θ = ${numT(th.v)}°, and cos²θ + sin²θ = 1.`);
  }
  still(d, draw);
})();

/* Figure 2.6.12: the plane z = 1 inside ℝ³ with the character standing on it. Sliders c and f (−2 to 2, the
   translation's entries, 0 the default, the book's (2, 1) among the detents) move the character within the plane
   to (c, f, 1); the arrow from the origin of ℝ³ to the character's foot is the vector [c, f, 1] that the matrix
   [1 0 c; 0 1 f; 0 0 1] sends [0, 0, 1] to. Mathematical 3D, free orbit, no ground; the box ±4 in x and y, 0 to
   2 in z; flat without WebGL. Still. */
(function () {
  const d = sim('sim-homogeneous-plane');
  const box = [[-4, 4], [-4, 4], [0, 2]];
  const S = F.space3d(d, { box, h: 560, fit: 1.9, turn: -0.9, tilt: 0.5 });
  const cs = ctl(d.controls, { label: 'c', cls: '', key: 'c', min: -2, max: 2, step: 0.1, value: 0, unit: '', dec: 1, aria: 'the entry c, the horizontal translation', detents: [-2, -1, 0, 1, 2] });
  const fs = ctl(d.controls, { label: 'f', cls: '', key: 'f', min: -2, max: 2, step: 0.1, value: 0, unit: '', dec: 1, aria: 'the entry f, the vertical translation', detents: [-2, -1, 0, 1, 2] });
  const ro = readout(d);
  const lift = (p, c, f) => [p[0] + c, p[1] + f, 1];
  function draw() {
    const vc = C('vector'), mc = C('matrix'), rc = C('region');
    const c = r1(cs.v), f = r1(fs.v), moved = c !== 0 || f !== 0;
    S.set('axes', SP.axes(box, { ticks: 1, names: ['x', 'y', 'z'] }));
    /* the plane z = 1 and its grid */
    const segs = [];
    for (let i = -4; i <= 4; i++) segs.push([[i, -4, 1], [i, 4, 1]], [[-4, i, 1], [4, i, 1]]);
    S.set('plane', [
      ...SP.plane([0, 0, 1], [0, 0, 1], rc, { box, alpha: 0.22 }).map((m) => ({ ...m, name: 'the plane z = 1, the coordinate plane placed inside ℝ³' })),
      { k: 'segs', segs, color: 'guide', w: 1, name: 'the plane z = 1, the coordinate plane placed inside ℝ³' },
      { k: 'label', s: '$z = 1$', p: [3.6, -3.6, 1], color: rc },
    ]);
    /* the character, at the plane's own origin and where the translation puts it */
    const ch = (c0, f0, color, w, name) => CHAR.map((poly) => ({ k: 'line', pts: poly.map((p) => lift(p, c0, f0)), color, w, name }));
    S.set('char', [
      ...ch(0, 0, moved ? 'guide' : 'ink', moved ? 1.5 : 3, 'the character, standing at (0, 0, 1)'),
      ...(moved ? ch(c, f, mc, 3, `the character translated to (${numT(c)}, ${numT(f)}, 1)`) : []),
    ]);
    /* the vector from the origin of ℝ³ to the character's foot */
    S.set('vec', [
      ...SP.vector([0, 0, 0], [c, f, 1], vc, { w: 3 }).map((m) => ({ ...m, name: `the vector [${numT(c)}, ${numT(f)}, 1] from the origin of ℝ³ to the character's foot` })),
      { k: 'label', s: `$\\begin{bmatrix} ${num(c)} \\\\ ${num(f)} \\\\ 1 \\end{bmatrix}$`, p: [c / 2 + 0.9, f / 2 - 0.9, 0.5], color: vc },
      { k: 'dot', p: [0, 0, 0], color: 'ink', r: 5, name: 'the origin of ℝ³, one unit below the plane; no matrix transformation moves it' },
    ]);
    S.headline(moved ? `The character stands on the plane $z = 1$ at $(${num(c)}, ${num(f)}, 1)$; the origin of $\\mathbb{R}^3$ is one unit below the plane and stays put.`
      : 'The character stands on the plane $z = 1$ at $(0, 0, 1)$, one unit above the origin of $\\mathbb{R}^3$.');
    ro.set(`${mat3([1, 0, c, 0, 1, f])} \\begin{bmatrix} 0 \\\\ 0 \\\\ 1 \\end{bmatrix} = \\begin{bmatrix} ${num(c)} \\\\ ${num(f)} \\\\ 1 \\end{bmatrix}`,
      moved ? `The point (0, 0, 1) is not the origin of ℝ³, so the matrix can move it, to (${numT(c)}, ${numT(f)}, 1).` : 'With c = f = 0 the matrix is the identity and the character stays where it is.');
  }
  still(d, draw);
})();

/* Figure 2.6.11 + 2.6.13 + 2.6.14 + 2.6.15 + 2.6.16 + 2.6.17 + 2.6.18: the author's stick-figure interactive.
   Left, the character in its beginning pose; right, its pose under the homogeneous-coordinate matrix
   [a b c; d e f; 0 0 1] whose six entries are sliders (−2 to 2, the identity the default). A select sets the
   sliders to the book's poses, and a change of pose morphs the character from the last pose to the new one.
   Compose makes the pose on the right the new beginning pose (the base matrix B becomes MB and the sliders go
   back to the identity), as the author's button does; Start over returns to the character. The readout writes
   the matrix that carries the original character to the pose on the right, MB, acting on [x, y, 1]. Two
   panes, ±4 at 62 units to 1. Still: the poses are steps of the reader's hand, not a clock. */
(function () {
  const d = sim('sim-stick-figure', 720);
  const U = 62, W = 8 * U, L = { l: 110, r: 110 + W, t: 140, b: 140 + W }, R = { l: 794, r: 794 + W, t: 140, b: 140 + W };
  const S2 = 0.71;   /* the book's own approximation of 1/√2 */
  const POSES = {
    char: { label: 'the character', m: ID3, head: 'The identity matrix leaves the character in its original pose.' },
    translate: { label: 'Figure 2.6.11, 2.6.14: translate by (2, 1)', m: [1, 0, 2, 0, 1, 1], head: 'Translate by $(2, 1)$: $c = 2$ and $f = 1$ move every point, the origin included.' },
    reflect: { label: 'Figure 2.6.15: wave with the other hand', m: [-1, 0, 0, 0, 1, 0], head: '$a = -1$ reflects the character in the vertical axis, so they wave with the other hand.' },
    rotate: { label: 'Figure 2.6.16: a cartwheel step of 45°', m: [S2, -S2, 0, S2, S2, 0], head: '$a = e = 0.71$, $b = -d = -0.71$: a rotation by $45°$ about the origin; compose it four times for the cartwheel.' },
    down: { label: 'Figure 2.6.17: translate down one unit', m: [1, 0, 0, 0, 1, -1], head: '$f = -1$ translates the character down one unit; compose and repeat for the close-up.' },
    enlarge: { label: 'Figure 2.6.17: enlarge by a factor of two', m: [2, 0, 0, 0, 2, 0], head: '$a = e = 2$ enlarge the character by two about the origin: the close-up, once the character has moved down.' },
    shear: { label: 'Figure 2.6.18: shear', m: [1, 1, 0, 0, 1, 0], head: '$b = 1$ shears the character: every point moves right by its height.' },
    compress: { label: 'Figure 2.6.18: compress vertically by half', m: [1, 0, 0, 0, 0.5, 0], head: '$e = 0.5$ compresses the character vertically by half; two of them after the shear make the shadow.' },
    custom: { label: 'your own matrix', m: null },
  };
  let sl = [], prev = ID3, base = ID3, composed = 0;
  const sel = select(d.controls, {
    label: 'pose', key: 'pose', value: 'char', aria: 'one of the book’s poses',
    options: Object.entries(POSES).map(([value, p]) => ({ value, label: p.label })),
    onInput: (v) => { const m = POSES[v].m; if (!m) return; prev = sl.map((s) => s.v); sl.forEach((s, i) => s.set(m[i])); },
  });
  /* Compose and Start over: the author's two buttons, set as the choice's segments */
  const seg = document.createElement('div'); seg.className = 'ctlseg'; seg.setAttribute('aria-label', 'compose or start over');
  const btn = (label, title, on) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'segbtn'; b.textContent = label; b.title = title; b.addEventListener('click', on); seg.appendChild(b); return b; };
  const touch = () => d.fig.dispatchEvent(new Event('input', { bubbles: true }));
  btn('Compose', 'make the pose on the right the new beginning pose', () => { base = mul3(sl.map((s) => s.v), base); composed += 1; sl.forEach((s, i) => s.set(ID3[i])); sel.set('char'); touch(); });
  btn('Start over', 'return to the original character', () => { base = ID3; composed = 0; sl.forEach((s, i) => s.set(ID3[i])); sel.set('char'); touch(); });
  d.controls.appendChild(seg);
  const entry = (label, key, value) => ctl(d.controls, { label, cls: '', key, min: -2, max: 2, step: 0.01, value, unit: '', dec: 2, aria: `the entry ${label} of the matrix`, detents: [-2, -1, -0.5, 0, 0.5, 1, 2], onInput: () => { sel.set('custom'); } });
  sl = [entry('a', 'a', 1), entry('b', 'b', 0), entry('c', 'c', 0), entry('d', 'd', 0), entry('e', 'e', 1), entry('f', 'f', 0)];
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  const entriesOf = (v) => (v === sel.value ? sl.map((s) => r2(s.v)) : POSES[v].m ?? prev);
  function draw() {
    const { ctx } = begin(d.c); LAB = [];
    const mc = C('matrix'), ink = PAL.ink, mu = PAL.muted;
    const m = sl.map((s) => r2(s.v)), md = sel.k >= 1 ? m : sel.mix(entriesOf);
    const total = mul3(m, base).map(r2), totalD = mul3(md, base);
    hits = [];
    tname(ctx, L, composed ? `the beginning pose, after ${composed} ${composed === 1 ? 'composition' : 'compositions'}` : 'the character', mu);
    tname(ctx, R, 'the new pose', mu);
    unitGrid(ctx, L, U, 4); unitGrid(ctx, R, U, 4);
    const al = frame(ctx, L, 4), ar = frame(ctx, R, 4);
    character(ctx, al, base, ink, 4);
    character(ctx, ar, base, alpha(ink, 0.18), 2.5);
    character(ctx, ar, totalD, mc, 4);
    const foot = ap3(base, [0, 0.5]), nfoot = ap3(total, [0, 0.5]), head = ap3(base, [0, 2]), nhead = ap3(total, [0, 2]);
    hits.push({ x: al.X(foot[0]), y: al.Y(foot[1]), r: 24, name: composed ? 'the character in its beginning pose, the result of the compositions so far' : 'the character, as originally drawn' });
    hits.push({ x: al.X(head[0]), y: al.Y(head[1]), r: 20, name: 'the character’s head' });
    hits.push({ x: ar.X(nfoot[0]), y: ar.Y(nfoot[1]), r: 24, name: `the character’s new pose under the matrix with entries ${m.map(numT).join(', ')}` });
    hits.push({ x: ar.X(nhead[0]), y: ar.Y(nhead[1]), r: 20, name: `the head, now at (${numT(nhead[0])}, ${numT(nhead[1])})` });
    const v = sel.value, same = m.every((x, i) => x === ID3[i]);
    let h = POSES[v].head;
    if (v === 'custom' || !h) h = same ? 'The identity matrix leaves the character in its beginning pose.' : `Every point $(x, y)$ of the character moves to $(${linTex(m[0], m[1], m[2])},\\ ${linTex(m[3], m[4], m[5])})$.`;
    headline(ctx, h);
    const note = composed ? `The matrix is the product of the ${composed + 1} matrices composed so far, the most recent on the left, acting on the original character.` : 'The entries c and f translate; a, b, d and e act as a 2 × 2 matrix on the plane.';
    ro.set(`${mat3(total)} \\begin{bmatrix} x \\\\ y \\\\ 1 \\end{bmatrix} = \\begin{bmatrix} ${linTex(total[0], total[1], total[2])} \\\\ ${linTex(total[3], total[4], total[5])} \\\\ 1 \\end{bmatrix}`, note);
  }
  still(d, draw);
})();
};
