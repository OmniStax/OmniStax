/* Figures for section 5.2 Finding eigenvectors numerically. */
window.OMNISTAX_FIGURES = window.OMNISTAX_FIGURES || {};
window.OMNISTAX_FIGURES['5.2'] = function (root, F) {
const { C, PAL, alpha, ctl, select, begin, axes, drag, line, arrow, dot, text, headline, register, readout, hover, cycle, ease, fmt, arrival, pinned } = F;
const sim = (id, H) => F.sim(root, id, H);
/* a number as the figure writes it: at most two (or three) decimals, no trailing zeros, never −0 */
const rnd = (v, p) => { const r = Math.round(v * p) / p; return Object.is(r, -0) ? 0 : r; };
const r2 = (v) => rnd(v, 100), r3 = (v) => rnd(v, 1000);
const num = (v) => String(r2(v));
const num3 = (v) => String(r3(v));
const numT = (v) => num(v).replace('-', '−');             /* the same in figure text, with a true minus */
const num3T = (v) => num3(v).replace('-', '−');
const col = (v, f = num) => `\\left[\\begin{array}{r} ${v.map(f).join(' \\\\ ')} \\end{array}\\right]`;
const mtx = (m) => `\\left[\\begin{array}{rr} ${num(m[0])} & ${num(m[1])} \\\\ ${num(m[2])} & ${num(m[3])} \\end{array}\\right]`;
const kmtx = (m) => `\\htmlClass{kv-matrix}{${mtx(m)}}`;
const pt = (v, f = num) => `(${f(v[0])}, ${f(v[1])})`;      /* in TeX */
const ptT = (v) => pt(v).replace(/-/g, '−');               /* in figure text */
const lerp = (a, b, k) => a + (b - a) * k;
const lerp2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
/* y = M x for a 2 × 2 matrix [a b; c d] stored row by row */
const map = (m, p) => [m[0] * p[0] + m[1] * p[1], m[2] * p[0] + m[3] * p[1]];
const tag = (ctx, s, x, y, color, align = 'center', size = 22) => text(ctx, s, x, y, color, { size, weight: 600, tex: true, bg: PAL.panel, align });
const clear = (c) => alpha(c, 0);
/* a step index as a subscript or superscript in a hover name */
const SUBS = '₀₁₂₃₄₅₆₇₈₉', SUPS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sub = (n) => String(n).split('').map((c) => SUBS[+c]).join('');
const sup = (n) => String(n).split('').map((c) => SUPS[+c]).join('');
const inBox = (ax, p) => { const x = ax.X(p[0]), y = ax.Y(p[1]); return x >= ax.box.l && x <= ax.box.r && y >= ax.box.t && y <= ax.box.b; };

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
/* a line of the plane through the origin in the direction dir, across the box, clipped */
function through(ctx, ax, dir, color, w = 2.5, dash) {
  const L = Math.hypot(dir[0], dir[1]); if (!(L > 1e-9)) return;
  const u = [dir[0] / L, dir[1] / L], { X, Y, box } = ax, R = 1e4;
  ctx.save(); ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip();
  line(ctx, X(-R * u[0]), Y(-R * u[1]), X(R * u[0]), Y(R * u[1]), color, w, dash);
  ctx.restore();
}
/* a label just past the head of the arrow from the origin to h, inside the box; one that would sit on a label placed
   earlier in the same draw steps up or down until it is clear (LAB is emptied at the start of every draw) */
let LAB = [];
function past(ctx, ax, h, s, color, a = 1, gap = 30) {
  if (!(a > 0.001)) return;
  const { X, Y, box } = ax, x1 = X(0), y1 = Y(0), x2 = Math.min(Math.max(X(h[0]), box.l), box.r), y2 = Math.min(Math.max(Y(h[1]), box.t), box.b);
  const L = Math.hypot(x2 - x1, y2 - y1) || 1;
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
function plane(ctx, box, n, o = {}) {
  const U = (box.r - box.l) / (2 * n), cx = (box.l + box.r) / 2, cy = (box.t + box.b) / 2, st = o.grid ?? 1;
  ctx.save(); ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip();
  for (let i = -n; i <= n + 1e-9; i += st) { line(ctx, cx + i * U, box.t, cx + i * U, box.b, alpha(PAL.ink, 0.07), 1.5); line(ctx, box.l, cy - i * U, box.r, cy - i * U, alpha(PAL.ink, 0.07), 1.5); }
  ctx.restore();
  return axes(ctx, box, [-n, n], [-n, n], { nx: o.ticks ?? 2 * n, ny: o.ticks ?? 2 * n, fx: (q) => fmt(q, o.dec ?? 0), fy: (q) => fmt(q, o.dec ?? 0), xl: o.xl, yl: o.yl });
}
/* The eigenvalues and eigenvectors of a 2 × 2 matrix [a b; c d], the dominant one first: null when they are complex
   (a rotation); every vector when the matrix is a multiple of the identity (then v₂ is null); else each eigenvector is
   scaled so that its component of largest absolute value is 1, the form the power method's x̄_k settle on. */
function eig2(m) {
  const [a, b, c, dd] = m, tr = a + dd, det = a * dd - b * c, disc = tr * tr - 4 * det;
  if (disc < -1e-9) return null;
  const s = Math.sqrt(Math.max(0, disc));
  let lams = [(tr + s) / 2, (tr - s) / 2];
  if (Math.abs(lams[1]) > Math.abs(lams[0])) lams = [lams[1], lams[0]];
  const norm = (v) => { const i = Math.abs(v[0]) >= Math.abs(v[1]) ? 0 : 1; const q = v[i]; return Math.abs(q) < 1e-12 ? [0, 0] : [v[0] / q, v[1] / q]; };
  const dirOf = (l) => (Math.abs(b) > 1e-9 ? [b, l - a] : Math.abs(c) > 1e-9 ? [l - dd, c] : Math.abs(l - a) < 1e-9 ? [1, 0] : [0, 1]);
  const scalar = Math.abs(b) < 1e-9 && Math.abs(c) < 1e-9 && Math.abs(a - dd) < 1e-9;
  if (scalar) return { l1: a, l2: a, v1: [1, 1], v2: null, scalar: true, tie: true };
  const v1 = norm(dirOf(lams[0])), v2 = disc < 1e-9 ? null : norm(dirOf(lams[1]));
  return { l1: lams[0], l2: lams[1], v1, v2, scalar: false, tie: Math.abs(Math.abs(lams[0]) - Math.abs(lams[1])) < 1e-9 };
}
/* the weights c₁, c₂ of x₀ = c₁v₁ + c₂v₂, or null */
function weights(v1, v2, x) {
  if (!v2) return null;
  const det = v1[0] * v2[1] - v1[1] * v2[0]; if (Math.abs(det) < 1e-12) return null;
  return [(x[0] * v2[1] - x[1] * v2[0]) / det, (v1[0] * x[1] - v1[1] * x[0]) / det];
}
/* the scalar c written before a symbol: 1v is v, −1v is −v, 0v is left out by the caller */
const coef = (c, sym, f = num) => { const k = +f(c); return k === 1 ? sym : k === -1 ? `-${sym}` : `${f(c)}\\,${sym}`; };
const combo = (a, b, s1, s2) => {
  const A = r2(a), B = r2(b);
  if (A === 0 && B === 0) return '\\mathbf{0}';
  if (A === 0) return coef(B, s2);
  if (B === 0) return coef(A, s1);
  return `${coef(A, s1)} ${B < 0 ? '-' : '+'} ${coef(Math.abs(B), s2)}`;
};

/* ---------- Sim: the power method (the two unnumbered drawings of Example 5.2.2 folded) ----------
   Two planes. Left, the book's first drawing: x₀ and the raw products x_k = Aᵏx₀, which only grow, on a window of
   −8 to 8 (the book's [−1, 8] widened so a dragged x₀ and a negative eigenvalue fit; a head past the window is pinned
   at its edge). Right, the book's second drawing: the normalized x̄_k = x_k / m_k inside the square of side 2, on a
   window of −1.5 to 1.5, with the eigenvectors v₁ and v₂ of the matrix scaled to a largest component of 1 (the form
   x̄_k settle on) and the eigenvector line through v₁. The matrix is a select of the book's four, Example 5.2.2's
   [2 1; 1 2] the default, which sets the four entry sliders a, b, c, d (−6 to 6 by 0.1); x₀ is dragged on the left
   plane or set on its two sliders (−3 to 3 by 0.1, the book's (1, 0) the default), each with a special at the value
   that lays x₀ along v₂. The step k is the clock: eight steps at 0.65 s each, then a hold of 1.5 s; between steps the
   arrows glide and the readout prints the step reached. */
(function () {
  const d = sim('sim-power-method', 700);
  const K = 8, PER = 0.65, NL = 8, NR = 1.5, W = 450, T0 = 150;
  const LB = { l: 92, r: 92 + W, t: T0, b: T0 + W }, RB = { l: 1308 - W, r: 1308, t: T0, b: T0 + W };
  const PRESETS = {
    ex522: { label: 'Example 5.2.2: [2 1; 1 2]', m: [2, 1, 1, 2] },
    ex521: { label: 'Example 5.2.1: [0.7 0.6; 0.3 0.4]', m: [0.7, 0.6, 0.3, 0.4] },
    a522: { label: 'Activity 5.2.2: [0.5 0.2; 0.4 0.7]', m: [0.5, 0.2, 0.4, 0.7] },
    a522g: { label: 'Activity 5.2.2 g: [−5.1 5.7; −3.8 4.4]', m: [-5.1, 5.7, -3.8, 4.4] },
  };
  const cy = cycle(() => K, 1.5);
  const reset = () => cy.reset();
  let ent = [];
  select(d.controls, {
    label: 'matrix', key: 'matrix', value: 'ex522', aria: 'the matrix whose dominant eigenvector the power method finds',
    options: Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label })),
    onInput: (v) => { PRESETS[v].m.forEach((x, i) => ent[i].set(x)); reset(); },
  });
  ent = ['a', 'b', 'c', 'd'].map((n, i) => ctl(d.controls, { label: n, cls: '', key: 'e' + n, min: -6, max: 6, step: 0.1, value: PRESETS.ex522.m[i], unit: '', dec: 1, aria: `the entry ${n} of the matrix [a b; c d]`, onInput: reset }));
  const M = () => ent.map((e) => rnd(e.v, 10));
  let x01, x02;
  /* the value of one component that lays x₀ along v₂, given the other */
  const onV2 = (i) => () => { const e = eig2(M()); if (!e || !e.v2) return null; const v = e.v2, other = i === 0 ? x02.v : x01.v; return Math.abs(v[1 - i]) > 1e-9 ? other * v[i] / v[1 - i] : null; };
  x01 = ctl(d.controls, { label: '(\\kvecxzero)_1', cls: '', key: 'x01', min: -3, max: 3, step: 0.1, value: 1, unit: '', dec: 1, aria: 'the first component of the initial vector', specials: [{ at: onV2(0), label: 'on v₂' }], onInput: reset });
  x02 = ctl(d.controls, { label: '(\\kvecxzero)_2', cls: '', key: 'x02', min: -3, max: 3, step: 0.1, value: 0, unit: '', dec: 1, aria: 'the second component of the initial vector', specials: [{ at: onV2(1), label: 'on v₂' }], onInput: reset });
  const P = drag(d, { x: x01, y: x02 });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  /* the sequences: raw[k] = Aᵏx₀; xs[k] = A x̄_{k−1}, m[k] its component of largest absolute value, bars[k] = xs[k]/m[k] */
  function run(m, x0) {
    const raw = [x0], xs = [x0], ms = [null], bars = [x0];
    for (let k = 1; k <= K; k++) {
      raw.push(map(m, raw[k - 1]));
      const x = map(m, bars[k - 1]), mk = Math.abs(x[0]) >= Math.abs(x[1]) ? x[0] : x[1];
      xs.push(x); ms.push(mk); bars.push(Math.abs(mk) < 1e-12 ? [0, 0] : [x[0] / mk, x[1] / mk]);
    }
    return { raw, xs, ms, bars };
  }

  function draw() {
    const { ctx } = begin(d.c);
    const vc = C('vector'), mc = C('matrix'), rc = C('region'), ec = C('eigenvalue'), c1 = F.ref('v-1'), c2 = F.ref('v-2'), ink = PAL.ink, mu = PAL.muted;
    const g = ease.smooth(arrival(d));
    const m = M(), x0 = [rnd(x01.v, 10), rnd(x02.v, 10)], E = eig2(m);
    const tau = cy.now(), k = Math.min(K, Math.floor(tau + 1e-9)), fr = ease.smooth(Math.min(1, tau - k));
    const S = run(m, x0), zero = Math.hypot(x0[0], x0[1]) < 1e-9;
    const cur = k >= K ? S.raw[K] : lerp2(S.raw[k], S.raw[k + 1], fr), curB = k >= K ? S.bars[K] : lerp2(S.bars[k], S.bars[k + 1], fr);
    const w = E ? weights(E.v1, E.v2, x0) : null;
    const onv2 = !!(E && E.v2 && w && Math.abs(w[0]) < 1e-9 && !zero);
    hits = []; LAB = [];
    const axL = plane(ctx, LB, NL, { ticks: 8, grid: 2 }), axR = plane(ctx, RB, NR, { ticks: 6, dec: 1, grid: 0.5 });
    text(ctx, 'the vectors $\\kvecxk = \\kAk\\kvecxzero$', (LB.l + LB.r) / 2, LB.t - 26, mu, { size: 20, align: 'center', tex: true });
    text(ctx, 'normalized: $\\kvecxkbar = \\frac{1}{m_k}\\kvecxk$', (RB.l + RB.r) / 2, RB.t - 26, mu, { size: 20, align: 'center', tex: true });
    /* the square of side 2 the normalized vectors live in */
    ctx.save(); ctx.strokeStyle = alpha(ink, 0.45); ctx.lineWidth = 2.5; ctx.setLineDash([10, 8]);
    ctx.strokeRect(axR.X(-1), axR.Y(1), axR.X(1) - axR.X(-1), axR.Y(-1) - axR.Y(1)); ctx.restore();
    hits.push({ x: axR.X(1), y: axR.Y(-1), r: 14, name: 'the square of side 2: a vector whose component of largest absolute value is 1 ends on its edge' });
    /* the eigenvector line and the eigenvectors */
    ctx.save(); ctx.globalAlpha *= g;
    if (E && !E.scalar) {
      through(ctx, axL, E.v1, alpha(rc, 0.8)); through(ctx, axR, E.v1, alpha(rc, 0.8));
      vec(ctx, axR, [0, 0], E.v1, c1, 5);
      if (E.v2) vec(ctx, axR, [0, 0], E.v2, c2, 5);
    }
    ctx.restore();
    if (E && !E.scalar) {
      /* the eigenspace's name near the −v₁ end of its line in the left pane, set off the line so the arrows and their
         pinned heads, which ride the line, never cover it */
      const ed = (ax, n) => { const s = -(n - 0.7) / Math.max(Math.abs(E.v1[0]), Math.abs(E.v1[1])); return [ax.X(s * E.v1[0]), ax.Y(s * E.v1[1])]; };
      const pL = ed(axL, NL), pR = ed(axR, NR), L1 = Math.hypot(E.v1[0], E.v1[1]) || 1, nx = -E.v1[1] / L1, ny = -E.v1[0] / L1;
      const lx = Math.min(Math.max(pL[0] + 40 * nx, LB.l + 36), LB.r - 36), ly = Math.min(Math.max(pL[1] + 40 * ny, LB.t + 16), LB.b - 16);
      tag(ctx, `$E_{${num3(E.l1)}}$`, lx, ly, rc, 'center', 19);
      hits.push({ x: lx, y: ly, r: 14, name: `the eigenspace of λ₁ = ${num3T(E.l1)}: the line of v₁, which the direction of x_k approaches` });
      hits.push({ x: pR[0], y: pR[1], r: 12, name: `the eigenspace of λ₁ = ${num3T(E.l1)}: the line of v₁` });
      if (g > 0.99) { past(ctx, axR, E.v1, '$\\kvecvone$', c1); if (E.v2) past(ctx, axR, E.v2, '$\\kvecvtwo$', c2); }
      hits.push({ x: axR.X(E.v1[0]), y: axR.Y(E.v1[1]), r: 14, name: `v₁ = ${ptT(E.v1.map(r2))}, the eigenvector of the dominant eigenvalue λ₁ = ${num3T(E.l1)}, scaled so its largest component is 1` });
      if (E.v2) hits.push({ x: axR.X(E.v2[0]), y: axR.Y(E.v2[1]), r: 14, name: `v₂ = ${ptT(E.v2.map(r2))}, the eigenvector of λ₂ = ${num3T(E.l2)}` });
    }
    /* left: the earlier steps faint, the current arrow full; right: the same for the normalized vectors */
    const G = (p) => [g * p[0], g * p[1]];
    for (let j = 0; j < k; j++) {
      vec(ctx, axL, [0, 0], G(S.raw[j]), vc, 3.5, undefined, j === 0 ? 0.55 : 0.3);
      if (j > 0) vec(ctx, axR, [0, 0], G(S.bars[j]), vc, 3.5, undefined, 0.3);
      const name = (q, lab) => { if (inBox(axL, q)) hits.push({ x: axL.X(q[0]), y: axL.Y(q[1]), r: 12, name: lab }); };
      name(S.raw[j], j === 0 ? `x₀ = ${ptT(x0)}` : `x${sub(j)} = A${sup(j)}x₀ = ${ptT(S.raw[j].map(r2))}`);
      if (j > 0 && inBox(axR, S.bars[j])) hits.push({ x: axR.X(S.bars[j][0]), y: axR.Y(S.bars[j][1]), r: 12, name: `x̄${sub(j)} = ${ptT(S.bars[j].map(r2))}, with m${sub(j)} = ${num3T(S.ms[j])}` });
    }
    vec(ctx, axL, [0, 0], G(cur), vc, 5);
    if (k > 0 || tau > 0) vec(ctx, axR, [0, 0], G(curB), vc, 5);
    dot(ctx, axL.X(0), axL.Y(0), ink, true, 5); dot(ctx, axR.X(0), axR.Y(0), ink, true, 5);
    P.draw(ctx, axL, clear(vc));
    if (inBox(axL, x0)) { ctx.save(); ctx.strokeStyle = alpha(vc, 0.45); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(axL.X(x0[0]), axL.Y(x0[1]), 17, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    hits.push({ x: axL.X(x0[0]), y: axL.Y(x0[1]), r: 18, name: `x₀ = ${ptT(x0)}; drag its head to start elsewhere` });
    if (g > 0.99 && !zero) {
      past(ctx, axL, x0, '$\\kvecxzero$', vc);
      if (k > 0) past(ctx, axL, cur, k >= K || fr >= 1 ? `$\\kvecx_{${k}}$` : '$\\kvecxk$', vc);
      if (k > 0) past(ctx, axR, curB, k >= K || fr >= 1 ? `$\\overline{\\kvecx}_{${k}}$` : '$\\kvecxkbar$', vc);
    }
    if (k > 0) {
      hits.push({ x: axL.X(cur[0]), y: axL.Y(cur[1]), r: 16, name: `x${sub(k)} = A${sup(k)}x₀ = ${ptT(S.raw[k].map(r2))}` });
      hits.push({ x: axR.X(curB[0]), y: axR.Y(curB[1]), r: 16, name: `x̄${sub(k)} = ${ptT(S.bars[k].map(r2))}, with m${sub(k)} = ${num3T(S.ms[k])}` });
    }
    /* headline and readout */
    const l1 = E ? num3(E.l1) : null, v1T = E ? pt(E.v1.map(r2)) : null;
    let h;
    if (zero) h = 'With $\\kvecxzero = \\mathbf{0}$ every $\\kvecxk$ is $\\mathbf{0}$ and there is no component of largest absolute value to divide by: the power method needs a nonzero start.';
    else if (!E) h = 'The eigenvalues of $\\kA$ are complex, so $\\kvecxkbar$ turns at every step and never settles, and the multipliers $m_k$ approach no limit.';
    else if (E.scalar) h = `$\\kA = ${num(E.l1)}\\kI$: every vector is an eigenvector, $\\kvecxkbar$ is $\\kvecxzero$ scaled from the first step on, and $m_k = ${num3(E.l1)}$ at every step.`;
    else if (onv2) h = `$\\kvecxzero$ lies on $\\kvecvtwo$, so $\\kvecxk = \\klambdatwo^k\\kvecxzero$ stays on $\\kvecvtwo$ and the multipliers settle on $\\klambdatwo = ${num3(E.l2)}$, never on $\\klambdaone = ${l1}$: this start never finds $\\kvecvone$.`;
    else if (E.tie) h = `$\\klambdaone = ${l1}$ and $\\klambdatwo = ${num3(E.l2)}$ share an absolute value, so neither direction wins: $\\kvecxkbar$ never settles and the multipliers $m_k$ alternate.`;
    else if (k === 0) h = `Step $0$: $\\kvecxzero = ${pt(x0)}${w ? ` = ${combo(w[0], w[1], '\\kvecvone', '\\kvecvtwo')}` : ''}$; each step multiplies the $\\kvecvone$ part by $\\klambdaone = ${l1}$ and the $\\kvecvtwo$ part by $\\klambdatwo = ${num3(E.l2)}$.`;
    else {
      const close = Math.hypot(S.bars[k][0] - E.v1[0], S.bars[k][1] - E.v1[1]) < 0.005 && Math.abs(S.ms[k] - E.l1) < 0.005;
      h = `Step $${k}$: $\\overline{\\kvecx}_{${k}} = ${pt(S.bars[k].map(r2))}$ and $m_{${k}} = ${num3(S.ms[k])}$; ${close ? `$\\kvecxkbar$ has settled on $\\kvecvone = ${v1T}$ and the multipliers on $\\klambdaone = ${l1}$` : `the multipliers approach $\\klambdaone = ${l1}$ and $\\kvecxkbar$ swings onto $\\kvecvone = ${v1T}$`}.`;
    }
    headline(ctx, h);
    if (k === 0) ro.set(`\\kvecxzero = ${col(x0)}, \\qquad \\kA = ${kmtx(m)}`, '$\\kvecx_{k+1} = \\kA\\kvecxkbar$ and $\\kvecxkbar = \\frac{1}{m_k}\\kvecxk$, where $m_k$ is the component of $\\kvecxk$ having the largest absolute value.', { form: 'start' });
    else {
      const prev = k === 1 ? '\\kvecxzero' : `\\overline{\\kvecx}_{${k - 1}}`;
      const note = !E ? 'The multipliers $m_k$ approach no limit: the eigenvalues are complex.' : onv2 ? `$m_k \\to \\klambdatwo = ${num3(E.l2)}$: the start on $\\kvecvtwo$ never leaves it.` : E.tie ? 'The multipliers alternate: no eigenvalue dominates.' : `$m_k \\to \\klambdaone = ${l1}$, the dominant eigenvalue; the left arrow is $\\kAk\\kvecxzero = ${pt(S.raw[k].map(r2))}$, which only grows.`;
      ro.set(`\\kvecx_{${k}} = \\kA${prev} = ${kmtx(m)} ${col(S.bars[k - 1])} = ${col(S.xs[k])}, \\qquad m_{${k}} = ${num3(S.ms[k])}, \\qquad \\overline{\\kvecx}_{${k}} = \\frac{1}{m_{${k}}}\\kvecx_{${k}} = ${col(S.bars[k])}`, note, { form: 'step' });
    }
  }
  register(d.fig, { update: (dt) => cy.step(dt, () => 1 / PER), draw });
})();
/* ---------- Figure 5.2.3: the number line of the inverse power method on A − sI ----------
   The book's number line from −20 to 20 with λ₁ and λ₂ of Activity 5.2.4's 4 × 4 matrix marked and the ranges
   [λ₂, λ₁] and [−λ₁, −λ₂] shaded, where the other eigenvalues must lie. The shift s is a slider (−20 to 20 by 0.25,
   the book's s = 2 the default, a special at 0, the inverse power method itself); the step k is the clock, twelve
   steps at 0.45 s each, then a hold of 1.5 s: the estimate 1/m_k + s walks along the line into the eigenvalue of A
   closest to s, which lights up when reached, and a graph below plots the estimate against the step. The matrix is a
   select of four: the activity's 4 × 4, Activity 5.2.3 g's 2 × 2, Exercise 5.2.2 c's 4 × 4 and Exercise 5.2.4's
   [0 −1; −4 0], whose eigenvalues ±2 share an absolute value. The eigenvalues of the four are the book's, computed
   once (answers.py in the task's scratch); the iteration solves (A − sI)x_k = x̄_{k−1} by elimination with partial
   pivoting from x₀ = e₁. */
(function () {
  const d = sim('sim-eigenvalue-line', 660);
  const N = 12, PER = 0.45, LO = -20, HI = 20;
  const NL = { l: 120, r: 1280, y: 252 }, GB = { l: 160, r: 1280, t: 380, b: 600 };
  const MATS = {
    a524: { label: 'Activity 5.2.4: 4 × 4', A: [[3.6, 1.6, 4.0, 7.6], [1.6, 2.2, 4.4, 4.1], [3.9, 4.3, 9.0, 0.6], [7.6, 4.1, 0.6, 5.0]], eig: [-4.8233, 0.7459, 7.5265, 16.3509] },
    a523g: { label: 'Activity 5.2.3 g: [−0.23 −2.33; −1.16 1.08]', A: [[-0.23, -2.33], [-1.16, 1.08]], eig: [-1.3447, 2.1947] },
    e522c: { label: 'Exercise 5.2.2 c: 4 × 4', A: [[1.9, -16.0, -13.0, 27.0], [-2.4, 20.3, 4.6, -17.7], [-0.51, -11.7, -1.4, 13.1], [-2.1, 15.3, 6.9, -20.5]], eig: [-14.014, -1.5301, 4.6178, 11.2263] },
    e524: { label: 'Exercise 5.2.4: [0 −1; −4 0]', A: [[0, -1], [-4, 0]], eig: [-2, 2] },
  };
  const cy = cycle(() => N, 1.5);
  const reset = () => cy.reset();
  const pick = select(d.controls, { label: 'matrix', key: 'matrix', value: 'a524', aria: 'the matrix whose eigenvalues are sought', options: Object.entries(MATS).map(([value, p]) => ({ value, label: p.label })), onInput: reset });
  const sS = ctl(d.controls, { label: 's', cls: '', key: 's', min: LO, max: HI, step: 0.25, value: 2, unit: '', dec: 2, aria: 'the shift s: the inverse power method is applied to A − sI', specials: [{ at: 0, label: 'inverse power method' }], onInput: reset });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  /* solve Bx = b by elimination with partial pivoting; null when B is singular */
  function solve(B, b) {
    const n = b.length, M = B.map((r, i) => [...r, b[i]]);
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      if (Math.abs(M[p][c]) < 1e-12) return null;
      [M[c], M[p]] = [M[p], M[c]];
      for (let r = c + 1; r < n; r++) { const f = M[r][c] / M[c][c]; for (let j = c; j <= n; j++) M[r][j] -= f * M[c][j]; }
    }
    const x = new Array(n).fill(0);
    for (let r = n - 1; r >= 0; r--) { let s = M[r][n]; for (let j = r + 1; j < n; j++) s -= M[r][j] * x[j]; x[r] = s / M[r][r]; }
    return x;
  }
  /* the N estimates 1/m_k + s from x₀ = e₁, or {singular: true} */
  function run(A, s) {
    const n = A.length, B = A.map((r, i) => r.map((v, j) => v - (i === j ? s : 0)));
    let x = new Array(n).fill(0); x[0] = 1;
    const est = [], ms = [];
    for (let k = 1; k <= N; k++) {
      const y = solve(B, x); if (!y) return { singular: true, est, ms };
      let m = y[0]; y.forEach((v) => { if (Math.abs(v) > Math.abs(m)) m = v; });
      x = y.map((v) => v / m); ms.push(m); est.push(1 / m + s);
    }
    return { singular: false, est, ms };
  }
  const X = (v) => NL.l + ((v - LO) / (HI - LO)) * (NL.r - NL.l);

  function draw() {
    const { ctx } = begin(d.c);
    const mc = C('matrix'), ec = C('eigenvalue'), ink = PAL.ink, mu = PAL.muted;
    const g = ease.smooth(arrival(d));
    const P = MATS[pick.value], s = rnd(sS.v, 100), A = P.A, eig = P.eig;
    const abs = eig.map(Math.abs), dom = eig.filter((l) => Math.abs(Math.abs(l) - Math.max(...abs)) < 1e-9), small = eig.filter((l) => Math.abs(Math.abs(l) - Math.min(...abs)) < 1e-9);
    const l1 = dom.length === 1 ? dom[0] : null, l2 = small.length === 1 ? small[0] : null;   /* null where two eigenvalues share the extreme absolute value and the method does not settle */
    const tau = cy.now(), k = Math.min(N, Math.floor(tau + 1e-9)), fr = ease.smooth(Math.min(1, tau - k));
    const R = run(A, s), dists = eig.map((l) => Math.abs(l - s)), near = eig[dists.indexOf(Math.min(...dists))];
    const sorted = [...dists].sort((a, b) => a - b), tie = eig.length > 1 && Math.abs(sorted[0] - sorted[1]) < 1e-9;
    const estAt = (j) => (j <= 0 ? s : R.est[Math.min(j, R.est.length) - 1]);
    const shown = k >= N || k >= R.est.length ? estAt(k) : lerp(estAt(k), estAt(k + 1), fr);
    hits = [];
    /* the number line */
    const yL = NL.y;
    text(ctx, 'the real number line, where the eigenvalues of $\\kA$ lie', (NL.l + NL.r) / 2, yL - 124, mu, { size: 20, align: 'center', tex: true });
    ctx.save(); ctx.globalAlpha *= g;
    (l1 !== null && l2 !== null ? [[Math.abs(l2), Math.abs(l1)], [-Math.abs(l1), -Math.abs(l2)]] : []).forEach(([a, b]) => {
      if (b - a < 1e-9) return;
      ctx.fillStyle = alpha(ink, 0.1); ctx.fillRect(X(a), yL - 30, X(b) - X(a), 60);
      hits.push({ x: (X(a) + X(b)) / 2, y: yL - 18, r: 16, name: `between ${numT(a)} and ${numT(b)}: every other eigenvalue has absolute value between |λ₂| = ${num3T(Math.abs(l2))} and |λ₁| = ${num3T(Math.abs(l1))}` });
    });
    line(ctx, NL.l, yL, NL.r, yL, ink, 3);
    for (let v = LO; v <= HI; v += 5) { line(ctx, X(v), yL - 8, X(v), yL + 8, ink, 2); text(ctx, numT(v), X(v), yL + 28, mu, { size: 17, align: 'center' }); }
    ctx.restore();
    /* the eigenvalues: λ₁ and λ₂ known, the others lit once the estimate has reached them */
    const found = R.est.length ? R.est.slice(0, Math.max(0, Math.min(k, R.est.length))) : [];
    eig.forEach((l) => {
      const known = (l1 !== null && l === l1) || (l2 !== null && l === l2), lit = known || found.some((e) => Math.abs(e - l) < 0.02);
      const stay = l1 !== null && l === l1 ? 1 : l2 !== null && l === l2 ? 2 : 0;
      ctx.save(); ctx.globalAlpha *= g * (lit ? 1 : 0.18);
      line(ctx, X(l), yL - 22, X(l), yL + 22, ec, lit ? 5 : 3);
      ctx.restore();
      if (lit) tag(ctx, stay ? `$\\klambda${stay === 1 ? 'one' : 'two'} = ${num(l)}$` : `$${num(l)}$`, Math.min(Math.max(X(l), NL.l + 40), NL.r - 40), yL - 56 + (stay === 2 && l1 !== null && Math.abs(X(l1) - X(l2)) < 130 ? -32 : 0), ec, 'center', 20);
      hits.push({ x: X(l), y: yL, r: 14, name: stay === 1 ? `λ₁ = ${num3T(l)}, the dominant eigenvalue, found by the power method` : stay === 2 ? `λ₂ = ${num3T(l)}, the eigenvalue of smallest absolute value, found by the inverse power method` : lit ? `${num3T(l)}: an eigenvalue of A, reached by the estimate` : `an eigenvalue of A not yet found` });
    });
    /* the shift and the estimate */
    ctx.save(); ctx.globalAlpha *= g;
    ctx.fillStyle = ink; ctx.beginPath(); ctx.moveTo(X(s), yL + 10); ctx.lineTo(X(s) - 9, yL + 26); ctx.lineTo(X(s) + 9, yL + 26); ctx.closePath(); ctx.fill();
    ctx.restore();
    tag(ctx, `$s = ${num(s)}$`, Math.min(Math.max(X(s), NL.l + 40), NL.r - 40), yL + 56, ink, 'center', 20);
    hits.push({ x: X(s), y: yL + 18, r: 14, name: `s = ${numT(s)}: the inverse power method is applied to A − sI and finds the eigenvalue of A closest to s` });
    if (!R.singular && R.est.length && tau > 0) {
      const px = Math.min(Math.max(X(shown), NL.l), NL.r);
      dot(ctx, px, yL, PAL.panel, true, 13); dot(ctx, px, yL, ec, true, 9);
      hits.push({ x: px, y: yL, r: 16, name: `the estimate 1/m${sub(k)} + s = ${num3T(estAt(k))} after ${k} step${k === 1 ? '' : 's'}` });
    }
    /* the graph of the estimate against the step */
    const ax = axes(ctx, GB, [0, N], [LO, HI], { xl: 'step k', yl: 'estimate', yc: ec, nx: 6, ny: 4, fx: (q) => fmt(q, 0), fy: (q) => fmt(q, 0) });
    if (!R.singular && !tie) { ctx.save(); ctx.globalAlpha *= g; line(ctx, GB.l, ax.Y(near), GB.r, ax.Y(near), alpha(ec, 0.5), 2, [10, 10]); ctx.restore(); hits.push({ x: GB.l + 50, y: ax.Y(near), r: 12, name: `${num3T(near)}, the eigenvalue of A closest to s` }); }
    if (!R.singular && R.est.length) {
      ctx.save(); ctx.globalAlpha *= g; ctx.beginPath(); ctx.rect(GB.l, GB.t, GB.r - GB.l, GB.b - GB.t); ctx.clip();
      ctx.beginPath(); ctx.moveTo(ax.X(0), ax.Y(s));
      const upto = Math.min(R.est.length, k + (fr > 0 && k < N ? 1 : 0));
      for (let j = 1; j <= upto; j++) { const y = j === upto && j === k + 1 ? lerp(estAt(k), estAt(k + 1), fr) : estAt(j); ctx.lineTo(ax.X(j === upto && j === k + 1 ? k + fr : j), ax.Y(y)); }
      ctx.strokeStyle = alpha(ec, 0.8); ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
      for (let j = 0; j <= Math.min(k, R.est.length); j++) {
        const y = estAt(j), inside = y >= LO && y <= HI;
        if (inside) { dot(ctx, ax.X(j), ax.Y(y), ec, true, j === k ? 9 : 6); hits.push({ x: ax.X(j), y: ax.Y(y), r: 12, name: j === 0 ? `step 0: the estimate starts at s = ${numT(s)}` : `step ${j}: 1/m${sub(j)} + s = ${num3T(y)}` }); }
        else pinned(ctx, GB, ax.X, ax.Y, j, y, ec);
      }
    }
    /* headline and readout */
    const sT = num(s), kT = R.singular ? Math.min(k, R.est.length) : k;
    let h, note;
    if (R.singular) { h = `$s = ${sT}$ is itself an eigenvalue of $\\kA$, so $\\kA - s\\kI$ is not invertible and $(\\kA - s\\kI)\\kvecxk = \\overline{\\kvecx}_{k-1}$ cannot be solved: move $s$ a little.`; note = 'The inverse power method needs an invertible matrix.'; }
    else if (tie) { const two = eig.filter((l) => Math.abs(Math.abs(l - s) - sorted[0]) < 1e-9); h = `$s = ${sT}$ is equally close to the eigenvalues $${num3(two[0])}$ and $${num3(two[1])}$ of $\\kA$, so no eigenvalue of $\\kA - s\\kI$ is closest to $0$: the estimates alternate and never settle.`; note = `Moving $s$ off $${sT}$ breaks the tie, and the estimate settles on whichever eigenvalue is nearer.`; }
    else if (k === 0) { h = `$s = ${sT}$: the inverse power method on $\\kA - ${sT}\\kI$ will find the eigenvalue of $\\kA$ closest to $${sT}$, which is $${num3(near)}$; ${l1 !== null && l2 !== null ? `the power method found $\\klambdaone = ${num3(l1)}$ and the inverse power method $\\klambdatwo = ${num3(l2)}$` : 'the power method and the inverse power method settle on neither eigenvalue of this matrix, since the two share an absolute value'}.`; note = ''; }
    else {
      const e = estAt(k), done = Math.abs(e - near) < 0.0005;
      h = `Step $${k}$ of $${N}$: $\\frac{1}{m_{${k}}} + s = ${num3(e)}$; ${done ? `the estimate has settled on $${num3(near)}$, the eigenvalue of $\\kA$ closest to $s = ${sT}$` : `the estimate is heading for $${num3(near)}$, the eigenvalue of $\\kA$ closest to $s = ${sT}$`}.`;
      note = `$(\\kA - s\\kI)\\kvecx_{${k}} = \\overline{\\kvecx}_{${k - 1}}$ solved, then $\\overline{\\kvecx}_{${k}} = \\frac{1}{m_{${k}}}\\kvecx_{${k}}$; $m_k$ approaches the dominant eigenvalue of $(\\kA - s\\kI)^{-1}$, so $\\frac{1}{m_k}$ approaches the eigenvalue of $\\kA - s\\kI$ closest to $0$ and $\\frac{1}{m_k} + s$ the eigenvalue of $\\kA$ closest to $s$.`;
    }
    headline(ctx, h);
    const sTerm = s < 0 ? `- ${num(-s)}` : `+ ${sT}`;
    if (k === 0 || R.singular || tie) ro.set(`\\klambda \\approx \\frac{1}{m_k} + s, \\qquad s = ${sT}${l1 !== null && l2 !== null ? `, \\qquad \\klambdaone = ${num3(l1)}, \\quad \\klambdatwo = ${num3(l2)}` : ''}`, note, { form: 'start' });
    else ro.set(`\\klambda \\approx \\frac{1}{m_{${k}}} + s = \\frac{1}{${num3(R.ms[k - 1])}} ${sTerm} = ${num3(estAt(k))}`, note, { form: 'step' });
  }
  register(d.fig, { update: (dt) => cy.step(dt, () => 1 / PER), draw });
})();
};
