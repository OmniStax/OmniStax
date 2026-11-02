/* Figures for section 4.3 Diagonalization, similarity, and powers of a matrix. */
window.OMNISTAX_FIGURES = window.OMNISTAX_FIGURES || {};
window.OMNISTAX_FIGURES['4.3'] = function (root, F) {
const { C, PAL, alpha, ctl, select, begin, axes, drag, line, arrow, dot, text, headline, register, readout, hover, ease, fmt, arrival, pinned } = F;
const sim = (id, H) => F.sim(root, id, H);
const still = (d, draw) => register(d.fig, { update: () => {}, draw });
const DEG = Math.PI / 180;
/* a number as the figure writes it: at most two decimals, no trailing zeros, never −0 */
const r2 = (v) => { const r = Math.round(v * 100) / 100; return Object.is(r, -0) ? 0 : r; };
const r1 = (v) => { const r = Math.round(v * 10) / 10; return Object.is(r, -0) ? 0 : r; };
const num = (v) => String(r2(v));
const numT = (v) => num(v).replace('-', '−');            /* the same in figure text, with a true minus */
const col = (v) => `\\left[\\begin{array}{r} ${num(v[0])} \\\\ ${num(v[1])} \\end{array}\\right]`;
const mtx = (m) => `\\left[\\begin{array}{rr} ${num(m[0])} & ${num(m[1])} \\\\ ${num(m[2])} & ${num(m[3])} \\end{array}\\right]`;
const kmtx = (m) => `\\htmlClass{kv-matrix}{${mtx(m)}}`;
const pt = (v) => `(${numT(v[0])}, ${numT(v[1])})`;      /* in figure text */
const ptT = (v) => `(${num(v[0])}, ${num(v[1])})`;       /* in TeX */
const lerp = (a, b, k) => a + (b - a) * k;
const lerpM = (a, b, k) => a.map((x, i) => lerp(x, b[i], k));
/* y = M x for a 2 × 2 matrix [a b; c d] stored row by row; products and the inverse */
const map = (m, p) => [m[0] * p[0] + m[1] * p[1], m[2] * p[0] + m[3] * p[1]];
const mul = (m, n) => [m[0] * n[0] + m[1] * n[2], m[0] * n[1] + m[1] * n[3], m[2] * n[0] + m[3] * n[2], m[2] * n[1] + m[3] * n[3]];
const inv = (m) => { const dt = m[0] * m[3] - m[1] * m[2]; return [m[3] / dt, -m[1] / dt, -m[2] / dt, m[0] / dt]; };
const ID = [1, 0, 0, 1];
const tag = (ctx, s, x, y, color, align = 'center', size = 22) => text(ctx, s, x, y, color, { size, weight: 600, tex: true, bg: PAL.panel, align });
const clear = (c) => alpha(c, 0);

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
/* a label just past the head of the arrow from the origin to h, inside the box; a label that would sit on one placed
   earlier in the same draw steps up or down until it is clear (LAB is emptied at the start of every draw) */
let LAB = [];
function past(ctx, ax, h, s, color, a = 1, gap = 30) {
  if (!(a > 0.001)) return;
  const { X, Y, box } = ax, x1 = X(0), y1 = Y(0), x2 = X(h[0]), y2 = Y(h[1]), L = Math.hypot(x2 - x1, y2 - y1) || 1;
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
/* the grip ring of a head the reader can drag */
const ring = (ctx, ax, p, color) => { const { X, Y, box } = ax, x = X(p[0]), y = Y(p[1]); if (x < box.l || x > box.r || y < box.t || y > box.b) return; ctx.save(); ctx.strokeStyle = alpha(color, 0.35); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); };
/* a square window of the plane, −n to n each way, with a faint unit grid under its axes */
function plane(ctx, box, n, o = {}) {
  const U = (box.r - box.l) / (2 * n), cx = (box.l + box.r) / 2, cy = (box.t + box.b) / 2;
  ctx.save(); ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip();
  for (let i = -n; i <= n; i++) { line(ctx, cx + i * U, box.t, cx + i * U, box.b, alpha(PAL.ink, 0.07), 1.5); line(ctx, box.l, cy - i * U, box.r, cy - i * U, alpha(PAL.ink, 0.07), 1.5); }
  ctx.restore();
  return axes(ctx, box, [-n, n], [-n, n], { nx: o.ticks ?? 2 * n, ny: o.ticks ?? 2 * n, fx: (q) => fmt(q, 0), fy: (q) => fmt(q, 0), xl: o.xl, yl: o.yl });
}
/* the integer grid of the window −n..n carried by the matrix m: the lines x₁ = i and x₂ = i, clipped to the box */
function carried(ctx, ax, m, n, color, a, w = 1.5, dash) {
  const { X, Y, box } = ax;
  ctx.save(); ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip(); ctx.globalAlpha *= a;
  for (let i = -n; i <= n; i++) {
    const a1 = map(m, [i, -n]), b1 = map(m, [i, n]), a2 = map(m, [-n, i]), b2 = map(m, [n, i]);
    line(ctx, X(a1[0]), Y(a1[1]), X(b1[0]), Y(b1[1]), color, i ? w : w + 0.8, dash);
    line(ctx, X(a2[0]), Y(a2[1]), X(b2[0]), Y(b2[1]), color, i ? w : w + 0.8, dash);
  }
  ctx.restore();
}
/* the unit square carried by m, filled and outlined */
function square(ctx, ax, m, color, a) {
  const { X, Y, box } = ax, P4 = [[0, 0], [1, 0], [1, 1], [0, 1]].map((p) => map(m, p));
  ctx.save(); ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip();
  ctx.beginPath(); P4.forEach((p, i) => (i ? ctx.lineTo(X(p[0]), Y(p[1])) : ctx.moveTo(X(p[0]), Y(p[1])))); ctx.closePath();
  ctx.fillStyle = alpha(color, a); ctx.fill(); ctx.strokeStyle = alpha(color, 0.8); ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
}
const tname = (ctx, box, s, color) => text(ctx, s, (box.l + box.r) / 2, box.t - 22, color, { size: 20, align: 'center', tex: true });
/* the arc from direction a0 to a1 (plane angles, counterclockwise) about (x, y) */
function arc(ctx, x, y, r, a0, a1, color, w = 2.5) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.beginPath();
  ctx.arc(x, y, r, -a0, -a1, true); ctx.stroke(); ctx.restore();
}
/* a power written as the figure text shows it: λ₁ᵏ's value, with the sign kept */
const small = (v) => (v !== 0 && Math.abs(v) < 0.01 ? Number(v.toPrecision(2)).toString() : num(v));
const powTex = (base, k) => (k === 1 ? num(base) : `${num(base)}^{${k}} = ${small(Math.pow(base, k))}`);

/* Figure 4.3.1: diagonalisation as change of basis, stretch, change back (3Blue1Brown survivor 9). Left, the grid
   of linear combinations of the eigenvectors v₁ and v₂ with its unit square, v₁, v₂ and a vector x whose head the
   reader drags. Right, the same scene carried by the step of A = PDP⁻¹ the story is at: 0 the grid itself; 1 P⁻¹
   has carried v₁, v₂ onto e₁, e₂ (the skewed grid is the standard grid, x its coordinates in the eigenbasis); 2 Dᵏ
   has stretched the standard grid by λ₁ᵏ along e₁ and λ₂ᵏ along e₂ (a negative factor folds it through the axis);
   3 P has carried it back and the pane is the book's panel b, Aᵏ on the eigenbasis grid. Between stops the acting
   matrix blends toward the next factor. The matrix is a select of the book's diagonalised 2 × 2 matrices with the
   book's P and D; k (1 to 6) raises D's diagonal. The step slider is the story and carries the transport; no clock.
   Two panes, ±5 at 50 units to 1, heads past the window pinned. */
(function () {
  const d = sim('sim-diagonalization', 720);
  const N = 5, U = 50, W = 2 * N * U;
  const LB = { l: 70, r: 70 + W, t: 150, b: 150 + W }, RB = { l: 830, r: 830 + W, t: 150, b: 150 + W };
  const PRESETS = {
    ex3: { label: 'Example 4.3.3: A = [1 2; 2 1]', A: [1, 2, 2, 1], P: [1, -1, 1, 1], D: [3, -1], x: [-1, 2] },
    ex5: { label: 'Example 4.3.5: A = [−5 6; −3 4]', A: [-5, 6, -3, 4], P: [2, 1, 1, 1], D: [-2, 1], x: [1.5, 1] },
    ex10: { label: 'Example 4.3.10: the rental cars, A = [0.8 0.6; 0.2 0.4]', A: [0.8, 0.6, 0.2, 0.4], P: [3, -1, 1, 1], D: [1, 0.2], x: [4, 0] },
  };
  let x1 = null, x2 = null;
  const sel = select(d.controls, {
    label: 'matrix', key: 'matrix', value: 'ex3', aria: 'one of the book’s diagonalized matrices',
    options: Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label })),
    onInput: (v) => { const p = PRESETS[v]; x1.set(p.x[0]); x2.set(p.x[1]); },
  });
  const step = ctl(d.controls, { label: 'step', cls: '', key: 'step', min: 0, max: 3, step: 0.01, value: 0, unit: '', dec: 2, aria: 'the step of A = PDP⁻¹ shown on the right: the grid, after P⁻¹, after Dᵏ, after P' });
  const kS = ctl(d.controls, { label: 'k', cls: '', key: 'k', min: 1, max: 6, step: 1, value: 1, unit: '', dec: 0, aria: 'the power k of A' });
  x1 = ctl(d.controls, { label: 'x_1', cls: '', key: 'x1', min: -4, max: 4, step: 0.5, value: -1, unit: '', dec: 1, aria: 'the first component of x' });
  x2 = ctl(d.controls, { label: 'x_2', cls: '', key: 'x2', min: -4, max: 4, step: 0.5, value: 2, unit: '', dec: 1, aria: 'the second component of x' });
  const Pt = drag(d, { x: x1, y: x2 });
  F.story(d, step, { stops: [{ v: 0, label: 'the grid' }, { v: 1, label: 'P⁻¹' }, { v: 2, label: 'Dᵏ' }, { v: 3, label: 'P' }], ms: 1500, rest: 1200 });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  const STAGE = ['the grid', 'after P⁻¹', 'after Dᵏ P⁻¹', 'after P Dᵏ P⁻¹ = Aᵏ'];

  function draw() {
    const { ctx } = begin(d.c); LAB = [];
    const vc = C('vector'), mc = C('matrix'), ec = C('eigenvalue'), c1 = F.ref('v-1'), c2 = F.ref('v-2'), ink = PAL.ink, mu = PAL.muted;
    const g = ease.smooth(arrival(d));
    const pr = PRESETS[sel.value], k = Math.round(kS.v), s = step.v;
    const Pm = sel.mix((v) => PRESETS[v].P), Dd = sel.mix((v) => PRESETS[v].D);   /* blended while the choice morphs */
    const Pi = inv(Pm), Dk = [Math.pow(Dd[0], k), 0, 0, Math.pow(Dd[1], k)];
    const M = s <= 1 ? lerpM(ID, Pi, s) : s <= 2 ? mul(lerpM(ID, Dk, s - 1), Pi) : mul(lerpM(ID, Pm, s - 2), mul(Dk, Pi));
    const x = [r1(x1.v), r1(x2.v)], v1 = [Pm[0], Pm[2]], v2 = [Pm[1], Pm[3]];
    const Mx = map(M, x), Mv1 = map(M, v1), Mv2 = map(M, v2);
    const i = Math.round(s), atStop = Math.abs(s - i) < 0.02, lab = Math.max(0, 1 - Math.abs(s - i) / 0.08);   /* labels fade off between stops */
    hits = [];
    const G = (q) => [g * q[0], g * q[1]];
    /* left: the eigenbasis grid */
    tname(ctx, LB, 'the plane, with the grid of $\\kvecvone$ and $\\kvecvtwo$', mu);
    const al = plane(ctx, LB, N, { ticks: 10 });
    carried(ctx, al, Pm, 8, ink, 0.28 * g);
    square(ctx, al, Pm, ink, 0.1);
    vec(ctx, al, [0, 0], G(v1), c1, 5); vec(ctx, al, [0, 0], G(v2), c2, 5); vec(ctx, al, [0, 0], G(x), vc, 5);
    past(ctx, al, v1, '$\\kvecvone$', c1, g, 28); past(ctx, al, v2, '$\\kvecvtwo$', c2, g, 28); past(ctx, al, x, '$\\kvecx$', vc, g);
    Pt.draw(ctx, al, clear(vc)); ring(ctx, al, x, vc);
    dot(ctx, al.X(0), al.Y(0), ink, true, 5);
    /* right: the scene carried by the current step */
    tname(ctx, RB, atStop ? STAGE[i] : `${STAGE[Math.floor(s)]} → ${STAGE[Math.ceil(s)]}`, mu);
    const ar = plane(ctx, RB, N, { ticks: 10 });
    const MP = mul(M, Pm);
    carried(ctx, ar, MP, 8, mc, 0.4 * g);
    square(ctx, ar, MP, mc, 0.16);
    vec(ctx, ar, [0, 0], G(Mv1), c1, 5); vec(ctx, ar, [0, 0], G(Mv2), c2, 5); vec(ctx, ar, [0, 0], G(Mx), mc, 5);
    dot(ctx, ar.X(0), ar.Y(0), ink, true, 5);
    /* the images' labels, by what they equal at each stop */
    const l1 = Math.pow(pr.D[0], k), l2 = Math.pow(pr.D[1], k);
    const coef = (c, v) => (c === 1 ? v : c === -1 ? `-${v}` : `${num(c)}${v}`);
    const L1 = [`$\\kvecvone$`, `$\\kveceone$`, `$${coef(r2(l1), '\\kveceone')}$`, `$${coef(r2(l1), '\\kvecvone')}$`][i];
    const L2 = [`$\\kvecvtwo$`, `$\\kvecetwo$`, `$${coef(r2(l2), '\\kvecetwo')}$`, `$${coef(r2(l2), '\\kvecvtwo')}$`][i];
    const Ak = k === 1 ? '\\kA' : '\\kAk', Dkt = k === 1 ? '\\kD' : '\\kDk';
    const LX = [`$\\kvecx$`, `$\\kPinv\\kvecx$`, `$${Dkt}\\kPinv\\kvecx$`, `$${Ak}\\kvecx$`][i];
    past(ctx, ar, Mv1, L1, c1, g * lab, 28); past(ctx, ar, Mv2, L2, c2, g * lab, 28); past(ctx, ar, Mx, LX, mc, g * lab, 34);
    /* hover names */
    const cB = map(inv(pr.P), x), DkcB = [l1 * cB[0], l2 * cB[1]], Akx = map(pr.P, DkcB);
    const ctrL = map(pr.P, [0.5, 0.5]), ctrR = map(mul(M, pr.P), [0.5, 0.5]);
    hits.push(
      { x: al.X(v1[0]), y: al.Y(v1[1]), r: 16, name: `v₁ = ${pt(v1)}, an eigenvector with eigenvalue λ₁ = ${numT(pr.D[0])}` },
      { x: al.X(v2[0]), y: al.Y(v2[1]), r: 16, name: `v₂ = ${pt(v2)}, an eigenvector with eigenvalue λ₂ = ${numT(pr.D[1])}` },
      { x: al.X(x[0]), y: al.Y(x[1]), r: 20, name: `x = ${pt(x)} = ${numT(r2(cB[0]))}v₁ ${cB[1] < 0 ? '−' : '+'} ${numT(Math.abs(r2(cB[1])))}v₂; drag its head` },
      { x: al.X(ctrL[0]), y: al.Y(ctrL[1]), r: 18, name: 'the unit square of the eigenbasis, with sides v₁ and v₂' },
      { x: al.X(1), y: al.Y(0), r: 12, name: 'e₁ = (1, 0)' }, { x: al.X(0), y: al.Y(1), r: 12, name: 'e₂ = (0, 1)' },
      { x: ar.X(Mv1[0]), y: ar.Y(Mv1[1]), r: 16, name: [`v₁ = ${pt(v1)}`, `P⁻¹v₁ = e₁ = (1, 0)`, `DᵏP⁻¹v₁ = λ₁ᵏe₁ = ${pt([l1, 0])}`, `Aᵏv₁ = λ₁ᵏv₁ = ${pt(map(pr.A, [0, 0]).map((_, j) => l1 * v1[j]))}`][i] },
      { x: ar.X(Mv2[0]), y: ar.Y(Mv2[1]), r: 16, name: [`v₂ = ${pt(v2)}`, `P⁻¹v₂ = e₂ = (0, 1)`, `DᵏP⁻¹v₂ = λ₂ᵏe₂ = ${pt([0, l2])}`, `Aᵏv₂ = λ₂ᵏv₂ = ${pt(v2.map((q) => l2 * q))}`][i] },
      { x: ar.X(Mx[0]), y: ar.Y(Mx[1]), r: 20, name: [`x = ${pt(x)}`, `P⁻¹x = ${pt(cB.map(r2))}, the coordinates of x in the basis v₁, v₂`, `DᵏP⁻¹x = ${pt(DkcB.map(r2))}`, `Aᵏx = PDᵏP⁻¹x = ${pt(Akx.map(r2))}`][i] },
      { x: ar.X(ctrR[0]), y: ar.Y(ctrR[1]), r: 18, name: ['the unit square of the eigenbasis', 'the unit square of the eigenbasis, carried by P⁻¹ onto the standard unit square', 'the standard unit square stretched by Dᵏ: λ₁ᵏ by λ₂ᵏ', 'the unit square of the eigenbasis under Aᵏ: λ₁ᵏv₁ by λ₂ᵏv₂'][i] },
    );
    /* headline and readout */
    const L1T = powTex(pr.D[0], k), L2T = powTex(pr.D[1], k), moving = !atStop;
    const kph = k === 1 ? '' : `^{${k}}`;
    let h;
    if (moving && s < 1) h = `$\\kPinv$ is carrying $\\kvecvone$ and $\\kvecvtwo$ onto $\\kveceone$ and $\\kvecetwo$, and the grid of parallelograms onto the standard grid.`;
    else if (moving && s < 2) h = `$${Dkt}$ is stretching the standard grid by $\\klambdaone${kph} = ${L1T}$ along $\\kveceone$ and by $\\klambdatwo${kph} = ${L2T}$ along $\\kvecetwo$${l2 < 0 || l1 < 0 ? ', a negative factor folding the grid through the axis' : ''}.`;
    else if (moving) h = `$\\kP$ is carrying the stretched grid back onto the basis $\\kvecvone$, $\\kvecvtwo$.`;
    else if (i === 0) h = `In the basis $\\kvecvone$, $\\kvecvtwo$ the plane is a grid of parallelograms; $${Ak} = \\kP${Dkt}\\kPinv$ acts on it in three steps, read from the right: $\\kPinv$, then $${Dkt}$, then $\\kP$.`;
    else if (i === 1) h = `$\\kPinv$ has carried $\\kvecvone$ and $\\kvecvtwo$ onto $\\kveceone$ and $\\kvecetwo$: the eigenbasis grid is now the standard grid, and $\\kvecx$ has become its coordinates $${ptT(cB.map(r2))}$ in that basis.`;
    else if (i === 2) h = `$${Dkt}$ has stretched the standard grid by $\\klambdaone${kph} = ${L1T}$ along $\\kveceone$ and by $\\klambdatwo${kph} = ${L2T}$ along $\\kvecetwo$${l2 < 0 || l1 < 0 ? '; a negative factor is a flip' : ''}.`;
    else h = `Back in the eigenbasis: $${Ak}$ stretches by $\\klambdaone${kph} = ${L1T}$ along $\\kvecvone$ and by $\\klambdatwo${kph} = ${L2T}$ along $\\kvecvtwo$, the stretch $${Dkt}$ made along the axes, and $${Ak}\\kvecx = ${ptT(Akx.map(r2))}$.`;
    headline(ctx, h);
    const Pinv = inv(pr.P), DkM = [l1, 0, 0, l2], AkM = mul(pr.P, mul(DkM, Pinv));
    const j = moving ? Math.floor(s) : i;
    if (j === 0) ro.set(`${Ak} = \\kP${Dkt}\\kPinv = ${kmtx(pr.P)} ${kmtx(DkM)} ${kmtx(Pinv.map(r2))} = ${kmtx(AkM.map(r2))}`, `P holds the eigenvectors v₁ = ${pt(v1)} and v₂ = ${pt(v2)} as its columns; D holds λ₁ = ${numT(pr.D[0])} and λ₂ = ${numT(pr.D[1])} on its diagonal.`, { form: 'whole' });
    else if (j === 1) ro.set(`\\kPinv\\kvecx = ${kmtx(Pinv.map(r2))} ${col(x)} = ${col(cB.map(r2))}`, `The coordinates of x in the eigenbasis: x = ${numT(r2(cB[0]))}v₁ ${cB[1] < 0 ? '−' : '+'} ${numT(Math.abs(r2(cB[1])))}v₂.`, { form: 'coords' });
    else if (j === 2) ro.set(`${Dkt}\\kPinv\\kvecx = ${kmtx(DkM)} ${col(cB.map(r2))} = ${col(DkcB.map(r2))}`, `Each coordinate is multiplied by its eigenvalue${k === 1 ? '' : ` raised to the ${k}th power`}: ${numT(r2(cB[0]))} by ${numT(r2(l1))} and ${numT(r2(cB[1]))} by ${numT(r2(l2))}.`, { form: 'stretch' });
    else ro.set(`${Ak}\\kvecx = \\kP${Dkt}\\kPinv\\kvecx = ${kmtx(pr.P)} ${col(DkcB.map(r2))} = ${col(Akx.map(r2))}`, sel.value === 'ex10' ? `As k grows, 0.2ᵏ → 0, Dᵏ → [1 0; 0 0] and Aᵏx → ${pt(map(mul(pr.P, mul([1, 0, 0, 0], Pinv)), x).map(r2))}, on the line of v₁.` : `The scaled coordinates are read back in the basis v₁, v₂: ${numT(r2(DkcB[0]))}v₁ ${DkcB[1] < 0 ? '−' : '+'} ${numT(Math.abs(r2(DkcB[1])))}v₂.`, { form: 'back' });
  }
  still(d, draw);
})();

/* Sim: the point (a, b) of a complex eigenvalue in polar coordinates, and what C = [a −b; b a] does. Left, the
   book's drawing live: the point (a, b), the right triangle with legs a and b, the hypotenuse r and the angle θ;
   a and b are sliders (−2 to 2, Activity 4.3.5's a = b = 1 the defaults; the slider b carries dashed specials at
   ±√(1 − a²), where r = 1). Right, a vector x whose head the reader drags (Exercise 4.3.9's (1, 0) the default)
   and Cx, C²x, C³x, C⁴x, each turned by θ from the last and r times as long, the arc θ marked at the first step.
   A select sets (a, b) to the book's named matrices. Still: a rotation by θ is a state, not a clock. The triangle
   on ±2.5 at 100 units to 1, the iterates on ±4 at 62 units to 1. */
(function () {
  const d = sim('sim-rotation-scaling', 660);
  const LW = 500, RW = 496;
  const LB = { l: 80, r: 80 + LW, t: 140, b: 140 + LW }, RB = { l: 830, r: 830 + RW, t: 142, b: 142 + RW };
  const PRESETS = {
    act5: { label: 'Activity 4.3.5: λ = 1 + i', a: 1, b: 1 },
    act5e: { label: 'Activity 4.3.5 (e): λ = 1 − i', a: 1, b: -1 },
    e9a: { label: 'Exercise 4.3.9 (a): [0 −1.4; 1.4 0]', a: 0, b: 1.4 },
    e9b: { label: 'Exercise 4.3.9 (b): [0 −0.8; 0.8 0]', a: 0, b: 0.8 },
    e9c: { label: 'Exercise 4.3.9 (c): [0 −1; 1 0]', a: 0, b: 1 },
    custom: { label: 'your own a and b', a: null, b: null },
  };
  let sa = null, sb = null;
  const sel = select(d.controls, {
    label: 'matrix', key: 'matrix', value: 'act5', aria: 'one of the book’s rotation–scaling matrices',
    options: Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label })),
    onInput: (v) => { const p = PRESETS[v]; if (p.a === null) return; sa.set(p.a); sb.set(p.b); },
  });
  const own = () => sel.set('custom');
  sa = ctl(d.controls, { label: 'a', cls: '', key: 'a', min: -2, max: 2, step: 0.1, value: 1, unit: '', dec: 1, aria: 'the real part a of the eigenvalue', detents: [-1, 0, 1], onInput: own });
  sb = ctl(d.controls, { label: 'b', cls: '', key: 'b', min: -2, max: 2, step: 0.1, value: 1, unit: '', dec: 1, aria: 'the imaginary part b of the eigenvalue', detents: [-1, 0, 1], onInput: own,
    specials: [{ at: () => (Math.abs(sa.v) <= 1 ? r2(Math.sqrt(1 - sa.v * sa.v)) : null), label: 'r = 1' }, { at: () => (Math.abs(sa.v) < 1 ? -r2(Math.sqrt(1 - sa.v * sa.v)) : null), label: 'r = 1' }] });
  const x1 = ctl(d.controls, { label: 'x_1', cls: '', key: 'x1', min: -2, max: 2, step: 0.5, value: 1, unit: '', dec: 1, aria: 'the first component of x' });
  const x2 = ctl(d.controls, { label: 'x_2', cls: '', key: 'x2', min: -2, max: 2, step: 0.5, value: 0, unit: '', dec: 1, aria: 'the second component of x' });
  const Pt = drag(d, { x: x1, y: x2 });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  const K = 4;
  const sup = (k) => (k === 1 ? '' : `^{${k}}`);

  function draw() {
    const { ctx } = begin(d.c); LAB = [];
    const vc = C('vector'), mc = C('matrix'), ec = C('eigenvalue'), ink = PAL.ink, mu = PAL.muted;
    const g = ease.smooth(arrival(d));
    const a = r1(sa.v), b = r1(sb.v), r = Math.hypot(a, b), th = r > 1e-9 ? Math.atan2(b, a) : 0, deg = r2(th / DEG);
    const Cm = [a, -b, b, a], x = [r1(x1.v), r1(x2.v)];
    hits = [];
    /* left: the point (a, b) in polar coordinates */
    tname(ctx, LB, 'the point $(a, b)$ in polar coordinates', mu);
    const al = plane(ctx, LB, 2.5, { ticks: 5 });
    const X = al.X, Y = al.Y;
    ctx.save(); ctx.globalAlpha *= g;
    if (r > 0.05) {
      ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(a), Y(0)); ctx.lineTo(X(a), Y(b)); ctx.closePath();
      ctx.fillStyle = alpha(ec, 0.1); ctx.fill();
      line(ctx, X(0), Y(0), X(a), Y(0), ink, 2.5); line(ctx, X(a), Y(0), X(a), Y(b), ink, 2.5); line(ctx, X(0), Y(0), X(a), Y(b), ec, 3.5);
      /* the right angle's mark */
      if (Math.abs(a) > 0.15 && Math.abs(b) > 0.15) { const s = 12, ex = a > 0 ? -1 : 1, ey = b > 0 ? -1 : 1; ctx.beginPath(); ctx.moveTo(X(a) + ex * s, Y(0)); ctx.lineTo(X(a) + ex * s, Y(0) + ey * s); ctx.lineTo(X(a), Y(0) + ey * s); ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.stroke(); }
      /* the angle θ from the positive horizontal axis */
      if (Math.abs(th) > 0.02) { arc(ctx, X(0), Y(0), 44, 0, th, mu); const mid = th / 2, far = r * 100 > 150 ? 92 : 64; tag(ctx, `$\\theta = ${num(deg)}°$`, X(0) + far * Math.cos(mid), Y(0) - far * Math.sin(mid), mu, 'center', 18); }
      /* the lengths */
      /* a leg the hypotenuse lies along is not labelled twice: r already names its length */
      if (Math.abs(a) > 0.25 && Math.abs(b) > 0.25) { tag(ctx, `$a = ${num(a)}$`, X(a / 2), Y(0) + (b >= 0 ? 24 : -24), ink, 'center', 20); tag(ctx, `$b = ${num(b)}$`, X(a) + (a >= 0 ? 12 : -12), Y(b / 2), ink, a >= 0 ? 'left' : 'right', 20); }
      const nx = -b / r, ny = a / r, side = (nx * (a / 2) + ny * (-b / 2)) > 0 ? -1 : 1;
      tag(ctx, `$r = ${num(r)}$`, X(a / 2) + side * nx * 28, Y(b / 2) - side * ny * 28, ec, 'center', 20);
    }
    ctx.restore();
    dot(ctx, X(a), Y(b), ec, true, 9);
    past(ctx, al, [a, b], '$(a, b)$', ec, g, 30);
    hits.push({ x: X(a), y: Y(b), r: 18, name: `(a, b) = ${pt([a, b])}, the complex eigenvalue λ = a + bi as a point` });
    if (r > 0.05) hits.push({ x: X(a / 2), y: Y(b / 2), r: 14, name: `r = √(a² + b²) = ${numT(r2(r))}` }, { x: X(0) + 44 * Math.cos(th / 2), y: Y(0) - 44 * Math.sin(th / 2), r: 14, name: `θ = ${numT(deg)}°, the angle with the positive horizontal axis` });
    /* right: x and its images under C */
    tname(ctx, RB, 'the vectors $\\kvecx$, $\\kC\\kvecx$, $\\kC^2\\kvecx$, $\\ldots$', mu);
    const ar = plane(ctx, RB, 4, { ticks: 8 });
    const its = [x]; for (let k = 1; k <= K; k++) its.push(map(Cm, its[k - 1]));
    if (Math.abs(th) > 0.02 && Math.hypot(...x) > 0.05 && r > 0.05) {
      const a0 = Math.atan2(x[1], x[0]), rr = Math.min(40, 0.4 * Math.hypot(ar.X(x[0]) - ar.X(0), ar.Y(x[1]) - ar.Y(0)));
      arc(ctx, ar.X(0), ar.Y(0), rr, a0, a0 + th, mu, 2);
      const mid = a0 + th / 2; tag(ctx, '$\\theta$', ar.X(0) + (rr + 22) * Math.cos(mid), ar.Y(0) - (rr + 22) * Math.sin(mid), mu, 'center', 20);
    }
    if (Math.abs(r - 1) < 0.005 && Math.hypot(...x) > 0.05) { ctx.save(); ctx.globalAlpha *= g; ctx.strokeStyle = alpha(ink, 0.3); ctx.lineWidth = 2; ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.arc(ar.X(0), ar.Y(0), Math.hypot(ar.X(x[0]) - ar.X(0), ar.Y(x[1]) - ar.Y(0)), 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
    for (let k = K; k >= 1; k--) vec(ctx, ar, [0, 0], [g * its[k][0], g * its[k][1]], alpha(mc, 1 - 0.1 * (k - 1)), 4.5);
    vec(ctx, ar, [0, 0], [g * x[0], g * x[1]], vc, 5);
    dot(ctx, ar.X(0), ar.Y(0), ink, true, 5);
    Pt.draw(ctx, ar, clear(vc)); ring(ctx, ar, x, vc);
    past(ctx, ar, x, '$\\kvecx$', vc, g, 28);
    for (let k = 1; k <= K; k++) if (Math.hypot(...its[k]) > 0.3) past(ctx, ar, its[k], `$\\kC${sup(k)}\\kvecx$`, mc, g, 34);
    hits.push({ x: ar.X(x[0]), y: ar.Y(x[1]), r: 18, name: `x = ${pt(x)}; drag its head` });
    for (let k = 1; k <= K; k++) hits.push({ x: ar.X(its[k][0]), y: ar.Y(its[k][1]), r: 16, name: `C${k === 1 ? '' : '^' + k}x = ${pt(its[k].map(r2))}: x turned by ${numT(r2(k * deg))}° and scaled by r${k === 1 ? '' : '^' + k} = ${numT(r2(Math.pow(r, k)))}` });
    /* headline and readout */
    const rT = num(r2(r)), dT = num(deg);
    let h;
    if (r < 0.05) h = `With $(a, b) = (0, 0)$, $\\kC$ is the zero matrix: every vector lands on the origin.`;
    else h = `With $(a, b) = ${ptT([a, b])}$, $r = \\sqrt{a^2 + b^2} = ${rT}$ and $\\theta = ${dT}°$: $\\kC$ rotates every vector by $${dT}°$ and scales it by $${rT}$, so $\\kC^k\\kvecx$ ${Math.abs(r - 1) < 0.005 ? 'runs round a circle' : r > 1 ? 'spirals outward' : 'spirals in toward the origin'}.`;
    headline(ctx, h);
    const R = [Math.cos(th), -Math.sin(th), Math.sin(th), Math.cos(th)].map(r2);
    ro.set(`\\kC = ${kmtx(Cm)} = ${kmtx([r2(r), 0, 0, r2(r)])} ${kmtx(R)}`,
      r < 0.05 ? 'r = 0, and θ is undefined.' : `r = √(${num(a)}² + ${num(b)}²) = ${numT(r2(r))}, θ = ${numT(deg)}°; C⁴x = ${pt(its[K].map(r2))}, four turns of θ and a factor r⁴ = ${numT(r2(Math.pow(r, 4)))}.`,
      { form: 'C' });
  }
  still(d, draw);
})();
};
