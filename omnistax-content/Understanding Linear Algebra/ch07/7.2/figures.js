/* Figures for section 7.2 Quadratic forms. */
window.OMNISTAX_FIGURES = window.OMNISTAX_FIGURES || {};
window.OMNISTAX_FIGURES['7.2'] = function (root, F) {
const { C, PAL, alpha, ctl, select, choice, begin, axes, plot, line, arrow, dot, text, headline, register, readout, hover, ease, arrival, fmt } = F;
const SP = F.space;
const sim = (id, H) => F.sim(root, id, H);
const still = (d, draw) => register(d.fig, { update: () => {}, draw });
const TAU = 2 * Math.PI, DEG = Math.PI / 180, EPS = 1e-9;
/* a number as the figure writes it: at most two decimals, no trailing zeros, never −0 */
const r2 = (v) => { const r = Math.round(v * 100) / 100; return Object.is(r, -0) || Math.abs(r) < 1e-12 ? 0 : r; };
const num = (v) => String(r2(v));
const numT = (v) => num(v).replace('-', '−');      /* in figure text and hover names, a true minus */
const par = (v) => (r2(v) < 0 ? `(${num(v)})` : num(v));   /* a factor in a product, bracketed when negative */
const lerp = (a, b, k) => a + (b - a) * k;
const wrap360 = (a) => ((a % 360) + 360) % 360;

/* The eigenvalues λ₁ ≥ λ₂ of the symmetric [a b; b c] and the angle θ (radians) of the unit eigenvector u₁ of λ₁:
   u₁ = [cos θ, sin θ], u₂ = [−sin θ, cos θ], so that Q = [u₁ u₂] is the rotation by θ and y = Qᵀx. θ lies in
   (−90°, 90°]; for [1 2; 2 1] it is 45° and for [−7 −6; −6 2] it is −63.43°, the book's u₁ = [1/√5, −2/√5]. */
function eig2(a, b, c) {
  const m = (a + c) / 2, r = Math.hypot((a - c) / 2, b);
  const equal = r < 1e-9;
  let th = equal ? 0 : 0.5 * Math.atan2(2 * b, a - c);
  if (th <= -Math.PI / 2 + 1e-12) th += Math.PI;
  return { l1: m + r, l2: m - r, th, equal };
}
/* the definiteness of a symmetric 2 × 2 matrix from its eigenvalues (Proposition 7.2.12) */
function kindOf(l1, l2) {
  const z = (v) => Math.abs(v) < 1e-9;
  if (z(l1) && z(l2)) return 'zero';
  if (l2 > 0 && !z(l2)) return 'pd';
  if (l1 < 0 && !z(l1)) return 'nd';
  if (z(l2)) return 'psd';
  if (z(l1)) return 'nsd';
  return 'indef';
}
/* the quadratic form as TeX, ax₁² + 2bx₁x₂ + cx₂², zero terms left out */
function polyTex(a, b, c, v) {
  const terms = [[a, `${v}_1^2`], [2 * b, `${v}_1${v}_2`], [c, `${v}_2^2`]].filter(([k]) => r2(k) !== 0);
  if (!terms.length) return '0';
  return terms.map(([k, s], i) => {
    const sign = r2(k) < 0 ? '-' : '+', mag = Math.abs(r2(k)), co = mag === 1 ? '' : String(mag);
    return (i === 0 ? (sign === '-' ? '-' : '') : ` ${sign} `) + co + s;
  }).join('');
}
/* the book's symmetric matrices, by the place they appear */
const PRESETS = [
  { value: 'act-3a', label: 'D = [3 0; 0 −1] · Activity 7.2.3', e: [3, 0, -1], L: 'D' },
  { value: 'ex-2', label: 'A = [1 2; 2 1] · Example 7.2.2', e: [1, 2, 1], L: 'A' },
  { value: 'ex-4', label: 'A = [−7 −6; −6 2] · Example 7.2.4', e: [-7, -6, 2], L: 'A' },
  { value: 'act-4a', label: 'D = [4 0; 0 2] · Activity 7.2.4', e: [4, 0, 2], L: 'D' },
  { value: 'act-4b', label: 'D = [4 0; 0 0] · Activity 7.2.4', e: [4, 0, 0], L: 'D' },
  { value: 'act-5', label: 'A = [6 −3; −3 3] · Activity 7.2.5', e: [6, -3, 3], L: 'A' },
  { value: 'free', label: 'entries set below' },
];
const byValue = Object.fromEntries(PRESETS.map((p) => [p.value, p]));
/* The matrix controls both quadratic-form Sims share in shape: a dropdown of the book's matrices and the entries a, b, c of
   [a b; b c] on sliders (−10 to 10, step 0.5), with dashed specials where an eigenvalue is zero (ac = b²) and, where `equal`
   is asked, where the two eigenvalues meet (b = 0, a = c). A slider moved by hand sets the dropdown to "entries set below". */
function matrixControls(d, value, equal) {
  let sA, sB, sC, fromE = null;
  const entries = () => [sA.v, sB.v, sC.v];
  const pick = select(d.controls, {
    label: 'matrix', key: 'matrix', value, options: PRESETS.map(({ value: v, label }) => ({ value: v, label })),
    aria: 'the symmetric matrix, one of the book’s, or the entries set by the sliders',
    onInput: (v) => { const p = byValue[v]; if (!p.e) return; fromE = entries(); [sA, sB, sC].forEach((s, i) => s.set(p.e[i])); [sA, sB, sC].forEach((s) => s.refresh && s.refresh()); },
  });
  const left = () => { if (pick.value !== 'free') pick.set('free'); };
  const ok = (v) => (v !== null && Number.isFinite(v) && Math.abs(v) <= 10 ? v : null);
  const zeroA = () => (Math.abs(sC.v) < EPS ? null : ok((sB.v * sB.v) / sC.v));
  const zeroC = () => (Math.abs(sA.v) < EPS ? null : ok((sB.v * sB.v) / sA.v));
  const zeroB = (sg) => () => (sA.v * sC.v < 0 ? null : ok(sg * Math.sqrt(sA.v * sC.v)));
  const sp = (list) => list.filter(Boolean);
  const p0 = byValue[value].e;
  sA = ctl(d.controls, { label: 'a', cls: '', key: 'a', min: -10, max: 10, step: 0.5, value: p0[0], unit: '', dec: 1, onInput: left, aria: 'the entry a in the first row and first column',
    specials: sp([{ at: zeroA, label: 'λ = 0' }, equal && { at: () => (Math.abs(sB.v) < EPS ? sC.v : null), label: 'λ₁ = λ₂' }]) });
  sB = ctl(d.controls, { label: 'b', cls: '', key: 'b', min: -10, max: 10, step: 0.5, value: p0[1], unit: '', dec: 1, onInput: left, aria: 'the entry b off the diagonal, in both places',
    specials: sp([{ at: zeroB(1), label: 'λ = 0' }, { at: zeroB(-1), label: 'λ = 0' }, equal && { at: () => (Math.abs(sA.v - sC.v) < EPS ? 0 : null), label: 'λ₁ = λ₂' }]) });
  sC = ctl(d.controls, { label: 'c', cls: '', key: 'c', min: -10, max: 10, step: 0.5, value: p0[2], unit: '', dec: 1, onInput: left, aria: 'the entry c in the second row and second column',
    specials: sp([{ at: zeroC, label: 'λ = 0' }, equal && { at: () => (Math.abs(sB.v) < EPS ? sA.v : null), label: 'λ₁ = λ₂' }]) });
  return {
    pick, entries,
    /* the entries as drawn: bent from the last preset's over the dropdown's own morph */
    drawn: () => { const cur = entries(), k = pick.k; return k < 1 && fromE ? cur.map((x, i) => lerp(fromE[i], x, k)) : cur; },
    letter: () => (byValue[pick.value].L || 'A'),
  };
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const words = {
  pd: 'both eigenvalues are positive, so the matrix is positive definite',
  nd: 'both eigenvalues are negative, so the matrix is negative definite',
  psd: 'one eigenvalue is zero and the other positive, so the matrix is positive semidefinite',
  nsd: 'one eigenvalue is zero and the other negative, so the matrix is negative semidefinite',
  indef: 'one eigenvalue is positive and one negative, so the matrix is indefinite',
  zero: 'both eigenvalues are zero: the zero matrix, whose quadratic form is zero everywhere',
};

/* Sim: the graph of q_A over the plane, the book's quad_plot of Activity 7.2.3. The surface z = q_A(x) over the disk of radius 1.25,
   translucent and in muted ink, with the unit circle lifted onto it as a curve in ink; the eigenvector directions ±u₁ (solid) and
   ±u₂ (dashed) drawn in the floor in vector's hue, and the curve's highest and lowest points above them marked in eigenvalue's hue at
   heights λ₁ and λ₂, each with a guide down to the floor. Heights are drawn at 1.2/M of their value, M the larger |λ| rounded up to
   a round number, and the vertical ticks read true values: every matrix's shape reads (the zoom the plan names). The book's D =
   [3 0; 0 −1] by default. Mathematical 3D, free orbit, no ground; pitch kept above −0.2 so the floor is never seen edge-on from
   below; no buttons. Still: a change of matrix bends the entries over the dropdown's 0.9 s. */
(function () {
  const d = sim('sim-quadratic-form-graph');
  const R = 1.25, box = [[-1.5, 1.5], [-1.5, 1.5], [-2, 2]];
  const S = F.space3d(d, { box, h: 560, pitch: [-0.2, 1.5], fit: 2.25, tilt: 0.45 });
  const M = matrixControls(d, 'act-3a', false);
  const ro = readout(d);
  const ROUND = [0.5, 1, 1.5, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20];
  function draw() {
    const [a, b, c] = M.drawn(), [a0, b0, c0] = M.entries();
    const q = (x, y) => a * x * x + 2 * b * x * y + c * y * y;
    const E = eig2(a, b, c), E0 = eig2(a0, b0, c0);
    const big = Math.max(Math.abs(E.l1), Math.abs(E.l2), 0.4), Mr = ROUND.find((v) => v >= big - 1e-9) ?? 20, s = 1.2 / Mr;
    const cE = C('eigenvalue'), cV = C('vector');
    /* axes, the vertical one ticked in true values of q */
    const ax = SP.axes([[-1.5, 1.5], [-1.5, 1.5], [-1.95, 1.95]], { ticks: [0, 0, 0], names: ['$x_1$', '$x_2$', '$q$'] });
    const step = Mr / 2;
    for (let v = -3 * step; v <= 3 * step + 1e-9; v += step) {
      if (Math.abs(v) < 1e-9 || Math.abs(v * s) > 1.95 || v < Math.min(E.l2, 0) * R * R - step * 0.3 || v > Math.max(E.l1, 0) * R * R + step * 0.3) continue;
      ax.push({ k: 'segs', segs: [[[-0.05, 0, v * s], [0.05, 0, v * s]]], color: 'muted', w: 2 });
      ax.push({ k: 'label', s: numT(v), p: [-0.16, 0, v * s], cls: 'tick' });
    }
    S.set('axes', ax);
    S.set('graph', SP.graph((x, y) => q(x, y) * s, { theta: [0, TAU], r: [0, R] }, 'muted', { n: 40, grid: 6, alpha: 0.42 }).map((m) => ({ ...m, name: 'the graph z = q(x) of the quadratic form' })));
    S.set('circle', [
      { k: 'line', pts: Array.from({ length: 121 }, (_, i) => { const t = (i / 120) * TAU; return [Math.cos(t), Math.sin(t), q(Math.cos(t), Math.sin(t)) * s]; }), color: 'ink', w: 5, name: 'q(u) above the unit vectors u: the unit circle lifted onto the graph' },
      { k: 'line', pts: Array.from({ length: 121 }, (_, i) => { const t = (i / 120) * TAU; return [Math.cos(t), Math.sin(t), 0]; }), color: 'guide', w: 2, dash: [4, 8], name: 'the unit circle in the plane' },
    ]);
    const marks = [];
    if (!E.equal) {
      const u1 = [Math.cos(E.th), Math.sin(E.th)], u2 = [-Math.sin(E.th), Math.cos(E.th)];
      [[u1, E.l1, '1', false], [u2, E.l2, '2', true]].forEach(([u, l, i, dashed]) => {
        marks.push({ k: 'line', pts: [[-1.4 * u[0], -1.4 * u[1], 0], [1.4 * u[0], 1.4 * u[1], 0]], color: cV, w: 1.5, dash: dashed ? [10, 10] : undefined, name: `the line of the eigenvector u${i === '1' ? '₁' : '₂'}` });
        marks.push({ k: 'arrow', a: [0, 0, 0], b: [u[0], u[1], 0], color: cV, w: 4, name: `u${i === '1' ? '₁' : '₂'} = [${numT(u[0])}, ${numT(u[1])}], a unit eigenvector of λ${i === '1' ? '₁' : '₂'} = ${numT(l)}` });
        marks.push({ k: 'label', s: `$\\kvecu${i === '1' ? 'one' : 'two'}$`, p: [1.18 * u[0], 1.18 * u[1], 0], color: cV });
        [1, -1].forEach((sg) => {
          const p = [sg * u[0], sg * u[1], l * s];
          marks.push({ k: 'line', pts: [[p[0], p[1], 0], p], color: cE, w: 2, dash: [4, 8] });
          marks.push({ k: 'dot', p, color: cE, r: 8, name: `q(${sg < 0 ? '−' : ''}u${i === '1' ? '₁' : '₂'}) = λ${i === '1' ? '₁' : '₂'} = ${numT(l)}: the ${i === '1' ? 'highest' : 'lowest'} point of the curve` });
        });
        marks.push({ k: 'label', s: `$\\klambda${i === '1' ? 'one' : 'two'} = ${num(l)}$`, p: [u[0], u[1], l * s + (l >= 0 ? 0.28 : -0.28)], color: cE });
      });
    } else {
      marks.push({ k: 'label', s: `$\\klambda = ${num(E.l1)}$`, p: [0.8, 0.8, E.l1 * s + 0.3], color: cE });
    }
    S.set('eig', marks);
    /* headline and readout, in the matrix the reader set */
    const L = M.letter(), k = kindOf(E0.l1, E0.l2);
    S.headline(E0.equal
      ? `Every unit vector gives the same value, $q(\\kvecu) = ${num(E0.l1)}$: the eigenvalues are equal and every direction is an eigenvector.`
      : `Along the unit circle $q(\\kvecu)$ is largest, $\\klambdaone = ${num(E0.l1)}$, above $\\pm\\kvecuone$ and smallest, $\\klambdatwo = ${num(E0.l2)}$, above $\\pm\\kvecutwo$.`);
    ro.set(`q_${L}(\\kvecx) = \\mk{p}{${polyTex(a0, b0, c0, 'x')}},\\quad \\klambdaone = \\mk{l1}{${num(E0.l1)}},\\quad \\klambdatwo = \\mk{l2}{${num(E0.l2)}}`,
      `${cap(words[k].replace('the matrix', `$\\k${L}$`))}.`, { form: 'surface' });
  }
  still(d, draw);
})();

/* Figure 7.2.8 + 7.2.9: the three demeaned points (2, 1), (1, 2), (−3, −3) of Preview Activity 7.2.1 and Example 7.2.7 in the plane,
   x and y from −4 to 4 at 55 units to 1 as the book's grid; the line through the origin at the angle θ of the unit vector u, in
   region's hue, u on it in vector's hue; each point dropped square onto the line (a guide segment) to its projection (d̃ⱼ·u)u, a
   hollow point. Beside it V_u = u·(Cu) = 14/3 + (13/3) sin 2θ against θ from 0° to 180° (V from 0 to 10), 9 and 1/3 dashed in
   eigenvalue's hue, the present θ dotted. θ on a slider (0°–180°, default 45°, the book's left panel), with dashed specials at 45°
   (the maximum 9) and 135° (the minimum 1/3, the book's right panel, the line at −45°). Labels: the three points by their
   coordinates (never moving), u, the line's name; projections and drops are hover names. Still: no clock. */
(function () {
  const d = sim('sim-variance-three-points', 620);
  const PTS = [[2, 1], [1, 2], [-3, -3]];
  const U = 50, PB = { l: 90, t: 130, r: 90 + 8 * U, b: 130 + 8 * U };          /* the plane: x, y ∈ [−4, 4] */
  const GB = { l: 660, t: 150, r: 1320, b: 510 };                               /* V_u against θ */
  const th = ctl(d.controls, { label: '\\theta', cls: '', key: 'theta', min: 0, max: 180, step: 1, value: 45, unit: '°', dec: 0,
    aria: 'the angle θ of the unit vector u from the positive x-axis, in degrees',
    specials: [{ at: 45, label: 'maximum' }, { at: 135, label: 'minimum' }] });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  const Vof = (deg) => { const u = [Math.cos(deg * DEG), Math.sin(deg * DEG)]; return PTS.reduce((s, p) => s + (p[0] * u[0] + p[1] * u[1]) ** 2, 0) / 3; };
  function draw() {
    const { ctx } = begin(d.c);
    const cP = C('point'), cR = C('region'), cV = C('vector'), cE = C('eigenvalue'), ink = PAL.ink;
    const g = ease.smooth(arrival(d));
    hits = [];
    const t = th.v, u = [Math.cos(t * DEG), Math.sin(t * DEG)];
    const ax = axes(ctx, PB, [-4, 4], [-4, 4], { xl: 'x', yl: 'y', nx: 8, ny: 8, fx: (v) => fmt(v, 0), fy: (v) => fmt(v, 0) });
    line(ctx, PB.l, ax.Y(0), PB.r, ax.Y(0), alpha(ink, 0.5), 2);
    line(ctx, ax.X(0), PB.t, ax.X(0), PB.b, alpha(ink, 0.5), 2);
    ctx.save(); ctx.globalAlpha *= g;
    /* the line through the origin along u, clipped to the plane */
    ctx.save(); ctx.beginPath(); ctx.rect(PB.l, PB.t, PB.r - PB.l, PB.b - PB.t); ctx.clip();
    line(ctx, ax.X(-7 * u[0]), ax.Y(-7 * u[1]), ax.X(7 * u[0]), ax.Y(7 * u[1]), cR, 4);
    ctx.restore();
    /* the line's name where it leaves the box at its upper end */
    const tEnd = Math.min(Math.abs(u[0]) > 1e-9 ? 4 / Math.abs(u[0]) : 99, Math.abs(u[1]) > 1e-9 ? 4 / Math.abs(u[1]) : 99) * 0.82;
    const sg = u[1] >= 0 ? 1 : -1, nx = -u[1] * sg, ny = u[0] * sg;
    const lx = Math.min(Math.max(ax.X(sg * u[0] * tEnd + nx * 0.42), PB.l + 40), PB.r - 40), ly = Math.min(Math.max(ax.Y(sg * u[1] * tEnd + ny * 0.42), PB.t + 16), PB.b - 16);
    text(ctx, 'line of u', lx, ly, cR, { size: 20, weight: 600, align: 'center', bg: PAL.panel });
    hits.push({ x: ax.X(-2.5 * u[0]), y: ax.Y(-2.5 * u[1]), r: 18, name: `the line through the origin in the direction of u, at ${t}°` });
    /* drops and projections */
    const proj = PTS.map((p) => p[0] * u[0] + p[1] * u[1]);
    PTS.forEach((p, j) => {
      const s = proj[j], q = [s * u[0], s * u[1]];
      line(ctx, ax.X(p[0]), ax.Y(p[1]), ax.X(q[0]), ax.Y(q[1]), alpha(ink, 0.45), 2.5, [4, 8]);
      dot(ctx, ax.X(q[0]), ax.Y(q[1]), cP, false, 8);
      hits.push({ x: ax.X(q[0]), y: ax.Y(q[1]), r: 14, name: `the projection of (${numT(p[0])}, ${numT(p[1])}) onto the line: (d̃${'₁₂₃'[j]}·u)u with d̃${'₁₂₃'[j]}·u = ${numT(s)}` });
    });
    /* u, a unit vector on the line */
    arrow(ctx, ax.X(0), ax.Y(0), ax.X(u[0]), ax.Y(u[1]), cV, 5);
    text(ctx, 'u', ax.X(0.62 * u[0] + 0.42 * u[1]), ax.Y(0.62 * u[1] - 0.42 * u[0]) + 8, cV, { size: 24, weight: 600, align: 'center', bg: PAL.panel });
    hits.push({ x: ax.X(u[0]), y: ax.Y(u[1]), r: 16, name: `u = [${numT(u[0])}, ${numT(u[1])}], the unit vector at ${t}°` });
    /* the points, named by their coordinates on the side away from the origin */
    PTS.forEach((p, j) => {
      dot(ctx, ax.X(p[0]), ax.Y(p[1]), cP, true, 9);
      const off = j === 0 ? [34, 12] : j === 1 ? [-6, -22] : [0, 30];
      text(ctx, `(${numT(p[0])}, ${numT(p[1])})`, ax.X(p[0]) + off[0], ax.Y(p[1]) + off[1], cP, { size: 20, weight: 600, align: j === 0 ? 'left' : 'center', bg: PAL.panel });
      hits.push({ x: ax.X(p[0]), y: ax.Y(p[1]), r: 14, name: `the demeaned data point d̃${'₁₂₃'[j]} = (${numT(p[0])}, ${numT(p[1])})` });
    });
    ctx.restore();
    /* V_u against θ */
    const gx = axes(ctx, GB, [0, 180], [0, 10], { xl: 'θ', yl: 'V_u', yc: cE, nx: 4, ny: 5, fx: (v) => `${fmt(v, 0)}°`, fy: (v) => fmt(v, 0) });
    [[9, 'V = 9'], [1 / 3, 'V = 1/3']].forEach(([v, s], i) => {
      line(ctx, GB.l, gx.Y(v), GB.r, gx.Y(v), alpha(cE, 0.7), 2, [10, 10]);
      text(ctx, s, GB.r - 8, gx.Y(v) + (i === 0 ? -14 : -14), cE, { size: 18, weight: 600, align: 'right', bg: PAL.panel });
    });
    plot(ctx, gx, Vof, ink, { w: 5 });
    const V = Vof(t);
    line(ctx, gx.X(t), gx.Y(V), gx.X(t), GB.b, alpha(ink, 0.45), 2, [4, 8]);
    dot(ctx, gx.X(t), gx.Y(V), cE, true, 9);
    hits.push({ x: gx.X(t), y: gx.Y(V), r: 16, name: `V_u = ${numT(V)} for the line at ${t}°` });
    hits.push({ x: gx.X(45), y: gx.Y(9), r: 14, name: 'the largest variance, 9, at 45°: u = [1/√2, 1/√2], an eigenvector of C for λ₁ = 9' });
    hits.push({ x: gx.X(135), y: gx.Y(1 / 3), r: 14, name: 'the smallest variance, 1/3, at 135°: u = [−1/√2, 1/√2], an eigenvector of C for λ₂ = 1/3' });
    /* headline and readout */
    const where = t === 45 ? 'the largest it can be' : t === 135 ? 'the smallest it can be' : `between $\\tfrac13$ and $9$`;
    headline(ctx, `With the line at $${t}^\\circ$, the projections spread to $\\kVu = ${num(V)}$, ${where}.`);
    const Vp = 28 / 3 - V;
    ro.set(`\\kVu = q_C(\\kvecu) = \\tfrac{1}{3}\\left(\\mk{p1}{${par(proj[0])}}^2 + \\mk{p2}{${par(proj[1])}}^2 + \\mk{p3}{${par(proj[2])}}^2\\right) = \\mk{v}{${num(V)}}`,
      `The perpendicular direction carries $V_{\\mathbf u^\\perp} = ${num(Vp)}$, and the two always add up to the total variance $\\kV = \\tfrac{28}{3}$.`);
  }
  still(d, draw);
})();

/* Sim: the level curves of q_A and its principal axes. Left, the plane (x₁, x₂ from −2.5 to 2.5, 92 units to 1): the level curves
   λ₁y₁² + λ₂y₂² = c for c = k·M/2 (k = ±1 … ±6, M = max |λ|) in faint ink, the two curves q_A = λ₁ and q_A = λ₂ in eigenvalue's
   hue (they touch the unit circle at ±u₁ and ±u₂), the zero set dashed where A is indefinite, the unit circle in ink, the
   eigenvector lines (u₁ solid, u₂ dashed) and the unit eigenvectors u₁, u₂, and u in vector's hue, u dragged round the circle.
   Right, q_A(u) against the angle φ of u from 0° to 360°, its vertical range following λ₁ and λ₂ on round values (the zoom the plan
   names), λ₁ and λ₂ dashed in eigenvalue's hue. Controls: the book's matrices in a dropdown, A = [1 2; 2 1] the default; a, b, c on
   sliders with specials at an eigenvalue of zero and at equal eigenvalues; φ (0°–360°, default 0°, so u = [1, 0] and q_A(u) = 1 as
   Example 7.2.2 has it), with specials at ±u₁, ±u₂; the coordinates x or y = Qᵀx as a choice, whose morph turns the plane's contents
   by −θ so that u₁ and u₂ land on the axes (Theorem 7.2.10). Still: no clock; the choice and the dropdown morph over 0.9 s. */
(function () {
  const d = sim('sim-quadratic-form', 640);
  const U = 92, PB = { l: 80, t: 130, r: 80 + 5 * U, b: 130 + 5 * U };     /* x₁, x₂ ∈ [−2.5, 2.5] */
  const GB = { l: 690, t: 150, r: 1320, b: 540 };
  const M = matrixControls(d, 'ex-2', true);
  const phi = ctl(d.controls, { label: '\\text{angle of }\\kvecu', cls: '', key: 'phi', min: 0, max: 360, step: 1, value: 0, unit: '°', dec: 0,
    aria: 'the angle of the unit vector u from the positive first axis, in degrees',
    specials: [0, 1, 2, 3].map((i) => ({ at: () => { const E = eig2(...M.entries()); return E.equal ? null : Math.round(wrap360(E.th / DEG + 90 * i)); }, label: ['u₁', 'u₂', '−u₁', '−u₂'][i] })) });
  const coords = choice(d.controls, { label: 'coordinates', key: 'coords', value: 'x', options: [{ value: 'x', label: 'x' }, { value: 'y', label: 'y = Qᵀx' }],
    aria: 'the coordinates the plane is drawn in: x, or y = Qᵀx along the eigenvectors' });
  const ro = readout(d);
  let hits = [], kNow = 0, thNow = 0;
  hover(d.stage, () => hits);
  /* u as drawn: the unit vector at angle t (degrees), turned by −kθ in the y-coordinates */
  const shown = (t) => { const a = t * DEG - kNow * thNow; return [Math.cos(a), Math.sin(a)]; };
  const grip = F.polar.grip(d, { t: phi, at: shown, span: 180 });

  /* the level set λ₁y₁² + λ₂y₂² = c as polylines in y-coordinates, reaching past radius 4 */
  function level(l1, l2, c) {
    const z = (v) => Math.abs(v) < 1e-9, out = [], L = 4.2, N = 160;
    const pts = (f, s0, s1) => Array.from({ length: N + 1 }, (_, i) => f(s0 + ((s1 - s0) * i) / N));
    if (z(c)) {
      if (l1 > 0 && l2 < 0 && !z(l1) && !z(l2)) { const m = Math.sqrt(l1 / -l2); [m, -m].forEach((k) => out.push([[-L, -L * k], [L, L * k]])); }
      else if (z(l2) && !z(l1)) out.push([[0, -L], [0, L]]);
      else if (z(l1) && !z(l2)) out.push([[-L, 0], [L, 0]]);
      return out;
    }
    const r = z(l2) ? null : c / l2, P = z(l1) ? null : c / l1;
    if (P !== null && r !== null && P > 0 && r > 0) {
      out.push(pts((t) => [Math.sqrt(P) * Math.cos(t), Math.sqrt(r) * Math.sin(t)], 0, TAU));
    } else if (P !== null && P > 0) {
      if (r === null) { [1, -1].forEach((sg) => out.push([[sg * Math.sqrt(P), -L], [sg * Math.sqrt(P), L]])); }
      else { const a = Math.sqrt(P), bb = Math.sqrt(-r), sm = Math.asinh(L / Math.min(a, bb)) + 0.2; [1, -1].forEach((sg) => out.push(pts((s) => [sg * a * Math.cosh(s), bb * Math.sinh(s)], -sm, sm))); }
    } else if (r !== null && r > 0) {
      if (P === null) { [1, -1].forEach((sg) => out.push([[-L, sg * Math.sqrt(r)], [L, sg * Math.sqrt(r)]])); }
      else { const a = Math.sqrt(-P), bb = Math.sqrt(r), sm = Math.asinh(L / Math.min(a, bb)) + 0.2; [1, -1].forEach((sg) => out.push(pts((s) => [a * Math.sinh(s), sg * bb * Math.cosh(s)], -sm, sm))); }
    }
    return out;
  }
  function draw() {
    const { ctx } = begin(d.c);
    const cE = C('eigenvalue'), cV = C('vector'), ink = PAL.ink, mu = PAL.muted;
    const g = ease.smooth(arrival(d));
    hits = [];
    const [a, b, c] = M.drawn(), [a0, b0, c0] = M.entries();
    const E = eig2(a, b, c), E0 = eig2(a0, b0, c0);
    const k = coords.mix((v) => (v === 'y' ? 1 : 0));
    kNow = k; thNow = E.th;
    const psi = (1 - k) * E.th, cs = Math.cos(psi), sn = Math.sin(psi);
    const toX = ([y1, y2]) => [cs * y1 - sn * y2, sn * y1 + cs * y2];       /* y-coordinates to the plane as drawn */
    const yAx = k >= 0.5;
    const ax = axes(ctx, PB, [-2.5, 2.5], [-2.5, 2.5], { nx: 5, ny: 5, nice: true });
    line(ctx, PB.l, ax.Y(0), PB.r, ax.Y(0), alpha(ink, 0.5), 2);
    line(ctx, ax.X(0), PB.t, ax.X(0), PB.b, alpha(ink, 0.5), 2);
    /* the axes' names, x₁ and x₂ crossfading to y₁ and y₂ */
    [['x', 1 - k], ['y', k]].forEach(([v, al]) => {
      if (al <= 0.01) return;
      ctx.save(); ctx.globalAlpha *= al;
      text(ctx, `${v}_1`, PB.r, PB.b + 58, ink, { align: 'right', weight: 600, size: 22 });
      text(ctx, `${v}_2`, PB.l, PB.t - 24, ink, { align: 'left', weight: 600, size: 22 });
      ctx.restore();
    });
    ctx.save(); ctx.globalAlpha *= g;
    ctx.save(); ctx.beginPath(); ctx.rect(PB.l, PB.t, PB.r - PB.l, PB.b - PB.t); ctx.clip();
    const stroke = (poly, color, w, dash) => {
      const P = poly.map((q) => toX(q)).map(([x, y]) => [ax.X(x), ax.Y(y)]);
      ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineJoin = 'round'; if (dash) ctx.setLineDash(dash);
      ctx.beginPath(); P.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); ctx.restore();
      return P;
    };
    const Mx = Math.max(Math.abs(E.l1), Math.abs(E.l2));
    const kind = kindOf(E.l1, E.l2);
    if (Mx > 1e-9) {
      for (let j = -6; j <= 6; j++) {
        if (!j) continue;
        const cl = (j * Mx) / 2;
        if (Math.abs(cl - E.l1) < 1e-6 || Math.abs(cl - E.l2) < 1e-6) continue;
        level(E.l1, E.l2, cl).forEach((poly) => {
          const P = stroke(poly, alpha(ink, 0.28), 2);
          const m = P[Math.floor(P.length * 0.37)];
          if (m && m[0] > PB.l && m[0] < PB.r && m[1] > PB.t && m[1] < PB.b) hits.push({ x: m[0], y: m[1], r: 10, name: `the level curve q_A(x) = ${numT(cl)}` });
        });
      }
      if (kind === 'indef') level(E.l1, E.l2, 0).forEach((poly) => stroke(poly, alpha(ink, 0.5), 2, [10, 10]));
      [[E.l1, '₁'], [E.l2, '₂']].forEach(([l, i]) => level(E.l1, E.l2, l).forEach((poly) => {
        const P = stroke(poly, cE, 3.5);
        const m = P[Math.floor(P.length * 0.12)];
        if (m) hits.push({ x: m[0], y: m[1], r: 12, name: `the level curve q_A(x) = λ${i} = ${numT(l)}, which touches the unit circle at ±u${i}` });
      }));
    }
    /* eigenvector lines */
    if (!E.equal) {
      stroke([[-4, 0], [4, 0]], alpha(cV, 0.55), 2);
      stroke([[0, -4], [0, 4]], alpha(cV, 0.55), 2, [10, 10]);
    }
    ctx.restore();
    /* the unit circle */
    ctx.save(); ctx.strokeStyle = ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ax.X(0), ax.Y(0), U, 0, TAU); ctx.stroke(); ctx.restore();
    hits.push({ x: ax.X(0) + U * Math.cos(2.4), y: ax.Y(0) - U * Math.sin(2.4), r: 10, name: 'the unit circle: every unit vector u' });
    /* u₁, u₂ */
    if (!E.equal) {
      [[[1, 0], 'u_1', E.l1, '₁'], [[0, 1], 'u_2', E.l2, '₂']].forEach(([y, s, l, i]) => {
        const [x1, x2] = toX(y);
        arrow(ctx, ax.X(0), ax.Y(0), ax.X(x1), ax.Y(x2), cV, 4);
        dot(ctx, ax.X(x1), ax.Y(x2), cE, true, 7);
        const ox = x1 * 1.32, oy = x2 * 1.32;
        text(ctx, s, ax.X(ox), ax.Y(oy) + 7, cV, { size: 22, weight: 600, align: 'center', bg: PAL.panel });
        const u = [Math.cos(E.th + (i === '₂' ? Math.PI / 2 : 0)), Math.sin(E.th + (i === '₂' ? Math.PI / 2 : 0))];
        hits.push({ x: ax.X(x1), y: ax.Y(x2), r: 14, name: `u${i} = [${numT(u[0])}, ${numT(u[1])}], a unit eigenvector of A for λ${i} = ${numT(l)}: q_A(u${i}) = ${numT(l)}` });
      });
    }
    /* u, dragged round the circle */
    const uS = shown(phi.v), uX = [Math.cos(phi.v * DEG), Math.sin(phi.v * DEG)];
    const qu = a * uX[0] ** 2 + 2 * b * uX[0] * uX[1] + c * uX[1] ** 2;
    arrow(ctx, ax.X(0), ax.Y(0), ax.X(uS[0]), ax.Y(uS[1]), cV, 5);
    grip.draw(ctx, ax, cV);
    text(ctx, 'u', ax.X(0.55 * uS[0] - 0.3 * uS[1]), ax.Y(0.55 * uS[1] + 0.3 * uS[0]) + 8, cV, { size: 24, weight: 600, align: 'center', bg: PAL.panel });
    hits.push({ x: ax.X(uS[0]), y: ax.Y(uS[1]), r: 16, name: `u = [${numT(uX[0])}, ${numT(uX[1])}], at ${phi.v}°: q_A(u) = ${numT(qu)}` });
    ctx.restore();

    /* q_A(u) against the angle of u */
    const span = Math.max(E.l1 - E.l2, Math.abs(E.l1), Math.abs(E.l2), 1);
    const nr = F.nice(Math.min(E.l2, 0) - 0.12 * span, Math.max(E.l1, 0) + 0.12 * span, 5);
    const gx = axes(ctx, GB, [0, 360], [nr.lo, nr.hi], { xl: 'angle of u', yl: `q_${M.letter()}(u)`, nx: 4, ny: nr.n, fx: (v) => `${fmt(v, 0)}°`, fy: (v) => fmt(v, Math.abs(nr.hi - nr.lo) / nr.n < 1 ? 1 : 0) });
    if (nr.lo < 0 && nr.hi > 0) line(ctx, GB.l, gx.Y(0), GB.r, gx.Y(0), alpha(ink, 0.5), 2);
    const qOf = (t) => { const x = Math.cos(t * DEG), y = Math.sin(t * DEG); return a * x * x + 2 * b * x * y + c * y * y; };
    [[E.l1, '\\klambdaone', -16], [E.l2, '\\klambdatwo', 28]].forEach(([l, s, dy], i) => {
      if (E.equal && i) return;
      line(ctx, GB.l, gx.Y(l), GB.r, gx.Y(l), alpha(cE, 0.7), 2, [10, 10]);
      text(ctx, `$${E.equal ? '\\klambda' : s} = ${num(l)}$`, GB.r - 6, gx.Y(l) + dy, cE, { size: 20, align: 'right', bg: PAL.panel, tex: true });
    });
    plot(ctx, gx, qOf, ink, { w: 5 });
    if (!E.equal) [0, 90, 180, 270].forEach((o, i) => {
      const t = wrap360(E.th / DEG + o), l = i % 2 ? E.l2 : E.l1;
      dot(ctx, gx.X(t), gx.Y(l), cE, true, 7);
      hits.push({ x: gx.X(t), y: gx.Y(l), r: 12, name: `${i % 2 ? 'the minimum' : 'the maximum'} λ${i % 2 ? '₂' : '₁'} = ${numT(l)} at ${numT(r2(t))}°, along ${i > 1 ? '−' : ''}u${i % 2 ? '₂' : '₁'}` });
    });
    line(ctx, gx.X(phi.v), gx.Y(qu), gx.X(phi.v), GB.b, alpha(ink, 0.45), 2, [4, 8]);
    dot(ctx, gx.X(phi.v), gx.Y(qu), cV, true, 9);
    hits.push({ x: gx.X(phi.v), y: gx.Y(qu), r: 16, name: `q_A(u) = ${numT(qu)} for u at ${phi.v}°` });

    /* headline, readout, note, from the matrix the reader set */
    const L = M.letter(), kd = kindOf(E0.l1, E0.l2);
    const ux = [Math.cos(phi.v * DEG), Math.sin(phi.v * DEG)];
    const q0 = a0 * ux[0] ** 2 + 2 * b0 * ux[0] * ux[1] + c0 * ux[1] ** 2;
    headline(ctx, E0.equal
      ? `$q_${L}(\\kvecu) = ${num(q0)}$ for every unit vector: both eigenvalues are $${num(E0.l1)}$.`
      : `$q_${L}(\\kvecu) = ${num(q0)}$; on the unit circle it is largest, $\\klambdaone = ${num(E0.l1)}$, along $\\pm\\kvecuone$ and smallest, $\\klambdatwo = ${num(E0.l2)}$, along $\\pm\\kvecutwo$.`);
    const shape = { pd: 'every level curve is an ellipse', nd: 'every level curve is an ellipse', indef: 'the level curves are hyperbolas', psd: 'the level curves are pairs of parallel lines', nsd: 'the level curves are pairs of parallel lines', zero: 'there are no level curves to draw' }[kd];
    const note = `${cap(words[kd].replace('the matrix', `$\\k${L}$`))}, and ${shape}.`;
    if (coords.value === 'x') {
      ro.set(`q_${L}(\\kvecu) = \\mk{f}{${par(a0)}(${num(ux[0])})^2 + ${par(2 * b0)}(${num(ux[0])})(${num(ux[1])}) + ${par(c0)}(${num(ux[1])})^2} = \\mk{v}{${num(q0)}}`, note, { form: 'x' });
    } else {
      const th0 = E0.th, v = [Math.cos(phi.v * DEG - th0), Math.sin(phi.v * DEG - th0)];
      ro.set(`q_${L}(\\kvecu) = q_D(\\kvecv) = \\klambdaone v_1^2 + \\klambdatwo v_2^2 = \\mk{f}{${par(E0.l1)}(${num(v[0])})^2 + ${par(E0.l2)}(${num(v[1])})^2} = \\mk{v}{${num(q0)}}`,
        `${note.replace(/\.$/, '')}; here $\\kvecv = \\kQT\\kvecu$ holds the coordinates of $\\kvecu$ along $\\kvecuone$ and $\\kvecutwo$.`, { form: 'y' });
    }
  }
  still(d, draw);
})();
};
