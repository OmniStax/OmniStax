/* Figures for section 6.3 Orthogonal bases and projections. */
window.OMNISTAX_FIGURES = window.OMNISTAX_FIGURES || {};
window.OMNISTAX_FIGURES['6.3'] = function (root, F) {
const { C, PAL, alpha, ctl, choice, begin, axes, drag, line, arrow, dot, text, headline, register, readout, hover, arrival, ease, pinned, fmt } = F;
const SP = F.space;
const sim = (id, H) => F.sim(root, id, H);
const still = (d, draw) => register(d.fig, { update: () => {}, draw });
/* a number as the readout writes it: at most two decimals, no trailing zeros, never −0; TeX minus is a hyphen */
const r2 = (v) => { const r = Math.round(v * 100) / 100; return Object.is(r, -0) ? 0 : r; };
const r1 = (v) => { const r = Math.round(v * 10) / 10; return Object.is(r, -0) ? 0 : r; };
const num = (v) => String(r2(v));
const numT = (v) => num(v).replace('-', '−');            /* the same in figure text, with a true minus */
const par = (v) => (r2(v) < 0 ? `(${num(v)})` : num(v));  /* a negative factor in parentheses */
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;
const colOf = (p) => `\\begin{bmatrix} ${p.map(num).join(' \\\\ ')} \\end{bmatrix}`;
const pt = (v) => `(${v.map(numT).join(', ')})`;         /* a point in figure text */
const vecT = (v) => `[${v.map(numT).join(', ')}]`;
const vecK = (v) => `[${v.map(num).join(', ')}]`;
const tag = (ctx, s, x, y, color, align = 'center') => text(ctx, s, x, y, color, { size: 22, weight: 600, tex: true, bg: PAL.panel, align });
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (k, a) => [k * a[0], k * a[1]];
const dot2 = (a, b) => a[0] * b[0] + a[1] * b[1];
const len = (a) => Math.hypot(a[0], a[1]);
const inBox = (box, x, y) => x >= box.l && x <= box.r && y >= box.t && y <= box.b;
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
/* the point where the ray from the origin along dir leaves the box, pulled in by `inset` canvas units */
function edgeOf(ax, dir, inset = 40) {
  const { X, Y, box } = ax, L = len(dir); if (!(L > 1e-9)) return null;
  const u = [dir[0] / L, dir[1] / L], ox = X(0), oy = Y(0), dx = X(u[0]) - ox, dy = Y(u[1]) - oy;
  let t = Infinity;
  if (dx > 1e-9) t = Math.min(t, (box.r - inset - ox) / dx); if (dx < -1e-9) t = Math.min(t, (box.l + inset - ox) / dx);
  if (dy > 1e-9) t = Math.min(t, (box.b - inset - oy) / dy); if (dy < -1e-9) t = Math.min(t, (box.t + inset - oy) / dy);
  return { x: ox + dx * t, y: oy + dy * t };
}
/* a label off the point p of the plane, `gap` canvas units along the unit direction n given in plane coordinates */
function off(ctx, ax, p, n, s, color, gap = 30) {
  const { X, Y, box } = ax, L = len(n) || 1, nx = n[0] / L, ny = -n[1] / L;
  const lx = Math.min(Math.max(X(p[0]) + nx * gap, box.l + 30), box.r - 30), ly = Math.min(Math.max(Y(p[1]) + ny * gap, box.t + 16), box.b - 16);
  tag(ctx, s, lx, ly, color, nx > 0.55 ? 'left' : nx < -0.55 ? 'right' : 'center');
  return { x: lx, y: ly };
}
/* the right-angle mark at the point p between the directions a and b (plane coordinates), sz canvas units a side */
function square(ctx, ax, p, a, b, sz = 16) {
  const { X, Y } = ax, la = len(a), lb = len(b); if (!(la > 1e-9 && lb > 1e-9)) return;
  const ux = a[0] / la, uy = -a[1] / la, vx = b[0] / lb, vy = -b[1] / lb, x = X(p[0]), y = Y(p[1]);
  ctx.save(); ctx.strokeStyle = alpha(PAL.ink, 0.7); ctx.lineWidth = 2; ctx.beginPath();
  ctx.moveTo(x + ux * sz, y + uy * sz); ctx.lineTo(x + (ux + vx) * sz, y + (uy + vy) * sz); ctx.lineTo(x + vx * sz, y + vy * sz);
  ctx.stroke(); ctx.restore();
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
const comp = (d, label, key, value, aria, min, max) => ctl(d.controls, { label, cls: '', key, min, max, step: 0.1, value, unit: '', dec: 1, aria });

/* The line L through the origin in the direction w, and b with its projection b̂ = (b·w)/(w·w) w and b − b̂ square to L:
   the scene both flat figures share. Returns what it computed. The book's w = [2, 1] throughout. */
const W = [2, 1];
function lineScene(ctx, ax, b, g) {
  const vc = C('vector'), rc = C('region');
  const ww = dot2(W, W), bw = dot2(b, W), sStar = bw / ww, bh = mul(sStar, W), bp = sub(b, bh);
  const S = (p) => mul(g, p);
  ctx.save(); ctx.globalAlpha *= g; across(ctx, ax, [0, 0], W, alpha(rc, 0.75), 3); ctx.restore();
  return { vc, rc, ww, bw, sStar, bh, bp, S };
}

/* Figure 6.3.10 + 6.3.11 + 6.3.13: the projection onto a line. The line L defined by the book's w = [2, 1], the vector
   b = [2, 4] with a draggable head (sliders b₁, b₂), and another vector y = s w on L with s on a slider (default 2.2, the y
   of Figure 6.3.11). b is dashed, b̂ solid, b − b̂ dotted from b̂ to b with the right-angle mark at b̂ (Figure 6.3.10's right
   panel); b − y is a guide from y to b. The slider s carries a dashed special at (b·w)/(w·w), where y lands on b̂ and the
   picture is Figure 6.3.13's right panel (b̂ = s w). The readout is the dot product (b − s w)·w, zero only there, and the
   note the Pythagorean identity |b − y|² = |b − b̂|² + |b̂ − y|² with the live lengths. Window x and y from −2 to 6 at 90
   units to 1 (the book's −1 to 5 inside); a head past it is pinned. Labels L, w, b, b̂, y; y's label is left to its
   hover name when it would sit on b̂'s or w's. Still: no clock. */
(function () {
  const d = sim('sim-projection-onto-line', 860);
  const BOX = { l: 340, r: 1060, t: 100, b: 820 }, XR = [-2, 6], YR = [-2, 6];
  const b1 = comp(d, 'b_1', 'b1', 2, 'the first entry of b', -2, 6), b2 = comp(d, 'b_2', 'b2', 4, 'the second entry of b', -2, 6);
  const s = ctl(d.controls, { label: 's', cls: '', key: 's', min: -1.5, max: 4, step: 0.1, value: 2.2, unit: '', dec: 2, aria: 'the scalar s that places y = s w on the line L',
    specials: [{ at: () => dot2([r1(b1.v), r1(b2.v)], W) / dot2(W, W), label: 'the projection: (b − s w)·w = 0' }] });
  const P = drag(d, { x: b1, y: b2 });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  function draw() {
    const { ctx } = begin(d.c);
    const g = ease.smooth(arrival(d)), ink = PAL.ink;
    const b = [r1(b1.v), r1(b2.v)], sv = s.v;
    hits = [];
    const ax = plane(ctx, BOX, XR, YR);
    const { vc, rc, ww, bw, sStar, bh, bp, S } = lineScene(ctx, ax, b, g);
    const y = mul(sv, W), at = near(sv, sStar, 1e-6), onL = len(bp) < 1e-9;
    /* y and b − y, then b̂ and b − b̂, then w, then b */
    if (!at) {
      vec(ctx, ax, [0, 0], S(y), vc, 3, undefined, 0.55);
      const bx = ax.box;
      ctx.save(); ctx.globalAlpha *= g; ctx.beginPath(); ctx.rect(bx.l, bx.t, bx.r - bx.l, bx.b - bx.t); ctx.clip();
      line(ctx, ax.X(y[0]), ax.Y(y[1]), ax.X(b[0]), ax.Y(b[1]), alpha(ink, 0.4), 2.5, [10, 9]); dot(ctx, ax.X(y[0]), ax.Y(y[1]), vc, false, 6); ctx.restore();
    }
    vec(ctx, ax, [0, 0], S(bh), vc, 5);
    if (!onL) { vec(ctx, ax, S(bh), S(b), vc, 4, [3, 8], g); if (g > 0.99) square(ctx, ax, bh, mul(-1, W), bp); }
    vec(ctx, ax, [0, 0], S(W), vc, 6);
    vec(ctx, ax, [0, 0], S(b), vc, 5, [12, 8]);
    dot(ctx, ax.X(0), ax.Y(0), ink, true, 5);
    P.draw(ctx, ax, clear(vc));
    if (g > 0.99) {
      const nrm = [-W[1], W[0]];                 /* the side of L that b is on, and the other */
      const side = dot2(b, nrm) >= 0 ? 1 : -1, below = mul(-side, nrm), above = mul(side, nrm);
      const e = edgeOf(ax, dot2(b, W) >= 0 ? mul(-1, W) : W, 50);
      if (e) tag(ctx, '$\\kL$', e.x + (-side) * 0, e.y + 28, rc);
      /* w's name goes below L unless b̂'s would sit on it there; then above */
      const crowd = Math.abs(sStar - 0.5) * len(W) * (ax.X(1) - ax.X(0)) < 70;
      const lw = off(ctx, ax, mul(0.5, W), crowd ? above : below, '$\\kvecw$', vc, 30);
      const lh = off(ctx, ax, bh, below, '$\\kvecbhat$', vc, 34);
      off(ctx, ax, mul(0.55, b), mul(-1, W), '$\\kvecb$', vc, 30);
      if (!at) {
        const yp = { x: ax.X(y[0]), y: ax.Y(y[1]) };
        const clash = [lw, lh].some((q) => Math.hypot(q.x - (yp.x + 0), q.y - (yp.y)) < 70);
        if (!clash && inBox(ax.box, yp.x, yp.y)) off(ctx, ax, y, below, '$\\kvecy$', vc, 34);
      }
    }
    const dby = len(sub(b, y)), dbh = len(bp), dhy = len(sub(bh, y));
    hits.push({ x: ax.X(b[0]), y: ax.Y(b[1]), r: 20, name: `b = ${pt(b)}; drag its head` });
    hits.push({ x: ax.X(bh[0]), y: ax.Y(bh[1]), r: 16, name: `b̂ = ${numT(sStar)}w = ${pt(bh)}, the vector on L closest to b` });
    if (!onL) { const m = mul(0.5, add(b, bh)); hits.push({ x: ax.X(m[0]), y: ax.Y(m[1]), r: 14, name: `b − b̂ = ${pt(bp)}, orthogonal to L; its length is ${numT(dbh)}` }); }
    if (!at) {
      hits.push({ x: ax.X(y[0]), y: ax.Y(y[1]), r: 16, name: `y = ${numT(sv)}w = ${pt(y)}, another vector on L` });
      const m = mul(0.5, add(b, y)); hits.push({ x: ax.X(m[0]), y: ax.Y(m[1]), r: 12, name: `b − y = ${pt(sub(b, y))}; its length is ${numT(dby)}` });
    }
    hits.push({ x: ax.X(W[0] / 2), y: ax.Y(W[1] / 2), r: 14, name: 'w = (2, 1), the vector that defines the line L' });
    const far = mul(-2.5, W); hits.push({ x: ax.X(far[0]), y: ax.Y(far[1]), r: 14, name: 'L, the line of all multiples of w' });
    /* headline and readout */
    if (onL) headline(ctx, `$\\kvecb$ lies on $\\kL$, so $\\kvecbhat = \\kvecb$: the closest vector on the line is $\\kvecb$ itself.`);
    else if (at) headline(ctx, `$s = \\frac{\\kvecb\\cdot\\kvecw}{\\kvecw\\cdot\\kvecw} = ${num(sStar)}$: $\\kvecy$ is $\\kvecbhat$, and $\\kvecb - \\kvecbhat$ is orthogonal to $\\kL$.`);
    else headline(ctx, `$\\kvecy = ${num(sv)}\\kvecw$ is ${numT(dby)} from $\\kvecb$, farther than $\\kvecbhat = ${num(sStar)}\\kvecw$ at ${numT(dbh)}: $\\kvecb - \\kvecy$ is not orthogonal to $\\kL$.`);
    const val = r2(bw - sv * ww);
    if (at) {
      ro.set(`s = \\frac{\\kvecb\\cdot\\kvecw}{\\kvecw\\cdot\\kvecw} = \\frac{${num(bw)}}{${num(ww)}} = ${num(sStar)},\\qquad \\kvecbhat = ${num(sStar)}\\kvecw = ${colOf(bh)}`,
        `$(\\kvecb - \\kvecbhat)\\cdot\\kvecw = 0$: $\\kvecb - \\kvecbhat$ is orthogonal to $\\kL$, and $|\\kvecb - \\kvecbhat| = ${num(dbh)}$ is the least distance from $\\kvecb$ to the line.`, { form: 'at' });
    } else {
      const a2 = r2(dbh * dbh), c2 = r2(dhy * dhy);
      ro.set(`(\\kvecb - s\\kvecw)\\cdot\\kvecw = \\kvecb\\cdot\\kvecw - s\\,\\kvecw\\cdot\\kvecw = ${num(bw)} - ${par(sv)}(${num(ww)}) = ${num(val)}`,
        `$|\\kvecb - \\kvecy|^2 = |\\kvecb - \\kvecbhat|^2 + |\\kvecbhat - \\kvecy|^2$: $${num(r2(a2 + c2))} = ${num(a2)} + ${num(c2)}$, so $|\\kvecb - \\kvecy| \\geq |\\kvecb - \\kvecbhat|$.`, { form: 'off' });
    }
  }
  still(d, draw);
})();

/* Figure 6.3.19: the orthogonal decomposition b = b̂ + b⊥. The line L defined by the book's w = [2, 1] in region, its
   orthogonal complement L⊥ in region dashed (the complement's decoration), and b = [2, 4] with a draggable head (sliders
   b₁, b₂). b̂ is b's shadow on L and b⊥ its shadow on L⊥, both from the origin; the rectangle's far sides, from b̂ and from
   b⊥ to the head of b, are guides, and the right angle sits at the origin between the two lines. The readout writes
   b = b̂ + b⊥ with the live columns (b⊥ written as b − b̂ to the shown digits, so the columns add up), and the note
   b̂ = QQᵀb with Q = [u], u = w/|w|. Window −5 to 5 at 72 units to 1, the book's. Labels L, L⊥, w, b, b̂, b⊥. Still. */
(function () {
  const d = sim('sim-orthogonal-decomposition', 860);
  const BOX = { l: 340, r: 1060, t: 100, b: 820 }, XR = [-5, 5], YR = [-5, 5];
  const b1 = comp(d, 'b_1', 'b1', 2, 'the first entry of b', -5, 5), b2 = comp(d, 'b_2', 'b2', 4, 'the second entry of b', -5, 5);
  const P = drag(d, { x: b1, y: b2 });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  function draw() {
    const { ctx } = begin(d.c);
    const g = ease.smooth(arrival(d)), ink = PAL.ink;
    const b = [r1(b1.v), r1(b2.v)];
    hits = [];
    const ax = plane(ctx, BOX, XR, YR);
    const { vc, rc, bh, S } = lineScene(ctx, ax, b, g);
    const N = [-W[1], W[0]];
    ctx.save(); ctx.globalAlpha *= g; across(ctx, ax, [0, 0], N, alpha(rc, 0.75), 3, [12, 9]); ctx.restore();
    const bhs = [r2(bh[0]), r2(bh[1])], bps = [r2(b[0] - bhs[0]), r2(b[1] - bhs[1])];
    if (g > 0.99) square(ctx, ax, [0, 0], W, N, 18);
    /* the rectangle's far sides */
    ctx.save(); ctx.globalAlpha *= g;
    if (len(bps) > 1e-9 && len(bhs) > 1e-9) {
      line(ctx, ax.X(bhs[0]), ax.Y(bhs[1]), ax.X(b[0]), ax.Y(b[1]), alpha(ink, 0.4), 2.5, [10, 9]);
      line(ctx, ax.X(bps[0]), ax.Y(bps[1]), ax.X(b[0]), ax.Y(b[1]), alpha(ink, 0.4), 2.5, [10, 9]);
    }
    ctx.restore();
    vec(ctx, ax, [0, 0], S(bhs), vc, 5);
    vec(ctx, ax, [0, 0], S(bps), vc, 5, [3, 8]);
    vec(ctx, ax, [0, 0], S(W), vc, 3, undefined, 0.8);
    vec(ctx, ax, [0, 0], S(b), vc, 5, [12, 8]);
    dot(ctx, ax.X(0), ax.Y(0), ink, true, 5);
    P.draw(ctx, ax, clear(vc));
    if (g > 0.99) {
      /* the line names at the ends away from b; the vectors' names past their heads, away from the origin */
      const eL = edgeOf(ax, dot2(b, W) >= 0 ? mul(-1, W) : W, 46), eP = edgeOf(ax, dot2(b, N) >= 0 ? mul(-1, N) : N, 46);
      if (eL) tag(ctx, '$\\kL$', eL.x, eL.y + 26, rc);
      if (eP) tag(ctx, '$\\kLperp$', eP.x + 30, eP.y, rc, 'left');
      const nW = [W[1], -W[0]];
      off(ctx, ax, mul(0.5, W), dot2(b, N) >= 0 ? nW : mul(-1, nW), '$\\kvecw$', vc, 26);
      if (len(bhs) > 0.4) off(ctx, ax, bhs, bhs, '$\\kvecbhat$', vc, 32);
      if (len(bps) > 0.4) off(ctx, ax, bps, bps, '$\\kvecbperp$', vc, 32);
      off(ctx, ax, b, b, '$\\kvecb$', vc, 30);
    }
    hits.push({ x: ax.X(b[0]), y: ax.Y(b[1]), r: 20, name: `b = ${pt(b)}; drag its head` });
    hits.push({ x: ax.X(bhs[0]), y: ax.Y(bhs[1]), r: 16, name: `b̂ = ${pt(bhs)}, the orthogonal projection of b onto L` });
    hits.push({ x: ax.X(bps[0]), y: ax.Y(bps[1]), r: 16, name: `b⊥ = b − b̂ = ${pt(bps)}, the orthogonal projection of b onto L⊥` });
    hits.push({ x: ax.X(W[0] / 2), y: ax.Y(W[1] / 2), r: 12, name: 'w = (2, 1), the vector that defines L' });
    const fl = mul(-1.8, W), fp = mul(-1.8, N);
    hits.push({ x: ax.X(fl[0]), y: ax.Y(fl[1]), r: 14, name: 'L, the line defined by w' });
    hits.push({ x: ax.X(fp[0]), y: ax.Y(fp[1]), r: 14, name: 'L⊥, the orthogonal complement of L: every vector orthogonal to w' });
    headline(ctx, `$\\kvecb = \\kvecbhat + \\kvecbperp$: $\\kvecbhat = ${'(' + bhs.map(num).join(', ') + ')'}$ lies on $\\kL$ and $\\kvecbperp = ${'(' + bps.map(num).join(', ') + ')'}$ on $\\kLperp$.`);
    ro.set(`\\kvecb = \\kvecbhat + \\kvecbperp:\\quad ${colOf(b)} = ${colOf(bhs)} + ${colOf(bps)}`,
      `$\\kvecbhat = \\kQ\\kQT\\kvecb = \\frac{1}{5}\\htmlClass{kv-matrix}{\\begin{bmatrix} 4 & 2 \\\\ 2 & 1 \\end{bmatrix}}\\kvecb$ with $\\kQ = \\begin{bmatrix} \\kvecu \\end{bmatrix}$, $\\kvecu = \\kvecw/|\\kvecw|$; $\\kvecbperp = \\kvecb - \\kvecbhat$ is orthogonal to $\\kL$.`);
  }
  still(d, draw);
})();

/* Figure 6.3.9 + 6.3.14: the projection onto a plane. The plane W through the origin defined by the orthogonal vectors
   w₁ = [2, 2, −1] and w₂ = [1, 0, 2] of Activity 6.3.3 b (and Example 6.3.17), drawn in region with the lattice of
   combinations i w₁ + j w₂ ruled across it; w₁ and w₂ in their referent colours. b = [3, 9, 6] (Activity 6.3.3 b) or
   [1, 0, 0] (Example 6.3.17), a choice, with its three entries on sliders; b̂ = (b·w₁)/(w₁·w₁) w₁ + (b·w₂)/(w₂·w₂) w₂,
   the walk c₁w₁ then c₂w₂ to it dashed in guide ink, and b − b̂ from b̂ to the head of b with its right-angle mark at b̂.
   The b₃ slider carries a dashed special where b lies in W (n·b = 0 for n = w₁ × w₂ = [4, −5, −2]); there b̂ = b. The
   readout is the projection formula with the live dot products; the note writes P b = QQᵀb with Example 6.3.17's matrix
   P = (1/45)[29 20 8; 20 20 −10; 8 −10 41]. Mathematical 3D (root rule 28.3): free orbit, no ground, pitch bounded to
   [−0.3, 1.45] since z reads up; box ±10 so that b = [3, 9, 6] sits inside. Labels W, w₁, w₂, b, b̂ (b's and b̂'s only while |b| > 3, where they
   clear w₁'s and w₂'s); b − b̂ and the walk are hover names. Still: no clock; a change of preset slides b to its new head over 0.9 s (an F.tween the draw reads). */
(function () {
  const d = sim('sim-projection-onto-plane');
  const box = [[-10, 10], [-10, 10], [-10, 10]];
  const S = F.space3d(d, { box, h: 680, pitch: [-0.3, 1.45], fit: 2.0, turn: 1.44, tilt: 1.0 });
  const W1 = [2, 2, -1], W2 = [1, 0, 2], N = SP.cross(W1, W2);     /* N = [4, −5, −2] */
  const PM = [[29, 20, 8], [20, 20, -10], [8, -10, 41]];            /* 45 P */
  const PRE = { act: { b: [3, 9, 6], label: 'Activity 6.3.3: b = [3, 9, 6]' }, ex: { b: [1, 0, 0], label: 'Example 6.3.17: b = [1, 0, 0]' } };
  let sl = [];
  const slide = { p: F.tween(d, 1), from: null, to: null };
  choice(d.controls, {
    label: 'b', key: 'example', value: 'act', aria: 'the vector b of Activity 6.3.3 or of Example 6.3.17',
    options: Object.entries(PRE).map(([value, e]) => ({ value, label: e.label })),
    onInput: (v) => { slide.from = sl.map((c) => c.v); slide.to = PRE[v].b; PRE[v].b.forEach((c, i) => sl[i].set(c)); slide.p.set(0); slide.p.to(1, 900); sl.forEach((c) => c.refresh && c.refresh()); },
  });
  const ent = (label, key, value, aria, specials = []) => ctl(d.controls, { label, cls: '', key, min: -9, max: 9, step: 0.5, value, unit: '', dec: 1, aria, specials });
  const s1 = ent('b_1', 'b1', 3, 'the first entry of b'), s2 = ent('b_2', 'b2', 9, 'the second entry of b');
  const s3 = ent('b_3', 'b3', 6, 'the third entry of b', [{ at: () => (4 * s1.v - 5 * s2.v) / 2, label: 'b in W' }]);
  sl = [s1, s2, s3];
  const ro = readout(d);
  const pbox = [[-8, 8], [-8, 8], [-8, 8]];         /* the patch of W drawn, inside the axes' box */
  const lattice = [];
  for (let i = -6; i <= 6; i++) { lattice.push(...SP.line(SP.mul(W2, i), W1, 'guide', { box: pbox, w: 1.2 })); lattice.push(...SP.line(SP.mul(W1, i), W2, 'guide', { box: pbox, w: 1.2 })); }

  function draw() {
    const rc = C('region'), vc = C('vector'), c1c = F.ref('w-1'), c2c = F.ref('w-2');
    const bv = [s1.v, s2.v, s3.v];
    const k = F.ease.smooth(slide.p.v), b = k < 1 && slide.from ? slide.from.map((c, i) => c + (slide.to[i] - c) * k) : bv;
    const bw1 = SP.dot(bv, W1), bw2 = SP.dot(bv, W2), c1 = bw1 / 9, c2 = bw2 / 5;
    const bh = SP.add(SP.mul(W1, c1), SP.mul(W2, c2)), bp = SP.sub(bv, bh), inW = near(SP.dot(N, bv), 0, 1e-9);
    const bhD = SP.add(SP.mul(W1, SP.dot(b, W1) / 9), SP.mul(W2, SP.dot(b, W2) / 5)), bpD = SP.sub(b, bhD);   /* as drawn, mid-slide */
    S.set('axes', SP.axes(box, { ticks: 5 }));
    S.set('plane', [...SP.plane([0, 0, 0], N, rc, { box: pbox, alpha: 0.28 }).map((m) => ({ ...m, name: 'W, the plane of all linear combinations of w₁ and w₂' })), ...lattice]);
    S.set('basis', [
      { k: 'arrow', a: [0, 0, 0], b: W1, color: c1c, w: 5, name: 'w₁ = [2, 2, −1]' },
      { k: 'label', s: '$\\kvecwone$', p: SP.add(W1, [0.6, 0.6, -0.9]), color: c1c },
      { k: 'arrow', a: [0, 0, 0], b: W2, color: c2c, w: 5, name: 'w₂ = [1, 0, 2]' },
      { k: 'label', s: '$\\kvecwtwo$', p: SP.add(W2, [0.5, -0.7, 0.9]), color: c2c },
      { k: 'label', s: '$\\kW$', p: SP.add(SP.mul(W1, -2.4), SP.mul(W2, 2.4)), color: rc },
    ]);
    const marks = [];
    const B = SP.norm(b) > 1e-9;
    if (B) marks.push({ k: 'arrow', a: [0, 0, 0], b, color: vc, w: 5, name: `b = ${vecT(bv)}` });
    const named = SP.norm(b) > 3;     /* near the origin the names of b and b̂ would sit on w₁'s and w₂'s: hover names carry them */
    if (named) marks.push({ k: 'label', s: '$\\kvecb$', p: SP.add(b, SP.mul(SP.unit(B ? b : [0, 0, 1]), 1.1)), color: vc });
    if (SP.norm(bhD) > 1e-9) marks.push({ k: 'arrow', a: [0, 0, 0], b: bhD, color: vc, w: 5, name: `b̂ = ${vecT(bh)}, the vector in W closest to b` });
    if (SP.norm(bpD) > 0.05) {
      marks.push({ k: 'line', pts: [bhD, b], color: vc, w: 4, dash: [4, 6], name: `b − b̂ = ${vecT(bp)}, orthogonal to W; its length ${numT(SP.norm(bp))} is the distance from b to W` });
      const e1 = SP.unit(bpD), e2 = SP.norm(bhD) > 1e-6 ? SP.unit(SP.mul(bhD, -1)) : SP.unit(W1), a = 1;
      marks.push({ k: 'line', pts: [SP.add(bhD, SP.mul(e1, a)), SP.add(SP.add(bhD, SP.mul(e1, a)), SP.mul(e2, a)), SP.add(bhD, SP.mul(e2, a))], color: 'ink', w: 2 });
      /* the walk c₁ w₁, then c₂ w₂, from the origin to b̂ */
      const mid = SP.mul(W1, SP.dot(b, W1) / 9);
      marks.push({ k: 'line', pts: [[0, 0, 0], mid, bhD], color: 'guide', w: 2.5, dash: [6, 6], name: `the walk ${numT(c1)} w₁, then ${numT(c2)} w₂, from the origin to b̂` });
    }
    if (named) marks.push({ k: 'label', s: '$\\kvecbhat$', p: SP.add(bhD, SP.mul(SP.unit(SP.norm(bhD) > 1e-6 ? bhD : W1), 1.1)), color: vc });
    S.set('b', marks);
    /* headline, readout */
    const combo = `${num(c1)}\\kvecwone ${c2 < 0 ? '-' : '+'} ${num(Math.abs(c2))}\\kvecwtwo`;
    if (inW) S.headline(`$\\kvecb$ lies in $\\kW$, so $\\kvecbhat = \\kvecb = ${combo}$ and $\\kvecb - \\kvecbhat = \\kveczero$.`);
    else S.headline(`$\\kvecbhat = ${combo} = ${vecK(bh)}$ is the vector in $\\kW$ closest to $\\kvecb$; $\\kvecb - \\kvecbhat = ${vecK(bp)}$ is orthogonal to $\\kW$.`);
    const frac = (a, q) => `\\frac{${num(a)}}{${q}}`;
    ro.set(`\\kvecbhat = \\frac{\\kvecb\\cdot\\kvecwone}{\\kvecwone\\cdot\\kvecwone}\\kvecwone + \\frac{\\kvecb\\cdot\\kvecwtwo}{\\kvecwtwo\\cdot\\kvecwtwo}\\kvecwtwo = ${frac(bw1, 9)}\\kvecwone + ${frac(bw2, 5)}\\kvecwtwo = ${colOf(bh)}`,
      `$\\kP\\kvecb = \\kQ\\kQT\\kvecb = \\frac{1}{45}\\htmlClass{kv-matrix}{\\begin{bmatrix} ${PM.map((r) => r.join(' & ')).join(' \\\\ ')} \\end{bmatrix}} ${colOf(bv)} = ${colOf(bh)}$, the same $\\kvecbhat$.`);
  }
  still(d, draw);
})();
};
