/* Figures for section 6.5 Orthogonal least squares. */
window.OMNISTAX_FIGURES = window.OMNISTAX_FIGURES || {};
window.OMNISTAX_FIGURES['6.5'] = function (root, F) {
const { C, PAL, alpha, ctl, select, begin, axes, line, dot, text, headline, register, readout, hover, fmt, plot } = F;
const SP = F.space;
const sim = (id, H) => F.sim(root, id, H);
const still = (d, draw) => register(d.fig, { update: () => {}, draw });
/* a number as the figure writes it: at most p decimals, no trailing zeros, never −0 */
const rnd = (v, p = 2) => { const q = 10 ** p, r = Math.round(v * q) / q; return Object.is(r, -0) ? 0 : r; };
const num = (v, p = 2) => String(rnd(v, p));
const numT = (v, p = 2) => num(v, p).replace('-', '−');
/* three significant figures, in TeX, with a power of ten where the number is very large or very small */
function sig(v, n = 3) {
  if (!Number.isFinite(v)) return '\\text{undefined}';
  if (v === 0) return '0';
  const e = Math.floor(Math.log10(Math.abs(v)));
  if (e >= 6 || e <= -4) { const m = v / 10 ** e; return `${String(+m.toFixed(n - 1))}\\times10^{${e}}`; }
  const r = +v.toPrecision(n); return String(Object.is(r, -0) ? 0 : r);
}
const sigT = (v, n = 3) => {
  if (!Number.isFinite(v)) return 'undefined';
  if (v === 0) return '0';
  const e = Math.floor(Math.log10(Math.abs(v)));
  if (e >= 6 || e <= -4) { const m = v / 10 ** e; return `${String(+m.toFixed(n - 1)).replace('-', '−')} × 10^${e}`.replace('^-', '^−'); }
  return String(+v.toPrecision(n)).replace('-', '−');
};
const col = (v, f = num) => `\\left[\\begin{array}{r} ${v.map((x) => f(x)).join(' \\\\ ')} \\end{array}\\right]`;
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
/* the line b + mx as the book writes it: y = b + mx, a slope of 1 unwritten */
const lineTex = (B, M) => `y = ${num(B)} ${rnd(M) < 0 ? '-' : '+'} ${num(Math.abs(M)) === '1' ? '' : num(Math.abs(M))}x`;

/* ---------- the least-squares polynomial of degree k through points (xᵢ, yᵢ) ----------
   The Vandermonde matrix is built in the centred, scaled variable t = (x − c)/s, factored A = QR by
   Householder reflections and solved as Rx̂ = Qᵀb by back substitution (Proposition 6.5.8); the raw
   Vandermonde matrix of years or altitudes is too ill-conditioned for floating point. A column whose
   pivot vanishes (more degree than distinct x's) is left out. The coefficients are then expanded back
   into powers of x for the readout. Returns the fitted function, the fitted values, |b − Ax̂|², |b̃|²,
   R² and x̂ = (β₀, …, β_k). */
function lsq(pts, k) {
  const m = pts.length, xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const c = xs.reduce((a, b) => a + b, 0) / m, s = Math.max(1e-12, ...xs.map((x) => Math.abs(x - c)));
  const n = k + 1, A = xs.map((x) => { const t = (x - c) / s; return Array.from({ length: n }, (_, j) => t ** j); });
  const b = ys.slice(), R = A.map((r) => r.slice());
  const keep = [];
  for (let j = 0, r = 0; j < n && r < m; j++) {
    let nrm = 0; for (let i = r; i < m; i++) nrm += R[i][j] ** 2; nrm = Math.sqrt(nrm);
    if (nrm < 1e-10) continue;
    const alf = R[r][j] > 0 ? -nrm : nrm, v = Array(m).fill(0);
    for (let i = r; i < m; i++) v[i] = R[i][j]; v[r] -= alf;
    const vv = v.reduce((a, q) => a + q * q, 0);
    if (vv > 1e-300) {
      for (let jj = j; jj < n; jj++) { let dt = 0; for (let i = r; i < m; i++) dt += v[i] * R[i][jj]; const f = 2 * dt / vv; for (let i = r; i < m; i++) R[i][jj] -= f * v[i]; }
      let dt = 0; for (let i = r; i < m; i++) dt += v[i] * b[i]; const f = 2 * dt / vv; for (let i = r; i < m; i++) b[i] -= f * v[i];
    }
    if (Math.abs(R[r][j]) < 1e-9) continue;
    keep.push([j, r]); r++;
  }
  const ct = Array(n).fill(0);
  for (let q = keep.length - 1; q >= 0; q--) {
    const [j, r] = keep[q]; let sum = b[r];
    for (let p = q + 1; p < keep.length; p++) sum -= R[r][keep[p][0]] * ct[keep[p][0]];
    ct[j] = sum / R[r][j];
  }
  const f = (x) => { const t = (x - c) / s; let y = 0; for (let j = n - 1; j >= 0; j--) y = y * t + ct[j]; return y; };
  const fit = xs.map(f), mean = ys.reduce((a, q) => a + q, 0) / m;
  const ss = ys.reduce((a, y, i) => a + (y - fit[i]) ** 2, 0), st = ys.reduce((a, y) => a + (y - mean) ** 2, 0);
  /* x̂ in powers of x: Σ ct_j ((x − c)/s)^j expanded */
  const beta = Array(n).fill(0);
  for (let j = 0; j < n; j++) {
    let binom = 1;
    for (let i = 0; i <= j; i++) { beta[i] += ct[j] * binom * (-c) ** (j - i) / s ** j; binom = binom * (j - i) / (i + 1); }
  }
  return { f, fit, ss, st, R2: st > 1e-12 ? 1 - ss / st : NaN, beta, rank: keep.length };
}
/* the line or polynomial as the book writes it, β₀ + β₁x + β₂x² …, three significant figures */
function polyTex(beta, xv = 'x') {
  const terms = [];
  beta.forEach((bj, j) => {
    const r = +(+bj.toPrecision(3)); if (r === 0) return;
    const a = Math.abs(r), sym = j === 0 ? '' : j === 1 ? xv : `${xv}^{${j}}`;
    const mag = j > 0 && a === 1 ? '' : sig(a);
    terms.push({ neg: r < 0, s: `${mag}${sym}` });
  });
  if (!terms.length) return '0';
  return terms.map((t, i) => (i === 0 ? (t.neg ? '-' : '') + t.s : (t.neg ? ' - ' : ' + ') + t.s)).join('');
}

/* ---------- points the reader drags ----------
   Every data point of a scatter plot can be taken and moved: a press within reach of a point holds it,
   the pointer moves it inside its graph's box, and the fit is drawn again. `panels()` returns the
   current boxes, each { ax, pts, map } where map turns a data point into the panel's coordinates and back. */
function grab(d, panels, after) {
  const c = d.c; let held = null;
  const local = (e) => { const r = c.getBoundingClientRect(), H = +(c.dataset.h ?? 0); return r.width && H ? [((e.clientX - r.left) / r.width) * 1400, ((e.clientY - r.top) / r.height) * H] : null; };
  const near = (p) => {
    let best = null, bd = Math.max(26, 20 * 1400 / (c.getBoundingClientRect().width || 1400));
    panels().forEach((P) => { if (!P.ax) return; P.pts.forEach((q, i) => { const [u, v] = P.to ? P.to(q) : q, dd = Math.hypot(P.ax.X(u) - p[0], P.ax.Y(v) - p[1]); if (dd < bd) { bd = dd; best = { P, i }; } }); });
    return best;
  };
  c.style.touchAction = 'none';
  c.addEventListener('pointerdown', (e) => { const p = local(e), h = p && near(p); if (!h) return; e.preventDefault(); held = h; c.setPointerCapture?.(e.pointerId); c.style.cursor = 'grabbing'; });
  c.addEventListener('pointermove', (e) => {
    const p = local(e); if (!p) return;
    if (!held) { c.style.cursor = near(p) ? 'grab' : ''; return; }
    const { P, i } = held, { box, xr, yr } = P.ax;
    const u = xr[0] + ((clamp(p[0], box.l, box.r) - box.l) / (box.r - box.l)) * (xr[1] - xr[0]);
    const v = yr[0] + ((box.b - clamp(p[1], box.t, box.b)) / (box.b - box.t)) * (yr[1] - yr[0]);
    P.pts[i] = P.from ? P.from([u, v]) : [u, v];
    after?.(); d.fig.dispatchEvent(new Event('input'));
  });
  const letGo = () => { if (!held) return; held = null; c.style.cursor = ''; d.fig.dispatchEvent(new Event('change')); };
  c.addEventListener('pointerup', letGo); c.addEventListener('pointercancel', letGo);
}
/* the vertical segments from each point to the fitted curve, in ink */
function gaps(ctx, ax, pts, f, a = 0.45, w = 2.5) {
  const { X, Y, box } = ax;
  ctx.save(); ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip();
  pts.forEach(([x, y]) => line(ctx, X(x), Y(y), X(x), Y(f(x)), alpha(PAL.ink, a), w));
  ctx.restore();
}
/* the dots of a scatter plot, in `point`, hover names beside them */
function scatter(ctx, ax, pts, color, hits, name, to) {
  pts.forEach((q, i) => {
    const [x, y] = to ? to(q) : q, px = ax.X(x), py = ax.Y(y);
    if (px < ax.box.l - 2 || px > ax.box.r + 2 || py < ax.box.t - 2 || py > ax.box.b + 2) return;
    dot(ctx, px, py, color, true, 9);
    hits.push({ x: px, y: py, r: 14, name: name(q, i) });
  });
}
const ordinal = (i) => ['first', 'second', 'third', 'fourth', 'fifth'][i] ?? `${i + 1}th`;

/* ---------- Figure 6.5.1: twenty points and the line that best fits them ----------
   The book's twenty points (`lst-squares-1.xml`) on its window [−1, 4]², with the least-squares line,
   the book's y = 1.1098 + 0.4926x, through them (its two panels are one figure, the line always drawn).
   Any point can be dragged inside the window and the line refits; the vertical gaps from the points to
   the line are drawn faint in ink. Still: nothing here has a clock. */
(function () {
  const d = sim('sim-least-squares-line', 680);
  const PTS = [[-0.3282, 1.0478], [2.8189, 2.4732], [1.4772, 1.8510], [2.2580, 2.3262], [-0.5307, 0.7417], [3.1788, 2.6976], [2.8114, 2.4062], [1.2269, 1.7939], [0.1438, 1.3082], [3.5071, 2.7612], [-0.8728, 0.6990], [3.6957, 2.9432], [0.0830, 1.1470], [-0.8548, 0.6280], [1.1894, 1.7187], [0.1654, 1.1404], [0.0939, 1.1619], [0.4489, 1.2298], [3.1879, 2.7331], [2.2115, 2.1522]];
  const pts = PTS.map((p) => p.slice());
  const BOX = { l: 440, r: 960, t: 110, b: 630 };
  let ax = null, hits = [];
  hover(d.stage, () => hits);
  grab(d, () => [{ ax, pts }]);
  const ro = readout(d);
  still(d, () => {
    const { ctx } = begin(d.c);
    const pc = C('point'), cc = C('curve');
    hits = [];
    ax = axes(ctx, BOX, [-1, 4], [-1, 4], { nx: 5, ny: 5, xl: 'x', yl: 'y' });
    const L = lsq(pts, 1), [b, m] = L.beta;
    gaps(ctx, ax, pts, L.f, 0.35, 2);
    plot(ctx, ax, L.f, cc, { w: 5 });
    scatter(ctx, ax, pts, pc, hits, (q, i) => `data point ${i + 1}: (${numT(q[0])}, ${numT(q[1])}), ${numT(q[1] - L.f(q[0]))} above the line`);
    /* the line's equation in the top left corner of the graph, where the twenty points leave room */
    text(ctx, `$${lineTex(b, m)}$`, BOX.l + 16, BOX.t + 24, cc, { size: 22, weight: 600, align: 'left', tex: true, bg: PAL.panel });
    hits.push({ x: ax.X(1.5), y: ax.Y(L.f(1.5)), r: 12, name: 'the line of best fit: the least sum of squared vertical distances to the points' });
    headline(ctx, `The line $${lineTex(b, m)}$ misses the twenty points by $|\\kvecb - \\kA\\kvecxhat|^2 = ${sig(L.ss)}$, less than any other line.`);
    ro.set(`\\kvecxhat = \\left[\\begin{array}{c} b \\\\ m \\end{array}\\right] = ${col([b, m])},\\quad |\\kvecb - \\kA\\kvecxhat|^2 = ${sig(L.ss)}`);
  });
})();

/* ---------- Figure 6.5.3 + 6.5.6: three points, their line, and the same data at ten times the scale ----------
   Left, Figure 6.5.3 (`line-regress-1`): (1, 1), (2, 1), (3, 3) of Activity 6.5.2 on [−1, 4]², the line of
   best fit y = x − 1/3 and the vertical segments from the points to it in ink, each labelled with its
   length; the points can be dragged. Right, Figure 6.5.6's second panel (`line-regress-10`): the same
   data with every coordinate multiplied by s, on [−s, 4s]², the window following s (the one zoom of the
   plan, ticks on round values). The slider s runs 1 to 10, the book's 10 the default and a dashed special.
   The readout writes |b − Ax̂|² and R² for both: the first grows as s², the second stays. Still. */
(function () {
  const d = sim('sim-three-point-fit', 680);
  const pts = [[1, 1], [2, 1], [3, 3]];
  const LB = { l: 140, r: 600, t: 170, b: 610 }, RB = { l: 820, r: 1280, t: 170, b: 610 };
  const sc = ctl(d.controls, { label: 's', cls: '', key: 'scale', min: 1, max: 10, step: 0.5, value: 10, unit: '', dec: 1, aria: 'the factor every coordinate of the data is multiplied by', specials: [{ at: 10, label: 'the book’s ×10' }] });
  let axL = null, axR = null, hits = [];
  hover(d.stage, () => hits);
  grab(d, () => [{ ax: axL, pts }, { ax: axR, pts, to: (q) => [q[0] * sc.v, q[1] * sc.v], from: (q) => [q[0] / sc.v, q[1] / sc.v] }]);
  const ro = readout(d);
  still(d, () => {
    const { ctx } = begin(d.c);
    const pc = C('point'), cc = C('curve'), s = sc.v;
    hits = [];
    axL = axes(ctx, LB, [-1, 4], [-1, 4], { nx: 5, ny: 5, xl: 'x', yl: 'y' });
    axR = axes(ctx, RB, [-s, 4 * s], [-s, 4 * s], { nx: 5, ny: 5, nice: true, xl: 'x', yl: 'y' });
    text(ctx, 'the data', (LB.l + LB.r) / 2, LB.t - 34, PAL.muted, { size: 20, align: 'center' });
    text(ctx, `every coordinate × ${numT(s, 1)}`, (RB.l + RB.r) / 2, RB.t - 34, PAL.muted, { size: 20, align: 'center' });
    const L = lsq(pts, 1), big = pts.map(([x, y]) => [x * s, y * s]), LS = lsq(big, 1);
    const [b, m] = L.beta;
    gaps(ctx, axL, pts, L.f, 0.8, 3); gaps(ctx, axR, big, LS.f, 0.8, 3);
    plot(ctx, axL, L.f, cc, { w: 5 }); plot(ctx, axR, LS.f, cc, { w: 5 });
    scatter(ctx, axL, pts, pc, hits, (q, i) => `the ${ordinal(i)} data point (${numT(q[0])}, ${numT(q[1])}); its vertical distance to the line is ${numT(Math.abs(q[1] - L.f(q[0])))}`);
    scatter(ctx, axR, pts, pc, hits, (q, i) => `the ${ordinal(i)} data point scaled: (${numT(q[0] * s)}, ${numT(q[1] * s)})`, (q) => [q[0] * s, q[1] * s]);
    /* the length of each vertical segment, beside it on the left panel */
    pts.forEach(([x, y]) => {
      const g = Math.abs(y - L.f(x)); if (g < 0.12) return;
      const ym = (y + L.f(x)) / 2, px = axL.X(x), py = axL.Y(ym);
      if (px < LB.l + 10 || px > LB.r - 60 || py < LB.t + 10 || py > LB.b - 10) return;
      text(ctx, numT(g), px + 12, py, PAL.ink, { size: 17, align: 'left', bg: PAL.panel });
    });
    /* each line's equation in the top left corner of its graph, where the three points leave room */
    const lab = (box, B, M) => text(ctx, `$${lineTex(B, M)}$`, box.l + 16, box.t + 24, cc, { size: 20, weight: 600, align: 'left', tex: true, bg: PAL.panel });
    lab(LB, b, m); lab(RB, LS.beta[0], LS.beta[1]);
    const r2 = (Q) => (Number.isFinite(Q.R2) ? num(Q.R2) : '\\text{undefined}');
    const fr = (Q) => (Number.isFinite(Q.R2) ? `1 - \\frac{${sig(Q.ss)}}{${sig(Q.st)}} = ${r2(Q)}` : '\\text{undefined, since } \\kvecbtilde = \\kveczero');
    headline(ctx, `The line misses the points by $|\\kvecb - \\kA\\kvecxhat|^2 = ${sig(L.ss)}$; scaled by $${num(s, 1)}$ it misses them by $${sig(LS.ss)}$, ${s === 1 ? 'the same' : `${num(s * s, 2)} times as much`}, and $R^2 = ${r2(L)}$ for both.`);
    ro.set(`|\\kvecb - \\kA\\kvecxhat|^2 = ${sig(L.ss)},\\ R^2 = ${fr(L)} \\qquad \\text{scaled by } ${num(s, 1)}\\text{: } |\\kvecb - \\kA\\kvecxhat|^2 = ${sig(LS.ss)},\\ R^2 = ${fr(LS)}`);
  });
})();

/* ---------- Sim: the column space of the three-point problem ----------
   A mathematical 3D scene (rule 28.3) on F.space3d, the box −1 to 4 on each axis, z up, free orbit with
   the pitch bounded to [−0.3, 1.45]. For data points at x = 1, 2, 3 the matrix A = [1 1; 1 2; 1 3] is
   fixed, so Col(A) is the plane through the origin square to n = (1, −2, 1), drawn in `region` with A's
   two columns as thin arrows. The heights y₁, y₂, y₃ are three sliders (the book's 1, 1, 3 the defaults),
   each with a dashed special at the value that puts b on the plane (n·b = 0: the points collinear). b is
   drawn dashed, b̂ = Ax̂ solid, the residual b − b̂ dotted from b̂ to b with a right-angle mark against
   the plane. Still. A flat painted copy stands in without WebGL. */
(function () {
  const d = sim('sim-column-space');
  const box = [[-1, 4], [-1, 4], [-1, 4]];
  const S = F.space3d(d, { box, h: 720, pitch: [-0.3, 1.45], fit: 2.0, turn: -3.77, tilt: 0.62 });
  const N = [1, -2, 1], A1 = [1, 1, 1], A2 = [1, 2, 3];
  const ys = [null, null, null];
  const inR = (t) => (Number.isFinite(t) && t >= -1 - 1e-9 && t <= 4 + 1e-9 ? t : null);
  const spec = [() => inR(2 * ys[1].v - ys[2].v), () => inR((ys[0].v + ys[2].v) / 2), () => inR(2 * ys[1].v - ys[0].v)];
  [1, 1, 3].forEach((v, i) => {
    ys[i] = ctl(d.controls, { label: `y_${i + 1}`, cls: '', key: `y${i + 1}`, min: -1, max: 4, step: 0.25, value: v, unit: '', dec: 2, aria: `the height of the ${ordinal(i)} data point, the ${ordinal(i)} component of b`, specials: [{ at: spec[i], label: 'on the plane: a line through all three points' }] });
  });
  const ro = readout(d);
  still(d, () => {
    const vc = C('vector'), rc = C('region'), mc = C('matrix');
    const bv = ys.map((s) => s.v);
    /* the normal equation AᵀAx̂ = Aᵀb: AᵀA = [3 6; 6 14] */
    const s1 = bv[0] + bv[1] + bv[2], s2 = bv[0] + 2 * bv[1] + 3 * bv[2];
    const det = 3 * 14 - 36, bb = (14 * s1 - 6 * s2) / det, mm = (-6 * s1 + 3 * s2) / det;
    const bh = [bb + mm, bb + 2 * mm, bb + 3 * mm], r = SP.sub(bv, bh), rl = SP.norm(r);
    S.set('axes', SP.axes(box, { ticks: 1, names: ['$y_1$', '$y_2$', '$y_3$'] }));
    S.set('plane', [
      ...SP.plane([0, 0, 0], N, rc, { box, alpha: 0.28 }).map((mk) => ({ ...mk, name: 'Col(A): the plane of all Ax, every line b + mx = y evaluated at x = 1, 2, 3' })),
      { k: 'arrow', a: [0, 0, 0], b: A1, color: alpha(mc, 0.85), w: 3, name: 'the first column of A, [1, 1, 1]' },
      { k: 'arrow', a: [0, 0, 0], b: A2, color: alpha(mc, 0.85), w: 3, name: 'the second column of A, [1, 2, 3]' },
      { k: 'label', s: '$\\kCol(\\kA)$', p: [3.2, 1.8, 0.4], color: rc },
    ]);
    const marks = [
      { k: 'line', pts: [[0, 0, 0], bv], color: vc, w: 4, dash: [10, 8], name: `b = [${bv.map((v) => numT(v)).join(', ')}], the heights of the data points` },
      { k: 'dot', p: bv, color: vc, r: 7, name: `b = [${bv.map((v) => numT(v)).join(', ')}]` },
      { k: 'label', s: '$\\kvecb$', p: SP.add(bv, rl > 0.05 ? SP.mul(SP.unit(r), 0.45) : [0, 0, 0.45]), color: vc },
      { k: 'arrow', a: [0, 0, 0], b: bh, color: vc, w: 5, name: `b̂ = Ax̂ = [${bh.map((v) => numT(v)).join(', ')}], the closest vector of Col(A) to b` },
      { k: 'label', s: '$\\kvecbhat$', p: SP.add(bh, rl > 0.05 ? SP.mul(SP.unit(r), -0.5) : [0.4, -0.4, 0]), color: vc },
    ];
    if (rl > 0.05) {
      marks.push({ k: 'line', pts: [bh, bv], color: vc, w: 4, dash: [3, 7], name: `b − b̂, of squared length ${numT(rl * rl)}, orthogonal to Col(A)` });
      if (rl > 0.35) {
        const ur = SP.unit(r), up = SP.unit(A1), q = 0.28;
        marks.push({ k: 'line', pts: [SP.add(bh, SP.mul(up, q)), SP.add(SP.add(bh, SP.mul(up, q)), SP.mul(ur, q)), SP.add(bh, SP.mul(ur, q))], color: 'ink', w: 2 });
      }
    }
    S.set('vectors', marks);
    const line = lineTex(bb, mm);
    S.headline(rl > 0.005
      ? `$\\kvecb = (${bv.map((v) => num(v)).join(', ')})$ lies off the plane $\\kCol(\\kA)$; its closest vector there is $\\kvecbhat = \\kA\\kvecxhat = (${bh.map((v) => num(v)).join(', ')})$, with $\\kvecxhat = (${num(bb)}, ${num(mm)})$, the line $${line}$.`
      : `$\\kvecb = (${bv.map((v) => num(v)).join(', ')})$ lies in $\\kCol(\\kA)$, so $\\kvecbhat = \\kvecb$: the line $${line}$ passes through all three points.`);
    ro.set(`\\kvecbhat = \\kA\\kvecxhat = \\htmlClass{kv-matrix}{\\left[\\begin{array}{rr} 1 & 1 \\\\ 1 & 2 \\\\ 1 & 3 \\end{array}\\right]} ${col([bb, mm])} = ${col(bh)},\\quad |\\kvecb - \\kvecbhat|^2 = ${num(rl * rl)}`);
  });
})();

/* ---------- Sim: polynomial regression on the section's data sets ----------
   One scatter plot for every data set the section's Sage cells load (a select), the least-squares
   polynomial of degree k drawn through it (k on a slider from 0 to min(11, m − 1), dashed specials at
   the degrees the book uses for that set), the vertical gaps faint in ink, and a prediction x on a
   slider that marks the fitted value, the question the cards ask. The points can be dragged; choosing a
   data set restores it. Windows are fixed per data set (the book's list_plot windows where it gives
   them), the polynomial clipped to the box by `plot`. Data: Activities 6.5.2, 6.5.5, Table 6.5.9, and
   from `ch06/data/` crickets.csv (Activity 6.5.3), sea_ice.csv's 2012 column (Activity 6.5.6, the
   default), bangladesh.csv (Exercise 6.5.7), planets.csv as ln L and ln P (Exercise 6.5.8) and
   altitude-temps.csv (Exercise 6.5.9). Still. */
(function () {
  const d = sim('sim-polynomial-fit', 670);
  const BOX = { l: 170, r: 1300, t: 136, b: 570 };
  const PLANETS = [[0.39, 0.24], [0.72, 0.61], [1.00, 1.00], [1.52, 1.88], [5.20, 11.86], [9.54, 29.46], [19.19, 84.01], [30.06, 164.79], [39.53, 248.54]];
  const SETS = {
    three: { xv: 'x', xa: 'x', step: 0.05, dec: 2, label: 'three points', pts: [[1, 1], [2, 1], [3, 3]], xr: [-1, 4], yr: [-1, 4], k: 1, ks: [1], probe: 2, xl: 'x', yl: 'y', what: 'the three points' },
    four: { xv: 'x', xa: 'x', step: 0.05, dec: 2, label: 'four points', pts: [[0, 2], [1, 1], [2, 3], [3, 3]], xr: [-0.5, 3.5], yr: [0, 4], k: 2, ks: [2, 3], probe: 1.5, xl: 'x', yl: 'y', what: 'the four points' },
    table: { xv: 'x', xa: 'x', step: 0.05, dec: 2, label: 'Table 6.5.9', pts: [[1, 1], [2, 1], [3, 1], [4, 2]], xr: [0, 5], yr: [0, 3], k: 1, ks: [1, 2], probe: 3.5, xl: 'x', yl: 'y', what: 'the four points of Table 6.5.9' },
    crickets: { xv: 'C', xa: 'the chirp rate C', step: 0.1, dec: 1, label: 'crickets', pts: [[20.0, 88.6], [16.0, 71.6], [19.8, 93.3], [18.4, 84.3], [17.1, 80.6], [15.5, 75.2], [14.7, 69.7], [15.7, 71.6], [15.4, 69.4], [16.3, 83.3], [15.0, 79.6], [17.2, 82.6], [16.0, 80.6], [17.0, 83.5], [14.4, 76.3]], xr: [12, 23], yr: [60, 100], k: 1, ks: [1], probe: 22, xl: 'chirps per second', yl: 'temperature (°F)', what: 'the 15 crickets' },
    ice: { xv: 'x', xa: 'the month', step: 0.05, dec: 2, label: 'sea ice, 2012', pts: [[1, 13.73], [2, 14.55], [3, 15.2], [4, 14.63], [5, 13.01], [6, 10.67], [7, 7.67], [8, 4.72], [9, 3.57], [10, 5.89], [11, 9.39], [12, 12.01]], xr: [0, 13], yr: [0, 18], k: 5, ks: [5, 8, 11], probe: 6.5, xl: 'month', yl: 'sea ice extent (millions of km²)', what: 'the 12 months' },
    bangladesh: { xv: 't', xa: 'the year t', step: 1, dec: 0, label: 'Bangladesh', pts: [[1990, 97115487], [1991, 93190282], [1992, 96268982], [1993, 95627988], [1994, 95501823], [1995, 94060109], [1996, 93157160], [1997, 96111201], [1998, 91079158], [1999, 89888449], [2000, 89475245], [2001, 87171255], [2002, 85636155], [2003, 83949183], [2004, 83936648], [2005, 79991525], [2006, 71920671], [2007, 78719467], [2008, 72543169], [2009, 69761553], [2010, 68071508], [2011, 62180414], [2012, 60923202], [2013, 60664947], [2014, 59936385], [2015, 51254335], [2016, 39238736]], xr: [1980, 2050], yr: [-2e7, 1.4e8], k: 1, ks: [1], probe: 1985, xl: 'year', yl: 'people without electricity (millions)', fy: (v) => fmt(v / 1e6, 0), what: 'the 27 years' },
    planets: { xv: '\\ln L', xa: 'ln L', step: 0.01, dec: 2, label: 'planets', pts: PLANETS.map(([L, P]) => [Math.log(L), Math.log(P)]), xr: [-1.5, 4], yr: [-2, 6], k: 1, ks: [1], probe: Math.log(4), xl: 'ln L', yl: 'ln P', what: 'the nine planets' },
    altitude: { xv: 'x', xa: 'the altitude in km', step: 0.5, dec: 1, label: 'altitudes', pts: [[0, 20], [4, -20], [8, -45], [12, -55], [20, -57], [30, -43], [40, -16], [50, -2], [60, -14], [70, -54], [80, -91], [90, -93], [100, -45]], xr: [0, 100], yr: [-110, 30], k: 6, ks: [6], probe: 55, xl: 'altitude (km)', yl: 'temperature (°C)', what: 'the 13 altitudes' },
  };
  let key = 'ice', pts = SETS.ice.pts.map((p) => p.slice());
  const kmax = (set) => Math.min(11, set.pts.length - 1);
  const specialsFor = (set) => set.ks.map((v) => ({ at: v, label: 'a degree the book uses' }));
  let kS = null, xS = null;
  select(d.controls, {
    label: 'data', key: 'data', value: 'ice', aria: 'the data set to fit',
    options: Object.keys(SETS).map((v) => ({ value: v, label: SETS[v].label })),
    onInput: (v) => {
      key = v; const set = SETS[v]; pts = set.pts.map((p) => p.slice());
      kS.mark(specialsFor(set)); kS.range({ min: 0, max: kmax(set), step: 1, value: set.k, unit: '', dec: 0 });
      xS.range({ min: set.xr[0], max: set.xr[1], step: set.step, value: set.probe, unit: '', dec: set.dec });
      xS.relabel(set.xv, `the input at which the fit predicts: ${set.xa}`);
    },
  });
  kS = ctl(d.controls, { label: 'k', cls: '', key: 'degree', min: 0, max: 11, step: 1, value: 5, unit: '', dec: 0, aria: 'the degree k of the polynomial', specials: specialsFor(SETS.ice) });
  xS = ctl(d.controls, { label: 'x', cls: '', key: 'probe', min: 0, max: 13, step: 0.05, value: 6.5, unit: '', dec: 2, aria: 'the input at which the fit predicts: the month' });
  let ax = null, hits = [];
  hover(d.stage, () => hits);
  grab(d, () => [{ ax, pts }]);
  const ro = readout(d);
  still(d, () => {
    const { ctx } = begin(d.c);
    const set = SETS[key], pc = C('point'), cc = C('curve');
    const k = Math.min(Math.round(kS.v), kmax(set)), L = lsq(pts, k);
    hits = [];
    ax = axes(ctx, BOX, set.xr, set.yr, { nx: 7, ny: 5, nice: true, xl: set.xl, yl: set.yl, fy: set.fy });
    gaps(ctx, ax, pts, L.f, 0.3, 2);
    plot(ctx, ax, L.f, cc, { w: 5 });
    scatter(ctx, ax, pts, pc, hits, (q) => `data point (${sigT(q[0], 4)}, ${sigT(q[1], 4)}); the fit gives ${sigT(L.f(q[0]), 4)}`);
    /* the prediction: a dashed drop at x and the fitted value on the curve */
    const xp = xS.v, yp = L.f(xp), px = ax.X(xp), inside = yp >= set.yr[0] && yp <= set.yr[1];
    line(ctx, px, BOX.t, px, BOX.b, alpha(PAL.ink, 0.4), 2, [4, 8]);
    if (inside) {
      dot(ctx, px, ax.Y(yp), cc, false, 10);
      const right = px < (BOX.l + BOX.r) / 2;
      const ly = ax.Y(yp) - 24 < BOX.t + 16 ? ax.Y(yp) + 26 : ax.Y(yp) - 24;
      text(ctx, sigT(yp, 3), px + (right ? 16 : -16), ly, cc, { size: 20, weight: 600, align: right ? 'left' : 'right', bg: PAL.panel });
      hits.push({ x: px, y: ax.Y(yp), r: 14, name: `the prediction at ${sigT(xp, 3)}: ${sigT(yp, 3)}` });
    }
    const deg = k === 0 ? 'constant' : k === 1 ? 'line' : k === 2 ? 'quadratic' : k === 3 ? 'cubic' : `degree ${k} polynomial`;
    const formula = k <= 3 ? ` $y = ${polyTex(L.beta, set.xv)}$` : '';
    const r2s = Number.isFinite(L.R2) ? (L.R2 > 0.9995 ? String(+L.R2.toFixed(4)) : num(L.R2, 3)) : 'undefined';
    const thru = L.ss < 1e-9 * Math.max(1, L.st) ? ', passing through every point' : '';
    headline(ctx, `The least-squares ${deg}${formula} fits ${set.what} with $R^2 = ${r2s}$${thru}; at $${set.xv} = ${sig(xp, set.dec === 0 ? 4 : 3)}$ it predicts $${sig(yp)}$.`);
    const frac = Number.isFinite(L.R2) ? `1 - \\frac{${L.ss < 1e-12 * L.st ? '0' : sig(L.ss)}}{${sig(L.st)}} = ${r2s}` : '\\text{undefined}';
    ro.set(`R^2 = 1 - \\frac{|\\kvecb - \\kA\\kvecxhat|^2}{|\\kvecbtilde|^2} = ${frac}`,
      `$\\kvecxhat = (\\beta_0, \\ldots, \\beta_{${k}}) = (${L.beta.map((v) => sig(v)).join(',\\ ')})$`);
  });
})();
};
