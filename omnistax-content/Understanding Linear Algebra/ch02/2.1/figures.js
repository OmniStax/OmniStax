/* Figures for section 2.1 Vectors and linear combinations. */
window.OMNISTAX_FIGURES = window.OMNISTAX_FIGURES || {};
window.OMNISTAX_FIGURES['2.1'] = function (root, F) {
const { C, PAL, alpha, ctl, choice, begin, axes, drag, line, arrow, dot, text, headline, register, readout, hover, arrival, ease, pinned, fmt } = F;
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
const pt = (v) => `(${numT(v[0])}, ${numT(v[1])})`;      /* a point in figure text */
const ptT = (v) => `(${num(v[0])}, ${num(v[1])})`;       /* a point inside TeX */
/* the scalar c written before a vector: 1v is v, −1v is −v */
const coef = (c, sym) => (c === 1 ? sym : c === -1 ? `-${sym}` : `${num(c)}${sym}`);
const coefT = (c, s) => coef(c, s).replace('-', '−');
const tag = (ctx, s, x, y, color, align = 'center') => text(ctx, s, x, y, color, { size: 22, weight: 600, tex: true, bg: PAL.panel, align });
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (k, a) => [k * a[0], k * a[1]];
const inBox = (box, x, y) => x >= box.l && x <= box.r && y >= box.t && y <= box.b;

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
/* a line of the plane through p in the direction dir, across the box, clipped */
function across(ctx, ax, p, dir, color, w = 3, dash) {
  const L = Math.hypot(dir[0], dir[1]); if (!(L > 1e-6)) return;
  const u = [dir[0] / L, dir[1] / L], { X, Y, box } = ax;
  ctx.save(); ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip();
  line(ctx, X(p[0] - 100 * u[0]), Y(p[1] - 100 * u[1]), X(p[0] + 100 * u[0]), Y(p[1] + 100 * u[1]), color, w, dash);
  ctx.restore();
}
/* the part of the segment (x1, y1) → (x2, y2) inside the box, so a label sits beside what is seen */
function clipSeg(box, x1, y1, x2, y2) {
  let t0 = 0, t1 = 1; const dx = x2 - x1, dy = y2 - y1;
  for (const [p, q] of [[-dx, x1 - box.l], [dx, box.r - x1], [-dy, y1 - box.t], [dy, box.b - y1]]) {
    if (p === 0) { if (q < 0) return [x1, y1, x2, y2]; continue; }
    const r = q / p; if (p < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r);
  }
  if (t0 > t1) return [x1, y1, x2, y2];
  return [x1 + dx * t0, y1 + dy * t0, x1 + dx * t1, y1 + dy * t1];
}
/* a label beside the middle of the arrow t → h, on the side away from the point `away` (in the plane) */
function beside(ctx, ax, t, h, away, s, color) {
  const { X, Y, box } = ax;
  const [x1, y1, x2, y2] = clipSeg(box, X(t[0]), Y(t[1]), X(h[0]), Y(h[1]));
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, L = Math.hypot(x2 - x1, y2 - y1) || 1;
  let nx = -(y2 - y1) / L, ny = (x2 - x1) / L;
  if (L < 3) { nx = -0.7; ny = -0.7; }
  const ax0 = X(away[0]), ay0 = Y(away[1]);
  if ((mx - ax0) * nx + (my - ay0) * ny < 0) { nx = -nx; ny = -ny; }
  const lx = Math.min(Math.max(mx + nx * 34, box.l + 40), box.r - 40), ly = Math.min(Math.max(my + ny * 26, box.t + 16), box.b - 16);
  tag(ctx, s, lx, ly, color, nx > 0.55 ? 'left' : nx < -0.55 ? 'right' : 'center');
}
/* a label just past the head of the arrow t → h, along its direction */
function past(ctx, ax, t, h, s, color, gap = 30) {
  const { X, Y, box } = ax, x1 = X(t[0]), y1 = Y(t[1]), x2 = X(h[0]), y2 = Y(h[1]), L = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = L < 3 ? 0.6 : (x2 - x1) / L, uy = L < 3 ? -0.6 : (y2 - y1) / L;
  const lx = Math.min(Math.max(x2 + ux * gap, box.l + 30), box.r - 30), ly = Math.min(Math.max(y2 + uy * (gap - 6), box.t + 14), box.b - 14);
  tag(ctx, s, lx, ly, color, ux > 0.55 ? 'left' : ux < -0.55 ? 'right' : 'center');
}
/* the grip ring of a head the reader can drag */
const ring = (ctx, ax, p, color) => { const { X, Y, box } = ax, x = X(p[0]), y = Y(p[1]); if (!inBox(box, x, y)) return; ctx.save(); ctx.strokeStyle = alpha(color, 0.35); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); };
const clear = (c) => alpha(c, 0);
/* a faint hollow mark at a point of the plane, for the book's own instances the hover names */
function mark(ctx, ax, p, color) {
  const x = ax.X(p[0]), y = ax.Y(p[1]); if (!inBox(ax.box, x, y)) return;
  ctx.save(); ctx.globalAlpha *= 0.55; dot(ctx, x, y, color, false, 6); ctx.restore();
}
/* the plane: a faint unit grid under the axes, then the axes with integer ticks */
function plane(ctx, BOX, xr, yr) {
  const U = (BOX.r - BOX.l) / (xr[1] - xr[0]), ink = PAL.ink;
  ctx.save(); ctx.beginPath(); ctx.rect(BOX.l, BOX.t, BOX.r - BOX.l, BOX.b - BOX.t); ctx.clip();
  for (let i = xr[0]; i <= xr[1]; i++) line(ctx, BOX.l + (i - xr[0]) * U, BOX.t, BOX.l + (i - xr[0]) * U, BOX.b, alpha(ink, 0.06), 1.5);
  for (let j = yr[0]; j <= yr[1]; j++) line(ctx, BOX.l, BOX.b - (j - yr[0]) * U, BOX.r, BOX.b - (j - yr[0]) * U, alpha(ink, 0.06), 1.5);
  ctx.restore();
  const every = xr[1] - xr[0] > 12 ? 2 : 1;
  return axes(ctx, BOX, xr, yr, { xl: 'x', yl: 'y', nx: (xr[1] - xr[0]) / every, ny: (yr[1] - yr[0]) / every, fx: (q) => fmt(q, 0), fy: (q) => fmt(q, 0) });
}
const comp = (d, label, key, value, aria, min = -4, max = 4) => ctl(d.controls, { label, cls: '', key, min, max, step: 0.1, value, unit: '', dec: 1, aria });

/* Figure 2.1.1 + 2.1.5: a vector and its scalar multiples. v = [2, 1] with a draggable head and a slider c;
   cv is drawn solid along with v, and the line of all multiples in the region colour; the book's other
   multiples −2v, −v, 2v are faint hollow marks on the line, named on hover, so Figure 2.1.5 is the
   picture at c = 2 (the default) and Figure 2.1.1 the picture at c = 1. The window is Figure 2.1.5's,
   x and y from −6 to 6 at 60 units to 1; a head past it is pinned at the edge. Still: no clock. */
(function () {
  const d = sim('sim-vector-scalar-multiples', 860);
  const BOX = { l: 340, r: 1060, t: 100, b: 820 }, XR = [-6, 6], YR = [-6, 6];
  const v1 = comp(d, 'v_1', 'v1', 2, 'the first component of v'), v2 = comp(d, 'v_2', 'v2', 1, 'the second component of v');
  const c = ctl(d.controls, { label: 'c', cls: '', key: 'c', min: -3, max: 3, step: 0.1, value: 2, unit: '', dec: 1, aria: 'the scalar c', detents: [-2, -1, 1, 2], snap: false, specials: [{ at: 0, label: 'the zero vector' }] });
  const P = drag(d, { x: v1, y: v2 });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  function draw() {
    const { ctx } = begin(d.c);
    const vc = C('vector'), rc = C('region'), ink = PAL.ink;
    const g = ease.smooth(arrival(d));
    const v = [r1(v1.v), r1(v2.v)], k = r1(c.v), cv = [r2(k * v[0]), r2(k * v[1])];
    hits = [];
    const ax = plane(ctx, BOX, XR, YR);
    const S = (p) => mul(g, p);
    /* the line of every multiple of v, and the book's own multiples as marks on it */
    ctx.save(); ctx.globalAlpha *= g;
    across(ctx, ax, [0, 0], v, alpha(rc, 0.7), 3);
    [-2, -1, 2].forEach((m) => { const p = mul(m, v); mark(ctx, ax, p, vc); hits.push({ x: ax.X(p[0]), y: ax.Y(p[1]), r: 14, name: `${coefT(m, 'v')} = ${pt(p)}, one of the book’s multiples` }); });
    ctx.restore();
    /* cv, then v on top */
    vec(ctx, ax, [0, 0], S(cv), vc, 5);
    vec(ctx, ax, [0, 0], S(v), vc, 5);
    dot(ctx, ax.X(0), ax.Y(0), ink, true, 5);
    P.draw(ctx, ax, clear(vc));
    ring(ctx, ax, v, vc);
    if (g > 0.99) {
      /* v is named beside its shaft, cv past its head (or at the origin when c = 0) */
      const side = [-v[1], v[0]];
      beside(ctx, ax, [0, 0], v, side, '$\\kvecv$', vc);
      if (k === 0) tag(ctx, '$0\\kvecv = \\begin{bmatrix} 0 \\\\ 0 \\end{bmatrix}$', ax.X(0) - 22, ax.Y(0) + 28, vc, 'right');
      else past(ctx, ax, [0, 0], cv, `$${coef(k, '\\kvecv')}$`, vc, Math.abs(k) < 1 ? 44 : 30);
    }
    const mid = mul(0.5, v);
    hits.push({ x: ax.X(v[0]), y: ax.Y(v[1]), r: 20, name: `v = ${pt(v)}; drag its head` });
    if (k !== 0 && k !== 1) hits.push({ x: ax.X(cv[0]), y: ax.Y(cv[1]), r: 18, name: `${coefT(k, 'v')} = ${pt(cv)}` });
    const far = mul(k > 0 ? -3 : 3, v);
    hits.push({ x: ax.X(far[0]), y: ax.Y(far[1]), r: 16, name: 'the line through the origin and v: every scalar multiple of v has its tip on it' });
    hits.push({ x: ax.X(mid[0]), y: ax.Y(mid[1]), r: 12, name: `v = ${pt(v)}` });
    const what = k === 0 ? 'the zero vector, at the origin' : k === 1 ? 'the same vector' : k === -1 ? 'the same length, the opposite direction'
      : k > 0 ? `the same direction as $\\kvecv$, ${num(k)} times as long` : `the opposite direction, ${num(Math.abs(k))} times as long`;
    headline(ctx, `$c\\kvecv = ${coef(k, '\\kvecv')} = ${ptT(cv)}$: ${what}; every multiple of $\\kvecv$ lies on the line through $\\kvecv$.`);
    ro.set(`c\\kvecv = ${par(k)}${colOf(v)} = ${col(`${par(k)}(${num(v[0])})`, `${par(k)}(${num(v[1])})`)} = ${colOf(cv)}`);
  }
  still(d, draw);
})();

/* Figure 2.1.6: vector addition. v = [3, 1] and w = [2, 3] with draggable heads; w is laid from the tip of v and
   v + w closes the walk, and the parallelogram's other two sides (w from the origin, v from the tip of w) are
   dashed guides, so the sum reads as its diagonal in the same picture. x and y from −4 to 8 at 60 units to 1:
   the book's window 0 to 6 lies inside, and a sum past the edge at the sliders' ends is pinned. Still. */
(function () {
  const d = sim('sim-vector-sum', 860);
  const BOX = { l: 340, r: 1060, t: 100, b: 820 }, XR = [-4, 8], YR = [-4, 8];
  const v1 = comp(d, 'v_1', 'v1', 3, 'the first component of v', -5, 5), v2 = comp(d, 'v_2', 'v2', 1, 'the second component of v', -5, 5);
  const w1 = comp(d, 'w_1', 'w1', 2, 'the first component of w', -5, 5), w2 = comp(d, 'w_2', 'w2', 3, 'the second component of w', -5, 5);
  const PV = drag(d, { x: v1, y: v2 }), PW = drag(d, { x: w1, y: w2 });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  function draw() {
    const { ctx } = begin(d.c);
    const vc = C('vector'), ink = PAL.ink;
    const g = ease.smooth(arrival(d));
    const v = [r1(v1.v), r1(v2.v)], w = [r1(w1.v), r1(w2.v)], s = [r2(v[0] + w[0]), r2(v[1] + w[1])];
    hits = [];
    const ax = plane(ctx, BOX, XR, YR);
    const S = (p) => mul(g, p);
    /* the parallelogram's far sides, as guides */
    vec(ctx, ax, [0, 0], S(w), vc, 3, [10, 9], 0.45);
    vec(ctx, ax, S(w), S(s), vc, 3, [10, 9], 0.45);
    /* the walk: v, then w from its tip, then the sum */
    vec(ctx, ax, [0, 0], S(v), vc, 5);
    vec(ctx, ax, S(v), S(s), vc, 5);
    vec(ctx, ax, [0, 0], S(s), vc, 5);
    dot(ctx, ax.X(0), ax.Y(0), ink, true, 5);
    PV.draw(ctx, ax, clear(vc));
    ring(ctx, ax, v, vc);
    /* w's grip is its head where it is drawn, at the tip of v */
    const wGrip = { ...ax, X: (q) => ax.X(q + v[0]), Y: (q) => ax.Y(q + v[1]), xr: [XR[0] - v[0], XR[1] - v[0]], yr: [YR[0] - v[1], YR[1] - v[1]] };
    PW.draw(ctx, wGrip, clear(vc));
    ring(ctx, ax, s, vc);
    if (g > 0.99) {
      const cen = mul(1 / 3, add(v, s));
      beside(ctx, ax, [0, 0], v, cen, '$\\kvecv$', vc);
      beside(ctx, ax, v, s, cen, '$\\kvecw$', vc);
      beside(ctx, ax, [0, 0], s, cen, '$\\kvecv + \\kvecw$', vc);
    }
    hits.push({ x: ax.X(v[0]), y: ax.Y(v[1]), r: 20, name: `v = ${pt(v)}; drag its head` });
    hits.push({ x: ax.X(s[0]), y: ax.Y(s[1]), r: 20, name: `v + w = ${pt(s)}, the tip of w laid from the tip of v; drag it to move w` });
    hits.push({ x: ax.X(w[0] / 2), y: ax.Y(w[1] / 2), r: 14, name: `w = ${pt(w)} drawn from the origin: the parallelogram’s other side` });
    hits.push({ x: ax.X(w[0] + v[0] / 2), y: ax.Y(w[1] + v[1] / 2), r: 14, name: `v laid from the tip of w: walking w first and then v reaches the same point` });
    headline(ctx, `Along $\\kvecv$, then along $\\kvecw$: $\\kvecv + \\kvecw = ${ptT(s)}$, the far corner of the parallelogram on $\\kvecv$ and $\\kvecw$.`);
    ro.set(`\\kvecv + \\kvecw = ${colOf(v)} + ${colOf(w)} = ${col(`${num(v[0])} + ${par(w[0])}`, `${num(v[1])} + ${par(w[1])}`)} = ${colOf(s)}`);
  }
  still(d, draw);
})();

/* Figure 2.1.7: the line cv + w. v = [2, 1], w = [−1, 3] with draggable heads and a slider c: cv is laid from the
   tip of w (faint, dashed) and cv + w drawn from the origin, its tip on the line through w parallel to v, in the
   region colour; the line of multiples cv through the origin, which it translates, is a guide; the book's four
   sums −2v + w, −v + w, v + w, 2v + w are faint marks on the line, named on hover, and c's detents. x and y from
   −6 to 6 at 60 units to 1, heads past the box pinned. Still. */
(function () {
  const d = sim('sim-line-of-vectors', 860);
  const BOX = { l: 340, r: 1060, t: 100, b: 820 }, XR = [-6, 6], YR = [-6, 6];
  const v1 = comp(d, 'v_1', 'v1', 2, 'the first component of v'), v2 = comp(d, 'v_2', 'v2', 1, 'the second component of v');
  const w1 = comp(d, 'w_1', 'w1', -1, 'the first component of w'), w2 = comp(d, 'w_2', 'w2', 3, 'the second component of w');
  const c = ctl(d.controls, { label: 'c', cls: '', key: 'c', min: -3, max: 3, step: 0.1, value: 2, unit: '', dec: 1, aria: 'the scalar c', detents: [-2, -1, 1, 2], snap: false, specials: [{ at: 0, label: 'w itself' }] });
  const PV = drag(d, { x: v1, y: v2 }), PW = drag(d, { x: w1, y: w2 });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  function draw() {
    const { ctx } = begin(d.c);
    const vc = C('vector'), rc = C('region'), ink = PAL.ink;
    const g = ease.smooth(arrival(d));
    const v = [r1(v1.v), r1(v2.v)], w = [r1(w1.v), r1(w2.v)], k = r1(c.v), cv = mul(k, v), s = [r2(w[0] + cv[0]), r2(w[1] + cv[1])];
    hits = [];
    const ax = plane(ctx, BOX, XR, YR);
    const S = (p) => mul(g, p);
    ctx.save(); ctx.globalAlpha *= g;
    across(ctx, ax, [0, 0], v, alpha(ink, 0.3), 2);
    across(ctx, ax, w, v, alpha(rc, 0.75), 3.5);
    [-2, -1, 1, 2].forEach((m) => { const p = add(w, mul(m, v)); mark(ctx, ax, p, vc); hits.push({ x: ax.X(p[0]), y: ax.Y(p[1]), r: 14, name: `${coefT(m, 'v')} + w = ${pt(p)}, one of the book’s four sums` }); });
    ctx.restore();
    /* w, v from the origin; cv laid from the tip of w; the sum */
    vec(ctx, ax, S(w), S(s), vc, 3, [10, 9], 0.5);
    vec(ctx, ax, [0, 0], S(v), vc, 5);
    vec(ctx, ax, [0, 0], S(w), vc, 5);
    vec(ctx, ax, [0, 0], S(s), vc, 5);
    dot(ctx, ax.X(0), ax.Y(0), ink, true, 5);
    PV.draw(ctx, ax, clear(vc)); ring(ctx, ax, v, vc);
    PW.draw(ctx, ax, clear(vc)); ring(ctx, ax, w, vc);
    if (g > 0.99) {
      beside(ctx, ax, [0, 0], v, w, '$\\kvecv$', vc);
      beside(ctx, ax, [0, 0], w, v, '$\\kvecw$', vc);
      beside(ctx, ax, [0, 0], s, w, `$${k === 0 ? '0\\kvecv + \\kvecw' : `${coef(k, '\\kvecv')} + \\kvecw`}$`, vc);
    }
    hits.push({ x: ax.X(v[0]), y: ax.Y(v[1]), r: 20, name: `v = ${pt(v)}; drag its head` });
    hits.push({ x: ax.X(w[0]), y: ax.Y(w[1]), r: 20, name: `w = ${pt(w)}; drag its head` });
    hits.push({ x: ax.X(w[0] + cv[0] / 2), y: ax.Y(w[1] + cv[1] / 2), r: 14, name: `${coefT(k, 'v')} laid from the tip of w` });
    hits.push({ x: ax.X(s[0]), y: ax.Y(s[1]), r: 18, name: `${coefT(k, 'v')} + w = ${pt(s)}` });
    const far = add(w, mul(3.2, v)), far0 = mul(-3.2, v);
    hits.push({ x: ax.X(far[0]), y: ax.Y(far[1]), r: 16, name: 'the line through w parallel to v: the tips of the vectors cv + w' });
    hits.push({ x: ax.X(far0[0]), y: ax.Y(far0[1]), r: 16, name: 'the line of the multiples cv through the origin, which the other line translates' });
    headline(ctx, `$c\\kvecv + \\kvecw = ${coef(k, '\\kvecv')} + \\kvecw = ${ptT(s)}$: from the tip of $\\kvecw$, ${num(k)} ${Math.abs(k) === 1 ? 'step' : 'steps'} along $\\kvecv$; its tip lies on the line through $\\kvecw$ parallel to $\\kvecv$.`);
    ro.set(`c\\kvecv + \\kvecw = ${par(k)}${colOf(v)} + ${colOf(w)} = ${col(`${par(k)}(${num(v[0])}) + ${par(w[0])}`, `${par(k)}(${num(v[1])}) + ${par(w[1])}`)} = ${colOf(s)}`);
  }
  still(d, draw);
})();

/* Figure 2.1.10: the author's linear-combinations interactive, rebuilt. v = [2, 1] and w = [1, 2] fixed as Activity
   2.1.2 fixes them; sliders c and d (−4 to 4, the author's 1 and 0 the defaults); the combination cv + dw drawn
   as its walk, c steps along v then d steps along w, faint and dashed, over the skewed grid the two vectors
   weave; a choice of target b from the activity ([3, 0], [1.3, −1.7]) draws b as a hollow point and marks on c
   and d the weights that reach it, found from the system 2c + d = b₁, c + 2d = b₂. x and y from −8 to 8 at
   45 units to 1; 4v + 4w = (12, 12) is pinned past the edge. Still. */
(function () {
  const d = sim('sim-linear-combinations', 900);
  const BOX = { l: 340, r: 1060, t: 110, b: 830 }, XR = [-8, 8], YR = [-8, 8];
  const V = [2, 1], W = [1, 2];
  const TARGETS = { none: null, b1: [3, 0], b2: [1.3, -1.7] };
  const weights = (b) => (b ? [(2 * b[0] - b[1]) / 3, (2 * b[1] - b[0]) / 3] : null);
  const target = choice(d.controls, { label: '\\kvecb', key: 'target', value: 'none', options: [{ value: 'none', label: 'none' }, { value: 'b1', label: '[3, 0]' }, { value: 'b2', label: '[1.3, −1.7]' }], onInput: () => { cs.refresh(); ds.refresh(); } });
  const spec = (i) => [{ at: () => { const wt = weights(TARGETS[target.value]); return wt ? Math.round(wt[i] * 100) / 100 : null; }, label: 'reaches b' }];
  const cs = ctl(d.controls, { label: 'c', cls: '', key: 'c', min: -4, max: 4, step: 0.1, value: 1, unit: '', dec: 1, aria: 'the weight c of v', detents: [-4, -3, -2, -1, 0, 1, 2, 3, 4], snap: false, specials: spec(0) });
  const ds = ctl(d.controls, { label: 'd', cls: '', key: 'd', min: -4, max: 4, step: 0.1, value: 0, unit: '', dec: 1, aria: 'the weight d of w', detents: [-4, -3, -2, -1, 0, 1, 2, 3, 4], snap: false, specials: spec(1) });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  function draw() {
    const { ctx } = begin(d.c);
    const vc = C('vector'), ink = PAL.ink;
    const g = ease.smooth(arrival(d));
    const c = r2(cs.v), k = r2(ds.v), cv = mul(c, V), s = [r2(cv[0] + k * W[0]), r2(cv[1] + k * W[1])];
    const b = TARGETS[target.value], wt = weights(b), onB = b ? Math.hypot(s[0] - b[0], s[1] - b[1]) < 0.06 : false;
    hits = [];
    const ax = plane(ctx, BOX, XR, YR);
    /* the grid the two vectors weave: the lines iv + tw and tv + iw for whole i */
    ctx.save(); ctx.globalAlpha *= g;
    for (let i = -12; i <= 12; i++) { if (i === 0) continue; across(ctx, ax, mul(i, V), W, alpha(ink, 0.13), 1.5); across(ctx, ax, mul(i, W), V, alpha(ink, 0.13), 1.5); }
    across(ctx, ax, [0, 0], W, alpha(ink, 0.22), 1.5); across(ctx, ax, [0, 0], V, alpha(ink, 0.22), 1.5);
    ctx.restore();
    const S = (p) => mul(g, p);
    /* the walk, then the combination, then v and w */
    vec(ctx, ax, [0, 0], S(cv), vc, 3, [10, 9], 0.5);
    vec(ctx, ax, S(cv), S(s), vc, 3, [10, 9], 0.5);
    vec(ctx, ax, [0, 0], S(s), vc, 5);
    vec(ctx, ax, [0, 0], S(V), vc, 5);
    vec(ctx, ax, [0, 0], S(W), vc, 5);
    dot(ctx, ax.X(0), ax.Y(0), ink, true, 5);
    if (b) { const x = ax.X(b[0]), y = ax.Y(b[1]); dot(ctx, x, y, vc, onB, onB ? 9 : 8); if (onB) { ctx.save(); ctx.strokeStyle = alpha(vc, 0.4); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); } }
    if (g > 0.99) {
      beside(ctx, ax, [0, 0], V, W, '$\\kvecv$', vc);
      beside(ctx, ax, [0, 0], W, V, '$\\kvecw$', vc);
      const name = c === 0 && k === 0 ? '0\\kvecv + 0\\kvecw' : `${c === 0 ? '0\\kvecv' : coef(c, '\\kvecv')} ${k < 0 ? '-' : '+'} ${k === 0 ? '0\\kvecw' : coef(Math.abs(k), '\\kvecw')}`;
      const nm = onB ? `${name} = \\kvecb` : name;
      if (s[0] === 0 && s[1] === 0) tag(ctx, `$${nm}$`, ax.X(0) - 22, ax.Y(0) + 28, vc, 'right');
      else past(ctx, ax, [0, 0], s, `$${nm}$`, vc, 34);
      if (b && !onB) tag(ctx, '$\\kvecb$', ax.X(b[0]) - 20, ax.Y(b[1]) + 26, vc, 'right');
    }
    hits.push({ x: ax.X(V[0]), y: ax.Y(V[1]), r: 16, name: 'v = (2, 1)' });
    hits.push({ x: ax.X(W[0]), y: ax.Y(W[1]), r: 16, name: 'w = (1, 2)' });
    hits.push({ x: ax.X(cv[0] / 2), y: ax.Y(cv[1] / 2), r: 12, name: `${coefT(c, 'v')} = ${pt(cv)}: ${numT(c)} steps along v` });
    hits.push({ x: ax.X(cv[0] + k * W[0] / 2), y: ax.Y(cv[1] + k * W[1] / 2), r: 12, name: `${coefT(k, 'w')} = ${pt(mul(k, W))}: ${numT(k)} steps along w, from the tip of ${coefT(c, 'v')}` });
    hits.push({ x: ax.X(s[0]), y: ax.Y(s[1]), r: 18, name: `cv + dw = ${pt(s)}` });
    if (b) hits.push({ x: ax.X(b[0]), y: ax.Y(b[1]), r: 16, name: `b = ${pt(b)}, the target` });
    hits.push({ x: ax.X(1.5), y: ax.Y(1.5), r: 12, name: 'the grid of linear combinations with whole-number weights: v + w is this cell’s far corner' });
    const steps = (n) => `${num(Math.abs(n))} ${Math.abs(n) === 1 ? 'step' : 'steps'}${n < 0 ? ' backwards' : ''}`;
    let h = `$c\\kvecv + d\\kvecw = ${par(c)}\\kvecv + ${par(k)}\\kvecw = ${ptT(s)}$: ${steps(c)} along $\\kvecv$, then ${steps(k)} along $\\kvecw$`;
    if (b && onB) h += `; it lands on $\\kvecb = ${ptT(b)}$, so the weights $c = ${num(wt[0])}$, $d = ${num(wt[1])}$ write $\\kvecb$ as a linear combination.`;
    else if (b) h += `; $\\kvecb = ${ptT(b)}$ is not reached yet.`;
    else h += '.';
    headline(ctx, h);
    const note = b ? (onB ? `$c\\kvecv + d\\kvecw = \\kvecb$` : `$\\kvecb = ${colOf(b)}$, and $c\\kvecv + d\\kvecw - \\kvecb = ${colOf([r2(s[0] - b[0]), r2(s[1] - b[1])])}$`) : '';
    ro.set(`c\\kvecv + d\\kvecw = ${par(c)}${colOf(V)} + ${par(k)}${colOf(W)} = ${col(`${par(c)}(2) + ${par(k)}(1)`, `${par(c)}(1) + ${par(k)}(2)`)} = ${colOf(s)}`, note);
  }
  still(d, draw);
})();

/* Figure 2.1.14: two vectors on one line. v = [−1, 1] with a draggable head and w = −2v following it; the line
   through them in the region colour; sliders c and d, and the combination cv + dw, which never leaves the line,
   drawn as its walk; b = [3, 0] of Example 2.1.13 as a hollow point off the line. Defaults c = 1, d = 0, so the
   book's picture (v and w on their line) is the load state. x and y from −4 to 4 at 90 units to 1. Still. */
(function () {
  const d = sim('sim-vectors-on-a-line', 840);
  const BOX = { l: 340, r: 1060, t: 100, b: 820 }, XR = [-4, 4], YR = [-4, 4], B = [3, 0];
  const v1 = comp(d, 'v_1', 'v1', -1, 'the first component of v', -3, 3), v2 = comp(d, 'v_2', 'v2', 1, 'the second component of v', -3, 3);
  const cs = ctl(d.controls, { label: 'c', cls: '', key: 'c', min: -3, max: 3, step: 0.1, value: 1, unit: '', dec: 1, aria: 'the weight c of v' });
  const ds = ctl(d.controls, { label: 'd', cls: '', key: 'd', min: -3, max: 3, step: 0.1, value: 0, unit: '', dec: 1, aria: 'the weight d of w' });
  const P = drag(d, { x: v1, y: v2 });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  function draw() {
    const { ctx } = begin(d.c);
    const vc = C('vector'), rc = C('region'), ink = PAL.ink;
    const g = ease.smooth(arrival(d));
    const v = [r1(v1.v), r1(v2.v)], w = mul(-2, v), c = r1(cs.v), k = r1(ds.v), cv = mul(c, v), dw = mul(k, w);
    const s = [r2(cv[0] + dw[0]), r2(cv[1] + dw[1])], e = r2(c - 2 * k);
    hits = [];
    const ax = plane(ctx, BOX, XR, YR);
    const S = (p) => mul(g, p);
    ctx.save(); ctx.globalAlpha *= g; across(ctx, ax, [0, 0], v, alpha(rc, 0.75), 3.5); ctx.restore();
    /* the walk, the combination, then v and w */
    vec(ctx, ax, [0, 0], S(cv), vc, 3, [10, 9], 0.5);
    vec(ctx, ax, S(cv), S(s), vc, 3, [10, 9], 0.5);
    if (!(c === 1 && k === 0)) vec(ctx, ax, [0, 0], S(s), vc, 5);
    vec(ctx, ax, [0, 0], S(v), vc, 5);
    vec(ctx, ax, [0, 0], S(w), vc, 5);
    dot(ctx, ax.X(0), ax.Y(0), ink, true, 5);
    dot(ctx, ax.X(B[0]), ax.Y(B[1]), vc, false, 8);
    P.draw(ctx, ax, clear(vc)); ring(ctx, ax, v, vc);
    if (g > 0.99) {
      past(ctx, ax, [0, 0], v, '$\\kvecv$', vc, 28);
      past(ctx, ax, [0, 0], w, '$\\kvecw$', vc, 28);
      tag(ctx, '$\\kvecb$', ax.X(B[0]) + 4, ax.Y(B[1]) - 28, vc, 'center');
      const side = [v[1], -v[0]];
      if (!(c === 1 && k === 0) && !(s[0] === 0 && s[1] === 0)) beside(ctx, ax, [0, 0], s, side, `$c\\kvecv + d\\kvecw$`, vc);
      if (s[0] === 0 && s[1] === 0) tag(ctx, '$c\\kvecv + d\\kvecw = \\begin{bmatrix} 0 \\\\ 0 \\end{bmatrix}$', ax.X(0) + 22, ax.Y(0) + 30, vc, 'left');
    }
    hits.push({ x: ax.X(v[0]), y: ax.Y(v[1]), r: 20, name: `v = ${pt(v)}; drag its head, and w = −2v follows` });
    hits.push({ x: ax.X(w[0]), y: ax.Y(w[1]), r: 18, name: `w = −2v = ${pt(w)}` });
    hits.push({ x: ax.X(s[0]), y: ax.Y(s[1]), r: 16, name: `cv + dw = ${pt(s)}, on the line` });
    hits.push({ x: ax.X(B[0]), y: ax.Y(B[1]), r: 16, name: 'b = (3, 0): off the line, so no weights reach it' });
    const far = mul(3.5 / (Math.hypot(v[0], v[1]) || 1), v);
    hits.push({ x: ax.X(far[0]), y: ax.Y(far[1]), r: 16, name: 'the line through v and w: every linear combination of v and w has its tip on it' });
    headline(ctx, `$c\\kvecv + d\\kvecw = ${par(c)}\\kvecv + ${par(k)}\\kvecw = ${ptT(s)}$: since $\\kvecw = -2\\kvecv$, every combination is $(c - 2d)\\kvecv = ${par(e)}\\kvecv$ and lies on the line; $\\kvecb = (3, 0)$ is off it.`);
    ro.set(`c\\kvecv + d\\kvecw = ${par(c)}${colOf(v)} + ${par(k)}${colOf(w)} = ${colOf(s)}`, `$\\kvecw = -2\\kvecv$, so $c\\kvecv + d\\kvecw = (c - 2d)\\kvecv = ${par(e)}\\kvecv$`);
  }
  still(d, draw);
})();
};
