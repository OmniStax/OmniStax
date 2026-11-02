/* Figures for section 3.5 Subspaces. */
window.OMNISTAX_FIGURES = window.OMNISTAX_FIGURES || {};
window.OMNISTAX_FIGURES['3.5'] = function (root, F) {
const { C, PAL, alpha, ctl, choice, begin, axes, line, arrow, dot, text, headline, register, readout, hover, ease, arrival } = F;
const SP = F.space;
const sim = (id, H) => F.sim(root, id, H);
const still = (d, draw) => register(d.fig, { update: () => {}, draw });
const EPS = 1e-9;
/* a number as the readout writes it: at most two decimals, no trailing zeros, never −0; TeX minus is a hyphen */
const r2 = (v) => { const r = Math.round(v * 100) / 100; return Object.is(r, -0) ? 0 : r; };
const num = (v) => String(r2(v));
const numT = (v) => num(v).replace('-', '−');          /* the same in plain text, with a true minus */
const near = (a, b) => Math.abs(a - b) < 1e-9;
const vecT = (p) => `[${p.map(numT).join(', ')}]`;      /* a vector in plain text */
const vecK = (p) => `[${p.map(num).join(', ')}]`;       /* the same in TeX */
const mtx = (rows) => `\\htmlClass{kv-matrix}{\\left[\\begin{array}{${'r'.repeat(rows[0].length)}} ${rows.map((rw) => rw.map(num).join(' & ')).join(' \\\\ ')} \\end{array}\\right]}`;
/* the term c·v of a linear combination as TeX: 1 unwritten, −1 a sign, 0 dropped; `first` drops a leading plus */
function term(c, v, first) {
  const k = r2(c); if (k === 0) return '';
  const mag = Math.abs(k), body = (mag === 1 ? '' : num(mag)) + v;
  return k < 0 ? ` - ${body}` : first ? body : ` + ${body}`;
}
function combo(cs, vs) {
  let s = '', first = true;
  cs.forEach((c, i) => { const t = term(c, vs[i], first); if (t) { s += t; first = false; } });
  s = s.trim().replace(/^- /, '-');
  return s === '' ? '\\kveczero' : s;
}
/* the reduced row echelon form of the 3 × k matrix with these columns, and its pivot columns */
function rref(cols) {
  const m = 3, n = cols.length, A = Array.from({ length: m }, (_, r) => cols.map((c) => c[r]));
  const piv = []; let r = 0;
  for (let c = 0; c < n && r < m; c++) {
    let p = r; for (let i = r + 1; i < m; i++) if (Math.abs(A[i][c]) > Math.abs(A[p][c])) p = i;
    if (Math.abs(A[p][c]) < 1e-9) continue;
    [A[r], A[p]] = [A[p], A[r]];
    const s = A[r][c]; for (let j = 0; j < n; j++) A[r][j] /= s;
    for (let i = 0; i < m; i++) if (i !== r) { const f = A[i][c]; if (Math.abs(f) > 1e-12) for (let j = 0; j < n; j++) A[i][j] -= f * A[r][j]; }
    piv.push(c); r++;
  }
  return { A: A.map((row) => row.map(r2)), piv };
}
/* the lattice of combinations i·a + t·b on the plane of a and b, clipped to the box, in guide ink */
function latticeOn(a, b, box) {
  const out = [];
  for (let i = -8; i <= 8; i++) { if (i) out.push(...SP.line(SP.mul(b, i), a, 'guide', { box, w: 1.2 })); out.push(...SP.line(SP.mul(a, i), b, 'guide', { box, w: 1.2 })); }
  return out;
}
/* the box's six faces, for a subspace that is all of space */
function boxFaces(box, color, a, name) {
  const c = (i, j, k) => [box[0][i], box[1][j], box[2][k]];
  const faces = [[c(0, 0, 0), c(1, 0, 0), c(1, 1, 0), c(0, 1, 0)], [c(0, 0, 1), c(1, 0, 1), c(1, 1, 1), c(0, 1, 1)], [c(0, 0, 0), c(0, 1, 0), c(0, 1, 1), c(0, 0, 1)], [c(1, 0, 0), c(1, 1, 0), c(1, 1, 1), c(1, 0, 1)], [c(0, 0, 0), c(1, 0, 0), c(1, 0, 1), c(0, 0, 1)], [c(0, 1, 0), c(1, 1, 0), c(1, 1, 1), c(0, 1, 1)]];
  return [{ k: 'faces', faces, color, alpha: a, name }];
}
/* the corner of a polygon farthest along dir, for a label that stays out of the way */
const corner = (poly, dir) => poly.reduce((best, q) => (SP.dot(q, dir) > SP.dot(best, dir) ? q : best), poly[0]);
const DIM_WORD = ['0-dimensional', '1-dimensional', '2-dimensional', '3-dimensional'];

/* Sim: the four kinds of subspace of ℝ³ (the two unnumbered drawings of Example 3.5.2, the line of Figure 2.3.12 and the
   plane of Figure 2.3.13, and the other two items of the example). A choice of kind: the origin Span{0}; a line Span{v}
   with the book's v = [−2, 3, 1]; a plane Span{v₁, v₂} with the book's v₁ = [−2, 3, 1], v₂ = [1, −1, 3] (the default);
   all of ℝ³ as Span{e₁, e₂, e₃}. The subspace is drawn in region (a dot, the line through the box, the plane clipped to the
   box with the lattice of combinations ruled on it in guide ink, the box tinted) and its basis as arrows in vector. The
   weights c₁, c₂, c₃ of a point x = c₁v₁ + c₂v₂ + c₃v₃ of the subspace are sliders, as many as the dimension (−1 to 1 on the
   line and the plane, −3 to 3 in space, step 0.1); x is walked tip to tail along the basis and never leaves the subspace,
   and a dashed special at 0 on each slider, shown while the other weights are 0, is the zero vector every subspace holds.
   Mathematical 3D (root rule 28.3): free orbit, no ground, pitch bounded to [−0.3, 1.45] since the box reads z up; the box
   is ±4; a flat painted copy without WebGL. Still: a span has no clock; a change of kind swaps the layers and the sliders. */
(function () {
  const d = sim('sim-subspaces-of-space');
  const box = [[-4, 4], [-4, 4], [-4, 4]];
  const S = F.space3d(d, { box, h: 640, pitch: [-0.3, 1.45], fit: 2.6, turn: -2.25, tilt: 0.42 });
  const KINDS = {
    origin: { label: 'the origin', vs: [], tex: [], plain: [], range: [-1, 1, 0.1], start: [] },
    line: { label: 'a line', vs: [[-2, 3, 1]], tex: ['\\kvecv'], plain: ['v'], range: [-1, 1, 0.1], start: [1] },
    plane: { label: 'a plane', vs: [[-2, 3, 1], [1, -1, 3]], tex: ['\\kvecvone', '\\kvecvtwo'], plain: ['v₁', 'v₂'], range: [-1, 1, 0.1], start: [1, 0.5] },
    space: { label: 'all of ℝ³', vs: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], tex: ['\\kveceone', '\\kvecetwo', '\\kvecethree'], plain: ['e₁', 'e₂', 'e₃'], range: [-3, 3, 0.1], start: [1.5, 1, 2] },
  };
  let kindKey = 'plane';
  const sl = [];
  const apply = (k, ms) => {
    const K = KINDS[k];
    sl.forEach((s, i) => {
      const on = i < K.vs.length;
      if (on) { s.range({ min: K.range[0], max: K.range[1], step: K.range[2], value: K.start[i], unit: '', dec: 1 }); s.set(K.start[i]); }
      s.show(on, ms);
    });
    sl.forEach((s) => s.refresh());
  };
  const pick = choice(d.controls, {
    label: 'subspace', key: 'kind', value: 'plane', aria: 'which kind of subspace of three-dimensional space is drawn',
    options: Object.keys(KINDS).map((k) => ({ value: k, label: KINDS[k].label })),
    onInput: (k) => { kindKey = k; apply(k); },
  });
  /* the special at 0 on weight i: the zero vector, shown while the other weights are already 0 */
  const zeroAt = (i) => (sl.every((s, j) => j === i || j >= KINDS[kindKey].vs.length || near(s.v, 0)) ? 0 : null);
  [0, 1, 2].forEach((i) => {
    sl.push(ctl(d.controls, { label: `c_${i + 1}`, cls: '', key: `c${i + 1}`, min: -1, max: 1, step: 0.1, value: KINDS.plane.start[i] ?? 1, unit: '', dec: 1, aria: `the weight c${i + 1} of the point x in the subspace`, specials: [{ at: () => zeroAt(i), label: 'the zero vector' }] }));
  });
  apply('plane', { ms: 0 });
  const ro = readout(d);

  still(d, () => {
    const K = KINDS[kindKey], rc = C('region'), vc = C('vector'), dim = K.vs.length;
    const cs = K.vs.map((_, i) => sl[i].v);
    const setT = dim ? `\\kSpan\\{${K.tex.join(', ')}\\}` : '\\kSpan\\{\\kveczero\\}';
    const setP = dim ? `Span{${K.plain.join(', ')}}` : 'Span{0}';
    S.set('axes', SP.axes(box, { ticks: 2 }));
    /* the subspace */
    let span;
    if (dim === 0) span = [{ k: 'dot', p: [0, 0, 0], color: rc, r: 9, name: `S = ${setP}: only the zero vector` }];
    else if (dim === 1) span = SP.line([0, 0, 0], K.vs[0], rc, { box, w: 5 }).map((m) => ({ ...m, name: `S = ${setP}: the line of all multiples of v` }));
    else if (dim === 2) {
      const n = SP.cross(K.vs[0], K.vs[1]);
      span = [...SP.plane([0, 0, 0], n, rc, { box, alpha: 0.3 }).map((m) => ({ ...m, name: `S = ${setP}: the plane of all combinations of v₁ and v₂` })), ...latticeOn(K.vs[0], K.vs[1], box)];
    } else span = boxFaces(box, rc, 0.1, `S = ${setP} = ℝ³: every point of space`);
    S.set('span', span);
    /* the basis, each vector labelled at its head */
    const basis = [];
    K.vs.forEach((v, i) => {
      basis.push({ k: 'arrow', a: [0, 0, 0], b: v, color: vc, w: 5, name: `${K.plain[i]} = ${vecT(v)}, a vector of the basis` });
      basis.push({ k: 'label', s: `$${K.tex[i]}$`, p: SP.add(SP.add(v, SP.mul(SP.unit(v), 0.5)), [0.25, 0.25, 0]), color: vc });
    });
    S.set('basis', basis);
    /* the point x = c₁v₁ + c₂v₂ + c₃v₃, walked tip to tail */
    let x = [0, 0, 0]; const walk = [[0, 0, 0]];
    cs.forEach((c, i) => { x = SP.add(x, SP.mul(K.vs[i], c)); walk.push(x); });
    const marks = [];
    const zero = SP.norm(x) < 1e-9;
    if (dim > 0) {
      if (walk.length > 2) marks.push({ k: 'line', pts: walk, color: 'guide', w: 2.5, dash: [6, 6], name: `the walk ${cs.map((c, i) => `${numT(c)} ${K.plain[i]}`).join(', then ')} from the origin` });
      if (zero) marks.push({ k: 'dot', p: [0, 0, 0], color: vc, r: 8, name: 'x = 0: every weight is 0, and the zero vector is in S' });
      else marks.push({ k: 'arrow', a: [0, 0, 0], b: x, color: vc, w: 4, name: `x = ${vecT(x)}, a point of S` });
      marks.push({ k: 'label', s: '$\\kvecx$', p: SP.add(x, SP.mul(SP.unit(zero ? [0, 0, 1] : x), 0.45)), color: vc });
    } else marks.push({ k: 'label', s: '$\\kveczero$', p: [0.35, 0.35, 0.35], color: vc });
    S.set('point', marks);
    /* headline and readout */
    const what = dim === 0 ? 'is the origin alone' : dim === 1 ? 'is a line through the origin' : dim === 2 ? 'is a plane through the origin' : 'is all of space';
    S.headline(dim === 3 ? `$\\kS = ${setT} = {\\mathbb R}^3$: the ${DIM_WORD[3]} subspace, all of space.` : `$\\kS = ${setT}$ ${what}: a ${DIM_WORD[dim]} subspace of ${'$'}{\\mathbb R}^3$.`);
    const tex = dim === 0 ? `\\kS = ${setT} = \\{\\kveczero\\}` : `\\kvecx = ${cs.map((_, i) => `c_${i + 1}${K.tex[i]}`).join(' + ')} = ${combo(cs, K.tex)} = ${vecK(x)}`;
    const note = dim === 0 ? '$\\dim \\kS = 0$: $\\kS$ consists of the single vector $\\kveczero$.' : `$\\dim \\kS = ${dim}$: a basis of $\\kS$ has ${['', 'one vector', 'two vectors', 'three vectors'][dim]}, and ${dim === 1 ? 'one weight places' : dim === 2 ? 'two weights place' : 'three weights place'} every point of $\\kS$.`;
    ro.set(tex, note, { form: dim });
  });
  void pick;
})();

/* Figure 3.5.3: two lines in ℝ² with the same direction [2, 1], the book's two panels side by side on the window [−4, 4]².
   On the left the line through (0, b), the book's y = ½x + 1 at b = 1 (the default), b a slider (−3 to 3, step 0.5) with a
   dashed special at b = 0, where the line passes through the origin and becomes a subspace; on the right the line through
   the origin, Span{v} with v = [2, 1] drawn as an arrow, and a weight c (−2 to 2, step 0.25, default 1) placing cv on it, a
   special at 0, the zero vector. The origin is marked in each panel, hollow on the left while the line misses it; the
   subspace is drawn in region (the right line, and the left at b = 0), the left line in ink otherwise. 45 units to 1. Still. */
(function () {
  const d = sim('sim-lines-in-the-plane', 500);
  const U = 45, WIN = [-4, 4];
  const L = { l: 160, r: 160 + 8 * U, t: 110, b: 110 + 8 * U }, R = { l: 860, r: 860 + 8 * U, t: 110, b: 110 + 8 * U };
  const V = [2, 1], M = 0.5;
  const bS = ctl(d.controls, { label: 'b', cls: '', key: 'b', min: -3, max: 3, step: 0.5, value: 1, unit: '', dec: 1, aria: 'where the line on the left crosses the y-axis', specials: [{ at: 0, label: 'through the origin' }] });
  const cS = ctl(d.controls, { label: 'c', cls: '', key: 'c', min: -2, max: 2, step: 0.25, value: 1, unit: '', dec: 2, aria: 'the multiple of v marked on the line on the right', specials: [{ at: 0, label: 'the zero vector' }] });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  /* the stretch of y = m x + b inside the window */
  function clip(m, b) {
    const pts = [];
    [[WIN[0], m * WIN[0] + b], [WIN[1], m * WIN[1] + b]].forEach(([x, y]) => { if (y >= WIN[0] - EPS && y <= WIN[1] + EPS) pts.push([x, y]); });
    [[(WIN[0] - b) / m, WIN[0]], [(WIN[1] - b) / m, WIN[1]]].forEach(([x, y]) => { if (x > WIN[0] + EPS && x < WIN[1] - EPS) pts.push([x, y]); });
    pts.sort((p, q) => p[0] - q[0]);
    return pts.length < 2 ? null : [pts[0], pts[pts.length - 1]];
  }
  const grid = (ctx, B) => {
    ctx.save(); ctx.beginPath(); ctx.rect(B.l, B.t, B.r - B.l, B.b - B.t); ctx.clip();
    for (let i = -4; i <= 4; i++) { line(ctx, B.l + (i + 4) * U, B.t, B.l + (i + 4) * U, B.b, alpha(PAL.ink, 0.06), 1.5); line(ctx, B.l, B.b - (i + 4) * U, B.r, B.b - (i + 4) * U, alpha(PAL.ink, 0.06), 1.5); }
    ctx.restore();
  };
  const fmtY = (q) => String(q).replace('-', '−'), fmtT = (q) => (q === 4 ? '' : fmtY(q));   /* the last x tick gives way to the axis title */
  const lineTex = (b) => `y = \\tfrac12 x${r2(b) === 0 ? '' : b < 0 ? ` - ${num(-b)}` : ` + ${num(b)}`}`;

  function draw() {
    const { ctx } = begin(d.c);
    const rc = C('region'), vc = C('vector'), ink = PAL.ink;
    const g = ease.smooth(arrival(d)), b = r2(bS.v), c = r2(cS.v), through = b === 0;
    hits = [];
    /* the two panels */
    grid(ctx, L); grid(ctx, R);
    const axL = axes(ctx, L, WIN, WIN, { xl: 'x', yl: 'y', nx: 8, ny: 8, fx: fmtT, fy: fmtY });
    const axR = axes(ctx, R, WIN, WIN, { xl: 'x', yl: 'y', nx: 8, ny: 8, fx: fmtT, fy: fmtY });
    ctx.save(); ctx.globalAlpha *= g;
    /* left: the line y = ½x + b, in region only when it passes through the origin */
    const eL = clip(M, b);
    if (eL) {
      line(ctx, axL.X(eL[0][0]), axL.Y(eL[0][1]), axL.X(eL[1][0]), axL.Y(eL[1][1]), through ? rc : ink, 5);
      for (let j = 1; j < 8; j++) { const x = eL[0][0] + ((eL[1][0] - eL[0][0]) * j) / 8; hits.push({ x: axL.X(x), y: axL.Y(M * x + b), r: 14, name: `the line y = ½x ${b < 0 ? '−' : '+'} ${numT(Math.abs(b))}${through ? ': it passes through the origin and is Span{v}' : ': it misses the origin, so it is not a subspace'}` }); }
    }
    dot(ctx, axL.X(0), axL.Y(0), through ? rc : ink, through, 8);
    hits.push({ x: axL.X(0), y: axL.Y(0), r: 16, name: through ? 'the origin: the zero vector lies on the line' : 'the origin: the zero vector is not on the line' });
    text(ctx, `$${lineTex(b)}$`, (L.l + L.r) / 2, L.t - 30, through ? rc : ink, { size: 22, weight: 600, align: 'center', tex: true });
    /* right: Span{v}, the vector v and the multiple cv */
    const eR = clip(M, 0);
    line(ctx, axR.X(eR[0][0]), axR.Y(eR[0][1]), axR.X(eR[1][0]), axR.Y(eR[1][1]), rc, 5);
    for (let j = 1; j < 8; j++) { const x = eR[0][0] + ((eR[1][0] - eR[0][0]) * j) / 8; hits.push({ x: axR.X(x), y: axR.Y(M * x), r: 14, name: 'Span{v}: every multiple of v = [2, 1], a line through the origin' }); }
    dot(ctx, axR.X(0), axR.Y(0), rc, true, 8);
    hits.unshift({ x: axR.X(0), y: axR.Y(0), r: 16, name: 'the origin: the zero vector, 0 v' });
    arrow(ctx, axR.X(0), axR.Y(0), axR.X(V[0]), axR.Y(V[1]), vc, 5);
    text(ctx, '$\\kvecv$', axR.X(V[0]) + 10, axR.Y(V[1]) - 22, vc, { size: 24, weight: 600, align: 'left', tex: true, bg: PAL.panel });
    hits.unshift({ x: axR.X(V[0]), y: axR.Y(V[1]), r: 16, name: 'v = [2, 1]' });
    const P = [c * V[0], c * V[1]];
    dot(ctx, axR.X(P[0]), axR.Y(P[1]), vc, true, 8);
    if (c !== 0 && c !== 1) text(ctx, `$${num(c)}\\kvecv$`, axR.X(P[0]) + (c > 0 ? 12 : -12), axR.Y(P[1]) + (c > 0 ? 26 : -24), vc, { size: 22, weight: 600, align: c > 0 ? 'left' : 'right', tex: true, bg: PAL.panel });
    hits.unshift({ x: axR.X(P[0]), y: axR.Y(P[1]), r: 14, name: `${numT(c)} v = ${vecT(P)}, on the line` });
    text(ctx, '$\\kSpan\\{\\kvecv\\}$', (R.l + R.r) / 2, R.t - 30, rc, { size: 22, weight: 600, align: 'center', tex: true });
    ctx.restore();
    /* headline and readout */
    headline(ctx, through ? 'Both lines pass through the origin now: each is $\\kSpan\\{\\kvecv\\}$, a subspace of ${\\mathbb R}^2$.'
      : `The line on the left misses the origin, so it is not a subspace; the line on the right is $\\kSpan\\{\\kvecv\\}$.`);
    ro.set(`c\\kvecv = ${num(c)}\\,[2, 1] = ${vecK(P)}`, `The line on the left is $${lineTex(b)}$; $\\kveczero$ is ${through ? 'on it, so it is the span of any nonzero vector on it' : 'not on it, and a subspace must contain $\\kveczero$'}.`, { form: through });
  }
  still(d, draw);
})();

/* Sim: the column space and the null space of a 3 × 3 matrix, drawn in one space (both are subspaces of ℝ³). A choice of
   the section's matrices: Activity 3.5.3's A = [1 3 −1; −2 0 −4; 1 2 0] (the default: Col(A) the plane of v₁ and v₂, Nul(A)
   the line of [−2, 1, 1]); Activity 3.5.2 (c)'s [v₁ v₂ v₃] (Col = ℝ³, Nul = {0}); Activity 3.5.2 (d)'s [w₁ w₂ w₃] (a plane and
   the line of [−1, −2, 1]). The components of the third column are sliders (−4 to 4, step 0.5), each with a dashed special at
   the value that drops the third column into the span of the first two, so dragging it off the plane lifts Col(A) to ℝ³ and
   shrinks Nul(A) to the origin. The columns are arrows in vector; Col(A) is drawn in region filled (the plane with its lattice,
   a line, or the tinted box) and Nul(A) in region dashed (a line, a dot at the origin, a plane with a dashed rim). The readout
   is A ∼ rref and dim Col(A) + dim Nul(A) = 3, the note the null-space basis read as the dependence among the columns.
   Mathematical 3D, free orbit, pitch bounded to [−0.3, 1.45], box ±4, a flat copy without WebGL; the scene opens from above the
   plane of the default (turn −2.9, tilt 0.9), since the book's own view looks along it. Still. */
(function () {
  const d = sim('sim-column-and-null-space');
  const box = [[-4, 4], [-4, 4], [-4, 4]];
  const S = F.space3d(d, { box, h: 640, pitch: [-0.3, 1.45], fit: 2.8, turn: -2.9, tilt: 0.9 });
  const MATS = {
    act3a: { label: 'Activity 3.5.3: A', cols: [[1, -2, 1], [3, 0, 2], [-1, -4, 0]], tex: ['\\kvecvone', '\\kvecvtwo', '\\kvecvthree'], plain: ['v₁', 'v₂', 'v₃'] },
    act2c: { label: 'Activity 3.5.2 (c): v₁, v₂, v₃', cols: [[1, 0, 1], [0, 1, 1], [1, 1, 0]], tex: ['\\kvecvone', '\\kvecvtwo', '\\kvecvthree'], plain: ['v₁', 'v₂', 'v₃'] },
    act2d: { label: 'Activity 3.5.2 (d): w₁, w₂, w₃', cols: [[2, 1, 0], [-1, 1, -1], [0, 3, -2]], tex: ['\\kvecwone', '\\kvecwtwo', '\\kvecwthree'], plain: ['w₁', 'w₂', 'w₃'] },
  };
  let matKey = 'act3a';
  const sl = [];
  const pick = choice(d.controls, {
    label: 'matrix', key: 'matrix', value: 'act3a', aria: 'which matrix of the section is drawn',
    options: Object.keys(MATS).map((k) => ({ value: k, label: MATS[k].label })),
    onInput: (k) => { matKey = k; const M = MATS[k]; sl.forEach((s, i) => { s.set(M.cols[2][i]); s.relabel(`(${M.tex[2]})_${'xyz'[i]}`, `the ${'xyz'[i]}-component of the third column`); }); sl.forEach((s) => s.refresh()); },
  });
  /* the value of component i of the third column that puts it in the plane of the first two */
  function inPlane(i) {
    const [a, b] = MATS[matKey].cols, n = SP.cross(a, b), v = sl.map((s) => s.v), j = (i + 1) % 3, k = (i + 2) % 3;
    if (Math.abs(n[i]) < 1e-9) return null;
    const t = -(n[j] * v[j] + n[k] * v[k]) / n[i];
    return Math.abs(t) <= 4 ? t : null;
  }
  'xyz'.split('').forEach((a, i) => {
    sl.push(ctl(d.controls, { label: `(\\kvecvthree)_${a}`, cls: '', key: `col3-${a}`, min: -4, max: 4, step: 0.5, value: MATS.act3a.cols[2][i], unit: '', dec: 1, aria: `the ${a}-component of the third column`, specials: [{ at: () => inPlane(i), label: 'in the span of the first two columns' }] }));
  });
  const ro = readout(d);
  /* a basis of the null space of a 3 × 3 matrix from its reduced row echelon form: one vector per free column */
  function nullBasis(R, piv) {
    const free = [0, 1, 2].filter((j) => !piv.includes(j));
    return free.map((j) => { const x = [0, 0, 0]; x[j] = 1; piv.forEach((p, i) => { x[p] = -R[i][j]; }); return x.map(r2); });
  }
  /* a label sits at the highest corner of its plane, drawn in toward the origin, or near the higher end of its line */
  const top = (poly) => SP.mul(corner(poly, [0, 0, 1]), 0.8);
  const upper = (e) => SP.mul(e[0][2] > e[1][2] ? e[0] : e[1], 0.78);

  still(d, () => {
    const M = MATS[matKey], rc = C('region'), vc = C('vector');
    const cols = [M.cols[0], M.cols[1], sl.map((s) => s.v)];
    const { A: R, piv } = rref(cols), rank = piv.length, nulB = nullBasis(R, piv), nd = 3 - rank;
    S.set('axes', SP.axes(box, { ticks: 2 }));
    /* the column space, filled */
    let col = [], colLab = null;
    const colName = `Col(A), the span of the columns: ${rank === 3 ? 'all of ℝ³' : rank === 2 ? 'a plane' : rank === 1 ? 'a line' : 'only the zero vector'}`;
    if (rank === 3) { col = boxFaces(box, rc, 0.1, colName); colLab = [3.3, -3.3, 3.3]; }
    else if (rank === 2) {
      const a = cols[piv[0]], b = cols[piv[1]], n = SP.cross(a, b), poly = SP.clipPlane([0, 0, 0], n, box);
      col = [...SP.plane([0, 0, 0], n, rc, { box, alpha: 0.3 }).map((m) => ({ ...m, name: colName })), ...latticeOn(a, b, box)];
      if (poly.length) colLab = top(poly);
    } else if (rank === 1) { const a = cols[piv[0]]; col = SP.line([0, 0, 0], a, rc, { box, w: 5 }).map((m) => ({ ...m, name: colName })); const e = SP.clipLine([0, 0, 0], a, box); if (e) colLab = upper(e); }
    else { col = [{ k: 'dot', p: [0, 0, 0], color: rc, r: 9, name: colName }]; colLab = [0.4, -0.6, -0.6]; }
    if (colLab) col.push({ k: 'label', s: '$\\kCol(\\kA)$', p: colLab, color: rc });
    S.set('col', col);
    /* the null space, dashed */
    let nul = [], nulLab = null;
    const nulName = `Nul(A), every x with Ax = 0: ${nd === 3 ? 'all of ℝ³' : nd === 2 ? 'a plane' : nd === 1 ? 'a line' : 'only the zero vector'}`;
    if (nd === 0) { nul = [{ k: 'dot', p: [0, 0, 0], color: rc, r: 8, hollow: true, name: nulName }, { k: 'dot', p: [0, 0, 0], color: rc, r: 4, name: nulName }]; nulLab = [-0.5, 0.6, -0.7]; }
    else if (nd === 1) { nul = SP.line([0, 0, 0], nulB[0], rc, { box, w: 4, dash: [10, 8] }).map((m) => ({ ...m, name: nulName })); const e = SP.clipLine([0, 0, 0], nulB[0], box); if (e) nulLab = upper(e); }
    else if (nd === 2) {
      const n = SP.cross(nulB[0], nulB[1]), poly = SP.clipPlane([0, 0, 0], n, box);
      nul = SP.plane([0, 0, 0], n, rc, { box, alpha: 0.16 }).map((m) => ({ ...m, name: nulName, ...(m.k === 'line' ? { dash: [10, 8], w: 3 } : {}) }));
      if (poly.length) nulLab = top(poly);
    } else { nul = boxFaces(box, rc, 0.06, nulName); nulLab = [-3.3, 3.3, -3.3]; }
    if (nulLab) nul.push({ k: 'label', s: '$\\kNul(\\kA)$', p: nulLab, color: rc });
    S.set('nul', nul);
    /* the columns */
    const marks = [];
    cols.forEach((v, i) => {
      if (SP.norm(v) < 1e-9) { marks.push({ k: 'dot', p: [0, 0, 0], color: vc, r: 7, name: `${M.plain[i]} = [0, 0, 0], the zero vector` }); marks.push({ k: 'label', s: `$${M.tex[i]}$`, p: [0.3, 0.3, 0.6], color: vc }); return; }
      marks.push({ k: 'arrow', a: [0, 0, 0], b: v, color: vc, w: 5, name: `${M.plain[i]} = ${vecT(v)}, ${piv.includes(i) ? 'a column with a pivot position, in the basis of Col(A)' : 'a column without a pivot position: a combination of the others'}` });
      marks.push({ k: 'label', s: `$${M.tex[i]}$`, p: SP.add(SP.add(v, SP.mul(SP.unit(v), 0.5)), [0.25, 0.25, 0]), color: vc });
    });
    S.set('cols', marks);
    /* headline and readout */
    const shape = (k) => (k === 3 ? 'is all of ${\\mathbb R}^3$' : k === 2 ? 'is a plane' : k === 1 ? 'is a line' : 'is only $\\kveczero$');
    S.headline(`$\\kCol(\\kA)$ ${shape(rank)} and $\\kNul(\\kA)$ ${shape(nd)}: $\\operatorname{rank}(\\kA) = ${rank}$ and $\\dim\\kNul(\\kA) = 3 - ${rank} = ${nd}$.`);
    const tex = `\\kA = ${mtx([0, 1, 2].map((r) => cols.map((v) => v[r])))} \\sim ${mtx(R)},\\qquad \\dim\\kCol(\\kA) + \\dim\\kNul(\\kA) = ${rank} + ${nd} = 3`;
    let note;
    if (nd === 0) note = `The columns are linearly independent, so $\\kA\\kvecx = \\kveczero$ only for $\\kvecx = \\kveczero$, and a pivot position in every row makes $\\kCol(\\kA)$ all of ${'$'}{\\mathbb R}^3$.`;
    else if (nd === 1) note = `$\\kNul(\\kA) = \\kSpan\\{${vecK(nulB[0])}\\}$: $${combo(nulB[0], M.tex)} = \\kveczero$, the way the columns depend on one another.`;
    else if (nd === 2) note = `$\\kNul(\\kA) = \\kSpan\\{${vecK(nulB[0])}, ${vecK(nulB[1])}\\}$: two free variables, since only one column has a pivot position.`;
    else note = 'Every $\\kvecx$ satisfies $\\kA\\kvecx = \\kveczero$: the zero matrix has no pivot position.';
    ro.set(tex, note, { form: rank });
  });
  void pick;
})();
};
