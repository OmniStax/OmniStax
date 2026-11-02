/* Figures for section 2.3 The span of a set of vectors. */
window.OMNISTAX_FIGURES = window.OMNISTAX_FIGURES || {};
window.OMNISTAX_FIGURES['2.3'] = function (root, F) {
const { C, PAL, alpha, ctl, choice, begin, axes, line, arrow, dot, text, headline, register, readout, hover, ease, fmt, arrival, pinned } = F;
const SP = F.space;
const sim = (id, H) => F.sim(root, id, H);
const still = (d, draw) => register(d.fig, { update: () => {}, draw });
/* a number as the figure writes it: at most two decimals, no trailing zeros, never −0 */
const r2 = (v) => { const r = Math.round(v * 100) / 100; return Object.is(r, -0) ? 0 : r; };
const num = (v) => String(r2(v));
const numT = (v) => num(v).replace('-', '−');   /* the same in figure text, with a true minus */
const par = (v) => (r2(v) < 0 ? `(${num(v)})` : num(v));
const lerp = (a, b, k) => a + (b - a) * k;
const col2 = (p) => `\\begin{bmatrix} ${num(p[0])} \\\\ ${num(p[1])} \\end{bmatrix}`;
const pt2 = (p) => `[${num(p[0])}, ${num(p[1])}]`;
const pt2T = (p) => `[${numT(p[0])}, ${numT(p[1])}]`;
/* c as a coefficient: 1 and −1 unwritten, as the book writes them */
const coef = (c, sym) => (r2(c) === 1 ? sym : r2(c) === -1 ? `-${sym}` : `${num(c)}${sym}`);
/* cv + dw as the book writes it: a zero term left out, the zero vector when both are */
function combTex(c, dd) {
  const terms = [];
  if (r2(c) !== 0) terms.push(coef(c, '\\kvecv'));
  if (r2(dd) !== 0) terms.push(terms.length ? `${dd < 0 ? '-' : '+'} ${coef(Math.abs(dd), '\\kvecw')}` : coef(dd, '\\kvecw'));
  return terms.length ? terms.join(' ') : '\\kveczero';
}

/* ---------- the plane figures: v, w and the sweep of their combinations ----------
   One drawing serves Figures 2.3.3 + 2.3.4, 2.3.6 and 2.3.8: the author's window, x and y from −4 to 4,
   80 units to 1, the box centred on the canvas. The weights c and d are sliders; the combination
   cv + dw is walked tip to tail (c along v in a faint copy of v, then d along w, dashed) and drawn as
   one arrow from the origin, its head pinned at the edge when it leaves the window. The span is drawn
   under everything in `region`: the line through v when w is a multiple of v, a faint tint over the
   whole window when it is not, with the lattice of combinations i·v + j·w in ink as the book draws it.
   Every head the sliders visit leaves a dot, so the tips sweep out the span as the reader runs them
   (the sweep clears when the pair changes). The targets the text asks about are hollow dots, named on
   hover with whether they are in the span. Still: a vector has no clock. */
const U = 80, OX = 700, OY = 420, BOX = { l: OX - 4 * U, r: OX + 4 * U, t: OY - 4 * U, b: OY + 4 * U };
const det = (v, w) => v[0] * w[1] - v[1] * w[0];
const parallel = (v, w) => Math.abs(det(v, w)) < 1e-9;
/* whether b is a combination of v and w, and the weights where they are unique */
function solve(v, w, b) {
  const D = det(v, w);
  if (Math.abs(D) > 1e-9) return { ok: true, c: (b[0] * w[1] - b[1] * w[0]) / D, d: (v[0] * b[1] - v[1] * b[0]) / D };
  const base = Math.hypot(v[0], v[1]) > 1e-9 ? v : w;
  if (Math.hypot(base[0], base[1]) < 1e-9) return { ok: Math.hypot(b[0], b[1]) < 1e-9 };
  return { ok: Math.abs(det(base, b)) < 1e-9 };
}
/* an arrow of the plane from t to h, clipped to the box, its head pinned at the edge when it is out */
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
/* the line through the origin along v, across the box */
function throughOrigin(ctx, ax, v, color, w, a = 1) {
  const L = Math.hypot(v[0], v[1]); if (!(L > 1e-9)) return;
  const ux = v[0] / L, uy = v[1] / L;
  ctx.save(); ctx.globalAlpha *= a; ctx.beginPath(); ctx.rect(BOX.l, BOX.t, BOX.r - BOX.l, BOX.b - BOX.t); ctx.clip();
  line(ctx, ax.X(-12 * ux), ax.Y(-12 * uy), ax.X(12 * ux), ax.Y(12 * uy), color, w);
  ctx.restore();
}
/* the lattice i·v + t·w and i·w + t·v, in ink, clipped to the box */
function lattice(ctx, ax, v, w, a) {
  if (!(a > 0.01) || parallel(v, w)) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.beginPath(); ctx.rect(BOX.l, BOX.t, BOX.r - BOX.l, BOX.b - BOX.t); ctx.clip();
  const c = alpha(PAL.ink, 0.22);
  for (let i = -8; i <= 8; i++) {
    line(ctx, ax.X(i * v[0] - 12 * w[0]), ax.Y(i * v[1] - 12 * w[1]), ax.X(i * v[0] + 12 * w[0]), ax.Y(i * v[1] + 12 * w[1]), c, 1.2);
    line(ctx, ax.X(i * w[0] - 12 * v[0]), ax.Y(i * w[1] - 12 * v[1]), ax.X(i * w[0] + 12 * v[0]), ax.Y(i * w[1] + 12 * v[1]), c, 1.2);
  }
  ctx.restore();
}
const tag = (ctx, s, x, y, color, align = 'center') => text(ctx, s, x, y, color, { size: 22, weight: 600, tex: true, bg: PAL.panel, align });
/* a label at the head h of an arrow from the origin, on the side away from `other` */
function headLabel(ctx, ax, h, other, s, color) {
  const { X, Y, box } = ax, x0 = X(0), y0 = Y(0), hx = X(h[0]), hy = Y(h[1]), L = Math.hypot(hx - x0, hy - y0);
  if (!(L > 3)) { tag(ctx, s, x0 + 30, y0 - 26, color, 'left'); return; }
  const ux = (hx - x0) / L, uy = (hy - y0) / L;
  let nx = -uy, ny = ux;
  if (nx * (X(other[0]) - x0) + ny * (Y(other[1]) - y0) > 0) { nx = -nx; ny = -ny; }
  const lx = Math.min(Math.max(hx + ux * 12 + nx * 26, box.l + 30), box.r - 30), ly = Math.min(Math.max(hy + uy * 12 + ny * 22, box.t + 14), box.b - 14);
  tag(ctx, s, lx, ly, color, nx > 0.55 ? 'left' : nx < -0.55 ? 'right' : 'center');
}
const inBox = (ax, p) => { const x = ax.X(p[0]), y = ax.Y(p[1]); return x >= BOX.l && x <= BOX.r && y >= BOX.t && y <= BOX.b; };

/* o: { id, pairs: [{ value, label, v, w, targets }], c, d, range: [min, max], step, detents, specials: 'collapse' | 'book' | null, lattice } */
function spanFigure(o) {
  const d = sim(o.id, 760);
  let pair = null;
  let cur = o.pairs[0];
  const trail = [];
  if (o.pairs.length > 1) {
    pair = choice(d.controls, {
      label: 'vectors', key: 'pair', value: o.pairs[0].value, options: o.pairs.map((p) => ({ value: p.value, label: p.label })),
      onInput: (v) => { cur = o.pairs.find((p) => p.value === v); trail.length = 0; cs.set(o.c); ds.set(o.d); cs.refresh(); ds.refresh(); },
    });
  }
  const sp = (which) => (o.specials === 'collapse'
    ? [{ at: () => { const [v, w] = [cur.v, cur.w]; const t = which === 'c' ? (Math.abs(v[0]) > 1e-9 ? -ds.v * w[0] / v[0] : null) : (Math.abs(w[0]) > 1e-9 ? -cs.v * v[0] / w[0] : null); return t !== null && Math.abs(t) <= o.range[1] ? t : null; }, label: 'zero vector' }]
    : o.specials === 'book' ? [{ at: which === 'c' ? 1 : 2, label: which === 'c' ? 'v + 2w' : 'v + 2w' }] : []);
  const cs = ctl(d.controls, { label: 'c', cls: '', key: 'c', min: o.range[0], max: o.range[1], step: o.step, value: o.c, unit: '', dec: 1, aria: 'the weight c on v', detents: o.detents, specials: sp('c') });
  const ds = ctl(d.controls, { label: 'd', cls: '', key: 'd', min: o.range[0], max: o.range[1], step: o.step, value: o.d, unit: '', dec: 1, aria: 'the weight d on w', detents: o.detents, specials: sp('d') });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  let last = null;

  function draw() {
    const { ctx } = begin(d.c);
    const vc = C('vector'), rc = C('region'), ink = PAL.ink, mu = PAL.muted;
    const g = ease.smooth(arrival(d));
    const k = pair ? pair.k : 1;
    const vw = pair ? pair.mix((p) => { const q = o.pairs.find((x) => x.value === p); return [q.v[0], q.v[1], q.w[0], q.w[1]]; }) : [cur.v[0], cur.v[1], cur.w[0], cur.w[1]];
    const v = [vw[0], vw[1]], w = [vw[2], vw[3]], V = cur.v, W = cur.w;
    const c = r2(cs.v), dd = r2(ds.v);
    const b = [r2(c * V[0] + dd * W[0]), r2(c * V[1] + dd * W[1])], bm = [c * v[0] + dd * w[0], c * v[1] + dd * w[1]];
    const dep = parallel(V, W);
    hits = [];
    /* the sweep: each head the sliders visit leaves a mark, once the picture has settled */
    if (k >= 1 && g >= 1) {
      const key = `${b[0]},${b[1]}`;
      if (key !== last) { last = key; trail.push(b); if (trail.length > 900) trail.shift(); }
    }
    /* the span under everything: the line through v, or the tinted plane with its lattice */
    const planeA = pair ? pair.mix((p) => (parallel(o.pairs.find((x) => x.value === p).v, o.pairs.find((x) => x.value === p).w) ? 0 : 1)) : dep ? 0 : 1;
    ctx.save(); ctx.globalAlpha *= g;
    ctx.fillStyle = alpha(rc, 0.09 * planeA); ctx.fillRect(BOX.l, BOX.t, BOX.r - BOX.l, BOX.b - BOX.t);
    ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(BOX.l, BOX.t, BOX.r - BOX.l, BOX.b - BOX.t); ctx.clip();
    for (let i = -4; i <= 4; i++) { line(ctx, OX + i * U, BOX.t, OX + i * U, BOX.b, alpha(ink, 0.06), 1.5); line(ctx, BOX.l, OY - i * U, BOX.r, OY - i * U, alpha(ink, 0.06), 1.5); }
    ctx.restore();
    if (o.lattice) lattice(ctx, ax0(), v, w, g * planeA);
    const ax = axes(ctx, BOX, [-4, 4], [-4, 4], { xl: 'x', yl: 'y', nx: 8, ny: 8, fx: (q) => fmt(q, 0), fy: (q) => fmt(q, 0) });
    function ax0() { return { X: (x) => OX + x * U, Y: (y) => OY - y * U, box: BOX, xr: [-4, 4], yr: [-4, 4] }; }
    throughOrigin(ctx, ax, v, alpha(rc, 0.9), 5, g * (1 - planeA));
    /* the sweep marks */
    ctx.save(); ctx.beginPath(); ctx.rect(BOX.l, BOX.t, BOX.r - BOX.l, BOX.b - BOX.t); ctx.clip();
    trail.forEach((p) => dot(ctx, ax.X(p[0]), ax.Y(p[1]), alpha(rc, 0.55), true, 3.5));
    ctx.restore();
    /* the targets the text asks about */
    (cur.targets || []).forEach((t) => {
      const s = solve(V, W, t), x = ax.X(t[0]), y = ax.Y(t[1]);
      ctx.save(); ctx.globalAlpha *= g * k; dot(ctx, x, y, vc, false, 8); ctx.restore();
      hits.push({ x, y, r: 16, name: s.ok ? (s.c !== undefined ? `${pt2T(t)} = ${numT(r2(s.c))}v + ${numT(r2(s.d))}w: in Span{v, w}` : `${pt2T(t)}: on the line, so in Span{v, w}`) : `${pt2T(t)}: no weights reach it, so not in Span{v, w}` });
    });
    /* the walk: c along v (a faint copy of v stretched), then d along w from where it ends; then the combination */
    const S = (p) => [g * p[0], g * p[1]];
    const cv = [c * v[0], c * v[1]];
    vec(ctx, ax, [0, 0], S(cv), vc, 3, undefined, 0.35);
    vec(ctx, ax, S(cv), S(bm), vc, 3, [10, 8], 0.55);
    vec(ctx, ax, [0, 0], S(v), vc, 5);
    vec(ctx, ax, [0, 0], S(w), vc, 5);
    vec(ctx, ax, [0, 0], S(bm), vc, 5);
    dot(ctx, ax.X(0), ax.Y(0), ink, true, 5);
    /* labels: v and w at their heads, the combination past its head */
    ctx.save(); ctx.globalAlpha *= g * ease.smooth(k);
    headLabel(ctx, ax, v, w, '$\\kvecv$', vc);
    headLabel(ctx, ax, w, v, '$\\kvecw$', vc);
    if (Math.hypot(bm[0], bm[1]) > 0.35 && inBox(ax, bm)) headLabel(ctx, ax, bm, [v[0] + w[0], v[1] + w[1]], `$${combTex(c, dd)}$`, vc);
    ctx.restore();
    /* hover names */
    hits.push({ x: ax.X(v[0]), y: ax.Y(v[1]), r: 18, name: `v = ${pt2T(V)}` });
    hits.push({ x: ax.X(w[0]), y: ax.Y(w[1]), r: 18, name: `w = ${pt2T(W)}` });
    if (inBox(ax, bm)) hits.push({ x: ax.X(bm[0]), y: ax.Y(bm[1]), r: 18, name: `${numT(c)}v + ${numT(dd)}w = ${pt2T(b)}` });
    hits.push({ x: ax.X(cv[0] / 2), y: ax.Y(cv[1] / 2), r: 14, name: `the first step: ${numT(c)} along v, to ${pt2T([r2(cv[0]), r2(cv[1])])}` });
    hits.push({ x: ax.X((cv[0] + bm[0]) / 2), y: ax.Y((cv[1] + bm[1]) / 2), r: 14, name: `the second step: ${numT(dd)} along w` });
    /* headline and readout */
    const comb = combTex(c, dd);
    let h;
    if (dep) {
      const t = Math.hypot(V[0], V[1]) > 1e-9 ? W[0] !== 0 || W[1] !== 0 ? (Math.abs(V[0]) > 1e-9 ? W[0] / V[0] : W[1] / V[1]) : 0 : 0;   /* w = t v */
      const m = r2(c + t * dd);
      h = m === 0 ? `$${comb === '\\kveczero' ? '0\\kvecv + 0\\kvecw' : comb} = \\kveczero$: the second step runs exactly back along the first.`
        : `$${comb} = ${pt2(b)}$: walk ${num(c)} along $\\kvecv$, then ${num(dd)} along $\\kvecw$; the walk ends on the line through $\\kvecv$, since $\\kvecw = ${coef(t, '\\kvecv')}$.`;
      const mult = m === 0 ? '\\kveczero' : coef(m, '\\kvecv');
      ro.set(mult === comb ? `${comb} = ${col2(b)}` : `${comb} = (${num(c)} ${t < 0 ? '-' : '+'} ${num(Math.abs(t))}\\cdot${par(dd)})\\kvecv = ${mult} = ${col2(b)}`,
        `$\\kSpan\\{\\kvecv, \\kvecw\\}$ is the line defined by $\\kvecv$: $\\kvecw = ${coef(t, '\\kvecv')}$, so every linear combination is a multiple of $\\kvecv$.`, { form: 'line' });
    } else {
      const hit = (cur.targets || []).find((tg) => tg[0] === b[0] && tg[1] === b[1]);
      h = hit ? `$${comb} = ${pt2(b)}$ lands on the point the text asks about: it is in $\\kSpan\\{\\kvecv, \\kvecw\\}$.`
        : `$${comb} = ${pt2(b)}$: walk ${num(c)} along $\\kvecv$, then ${num(dd)} along $\\kvecw$.`;
      ro.set(`${comb} = ${num(c)}${col2(V)} + ${par(dd)}${col2(W)} = ${col2(b)}`,
        `$\\kSpan\\{\\kvecv, \\kvecw\\} = {\\mathbb R}^2$: $[\\kvecv\\ \\kvecw]$ has a pivot position in every row, so every vector of the plane is a linear combination of $\\kvecv$ and $\\kvecw$.`, { form: 'plane' });
    }
    headline(ctx, h);
  }
  still(d, draw);
}

/* Figure 2.3.3 + 2.3.4: the author's two span interactives as one Sim. The pair is a choice: Activity 2.3.2's
   (a) v = [1, 2], w = [−2, −4] (Figure 2.3.3, the default) and (b) v = [2, 1], w = [1, 2] (Figure 2.3.4),
   and the pairs of Examples 2.3.5 and 2.3.7. c, d from −2 to 2 (the author's range), detents at the
   activity's weights −1, 0, 1, 2, opening at c = 1, d = 0 as the author's does. The targets of the
   activity ([2, 4] and [3, 0] for (a); [−2, 2] and [3, 0] for (b)) are hollow dots. */
spanFigure({
  id: 'sim-span', c: 1, d: 0, range: [-2, 2], step: 0.1, detents: [-1, 0, 1, 2], specials: null, lattice: true,
  pairs: [
    { value: 'a', label: 'v = [1, 2], w = [−2, −4]', v: [1, 2], w: [-2, -4], targets: [[2, 4], [3, 0]] },
    { value: 'b', label: 'v = [2, 1], w = [1, 2]', v: [2, 1], w: [1, 2], targets: [[-2, 2], [3, 0]] },
    { value: 'ex5', label: 'v = [2, 0], w = [−1, 1]', v: [2, 0], w: [-1, 1], targets: [[0, 2]] },
    { value: 'ex7', label: 'v = [−1, 1], w = [2, −2]', v: [-1, 1], w: [2, -2], targets: [[0, 2]] },
  ],
});

/* Figure 2.3.6: v = [2, 0], w = [−1, 1] and the lattice of their combinations; c = 1, d = 2 opens on the
   b = v + 2w = [0, 2] the example reads off the figure, a dashed special on each slider. */
spanFigure({
  id: 'sim-span-plane', c: 1, d: 2, range: [-3, 3], step: 0.5, detents: undefined, specials: 'book', lattice: true,
  pairs: [{ value: 'ex5', label: '', v: [2, 0], w: [-1, 1], targets: [[0, 2]] }],
});

/* Figure 2.3.8: v = [−1, 1], w = [2, −2] on one line; c = 1, d = 1 opens on (1 − 2)v = −v, and a special on
   each slider marks where c − 2d = 0 and the combination collapses to the zero vector; [0, 2] is the
   hollow dot off the line that no setting reaches. */
spanFigure({
  id: 'sim-span-line', c: 1, d: 1, range: [-3, 3], step: 0.5, detents: undefined, specials: 'collapse', lattice: false,
  pairs: [{ value: 'ex7', label: '', v: [-1, 1], w: [2, -2], targets: [[0, 2]] }],
});

/* ---------- Figure 2.3.12 + 2.3.13: spans in ℝ³ ----------
   A mathematical 3D scene (rule 28.3) on F.space3d: the box −4 to 4 on each axis, z up, opening from
   the book's own eye with x toward the reader, free orbit with the pitch bounded to [−0.3, 1.45] so the
   reader never looks up from under the floor of the box. The set of vectors is a choice: one vector
   (v₁ = [−2, 3, 1], Figure 2.3.12, the default), two (v₁, v₂ = [1, −1, 3], Figure 2.3.13), three
   (v₁ = [1, 2, −1], v₂ = [2, 0, 1], v₃ = [−2, 2, 0], the list's third item), and Activity 2.3.3's
   v = [1, 2, 1] and e₁, e₂. The components of the set's last vector are three sliders, each with a
   dashed special at the value that drops the vector into the span of the others (the plane's equation
   solved for that component; shown on a two-vector set only while the other two components already
   match v₁'s direction, and at 0 for a lone vector only while its other components are 0). The span
   is drawn in `region`: the line through the box, the plane clipped to the box with the book's lattice
   of combinations i·v₁ + t·v₂ on it, or the box itself tinted when the span is ℝ³; the origin alone when
   every vector is zero. The readout writes [v₁ v₂ v₃] ∼ its reduced row echelon form and counts the
   pivots. Still: nothing here has a clock. A flat painted copy stands in without WebGL. */
(function () {
  const d = sim('sim-span-in-space');
  const box = [[-4, 4], [-4, 4], [-4, 4]];
  const S = F.space3d(d, { box, h: 640, pitch: [-0.3, 1.45], fit: 3.0, turn: -2.25, tilt: 0.42 });
  const SETS = {
    one: { label: 'one vector', vs: [[-2, 3, 1]], names: ['\\kvecvone'], refs: ['v-1'] },
    two: { label: 'two vectors', vs: [[-2, 3, 1], [1, -1, 3]], names: ['\\kvecvone', '\\kvecvtwo'], refs: ['v-1', 'v-2'] },
    three: { label: 'three vectors', vs: [[1, 2, -1], [2, 0, 1], [-2, 2, 0]], names: ['\\kvecvone', '\\kvecvtwo', '\\kvecvthree'], refs: ['v-1', 'v-2', 'v-3'] },
    acta: { label: 'v = [1, 2, 1]', vs: [[1, 2, 1]], names: ['\\kvecv'], refs: [null] },
    actb: { label: 'e₁, e₂', vs: [[1, 0, 0], [0, 1, 0]], names: ['\\kveceone', '\\kvecetwo'], refs: [null, null] },
  };
  let setKey = 'one';
  const lastOf = (k) => SETS[k].vs[SETS[k].vs.length - 1];
  const sl = [null, null, null];
  const pick = choice(d.controls, {
    label: 'vectors', key: 'set', value: 'one', options: Object.keys(SETS).map((k) => ({ value: k, label: SETS[k].label })),
    onInput: (k) => { setKey = k; const L = lastOf(k), nm = SETS[k].names[SETS[k].names.length - 1]; sl.forEach((s, i) => { s.set(L[i]); s.relabel(`(${nm})_${'xyz'[i]}`, `the ${'xyz'[i]}-component of the last vector of the set`); s.refresh(); }); },
  });
  /* the value of component i of the last vector that puts it in the span of the others, from the other two components */
  function special(i) {
    const set = SETS[setKey], others = set.vs.slice(0, -1), v = sl.map((s) => s.v), j = (i + 1) % 3, k = (i + 2) % 3;
    const inRange = (t) => (t !== null && Number.isFinite(t) && Math.abs(t) <= 4 ? t : null);
    if (others.length === 2) {
      const n = SP.cross(others[0], others[1]);
      if (SP.norm(n) < 1e-9) return special1(others[0], v, i, j, k, inRange);
      return Math.abs(n[i]) > 1e-9 ? inRange(-(n[j] * v[j] + n[k] * v[k]) / n[i]) : null;
    }
    if (others.length === 1) return special1(others[0], v, i, j, k, inRange);
    return Math.abs(v[j]) < 1e-9 && Math.abs(v[k]) < 1e-9 ? 0 : null;
  }
  function special1(o, v, i, j, k, inRange) {
    /* in the span of one vector o: the other two components must already be a multiple of o's */
    if (Math.abs(v[j] * o[k] - v[k] * o[j]) > 1e-9) return null;
    const t = Math.abs(o[j]) > 1e-9 ? v[j] / o[j] : Math.abs(o[k]) > 1e-9 ? v[k] / o[k] : null;
    if (t === null) return null;   /* o lies along this axis: every value is in its span, so no circle */
    return inRange(t * o[i]);
  }
  'xyz'.split('').forEach((a, i) => {
    sl[i] = ctl(d.controls, { label: `(\\kvecvone)_${a}`, cls: '', key: `comp-${a}`, min: -4, max: 4, step: 0.5, value: SETS.one.vs[0][i], unit: '', dec: 1, aria: `the ${a}-component of the last vector of the set`, specials: [{ at: () => special(i), label: 'in the span of the others' }] });
  });
  const ro = readout(d);
  /* the reduced row echelon form of the 3 × k matrix with these columns, and its pivot columns */
  function rref(cols) {
    const m = 3, n = cols.length, A = Array.from({ length: m }, (_, r) => cols.map((c) => c[r]));
    const piv = []; let r = 0;
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
  const mtx = (rows) => `\\htmlClass{kv-matrix}{\\left[\\begin{array}{${'r'.repeat(rows[0].length)}} ${rows.map((rw) => rw.map(num).join(' & ')).join(' \\\\ ')} \\end{array}\\right]}`;
  /* the lattice of combinations i·a + t·b on the plane, clipped to the box */
  function latticeOn(a, b, color) {
    const out = [];
    for (let i = -6; i <= 6; i++) { out.push(...SP.line(SP.mul(b, i), a, color, { box, w: 1.2 })); out.push(...SP.line(SP.mul(a, i), b, color, { box, w: 1.2 })); }
    return out;
  }
  /* the box's faces, for a span that is all of space */
  function boxFaces(color, a) {
    const c = (i, j, k) => [box[0][i], box[1][j], box[2][k]];
    const faces = [[c(0, 0, 0), c(1, 0, 0), c(1, 1, 0), c(0, 1, 0)], [c(0, 0, 1), c(1, 0, 1), c(1, 1, 1), c(0, 1, 1)], [c(0, 0, 0), c(0, 1, 0), c(0, 1, 1), c(0, 0, 1)], [c(1, 0, 0), c(1, 1, 0), c(1, 1, 1), c(1, 0, 1)], [c(0, 0, 0), c(1, 0, 0), c(1, 0, 1), c(0, 0, 1)], [c(0, 1, 0), c(1, 1, 0), c(1, 1, 1), c(0, 1, 1)]];
    return [{ k: 'faces', faces, color, alpha: a, name: 'Span: all of ℝ³, every point of space' }];
  }
  still(d, () => {
    const set = SETS[setKey], rc = C('region'), vc = C('vector');
    const vs = set.vs.map((v, i) => (i === set.vs.length - 1 ? sl.map((s) => s.v) : v));
    const { A, piv } = rref(vs), rank = piv.length;
    const names = set.names, spanName = `\\kSpan\\{${names.join(', ')}\\}`;
    const plain = (s) => s.replace(/\\kvecvone/g, 'v₁').replace(/\\kvecvtwo/g, 'v₂').replace(/\\kvecvthree/g, 'v₃').replace(/\\kvecv\b/g, 'v').replace(/\\kveceone/g, 'e₁').replace(/\\kvecetwo/g, 'e₂');
    S.set('axes', SP.axes(box, { ticks: 2 }));
    /* the span */
    let span = [], what, whatT;
    if (rank === 0) { span = [{ k: 'dot', p: [0, 0, 0], color: rc, r: 9, name: 'the span: only the zero vector' }]; what = 'is only the zero vector'; whatT = 'only the zero vector'; }
    else if (rank === 1) {
      const dir = vs.find((v) => SP.norm(v) > 1e-9);
      span = SP.line([0, 0, 0], dir, rc, { box, w: 5 }).map((m) => ({ ...m, name: `${plain(spanName)}: a line, the multiples of one direction` }));
      what = 'is a line'; whatT = 'a line';
    } else if (rank === 2) {
      const a = vs[piv[0]], b = vs[piv[1]], n = SP.cross(a, b);
      span = [...SP.plane([0, 0, 0], n, rc, { box, alpha: 0.32 }).map((m) => ({ ...m, name: `${plain(spanName)}: a plane through the origin` })), ...latticeOn(a, b, alpha(rc, 0.7))];
      what = 'is a plane'; whatT = 'a plane';
    } else { span = boxFaces(rc, 0.1); what = 'is ${\\mathbb R}^3$'; whatT = 'all of ℝ³'; }
    S.set('span', span);
    /* the vectors, each in its referent's colour where it has one */
    const marks = [];
    vs.forEach((v, i) => {
      const color = set.refs[i] ? F.ref(set.refs[i]) : vc, nm = names[i];
      if (SP.norm(v) < 1e-9) { marks.push({ k: 'dot', p: [0, 0, 0], color, r: 7, name: `${plain(nm)} = [0, 0, 0], the zero vector` }); marks.push({ k: 'label', s: `$${nm}$`, p: [0.3, 0.3, 0.3], color }); return; }
      marks.push({ k: 'arrow', a: [0, 0, 0], b: v, color, w: 5, name: `${plain(nm)} = [${v.map(numT).join(', ')}]` });
      marks.push({ k: 'label', s: `$${nm}$`, p: SP.add(v, SP.mul(SP.unit(v), 0.45)), color });
    });
    S.set('vectors', marks);
    /* headline and readout */
    const pivots = rank === 1 ? 'one pivot position' : rank === 2 ? 'two pivot positions' : rank === 3 ? 'three pivot positions' : 'no pivot position';
    S.headline(rank === 3 ? `$${spanName} = {\\mathbb R}^3$: the matrix $[${names.join('\\ ')}]$ has a pivot position in every row.`
      : `$${spanName}$ ${what === 'is only the zero vector' ? 'is only $\\kveczero$' : what}: the matrix $[${names.join('\\ ')}]$ has ${pivots}.`);
    ro.set(`${mtx([0, 1, 2].map((r) => vs.map((v) => v[r])))} \\sim ${mtx(A)}`, `${pivots.charAt(0).toUpperCase()}${pivots.slice(1)}${rank === 3 ? ', one in every row' : ''}: $${spanName}$ is ${whatT === 'all of ℝ³' ? '${\\mathbb R}^3$' : whatT === 'only the zero vector' ? 'only $\\kveczero$' : whatT}.`, { form: rank });
  });
  void pick;
})();
};
