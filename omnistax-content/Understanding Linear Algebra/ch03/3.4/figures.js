/* Figures for section 3.4 Determinants. */
window.OMNISTAX_FIGURES = window.OMNISTAX_FIGURES || {};
window.OMNISTAX_FIGURES['3.4'] = function (root, F) {
const { C, PAL, alpha, ctl, choice, select, begin, axes, drag, line, arrow, dot, text, headline, register, readout, hover, ease, fmt, arrival, pinned } = F;
const SP = F.space;
const sim = (id, H) => F.sim(root, id, H);
const still = (d, draw) => register(d.fig, { update: () => {}, draw });
/* a number as the figure writes it: at most two decimals, no trailing zeros, never −0 */
const r2 = (v) => { const r = Math.round(v * 100) / 100; return Object.is(r, -0) ? 0 : r; };
const r1 = (v) => { const r = Math.round(v * 10) / 10; return Object.is(r, -0) ? 0 : r; };
const num = (v) => String(r2(v));
const numT = (v) => num(v).replace(/-/g, '−');            /* the same in figure text, with a true minus */
const par = (v) => (r2(v) < 0 ? `(${num(v)})` : num(v));  /* a negative factor in parentheses */
const col = (a, b) => `\\left[\\begin{array}{r} ${num(a)} \\\\ ${num(b)} \\end{array}\\right]`;
/* a 2 × 2 matrix [a b; c d] stored row by row, as TeX, and the same wearing the matrix colour */
const mtx = (m) => `\\left[\\begin{array}{rr} ${num(m[0])} & ${num(m[1])} \\\\ ${num(m[2])} & ${num(m[3])} \\end{array}\\right]`;
const kmtx = (m) => `\\htmlClass{kv-matrix}{${mtx(m)}}`;
const pt = (v) => `(${numT(v[0])}, ${numT(v[1])})`;      /* in figure text */
const ptT = (v) => `(${num(v[0])}, ${num(v[1])})`;       /* in TeX */
const lerp = (a, b, k) => a + (b - a) * k;
const map = (m, p) => [m[0] * p[0] + m[1] * p[1], m[2] * p[0] + m[3] * p[1]];
const det2 = (m) => m[0] * m[3] - m[1] * m[2];
const cols = (m) => [[m[0], m[2]], [m[1], m[3]]];         /* the columns v₁ = (a, c), v₂ = (b, d) */
const tag = (ctx, s, x, y, color, align = 'center') => text(ctx, s, x, y, color, { size: 22, weight: 600, tex: true, bg: PAL.panel, align });
const clear = (c) => alpha(c, 0);
const EPS = 0.03;                                        /* below this the parallelogram is drawn as a segment */

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
/* the grip ring of a head the reader can drag */
const ring = (ctx, ax, p, color) => { const { X, Y, box } = ax, x = X(p[0]), y = Y(p[1]); if (x < box.l || x > box.r || y < box.t || y > box.b) return; ctx.save(); ctx.strokeStyle = alpha(color, 0.35); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); };
/* a window of the plane with a faint unit grid under its axes */
function plane(ctx, box, xr, yr, o = {}) {
  const U = (box.r - box.l) / (xr[1] - xr[0]), V = (box.b - box.t) / (yr[1] - yr[0]);
  ctx.save(); ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip();
  for (let i = Math.ceil(xr[0]); i <= xr[1]; i++) line(ctx, box.l + (i - xr[0]) * U, box.t, box.l + (i - xr[0]) * U, box.b, alpha(PAL.ink, 0.07), 1.5);
  for (let j = Math.ceil(yr[0]); j <= yr[1]; j++) line(ctx, box.l, box.b - (j - yr[0]) * V, box.r, box.b - (j - yr[0]) * V, alpha(PAL.ink, 0.07), 1.5);
  ctx.restore();
  return axes(ctx, box, xr, yr, { nx: xr[1] - xr[0], ny: yr[1] - yr[0], fx: (q) => fmt(q, 0), fy: (q) => fmt(q, 0), xl: o.xl, yl: o.yl });
}
/* the unit grid of the window −n..n carried by the matrix m: the lines x = i and y = i, clipped to the box */
function carried(ctx, ax, m, n, color, a, w = 1.5) {
  const { X, Y, box } = ax;
  ctx.save(); ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip(); ctx.globalAlpha *= a;
  for (let i = -n; i <= n; i++) {
    const a1 = map(m, [i, -n]), b1 = map(m, [i, n]), a2 = map(m, [-n, i]), b2 = map(m, [n, i]);
    line(ctx, X(a1[0]), Y(a1[1]), X(b1[0]), Y(b1[1]), color, i ? w : w + 0.8);
    line(ctx, X(a2[0]), Y(a2[1]), X(b2[0]), Y(b2[1]), color, i ? w : w + 0.8);
  }
  ctx.restore();
}
/* a closed path through canvas points */
function pathOf(ctx, P) { ctx.beginPath(); P.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); }
/* The parallelogram on v₁ and v₂ from the origin, in `color`: filled solid while the pair is positively oriented,
   hatched while negatively oriented, a thick segment when the columns lie on one line (|det| < EPS). Clipped to the box. */
function parallelogram(ctx, ax, v1, v2, color, a = 1, o = {}) {
  const { X, Y, box } = ax, dt = v1[0] * v2[1] - v1[1] * v2[0];
  const P = [[0, 0], v1, [v1[0] + v2[0], v1[1] + v2[1]], v2].map((p) => [X(p[0]), Y(p[1])]);
  ctx.save(); ctx.globalAlpha *= a; ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip();
  if (Math.abs(dt) < EPS) {
    /* flat: the segment the four corners lie on */
    const far = P.reduce((b, p) => (Math.hypot(p[0] - P[0][0], p[1] - P[0][1]) > Math.hypot(b[0] - P[0][0], b[1] - P[0][1]) ? p : b), P[0]);
    const near = P.reduce((b, p) => ((p[0] - P[0][0]) * (far[0] - P[0][0]) + (p[1] - P[0][1]) * (far[1] - P[0][1]) < (b[0] - P[0][0]) * (far[0] - P[0][0]) + (b[1] - P[0][1]) * (far[1] - P[0][1]) ? p : b), P[0]);
    line(ctx, near[0], near[1], far[0], far[1], alpha(color, 0.75), 9);
  } else if (dt > 0) {
    ctx.save(); pathOf(ctx, P); ctx.fillStyle = alpha(color, o.fill ?? 0.32); ctx.fill(); ctx.restore();
  } else {
    ctx.save(); pathOf(ctx, P); ctx.fillStyle = alpha(color, 0.08); ctx.fill(); ctx.clip();
    const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]), l = Math.min(...xs), r = Math.max(...xs), t = Math.min(...ys), b = Math.max(...ys);
    for (let s = l - (b - t); s < r; s += 13) line(ctx, s, b, s + (b - t), t, alpha(color, 0.8), 2);
    ctx.restore();
  }
  ctx.save(); pathOf(ctx, P); ctx.strokeStyle = alpha(color, 0.9); ctx.lineWidth = 2.5; if (o.dash) ctx.setLineDash(o.dash); ctx.stroke(); ctx.restore();
  ctx.restore();
  return dt;
}
/* the words of the orientation and the sign: what a headline says of a 2 × 2 determinant */
function signWords(dt) {
  if (Math.abs(dt) < EPS) return { word: 'the columns lie on one line, the parallelogram has no area, and', sign: '0' };
  return dt > 0 ? { word: 'the pair is positively oriented, so', sign: '+' } : { word: 'the pair is negatively oriented, so', sign: '-' };
}
/* the readout of det(A) as the signed area */
const detTex = (m) => {
  const dt = r2(det2(m)), area = r2(Math.abs(dt));
  return `\\det(\\kA) = \\det ${kmtx(m)} = ${Math.abs(dt) < EPS ? '0' : `${dt > 0 ? '+' : '-'}(\\text{area}) = ${dt > 0 ? '+' : '-'}${num(area)}`}${Math.abs(dt) < EPS ? '' : ` = ${num(dt)}`}`;
};
/* the hover names of the two columns */
const colHits = (ax, v1, v2, what = 'A') => [
  { x: ax.X(v1[0]), y: ax.Y(v1[1]), r: 20, name: `v₁ = ${pt(v1)}, the first column of ${what}; drag its head` },
  { x: ax.X(v2[0]), y: ax.Y(v2[1]), r: 20, name: `v₂ = ${pt(v2)}, the second column of ${what}; drag its head` },
];
/* four entry sliders a, b, c, d and the two draggable heads v₁ = (a, c), v₂ = (b, d) */
function entries(d, m, range, step = 0.1, specials) {
  const mk = (label, key, value, aria, sp) => ctl(d.controls, { label, cls: '', key, min: -range, max: range, step, value, unit: '', dec: 1, aria, specials: sp });
  const s = {};
  s.a = mk('a', 'a', m[0], 'the entry a, the first component of v₁', specials?.a);
  s.b = mk('b', 'b', m[1], 'the entry b, the first component of v₂', specials?.b);
  s.c = mk('c', 'c', m[2], 'the entry c, the second component of v₁', specials?.c);
  s.d = mk('d', 'd', m[3], 'the entry d, the second component of v₂', specials?.d);
  s.P1 = drag(d, { x: s.a, y: s.c }); s.P2 = drag(d, { x: s.b, y: s.d });
  s.m = () => [r1(s.a.v), r1(s.b.v), r1(s.c.v), r1(s.d.v)];
  s.set = (mm) => { s.a.set(mm[0]); s.b.set(mm[1]); s.c.set(mm[2]); s.d.set(mm[3]); };
  return s;
}

/* Figure 3.4.1: v₁ = [2, 1] and v₂ = [1, 2] with draggable heads, and the lattice of their linear combinations drawn
   as the grid of congruent parallelograms, the cell on v₁ and v₂ shaded in the matrix hue. The window is x and y
   from −5 to 5 at 58 units to 1 (the book's is −4 to 4). Still: nothing has a clock. */
(function () {
  const d = sim('sim-parallelogram-grid', 660);
  const BOX = { l: 410, r: 990, t: 110, b: 690 }, WIN = [-5, 5];
  const s = entries(d, [2, 1, 1, 2], 4);
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  function draw() {
    const { ctx } = begin(d.c);
    const mc = C('matrix'), vc = C('vector'), c1 = F.ref('v-1'), c2 = F.ref('v-2'), g = ease.smooth(arrival(d));
    const m = s.m(), [v1, v2] = cols(m), dt = det2(m), area = r2(Math.abs(dt));
    hits = [];
    const ax = plane(ctx, BOX, WIN, WIN);
    /* the lattice: the lines i v₁ + t v₂ and t v₁ + j v₂, clipped to the box */
    ctx.save(); ctx.beginPath(); ctx.rect(BOX.l, BOX.t, BOX.r - BOX.l, BOX.b - BOX.t); ctx.clip(); ctx.globalAlpha *= g;
    if (Math.abs(dt) > EPS) for (let i = -12; i <= 12; i++) {
      const p = [i * v1[0] - 12 * v2[0], i * v1[1] - 12 * v2[1]], q = [i * v1[0] + 12 * v2[0], i * v1[1] + 12 * v2[1]];
      line(ctx, ax.X(p[0]), ax.Y(p[1]), ax.X(q[0]), ax.Y(q[1]), alpha(PAL.ink, i ? 0.22 : 0.4), i ? 1.5 : 2);
      const p2 = [i * v2[0] - 12 * v1[0], i * v2[1] - 12 * v1[1]], q2 = [i * v2[0] + 12 * v1[0], i * v2[1] + 12 * v1[1]];
      line(ctx, ax.X(p2[0]), ax.Y(p2[1]), ax.X(q2[0]), ax.Y(q2[1]), alpha(PAL.ink, i ? 0.22 : 0.4), i ? 1.5 : 2);
    }
    ctx.restore();
    parallelogram(ctx, ax, v1, v2, mc, g, { fill: 0.3 });
    const S = (p) => [g * p[0], g * p[1]];
    vec(ctx, ax, [0, 0], S(v1), c1, 5);
    vec(ctx, ax, [0, 0], S(v2), c2, 5);
    dot(ctx, ax.X(0), ax.Y(0), PAL.ink, true, 5);
    s.P1.draw(ctx, ax, clear(c1)); ring(ctx, ax, v1, c1);
    s.P2.draw(ctx, ax, clear(c2)); ring(ctx, ax, v2, c2);
    if (g > 0.99) { outer(ctx, ax, v1, v2, '$\\kvecvone$', vc); outer(ctx, ax, v2, v1, '$\\kvecvtwo$', vc); }
    hits.push(...colHits(ax, v1, v2));
    hits.push({ x: ax.X((v1[0] + v2[0]) / 2), y: ax.Y((v1[1] + v2[1]) / 2), r: 16, name: `the parallelogram on v₁ and v₂, area ${numT(area)}; every cell of the grid is a copy of it` });
    headline(ctx, Math.abs(dt) < EPS ? `$\\kvecvone$ and $\\kvecvtwo$ lie on one line: the parallelograms have collapsed, and the combinations fill only that line.`
      : `Every parallelogram of the grid is a copy of the one on $\\kvecvone$ and $\\kvecvtwo$, of area $${num(area)}$.`);
    ro.set(`\\kA = \\left[\\begin{array}{rr} \\kvecvone & \\kvecvtwo \\end{array}\\right] = ${kmtx(m)}`, Math.abs(dt) < EPS ? 'the parallelograms have no area' : `each parallelogram has area ${numT(area)}`);
  }
  still(d, draw);
})();

/* Sim: the area of a parallelogram is bh. A parallelogram on v and w with draggable heads, the base b = ‖v‖ marked
   along v, the height h as the dashed perpendicular from the tip of w to the line of v, and the readout area = bh.
   The examples are the book's own base-and-height drawing (its 6 : 4 proportions halved, v = (3, 0), w = (2, 2)),
   the five parallelograms of Preview Activity 3.4.1 (a) and the two of part (b). Window x from −3 to 7, y from −3
   to 5 at 60 units to 1. Still. */
(function () {
  const d = sim('sim-parallelogram-area', 600);
  const BOX = { l: 400, r: 1000, t: 100, b: 580 }, XR = [-3, 7], YR = [-3, 5];
  const PRESETS = {
    fig: { label: 'the drawing above: base 3, height 2', v: [3, 0, 2, 2] },
    a1: { label: '(a) 1: the unit square', v: [1, 0, 0, 1] },
    a2: { label: '(a) 2: a 2 × 3 rectangle', v: [2, 0, 0, 3] },
    a3: { label: '(a) 3: a square turned 45°', v: [1, -1, 1, 1] },
    a4: { label: '(a) 4: a parallelogram with horizontal sides', v: [2, 0, 1, 2] },
    a5: { label: '(a) 5: a parallelogram with horizontal sides', v: [2, 0, 2, 2] },
    b1: { label: '(b): v and w₁', v: [3, 0, -1, 3] },
    b2: { label: '(b): v and w₂', v: [3, 0, 2, 3] },
  };
  let sl = [];
  const ex = select(d.controls, {
    label: 'example', key: 'example', value: 'fig', aria: 'one of the book’s parallelograms',
    options: Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label })),
    onInput: (v) => PRESETS[v].v.forEach((x, i) => sl[i].set(x)),
  });
  const comp = (label, key, value, aria) => ctl(d.controls, { label, cls: '', key, min: -4, max: 6, step: 0.1, value, unit: '', dec: 1, aria });
  const v1 = comp('v_1', 'v1', 3, 'the first component of v'), v2 = comp('v_2', 'v2', 0, 'the second component of v');
  const w1 = comp('w_1', 'w1', 2, 'the first component of w'), w2 = comp('w_2', 'w2', 2, 'the second component of w');
  sl = [v1, v2, w1, w2];
  const PV = drag(d, { x: v1, y: v2 }), PW = drag(d, { x: w1, y: w2 });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  /* a length as TeX: exact where it is a whole number or the root of one, else to two places with ≈ */
  const lenTex = (sq) => { const S = Math.round(sq * 1e4) / 1e4, v = Math.sqrt(S); if (Math.abs(v - Math.round(v)) < 1e-9) return { t: num(v), exact: true }; return { t: num(v), exact: false }; };
  function draw() {
    const { ctx } = begin(d.c);
    const mc = C('matrix'), vc = C('vector'), ink = PAL.ink, mu = PAL.muted, g = ease.smooth(arrival(d));
    const v = [r1(v1.v), r1(v2.v)], w = [r1(w1.v), r1(w2.v)];
    const area = r2(Math.abs(v[0] * w[1] - v[1] * w[0])), bsq = v[0] * v[0] + v[1] * v[1], b = Math.sqrt(bsq), h = b > 1e-9 ? area / b : 0;
    hits = [];
    const ax = plane(ctx, BOX, XR, YR);
    const S = (p) => [g * p[0], g * p[1]];
    parallelogram(ctx, ax, v, w, mc, g, { fill: 0.22 });
    /* the height: the perpendicular from the tip of w to the line of v, dashed */
    if (b > 1e-9 && area > EPS) {
      const t = (w[0] * v[0] + w[1] * v[1]) / bsq, foot = [t * v[0], t * v[1]];
      ctx.save(); ctx.globalAlpha *= g; ctx.beginPath(); ctx.rect(BOX.l, BOX.t, BOX.r - BOX.l, BOX.b - BOX.t); ctx.clip();
      line(ctx, ax.X(w[0]), ax.Y(w[1]), ax.X(foot[0]), ax.Y(foot[1]), alpha(ink, 0.7), 2.5, [6, 7]);
      if (t < 0 || t > 1) line(ctx, ax.X(0), ax.Y(0), ax.X(foot[0]), ax.Y(foot[1]), alpha(ink, 0.4), 2, [4, 8]);
      ctx.restore();
      const mx = ax.X((w[0] + foot[0]) / 2), my = ax.Y((w[1] + foot[1]) / 2), nx = -(ax.Y(foot[1]) - ax.Y(w[1])), ny = ax.X(foot[0]) - ax.X(w[0]), L = Math.hypot(nx, ny) || 1;
      const side = (nx * (ax.X(v[0]) - mx) + ny * (ax.Y(v[1]) - my)) > 0 ? -1 : 1;
      if (g > 0.99) tag(ctx, '$h$', mx + (side * nx * 22) / L, my + (side * ny * 22) / L, ink);
      hits.push({ x: mx, y: my, r: 16, name: `the height h = ${numT(r2(h))}: the perpendicular distance from the tip of w to the line of v` });
    }
    vec(ctx, ax, [0, 0], S(v), vc, 5);
    vec(ctx, ax, [0, 0], S(w), vc, 5);
    dot(ctx, ax.X(0), ax.Y(0), ink, true, 5);
    PV.draw(ctx, ax, clear(vc)); ring(ctx, ax, v, vc);
    PW.draw(ctx, ax, clear(vc)); ring(ctx, ax, w, vc);
    if (g > 0.99) {
      outer(ctx, ax, v, w, '$\\kvecv$', vc); outer(ctx, ax, w, v, '$\\kvecw$', vc);
      /* b along the middle of v, on the side away from w */
      const mx = ax.X(v[0] / 2), my = ax.Y(v[1] / 2), nx = -(ax.Y(v[1]) - ax.Y(0)), ny = ax.X(v[0]) - ax.X(0), L = Math.hypot(nx, ny) || 1;
      const side = (nx * (ax.X(w[0]) - mx) + ny * (ax.Y(w[1]) - my)) > 0 ? -1 : 1;
      if (b > 0.3) tag(ctx, '$b$', mx + (side * nx * 20) / L, my + (side * ny * 20) / L, mu);
    }
    hits.push({ x: ax.X(v[0]), y: ax.Y(v[1]), r: 20, name: `v = ${pt(v)}, the base of length b = ${numT(r2(b))}; drag its head` });
    hits.push({ x: ax.X(w[0]), y: ax.Y(w[1]), r: 20, name: `w = ${pt(w)}; drag its head, and slide it parallel to v to keep the height` });
    hits.push({ x: ax.X((v[0] + w[0]) / 2), y: ax.Y((v[1] + w[1]) / 2), r: 14, name: `the parallelogram on v and w, area ${numT(area)}` });
    const bt = lenTex(bsq), ht = lenTex(h * h), ex = bt.exact && ht.exact;
    if (area < EPS) { headline(ctx, `$\\kvecv$ and $\\kvecw$ lie on one line: the parallelogram is flat and its area is $0$.`); ro.set(`\\text{area} = bh = ${num(b)} \\cdot 0 = 0`); }
    else {
      headline(ctx, `The base is $b ${ex ? '=' : '\\approx'} ${bt.t}$ and the height $h ${ex ? '=' : '\\approx'} ${ht.t}$, so the area is $bh = ${num(area)}$.`);
      ro.set(`\\text{area} = bh ${ex ? '=' : '\\approx'} ${bt.t} \\cdot ${ht.t} = ${num(area)}`);
    }
  }
  still(d, draw);
})();

/* Figure 3.4.2: v₁ = [3, 1] and v₂ = [1.5, 3] with draggable heads and the angle from v₁ counterclockwise to v₂
   drawn as an arc; less than 180° is positively oriented, more is negatively. The choice `pair` sets the book's
   left panel or its right, where the two arrows are named the other way round. Window −4 to 4 at 70 units to 1.
   Still; the choice bends one picture into the other (the sliders move). */
(function () {
  const d = sim('sim-orientation', 660);
  const BOX = { l: 420, r: 980, t: 110, b: 670 }, WIN = [-4, 4];
  const PAIRS = { pos: [3, 1.5, 1, 3], neg: [1.5, 3, 3, 1] };   /* a, b, c, d */
  let s = null;
  const pair = choice(d.controls, {
    label: 'pair', key: 'pair', value: 'pos', aria: 'the book’s positively or negatively oriented pair',
    options: [{ value: 'pos', label: 'positively oriented' }, { value: 'neg', label: 'negatively oriented' }],
    onInput: (v) => s.set(PAIRS[v]),
  });
  s = entries(d, PAIRS.pos, 4);
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  function draw() {
    const { ctx } = begin(d.c);
    const vc = C('vector'), c1 = F.ref('v-1'), c2 = F.ref('v-2'), ink = PAL.ink, g = ease.smooth(arrival(d));
    const m = s.m(), [v1, v2] = cols(m);
    const a1 = Math.atan2(v1[1], v1[0]), a2 = Math.atan2(v2[1], v2[0]);
    let th = ((a2 - a1) * 180 / Math.PI) % 360; if (th < 0) th += 360;
    const deg = Math.round(th * 10) / 10, flat = Math.abs(deg) < 0.05 || Math.abs(deg - 180) < 0.05 || Math.abs(deg - 360) < 0.05;
    hits = [];
    const ax = plane(ctx, BOX, WIN, WIN);
    /* the arc from v₁ counterclockwise to v₂ */
    const ox = ax.X(0), oy = ax.Y(0), R = 64;
    if (g > 0.5) {
      ctx.save(); ctx.strokeStyle = alpha(ink, 0.8); ctx.lineWidth = 2.5; ctx.beginPath();
      ctx.arc(ox, oy, R, -a1, -(a1 + th * Math.PI / 180), true); ctx.stroke();
      const e = -(a1 + th * Math.PI / 180);
      arrow(ctx, ox + R * Math.cos(e + 0.12), oy + R * Math.sin(e + 0.12), ox + R * Math.cos(e), oy + R * Math.sin(e), alpha(ink, 0.8), 2.5);
      ctx.restore();
      const mid = a1 + (th / 2) * Math.PI / 180;
      tag(ctx, `$${num(deg)}^\\circ$`, ox + (R + 34) * Math.cos(mid), oy - (R + 34) * Math.sin(mid), ink);
    }
    const S = (p) => [g * p[0], g * p[1]];
    vec(ctx, ax, [0, 0], S(v1), c1, 5);
    vec(ctx, ax, [0, 0], S(v2), c2, 5);
    dot(ctx, ox, oy, ink, true, 5);
    s.P1.draw(ctx, ax, clear(c1)); ring(ctx, ax, v1, c1);
    s.P2.draw(ctx, ax, clear(c2)); ring(ctx, ax, v2, c2);
    if (g > 0.99) { outer(ctx, ax, v1, v2, '$\\kvecvone$', vc); outer(ctx, ax, v2, v1, '$\\kvecvtwo$', vc); }
    hits.push(...colHits(ax, v1, v2, 'the pair'));
    hits.push({ x: ox + R * Math.cos(a1 + (th / 2) * Math.PI / 180), y: oy - R * Math.sin(a1 + (th / 2) * Math.PI / 180), r: 18, name: `the angle from v₁ counterclockwise to v₂: ${numT(deg)}°` });
    const kind = flat ? null : deg < 180 ? 'positively' : 'negatively';
    headline(ctx, flat ? `$\\kvecvone$ and $\\kvecvtwo$ lie on one line, so the pair is neither positively nor negatively oriented.`
      : `The angle from $\\kvecvone$ counterclockwise to $\\kvecvtwo$ is $${num(deg)}^\\circ$, ${deg < 180 ? 'less' : 'more'} than $180^\\circ$: the pair is ${kind} oriented.`);
    ro.set(`\\text{angle from } \\kvecvone \\text{ to } \\kvecvtwo = ${num(deg)}^\\circ ${flat ? '' : deg < 180 ? '< 180^\\circ' : '> 180^\\circ'}`, flat ? 'the pair lies on one line' : `${kind} oriented`, { form: kind ?? 'flat' });
  }
  still(d, draw);
})();

/* Figure 3.4.5: the two panels as one scene with a choice of matrix, I or the book's A = [−2 0; 0 1], the entries
   on sliders and the heads draggable. The parallelogram is solid when positively oriented and hatched when negatively,
   and the readout writes det as the signed area. Window −3 to 3 at 90 units to 1. Still; the choice moves the sliders. */
(function () {
  const d = sim('sim-det-identity', 640);
  const BOX = { l: 430, r: 970, t: 110, b: 650 }, WIN = [-3, 3];
  const MATS = { I: [1, 0, 0, 1], A: [-2, 0, 0, 1] };
  let s = null;
  const pick = choice(d.controls, {
    label: 'matrix', key: 'matrix', value: 'I', aria: 'the identity matrix or the book’s A',
    options: [{ value: 'I', label: 'I' }, { value: 'A', label: 'A = [−2 0; 0 1]' }],
    onInput: (v) => s.set(MATS[v]),
  });
  s = entries(d, MATS.I, 3);
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  function draw() {
    const { ctx } = begin(d.c);
    const mc = C('matrix'), vc = C('vector'), c1 = F.ref('v-1'), c2 = F.ref('v-2'), ink = PAL.ink, g = ease.smooth(arrival(d));
    const m = s.m(), [v1, v2] = cols(m), dt = r2(det2(m)), area = r2(Math.abs(dt));
    const isI = m.every((x, i) => x === MATS.I[i]), isA = m.every((x, i) => x === MATS.A[i]), name = isI ? '\\kI' : '\\kA';
    hits = [];
    const ax = plane(ctx, BOX, WIN, WIN);
    parallelogram(ctx, ax, v1, v2, mc, g);
    const S = (p) => [g * p[0], g * p[1]];
    vec(ctx, ax, [0, 0], S(v1), c1, 5);
    vec(ctx, ax, [0, 0], S(v2), c2, 5);
    dot(ctx, ax.X(0), ax.Y(0), ink, true, 5);
    s.P1.draw(ctx, ax, clear(c1)); ring(ctx, ax, v1, c1);
    s.P2.draw(ctx, ax, clear(c2)); ring(ctx, ax, v2, c2);
    if (g > 0.99) { outer(ctx, ax, v1, v2, isI ? '$\\kvecvone = \\kveceone$' : '$\\kvecvone$', vc); outer(ctx, ax, v2, v1, isI ? '$\\kvecvtwo = \\kvecetwo$' : '$\\kvecvtwo$', vc); }
    hits.push(...colHits(ax, v1, v2, isI ? 'I' : 'A'));
    hits.push({ x: ax.X((v1[0] + v2[0]) / 2), y: ax.Y((v1[1] + v2[1]) / 2), r: 14, name: Math.abs(dt) < EPS ? 'the parallelogram, folded flat: no area' : `the parallelogram on v₁ and v₂: area ${numT(area)}, ${dt > 0 ? 'positively' : 'negatively'} oriented` });
    const w = signWords(dt);
    if (isI) headline(ctx, `$\\kvecvone = \\kveceone$ and $\\kvecvtwo = \\kvecetwo$ are positively oriented and form a $1 \\times 1$ square, so $\\det(\\kI) = 1$.`);
    else if (isA) headline(ctx, `$\\kvecvone$ and $\\kvecvtwo$ are negatively oriented and form a $2 \\times 1$ rectangle, so $\\det(\\kA) = -2$.`);
    else headline(ctx, `$\\det(\\kA) = ${num(dt)}$: ${w.word} ${Math.abs(dt) < EPS ? `$\\det(\\kA) = 0$` : `$\\det(\\kA)$ is ${dt > 0 ? 'the area' : 'minus the area'}, $${num(area)}$`}.`);
    ro.set(detTex(m).replace('\\kA', name), Math.abs(dt) < EPS ? 'the columns lie on one line' : `${dt > 0 ? 'positively' : 'negatively'} oriented; the parallelogram has area ${numT(area)}`, { form: w.sign });
  }
  still(d, draw);
})();

/* Figure 3.4.6: the author's det.js rebuilt. The entries a, b, c, d on sliders in [−2, 2], the identity the start;
   the columns v₁ = (a, c) and v₂ = (b, d) with draggable heads; the unit square dashed in ink and its image, the
   parallelogram on the columns, filled in the matrix hue, solid when positively oriented, hatched when negatively,
   a segment at det = 0; the image of the unit grid behind it. A dashed special on each slider at the value that
   makes det(A) = 0 given the other three. The examples are the book's matrices: Example 3.4.4's I and A, and
   Activity 3.4.2's (a)–(f). Window −4 to 4 (the author's) at 80 units to 1. Still. */
(function () {
  const d = sim('sim-determinant', 740);
  const BOX = { l: 130, r: 770, t: 110, b: 750 }, WIN = [-4, 4], LX = 880;
  const PRESETS = {
    I: { label: 'I (Example 3.4.4)', v: [1, 0, 0, 1] },
    ex: { label: 'A = [−2 0; 0 1] (Example 3.4.4)', v: [-2, 0, 0, 1] },
    a: { label: '(a) [−1/2 0; 0 2]', v: [-0.5, 0, 0, 2] },
    b: { label: '(b) [0 1; 1 0]', v: [0, 1, 1, 0] },
    c: { label: '(c) [2 1; 0 1]', v: [2, 1, 0, 1] },
    d: { label: '(d) [2 0; 1 1]', v: [2, 0, 1, 1] },
    e: { label: '(e) [1 −1; −2 2]', v: [1, -1, -2, 2] },
    fA: { label: '(f) A = [2 1; 2 −1]', v: [2, 1, 2, -1] },
    fB: { label: '(f) B = [1 0; 0 2]', v: [1, 0, 0, 2] },
    fAB: { label: '(f) AB = [2 2; 2 −2]', v: [2, 2, 2, -2] },
  };
  let s = null;
  const ex = select(d.controls, {
    label: 'matrix', key: 'matrix', value: 'I', aria: 'one of the book’s matrices',
    options: Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label })),
    onInput: (v) => s.set(PRESETS[v].v),
  });
  const inRange = (x) => (Number.isFinite(x) && Math.abs(x) <= 2 ? x : null);
  s = entries(d, PRESETS.I.v, 2, 0.1, {
    a: [{ at: () => (s && Math.abs(s.d.v) > 1e-9 ? inRange((s.b.v * s.c.v) / s.d.v) : null), label: 'det = 0' }],
    b: [{ at: () => (s && Math.abs(s.c.v) > 1e-9 ? inRange((s.a.v * s.d.v) / s.c.v) : null), label: 'det = 0' }],
    c: [{ at: () => (s && Math.abs(s.b.v) > 1e-9 ? inRange((s.a.v * s.d.v) / s.b.v) : null), label: 'det = 0' }],
    d: [{ at: () => (s && Math.abs(s.a.v) > 1e-9 ? inRange((s.b.v * s.c.v) / s.a.v) : null), label: 'det = 0' }],
  });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  function draw() {
    const { ctx } = begin(d.c);
    const mc = C('matrix'), vc = C('vector'), c1 = F.ref('v-1'), c2 = F.ref('v-2'), ink = PAL.ink, mu = PAL.muted, g = ease.smooth(arrival(d));
    const m = s.m(), [v1, v2] = cols(m), dt = r2(det2(m)), area = r2(Math.abs(dt));
    hits = [];
    const ax = plane(ctx, BOX, WIN, WIN);
    carried(ctx, ax, m, 8, mc, 0.22 * g);
    /* the unit square, dashed, and its image */
    ctx.save(); ctx.globalAlpha *= g; ctx.beginPath(); ctx.rect(BOX.l, BOX.t, BOX.r - BOX.l, BOX.b - BOX.t); ctx.clip();
    const U = [[0, 0], [1, 0], [1, 1], [0, 1]].map((p) => [ax.X(p[0]), ax.Y(p[1])]);
    pathOf(ctx, U); ctx.strokeStyle = alpha(ink, 0.7); ctx.lineWidth = 2.5; ctx.setLineDash([7, 6]); ctx.stroke();
    ctx.restore();
    parallelogram(ctx, ax, v1, v2, mc, g);
    const S = (p) => [g * p[0], g * p[1]];
    vec(ctx, ax, [0, 0], S(v1), c1, 5);
    vec(ctx, ax, [0, 0], S(v2), c2, 5);
    dot(ctx, ax.X(0), ax.Y(0), ink, true, 5);
    s.P1.draw(ctx, ax, clear(c1)); ring(ctx, ax, v1, c1);
    s.P2.draw(ctx, ax, clear(c2)); ring(ctx, ax, v2, c2);
    if (g > 0.99) { outer(ctx, ax, v1, v2, '$\\kvecvone$', vc); outer(ctx, ax, v2, v1, '$\\kvecvtwo$', vc); }
    /* the legend: what the fill says */
    text(ctx, 'the parallelogram on the columns', LX, 190, mu, { size: 20, align: 'left' });
    const sw = (y, kind) => {
      const P = [[LX, y - 16], [LX + 54, y - 16], [LX + 54, y + 16], [LX, y + 16]];
      ctx.save();
      if (kind === 'solid') { pathOf(ctx, P); ctx.fillStyle = alpha(mc, 0.32); ctx.fill(); }
      else if (kind === 'hatch') { pathOf(ctx, P); ctx.fillStyle = alpha(mc, 0.08); ctx.fill(); ctx.clip(); for (let x = LX - 32; x < LX + 54; x += 13) line(ctx, x, y + 16, x + 32, y - 16, alpha(mc, 0.8), 2); }
      else line(ctx, LX, y, LX + 54, y, alpha(mc, 0.75), 7);
      ctx.restore();
      if (kind !== 'flat') { ctx.save(); pathOf(ctx, P); ctx.strokeStyle = alpha(mc, 0.9); ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }
    };
    sw(240, 'solid'); text(ctx, 'solid: $\\kvecvone$, $\\kvecvtwo$ positively oriented, $\\det(\\kA) > 0$', LX + 70, 240, ink, { size: 20, align: 'left', tex: true });
    sw(292, 'hatch'); text(ctx, 'hatched: negatively oriented, $\\det(\\kA) < 0$', LX + 70, 292, ink, { size: 20, align: 'left', tex: true });
    sw(344, 'flat'); text(ctx, 'a segment: the columns on one line, $\\det(\\kA) = 0$', LX + 70, 344, ink, { size: 20, align: 'left', tex: true });
    line(ctx, LX, 410, LX + 54, 410, alpha(ink, 0.7), 2.5, [7, 6]); text(ctx, 'dashed: the unit square, area 1', LX + 70, 410, ink, { size: 20, align: 'left' });
    text(ctx, `its image has area $${num(area)}$`, LX + 70, 448, ink, { size: 20, align: 'left', tex: true });
    hits.push(...colHits(ax, v1, v2));
    hits.push({ x: ax.X(0.5), y: ax.Y(0.5), r: 14, name: 'the unit square, area 1, which A carries to the parallelogram' });
    hits.push({ x: ax.X((v1[0] + v2[0]) / 2), y: ax.Y((v1[1] + v2[1]) / 2), r: 16, name: Math.abs(dt) < EPS ? 'the image of the unit square, folded flat: no area' : `the image of the unit square: area ${numT(area)}, ${dt > 0 ? 'positively' : 'negatively'} oriented` });
    const w = signWords(dt);
    headline(ctx, Math.abs(dt) < EPS ? `$\\det(\\kA) = 0$: the columns lie on one line, and the parallelogram has no area.`
      : `$\\det(\\kA) = ${num(dt)}$: ${w.word} $\\det(\\kA)$ is ${dt > 0 ? 'the area' : 'minus the area'} of the parallelogram, $${num(area)}$.`);
    ro.set(detTex(m), Math.abs(dt) < EPS ? 'the columns lie on one line' : `${dt > 0 ? 'positively' : 'negatively'} oriented; the unit square’s image has area ${numT(area)}`, { form: w.sign });
  }
  still(d, draw);
})();

/* Sim: the parallelepiped on three vectors in ℝ³ and the determinant as its signed volume. The box on v₁, v₂, v₃ in
   the matrix hue, the base parallelogram on v₁ and v₂ outlined, and the height h of the tip of v₃ above the plane of
   v₁ and v₂ drawn as a dashed drop; h is the slider (special at 0, where the box is flat and det = 0; negative
   below the plane, where the triple is oriented the other way). The examples: the book's drawing v₁ = (3, 2, −0.5),
   v₂ = (−0.7, 2, 0), v₃ = (0, 1, 3.5); Activity 3.4.4 (c)'s dependent triple; Exercise 3.4.1's A (det 12), which fits the
   box where Example 3.4.13's columns, reaching 10, would not.
   Mathematical 3D, free orbit, no ground, no buttons. Still. */
(function () {
  const d = sim('sim-parallelepiped');
  const box = [[-3, 4], [-4, 4], [-4, 4]];
  const S3 = F.space3d(d, { box, h: 640, fit: 2.0 });
  const PRESETS = {
    fig: { label: 'the book’s drawing', v: [[3, 2, -0.5], [-0.7, 2, 0], [0, 1, 3.5]] },
    act: { label: 'Activity 3.4.4 (c): [2, −1, −2], [1, −1, 2], [1, 0, −4]', v: [[2, -1, -2], [1, -1, 2], [1, 0, -4]] },
    ex: { label: 'Exercise 3.4.1: the columns of A', v: [[2, -4, 2], [1, -4, 1], [0, 3, -3]] },
  };
  /* the normal of the plane of v₁ and v₂, the in-plane part of v₃ and its height above the plane */
  const split = (P) => { const n = SP.unit(SP.cross(P[0], P[1])), h0 = SP.dot(P[2], n); return { n, flat: SP.sub(P[2], SP.mul(n, h0)), h0, base: SP.norm(SP.cross(P[0], P[1])) }; };
  let cur = PRESETS.fig;
  const h = ctl(d.controls, { label: 'h', cls: '', key: 'h', min: -4, max: 4, step: 0.001, value: Math.round(split(cur.v).h0 * 1000) / 1000, unit: '', dec: 2, aria: 'the height of the tip of v₃ above the plane of v₁ and v₂', specials: [{ at: 0, label: 'flat: det = 0' }] });
  const ex = select(d.controls, {
    label: 'example', key: 'example', value: 'fig', aria: 'one of the book’s sets of three vectors',
    options: Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label })),
    onInput: (v) => { cur = PRESETS[v]; h.set(Math.round(split(cur.v).h0 * 1000) / 1000); },
  });
  const ro = readout(d);
  const v3t = (p) => `(${num(p[0])}, ${num(p[1])}, ${num(p[2])})`;
  function draw() {
    const mc = C('matrix'), c = [F.ref('v-1'), F.ref('v-2'), F.ref('v-3')];
    const { n, flat, base } = split(cur.v), hv = Math.round(h.v * 1000) / 1000;
    const v1 = cur.v[0], v2 = cur.v[1], v3 = SP.add(flat, SP.mul(n, hv));
    const dt = r2(base * hv), vol = r2(Math.abs(dt)), isFlat = Math.abs(hv) < 0.005;
    const o = [0, 0, 0], s12 = SP.add(v1, v2), s13 = SP.add(v1, v3), s23 = SP.add(v2, v3), s123 = SP.add(s12, v3);
    const name = isFlat ? 'the parallelepiped on v₁, v₂ and v₃, flattened into their plane: volume 0' : `the parallelepiped on v₁, v₂ and v₃: volume ${numT(vol)}`;
    S3.set('axes', SP.axes(box, { ticks: 1 }));
    S3.set('solid', [
      { k: 'faces', faces: [[o, v1, s12, v2], [o, v1, s13, v3], [o, v2, s23, v3], [v3, s13, s123, s23], [v2, s12, s123, s23], [v1, s12, s123, s13]], color: mc, alpha: 0.28, name },
      { k: 'segs', segs: [[o, v1], [o, v2], [o, v3], [v1, s12], [v2, s12], [v1, s13], [v3, s13], [v2, s23], [v3, s23], [s12, s123], [s13, s123], [s23, s123]], color: mc, w: 2, name },
      { k: 'line', pts: [o, v1, s12, v2, o], color: mc, w: 3.5, name: `the base, the parallelogram on v₁ and v₂: area ${numT(r2(base))}` },
    ]);
    S3.set('height', isFlat ? [] : [
      { k: 'line', pts: [v3, flat], color: 'guide', w: 2.5, dash: [6, 6], name: `the height h = ${numT(hv)} of the tip of v₃ above the plane of v₁ and v₂` },
      { k: 'dot', p: flat, color: 'ink', r: 5 },
      { k: 'label', s: '$h$', p: SP.mul(SP.add(v3, flat), 0.5), color: PAL.ink },
    ]);
    S3.set('vectors', [
      { k: 'arrow', a: o, b: v1, color: c[0], w: 5, name: `v₁ = ${v3t(v1).replace(/-/g, '−')}, the first column of A` }, { k: 'label', s: '$\\kvecvone$', p: v1, color: c[0] },
      { k: 'arrow', a: o, b: v2, color: c[1], w: 5, name: `v₂ = ${v3t(v2).replace(/-/g, '−')}, the second column of A` }, { k: 'label', s: '$\\kvecvtwo$', p: v2, color: c[1] },
      { k: 'arrow', a: o, b: v3, color: c[2], w: 5, name: `v₃ = ${v3t(v3).replace(/-/g, '−')}, the third column of A; h sets its height above the plane of the other two` }, { k: 'label', s: '$\\kvecvthree$', p: v3, color: c[2] },
    ]);
    S3.headline(isFlat ? `$\\det(\\kA) = 0$: $\\kvecvthree$ lies in the plane of $\\kvecvone$ and $\\kvecvtwo$, the columns are linearly dependent, and the box has no volume.`
      : `$\\det(\\kA) = ${num(dt)}$: the parallelepiped on $\\kvecvone$, $\\kvecvtwo$ and $\\kvecvthree$ has volume $${num(vol)}$, and the triple is ${dt > 0 ? 'positively' : 'negatively'} oriented.`);
    ro.set(`\\det(\\kA) = (\\text{base area}) \\cdot h = ${num(base)} \\cdot ${par(hv)} = ${num(dt)}`, isFlat ? 'the columns are linearly dependent' : `volume ${numT(vol)}, ${dt > 0 ? 'positively' : 'negatively'} oriented`, { form: isFlat ? 0 : Math.sign(dt) });
  }
  still(d, draw);
})();

/* Figure 3.4.7: the parallelogram of [2 k; 0 3] beside the 2 × 3 rectangle of equal area, k on a slider with the
   book's k = 2 the default and a special at 0 where the parallelogram is the rectangle. Two panels at one scale,
   x from −1 to 5 and y from −1 to 4 at 70 units to 1. Still. */
(function () {
  const d = sim('sim-det-triangular', 610);
  const L = { l: 150, r: 570, t: 120, b: 470 }, R = { l: 820, r: 1240, t: 120, b: 470 }, XR = [-1, 5], YR = [-1, 4];
  const k = ctl(d.controls, { label: 'k', cls: '', key: 'k', min: -3, max: 3, step: 0.1, value: 2, unit: '', dec: 1, aria: 'the upper right entry k of the matrix', specials: [{ at: 0, label: 'the rectangle' }] });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  function draw() {
    const { ctx } = begin(d.c);
    const mc = C('matrix'), vc = C('vector'), c1 = F.ref('v-1'), c2 = F.ref('v-2'), ink = PAL.ink, mu = PAL.muted, g = ease.smooth(arrival(d));
    const kv = r1(k.v), m = [2, kv, 0, 3], [v1, v2] = cols(m);
    hits = [];
    const axL = plane(ctx, L, XR, YR), axR = plane(ctx, R, XR, YR);
    text(ctx, `the columns of $\\left[\\begin{array}{rr} 2 & ${num(kv)} \\\\ 0 & 3 \\end{array}\\right]$`, (L.l + L.r) / 2, 572, mu, { size: 20, align: 'center', tex: true });
    text(ctx, 'the $2 \\times 3$ rectangle', (R.l + R.r) / 2, 572, mu, { size: 20, align: 'center', tex: true });
    const S = (p) => [g * p[0], g * p[1]];
    [[axL, v1, v2], [axR, [2, 0], [0, 3]]].forEach(([ax, a, b]) => {
      parallelogram(ctx, ax, a, b, mc, g);
      vec(ctx, ax, [0, 0], S(a), c1, 5); vec(ctx, ax, [0, 0], S(b), c2, 5);
      dot(ctx, ax.X(0), ax.Y(0), ink, true, 5);
      if (g > 0.99) { outer(ctx, ax, a, b, '$\\kvecvone$', vc); outer(ctx, ax, b, a, '$\\kvecvtwo$', vc); }
      hits.push({ x: ax.X(a[0]), y: ax.Y(a[1]), r: 18, name: `v₁ = ${pt(a)}` }, { x: ax.X(b[0]), y: ax.Y(b[1]), r: 18, name: `v₂ = ${pt(b)}` });
      hits.push({ x: ax.X((a[0] + b[0]) / 2), y: ax.Y((a[1] + b[1]) / 2), r: 16, name: 'base 2 along the horizontal axis, height 3: area 6' });
    });
    /* the height of the left parallelogram, dashed from the tip of v₂ to the axis */
    if (Math.abs(kv) > 0.05 && g > 0.99) {
      line(ctx, axL.X(kv), axL.Y(3), axL.X(kv), axL.Y(0), alpha(ink, 0.6), 2.5, [6, 7]);
      tag(ctx, '$3$', axL.X(kv) + (kv >= 1 ? -18 : 18), axL.Y(1.5), ink, kv >= 1 ? 'right' : 'left');
    }
    if (g > 0.99) { tag(ctx, '$2$', axL.X(1), axL.Y(0) + 24, ink); tag(ctx, '$2$', axR.X(1), axR.Y(0) + 24, ink); tag(ctx, '$3$', axR.X(0) - 20, axR.Y(1.5), ink, 'right'); }
    headline(ctx, kv === 0 ? `At $k = 0$ the parallelogram is the $2 \\times 3$ rectangle itself: $\\det = 2 \\cdot 3 = 6$.`
      : `$\\det\\left[\\begin{array}{rr} 2 & ${num(kv)} \\\\ 0 & 3 \\end{array}\\right] = 2 \\cdot 3 = 6$, whatever $k$ is: the parallelogram has the base and height of the rectangle.`);
    ro.set(`\\det ${kmtx(m)} = 2 \\cdot 3 = 6`, 'the product of the diagonal entries; the two parallelograms have equal area');
  }
  still(d, draw);
})();

/* Figure 3.4.9: the columns v₁ = [1, 2] and v₂ = [−1, −2] of the book's A, folded onto one line with zero area,
   and draggable heads that lift v₂ off the line so the parallelogram opens; dashed specials on v₂'s sliders at the
   values that put it back on the line of v₁. Window −3 to 3 (the book's) at 90 units to 1. Still. */
(function () {
  const d = sim('sim-det-dependent', 640);
  const BOX = { l: 430, r: 970, t: 110, b: 650 }, WIN = [-3, 3];
  let s = null;
  const inRange = (x) => (Number.isFinite(x) && Math.abs(x) <= 3 ? x : null);
  s = entries(d, [1, -1, 2, -2], 3, 0.1, {
    b: [{ at: () => (s && Math.abs(s.c.v) > 1e-9 ? inRange((s.a.v * s.d.v) / s.c.v) : null), label: 'on the line of v₁' }],
    d: [{ at: () => (s && Math.abs(s.a.v) > 1e-9 ? inRange((s.b.v * s.c.v) / s.a.v) : null), label: 'on the line of v₁' }],
  });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  function draw() {
    const { ctx } = begin(d.c);
    const mc = C('matrix'), vc = C('vector'), c1 = F.ref('v-1'), c2 = F.ref('v-2'), ink = PAL.ink, g = ease.smooth(arrival(d));
    const m = s.m(), [v1, v2] = cols(m), dt = r2(det2(m)), area = r2(Math.abs(dt));
    hits = [];
    const ax = plane(ctx, BOX, WIN, WIN);
    /* the line through v₁, faint, so the fold is seen */
    if (Math.hypot(v1[0], v1[1]) > 0.05) {
      const L = Math.hypot(v1[0], v1[1]), u = [v1[0] / L, v1[1] / L];
      ctx.save(); ctx.beginPath(); ctx.rect(BOX.l, BOX.t, BOX.r - BOX.l, BOX.b - BOX.t); ctx.clip();
      line(ctx, ax.X(-12 * u[0]), ax.Y(-12 * u[1]), ax.X(12 * u[0]), ax.Y(12 * u[1]), alpha(ink, 0.3), 2, [4, 8]);
      ctx.restore();
      hits.push({ x: ax.X(-1.5 * u[0]), y: ax.Y(-1.5 * u[1]), r: 14, name: 'the line through v₁: the parallelogram folds flat when v₂ lies on it' });
    }
    parallelogram(ctx, ax, v1, v2, mc, g);
    const S = (p) => [g * p[0], g * p[1]];
    vec(ctx, ax, [0, 0], S(v1), c1, 5);
    vec(ctx, ax, [0, 0], S(v2), c2, 5);
    dot(ctx, ax.X(0), ax.Y(0), ink, true, 5);
    s.P1.draw(ctx, ax, clear(c1)); ring(ctx, ax, v1, c1);
    s.P2.draw(ctx, ax, clear(c2)); ring(ctx, ax, v2, c2);
    if (g > 0.99) { outer(ctx, ax, v1, v2, '$\\kvecvone$', vc); outer(ctx, ax, v2, v1, '$\\kvecvtwo$', vc); }
    hits.push(...colHits(ax, v1, v2));
    const dep = Math.abs(dt) < EPS, w = signWords(dt);
    const mult = dep && Math.abs(v1[0]) + Math.abs(v1[1]) > 0 ? (Math.abs(v1[0]) > Math.abs(v1[1]) ? v2[0] / v1[0] : v2[1] / v1[1]) : null;
    headline(ctx, dep ? `${mult !== null ? `$\\kvecvtwo = ${r2(mult) === -1 ? '-' : r2(mult) === 1 ? '' : num(mult)}\\kvecvone$: ` : ''}the columns are linearly dependent, the parallelogram folds onto a line, and $\\det(\\kA) = 0$.`
      : `$\\det(\\kA) = ${num(dt)}$: $\\kvecvtwo$ is off the line of $\\kvecvone$, the parallelogram has area $${num(area)}$, and ${w.word.replace(', so', '')}.`);
    ro.set(detTex(m), dep ? 'the columns are linearly dependent' : `the columns are linearly independent; ${dt > 0 ? 'positively' : 'negatively'} oriented, area ${numT(area)}`, { form: w.sign });
  }
  still(d, draw);
})();

/* Sim: a row operation acting on the parallelogram. A = [2 1; 1 3] with det(A) = 5 and the parallelogram on its
   columns as a dashed outline; A′ = SA, PA or RA with its parallelogram filled. Scaling the second row by k stretches
   the picture vertically by k; interchanging the rows reflects it across y = x; adding m times the first row to the
   second shears it vertically. One slider, k for scaling (−2 to 2, special at 0) relabelled m for replacement (−3 to
   3), hidden for an interchange. Window −6 to 6 at 50 units to 1. Still; a change of operation bends the
   parallelogram into the next. */
(function () {
  const d = sim('sim-row-operations-area', 700);
  const BOX = { l: 110, r: 710, t: 110, b: 710 }, WIN = [-6, 6], LX = 790;
  const A = [2, 1, 1, 3];
  const vals = { scale: 2, replace: 1 };
  const Ap = (op, t) => (op === 'scale' ? [A[0], A[1], t * A[2], t * A[3]] : op === 'swap' ? [A[2], A[3], A[0], A[1]] : [A[0], A[1], A[2] + t * A[0], A[3] + t * A[1]]);
  const E = (op, t) => (op === 'scale' ? [1, 0, 0, t] : op === 'swap' ? [0, 1, 1, 0] : [1, 0, t, 1]);
  let t = null;
  const op = choice(d.controls, {
    label: 'operation', key: 'op', value: 'scale', aria: 'the row operation applied to A',
    options: [{ value: 'scale', label: 'scale row 2 by k' }, { value: 'swap', label: 'interchange the rows' }, { value: 'replace', label: 'add m × row 1 to row 2' }],
    onInput: (v) => {
      if (v === 'swap') { t.show(false); return; }
      if (v === 'scale') { t.relabel('k', 'the factor k the second row is scaled by'); t.range({ min: -2, max: 2, step: 0.1, value: vals.scale, unit: '', dec: 1 }); t.mark([{ at: 0, label: 'det = 0' }]); }
      else { t.relabel('m', 'the multiple m of the first row added to the second'); t.range({ min: -3, max: 3, step: 0.5, value: vals.replace, unit: '', dec: 1 }); t.mark([]); }
      t.show(true);
    },
  });
  t = ctl(d.controls, { label: 'k', cls: '', key: 't', min: -2, max: 2, step: 0.1, value: 2, unit: '', dec: 1, aria: 'the factor k the second row is scaled by', specials: [{ at: 0, label: 'det = 0' }] });
  t.show(true, { ms: 0 });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  function draw() {
    const { ctx } = begin(d.c);
    const mc = C('matrix'), vc = C('vector'), ink = PAL.ink, mu = PAL.muted, g = ease.smooth(arrival(d));
    const v = op.value, tv = r1(t.v);
    if (v !== 'swap') vals[v] = tv;
    const M = Ap(v, tv), Mm = op.mix((o) => Ap(o, vals[o] ?? 0)), [w1, w2] = cols(Mm), [u1, u2] = cols(A);
    const dA = det2(A), dE = r2(det2(E(v, tv))), dM = r2(det2(M)), areaM = r2(Math.abs(dM));
    hits = [];
    const ax = plane(ctx, BOX, WIN, WIN);
    /* the parallelogram of A, dashed, then that of A′ */
    parallelogram(ctx, ax, u1, u2, ink, 0.5 * g, { fill: 0, dash: [7, 6] });
    parallelogram(ctx, ax, w1, w2, mc, g);
    const S = (p) => [g * p[0], g * p[1]];
    vec(ctx, ax, [0, 0], S(u1), alpha(ink, 0.5), 3, [7, 6]); vec(ctx, ax, [0, 0], S(u2), alpha(ink, 0.5), 3, [7, 6]);
    vec(ctx, ax, [0, 0], S(w1), vc, 5); vec(ctx, ax, [0, 0], S(w2), vc, 5);
    dot(ctx, ax.X(0), ax.Y(0), ink, true, 5);
    if (v === 'swap' && g > 0.99) { ctx.save(); ctx.beginPath(); ctx.rect(BOX.l, BOX.t, BOX.r - BOX.l, BOX.b - BOX.t); ctx.clip(); line(ctx, ax.X(-6), ax.Y(-6), ax.X(6), ax.Y(6), alpha(ink, 0.35), 2, [4, 8]); ctx.restore(); tag(ctx, '$y = x$', ax.X(5.2), ax.Y(5.2) - 26, mu); }
    /* the legend */
    text(ctx, 'dashed: the parallelogram on the columns of $\\kA$, area $5$', LX, 190, ink, { size: 20, align: 'left', tex: true });
    text(ctx, `filled: the parallelogram on the columns of $\\kAprime$, area $${num(areaM)}$`, LX, 230, ink, { size: 20, align: 'left', tex: true });
    text(ctx, `$\\kA = ${kmtx(A)}, \\quad \\kAprime = ${kmtx(M)}$`, LX, 300, ink, { size: 22, align: 'left', tex: true });
    hits.push({ x: ax.X(u1[0]), y: ax.Y(u1[1]), r: 16, name: `the first column of A, ${pt(u1)}` }, { x: ax.X(u2[0]), y: ax.Y(u2[1]), r: 16, name: `the second column of A, ${pt(u2)}` });
    const c1 = cols(M)[0], c2 = cols(M)[1];
    hits.push({ x: ax.X(c1[0]), y: ax.Y(c1[1]), r: 18, name: `the first column of A′, ${pt(c1)}` }, { x: ax.X(c2[0]), y: ax.Y(c2[1]), r: 18, name: `the second column of A′, ${pt(c2)}` });
    hits.push({ x: ax.X((c1[0] + c2[0]) / 2), y: ax.Y((c1[1] + c2[1]) / 2), r: 16, name: Math.abs(dM) < EPS ? 'the parallelogram on the columns of A′, folded flat' : `the parallelogram on the columns of A′: area ${numT(areaM)}, ${dM > 0 ? 'positively' : 'negatively'} oriented` });
    let h, tex, note;
    if (v === 'scale') {
      h = tv === 0 ? `Scaling the second row by $0$ flattens the parallelogram onto the horizontal axis: $\\det(\\kAprime) = 0 \\cdot \\det(\\kA) = 0$.`
        : `Scaling the second row by $${num(tv)}$ ${Math.abs(tv) > 1 ? 'stretches' : 'squeezes'} the parallelogram ${tv < 0 ? 'and flips it ' : ''}in the vertical direction: $\\det(\\kAprime) = ${num(tv)} \\det(\\kA) = ${num(dM)}$.`;
      tex = `\\det(\\kAprime) = \\det(\\kS)\\det(\\kA) = ${par(dE)}(${num(dA)}) = ${num(dM)}`; note = `$\\kS = ${kmtx(E(v, tv))}$ scales the second row by ${numT(tv)}`;
    } else if (v === 'swap') {
      h = `Interchanging the rows reflects the parallelogram across the line $y = x$: the area is kept, the orientation reverses, and $\\det(\\kAprime) = -\\det(\\kA) = ${num(dM)}$.`;
      tex = `\\det(\\kAprime) = \\det(\\kP)\\det(\\kA) = (-1)(${num(dA)}) = ${num(dM)}`; note = `$\\kP = ${kmtx(E(v, tv))}$ interchanges the rows`;
    } else {
      h = tv === 0 ? `Adding $0$ times the first row to the second leaves $\\kA$ as it is: $\\det(\\kAprime) = \\det(\\kA) = 5$.`
        : `Adding $${num(tv)}$ times the first row to the second shears the parallelogram vertically: its area is unchanged, and $\\det(\\kAprime) = \\det(\\kA) = 5$.`;
      tex = `\\det(\\kAprime) = \\det(\\kR)\\det(\\kA) = (1)(${num(dA)}) = ${num(dM)}`; note = `$\\kR = ${kmtx(E(v, tv))}$ adds ${numT(tv)} times the first row to the second`;
    }
    headline(ctx, h);
    ro.set(tex, note, { form: v });
  }
  still(d, draw);
})();
};
