/* Figures for section 6.1 The dot product. */
window.OMNISTAX_FIGURES = window.OMNISTAX_FIGURES || {};
window.OMNISTAX_FIGURES['6.1'] = function (root, F) {
const { C, PAL, alpha, ctl, choice, select, begin, axes, drag, line, arrow, dot, text, headline, register, readout, hover, arrival, ease, pinned, fmt, cycle, angleArc, mixColor } = F;
const sim = (id, H) => F.sim(root, id, H);
const still = (d, draw) => register(d.fig, { update: () => {}, draw });
/* a number as the readout writes it: at most two decimals, no trailing zeros, never −0 */
const r1 = (v) => { const r = Math.round(v * 10) / 10; return Object.is(r, -0) ? 0 : r; };
const r2 = (v) => { const r = Math.round(v * 100) / 100; return Object.is(r, -0) ? 0 : r; };
const r3 = (v) => { const r = Math.round(v * 1000) / 1000; return Object.is(r, -0) ? 0 : r; };
const num = (v) => String(r2(v));
const numT = (v) => num(v).replace('-', '−');
const f2 = (v) => fmt(r2(v), 2), f3 = (v) => fmt(r3(v), 3);
const par = (v) => (r2(v) < 0 ? `(${num(v)})` : num(v));
const ptT = (v) => `(${num(v[0])}, ${num(v[1])})`;
const pt = (v) => `(${numT(v[0])}, ${numT(v[1])})`;
const deg = (a) => (a * 180) / Math.PI;
const dotp = (a, b) => a[0] * b[0] + a[1] * b[1];
const len = (a) => Math.hypot(a[0], a[1]);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (k, a) => [k * a[0], k * a[1]];
const inBox = (box, x, y) => x >= box.l && x <= box.r && y >= box.t && y <= box.b;
const tag = (ctx, s, x, y, color, align = 'center', size = 22) => text(ctx, s, x, y, color, { size, weight: 600, tex: true, bg: PAL.panel, align });
/* a square root as the readout writes it: √13, or the whole number where v·v is a square */
const sqrtT = (q) => { const r = Math.round(Math.sqrt(q)); return Math.abs(r * r - q) < 1e-9 ? String(r) : `\\sqrt{${num(q)}}`; };
/* the angle between a and b, in degrees, one decimal */
const angle = (a, b) => r1(deg(Math.acos(Math.max(-1, Math.min(1, dotp(a, b) / (len(a) * len(b)))))));

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
/* a label beside the middle of the arrow t → h, on the side away from the point `away` (in the plane) */
function beside(ctx, ax, t, h, away, s, color, at = 0.5) {
  const { X, Y, box } = ax;
  const x1 = X(t[0]), y1 = Y(t[1]), x2 = X(h[0]), y2 = Y(h[1]);
  const mx = x1 + (x2 - x1) * at, my = y1 + (y2 - y1) * at, L = Math.hypot(x2 - x1, y2 - y1) || 1;
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
/* a right-angle mark at the canvas point (x, y) between the unit directions a and b (canvas) */
function square(ctx, x, y, a, b, s = 14) {
  ctx.save(); ctx.strokeStyle = alpha(PAL.ink, 0.6); ctx.lineWidth = 2; ctx.beginPath();
  ctx.moveTo(x + a[0] * s, y + a[1] * s); ctx.lineTo(x + (a[0] + b[0]) * s, y + (a[1] + b[1]) * s); ctx.lineTo(x + b[0] * s, y + b[1] * s); ctx.stroke(); ctx.restore();
}
/* the plane: a faint unit grid under the axes, then the axes with integer ticks */
function plane(ctx, BOX, xr, yr) {
  const U = (BOX.r - BOX.l) / (xr[1] - xr[0]), ink = PAL.ink;
  ctx.save(); ctx.beginPath(); ctx.rect(BOX.l, BOX.t, BOX.r - BOX.l, BOX.b - BOX.t); ctx.clip();
  for (let i = xr[0]; i <= xr[1]; i++) line(ctx, BOX.l + (i - xr[0]) * U, BOX.t, BOX.l + (i - xr[0]) * U, BOX.b, alpha(ink, 0.06), 1.5);
  for (let j = yr[0]; j <= yr[1]; j++) line(ctx, BOX.l, BOX.b - (j - yr[0]) * U, BOX.r, BOX.b - (j - yr[0]) * U, alpha(ink, 0.06), 1.5);
  ctx.restore();
  return axes(ctx, BOX, xr, yr, { xl: 'x', yl: 'y', nx: xr[1] - xr[0], ny: yr[1] - yr[0], fx: (q) => fmt(q, 0), fy: (q) => fmt(q, 0) });
}
const comp = (d, label, key, value, aria, o = {}) => ctl(d.controls, { label, cls: '', key, min: -4, max: 4, step: 0.1, value, unit: '', dec: 1, aria, ...o });
/* the window of the vector figures: x and y from −5 to 5 at 72 units to 1 (the book's −1 to 4 inside) */
const VBOX = { l: 340, r: 1060, t: 100, b: 820 }, VR = [-5, 5];
/* the angle θ between v and w marked at the origin: an arc from the direction of v to that of w, θ beside it */
function theta(ctx, ax, v, w, color = PAL.ink, r = 46, name = '$\\theta$') {
  if (len(v) < 1e-9 || len(w) < 1e-9) return;
  const a = Math.atan2(v[1], v[0]), cr = v[0] * w[1] - v[1] * w[0], th = Math.acos(Math.max(-1, Math.min(1, dotp(v, w) / (len(v) * len(w)))));
  if (th < 0.02) return;
  const a0 = cr >= 0 ? a : a - th, a1 = a0 + th, o = { x: ax.X(0), y: ax.Y(0) };
  angleArc(ctx, o, r, a0, a1, '', null, color);
  const m = (a0 + a1) / 2;
  tag(ctx, name, o.x + (r + 22) * Math.cos(m), o.y - (r + 22) * Math.sin(m), color, 'center', 21);
}

/* Figure 6.1.4: the length of a vector. v = [3, 2] with a draggable head; the horizontal and vertical legs of the right
   triangle it closes, in ink, labelled with their lengths; |v| beside the hypotenuse. The readout writes Pythagoras, the
   note v·v = |v|². x and y from −5 to 5 at 72 units to 1. Still. */
(function () {
  const d = sim('sim-vector-length', 860);
  const v1 = comp(d, 'v_1', 'v1', 3, 'the first component of v'), v2 = comp(d, 'v_2', 'v2', 2, 'the second component of v');
  const P = drag(d, { x: v1, y: v2 });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  function draw() {
    const { ctx } = begin(d.c);
    const vc = C('vector'), ink = PAL.ink;
    const g = ease.smooth(arrival(d));
    const v = [r1(v1.v), r1(v2.v)], vv = r2(v[0] * v[0] + v[1] * v[1]), L = Math.sqrt(vv);
    hits = [];
    const ax = plane(ctx, VBOX, VR, VR);
    const { X, Y } = ax, foot = [v[0], 0];
    if (g > 0.99 && Math.abs(v[0]) > 0.05 && Math.abs(v[1]) > 0.05) {
      line(ctx, X(0), Y(0), X(v[0]), Y(0), ink, 3);
      line(ctx, X(v[0]), Y(0), X(v[0]), Y(v[1]), ink, 3);
      square(ctx, X(v[0]), Y(0), [-Math.sign(v[0]), 0], [0, -Math.sign(v[1])]);
      text(ctx, num(Math.abs(v[0])), X(v[0] / 2), Y(0) + (v[1] > 0 ? 26 : -26), ink, { size: 22, weight: 600, align: 'center', bg: PAL.panel });
      text(ctx, num(Math.abs(v[1])), X(v[0]) + (v[0] > 0 ? 14 : -14), Y(v[1] / 2), ink, { size: 22, weight: 600, align: v[0] > 0 ? 'left' : 'right', bg: PAL.panel });
      hits.push({ x: X(v[0] / 2), y: Y(0), r: 16, name: `the horizontal leg, of length ${numT(Math.abs(v[0]))}` });
      hits.push({ x: X(v[0]), y: Y(v[1] / 2), r: 16, name: `the vertical leg, of length ${numT(Math.abs(v[1]))}` });
    }
    vec(ctx, ax, [0, 0], mul(g, v), vc, 5);
    dot(ctx, X(0), Y(0), ink, true, 5);
    P.draw(ctx, ax, clear(vc)); ring(ctx, ax, v, vc);
    if (g > 0.99 && L > 0.3) {
      past(ctx, ax, [0, 0], v, '$\\kvecv$', vc, 28);
      beside(ctx, ax, [0, 0], v, foot, '$\\left|\\kvecv\\right|$', vc);
    }
    hits.push({ x: X(v[0]), y: Y(v[1]), r: 20, name: `v = ${pt(v)}; drag its head` });
    hits.push({ x: X(v[0] / 2), y: Y(v[1] / 2), r: 14, name: `the hypotenuse: |v| = ${L ? numT(L) : '0'}` });
    const sq = `${par(v[0])}^2 + ${par(v[1])}^2`;
    if (vv === 0) headline(ctx, '$\\kvecv = (0, 0)$: the zero vector has length $0$, and $\\kvecv\\cdot\\kvecv = 0$.');
    else headline(ctx, `$\\kvecv = ${ptT(v)}$: legs of ${num(Math.abs(v[0]))} and ${num(Math.abs(v[1]))}, so $\\left|\\kvecv\\right| = ${sqrtT(vv)}${sqrtT(vv).startsWith('\\') ? ` \\approx ${f2(L)}` : ''}$, and $\\kvecv\\cdot\\kvecv = ${num(vv)} = \\left|\\kvecv\\right|^2$.`);
    ro.set(`\\left|\\kvecv\\right| = \\sqrt{${sq}} = ${sqrtT(vv)}`, `$\\kvecv\\cdot\\kvecv = ${par(v[0])}(${num(v[0])}) + ${par(v[1])}(${num(v[1])}) = ${num(vv)} = \\left|\\kvecv\\right|^2$`);
  }
  still(d, draw);
})();

/* Figure 6.1.5: the dot product measures the angle. v = [3, 1] and w = [2, 3.5] with draggable heads; w − v from the tip
   of v to the tip of w closes the triangle the Law of Cosines reads, θ marked at the origin. The readout keeps v·w equal
   to |v||w| cos θ; the note writes the Law of Cosines in numbers. x and y from −5 to 5 at 72 units to 1. Still. */
(function () {
  const d = sim('sim-dot-product-angle', 860);
  const v1 = comp(d, 'v_1', 'v1', 3, 'the first component of v'), v2 = comp(d, 'v_2', 'v2', 1, 'the second component of v');
  const w1 = comp(d, 'w_1', 'w1', 2, 'the first component of w'), w2 = comp(d, 'w_2', 'w2', 3.5, 'the second component of w');
  const PV = drag(d, { x: v1, y: v2 }), PW = drag(d, { x: w1, y: w2 });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  function draw() {
    const { ctx } = begin(d.c);
    const vc = C('vector'), ink = PAL.ink;
    const g = ease.smooth(arrival(d));
    const v = [r1(v1.v), r1(v2.v)], w = [r1(w1.v), r1(w2.v)];
    const vw = r2(dotp(v, w)), vv = r2(dotp(v, v)), ww = r2(dotp(w, w)), dd = r2(dotp(sub(w, v), sub(w, v)));
    hits = [];
    const ax = plane(ctx, VBOX, VR, VR), { X, Y } = ax;
    vec(ctx, ax, mul(g, v), mul(g, w), vc, 3.5, null, g);
    vec(ctx, ax, [0, 0], mul(g, v), vc, 5);
    vec(ctx, ax, [0, 0], mul(g, w), vc, 5);
    dot(ctx, X(0), Y(0), ink, true, 5);
    PV.draw(ctx, ax, clear(vc)); ring(ctx, ax, v, vc);
    PW.draw(ctx, ax, clear(vc)); ring(ctx, ax, w, vc);
    const ok = vv > 0 && ww > 0, th = ok ? angle(v, w) : null;
    if (g > 0.99) {
      if (ok) theta(ctx, ax, v, w);
      const cen = mul(1 / 3, [v[0] + w[0], v[1] + w[1]]);
      if (vv > 0.1) beside(ctx, ax, [0, 0], v, w, '$\\kvecv$', vc, 0.62);
      if (ww > 0.1) beside(ctx, ax, [0, 0], w, v, '$\\kvecw$', vc, 0.62);
      if (dd > 0.1) beside(ctx, ax, v, w, cen, '$\\kvecw - \\kvecv$', vc, 0.35);
    }
    hits.push({ x: X(v[0]), y: Y(v[1]), r: 20, name: `v = ${pt(v)}; drag its head` });
    hits.push({ x: X(w[0]), y: Y(w[1]), r: 20, name: `w = ${pt(w)}; drag its head` });
    hits.push({ x: X((v[0] + w[0]) / 2), y: Y((v[1] + w[1]) / 2), r: 14, name: `w − v = ${pt(sub(w, v))}, the third side of the triangle` });
    if (ok) hits.push({ x: X(0) + 40, y: Y(0) - 20, r: 26, name: `θ = ${th}°, the angle between v and w` });
    const kind = !ok ? '' : vw > 0 ? (th < 0.05 ? 'they point the same way' : 'the angle is acute') : vw < 0 ? (th > 179.95 ? 'they point in opposite directions' : 'the angle is obtuse') : 'the angle is a right angle';
    if (!ok) headline(ctx, `$\\kvecv\\cdot\\kvecw = ${num(vw)}$: with a zero vector there is no angle to measure.`);
    else headline(ctx, `$\\theta = ${th}^\\circ$: $\\kvecv\\cdot\\kvecw = ${num(vw)}$ is ${vw > 0 ? 'positive' : vw < 0 ? 'negative' : 'zero'}, so ${kind}.`);
    ro.set(`\\kvecv\\cdot\\kvecw = ${par(v[0])}(${num(w[0])}) + ${par(v[1])}(${num(w[1])}) = ${num(vw)} = \\left|\\kvecv\\right|\\left|\\kvecw\\right|\\cos\\theta = ${sqrtT(vv)}\\,${sqrtT(ww)}\\,\\cos\\theta`,
      `${ok ? `$\\theta = ${th}^\\circ$; ` : ''}$\\left|\\kvecw-\\kvecv\\right|^2 = ${num(dd)} = ${num(vv)} + ${num(ww)} - 2(${num(vw)})$`);
  }
  still(d, draw);
})();

/* Sim (3Blue1Brown survivor 8): the dot product as a length times a length. v = [3, 1] and w = [2, 3.5] with draggable
   heads; the line through v a dashed guide; the perpendicular dropped from the tip of w to it, with its right-angle mark;
   the signed length |w| cos θ of its foot along v a thick ink bar from the origin. v·w is that signed length times |v|:
   positive when the foot falls on v's side of the origin, zero at the origin, negative behind it. A choice of case
   (similar, perpendicular, opposing) sets w from v and follows the sign of v·w; specials on w₁ and w₂ where v·w = 0.
   x and y from −5 to 5 at 72 units to 1. Still. */
(function () {
  const d = sim('sim-dot-product-shadow', 860);
  const CASES = [{ value: 'similar', label: 'similar' }, { value: 'perpendicular', label: 'perpendicular' }, { value: 'opposing', label: 'opposing' }];
  let cs, w1, w2;
  const caseOf = () => { const s = r2(r1(v1.v) * r1(w1.v) + r1(v2.v) * r1(w2.v)); return s > 0 ? 'similar' : s < 0 ? 'opposing' : 'perpendicular'; };
  const follow = () => { if (cs && cs.value !== caseOf()) cs.set(caseOf()); };
  const v1 = comp(d, 'v_1', 'v1', 3, 'the first component of v', { onInput: follow }), v2 = comp(d, 'v_2', 'v2', 1, 'the second component of v', { onInput: follow });
  const zeroAt = (i) => () => { const v = [r1(v1.v), r1(v2.v)], w = [r1(w1.v), r1(w2.v)], j = 1 - i; if (Math.abs(v[i]) < 1e-9) return null; const x = r1(-v[j] * w[j] / v[i]); return Math.abs(x) <= 4 ? x : null; };
  w1 = comp(d, 'w_1', 'w1', 2, 'the first component of w', { onInput: follow, specials: [{ at: zeroAt(0), label: 'perpendicular to v' }] });
  w2 = comp(d, 'w_2', 'w2', 3.5, 'the second component of w', { onInput: follow, specials: [{ at: zeroAt(1), label: 'perpendicular to v' }] });
  const clamp4 = (x) => Math.max(-4, Math.min(4, r1(x)));
  cs = choice(d.controls, { label: '\\text{case}', key: 'case', value: 'similar', options: CASES, onInput: (c) => {
    const v = [r1(v1.v), r1(v2.v)], n = [-v[1], v[0]];
    const to = c === 'similar' ? [v[0] + 0.5 * n[0], v[1] + 0.5 * n[1]] : c === 'perpendicular' ? n : [-v[0] + 0.5 * n[0], -v[1] + 0.5 * n[1]];
    w1.drive(clamp4(to[0])); w2.drive(clamp4(to[1]));
  } });
  const PV = drag(d, { x: v1, y: v2 }), PW = drag(d, { x: w1, y: w2 });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  function draw() {
    const { ctx } = begin(d.c);
    const vc = C('vector'), ink = PAL.ink;
    const g = ease.smooth(arrival(d));
    const v = [r1(v1.v), r1(v2.v)], w = [r1(w1.v), r1(w2.v)], vw = r2(dotp(v, w)), Lv = len(v), Lw = len(w);
    hits = [];
    const ax = plane(ctx, VBOX, VR, VR), { X, Y } = ax;
    const ok = Lv > 1e-9;
    const s = ok ? dotp(v, w) / Lv : 0, u = ok ? [v[0] / Lv, v[1] / Lv] : [1, 0], foot = mul(s, u);
    if (ok) {
      ctx.save(); ctx.globalAlpha *= g; across(ctx, ax, [0, 0], v, alpha(ink, 0.35), 2, [10, 10]); ctx.restore();
      if (g > 0.99) {
        /* the perpendicular from the tip of w to the line, and its right-angle mark */
        if (len(sub(w, foot)) > 0.08) {
          line(ctx, X(w[0]), Y(w[1]), X(foot[0]), Y(foot[1]), alpha(ink, 0.6), 2.5, [4, 8]);
          const p = sub(w, foot), lp = len(p), cu = [u[0], -u[1]], cp = [p[0] / lp, -p[1] / lp];
          if (Math.abs(s) > 0.15) square(ctx, X(foot[0]), Y(foot[1]), s > 0 ? [-cu[0], -cu[1]] : cu, cp);
          else square(ctx, X(foot[0]), Y(foot[1]), cu, cp);
        }
        /* the signed length of the foot along v */
        if (Math.abs(s) > 0.02) {
          ctx.save(); ctx.lineCap = 'butt'; line(ctx, X(0), Y(0), X(foot[0]), Y(foot[1]), alpha(ink, s > 0 ? 0.28 : 0.18), 14, s > 0 ? null : [8, 6]); ctx.restore();
        }
        dot(ctx, X(foot[0]), Y(foot[1]), ink, true, 6);
      }
    }
    vec(ctx, ax, [0, 0], mul(g, v), vc, 5);
    vec(ctx, ax, [0, 0], mul(g, w), vc, 5);
    dot(ctx, X(0), Y(0), ink, true, 5);
    PV.draw(ctx, ax, clear(vc)); ring(ctx, ax, v, vc);
    PW.draw(ctx, ax, clear(vc)); ring(ctx, ax, w, vc);
    if (g > 0.99) {
      if (Lv > 0.3) past(ctx, ax, [0, 0], v, '$\\kvecv$', vc, 28);
      if (Lw > 0.3) past(ctx, ax, [0, 0], w, '$\\kvecw$', vc, 28);
      if (ok && Math.abs(s) > 0.02) {
        /* the bar's length on a panel on the far side of the line from w */
        const side = dotp([-u[1], u[0]], w) > 0 ? -1 : 1, nrm = [-u[1] * side, u[0] * side], mid = mul(0.5, foot);
        const lx = Math.min(Math.max(X(mid[0]) + nrm[0] * 56, VBOX.l + 90), VBOX.r - 90), ly = Math.min(Math.max(Y(mid[1]) - nrm[1] * 56, VBOX.t + 20), VBOX.b - 20);
        tag(ctx, `$\\left|\\kvecw\\right|\\cos\\theta = ${f2(s)}$`, lx, ly, ink, 'center', 20);
      }
    }
    hits.push({ x: X(v[0]), y: Y(v[1]), r: 20, name: `v = ${pt(v)}; drag its head` });
    hits.push({ x: X(w[0]), y: Y(w[1]), r: 20, name: `w = ${pt(w)}; drag its head` });
    if (ok) {
      hits.push({ x: X(foot[0]), y: Y(foot[1]), r: 14, name: `the foot of the perpendicular from w: ${f2(s).replace('-', '−')} along the direction of v` });
      hits.push({ x: X(-3.6 * u[0]), y: Y(-3.6 * u[1]), r: 16, name: 'the line through v' });
      hits.push({ x: X((w[0] + foot[0]) / 2), y: Y((w[1] + foot[1]) / 2), r: 12, name: 'the perpendicular dropped from the tip of w to the line through v' });
    }
    const where = vw > 0 ? 'on the side of $\\kvecv$, so the product is positive' : vw < 0 ? 'behind the origin, so the product is negative' : 'at the origin, so the product is zero';
    if (!ok) headline(ctx, '$\\kvecv$ is the zero vector: there is no line to drop onto, and $\\kvecv\\cdot\\kvecw = 0$.');
    else headline(ctx, `The foot of $\\kvecw$ lands ${where}: $\\kvecv\\cdot\\kvecw = \\left|\\kvecv\\right|\\left(\\left|\\kvecw\\right|\\cos\\theta\\right) = ${num(vw)}$.`);
    if (ok) ro.set(`\\kvecv\\cdot\\kvecw = \\left|\\kvecv\\right|\\left(\\left|\\kvecw\\right|\\cos\\theta\\right) = (${f2(Lv)})(${f2(s)}) \\approx ${num(vw)}`,
      Lw > 1e-9 ? `$\\theta = ${angle(v, w)}^\\circ$, $\\left|\\kvecw\\right| = ${f2(Lw)}$` : '$\\kvecw$ is the zero vector');
    else ro.set(`\\kvecv\\cdot\\kvecw = 0`, '$\\kvecv = \\kveczero$');
  }
  still(d, draw);
})();

/* Figure 6.1.8: which vectors are most similar? v = [3, 1] fixed, w = [3, 2] and u = [−2, 3] draggable; the angle of the
   most similar pair (the smallest) is marked with its arc; all three angles are in the note. x and y from −5 to 5 at
   72 units to 1. Still. */
(function () {
  const d = sim('sim-similar-vectors', 860);
  const V = [3, 1];
  const w1 = comp(d, 'w_1', 'w1', 3, 'the first component of w'), w2 = comp(d, 'w_2', 'w2', 2, 'the second component of w');
  const u1 = comp(d, 'u_1', 'u1', -2, 'the first component of u'), u2 = comp(d, 'u_2', 'u2', 3, 'the second component of u');
  const PW = drag(d, { x: w1, y: w2 }), PU = drag(d, { x: u1, y: u2 });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  const NAME = { v: '\\kvecv', w: '\\kvecw', u: '\\kvecu' };
  function draw() {
    const { ctx } = begin(d.c);
    const vc = C('vector'), ink = PAL.ink;
    const g = ease.smooth(arrival(d));
    const w = [r1(w1.v), r1(w2.v)], u = [r1(u1.v), r1(u2.v)], P = { v: V, w, u };
    hits = [];
    const ax = plane(ctx, VBOX, VR, VR), { X, Y } = ax;
    const pairs = [['v', 'w'], ['v', 'u'], ['w', 'u']].filter(([a, b]) => len(P[a]) > 1e-9 && len(P[b]) > 1e-9).map(([a, b]) => ({ a, b, th: angle(P[a], P[b]), dp: r2(dotp(P[a], P[b])) }));
    const best = pairs.slice().sort((p, q) => p.th - q.th)[0];
    if (g > 0.99 && best) theta(ctx, ax, P[best.a], P[best.b], ink, 52);
    ['u', 'w', 'v'].forEach((k) => vec(ctx, ax, [0, 0], mul(g, P[k]), vc, 5));
    dot(ctx, X(0), Y(0), ink, true, 5);
    PW.draw(ctx, ax, clear(vc)); ring(ctx, ax, w, vc);
    PU.draw(ctx, ax, clear(vc)); ring(ctx, ax, u, vc);
    if (g > 0.99) ['v', 'w', 'u'].forEach((k) => { if (len(P[k]) > 0.3) past(ctx, ax, [0, 0], P[k], `$${NAME[k]}$`, vc, 28); });
    hits.push({ x: X(V[0]), y: Y(V[1]), r: 18, name: 'v = (3, 1)' });
    hits.push({ x: X(w[0]), y: Y(w[1]), r: 20, name: `w = ${pt(w)}; drag its head` });
    hits.push({ x: X(u[0]), y: Y(u[1]), r: 20, name: `u = ${pt(u)}; drag its head` });
    const nm = (p) => `$${NAME[p.a]}$ and $${NAME[p.b]}$`;
    if (!best) headline(ctx, 'With zero vectors there are no angles to compare.');
    else headline(ctx, `${nm(best)} are the most similar: the angle between them is $${best.th}^\\circ$.`);
    if (best) {
      const A = P[best.a], B = P[best.b];
      ro.set(`\\cos\\theta = \\frac{${NAME[best.a]}\\cdot${NAME[best.b]}}{\\left|${NAME[best.a]}\\right|\\left|${NAME[best.b]}\\right|} = \\frac{${num(best.dp)}}{${sqrtT(r2(dotp(A, A)))}\\,${sqrtT(r2(dotp(B, B)))}}, \\quad \\theta = ${best.th}^\\circ`,
        pairs.map((p) => `$${NAME[p.a]}$ and $${NAME[p.b]}$: $${p.th}^\\circ$`).join(' · '));
    } else ro.set('\\theta \\text{ undefined}', '');
  }
  still(d, draw);
})();

/* Figure 6.1.9: two time series and their correlation. t₁ is the book's series of eleven values; t₂ = a t₁ + b + e r, the
   book's a = 0.5 (left) and −0.5 (right) as detents, b a shift, e the amount of a fixed second pattern r. Each series'
   average is a dashed level in its colour; the readout is corr(t₁, t₂) = t̃₁·t̃₂ / |t̃₁||t̃₂|, the cosine of the angle
   between the demeaned series. k from 0 to 10, values from −3 to 3. Still: the series are values, not motion. The
   two series are the referents series-1 and series-2. */
(function () {
  const d = sim('sim-correlation-series', 640);
  const T1 = [0.287, 0.764, 0.858, 1.023, 1.160, 0.819, 0.342, -0.258, -0.575, -0.795, -0.785];
  const R = [0.5, -0.45, 0.55, -0.4, 0.35, -0.6, 0.45, -0.35, 0.5, -0.4, 0.3];
  const BOX = { l: 130, r: 1210, t: 110, b: 560 }, XR = [0, 10], YR = [-3, 3];
  const a = ctl(d.controls, { label: 'a', cls: '', key: 'a', min: -1, max: 1, step: 0.05, value: 0.5, unit: '', dec: 2, aria: 'the multiple a of the first series in the second', detents: [-0.5, 0.5], snap: false, specials: [{ at: 0, label: 'no multiple of the first series' }] });
  const b = ctl(d.controls, { label: 'b', cls: '', key: 'b', min: -1, max: 1, step: 0.05, value: 0, unit: '', dec: 2, aria: 'the shift b added to the second series' });
  const e = ctl(d.controls, { label: 'e', cls: '', key: 'e', min: 0, max: 1, step: 0.05, value: 0, unit: '', dec: 2, aria: 'the amount e of a second pattern mixed into the second series' });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
  function draw() {
    const { ctx } = begin(d.c);
    const ink = PAL.ink, c1 = F.ref('series-1'), c2 = F.ref('series-2');
    const g = ease.smooth(arrival(d));
    const A = r2(a.v), B = r2(b.v), E = r2(e.v);
    const t2 = T1.map((x, i) => A * x + B + E * R[i]);
    const m1 = mean(T1), m2 = mean(t2), d1 = T1.map((x) => x - m1), d2 = t2.map((x) => x - m2);
    const dp = d1.reduce((s, x, i) => s + x * d2[i], 0), n1 = Math.sqrt(d1.reduce((s, x) => s + x * x, 0)), n2 = Math.sqrt(d2.reduce((s, x) => s + x * x, 0));
    hits = [];
    const ax = axes(ctx, BOX, XR, YR, { xl: 'time', yl: 'value', nx: 10, ny: 6, fx: (q) => fmt(q, 0), fy: (q) => fmt(q, 0) });
    const { X, Y } = ax;
    const series = (ys, m, color, key, nameT) => {
      const n = Math.max(1, Math.round(g * (ys.length - 1)));
      ctx.save(); ctx.beginPath(); ctx.rect(BOX.l, BOX.t, BOX.r - BOX.l, BOX.b - BOX.t); ctx.clip();
      line(ctx, X(0), Y(m), X(10), Y(m), alpha(color, 0.7), 2.5, [10, 10]);
      for (let i = 0; i < n; i++) line(ctx, X(i), Y(ys[i]), X(i + 1), Y(ys[i + 1]), color, 4);
      ctx.restore();
      ys.forEach((y, i) => { if (i <= n) { const yy = Math.max(-3, Math.min(3, y)); dot(ctx, X(i), Y(yy), color, Math.abs(y) <= 3, 6); } });
      if (g > 0.99) {
        const yl = Math.max(BOX.t + 14, Math.min(BOX.b - 14, Y(ys[10])));
        tag(ctx, `$${key}$`, X(10) + 22, yl, color, 'left');
      }
      hits.push({ x: X(5), y: Y(m), r: 14, name: `the average of ${nameT}: ${numT(m)}` });
      ys.forEach((y, i) => hits.push({ x: X(i), y: Y(Math.max(-3, Math.min(3, y))), r: 9, name: `${nameT} at time ${i}: ${numT(y)}, ${y >= m ? numT(y - m) + ' above' : numT(m - y) + ' below'} its average` }));
    };
    series(T1, m1, c1, '\\kvectone', 't₁');
    series(t2, m2, c2, '\\kvecttwo', 't₂');
    const defined = n2 > 1e-9;
    const corr = defined ? dp / (n1 * n2) : null, th = defined ? r1(deg(Math.acos(Math.max(-1, Math.min(1, corr))))) : null;
    const c2s = defined ? f2(corr) : '';
    let h;
    if (!defined) h = 'The second series is constant: its demeaned series is $\\kveczero$, and the correlation is not defined.';
    else if (E === 0) h = `$\\text{corr}(\\kvectone, \\kvecttwo) = ${A > 0 ? 1 : -1}$: the demeaned series are ${A > 0 ? 'positive' : 'negative'} multiples of each other, at an angle of $${A > 0 ? 0 : 180}^\\circ$${B !== 0 ? ', whatever the shift' : ''}.`;
    else h = `$\\text{corr}(\\kvectone, \\kvecttwo) = ${c2s}$: the demeaned series meet at an angle of $${th}^\\circ$.`;
    headline(ctx, h);
    if (defined) ro.set(`\\text{corr}(\\kvectone, \\kvecttwo) = \\frac{\\kvectonetilde\\cdot\\kvecttwotilde}{\\left|\\kvectonetilde\\right|\\left|\\kvecttwotilde\\right|} = \\frac{${f3(dp)}}{(${f3(n1)})(${f3(n2)})} \\approx ${c2s}`, `$\\cos\\theta = ${c2s}$, $\\theta = ${th}^\\circ$`);
    else ro.set(`\\left|\\kvecttwotilde\\right| = 0`, 'the correlation is not defined');
  }
  still(d, draw);
})();

/* ---------- k-means ---------- */
/* a seeded random number generator (mulberry32), so a start is the same start on every load */
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = (n, k, r) => { const s = []; while (s.length < k) { const i = Math.floor(r() * n); if (!s.includes(i)) s.push(i); } return s; };
/* k-means from the centres init (indices of points): the states the figure steps through. State 0 holds the chosen
   centres and no clusters; then each assignment and each move to the centroids is a state; the last state repeats the
   final clustering, the assignment that changed nothing. Ties go to the lower index. */
function kmeans(pts, init) {
  let c = init.map((i) => pts[i].slice()), a = null;
  const states = [{ c, a: null, kind: 'start' }];
  for (let it = 0; it < 80; it++) {
    const na = pts.map((p) => { let b = 0, bd = Infinity; c.forEach((q, j) => { const dd = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2; if (dd < bd - 1e-12) { bd = dd; b = j; } }); return b; });
    if (a && na.every((v, i) => v === a[i])) { states.push({ c, a, kind: 'done' }); break; }
    a = na; states.push({ c, a, kind: 'assign' });
    c = c.map((q, j) => { let sx = 0, sy = 0, n = 0; pts.forEach((p, i) => { if (a[i] === j) { sx += p[0]; sy += p[1]; n++; } }); return n ? [sx / n, sy / n] : q; });
    states.push({ c, a, kind: 'move' });
  }
  return states;
}
/* the clusters' centroids and the objective, the average squared distance of a point to its cluster's centroid */
function objective(pts, a, k) {
  const s = Array.from({ length: k }, () => [0, 0, 0]);
  pts.forEach((p, i) => { s[a[i]][0] += p[0]; s[a[i]][1] += p[1]; s[a[i]][2]++; });
  const cen = s.map(([x, y, n]) => (n ? [x / n, y / n] : null));
  let o = 0; pts.forEach((p, i) => { const q = cen[a[i]]; o += (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2; });
  return { o: o / pts.length, cen, n: s.map((x) => x[2]) };
}
const lerp2 = (p, q, k) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
const CL = (j) => F.ref(`cluster-${j + 1}`);

/* Figure 6.1.10: the data points of clusters_data.csv clustered by k-means. The scatter on the left at the book's window
   (x −4 to 7, y −2 to 6, 72.7 units to 1); k centres chosen from the data, the points coloured by the cluster of their
   nearest centre (cluster-1 … cluster-9), the centres moving to their clusters' centroids, until nothing changes. The
   step is the clock: a run over 4 to 9 s, a hold of 1.5 s; the transport scrubs it. Beside it the elbow plot: the
   smallest objective of ten seeded starts for each k from 2 to 9 (the book's answer figure: 3.90, 1.87, 1.09, 0.66,
   0.42, 0.32, 0.28, 0.24), the current run's objective marked at its k. Controls: k (2 to 9) and the start. */
(function () {
  const d = sim('sim-k-means-data', 720);
  const PTS = [[3.127,4.124],[1.962,4.706],[2.928,3.966],[2.826,4.508],[3.043,3.966],[2.94,4.126],[3.182,3.553],[3.448,3.59],[2.577,3.442],[3.288,4.028],[2.714,4.129],[3.383,3.692],[3.149,3.854],[3.009,3.87],[3.031,3.931],[2.992,4.065],[4.298,2.708],[2.819,3.991],[3.552,3.618],[3.312,3.799],[1.251,2.106],[1.001,1.981],[0.951,2.024],[1.686,1.79],[0.881,1.739],[-0.088,1.083],[0.624,1.472],[0.965,2.211],[0.647,2.293],[0.864,2.374],[-0.027,2.208],[1.203,1.173],[0.812,2.487],[-0.282,2.612],[0.666,2.246],[0.383,2.097],[1.801,0.654],[1.223,0.655],[1.451,1.795],[0.374,1.399],[0.882,1.876],[0.018,1.62],[1.113,1.724],[0.965,1.499],[0.343,2.51],[-1.823,-0.055],[-1.934,-0.172],[-2.534,1.21],[-2.05,0.033],[-1.927,-0.485],[-2.165,0.285],[-2.195,-0.334],[-2.004,0.008],[-2.08,-0.121],[-2.346,-0.783],[-1.546,-0.146],[-1.245,0.318],[-2.967,-0.285],[-2.226,-0.245],[-1.777,-0.164],[-2.009,0.02],[-1.246,0.362],[-1.631,0.093],[-2.034,-0.071],[-3.081,0.244],[-1.822,-0.189],[-1.953,-0.085],[-2.447,0.036],[-0.998,0.256],[-1.708,-0.04],[-1.896,0.036],[-1.67,-0.16],[-2.098,-0.104],[-1.963,0.313],[-2.206,-0.52],[4.078,0.07],[3.56,0.295],[5.664,-0.289],[3.8,0.346],[2.627,0.558],[4.41,0.091],[2.766,-0.173],[5.311,-0.149],[5.498,-1.254],[5.023,-0.002],[4.436,0.093],[3.446,-0.111],[3.797,-0.008],[3.992,-0.172],[3.864,0.178],[3.507,0.259],[4.252,-0.182],[3.445,1.062],[3.748,-0.136],[4.083,0.103],[4.298,-0.087],[3.753,0.181],[4.223,-0.081],[3.357,-0.288],[4.871,-0.704],[2.591,0.061],[4.594,-0.005],[4.059,-0.002],[3.743,0.144],[5.146,-0.715],[5.016,-0.741],[5.636,-0.693],[4.188,-0.169],[4.896,-0.206],[3.034,0.903],[3.596,0.769],[3.771,-0.073],[4.013,0.018],[2.98,0.073],[4.025,0.037],[0.214,4.142],[0.371,3.742],[0.585,4.698],[0.127,4.083],[-0.004,3.991],[-0.165,3.953],[0.334,4.217],[0.55,4.379],[-0.393,3.867],[-0.078,3.612],[-0.089,3.978],[0.511,4.079],[0.559,3.915],[0.026,4.106],[0.265,4.458],[0.731,4.511],[0.417,4.221],[-0.325,3.579],[0.682,4.334],[-0.002,4.007],[0.161,4.044],[0.319,4.336],[0.691,4.406],[-1.598,3.437],[0.239,4.154],[0.56,4.236],[-0.005,4.001],[-0.068,4.105],[0.905,4.209],[-0.463,4.004],[0.002,3.808],[0.453,4.25],[0.358,4.231],[-0.812,3.318],[-0.25,3.524],[3.435,2.179],[3.409,2.112],[2.803,1.437],[3.504,2.326],[3.474,1.936],[3.576,2.408],[3.799,1.742],[4.094,2.118],[3.648,1.807],[3.858,2.563],[3.453,2.177],[3.755,1.735],[3.302,1.938],[3.331,1.886],[3.647,2.631],[3.68,2.13],[3.516,1.949],[3.406,1.844],[3.458,1.46],[3.447,2.046],[3.728,1.916],[3.449,1.955],[3.22,1.893],[3.483,2.089],[2.762,1.776],[3.019,2.161],[3.206,2.238],[3.227,2.126]];
  const N = PTS.length, STARTS = 10, BASE = 153;
  const BOX = { l: 80, r: 880, t: 104, b: 686 }, XR = [-4, 7], YR = [-2, 6];
  const EB = { l: 1010, r: 1340, t: 190, b: 640 };
  /* every start of every k, run once: its states, its final objective; the smallest of each k for the elbow */
  const RUNS = {}, MIN = {}, BEST = {};
  for (let k = 2; k <= 9; k++) {
    RUNS[k] = Array.from({ length: STARTS }, (_, s) => { const st = kmeans(PTS, pick(N, k, rng(BASE * 1000 + k * 37 + s + 1))); return { st, o: objective(PTS, st[st.length - 1].a, k).o }; });
    BEST[k] = RUNS[k].reduce((b, r, i) => (r.o < RUNS[k][b].o - 1e-12 ? i : b), 0); MIN[k] = RUNS[k][BEST[k]].o;
  }
  const startOpts = (k) => Array.from({ length: STARTS }, (_, s) => ({ value: String(s + 1), label: s === BEST[k] ? `${s + 1} (smallest objective)` : String(s + 1) }));
  let run = null;
  const cy = cycle(() => (run ? run.st.length - 1 : 1), 1.5);
  const rebuild = () => { const k = Math.round(kS.v); st.options(startOpts(k)); run = RUNS[k][+st.value - 1]; cy.reset(); };
  const kS = ctl(d.controls, { label: 'k', cls: '', key: 'k', min: 2, max: 9, step: 1, value: 2, unit: '', dec: 0, aria: 'the number of clusters k', onInput: () => rebuild() });
  const st = select(d.controls, { label: '\\text{start}', key: 'start', value: '1', options: startOpts(2), aria: 'which of ten random choices of the first centres', onInput: () => { run = RUNS[Math.round(kS.v)][+st.value - 1]; cy.reset(); } });
  run = RUNS[2][0];
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  const dur = () => Math.max(4, Math.min(9, 0.45 * (run.st.length - 1)));
  const WORDS = { start: `the centres are chosen from the data`, assign: 'each point joins the cluster of its nearest centre', move: 'each centre moves to the centroid of its cluster', done: 'no point changes cluster, so this clustering is final' };
  function draw() {
    const { ctx } = begin(d.c);
    const ink = PAL.ink, pc = C('point');
    const g = ease.smooth(arrival(d));
    const k = Math.round(kS.v), S = run.st, T = S.length - 1, t = Math.min(cy.now(), T), i = Math.min(T, Math.floor(t + 1e-9)), j = Math.min(T, i + 1);
    const f = i === T ? 0 : ease.smooth(t - i), A = S[i], B = S[j];
    hits = [];
    const ax = axes(ctx, BOX, XR, YR, { xl: 'x', yl: 'y', nx: 11, ny: 8, fx: (q) => fmt(q, 0), fy: (q) => fmt(q, 0) });
    const { X, Y } = ax;
    /* the points, coloured by cluster; a change of cluster crossfades over the step */
    const colOf = (st, p) => (st.a ? CL(st.a[p]) : pc);
    const shown = Math.round(g * N);
    for (let p = 0; p < shown; p++) {
      const ca = colOf(A, p), cb = colOf(B, p), col = ca === cb ? ca : mixColor(ca, cb, f);
      dot(ctx, X(PTS[p][0]), Y(PTS[p][1]), col, true, 4.5);
    }
    /* the centres, gliding to their centroids */
    if (g > 0.99) {
      for (let c = 0; c < k; c++) {
        const q = lerp2(A.c[c], B.c[c], f), x = X(q[0]), y = Y(q[1]), col = CL(c);
        ctx.save(); ctx.fillStyle = alpha(PAL.panel, 0.85); ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        line(ctx, x - 7, y, x + 7, y, col, 3); line(ctx, x, y - 7, x, y + 7, col, 3);
        const n = B.a ? B.a.filter((v) => v === c).length : 0;
        hits.push({ x, y, r: 16, name: `c${'₁₂₃₄₅₆₇₈₉'[c]} = ${pt(q)}, the centre of cluster C${'₁₂₃₄₅₆₇₈₉'[c]}${B.a ? ` (${n} points)` : ''}` });
      }
    }
    hits.push({ x: X(-2), y: Y(0.1), r: 30, name: 'a data point is drawn in the colour of its cluster; the rings are the centres' });
    /* the elbow plot: the smallest objective of the ten starts against k, the current run marked */
    const eb = axes(ctx, EB, [0, 9], [0, 4], { xl: 'k', yl: 'objective', nx: 9, ny: 4, fx: (q) => fmt(q, 0), fy: (q) => fmt(q, 0) });
    const pts = []; for (let q = 2; q <= 9; q++) pts.push([eb.X(q), eb.Y(MIN[q])]);
    const upto = Math.max(1, Math.round(g * (pts.length - 1)));
    for (let q = 0; q < upto; q++) line(ctx, pts[q][0], pts[q][1], pts[q + 1][0], pts[q + 1][1], alpha(ink, 0.75), 3);
    pts.forEach(([x, y], q) => { if (q <= upto) dot(ctx, x, y, ink, true, 5.5); hits.push({ x, y, r: 12, name: `k = ${q + 2}: the smallest objective of ten starts is ${f3(MIN[q + 2])}` }); });
    text(ctx, 'smallest objective of ten starts', (EB.l + EB.r) / 2, EB.t - 70, PAL.muted, { size: 17, align: 'center' });
    const cur = A.a ? objective(PTS, (f > 0.5 ? B : A).a, k).o : null;
    if (cur !== null) {
      const x = eb.X(k), y = eb.Y(Math.min(4, cur));
      ctx.save(); ctx.strokeStyle = ink; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      hits.push({ x, y, r: 14, name: `this run's objective now: ${f3(cur)}` });
      if (cur > 4) pinned(ctx, EB, eb.X, eb.Y, k, cur, ink);
    }
    const kind = (f > 0.5 ? B : A).kind, step = f > 0.5 ? j : i;
    headline(ctx, `$k = ${k}$, start ${st.value}, step ${step} of ${T}: ${WORDS[kind]}${cur !== null ? `; objective ${f2(cur)}` : ''}.`);
    if (cur === null) ro.set(`k = ${k}:\\ ${Array.from({ length: Math.min(k, 3) }, (_, c) => `c_{${c + 1}}`).join(', ')}${k > 3 ? ', \\ldots, c_{' + k + '}' : ''} \\text{ chosen from the data}`, `the smallest objective of the ten starts for $k = ${k}$: ${f3(MIN[k])}`, { form: 'start' });
    else ro.set(`\\text{objective} = \\frac{1}{${N}}\\sum_{j=1}^{${k}}\\sum_{\\mathbf{v}\\in C_j}\\left|\\mathbf{v} - c_j\\right|^2 = ${f3(cur)}`, `the smallest objective of the ten starts for $k = ${k}$: ${f3(MIN[k])} (start ${BEST[k] + 1})`, { form: 'obj' });
  }
  register(d.fig, { update: (dt) => cy.step(dt, () => (run.st.length - 1) / dur()), draw });
})();

/* Figure 6.1.12 + 6.1.13 + 6.1.14: k-means on the four points of Activity 6.1.4. v₁ = (−2, 1), v₂ = (1, 1), v₃ = (1, 2),
   v₄ = (3, 2) as dots, labelled in vector; the starting centres c₁, c₂ a choice among the six pairs (the book's v₂, v₃ the
   default; the text's v₃, v₄ another). The step is the clock (0.9 s a step, hold 1.5 s): the clusters (cluster-1,
   cluster-2) formed, the centres moved to the centroids, again, until nothing changes. A thin line joins each point to
   its centre. The readout writes the step's centroids or clusters exactly; the note the objective. x −3 to 4, y −1 to
   3 at 120 units to 1. */
(function () {
  const d = sim('sim-k-means-four-points', 650);
  const PTS = [[-2, 1], [1, 1], [1, 2], [3, 2]], V = ['\\kvecvone', '\\kvecvtwo', '\\kvecvthree', '\\kvecvfour'], VU = ['v₁', 'v₂', 'v₃', 'v₄'];
  const BOX = { l: 280, r: 1120, t: 110, b: 590 }, XR = [-3, 4], YR = [-1, 3];
  const PAIRS = [[1, 2], [2, 3], [0, 1], [0, 2], [0, 3], [1, 3]];
  const OPTS = PAIRS.map(([p, q]) => ({ value: `${p}${q}`, label: `${VU[p]}, ${VU[q]}` }));
  const RUNS = {}; PAIRS.forEach(([p, q]) => { RUNS[`${p}${q}`] = kmeans(PTS, [p, q]); });
  let S = RUNS['12'];
  const cy = cycle(() => S.length - 1, 1.5);
  choice(d.controls, { label: 'c_1, c_2', key: 'start', value: '12', options: OPTS, onInput: (v) => { S = RUNS[v]; cy.reset(); } });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  /* an exact fraction, for the book's centroids and objectives (denominators up to 36) */
  const frac = (x, inline = false) => {
    for (let q = 1; q <= 36; q++) { const p = Math.round(x * q); if (Math.abs(p - x * q) < 1e-9) { if (q === 1) return String(p); return inline ? `${p}/${q}` : `${p < 0 ? '-' : ''}\\tfrac{${Math.abs(p)}}{${q}}`; } }
    return f3(x);
  };
  const colv = (c) => `\\left[\\begin{array}{r} ${frac(c[0], true)} \\\\ ${frac(c[1], true)} \\end{array}\\right]`;
  const setOf = (a, j) => `\\{${a.map((v, i) => (v === j ? V[i] : null)).filter(Boolean).join(', ')}\\}`;
  const LBL = [[16, 22, 'left'], [16, 22, 'left'], [-16, -22, 'right'], [-16, -22, 'right']];
  function draw() {
    const { ctx } = begin(d.c);
    const ink = PAL.ink, pc = C('point'), vc = C('vector');
    const g = ease.smooth(arrival(d));
    const T = S.length - 1, t = Math.min(cy.now(), T), i = Math.min(T, Math.floor(t + 1e-9)), j = Math.min(T, i + 1);
    const f = i === T ? 0 : ease.smooth(t - i), A = S[i], B = S[j], now = f > 0.5 ? B : A, step = f > 0.5 ? j : i;
    hits = [];
    const ax = axes(ctx, BOX, XR, YR, { xl: 'x', yl: 'y', nx: 7, ny: 4, fx: (q) => fmt(q, 0), fy: (q) => fmt(q, 0) });
    const { X, Y } = ax;
    ctx.save(); ctx.beginPath(); ctx.rect(BOX.l, BOX.t, BOX.r - BOX.l, BOX.b - BOX.t); ctx.clip();
    for (let x = XR[0]; x <= XR[1]; x++) line(ctx, X(x), BOX.t, X(x), BOX.b, alpha(ink, 0.06), 1.5);
    for (let y = YR[0]; y <= YR[1]; y++) line(ctx, BOX.l, Y(y), BOX.r, Y(y), alpha(ink, 0.06), 1.5);
    ctx.restore();
    const cs = [0, 1].map((c) => lerp2(A.c[c], B.c[c], f));
    /* the lines from each point to its centre, once it has joined a cluster */
    if (g > 0.99) PTS.forEach((p, n) => {
      const a0 = A.a ? A.a[n] : null, a1 = B.a ? B.a[n] : null;
      if (a1 === null) return;
      const k = a0 === a1 ? 1 : f, c = cs[a1];
      ctx.save(); ctx.globalAlpha *= k; line(ctx, X(p[0]), Y(p[1]), X(c[0]), Y(c[1]), alpha(CL(a1), 0.45), 2.5, [6, 6]); ctx.restore();
    });
    PTS.forEach((p, n) => {
      const ca = A.a ? CL(A.a[n]) : pc, cb = B.a ? CL(B.a[n]) : pc, col = ca === cb ? ca : mixColor(ca, cb, f);
      ctx.save(); ctx.globalAlpha *= g; dot(ctx, X(p[0]), Y(p[1]), col, true, 10); ctx.restore();
      if (g > 0.99) tag(ctx, `$${V[n]}$`, X(p[0]) + LBL[n][0], Y(p[1]) + LBL[n][1], vc, LBL[n][2]);
      hits.push({ x: X(p[0]), y: Y(p[1]), r: 14, name: `${VU[n]} = ${pt(p)}${now.a ? `, in cluster C${'₁₂'[now.a[n]]}` : ''}` });
    });
    if (g > 0.99) cs.forEach((q, c) => {
      const x = X(q[0]), y = Y(q[1]), col = CL(c);
      ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(x, y, 19, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      line(ctx, x - 9, y, x + 9, y, col, 3); line(ctx, x, y - 9, x, y + 9, col, 3);
      tag(ctx, `$c_{${c + 1}}$`, x + 26, y - 26, col, 'left');
      hits.push({ x, y, r: 20, name: `c${'₁₂'[c]} = (${frac(q[0], true).replace('-', '−')}, ${frac(q[1], true).replace('-', '−')})${A.c[c] === B.c[c] || f === 0 ? '' : ', on its way to the centroid'}` });
    });
    const obj = now.a ? objective(PTS, now.a, 2) : null;
    const WORDS = { start: 'two of the points are taken as the centres', assign: 'each point joins the cluster of the nearer centre', move: 'each centre moves to the centroid of its cluster', done: 'the clusters are unchanged, so this clustering is final' };
    const cl = now.a ? `; $C_1 = ${setOf(now.a, 0)}$, $C_2 = ${setOf(now.a, 1)}$` : '';
    headline(ctx, `Step ${step}: ${WORDS[now.kind]}${now.kind === 'move' ? '' : cl}.`);
    const note = obj ? `$\\text{objective} = ${frac(obj.o)}$` : '';
    if (now.kind === 'start') {
      const idx = S[0].c.map((c) => PTS.findIndex((p) => p[0] === c[0] && p[1] === c[1]));
      ro.set(`c_1 = ${V[idx[0]]} = ${colv(S[0].c[0])}, \\quad c_2 = ${V[idx[1]]} = ${colv(S[0].c[1])}`, note, { form: 'start' });
    } else if (now.kind === 'move') {
      const parts = [0, 1].map((c) => { const mem = now.a.map((v, n) => (v === c ? V[n] : null)).filter(Boolean); const n = mem.length; return `c_${c + 1} = ${n === 1 ? mem[0] : `\\tfrac{1}{${n}}(${mem.join(' + ')})`} = ${colv(now.c[c])}`; });
      ro.set(parts.join(', \\quad '), note, { form: 'move' });
    } else ro.set(`C_1 = ${setOf(now.a, 0)}, \\quad C_2 = ${setOf(now.a, 1)}`, now.kind === 'done' ? `${note}; the clusters did not change` : note, { form: 'assign' });
  }
  register(d.fig, { update: (dt) => cy.step(dt, () => 1 / 0.9), draw });
})();
};
