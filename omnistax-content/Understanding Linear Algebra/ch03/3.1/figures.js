/* Figures for section 3.1 Invertibility. */
window.OMNISTAX_FIGURES = window.OMNISTAX_FIGURES || {};
window.OMNISTAX_FIGURES['3.1'] = function (root, F) {
const { C, PAL, alpha, ctl, choice, select, begin, axes, drag, line, arrow, dot, text, headline, register, readout, hover, arrival, ease, pinned, fmt } = F;
const sim = (id, H) => F.sim(root, id, H);
const still = (d, draw) => register(d.fig, { update: () => {}, draw });
/* a number as the readout writes it: at most two decimals, no trailing zeros, never −0 */
const r2 = (v) => { const r = Math.round(v * 100) / 100; return Object.is(r, -0) ? 0 : r; };
const r1 = (v) => { const r = Math.round(v * 10) / 10; return Object.is(r, -0) ? 0 : r; };
const num = (v) => String(r2(v));
const numT = (v) => num(v).replace('-', '−');            /* the same in figure text, with a true minus */
const par = (v) => (r2(v) < 0 ? `(${num(v)})` : num(v));  /* a negative factor in parentheses */
const col = (a, b) => `\\begin{bmatrix} ${a} \\\\ ${b} \\end{bmatrix}`;
const colOf = (p) => col(num(p[0]), num(p[1]));
const mat = (m) => `\\begin{bmatrix} ${num(m[0])} & ${num(m[1])} \\\\ ${num(m[2])} & ${num(m[3])} \\end{bmatrix}`;
const kmat = (m) => `\\htmlClass{kv-matrix}{${mat(m)}}`;
const pt = (v) => `(${numT(v[0])}, ${numT(v[1])})`;      /* a point in figure text */
const ptT = (v) => `(${num(v[0])}, ${num(v[1])})`;       /* a point inside TeX */
const tag = (ctx, s, x, y, color, align = 'center', size = 22) => text(ctx, s, x, y, color, { size, weight: 600, tex: true, bg: PAL.panel, align });
const inBox = (box, x, y) => x >= box.l && x <= box.r && y >= box.t && y <= box.b;
/* a 2 × 2 matrix [a, b, c, d] applied to a point of the plane */
const ap = (m, p) => [m[0] * p[0] + m[1] * p[1], m[2] * p[0] + m[3] * p[1]];
const det = (m) => m[0] * m[3] - m[1] * m[2];

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
  if (!inBox(box, x2, y2)) { ctx.save(); ctx.globalAlpha *= a; pinned(ctx, box, X, Y, h[0], h[1], color); ctx.restore(); }
}
/* a segment of the plane from p to q, clipped to the box */
function seg(ctx, ax, p, q, color, w, dash) {
  const { X, Y, box } = ax;
  ctx.save(); ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip();
  line(ctx, X(p[0]), Y(p[1]), X(q[0]), Y(q[1]), color, w, dash);
  ctx.restore();
}
/* a label just past the head of the arrow t → h, along its direction */
function past(ctx, ax, t, h, s, color, gap = 30, size = 22) {
  const { X, Y, box } = ax, x1 = X(t[0]), y1 = Y(t[1]), x2 = X(h[0]), y2 = Y(h[1]), L = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = L < 3 ? 0.6 : (x2 - x1) / L, uy = L < 3 ? -0.6 : (y2 - y1) / L;
  const lx = Math.min(Math.max(x2 + ux * gap, box.l + 30), box.r - 30), ly = Math.min(Math.max(y2 + uy * (gap - 6), box.t + 14), box.b - 14);
  tag(ctx, s, lx, ly, color, ux > 0.55 ? 'left' : ux < -0.55 ? 'right' : 'center', size);
}
/* the grip ring of a head the reader can drag */
const ring = (ctx, ax, p, color) => { const { X, Y, box } = ax, x = X(p[0]), y = Y(p[1]); if (!inBox(box, x, y)) return; ctx.save(); ctx.strokeStyle = alpha(color, 0.35); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); };
const clear = (c) => alpha(c, 0);
/* the plane: a faint unit grid under the axes, then the axes with integer ticks */
function plane(ctx, BOX, xr, yr) {
  const U = (BOX.r - BOX.l) / (xr[1] - xr[0]), ink = PAL.ink;
  ctx.save(); ctx.beginPath(); ctx.rect(BOX.l, BOX.t, BOX.r - BOX.l, BOX.b - BOX.t); ctx.clip();
  for (let i = xr[0]; i <= xr[1]; i++) line(ctx, BOX.l + (i - xr[0]) * U, BOX.t, BOX.l + (i - xr[0]) * U, BOX.b, alpha(ink, 0.07), 1.5);
  for (let j = yr[0]; j <= yr[1]; j++) line(ctx, BOX.l, BOX.b - (j - yr[0]) * U, BOX.r, BOX.b - (j - yr[0]) * U, alpha(ink, 0.07), 1.5);
  ctx.restore();
  return axes(ctx, BOX, xr, yr, { xl: 'x', yl: 'y', nx: xr[1] - xr[0], ny: yr[1] - yr[0], fx: (q) => fmt(q, 0), fy: (q) => fmt(q, 0) });
}

/* Sim: the inverse as the transformation undone. One plane, x and y from −5 to 5 at 72 units to 1, its unit grid
   in ink. A copy of the grid, the unit square shaded, e₁, e₂ and the vector x are carried by A at the step
   "after A" (the grid of the columns of A, dashed, in the matrix hue; e₁ and e₂ land on the columns, x lands on b)
   and brought back by A⁻¹ at "then A⁻¹" (the grid returns, solid, since A⁻¹A = I). The target b is dragged and
   x = A⁻¹b follows, so the solution of Ax = b is seen as the vector A carries onto b. The matrix is a choice of
   the book's own: the preview's rotation [0 −1; 1 0] (the default, with the preview's b = (3, −2), so x = (−2, −3)
   on load), Example 3.1.3's [1 2; 1 1], Activity 3.1.2's A = [3 −2; 1 −1] and its C = [−2 1; 4 −2], and the
   reader's own entries; a, b, c, d are sliders (−4 to 4 by 0.5) the choice sets, each with a dashed special at the
   value that makes ad − bc = 0, where the plane is squashed onto a line and nothing returns. Still: an order of
   steps, not a clock; a change of step or of matrix bends the grid and the arrows over the choice's own 0.9 s. */
(function () {
  const d = sim('sim-inverse-transformation', 880);
  const BOX = { l: 340, r: 1060, t: 110, b: 830 }, XR = [-5, 5], YR = [-5, 5];
  const MATS = { rot: [0, -1, 1, 0], ex313: [1, 2, 1, 1], act: [3, -2, 1, -1], sing: [-2, 1, 4, -2] };
  const I2 = [1, 0, 0, 1];
  let sl = null, lastOwn = MATS.rot;
  const cur = () => sl.map((s) => r1(s.v));
  const same = (m, n) => m && n && m.every((v, i) => Math.abs(v - n[i]) < 1e-9);
  const pick = select(d.controls, {
    label: '\\kA', key: 'matrix', value: 'rot',
    options: [
      { value: 'rot', label: 'rotate by 90° (Example 3.1.2)' }, { value: 'ex313', label: '[1 2; 1 1] (Example 3.1.3)' },
      { value: 'act', label: '[3 −2; 1 −1] (Activity 3.1.2)' }, { value: 'sing', label: '[−2 1; 4 −2] (Activity 3.1.2)' }, { value: 'own', label: 'own entries' },
    ],
    onInput: (v) => { const m = MATS[v]; if (!m) return; lastOwn = cur(); sl.forEach((s, i) => s.set(m[i])); },
  });
  /* the value of one entry that makes ad − bc = 0, from the other three */
  const sing = (i) => () => {
    const [a, b, c, dd] = cur(), v = i === 0 ? (b * c) / dd : i === 1 ? (a * dd) / c : i === 2 ? (a * dd) / b : (b * c) / a;
    const den = i === 0 ? dd : i === 1 ? c : i === 2 ? b : a;
    return Math.abs(den) < 1e-9 || !Number.isFinite(v) || Math.abs(v) > 4 ? null : Math.round(v * 1000) / 1000;
  };
  const entry = (label, key, value, i) => ctl(d.controls, {
    label, cls: '', key, min: -4, max: 4, step: 0.5, value, unit: '', dec: 1, aria: `the entry ${label} of A`,
    specials: [{ at: sing(i), label: 'ad − bc = 0' }],
    onInput: () => { if (pick.value !== 'own' && !same(cur(), MATS[pick.value])) pick.set('own'); },
  });
  sl = [entry('a', 'a', 0, 0), entry('b', 'b', -1, 1), entry('c', 'c', 1, 2), entry('d', 'd', 0, 3)];
  const step = choice(d.controls, { label: 'step', key: 'step', value: 'plane', options: [{ value: 'plane', label: 'the plane' }, { value: 'A', label: 'after A' }, { value: 'back', label: 'then A⁻¹' }] });
  const b1 = ctl(d.controls, { label: 'b_1', cls: '', key: 'b1', min: -4, max: 4, step: 0.5, value: 3, unit: '', dec: 1, aria: 'the first component of b' });
  const b2 = ctl(d.controls, { label: 'b_2', cls: '', key: 'b2', min: -4, max: 4, step: 0.5, value: -2, unit: '', dec: 1, aria: 'the second component of b' });
  const PB = drag(d, { x: b1, y: b2 });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);

  /* the matrix applied at a step: nothing, A, or A then A⁻¹ (the identity, or A again when nothing can return) */
  const atStep = (s, A, singular) => (s === 'plane' ? I2 : s === 'A' ? A : singular ? A : I2);
  /* the image of the grid: the lines x = i and y = i carried by G, the axes' images heavier */
  function carriedGrid(ctx, ax, G, color, a, dash) {
    if (!(a > 0.001)) return;
    ctx.save(); ctx.globalAlpha *= a;
    for (let i = -8; i <= 8; i++) {
      const c = alpha(color, i === 0 ? 0.7 : 0.3), w = i === 0 ? 2.5 : 1.5;
      seg(ctx, ax, ap(G, [i, -14]), ap(G, [i, 14]), c, w, dash);
      seg(ctx, ax, ap(G, [-14, i]), ap(G, [14, i]), c, w, dash);
    }
    ctx.restore();
  }
  /* the unit square carried by G, shaded */
  function carriedSquare(ctx, ax, G, color, a) {
    if (!(a > 0.001)) return;
    const P = [[0, 0], [1, 0], [1, 1], [0, 1]].map((p) => ap(G, p));
    ctx.save(); ctx.globalAlpha *= a; ctx.beginPath(); ctx.rect(ax.box.l, ax.box.t, ax.box.r - ax.box.l, ax.box.b - ax.box.t); ctx.clip();
    ctx.fillStyle = alpha(color, 0.18); ctx.strokeStyle = alpha(color, 0.8); ctx.lineWidth = 2;
    ctx.beginPath(); P.forEach((p, i) => (i ? ctx.lineTo(ax.X(p[0]), ax.Y(p[1])) : ctx.moveTo(ax.X(p[0]), ax.Y(p[1])))); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  /* where a singular A sends the plane: a line through the origin along its nonzero column, or the origin alone */
  function squashLine(A) {
    const c1 = [A[0], A[2]], c2 = [A[1], A[3]];
    const u = Math.hypot(c1[0], c1[1]) > 1e-9 ? c1 : Math.hypot(c2[0], c2[1]) > 1e-9 ? c2 : null;
    return u;
  }

  function draw() {
    const { ctx } = begin(d.c);
    const vc = C('vector'), mc = C('matrix'), ink = PAL.ink;
    const g = ease.smooth(arrival(d));
    const A = cur(), dt = r2(det(A)), singular = Math.abs(dt) < 1e-9, b = [r1(b1.v), r1(b2.v)];
    const Ainv = singular ? null : [A[3] / dt, -A[1] / dt, -A[2] / dt, A[0] / dt];
    const x = Ainv ? ap(Ainv, b).map(r2) : null;
    /* the matrix as drawn: a change of preset bends the old entries into the new */
    const Am = pick.mix((v) => (v === 'own' ? (pick.value === 'own' ? A : lastOwn) : MATS[v]));
    const s = step.value, settled = ease.smooth(step.k);
    const G = step.mix((v) => atStep(v, Am, singular));
    const dashed = step.mix((v) => (v === 'A' ? 1 : 0));
    hits = [];
    const ax = plane(ctx, BOX, XR, YR);
    const S = (p) => [g * p[0], g * p[1]];
    /* the carried grid, dashed after A and solid otherwise, and the unit square's image */
    carriedGrid(ctx, ax, G, mc, g * dashed, [10, 9]);
    carriedGrid(ctx, ax, G, mc, g * (1 - dashed));
    carriedSquare(ctx, ax, G, mc, g);
    /* e₁, e₂ and x carried along; b stays where it is */
    const e1 = ap(G, [1, 0]), e2 = ap(G, [0, 1]), xs = x ? ap(G, x) : null;
    vec(ctx, ax, [0, 0], S(e1), vc, 4);
    vec(ctx, ax, [0, 0], S(e2), vc, 4);
    if (xs) vec(ctx, ax, [0, 0], S(xs), vc, 5);
    dot(ctx, ax.X(0), ax.Y(0), ink, true, 5);
    const bx = ax.X(b[0]), by = ax.Y(b[1]);
    if (inBox(BOX, bx, by)) dot(ctx, bx, by, vc, false, 9);
    PB.draw(ctx, ax, clear(vc));
    ring(ctx, ax, b, vc);
    /* labels, once arrived and settled into the step */
    const carried = s === 'A' || (s === 'back' && singular);   /* after A, or after a step back that returned nothing */
    if (g > 0.99) {
      ctx.save(); ctx.globalAlpha *= settled;
      const nm = (base) => (carried ? `\\kA${base}` : base);
      past(ctx, ax, [0, 0], e1, `$${nm('\\kveceone')}$`, vc, 24, 20);
      past(ctx, ax, [0, 0], e2, `$${nm('\\kvecetwo')}$`, vc, 24, 20);
      if (xs) past(ctx, ax, [0, 0], xs, `$${carried ? '\\kA\\kvecx = \\kvecb' : '\\kvecx'}$`, vc, 34);
      ctx.restore();
      if (!(carried && xs) && inBox(BOX, bx, by)) tag(ctx, '$\\kvecb$', bx + 4, by - 26, vc, 'center');
    }
    /* hover names */
    const colNm = (i) => `${numT(A[i])}, ${numT(A[i + 2])}`;
    hits.push({ x: ax.X(e1[0]), y: ax.Y(e1[1]), r: 16, name: carried ? `Ae₁ = (${colNm(0)}), the first column of A` : s === 'back' ? 'A⁻¹Ae₁ = e₁ = (1, 0), back where it started' : 'e₁ = (1, 0)' });
    hits.push({ x: ax.X(e2[0]), y: ax.Y(e2[1]), r: 16, name: carried ? `Ae₂ = (${colNm(1)}), the second column of A` : s === 'back' ? 'A⁻¹Ae₂ = e₂ = (0, 1), back where it started' : 'e₂ = (0, 1)' });
    if (xs) hits.push({ x: ax.X(xs[0]), y: ax.Y(xs[1]), r: 18, name: carried ? `Ax = b = ${pt(b)}: A carries x onto b` : `x = A⁻¹b = ${pt(x)}, the solution of Ax = b` });
    hits.push({ x: bx, y: by, r: 20, name: `b = ${pt(b)}; drag it` });
    const sq = ap(G, [0.5, 0.5]);
    hits.push({ x: ax.X(sq[0]), y: ax.Y(sq[1]), r: 14, name: carried ? `the unit square carried by A: a parallelogram on the columns of A, of area |ad − bc| = ${numT(Math.abs(dt))}` : 'the unit square' });
    const gl = ap(G, [2, 3.5]);
    hits.push({ x: ax.X(gl[0]), y: ax.Y(gl[1]), r: 12, name: carried ? 'the grid line x = 2 carried by A' : 'the grid line x = 2' });
    /* headline and readout */
    const rot = pick.value === 'rot' && same(A, MATS.rot);
    let h;
    if (!singular) {
      if (s === 'plane') h = `$\\kvecx = \\kAinv\\kvecb = ${ptT(x)}$ is the vector that $\\kA$ will carry onto $\\kvecb = ${ptT(b)}$.`;
      else if (s === 'A') h = rot ? `$\\kA$ rotates the plane by $90^\\circ$ counterclockwise: the grid turns with it, and $\\kvecx$ lands on $\\kvecb = ${ptT(b)}$.`
        : `$\\kA$ carries the grid to the grid of its columns, and $\\kvecx$ onto $\\kA\\kvecx = \\kvecb = ${ptT(b)}$.`;
      else h = rot ? `$\\kAinv$ rotates the plane back by $90^\\circ$ clockwise: the grid returns and $\\kA\\kvecx$ returns to $\\kvecx = ${ptT(x)}$, since $\\kAinv\\kA = \\kI$.`
        : `$\\kAinv$ carries everything back: the grid returns and $\\kA\\kvecx$ returns to $\\kvecx = ${ptT(x)}$, since $\\kAinv\\kA = \\kI$.`;
    } else {
      const u = squashLine(A), onIt = u ? Math.abs(u[0] * b[1] - u[1] * b[0]) < 1e-9 : b[0] === 0 && b[1] === 0;
      const where = u ? 'a line' : 'the origin', many = onIt ? 'infinitely many solutions' : 'no solution';
      const lies = u ? (onIt ? 'lies on it' : 'lies off it') : (onIt ? 'is the origin' : 'is not the origin');
      if (s === 'plane') h = `$ad - bc = 0$: $\\kA$ will squash the plane onto ${where}; $\\kvecb = ${ptT(b)}$ ${lies}, so $\\kA\\kvecx = \\kvecb$ has ${many}.`;
      else if (s === 'A') h = `$\\kA$ squashes the plane onto ${where}: every grid line lands on it, and $\\kvecb$ ${lies}, so $\\kA\\kvecx = \\kvecb$ has ${many}.`;
      else h = `Nothing returns: no matrix unfolds ${where} back into the plane, so $\\kA$ has no inverse.`;
    }
    headline(ctx, h);
    if (!singular) {
      ro.set(`\\kAinv = \\frac{1}{ad - bc}\\begin{bmatrix} d & -b \\\\ -c & a \\end{bmatrix} = \\frac{1}{${num(dt)}}${mat([A[3], -A[1], -A[2], A[0]])} = ${kmat(Ainv)}`,
        `$\\kvecx = \\kAinv\\kvecb = ${kmat(Ainv)}${colOf(b)} = ${colOf(x)}$, and $\\kA\\kvecx = \\kvecb$.`, { form: 'inv' });
    } else {
      const u = squashLine(A), onIt = u ? Math.abs(u[0] * b[1] - u[1] * b[0]) < 1e-9 : b[0] === 0 && b[1] === 0;
      ro.set(`ad - bc = (${num(A[0])})(${num(A[3])}) - (${num(A[1])})(${num(A[2])}) = 0`,
        `$\\kA = ${kmat(A)}$ has no inverse, and $\\kA\\kvecx = ${colOf(b)}$ has ${onIt ? 'infinitely many solutions' : 'no solution'}.`, { form: 'sing' });
    }
  }
  still(d, draw);
})();
};
