/* Figures for section 2.5 Matrix transformations. */
window.OMNISTAX_FIGURES = window.OMNISTAX_FIGURES || {};
window.OMNISTAX_FIGURES['2.5'] = function (root, F) {
const { C, PAL, alpha, ctl, choice, begin, axes, drag, line, arrow, dot, text, headline, register, readout, hover, cycle, ease, fmt, arrival, pinned } = F;
const sim = (id, H) => F.sim(root, id, H);
const still = (d, draw) => register(d.fig, { update: () => {}, draw });
/* a number as the figure writes it: at most two decimals, no trailing zeros, never −0 */
const r2 = (v) => { const r = Math.round(v * 100) / 100; return Object.is(r, -0) ? 0 : r; };
const r1 = (v) => { const r = Math.round(v * 10) / 10; return Object.is(r, -0) ? 0 : r; };
const num = (v) => String(r2(v));
const numT = (v) => num(v).replace('-', '−');            /* the same in figure text, with a true minus */
const col = (a, b) => `\\left[\\begin{array}{r} ${num(a)} \\\\ ${num(b)} \\end{array}\\right]`;
const mtx = (m) => `\\left[\\begin{array}{rr} ${num(m[0])} & ${num(m[1])} \\\\ ${num(m[2])} & ${num(m[3])} \\end{array}\\right]`;
const kmtx = (m) => `\\htmlClass{kv-matrix}{${mtx(m)}}`;
const pt = (v) => `(${numT(v[0])}, ${numT(v[1])})`;      /* in figure text */
const ptT = (v) => `(${num(v[0])}, ${num(v[1])})`;       /* in TeX */
const lerp = (a, b, k) => a + (b - a) * k;
/* y = M x for a 2 × 2 matrix [a b; c d] stored row by row */
const map = (m, p) => [m[0] * p[0] + m[1] * p[1], m[2] * p[0] + m[3] * p[1]];
const mul = (m, n) => [m[0] * n[0] + m[1] * n[2], m[0] * n[1] + m[1] * n[3], m[2] * n[0] + m[3] * n[2], m[2] * n[1] + m[3] * n[3]];
const tag = (ctx, s, x, y, color, align = 'center') => text(ctx, s, x, y, color, { size: 22, weight: 600, tex: true, bg: PAL.panel, align });
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
/* a label just past the head of the arrow from the origin to h, along its direction, kept inside the box */
function past(ctx, ax, h, s, color, gap = 30) {
  const { X, Y, box } = ax, x1 = X(0), y1 = Y(0), x2 = X(h[0]), y2 = Y(h[1]), L = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = L < 3 ? 0.6 : (x2 - x1) / L, uy = L < 3 ? -0.6 : (y2 - y1) / L;
  const lx = Math.min(Math.max(x2 + ux * gap, box.l + 34), box.r - 34), ly = Math.min(Math.max(y2 + uy * (gap - 6), box.t + 14), box.b - 14);
  tag(ctx, s, lx, ly, color, ux > 0.55 ? 'left' : ux < -0.55 ? 'right' : 'center');
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
/* the unit grid of the window −n..n carried by the matrix m: the lines x₁ = i and x₂ = i, clipped to the box */
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

/* Figure 2.5.7 + 2.5.9: the three vectors e₁, e₂ and v = (−2, −1) on the left, their images under a rotation on
   the right. The rotation is a choice: 90° counterclockwise (the T of Activity 2.5.3, Figure 2.5.7, the default) or
   180° (the R of Activity 2.5.4, Figure 2.5.9); a change sweeps the images round through the angles between
   (the choice's mix runs over the angle, so the arrows turn rather than shrink). The head of v is dragged on the
   left plane or set on its sliders (−3 to 3, step 0.5); T(v) = −2T(e₁) − T(e₂) follows. Both planes are the
   book's window, −3 to 3 each way, at 72 units to 1; a head past the window is pinned at its edge. The images
   of e₁ and e₂ are the columns of the matrix, which the readout writes with T(v) = Av. Still: a rotation has
   no clock. */
(function () {
  const d = sim('sim-rotated-vectors', 670);
  const N = 3, W = 432, LB = { l: 90, r: 90 + W, t: 150, b: 150 + W }, RB = { l: 1310 - W, r: 1310, t: 150, b: 150 + W };
  const ANG = { r90: Math.PI / 2, r180: Math.PI };
  const matOf = (th) => [Math.cos(th), -Math.sin(th), Math.sin(th), Math.cos(th)];
  const exact = (m) => m.map((x) => Math.round(x));   /* the matrix of 90° or 180° has integer entries */
  const rot = choice(d.controls, {
    label: 'rotation', key: 'rotation', value: 'r90', aria: 'the rotation applied to the plane',
    options: [{ value: 'r90', label: '90° counterclockwise' }, { value: 'r180', label: '180°' }],
  });
  const v1 = ctl(d.controls, { label: 'v_1', cls: '', key: 'v1', min: -N, max: N, step: 0.5, value: -2, unit: '', dec: 1, aria: 'the first component of v' });
  const v2 = ctl(d.controls, { label: 'v_2', cls: '', key: 'v2', min: -N, max: N, step: 0.5, value: -1, unit: '', dec: 1, aria: 'the second component of v' });
  const P = drag(d, { x: v1, y: v2 });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);

  function draw() {
    const { ctx } = begin(d.c);
    const vc = C('vector'), mc = C('matrix'), ink = PAL.ink, mu = PAL.muted;
    const g = ease.smooth(arrival(d)), settled = ease.smooth(rot.k);
    const v = [r1(v1.v), r1(v2.v)], th = rot.mix((o) => ANG[o]), Mm = matOf(th), M = exact(matOf(ANG[rot.value]));
    const is90 = rot.value === 'r90', name = is90 ? '\\kT' : '\\kR', word = is90 ? 'T' : 'R';
    hits = [];
    const axL = plane(ctx, LB, N), axR = plane(ctx, RB, N);
    const G = (p) => [g * p[0], g * p[1]];
    text(ctx, 'the vectors', (LB.l + LB.r) / 2, LB.t - 24, mu, { size: 20, align: 'center' });
    text(ctx, `after rotating by $${is90 ? '90^\\circ' : '180^\\circ'}$`, (RB.l + RB.r) / 2, RB.t - 24, mu, { size: 20, align: 'center', tex: true });
    /* the arrow between the planes, carrying the transformation and its matrix */
    const MX = (LB.r + RB.l) / 2, MY = (LB.t + LB.b) / 2;
    arrow(ctx, LB.r + 40, MY, RB.l - 40, MY, mc, 4);
    text(ctx, `$${name}(\\kvecx) = ${is90 ? '\\kA' : '\\kA^2'}\\kvecx$`, MX, MY - 40, mc, { size: 22, align: 'center', tex: true });
    text(ctx, `$${is90 ? '\\kA' : '\\kA^2'} = ${mtx(M)}$`, MX, MY + 46, mc, { size: 22, align: 'center', tex: true });
    /* left: e₁, e₂ and v; right: their images */
    const e1 = [1, 0], e2 = [0, 1], T1 = map(Mm, e1), T2 = map(Mm, e2), Tv = map(Mm, v);
    vec(ctx, axL, [0, 0], G(e1), vc, 5); vec(ctx, axL, [0, 0], G(e2), vc, 5); vec(ctx, axL, [0, 0], G(v), vc, 5);
    vec(ctx, axR, [0, 0], G(T1), mc, 5); vec(ctx, axR, [0, 0], G(T2), mc, 5); vec(ctx, axR, [0, 0], G(Tv), mc, 5);
    dot(ctx, axL.X(0), axL.Y(0), ink, true, 5); dot(ctx, axR.X(0), axR.Y(0), ink, true, 5);
    P.draw(ctx, axL, clear(vc)); ring(ctx, axL, v, vc);
    if (g > 0.99) {
      past(ctx, axL, e1, '$\\kveceone$', vc, 26); past(ctx, axL, e2, '$\\kvecetwo$', vc, 26); past(ctx, axL, v, '$\\kvecv$', vc);
      ctx.save(); ctx.globalAlpha *= settled;
      past(ctx, axR, T1, `$${name}(\\kveceone)$`, mc, 34); past(ctx, axR, T2, `$${name}(\\kvecetwo)$`, mc, 34); past(ctx, axR, Tv, `$${name}(\\kvecv)$`, mc, 36);
      ctx.restore();
    }
    /* hover names */
    const V1 = map(M, e1), V2 = map(M, e2), VV = map(M, v);
    hits.push(
      { x: axL.X(1), y: axL.Y(0), r: 16, name: 'e₁ = (1, 0)' }, { x: axL.X(0), y: axL.Y(1), r: 16, name: 'e₂ = (0, 1)' },
      { x: axL.X(v[0]), y: axL.Y(v[1]), r: 20, name: `v = ${pt(v)}; drag its head` },
      { x: axR.X(V1[0]), y: axR.Y(V1[1]), r: 16, name: `${word}(e₁) = ${pt(V1)}, the first column of the matrix` },
      { x: axR.X(V2[0]), y: axR.Y(V2[1]), r: 16, name: `${word}(e₂) = ${pt(V2)}, the second column of the matrix` },
      { x: axR.X(VV[0]), y: axR.Y(VV[1]), r: 20, name: `${word}(v) = ${numT(v[0])}·${word}(e₁) ${v[1] < 0 ? '−' : '+'} ${numT(Math.abs(v[1]))}·${word}(e₂) = ${pt(VV)}` },
    );
    /* headline and readout */
    const sg = v[1] < 0 ? '-' : '+', a2 = num(Math.abs(v[1]));
    if (is90) headline(ctx, `Rotating by $90^\\circ$ counterclockwise sends $\\kveceone$ to $${ptT(V1)}$ and $\\kvecetwo$ to $${ptT(V2)}$, so $\\kA = ${mtx(M)}$ and $\\kT(\\kvecv) = \\kA\\kvecv = ${ptT(VV)}$.`);
    else headline(ctx, `Rotating by $180^\\circ$ sends $\\kveceone$ to $${ptT(V1)}$ and $\\kvecetwo$ to $${ptT(V2)}$, so the matrix of $\\kR$ is $${mtx(M)} = \\kA^2$ and $\\kR(\\kvecv) = -\\kvecv = ${ptT(VV)}$.`);
    const mat = is90 ? '\\kA' : '\\kA^2';
    ro.set(`${mat} = \\left[\\begin{array}{rr} ${name}(\\kveceone) & ${name}(\\kvecetwo) \\end{array}\\right] = ${kmtx(M)}, \\qquad ${name}(\\kvecv) = ${mat}\\kvecv = ${kmtx(M)} ${col(v[0], v[1])} = ${num(v[0])} ${col(V1[0], V1[1])} ${sg} ${a2} ${col(V2[0], V2[1])} = ${col(VV[0], VV[1])}`, '', { form: rot.value });
  }
  still(d, draw);
})();

/* Sim: matrix multiplication is composition. Three planes, −4 to 4 each way: the plane with its unit grid, e₁, e₂
   and x; the plane after the first transformation, its grid carried along (dashed) with the images of e₁, e₂ and x;
   the plane after the second, carried again. The pair is a choice of the book's named transformations: T the 90°
   rotation (A = [0 −1; 1 0]) with S the matrix of Activity 2.5.2 (B = [2 1; 1 2]), the default, or the 90° rotation
   twice (Activity 2.5.4 a, where BA = A² = −I). The order is a choice too: S after T gives BA, T after S gives AB,
   and swapping it bends the middle and right planes into the other order, so the reader sees the two products
   differ except when the two transformations are the same rotation. Where e₁ and e₂ end up in the third plane are
   the columns of the product, which the readout multiplies out with the live x (x₁, x₂ from −2 to 2, step 0.5, the
   book's v = (−2, −1) the defaults, dragged on the first plane). The first plane's arrows and the third's are
   labelled; the middle plane's are carried by hover names. Still: an order of application, not a clock. */
(function () {
  const d = sim('sim-composition', 660);
  const N = 4, W = 340, T0 = 150;
  const B1 = { l: 40, r: 40 + W, t: T0, b: T0 + W }, B2 = { l: 530, r: 530 + W, t: T0, b: T0 + W }, B3 = { l: 1020, r: 1020 + W, t: T0, b: T0 + W };
  const ROT = [0, -1, 1, 0], ACT = [2, 1, 1, 2];
  const PAIRS = {
    rota: { A: ROT, B: ACT, T: 'turns the plane by $90^\\circ$', S: 'stretches it along the diagonal', tWord: 'T, the rotation by 90°', sWord: 'S, with matrix [2 1; 1 2]' },
    rotrot: { A: ROT, B: ROT, T: 'turns the plane by $90^\\circ$', S: 'turns it by $90^\\circ$ again', tWord: 'T, the rotation by 90°', sWord: 'S, the same rotation by 90°' },
  };
  const pair = choice(d.controls, {
    label: 'pair', key: 'pair', value: 'rota', aria: 'the two transformations composed',
    options: [{ value: 'rota', label: 'rotate 90°, then [2 1; 1 2]' }, { value: 'rotrot', label: 'rotate 90° twice' }],
  });
  const order = choice(d.controls, {
    label: 'order', key: 'order', value: 'st', aria: 'which transformation is applied first',
    options: [{ value: 'st', label: 'S after T: BA' }, { value: 'ts', label: 'T after S: AB' }],
  });
  const x1 = ctl(d.controls, { label: 'x_1', cls: '', key: 'x1', min: -2, max: 2, step: 0.5, value: -2, unit: '', dec: 1, aria: 'the first component of x' });
  const x2 = ctl(d.controls, { label: 'x_2', cls: '', key: 'x2', min: -2, max: 2, step: 0.5, value: -1, unit: '', dec: 1, aria: 'the second component of x' });
  const P = drag(d, { x: x1, y: x2 });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  /* the matrix applied first and the one applied second, for a pair and an order */
  const first = (p, o) => (o === 'st' ? PAIRS[p].A : PAIRS[p].B);
  const second = (p, o) => (o === 'st' ? PAIRS[p].B : PAIRS[p].A);

  function draw() {
    const { ctx } = begin(d.c);
    const vc = C('vector'), mc = C('matrix'), ink = PAL.ink, mu = PAL.muted;
    const g = ease.smooth(arrival(d)), settled = Math.min(ease.smooth(pair.k), ease.smooth(order.k));
    const x = [r1(x1.v), r1(x2.v)], p = pair.value, o = order.value, st = o === 'st';
    const M1m = pair.mix((pp) => order.mix((oo) => first(pp, oo))), M2m = pair.mix((pp) => order.mix((oo) => mul(second(pp, oo), first(pp, oo))));
    const F1 = first(p, o), S2 = second(p, o), PR = mul(S2, F1);
    const A = PAIRS[p].A, B = PAIRS[p].B;
    hits = [];
    const ax1 = plane(ctx, B1, N, { ticks: 4 }), ax2 = plane(ctx, B2, N, { ticks: 4 }), ax3 = plane(ctx, B3, N, { ticks: 4 });
    const firstName = st ? '\\kT' : '\\kS', secondName = st ? '\\kS' : '\\kT', firstMat = st ? '\\kA' : '\\kB', secondMat = st ? '\\kB' : '\\kA';
    text(ctx, 'the plane', (B1.l + B1.r) / 2, B1.t - 24, mu, { size: 20, align: 'center' });
    text(ctx, `after $${firstName}$`, (B2.l + B2.r) / 2, B2.t - 24, mu, { size: 20, align: 'center', tex: true });
    text(ctx, `after $${firstName}$, then $${secondName}$`, (B3.l + B3.r) / 2, B3.t - 24, mu, { size: 20, align: 'center', tex: true });
    /* the arrows between the planes, each carrying its transformation */
    const MY = (B1.t + B1.b) / 2;
    [[B1.r, B2.l, firstName, firstMat, st ? A : B], [B2.r, B3.l, secondName, secondMat, st ? B : A]].forEach(([xa, xb, nm, mt, m]) => {
      arrow(ctx, xa + 22, MY, xb - 22, MY, mc, 4);
      text(ctx, `$${nm}$`, (xa + xb) / 2, MY - 30, mc, { size: 24, weight: 600, align: 'center', tex: true });
      text(ctx, `$${mt} = ${mtx(m)}$`, (xa + xb) / 2, MY + 46, mc, { size: 18, align: 'center', tex: true });
    });
    /* the grids: the unit grid, then carried once (dashed), then carried twice */
    carried(ctx, ax2, M1m, N, mc, 0.35 * g, 1.5, [8, 6]);
    carried(ctx, ax3, M2m, N, mc, 0.4 * g, 1.5);
    /* the arrows: e₁, e₂, x and their images */
    const G = (q) => [g * q[0], g * q[1]];
    const e1 = [1, 0], e2 = [0, 1];
    const i1 = map(M1m, e1), i2 = map(M1m, e2), ix = map(M1m, x), j1 = map(M2m, e1), j2 = map(M2m, e2), jx = map(M2m, x);
    vec(ctx, ax1, [0, 0], G(e1), vc, 5); vec(ctx, ax1, [0, 0], G(e2), vc, 5); vec(ctx, ax1, [0, 0], G(x), vc, 5);
    vec(ctx, ax2, [0, 0], G(i1), mc, 4.5); vec(ctx, ax2, [0, 0], G(i2), mc, 4.5); vec(ctx, ax2, [0, 0], G(ix), mc, 4.5);
    vec(ctx, ax3, [0, 0], G(j1), mc, 5); vec(ctx, ax3, [0, 0], G(j2), mc, 5); vec(ctx, ax3, [0, 0], G(jx), mc, 5);
    [ax1, ax2, ax3].forEach((a) => dot(ctx, a.X(0), a.Y(0), ink, true, 5));
    P.draw(ctx, ax1, clear(vc)); ring(ctx, ax1, x, vc);
    if (g > 0.99) {
      past(ctx, ax1, e1, '$\\kveceone$', vc, 26); past(ctx, ax1, e2, '$\\kvecetwo$', vc, 26); past(ctx, ax1, x, '$\\kvecx$', vc);
      ctx.save(); ctx.globalAlpha *= settled;
      const pm = `${secondMat}${firstMat}`;
      past(ctx, ax3, j1, `$${pm}\\kveceone$`, mc, 36); past(ctx, ax3, j2, `$${pm}\\kvecetwo$`, mc, 36); past(ctx, ax3, jx, `$${pm}\\kvecx$`, mc, 38);
      ctx.restore();
    }
    /* hover names */
    const C1 = [F1[0], F1[2]], C2 = [F1[1], F1[3]], IX = map(F1, x), D1 = [PR[0], PR[2]], D2 = [PR[1], PR[3]], JX = map(PR, x);
    const fw = st ? 'T' : 'S', sw = st ? 'S' : 'T', pw = st ? 'BA' : 'AB';
    hits.push(
      { x: ax1.X(1), y: ax1.Y(0), r: 16, name: 'e₁ = (1, 0)' }, { x: ax1.X(0), y: ax1.Y(1), r: 16, name: 'e₂ = (0, 1)' },
      { x: ax1.X(x[0]), y: ax1.Y(x[1]), r: 20, name: `x = ${pt(x)}; drag its head` },
      { x: ax2.X(C1[0]), y: ax2.Y(C1[1]), r: 16, name: `${fw}(e₁) = ${pt(C1)}, the first column of ${st ? 'A' : 'B'}` },
      { x: ax2.X(C2[0]), y: ax2.Y(C2[1]), r: 16, name: `${fw}(e₂) = ${pt(C2)}, the second column of ${st ? 'A' : 'B'}` },
      { x: ax2.X(IX[0]), y: ax2.Y(IX[1]), r: 18, name: `${fw}(x) = ${pt(IX)}` },
      { x: ax3.X(D1[0]), y: ax3.Y(D1[1]), r: 16, name: `${sw}(${fw}(e₁)) = ${pt(D1)}, the first column of ${pw}` },
      { x: ax3.X(D2[0]), y: ax3.Y(D2[1]), r: 16, name: `${sw}(${fw}(e₂)) = ${pt(D2)}, the second column of ${pw}` },
      { x: ax3.X(JX[0]), y: ax3.Y(JX[1]), r: 18, name: `${sw}(${fw}(x)) = ${pw}x = ${pt(JX)}` },
      { x: ax2.X(map(F1, [0.5, 0.5])[0]), y: ax2.Y(map(F1, [0.5, 0.5])[1]), r: 10, name: `the unit grid carried once, by ${st ? 'A' : 'B'}` },
      { x: ax3.X(map(PR, [0.5, 0.5])[0]), y: ax3.Y(map(PR, [0.5, 0.5])[1]), r: 10, name: `the unit grid carried twice, by ${pw}` },
    );
    /* headline and readout */
    const firstDoes = st ? PAIRS[p].T : PAIRS[p].S, thenDoes = st ? PAIRS[p].S : PAIRS[p].T;
    const same = p === 'rotrot';
    const tail = same ? `; the same either way, since two quarter turns are one half turn and $\\kA\\kB = \\kB\\kA = \\kA^2$` : st ? '' : `, not the columns of $\\kB\\kA$`;
    headline(ctx, `First $${firstName}$ ${firstDoes}, then $${secondName}$ ${thenDoes}: $\\kveceone$ ends at $${ptT(D1)}$ and $\\kvecetwo$ at $${ptT(D2)}$, the columns of $${secondMat}${firstMat}$${tail}; $\\kvecx = ${ptT(x)}$ ends at $${ptT(JX)}$.`);
    const comp = st ? '(\\kS\\circ \\kT)' : '(\\kT\\circ \\kS)';
    ro.set(`${secondMat}${firstMat} = ${kmtx(S2)} ${kmtx(F1)} = ${kmtx(PR)}, \\qquad ${comp}(\\kvecx) = ${secondMat}${firstMat}\\kvecx = ${kmtx(PR)} ${col(x[0], x[1])} = ${col(JX[0], JX[1])}`, '', { form: `${p}-${o}` });
  }
  still(d, draw);
})();

/* Sim: the truck fleet of Activity 2.5.5 as a discrete dynamical system. Two bars, the trucks at P and at Q,
   and beside them a graph of the two counts over fourteen days, a dot per day. The day is the clock: one day
   per 0.45 s, fourteen days, then a hold of 1.5 s; the transport scrubs the days. Between two evenings the bars
   ease from one count to the next (the walk from state to state), while the readout and the dots print the
   states themselves. Sliders: the trucks at P on Monday morning (the rest of the 1000 at Q; 0 to 1000 by 50,
   the book's x₀ = (0, 1000) the default, a detent at 100 for part d's morning), and the fractions of P's and Q's
   trucks that return to where they left (0.7 and 0.5, the book's). The split settles toward the stationary one,
   1000(1 − q, 1 − p)/(2 − p − q), which the headline names; counts are printed to a tenth of a truck where they
   are not whole. */
(function () {
  const d = sim('sim-truck-fleet', 620);
  const DAYS = 14, PER = 0.45, TOTAL = 1000;
  const BAR = { l: 130, r: 530, t: 160, b: 510 }, GR = { l: 660, r: 1320, t: 160, b: 510 };
  const cy = cycle(() => DAYS, 1.5);
  const reset = () => cy.reset();
  const p0 = ctl(d.controls, { label: '\\text{at } P \\text{ on Monday}', cls: '', key: 'p0', min: 0, max: TOTAL, step: 50, value: 0, unit: 'trucks', dec: 0, aria: 'the trucks at P on Monday morning; the rest of the 1000 start at Q', detents: [0, 100, 1000], onInput: reset });
  const sp = ctl(d.controls, { label: '\\text{return to } P', cls: '', key: 'stayP', min: 0, max: 1, step: 0.05, value: 0.7, unit: '', dec: 2, aria: 'the fraction of the trucks leaving P that return to P', onInput: reset });
  const sq = ctl(d.controls, { label: '\\text{return to } Q', cls: '', key: 'stayQ', min: 0, max: 1, step: 0.05, value: 0.5, unit: '', dec: 2, aria: 'the fraction of the trucks leaving Q that return to Q', onInput: reset });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  /* the states x₀ … x_DAYS for the current sliders */
  function states() {
    const a = r2(sp.v), b = r2(sq.v), A = [a, 1 - b, 1 - a, b], out = [[r2(p0.v), TOTAL - r2(p0.v)]];
    for (let k = 1; k <= DAYS; k++) out.push(map(A, out[k - 1]));
    return { A, xs: out };
  }
  const n1 = (v) => (Math.abs(v - Math.round(v)) < 0.05 ? fmt(Math.round(v), 0) : fmt(v, 1));   /* a count: whole where it is, else to a tenth */

  function draw() {
    const { ctx } = begin(d.c);
    const vc = C('vector'), mc = C('matrix'), ink = PAL.ink, mu = PAL.muted;
    const g = ease.smooth(arrival(d));
    const t = cy.now(), K = Math.min(DAYS, Math.floor(t + 1e-9)), fr = Math.min(1, t - K);
    const { A, xs } = states();
    const show = K >= DAYS ? xs[DAYS] : [lerp(xs[K][0], xs[K + 1][0], ease.smooth(fr)), lerp(xs[K][1], xs[K + 1][1], ease.smooth(fr))];
    hits = [];
    /* the bars */
    const bw = 120, gap = 80, cx = (BAR.l + BAR.r) / 2, x0 = cx - gap / 2 - bw, x1 = cx + gap / 2, H = BAR.b - BAR.t;
    text(ctx, `the state vector $\\kvecxk$ on day $${K}$`, cx, BAR.t - 40, mu, { size: 20, align: 'center', tex: true });
    line(ctx, BAR.l, BAR.b, BAR.r, BAR.b, mu, 2);
    [[x0, show[0], 'P'], [x1, show[1], 'Q']].forEach(([bx, n, nm]) => {
      const h = (H * n) / TOTAL * g;
      ctx.save(); ctx.fillStyle = alpha(vc, 0.8); ctx.fillRect(bx, BAR.b - h, bw, h); ctx.restore();
      text(ctx, `$${nm}$`, bx + bw / 2, BAR.b + 26, ink, { size: 24, weight: 600, align: 'center', tex: true });
      text(ctx, n1(n), bx + bw / 2, Math.max(BAR.t + 16, BAR.b - h - 18), vc, { size: 22, weight: 600, align: 'center', bg: PAL.panel });
      hits.push({ x: bx + bw / 2, y: BAR.b - h / 2, r: 40, name: `${n1(n)} trucks at ${nm}${K < DAYS && fr > 0 && fr < 1 ? ', on the way between two evenings' : ` on day ${K}`}` });
    });
    /* the graph: the counts over the days, P filled and solid, Q hollow and dashed, both the state vector's colour */
    const ax = axes(ctx, GR, [0, DAYS], [0, TOTAL], { xl: 'day', yl: 'trucks', nx: 7, ny: 5, fx: (q) => fmt(q, 0), fy: (q) => fmt(q, 0) });
    const upto = Math.min(DAYS, K + (fr > 0 ? 1 : 0));
    ctx.save(); ctx.globalAlpha *= g;
    [0, 1].forEach((i) => {
      ctx.beginPath();
      for (let k = 0; k <= upto; k++) { const px = ax.X(k), py = ax.Y(xs[k][i]); if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
      ctx.strokeStyle = alpha(vc, i ? 0.6 : 0.8); ctx.lineWidth = 3; ctx.setLineDash(i ? [8, 6] : []); ctx.stroke(); ctx.setLineDash([]);
      for (let k = 0; k <= upto; k++) { dot(ctx, ax.X(k), ax.Y(xs[k][i]), vc, i === 0, k === K ? 9 : 6); hits.push({ x: ax.X(k), y: ax.Y(xs[k][i]), r: 12, name: `day ${k}: ${n1(xs[k][i])} trucks at ${i ? 'Q' : 'P'}` }); }
      const last = xs[upto][i];
      tag(ctx, `$${i ? 'Q' : 'P'}$`, ax.X(upto) + 22, ax.Y(last), ink, 'left');
    });
    /* the resting split, as a dashed level on each count */
    const den = 2 - A[0] - A[3];
    const rest = den > 1e-9 ? [TOTAL * (1 - A[3]) / den, TOTAL * (1 - A[0]) / den] : null;
    if (rest) rest.forEach((r) => line(ctx, GR.l, ax.Y(r), GR.r, ax.Y(r), alpha(ink, 0.35), 2, [10, 10]));
    ctx.restore();
    if (rest) hits.push({ x: GR.l + 60, y: ax.Y(rest[0]), r: 14, name: `the resting split: ${n1(rest[0])} at P and ${n1(rest[1])} at Q, unchanged by a day` });
    /* headline and readout */
    const xk = xs[K], a = num(A[0]), b = num(A[3]);
    const settled = rest && Math.abs(xk[0] - rest[0]) < 0.5;
    const settling = rest ? `the split ${settled ? 'has settled at' : 'is settling toward'} $${ptT([r1(rest[0]), r1(rest[1])])}$` : 'no truck changes warehouse, so every split rests where it starts';
    if (K === 0) headline(ctx, `Monday morning: $\\kvecxzero = ${ptT(xk)}$, with ${num(A[0] * 100)}% of $P$’s trucks and ${num(A[3] * 100)}% of $Q$’s returning where they left; ${settling}.`);
    else headline(ctx, `Day $${K}$: $\\mathbf{x}_{${K}} = \\kA\\mathbf{x}_{${K - 1}} = ${ptT(xk.map(r1))}$; ${settling}.`);
    if (K === 0) ro.set(`\\kvecxzero = ${col(xk[0], xk[1])}, \\qquad \\kA = ${kmtx(A)}`, `$\\mathbf{x}_{k+1} = \\kA\\kvecxk$: each evening’s distribution is $\\kA$ times the morning’s.`, { form: 'start' });
    else ro.set(`\\mathbf{x}_{${K}} = \\kA\\mathbf{x}_{${K - 1}} = ${kmtx(A)} ${col(r1(xs[K - 1][0]), r1(xs[K - 1][1]))} = ${col(r1(xk[0]), r1(xk[1]))}`, `$\\mathbf{x}_{${K}} = \\kA^{${K}}\\kvecxzero$: ${K} day${K === 1 ? '' : 's'} of the transition function, one power of $\\kA$ each.`, { form: 'day' });
  }
  register(d.fig, { update: (dt) => cy.step(dt, () => 1 / PER), draw });
})();
};
