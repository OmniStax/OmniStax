/* Figures for section 7.1 Symmetric matrices and variance. */
window.OMNISTAX_FIGURES = window.OMNISTAX_FIGURES || {};
window.OMNISTAX_FIGURES['7.1'] = function (root, F) {
const { C, PAL, alpha, ctl, select, choice, begin, axes, drag, line, arrow, dot, text, headline, register, readout, hover, ease, fmt, arrival, pinned } = F;
const sim = (id, H) => F.sim(root, id, H);
const still = (d, draw) => register(d.fig, { update: () => {}, draw });
const DEG = Math.PI / 180;
/* a number as the figure writes it: at most two decimals, no trailing zeros, never −0 */
const r2 = (v) => { const r = Math.round(v * 100) / 100; return Object.is(r, -0) ? 0 : r; };
const r1 = (v) => { const r = Math.round(v * 10) / 10; return Object.is(r, -0) ? 0 : r; };
const num = (v) => String(r2(v));
const numT = (v) => num(v).replace('-', '−');            /* the same in figure text, with a true minus */
const col = (v) => `\\left[\\begin{array}{r} ${num(v[0])} \\\\ ${num(v[1])} \\end{array}\\right]`;
const mtx = (m) => `\\left[\\begin{array}{rr} ${num(m[0])} & ${num(m[1])} \\\\ ${num(m[2])} & ${num(m[3])} \\end{array}\\right]`;
const kmtx = (m) => `\\htmlClass{kv-matrix}{${mtx(m)}}`;
const pt = (v) => `(${numT(v[0])}, ${numT(v[1])})`;      /* in figure text */
const lerp = (a, b, k) => a + (b - a) * k;
const lerpM = (a, b, k) => a.map((x, i) => lerp(x, b[i], k));
/* y = M x for a 2 × 2 matrix [a b; c d] stored row by row; products, the inverse and a rotation */
const map = (m, p) => [m[0] * p[0] + m[1] * p[1], m[2] * p[0] + m[3] * p[1]];
const mul = (m, n) => [m[0] * n[0] + m[1] * n[2], m[0] * n[1] + m[1] * n[3], m[2] * n[0] + m[3] * n[2], m[2] * n[1] + m[3] * n[3]];
const inv = (m) => { const dt = m[0] * m[3] - m[1] * m[2]; return [m[3] / dt, -m[1] / dt, -m[2] / dt, m[0] / dt]; };
const rot = (a) => [Math.cos(a), -Math.sin(a), Math.sin(a), Math.cos(a)];
const ID = [1, 0, 0, 1];
const tag = (ctx, s, x, y, color, align = 'center', size = 22) => text(ctx, s, x, y, color, { size, weight: 600, tex: true, bg: PAL.panel, align });
const clear = (c) => alpha(c, 0);
/* a coefficient times a symbol, as the book writes it: 3v₁, −v₂, v₁ */
const coef = (c, v) => (c === 1 ? v : c === -1 ? `-${v}` : c === 0 ? '0' : `${num(c)}${v}`);
/* c₁b₁ + c₂b₂ in TeX, the signs folded */
const combo = (c1, b1, c2, b2) => {
  const a = r2(c1), b = r2(c2);
  if (a === 0 && b === 0) return '\\mathbf{0}';
  if (a === 0) return coef(b, b2);
  if (b === 0) return coef(a, b1);
  return `${coef(a, b1)} ${b < 0 ? '-' : '+'} ${coef(Math.abs(b), b2)}`;
};

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
/* the grip ring of a head the reader can drag */
const ring = (ctx, ax, p, color) => { const { X, Y, box } = ax, x = X(p[0]), y = Y(p[1]); if (x < box.l || x > box.r || y < box.t || y > box.b) return; ctx.save(); ctx.strokeStyle = alpha(color, 0.35); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); };
/* a square window of the plane, −n to n each way, with a faint unit grid under its axes */
function plane(ctx, box, n, o = {}) {
  const U = (box.r - box.l) / (2 * n), cx = (box.l + box.r) / 2, cy = (box.t + box.b) / 2;
  if (o.grid !== false) {
    ctx.save(); ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip();
    for (let i = -n; i <= n; i++) { line(ctx, cx + i * U, box.t, cx + i * U, box.b, alpha(PAL.ink, 0.07), 1.5); line(ctx, box.l, cy - i * U, box.r, cy - i * U, alpha(PAL.ink, 0.07), 1.5); }
    ctx.restore();
  }
  return axes(ctx, box, [-n, n], [-n, n], { nx: o.ticks ?? 2 * n, ny: o.ticks ?? 2 * n, fx: (q) => fmt(q, o.dec ?? 0), fy: (q) => fmt(q, o.dec ?? 0) });
}
/* the integer grid of the window −n..n carried by the matrix m: the lines x₁ = i and x₂ = i, clipped to the box */
function carried(ctx, ax, m, n, color, a, w = 1.5) {
  const { X, Y, box } = ax;
  ctx.save(); ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip(); ctx.globalAlpha *= a;
  for (let i = -n; i <= n; i++) {
    const a1 = map(m, [i, -n]), b1 = map(m, [i, n]), a2 = map(m, [-n, i]), b2 = map(m, [n, i]);
    line(ctx, X(a1[0]), Y(a1[1]), X(b1[0]), Y(b1[1]), color, i ? w : w + 0.8);
    line(ctx, X(a2[0]), Y(a2[1]), X(b2[0]), Y(b2[1]), color, i ? w : w + 0.8);
  }
  ctx.restore();
}
/* the unit square carried by m, filled and outlined */
function square(ctx, ax, m, color, a) {
  const { X, Y, box } = ax, P4 = [[0, 0], [1, 0], [1, 1], [0, 1]].map((p) => map(m, p));
  ctx.save(); ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip();
  ctx.beginPath(); P4.forEach((p, i) => (i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])))); ctx.closePath();
  ctx.fillStyle = alpha(color, a); ctx.fill(); ctx.strokeStyle = alpha(color, 0.8); ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
}
const tname = (ctx, box, s, color) => text(ctx, s, (box.l + box.r) / 2, box.t - 22, color, { size: 20, align: 'center', tex: true });
/* the arc from direction a0 to a1 (plane angles, counterclockwise) about (x, y) */
function arc(ctx, x, y, r, a0, a1, color, w = 2.5) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath();
  ctx.arc(x, y, r, -a0, -a1, a1 > a0); ctx.stroke(); ctx.restore();
}

/* Figure 7.1.2 + 7.1.3: D on the standard grid and A on the grid of its eigenvectors. Left, the grid of the basis
   b₁, b₂ (e₁, e₂ for D; v₁ = (1, 1), v₂ = (−1, 1) for A) with its unit square, b₁, b₂ and a vector x whose head the
   reader drags (the preview's e₁ + 2e₂ and v₁ + 2v₂ as defaults); right, all of it carried by the matrix. A choice
   of D or A morphs the basis and the matrix together, so D's picture turns 45° into A's. Still: a choice, no clock.
   Two panes, ±5 at 48 units to 1 (the window of the book's answer drawings), heads past the window pinned. */
(function () {
  const d = sim('sim-diagonal-and-eigenvector-grids', 700);
  const N = 5, W = 480;
  const LB = { l: 90, r: 90 + W, t: 160, b: 160 + W }, RB = { l: 830, r: 830 + W, t: 160, b: 160 + W };
  const MATS = {
    D: { M: [3, 0, 0, -1], B: [1, 0, 0, 1], x: [1, 2], b: ['\\kveceone', '\\kvecetwo'], bt: ['e₁', 'e₂'], m: '\\kD', mt: 'D' },
    A: { M: [1, 2, 2, 1], B: [1, -1, 1, 1], x: [-1, 3], b: ['\\kvecvone', '\\kvecvtwo'], bt: ['v₁', 'v₂'], m: '\\kA', mt: 'A' },
  };
  let x1 = null, x2 = null;
  const sel = choice(d.controls, {
    label: 'matrix', key: 'matrix', value: 'D', aria: 'the diagonal matrix D or the matrix A',
    options: [{ value: 'D', label: 'D = [3 0; 0 −1]' }, { value: 'A', label: 'A = [1 2; 2 1]' }],
    onInput: (v) => { x1.set(MATS[v].x[0]); x2.set(MATS[v].x[1]); },
  });
  x1 = ctl(d.controls, { label: 'x_1', cls: '', key: 'x1', min: -4, max: 4, step: 0.5, value: 1, unit: '', dec: 1, aria: 'the first component of x' });
  x2 = ctl(d.controls, { label: 'x_2', cls: '', key: 'x2', min: -4, max: 4, step: 0.5, value: 2, unit: '', dec: 1, aria: 'the second component of x' });
  const Pt = drag(d, { x: x1, y: x2 });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);

  function draw() {
    const { ctx } = begin(d.c); LAB = [];
    const vc = C('vector'), mc = C('matrix'), ink = PAL.ink, mu = PAL.muted;
    const g = ease.smooth(arrival(d));
    const S = MATS[sel.value];
    const M = sel.mix((v) => MATS[v].M), B = sel.mix((v) => MATS[v].B);
    const b1 = [B[0], B[2]], b2 = [B[1], B[3]];
    const x = [r1(x1.v), r1(x2.v)], c = map(inv(S.B), x);
    const Mx = map(M, x), Mb1 = map(M, b1), Mb2 = map(M, b2), MB = mul(M, B);
    const G = (q) => [g * q[0], g * q[1]];
    const lab = sel.k > 0.97 ? 1 : 0;
    hits = [];
    tname(ctx, LB, sel.value === 'D' ? 'the standard grid of $\\kveceone$ and $\\kvecetwo$' : 'the grid of $\\kvecvone$ and $\\kvecvtwo$', mu);
    const al = plane(ctx, LB, N);
    carried(ctx, al, B, 8, ink, 0.25 * g);
    square(ctx, al, B, ink, 0.1);
    vec(ctx, al, [0, 0], G(b1), vc, 5); vec(ctx, al, [0, 0], G(b2), vc, 4, [10, 8]); vec(ctx, al, [0, 0], G(x), vc, 5);
    past(ctx, al, b1, `$${S.b[0]}$`, vc, g * lab, 26); past(ctx, al, b2, `$${S.b[1]}$`, vc, g * lab, 26); past(ctx, al, x, '$\\kvecx$', vc, g * lab);
    Pt.draw(ctx, al, clear(vc)); ring(ctx, al, x, vc);
    dot(ctx, al.X(0), al.Y(0), ink, true, 5);
    tname(ctx, RB, `their images under $${S.m}$`, mu);
    const ar = plane(ctx, RB, N);
    carried(ctx, ar, MB, 8, mc, 0.4 * g);
    square(ctx, ar, MB, mc, 0.18);
    vec(ctx, ar, [0, 0], G(Mb1), vc, 5); vec(ctx, ar, [0, 0], G(Mb2), vc, 4, [10, 8]); vec(ctx, ar, [0, 0], G(Mx), vc, 5);
    past(ctx, ar, Mb1, `$${S.m}${S.b[0]} = ${coef(3, S.b[0])}$`, vc, g * lab, 26);
    past(ctx, ar, Mb2, `$${S.m}${S.b[1]} = ${coef(-1, S.b[1])}$`, vc, g * lab, 26);
    past(ctx, ar, Mx, `$${S.m}\\kvecx$`, vc, g * lab);
    dot(ctx, ar.X(0), ar.Y(0), ink, true, 5);
    const MxS = map(S.M, x);
    hits.push(
      { x: al.X(b1[0]), y: al.Y(b1[1]), r: 16, name: `${S.bt[0]} = ${pt([S.B[0], S.B[2]])}` },
      { x: al.X(b2[0]), y: al.Y(b2[1]), r: 16, name: `${S.bt[1]} = ${pt([S.B[1], S.B[3]])}` },
      { x: al.X(x[0]), y: al.Y(x[1]), r: 20, name: `x = ${pt(x)} = ${numT(c[0])}${S.bt[0]} ${c[1] < 0 ? '−' : '+'} ${numT(Math.abs(r2(c[1])))}${S.bt[1]}; drag its head` },
      { x: ar.X(MxS[0]), y: ar.Y(MxS[1]), r: 20, name: `${S.mt}x = ${pt(MxS)}` },
      { x: ar.X(Mb1[0]), y: ar.Y(Mb1[1]), r: 16, name: `${S.mt}${S.bt[0]} = 3${S.bt[0]}, stretched by a factor of 3` },
      { x: ar.X(Mb2[0]), y: ar.Y(Mb2[1]), r: 16, name: `${S.mt}${S.bt[1]} = −${S.bt[1]}, reflected` },
    );
    const cx = combo(c[0], S.b[0], c[1], S.b[1]), cMx = combo(3 * c[0], S.b[0], -c[1], S.b[1]);
    headline(ctx, `$${S.m}$ multiplies the $${S.b[0]}$-coordinate of $\\kvecx$ by $3$ and the $${S.b[1]}$-coordinate by $-1$: $\\kvecx = ${cx}$ goes to $${cMx}$.`);
    ro.set(`${S.m}\\kvecx = ${S.m}(${cx}) = ${cMx} = ${col(MxS)}`,
      sel.value === 'D' ? 'D stretches horizontally by a factor of 3 and reflects in the horizontal axis.' : 'A stretches by a factor of 3 along v₁ and reflects in the line of v₁: D’s picture turned by 45°.',
      { form: sel.value });
  }
  still(d, draw);
})();

/* Figure 7.1.8: A = QDQᵀ as rotate, stretch, rotate back. A symmetric A = [a b; b c] on sliders, with the book's
   symmetric matrices as presets; its eigenvalues λ₁ ≥ λ₂ and the angle θ of the unit eigenvector u₁ are computed
   live, and Q = [u₁ u₂] is the rotation by θ (u₂ is u₁ turned by 90°). Left, the grid of u₁, u₂ with its unit
   square and the angle θ; right, the same scene carried by the step the story is at: 0 nothing yet, 1 Qᵀ (a true
   rotation by −θ, never a shear through the middle), 2 D (stretched by λ₁ along e₁ and λ₂ along e₂), 3 Q (rotated
   back by θ), where the pane is A acting on the grid. The step slider is the story and carries the transport: the
   order is the lesson, not a clock. Two panes, ±5 at 48 units to 1. */
(function () {
  const d = sim('sim-rotate-stretch-rotate', 720);
  const N = 5, W = 480;
  const LB = { l: 90, r: 90 + W, t: 160, b: 160 + W }, RB = { l: 830, r: 830 + W, t: 160, b: 160 + W };
  const PRESETS = {
    ex7: { label: 'Example 7.1.7: A = [1 2; 2 1]', m: [1, 2, 1] },
    a3: { label: 'Activity 7.1.3 a: A = [0 2; 2 3]', m: [0, 2, 3] },
    e1: { label: 'Exercise 7.1.1 b: A = [0 1; 1 0]', m: [0, 1, 0] },
    pre: { label: 'Preview Activity 7.1.1: D = [3 0; 0 −1]', m: [3, 0, -1] },
    custom: { label: 'your own a, b, c', m: null },
  };
  let sa = null, sb = null, sc = null;
  const sel = select(d.controls, {
    label: 'matrix', key: 'matrix', value: 'ex7', aria: 'one of the book’s symmetric matrices',
    options: Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label })),
    onInput: (v) => { const p = PRESETS[v].m; if (!p) return; sa.set(p[0]); sb.set(p[1]); sc.set(p[2]); },
  });
  const own = () => sel.set('custom');
  sa = ctl(d.controls, { label: 'a', cls: '', key: 'a', min: -3, max: 3, step: 0.5, value: 1, unit: '', dec: 1, aria: 'the entry a of A = [a b; b c]', onInput: own });
  sb = ctl(d.controls, { label: 'b', cls: '', key: 'b', min: -3, max: 3, step: 0.5, value: 2, unit: '', dec: 1, aria: 'the entries b of A = [a b; b c], equal since A is symmetric', onInput: own });
  sc = ctl(d.controls, { label: 'c', cls: '', key: 'c', min: -3, max: 3, step: 0.5, value: 1, unit: '', dec: 1, aria: 'the entry c of A = [a b; b c]', onInput: own });
  const step = ctl(d.controls, { label: 'step', cls: '', key: 'step', min: 0, max: 3, step: 0.01, value: 0, unit: '', dec: 2, aria: 'the step of A = QDQᵀ shown on the right: the grid, after Qᵀ, after D, after Q' });
  F.story(d, step, { stops: [{ v: 0, label: 'the grid' }, { v: 1, label: 'Qᵀ' }, { v: 2, label: 'D' }, { v: 3, label: 'Q' }], ms: 1500, rest: 1200 });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  /* the orthogonal diagonalization of [a b; b c]: λ₁ ≥ λ₂ and the angle of u₁ in (−90°, 90°] */
  const diag = (a, b, c) => {
    const m = (a + c) / 2, r = Math.hypot((a - c) / 2, b);
    let th = r < 1e-12 ? 0 : Math.atan2(b, (a - c) / 2) / 2;
    if (th <= -Math.PI / 2 + 1e-9) th += Math.PI;
    return { l1: m + r, l2: m - r, th };
  };
  const STAGE = ['the grid of $\\kvecuone$ and $\\kvecutwo$', 'after $\\kQT$', 'after $\\kD\\kQT$', 'after $\\kQ\\kD\\kQT = \\kA$'];

  function draw() {
    const { ctx } = begin(d.c); LAB = [];
    const vc = C('vector'), mc = C('matrix'), ec = C('eigenvalue'), ink = PAL.ink, mu = PAL.muted;
    const g = ease.smooth(arrival(d));
    const a = r1(sa.v), b = r1(sb.v), c = r1(sc.v), s = step.v;
    const { l1, l2, th } = diag(a, b, c);
    const Q = rot(th), QT = rot(-th), D = [l1, 0, 0, l2];
    const M = s <= 1 ? rot(-th * s) : s <= 2 ? mul(lerpM(ID, D, s - 1), QT) : mul(rot(th * (s - 2)), mul(D, QT));
    const u1 = [Q[0], Q[2]], u2 = [Q[1], Q[3]];
    const Mu1 = map(M, u1), Mu2 = map(M, u2), MQ = mul(M, Q);
    const i = Math.round(s), atStop = Math.abs(s - i) < 0.02, lab = Math.max(0, 1 - Math.abs(s - i) / 0.08);
    const deg = r2(th / DEG);
    const G = (q) => [g * q[0], g * q[1]];
    hits = [];
    /* left: the grid of the orthonormal eigenvectors */
    tname(ctx, LB, 'the grid of the unit eigenvectors $\\kvecuone$ and $\\kvecutwo$', mu);
    const al = plane(ctx, LB, N);
    carried(ctx, al, Q, 8, ink, 0.25 * g);
    square(ctx, al, Q, ink, 0.1);
    if (Math.abs(th) > 0.03) { arc(ctx, al.X(0), al.Y(0), 62, 0, th, mu, 2.5); const mid = th / 2; tag(ctx, `$\\theta = ${num(deg)}^\\circ$`, al.X(0) + 150 * Math.cos(mid), al.Y(0) - 150 * Math.sin(mid), mu, 'center', 18); }
    vec(ctx, al, [0, 0], G(u1), vc, 5); vec(ctx, al, [0, 0], G(u2), vc, 4, [10, 8]);
    past(ctx, al, u1, '$\\kvecuone$', vc, g, 26); past(ctx, al, u2, '$\\kvecutwo$', vc, g, 26);
    dot(ctx, al.X(0), al.Y(0), ink, true, 5);
    hits.push(
      { x: al.X(u1[0]), y: al.Y(u1[1]), r: 16, name: `u₁ = ${pt(u1)}, a unit eigenvector with eigenvalue λ₁ = ${numT(l1)}` },
      { x: al.X(u2[0]), y: al.Y(u2[1]), r: 16, name: `u₂ = ${pt(u2)}, a unit eigenvector with eigenvalue λ₂ = ${numT(l2)}` },
      { x: al.X(0.5 * (u1[0] + u2[0])), y: al.Y(0.5 * (u1[1] + u2[1])), r: 18, name: 'the unit square of the grid of u₁ and u₂' },
    );
    /* right: the scene carried by the step */
    tname(ctx, RB, atStop ? STAGE[i] : `${STAGE[Math.floor(s)]} → ${STAGE[Math.ceil(s)]}`, mu);
    const ar = plane(ctx, RB, N);
    carried(ctx, ar, MQ, 8, mc, 0.4 * g);
    square(ctx, ar, MQ, mc, 0.18);
    vec(ctx, ar, [0, 0], G(Mu1), vc, 5); vec(ctx, ar, [0, 0], G(Mu2), vc, 4, [10, 8]);
    dot(ctx, ar.X(0), ar.Y(0), ink, true, 5);
    const L1s = [`$\\kvecuone$`, `$\\kveceone$`, `$${coef(r2(l1), '\\kveceone')}$`, `$${coef(r2(l1), '\\kvecuone')}$`][i];
    const L2s = [`$\\kvecutwo$`, `$\\kvecetwo$`, `$${coef(r2(l2), '\\kvecetwo')}$`, `$${coef(r2(l2), '\\kvecutwo')}$`][i];
    if (Math.hypot(...Mu1) > 0.2) past(ctx, ar, Mu1, L1s, vc, g * lab, 26);
    if (Math.hypot(...Mu2) > 0.2) past(ctx, ar, Mu2, L2s, vc, g * lab, 26);
    const ctr = map(MQ, [0.5, 0.5]);
    hits.push(
      { x: ar.X(Mu1[0]), y: ar.Y(Mu1[1]), r: 16, name: [`u₁ = ${pt(u1)}`, 'Qᵀu₁ = e₁ = (1, 0)', `DQᵀu₁ = λ₁e₁ = ${pt([l1, 0])}`, `Au₁ = λ₁u₁ = ${pt(u1.map((q) => l1 * q))}`][i] },
      { x: ar.X(Mu2[0]), y: ar.Y(Mu2[1]), r: 16, name: [`u₂ = ${pt(u2)}`, 'Qᵀu₂ = e₂ = (0, 1)', `DQᵀu₂ = λ₂e₂ = ${pt([0, l2])}`, `Au₂ = λ₂u₂ = ${pt(u2.map((q) => l2 * q))}`][i] },
      { x: ar.X(ctr[0]), y: ar.Y(ctr[1]), r: 18, name: ['the unit square of the grid of u₁ and u₂', 'the standard unit square', `a ${numT(Math.abs(l1))} by ${numT(Math.abs(l2))} rectangle on the axes`, `a ${numT(Math.abs(l1))} by ${numT(Math.abs(l2))} rectangle along u₁ and u₂`][i] },
    );
    /* headline and readout */
    const neg = l1 < 0 || l2 < 0, zero = Math.abs(l1) < 1e-9 || Math.abs(l2) < 1e-9;
    const L1 = num(l1), L2 = num(l2);
    let h;
    if (!atStop && s < 1) h = `$\\kQT$ is rotating the plane by $${num(-deg)}^\\circ$, carrying $\\kvecuone$ and $\\kvecutwo$ onto $\\kveceone$ and $\\kvecetwo$.`;
    else if (!atStop && s < 2) h = `$\\kD$ is stretching the standard grid by $\\klambdaone = ${L1}$ along $\\kveceone$ and by $\\klambdatwo = ${L2}$ along $\\kvecetwo$${neg ? ', a negative factor reflecting it' : ''}.`;
    else if (!atStop) h = `$\\kQ$ is rotating the plane back by $${num(deg)}^\\circ$, carrying $\\kveceone$ and $\\kvecetwo$ onto $\\kvecuone$ and $\\kvecutwo$.`;
    else if (i === 0) h = `$\\kA = \\kQ\\kD\\kQT$ acts on the grid of its unit eigenvectors in three moves, read from the right: $\\kQT$, then $\\kD$, then $\\kQ$.`;
    else if (i === 1) h = `$\\kQT$ has rotated the plane by $${num(-deg)}^\\circ$: $\\kvecuone$ and $\\kvecutwo$ now lie on $\\kveceone$ and $\\kvecetwo$, and their grid is the standard grid.`;
    else if (i === 2) h = `$\\kD$ has stretched the grid by $\\klambdaone = ${L1}$ along $\\kveceone$ and by $\\klambdatwo = ${L2}$ along $\\kvecetwo$${zero ? ', a zero factor flattening it onto a line' : neg ? '; a negative factor is a reflection' : ''}.`;
    else h = `$\\kQ$ has rotated back by $${num(deg)}^\\circ$: $\\kA$ stretches by $\\klambdaone = ${L1}$ along $\\kvecuone$ and by $\\klambdatwo = ${L2}$ along $\\kvecutwo$.`;
    headline(ctx, h);
    const A = [a, b, b, c], j = atStop ? i : Math.floor(s);
    if (j === 0) ro.set(`\\kA = \\kQ\\kD\\kQT = ${kmtx(Q)} ${kmtx(D)} ${kmtx(QT)} = ${kmtx(A)}`, `θ = ${numT(deg)}°: Q rotates by θ and Qᵀ = Q⁻¹ rotates by −θ.`, { form: 'whole' });
    else if (j === 1) ro.set(`\\kQT = ${kmtx(QT)}`, `The rotation by ${numT(-deg)}°: Qᵀu₁ = e₁ and Qᵀu₂ = e₂.`, { form: 'QT' });
    else if (j === 2) ro.set(`\\kD\\kQT = ${kmtx(D)} ${kmtx(QT)} = ${kmtx(mul(D, QT))}`, `D holds the eigenvalues λ₁ = ${numT(l1)} and λ₂ = ${numT(l2)}.`, { form: 'DQT' });
    else ro.set(`\\kQ\\kD\\kQT = ${kmtx(Q)} ${kmtx(mul(D, QT))} = ${kmtx(A)} = \\kA`, `Au₁ = λ₁u₁ and Au₂ = λ₂u₂.`, { form: 'QDQT' });
  }
  still(d, draw);
})();

/* Sim: the variance along a line turned through the demeaned data. A unit vector u at the angle θ (a slider,
   0° to 180°) and w, u turned by 90°; the demeaned points projected onto the line of u (region, solid) and onto
   the line of w (region, dashed); V_u = u·(Cu) and V_w = w·(Cw) read live with V = V_u + V_w. Beside, V_u against θ
   in ink (V_w dashed), the present angle dotted in eigenvalue, the total V as a dashed level and the greatest and
   least V_u marked; under it the bar V split into V_u and V_w. Data: Activity 7.1.4's three points (window ±4, the
   original points faint and the centroid hollow, the demeaned points labelled) or Activity 7.1.6's hundred points of
   variance-data.csv (window ±3, already demeaned). θ has detents at the axes and at 45° and 135° (the lines of
   v₁ and v₂ in Activity 7.1.4 g) and dashed specials at the two eigenvector directions of C. Still: no clock. */
(function () {
  const d = sim('sim-variance-direction', 720);
  const HUNDRED = [[-1.364,-0.541],[1.154,0.481],[0.08,0.022],[0.705,0.47],[-1.526,-0.95],[1.442,0.696],[1.148,0.377],[-0.12,0.031],[-0.986,-0.313],[1.704,0.666],[-1.8,-0.881],[1.855,0.882],[-1.035,-0.547],[-1.785,-1.002],[-0.15,-0.075],[-0.969,-0.59],[-1.026,-0.527],[-0.742,-0.561],[1.449,0.749],[0.668,0.21],[2.069,1.18],[-1.418,-0.774],[0.985,0.579],[1.844,0.893],[1.419,0.779],[-0.688,-0.307],[1.628,0.955],[0.12,0.097],[-1.763,-0.983],[1.288,0.612],[-1.209,-0.583],[0.911,0.527],[-0.403,-0.224],[0.132,0.179],[0.182,0.05],[0.057,-0.158],[-1.727,-0.781],[2.031,1.055],[-0.327,-0.294],[0.108,0.248],[1.181,0.608],[1.54,0.665],[0.154,0.26],[0.41,0.19],[-0.824,-0.391],[1.927,0.768],[1.233,0.747],[1.643,0.92],[1.335,0.677],[0.344,0.144],[-1.677,-0.689],[0.379,0.071],[0.117,0.055],[-0.474,-0.297],[0.252,0.177],[0.548,0.259],[-1.79,-1.001],[-1.193,-0.561],[1.543,0.893],[1.287,0.772],[-0.88,-0.302],[0.791,0.231],[-1.835,-1.11],[1.121,0.462],[-1.463,-0.68],[-0.524,-0.432],[-1.263,-0.619],[-1.229,-0.703],[0.945,0.456],[-0.613,-0.315],[-1.807,-0.947],[-0.218,-0.232],[-1.466,-0.571],[0.139,-0.045],[0.521,0.389],[-1.818,-1.1],[-1.316,-0.568],[-1.261,-0.547],[0.811,0.425],[-1.019,-0.317],[1.29,0.653],[-1.009,-0.443],[-0.322,-0.129],[-0.616,-0.254],[-1.666,-0.912],[1.97,1.137],[-0.676,-0.193],[-0.66,-0.152],[1.074,0.505],[-0.892,-0.641],[1.613,0.624],[1.376,0.875],[0.38,0.06],[1.57,0.976],[0.915,0.463],[-0.39,-0.254],[-1.078,-0.468],[-0.17,-0.205],[-1.484,-0.674],[-0.717,-0.357]];
  const SETS = {
    three: { label: 'Activity 7.1.4: three points', raw: [[1, 1], [2, 1], [3, 4]], n: 4 },
    hundred: { label: 'Activity 7.1.6: 100 points', raw: HUNDRED, n: 3 },
  };
  for (const S of Object.values(SETS)) {
    const N = S.raw.length, m = [S.raw.reduce((q, p) => q + p[0], 0) / N, S.raw.reduce((q, p) => q + p[1], 0) / N];
    S.mean = m; S.pts = S.raw.map((p) => [p[0] - m[0], p[1] - m[1]]);
    const c11 = S.pts.reduce((q, p) => q + p[0] * p[0], 0) / N, c12 = S.pts.reduce((q, p) => q + p[0] * p[1], 0) / N, c22 = S.pts.reduce((q, p) => q + p[1] * p[1], 0) / N;
    S.C = [c11, c12, c12, c22]; S.V = c11 + c22;
    let t = Math.atan2(2 * c12, c11 - c22) / 2 / DEG; if (t < 0) t += 180;
    S.tmax = t; S.tmin = (t + 90) % 180;
    S.vmax = (c11 + c22) / 2 + Math.hypot((c11 - c22) / 2, c12); S.vmin = S.V - S.vmax;
  }
  const VU = (S, t) => { const c = Math.cos(t * DEG), s = Math.sin(t * DEG); return S.C[0] * c * c + 2 * S.C[1] * c * s + S.C[3] * s * s; };
  let th = null;
  const sel = choice(d.controls, {
    label: 'data', key: 'data', value: 'three', aria: 'the data set',
    options: Object.entries(SETS).map(([value, S]) => ({ value, label: S.label })),
    onInput: () => th.refresh?.(),
  });
  th = ctl(d.controls, { label: '\\theta', cls: '', key: 'theta', min: 0, max: 180, step: 1, value: 45, unit: '°', dec: 0, aria: 'the angle of u from the positive x-axis',
    detents: [0, 45, 90, 135, 180],
    specials: [{ at: () => Math.round(SETS[sel.value].tmax), label: 'greatest' }, { at: () => Math.round(SETS[sel.value].tmin), label: 'least' }] });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  const PB = { l: 80, r: 600, t: 150, b: 670 };
  const GB = { l: 760, r: 1330, t: 150, b: 470 };
  const BAR = { l: 760, r: 1330, t: 572, b: 610 };

  function draw() {
    const { ctx } = begin(d.c); LAB = [];
    const vc = C('vector'), pc = C('point'), rc = C('region'), ec = C('eigenvalue'), ink = PAL.ink, mu = PAL.muted;
    const g = ease.smooth(arrival(d));
    const S = SETS[sel.value], three = sel.value === 'three';
    const t = th.v, u = [Math.cos(t * DEG), Math.sin(t * DEG)], w = [-u[1], u[0]];
    const Vu = VU(S, t), Vw = S.V - Vu;
    hits = [];
    /* the plane of the data */
    const n = S.n;
    tname(ctx, PB, three ? 'the data, its centroid $\\kvecdbar$ and the demeaned points' : 'the hundred demeaned points', mu);
    const ax = plane(ctx, PB, n, { ticks: 2 * n });
    const { X, Y, box } = ax;
    const R = n * 1.5;
    ctx.save(); ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip();
    /* the lines of u and w */
    line(ctx, X(-R * u[0]), Y(-R * u[1]), X(R * u[0]), Y(R * u[1]), alpha(rc, 0.85), 3.5);
    line(ctx, X(-R * w[0]), Y(-R * w[1]), X(R * w[0]), Y(R * w[1]), alpha(rc, 0.75), 3, [12, 9]);
    if (three) {
      /* the original points, faint, and the centroid, hollow */
    }
    /* projections, drop segments for the three points only */
    const pu = S.pts.map((p) => { const k = p[0] * u[0] + p[1] * u[1]; return [k * u[0], k * u[1]]; });
    const pw = S.pts.map((p) => { const k = p[0] * w[0] + p[1] * w[1]; return [k * w[0], k * w[1]]; });
    if (three) S.pts.forEach((p, j) => { line(ctx, X(p[0]), Y(p[1]), X(pu[j][0]), Y(pu[j][1]), alpha(ink, 0.35), 2, [4, 6]); line(ctx, X(p[0]), Y(p[1]), X(pw[j][0]), Y(pw[j][1]), alpha(ink, 0.25), 2, [4, 6]); });
    const rp = three ? 7 : 4.5;
    pu.forEach((q) => dot(ctx, X(q[0]), Y(q[1]), alpha(pc, 0.9), false, rp));
    pw.forEach((q) => dot(ctx, X(q[0]), Y(q[1]), alpha(pc, 0.6), false, rp - 1));
    S.pts.forEach((p, j) => {
      dot(ctx, X(p[0]), Y(p[1]), pc, true, three ? 9 : 5);
      hits.push({ x: X(p[0]), y: Y(p[1]), r: three ? 14 : 8, name: `${three ? `d̃${'₁₂₃'[j]}` : 'a demeaned point'} = ${pt(p)}; on u's line at ${numT(p[0] * u[0] + p[1] * u[1])}, on w's at ${numT(p[0] * w[0] + p[1] * w[1])}` });
    });
    ctx.restore();
    if (three) {
      /* the original points, faint, and the centroid, hollow; drawn over the edge of the window, where d₃ sits */
      S.raw.forEach((p, j) => { dot(ctx, X(p[0]), Y(p[1]), alpha(pc, 0.35), true, 7); hits.push({ x: X(p[0]), y: Y(p[1]), r: 14, name: `d${'₁₂₃'[j]} = ${pt(p)}, a data point` }); });
      dot(ctx, X(S.mean[0]), Y(S.mean[1]), pc, false, 9);
      hits.push({ x: X(S.mean[0]), y: Y(S.mean[1]), r: 14, name: `the centroid d̄ = ${pt(S.mean)}` });
    }
    /* u and w, one unit long */
    const G = (q) => [g * q[0], g * q[1]];
    vec(ctx, ax, [0, 0], G(u), vc, 5); vec(ctx, ax, [0, 0], G(w), vc, 4, [9, 7]);
    dot(ctx, X(0), Y(0), ink, true, 5);
    past(ctx, ax, u, '$\\kvecu$', vc, g, 24); past(ctx, ax, w, '$\\kvecw$', vc, g, 24);
    if (three) {
      ['\\kvecdonetilde', '\\kvecdtwotilde', '\\kvecdthreetilde'].forEach((s, j) => {
        const p = S.pts[j], off = [[-1, -1], [1, -1], [-1, 1]][j];
        tag(ctx, `$${s}$`, X(p[0]) + off[0] * 26, Y(p[1]) - off[1] * 22, pc, off[0] < 0 ? 'right' : 'left', 20);
      });
      tag(ctx, '$\\kvecdbar$', X(S.mean[0]) + 18, Y(S.mean[1]) + 22, pc, 'left', 20);
    }
    hits.push({ x: X(u[0]), y: Y(u[1]), r: 14, name: `u = ${pt(u)}, at ${t}°` }, { x: X(w[0]), y: Y(w[1]), r: 14, name: `w = ${pt(w)}, u turned by 90°` });
    /* the graph of V_u against θ */
    const top = three ? 3 : 2;
    const gx = axes(ctx, GB, [0, 180], [0, top], { nx: 4, ny: three ? 3 : 4, fx: (q) => `${q}°`, fy: (q) => fmt(q, three ? 0 : 1), xl: 'θ, the angle of u', yl: 'variance' });
    const plotPts = (f) => { const P = []; for (let k = 0; k <= 180; k += 2) P.push([gx.X(k), gx.Y(f(k))]); return P; };
    const poly = (P, color, w2, dash) => { ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w2; if (dash) ctx.setLineDash(dash); ctx.beginPath(); P.forEach((p, k) => (k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); ctx.restore(); };
    ctx.save(); ctx.globalAlpha *= g;
    poly([[gx.X(0), gx.Y(S.V)], [gx.X(180), gx.Y(S.V)]], alpha(ink, 0.45), 2, [10, 10]);
    poly(plotPts((k) => VU(S, k)), ink, 4);
    poly(plotPts((k) => S.V - VU(S, k)), alpha(ink, 0.6), 3, [8, 7]);
    ctx.restore();
    text(ctx, `V = ${numT(S.V)}`, gx.X(180) - 6, gx.Y(S.V) - 14, mu, { size: 17, align: 'right' });
    line(ctx, gx.X(t), GB.t, gx.X(t), GB.b, alpha(ink, 0.3), 2);
    [[S.tmax, S.vmax, 'greatest'], [S.tmin, S.vmin, 'least']].forEach(([a, v, nm]) => {
      dot(ctx, gx.X(a), gx.Y(v), ec, false, 8);
      hits.push({ x: gx.X(a), y: gx.Y(v), r: 14, name: `the ${nm} variance, ${numT(v)}, along u at ${numT(r1(a))}°` });
    });
    dot(ctx, gx.X(t), gx.Y(Vu), ec, true, 9); dot(ctx, gx.X(t), gx.Y(Vw), ec, false, 7);
    /* each label on the side away from the nearer marked extreme, and inside the box */
    const side = (v) => { const ds = [S.tmax, S.tmin].map((a) => a - t).filter((q) => Math.abs(q) < 40 && Math.abs(q) > 0.5); const right = ds.length ? ds.every((q) => q < 0) : t < 150; return t > 160 ? -1 : t < 20 ? 1 : right ? 1 : -1; };
    const sU = side(), sW = side();
    /* below its point, or above it where the axis would take the label; V_u above, or below near the top */
    const yU = gx.Y(Vu) - 18 < GB.t + 8 ? gx.Y(Vu) + 20 : gx.Y(Vu) - 18, yW = gx.Y(Vw) + 20 > GB.b - 10 ? gx.Y(Vw) - 18 : gx.Y(Vw) + 20;
    tag(ctx, '$\\kVu$', gx.X(t) + 16 * sU, yU, ec, sU > 0 ? 'left' : 'right', 20);
    tag(ctx, '$\\kVw$', gx.X(t) + 16 * sW, yW, ec, sW > 0 ? 'left' : 'right', 20);
    hits.push({ x: gx.X(t), y: gx.Y(Vu), r: 14, name: `V_u = ${numT(Vu)} at θ = ${t}°` }, { x: gx.X(t), y: gx.Y(Vw), r: 14, name: `V_w = ${numT(Vw)}, the variance across` });
    /* the bar V = V_u + V_w */
    const bx = (v) => BAR.l + (v / top) * (BAR.r - BAR.l);
    ctx.save(); ctx.globalAlpha *= g;
    ctx.fillStyle = alpha(ec, 0.8); ctx.fillRect(bx(0), BAR.t, bx(Vu) - bx(0), BAR.b - BAR.t);
    ctx.fillStyle = alpha(ec, 0.3); ctx.fillRect(bx(Vu), BAR.t, bx(S.V) - bx(Vu), BAR.b - BAR.t);
    ctx.strokeStyle = ec; ctx.lineWidth = 2; ctx.strokeRect(bx(0), BAR.t, bx(S.V) - bx(0), BAR.b - BAR.t);
    ctx.restore();
    text(ctx, '$\\kVu + \\kVw = \\kV$', BAR.l, BAR.t - 22, mu, { size: 18, align: 'left', tex: true });
    hits.push({ x: (bx(0) + bx(Vu)) / 2, y: (BAR.t + BAR.b) / 2, r: 18, name: `V_u = ${numT(Vu)}` }, { x: (bx(Vu) + bx(S.V)) / 2, y: (BAR.t + BAR.b) / 2, r: 18, name: `V_w = ${numT(Vw)}` });
    /* headline and readout */
    /* the readout's numbers add up as written: V_w is shown as V − V_u, each rounded */
    const VuS = r2(Vu), VS = r2(S.V), VwS = r2(VS - VuS);
    const at = Math.abs(t - Math.round(S.tmax)) < 0.5 ? ', the greatest it can be' : Math.abs(t - Math.round(S.tmin)) < 0.5 ? ', the least it can be' : '';
    headline(ctx, `Along $\\kvecu$ at $${t}^\\circ$ the projections have variance $\\kVu = ${num(VuS)}$${at}; along $\\kvecw$, square to it, $\\kVw = ${num(VwS)}$; together $\\kV = ${num(VS)}$.`);
    ro.set(`\\kC = ${kmtx(S.C)},\\quad \\kVu = \\kvecu\\cdot(\\kC\\kvecu) = ${num(VuS)},\\quad \\kVw = \\kvecw\\cdot(\\kC\\kvecw) = ${num(VwS)},\\quad \\kV = \\kVu + \\kVw = ${num(VuS)} + ${num(VwS)} = ${num(VS)}`,
      `u = ${pt(u)}, w = ${pt(w)}; the variance is greatest at ${numT(r1(S.tmax))}° and least at ${numT(r1(S.tmin))}°, two orthogonal directions.`,
      { form: sel.value });
  }
  still(d, draw);
})();
};
