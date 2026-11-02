/* Figures for section 4.1 An introduction to eigenvalues and eigenvectors. */
window.OMNISTAX_FIGURES = window.OMNISTAX_FIGURES || {};
window.OMNISTAX_FIGURES['4.1'] = function (root, F) {
const { C, PAL, alpha, ctl, choice, select, begin, axes, drag, line, arrow, dot, text, headline, register, readout, hover, ease, arrival, cycle, fmt } = F;
const sim = (id, H) => F.sim(root, id, H);
const still = (d, draw) => register(d.fig, { update: () => {}, draw });
/* a number as the figure writes it: at most two decimals, no trailing zeros, never −0 */
const r2 = (v) => { const r = Math.round(v * 100) / 100; return Object.is(r, -0) ? 0 : r; };
const r1 = (v) => { const r = Math.round(v * 10) / 10; return Object.is(r, -0) ? 0 : r; };
const num = (v) => String(r2(v));
const numT = (v) => num(v).replace('-', '−');            /* the same in figure text, with a true minus */
const pt = (v) => `(${num(v[0])}, ${num(v[1])})`;         /* a point in TeX */
const ptT = (v) => pt(v).replace(/-/g, '−');              /* the same in figure text */
const lerp = (a, b, k) => a + (b - a) * k;
const lerp2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (k, a) => [k * a[0], k * a[1]];
const tag = (ctx, s, x, y, color, align = 'center', size = 22) => text(ctx, s, x, y, color, { size, weight: 600, tex: true, bg: PAL.panel, align });
/* a column vector in TeX; a 2 × 2 matrix wearing the matrix type's colour */
const col = (v) => `\\begin{bmatrix} ${v.map(num).join(' \\\\ ')} \\end{bmatrix}`;
const mat2 = (m) => `\\htmlClass{kv-matrix}{\\left[\\begin{array}{rr} ${num(m[0])} & ${num(m[1])} \\\\ ${num(m[2])} & ${num(m[3])} \\end{array}\\right]}`;
/* A = [a b; c d] applied to [x, y] */
const ap2 = (m, v) => [m[0] * v[0] + m[1] * v[1], m[2] * v[0] + m[3] * v[1]];
/* the scalar c written before a symbol: 1v is v, −1v is −v */
const coef = (c, sym) => { const k = r2(c); return k === 1 ? sym : k === -1 ? `-${sym}` : `${num(k)}${sym}`; };
/* a linear combination a·s1 + b·s2 as TeX, a zero term left out */
function combo(a, b, s1, s2) {
  const A = r2(a), B = r2(b);
  if (A === 0 && B === 0) return '0';
  if (A === 0) return coef(B, s2);
  if (B === 0) return coef(A, s1);
  return `${coef(A, s1)} ${B < 0 ? '-' : '+'} ${coef(Math.abs(B), s2)}`;
}

/* where the segment from t to h leaves the window of ax, in the plane: h itself when it is inside */
function exitPt(ax, t, h) {
  const { xr, yr } = ax, dx = h[0] - t[0], dy = h[1] - t[1]; let s = 1;
  if (dx > 0) s = Math.min(s, (xr[1] - t[0]) / dx); else if (dx < 0) s = Math.min(s, (xr[0] - t[0]) / dx);
  if (dy > 0) s = Math.min(s, (yr[1] - t[1]) / dy); else if (dy < 0) s = Math.min(s, (yr[0] - t[1]) / dy);
  s = Math.max(0, s);
  return { p: [t[0] + dx * s, t[1] + dy * s], out: s < 1 - 1e-9 };
}
/* An arrow of the plane from t to h on axes ax, clipped to its box; a head past the box is marked, hollow, where
   the arrow leaves the window. */
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
  const e = exitPt(ax, t, h);
  if (e.out) { ctx.save(); ctx.globalAlpha *= a; dot(ctx, X(e.p[0]), Y(e.p[1]), color, false, 7); ctx.restore(); }
}
/* a line of the plane through p in the direction dir, across the box, clipped */
function across(ctx, ax, p, dir, color, w = 3, dash) {
  const L = Math.hypot(dir[0], dir[1]); if (!(L > 1e-9)) return;
  const u = [dir[0] / L, dir[1] / L], { X, Y, box } = ax, R = 1e4;
  ctx.save(); ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip();
  line(ctx, X(p[0] - R * u[0]), Y(p[1] - R * u[1]), X(p[0] + R * u[0]), Y(p[1] + R * u[1]), color, w, dash);
  ctx.restore();
}
/* a label just past the head of the arrow t → h, along its direction, inside the box; a label that would sit on one
   placed earlier in the same draw steps up or down until it is clear (LAB is emptied at the start of every draw) */
let LAB = [];
function past(ctx, ax, t, h, s, color, a = 1, gap = 30) {
  if (!(a > 0.001)) return;
  const { X, Y, box } = ax, he = exitPt(ax, t, h).p, x1 = X(t[0]), y1 = Y(t[1]), x2 = X(he[0]), y2 = Y(he[1]);
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
/* a label beside the middle of the arrow t → h, on the side away from the point `away` (in the plane) */
function beside(ctx, ax, t, h, away, s, color) {
  const { X, Y, box } = ax, x1 = X(t[0]), y1 = Y(t[1]), x2 = X(h[0]), y2 = Y(h[1]);
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, L = Math.hypot(x2 - x1, y2 - y1) || 1;
  let nx = -(y2 - y1) / L, ny = (x2 - x1) / L;
  if (L < 3) { nx = -0.7; ny = -0.7; }
  if ((mx - X(away[0])) * nx + (my - Y(away[1])) * ny < 0) { nx = -nx; ny = -ny; }
  const lx = Math.min(Math.max(mx + nx * 34, box.l + 40), box.r - 40), ly = Math.min(Math.max(my + ny * 26, box.t + 16), box.b - 16);
  const w = F.measure(ctx, s, { size: 22, weight: 600, tex: true }) + 12;
  LAB.push({ l: lx - w / 2, r: lx + w / 2, t: ly - 15, b: ly + 15 });
  tag(ctx, s, lx, ly, color, nx > 0.55 ? 'left' : nx < -0.55 ? 'right' : 'center');
}
/* the faint unit grid of a pane under its axes, n units each way */
function unitGrid(ctx, box, U, n) {
  const cx = (box.l + box.r) / 2, cy = (box.t + box.b) / 2;
  ctx.save(); ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip();
  for (let i = -n; i <= n; i++) { line(ctx, cx + i * U, box.t, cx + i * U, box.b, alpha(PAL.ink, 0.07), 1.5); line(ctx, box.l, cy - i * U, box.r, cy - i * U, alpha(PAL.ink, 0.07), 1.5); }
  ctx.restore();
}
const frame = (ctx, box, n, o = {}) => axes(ctx, box, [-n, n], [-n, n], { xl: 'x', yl: 'y', nx: 2 * n, ny: 2 * n, fx: (q) => numT(q), fy: (q) => numT(q), ...o });
const tname = (ctx, box, s, color) => text(ctx, s, (box.l + box.r) / 2, box.t - 22, color, { size: 20, align: 'center', tex: true });
/* a filled polygon of plane points, clipped to the pane */
function poly(ctx, ax, pts, color, fillA, strokeA = 0.8, w = 2) {
  const { X, Y, box } = ax;
  ctx.save(); ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip();
  ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])))); ctx.closePath();
  ctx.fillStyle = alpha(color, fillA); ctx.fill(); ctx.strokeStyle = alpha(color, strokeA); ctx.lineWidth = w; ctx.stroke(); ctx.restore();
}
/* The real eigenvectors of a 2 × 2 matrix [a b; c d]: none when the discriminant is negative (a rotation), every
   vector when the matrix is a multiple of the identity, else one or two unit directions with their eigenvalues,
   each direction pointed into the right half-plane (or up, on the vertical axis). */
function eig2(m) {
  const [a, b, c, dd] = m, tr = a + dd, det = a * dd - b * c, disc = tr * tr - 4 * det;
  if (Math.abs(b) < 1e-9 && Math.abs(c) < 1e-9 && Math.abs(a - dd) < 1e-9) return { kind: 'all', lams: [a], dirs: [] };
  if (disc < -1e-9) return { kind: 'none', lams: [], dirs: [] };
  const s = Math.sqrt(Math.max(0, disc));
  const lams = disc < 1e-9 ? [tr / 2] : [(tr + s) / 2, (tr - s) / 2];
  const dirs = lams.map((l) => {
    let v = Math.abs(b) > 1e-9 ? [b, l - a] : Math.abs(c) > 1e-9 ? [l - dd, c] : Math.abs(l - a) < 1e-9 ? [1, 0] : [0, 1];
    const n = Math.hypot(v[0], v[1]); v = [v[0] / n, v[1] / n];
    if (v[0] < -1e-9 || (Math.abs(v[0]) < 1e-9 && v[1] < 0)) v = [-v[0], -v[1]];
    return v;
  });
  return { kind: lams.length === 2 ? 'two' : 'one', lams, dirs };
}

/* Figure 4.1.3 + 4.1.4 + 4.1.5: the author's eigenvector interactive, rebuilt. v has a draggable head (sliders x, y,
   −4 to 4, the author's (1, 0) the default) and Av is drawn beside it; the entries a, b, c, d of A are sliders
   (−8 to 8, detents at the author's ticks −2 … 2) and a select sets them to the book's matrices, Activity 4.1.2 (c)'s
   [1 2; 2 1] the default, so Figure 4.1.4's left panel is the load state and its right panel and Figure 4.1.5 are
   reached by dragging v to (1, 1) and (−1, 1). Where A has real eigenvectors their lines are drawn thin, each with its
   eigenvalue at its end, and v catches on them (specials on x and y at the values that put v on a line); on a line,
   Av lies along v, the line is drawn full and the readout writes Av = λv. A change of matrix bends Av and the lines
   from the last matrix to the new one. One plane, ±4 (the author's window) at 70 units to 1. Still: no clock. */
(function () {
  const d = sim('sim-eigenvectors', 720);
  const U = 70, BOX = { l: 420, r: 420 + 8 * U, t: 120, b: 120 + 8 * U };
  const PRESETS = {
    c: { label: 'Activity 4.1.2 (c): [1 2; 2 1]', m: [1, 2, 2, 1] },
    id: { label: 'the identity, where the book’s diagram starts', m: [1, 0, 0, 1] },
    g: { label: 'Activity 4.1.2 (g): the shear [2 1; 0 2]', m: [2, 1, 0, 2] },
    h: { label: 'Activity 4.1.2 (h): the 90° rotation [0 −1; 1 0]', m: [0, -1, 1, 0] },
    ex: { label: 'Example 4.1.2: [7 6; 6 −2]', m: [7, 6, 6, -2] },
    custom: { label: 'your own matrix', m: null },
  };
  let sl = [], prev = [1, 2, 2, 1], sx = null, sy = null;
  const refreshV = () => { if (sx) sx.refresh(); if (sy) sy.refresh(); };
  const sel = select(d.controls, {
    label: 'matrix', key: 'matrix', value: 'c', aria: 'one of the book’s matrices',
    options: Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label })),
    onInput: (v) => { const m = PRESETS[v].m; if (!m) return; prev = sl.map((s) => s.v); sl.forEach((s, i) => s.set(m[i])); refreshV(); },
  });
  const entry = (label, key, value) => ctl(d.controls, { label, cls: '', key, min: -8, max: 8, step: 0.1, value, unit: '', dec: 1, aria: `the entry ${label} of A`, detents: [-2, -1, 0, 1, 2], onInput: () => { sel.set('custom'); refreshV(); } });
  sl = [entry('a', 'a', 1), entry('b', 'b', 2), entry('c', 'c', 2), entry('d', 'd', 1)];
  const curM = () => sl.map((s) => r1(s.v));
  /* the value of one component that puts v on the i-th eigenvector line, given the other component */
  const onLineY = (i) => { const E = eig2(curM()), dir = E.dirs[i]; if (!dir || Math.abs(dir[0]) < 1e-6) return null; const y = (sx.v * dir[1]) / dir[0]; return Math.abs(y) <= 4 ? y : null; };
  const onLineX = (i) => { const E = eig2(curM()), dir = E.dirs[i]; if (!dir || Math.abs(dir[1]) < 1e-6) return null; const x = (sy.v * dir[0]) / dir[1]; return Math.abs(x) <= 4 ? x : null; };
  const ints = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
  sx = ctl(d.controls, { label: 'x', cls: '', key: 'x', min: -4, max: 4, step: 0.1, value: 1, unit: '', dec: 1, aria: 'the first component of v', detents: ints, snap: false, specials: [{ at: () => onLineX(0), label: 'on an eigenvector line' }, { at: () => onLineX(1), label: 'on an eigenvector line' }] });
  sy = ctl(d.controls, { label: 'y', cls: '', key: 'y', min: -4, max: 4, step: 0.1, value: 0, unit: '', dec: 1, aria: 'the second component of v', detents: ints, snap: false, specials: [{ at: () => onLineY(0), label: 'on an eigenvector line' }, { at: () => onLineY(1), label: 'on an eigenvector line' }] });
  const P = drag(d, { x: sx, y: sy });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  const entriesOf = (v) => (v === sel.value ? curM() : PRESETS[v].m ?? prev);
  /* the point where the line through the origin in the direction dir leaves the ±4 window */
  const edge = (dir) => { const t = Math.min(Math.abs(dir[0]) > 1e-9 ? 4 / Math.abs(dir[0]) : Infinity, Math.abs(dir[1]) > 1e-9 ? 4 / Math.abs(dir[1]) : Infinity); return mul(t, dir); };
  function draw() {
    const { ctx } = begin(d.c); LAB = [];
    const vc = C('vector'), mc = C('matrix'), ec = C('eigenvalue'), ink = PAL.ink, g = ease.smooth(arrival(d));
    const m = curM(), md = sel.k >= 1 ? m : sel.mix(entriesOf);
    const v = [sx.v, sy.v], Av = ap2(m, v), Avd = ap2(md, v);
    const E = eig2(m), Ed = sel.k >= 1 ? E : eig2(md.map(r2));
    const L = Math.hypot(v[0], v[1]), LA = Math.hypot(Av[0], Av[1]);
    const zero = L < 1e-9;
    const aligned = !zero && Math.abs(v[0] * Av[1] - v[1] * Av[0]) <= 1e-6 * Math.max(1, L * LA);
    const lam = aligned ? r2((v[0] * Av[0] + v[1] * Av[1]) / (L * L)) : null;
    const onDir = (dir) => aligned && Math.abs(v[0] * dir[1] - v[1] * dir[0]) < 1e-5 * L;
    hits = [];
    unitGrid(ctx, BOX, U, 4);
    const ax = frame(ctx, BOX, 4);
    /* the eigenvector lines, each with its eigenvalue at its end; the one v sits on is drawn full */
    ctx.save(); ctx.globalAlpha *= g;
    Ed.dirs.forEach((dir, i) => {
      const on = sel.k >= 1 && onDir(dir);
      across(ctx, ax, [0, 0], dir, alpha(vc, on ? 0.95 : 0.4), on ? 4 : 2.5);
      const e = edge(dir), lamI = Ed.lams[i];
      past(ctx, ax, [0, 0], mul(0.84, e), `$\\klambda = ${num(lamI)}$`, ec, 1, 26);
      const q = mul(0.6, e);
      hits.push({ x: ax.X(q[0]), y: ax.Y(q[1]), r: 16, name: `the line of eigenvectors with eigenvalue ${numT(lamI)}: every nonzero vector on it is carried to ${numT(lamI)} times itself` });
      const q2 = mul(-0.6, e);
      hits.push({ x: ax.X(q2[0]), y: ax.Y(q2[1]), r: 16, name: `the line of eigenvectors with eigenvalue ${numT(lamI)}: every nonzero vector on it is carried to ${numT(lamI)} times itself` });
    });
    ctx.restore();
    /* Av, then v on top */
    vec(ctx, ax, [0, 0], mul(g, Avd), mc, 5);
    vec(ctx, ax, [0, 0], mul(g, v), vc, 5);
    dot(ctx, ax.X(0), ax.Y(0), ink, true, 4);
    if (!zero) past(ctx, ax, [0, 0], v, '$\\kvecv$', vc, g);
    if (Math.hypot(Avd[0], Avd[1]) > 0.05) past(ctx, ax, [0, 0], Avd, '$\\kA\\kvecv$', mc, g, 34);
    P.draw(ctx, ax, vc);
    const vName = zero ? 'v = (0, 0): the zero vector is never an eigenvector; drag v away from the origin'
      : aligned ? `v = ${ptT(v)}: an eigenvector; Av = ${ptT(Av)} = ${numT(lam)}v lies on its line`
        : `v = ${ptT(v)}, knocked off its span: Av = ${ptT(Av)} does not lie on the line through v, so v is not an eigenvector; drag its head`;
    hits.push({ x: ax.X(v[0]), y: ax.Y(v[1]), r: 18, name: vName });
    const Ae = exitPt(ax, [0, 0], Av);
    hits.push({ x: ax.X(Ae.p[0]), y: ax.Y(Ae.p[1]), r: 18, name: `Av = ${ptT(Av)}${aligned ? `, ${numT(lam)} times v` : ', the image of v under A'}${Ae.out ? ' (past the edge of the window)' : ''}` });
    /* headline and readout */
    const same = E.kind === 'all';
    let h;
    if (zero) h = 'The zero vector is never an eigenvector; drag $\\kvecv$ away from the origin.';
    else if (same) h = `$\\kA = ${num(E.lams[0])}\\kI$: every vector is an eigenvector, with $\\kA\\kvecv = ${coef(E.lams[0], '\\kvecv')}$ and eigenvalue $\\klambda = ${num(E.lams[0])}$.`;
    else if (aligned) h = lam === 0 ? `$\\kvecv = ${pt(v)}$ is an eigenvector with eigenvalue $\\klambda = 0$: $\\kA\\kvecv$ is the zero vector.`
      : `$\\kvecv = ${pt(v)}$ is an eigenvector: $\\kA\\kvecv = ${pt(Av)} = ${coef(lam, '\\kvecv')}$ lies on the same line, with eigenvalue $\\klambda = ${num(lam)}$.`;
    else if (E.kind === 'none') h = sel.value === 'h' ? `$\\kA$ rotates every vector by $90°$, so $\\kA\\kvecv$ never lies on the line through $\\kvecv$: $\\kA$ has no eigenvectors.`
      : `$\\kA\\kvecv$ never lies on the line through $\\kvecv$, whichever $\\kvecv$ is dragged: this $\\kA$ has no eigenvectors.`;
    else h = `$\\kvecv = ${pt(v)}$ and $\\kA\\kvecv = ${pt(Av)}$ do not lie on one line, so $\\kvecv$ is not an eigenvector; drag $\\kvecv$ onto ${E.kind === 'two' ? 'one of the two lines' : 'the one line'}.`;
    headline(ctx, h);
    if (aligned) ro.set(`\\kA\\kvecv = ${mat2(m)} ${col(v)} = ${col(Av)} = ${num(lam)} ${col(v)} = \\klambda\\kvecv`, `$\\klambda = ${num(lam)}$`, { form: 'eigen' });
    else ro.set(`\\kA\\kvecv = ${mat2(m)} ${col(v)} = ${col(Av)}`,
      zero ? 'The zero vector is never an eigenvector.' : E.kind === 'none' ? '$\\kA\\kvecv$ is never a multiple of $\\kvecv$: this matrix has no eigenvectors.' : '$\\kvecv$ and $\\kA\\kvecv$ are not multiples of each other, so $\\kvecv$ is not an eigenvector.', { form: 'not' });
  }
  still(d, draw);
})();

/* Figure 4.1.6 + 4.1.7 with the unnumbered eigenbasis drawing: two panes at one scale. Left, the standard grid, the
   unit square on e₁, e₂ and its image under D = diag(λ₁, λ₂), with the vector of weights c₁e₁ + c₂e₂ and D carrying it
   to λ₁c₁e₁ + λ₂c₂e₂ (Figure 4.1.6). Right, the grid of linear combinations of the eigenvectors v₁, v₂, the unit square
   on v₁, v₂ and its image under A, the rectangle on λ₁v₁ and λ₂v₂ (Figure 4.1.7), with x = c₁v₁ + c₂v₂ and
   Ax = λ₁c₁v₁ + λ₂c₂v₂ (the book's drawing at c₁ = 1, c₂ = −2). The weights are the sliders, dragged as the point
   (c₁, c₂) in the left pane; specials at 0 put x on an eigenvector line. A choice of matrix: A = [1 2; 2 1] with
   D = [3 0; 0 −1] (the book's), or the rental-car matrix with v₁ = [3, 1], v₂ = [−1, 1] and D = [1 0; 0 0.2]. Two
   panes, ±6 (the drawing's window) at 42 units to 1. Still: no clock; a change of matrix bends the picture. */
(function () {
  const d = sim('sim-eigenbasis-square', 740);
  const U = 42, W = 12 * U, L = { l: 100, r: 100 + W, t: 150, b: 150 + W }, R = { l: 796, r: 796 + W, t: 150, b: 150 + W };
  const MATS = {
    book: { label: 'A = [1 2; 2 1]', A: [1, 2, 2, 1], v1: [1, 1], v2: [-1, 1], lam: [3, -1] },
    rental: { label: 'the rental-car matrix [0.8 0.6; 0.2 0.4]', A: [0.8, 0.6, 0.2, 0.4], v1: [3, 1], v2: [-1, 1], lam: [1, 0.2] },
  };
  const numsOf = (v) => ({ A: MATS[v].A, v1: MATS[v].v1, v2: MATS[v].v2, lam: MATS[v].lam });
  const ints = [-3, -2, -1, 0, 1, 2, 3];
  const pick = choice(d.controls, { label: 'matrix', key: 'matrix', value: 'book', aria: 'the matrix and its eigenvectors', options: Object.entries(MATS).map(([value, p]) => ({ value, label: p.label })) });
  const c1 = ctl(d.controls, { label: 'c_1', cls: '', key: 'c1', min: -3, max: 3, step: 0.1, value: 1, unit: '', dec: 1, aria: 'the weight c₁ of v₁ in x', detents: ints, snap: false, specials: [{ at: 0, label: 'x on the line of v₂' }] });
  const c2 = ctl(d.controls, { label: 'c_2', cls: '', key: 'c2', min: -3, max: 3, step: 0.1, value: -2, unit: '', dec: 1, aria: 'the weight c₂ of v₂ in x', detents: ints, snap: false, specials: [{ at: 0, label: 'x on the line of v₁' }] });
  const P = drag(d, { x: c1, y: c2 });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  /* the grid of linear combinations of v1 and v2 with whole-number weights */
  function skewGrid(ctx, ax, v1, v2) {
    ctx.save();
    for (let i = -14; i <= 14; i++) { if (i === 0) continue; across(ctx, ax, mul(i, v1), v2, alpha(PAL.ink, 0.13), 1.5); across(ctx, ax, mul(i, v2), v1, alpha(PAL.ink, 0.13), 1.5); }
    across(ctx, ax, [0, 0], v1, alpha(PAL.ink, 0.3), 1.5); across(ctx, ax, [0, 0], v2, alpha(PAL.ink, 0.3), 1.5);
    ctx.restore();
  }
  /* what A does to one eigenvector's part, in words */
  const verb = (l) => (l === 3 ? 'stretches the $\\kvecvone$ part of $\\kvecx$ by $3$' : l === 1 ? 'keeps the $\\kvecvone$ part of $\\kvecx$' : `multiplies the $\\kvecvone$ part of $\\kvecx$ by $${num(l)}$`);
  const verb2 = (l) => (l === -1 ? 'flips its $\\kvecvtwo$ part' : l === 0.2 ? 'shrinks its $\\kvecvtwo$ part to a fifth' : `multiplies its $\\kvecvtwo$ part by $${num(l)}$`);
  function draw() {
    const { ctx } = begin(d.c); LAB = [];
    const vc = C('vector'), mc = C('matrix'), r1c = F.ref('v-1'), r2c = F.ref('v-2'), ink = PAL.ink, mu = PAL.muted, g = ease.smooth(arrival(d));
    const S = pick.k >= 1 ? numsOf(pick.value) : pick.mix(numsOf), T = numsOf(pick.value);
    const a = r1(c1.v), b = r1(c2.v), l1 = T.lam[0], l2 = T.lam[1];
    const x = add(mul(a, T.v1), mul(b, T.v2)), Ax = add(mul(l1 * a, T.v1), mul(l2 * b, T.v2));
    const xd = add(mul(a, S.v1), mul(b, S.v2)), Axd = add(mul(S.lam[0] * a, S.v1), mul(S.lam[1] * b, S.v2));
    const cd = [a, b], Dcd = [S.lam[0] * a, S.lam[1] * b], Dc = [l1 * a, l2 * b];
    hits = [];
    /* left: D on the standard grid */
    tname(ctx, L, 'the diagonal matrix $\\kD$ on the standard grid', mu);
    unitGrid(ctx, L, U, 6);
    const al = frame(ctx, L, 6, { nx: 12, ny: 12 });
    poly(ctx, al, [[0, 0], [1, 0], [1, 1], [0, 1]], ink, 0.12, 0.6);
    poly(ctx, al, [[0, 0], [S.lam[0], 0], [S.lam[0], S.lam[1]], [0, S.lam[1]]], mc, 0.18);
    vec(ctx, al, [0, 0], [S.lam[0], 0], mc, 3.5); vec(ctx, al, [0, 0], [0, S.lam[1]], mc, 3.5);
    vec(ctx, al, [0, 0], [1, 0], vc, 4); vec(ctx, al, [0, 0], [0, 1], vc, 4);
    vec(ctx, al, [0, 0], mul(g, Dcd), mc, 5);
    vec(ctx, al, [0, 0], mul(g, cd), vc, 5);
    dot(ctx, al.X(0), al.Y(0), ink, true, 4);
    tag(ctx, '$\\kveceone$', al.X(1) + 2, al.Y(0) + 22, vc, 'left', 20);
    tag(ctx, '$\\kvecetwo$', al.X(0) - 10, al.Y(1) - 4, vc, 'right', 20);
    if (!(a === 0 && b === 0)) past(ctx, al, [0, 0], cd, `$${combo(a, b, '\\kveceone', '\\kvecetwo')}$`, vc, g);
    if (!(Dc[0] === 0 && Dc[1] === 0)) past(ctx, al, [0, 0], Dcd, `$${combo(Dc[0], Dc[1], '\\kveceone', '\\kvecetwo')}$`, mc, g, 34);
    P.draw(ctx, al, vc);
    hits.push({ x: al.X(a), y: al.Y(b), r: 18, name: `the weights (c₁, c₂) = ${ptT(cd)} of x = c₁v₁ + c₂v₂; drag this point` });
    hits.push({ x: al.X(Dc[0]), y: al.Y(Dc[1]), r: 16, name: `D carries (c₁, c₂) to (${numT(l1)}c₁, ${numT(l2)}c₂) = ${ptT(Dc)}, the weights of Ax` });
    hits.push({ x: al.X(0.5), y: al.Y(0.5), r: 14, name: 'the unit square on e₁ and e₂' });
    hits.push({ x: al.X(l1 / 2), y: al.Y(l2 / 2), r: 14, name: `its image under D: the rectangle on ${numT(l1)}e₁ and ${numT(l2)}e₂` });
    hits.push({ x: al.X(l1), y: al.Y(0), r: 12, name: `${numT(l1)}e₁ = De₁, the first column of D` });
    hits.push({ x: al.X(0), y: al.Y(l2), r: 12, name: `${numT(l2)}e₂ = De₂, the second column of D` });
    /* right: A on the grid of its eigenvectors */
    tname(ctx, R, 'the matrix $\\kA$ on the grid of its eigenvectors', mu);
    const ar = frame(ctx, R, 6, { nx: 12, ny: 12 });
    ctx.save(); ctx.globalAlpha *= g; skewGrid(ctx, ar, S.v1, S.v2); ctx.restore();
    poly(ctx, ar, [[0, 0], S.v1, add(S.v1, S.v2), S.v2], ink, 0.12, 0.6);
    const w1 = mul(S.lam[0], S.v1), w2 = mul(S.lam[1], S.v2);
    poly(ctx, ar, [[0, 0], w1, add(w1, w2), w2], mc, 0.18);
    vec(ctx, ar, [0, 0], w1, mc, 3.5); vec(ctx, ar, [0, 0], w2, mc, 3.5);
    vec(ctx, ar, [0, 0], S.v1, r1c, 4); vec(ctx, ar, [0, 0], S.v2, r2c, 4);
    vec(ctx, ar, [0, 0], mul(g, Axd), mc, 5);
    vec(ctx, ar, [0, 0], mul(g, xd), vc, 5);
    dot(ctx, ar.X(0), ar.Y(0), ink, true, 4);
    past(ctx, ar, [0, 0], T.v1, '$\\kvecvone$', r1c, 1, 24);
    past(ctx, ar, [0, 0], T.v2, '$\\kvecvtwo$', r2c, 1, 24);
    if (!(a === 0 && b === 0)) past(ctx, ar, [0, 0], xd, '$\\kvecx$', vc, g);
    if (Math.hypot(Ax[0], Ax[1]) > 0.05) past(ctx, ar, [0, 0], Axd, '$\\kA\\kvecx$', mc, g, 34);
    const xp = exitPt(ar, [0, 0], x).p, Axp = exitPt(ar, [0, 0], Ax).p;
    hits.push({ x: ar.X(xp[0]), y: ar.Y(xp[1]), r: 18, name: `x = ${combo(a, b, 'v₁', 'v₂').replace(/-/g, '−')} = ${ptT(x)}` });
    hits.push({ x: ar.X(Axp[0]), y: ar.Y(Axp[1]), r: 18, name: `Ax = ${combo(l1 * a, l2 * b, 'v₁', 'v₂').replace(/-/g, '−')} = ${ptT(Ax)}` });
    hits.push({ x: ar.X(T.v1[0]), y: ar.Y(T.v1[1]), r: 14, name: `v₁ = ${ptT(T.v1)}, an eigenvector with eigenvalue ${numT(l1)}` });
    hits.push({ x: ar.X(T.v2[0]), y: ar.Y(T.v2[1]), r: 14, name: `v₂ = ${ptT(T.v2)}, an eigenvector with eigenvalue ${numT(l2)}` });
    const sc = mul(0.5, add(T.v1, T.v2)), ic = mul(0.5, add(mul(l1, T.v1), mul(l2, T.v2)));
    hits.push({ x: ar.X(sc[0]), y: ar.Y(sc[1]), r: 14, name: 'the unit square of the eigenvector coordinate system, on v₁ and v₂' });
    hits.push({ x: ar.X(ic[0]), y: ar.Y(ic[1]), r: 14, name: `its image under A: the rectangle on ${numT(l1)}v₁ and ${numT(l2)}v₂` });
    hits.push({ x: ar.X(l1 * T.v1[0]), y: ar.Y(l1 * T.v1[1]), r: 12, name: `${numT(l1)}v₁ = Av₁` });
    hits.push({ x: ar.X(l2 * T.v2[0]), y: ar.Y(l2 * T.v2[1]), r: 12, name: `${numT(l2)}v₂ = Av₂` });
    hits.push({ x: ar.X(2 * T.v1[0] + T.v2[0]), y: ar.Y(2 * T.v1[1] + T.v2[1]), r: 12, name: 'the grid of linear combinations of v₁ and v₂ with whole-number weights' });
    /* headline and readout */
    let h;
    if (a === 0 && b === 0) h = '$\\kvecx$ is the zero vector; drag the point of weights away from the origin.';
    else if (b === 0) h = `$\\kvecx = ${coef(a, '\\kvecvone')}$ lies on the line of $\\kvecvone$, so it is an eigenvector: $\\kA\\kvecx = ${coef(l1, '\\kvecx')}$, just as $\\kD$ carries $${pt(cd)}$ to $${pt(Dc)}$.`;
    else if (a === 0) h = `$\\kvecx = ${coef(b, '\\kvecvtwo')}$ lies on the line of $\\kvecvtwo$, so it is an eigenvector: $\\kA\\kvecx = ${coef(l2, '\\kvecx')}$, just as $\\kD$ carries $${pt(cd)}$ to $${pt(Dc)}$.`;
    else h = `$\\kA$ ${verb(l1)} and ${verb2(l2)}: $\\kvecx = ${combo(a, b, '\\kvecvone', '\\kvecvtwo')}$ becomes $\\kA\\kvecx = ${combo(l1 * a, l2 * b, '\\kvecvone', '\\kvecvtwo')}$, just as $\\kD$ carries $${pt(cd)}$ to $${pt(Dc)}$.`;
    headline(ctx, h);
    ro.set(`\\kA\\kvecx = \\kA(${combo(a, b, '\\kvecvone', '\\kvecvtwo')}) = ${combo(l1 * a, l2 * b, '\\kvecvone', '\\kvecvtwo')} = ${col(Ax)}`,
      `$\\kD ${col(cd)} = ${col(Dc)}$: the same weights, since $\\kA\\kvecvone = ${coef(l1, '\\kvecvone')}$ and $\\kA\\kvecvtwo = ${coef(l2, '\\kvecvtwo')}$.`);
  }
  still(d, draw);
})();

/* Sim: the rental cars of Activity 4.1.3 as the state vector x_k in the plane of (cars at P, cars at Q). The transport
   runs the days: x_k walks from x₀ toward 250v₁ = (750, 250), drawn each day as the sum the book writes, 250v₁ along
   the line of v₁ and the v₂ part −(0.2)ᵏ 250 v₂ laid from its tip, the earlier days' tips left as marks; every x_k lies
   on the line P + Q = 1000, the line through 250v₁ in the direction v₂. The one slider is the number of cars at P on
   Monday morning (the rest of the 1000 at Q), which changes only the v₂ coefficient c₂ = P₀ − 750, so the cars settle
   at the same place from every start; at 750 nothing moves. P and Q from 0 to 1000 at 0.56 units to a car. Moving:
   one day per 0.5 s, ten days, then a hold of 1.5 s; the point glides between days and the readout prints the day
   reached. */
(function () {
  const d = sim('sim-rental-cars', 760);
  const BOX = { l: 420, r: 980, t: 130, b: 690 }, N = 1000, DAYS = 10;
  const V1 = [3, 1], V2 = [-1, 1], LAM2 = 0.2, C1 = 250;
  const cy = cycle(() => DAYS, 1.5);
  const reset = () => cy.reset();
  const p0 = ctl(d.controls, { label: '\\text{cars at } P \\text{ on Monday}', cls: '', key: 'p0', min: 0, max: N, step: 50, value: N, unit: 'cars', dec: 0, aria: 'the cars at P on Monday morning; the rest of the 1000 start at Q', detents: [0, 250, 500, 1000], specials: [{ at: 750, label: 'already settled' }], onInput: reset });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  const state = (c2, k) => add(mul(C1, V1), mul(c2 * Math.pow(LAM2, k), V2));
  const part2 = (c2, k) => mul(c2 * Math.pow(LAM2, k), V2);
  /* the v₂ part's coefficient as TeX, the book's form at the book's start */
  const partTex = (c2, k) => {
    if (c2 === 0) return '';
    const mag = Math.abs(c2), pw = k === 0 ? '' : k === 1 ? '(0.2)\\,' : `(0.2)^{${k}}\\,`;
    return ` ${c2 < 0 ? '-' : '+'} ${pw}${num(mag)}\\kvecvtwo`;
  };
  function draw() {
    const { ctx } = begin(d.c); LAB = [];
    const vc = C('vector'), r1c = F.ref('v-1'), r2c = F.ref('v-2'), ink = PAL.ink, mu = PAL.muted, g = ease.smooth(arrival(d));
    const P0 = Math.round(p0.v), c2 = 750 - P0;   /* x₀ = (P₀, 1000 − P₀) = 250v₁ + c₂v₂, the book's −250 at P₀ = 1000 */
    const t = cy.now(), K = Math.min(DAYS, Math.floor(t + 1e-9)), fr = Math.min(1, t - K), sm = ease.smooth(fr);
    const Kd = Math.min(DAYS, fr >= 0.5 ? K + 1 : K);           /* the day the readout prints */
    const xs = []; for (let k = 0; k <= DAYS; k++) xs.push(state(c2, k));
    const cur = K >= DAYS ? xs[DAYS] : lerp2(xs[K], xs[K + 1], sm);
    const curPart = K >= DAYS ? part2(c2, DAYS) : lerp2(part2(c2, K), part2(c2, K + 1), sm);
    const tip = mul(C1, V1);
    hits = [];
    /* the plane: a faint grid every 100 cars, the axes */
    ctx.save(); ctx.beginPath(); ctx.rect(BOX.l, BOX.t, BOX.r - BOX.l, BOX.b - BOX.t); ctx.clip();
    for (let i = 0; i <= 10; i++) { const s = BOX.l + (i / 10) * (BOX.r - BOX.l), y = BOX.b - (i / 10) * (BOX.b - BOX.t); line(ctx, s, BOX.t, s, BOX.b, alpha(ink, 0.07), 1.5); line(ctx, BOX.l, y, BOX.r, y, alpha(ink, 0.07), 1.5); }
    ctx.restore();
    const ax = axes(ctx, BOX, [0, N], [0, N], { xl: 'cars at P', yl: 'cars at Q', nx: 4, ny: 4, fx: (q) => fmt(q, 0), fy: (q) => fmt(q, 0) });
    /* the line of v₁ through the origin, and the line P + Q = 1000 every x_k lies on */
    ctx.save(); ctx.globalAlpha *= g;
    across(ctx, ax, [0, 0], V1, alpha(r1c, 0.5), 2, [10, 10]);
    across(ctx, ax, tip, V2, alpha(ink, 0.3), 2, [10, 10]);
    /* the earlier days' tips */
    for (let k = 0; k < Kd; k++) { const p = xs[k]; ctx.save(); ctx.globalAlpha *= 0.6; dot(ctx, ax.X(p[0]), ax.Y(p[1]), vc, false, 6); ctx.restore(); }
    ctx.restore();
    /* 250v₁, the v₂ part from its tip, and x_k */
    vec(ctx, ax, [0, 0], mul(g, tip), r1c, 4);
    vec(ctx, ax, mul(g, tip), mul(g, add(tip, curPart)), r2c, 4);
    vec(ctx, ax, [0, 0], mul(g, cur), vc, 5);
    dot(ctx, ax.X(0), ax.Y(0), ink, true, 4);
    if (g > 0.99) {
      beside(ctx, ax, [0, 0], tip, cur[1] > tip[1] * (cur[0] / tip[0]) ? [900, 100] : [100, 900], '$250\\kvecvone$', r1c);
      const Lp = Math.hypot(ax.X(curPart[0]) - ax.X(0), ax.Y(curPart[1]) - ax.Y(0));
      if (Lp > 40) beside(ctx, ax, tip, add(tip, curPart), [0, 0], `$${partTex(c2, Kd).trim()}$`, r2c);
      past(ctx, ax, [0, 0], cur, `$\\kvecx_{${Kd}}$`, vc, 1, 32);
    }
    for (let k = 0; k < Kd; k++) hits.push({ x: ax.X(xs[k][0]), y: ax.Y(xs[k][1]), r: 11, name: `day ${k}: x${k === 0 ? '₀' : ''} = ${ptT(xs[k].map(r2))}` });
    hits.push({ x: ax.X(cur[0]), y: ax.Y(cur[1]), r: 18, name: `x_${Kd} = ${ptT(xs[Kd].map(r2))}: ${num(xs[Kd][0])} cars at P and ${num(xs[Kd][1])} at Q at the end of day ${Kd}` });
    hits.push({ x: ax.X(tip[0]), y: ax.Y(tip[1]), r: 14, name: '250v₁ = (750, 250): the v₁ part, the same every day since Av₁ = v₁; the cars settle here' });
    const q1 = mul(0.4, tip); hits.push({ x: ax.X(q1[0]), y: ax.Y(q1[1]), r: 14, name: 'the line of v₁ = [3, 1]: every multiple of v₁ is left where it is by A' });
    const q2 = add(tip, mul(-400, V2)); hits.push({ x: ax.X(q2[0]), y: ax.Y(q2[1]), r: 14, name: 'the line P + Q = 1000 through 250v₁ in the direction v₂: the total is 1000 cars every day, so every x_k lies on it' });
    /* headline and readout */
    const xk = xs[Kd].map(r2);
    let h;
    if (c2 === 0) h = `$\\kvecxzero = 250\\kvecvone = (750, 250)$ already: $750$ cars at $P$ and $250$ at $Q$, and nothing changes from one day to the next.`;
    else if (Kd === 0) h = `Monday morning: $\\kvecxzero = ${pt(xk)} = 250\\kvecvone${partTex(c2, 0)}$; each day will keep the $\\kvecvone$ part and shrink the $\\kvecvtwo$ part to a fifth.`;
    else h = `Day ${Kd}: $\\kvecx_{${Kd}} = ${pt(xk)}$; the $\\kvecvtwo$ part is a fifth of yesterday’s, and the cars are settling at $750$ at $P$ and $250$ at $Q$.`;
    headline(ctx, h);
    const lhs = Kd === 0 ? '\\kvecxzero' : `\\kvecx_{${Kd}}`;
    ro.set(`${lhs} = 250\\kvecvone${partTex(c2, Kd)} = ${col(xk)}`,
      '$\\kA\\kvecvone = \\kvecvone$ and $\\kA\\kvecvtwo = 0.2\\kvecvtwo$: each day keeps the $\\kvecvone$ part and multiplies the $\\kvecvtwo$ part by $0.2$.');
  }
  register(d.fig, { update: (dt) => cy.step(dt, () => 2), draw });
})();
};
