/* Figures for section 6.2 Orthogonal complements and the matrix transpose. */
window.OMNISTAX_FIGURES = window.OMNISTAX_FIGURES || {};
window.OMNISTAX_FIGURES['6.2'] = function (root, F) {
const { C, PAL, alpha, ctl, choice, begin, axes, drag, line, arrow, dot, text, headline, register, readout, hover, arrival, ease, pinned } = F;
const SP = F.space;
const sim = (id, H) => F.sim(root, id, H);
const still = (d, draw) => register(d.fig, { update: () => {}, draw });
/* a number as the readout writes it: at most two decimals, no trailing zeros, never −0; TeX minus is a hyphen */
const r2 = (v) => { const r = Math.round(v * 100) / 100; return Object.is(r, -0) ? 0 : r; };
const r1 = (v) => { const r = Math.round(v * 10) / 10; return Object.is(r, -0) ? 0 : r; };
const num = (v) => String(r2(v));
const numT = (v) => num(v).replace('-', '−');            /* the same in figure text, with a true minus */
const vecT = (p) => `[${p.map(numT).join(', ')}]`;      /* a vector in figure text */
const vecK = (p) => `[${p.map(num).join(', ')}]`;       /* the same in TeX */
const mtx = (rows) => `\\htmlClass{kv-matrix}{\\left[\\begin{array}{${'r'.repeat(rows[0].length)}} ${rows.map((rw) => rw.map(num).join(' & ')).join(' \\\\ ')} \\end{array}\\right]}`;
const inBox = (box, x, y) => x >= box.l - 0.5 && x <= box.r + 0.5 && y >= box.t - 0.5 && y <= box.b + 0.5;
/* a linear form a₁x₁ + a₂x₂ + … as TeX over the given unknowns: 1 unwritten, −1 a sign, 0 dropped */
function form(cs, xs) {
  let s = '';
  cs.forEach((c, i) => {
    const k = r2(c); if (k === 0) return;
    const mag = Math.abs(k), body = (mag === 1 ? '' : num(mag)) + xs[i];
    s += s === '' ? (k < 0 ? `-${body}` : body) : (k < 0 ? ` - ${body}` : ` + ${body}`);
  });
  return s === '' ? '0' : s;
}
/* the reduced row echelon form of a matrix given by rows, and its pivot columns */
function rref(M) {
  const A = M.map((row) => row.slice()), m = A.length, n = A[0].length, piv = []; let r = 0;
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
/* a basis of the null space from a reduced row echelon form: one vector per free column, that variable set to 1 */
function nullBasis(R, piv, n) {
  const free = [...Array(n).keys()].filter((j) => !piv.includes(j));
  return free.map((j) => { const x = Array(n).fill(0); x[j] = 1; piv.forEach((p, i) => { x[p] = -R[i][j]; }); return x.map(r2); });
}
/* ---- in space ---- */
/* a square patch of the plane through the origin square to n, half-side h, as the book draws its planes: its corners */
function patch(n, h) {
  const u = SP.perp(n), w = SP.cross(SP.unit(n), u);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => SP.add(SP.mul(u, a * h), SP.mul(w, b * h)));
}
/* the patch filled and rimmed: a subspace */
const filled = (n, h, color, name) => { const q = patch(n, h); return [{ k: 'faces', faces: [q], color, alpha: 0.3, name }, { k: 'line', pts: [...q, q[0]], color, w: 2.5, name }]; };
/* the patch hatched: a faint fill, parallel rulings and a dashed rim, the book's mark of a complement */
function hatched(n, h, color, name) {
  const q = patch(n, h), u = SP.sub(q[1], q[0]), segs = [];
  for (let k = 1; k < 12; k++) { const a = SP.add(q[0], SP.mul(SP.sub(q[3], q[0]), k / 12)); segs.push([a, SP.add(a, u)]); }
  return [{ k: 'faces', faces: [q], color, alpha: 0.1, name }, { k: 'segs', segs, color, w: 1.4, name }, { k: 'line', pts: [...q, q[0]], color, w: 2.5, dash: [10, 8], name }];
}
/* the right-angle mark at the origin between the unit directions a and b */
const square = (a, b, s = 0.45) => ({ k: 'line', pts: [SP.mul(SP.unit(a), s), SP.add(SP.mul(SP.unit(a), s), SP.mul(SP.unit(b), s)), SP.mul(SP.unit(b), s)], color: 'ink', w: 2.5 });
/* the end of a line through the origin that stands higher, pulled in toward the origin, for its label */
const upper = (dir, box, k = 0.8) => { const e = SP.clipLine([0, 0, 0], dir, box); if (!e) return null; return SP.mul(e[0][2] > e[1][2] ? e[0] : e[1], k); };
/* the corner of a polygon farthest along dir, pulled in, for a plane's label */
const corner = (poly, dir, k = 0.78) => SP.mul(poly.reduce((best, q) => (SP.dot(q, dir) > SP.dot(best, dir) ? q : best), poly[0]), k);
const arrow3 = (v, color, name) => ({ k: 'arrow', a: [0, 0, 0], b: v, color, w: 5, name });
const tip = (v) => SP.add(SP.add(v, SP.mul(SP.unit(v), 0.55)), [0.15, 0.15, 0.15]);

/* Figure 6.2.2: a line and its orthogonal complement in the plane (above), a plane and its orthogonal complement in space
   (below), the book's two panels as one figure with two panes, as 1.1's Figure 1.1.7 + 1.1.8. Above, on the book's window
   [−4, 4]² at 55 units to 1: v = [−1, 2] with a draggable head held by the sliders v₁, v₂ (−4 to 4, step 0.1); L = Span{v}
   solid in region, L⊥ = {x : v·x = 0} dashed in region, square to it, a right-angle mark at the origin; at v = 0, L is
   the origin alone and L⊥ every vector of the plane, the window tinted. Below, mathematical 3D (free orbit, pitch
   bounded to [−0.3, 1.45], no spin, no zoom; box ±3): Activity 6.2.2's plane W = Span{w₁, w₂}, w₁ = [1, 0, −2], w₂ = [1, 1, −1],
   filled in region with its basis as arrows, and W⊥ = Span{[2, −1, 1]} dashed in region; a choice swaps in Example
   6.2.4's line L = Span{[1, −2, 3]} and its complement, the hatched plane Span{[2, 1, 0], [−3, 0, 1]}. Still. */
(function () {
  const d = sim('sim-line-and-complement', 560);
  const U = 55, WIN = [-4, 4], BOX = { l: 480, r: 480 + 8 * U, t: 90, b: 90 + 8 * U };
  const box = [[-3, 3], [-3, 3], [-3, 3]];
  /* opened about 45° off the plane's normal and 60° off the line of Example 6.2.4, so both the plane and the line read open */
  const S = F.space3d(d, { box, h: 560, pitch: [-0.3, 1.45], fit: 2.5, turn: -2.0, tilt: 0.6 });
  const v1 = ctl(d.controls, { label: 'v_1', cls: '', key: 'v1', min: -4, max: 4, step: 0.1, value: -1, unit: '', dec: 1, aria: 'the first component of v' });
  const v2 = ctl(d.controls, { label: 'v_2', cls: '', key: 'v2', min: -4, max: 4, step: 0.1, value: 2, unit: '', dec: 1, aria: 'the second component of v' });
  const SPACES = {
    plane: { label: 'a plane' },
    line: { label: 'a line' },
  };
  let spaceKey = 'plane';
  const pick = choice(d.controls, { label: 'subspace', key: 'space', value: 'plane', aria: 'which subspace of three-dimensional space is drawn below', options: Object.keys(SPACES).map((k) => ({ value: k, label: SPACES[k].label })), onInput: (k) => { spaceKey = k; } });
  const P = drag(d, { x: v1, y: v2 });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits, d.c);
  /* a line of the plane through the origin along dir, across the box */
  function across(ctx, ax, dir, color, w, dash) {
    const L = Math.hypot(dir[0], dir[1]); if (!(L > 1e-9)) return;
    const u = [dir[0] / L, dir[1] / L];
    ctx.save(); ctx.beginPath(); ctx.rect(BOX.l, BOX.t, BOX.r - BOX.l, BOX.b - BOX.t); ctx.clip();
    line(ctx, ax.X(-12 * u[0]), ax.Y(-12 * u[1]), ax.X(12 * u[0]), ax.Y(12 * u[1]), color, w, dash);
    ctx.restore();
  }
  /* where the line along dir leaves the window on the side of dir, pulled in a little */
  const exitAt = (dir) => { const L = Math.hypot(dir[0], dir[1]), u = [dir[0] / L, dir[1] / L], t = Math.min(...[0, 1].map((i) => (Math.abs(u[i]) < 1e-9 ? Infinity : 4 / Math.abs(u[i])))); return [u[0] * t * 0.86, u[1] * t * 0.86]; };

  function draw() {
    const { ctx } = begin(d.c);
    const rc = C('region'), vc = C('vector'), ink = PAL.ink, g = ease.smooth(arrival(d));
    const v = [r1(v1.v), r1(v2.v)], zero = v[0] === 0 && v[1] === 0, n = [v[1], -v[0]];
    hits = [];
    /* the faint unit grid and the axes */
    ctx.save(); ctx.beginPath(); ctx.rect(BOX.l, BOX.t, BOX.r - BOX.l, BOX.b - BOX.t); ctx.clip();
    for (let i = -4; i <= 4; i++) { line(ctx, BOX.l + (i + 4) * U, BOX.t, BOX.l + (i + 4) * U, BOX.b, alpha(ink, 0.06), 1.5); line(ctx, BOX.l, BOX.b - (i + 4) * U, BOX.r, BOX.b - (i + 4) * U, alpha(ink, 0.06), 1.5); }
    ctx.restore();
    const fmt = (q) => String(q).replace('-', '−');
    const ax = axes(ctx, BOX, WIN, WIN, { xl: 'x', yl: 'y', nx: 8, ny: 8, fx: (q) => (q === 4 ? '' : fmt(q)), fy: fmt });
    ctx.save(); ctx.globalAlpha *= g;
    if (zero) {
      /* v = 0: L is the origin alone, and every vector is orthogonal to 0, so L⊥ is the whole plane */
      ctx.save(); ctx.fillStyle = alpha(rc, 0.1); ctx.fillRect(BOX.l, BOX.t, BOX.r - BOX.l, BOX.b - BOX.t); ctx.restore();
      dot(ctx, ax.X(0), ax.Y(0), rc, true, 9);
      text(ctx, '$\\kLperp = {\\mathbb R}^2$', BOX.r - 16, BOX.t + 28, rc, { size: 24, weight: 600, align: 'right', tex: true, bg: PAL.panel });
      text(ctx, '$\\kL = \\{\\kveczero\\}$', ax.X(0) + 16, ax.Y(0) + 28, rc, { size: 22, weight: 600, align: 'left', tex: true, bg: PAL.panel });
      hits.push({ x: ax.X(0), y: ax.Y(0), r: 16, name: 'v = 0: its multiples are the origin alone' });
      hits.push({ x: (BOX.l + BOX.r) / 2 + 100, y: (BOX.t + BOX.b) / 2 - 100, r: 120, name: 'L⊥: every vector x has 0·x = 0, so the whole plane' });
    } else {
      across(ctx, ax, v, rc, 5);
      across(ctx, ax, n, rc, 5, [14, 10]);
      /* the right-angle mark where the lines cross */
      const L = Math.hypot(...v), a = [v[0] / L * 0.42, v[1] / L * 0.42], b = [n[0] / L * 0.42, n[1] / L * 0.42];
      line(ctx, ax.X(a[0]), ax.Y(a[1]), ax.X(a[0] + b[0]), ax.Y(a[1] + b[1]), ink, 2.5);
      line(ctx, ax.X(a[0] + b[0]), ax.Y(a[1] + b[1]), ax.X(b[0]), ax.Y(b[1]), ink, 2.5);
      /* the line labels near where they leave the window, on the side away from v's head */
      const eL = exitAt([-v[0], -v[1]]), eP = exitAt(n);
      text(ctx, '$\\kL$', ax.X(eL[0]) + 18, ax.Y(eL[1]) - 4, rc, { size: 24, weight: 600, align: 'left', tex: true, bg: PAL.panel });
      text(ctx, '$\\kLperp$', ax.X(eP[0]) + 18, ax.Y(eP[1]) - 4, rc, { size: 24, weight: 600, align: 'left', tex: true, bg: PAL.panel });
      for (let j = -3; j <= 3; j++) if (j) {
        const pv = [v[0] / L * j, v[1] / L * j], pn = [n[0] / L * j, n[1] / L * j];
        hits.push({ x: ax.X(pv[0]), y: ax.Y(pv[1]), r: 14, name: `L: every multiple of v = ${vecT(v)}` });
        hits.push({ x: ax.X(pn[0]), y: ax.Y(pn[1]), r: 14, name: `L⊥: every x with v·x = 0, the multiples of ${vecT(n)}` });
      }
      /* v, with its grip ring */
      const hx = ax.X(v[0]), hy = ax.Y(v[1]);
      const Lc = Math.hypot(hx - ax.X(0), hy - ax.Y(0)), hl = Math.min(18, Lc), ux = (hx - ax.X(0)) / Lc, uy = (hy - ax.Y(0)) / Lc;
      if (inBox(BOX, hx, hy)) {
        line(ctx, ax.X(0), ax.Y(0), hx - ux * hl * 0.6, hy - uy * hl * 0.6, vc, 5);
        arrow(ctx, hx - ux * hl, hy - uy * hl, hx, hy, vc, 5);
      } else pinned(ctx, BOX, ax.X, ax.Y, v[0], v[1], vc);
      P.draw(ctx, ax, alpha(vc, 0));
      ctx.save(); ctx.strokeStyle = alpha(vc, 0.35); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(hx, hy, 17, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      /* v's name beside its shaft, on the side away from L⊥'s positive end */
      /* the side of v's shaft away from L⊥'s labelled end */
      const mx = (ax.X(0) + hx) / 2, my = (ax.Y(0) + hy) / 2, px = ax.X(eP[0]) - ax.X(0), py = ax.Y(eP[1]) - ax.Y(0);
      let nx = -uy, ny = ux; if (nx * px + ny * py > 0) { nx = -nx; ny = -ny; }
      text(ctx, '$\\kvecv$', mx + nx * 30, my + ny * 30, vc, { size: 24, weight: 600, align: 'center', tex: true, bg: PAL.panel });
      hits.unshift({ x: hx, y: hy, r: 20, name: `v = ${vecT(v)}` });
    }
    dot(ctx, ax.X(0), ax.Y(0), ink, true, 4);
    ctx.restore();
    headline(ctx, zero ? 'With $\\kvecv = \\kveczero$, every $\\kvecx$ satisfies $\\kvecv\\cdot\\kvecx = 0$, so $\\kLperp$ is all of ${\\mathbb R}^2$.'
      : `$\\kLperp$ is the line of vectors $\\kvecx$ with $\\kvecv\\cdot\\kvecx = ${form(v, ['x', 'y'])} = 0$; it meets $\\kL$ at a right angle.`);

    /* ---- in space ---- */
    const plane = spaceKey === 'plane';
    S.set('axes', SP.axes(box, { ticks: 2 }));
    if (plane) {
      const w1 = [1, 0, -2], w2 = [1, 1, -1], N = [2, -1, 1];
      S.set('sub', [
        ...filled(N, 2.6, rc, 'W = Span{w₁, w₂}, a plane through the origin'),
        { k: 'label', s: '$\\kW$', p: corner(patch(N, 2.6), [0.3, 0.6, 1], 0.85), color: rc },
      ]);
      S.set('perp', [
        ...SP.line([0, 0, 0], N, rc, { box, w: 4, dash: [12, 9] }).map((m) => ({ ...m, name: 'W⊥ = Span{[2, −1, 1]}: every vector orthogonal to w₁ and w₂' })),
        { k: 'label', s: '$\\kWperp$', p: SP.add(upper(N, box), [0, 0.35, 0.2]), color: rc },
        square(N, w1),
      ]);
      S.set('vecs', [
        arrow3(w1, vc, 'w₁ = [1, 0, −2]'), { k: 'label', s: '$\\kvecwone$', p: tip(w1), color: vc },
        arrow3(w2, vc, 'w₂ = [1, 1, −1]'), { k: 'label', s: '$\\kvecwtwo$', p: tip(w2), color: vc },
      ]);
      S.headline('$\\kWperp$ is the line through $[2, -1, 1]$, orthogonal to $\\kvecwone$, $\\kvecwtwo$ and every vector of the plane $\\kW$.');
    } else {
      const v = [1, -2, 3], a = [2, 1, 0];
      S.set('sub', [
        ...SP.line([0, 0, 0], v, rc, { box, w: 5 }).map((m) => ({ ...m, name: 'L = Span{v}, the line of multiples of v = [1, −2, 3]' })),
        { k: 'label', s: '$\\kL$', p: SP.add(SP.mul(v, -0.62), [0.35, 0.35, 0]), color: rc },
      ]);
      S.set('perp', [
        ...hatched(v, 2.6, rc, 'L⊥ = Span{[2, 1, 0], [−3, 0, 1]}: the plane of vectors x with x₁ − 2x₂ + 3x₃ = 0'),
        { k: 'label', s: '$\\kLperp$', p: corner(patch(v, 2.6), [-0.6, 0.6, 0.2], 0.85), color: rc },
        square(v, a),
      ]);
      S.set('vecs', [arrow3(v, vc, 'v = [1, −2, 3]'), { k: 'label', s: '$\\kvecv$', p: tip(v), color: vc }]);
      S.headline('$\\kLperp$ is the plane of vectors with $x_1 - 2x_2 + 3x_3 = 0$, orthogonal to every multiple of $\\kvecv$.');
    }
    ro.set(zero ? '\\kvecv\\cdot\\kvecx = 0x + 0y = 0 \\;\\Rightarrow\\; \\kLperp = {\\mathbb R}^2'
      : `\\kvecv\\cdot\\kvecx = ${form(v, ['x', 'y'])} = 0 \\;\\Rightarrow\\; \\kLperp = \\kSpan\\{${vecK(n)}\\}`,
    plane ? 'In space: $\\kvecwone\\cdot[2, -1, 1] = 2 + 0 - 2 = 0$ and $\\kvecwtwo\\cdot[2, -1, 1] = 2 - 1 - 1 = 0$, so $\\kWperp = \\kSpan\\{[2, -1, 1]\\}$.'
      : 'In space: $[2, 1, 0]$ and $[-3, 0, 1]$ both satisfy $\\kvecv\\cdot\\kvecx = x_1 - 2x_2 + 3x_3 = 0$, so they span $\\kLperp$.', { form: zero });
  }
  still(d, draw);
  void pick;
})();

/* Figure 6.2.11: Col(A) and Nul(Aᵀ) for a 3 × 2 matrix A, drawn in one space, the 3D code of Figure 6.2.2 relabelled.
   A choice of the section's matrices: Activity 6.2.2's A = [w₁ w₂] (the default; Nul(Aᵀ) = Span{[2, −1, 1]}) and Activity
   6.2.3's A = [v₁ v₂] (Nul(Aᵀ) = Span{[1, −3, 1]}). The second column's components are sliders (−3 to 3, step 0.5), each
   with a dashed special at the value that makes it a multiple of the first column, where Col(A) drops to a line and
   Nul(Aᵀ) opens into a hatched plane. The columns are arrows in vector; Col(A) is filled in region, Nul(Aᵀ) dashed (a
   line) or hatched (a plane) in region; Nul(Aᵀ) is read from Aᵀ's reduced row echelon form, one vector per free column.
   Mathematical 3D, box ±4, free orbit, pitch bounded to [−0.3, 1.45], no spin, no zoom. Still. */
(function () {
  const d = sim('sim-col-and-nul-transpose');
  const box = [[-4, 4], [-4, 4], [-4, 4]];
  /* opened about 50° off the normals of both matrices' planes, [2, −1, 1] and [1, −3, 1], with all four columns seen near full length */
  const S = F.space3d(d, { box, h: 600, pitch: [-0.3, 1.45], fit: 2.6, turn: 2.42, tilt: 0.4 });
  const MATS = {
    act2: { label: 'Activity 6.2.2', cols: [[1, 0, -2], [1, 1, -1]], tex: ['\\kvecwone', '\\kvecwtwo'], plain: ['w₁', 'w₂'] },
    act3: { label: 'Activity 6.2.3', cols: [[2, 0, -2], [1, 1, 2]], tex: ['\\kvecvone', '\\kvecvtwo'], plain: ['v₁', 'v₂'] },
  };
  let matKey = 'act2';
  const sl = [];
  const pick = choice(d.controls, {
    label: 'A', key: 'matrix', value: 'act2', aria: 'which matrix of the section is drawn',
    options: Object.keys(MATS).map((k) => ({ value: k, label: MATS[k].label })),
    onInput: (k) => { matKey = k; const M = MATS[k]; sl.forEach((s, i) => { s.set(M.cols[1][i]); s.relabel(`(${M.tex[1]})_${'xyz'[i]}`, `the ${'xyz'[i]}-component of the second column`); }); sl.forEach((s) => s.refresh()); },
  });
  /* the value of component i of the second column that makes it a multiple of the first, given the other two */
  function parallelAt(i) {
    const a = MATS[matKey].cols[0], b = sl.map((s) => s.v), others = [0, 1, 2].filter((j) => j !== i);
    const ks = others.filter((j) => Math.abs(a[j]) > 1e-9).map((j) => b[j] / a[j]);
    if (others.some((j) => Math.abs(a[j]) < 1e-9 && Math.abs(b[j]) > 1e-9)) return null;
    if (!ks.length || ks.some((k) => Math.abs(k - ks[0]) > 1e-9)) return null;
    const t = ks[0] * a[i];
    return Math.abs(t) <= 3 ? t : null;
  }
  'xyz'.split('').forEach((c, i) => {
    sl.push(ctl(d.controls, { label: `(\\kvecwtwo)_${c}`, cls: '', key: `col2-${c}`, min: -3, max: 3, step: 0.5, value: MATS.act2.cols[1][i], unit: '', dec: 1, aria: `the ${c}-component of the second column`, specials: [{ at: () => parallelAt(i), label: 'a multiple of the first column' }] }));
  });
  const ro = readout(d);

  still(d, () => {
    const M = MATS[matKey], rc = C('region'), vc = C('vector');
    const cols = [M.cols[0], sl.map((s) => r2(s.v))], AT = cols;
    const { A: R, piv } = rref(AT), rank = piv.length, nb = nullBasis(R, piv, 3);
    S.set('axes', SP.axes(box, { ticks: 2 }));
    let col = [], nul = [];
    if (rank === 2) {
      const n = SP.cross(cols[0], cols[1]);
      col = [...filled(n, 3.2, rc, `Col(A), the plane spanned by ${M.plain[0]} and ${M.plain[1]}`), { k: 'label', s: '$\\kCol(\\kA)$', p: corner(patch(n, 3.2), [0.3, 0.6, 1], 0.85), color: rc }];
      nul = [...SP.line([0, 0, 0], nb[0], rc, { box, w: 4, dash: [12, 9] }).map((m) => ({ ...m, name: `Nul(Aᵀ) = Span{${vecT(nb[0])}}: every x orthogonal to both columns` })), { k: 'label', s: '$\\kNul(\\kAT)$', p: SP.mul(upper(nb[0], box), -0.95), color: rc }, square(nb[0], cols[0])];
    } else {
      const a = cols[0];
      col = [...SP.line([0, 0, 0], a, rc, { box, w: 5 }).map((m) => ({ ...m, name: `Col(A), the line of multiples of ${M.plain[0]}: the columns are parallel` })), { k: 'label', s: '$\\kCol(\\kA)$', p: SP.add(SP.mul(SP.unit(a), -3.2), [0.35, 0.35, 0]), color: rc }];
      nul = [...hatched(a, 3.2, rc, `Nul(Aᵀ) = Span{${nb.map(vecT).join(', ')}}: the plane of vectors orthogonal to ${M.plain[0]}`), { k: 'label', s: '$\\kNul(\\kAT)$', p: corner(patch(a, 3.2), [-0.6, 0.6, 0.2], 0.85), color: rc }, square(a, nb[0])];
    }
    S.set('col', col);
    S.set('nul', nul);
    const marks = [];
    cols.forEach((v, i) => {
      if (SP.norm(v) < 1e-9) { marks.push({ k: 'dot', p: [0, 0, 0], color: vc, r: 7, name: `${M.plain[i]} = [0, 0, 0]` }); return; }
      marks.push(arrow3(v, vc, `${M.plain[i]} = ${vecT(v)}, column ${i + 1} of A and row ${i + 1} of Aᵀ`));
      marks.push({ k: 'label', s: `$${M.tex[i]}$`, p: tip(v), color: vc });
    });
    S.set('cols', marks);
    S.headline(rank === 2 ? '$\\kCol(\\kA)$ is a plane and $\\kNul(\\kAT)$ is the line square to it: $\\kCol(\\kA)^\\perp = \\kNul(\\kAT)$.'
      : 'The columns are parallel: $\\kCol(\\kA)$ is a line, and $\\kNul(\\kAT)$ is the plane square to it.');
    const span = `\\kSpan\\{${nb.map(vecK).join(', ')}\\}`;
    const tex = `\\kAT = ${mtx(AT)} \\sim ${mtx(R)},\\qquad \\kNul(\\kAT) = ${span} = \\kCol(\\kA)^\\perp`;
    const dots = nb.map((x) => cols.map((c, i) => `${M.tex[i]}\\cdot${vecK(x)} = ${num(SP.dot(c, x))}`).join(', ')).join('; ');
    ro.set(tex, `The rows of $\\kAT$ are the columns of $\\kA$, so $\\kAT\\kvecx$ lists their dot products with $\\kvecx$: $${dots}$.`, { form: rank });
  });
  void pick;
})();
};
