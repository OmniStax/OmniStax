/* Figures for section 7.4 Singular Value Decompositions. */
window.OMNISTAX_FIGURES = window.OMNISTAX_FIGURES || {};
window.OMNISTAX_FIGURES['7.4'] = function (root, F) {
const { C, PAL, alpha, ctl, select, begin, axes, line, arrow, dot, text, headline, register, readout, hover, ease, fmt, arrival, pinned } = F;
const sim = (id, H) => F.sim(root, id, H);
const still = (d, draw) => register(d.fig, { update: () => {}, draw });
const DEG = Math.PI / 180;
/* a number as the figure writes it: at most two decimals, no trailing zeros, never −0 */
const r2 = (v) => { const r = Math.round(v * 100) / 100; return Object.is(r, -0) ? 0 : r; };
const num = (v) => String(r2(v));
const numT = (v) => num(v).replace('-', '−');            /* the same in figure text, with a true minus */
const col = (v) => `\\left[\\begin{array}{r} ${num(v[0])} \\\\ ${num(v[1])} \\end{array}\\right]`;
const mtx = (m) => `\\left[\\begin{array}{rr} ${num(m[0])} & ${num(m[1])} \\\\ ${num(m[2])} & ${num(m[3])} \\end{array}\\right]`;
const kmtx = (m) => `\\htmlClass{kv-matrix}{${mtx(m)}}`;
const pt = (v) => `(${numT(v[0])}, ${numT(v[1])})`;      /* in figure text */
const lerp = (a, b, k) => a + (b - a) * k;
/* y = M x for a 2 × 2 matrix [a b; c d] stored row by row */
const map = (m, p) => [m[0] * p[0] + m[1] * p[1], m[2] * p[0] + m[3] * p[1]];
const mul = (m, n) => [m[0] * n[0] + m[1] * n[2], m[0] * n[1] + m[1] * n[3], m[2] * n[0] + m[3] * n[2], m[2] * n[1] + m[3] * n[3]];
const tr = (m) => [m[0], m[2], m[1], m[3]];
const ID = [1, 0, 0, 1];
const len = (v) => Math.hypot(v[0], v[1]);
const tag = (ctx, s, x, y, color, align = 'center', size = 22) => text(ctx, s, x, y, color, { size, weight: 600, tex: true, bg: PAL.panel, align });

/* A singular value decomposition of the 2 × 2 matrix m = [a b; c d]: the Gram matrix G = AᵀA, its eigenvalues
   λ₁ ≥ λ₂ ≥ 0, σᵢ = √λᵢ, the right singular vectors vᵢ (unit eigenvectors of G, each with its first nonzero component
   positive, which gives the book's own vectors for its three matrices), and uᵢ = Avᵢ/σᵢ; where σᵢ = 0, uᵢ completes an
   orthonormal basis. tie is true where σ₁ = σ₂ and every direction is a singular direction. */
function svd(m) {
  const [a, b, c, d] = m, g11 = a * a + c * c, g12 = a * b + c * d, g22 = b * b + d * d;
  const t = g11 + g22, disc = Math.sqrt(Math.max(0, (g11 - g22) * (g11 - g22) + 4 * g12 * g12));
  const l1 = (t + disc) / 2, l2 = Math.max(0, (t - disc) / 2);
  const s1 = Math.sqrt(Math.max(0, l1)), s2 = Math.sqrt(l2), tie = disc < 1e-9;
  let v1;
  if (tie) v1 = [1, 0];
  else if (Math.abs(g12) > 1e-12) { const p = [g12, l1 - g11], q = [l1 - g22, g12]; v1 = len(p) > len(q) ? p : q; }
  else v1 = g11 >= g22 ? [1, 0] : [0, 1];
  const sgn = (v) => { const L = len(v), w = [v[0] / L, v[1] / L], f = Math.abs(w[0]) > 1e-9 ? w[0] : w[1]; return f < 0 ? [-w[0], -w[1]] : w; };
  v1 = sgn(v1);
  const v2 = sgn([-v1[1], v1[0]]);
  let u1, u2;
  if (s1 > 1e-9) { const w = map(m, v1); u1 = [w[0] / s1, w[1] / s1]; } else u1 = [1, 0];
  if (s2 > 1e-9) { const w = map(m, v2); u2 = [w[0] / s2, w[1] / s2]; } else u2 = sgn([-u1[1], u1[0]]);
  return { G: [g11, g12, g12, g22], l: [l1, l2], s: [s1, s2], v: [v1, v2], u: [u1, u2], tie,
    V: [v1[0], v2[0], v1[1], v2[1]], U: [u1[0], u2[0], u1[1], u2[1]], S: [s1, 0, 0, s2] };
}
/* the path from I to an orthogonal Q: a turn by Q's angle, and for a reflection (det Q = −1) the plane turned over
   its first axis, diag(1, cos πt), after it; every state is exact at t = 0 and t = 1 */
function orth(Q, t) {
  const th = Math.atan2(Q[2], Q[0]), R = [Math.cos(th * t), -Math.sin(th * t), Math.sin(th * t), Math.cos(th * t)];
  return Q[0] * Q[3] - Q[1] * Q[2] > 0 ? R : mul(R, [1, 0, 0, Math.cos(Math.PI * t)]);
}
const flips = (Q) => Q[0] * Q[3] - Q[1] * Q[2] < 0;

/* An arrow of the plane from the origin to h on axes ax, clipped to its box; a head past the box is pinned at the edge. */
function vec(ctx, ax, h, color, w = 5, dash) {
  const { X, Y, box } = ax, x1 = X(0), y1 = Y(0), x2 = X(h[0]), y2 = Y(h[1]), L = Math.hypot(x2 - x1, y2 - y1);
  if (!(L > 2)) return;
  ctx.save(); ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip();
  const ux = (x2 - x1) / L, uy = (y2 - y1) / L, hl = Math.min(18, L);
  line(ctx, x1, y1, x2 - ux * hl * 0.6, y2 - uy * hl * 0.6, color, w, dash);
  arrow(ctx, x2 - ux * hl, y2 - uy * hl, x2, y2, color, w);
  ctx.restore();
  if (x2 < box.l || x2 > box.r || y2 < box.t || y2 > box.b) pinned(ctx, box, X, Y, h[0], h[1], color);
}
/* a label just past the head of the arrow from the origin to h, inside the box; a label that would sit on one placed
   earlier in the same draw steps up or down until it is clear (LAB is emptied at the start of every draw) */
let LAB = [];
function past(ctx, ax, h, s, color, a = 1, gap = 30) {
  if (!(a > 0.001)) return;
  const { X, Y, box } = ax, x1 = X(0), y1 = Y(0), x2 = X(h[0]), y2 = Y(h[1]), L = Math.hypot(x2 - x1, y2 - y1) || 1;
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
/* a square window of the plane, −n to n each way, with a faint unit grid under its axes */
function plane(ctx, box, n, ticks) {
  const U = (box.r - box.l) / (2 * n), cx = (box.l + box.r) / 2, cy = (box.t + box.b) / 2;
  ctx.save(); ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip();
  for (let i = -n; i <= n; i++) { line(ctx, cx + i * U, box.t, cx + i * U, box.b, alpha(PAL.ink, 0.07), 1.5); line(ctx, box.l, cy - i * U, box.r, cy - i * U, alpha(PAL.ink, 0.07), 1.5); }
  ctx.restore();
  return axes(ctx, box, [-n, n], [-n, n], { nx: ticks, ny: ticks, fx: (q) => fmt(q, 0), fy: (q) => fmt(q, 0) });
}
/* the image of the unit circle under m, as a closed curve */
function ellipse(ctx, ax, m, color, w, k = 1) {
  const { X, Y, box } = ax, N = 160, n = Math.max(2, Math.round(N * k));
  ctx.save(); ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip();
  ctx.beginPath();
  for (let i = 0; i <= n; i++) { const p = map(m, [Math.cos((2 * Math.PI * i) / N), Math.sin((2 * Math.PI * i) / N)]); if (i) ctx.lineTo(X(p[0]), Y(p[1])); else ctx.moveTo(X(p[0]), Y(p[1])); }
  if (k >= 1) { ctx.closePath(); if (color !== PAL.ink) { ctx.fillStyle = alpha(color, 0.08); ctx.fill(); } }
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
}
/* a line through the origin along the unit direction u, across the box, with its label near the end that stands higher */
function subspace(ctx, ax, u, color, dash) {
  const { X, Y, box } = ax, R = 20;
  ctx.save(); ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip();
  line(ctx, X(-R * u[0]), Y(-R * u[1]), X(R * u[0]), Y(R * u[1]), alpha(color, 0.85), 3, dash);
  ctx.restore();
}
const tname = (ctx, box, s, color) => text(ctx, s, (box.l + box.r) / 2, box.t - 22, color, { size: 20, align: 'center', tex: true });

/* Figure 7.4.1: the author's singular-values interactive (singular.js) rebuilt. Left, the unit circle on ±2 at 110 units
   to 1 with the unit vector x whose head the reader drags round it (the angle θ, 0° to 360°, a slider with dashed specials
   at ±v₁ and ±v₂), and the right singular vectors v₁ (solid) and v₂ (dashed). Right, on ±4 at 70 units to 1 (σ₁ ≤ 4 at the
   sliders' reach), the circle carried by the step of A = UΣVᵀ the story is at: 0 the circle itself; 1 Vᵀ has carried v₁,
   v₂ onto e₁, e₂ (a turn, or a turn and a flip where det V = −1); 2 Σ has stretched along the axes by σ₁ and σ₂; 3 U has
   carried the axes onto u₁ and u₂ and the picture is the book's: the ellipse with semi-axes σ₁u₁ and σ₂u₂ and Ax on it.
   Beside it the bar |Ax| on the right pane's scale, its marks at σ₁ and σ₂. The entries a, b, c, d are sliders (−2 to 2)
   with the book's matrices as a select (Activity 7.4.2's A = [1 2; −2 −1] the default, as the activity asks; Examples
   7.4.2 and 7.4.3), and d carries a dashed special at bc/a where A loses rank: the ellipse flattens onto Col(A) and v₂
   spans Nul(A). The story slider carries the transport; it opens at its last stop, the whole of A; no clock. */
(function () {
  const d = sim('sim-singular-values', 740);
  const LB = { l: 60, r: 500, t: 200, b: 640 }, RB = { l: 590, r: 1150, t: 140, b: 700 };
  const BAR = { l: 1196, r: 1240 };
  const PRESETS = {
    act2: { label: 'Activity 7.4.2: A = [1 2; −2 −1]', m: [1, 2, -2, -1] },
    ex2: { label: 'Example 7.4.2: A = [1 2; −1 2]', m: [1, 2, -1, 2] },
    ex3: { label: 'Example 7.4.3: A = [1 2; 2 1]', m: [1, 2, 2, 1] },
    own: { label: 'your own a, b, c, d', m: null },
  };
  let S = [], from = PRESETS.act2.m.slice();
  const morph = F.tween(d, 1);
  const entries = () => S.map((s) => s.v);
  const sel = select(d.controls, {
    label: 'A', key: 'matrix', value: 'act2', aria: 'one of the book’s matrices, or your own entries',
    options: Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label })),
    onInput: (v) => { const p = PRESETS[v]; if (!p.m) return; from = entries(); S.forEach((s, i) => s.set(p.m[i])); morph.set(0); morph.to(1, 900); S.forEach((s) => s.refresh && s.refresh()); },
  });
  const own = () => { morph.set(1); sel.set('own'); };
  const names = ['a', 'b', 'c', 'd'], where = ['top left', 'top right', 'bottom left', 'bottom right'];
  names.forEach((nm, i) => {
    const o = { label: nm, cls: '', key: nm, min: -2, max: 2, step: 0.1, value: PRESETS.act2.m[i], unit: '', dec: 1, aria: `the ${where[i]} entry ${nm} of A`, detents: [-2, -1, 0, 1, 2], onInput: own };
    if (nm === 'd') o.specials = [{ at: () => { const [a, b, c] = entries(); return Math.abs(a) > 1e-9 && Math.abs((b * c) / a) <= 2 ? r2((b * c) / a) : null; }, label: 'rank 1: a column a multiple of the other' }];
    S.push(ctl(d.controls, o));
  });
  const ang = (v) => { const t = Math.atan2(v[1], v[0]) / DEG; return r2(((t % 360) + 360) % 360); };
  const cur = () => svd(entries());
  const spec = (i, flip) => () => { const q = cur(); if (q.tie || q.s[0] < 1e-9) return null; const v = q.v[i]; return ang(flip ? [-v[0], -v[1]] : v); };
  const th = ctl(d.controls, { label: '\\theta', cls: '', key: 'theta', min: 0, max: 360, step: 1, value: 0, unit: '°', dec: 0, aria: 'the angle of the unit vector x',
    specials: [{ at: spec(0, false), label: 'v₁' }, { at: spec(0, true), label: '−v₁' }, { at: spec(1, false), label: 'v₂' }, { at: spec(1, true), label: '−v₂' }],
    onInput: () => { if (th.v >= 360) th.set(0); else if (th.v <= 0) th.set(360); } });
  const Xg = F.polar.grip(d, { t: th, at: (t) => [Math.cos(t * DEG), Math.sin(t * DEG)], span: 180 });
  const step = ctl(d.controls, { label: 'step', cls: '', key: 'step', min: 0, max: 3, step: 0.01, value: 3, unit: '', dec: 2, aria: 'the step of A = UΣVᵀ shown on the right: the circle, after Vᵀ, after Σ, after U' });
  F.story(d, step, { stops: [{ v: 0, label: 'x' }, { v: 1, label: 'Vᵀ' }, { v: 2, label: 'Σ' }, { v: 3, label: 'U' }], ms: 1500, rest: 1200 });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);

  function draw() {
    const { ctx } = begin(d.c); LAB = [];
    const vc = C('vector'), mc = C('matrix'), rc = C('region'), ec = C('eigenvalue'), ink = PAL.ink, mu = PAL.muted;
    const g = ease.smooth(arrival(d));
    const target = entries().map(r2), k = morph.v;
    const A = k < 1 ? target.map((t, i) => lerp(from[i], t, k)) : target;
    const q = svd(A), [s1, s2] = q.s, [v1, v2] = q.v, [u1, u2] = q.u;
    const zero = s1 < 1e-9, rank1 = !zero && s2 < 0.005, tie = q.tie && !zero;
    const t = th.v * DEG, x = [Math.cos(t), Math.sin(t)], Ax = map(A, x), lx = len(Ax);
    const Vt = tr(q.V), s = step.v, i = Math.round(s), atStop = Math.abs(s - i) < 0.02, lab = Math.max(0, 1 - Math.abs(s - i) / 0.08);
    const M = s <= 1 ? orth(Vt, s) : s <= 2 ? mul([lerp(1, s1, s - 1), 0, 0, lerp(1, s2, s - 1)], Vt) : mul(orth(q.U, s - 2), mul(q.S, Vt));
    const Mx = map(M, x), Mv1 = map(M, v1), Mv2 = map(M, v2);
    const near = (v) => Math.abs(x[0] * v[1] - x[1] * v[0]) < 0.012;      /* x along ±v */
    const onV1 = !tie && !zero && near(v1), onV2 = !tie && !zero && near(v2);
    hits = [];
    const G = (p) => [g * p[0], g * p[1]];
    /* left: the unit circle, x and the right singular vectors */
    tname(ctx, LB, 'the unit circle and the unit vector $\\kvecx$', mu);
    const al = plane(ctx, LB, 2, 4);
    ellipse(ctx, al, ID, ink, 3, g);
    if (rank1) {
      subspace(ctx, al, v2, rc, [10, 8]);
      const e = [1.7 * v2[0], 1.7 * v2[1]]; const p = e[1] >= 0 ? e : [-e[0], -e[1]];
      tag(ctx, '$\\kNul(\\kA) = \\text{Span}\\{\\kvecvtwo\\}$', Math.min(Math.max(al.X(p[0]), LB.l + 130), LB.r - 130), Math.max(al.Y(p[1]) - 22, LB.t + 16), rc, 'center', 20);
      LAB.push({ l: al.X(p[0]) - 130, r: al.X(p[0]) + 130, t: al.Y(p[1]) - 38, b: al.Y(p[1]) - 6 });
    }
    if (!zero && !tie) { vec(ctx, al, G(v1), vc, 4.5); vec(ctx, al, G(v2), vc, 4, [9, 7]); }
    vec(ctx, al, G(x), vc, 5);
    Xg.draw(ctx, al, vc);
    dot(ctx, al.X(0), al.Y(0), ink, true, 5);
    if (!zero && !tie) { past(ctx, al, v1, '$\\kvecvone$', vc, g * (onV1 ? 0 : 1), 28); if (!rank1) past(ctx, al, v2, '$\\kvecvtwo$', vc, g * (onV2 ? 0 : 1), 28); }
    past(ctx, al, x, onV1 ? (x[0] * v1[0] + x[1] * v1[1] > 0 ? '$\\kvecx = \\kvecvone$' : '$\\kvecx = -\\kvecvone$') : onV2 ? (x[0] * v2[0] + x[1] * v2[1] > 0 ? '$\\kvecx = \\kvecvtwo$' : '$\\kvecx = -\\kvecvtwo$') : '$\\kvecx$', vc, g, 30);
    hits.push({ x: al.X(x[0]), y: al.Y(x[1]), r: 20, name: `x = ${pt(x)}, a unit vector at ${numT(Math.round(th.v) % 360)}°; drag its head round the circle` });
    if (!zero && !tie) hits.push(
      { x: al.X(v1[0]), y: al.Y(v1[1]), r: 16, name: `v₁ = ${pt(v1)}, the first right singular vector, the direction in which |Ax| is largest` },
      { x: al.X(v2[0]), y: al.Y(v2[1]), r: 16, name: `v₂ = ${pt(v2)}, the second right singular vector, the direction in which |Ax| is smallest${rank1 ? '; it spans Nul(A)' : ''}` });
    /* right: the circle carried by the current step */
    const STAGE = ['the circle', 'after $\\kVT$', 'after $\\kSigma\\kVT$', 'after $\\kU\\kSigma\\kVT = \\kA$'];
    tname(ctx, RB, atStop ? STAGE[i] : `${STAGE[Math.floor(s)]} → ${STAGE[Math.ceil(s)]}`, mu);
    const ar = plane(ctx, RB, 4, 8);
    if (rank1 && s > 2.5) {
      subspace(ctx, ar, u1, rc);
      const e = [3.4 * u1[0], 3.4 * u1[1]]; const p = e[1] >= 0 ? e : [-e[0], -e[1]];
      ctx.save(); ctx.globalAlpha *= Math.min(1, (s - 2.5) * 2);
      tag(ctx, '$\\kCol(\\kA) = \\text{Span}\\{\\kvecuone\\}$', Math.min(Math.max(ar.X(p[0]), RB.l + 130), RB.r - 130), Math.max(ar.Y(p[1]) - 22, RB.t + 16), rc, 'center', 20);
      ctx.restore();
      LAB.push({ l: ar.X(p[0]) - 130, r: ar.X(p[0]) + 130, t: ar.Y(p[1]) - 38, b: ar.Y(p[1]) - 6 });
    }
    ellipse(ctx, ar, M, mc, 3.5, g);
    if (!zero && !tie) { vec(ctx, ar, G(Mv1), vc, 4.5); vec(ctx, ar, G(Mv2), vc, 4, [9, 7]); }
    vec(ctx, ar, G(Mx), vc, 5);
    dot(ctx, ar.X(0), ar.Y(0), ink, true, 5);
    const L1 = ['$\\kvecvone$', '$\\mathbf{e}_1$', '$\\ksigmaone\\mathbf{e}_1$', '$\\ksigmaone\\kvecuone$'][i];
    const L2 = ['$\\kvecvtwo$', '$\\mathbf{e}_2$', '$\\ksigmatwo\\mathbf{e}_2$', '$\\ksigmatwo\\kvecutwo$'][i];
    const LX = ['$\\kvecx$', '$\\kVT\\kvecx$', '$\\kSigma\\kVT\\kvecx$', '$\\kA\\kvecx$'][i];
    if (!zero && !tie) { past(ctx, ar, Mv1, L1, vc, g * lab * (onV1 ? 0 : 1), 28); if (len(Mv2) > 0.05) past(ctx, ar, Mv2, L2, vc, g * lab * (onV2 ? 0 : 1), 28); }
    if (len(Mx) > 0.05) past(ctx, ar, Mx, (onV1 || onV2) && i === 3 ? `$\\kA\\kvecx = ${x[0] * (onV1 ? v1 : v2)[0] + x[1] * (onV1 ? v1 : v2)[1] > 0 ? '' : '-'}${onV1 ? '\\ksigmaone\\kvecuone' : '\\ksigmatwo\\kvecutwo'}$` : LX, vc, g * lab, 32);
    const NAMEX = [`x = ${pt(x)}`, `Vᵀx = ${pt(map(Vt, x))}: the coordinates of x along v₁ and v₂`, `ΣVᵀx = ${pt(map(mul(q.S, Vt), x))}: each coordinate stretched by its singular value`, `Ax = ${pt(Ax)}, of length |Ax| = ${numT(lx)}`];
    hits.push({ x: ar.X(Mx[0]), y: ar.Y(Mx[1]), r: 20, name: atStop ? NAMEX[i] : 'the image of x' });
    if (!zero && !tie && atStop) hits.push(
      { x: ar.X(Mv1[0]), y: ar.Y(Mv1[1]), r: 16, name: [`v₁ = ${pt(v1)}`, 'Vᵀv₁ = e₁ = (1, 0)', `ΣVᵀv₁ = σ₁e₁ = ${pt([s1, 0])}`, `Av₁ = σ₁u₁ = ${numT(s1)} · ${pt(u1)}`][i] },
      { x: ar.X(Mv2[0]), y: ar.Y(Mv2[1]), r: 16, name: [`v₂ = ${pt(v2)}`, 'Vᵀv₂ = e₂ = (0, 1)', `ΣVᵀv₂ = σ₂e₂ = ${pt([0, s2])}`, `Av₂ = σ₂u₂ = ${numT(s2)} · ${pt(u2)}`][i] });
    /* the bar |Ax| on the right pane's scale, its baseline the pane's horizontal axis */
    const y0 = ar.Y(0), ppu = ar.Y(0) - ar.Y(1), top = y0 - Math.min(lx, 4) * ppu * g;
    ctx.save(); ctx.fillStyle = alpha(ec, 0.3); ctx.fillRect(BAR.l, top, BAR.r - BAR.l, y0 - top); ctx.strokeStyle = ec; ctx.lineWidth = 2.5; ctx.strokeRect(BAR.l, top, BAR.r - BAR.l, y0 - top); ctx.restore();
    line(ctx, BAR.l - 12, y0, BAR.r + 12, y0, ink, 2);
    text(ctx, '$|\\kA\\kvecx|$', (BAR.l + BAR.r) / 2, y0 + 30, ink, { size: 20, align: 'center', tex: true });
    if (!zero) {
      const ys1 = y0 - s1 * ppu, ys2 = y0 - s2 * ppu, apart = ys2 - ys1 > 28;
      line(ctx, BAR.l - 14, ys1, BAR.r + 14, ys1, ec, 2.5, [8, 6]);
      tag(ctx, `$\\ksigmaone = ${num(s1)}$`, BAR.r + 20, ys1, ec, 'left', 20);
      if (!tie) {
        line(ctx, BAR.l - 14, ys2, BAR.r + 14, ys2, ec, 2.5, [8, 6]);
        tag(ctx, `$\\ksigmatwo = ${num(s2)}$`, BAR.r + 20, apart ? ys2 : ys1 + 28, ec, 'left', 20);
      }
      hits.push({ x: BAR.r + 50, y: ys1, r: 16, name: `σ₁ = ${numT(s1)}, the largest value of |Ax| over unit vectors x` });
      if (!tie) hits.push({ x: BAR.r + 50, y: apart ? ys2 : ys1 + 28, r: 16, name: `σ₂ = ${numT(s2)}, the smallest value of |Ax| over unit vectors x` });
    }
    hits.push({ x: (BAR.l + BAR.r) / 2, y: (top + y0) / 2, r: 24, name: `the bar: l_A(x) = |Ax| = ${numT(lx)}` });
    /* headline */
    const S1 = num(s1), S2 = num(s2), moving = !atStop, turn = (Q) => (flips(Q) ? 'turning and flipping' : 'turning');
    let h;
    if (zero) h = '$\\kA$ is the zero matrix: every unit vector $\\kvecx$ goes to $\\kA\\kvecx = \\mathbf{0}$, and both singular values are $0$.';
    else if (moving && s < 1) h = `$\\kVT$ is ${turn(Vt)} the plane so that $\\kvecvone$ and $\\kvecvtwo$ land on the axes; the circle goes to itself.`;
    else if (moving && s < 2) h = `$\\kSigma$ is stretching the plane by $\\ksigmaone = ${S1}$ along the first axis and by $\\ksigmatwo = ${S2}$ along the second.`;
    else if (moving) h = `$\\kU$ is ${turn(q.U)} the plane so that the axes of the ellipse land on $\\kvecuone$ and $\\kvecutwo$.`;
    else if (i === 0) h = '$\\kA = \\kU\\kSigma\\kVT$ acts on the circle in three steps, read from the right: $\\kVT$, then $\\kSigma$, then $\\kU$.';
    else if (i === 1) h = `$\\kVT$ has carried $\\kvecvone$ and $\\kvecvtwo$ onto $\\mathbf{e}_1$ and $\\mathbf{e}_2$; ${flips(Vt) ? 'a reflection' : 'a rotation'} leaves the circle as it was.`;
    else if (i === 2) h = `$\\kSigma$ has stretched the circle into an ellipse with semi-axes $\\ksigmaone = ${S1}$ and $\\ksigmatwo = ${S2}$ along the axes.`;
    else if (tie) h = `Every unit vector has $|\\kA\\kvecx| = ${S1}$: $\\ksigmaone = \\ksigmatwo$, the circle goes to a circle, and every direction is a singular direction.`;
    else if (rank1) h = `$\\ksigmatwo = 0$: the circle flattens onto $\\kCol(\\kA)$, the line of $\\kvecuone$, and $\\kA\\kvecvtwo = \\mathbf{0}$, so $\\kvecvtwo$ spans $\\kNul(\\kA)$; $\\operatorname{rank}(\\kA) = 1$.`;
    else if (onV1) h = `At $\\kvecx = ${x[0] * v1[0] + x[1] * v1[1] > 0 ? '' : '-'}\\kvecvone$, $|\\kA\\kvecx|$ is as large as it gets, $\\ksigmaone = ${S1}$, and $\\kA\\kvecx$ lands on the long semi-axis.`;
    else if (onV2) h = `At $\\kvecx = ${x[0] * v2[0] + x[1] * v2[1] > 0 ? '' : '-'}\\kvecvtwo$, $|\\kA\\kvecx|$ is as small as it gets, $\\ksigmatwo = ${S2}$, and $\\kA\\kvecx$ lands on the short semi-axis.`;
    else h = `$|\\kA\\kvecx| = ${num(lx)}$ for this unit vector $\\kvecx$; it reaches $\\ksigmaone = ${S1}$ at $\\kvecx = \\pm\\kvecvone$ and falls to $\\ksigmatwo = ${S2}$ at $\\kvecx = \\pm\\kvecvtwo$.`;
    headline(ctx, h);
    /* readout: the step's product with the live numbers (the matrix itself, not its blend, once a choice has settled) */
    const Q = k < 1 ? svd(target) : q, VtQ = tr(Q.V), c = map(VtQ, x), sc = [Q.s[0] * c[0], Q.s[1] * c[1]], AxQ = map(target, x);
    const j = moving ? Math.floor(s) : i;
    if (j === 0) ro.set(`\\kA = \\kU\\kSigma\\kVT = ${kmtx(Q.U)} ${kmtx(Q.S)} ${kmtx(VtQ)} = ${kmtx(target)}`,
      `The columns of $\\kV$ are $\\kvecvone$ and $\\kvecvtwo$, the columns of $\\kU$ are $\\kvecuone$ and $\\kvecutwo$, and $\\ksigmaone = ${num(Q.s[0])}$ and $\\ksigmatwo = ${num(Q.s[1])}$ stand on the diagonal of $\\kSigma$.`, { form: 'whole' });
    else if (j === 1) ro.set(`\\kVT\\kvecx = ${kmtx(VtQ)} ${col(x)} = ${col(c)}`,
      `$\\kVT\\kvecx$ lists $c_1 = \\kvecvone\\cdot\\kvecx$ and $c_2 = \\kvecvtwo\\cdot\\kvecx$, the coordinates of $\\kvecx$ along the right singular vectors.`, { form: 'coords' });
    else if (j === 2) ro.set(`\\kSigma\\kVT\\kvecx = ${kmtx(Q.S)} ${col(c)} = ${col(sc)}`,
      `Each coordinate is multiplied by its singular value: $\\ksigmaone c_1$ and $\\ksigmatwo c_2$.`, { form: 'stretch' });
    else if ((onV1 || onV2) && k >= 1) {
      const w = onV1 ? 0 : 1, sg = x[0] * Q.v[w][0] + x[1] * Q.v[w][1] > 0 ? '' : '-', V = ['\\kvecvone', '\\kvecvtwo'][w], Sg = ['\\ksigmaone', '\\ksigmatwo'][w], Uv = ['\\kvecuone', '\\kvecutwo'][w];
      ro.set(`\\kA(${sg}${V}) = ${sg}${Sg}${Uv} = ${sg}${num(Q.s[w])}${col(Q.u[w])} = ${col(AxQ)}`,
        `$|\\kA\\kvecx| = ${Sg} = ${num(Q.s[w])}$, the ${w ? 'smallest' : 'largest'} value of $l_{\\kA}$ on unit vectors.`, { form: 'special' });
    } else ro.set(`\\kA\\kvecx = \\kU\\kSigma\\kVT\\kvecx = ${kmtx(Q.U)} ${col(sc)} = ${col(AxQ)}`,
      `$|\\kA\\kvecx| = ${num(len(AxQ))}$, between $\\ksigmatwo = ${num(Q.s[1])}$ and $\\ksigmaone = ${num(Q.s[0])}$.`, { form: 'back' });
  }
  still(d, draw);
  void Xg;
})();
};
