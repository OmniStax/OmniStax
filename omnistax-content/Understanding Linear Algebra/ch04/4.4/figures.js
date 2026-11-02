/* Figures for section 4.4 Dynamical systems. */
window.OMNISTAX_FIGURES = window.OMNISTAX_FIGURES || {};
window.OMNISTAX_FIGURES['4.4'] = function (root, F) {
const { C, PAL, alpha, ctl, choice, begin, axes, drag, line, arrow, dot, text, headline, register, readout, hover, cycle, ease, fmt, arrival, pinned, presence } = F;
const SP = F.space;
const sim = (id, H) => F.sim(root, id, H);
/* a number as the figure writes it: at most two decimals, no trailing zeros, never −0 */
const r2 = (v) => { const r = Math.round(v * 100) / 100; return Object.is(r, -0) ? 0 : r; };
const r3 = (v) => { const r = Math.round(v * 1000) / 1000; return Object.is(r, -0) ? 0 : r; };
const num = (v) => String(r2(v));
const numT = (v) => num(v).replace('-', '−');            /* the same in figure text, with a true minus */
const col = (a, b) => `\\left[\\begin{array}{r} ${num(a)} \\\\ ${num(b)} \\end{array}\\right]`;
const mtx = (m) => `\\left[\\begin{array}{rr} ${num(m[0])} & ${num(m[1])} \\\\ ${num(m[2])} & ${num(m[3])} \\end{array}\\right]`;
const kmtx = (m) => `\\htmlClass{kv-matrix}{${mtx(m)}}`;
const kcol = (a, b) => `\\htmlClass{kv-vector}{${col(a, b)}}`;
const pt = (v) => `(${numT(v[0])}, ${numT(v[1])})`;      /* in figure text */
const lerp = (a, b, k) => a + (b - a) * k;
const clamp01 = (k) => Math.max(0, Math.min(1, k));
/* y = M x for a 2 × 2 matrix [a b; c d] stored row by row */
const map = (m, p) => [m[0] * p[0] + m[1] * p[1], m[2] * p[0] + m[3] * p[1]];
const mul = (m, n) => [m[0] * n[0] + m[1] * n[2], m[0] * n[1] + m[1] * n[3], m[2] * n[0] + m[3] * n[2], m[2] * n[1] + m[3] * n[3]];
const inv = (m) => { const d = m[0] * m[3] - m[1] * m[2]; return [m[3] / d, -m[1] / d, -m[2] / d, m[0] / d]; };
const tag = (ctx, s, x, y, color, align = 'center', size = 22) => text(ctx, s, x, y, color, { size, weight: 600, tex: true, bg: PAL.panel, align });
const clear = (c) => alpha(c, 0);
const inBox = (ax, p) => { const x = ax.X(p[0]), y = ax.Y(p[1]); return x >= ax.box.l && x <= ax.box.r && y >= ax.box.t && y <= ax.box.b; };

/* A square window of the plane, −n to n each way, with a faint unit grid under its axes. */
function plane(ctx, box, n, o = {}) {
  const U = (box.r - box.l) / (2 * n), cx = (box.l + box.r) / 2, cy = (box.t + box.b) / 2;
  if (!o.nogrid) {
    ctx.save(); ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip();
    for (let i = -n; i <= n; i++) { line(ctx, cx + i * U, box.t, cx + i * U, box.b, alpha(PAL.ink, 0.07), 1.5); line(ctx, box.l, cy - i * U, box.r, cy - i * U, alpha(PAL.ink, 0.07), 1.5); }
    ctx.restore();
  }
  return axes(ctx, box, [-n, n], [-n, n], { nx: o.ticks ?? 2 * n, ny: o.ticks ?? 2 * n, fx: (q) => fmt(q, 0), fy: (q) => fmt(q, 0), xl: o.xl, yl: o.yl });
}
/* the grid of combinations i·v₁ + t·v₂ of the columns of P, −n..n, clipped to the box: the eigenvector coordinate system */
function skewGrid(ctx, ax, Pm, n, w = 1.5) {
  const { X, Y, box } = ax, v1 = [Pm[0], Pm[2]], v2 = [Pm[1], Pm[3]], R = 4 * n;
  ctx.save(); ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip();
  for (let i = -R; i <= R; i++) {
    const a1 = [i * v1[0] - R * v2[0], i * v1[1] - R * v2[1]], b1 = [i * v1[0] + R * v2[0], i * v1[1] + R * v2[1]];
    const a2 = [i * v2[0] - R * v1[0], i * v2[1] - R * v1[1]], b2 = [i * v2[0] + R * v1[0], i * v2[1] + R * v1[1]];
    line(ctx, X(a1[0]), Y(a1[1]), X(b1[0]), Y(b1[1]), alpha(PAL.ink, 0.09), w);
    line(ctx, X(a2[0]), Y(a2[1]), X(b2[0]), Y(b2[1]), alpha(PAL.ink, 0.09), w);
  }
  ctx.restore();
}
/* a polyline of plane points on axes ax, clipped to its box */
function stroke(ctx, ax, pts, color, w, dash) {
  if (pts.length < 2) return;
  const { X, Y, box } = ax;
  ctx.save(); ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip();
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.setLineDash(dash || []); ctx.beginPath();
  pts.forEach((p, i) => { const x = X(Math.max(-40, Math.min(40, p[0]))), y = Y(Math.max(-40, Math.min(40, p[1]))); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
  ctx.stroke(); ctx.restore();
}
/* a small arrowhead on a polyline at the point nearest the fraction f of its length, the way it runs */
function headOn(ctx, ax, pts, f, color) {
  const i = Math.max(1, Math.min(pts.length - 1, Math.round(f * (pts.length - 1)))), p = pts[i], q = pts[i - 1];
  if (!inBox(ax, p)) return;
  const x2 = ax.X(p[0]), y2 = ax.Y(p[1]), x1 = ax.X(q[0]), y1 = ax.Y(q[1]), L = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / L, uy = (y2 - y1) / L;
  arrow(ctx, x2 - 12 * ux, y2 - 12 * uy, x2 + 2 * ux, y2 + 2 * uy, color, 3.5);
}
/* an arrow of the plane from the origin to h on axes ax, its head pinned at the edge when out */
function vec(ctx, ax, h, color, w = 5, a = 1) {
  const { X, Y, box } = ax, x1 = X(0), y1 = Y(0), x2 = X(h[0]), y2 = Y(h[1]), L = Math.hypot(x2 - x1, y2 - y1);
  if (!(L > 2) || !(a > 0.001)) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip();
  const ux = (x2 - x1) / L, uy = (y2 - y1) / L, hl = Math.min(18, L);
  line(ctx, x1, y1, x2 - ux * hl * 0.6, y2 - uy * hl * 0.6, color, w);
  arrow(ctx, x2 - ux * hl, y2 - uy * hl, x2, y2, color, w);
  ctx.restore();
}
/* a line through the origin along v across the window, clipped */
function lineThrough(ctx, ax, v, color, w = 2.5, dash) {
  const L = Math.hypot(v[0], v[1]) || 1, R = 20;
  stroke(ctx, ax, [[-R * v[0] / L, -R * v[1] / L], [R * v[0] / L, R * v[1] / L]], color, w, dash);
}
/* a label just past the head of the arrow from the origin to h, kept inside the box */
function past(ctx, ax, h, s, color, gap = 28) {
  const { X, Y, box } = ax, x1 = X(0), y1 = Y(0), x2 = X(h[0]), y2 = Y(h[1]), L = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = (x2 - x1) / L, uy = (y2 - y1) / L;
  const lx = Math.min(Math.max(x2 + ux * gap, box.l + 30), box.r - 30), ly = Math.min(Math.max(y2 + uy * gap, box.t + 14), box.b - 14);
  tag(ctx, s, lx, ly, color, ux > 0.55 ? 'left' : ux < -0.55 ? 'right' : 'center');
}
/* The eigenvalues of a 2 × 2 matrix E and its real power Eᵗ in closed form. With two real eigenvalues λ₁ ≠ λ₂ > 0,
   Eᵗ = (λ₁ᵗ(E − λ₂I) − λ₂ᵗ(E − λ₁I))/(λ₁ − λ₂); with a repeated λ > 0, Eᵗ = λᵗ(I + t(E − λI)/λ); with a complex pair
   a ± bi, E = aI + bJ where J² = −I, so Eᵗ = rᵗ(cos(tθ)I + sin(tθ)J) with r = |a + bi| and θ = arg(a + bi). */
function analyse(E) {
  const tr = E[0] + E[3], det = E[0] * E[3] - E[1] * E[2], disc = tr * tr - 4 * det, eps = 1e-9;
  const o = { E, tr, det };
  if (disc < -eps) { o.real = false; o.a = tr / 2; o.b = Math.sqrt(-disc) / 2; o.r = Math.hypot(o.a, o.b); o.th = Math.atan2(o.b, o.a); return o; }
  const s = Math.sqrt(Math.max(0, disc));
  o.real = true; o.l1 = (tr + s) / 2; o.l2 = (tr - s) / 2; o.rep = s < 1e-6;
  return o;
}
function powerOf(S) {
  const E = S.E, I = [1, 0, 0, 1];
  if (!S.real) {
    const J = [(E[0] - S.a) / S.b, E[1] / S.b, E[2] / S.b, (E[3] - S.a) / S.b];
    return (t) => { const g = Math.pow(S.r, t), c = Math.cos(t * S.th) * g, s = Math.sin(t * S.th) * g; return [c * I[0] + s * J[0], s * J[1], s * J[2], c * I[3] + s * J[3]]; };
  }
  const l1 = Math.max(1e-6, S.l1), l2 = Math.max(1e-6, S.l2);
  if (S.rep) { const N = [(E[0] - l1) / l1, E[1] / l1, E[2] / l1, (E[3] - l1) / l1]; return (t) => { const g = Math.pow(l1, t); return [g * (1 + t * N[0]), g * t * N[1], g * t * N[2], g * (1 + t * N[3])]; }; }
  const A1 = [E[0] - l2, E[1], E[2], E[3] - l2], A2 = [E[0] - l1, E[1], E[2], E[3] - l1], dl = l1 - l2;
  return (t) => { const g1 = Math.pow(l1, t) / dl, g2 = Math.pow(l2, t) / dl; return [g1 * A1[0] - g2 * A2[0], g1 * A1[1] - g2 * A2[1], g1 * A1[2] - g2 * A2[2], g1 * A1[3] - g2 * A2[3]]; };
}
/* the trajectory through s under Eᵗ, sampled on [t0, t1], cut where it runs far outside the window */
function traj(pow, s, t0, t1, n, lim = 9) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const t = t0 + (t1 - t0) * i / n, p = map(pow(t), s); pts.push(p); }
  return pts;
}

/* ---------- Figure 4.4.1 with the unnumbered pair before it: the two species, year by year ----------
   Left, the coordinates of the basis 𝓑 of eigenvectors, where each year is D = diag(1.3, 0.5): the state slides
   along the curve (1.3ᵗ c₁, 0.5ᵗ c₂) toward the horizontal axis. Right, the standard plane with the grid of
   v₁ = [2, 1], v₂ = [−2, 1], where each year is A = [0.9 0.8; 0.2 0.9]: the same motion carried by P, toward the
   line of v₁, the eigenspace E_{1.3}. The book's family of 24 trajectories stands faint behind the reader's own,
   whose start x₀ = (R₀, S₀) is dragged on the right plane or set on its sliders (0 to 6 by 0.5, the book's (2, 3)
   the default, a detent at 4 for the activity's (4, 4)). The year k is the clock: five years at 0.8 s each, then
   a hold of 1.2 s; the point glides along the smooth curve through the iterates, which stay dotted. Both planes
   are the book's window, −6 to 6 each way. */
(function () {
  const d = sim('sim-phase-portrait', 770);
  const N = 6, W = 456, T0 = 200;
  const LB = { l: 84, r: 84 + W, t: T0, b: T0 + W }, RB = { l: 1316 - W, r: 1316, t: T0, b: T0 + W };
  const V1 = [2, 1], V2 = [-2, 1], L1 = 1.3, L2 = 0.5;
  const Pm = [V1[0], V2[0], V1[1], V2[1]], Pinv = inv(Pm), A = [0.9, 0.8, 0.2, 0.9], Dm = [L1, 0, 0, L2];
  const K = 5, PER = 0.8;
  /* the book's seeds, in the coordinates of 𝓑 */
  const SEEDS = [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [1, 0], [1, -1], [2, -2], [3, -3], [4, -4], [5, -5], [0, -1], [-1, -1], [-2, -2], [-3, -3], [-4, -4], [-5, -5], [-1, 0], [-1, 1], [-2, 2], [-3, 3], [-4, 4], [-5, 5], [0, 1]];
  const g = (c, t) => [Math.pow(L1, t) * c[0], Math.pow(L2, t) * c[1]];
  const FAMILY = SEEDS.map((c) => traj((t) => [Math.pow(L1, t), 0, 0, Math.pow(L2, t)], c, -5, 7, 120));
  const cy = cycle(() => K, 1.2);
  const reset = () => cy.reset();
  const R0 = ctl(d.controls, { label: 'R_0', cls: '', key: 'r0', min: 0, max: 6, step: 0.5, value: 2, unit: '', dec: 1, aria: 'the initial population of species R, in thousands', detents: [4], onInput: reset });
  const S0 = ctl(d.controls, { label: 'S_0', cls: '', key: 's0', min: 0, max: 6, step: 0.5, value: 3, unit: '', dec: 1, aria: 'the initial population of species S, in thousands', detents: [4], onInput: reset });
  const P = drag(d, { x: R0, y: S0 });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);

  function draw() {
    const { ctx } = begin(d.c);
    const vc = C('vector'), cc = C('curve'), pc = C('point'), rc = C('region'), c1 = F.ref('v-1'), c2 = F.ref('v-2'), ink = PAL.ink, mu = PAL.muted;
    const ar = ease.smooth(arrival(d));
    const tau = cy.now(), k = Math.min(K, Math.floor(tau + 1e-9));
    const x0 = [r2(R0.v), r2(S0.v)], c = map(Pinv, x0);
    const xk = map(Pm, g(c, k)), cur = map(Pm, g(c, tau)), curB = g(c, tau);
    hits = [];
    const axL = plane(ctx, LB, N, { ticks: 6, xl: 'first coordinate', yl: 'second coordinate' });
    const axR = plane(ctx, RB, N, { ticks: 6, nogrid: true, xl: 'R', yl: 'S' });
    skewGrid(ctx, axR, Pm, N);
    text(ctx, 'in the coordinates of $\\mathcal{B}$: $\\{\\mathbf{x}_k\\}_{\\mathcal{B}} = \\kD^k\\{\\mathbf{x}_0\\}_{\\mathcal{B}}$', (LB.l + LB.r) / 2, LB.t - 50, mu, { size: 20, align: 'center', tex: true });
    text(ctx, 'in the standard plane: $\\kvecxk = \\kAk\\kvecxzero$', (RB.l + RB.r) / 2, RB.t - 50, mu, { size: 20, align: 'center', tex: true });
    /* the eigenspaces, the eigenvectors, and the family of trajectories */
    ctx.save(); ctx.globalAlpha *= ar;
    lineThrough(ctx, axR, V1, alpha(rc, 0.8), 2.5); lineThrough(ctx, axR, V2, alpha(rc, 0.8), 2.5);
    FAMILY.forEach((pts, i) => {
      stroke(ctx, axL, pts, alpha(cc, 0.3), 2.2);
      const img = pts.map((p) => map(Pm, p));
      stroke(ctx, axR, img, alpha(cc, 0.3), 2.2);
      headOn(ctx, axL, pts, 0.45, alpha(cc, 0.5)); headOn(ctx, axR, img, 0.45, alpha(cc, 0.5));
      const mid = pts[54], midR = img[54];
      if (inBox(axL, mid)) hits.push({ x: axL.X(mid[0]), y: axL.Y(mid[1]), r: 10, name: `a trajectory in the coordinates of 𝓑, through ${pt(SEEDS[i])}: each year scales it by 1.3 across and 0.5 up` });
      if (inBox(axR, midR)) hits.push({ x: axR.X(midR[0]), y: axR.Y(midR[1]), r: 10, name: `the same trajectory in the standard plane, through ${pt(map(Pm, SEEDS[i]))}: it bends toward the line of v₁` });
    });
    vec(ctx, axR, V1, c1, 5); vec(ctx, axR, V2, c2, 5);
    ctx.restore();
    if (ar > 0.99) { past(ctx, axR, V1, '$\\kvecvone$', c1); past(ctx, axR, V2, '$\\kvecvtwo$', c2); }
    /* the eigenspace labels, at the window's edge along each line */
    const edgeL = (v, lab, color, s) => tag(ctx, lab, axR.X(s * v[0]), axR.Y(s * v[1]) - 22, color, 'center', 19);
    edgeL(V1, '$E_{1.3}$', rc, -5.3 / Math.hypot(V1[0], V1[1])); edgeL(V2, '$E_{0.5}$', rc, 5.3 / Math.hypot(V2[0], V2[1]));
    hits.push({ x: axR.X(4), y: axR.Y(2), r: 14, name: 'E₁.₃, the eigenspace of λ₁ = 1.3: the line of v₁, which every trajectory approaches' });
    hits.push({ x: axR.X(-4), y: axR.Y(2), r: 14, name: 'E₀.₅, the eigenspace of λ₂ = 0.5: the line of v₂, along which the trajectories are squeezed toward the origin' });
    hits.push({ x: axR.X(V1[0]), y: axR.Y(V1[1]), r: 14, name: 'v₁ = (2, 1), the eigenvector with eigenvalue 1.3' });
    hits.push({ x: axR.X(V2[0]), y: axR.Y(V2[1]), r: 14, name: 'v₂ = (−2, 1), the eigenvector with eigenvalue 0.5' });
    /* the reader's own trajectory, its iterates and the state riding it */
    const own = traj((t) => [Math.pow(L1, t), 0, 0, Math.pow(L2, t)], c, -3, 7, 160), ownR = own.map((p) => map(Pm, p));
    const zero = Math.hypot(x0[0], x0[1]) < 1e-9;
    if (!zero) {
      stroke(ctx, axL, own, cc, 4.5); stroke(ctx, axR, ownR, cc, 4.5);
      for (let j = 0; j <= K; j++) {
        const pb = g(c, j), ps = map(Pm, pb), was = j <= k;
        if (inBox(axL, pb)) { dot(ctx, axL.X(pb[0]), axL.Y(pb[1]), pc, was, 6); hits.push({ x: axL.X(pb[0]), y: axL.Y(pb[1]), r: 12, name: `{x${j === 0 ? '₀' : '_' + j}}_𝓑 = ${pt(pb.map(r2))}` }); }
        if (inBox(axR, ps)) { dot(ctx, axR.X(ps[0]), axR.Y(ps[1]), pc, was, 6); hits.push({ x: axR.X(ps[0]), y: axR.Y(ps[1]), r: 12, name: `x${j === 0 ? '₀' : '_' + j} = (R_${j}, S_${j}) = ${pt(ps.map(r2))}` }); }
      }
      const pL = pinned(ctx, LB, axL.X, axL.Y, curB[0], curB[1], pc), pR = pinned(ctx, RB, axR.X, axR.Y, cur[0], cur[1], pc);
      if (!pL.out) { dot(ctx, pL.x, pL.y, PAL.panel, true, 12); dot(ctx, pL.x, pL.y, pc, true, 8.5); }
      if (!pR.out) { dot(ctx, pR.x, pR.y, PAL.panel, true, 12); dot(ctx, pR.x, pR.y, pc, true, 8.5); }
      hits.push({ x: pL.x, y: pL.y, r: 14, name: `the state in the coordinates of 𝓑 after ${num(tau)} years` });
      hits.push({ x: pR.x, y: pR.y, r: 14, name: `the state (R, S) after ${num(tau)} years` });
      if (inBox(axL, curB) && k === 0) tag(ctx, '$\\{\\mathbf{x}_0\\}_{\\mathcal{B}}$', axL.X(curB[0]) + 10, axL.Y(curB[1]) - 26, vc, 'left', 20);
    }
    P.draw(ctx, axR, clear(pc));
    if (inBox(axR, x0)) { ctx.save(); ctx.strokeStyle = alpha(vc, 0.45); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(axR.X(x0[0]), axR.Y(x0[1]), 17, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); tag(ctx, '$\\kvecxzero$', axR.X(x0[0]) + 12, axR.Y(x0[1]) - 26, vc, 'left', 20); }
    hits.push({ x: axR.X(x0[0]), y: axR.Y(x0[1]), r: 18, name: `x₀ = ${pt(x0)}; drag it to start the species elsewhere` });
    /* headline and readout */
    const ratio = Math.abs(xk[1]) > 1e-9 ? xk[0] / xk[1] : null;
    const c1s = num(c[0]), c2s = num(c[1]), sg = c[1] < 0 ? '-' : '+', c2a = num(Math.abs(c[1]));
    if (zero) headline(ctx, 'With no population of either species, $\\kvecxzero = \\mathbf{0}$ and nothing changes: $\\kvecxk = \\mathbf{0}$ in every year.');
    else headline(ctx, `Year $${k}$: $\\kvecx_{${k}} = 1.3^{${k}}\\cdot ${c1s}\\,\\kvecvone ${sg} 0.5^{${k}}\\cdot ${c2a}\\,\\kvecvtwo = ${pt(xk.map(r2)).replace(/−/g, '-')}$${ratio === null ? ', and $S_{' + k + '} = 0$.' : `, so $R_{${k}}/S_{${k}} = ${num(ratio)}$${Math.abs(ratio - 2) < 0.005 ? ', the ratio $\\kvecvone$ sets.' : ', approaching the $2$ of $\\kvecvone$.'}`}`);
    const Dk = [Math.pow(L1, k), 0, 0, Math.pow(L2, k)];
    if (k === 0) ro.set(`\\kvecxzero = ${kcol(x0[0], x0[1])} = ${c1s}\\,\\kvecvone ${sg} ${c2a}\\,\\kvecvtwo, \\qquad \\{\\mathbf{x}_0\\}_{\\mathcal{B}} = ${kcol(c[0], c[1])}`, `$\\kvecx_{k+1} = \\kA\\kvecxk$ with $\\kA = ${kmtx(A)} = \\kP\\kD\\kPinv$, $\\kD = ${kmtx(Dm)}$.`, { form: 'start' });
    else ro.set(`\\kvecx_{${k}} = \\kA^{${k}}\\kvecxzero = 1.3^{${k}}\\cdot ${c1s}\\,\\kvecvone ${sg} 0.5^{${k}}\\cdot ${c2a}\\,\\kvecvtwo = ${kcol(xk[0], xk[1])}`, `$\\{\\mathbf{x}_{${k}}\\}_{\\mathcal{B}} = \\kD^{${k}}\\{\\mathbf{x}_0\\}_{\\mathcal{B}} = ${kcol(r3(Dk[0] * c[0]), r3(Dk[3] * c[1]))}$: the first coordinate times $1.3$ each year, the second times $0.5$.`, { form: 'year' });
  }
  register(d.fig, { update: (dt) => cy.step(dt, () => 1 / PER), draw });
})();

/* ---------- Figures 4.4.2–4.4.7: the six types ----------
   The type is a choice that loads Activity 4.4.3's matrix E for it, with the activity's P = [1 −1; 1 1]: E's phase
   portrait on the left in the coordinates of 𝓑, A = PEP⁻¹'s on the right on the grid of v₁ = (1, 1), v₂ = (−1, 1).
   Trajectories through 24 seeds on three rings, x(t) = Eᵗs in closed form, so the state points ride them under the
   transport, all leaving their seeds together: six steps at 0.7 s each, then a hold. A change of type glides the
   entries of E to the new matrix over 0.9 s and the portrait morphs through every system between (each has positive
   trace and determinant, so Eᵗ stays real). For a real pair the sliders are λ₁ and λ₂, the diagonal of E, with a
   dashed circle at 1, the threshold of the classification; for a complex pair they are a and b of λ = a + bi, with
   circles where a² + b² = 1, the center. The choice always names the type of the entries as they stand. */
(function () {
  const d = sim('sim-six-types', 790);
  const N = 6, W = 456, T0 = 200;
  const LB = { l: 84, r: 84 + W, t: T0, b: T0 + W }, RB = { l: 1316 - W, r: 1316, t: T0, b: T0 + W };
  const Pm = [1, -1, 1, 1], Pinv = inv(Pm), V1 = [1, 1], V2 = [-1, 1];
  const K = 6, PER = 0.7, GLIDE = 900;
  const TYPES = {
    repellor: { label: 'repellor', E: [1.3, 0, 0, 1.5], part: 'a', fig: '4.4.2' },
    saddle: { label: 'saddle', E: [0.7, 0, 0, 1.5], part: 'c', fig: '4.4.3' },
    attractor: { label: 'attractor', E: [0.3, 0, 0, 0.7], part: 'd', fig: '4.4.4' },
    'spiral repellor': { label: 'spiral repellor', E: [1, -0.9, 0.9, 1], part: 'e', fig: '4.4.5' },
    center: { label: 'center', E: [0, -1, 1, 0], part: 'b', fig: '4.4.6' },
    'spiral attractor': { label: 'spiral attractor', E: [0.6, -0.2, 0.2, 0.6], part: 'f', fig: '4.4.7' },
  };
  const isComplexType = (k) => k === 'center' || k.startsWith('spiral');
  const SEEDS = []; [2, 3.5, 5].forEach((r, j) => { for (let i = 0; i < 8; i++) { const th = (i + (j % 2) * 0.5) * Math.PI / 4; SEEDS.push([r2(r * Math.cos(th)), r2(r * Math.sin(th))]); } });
  const cy = cycle(() => K, 1.2);
  let glide = null;   /* {from, t0} while E glides to the chosen type */
  let lastE = TYPES.repellor.E.slice(), family = 'real';
  const stop = () => { glide = null; cy.reset(); };
  const sliderE = () => (family === 'real' ? [l1.v, 0, 0, l2.v] : [sa.v, -sb.v, sb.v, sa.v]);
  const pick = choice(d.controls, {
    label: 'type', key: 'type', value: 'repellor', aria: 'the type of the dynamical system, each with Activity 4.4.3’s matrix for it',
    options: Object.keys(TYPES).map((k) => ({ value: k, label: TYPES[k].label })),
    onInput: (k) => {
      const E = TYPES[k].E; glide = { from: lastE.slice(), t0: performance.now() };
      family = isComplexType(k) ? 'complex' : 'real';
      if (family === 'real') { l1.set(E[0]); l2.set(E[3]); } else { sa.set(E[0]); sb.set(E[2]); }
      [l1, l2].forEach((s) => s.show(family === 'real')); [sa, sb].forEach((s) => s.show(family === 'complex'));
      [l1, l2, sa, sb].forEach((s) => s.refresh()); cy.reset();
    },
  });
  const unitAt = (f) => () => { const x = f(); return x !== null && Number.isFinite(x) ? x : null; };
  const l1 = ctl(d.controls, { label: '\\klambdaone', cls: 'eigenvalue', key: 'l1', min: 0.05, max: 2, step: 0.05, value: 1.3, unit: '', dec: 2, aria: 'the first eigenvalue, the first diagonal entry of E', specials: [{ at: 1, label: '|λ₁| = 1' }], onInput: stop });
  const l2 = ctl(d.controls, { label: '\\klambdatwo', cls: 'eigenvalue', key: 'l2', min: 0.05, max: 2, step: 0.05, value: 1.5, unit: '', dec: 2, aria: 'the second eigenvalue, the second diagonal entry of E', specials: [{ at: 1, label: '|λ₂| = 1' }], onInput: stop });
  const sa = ctl(d.controls, { label: 'a', cls: '', key: 'a', min: -2, max: 2, step: 0.05, value: 1, unit: '', dec: 2, aria: 'the real part a of the complex eigenvalue a + bi', specials: [{ at: unitAt(() => (sb.v < 1 ? Math.sqrt(1 - sb.v * sb.v) : null)), label: 'center' }, { at: unitAt(() => (sb.v < 1 ? -Math.sqrt(1 - sb.v * sb.v) : null)), label: 'center' }], onInput: stop });
  const sb = ctl(d.controls, { label: 'b', cls: '', key: 'b', min: 0.05, max: 2, step: 0.05, value: 0.9, unit: '', dec: 2, aria: 'the imaginary part b of the complex eigenvalue a + bi', specials: [{ at: unitAt(() => (Math.abs(sa.v) < 1 ? Math.sqrt(1 - sa.v * sa.v) : null)), label: 'center' }], onInput: stop });
  sa.show(false, { ms: 0 }); sb.show(false, { ms: 0 });
  const ro = readout(d);
  const fade = presence(d);
  let hits = [];
  hover(d.stage, () => hits);
  let cacheKey = '', cache = null;
  function picture(S) {
    const key = S.E.map((x) => r3(x)).join(',');
    if (key === cacheKey) return cache;
    const pow = powerOf(S);
    const curves = SEEDS.map((s) => ({ s, pts: traj(pow, s, -8, 8, 200), pow }));
    cacheKey = key; cache = { curves, pow }; return cache;
  }
  /* the type of the entries as they stand, and the sentence for it */
  function kindOf(S) {
    if (S.real) {
      const a1 = Math.abs(S.l1), a2 = Math.abs(S.l2), eps = 1e-9;
      if (Math.abs(a1 - 1) < eps || Math.abs(a2 - 1) < eps) return 'threshold';
      return a1 > 1 && a2 > 1 ? 'repellor' : a1 < 1 && a2 < 1 ? 'attractor' : 'saddle';
    }
    return Math.abs(S.r - 1) < 1e-9 ? 'center' : S.r > 1 ? 'spiral repellor' : 'spiral attractor';
  }

  function draw() {
    const { ctx } = begin(d.c);
    const vc = C('vector'), cc = C('curve'), pc = C('point'), rc = C('region'), ec = C('eigenvalue'), ink = PAL.ink, mu = PAL.muted;
    const ar = ease.smooth(arrival(d));
    let E = sliderE(), gliding = false;
    if (glide) {
      const k = clamp01((performance.now() - glide.t0) / GLIDE);
      if (k >= 1) glide = null; else { const s = ease.smooth(k); E = glide.from.map((x, i) => lerp(x, E[i], s)); gliding = true; }
    }
    lastE = E.slice();
    const S = analyse(E), kind = kindOf(S), book = Object.keys(TYPES).find((k) => TYPES[k].E.every((x, i) => Math.abs(x - E[i]) < 1e-9));
    if (!gliding && kind !== 'threshold' && pick.value !== kind) pick.set(kind);
    const tau = cy.now(), kk = Math.min(K, Math.floor(tau + 1e-9));
    const Am = mul(mul(Pm, E), Pinv), pic = picture(S);
    hits = [];
    const axL = plane(ctx, LB, N, { ticks: 6 }), axR = plane(ctx, RB, N, { ticks: 6, nogrid: true });
    skewGrid(ctx, axR, Pm, N);
    text(ctx, 'the phase portrait of $\\kE$, in the coordinates of $\\mathcal{B}$', (LB.l + LB.r) / 2, LB.t - 50, mu, { size: 20, align: 'center', tex: true });
    text(ctx, 'the phase portrait of $\\kA = \\kP\\kE\\kPinv$, in the standard plane', (RB.l + RB.r) / 2, RB.t - 50, mu, { size: 20, align: 'center', tex: true });
    /* the eigenvector lines, faded away while the eigenvalues are complex */
    fade.show('eig', S.real);
    const ea = fade.a('eig');
    if (ea > 0.01) {
      ctx.save(); ctx.globalAlpha *= ea * ar;
      lineThrough(ctx, axL, [1, 0], alpha(rc, 0.8), 2.5); lineThrough(ctx, axL, [0, 1], alpha(rc, 0.8), 2.5);
      lineThrough(ctx, axR, V1, alpha(rc, 0.8), 2.5); lineThrough(ctx, axR, V2, alpha(rc, 0.8), 2.5);
      vec(ctx, axL, [1, 0], vc, 4.5); vec(ctx, axL, [0, 1], vc, 4.5); vec(ctx, axR, V1, vc, 4.5); vec(ctx, axR, V2, vc, 4.5);
      ctx.restore();
      if (S.real && ea > 0.99) {
        past(ctx, axL, [1, 0], '$\\kveceone$', vc, 24); past(ctx, axL, [0, 1], '$\\kvecetwo$', vc, 24);
        past(ctx, axR, V1, '$\\kvecvone$', vc, 24); past(ctx, axR, V2, '$\\kvecvtwo$', vc, 24);
        hits.push({ x: axR.X(3.8), y: axR.Y(3.8), r: 14, name: `the eigenspace of λ₁ = ${numT(E[0])}: the line of v₁ = (1, 1)` });
        hits.push({ x: axR.X(-3.8), y: axR.Y(3.8), r: 14, name: `the eigenspace of λ₂ = ${numT(E[3])}: the line of v₂ = (−1, 1)` });
        hits.push({ x: axL.X(3.8), y: axL.Y(0), r: 14, name: `the eigenspace of λ₁ = ${numT(E[0])} for E: the first axis` });
        hits.push({ x: axL.X(0), y: axL.Y(3.8), r: 14, name: `the eigenspace of λ₂ = ${numT(E[3])} for E: the second axis` });
      }
    }
    /* the trajectories and the states riding them */
    ctx.save(); ctx.globalAlpha *= ar;
    pic.curves.forEach((cv) => {
      const img = cv.pts.map((p) => map(Pm, p));
      stroke(ctx, axL, cv.pts, alpha(cc, 0.45), 2.5); stroke(ctx, axR, img, alpha(cc, 0.45), 2.5);
      const q = cv.pts[100], qR = img[100];
      if (inBox(axL, q)) hits.push({ x: axL.X(q[0]), y: axL.Y(q[1]), r: 9, name: `a trajectory of E through ${pt(cv.s)}` });
      if (inBox(axR, qR)) hits.push({ x: axR.X(qR[0]), y: axR.Y(qR[1]), r: 9, name: `the same trajectory of A, through ${pt(map(Pm, cv.s).map(r2))}` });
      for (let j = 0; j <= kk; j++) {
        const pb = map(cv.pow(j), cv.s), ps = map(Pm, pb);
        if (inBox(axL, pb)) dot(ctx, axL.X(pb[0]), axL.Y(pb[1]), pc, true, 3.5);
        if (inBox(axR, ps)) dot(ctx, axR.X(ps[0]), axR.Y(ps[1]), pc, true, 3.5);
      }
      const pb = map(cv.pow(tau), cv.s), ps = map(Pm, pb);
      if (inBox(axL, pb)) { dot(ctx, axL.X(pb[0]), axL.Y(pb[1]), PAL.panel, true, 9); dot(ctx, axL.X(pb[0]), axL.Y(pb[1]), pc, true, 6.5); hits.push({ x: axL.X(pb[0]), y: axL.Y(pb[1]), r: 12, name: `the state {x}_𝓑 after ${num(tau)} steps, from ${pt(cv.s)}` }); }
      if (inBox(axR, ps)) { dot(ctx, axR.X(ps[0]), axR.Y(ps[1]), PAL.panel, true, 9); dot(ctx, axR.X(ps[0]), axR.Y(ps[1]), pc, true, 6.5); hits.push({ x: axR.X(ps[0]), y: axR.Y(ps[1]), r: 12, name: `the state x after ${num(tau)} steps` }); }
    });
    ctx.restore();
    dot(ctx, axL.X(0), axL.Y(0), ink, true, 4); dot(ctx, axR.X(0), axR.Y(0), ink, true, 4);
    hits.push({ x: axL.X(0), y: axL.Y(0), r: 12, name: 'the origin' }); hits.push({ x: axR.X(0), y: axR.Y(0), r: 12, name: 'the origin' });
    /* headline and readout */
    const pre = book ? `Activity 4.4.3 ${TYPES[book].part}, Figure ${TYPES[book].fig}. ` : '';
    let head, note;
    if (gliding) { head = `Changing to ${pick.value === 'attractor' ? 'an' : 'a'} ${pick.value}: the entries of $\\kE$ glide to $${mtx(TYPES[pick.value].E)}$ and the portrait follows.`; note = ''; }
    else if (S.real) {
      const L1 = num(E[0]), L2 = num(E[3]);
      if (kind === 'repellor') head = `${pre}Repellor: $|\\klambdaone| = ${L1}$ and $|\\klambdatwo| = ${L2}$ are both greater than $1$, so every trajectory moves away from the origin.`;
      else if (kind === 'attractor') head = `${pre}Attractor: $|\\klambdaone| = ${L1}$ and $|\\klambdatwo| = ${L2}$ are both less than $1$, so every trajectory moves into the origin.`;
      else if (kind === 'saddle') { const big = E[0] > E[3] ? '\\klambdaone' : '\\klambdatwo', vb = E[0] > E[3] ? '\\kvecvone' : '\\kvecvtwo'; head = `${pre}Saddle: $|${E[0] > E[3] ? '\\klambdaone' : '\\klambdatwo'}| = ${E[0] > E[3] ? L1 : L2} > 1 > |${E[0] > E[3] ? '\\klambdatwo' : '\\klambdaone'}| = ${E[0] > E[3] ? L2 : L1}$, so most trajectories converge to the eigenspace of $${big}$, the line of $${vb}$.`; }
      else head = `At the threshold: an eigenvalue is exactly $1$, so points on its eigenspace stay put; the list of six types leaves this case to the next section.`;
      note = kind === 'threshold' ? `$\\klambdaone = ${L1}$, $\\klambdatwo = ${L2}$.` : `$\\klambdaone = ${L1}$ and $\\klambdatwo = ${L2}$: ${kind === 'repellor' ? 'both $|\\klambda| > 1$, a repellor' : kind === 'attractor' ? 'both $|\\klambda| < 1$, an attractor' : 'one $|\\klambda|$ on each side of $1$, a saddle'}.`;
    } else {
      const a = num(S.a), b = num(S.b), r = num(S.r), rx = Math.abs(S.r - r2(S.r)) < 1e-9 ? '=' : '\\approx';
      const lam = `\\klambda = ${a} ${S.a < 0 ? '' : ''}\\pm ${b === '1' ? '' : b}i`;
      if (kind === 'center') head = `${pre}Center: $${lam}$ with $|\\klambda| = \\sqrt{${num(S.a * S.a)} + ${num(S.b * S.b)}} = 1$, so every trajectory moves on a closed curve around the origin, turning by $${num(S.th * 180 / Math.PI)}^\\circ$ a step.`;
      else if (kind === 'spiral repellor') head = `${pre}Spiral repellor: $${lam}$ with $|\\klambda| ${rx} ${r} > 1$, so every trajectory spirals away from the origin, turning by $${num(S.th * 180 / Math.PI)}^\\circ$ and stretching by $${r}$ a step.`;
      else head = `${pre}Spiral attractor: $${lam}$ with $|\\klambda| ${rx} ${r} < 1$, so every trajectory spirals into the origin, turning by $${num(S.th * 180 / Math.PI)}^\\circ$ and shrinking by $${r}$ a step.`;
      note = `$${lam}$, $a^2 + b^2 ${rx === '=' ? '=' : '\\approx'} ${num(S.r * S.r)}$: ${kind === 'center' ? 'a center' : kind === 'spiral repellor' ? 'greater than $1$, a spiral repellor' : 'less than $1$, a spiral attractor'}.`;
    }
    headline(ctx, head.replace(/(\d)-/g, '$1−'));
    ro.set(`\\kA = \\kP\\kE\\kPinv = ${kmtx(Pm)}\\,${kmtx(E)}\\,${kmtx(Pinv)} = ${kmtx(Am)}`, note, { form: S.real ? 'real' : 'complex' });
    void ec;
  }
  register(d.fig, { update: (dt) => cy.step(dt, () => 1 / PER), draw });
})();

/* ---------- Figures 4.4.8 + 4.4.9: a 3 × 3 system settling into its eigenspace ----------
   A mathematical 3D scene (rule 28.3) on F.space3d in the coordinates of the basis 𝓑 of eigenvectors, so each step
   is E: diag(0.6, 0.8, 1.1) for Figure 4.4.8, or the complex pair 0.8 ± 0.5i acting on the x₁x₂-plane as a
   rotation and scaling with λ₃ = 1.1 on the x₃-axis for Figure 4.4.9. The eigenspace E_{λ₃} is the x₃-axis, drawn
   in `region`; the trajectories through the book's seeds (a ring of eight at radius 1 in the plane, the same ring
   lifted to x₃ = 0.5, and the axis itself from (0, 0, 0.5)) are drawn in `curve`, cut where they leave the box, and
   a state point rides each under the transport: sixteen steps at 0.35 s, then a hold. The choice loads the two
   systems; λ₃ is a slider with a dashed circle at 1, where the trajectories stop converging into the line; for the
   real triple λ₁ and λ₂ are sliders, for the complex pair |λ| is, the angle kept at that of 0.8 + 0.5i. Free orbit
   in yaw, the pitch bounded to [−0.3, 1.45]; a flat painted copy stands in without WebGL. */
(function () {
  const d = sim('sim-phase-portrait-3d');
  const box = [[-2.2, 2.2], [-2.2, 2.2], [-0.6, 2.4]];
  const S = F.space3d(d, { box, h: 640, pitch: [-0.3, 1.45], fit: 2.6, turn: -2.0, tilt: 0.5 });
  const K = 16, PER = 0.35, TH = Math.atan2(0.5, 0.8);
  const cy = cycle(() => K, 1.2);
  const reset = () => cy.reset();
  let family = 'real';
  const pick = choice(d.controls, {
    label: 'system', key: 'system', value: 'real', aria: 'the 3 × 3 system, by its eigenvalues',
    options: [{ value: 'real', label: 'λ = 0.6, 0.8, 1.1' }, { value: 'complex', label: 'λ = 0.8 ± 0.5i, 1.1' }],
    onInput: (v) => { family = v; [l1, l2].forEach((s) => s.show(v === 'real')); rr.show(v === 'complex'); if (v === 'real') { l1.set(0.6); l2.set(0.8); } else rr.set(r2(Math.hypot(0.8, 0.5))); l3.set(1.1); [l1, l2, rr, l3].forEach((s) => s.refresh()); cy.reset(); },
  });
  const l1 = ctl(d.controls, { label: '\\klambdaone', cls: 'eigenvalue', key: 'l1', min: 0.1, max: 1.5, step: 0.05, value: 0.6, unit: '', dec: 2, aria: 'the first eigenvalue', specials: [{ at: 1, label: '|λ₁| = 1' }], onInput: reset });
  const l2 = ctl(d.controls, { label: '\\klambdatwo', cls: 'eigenvalue', key: 'l2', min: 0.1, max: 1.5, step: 0.05, value: 0.8, unit: '', dec: 2, aria: 'the second eigenvalue', specials: [{ at: 1, label: '|λ₂| = 1' }], onInput: reset });
  const rr = ctl(d.controls, { label: '|\\klambda|', cls: 'eigenvalue', key: 'r', min: 0.3, max: 1.5, step: 0.01, value: r2(Math.hypot(0.8, 0.5)), unit: '', dec: 2, aria: 'the absolute value of the complex eigenvalue a + bi', specials: [{ at: 1, label: '|λ| = 1' }], onInput: reset });
  const l3 = ctl(d.controls, { label: '\\klambdathree', cls: 'eigenvalue', key: 'l3', min: 0.5, max: 1.5, step: 0.05, value: 1.1, unit: '', dec: 2, aria: 'the third eigenvalue, on the x₃-axis', specials: [{ at: 1, label: '|λ₃| = 1' }], onInput: reset });
  rr.show(false, { ms: 0 });
  const ro = readout(d);
  const RING = Array.from({ length: 8 }, (_, i) => [Math.cos(i * Math.PI / 4), Math.sin(i * Math.PI / 4)]);
  const SEEDS = [...RING.map(([x, y]) => [x, y, 0]), ...RING.map(([x, y]) => [x, y, 0.5]), [0, 0, 0.5]];
  const SEEDS_C = [[1, 0, 0], [-1, 0, 0], [1, 0, 0.5], [0, 1, 0.5], [-1, 0, 0.5], [0, -1, 0.5], [0, 0, 0.5]];
  /* the state at time t from the seed s: in 𝓑-coordinates each coordinate is scaled by its eigenvalue, or the first two turned by θ and scaled by r */
  function flow(par) {
    if (par.real) return (s, t) => [Math.pow(par.l1, t) * s[0], Math.pow(par.l2, t) * s[1], Math.pow(par.l3, t) * s[2]];
    return (s, t) => { const g = Math.pow(par.r, t), c = Math.cos(TH * t), sn = Math.sin(TH * t); return [g * (c * s[0] - sn * s[1]), g * (sn * s[0] + c * s[1]), Math.pow(par.l3, t) * s[2]]; };
  }
  const inside = (p) => p.every((v, i) => v >= box[i][0] - 1e-9 && v <= box[i][1] + 1e-9);
  /* the trajectory through s on [t0, t1], cut where it leaves the box */
  function curveOf(f, s, t0, t1, n) {
    const pts = [];
    for (let i = 0; i <= n; i++) { const p = f(s, t0 + (t1 - t0) * i / n); if (inside(p)) pts.push(p); else if (pts.length) break; }
    return pts;
  }
  const gridPlane = () => { const segs = []; for (let k = -4; k <= 4; k++) { segs.push([[-2, k / 2, 0], [2, k / 2, 0]]); segs.push([[k / 2, -2, 0], [k / 2, 2, 0]]); } return [{ k: 'segs', segs, color: 'guide', w: 1.2, name: 'the x₁x₂-plane of the coordinates of 𝓑' }]; };
  let open = false;

  function draw() {
    const cc = C('curve'), pc = C('point'), rc = C('region'), ec = C('eigenvalue');
    const par = family === 'real' ? { real: true, l1: l1.v, l2: l2.v, l3: l3.v } : { real: false, r: rr.v, l3: l3.v };
    const f = flow(par), seeds = par.real ? SEEDS : SEEDS_C;
    const tau = cy.now(), kk = Math.min(K, Math.floor(tau + 1e-9));
    S.set('axes', SP.axes(box, { ticks: 1, names: ['$x_1$', '$x_2$', '$x_3$'] }));
    S.set('plane', gridPlane());
    S.set('eig', [{ k: 'line', pts: [[0, 0, box[2][0]], [0, 0, box[2][1]]], color: rc, w: 4.5, name: `E_${num(par.l3)}, the eigenspace of λ₃ = ${num(par.l3)}: the x₃-axis` }, { k: 'label', s: `$E_{${num(par.l3)}}$`, p: [0.12, -0.12, 2.25], color: rc }]);
    S.set('curves', seeds.flatMap((s, i) => {
      const pts = curveOf(f, s, -1.4, K, 200);
      return pts.length > 1 ? [{ k: 'line', pts, color: alpha(cc, 0.75), w: 3, name: s[2] === 0 && (s[0] || s[1]) ? 'a trajectory in the x₁x₂-plane: it stays in the plane' : s[0] || s[1] ? `a trajectory from ${s[2]} above the plane: it is drawn onto the x₃-axis` : 'the trajectory on the x₃-axis itself' }] : [];
    }));
    const riders = [], past = [];
    seeds.forEach((s) => {
      const p = f(s, tau);
      if (inside(p)) riders.push({ k: 'dot', p, color: pc, r: 7, name: `the state {x}_𝓑 after ${num(tau)} steps` });
      for (let j = 0; j <= kk; j++) { const q = f(s, j); if (inside(q)) past.push({ k: 'dot', p: q, color: pc, r: 3 }); }
    });
    S.set('past', past);
    S.set('riders', riders);
    /* headline and readout */
    const L3 = num(par.l3), out = par.l3 > 1 + 1e-9, flat3 = Math.abs(par.l3 - 1) < 1e-9;
    const axisWord = out ? `pushed out along the $x_3$-axis, the eigenspace $\\htmlClass{kv-region}{E_{${L3}}}$` : flat3 ? `left where they land on the $x_3$-axis, since $\\klambdathree = 1$` : `drawn down the $x_3$-axis toward the origin as well, since $\\klambdathree = ${L3} < 1$`;
    let head, planeWord;
    if (par.real) {
      const in1 = par.l1 < 1, in2 = par.l2 < 1;
      planeWord = in1 && in2 ? `the $x_1$ and $x_2$ coordinates shrink by $${num(par.l1)}$ and $${num(par.l2)}$ a step, so every trajectory is ${out ? 'drawn onto the $x_3$-axis and' : 'squeezed toward the $x_3$-axis and'}` : `a coordinate in the plane grows ($${in1 ? '\\klambdatwo' : '\\klambdaone'} = ${in1 ? num(par.l2) : num(par.l1)} > 1$), so the trajectories leave the $x_3$-axis instead of converging into it, and are`;
      head = `$\\klambdaone = ${num(par.l1)}$, $\\klambdatwo = ${num(par.l2)}$, $\\klambdathree = ${L3}$: ${planeWord} ${axisWord}.`;
      ro.set(`\\{\\mathbf{x}_{k+1}\\}_{\\mathcal{B}} = \\kE\\{\\mathbf{x}_k\\}_{\\mathcal{B}}, \\qquad \\kE = \\htmlClass{kv-matrix}{\\left[\\begin{array}{rrr} ${num(par.l1)} & 0 & 0 \\\\ 0 & ${num(par.l2)} & 0 \\\\ 0 & 0 & ${L3} \\end{array}\\right]}`, `$\\{\\mathbf{x}_k\\}_{\\mathcal{B}} = \\kE^k\\{\\mathbf{x}_0\\}_{\\mathcal{B}}$: each coordinate is multiplied by its eigenvalue every step.`, { form: 'real' });
    } else {
      const a = par.r * Math.cos(TH), b = par.r * Math.sin(TH), R = num(par.r);
      planeWord = par.r < 1 ? `the complex pair turns the $x_1x_2$-plane by $${num(TH * 180 / Math.PI)}^\\circ$ and shrinks it by $|\\klambda| = ${R}$ a step, so every trajectory spirals in toward the $x_3$-axis and is` : par.r > 1 ? `the complex pair turns the $x_1x_2$-plane by $${num(TH * 180 / Math.PI)}^\\circ$ and stretches it by $|\\klambda| = ${R}$ a step, so the trajectories spiral out away from the $x_3$-axis and are` : `the complex pair turns the $x_1x_2$-plane by $${num(TH * 180 / Math.PI)}^\\circ$ a step with $|\\klambda| = 1$, so the trajectories circle the $x_3$-axis and are`;
      head = `$\\klambda = ${num(a)} \\pm ${num(b)}i$, $\\klambdathree = ${L3}$: ${planeWord} ${axisWord}.`;
      ro.set(`\\{\\mathbf{x}_{k+1}\\}_{\\mathcal{B}} = \\kE\\{\\mathbf{x}_k\\}_{\\mathcal{B}}, \\qquad \\kE = \\htmlClass{kv-matrix}{\\left[\\begin{array}{rrr} ${num(a)} & ${num(-b)} & 0 \\\\ ${num(b)} & ${num(a)} & 0 \\\\ 0 & 0 & ${L3} \\end{array}\\right]}`, `$\\klambda = ${num(a)} \\pm ${num(b)}i$ with $|\\klambda| = ${R}$: the first two coordinates turn and scale together, the third is multiplied by $\\klambdathree$.`, { form: 'complex' });
    }
    S.headline(head.replace(/(\d)-/g, '$1−'));
    if (!open) open = true;
    void ec;
  }
  register(d.fig, { update: (dt) => cy.step(dt, () => 1 / PER), draw });
  void pick;
})();
};
