/* Figures for section 6.4 Finding orthogonal bases. */
window.OMNISTAX_FIGURES = window.OMNISTAX_FIGURES || {};
window.OMNISTAX_FIGURES['6.4'] = function (root, F) {
const { C, PAL, alpha, ctl, begin, axes, drag, line, arrow, dot, text, headline, register, readout, hover, arrival, ease, pinned, fmt } = F;
const SP = F.space;
const sim = (id, H) => F.sim(root, id, H);
const still = (d, draw) => register(d.fig, { update: () => {}, draw });
/* a number as the figure writes it: at most two decimals, no trailing zeros, never −0 */
const r2 = (v) => { const r = Math.round(v * 100) / 100; return Object.is(r, -0) ? 0 : r; };
const num = (v) => String(r2(v));
const numT = (v) => num(v).replace('-', '−');            /* the same in figure text, with a true minus */
const clamp01 = (k) => Math.min(1, Math.max(0, k));
const lerp = (a, b, k) => a + (b - a) * k;
const tag = (ctx, s, x, y, color, align = 'center', a = 1) => { if (!(a > 0.02)) return; ctx.save(); ctx.globalAlpha *= a; text(ctx, s, x, y, color, { size: 22, weight: 600, tex: true, bg: PAL.panel, align }); ctx.restore(); };
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (k, a) => [k * a[0], k * a[1]];
const dot2 = (a, b) => a[0] * b[0] + a[1] * b[1];
const len = (a) => Math.hypot(a[0], a[1]);
const lerp2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
const inBox = (box, x, y) => x >= box.l && x <= box.r && y >= box.t && y <= box.b;
const col2 = (p) => `\\begin{bmatrix} ${num(p[0])} \\\\ ${num(p[1])} \\end{bmatrix}`;
const pt = (v) => `(${numT(v[0])}, ${numT(v[1])})`;

/* An arrow of the plane from t to h on axes ax, clipped to its box; a head past the box is pinned at the edge. */
function vec(ctx, ax, t, h, color, w = 5, dash, a = 1) {
  if (!(a > 0.01)) return;
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
/* a segment of the plane, clipped to the box */
function seg(ctx, ax, p, q, color, w = 3, dash, a = 1) {
  if (!(a > 0.01)) return;
  const { X, Y, box } = ax;
  ctx.save(); ctx.globalAlpha *= a; ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip();
  line(ctx, X(p[0]), Y(p[1]), X(q[0]), Y(q[1]), color, w, dash);
  ctx.restore();
}
/* a right-angle mark at the corner c between the directions a and b (unit vectors of the plane), side s units */
function square(ctx, ax, c, a, b, s, color, k = 1) {
  if (!(k > 0.01)) return;
  const p = add(c, mul(s, a)), q = add(p, mul(s, b)), r = add(c, mul(s, b));
  ctx.save(); ctx.globalAlpha *= k;
  line(ctx, ax.X(p[0]), ax.Y(p[1]), ax.X(q[0]), ax.Y(q[1]), PAL.ink, 2);
  line(ctx, ax.X(q[0]), ax.Y(q[1]), ax.X(r[0]), ax.Y(r[1]), PAL.ink, 2);
  ctx.restore();
}
/* a label just past the head of the arrow t → h, along its direction */
function past(ctx, ax, t, h, s, color, a = 1, gap = 30) {
  const { X, Y, box } = ax, x1 = X(t[0]), y1 = Y(t[1]), x2 = X(h[0]), y2 = Y(h[1]), L = Math.hypot(x2 - x1, y2 - y1) || 1;
  const ux = L < 3 ? 0.6 : (x2 - x1) / L, uy = L < 3 ? -0.6 : (y2 - y1) / L;
  const lx = Math.min(Math.max(x2 + ux * gap, box.l + 40), box.r - 40), ly = Math.min(Math.max(y2 + uy * (gap - 6), box.t + 16), box.b - 16);
  tag(ctx, s, lx, ly, color, ux > 0.55 ? 'left' : ux < -0.55 ? 'right' : 'center', a);
}
/* a label beside the middle of the arrow t → h, on the side away from the point `away` */
function beside(ctx, ax, t, h, away, s, color, a = 1, f = 0.5) {
  const { X, Y, box } = ax, x1 = X(t[0]), y1 = Y(t[1]), x2 = X(h[0]), y2 = Y(h[1]);
  const mx = lerp(x1, x2, f), my = lerp(y1, y2, f), L = Math.hypot(x2 - x1, y2 - y1) || 1;
  let nx = -(y2 - y1) / L, ny = (x2 - x1) / L;
  if (L < 3) { nx = -0.7; ny = -0.7; }
  if ((mx - X(away[0])) * nx + (my - Y(away[1])) * ny < 0) { nx = -nx; ny = -ny; }
  const lx = Math.min(Math.max(mx + nx * 34, box.l + 40), box.r - 40), ly = Math.min(Math.max(my + ny * 26, box.t + 16), box.b - 16);
  tag(ctx, s, lx, ly, color, nx > 0.55 ? 'left' : nx < -0.55 ? 'right' : 'center', a);
}
/* the grip ring of a head the reader can drag */
const ring = (ctx, ax, p, color) => { const { X, Y, box } = ax, x = X(p[0]), y = Y(p[1]); if (!inBox(box, x, y)) return; ctx.save(); ctx.strokeStyle = alpha(color, 0.35); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); };
/* the plane: a faint unit grid under the axes, then the axes with integer ticks */
function plane(ctx, BOX, xr, yr) {
  const U = (BOX.r - BOX.l) / (xr[1] - xr[0]), ink = PAL.ink;
  ctx.save(); ctx.beginPath(); ctx.rect(BOX.l, BOX.t, BOX.r - BOX.l, BOX.b - BOX.t); ctx.clip();
  for (let i = xr[0]; i <= xr[1]; i++) line(ctx, BOX.l + (i - xr[0]) * U, BOX.t, BOX.l + (i - xr[0]) * U, BOX.b, alpha(ink, 0.06), 1.5);
  for (let j = yr[0]; j <= yr[1]; j++) line(ctx, BOX.l, BOX.b - (j - yr[0]) * U, BOX.r, BOX.b - (j - yr[0]) * U, alpha(ink, 0.06), 1.5);
  ctx.restore();
  return axes(ctx, BOX, xr, yr, { xl: 'x', yl: 'y', nx: xr[1] - xr[0], ny: yr[1] - yr[0], fx: (q) => fmt(q, 0), fy: (q) => fmt(q, 0) });
}

/* Figure 6.4.1: Gram-Schmidt in the plane. v₁ = [1, 1] and v₂ = [0, 2] of Preview Activity 6.4.1 with draggable
   heads, each held by two component sliders (−3 to 3, untyped). A story slider of five stops carries the transport:
   0 the basis (the book's picture); 1 w₁ = v₁ and the line W₁ it defines, drawn along its length; 2 the dashed drop
   from v₂'s head to W₁ and the shadow v̂₂ = (v₂·w₁)/(w₁·w₁) w₁ growing along the line, a right-angle mark at its foot;
   3 the segment from v̂₂ to v₂ slides to the origin and is w₂, square to w₁, while v₂ goes faint; 4 the unit circle
   draws and w₁, w₂ shrink or stretch onto it as u₁, u₂. vⱼ, v̂ⱼ, wⱼ and uⱼ wear the referent colour of their index
   (v-1, v-2); W₁ is region. v₂'s sliders carry dashed circles where v₂ lies on the line of v₁ (then w₂ = 0 and the
   two were no basis) and where v₂ is already square to v₁ (then v̂₂ = 0 and w₂ = v₂). The book's window [−3, 3]²
   at 110 units to 1; a head past it is pinned. */
(function () {
  const d = sim('sim-gram-schmidt-plane', 820);
  const BOX = { l: 370, r: 1030, t: 110, b: 770 }, XR = [-3, 3], YR = [-3, 3];
  const comp = (label, key, value, aria, specials) => ctl(d.controls, { label, cls: '', key, min: -3, max: 3, step: 0.1, value, unit: '', dec: 1, aria, specials: specials || [] });
  const big = (x) => Math.abs(x) > 1e-9;
  const v11 = comp('(\\kvecvone)_1', 'v11', 1, 'the first component of v one');
  const v12 = comp('(\\kvecvone)_2', 'v12', 1, 'the second component of v one');
  const v21 = comp('(\\kvecvtwo)_1', 'v21', 0, 'the first component of v two', [
    { at: () => (big(v12.v) ? (v11.v * v22.v) / v12.v : null), label: 'on the line of v₁' },
    { at: () => (big(v11.v) ? (-v12.v * v22.v) / v11.v : null), label: 'square to v₁' },
  ]);
  const v22 = comp('(\\kvecvtwo)_2', 'v22', 2, 'the second component of v two', [
    { at: () => (big(v11.v) ? (v12.v * v21.v) / v11.v : null), label: 'on the line of v₁' },
    { at: () => (big(v12.v) ? (-v11.v * v21.v) / v12.v : null), label: 'square to v₁' },
  ]);
  const step = ctl(d.controls, { label: 'step', cls: '', key: 'step', min: 0, max: 4, step: 0.01, value: 0, unit: '', dec: 2, aria: 'the step of Gram-Schmidt orthogonalization' });
  F.story(d, step, { stops: [
    { v: 0, label: 'v₁, v₂' }, { v: 1, label: 'w₁' }, { v: 2, label: 'v̂₂' }, { v: 3, label: 'w₂' }, { v: 4, label: 'u₁, u₂' },
  ], ms: 1300, rest: 1100 });
  const P1 = drag(d, { x: v11, y: v12 }), P2 = drag(d, { x: v21, y: v22 });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);

  function draw() {
    const { ctx } = begin(d.c);
    const c1 = F.ref('v-1'), c2 = F.ref('v-2'), rc = C('region'), ink = PAL.ink;
    const g = ease.smooth(arrival(d)), s = step.v;
    const k = [1, 2, 3, 4].map((i) => ease.smooth(clamp01(s - (i - 1))));
    const [k1, k2, k3, k4] = k;
    const v1 = [v11.v, v12.v], v2 = [v21.v, v22.v];
    const n1 = len(v1), ok1 = n1 > 0.05;
    const u1d = ok1 ? mul(1 / n1, v1) : [1, 0];
    const c = ok1 ? dot2(v2, v1) / dot2(v1, v1) : 0, h2 = mul(c, v1), w2 = sub(v2, h2), n2 = len(w2), ok2 = n2 > 0.02;
    const u1 = ok1 ? u1d : [0, 0], u2 = ok2 ? mul(1 / n2, w2) : [0, 0];
    hits = [];
    const ax = plane(ctx, BOX, XR, YR);
    ctx.save(); ctx.globalAlpha *= g;
    /* 4: the unit circle, drawn along its length */
    if (k4 > 0.01) {
      ctx.save(); ctx.beginPath(); ctx.strokeStyle = alpha(ink, 0.45); ctx.lineWidth = 2.5; ctx.setLineDash([8, 7]);
      const R = ax.X(1) - ax.X(0);
      ctx.arc(ax.X(0), ax.Y(0), R, 0, -2 * Math.PI * k4, true); ctx.stroke(); ctx.restore();
      hits.push({ x: ax.X(-0.71), y: ax.Y(-0.71), r: 14, name: 'the unit circle: every vector of length 1 has its head on it' });
    }
    /* 1: the line W₁ that w₁ defines, drawn out from the origin both ways */
    if (ok1 && k1 > 0.01) {
      seg(ctx, ax, mul(-9 * k1, u1d), mul(9 * k1, u1d), alpha(rc, 0.8), 4);
      const e = mul(Math.min(2.7, 2.7 / Math.max(Math.abs(u1d[0]), Math.abs(u1d[1])) * 0.95), u1d);
      const far = dot2(v2, u1d) > 0 ? mul(-1, e) : e;   /* the end of the line away from v₂ */
      tag(ctx, '$\\kWone$', ax.X(far[0]) + (far[1] * u1d[0] > 0 ? 28 : -28) * Math.sign(u1d[1] || 1), ax.Y(far[1]) - 4, rc, 'center', k1 > 0.6 ? 1 : 0);
      hits.push({ x: ax.X(far[0]), y: ax.Y(far[1]), r: 16, name: 'W₁, the line defined by w₁: every multiple of w₁' });
    }
    /* 2: the drop from v₂'s head to W₁, and the shadow v̂₂ growing along it */
    if (ok1 && k2 > 0.01) {
      const foot = lerp2(v2, h2, k2);
      seg(ctx, ax, v2, foot, alpha(ink, 0.55), 2.5, [8, 7], 1 - 0.7 * k3);
      vec(ctx, ax, [0, 0], mul(k2, h2), c2, 4, [12, 8], 1 - 0.6 * k3);
      if (ok2 && Math.abs(c) > 0.02) square(ctx, ax, h2, mul(-Math.sign(c), u1d), mul(1 / n2, w2), 0.17, ink, clamp01((k2 - 0.85) / 0.15) * (1 - k3));
      hits.push({ x: ax.X(h2[0] / 2), y: ax.Y(h2[1] / 2), r: 14, name: `v̂₂ = ${pt(h2)}, the orthogonal projection of v₂ onto W₁` });
    }
    /* 3: v₂ − v̂₂ slides to the origin and is w₂ */
    const tailW = lerp2(h2, [0, 0], k3), headW = add(tailW, lerp2(w2, u2, k4));
    if (ok1 && k3 > 0.01) {
      if (k4 > 0.01) vec(ctx, ax, [0, 0], w2, c2, 3, undefined, 0.3 * k4);
      vec(ctx, ax, tailW, headW, c2, 5, undefined, Math.min(1, k3 * 4));
      if (ok2) square(ctx, ax, [0, 0], u1d, mul(1 / n2, w2), 0.17, ink, clamp01((k3 - 0.85) / 0.15));
      hits.push({ x: ax.X((tailW[0] + headW[0]) / 2), y: ax.Y((tailW[1] + headW[1]) / 2), r: 14, name: k4 > 0.5 ? `u₂ = ${pt(u2)}, w₂ scaled to length 1` : `w₂ = v₂ − v̂₂ = ${pt(w2)}, orthogonal to w₁` });
    }
    /* v₂, faint once w₂ stands */
    vec(ctx, ax, [0, 0], v2, c2, 5, undefined, 1 - 0.65 * k3);
    /* v₁ = w₁, shrinking or stretching onto the unit circle at the last step */
    if (k4 > 0.01 && ok1) vec(ctx, ax, [0, 0], v1, c1, 3, undefined, 0.3 * k4);
    const head1 = lerp2(v1, ok1 ? u1 : v1, k4);
    vec(ctx, ax, [0, 0], head1, c1, 5);
    dot(ctx, ax.X(0), ax.Y(0), ink, true, 5);
    P1.draw(ctx, ax, alpha(c1, 0)); ring(ctx, ax, v1, c1);
    P2.draw(ctx, ax, alpha(c2, 0)); ring(ctx, ax, v2, c2);
    ctx.restore();
    /* labels */
    if (g > 0.99) {
      const n1lab = s < 0.5 ? '$\\kvecvone$' : s < 3.5 ? '$\\kvecwone = \\kvecvone$' : '$\\kvecuone$';
      past(ctx, ax, [0, 0], head1, n1lab, c1);
      past(ctx, ax, [0, 0], v2, '$\\kvecvtwo$', c2, 1 - 0.5 * k3);
      if (ok1 && k2 > 0.5 && s < 2.6 && Math.abs(c) > 0.05) beside(ctx, ax, [0, 0], h2, v2, '$\\kvecvtwohat$', c2, 1, 0.45);
      if (ok1 && s >= 2.6) {
        const lab = s < 3.5 ? (ok2 ? '$\\kvecwtwo$' : '$\\kvecwtwo = \\kveczero$') : (ok2 ? '$\\kvecutwo$' : '$\\kvecwtwo = \\kveczero$');
        if (ok2) beside(ctx, ax, tailW, headW, v1, lab, c2);
        else tag(ctx, lab, ax.X(h2[0]) - 30, ax.Y(h2[1]) + 30, c2, 'right');
      }
    }
    hits.push({ x: ax.X(v1[0]), y: ax.Y(v1[1]), r: 20, name: `v₁ = ${pt(v1)}${s >= 0.5 ? ' = w₁' : ''}; drag its head` });
    hits.push({ x: ax.X(v2[0]), y: ax.Y(v2[1]), r: 20, name: `v₂ = ${pt(v2)}; drag its head` });
    if (k4 > 0.5 && ok1) hits.push({ x: ax.X(u1[0]), y: ax.Y(u1[1]), r: 14, name: `u₁ = ${pt(u1)}, w₁ scaled to length 1` });
    /* headline and readout, by the stop reached */
    const j = Math.min(4, Math.floor(s + 1e-6));
    const d12 = dot2(v1, v2), d11 = dot2(v1, v1);
    let h, tex, note = '';
    if (!ok1) {
      h = '$\\kvecvone = \\kveczero$ defines no line: the zero vector is in no basis, and Gram-Schmidt has nothing to project onto.';
      tex = `\\kvecvone = ${col2(v1)}`;
    } else if (j === 0) {
      h = Math.abs(d12) < 1e-9 ? '$\\kvecvone$ and $\\kvecvtwo$ are already orthogonal: Gram-Schmidt will leave them as they are.' : 'The basis $\\kvecvone$, $\\kvecvtwo$ is not orthogonal: Gram-Schmidt keeps $\\kvecvone$ and straightens $\\kvecvtwo$ against it.';
      tex = `\\kvecvone\\cdot\\kvecvtwo = (${num(v1[0])})(${num(v2[0])}) + (${num(v1[1])})(${num(v2[1])}) = ${num(d12)}`;
      note = Math.abs(d12) < 1e-9 ? 'The dot product is 0, so the two are orthogonal already.' : 'The dot product is not 0, so the two are not orthogonal.';
    } else if (j === 1) {
      h = 'The first vector is kept as it is, $\\kvecwone = \\kvecvone$; it defines the line $\\kWone$.';
      tex = `\\kvecwone = \\kvecvone = ${col2(v1)}`;
    } else if (j === 2) {
      h = `The shadow of $\\kvecvtwo$ on $\\kWone$ is its orthogonal projection $\\kvecvtwohat = ${r2(c) === 0 ? '\\kveczero' : (r2(c) === 1 ? '' : r2(c) === -1 ? '-' : num(c)) + '\\kvecwone'}$.`;
      tex = `\\kvecvtwohat = \\frac{\\kvecvtwo\\cdot\\kvecwone}{\\kvecwone\\cdot\\kvecwone}\\kvecwone = \\frac{${num(d12)}}{${num(d11)}}${col2(v1)} = ${col2(h2)}`;
    } else if (j === 3) {
      h = ok2 ? 'What is left of $\\kvecvtwo$ after its shadow is taken away, $\\kvecwtwo = \\kvecvtwo - \\kvecvtwohat$, is orthogonal to $\\kvecwone$.'
        : '$\\kvecvtwo$ lies on the line of $\\kvecvone$, so nothing is left: $\\kvecwtwo = \\kveczero$, and $\\kvecvone$, $\\kvecvtwo$ were never a basis.';
      tex = `\\kvecwtwo = \\kvecvtwo - \\kvecvtwohat = ${col2(v2)} - ${col2(h2)} = ${col2(w2)}`;
      note = ok2 ? `$\\kvecwtwo\\cdot\\kvecwone = 0$: $\\kvecwone$, $\\kvecwtwo$ is an orthogonal basis for ℝ².` : '';
    } else {
      h = ok2 ? 'Scaling each to length $1$ puts $\\kvecuone$ and $\\kvecutwo$ on the unit circle: an orthonormal basis.'
        : 'The zero vector $\\kvecwtwo$ cannot be scaled to length $1$: the algorithm fails on a dependent pair.';
      tex = ok2 ? `\\kvecuone = \\frac{1}{|\\kvecwone|}\\kvecwone = ${col2(u1)}, \\qquad \\kvecutwo = \\frac{1}{|\\kvecwtwo|}\\kvecwtwo = ${col2(u2)}`
        : `\\kvecuone = \\frac{1}{|\\kvecwone|}\\kvecwone = ${col2(u1)}`;
      note = ok2 ? `$|\\kvecwone| = ${num(n1)}$, $|\\kvecwtwo| = ${num(n2)}$.` : '';
    }
    headline(ctx, h);
    ro.set(tex, note, { form: `${ok1 ? j : 'zero'}${ok2 ? '' : '-dep'}` });
  }
  still(d, draw);
})();

/* Figure 6.4.3: Gram-Schmidt in space on Example 6.4.4's basis v₁ = [2, −1, 2], v₂ = [−3, 3, 0], v₃ = [−2, 7, 1].
   A story slider of eight stops: 0 the book's picture, the plane W spanned by Example 6.4.4's w₁ = [2, −1, 2] and
   w₂ = [−1, 2, 2], b = v₃, its projection b̂ = −w₁ + 2w₂ = [−4, 5, 2] in the plane and b − b̂ = [2, 2, −1] square to
   it; 1 the basis v₁, v₂, v₃ (the plane and b̂ fade, w₁ is relabelled v₁, w₂ fades out as v₂ grows, b takes v₃'s
   colour: the same arrow); 2 w₁ = v₁ and the line W₁; 3 the drop from v₂ to W₁ and v̂₂ = −w₁; 4 v₂ − v̂₂ slides to
   the origin as w₂ and the plane W₂ = Span{w₁, w₂} fills in; 5 the drop from v₃ to W₂ and v̂₃ = −w₁ + 2w₂ (the book's
   picture again, as a step); 6 v₃ − v̂₃ slides to the origin as w₃, rising out of the plane; 7 each wⱼ shrinks to
   uⱼ = wⱼ/3. The readout writes each step's equation with the numbers and its note fills in R of A = QR an entry
   per step (Example 6.4.6). vⱼ, v̂ⱼ, wⱼ, uⱼ wear their index's referent colour; b, b̂ vector; W₁, W₂ region.
   Mathematical 3D (root 28.3): free orbit, no ground, no buttons; box x −5…5, y −4…8, z −3…4. */
(function () {
  const d = sim('sim-gram-schmidt-space');
  const box = [[-5, 5], [-4, 8], [-3, 4]];
  const S = F.space3d(d, { box, h: 660, fit: 2.9, turn: -1.75, tilt: 0.5 });
  const step = ctl(d.controls, { label: 'step', cls: '', key: 'step', min: 0, max: 7, step: 0.01, value: 0, unit: '', dec: 2, aria: 'the step of Gram-Schmidt orthogonalization in space' });
  F.story(d, step, { stops: [
    { v: 0, label: 'b − b̂ ⊥ W' }, { v: 1, label: 'v₁, v₂, v₃' }, { v: 2, label: 'w₁' }, { v: 3, label: 'v̂₂' },
    { v: 4, label: 'w₂' }, { v: 5, label: 'v̂₃' }, { v: 6, label: 'w₃' }, { v: 7, label: 'u₁, u₂, u₃' },
  ], ms: 1400, rest: 1200 });
  const ro = readout(d);
  const O = [0, 0, 0];
  const V1 = [2, -1, 2], V2 = [-3, 3, 0], V3 = [-2, 7, 1];
  const W1 = V1, H2 = SP.mul(W1, -1), W2 = SP.sub(V2, H2);                       /* v̂₂ = (−9/9) w₁ */
  const H3 = SP.add(SP.mul(W1, -1), SP.mul(W2, 2)), W3 = SP.sub(V3, H3);          /* v̂₃ = −w₁ + 2w₂ */
  const U = [W1, W2, W3].map((w) => SP.mul(w, 1 / 3));                             /* |wⱼ| = 3 */
  const N = SP.unit(W3);                                                            /* the normal of W₂ */
  const lerp3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  const vecT = (p) => `[${p.map(numT).join(', ')}]`;
  const colT = (p) => `\\begin{bmatrix} ${p.map(num).join(' \\\\ ')} \\end{bmatrix}`;
  /* a right-angle mark at c between the unit directions a and b, s units a side */
  const corner = (c, a, b, s, col) => ({ k: 'line', pts: [SP.add(c, SP.mul(a, s)), SP.add(SP.add(c, SP.mul(a, s)), SP.mul(b, s)), SP.add(c, SP.mul(b, s))], color: col, w: 2.5 });
  const lab = (s, p, a = 1) => (a > 0.5 ? [{ k: 'label', s, p }] : []);
  /* R of A = QR as it fills in: entry (i, j) is known from the stop at which it is read off */
  const RV = [[3, -3, -3], [0, 3, 6], [0, 0, 3]], RAT = [[2, 3, 5], [0, 4, 5], [0, 0, 6]];

  function draw() {
    const s = step.v, rc = C('region'), vc = C('vector');
    const cr = [F.ref('v-1'), F.ref('v-2'), F.ref('v-3')];
    const kk = (i) => F.ease.smooth(clamp01(s - (i - 1)));
    const [k1, k2, k3, k4, k5, k6, k7] = [1, 2, 3, 4, 5, 6, 7].map(kk);
    const fade = (c, a) => alpha(c, clamp01(a));
    S.set('axes', SP.axes(box, { ticks: 2 }));
    /* the plane: W at the opening picture, gone at the basis, back as W₂ once w₂ stands */
    const aPlane = Math.max(1 - k1, clamp01((s - 3.5) / 0.5));
    const lattice = [];
    if (aPlane > 0.02) for (let i = -3; i <= 3; i++) {
      lattice.push(...SP.line(SP.mul(W2, i), W1, fade(PAL.ink, 0.22 * aPlane), { box, w: 1.5 }));
      lattice.push(...SP.line(SP.mul(W1, i), W2, fade(PAL.ink, 0.22 * aPlane), { box, w: 1.5 }));
    }
    const planeName = s < 1 ? 'the plane W spanned by w₁ and w₂' : 'the plane W₂ = Span{w₁, w₂} = Span{v₁, v₂}';
    S.set('plane', aPlane > 0.02 ? [
      ...SP.plane(O, N, rc, { box, alpha: 0.3 * aPlane }).map((m) => (m.k === 'faces' ? { ...m, name: planeName } : { ...m, color: fade(rc, aPlane) })),
      ...lattice,
      ...lab(s < 1 ? '$\\kW$' : '$\\kWtwo$', SP.add(SP.mul(W1, 1.9), SP.mul(W2, -1.1)), aPlane),
    ] : []);
    /* the line W₁, from w₁ on */
    const aLine = s < 1 ? 0 : k2;
    /* drawn out from the origin both ways along its stretch inside the box */
    const ends = SP.line(O, SP.unit(W1), rc, { box })[0]?.pts;
    S.set('line', aLine > 0.02 && ends ? [
      { k: 'line', pts: [lerp3(O, ends[0], aLine), lerp3(O, ends[1], aLine)], color: fade(rc, 0.85), w: 4, name: 'W₁, the line defined by w₁' },
      ...lab('$\\kWone$', lerp3(O, SP.dot(ends[0], W1) < 0 ? ends[0] : ends[1], 0.85), aLine),
    ] : []);
    /* the opening picture: b, b̂ and b − b̂ */
    const op = [];
    const aOpen = 1 - k1;
    if (aOpen > 0.02) {
      op.push({ k: 'arrow', a: O, b: H3, color: fade(vc, aOpen), w: 5, name: `b̂ = ${vecT(H3)}, the orthogonal projection of b onto W` });
      op.push({ k: 'arrow', a: H3, b: V3, color: fade(vc, aOpen), w: 3.5, name: `b − b̂ = ${vecT(W3)}, orthogonal to W` });
      op.push({ k: 'line', pts: [H3, V3], color: fade(PAL.ink, 0.5 * aOpen), w: 2, dash: [5, 7] });
      op.push(corner(H3, SP.unit(SP.mul(H3, -1)), N, 0.5, fade(PAL.ink, aOpen)));
      op.push(...lab('$\\kvecbhat$', SP.add(SP.mul(H3, 0.55), [0, 0, -0.7]), aOpen));
      op.push(...lab('$\\kvecb - \\kvecbhat$', SP.add(SP.mul(SP.add(H3, V3), 0.5), [0.9, 0.2, 0]), aOpen));
    }
    S.set('open', op);
    /* v₁ = w₁, shrinking to u₁ at the end */
    const a1 = [];
    const head1 = lerp3(W1, U[0], k7);
    if (k7 > 0.02) a1.push({ k: 'arrow', a: O, b: W1, color: fade(cr[0], 0.3 * k7), w: 3 });
    a1.push({ k: 'arrow', a: O, b: head1, color: cr[0], w: 5, name: k7 > 0.5 ? `u₁ = w₁/3 = ${vecT(U[0])}` : s < 1 ? `w₁ = ${vecT(W1)}` : s < 1.5 ? `v₁ = ${vecT(V1)}` : `w₁ = v₁ = ${vecT(W1)}` });
    a1.push(...lab(s < 0.5 ? '$\\kvecwone$' : s < 1.5 ? '$\\kvecvone$' : s < 6.5 ? '$\\kvecwone = \\kvecvone$' : '$\\kvecuone$', SP.add(head1, SP.mul(SP.unit(W1), 0.8))));
    S.set('one', a1);
    /* index 2: w₂ of the opening picture fading as v₂ grows; the drop and v̂₂; w₂ sliding home; u₂ */
    const a2 = [];
    if (aOpen > 0.02) a2.push({ k: 'arrow', a: O, b: W2, color: fade(cr[1], aOpen), w: 5, name: `w₂ = ${vecT(W2)}` }, ...lab('$\\kvecwtwo$', SP.add(W2, [0, 0.3, 0.6]), aOpen));
    const aV2 = s < 1 ? k1 : 1 - 0.65 * k4;
    if (aV2 > 0.02) a2.push({ k: 'arrow', a: O, b: SP.mul(V2, s < 1 ? k1 : 1), color: fade(cr[1], aV2), w: 5, name: `v₂ = ${vecT(V2)}` }, ...lab('$\\kvecvtwo$', SP.add(V2, [-0.5, 0.4, 0.3]), aV2));
    if (k3 > 0.02) {
      const aDrop = 1 - 0.7 * k4;
      a2.push({ k: 'line', pts: [V2, lerp3(V2, H2, k3)], color: fade(PAL.ink, 0.55 * aDrop), w: 2.5, dash: [6, 7] });
      a2.push({ k: 'arrow', a: O, b: SP.mul(H2, k3), color: fade(cr[1], 0.75 * aDrop), w: 3.5, name: `v̂₂ = −w₁ = ${vecT(H2)}, the orthogonal projection of v₂ onto W₁` });
      if (k3 > 0.85 && aDrop > 0.3) a2.push(corner(H2, SP.unit(SP.mul(H2, -1)), SP.unit(W2), 0.45, fade(PAL.ink, aDrop)));
      if (s < 3.6) a2.push(...lab('$\\kvecvtwohat$', SP.add(SP.mul(H2, 0.6), [0, -0.4, -0.6]), k3));
    }
    if (k4 > 0.02) {
      const tail = lerp3(H2, O, k4), head = SP.add(tail, lerp3(W2, U[1], k7));
      if (k7 > 0.02) a2.push({ k: 'arrow', a: O, b: W2, color: fade(cr[1], 0.3 * k7), w: 3 });
      a2.push({ k: 'arrow', a: tail, b: head, color: fade(cr[1], Math.min(1, 4 * k4)), w: 5, name: k7 > 0.5 ? `u₂ = w₂/3 = ${vecT(U[1])}` : `w₂ = v₂ − v̂₂ = ${vecT(W2)}, orthogonal to w₁` });
      if (k4 > 0.9) a2.push(corner(O, SP.unit(W1), SP.unit(W2), 0.5, fade(PAL.ink, 1 - k7)));
      a2.push(...lab(k7 > 0.5 ? '$\\kvecutwo$' : '$\\kvecwtwo$', SP.add(head, SP.mul(SP.unit(W2), 0.7)), k4));
    }
    S.set('two', a2);
    /* index 3: b becoming v₃; the drop to W₂ and v̂₃; w₃ rising out of the plane; u₃ */
    const a3 = [];
    const c3 = F.mixColor(vc, cr[2], k1), aV3 = 1 - 0.65 * k6;
    a3.push({ k: 'arrow', a: O, b: V3, color: fade(c3, aV3), w: 5, name: s < 0.5 ? `b = ${vecT(V3)}, not in W` : `v₃ = ${vecT(V3)}` });
    a3.push(...lab(s < 0.5 ? '$\\kvecb$' : '$\\kvecvthree$', SP.add(V3, [0.3, 0.6, 0.4]), aV3));
    if (k5 > 0.02) {
      const aDrop = 1 - 0.7 * k6;
      a3.push({ k: 'line', pts: [V3, lerp3(V3, H3, k5)], color: fade(PAL.ink, 0.55 * aDrop), w: 2.5, dash: [6, 7] });
      a3.push({ k: 'arrow', a: O, b: SP.mul(H3, k5), color: fade(cr[2], 0.75 * aDrop), w: 3.5, name: `v̂₃ = −w₁ + 2w₂ = ${vecT(H3)}, the orthogonal projection of v₃ onto W₂` });
      if (k5 > 0.85 && aDrop > 0.3) a3.push(corner(H3, SP.unit(SP.mul(H3, -1)), N, 0.5, fade(PAL.ink, aDrop)));
      if (s < 5.6) a3.push(...lab('$\\kvecvthreehat$', SP.add(SP.mul(H3, 0.55), [0, 0, -0.7]), k5));
    }
    if (k6 > 0.02) {
      const tail = lerp3(H3, O, k6), head = SP.add(tail, lerp3(W3, U[2], k7));
      if (k7 > 0.02) a3.push({ k: 'arrow', a: O, b: W3, color: fade(cr[2], 0.3 * k7), w: 3 });
      a3.push({ k: 'arrow', a: tail, b: head, color: fade(cr[2], Math.min(1, 4 * k6)), w: 5, name: k7 > 0.5 ? `u₃ = w₃/3 = ${vecT(U[2])}` : `w₃ = v₃ − v̂₃ = ${vecT(W3)}, orthogonal to W₂` });
      if (k6 > 0.9) a3.push(corner(O, SP.unit(W1), N, 0.5, fade(PAL.ink, 1 - k7)));
      a3.push(...lab(k7 > 0.5 ? '$\\kvecuthree$' : '$\\kvecwthree$', SP.add(head, SP.mul(N, 0.7)), k6));
    }
    S.set('three', a3);
    /* headline and readout, by the stop reached */
    const j = Math.min(7, Math.floor(s + 1e-6));
    const Rt = (stop) => `\\kR = \\begin{bmatrix} ${RV.map((row, i) => row.map((v, c) => (i > c ? '0' : RAT[i][c] <= stop ? num(v) : '\\cdot')).join(' & ')).join(' \\\\ ')} \\end{bmatrix}`;
    const heads = [
      'If $\\kvecbhat$ is the orthogonal projection of $\\kvecb$ onto the plane $\\kW$, then $\\kvecb - \\kvecbhat$ is orthogonal to $\\kW$.',
      'Example 6.4.4\'s basis $\\kvecvone$, $\\kvecvtwo$, $\\kvecvthree$ of ${\\mathbb R}^3$ is not orthogonal: $\\kvecvone\\cdot\\kvecvtwo = -9$.',
      'The first vector is kept, $\\kvecwone = \\kvecvone$; it defines the line $\\kWone$.',
      'The shadow of $\\kvecvtwo$ on the line $\\kWone$ is its orthogonal projection $\\kvecvtwohat = -\\kvecwone$.',
      'What is left, $\\kvecwtwo = \\kvecvtwo - \\kvecvtwohat$, is orthogonal to $\\kvecwone$, and $\\kWtwo = \\kSpan\\{\\kvecwone, \\kvecwtwo\\}$ is the plane of $\\kvecvone$ and $\\kvecvtwo$.',
      'The shadow of $\\kvecvthree$ on the plane $\\kWtwo$ is its orthogonal projection $\\kvecvthreehat = -\\kvecwone + 2\\kvecwtwo$: the opening picture, with $\\kvecb = \\kvecvthree$.',
      'What is left, $\\kvecwthree = \\kvecvthree - \\kvecvthreehat$, stands square to the plane $\\kWtwo$: $\\kvecwone$, $\\kvecwtwo$, $\\kvecwthree$ is an orthogonal basis.',
      'Each $\\kvecwj$ scaled to length $1$ gives an orthonormal basis; with $\\kQ = \\begin{bmatrix} \\kvecuone & \\kvecutwo & \\kvecuthree \\end{bmatrix}$, $\\kA = \\kQ\\kR$.',
    ];
    const texs = [
      `(\\kvecb - \\kvecbhat)\\cdot\\kvecwone = ${colT(W3)}\\cdot${colT(W1)} = 0, \\qquad (\\kvecb - \\kvecbhat)\\cdot\\kvecwtwo = ${colT(W3)}\\cdot${colT(W2)} = 0`,
      `\\kvecvone = ${colT(V1)}, \\quad \\kvecvtwo = ${colT(V2)}, \\quad \\kvecvthree = ${colT(V3)}`,
      `\\kvecwone = \\kvecvone = ${colT(W1)}, \\qquad |\\kvecwone| = 3`,
      `\\kvecvtwohat = \\frac{\\kvecvtwo\\cdot\\kvecwone}{\\kvecwone\\cdot\\kvecwone}\\kvecwone = \\frac{-9}{9}\\kvecwone = ${colT(H2)}`,
      `\\kvecwtwo = \\kvecvtwo - \\kvecvtwohat = \\kvecvtwo + \\kvecwone = ${colT(W2)}, \\qquad \\kvecwtwo\\cdot\\kvecwone = 0`,
      `\\kvecvthreehat = \\frac{\\kvecvthree\\cdot\\kvecwone}{\\kvecwone\\cdot\\kvecwone}\\kvecwone + \\frac{\\kvecvthree\\cdot\\kvecwtwo}{\\kvecwtwo\\cdot\\kvecwtwo}\\kvecwtwo = \\frac{-9}{9}\\kvecwone + \\frac{18}{9}\\kvecwtwo = ${colT(H3)}`,
      `\\kvecwthree = \\kvecvthree - \\kvecvthreehat = \\kvecvthree + \\kvecwone - 2\\kvecwtwo = ${colT(W3)}, \\qquad \\kvecwthree\\cdot\\kvecwone = \\kvecwthree\\cdot\\kvecwtwo = 0`,
      `\\kA = \\begin{bmatrix} 2 & -3 & -2 \\\\ -1 & 3 & 7 \\\\ 2 & 0 & 1 \\end{bmatrix} = \\frac{1}{3}\\begin{bmatrix} 2 & -1 & 2 \\\\ -1 & 2 & 2 \\\\ 2 & 2 & -1 \\end{bmatrix} \\begin{bmatrix} 3 & -3 & -3 \\\\ 0 & 3 & 6 \\\\ 0 & 0 & 3 \\end{bmatrix} = \\kQ\\kR`,
    ];
    const notes = [
      '$\\kvecbhat = -\\kvecwone + 2\\kvecwtwo$ lies in $\\kW$; $\\kvecb - \\kvecbhat$ is orthogonal to both vectors that span it.',
      'Gram-Schmidt will build an orthogonal basis with the same spans, one vector at a time.',
      `$${Rt(2)}$: $\\kvecvone = 3\\kvecuone$ fills its first column.`,
      `$${Rt(3)}$: $\\kvecvtwo\\cdot\\kvecuone = -3$ is read off.`,
      `$${Rt(4)}$: $\\kvecvtwo = -3\\kvecuone + 3\\kvecutwo$.`,
      `$${Rt(5)}$: $\\kvecvthree\\cdot\\kvecuone = -3$, $\\kvecvthree\\cdot\\kvecutwo = 6$.`,
      `$${Rt(6)}$: $\\kvecvthree = -3\\kvecuone + 6\\kvecutwo + 3\\kvecuthree$.`,
      'The $j$th column of $\\kR$ holds the weights that write the $j$th column of $\\kA$ in $\\kvecuone, \\ldots, \\kvecuj$, so $\\kR$ is upper triangular.',
    ];
    S.headline(heads[j]);
    ro.set(texs[j], notes[j], { form: String(j) });
  }
  still(d, draw);
})();
};
