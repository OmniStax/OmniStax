/* Figures for section 3.2 Bases and coordinate systems. */
window.OMNISTAX_FIGURES = window.OMNISTAX_FIGURES || {};
window.OMNISTAX_FIGURES['3.2'] = function (root, F) {
const { C, PAL, alpha, ctl, choice, select, begin, axes, drag, line, arrow, dot, text, headline, register, readout, hover, arrival, ease, pinned, fmt } = F;
const sim = (id, H) => F.sim(root, id, H);
const still = (d, draw) => register(d.fig, { update: () => {}, draw });
/* a number as the readout writes it: at most two decimals, no trailing zeros, never −0 */
const r2 = (v) => { const r = Math.round(v * 100) / 100; return Object.is(r, -0) ? 0 : r; };
const r1 = (v) => { const r = Math.round(v * 10) / 10; return Object.is(r, -0) ? 0 : r; };
const r3 = (v) => { const r = Math.round(v * 1000) / 1000; return Object.is(r, -0) ? 0 : r; };
const num = (v) => String(r2(v));
const num3 = (v) => String(r3(v));
const numT = (v) => num(v).replace('-', '−');            /* the same in figure text, with a true minus */
const num3T = (v) => num3(v).replace('-', '−');
const par = (v) => (r2(v) < 0 ? `(${num(v)})` : num(v));  /* a negative factor in parentheses */
const col = (a, b) => `\\begin{bmatrix} ${a} \\\\ ${b} \\end{bmatrix}`;
const colOf = (p) => col(num(p[0]), num(p[1]));
const vcol = (p) => `\\htmlClass{kv-vector}{${colOf(p)}}`;                   /* a column vector wearing the vector hue */
const mat2 = (a, b) => `\\htmlClass{kv-matrix}{\\begin{bmatrix} ${num(a[0])} & ${num(b[0])} \\\\ ${num(a[1])} & ${num(b[1])} \\end{bmatrix}}`;   /* the matrix with columns a and b */
const pt = (v) => `(${numT(v[0])}, ${numT(v[1])})`;      /* a point in figure text */
const ptT = (v) => `(${num(v[0])}, ${num(v[1])})`;       /* a point inside TeX */
/* the scalar c written before a vector: 1v is v, −1v is −v */
const coef = (c, sym) => (c === 1 ? sym : c === -1 ? `-${sym}` : `${num(c)}${sym}`);
const tag = (ctx, s, x, y, color, align = 'center') => text(ctx, s, x, y, color, { size: 22, weight: 600, tex: true, bg: PAL.panel, align });
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (k, a) => [k * a[0], k * a[1]];
const inBox = (box, x, y) => x >= box.l && x <= box.r && y >= box.t && y <= box.b;
/* the weights c with c₁ a + c₂ b = x, or null when a and b are parallel */
function solve2(a, b, x) {
  const det = a[0] * b[1] - a[1] * b[0]; if (Math.abs(det) < 1e-9) return null;
  return [(x[0] * b[1] - x[1] * b[0]) / det, (a[0] * x[1] - a[1] * x[0]) / det];
}

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

/* Figure 3.2.1: the city map. The author's street grid is a basis grid: a block along Maple is the vector (1, 0.5)
   and a block along Main the vector (−0.5, 0.75) in the map's units, drawn from the house at (−1.5, −1.75); the
   store is at (1, 2.5), which is 4 blocks along Maple and 3 along Main, as the book's directions say. Two sliders,
   the blocks along Maple and along Main (−6 to 6, whole blocks, the book's 4 and 3 the defaults, a special at
   each where the walk reaches the store), move the end of the walk; the walk is drawn as its two legs and the
   displacement from the house as a dashed arrow, and the readout writes the same displacement in street coordinates
   and in east–north coordinates. The author's window, −3.5 to 3.5 in map units at 100 units to 1, no axes, as the
   map has none. Still: a walk has no clock here. */
(function () {
  const d = sim('sim-city-map', 830);
  const U = 100, OX = 700, OY = 440, BOX = { l: OX - 3.5 * U, r: OX + 3.5 * U, t: OY - 3.5 * U, b: OY + 3.5 * U };
  const M = [1, 0.5], N = [-0.5, 0.75], HOUSE = [-1.5, -1.75], STORE = [1, 2.5], STORE_B = [4, 3];
  const X = (x) => OX + x * U, Y = (y) => OY - y * U;
  const ax = { X, Y, box: BOX, xr: [-3.5, 3.5], yr: [-3.5, 3.5] };
  const m = ctl(d.controls, { label: 'Maple', cls: '', key: 'maple', min: -6, max: 6, step: 1, value: STORE_B[0], unit: '', dec: 0, aria: 'blocks along Maple', specials: [{ at: STORE_B[0], label: 'the store' }] });
  const n = ctl(d.controls, { label: 'Main', cls: '', key: 'main', min: -6, max: 6, step: 1, value: STORE_B[1], unit: '', dec: 0, aria: 'blocks along Main', specials: [{ at: STORE_B[1], label: 'the store' }] });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  /* a street's name written along it, a little above the line */
  function along(ctx, p, dir, s, color, at = 0) {
    const L = Math.hypot(dir[0], dir[1]), u = [dir[0] / L, dir[1] / L];
    const q = add(p, mul(at, dir)), x = X(q[0]), y = Y(q[1]), a = -Math.atan2(u[1], u[0]);
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); text(ctx, s, 0, -18, color, { size: 20, weight: 600, align: 'center', bg: PAL.panel }); ctx.restore();
  }
  const blocks = (k) => `${num(Math.abs(k))} ${Math.abs(k) === 1 ? 'block' : 'blocks'}`;
  const dir = (k, pos, neg) => (k < 0 ? neg : pos);
  function draw() {
    const { ctx } = begin(d.c);
    const vc = C('vector'), ink = PAL.ink, mu = PAL.muted;
    const g = ease.smooth(arrival(d));
    const a = r1(m.v), b = r1(n.v), leg1 = add(HOUSE, mul(a, M)), end = add(leg1, mul(b, N)), disp = add(mul(a, M), mul(b, N));
    const atStore = a === STORE_B[0] && b === STORE_B[1];
    hits = [];
    /* the streets, clipped to the map's border: the grid of blocks, Maple and Main named */
    ctx.save(); ctx.beginPath(); ctx.rect(BOX.l, BOX.t, BOX.r - BOX.l, BOX.b - BOX.t); ctx.clip();
    for (let i = -8; i <= 8; i++) {
      const w = i === -1 ? 0 : 1.5, w2 = i === 2 ? 0 : 1.5;
      if (w) across(ctx, ax, mul(i, N), M, alpha(ink, 0.22), w);     /* the streets parallel to Maple */
      if (w2) across(ctx, ax, mul(i, M), N, alpha(ink, 0.22), w2);   /* the streets parallel to Main */
    }
    across(ctx, ax, mul(-1, N), M, alpha(ink, 0.6), 3);   /* Maple */
    across(ctx, ax, mul(2, M), N, alpha(ink, 0.6), 3);    /* Main */
    along(ctx, mul(-1, N), M, 'Maple', ink, 0.1);
    along(ctx, mul(2, M), N, 'Main', ink, 1.3);
    /* north */
    arrow(ctx, X(-2.9), Y(0.5), X(-2.9), Y(1.7), ink, 4);
    text(ctx, 'N', X(-2.9) + 18, Y(1.1), ink, { size: 22, weight: 600, align: 'left' });
    /* the walk: a blocks along Maple, then b along Main; the displacement dashed */
    const S = (p) => add(HOUSE, mul(g, add(p, mul(-1, HOUSE))));
    vec(ctx, ax, HOUSE, S(end), vc, 3, [10, 9], 0.45);
    vec(ctx, ax, HOUSE, S(leg1), vc, 5);
    vec(ctx, ax, S(leg1), S(end), vc, 5);
    ctx.restore();
    /* the house and the store */
    dot(ctx, X(HOUSE[0]), Y(HOUSE[1]), ink, true, 9);
    text(ctx, 'House', X(HOUSE[0]) + 16, Y(HOUSE[1]) + 22, ink, { size: 20, weight: 600, align: 'left', bg: PAL.panel });
    dot(ctx, X(STORE[0]), Y(STORE[1]), ink, atStore, 9);
    text(ctx, 'Store', X(STORE[0]) - 16, Y(STORE[1]) - 22, ink, { size: 20, weight: 600, align: 'right', bg: PAL.panel });
    if (!atStore && g > 0.99 && inBox(BOX, X(end[0]), Y(end[1]))) dot(ctx, X(end[0]), Y(end[1]), vc, true, 7);
    /* the border */
    ctx.save(); ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.strokeRect(BOX.l, BOX.t, BOX.r - BOX.l, BOX.b - BOX.t); ctx.restore();
    /* labels on the legs, once arrived */
    if (g > 0.99) {
      const on = (p) => inBox(BOX, X(p[0]), Y(p[1]));
      if (a !== 0 && on(add(HOUSE, mul(a / 2, M)))) beside(ctx, ax, HOUSE, leg1, end, `$${num(a)}$ along Maple`, vc);
      if (b !== 0 && on(add(leg1, mul(b / 2, N)))) beside(ctx, ax, leg1, end, HOUSE, `$${num(b)}$ along Main`, vc);
    }
    /* hover names */
    hits.push({ x: X(HOUSE[0]), y: Y(HOUSE[1]), r: 18, name: 'your house, on Maple' });
    hits.push({ x: X(STORE[0]), y: Y(STORE[1]), r: 18, name: 'the store, on Main: 4 blocks along Maple and 3 along Main from the house' });
    const mid1 = add(HOUSE, mul(a / 2, M)), mid2 = add(leg1, mul(b / 2, N));
    if (a !== 0) hits.push({ x: X(mid1[0]), y: Y(mid1[1]), r: 16, name: `${blocks(a)} along Maple${a < 0 ? ', the other way' : ''}: ${numT(a)} times the block (1, 0.5)` });
    if (b !== 0) hits.push({ x: X(mid2[0]), y: Y(mid2[1]), r: 16, name: `${blocks(b)} along Main${b < 0 ? ', the other way' : ''}: ${numT(b)} times the block (−0.5, 0.75)` });
    if (!atStore) hits.push({ x: X(end[0]), y: Y(end[1]), r: 16, name: `the end of the walk: ${pt(disp)} east and north of the house` });
    const mp = add(mul(-1, N), mul(-2.4, M)); hits.push({ x: X(mp[0]), y: Y(mp[1]), r: 16, name: 'Maple: one block along it is the vector (1, 0.5), east and north' });
    const mn = add(mul(2, M), mul(-2.2, N)); hits.push({ x: X(mn[0]), y: Y(mn[1]), r: 16, name: 'Main: one block along it is the vector (−0.5, 0.75), east and north' });
    hits.push({ x: X(-2.9), y: Y(1.1), r: 20, name: 'north; the streets do not run north and south' });
    /* headline and readout */
    const where = `${num(Math.abs(disp[0]))} units ${dir(disp[0], 'east', 'west')} and ${num(Math.abs(disp[1]))} units ${dir(disp[1], 'north', 'south')} of the house`;
    let h;
    if (atStore) h = `$4$ blocks along Maple, then $3$ along Main, reaches the store: ${where}.`;
    else if (a === 0 && b === 0) h = 'No blocks along either street: the walk stays at the house.';
    else h = `$${num(a)}$ ${Math.abs(a) === 1 ? 'block' : 'blocks'} along Maple, then $${num(b)}$ along Main: the walk ends ${where}${a === STORE_B[0] || b === STORE_B[1] ? ', not at the store' : ''}.`;
    headline(ctx, h);
    ro.set(`${par(a)}${vcol(M)} + ${par(b)}${vcol(N)} = ${vcol(disp)}`,
      `street coordinates $(${num(a)}, ${num(b)})$, blocks along Maple and along Main; east–north coordinates $${ptT(disp)}$, in the map’s units`);
  }
  still(d, draw);
})();

/* Figure 3.2.2 (and its repeat in Example 3.2.6): a basis as a second grid. The grid of 𝓑 = {v₁, v₂} is drawn over
   the standard grid, both in ink, the basis vectors in their referent colours; x has a draggable head (its standard
   components x₁, x₂ on sliders, −8 to 8, the book's [1, −4] the defaults) and is read in both coordinate systems:
   the walk c₁v₁ then c₂v₂ is drawn faint along the grid and the readout writes x = P_B{x}_B with the live numbers,
   the columns of P_B being v₁ and v₂. A choice of basis swaps the grid (the preview's 𝓑, Activity 3.2.3's 𝓑 and 𝓒,
   and the standard basis 𝓔, where the grids coincide and the two readings agree), the old grid bending into the new;
   a select of the book's worked vectors sets x and the basis to the book's numbers. x and y from −8 to 8 at 45 units
   to 1; a head past the box is pinned. Still: no clock. */
(function () {
  const d = sim('sim-basis-grid', 900);
  const BOX = { l: 340, r: 1060, t: 110, b: 830 }, XR = [-8, 8], YR = [-8, 8];
  const BASES = {
    prev: { label: '[2, 1], [1, 2]', v1: [2, 1], v2: [1, 2], name: 'B', xB: '\\kvecxB', P: '\\kPB', Pinv: '\\kPBinv', basis: '\\mathcal{B}' },
    actB: { label: '[3, −2], [2, 1]', v1: [3, -2], v2: [2, 1], name: 'B', xB: '\\kvecxB', P: '\\kPB', Pinv: '\\kPBinv', basis: '\\mathcal{B}' },
    actC: { label: '𝓒: [1, 2], [−2, 1]', v1: [1, 2], v2: [-2, 1], name: 'C', xB: '\\kvecxC', P: '\\kPC', Pinv: '\\kPC^{-1}', basis: '\\mathcal{C}' },
    std: { label: '𝓔: e₁, e₂', v1: [1, 0], v2: [0, 1], name: 'E', xB: '\\left\\{\\kvecx\\right\\}_{\\mathcal{E}}', P: '\\kI', Pinv: '\\kI', basis: '\\mathcal{E}' },
  };
  /* [basis, x₁, x₂] of each of the book's worked vectors */
  const PRESETS = {
    ex6a: { label: 'Example 3.2.6: x = [1, −4]', v: ['prev', 1, -4] },
    ex6b: { label: 'Example 3.2.6: x = [8, 1]', v: ['prev', 8, 1] },
    ex6c: { label: 'Example 3.2.6: x = [−8, 2]', v: ['prev', -8, 2] },
    pa: { label: 'Preview Activity 3.2.1 (a): v₁ − 2v₂', v: ['prev', 0, -3] },
    pb: { label: 'Preview Activity 3.2.1 (b): x = [−3, 0]', v: ['prev', -3, 0] },
    a3a: { label: 'Activity 3.2.3 (a): {x}_B = [−2, 4]', v: ['actB', 2, 8] },
    a3b: { label: 'Activity 3.2.3 (b): x = [3, 5]', v: ['actB', 3, 5] },
  };
  let x1 = null, x2 = null;
  const basis = choice(d.controls, { label: 'basis', key: 'basis', value: 'prev', aria: 'the basis whose grid is drawn', options: Object.entries(BASES).map(([value, b]) => ({ value, label: b.label })) });
  select(d.controls, {
    label: 'example', key: 'example', value: 'ex6a', aria: 'one of the book’s worked vectors',
    options: Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label })),
    onInput: (v) => { const p = PRESETS[v].v; x1.set(p[1]); x2.set(p[2]); basis.drive(p[0]); },
  });
  const comp = (label, key, value, aria) => ctl(d.controls, { label, cls: '', key, min: -8, max: 8, step: 0.1, value, unit: '', dec: 1, aria });
  x1 = comp('x_1', 'x1', 1, 'the first component of x');
  x2 = comp('x_2', 'x2', -4, 'the second component of x');
  const P = drag(d, { x: x1, y: x2 });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  const steps = (k, s) => `${num(Math.abs(k))} ${Math.abs(k) === 1 ? 'step' : 'steps'}${k < 0 ? ' back' : ''} along $${s}$`;
  function draw() {
    const { ctx } = begin(d.c);
    const vc = C('vector'), ink = PAL.ink, c1c = F.ref('v-1'), c2c = F.ref('v-2');
    const g = ease.smooth(arrival(d)), settled = ease.smooth(basis.k);
    const B = BASES[basis.value], x = [r1(x1.v), r1(x2.v)];
    /* the drawn basis blends from the last choice to this one; the numbers are the current basis's */
    const v1 = basis.mix((v) => BASES[v].v1), v2 = basis.mix((v) => BASES[v].v2);
    const c = solve2(B.v1, B.v2, x) ?? [0, 0], cd = c.map(r2), cm = solve2(v1, v2, x) ?? [0, 0];
    const leg = mul(cm[0], v1);
    hits = [];
    const ax = plane(ctx, BOX, XR, YR);
    /* the grid the basis weaves: the lines iv₁ + tv₂ and tv₁ + iv₂ for whole i, in ink over the standard grid */
    ctx.save(); ctx.globalAlpha *= g;
    for (let i = -24; i <= 24; i++) { if (i === 0) continue; across(ctx, ax, mul(i, v1), v2, alpha(ink, 0.16), 1.5); across(ctx, ax, mul(i, v2), v1, alpha(ink, 0.16), 1.5); }
    across(ctx, ax, [0, 0], v2, alpha(ink, 0.3), 2); across(ctx, ax, [0, 0], v1, alpha(ink, 0.3), 2);
    ctx.restore();
    const S = (p) => mul(g, p);
    /* the walk, c₁ steps along v₁ then c₂ along v₂, then x, then the basis vectors */
    vec(ctx, ax, [0, 0], S(leg), c1c, 3, [10, 9], 0.55);
    vec(ctx, ax, S(leg), S(x), c2c, 3, [10, 9], 0.55);
    vec(ctx, ax, [0, 0], S(x), vc, 5);
    vec(ctx, ax, [0, 0], S(v1), c1c, 5);
    vec(ctx, ax, [0, 0], S(v2), c2c, 5);
    dot(ctx, ax.X(0), ax.Y(0), ink, true, 5);
    P.draw(ctx, ax, clear(vc));
    ring(ctx, ax, x, vc);
    if (g > 0.99) {
      ctx.save(); ctx.globalAlpha *= settled;
      beside(ctx, ax, [0, 0], B.v1, B.v2, '$\\kvecvone$', c1c);
      beside(ctx, ax, [0, 0], B.v2, B.v1, '$\\kvecvtwo$', c2c);
      ctx.restore();
      if (x[0] === 0 && x[1] === 0) tag(ctx, '$\\kvecx = \\kveczero$', ax.X(0) + 22, ax.Y(0) + 28, vc, 'left');
      else past(ctx, ax, [0, 0], x, '$\\kvecx$', vc);
    }
    /* hover names */
    hits.push({ x: ax.X(B.v1[0]), y: ax.Y(B.v1[1]), r: 16, name: `v₁ = ${pt(B.v1)}, the first column of P_${B.name}` });
    hits.push({ x: ax.X(B.v2[0]), y: ax.Y(B.v2[1]), r: 16, name: `v₂ = ${pt(B.v2)}, the second column of P_${B.name}` });
    hits.push({ x: ax.X(x[0]), y: ax.Y(x[1]), r: 20, name: `x = ${pt(x)} in standard coordinates, (${numT(cd[0])}, ${numT(cd[1])}) in the basis; drag its head` });
    const l1 = mul(cd[0] / 2, B.v1), l2 = add(mul(cd[0], B.v1), mul(cd[1] / 2, B.v2));
    if (cd[0] !== 0) hits.push({ x: ax.X(l1[0]), y: ax.Y(l1[1]), r: 12, name: `${coef(cd[0], 'v₁').replace('-', '−')} = ${pt(mul(cd[0], B.v1))}: ${numT(cd[0])} steps along v₁` });
    if (cd[1] !== 0) hits.push({ x: ax.X(l2[0]), y: ax.Y(l2[1]), r: 12, name: `${coef(cd[1], 'v₂').replace('-', '−')} = ${pt(mul(cd[1], B.v2))}: ${numT(cd[1])} steps along v₂, from the tip of ${coef(cd[0], 'v₁').replace('-', '−')}` });
    const cell = add(mul(1.5, B.v1), mul(1.5, B.v2));
    hits.push({ x: ax.X(cell[0]), y: ax.Y(cell[1]), r: 12, name: B.name === 'E' ? 'the standard grid: the basis grid of e₁, e₂ coincides with it' : 'the grid of the basis: the linear combinations of v₁ and v₂ with whole-number weights, laid over the standard grid' });
    /* headline and readout */
    const cT = ptT(cd), xT = ptT(x);
    let h;
    if (B.name === 'E') h = `In the standard basis the two readings agree: $${B.xB} = \\kvecx = ${xT}$.`;
    else if (cd[0] === 0 && cd[1] === 0) h = `$\\kvecx = \\kveczero$ needs no steps at all: $${B.xB} = (0, 0)$.`;
    else h = `$\\kvecx = ${xT}$ is ${cd[0] === 0 ? 'no step along $\\kvecvone$' : steps(cd[0], '\\kvecvone')} and ${cd[1] === 0 ? 'none along $\\kvecvtwo$' : steps(cd[1], '\\kvecvtwo')}: $${B.xB} = ${cT}$.`;
    headline(ctx, h);
    const comb = `${par(cd[0])}\\kvecvone + ${par(cd[1])}\\kvecvtwo`;
    ro.set(`${B.xB} = ${colOf(cd)},\\quad \\kvecx = ${B.P}${B.xB} = ${mat2(B.v1, B.v2)}${colOf(cd)} = ${comb} = ${colOf(x)}`,
      B.name === 'E' ? `$${B.xB} = \\kI\\kvecx = \\kvecx$: the standard coordinates of $\\kvecx$ are its components` : `$${B.xB} = ${B.Pinv}\\kvecx$: the coordinates are the weights that solve $c_1\\kvecvone + c_2\\kvecvtwo = \\kvecx$`,
      { form: B.name });
  }
  still(d, draw);
})();

/* Figure 3.2.11 (with the unnumbered revenue plot and the three approximation plots): the Haar wavelet basis of ℝ⁴
   reading a year's revenue. The revenue x = (10.3, 13.1, 7.5, 8.2) as four points over the quarters on the left,
   the author's window; the four basis vectors v₁ … v₄ as four small panels on the right, each in its referent
   colour; a step control adds the terms c₁v₁, c₂v₂, c₃v₃, c₄v₄ one at a time, each quarter's level drawn in the
   colour of the last term that moved it, the previous level left faint and the remaining gap to the point dashed;
   the book's drawings are the stops 0, 1, 2 and 4. The four revenues are sliders (0 to 15), so a change in one
   quarter shows which coordinates move. Still: no clock; a change of step bends the levels into the next. */
(function () {
  const d = sim('sim-revenue-wavelet', 790);
  const BOX = { l: 120, r: 760, t: 150, b: 660 }, XR = [0, 5], YR = [0, 15];
  const V = [[1, 1, 1, 1], [1, 1, -1, -1], [1, -1, 0, 0], [0, 0, 1, -1]], REF = ['v-1', 'v-2', 'v-3', 'v-4'], VS = ['\\kvecvone', '\\kvecvtwo', '\\kvecvthree', '\\kvecvfour'];
  const PAN = { l: 900, r: 1310, t: 170, h: 104, gap: 22 };
  const terms = choice(d.controls, { label: 'terms', key: 'terms', value: '0', aria: 'how many terms of the Haar expansion are added', options: ['0', '1', '2', '3', '4'].map((v) => ({ value: v, label: v })) });
  const xs = [10.3, 13.1, 7.5, 8.2].map((v, i) => ctl(d.controls, { label: `x_${i + 1}`, cls: '', key: `x${i + 1}`, min: 0, max: 15, step: 0.1, value: v, unit: '', dec: 1, aria: `the revenue of quarter ${i + 1}, in millions of dollars` }));
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  /* the Haar coordinates of x: the average, the half-year deviation, the two quarterly differences */
  const coords = (x) => [(x[0] + x[1] + x[2] + x[3]) / 4, (x[0] + x[1] - x[2] - x[3]) / 4, (x[0] - x[1]) / 2, (x[2] - x[3]) / 2];
  /* the partial sum of the first k terms, one level per quarter */
  const partial = (c, k) => [0, 1, 2, 3].map((q) => { let s = 0; for (let j = 0; j < k; j++) s += c[j] * V[j][q]; return s; });
  /* the last term, among the first k, that moves quarter q: its colour owns the level */
  const owner = (q, k) => { let o = -1; for (let j = 0; j < k; j++) if (V[j][q] !== 0) o = j; return o; };
  const col4 = (a) => `\\begin{bmatrix} ${a.map(num3).join(' \\\\ ')} \\end{bmatrix}`;
  const term = (c, j, first) => { const m = Math.abs(c), s = c < 0 ? '-' : first ? '' : '+'; return `${s} ${num3(m)}${VS[j]}`; };
  function draw() {
    const { ctx } = begin(d.c);
    const ink = PAL.ink, mu = PAL.muted;
    const g = ease.smooth(arrival(d));
    const x = xs.map((s) => r1(s.v)), c = coords(x), k = +terms.value, kFrom = +terms.from, t = ease.smooth(terms.k);
    const lev = terms.mix((v) => partial(c, +v)), prev = partial(c, Math.max(0, k - 1)), cur = partial(c, k);
    hits = [];
    /* the revenue graph */
    const ax = axes(ctx, BOX, XR, YR, { xl: 'Quarter', yl: 'Revenue (millions of dollars)', nx: 5, ny: 3, fx: (q) => (q === 0 ? '' : fmt(q, 0)), fy: (q) => fmt(q, 0) });
    ctx.save(); ctx.beginPath(); ctx.rect(BOX.l, BOX.t, BOX.r - BOX.l, BOX.b - BOX.t); ctx.clip();
    /* the level before this term, faint, as the book draws it in gray */
    if (k > 1) { ctx.save(); ctx.globalAlpha *= g * (kFrom === k ? 1 : t); for (let q = 0; q < 4; q++) line(ctx, ax.X(q + 0.55), ax.Y(prev[q]), ax.X(q + 1.45), ax.Y(prev[q]), alpha(mu, 0.6), 4); ctx.restore(); }
    /* the current level per quarter, in the colour of the term that last moved it; the gap to the point dashed */
    for (let q = 0; q < 4; q++) {
      const o = owner(q, k), a = k === 0 ? (kFrom === 0 ? 0 : 1 - t) : 1;
      if (!(a > 0.001)) continue;
      const color = o < 0 ? mu : F.ref(REF[o]);
      ctx.save(); ctx.globalAlpha *= g * a;
      line(ctx, ax.X(q + 0.55), ax.Y(lev[q]), ax.X(q + 1.45), ax.Y(lev[q]), color, 5);
      if (Math.abs(x[q] - lev[q]) > 0.05) line(ctx, ax.X(q + 1), ax.Y(lev[q]), ax.X(q + 1), ax.Y(x[q]), alpha(ink, 0.45), 2, [4, 8]);
      ctx.restore();
      if (k > 0) hits.push({ x: ax.X(q + 0.8), y: ax.Y(cur[q]), r: 14, name: `quarter ${q + 1} after ${k} ${k === 1 ? 'term' : 'terms'}: ${num3T(cur[q])}${Math.abs(x[q] - cur[q]) > 0.0005 ? `, ${num3T(Math.abs(x[q] - cur[q]))} ${x[q] > cur[q] ? 'below' : 'above'} the revenue` : ', the revenue exactly'}` });
    }
    ctx.restore();
    /* the revenue points */
    ctx.save(); ctx.globalAlpha *= g;
    x.forEach((v, q) => { dot(ctx, ax.X(q + 1), ax.Y(v), ink, true, 9); hits.unshift({ x: ax.X(q + 1), y: ax.Y(v), r: 16, name: `x${'₁₂₃₄'[q]} = ${num(v)}: the revenue of quarter ${q + 1}, in millions of dollars` }); });
    ctx.restore();
    /* the four basis vectors as panels, each four points at ±1 or 0, its coefficient under it */
    text(ctx, 'the Haar wavelet basis', (PAN.l + PAN.r) / 2, PAN.t - 34, mu, { size: 20, align: 'center' });
    V.forEach((v, j) => {
      const top = PAN.t + j * (PAN.h + PAN.gap), mid = top + PAN.h / 2, color = F.ref(REF[j]), on = j < k;
      const px = (q) => PAN.l + 70 + ((q + 0.5) / 4) * (PAN.r - PAN.l - 90), py = (val) => mid - val * (PAN.h / 2 - 12);
      line(ctx, PAN.l + 70, mid, PAN.r - 20, mid, alpha(ink, 0.25), 1.5);
      ctx.save(); ctx.globalAlpha *= g;
      v.forEach((val, q) => { dot(ctx, px(q), py(val), color, on, 7); hits.push({ x: px(q), y: py(val), r: 12, name: `v${'₁₂₃₄'[j]} = (${v.join(', ').replace(/-/g, '−')}): its component for quarter ${q + 1} is ${String(val).replace('-', '−')}` }); });
      ctx.restore();
      text(ctx, `$${VS[j]}$`, PAN.l + 10, mid - 14, color, { size: 24, weight: 600, align: 'left', tex: true });
      text(ctx, `$c_${j + 1} = ${num3(c[j])}$`, PAN.l + 10, mid + 18, on ? color : mu, { size: 18, weight: on ? 600 : 400, align: 'left', tex: true });
    });
    /* headline and readout */
    const v4 = (a) => `(${a.map((q) => num3(q)).join(', ')})`;
    const cs = c.map(r3);
    let h;
    if (k === 0) h = `The revenue $\\kvecx = ${v4(x)}$, before any term of the Haar expansion is added.`;
    else if (k === 1) h = `One term: $${num3(cs[0])}\\kvecvone$ is the yearly average, $${num3(cs[0])}$, in every quarter.`;
    else if (k === 2) h = `Two terms: $${num3(Math.abs(cs[1]))}$ ${cs[1] >= 0 ? 'above' : 'below'} the yearly average in the first half and ${cs[1] >= 0 ? 'below' : 'above'} it in the second: $${v4(cur)}$.`;
    else if (k === 3) h = `Three terms: $${num3(cs[2])}\\kvecvthree$ sets the first two quarters $${num3(Math.abs(cs[2]))}$ ${cs[2] >= 0 ? 'above and below' : 'below and above'} their half-year average: $${v4(cur)}$.`;
    else h = `Four terms: $${num3(cs[3])}\\kvecvfour$ does the same for the last two quarters; the revenue $${v4(cur)}$ is rebuilt exactly.`;
    headline(ctx, h);
    const sum = k === 0 ? '' : `,\\quad ${cs.slice(0, k).map((cj, j) => term(cj, j, j === 0)).join(' ')} = ${col4(cur)}`;
    ro.set(`\\kvecxB = \\kPBinv\\kvecx = ${col4(cs)}${sum}`,
      k === 4 ? `$\\kvecx = c_1\\kvecvone + c_2\\kvecvtwo + c_3\\kvecvthree + c_4\\kvecvfour$: all four terms together give the revenue back` : `$\\kvecx = c_1\\kvecvone + c_2\\kvecvtwo + c_3\\kvecvthree + c_4\\kvecvfour$, the terms added one at a time`,
      { form: k });
  }
  still(d, draw);
})();
};
