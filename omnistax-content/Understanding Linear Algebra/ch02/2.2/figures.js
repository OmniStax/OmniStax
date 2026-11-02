/* Figures for section 2.2 Matrix multiplication and linear combinations. */
window.OMNISTAX_FIGURES = window.OMNISTAX_FIGURES || {};
window.OMNISTAX_FIGURES['2.2'] = function (root, F) {
const { C, PAL, alpha, ctl, select, begin, axes, line, arrow, dot, text, headline, register, readout, hover, ease, fmt, arrival, pinned } = F;
const sim = (id, H) => F.sim(root, id, H);
const still = (d, draw) => register(d.fig, { update: () => {}, draw });
/* a number as the figure writes it: at most two decimals, no trailing zeros, never −0 */
const r2 = (v) => { const r = Math.round(v * 100) / 100; return Object.is(r, -0) ? 0 : r; };
const r1 = (v) => { const r = Math.round(v * 10) / 10; return Object.is(r, -0) ? 0 : r; };
const num = (v) => String(r2(v));
const numT = (v) => num(v).replace('-', '−');            /* the same in figure text, with a true minus */
const par = (v) => (r2(v) < 0 ? `(${num(v)})` : num(v));  /* a negative entry in parentheses */
const ptT = (v) => `(${num(v[0])}, ${num(v[1])})`;
const pt = (v) => `(${numT(v[0])}, ${numT(v[1])})`;
const colV = (a, b) => `\\htmlClass{kv-vector}{\\begin{bmatrix} ${num(a)} \\\\ ${num(b)} \\end{bmatrix}}`;
const matM = (m) => `\\htmlClass{kv-matrix}{\\begin{bmatrix} ${num(m[0])} & ${num(m[1])} \\\\ ${num(m[2])} & ${num(m[3])} \\end{bmatrix}}`;
const tag = (ctx, s, x, y, color, align = 'center') => text(ctx, s, x, y, color, { size: 22, weight: 600, tex: true, bg: PAL.panel, align });
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
/* a label just past the head of the arrow t → h, along its direction, clamped inside the box */
function past(ctx, ax, t, h, s, color, gap = 30) {
  const { X, Y, box } = ax, x1 = X(t[0]), y1 = Y(t[1]), x2 = X(h[0]), y2 = Y(h[1]), L = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = L < 3 ? 0.6 : (x2 - x1) / L, uy = L < 3 ? -0.6 : (y2 - y1) / L;
  const lx = Math.min(Math.max(x2 + ux * gap, box.l + 30), box.r - 30), ly = Math.min(Math.max(y2 + uy * (gap - 6), box.t + 14), box.b - 14);
  tag(ctx, s, lx, ly, color, ux > 0.55 ? 'left' : ux < -0.55 ? 'right' : 'center');
}
/* a label at the head h of an arrow from the origin, on the side away from the arrow to `other` */
function outer(ctx, ax, h, other, s, color) {
  const { X, Y, box } = ax, x0 = X(0), y0 = Y(0), hx = X(h[0]), hy = Y(h[1]), L = Math.hypot(hx - x0, hy - y0);
  if (!(L > 3)) { tag(ctx, s, x0 + 30, y0 - 26, color, 'left'); return; }
  const ux = (hx - x0) / L, uy = (hy - y0) / L;
  let nx = -uy, ny = ux;
  if (nx * (X(other[0]) - x0) + ny * (Y(other[1]) - y0) > 0) { nx = -nx; ny = -ny; }
  const lx = Math.min(Math.max(hx + ux * 10 + nx * 30, box.l + 30), box.r - 30), ly = Math.min(Math.max(hy + uy * 10 + ny * 24, box.t + 14), box.b - 14);
  tag(ctx, s, lx, ly, color, nx > 0.55 ? 'left' : nx < -0.55 ? 'right' : 'center');
}

/* Sim: the product Ax as a walk along the columns. One plane, x from −10 to 10 and y from −7 to 7 at
   56 units to 1, with the lattice of whole-number combinations of the two columns (as Figure 2.2.9
   draws it) in faint ink, the columns v₁ = (a, c) and v₂ = (b, d) as arrows, the walk x₁v₁ then x₂v₂
   dashed, Ax solid, and the book's vector b dashed where the matrix comes with one. The matrix is a
   choice among the section's named 2 × 2 matrices, each loading as the book's own picture: Activity
   2.2.2 f ([1 2; −1 1], b = (6, 0), x = (2, 2), the default), Figure 2.2.9 ([2 −1; −0.5 1.5],
   b = (−3, −3), x = (−3, −3)), Exercise 2.2.8 ([3 −2; −2 1], b = (5, −2), x = (−1, −4)) and Activity
   2.2.5 h ([1 2; −2 −4], parallel columns, b = 0, every x with x₁ = −2x₂). x₁ and x₂ run −4 to 4 on
   sliders carrying a dashed special at the book's solution (placed from the other slider for the
   parallel columns). A change of matrix bends the columns, the lattice and b into the next (the
   choice's own morph). Ax reaches (20, −12) at the sliders' extremes and is pinned at the edge past
   the box. Still: a product has no clock. */
(function () {
  const d = sim('sim-columns-combination', 964);
  const U = 56, OX = 700, OY = 512, BOX = { l: OX - 10 * U, r: OX + 10 * U, t: OY - 7 * U, b: OY + 7 * U };
  /* a matrix as [a, b, c, d] with columns (a, c) and (b, d); b the book's right-hand side; sol the book's x; load the x the picture opens on */
  const P = {
    act: { m: [1, 2, -1, 1], b: [6, 0], sol: [2, 2], load: [2, 2], where: 'Activity 2.2.2' },
    fig: { m: [2, -1, -0.5, 1.5], b: [-3, -3], sol: [-3, -3], load: [-3, -3], where: 'Exercise 2.2.4' },
    inv: { m: [3, -2, -2, 1], b: [5, -2], sol: [-1, -4], load: [-1, -4], where: 'Exercise 2.2.8' },
    zero: { m: [1, 2, -2, -4], b: [0, 0], sol: null, load: [-2, 1], where: 'Activity 2.2.5' },
  };
  let x1 = null, x2 = null;
  const marks = (v) => {
    const p = P[v];
    if (p.sol) { x1.mark([{ at: p.sol[0], label: 'Ax = b' }]); x2.mark([{ at: p.sol[1], label: 'Ax = b' }]); }
    else { x1.mark([{ at: () => { const q = -2 * x2.v; return Math.abs(q) <= 4 ? q : null; }, label: 'Ax = 0' }]); x2.mark([{ at: () => -x1.v / 2, label: 'Ax = 0' }]); }
  };
  const pick = select(d.controls, {
    label: '\\kA', key: 'matrix', value: 'act', aria: 'the matrix A',
    options: [{ value: 'act', label: '[1 2; −1 1]' }, { value: 'fig', label: '[2 −1; −0.5 1.5]' }, { value: 'inv', label: '[3 −2; −2 1]' }, { value: 'zero', label: '[1 2; −2 −4]' }],
    onInput: (v) => { x1.set(P[v].load[0]); x2.set(P[v].load[1]); marks(v); },
  });
  x1 = ctl(d.controls, { label: 'x_1', cls: '', key: 'x1', min: -4, max: 4, step: 0.1, value: 2, unit: '', dec: 1, aria: 'the first component x₁ of x, the weight of the first column', specials: [{ at: 2, label: 'Ax = b' }] });
  x2 = ctl(d.controls, { label: 'x_2', cls: '', key: 'x2', min: -4, max: 4, step: 0.1, value: 2, unit: '', dec: 1, aria: 'the second component x₂ of x, the weight of the second column', specials: [{ at: 2, label: 'Ax = b' }] });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  const cols = (m) => [[m[0], m[2]], [m[1], m[3]]];
  const comb = (m, x) => [m[0] * x[0] + m[1] * x[1], m[2] * x[0] + m[3] * x[1]];

  function draw() {
    const { ctx } = begin(d.c);
    const vc = C('vector'), mc = C('matrix'), ink = PAL.ink, mu = PAL.muted;
    const g = ease.smooth(arrival(d));
    const v = pick.value, p = P[v], x = [r1(x1.v), r1(x2.v)];
    const blend = pick.mix((k) => [...P[k].m, ...P[k].b]);
    const Am = blend.slice(0, 4), bm = blend.slice(4, 6);
    const [c1, c2] = cols(Am), Ax = comb(Am, x), step1 = [x[0] * c1[0], x[0] * c1[1]];
    const A = p.m, AX = comb(A, x).map(r2), landed = p.sol ? Math.abs(x[0] - p.sol[0]) < 0.05 && Math.abs(x[1] - p.sol[1]) < 0.05 : Math.abs(x[0] + 2 * x[1]) < 0.05;
    const settled = ease.smooth(pick.k);
    hits = [];
    /* the plane: the lattice of whole-number combinations of the columns, then the axes */
    ctx.save(); ctx.beginPath(); ctx.rect(BOX.l, BOX.t, BOX.r - BOX.l, BOX.b - BOX.t); ctx.clip();
    const sx = (q) => OX + q * U, sy = (q) => OY - q * U;
    const ray = (o, dir) => line(ctx, sx(o[0] - 40 * dir[0]), sy(o[1] - 40 * dir[1]), sx(o[0] + 40 * dir[0]), sy(o[1] + 40 * dir[1]), alpha(ink, 0.11), 1.5);
    /* parallel columns: the lattice lines all coincide, so one line stands for them */
    if (Math.abs(c1[0] * c2[1] - c1[1] * c2[0]) < 0.05) ray([0, 0], c1);
    else for (let k = -14; k <= 14; k++) { ray([k * c2[0], k * c2[1]], c1); ray([k * c1[0], k * c1[1]], c2); }
    ctx.restore();
    const ax = axes(ctx, BOX, [-10, 10], [-7, 7], { nx: 10, ny: 7, fx: (q) => fmt(q, 0), fy: (q) => fmt(q, 0) });
    const S = (q) => [g * q[0], g * q[1]];
    /* b, the book's right-hand side: a dashed arrow, or a hollow ring at the origin when b = 0 */
    const bZero = Math.hypot(bm[0], bm[1]) < 0.05;
    vec(ctx, ax, [0, 0], S(bm), vc, 4, [14, 9], bZero ? 0 : 0.8);
    /* the walk: x₁ steps along v₁, then x₂ along v₂ */
    vec(ctx, ax, [0, 0], S(step1), vc, 3, [9, 7], 0.6);
    vec(ctx, ax, S(step1), S(Ax), vc, 3, [9, 7], 0.6);
    /* the columns, then Ax */
    vec(ctx, ax, [0, 0], S(c1), vc, 5);
    vec(ctx, ax, [0, 0], S(c2), vc, 5);
    vec(ctx, ax, [0, 0], S(Ax), vc, 5);
    if (bZero) { ctx.save(); ctx.globalAlpha *= 0.8; dot(ctx, ax.X(0), ax.Y(0), vc, false, 11); ctx.restore(); }
    dot(ctx, ax.X(0), ax.Y(0), ink, true, 5);
    /* labels, once the picture has settled into its matrix */
    if (g > 0.99) {
      ctx.save(); ctx.globalAlpha *= settled;
      outer(ctx, ax, c1, c2, '$\\kvecvone$', vc);
      outer(ctx, ax, c2, c1, '$\\kvecvtwo$', vc);
      const axL = Math.hypot(Ax[0], Ax[1]);
      if (landed && !bZero) past(ctx, ax, [0, 0], Ax, '$\\kA\\kvecx = \\kvecb$', vc, 34);
      else if (landed && bZero) tag(ctx, '$\\kA\\kvecx = \\kveczero$', ax.X(0) + 28, ax.Y(0) + 30, vc, 'left');
      else {
        if (axL > 0.3) past(ctx, ax, [0, 0], Ax, '$\\kA\\kvecx$', vc, 32);
        if (!bZero) past(ctx, ax, [0, 0], bm, '$\\kvecb$', vc, 30);
        else tag(ctx, '$\\kvecb = \\kveczero$', ax.X(0) + 28, ax.Y(0) + 30, vc, 'left');
      }
      ctx.restore();
    }
    /* hover names */
    const C1 = [A[0], A[2]], C2 = [A[1], A[3]];
    const sg = (q) => (q < 0 ? '−' : '+');
    hits.push(
      { x: ax.X(C1[0]), y: ax.Y(C1[1]), r: 18, name: `v₁ = ${pt(C1)}, the first column of A` },
      { x: ax.X(C2[0]), y: ax.Y(C2[1]), r: 18, name: `v₂ = ${pt(C2)}, the second column of A` },
      { x: ax.X(step1[0] / 2), y: ax.Y(step1[1] / 2), r: 14, name: `x₁v₁ = ${numT(x[0])}v₁, the first step` },
      { x: ax.X((step1[0] + Ax[0]) / 2), y: ax.Y((step1[1] + Ax[1]) / 2), r: 14, name: `x₂v₂ = ${numT(x[1])}v₂, the second step, from the head of the first` },
      { x: ax.X(AX[0]), y: ax.Y(AX[1]), r: 20, name: `Ax = ${numT(x[0])}v₁ ${sg(x[1])} ${numT(Math.abs(x[1]))}v₂ = ${pt(AX)}` },
      { x: ax.X(p.b[0]), y: ax.Y(p.b[1]), r: 16, name: p.sol ? `b = ${pt(p.b)}, the vector of ${p.where}; Ax = b at x = ${pt(p.sol)}` : 'b = 0, the zero vector: Ax = 0 whenever x₁ = −2x₂' },
      { x: ax.X((C1[0] + C2[0]) / 2), y: ax.Y((C1[1] + C2[1]) / 2), r: 12, name: 'a cell of the lattice: the combinations of v₁ and v₂ with whole-number weights sit at its corners' },
    );
    /* headline and readout */
    const w1 = num(x[0]), w2a = num(Math.abs(x[1])), s2 = x[1] < 0 ? '-' : '+';
    const sum = `${w1}\\kvecvone ${s2} ${w2a}\\kvecvtwo`;
    let h;
    if (v === 'zero') {
      h = `$\\kA\\kvecx = ${sum} = ${ptT(AX)}$: the columns lie on one line, so every $\\kA\\kvecx$ does too${landed ? `, and here $\\kA\\kvecx = \\kveczero$ with $\\kvecx = ${ptT(x)}$.` : `; $\\kA\\kvecx = \\kveczero$ whenever $x_1 = -2x_2$.`}`;
    } else if (landed) {
      h = `$\\kA\\kvecx = ${sum} = ${ptT(AX)} = \\kvecb$: $x_1 = ${w1}$ steps along the first column, then $x_2 = ${num(x[1])}$ along the second, land on $\\kvecb$, so $\\kvecx = ${ptT(x)}$ solves $\\kA\\kvecx = \\kvecb$.`;
    } else {
      h = `$\\kA\\kvecx = ${sum} = ${ptT(AX)}$: $x_1 = ${w1}$ steps along the first column, then $x_2 = ${num(x[1])}$ along the second; $\\kvecb = ${ptT(p.b)}$ needs the weights at the dashed marks.`;
    }
    headline(ctx, h);
    const lead = x[0] < 0 ? `-${num(Math.abs(x[0]))}` : w1;
    ro.set(`\\kA\\kvecx = ${matM(A)} ${colV(x[0], x[1])} = ${lead} ${colV(A[0], A[2])} ${s2} ${w2a} ${colV(A[1], A[3])} = ${colV(AX[0], AX[1])}`,
      `The row shortcut: $${par(A[0])}(${num(x[0])}) + ${par(A[1])}(${num(x[1])}) = ${num(AX[0])}$ from the first row of $\\kA$, and $${par(A[2])}(${num(x[0])}) + ${par(A[3])}(${num(x[1])}) = ${num(AX[1])}$ from the second.`,
      { form: v });
  }
  still(d, draw);
})();
};
