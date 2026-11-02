/* Figures for section 5.1 Gaussian elimination revisited. */
window.OMNISTAX_FIGURES = window.OMNISTAX_FIGURES || {};
window.OMNISTAX_FIGURES['5.1'] = function (root, F) {
const { C, PAL, alpha, ctl, choice, select, begin, axes, line, dot, text, headline, register, readout, hover, ease, fmt, arrival, pinned } = F;
const sim = (id, H) => F.sim(root, id, H);
const still = (d, draw) => register(d.fig, { update: () => {}, draw });
/* a number as the figure writes it: at most two decimals, no trailing zeros, never −0 */
const r2 = (v) => { const r = Math.round(v * 100) / 100; return Object.is(r, -0) ? 0 : r; };
const num = (v) => String(r2(v));
const numT = (v) => num(v).replace('-', '−');            /* the same in figure text, with a true minus */
const lerp = (a, b, k) => a + (b - a) * k;
const clamp01 = (k) => Math.min(1, Math.max(0, k));
const ORD = ['first', 'second', 'third'];

/* Sim: the two lines of Activity 5.1.2's system and the three-digit computer. The system 10⁻ᵏx + y = 1,
   x + y = 2 on the book's window [0, 2]², the two lines in their referent colours meeting at the exact
   solution; beside them the hypothetical computer's arithmetic for the order chosen, every number rounded
   to the digits it keeps, ending in y ≈ ŷ. The level y = ŷ is drawn dashed across the plane and the
   computed x is read where it meets the line of the equation y is substituted into: a hollow point there,
   the other order's point faint. Sliders: k (1 to 6, the book's 4), the digits kept (2 to 6, the book's 3);
   a choice of the order. Still: no clock; a change of order fades the arithmetic, a change of k turns the
   first line. The plane is 440 units square at 220 units to 1; a computed x outside the window is pinned. */
(function () {
  const d = sim('sim-partial-pivot-lines', 610);
  const BOX = { l: 90, r: 530, t: 120, b: 560 }, RX = 640, RW = 700;
  const kS = ctl(d.controls, { label: 'k', cls: '', key: 'k', min: 1, max: 6, step: 1, value: 4, unit: '', dec: 0, aria: 'the exponent k: the first equation is 10 to the minus k times x, plus y, equals 1' });
  const dS = ctl(d.controls, { label: '\\text{digits}', cls: '', key: 'digits', min: 2, max: 6, step: 1, value: 3, unit: '', dec: 0, aria: 'the number of decimal digits the hypothetical computer keeps' });
  const order = choice(d.controls, {
    label: 'order', key: 'order', value: 'orig', aria: 'the order the two equations are written in',
    options: [{ value: 'orig', label: 'original order' }, { value: 'swap', label: 'interchanged' }],
  });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);

  /* the computer: a value rounded to dg significant decimal digits, and written as it would store it */
  const fl = (v, dg) => (v === 0 ? 0 : Number(v.toPrecision(dg)));
  const show = (v, dg) => { if (v === 0) return (0).toFixed(Math.max(0, dg - 1)); const s = v.toPrecision(dg); return s.includes('e') ? String(Number(s)) : s; };
  const showT = (v, dg) => show(v, dg).replace('-', '−');
  /* an exact decimal written out (ε = 10⁻ᵏ and its combinations have at most k + 1 decimals) */
  const dec = (v, places) => { const s = v.toFixed(places); return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s; };
  const epsOf = (k) => Math.pow(10, -k);
  /* the computer's run: its lines of arithmetic and the solution it finds */
  function run(k, dg, o) {
    const eps = epsOf(k), es = dec(eps, k), m = Math.pow(10, k), lines = [];
    let y, x;
    if (o === 'orig') {
      const coef = 1 - m, rhs = 2 - m, cR = fl(coef, dg), rR = fl(rhs, dg);
      y = fl(rR / cR, dg);
      lines.push({ t: `first equation × ${String(m)}, subtracted from the second:`, muted: true });
      lines.push({ t: `$(1 - ${String(m)})y = 2 - ${String(m)}$` });
      lines.push({ t: `$${num(coef)}y = ${num(rhs)} \\;\\approx\\; ${show(cR, dg)}y = ${show(rR, dg)}$` });
      lines.push({ t: `$y \\approx ${show(y, dg)}$`, big: true });
      const t = fl(1 - y, dg); x = fl(t / eps, dg);
      lines.push({ t: 'substituting into the first equation:', muted: true });
      lines.push({ t: `$${es}x + ${show(y, dg)} \\approx 1.00$` });
      lines.push({ t: `$${es}x \\approx ${show(t, dg)}$` });
      lines.push({ t: `$x \\approx ${show(x, dg)}$`, big: true });
    } else {
      const coef = 1 - eps, rhs = 1 - 2 * eps, cR = fl(coef, dg), rR = fl(rhs, dg);
      y = fl(rR / cR, dg);
      lines.push({ t: `first equation × ${es}, subtracted from the second:`, muted: true });
      lines.push({ t: `$(1 - ${es})y = 1 - ${dec(2 * eps, k)}$` });
      lines.push({ t: `$${dec(coef, k)}y = ${dec(rhs, k)} \\;\\approx\\; ${show(cR, dg)}y = ${show(rR, dg)}$` });
      lines.push({ t: `$y \\approx ${show(y, dg)}$`, big: true });
      x = fl(2 - y, dg);
      lines.push({ t: 'substituting into the first equation:', muted: true });
      lines.push({ t: `$x + ${show(y, dg)} \\approx 2.00$` });
      lines.push({ t: `$x \\approx ${show(x, dg)}$`, big: true });
    }
    return { x, y, lines };
  }
  /* the line ax + by = c across the box, clipped */
  function drawLine(ctx, ax, e, color, w, a = 1) {
    const [p, q, c] = e, L = Math.hypot(p, q), dx = q / L, dy = -p / L, p0 = [c / (p + q) || 0, c / (p + q) || 0];
    ctx.save(); ctx.globalAlpha *= a; ctx.beginPath(); ctx.rect(BOX.l, BOX.t, BOX.r - BOX.l, BOX.b - BOX.t); ctx.clip();
    line(ctx, ax.X(p0[0] - 40 * dx), ax.Y(p0[1] - 40 * dy), ax.X(p0[0] + 40 * dx), ax.Y(p0[1] + 40 * dy), color, w);
    ctx.restore();
  }
  const inBox = (x, y) => x >= BOX.l && x <= BOX.r && y >= BOX.t && y <= BOX.b;
  const tag = (ctx, s, x, y, color, align = 'left', size = 20) => text(ctx, s, x, y, color, { size, weight: 600, align, tex: true, bg: PAL.panel });

  function draw() {
    const { ctx } = begin(d.c);
    const c1 = F.ref('line-1'), c2 = F.ref('line-2'), ink = PAL.ink, mu = PAL.muted;
    const g = ease.smooth(arrival(d));
    const k = Math.round(kS.v), dg = Math.round(dS.v), o = order.value, eps = epsOf(k), es = dec(eps, k);
    const ex = [1 / (1 - eps), (1 - 2 * eps) / (1 - eps)];                 /* the exact solution */
    const R = run(k, dg, o), other = run(k, dg, o === 'orig' ? 'swap' : 'orig');
    const yh = R.y, P1 = [(1 - yh) / eps, yh], P2 = [2 - yh, yh];       /* ŷ substituted into each equation */
    const chosen = o === 'orig' ? P1 : P2, faint = o === 'orig' ? P2 : P1, cc = o === 'orig' ? c1 : c2, fc = o === 'orig' ? c2 : c1;
    hits = [];
    /* the plane: a faint grid under the axes, the two lines, the exact solution */
    ctx.save(); ctx.beginPath(); ctx.rect(BOX.l, BOX.t, BOX.r - BOX.l, BOX.b - BOX.t); ctx.clip();
    for (let i = 0; i <= 4; i++) { const p = BOX.l + i * 110; line(ctx, p, BOX.t, p, BOX.b, alpha(ink, 0.07), 1.5); line(ctx, BOX.l, BOX.b - i * 110, BOX.r, BOX.b - i * 110, alpha(ink, 0.07), 1.5); }
    ctx.restore();
    const ax = axes(ctx, BOX, [0, 2], [0, 2], { xl: 'x', yl: 'y', nx: 4, ny: 4, fx: (q) => fmt(q, 1), fy: (q) => fmt(q, 1) });
    drawLine(ctx, ax, [eps, 1, 1], c1, 5, g);
    drawLine(ctx, ax, [1, 1, 2], c2, 5, g);
    /* the level y = ŷ, and ŷ substituted into each equation */
    const ly = ax.Y(yh);
    ctx.save(); ctx.globalAlpha *= g;
    line(ctx, BOX.l, ly, BOX.r, ly, alpha(ink, 0.6), 2.5, [10, 10]);
    const put = (P, color, a, filled) => {
      const px = ax.X(P[0]), py = ax.Y(P[1]);
      ctx.save(); ctx.globalAlpha *= a;
      if (inBox(px, py)) dot(ctx, px, py, color, filled, 10); else pinned(ctx, BOX, ax.X, ax.Y, P[0], P[1], color);
      ctx.restore();
      return [px, py];
    };
    put(faint, fc, 0.35, false);
    const cp = put(chosen, cc, 1, false);
    const sx = ax.X(ex[0]), sy = ax.Y(ex[1]);
    dot(ctx, sx, sy, ink, true, 8);
    ctx.restore();
    /* labels: the equations beside their lines, the solution, the level, the computed point */
    if (g > 0.99) {
      tag(ctx, `$${es}x + y = 1$`, ax.X(0.3), ax.Y(1 - 0.3 * eps) - 24, c1, 'left');
      tag(ctx, `$x + y = 2$`, ax.X(0.42) + 26, ax.Y(1.58) - 8, c2, 'left');
      tag(ctx, `$(${ex[0].toFixed(4)}\\ldots, ${ex[1].toFixed(4)}\\ldots)$`, sx + 14, sy - 28, ink, 'left', 18);
      tag(ctx, `$y \\approx ${show(yh, dg)}$`, BOX.r - 8, ly + 22, mu, 'right', 18);
      const left = cp[0] > (BOX.l + BOX.r) / 2;   /* below-left of a point on the right half, below-right otherwise */
      tag(ctx, `$x \\approx ${show(R.x, dg)}$`, left ? cp[0] - 16 : cp[0] + 16, cp[1] + 28, cc, left ? 'right' : 'left', 20);
    }
    /* hover names */
    hits.push({ x: ax.X(1.6), y: ax.Y(1 - 1.6 * eps), r: 16, name: `the first equation's line, ${es}x + y = 1, of slope −${es}` });
    hits.push({ x: ax.X(0.25), y: ax.Y(1.75), r: 16, name: 'the second equation\'s line, x + y = 2, of slope −1' });
    hits.push({ x: sx, y: sy, r: 16, name: `the exact solution (${ex[0].toFixed(6)}…, ${ex[1].toFixed(6)}…), where the two lines meet` });
    hits.push({ x: BOX.l + 70, y: ly, r: 12, name: `the computer's y ≈ ${showT(yh, dg)}, the same in either order` });
    hits.push({ x: cp[0], y: cp[1], r: 18, name: `y ≈ ${showT(yh, dg)} substituted into the ${o === 'orig' ? 'first' : 'second'} equation gives x ≈ ${showT(R.x, dg)}` });
    const fp = [ax.X(faint[0]), ax.Y(faint[1])];
    if (inBox(fp[0], fp[1])) hits.push({ x: fp[0], y: fp[1], r: 18, name: `the other order: y ≈ ${showT(yh, dg)} substituted into ${o === 'orig' ? 'x + y = 2' : `${es}x + y = 1`} gives x ≈ ${showT(other.x, dg)}` });
    /* the computer's arithmetic, on the right */
    const a = ease.smooth(order.k);
    text(ctx, `a ${dg}-digit computer, the equations ${o === 'orig' ? 'in their original order' : 'interchanged'}`, RX, 150, mu, { size: 20 });
    let y0 = 200;
    ctx.save(); ctx.globalAlpha *= a;
    R.lines.forEach((l) => {
      text(ctx, l.t, RX + (l.muted ? 0 : 24), y0, l.muted ? mu : ink, { size: l.muted ? 18 : l.big ? 26 : 22, weight: l.big ? 600 : 400, tex: !l.muted });
      y0 += l.muted ? 34 : l.big ? 44 : 40;
    });
    ctx.restore();
    /* headline and readout */
    const exT = `x = ${ex[0].toFixed(4)}\\ldots,\\ y = ${ex[1].toFixed(4)}\\ldots`;
    const err = Math.abs(R.x - ex[0]), big = err > 0.05;
    let h;
    if (o === 'orig') h = big
      ? `On a ${dg}-digit computer the equations in their original order give $x \\approx ${show(R.x, dg)}$, $y \\approx ${show(yh, dg)}$, far from the exact $x = ${ex[0].toFixed(4)}\\ldots$: along the nearly horizontal line a change of $${dec(Math.abs(yh - ex[1]), 6)}$ in $y$ moves $x$ by $${num(err)}$.`
      : `On a ${dg}-digit computer the equations in their original order give $x \\approx ${show(R.x, dg)}$, $y \\approx ${show(yh, dg)}$, ${k <= 2 ? 'close to the exact solution, since the first line is no longer nearly horizontal' : 'close to the exact solution, since the extra digits leave little error in $y$ to magnify'}.`;
    else h = `On a ${dg}-digit computer the equations interchanged give $x \\approx ${show(R.x, dg)}$, $y \\approx ${show(yh, dg)}$, ${err < 0.006 ? 'the best the computer can represent' : 'close to the exact solution'}: along the line of slope $-1$ a small change in $y$ changes $x$ just as little.`;
    headline(ctx, h);
    ro.set(`x \\approx ${show(R.x, dg)},\\ y \\approx ${show(yh, dg)} \\qquad \\text{exact: } ${exT}`,
      `${o === 'orig' ? 'Interchanging the equations' : 'In their original order the equations'} give${o === 'orig' ? 's' : ''} x ≈ ${showT(other.x, dg)}, y ≈ ${showT(other.y, dg)}.`, { form: o });
  }
  still(d, draw);
})();

/* Sim: Example 5.1.1 stepped. A story slider with eleven stops carries the transport: 0 the system Ax = b;
   1, 2, 3 the elementary matrices E₁, E₂, E₃ acting one at a time, the scaled copy of the pivot row sliding
   onto the row it is added to while E_k appears beside the matrix and the multiplier, sign reversed, fills
   into L; 4 the factorization A = LU written whole; 5, 6, 7 the forward substitution Lc = b, one component
   at a time with the equation it comes from; 8, 9, 10 the back substitution Ux = c. The system is a select
   of the book's: Example 5.1.1 (the default), the same A with Activity 5.1.4 d's b, Activity 5.1.3's A
   with its two right-hand sides. L, U, c and x are computed live from the choice. Every matrix is drawn
   entry by entry with bracket lines, L, U and the E_k in the matrix hue, b, c and x in the vector hue. */
(function () {
  const d = sim('sim-lu-steps', 540);
  const SYS = {
    ex511: { label: 'Example 5.1.1: A = [2 −3 1; −4 5 0; 2 −2 2], b = (8, −13, 8)', A: [[2, -3, 1], [-4, 5, 0], [2, -2, 2]], b: [8, -13, 8] },
    ex511b: { label: 'the same A, b = (9, −16, 10) (Activity 5.1.4 d)', A: [[2, -3, 1], [-4, 5, 0], [2, -2, 2]], b: [9, -16, 10] },
    act513: { label: 'Activity 5.1.3: A = [1 2 1; −2 −3 −2; 3 7 4], b = (4, −7, 12)', A: [[1, 2, 1], [-2, -3, -2], [3, 7, 4]], b: [4, -7, 12] },
    act513f: { label: 'the same A, b = (2, −2, 7) (Activity 5.1.3 f)', A: [[1, 2, 1], [-2, -3, -2], [3, 7, 4]], b: [2, -2, 7] },
  };
  const sel = select(d.controls, {
    label: 'system', key: 'system', value: 'ex511', aria: 'the system Ax = b the factorization is worked on',
    options: Object.entries(SYS).map(([value, s]) => ({ value, label: s.label })),
  });
  const step = ctl(d.controls, { label: 'step', cls: '', key: 'step', min: 0, max: 10, step: 0.01, value: 0, unit: '', dec: 2, aria: 'the step of the factorization and the two triangular solves' });
  F.story(d, step, { stops: [
    { v: 0, label: 'A, b' }, { v: 1, label: 'E₁' }, { v: 2, label: 'E₂' }, { v: 3, label: 'E₃' }, { v: 4, label: 'A = LU' },
    { v: 5, label: 'c₁' }, { v: 6, label: 'c₂' }, { v: 7, label: 'c₃' }, { v: 8, label: 'x₃' }, { v: 9, label: 'x₂' }, { v: 10, label: 'x₁' },
  ], ms: 1400, rest: 1100 });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);

  /* the elimination without pivoting: three replacements (row 2 by row 1, row 3 by row 1, row 3 by row 2),
     each as its multiplier m (row i += m · row j), the elementary matrix, the matrix after it, and L, U, c, x */
  function work(S) {
    const A = S.A.map((r) => r.slice()), b = S.b.slice(), ops = [], mats = [A.map((r) => r.slice())];
    const L = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    [[1, 0], [2, 0], [2, 1]].forEach(([i, j]) => {
      const m = -A[i][j] / A[j][j];
      const E = [[1, 0, 0], [0, 1, 0], [0, 0, 1]]; E[i][j] = m;
      A[i] = A[i].map((v, c) => v + m * A[j][c]);
      L[i][j] = -m;
      ops.push({ i, j, m, E }); mats.push(A.map((r) => r.slice()));
    });
    const U = mats[3], c = [0, 0, 0], x = [0, 0, 0];
    for (let i = 0; i < 3; i++) c[i] = b[i] - L[i].slice(0, i).reduce((s, v, k) => s + v * c[k], 0);
    for (let i = 2; i >= 0; i--) x[i] = (c[i] - U[i].slice(i + 1).reduce((s, v, k) => s + v * x[i + 1 + k], 0)) / U[i][i];
    return { A: mats[0], b, ops, mats, L, U, c, x };
  }
  /* TeX for the readout */
  const col = (v) => `\\begin{bmatrix} ${v.map((e) => (typeof e === 'string' ? e : num(e))).join(' \\\\ ')} \\end{bmatrix}`;
  const mtx = (M) => `\\begin{bmatrix} ${M.map((r) => r.map(num).join(' & ')).join(' \\\\ ')} \\end{bmatrix}`;
  const kmtx = (M) => `\\htmlClass{kv-matrix}{${mtx(M)}}`;
  const kcol = (v) => `\\htmlClass{kv-vector}{${col(v)}}`;
  const sgn = (m) => (m < 0 ? `-${num(-m)}` : num(m));
  const times = (m, s) => (m === 1 ? s : m === -1 ? `-${s}` : `${num(m)} ${s}`);   /* m·s in TeX, 1 and −1 unwritten */
  const timesT = (m, s) => (m === 1 ? s : m === -1 ? `−${s}` : `${numT(m)}·${s}`);  /* the same in figure text */
  /* a matrix drawn entry by entry inside bracket lines; cell(i, j) may return {text, color, alpha, weight}; returns its geometry */
  const CW = 64, RH = 54;
  function matrix(ctx, M, cx, cy, color, o = {}) {
    const n = M.length, m = M[0].length, cw = o.cw ?? CW, rh = o.rh ?? RH;
    const w = m * cw, h = n * rh, l = cx - w / 2 - 12, r = cx + w / 2 + 12, t = cy - h / 2 - 6, bt = cy + h / 2 + 6;
    ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
    [[l, 1], [r, -1]].forEach(([x, s]) => { line(ctx, x, t, x, bt, color, 2.5); line(ctx, x, t, x + s * 12, t, color, 2.5); line(ctx, x, bt, x + s * 12, bt, color, 2.5); });
    M.forEach((row, i) => row.forEach((v, j) => {
      const c = o.cell ? o.cell(i, j, v) : {};
      if (c === null) return;
      const s = c.text ?? (typeof v === 'string' ? v : numT(v));
      ctx.save(); ctx.globalAlpha *= c.alpha ?? 1;
      text(ctx, s, cx - w / 2 + (j + 0.5) * cw, cy - h / 2 + (i + 0.5) * rh, c.color ?? color, { size: c.size ?? 24, weight: c.weight ?? 600, align: 'center', bg: c.bg });
      ctx.restore();
    }));
    ctx.restore();
    return { l, r, t, b: bt, rowY: (i) => cy - h / 2 + (i + 0.5) * rh, colX: (j) => cx - w / 2 + (j + 0.5) * cw };
  }
  const title = (ctx, s, x, y, color, a = 1) => { ctx.save(); ctx.globalAlpha *= a; text(ctx, s, x, y, color, { size: 22, weight: 600, align: 'center', tex: true }); ctx.restore(); };
  const words = (ctx, s, x, y, color, a = 1, size = 18) => { ctx.save(); ctx.globalAlpha *= a; text(ctx, s, x, y, color, { size, align: 'center', tex: true }); ctx.restore(); };
  const Ek = ['\\kEone', '\\kEtwo', '\\kEthree'], Eword = ['E₁', 'E₂', 'E₃'];
  const prodTex = (k) => Ek.slice(0, k).reverse().join('') + '\\kA';      /* E_k ⋯ E₁ A */
  const opWords = (op) => `multiplies the ${ORD[op.j]} row by $${num(op.m)}$ and adds it to the ${ORD[op.i]}`;
  const opShort = (op) => `row ${op.i + 1} + ${timesT(op.m, `row ${op.j + 1}`)}`;

  function draw() {
    const { ctx } = begin(d.c);
    const mc = C('matrix'), vc = C('vector'), ink = PAL.ink, mu = PAL.muted;
    const g = ease.smooth(arrival(d));
    const S = SYS[sel.value], W = work(S), s = step.v;
    const i = Math.round(s), f = s - Math.floor(s), lo = Math.floor(s), atStop = Math.abs(s - i) < 0.02;
    hits = [];
    /* the two layouts: the factorization (stops 0–4) and the solves (5–10), crossfading between 4 and 5 */
    const aF = s <= 4 ? 1 : s >= 4.5 ? 0 : 1 - ease.smooth((s - 4) / 0.5);
    const aS = s >= 5 ? 1 : s <= 4.5 ? 0 : ease.smooth((s - 4.5) / 0.5);
    const MY = 300, TY = 184, WY = 428;
    if (aF > 0.001) {
      ctx.save(); ctx.globalAlpha *= aF * g;
      /* the elimination step in progress: k the operation being applied (1..3), f its progress */
      const k = Math.min(3, Math.max(0, lo + 1)), moving = lo < 3 && f > 0 && s < 3, op = lo < 3 ? W.ops[lo] : null;
      const landed = !moving || f >= 0.6;
      const shown = moving ? (landed ? W.mats[lo + 1] : W.mats[lo]) : W.mats[Math.min(3, lo + (f > 0 ? 1 : 0))];
      const stage = Math.min(3, moving ? (landed ? lo + 1 : lo) : lo);
      /* left: the matrix so far */
      const LX = 260;
      const lt = stage === 0 ? '\\kA' : stage === 3 && s >= 3.5 ? `\\kU = ${prodTex(3)}` : prodTex(stage);
      title(ctx, `$${lt}$`, LX, TY, mc);
      const hlRow = moving && landed ? op.i : -1;
      const fading = moving && !landed ? op.i : -1, fa = 1 - ease.smooth(clamp01(f / 0.6));
      const gm = matrix(ctx, shown, LX, MY, mc, { cell: (r, c, v) => ({ bg: r === hlRow ? alpha(mc, 0.12) : undefined, alpha: r === fading ? fa : 1 }) });
      if (moving && !landed) {
        /* the scaled copy of the pivot row slides onto the row it is added to */
        const ghost = W.mats[lo][op.j].map((v) => op.m * v), gy = lerp(gm.rowY(op.j), gm.rowY(op.i), ease.smooth(f / 0.6)), ga = Math.min(1, 4 * f);
        ctx.save(); ctx.globalAlpha *= ga;
        ghost.forEach((v, c) => text(ctx, numT(v), gm.colX(c), gy, mc, { size: 24, weight: 600, align: 'center', bg: PAL.panel }));
        text(ctx, timesT(op.m, `row ${op.j + 1}`), gm.l - 16, gy, mc, { size: 18, weight: 600, align: 'right', bg: PAL.panel });
        ctx.restore();
      }
      if (stage === 3 && s >= 3.5) words(ctx, 'upper triangular: the elimination is done', LX, WY, mu, Math.min(1, (s - 3.5) / 0.5));
      hits.push({ x: LX, y: MY, r: 100, name: stage === 0 ? `A = ${S.A.map((r) => r.map(numT).join(' ')).join('; ')}` : stage === 3 ? 'U, the upper triangular matrix the three replacements reach' : `${Eword.slice(0, stage).reverse().join('')}A, the matrix after ${stage} replacement${stage > 1 ? 's' : ''}` });
      /* middle: b at the start, then the elementary matrix acting */
      const EX = 700;
      if (s < 0.5) {
        const ab = 1 - ease.smooth(s / 0.5);
        title(ctx, '$\\kvecb$', EX, TY, vc, ab);
        matrix(ctx, W.b.map((v) => [v]), EX, MY, vc, { alpha: ab });
        hits.push({ x: EX, y: MY, r: 60, name: `b = (${W.b.map(numT).join(', ')}), the right-hand side` });
      }
      const kk = f === 0 ? lo : lo + 1;   /* the elementary matrix shown, 1 to 3 */
      if (s > 0 && kk <= 3) {
        const ae = f === 0 ? 1 : Math.min(1, f / 0.4);
        const o2 = W.ops[kk - 1];
        if (o2) {
          title(ctx, `$${Ek[kk - 1]}$`, EX, TY, mc, ae);
          matrix(ctx, o2.E, EX, MY, mc, { alpha: ae, cell: (r, c, v) => ({ bg: r === o2.i && c === o2.j ? alpha(mc, 0.12) : undefined }) });
          words(ctx, `${Eword[kk - 1]} ${opWords(o2)}`, EX, WY, mu, ae);
          hits.push({ x: EX, y: MY, r: 100, name: `${Eword[kk - 1]}: the identity with ${numT(o2.m)} in row ${o2.i + 1}, column ${o2.j + 1}; multiplying by it ${opWords(o2).replace(/\$/g, '')}` });
        }
      } else if (s >= 3 && s <= 4.5) {
        const ae = s < 3.5 ? 0 : s >= 4 ? 1 : ease.smooth((s - 3.5) / 0.5);
        title(ctx, '$\\kA = \\kL\\kU$', EX, TY, mc, ae);
        words(ctx, `$\\kA = (\\kEthree\\kEtwo\\kEone)^{-1}\\kU = \\kEone^{-1}\\kEtwo^{-1}\\kEthree^{-1}\\kU$`, EX, MY - 22, ink, ae, 20);
        words(ctx, 'each entry of $\\kL$ is a multiplier with its sign reversed', EX, MY + 22, mu, ae);
      }
      /* right: L filling in */
      const RXc = 1140;
      const filled = (r, c) => { const n = [[1, 0], [2, 0], [2, 1]].findIndex(([a, b2]) => a === r && b2 === c); return n < 0 || n < stage || (moving && landed && n === lo); };
      title(ctx, s < 3.5 ? '$\\kL$' : '$\\kL = \\kEone^{-1}\\kEtwo^{-1}\\kEthree^{-1}$', RXc, TY, mc);
      matrix(ctx, W.L, RXc, MY, mc, { cell: (r, c, v) => (r > c && !filled(r, c) ? { text: '?', color: mu, weight: 400 } : { bg: moving && landed && r === op.i && c === op.j ? alpha(mc, 0.12) : undefined }) });
      words(ctx, stage === 0 && !moving ? 'filled in as the elimination runs' : 'lower triangular, $1$s on the diagonal', RXc, WY, mu);
      hits.push({ x: RXc, y: MY, r: 100, name: 'L = E₁⁻¹E₂⁻¹E₃⁻¹: each entry below the diagonal is the multiplier of one replacement with its sign reversed' });
      ctx.restore();
    }
    if (aS > 0.001) {
      ctx.save(); ctx.globalAlpha *= aS * g;
      const j = Math.max(5, Math.min(10, moving2(s)));   /* the stop whose entry is being found */
      const nc = Math.min(3, Math.max(0, j - 4)), nx = Math.max(0, j - 7);   /* components of c and of x found */
      /* left: Lc = b */
      const cS = W.c.map((v, r) => (r < nc ? v : '?')), xS = W.x.map((v, r) => (r >= 3 - nx ? v : '?'));
      title(ctx, '$\\kL\\kvecc = \\kvecb$', 350, TY, ink, 1);
      const gL = matrix(ctx, W.L, 250, MY, mc, { cell: (r, c, v) => ({ bg: nc > 0 && nc <= 3 && r === nc - 1 && j <= 7 ? alpha(mc, 0.1) : undefined }) });
      matrix(ctx, cS.map((v) => [v]), 410, MY, vc, { cell: (r, c, v) => (v === '?' ? { text: '?', color: mu, weight: 400 } : { bg: r === nc - 1 && j <= 7 ? alpha(vc, 0.14) : undefined }) });
      text(ctx, '=', 470, MY, ink, { size: 26, align: 'center' });
      matrix(ctx, W.b.map((v) => [v]), 530, MY, vc);
      hits.push({ x: 250, y: MY, r: 100, name: 'L, lower triangular: each equation of Lc = b brings in one new component of c' });
      hits.push({ x: 410, y: MY, r: 40, name: `c = Ux, found from Lc = b by forward substitution${nc === 3 ? `: (${W.c.map(numT).join(', ')})` : ''}` });
      hits.push({ x: 530, y: MY, r: 40, name: `b = (${W.b.map(numT).join(', ')})` });
      /* right: Ux = c */
      const aU = j >= 8 ? 1 : 0.45;
      title(ctx, '$\\kU\\kvecx = \\kvecc$', 1010, TY, ink, aU);
      matrix(ctx, W.U, 910, MY, mc, { alpha: aU, cell: (r, c, v) => ({ bg: j >= 8 && r === 3 - nx ? alpha(mc, 0.1) : undefined }) });
      matrix(ctx, xS.map((v) => [v]), 1070, MY, vc, { alpha: aU, cell: (r, c, v) => (v === '?' ? { text: '?', color: mu, weight: 400 } : { bg: j >= 8 && r === 3 - nx ? alpha(vc, 0.14) : undefined }) });
      ctx.save(); ctx.globalAlpha *= aU; text(ctx, '=', 1130, MY, ink, { size: 26, align: 'center' }); ctx.restore();
      matrix(ctx, cS.map((v) => [v]), 1190, MY, vc, { alpha: aU, cell: (r, c, v) => (v === '?' ? { text: '?', color: mu, weight: 400 } : {}) });
      hits.push({ x: 910, y: MY, r: 100, name: 'U, upper triangular: each equation of Ux = c, read from the bottom, brings in one new component of x' });
      hits.push({ x: 1070, y: MY, r: 40, name: `x, found from Ux = c by back substitution${nx === 3 ? `: (${W.x.map(numT).join(', ')})` : ''}` });
      /* the equation the current component comes from */
      const eqLine = j <= 7 ? cEq(W, nc - 1) : xEq(W, 3 - nx);
      words(ctx, eqLine, 700, WY, ink, 1, 21);
      ctx.restore();
    }
    /* headline and readout */
    const j = Math.round(s), op = W.ops[Math.min(2, Math.max(0, j - 1))];
    const Lt = kmtx(W.L), Ut = kmtx(W.U), At = kmtx(W.A), bt = kcol(W.b);
    let h, rx, note = '';
    if (j === 0) { h = `The system $\\kA\\kvecx = \\kvecb$: Gaussian elimination will reduce $\\kA$ one replacement at a time and record each step in $\\kL$.`; rx = `\\kA = ${At}, \\qquad \\kvecb = ${bt}`; note = 'No partial pivoting: the three replacements of the book\'s example, in its order.'; }
    else if (j <= 3) {
      const before = W.mats[j - 1][op.i][op.j];
      h = `$${Ek[j - 1]}$ ${opWords(op)}: the entry $${num(before)}$ below the ${ORD[op.j]} pivot becomes $0$, and $\\kL$ records the multiplier $${sgn(-op.m)}$.`;
      rx = `${prodTex(j)} = ${kmtx(op.E)} ${kmtx(W.mats[j - 1])} = ${kmtx(W.mats[j])}${j === 3 ? ' = \\kU' : ''}`;
      note = j === 3 ? 'U is upper triangular: the elimination is done.' : '';
    } else if (j === 4) { h = `$\\kEthree\\kEtwo\\kEone\\kA = \\kU$, so $\\kA = (\\kEthree\\kEtwo\\kEone)^{-1}\\kU = \\kL\\kU$ with $\\kL = \\kEone^{-1}\\kEtwo^{-1}\\kEthree^{-1}$ lower triangular.`; rx = `\\kA = \\kL\\kU = ${Lt}\\,${Ut}`; note = 'Finding L and U cost about as much as Gaussian elimination, roughly ⅔n³ operations; from here on they are reused.'; }
    else if (j <= 7) {
      const r = j - 5;
      h = r === 0 ? `Forward substitution on $\\kL\\kvecc = \\kvecb$: the first equation reads off $c_1 = ${num(W.c[0])}$ directly.` : `Forward substitution on $\\kL\\kvecc = \\kvecb$: the ${ORD[r]} equation, ${cEq(W, r)}.`;
      rx = `\\kL\\kvecc = \\kvecb: \\quad ${Lt} ${kcol(W.c.map((v, q) => (q <= r ? v : '?')))} = ${bt}`;
      note = r === 2 ? 'c = Ux is known; now Ux = c is solved from the bottom up.' : 'L is lower triangular, so each equation adds one unknown to those already found.';
    } else {
      const r = 10 - j;
      h = `Back substitution on $\\kU\\kvecx = \\kvecc$: the ${ORD[r]} equation, ${xEq(W, r)}${j === 10 ? `; then $\\kvecx = (${W.x.map(num).join(', ')})$, and $\\kA\\kvecx = \\kvecb$ checks` : ''}.`;
      rx = j === 10 ? `\\kA\\kvecx = ${At} ${kcol(W.x)} = ${bt}` : `\\kU\\kvecx = \\kvecc: \\quad ${Ut} ${kcol(W.x.map((v, q) => (q >= r ? v : '?')))} = ${kcol(W.c)}`;
      note = j === 10 ? 'Two triangular solves, about n² operations in all, against ⅔n³ for the elimination: a new right-hand side repeats only these two.' : 'U is upper triangular, so the equations are read from the bottom up.';
    }
    headline(ctx, h);
    ro.set(rx, note, { form: j <= 3 ? 'elim' : j === 4 ? 'lu' : j <= 7 ? 'fwd' : j === 10 ? 'check' : 'back' });
  }
  /* the stop a solve state belongs to: the stop reached, or the one being approached once a move is past its start */
  const moving2 = (s) => (s - Math.floor(s) > 0.5 ? Math.ceil(s) : Math.floor(s));
  /* the equation of Lc = b that gives c_r, and of Ux = c that gives x_r, with the numbers */
  function cEq(W, r) {
    if (r < 0) return '';
    const terms = W.L[r].slice(0, r).map((v, q) => times(v, `c_${q + 1}`)).filter((t) => !t.startsWith('0'));
    const lhs = [...terms, `c_${r + 1}`].join(' + ').replace(/\+ -/g, '- ');
    const known = W.L[r].slice(0, r).reduce((s, v, q) => s + v * W.c[q], 0);
    const solve = r === 0 ? '' : `, so $c_${r + 1} = ${num(W.b[r])} ${known < 0 ? '+' : '-'} ${num(Math.abs(known))} = ${num(W.c[r])}$`;
    return r === 0 ? `$c_1 = ${num(W.c[0])}$` : `$${lhs} = ${num(W.b[r])}$${solve}`;
  }
  function xEq(W, r) {
    const terms = W.U[r].slice(r).map((v, q) => times(v, `x_${r + q + 1}`)).filter((t) => !t.startsWith('0'));
    const lhs = terms.join(' + ').replace(/\+ -/g, '- ');
    const known = W.U[r].slice(r + 1).reduce((s, v, q) => s + v * W.x[r + 1 + q], 0);
    const rhs = W.c[r] - known;
    const steps = r === 2 ? `$x_3 = ${num(W.c[2])} / ${num(W.U[2][2])} = ${num(W.x[2])}$` : `$${times(W.U[r][r], `x_${r + 1}`)} = ${num(W.c[r])} ${known < 0 ? '+' : '-'} ${num(Math.abs(known))} = ${num(rhs)}$ and $x_${r + 1} = ${num(W.x[r])}$`;
    return `$${lhs} = ${num(W.c[r])}$, gives ${steps}`;
  }
  still(d, draw);
})();
};
