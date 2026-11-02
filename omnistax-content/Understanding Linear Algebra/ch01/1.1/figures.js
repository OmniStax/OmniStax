/* Figures for section 1.1 What can we expect. */
window.OMNISTAX_FIGURES = window.OMNISTAX_FIGURES || {};
window.OMNISTAX_FIGURES['1.1'] = function (root, F) {
const { C, PAL, alpha, ctl, choice, select, begin, axes, line, dot, text, headline, register, readout, hover, ease } = F;
const SP = F.space;
const sim = (id, H) => F.sim(root, id, H);
const still = (d, draw) => register(d.fig, { update: () => {}, draw });
const EPS = 1e-6;
/* a number as the readout writes it: at most two decimals, no trailing zeros, never −0; TeX minus is a hyphen */
const r2 = (v) => { const r = Math.round(v * 100) / 100; return Object.is(r, -0) ? 0 : r; };
const num = (v) => String(r2(v));
const numT = (v) => num(v).replace('-', '−');          /* the same in plain text, with a true minus */
const near = (a, b) => Math.abs(a - b) < 1e-4;
const DEG = Math.PI / 180;
/* y = mx + b in TeX: y = x − 1, y = 0.5x, y = −x − 2, y = 3 */
function lineTex(m, b) {
  const mm = r2(m), bb = r2(b);
  let s = mm === 0 ? '' : mm === 1 ? 'x' : mm === -1 ? '-x' : `${num(mm)}x`;
  if (bb !== 0) s += s === '' ? num(bb) : bb < 0 ? ` - ${num(-bb)}` : ` + ${num(bb)}`;
  return `y = ${s === '' ? '0' : s}`;
}
const lineText = (m, b) => lineTex(m, b).replace(/-/g, '−');
/* the stretch of y = mx + b inside the window [x0, x1] × [y0, y1], or null where it misses */
function clipLine2(m, b, [x0, x1], [y0, y1]) {
  const pts = [];
  [[x0, m * x0 + b], [x1, m * x1 + b]].forEach(([x, y]) => { if (y >= y0 - EPS && y <= y1 + EPS) pts.push([x, y]); });
  if (m !== 0) [[(y0 - b) / m, y0], [(y1 - b) / m, y1]].forEach(([x, y]) => { if (x > x0 + EPS && x < x1 - EPS) pts.push([x, y]); });
  if (pts.length < 2) return null;
  pts.sort((p, q) => p[0] - q[0]);
  return [pts[0], pts[pts.length - 1]];
}
/* the solution set of the lines y = m x + b, met one at a time: a line, a point or nothing; the steps say how */
function meetLines(L) {
  let S = { kind: 'line', m: L[0].m, b: L[0].b };
  const steps = [];
  for (let i = 1; i < L.length; i++) {
    const l = L[i];
    if (S.kind === 'none') { steps.push({ kind: 'none' }); continue; }
    if (S.kind === 'point') {
      const y = l.m * S.x + l.b, on = near(y, S.y);
      steps.push({ kind: 'check', i, y, on });
      if (!on) S = { kind: 'none' };
      continue;
    }
    if (near(S.m, l.m)) {
      const same = near(S.b, l.b);
      steps.push({ kind: same ? 'same' : 'parallel', i });
      if (!same) S = { kind: 'none' };
      continue;
    }
    const x = (l.b - S.b) / (S.m - l.m), y = S.m * x + S.b;
    steps.push({ kind: 'meet', i, x: r2(x), y: r2(y) });
    S = { kind: 'point', x: r2(x), y: r2(y) };
  }
  return { S, steps };
}

/* Figure 1.1.5 + 1.1.6: one, two or three lines in the plane, the book's window [−4, 4]², each line y = mᵢx + bᵢ on
   its own two sliders, the first the book's y = x − 1. The solution set is drawn in region: the meeting point as a dot,
   the whole line as a band when one equation stands alone or two coincide. Dashed specials mark the exceptions the
   text names: a slope equal to the first line's (parallel, no solution; the same line when the intercepts agree too)
   and the third line's intercept that carries it through the meeting point of the other two (one solution). The nine
   presets are Figure 1.1.5's three panels, Figure 1.1.6's two and Activity 1.1.1's four systems; choosing one sets
   the count and the sliders. Still: nothing here has a clock; a change of count fades a line in or out. */
(function () {
  const d = sim('sim-lines', 790);
  const BOX = { l: 120, r: 760, t: 90, b: 730 }, WIN = [-4, 4];
  const REF = ['line-1', 'line-2', 'line-3'], ORD = ['first', 'second', 'third'], COUNT = { one: 1, two: 2, three: 3 };
  /* [count, m₁, b₁, m₂, b₂, m₃, b₃] of each book picture */
  const PRESETS = {
    'f5a': { label: 'Figure 1.1.5, one line', v: ['one', 1, -1, 0.5, 0, -1, -2] },
    'f5b': { label: 'Figure 1.1.5, two lines meeting', v: ['two', 1, -1, 0.5, 0, -1, -2] },
    'f5c': { label: 'Figure 1.1.5, three lines, no common point', v: ['three', 1, -1, 0.5, 0, -1, -2] },
    'f6a': { label: 'Figure 1.1.6, two parallel lines', v: ['two', 1, 1, 1, -1, -1, -2] },
    'f6b': { label: 'Figure 1.1.6, three lines through one point', v: ['three', 1, -1, 0.5, 0, -1, 3] },
    'a': { label: 'Activity 1.1.1 (a): y = x + 1, y = 2x − 1', v: ['two', 1, 1, 2, -1, -1, 0] },
    'b': { label: 'Activity 1.1.1 (b): y = x + 1, y = x − 1', v: ['two', 1, 1, 1, -1, -1, 0] },
    'c': { label: 'Activity 1.1.1 (c): y = x + 1', v: ['one', 1, 1, 2, -1, -1, 0] },
    'd': { label: 'Activity 1.1.1 (d): y = x + 1, y = 2x − 1, y = −x', v: ['three', 1, 1, 2, -1, -1, 0] },
  };
  let sl = [];
  const cnt = choice(d.controls, {
    label: 'equations', key: 'count', value: 'two', aria: 'how many equations',
    options: [{ value: 'one', label: 'one' }, { value: 'two', label: 'two' }, { value: 'three', label: 'three' }],
    onInput: (v) => showFor(COUNT[v]),
  });
  const ex = select(d.controls, {
    label: 'example', key: 'example', value: 'f5b', aria: 'one of the book’s pictures',
    options: Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label })),
    onInput: (v) => { const p = PRESETS[v].v; for (let i = 0; i < 6; i++) sl[i].set(p[i + 1]); cnt.drive(p[0]); },
  });
  const slider = (label, key, value, aria, isM, specials) => ctl(d.controls, { label, cls: '', key, min: isM ? -3 : -4, max: isM ? 3 : 4, step: 0.25, value, unit: '', dec: 2, aria, specials });
  const m1 = slider('m_1', 'm1', 1, 'the slope of the first line', true);
  const b1 = slider('b_1', 'b1', -1, 'the y-intercept of the first line', false);
  const m2 = slider('m_2', 'm2', 0.5, 'the slope of the second line', true, [{ at: () => m1.v, label: 'parallel' }]);
  const b2 = slider('b_2', 'b2', 0, 'the y-intercept of the second line', false, [{ at: () => (near(m1.v, m2.v) ? b1.v : null), label: 'the same line' }]);
  const m3 = slider('m_3', 'm3', -1, 'the slope of the third line', true, [{ at: () => m1.v, label: 'parallel' }]);
  const b3 = slider('b_3', 'b3', -2, 'the y-intercept of the third line', false, [{ at: () => { const r = meetLines([{ m: m1.v, b: b1.v }, { m: m2.v, b: b2.v }]); return r.S.kind === 'point' ? r.S.y - m3.v * r.S.x : null; }, label: 'through the point' }]);
  sl = [m1, b1, m2, b2, m3, b3];
  const showFor = (k, ms) => { [m2, b2].forEach((s) => s.show(k >= 2, ms)); [m3, b3].forEach((s) => s.show(k >= 3, ms)); };
  showFor(2, { ms: 0 });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);

  function draw() {
    const { ctx } = begin(d.c);
    const rc = C('region'), ink = PAL.ink, mu = PAL.muted;
    const k = COUNT[cnt.value], kFrom = COUNT[cnt.from], t = ease.smooth(cnt.k);
    const L = [{ m: m1.v, b: b1.v }, { m: m2.v, b: b2.v }, { m: m3.v, b: b3.v }];
    const show = (i) => (k > i ? (kFrom > i ? 1 : t) : kFrom > i ? 1 - t : 0);   /* the opacity of line i as the count changes */
    const { S, steps } = meetLines(L.slice(0, k));
    hits = [];
    /* the plane: a faint unit grid under the axes, the book's window */
    ctx.save(); ctx.beginPath(); ctx.rect(BOX.l, BOX.t, BOX.r - BOX.l, BOX.b - BOX.t); ctx.clip();
    for (let i = -4; i <= 4; i++) { line(ctx, BOX.l + ((i + 4) / 8) * (BOX.r - BOX.l), BOX.t, BOX.l + ((i + 4) / 8) * (BOX.r - BOX.l), BOX.b, alpha(ink, 0.06), 1.5); line(ctx, BOX.l, BOX.t + ((i + 4) / 8) * (BOX.b - BOX.t), BOX.r, BOX.t + ((i + 4) / 8) * (BOX.b - BOX.t), alpha(ink, 0.06), 1.5); }
    ctx.restore();
    const ax = axes(ctx, BOX, WIN, WIN, { xl: 'x', yl: 'y', nx: 8, ny: 8, fx: (q) => String(q).replace('-', '−'), fy: (q) => String(q).replace('-', '−') });
    ctx.save(); ctx.beginPath(); ctx.rect(BOX.l, BOX.t, BOX.r - BOX.l, BOX.b - BOX.t); ctx.clip();
    /* the solution set first, under the lines: the whole line as a band where the solutions fill a line */
    if (S.kind === 'line') { const e = clipLine2(S.m, S.b, WIN, WIN); if (e) line(ctx, ax.X(e[0][0]), ax.Y(e[0][1]), ax.X(e[1][0]), ax.Y(e[1][1]), alpha(rc, 0.28), 18); }
    /* the lines, each in its referent colour */
    L.forEach((l, i) => {
      const a = show(i); if (!(a > 0.001)) return;
      const e = clipLine2(l.m, l.b, WIN, WIN); if (!e) return;
      ctx.save(); ctx.globalAlpha *= a;
      line(ctx, ax.X(e[0][0]), ax.Y(e[0][1]), ax.X(e[1][0]), ax.Y(e[1][1]), F.ref(REF[i]), 4.5);
      ctx.restore();
      if (a > 0.5) for (let j = 1; j < 8; j++) { const x = e[0][0] + ((e[1][0] - e[0][0]) * j) / 8, y = e[0][1] + ((e[1][1] - e[0][1]) * j) / 8; hits.push({ x: ax.X(x), y: ax.Y(y), r: 14, name: `the ${ORD[i]} line, ${lineText(l.m, l.b)}` }); }
    });
    ctx.restore();
    /* the one common point */
    if (S.kind === 'point') {
      dot(ctx, ax.X(S.x), ax.Y(S.y), rc, true, 10);
      hits.unshift({ x: ax.X(S.x), y: ax.Y(S.y), r: 18, name: `(${numT(S.x)}, ${numT(S.y)}): the one point on all ${k === 2 ? 'both' : 'three'} lines` });
    }
    /* the legend: each equation once, in its line's colour */
    text(ctx, k === 1 ? 'the equation' : 'the equations', 840, 150, mu, { size: 20, weight: 600, align: 'left' });
    L.forEach((l, i) => { const a = show(i); if (a > 0.001) text(ctx, `$${lineTex(l.m, l.b)}$`, 840, 200 + 52 * i, alpha(F.ref(REF[i]), a), { size: 26, weight: 600, align: 'left', tex: true }); });
    /* the headline and the readout */
    const pt = S.kind === 'point' ? `(${num(S.x)}, ${num(S.y)})` : '';
    let head, tex, note = '';
    if (k === 1) {
      head = 'One equation: every point of the line satisfies it, so there are infinitely many solutions.';
      tex = `${lineTex(L[0].m, L[0].b)}\\ \\text{for every } x: \\text{ the points } (x,\\ ${lineTex(L[0].m, L[0].b).slice(4)})`;
    } else {
      const parts = steps.map((s) => s.kind === 'meet' ? `${lineTex(L[0].m, L[0].b).slice(4)} = ${lineTex(L[s.i].m, L[s.i].b).slice(4)} \\Rightarrow x = ${num(s.x)},\\ y = ${num(s.y)}`
        : s.kind === 'check' ? `\\text{at } x = ${num(S.kind === 'point' ? S.x : steps.find((q) => q.kind === 'meet').x)}: \\text{ the ${ORD[s.i]} line gives } y = ${num(s.y)} ${s.on ? '=' : '\\neq'} ${num(steps.find((q) => q.kind === 'meet').y)}`
        : s.kind === 'parallel' ? `${lineTex(L[0].m, L[0].b).slice(4)} = ${lineTex(L[s.i].m, L[s.i].b).slice(4)} \\text{ has no solution}`
        : s.kind === 'same' ? `\\text{the ${ORD[s.i]} equation is the first again}` : '');
      tex = parts.filter(Boolean).join(',\\quad ');
      const n = k === 2 ? 'both' : 'all three';
      if (S.kind === 'point') head = steps.some((s) => s.kind === 'same') ? `${k === 2 ? 'Two' : 'Three'} equations, two of them the same line: the lines meet at ${pt}, the one point that satisfies ${n}.`
        : k === 2 ? `Two equations: the lines meet at ${pt}, the one point that satisfies both.` : `Three equations: all three lines pass through ${pt}, the one point that satisfies all three.`;
      else if (S.kind === 'line') head = `${k === 2 ? 'Two' : 'Three'} equations, one line: infinitely many points satisfy ${n}.`;
      else if (steps.some((s) => s.kind === 'parallel')) head = `${k === 2 ? 'Two' : 'Three'} equations with parallel lines: no point satisfies ${n}.`;
      else head = 'Three equations: no point lies on all three lines.';
      note = S.kind === 'none' ? 'no solution' : S.kind === 'point' ? `exactly one solution, $(x, y) = ${pt}$` : 'infinitely many solutions';
    }
    headline(ctx, head.replace(/-/g, '−'));
    ro.set(tex, note, { form: `${k}-${S.kind}` });
  }
  still(d, draw);
})();

/* Figure 1.1.7 + 1.1.8: the axes of the plane and of space, and in each the solution set of one equation that fixes
   one unknown: y = c a line in the plane (above, a 2D frame on [−2, 2]²), z = c a plane in space (below, a free-orbit
   scene on the box ±2). One slider c, a special at 0, the book's picture: the x-axis and the xy-plane. Still. */
(function () {
  const d = sim('sim-one-equation', 490);
  const BOX = { l: 540, r: 860, t: 100, b: 420 }, WIN = [-2, 2], box3 = [[-2, 2], [-2, 2], [-2, 2]];
  const S = F.space3d(d, { box: box3, h: 460, fit: 2.3 });
  const cs = ctl(d.controls, { label: 'c', cls: '', key: 'c', min: -2, max: 2, step: 0.1, value: 0, unit: '', dec: 1, aria: 'the constant c of y = c and z = c', specials: [{ at: 0, label: 'the axis and the plane' }] });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  function draw() {
    const { ctx } = begin(d.c);
    const rc = C('region'), c = r2(cs.v);
    hits = [];
    const ax = axes(ctx, BOX, WIN, WIN, { xl: 'x', yl: 'y', nx: 4, ny: 4, fx: (q) => String(q).replace('-', '−'), fy: (q) => (q === -2 ? '' : String(q).replace('-', '−')) });
    line(ctx, ax.X(-2), ax.Y(c), ax.X(2), ax.Y(c), rc, 5);
    text(ctx, `$y = ${num(c)}$`, BOX.r + 18, ax.Y(c), rc, { size: 24, weight: 600, align: 'left', tex: true, bg: PAL.panel });
    for (let j = 0; j <= 8; j++) hits.push({ x: ax.X(-2 + j / 2), y: ax.Y(c), r: 14, name: `the line y = ${numT(c)}: every point (x, ${numT(c)})` });
    headline(ctx, c === 0 ? 'In the plane, $y = 0$ is a line, the $x$-axis.' : `In the plane, $y = ${num(c)}$ is a line, the points $(x, ${num(c)})$.`);
    S.set('axes', SP.axes(box3, { ticks: 1 }));
    S.set('plane', [
      ...SP.plane([0, 0, c], [0, 0, 1], rc, { box: box3, alpha: 0.4 }).map((m) => ({ ...m, name: `the plane z = ${numT(c)}: every point (x, y, ${numT(c)})` })),
      { k: 'label', s: `$z = ${num(c)}$`, p: [-1.9, 1.9, c], color: rc },
    ]);
    S.headline(c === 0 ? 'In space, $z = 0$ is a plane, the $xy$-plane.' : `In space, $z = ${num(c)}$ is a plane, the points $(x, y, ${num(c)})$.`);
    ro.set(`y = ${num(c)} \\;\\Rightarrow\\; (x,\\ ${num(c)}),\\qquad z = ${num(c)} \\;\\Rightarrow\\; (x,\\ y,\\ ${num(c)})`);
  }
  still(d, draw);
})();

/* Figure 1.1.9 + 1.1.10: one, two or three planes in space, the box x, y ±2, z ±1.5, no axes as in the book's panels.
   The first plane is z = 0. The second tilts about the line y = 0, z = ½ by θ₂: −sin θ₂ y + cos θ₂ z = ½ cos θ₂, parallel
   to the first at θ₂ = 0 and meeting it along y = −½ cot θ₂, z = 0 otherwise. The third turns about the vertical by θ₃
   and shifts by d₃: cos θ₃ x + sin θ₃ y = d₃, parallel to that line at θ₃ = 90°, where its shift either carries it
   through the line (d₃ = −½ cot θ₂) or leaves the three with no common point. The solution set is drawn in region: the
   meeting line, the common point, the common line; with three planes the pairwise meeting lines are drawn thin in
   guide ink, so the prism case shows them parallel. Presets: the book's four panels and Activity 1.1.2's two
   arrangements. Mathematical 3D, free orbit, no ground. Still. */
(function () {
  const d = sim('sim-planes');
  const box = [[-2, 2], [-2, 2], [-1.5, 1.5]];
  const S = F.space3d(d, { box, h: 600, fit: 2.1, turn: -0.75, tilt: 0.38 });
  const REF = ['plane-1', 'plane-2', 'plane-3'], ORD = ['first', 'second', 'third'], COUNT = { one: 1, two: 2, three: 3 };
  /* [count, θ₂, θ₃, d₃] of each book picture */
  const PRESETS = {
    'f9a': { label: 'Figure 1.1.9, one plane', v: ['one', 45, 30, 0.5] },
    'f9b': { label: 'Figure 1.1.9, two planes meeting in a line', v: ['two', 45, 30, 0.5] },
    'a2a': { label: 'Activity 1.1.2 (a): two parallel planes', v: ['two', 0, 30, 0.5] },
    'f10a': { label: 'Figure 1.1.10, three planes meeting in a point', v: ['three', 45, 30, 0.5] },
    'f10b': { label: 'Figure 1.1.10, three planes with no common point', v: ['three', 45, 90, -1.5] },
    'a2c': { label: 'Activity 1.1.2 (c): three planes through a line', v: ['three', 45, 90, -0.5] },
  };
  let sl = [];
  const cnt = choice(d.controls, {
    label: 'planes', key: 'count', value: 'two', aria: 'how many planes',
    options: [{ value: 'one', label: 'one' }, { value: 'two', label: 'two' }, { value: 'three', label: 'three' }],
    onInput: (v) => showFor(COUNT[v]),
  });
  const ex = select(d.controls, {
    label: 'example', key: 'example', value: 'f9b', aria: 'one of the book’s pictures',
    options: Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label })),
    onInput: (v) => { const p = PRESETS[v].v; for (let i = 0; i < 3; i++) sl[i].set(p[i + 1]); cnt.drive(p[0]); },
  });
  const yStar = () => (Math.sin(t2.v * DEG) > 1e-9 ? -0.5 / Math.tan(t2.v * DEG) : null);
  const t2 = ctl(d.controls, { label: '\\theta_2', cls: '', key: 'theta2', min: 0, max: 90, step: 1, value: 45, unit: '°', dec: 0, aria: 'the tilt of the second plane', specials: [{ at: 0, label: 'parallel to the first' }] });
  const t3 = ctl(d.controls, { label: '\\theta_3', cls: '', key: 'theta3', min: 0, max: 180, step: 1, value: 30, unit: '°', dec: 0, aria: 'the turn of the third plane', specials: [{ at: 90, label: 'parallel to the line of the first two' }] });
  const d3 = ctl(d.controls, { label: 'd_3', cls: '', key: 'd3', min: -2, max: 2, step: 0.1, value: 0.5, unit: '', dec: 1, aria: 'the shift of the third plane', specials: [{ at: () => (t3.v === 90 ? yStar() : null), label: 'through the line' }] });
  sl = [t2, t3, d3];
  const showFor = (k, ms) => { t2.show(k >= 2, ms); [t3, d3].forEach((s) => s.show(k >= 3, ms)); };
  showFor(2, { ms: 0 });
  const ro = readout(d);
  /* a x + b y + c z = e in TeX, zero terms dropped and unit coefficients bare: z = 0, −0.71y + 0.71z = 0.35, y = −1.5 */
  const linTex = (n, e) => {
    const terms = [];
    ['x', 'y', 'z'].forEach((v, i) => {
      const a = r2(n[i]); if (a === 0) return;
      const mag = Math.abs(a) === 1 ? '' : num(Math.abs(a));
      terms.push(terms.length === 0 ? `${a < 0 ? '-' : ''}${mag}${v}` : ` ${a < 0 ? '-' : '+'} ${mag}${v}`);
    });
    return `${terms.join('') || '0'} = ${num(e)}`;
  };
  /* the planes as n · p = e */
  const planes = () => {
    const a = t2.v * DEG, b = t3.v * DEG;
    const P = [
      { n: [0, 0, 1], e: 0, p: [0, 0, 0] },
      { n: [0, -Math.sin(a), Math.cos(a)], e: 0.5 * Math.cos(a), p: [0, 0, 0.5] },
      { n: [Math.cos(b), Math.sin(b), 0], e: d3.v, p: SP.mul([Math.cos(b), Math.sin(b), 0], d3.v) },
    ];
    return P.map((Q) => ({ ...Q, tex: linTex(Q.n, Q.e) }));
  };
  const onPlane = (P, q) => near(SP.dot(P.n, q), P.e);
  /* the line where two planes meet: its direction and the point of it nearest the origin, or null where they are parallel */
  function meet2(A, B) {
    const dir = SP.cross(A.n, B.n);
    if (SP.norm(dir) < 1e-6) return null;
    const u = SP.unit(dir);
    /* solve A.n·p = A.e, B.n·p = B.e, u·p = 0 by Cramer's rule */
    const M = [A.n, B.n, u], rhs = [A.e, B.e, 0];
    const det = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
    const D = det(M), col = (j) => det(M.map((row, i) => row.map((v, jj) => (jj === j ? rhs[i] : v))));
    return { p: [col(0) / D, col(1) / D, col(2) / D], u };
  }
  /* the solution set of the first k planes: a plane, a line, a point or nothing */
  function solve(P, k) {
    let Sx = { kind: 'plane', P: P[0] };
    for (let i = 1; i < k; i++) {
      const Q = P[i];
      if (Sx.kind === 'none') break;
      if (Sx.kind === 'point') { Sx = onPlane(Q, Sx.p) ? Sx : { kind: 'none' }; continue; }
      if (Sx.kind === 'line') {
        const s = SP.dot(Q.n, Sx.u);
        if (Math.abs(s) < 1e-6) { Sx = onPlane(Q, Sx.p) ? Sx : { kind: 'none' }; continue; }
        const t = (Q.e - SP.dot(Q.n, Sx.p)) / s;
        Sx = { kind: 'point', p: SP.add(Sx.p, SP.mul(Sx.u, t)) }; continue;
      }
      const m = meet2(Sx.P, Q);
      Sx = m ? { kind: 'line', ...m } : onPlane(Q, Sx.P.p) ? Sx : { kind: 'none' };
    }
    return Sx;
  }
  const v3 = (p) => `(${num(p[0])}, ${num(p[1])}, ${num(p[2])})`;
  /* the corner each plane's label sits at: the first plane's far right, the second's top, the third's bottom, so the three stay apart */
  const DIRS = [[0.2, 1, 0], [0, 0.3, 1], [0, -0.3, -1]];
  const corner = (poly, dir) => poly.reduce((best, q) => (SP.dot(q, dir) > SP.dot(best, dir) ? q : best), poly[0]);

  function draw() {
    const rc = C('region');
    const k = COUNT[cnt.value], kFrom = COUNT[cnt.from], t = ease.smooth(cnt.k);
    const show = (i) => (k > i ? (kFrom > i ? 1 : t) : kFrom > i ? 1 - t : 0);
    const P = planes(), Sx = solve(P, k);
    const marks = [];
    P.forEach((Q, i) => {
      const a = show(i); if (!(a > 0.001)) return;
      const col = F.ref(REF[i]), name = `the ${ORD[i]} plane, ${Q.tex.replace(/-/g, '−')}`;
      marks.push(...SP.plane(Q.p, Q.n, col, { box, alpha: 0.38 * a }).map((m) => (m.k === 'line' ? { ...m, color: alpha(col, a), name } : { ...m, name })));
      if (a > 0.5) { const poly = SP.clipPlane(Q.p, Q.n, box); if (poly.length) marks.push({ k: 'label', s: `$${Q.tex}$`, p: corner(poly, DIRS[i]), color: col }); }
    });
    S.set('planes', marks);
    /* the pairwise meeting lines of three planes, thin, so the prism shows them parallel */
    const pair = [];
    if (k === 3 && t > 0.5) [[0, 1], [0, 2], [1, 2]].forEach(([i, j]) => { const m = meet2(P[i], P[j]); if (m) pair.push(...SP.line(m.p, m.u, 'guide', { box, w: 2, dash: [8, 8] })); });
    S.set('pairs', pair);
    /* the solution set in region */
    const sol = [];
    if (Sx.kind === 'line') sol.push(...SP.line(Sx.p, Sx.u, rc, { box, w: 6 }).map((m) => ({ ...m, name: `the line of solutions through ${v3(Sx.p).replace(/-/g, '−')}` })));
    if (Sx.kind === 'point') sol.push({ k: 'dot', p: Sx.p, color: rc, r: 10, name: `${v3(Sx.p).replace(/-/g, '−')}: the one point on all three planes` });
    S.set('solution', sol);
    /* headline and readout */
    const system = P.slice(0, k).map((Q) => Q.tex).join(',\\quad ');
    let head, ans;
    if (k === 1) { head = 'One equation in three unknowns: every point of the plane is a solution, infinitely many.'; ans = '\\text{every point of the plane}'; }
    else if (Sx.kind === 'plane') { head = `${k === 2 ? 'Two' : 'Three'} equations, one plane: every point of it satisfies all of them.`; ans = '\\text{every point of the plane}'; }
    else if (Sx.kind === 'line') { head = k === 2 ? 'Two planes meet in a line: infinitely many points satisfy both equations.' : 'Three planes through one line: infinitely many points satisfy all three equations.'; ans = `(x, y, z) = ${v3(Sx.p)} + t\\,${v3(Sx.u)}`; }
    else if (Sx.kind === 'point') { head = `Three planes meet in one point, ${v3(Sx.p).replace(/-/g, '−')}: exactly one solution.`; ans = `(x, y, z) = ${v3(Sx.p)}`; }
    else if (k === 2 || t2.v === 0) { head = k === 2 ? 'The second plane is parallel to the first: no point satisfies both equations.' : 'The first two planes are parallel: no point satisfies all three equations.'; ans = '\\text{no solution}'; }
    else { head = 'The third plane is parallel to the line of the first two and misses it: no point satisfies all three equations.'; ans = '\\text{no solution}'; }
    S.headline(head);
    ro.set(`${system} \\;\\Rightarrow\\; ${ans}`, undefined, { form: `${k}-${Sx.kind}` });
  }
  still(d, draw);
})();
};
