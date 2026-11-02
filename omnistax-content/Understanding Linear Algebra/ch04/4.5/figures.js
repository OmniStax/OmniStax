/* Figures for section 4.5 Markov chains and Google's PageRank algorithm. */
window.OMNISTAX_FIGURES = window.OMNISTAX_FIGURES || {};
window.OMNISTAX_FIGURES['4.5'] = function (root, F) {
const { C, PAL, alpha, ctl, choice, begin, axes, line, arrow, dot, text, headline, register, readout, hover, cycle, ease, fmt, arrival } = F;
const SP = F.space;
const sim = (id, H) => F.sim(root, id, H);
/* a probability as the book prints it: three decimals, never −0 */
const r3 = (v) => { const r = Math.round(v * 1000) / 1000; return Object.is(r, -0) ? 0 : r; };
const r2 = (v) => { const r = Math.round(v * 100) / 100; return Object.is(r, -0) ? 0 : r; };
const p3 = (v) => fmt(r3(v), 3);
const num = (v) => String(r2(v));
const col = (xs, f = p3) => `\\left[\\begin{array}{r} ${xs.map(f).join(' \\\\ ')} \\end{array}\\right]`;
const kmtx = (rows) => `\\htmlClass{kv-matrix}{\\left[\\begin{array}{${'r'.repeat(rows[0].length)}} ${rows.map((r) => r.map(num).join(' & ')).join(' \\\\ ')} \\end{array}\\right]}`;
const lerp = (a, b, k) => a + (b - a) * k;
const tup = (xs) => `(${xs.map(p3).join(', ')})`;
/* y = M x for a square matrix stored as rows */
const mul = (M, x) => M.map((row) => row.reduce((s, m, j) => s + m * x[j], 0));
/* the one probability vector q with Mq = q, where E₁ is a line: (M − I)q = 0 with the last equation replaced by the sum 1 */
function steady(M) {
  const n = M.length, A = M.map((row, i) => [...row.map((m, j) => m - (i === j ? 1 : 0)), 0]);
  A[n - 1] = [...Array(n).fill(1), 1];
  for (let c = 0; c < n; c++) {
    let p = c; for (let i = c + 1; i < n; i++) if (Math.abs(A[i][c]) > Math.abs(A[p][c])) p = i;
    if (Math.abs(A[p][c]) < 1e-12) return null;
    [A[c], A[p]] = [A[p], A[c]];
    for (let i = 0; i < n; i++) if (i !== c) { const f = A[i][c] / A[c][c]; if (f) for (let j = c; j <= n; j++) A[i][j] -= f * A[c][j]; }
  }
  return A.map((row, i) => row[n] / row[i]);
}
/* a circle outline and a tinted disc, the node of a network */
function node(ctx, x, y, r, color, label, w = 3) {
  ctx.save(); ctx.fillStyle = alpha(color, 0.16); ctx.strokeStyle = color; ctx.lineWidth = w;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 2 * Math.PI); ctx.fill(); ctx.stroke(); ctx.restore();
  text(ctx, label, x, y, color, { size: 24, weight: 600, align: 'center', tex: true });
}
/* an arrow between two nodes, from rim to rim, shifted off the centre line by off (for a pair of arrows both ways) */
function link(ctx, a, b, r, color, w, off = 0) {
  const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const x1 = a.x + ux * (r + 2) + nx * off, y1 = a.y + uy * (r + 2) + ny * off, x2 = b.x - ux * (r + 4) + nx * off, y2 = b.y - uy * (r + 4) + ny * off;
  arrow(ctx, x1, y1, x2, y2, color, w);
  return { x: (x1 + x2) / 2 + nx * 14 * Math.sign(off || 1), y: (y1 + y2) / 2 + ny * 14 * Math.sign(off || 1), mx: (x1 + x2) / 2, my: (y1 + y2) / 2 };
}
/* a loop on a node, out along the unit direction (ux, uy), with its arrowhead */
function loop(ctx, c, r, ux, uy, color, w) {
  const R = 17, cx = c.x + ux * (r + R - 3), cy = c.y + uy * (r + R - 3), a0 = Math.atan2(uy, ux);
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(cx, cy, R, a0 + 2.3, a0 - 2.3 + 2 * Math.PI); ctx.stroke(); ctx.restore();
  const e = a0 - 2.3 + 2 * Math.PI, ex = cx + R * Math.cos(e), ey = cy + R * Math.sin(e), tx = -Math.sin(e), ty = Math.cos(e);
  arrow(ctx, ex - tx * 8, ey - ty * 8, ex, ey, color, w);
  return { x: cx + ux * (R + 18), y: cy + uy * (R + 18) };
}

/* Sim: the voting Markov chain of Activity 4.5.2. On the canvas, the three parties' network on the left (the arrows carry
   the live shares) and their percentages P_k, Q_k, R_k as bars on the right, each in its party's colour, the steady-state
   vector q = (0.2, 0.4, 0.4) as a dashed level on each bar. Beneath, in mathematical 3D, the box 0 to 1 on P_k, Q_k, R_k:
   the plane of probability vectors as a faint sheet, the eigenspace E₁ through q in region, and the chain as a point riding
   the curve x(t) = q + 2 Re(c λ₂ᵗ v₂) through the states (so integer t is the book's x_k and the spiral between is the
   book's drawing), its states dotted, with two faint companion chains from e₁ and e₃ as the book draws three. The election
   is the clock: one per 0.55 s, twelve elections, then a hold of 1.5 s; the transport scrubs them. Sliders: P₀ and Q₀ (the
   book's 0.4 and 0.3; R₀ is the rest; a special at 0.2 and 0.4, the steady state, where nothing moves) and s, the fraction
   that stays with its party (the book's 0.6; the leavers split as the book splits them, so q is the same for every s while
   λ₂ = s + (1 − s)(−½ + ½i) sets the spiral; a special at 1, where λ₂ = 1 and the chain stands still). The bars run 0 to 1
   at 300 units to 1; the plane's box on the canvas is fixed. The three parties are referents. */
(function () {
  const d = sim('sim-voting-chain', 470);
  const ELECTIONS = 12, PER = 0.55;
  const NET = { l: 70, r: 560, t: 150, b: 420 }, BAR = { l: 760, r: 1300, t: 150, b: 410 };
  const PARTY = ['party-p', 'party-q', 'party-r'], NAME = ['P', 'Q', 'R'];
  /* the book's node positions, (2, 3), (4, 0), (0, 0) in a window −2 to 6 by −2 to 5 */
  const POS = [[2, 3], [4, 0], [0, 0]].map(([x, y]) => ({ x: NET.l + ((x + 1.5) / 7) * (NET.r - NET.l), y: NET.b - ((y + 1.2) / 5.4) * (NET.b - NET.t) }));
  const box3 = [[0, 1], [0, 1], [0, 1]];
  const S3 = F.space3d(d, { box: box3, h: 470, pitch: [-0.2, 1.45], fit: 2.4, turn: -2.0, tilt: 0.5 });
  const cy = cycle(() => ELECTIONS, 1.5);
  const reset = () => cy.reset();
  let p0, q0;
  p0 = ctl(d.controls, { label: 'P_0', cls: '', key: 'p0', min: 0, max: 1, step: 0.05, value: 0.4, unit: '', dec: 2, aria: 'the fraction voting for party P in election 0', specials: [{ at: 0.2, label: 'the steady state' }], onInput: () => { if (p0.v + q0.v > 1) q0.set(r2(1 - p0.v)); reset(); } });
  q0 = ctl(d.controls, { label: 'Q_0', cls: '', key: 'q0', min: 0, max: 1, step: 0.05, value: 0.3, unit: '', dec: 2, aria: 'the fraction voting for party Q in election 0; the rest vote for R', specials: [{ at: 0.4, label: 'the steady state' }], onInput: () => { if (p0.v + q0.v > 1) p0.set(r2(1 - q0.v)); reset(); } });
  const st = ctl(d.controls, { label: '\\text{stay}', cls: '', key: 'stay', min: 0, max: 1, step: 0.05, value: 0.6, unit: '', dec: 2, aria: 'the fraction of each party’s voters who vote for the same party again', specials: [{ at: 1, label: 'nobody changes party' }], onInput: reset });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits, d.c);
  const Q = [0.2, 0.4, 0.4];
  /* the matrix for a stay fraction s, and λ₂ = s + (1 − s)(−½ + ½ i) */
  const matOf = (s) => [[s, 0, (1 - s) / 2], [1 - s, s, (1 - s) / 2], [0, 1 - s, s]];
  const lam = (s) => ({ re: 1.5 * s - 0.5, im: 0.5 * (1 - s) });
  /* x(t) = q + 2 Re(c λ₂ᵗ v₂) with v₂ = (1, −i, −1 + i): x₀ − q = a Re v₂ + b Im v₂ gives a = (x₀ − q)₁, b = −(x₀ − q)₂, c = (a − ib)/2 */
  function path(x0, s) {
    const a = x0[0] - Q[0], b = -(x0[1] - Q[1]), cr = a / 2, ci = -b / 2, L = lam(s), r = Math.hypot(L.re, L.im), th = Math.atan2(L.im, L.re);
    return (t) => {
      const m = Math.pow(r, t), lr = m * Math.cos(th * t), li = m * Math.sin(th * t);
      const zr = cr * lr - ci * li, zi = cr * li + ci * lr;
      return [Q[0] + 2 * zr, Q[1] + 2 * zi, Q[2] - 2 * zr - 2 * zi];
    };
  }
  const sample = (f, t0, t1, n) => Array.from({ length: n + 1 }, (_, i) => f(t0 + ((t1 - t0) * i) / n));

  function draw() {
    const { ctx } = begin(d.c);
    const ink = PAL.ink, mu = PAL.muted, vc = C('vector'), rc = C('region'), cc = C('curve'), pc = C('point'), ec = C('eigenvalue');
    const g = ease.smooth(arrival(d));
    const s = r2(st.v), x0 = [r2(p0.v), r2(q0.v), r2(1 - p0.v - q0.v)], A = matOf(s), X = path(x0, s);
    const t = cy.now(), K = Math.min(ELECTIONS, Math.floor(t + 1e-9)), now = X(t);
    const cols = PARTY.map((id) => F.ref(id));
    hits = [];
    /* the network: the three parties, the shares on the arrows and the loops */
    text(ctx, 'who votes for whom next time', (NET.l + NET.r) / 2, NET.t - 36, mu, { size: 20, align: 'center' });
    const R = 26, leave = r2(1 - s), half = r2((1 - s) / 2);
    const tagAt = (p, v, c) => text(ctx, num(v), p.x, p.y, c, { size: 20, weight: 600, align: 'center', bg: PAL.panel });
    const pq = link(ctx, POS[0], POS[1], R, cols[0], 3.5, 0), qr = link(ctx, POS[1], POS[2], R, cols[1], 3.5, 0), rp = link(ctx, POS[2], POS[0], R, cols[2], 3.5, 0), rq = link(ctx, POS[2], POS[1], R, cols[2], 3.5, -9);
    tagAt(pq, leave, cols[0]); tagAt(qr, leave, cols[1]); tagAt(rp, half, cols[2]); tagAt({ x: rq.mx, y: rq.my + 22 }, half, cols[2]);
    const LD = [[-0.7, -0.72], [0.72, 0.7], [-0.72, 0.7]];
    POS.forEach((p, i) => { const l = loop(ctx, p, R, LD[i][0], LD[i][1], cols[i], 3); tagAt(l, s, cols[i]); node(ctx, p.x, p.y, R, cols[i], `$${NAME[i]}$`); });
    hits.push({ x: pq.mx, y: pq.my, r: 18, name: `${num(leave * 100)}% of party P’s voters vote for Q next time` }, { x: qr.mx, y: qr.my, r: 18, name: `${num(leave * 100)}% of party Q’s voters vote for R next time` },
      { x: rp.mx, y: rp.my, r: 18, name: `${num(half * 100)}% of party R’s voters vote for P next time` }, { x: rq.mx, y: rq.my, r: 18, name: `${num(half * 100)}% of party R’s voters vote for Q next time` });
    POS.forEach((p, i) => hits.push({ x: p.x, y: p.y, r: R, name: `party ${NAME[i]}: ${num(s * 100)}% of its voters stay with it` }));
    /* the bars: P_k, Q_k, R_k in the parties' colours, q as a dashed level on each */
    const ax = axes(ctx, BAR, [0.4, 3.6], [0, 1], { yl: 'fraction of voters', nx: 0, ny: 5, fy: (q) => fmt(q, 1) });
    text(ctx, `election $${K}$`, (BAR.l + BAR.r) / 2, BAR.t - 36, mu, { size: 20, align: 'center', tex: true });
    const bw = (ax.X(1.3) - ax.X(0.7));
    cols.forEach((c, i) => {
      const xl = ax.X(i + 0.7), v = now[i] * g, top = ax.Y(v);
      ctx.save(); ctx.fillStyle = alpha(c, 0.8); ctx.fillRect(xl, top, bw, ax.Y(0) - top); ctx.restore();
      line(ctx, xl - 8, ax.Y(Q[i]), xl + bw + 8, ax.Y(Q[i]), alpha(ink, 0.45), 2, [10, 10]);
      text(ctx, `$${NAME[i]}_{${K}}$`, xl + bw / 2, ax.Y(0) + 30, c, { size: 22, weight: 600, align: 'center', tex: true });
      text(ctx, p3(now[i]), xl + bw / 2, Math.max(BAR.t + 14, top - 18), c, { size: 20, weight: 600, align: 'center', bg: PAL.panel });
      hits.push({ x: xl + bw / 2, y: (top + ax.Y(0)) / 2, r: 60, name: `${p3(now[i])} of the voters for party ${NAME[i]}${t > K && K < ELECTIONS ? ', between two elections' : ` in election ${K}`}` });
      hits.push({ x: xl + bw + 8, y: ax.Y(Q[i]), r: 12, name: `the steady state: ${num(Q[i])} for party ${NAME[i]}, unchanged by an election` });
    });
    text(ctx, '$\\kvecq$', ax.X(3.6) + 6, ax.Y(Q[2]), vc, { size: 22, weight: 600, align: 'left', tex: true, bg: PAL.panel });
    /* the 3D scene: the plane of probability vectors, E₁, q, the chain's curve and its states */
    S3.set('axes', SP.axes(box3, { ticks: 0.5, names: ['$P_k$', '$Q_k$', '$R_k$'] }));
    S3.set('plane', [{ k: 'faces', faces: [[[1, 0, 0], [0, 1, 0], [0, 0, 1]]], color: ink, alpha: 0.08, name: 'the probability vectors: P + Q + R = 1' },
      { k: 'line', pts: [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 0, 0]], color: alpha(ink, 0.3), w: 1.5 }]);
    S3.set('e1', [{ k: 'line', pts: [[0, 0, 0], [0.5, 1, 1]], color: rc, w: 4, name: 'E₁, the eigenspace of λ₁ = 1: the multiples of v = (1, 2, 2)' },
      { k: 'label', s: '$\\kEone$', p: [0.5, 1, 1], color: rc },
      { k: 'dot', p: Q, color: vc, r: 8, name: 'q = (0.2, 0.4, 0.4), the probability vector in E₁' }, { k: 'label', s: '$\\kvecq$', p: [0.2, 0.4, 0.5], color: vc }]);
    const others = [[1, 0, 0], [0, 0, 1]].flatMap((e) => (e.every((v, i) => Math.abs(v - x0[i]) < 1e-9) ? [] : [{ k: 'line', pts: sample(path(e, s), 0, ELECTIONS, 180), color: alpha(cc, 0.35), w: 2.5, name: `another chain, from x₀ = (${e.join(', ')})` }]));
    S3.set('others', others);
    const whole = sample(X, 0, ELECTIONS, 240), upto = sample(X, 0, Math.max(t, 1e-6), Math.max(2, Math.round(20 * t)));
    S3.set('traj', [{ k: 'line', pts: whole, color: alpha(cc, 0.3), w: 2 }, { k: 'line', pts: upto, color: cc, w: 4, name: 'the chain x₀, x₁, x₂, …: the states, and between them the spiral they lie on' },
      ...Array.from({ length: K + 1 }, (_, k) => ({ k: 'dot', p: X(k), color: pc, r: 5, name: `x${k < 10 ? '₀₁₂₃₄₅₆₇₈₉'[k] : '₁' + '₀₁₂'[k - 10]} = ${tup(X(k))}` })),
      { k: 'label', s: '$\\kvecxzero$', p: [x0[0], x0[1], x0[2] + 0.1], color: vc }]);
    S3.set('now', [{ k: 'dot', p: now, color: pc, r: 9, name: `the state now: ${tup(now)}` }]);
    /* headline and readout */
    const L = lam(s), r = Math.hypot(L.re, L.im), still = s === 1, atQ = x0.every((v, i) => Math.abs(v - Q[i]) < 1e-9);
    const settled = now.every((v, i) => Math.abs(v - Q[i]) < 5e-4);
    const fate = still ? `$\\klambdatwo = 1$, so nothing moves: $\\kvecxk = \\kvecxzero$ for every $k$` : atQ ? `$\\kvecxzero = \\kvecq$ already, and $\\kA\\kvecq = \\kvecq$ keeps it there` : settled ? `the chain has settled at $\\kvecq = (0.2, 0.4, 0.4)$` : `the chain is settling toward $\\kvecq = (0.2, 0.4, 0.4)$`;
    const xk = X(K);
    if (K === 0) headline(ctx, `Election $0$: $\\kvecxzero = ${tup(x0)}$, with ${num(s * 100)}% of each party’s voters staying; ${fate}.`);
    else headline(ctx, `Election $${K}$: $\\mathbf{x}_{${K}} = \\kA\\mathbf{x}_{${K - 1}} = ${tup(xk)}$; ${fate}.`);
    const lamT = `\\klambdaone = 1,\\ \\klambdatwo = ${num(L.re)}${Math.abs(L.im) < 1e-9 ? '' : ` ${L.im < 0 ? '-' : '+'} ${num(Math.abs(L.im))}i`},\\ |\\klambdatwo| = ${num(r)}`;
    const note = still ? `$${lamT}$: with $|\\klambdatwo| = 1$ the chain need not converge, and this one stands still.` : `$${lamT} < 1$: the trajectories spiral into $\\kEone$, and the probability vectors among them converge to $\\kvecq$.`;
    if (K === 0) ro.set(`\\kvecxzero = ${col(x0)}, \\qquad \\kA = ${kmtx(A)}`, note, { form: 'start' });
    else ro.set(`\\mathbf{x}_{${K}} = \\kA\\mathbf{x}_{${K - 1}} = ${kmtx(A)} ${col(X(K - 1))} = ${col(xk)}`, note, { form: 'step' });
    void ec;
  }
  register(d.fig, { update: (dt) => cy.step(dt, () => 1 / PER), draw });
})();

/* Figure 4.5.7 + 4.5.8 + 4.5.9 + 4.5.10 + 4.5.11: four model Internets as a choice, each at the book's node positions, the
   pages in their referent colours, and beside the network one bar per page carrying the Markov chain x_{k+1} = G′x_k from
   x₀ = e₁, with the steady-state vector q as a dashed level on each bar. α mixes G′ = αG + (1 − α)Hₙ (0 to 1, step 0.05;
   default 1, the book's Google matrix G itself, a special there since the cycle stops converging at it; a detent at 0.85,
   Google's value). The step is the clock: one per 0.3 s, 24 steps, then a hold of 1.5 s; the bars ease from state to state
   and the readout prints the states. The links are symbolic and never move. The box of Figure 4.5.11 is drawn round pages
   5–8 of the last Internet. The bars run 0 to 1 at 320 units to 1. The pages are referents. */
(function () {
  const d = sim('sim-pagerank', 580);
  const STEPS = 24, PER = 0.3;
  const NET = { l: 70, r: 660, t: 150, b: 490 }, BAR = { l: 800, r: 1330, t: 150, b: 450 };
  const P8 = [[0, 3], [0, 0], [3, 3], [3, 0], [6, 3], [6, 0], [9, 3], [9, 0]];
  const L8 = [[1, 2], [1, 3], [2, 4], [3, 2], [3, 5], [4, 2], [4, 6], [5, 6], [5, 7], [5, 8], [6, 8], [7, 5], [7, 8], [8, 6], [8, 7]];
  const NETS = {
    three: { label: 'three pages', fig: 'Figure 4.5.7', pos: [[0, 3], [0, 0], [3, 1.5]], bbox: [-1, -1, 4, 4], links: [[1, 2], [2, 1], [1, 3], [3, 1], [3, 2]] },
    eight: { label: 'eight pages', fig: 'Figure 4.5.8', pos: P8, bbox: [-1, -1, 10, 4.5], links: [...L8, [7, 1]], arc: [7, 1] },
    cycle: { label: 'five pages in a cycle', fig: 'Figure 4.5.9', pos: [0, 1, 2, 3, 4].map((k) => [2 * Math.cos((2 * Math.PI * k) / 5), 2 * Math.sin((2 * Math.PI * k) / 5)]), bbox: [-3, -3, 3, 3], links: [[1, 2], [2, 3], [3, 4], [4, 5], [5, 1]] },
    drain: { label: 'eight pages, 7 → 1 removed', fig: 'Figure 4.5.10 + 4.5.11', pos: P8, bbox: [-1, -1, 10, 4.5], links: L8, box: [5, 6, 7, 8] },
  };
  const PAGES = ['page-1', 'page-2', 'page-3', 'page-4', 'page-5', 'page-6', 'page-7', 'page-8'];
  const cy = cycle(() => STEPS, 1.5);
  const reset = () => cy.reset();
  const pick = choice(d.controls, { label: 'Internet', key: 'internet', value: 'three', aria: 'which model Internet', options: Object.entries(NETS).map(([value, o]) => ({ value, label: o.label })), onInput: reset });
  const al = ctl(d.controls, { label: '\\alpha', cls: '', key: 'alpha', min: 0, max: 1, step: 0.05, value: 1, unit: '', dec: 2, aria: 'the weight of the Google matrix in the modified Google matrix', specials: [{ at: 1, label: 'G′ = G' }], detents: [{ v: 0.85, label: 'Google’s α' }], onInput: reset });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  /* the Google matrix of an Internet, G[j][i] = 1 / (links out of page i + 1) for a link i + 1 → j + 1, and its modified form */
  const google = (net) => {
    const n = net.pos.length, out = Array(n).fill(0); net.links.forEach(([i]) => out[i - 1]++);
    const G = Array.from({ length: n }, () => Array(n).fill(0)); net.links.forEach(([i, j]) => { G[j - 1][i - 1] = 1 / out[i - 1]; });
    return G;
  };
  const modified = (G, a) => G.map((row) => row.map((g) => a * g + (1 - a) / G.length));
  /* the states x₀ … x_STEPS from e₁, cached by Internet and α */
  const cache = new Map();
  function chain(key, a) {
    const id = `${key}|${a}`; if (cache.has(id)) return cache.get(id);
    const G = google(NETS[key]), Gp = modified(G, a), n = G.length, xs = [Array.from({ length: n }, (_, i) => (i === 0 ? 1 : 0))];
    for (let k = 1; k <= STEPS; k++) xs.push(mul(Gp, xs[k - 1]));
    const out = { G, Gp, xs, q: steady(Gp) }; cache.set(id, out); return out;
  }
  /* the canvas points of a net's nodes, its window fitted into NET with one scale */
  function placed(net) {
    const [x0, y0, x1, y1] = net.bbox, s = Math.min((NET.r - NET.l) / (x1 - x0), (NET.b - NET.t) / (y1 - y0));
    const cx = (NET.l + NET.r) / 2 - ((x0 + x1) / 2) * s, cyy = (NET.t + NET.b) / 2 + ((y0 + y1) / 2) * s;
    return net.pos.map(([x, y]) => ({ x: cx + x * s, y: cyy - y * s, s }));
  }
  const both = (ls, i, j) => ls.some(([a, b]) => a === j && b === i);
  const sub = (k) => String(k).replace(/\d/g, (c) => '₀₁₂₃₄₅₆₇₈₉'[+c]);

  /* one Internet and its bars at the state x (eased), its hover names pushed when it is the one shown */
  function drawNet(ctx, key, x, K, live) {
    const net = NETS[key], P = placed(net), n = P.length, R = n > 5 ? 22 : 26, ink = PAL.ink, mu = PAL.muted;
    const cols = PAGES.slice(0, n).map((id) => F.ref(id));
    const out = Array(n).fill(0); net.links.forEach(([i]) => out[i - 1]++);
    text(ctx, net.fig, (NET.l + NET.r) / 2, NET.t - 38, mu, { size: 20, align: 'center' });
    /* the box of Figure 4.5.11 */
    if (net.box) {
      const xs = net.box.map((p) => P[p - 1].x), ys = net.box.map((p) => P[p - 1].y), l = Math.min(...xs) - 46, r = Math.max(...xs) + 46, t = Math.min(...ys) - 46, b = Math.max(...ys) + 46;
      ctx.save(); ctx.fillStyle = alpha(ink, 0.06); ctx.strokeStyle = alpha(ink, 0.5); ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(l, t, r - l, b - t, 14); ctx.fill(); ctx.stroke(); ctx.restore();
      if (live) hits.push({ x: (l + r) / 2, y: t + 14, r: 30, name: 'the box round pages 5, 6, 7 and 8: links lead in, none lead out, so all the PageRank ends up here' });
    }
    /* the links, both-way pairs shifted apart; the arc 7 → 1 over the top */
    net.links.forEach(([i, j]) => {
      if (net.arc && i === net.arc[0] && j === net.arc[1]) return;
      const a = P[i - 1], b = P[j - 1], off = both(net.links, i, j) ? 8 : 0;
      const m = link(ctx, a, b, R, alpha(ink, 0.7), 2.5, off);
      if (live) hits.push({ x: m.mx, y: m.my, r: 16, name: `page ${i} gives ${out[i - 1] === 1 ? 'all' : out[i - 1] === 2 ? 'half' : `a ${['', '', '', 'third', 'quarter'][out[i - 1]] ?? `1/${out[i - 1]}`}`} of its PageRank to page ${j}` });
    });
    if (net.arc) {
      const a = P[net.arc[0] - 1], b = P[net.arc[1] - 1], top = a.y - 1.1 * a.s, pts = [];
      const Q1 = [(a.x + b.x) / 2 + (a.x - b.x) / 4, top - 10], Q2 = [(a.x + b.x) / 2 - (a.x - b.x) / 4, top - 10], M = [(a.x + b.x) / 2, top];
      const quad = (p0, c, p1, u) => [(1 - u) * (1 - u) * p0[0] + 2 * (1 - u) * u * c[0] + u * u * p1[0], (1 - u) * (1 - u) * p0[1] + 2 * (1 - u) * u * c[1] + u * u * p1[1]];
      for (let s = 0; s <= 20; s++) pts.push(quad([a.x, a.y - R], Q1, M, s / 20));
      for (let s = 1; s <= 20; s++) pts.push(quad(M, Q2, [b.x, b.y - R - 4], s / 20));
      for (let s = 0; s + 2 < pts.length; s++) line(ctx, pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1], alpha(ink, 0.7), 2.5);
      const e = pts[pts.length - 1], f = pts[pts.length - 2]; arrow(ctx, f[0], f[1], e[0], e[1], alpha(ink, 0.7), 2.5);
      if (live) hits.push({ x: M[0], y: M[1], r: 16, name: `page ${net.arc[0]} gives a third of its PageRank to page ${net.arc[1]}` });
    }
    P.forEach((p, i) => { node(ctx, p.x, p.y, R, cols[i], `$${i + 1}$`); if (live) hits.push({ x: p.x, y: p.y, r: R, name: `page ${i + 1}: PageRank ${p3(x[i])} after step ${K}; it links to ${net.links.filter(([a]) => a === i + 1).map(([, b]) => `page ${b}`).join(', ')}` }); });
    /* the bars */
    const ax = axes(ctx, BAR, [0.4, n + 0.6], [0, 1], { yl: 'PageRank', nx: 0, ny: 5, fy: (q) => fmt(q, 1) });
    const { q } = chain(key, r2(al.v));
    const bw = ax.X(1.35) - ax.X(0.65);
    cols.forEach((c, i) => {
      const xl = ax.X(i + 0.65), top = ax.Y(x[i]);
      ctx.save(); ctx.fillStyle = alpha(c, 0.8); ctx.fillRect(xl, top, bw, ax.Y(0) - top); ctx.restore();
      if (q) line(ctx, xl - 6, ax.Y(q[i]), xl + bw + 6, ax.Y(q[i]), alpha(ink, 0.45), 2, [10, 10]);
      text(ctx, `$${i + 1}$`, xl + bw / 2, ax.Y(0) + 28, c, { size: 22, weight: 600, align: 'center', tex: true });
      text(ctx, p3(x[i]), xl + bw / 2, Math.max(BAR.t + 14, top - 16), c, { size: n > 5 ? 16 : 19, weight: 600, align: 'center', bg: PAL.panel });
      if (live) { hits.push({ x: xl + bw / 2, y: (top + ax.Y(0)) / 2, r: Math.max(30, bw / 2), name: `x${sub(i + 1)} = ${p3(x[i])}: the PageRank of page ${i + 1}` }); if (q) hits.push({ x: xl + bw + 6, y: ax.Y(q[i]), r: 11, name: `the steady state: ${p3(q[i])} for page ${i + 1}` }); }
    });
    if (q) text(ctx, '$\\kvecq$', ax.X(n + 0.6) + 6, ax.Y(q[n - 1]), C('vector'), { size: 22, weight: 600, align: 'left', tex: true, bg: PAL.panel });
    text(ctx, `step $${K}$`, (BAR.l + BAR.r) / 2, BAR.t - 38, mu, { size: 20, align: 'center', tex: true });
  }

  function draw() {
    const { ctx } = begin(d.c);
    const g = ease.smooth(arrival(d)), a = r2(al.v), key = pick.value;
    const t = cy.now(), K = Math.min(STEPS, Math.floor(t + 1e-9)), fr = ease.smooth(Math.min(1, t - K));
    const stateAt = (k) => { const { xs } = chain(k, a); return K >= STEPS ? xs[STEPS].map((v) => v * g) : xs[K].map((v, i) => lerp(v, xs[K + 1][i], fr) * g); };
    hits = [];
    pick.only(ctx, pick.from, () => { if (pick.from !== key) drawNet(ctx, pick.from, stateAt(pick.from), K, false); });
    pick.only(ctx, key, () => drawNet(ctx, key, stateAt(key), K, true));
    /* headline and readout */
    const { xs, q } = chain(key, a), xk = xs[K], n = xk.length, top = xk.indexOf(Math.max(...xk));
    const settled = q && xk.every((v, i) => Math.abs(v - q[i]) < 5e-4);
    const Gname = a === 1 ? '\\kG' : '\\kGprime';
    let fate;
    if (key === 'cycle' && a === 1) fate = `all of it sits on page ${top + 1} and moves on at the next step: the chain never settles, since $\\kG$ is not positive`;
    else if (key === 'drain' && a === 1) fate = settled ? `pages 1 to 4 have drained into the box, and their PageRank is zero` : `pages 1 to 4 are draining into the box, toward $x_1 = \\cdots = x_4 = 0$`;
    else fate = settled ? `the chain has settled at the PageRank vector $\\kvecq$` : `the chain is settling toward the PageRank vector $\\kvecq$`;
    if (K === 0) headline(ctx, `Step $0$: all the PageRank sits on page 1, $\\kvecxzero = \\kveceone$; ${fate}.`);
    else headline(ctx, `Step $${K}$: $\\mathbf{x}_{${K}} = ${Gname}\\mathbf{x}_{${K - 1}}$; page ${top + 1} holds the most PageRank, $${p3(xk[top])}$, and ${fate}.`);
    const note = a === 1 ? `$\\kGprime = \\kG$: the Google matrix itself, each page’s PageRank divided equally among its links.`
      : `$\\kGprime = ${num(a)}\\,\\kG + ${num(1 - a)}\\,\\kHn$: a user follows a link ${num(a * 100)}% of the time and jumps to any of the $${n}$ pages ${num((1 - a) * 100)}% of the time.`;
    const rows = (f) => `\\begin{array}{rrrr} ${[0, 4].map((s) => xk.slice(s, s + 4).map((v, i) => `x_${s + i + 1} = ${f(v)}`).join(', & ')).join(', \\\\ ')} \\end{array}`;
    if (K === 0) ro.set(n <= 5 ? `\\kvecxzero = \\kveceone = ${col(xk, num)}` : `\\kvecxzero = \\kveceone:\\quad ${rows(num)}`, note, { form: `start-${n}` });
    else if (n <= 5) ro.set(`\\mathbf{x}_{${K}} = ${Gname}\\mathbf{x}_{${K - 1}} = ${Gname} ${col(xs[K - 1])} = ${col(xk)}`, note, { form: `step-${n}` });
    else ro.set(`\\mathbf{x}_{${K}} = ${Gname}\\mathbf{x}_{${K - 1}}:\\quad ${rows(p3)}`, note, { form: `step-${n}` });
  }
  register(d.fig, { update: (dt) => cy.step(dt, () => 1 / PER), draw });
})();
};
