/* Figures for section 4.2 Finding eigenvalues and eigenvectors. */
window.OMNISTAX_FIGURES = window.OMNISTAX_FIGURES || {};
window.OMNISTAX_FIGURES['4.2'] = function (root, F) {
const { C, PAL, alpha, ctl, select, begin, axes, plot, pinned, line, arrow, dot, text, headline, register, readout, hover, ease, fmt, arrival } = F;
const sim = (id, H) => F.sim(root, id, H);
const still = (d, draw) => register(d.fig, { update: () => {}, draw });
/* a number as the figure writes it: at most two decimals, no trailing zeros, never −0 */
const r2 = (v) => { const r = Math.round(v * 100) / 100; return Object.is(r, -0) ? 0 : r; };
const num = (v) => String(r2(v));
const numT = (v) => num(v).replace('-', '−');   /* the same in figure text and hover names, with a true minus */
const lerp = (a, b, k) => a + (b - a) * k;
const EPS = 1e-9;

/* Sim: the characteristic polynomial of a 2 × 2 matrix. det(A − λI) = λ² − (a + d)λ + (ad − bc) is drawn as a
   graph against λ on the left, its roots marked on the axis as the eigenvalues; on the right the plane shows
   each eigenspace E_λ = Nul(A − λI) as a line through the origin with a basis vector on it, the whole plane
   shaded when the eigenspace is two-dimensional, and nothing when the roots are complex. The entries a, b, c,
   d are sliders (−12 to 12, step 0.5), each with a dashed special at the value where the two roots meet,
   placed from the other three; the book's 2 × 2 matrices of this section are presets in a dropdown, the one
   of Activity 4.2.2 the default, and the dropdown reads "entries set below" once a slider leaves a preset.
   The graph runs λ from −8 to 12 (40 units to 1) and det(A − λI) from −25 to 50; a root past the window is
   pinned at its edge with its value, and the parabola is clipped. The plane runs x and y from −4 to 4 at
   50 units to 1. Still: a polynomial has no clock; a change of preset bends the entries, and with them the
   parabola, the roots and the lines, over the dropdown's own 0.9 s. */
(function () {
  const d = sim('sim-characteristic-polynomial', 620);
  const UG = 40, GB = { l: 90, t: 120, r: 90 + 20 * UG, b: 540 };         /* the graph: λ ∈ [−8, 12], det ∈ [−25, 50] */
  const UP = 50, PB = { l: 960, t: 120, r: 960 + 8 * UP, b: 120 + 8 * UP };   /* the plane: x, y ∈ [−4, 4] */
  const PRESETS = [
    { value: 'act-2', label: '[1 2; 2 1] · Activity 4.2.2', e: [1, 2, 2, 1] },
    { value: 'ex-1', label: '[−4 4; −12 10] · Example 4.2.1', e: [-4, 4, -12, 10] },
    { value: 'ex-2', label: '[5 −1; 4 1] · Example 4.2.2', e: [5, -1, 4, 1] },
    { value: 'act-3e', label: '[2 1; 0 2] · Activity 4.2.3', e: [2, 1, 0, 2] },
    { value: 'act-3d', label: '[3 0; 0 3] · Activity 4.2.3', e: [3, 0, 0, 3] },
    { value: 'ex-5', label: '[1 1; −1 3] · Example 4.2.5', e: [1, 1, -1, 3] },
    { value: 'ex-6', label: '[−1 0; 0 −1] · Example 4.2.6', e: [-1, 0, 0, -1] },
    { value: 'act-2f', label: '[0 −1; 1 0] · Activity 4.2.2', e: [0, -1, 1, 0] },
    { value: 'act-4b', label: '[0 −1; 4 −4] · Activity 4.2.4', e: [0, -1, 4, -4] },
    { value: 'free', label: 'entries set below' },
  ];
  const byValue = Object.fromEntries(PRESETS.map((p) => [p.value, p]));
  let sA, sB, sC, sD, fromE = null;
  const entries = () => [sA.v, sB.v, sC.v, sD.v];
  const pick = select(d.controls, {
    label: 'A', key: 'matrix', value: 'act-2', options: PRESETS, aria: 'the matrix A, one of the book’s, or the entries set by the sliders',
    onInput: (v) => { const p = byValue[v]; if (!p.e) return; fromE = entries(); [sA, sB, sC, sD].forEach((s, i) => s.set(p.e[i])); },
  });
  /* a slider moved by hand leaves the preset: the dropdown says so, silently */
  const left = () => { if (pick.value !== 'free') pick.set('free'); };
  /* the value of one entry at which the two roots meet, from the other three: the discriminant (a − d)² + 4bc = 0 */
  const meetA = (sign) => () => { const bc = sB.v * sC.v; if (bc > 0) return null; const r = 2 * Math.sqrt(-bc); return sign < 0 && r === 0 ? null : sD.v + sign * r; };
  const meetD = (sign) => () => { const bc = sB.v * sC.v; if (bc > 0) return null; const r = 2 * Math.sqrt(-bc); return sign < 0 && r === 0 ? null : sA.v + sign * r; };
  const meetB = () => (sC.v === 0 ? null : -((sA.v - sD.v) ** 2) / (4 * sC.v));
  const meetC = () => (sB.v === 0 ? null : -((sA.v - sD.v) ** 2) / (4 * sB.v));
  const slider = (label, key, value, specials, aria) => ctl(d.controls, { label, cls: '', key, min: -12, max: 12, step: 0.5, value, unit: '', dec: 1, aria, specials, onInput: left });
  sA = slider('a', 'a', 1, [{ at: meetA(1), label: 'roots meet' }, { at: meetA(-1), label: 'roots meet' }], 'the entry a in the first row and first column of A');
  sB = slider('b', 'b', 2, [{ at: meetB, label: 'roots meet' }], 'the entry b in the first row and second column of A');
  sC = slider('c', 'c', 2, [{ at: meetC, label: 'roots meet' }], 'the entry c in the second row and first column of A');
  sD = slider('d', 'd', 1, [{ at: meetD(1), label: 'roots meet' }, { at: meetD(-1), label: 'roots meet' }], 'the entry d in the second row and second column of A');
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);

  /* the eigenvalues of [a b; c d] */
  function eig(E) {
    const [a, b, c, dd] = E, tr = a + dd, det = a * dd - b * c, disc = tr * tr - 4 * det;
    if (disc < -EPS) return { kind: 'complex', re: tr / 2, im: Math.sqrt(-disc) / 2, tr, det };
    if (disc <= EPS) return { kind: 'repeated', roots: [tr / 2], tr, det };
    const s = Math.sqrt(disc); return { kind: 'distinct', roots: [(tr + s) / 2, (tr - s) / 2], tr, det };
  }
  /* the eigenspace of λ: the whole plane, or the line through a basis vector written as the book would */
  function space(E, l) {
    const [a, b, c, dd] = E, row1 = [a - l, b], row2 = [c, dd - l];
    const n1 = Math.hypot(row1[0], row1[1]), n2 = Math.hypot(row2[0], row2[1]);
    if (n1 < 1e-7 && n2 < 1e-7) return { plane: true };
    const [p, q] = n1 >= n2 ? row1 : row2;
    let v = [q, -p];
    const small = Math.min(...v.filter((x) => Math.abs(x) > 1e-7).map(Math.abs));
    v = v.map((x) => x / small);
    for (let k = 1; k <= 6; k++) if (v.every((x) => Math.abs(x * k - Math.round(x * k)) < 1e-6)) { v = v.map((x) => Math.round(x * k)); break; }
    v = v.map((x) => (Math.abs(x) < 1e-7 ? 0 : x));
    const last = v[1] !== 0 ? v[1] : v[0];
    if (last < 0) v = v.map((x) => -x);
    return { plane: false, v: v.map(r2) };
  }
  const vecT = (v) => `[${numT(v[0])}, ${numT(v[1])}]`, vecX = (v) => `[${num(v[0])}, ${num(v[1])}]`;
  const lamT = (l) => numT(l), lamX = (l) => num(l);
  const Esub = (l) => `\\htmlClass{kv-region}{E_{${num(l)}}}`;
  const shiftTex = (l) => (l === 0 ? '' : l < 0 ? ` - (${num(l)})\\kI` : ` - ${num(l)}\\kI`);   /* A − 3I, A − (−1)I, A */
  const Ewords = (l) => `E_{${numT(l)}}`;
  /* the polynomial λ² − (tr)λ + det as TeX, zero terms left out */
  function polyTex(tr, det) {
    let s = '\\klambda^2';
    if (tr !== 0) s += (tr > 0 ? ' - ' : ' + ') + (Math.abs(tr) === 1 ? '' : num(Math.abs(tr))) + '\\klambda';
    if (det !== 0) s += (det > 0 ? ' + ' : ' - ') + num(Math.abs(det));
    return s;
  }
  const factor = (l) => (l === 0 ? '\\klambda' : `(\\klambda ${l > 0 ? '-' : '+'} ${num(Math.abs(l))})`);
  const cplx = (re, im, sgn) => { const i = im === 1 ? 'i' : `${num(im)}i`; return re === 0 ? (sgn > 0 ? i : `-${i}`) : `(${num(re)} ${sgn > 0 ? '+' : '-'} ${i})`; };
  const cfactor = (re, im, sgn) => { const z = cplx(re, im, sgn); return re === 0 && sgn < 0 ? `(\\klambda + ${cplx(re, im, 1)})` : `(\\klambda - ${z})`; };

  /* the line through the origin along v across the plane, clipped, and the point where it leaves the box at the end `sgn` */
  function lineThrough(ctx, ax, v, color, w, a) {
    const L = Math.hypot(v[0], v[1]) || 1, ux = v[0] / L, uy = v[1] / L;
    ctx.save(); ctx.globalAlpha *= a; ctx.beginPath(); ctx.rect(PB.l, PB.t, PB.r - PB.l, PB.b - PB.t); ctx.clip();
    line(ctx, ax.X(-8 * ux), ax.Y(-8 * uy), ax.X(8 * ux), ax.Y(8 * uy), color, w);
    ctx.restore();
  }
  function exitPoint(v, sgn) {
    const L = Math.hypot(v[0], v[1]) || 1, ux = sgn * v[0] / L, uy = sgn * v[1] / L;
    const t = Math.min(Math.abs(ux) > 1e-9 ? 4 / Math.abs(ux) : Infinity, Math.abs(uy) > 1e-9 ? 4 / Math.abs(uy) : Infinity);
    return [ux * t, uy * t, ux, uy];
  }
  /* the name of an eigenspace beside its line, 34 units in from the end the line leaves the box at, on the side away from the origin's quadrant */
  function lineLabel(ctx, ax, v, s, color, sgn, a) {
    const [ex, ey, ux, uy] = exitPoint(v, sgn);
    const px = ax.X(ex - ux * 0.7), py = ax.Y(ey - uy * 0.7);
    const nx = -uy, ny = ux;   /* a normal, in plane units; the label sits 0.45 units off the line */
    let lx = ax.X(ex - ux * 0.7 + nx * 0.45), ly = ax.Y(ey - uy * 0.7 + ny * 0.45);
    lx = Math.min(Math.max(lx, PB.l + 34), PB.r - 34); ly = Math.min(Math.max(ly, PB.t + 16), PB.b - 16);
    ctx.save(); ctx.globalAlpha *= a;
    text(ctx, s, lx, ly, color, { size: 22, weight: 600, align: 'center', bg: PAL.panel });
    ctx.restore();
    return [px, py];
  }

  function draw() {
    const { ctx } = begin(d.c);
    const cE = C('eigenvalue'), cR = C('region'), cV = C('vector'), ink = PAL.ink, mu = PAL.muted;
    const g = ease.smooth(arrival(d));
    const cur = entries(), k = pick.k;
    const E = k < 1 && fromE ? cur.map((x, i) => lerp(fromE[i], x, k)) : cur;
    const ev = eig(E), { tr, det } = ev;
    hits = [];
    /* the graph of the characteristic polynomial against λ */
    const ax = axes(ctx, GB, [-8, 12], [-25, 50], { xl: 'λ', xc: cE, yl: 'det(A − λI)', yc: ink, nx: 10, ny: 5, fx: (q) => fmt(q, 0), fy: (q) => fmt(q, 0) });
    line(ctx, GB.l, ax.Y(0), GB.r, ax.Y(0), alpha(ink, 0.5), 2);
    line(ctx, ax.X(0), GB.t, ax.X(0), GB.b, alpha(ink, 0.5), 2);
    const p = (l) => l * l - tr * l + det;
    plot(ctx, ax, p, ink, { w: 5 });
    const vx = tr / 2, vy = p(vx);
    if (vx >= -8 && vx <= 12 && vy >= -25 && vy <= 50) hits.push({ x: ax.X(vx), y: ax.Y(vy), r: 16, name: `the characteristic polynomial det(A − λI) = ${polyTex(tr, det).replace(/\\klambda/g, 'λ').replace(/\^2/g, '²').replace(/-/g, '−')}; its lowest point is at λ = ${numT(vx)}` });
    const roots = ev.kind === 'complex' ? [] : ev.roots;
    ctx.save(); ctx.globalAlpha *= g;
    roots.forEach((l, i) => {
      const mult = ev.kind === 'repeated' ? 2 : 1;
      const s = `λ = ${lamT(l)}` + (mult === 2 ? ', multiplicity 2' : '');
      if (l < -8 || l > 12) { const q = pinned(ctx, GB, ax.X, ax.Y, l, 0, cE, s); hits.push({ x: q.x, y: q.y, r: 18, name: `λ = ${lamT(l)}, an eigenvalue of A beyond the window: det(A − λI) = 0 there` }); return; }
      dot(ctx, ax.X(l), ax.Y(0), cE, true, 10);
      const below = p(l + 0.3) + p(l - 0.3) >= 0 || mult === 2;   /* the label on the side the parabola leaves clear */
      const lx = Math.min(Math.max(ax.X(l), GB.l + 60), GB.r - 90), ly = ax.Y(0) + (below ? 30 : -30);
      text(ctx, s, lx, ly, cE, { size: 20, weight: 600, align: 'center', bg: PAL.panel });
      hits.push({ x: ax.X(l), y: ax.Y(0), r: 18, name: mult === 2 ? `λ = ${lamT(l)}, the one eigenvalue of A, a root of multiplicity 2: the parabola touches the axis here` : `λ = ${lamT(l)}, an eigenvalue of A: det(A − λI) = 0 here, so A − λI is not invertible` });
    });
    ctx.restore();
    /* the plane: the eigenspaces */
    const px = axes(ctx, PB, [-4, 4], [-4, 4], { xl: 'x', yl: 'y', nx: 8, ny: 8, fx: (q) => fmt(q, 0), fy: (q) => fmt(q, 0) });
    line(ctx, PB.l, px.Y(0), PB.r, px.Y(0), alpha(ink, 0.5), 2);
    line(ctx, px.X(0), PB.t, px.X(0), PB.b, alpha(ink, 0.5), 2);
    const spaces = roots.map((l) => ({ l, ...space(E, l) }));
    const noteParts = [];
    spaces.forEach((S, i) => {
      if (S.plane) {
        ctx.save(); ctx.globalAlpha *= g * 0.14; ctx.fillStyle = cR; ctx.fillRect(PB.l, PB.t, PB.r - PB.l, PB.b - PB.t); ctx.restore();
        ctx.save(); ctx.globalAlpha *= g;
        arrow(ctx, px.X(0), px.Y(0), px.X(1), px.Y(0), cV, 4); arrow(ctx, px.X(0), px.Y(0), px.X(0), px.Y(1), cV, 4);
        text(ctx, `${Ewords(S.l)} = ℝ^2`, PB.l + 16, PB.t + 24, cR, { size: 22, weight: 600, align: 'left', bg: PAL.panel });
        ctx.restore();
        hits.push({ x: px.X(1), y: px.Y(0), r: 16, name: `[1, 0], an eigenvector: every vector is one, since A − ${lamT(S.l)}I is the zero matrix` });
        hits.push({ x: px.X(0), y: px.Y(1), r: 16, name: `[0, 1], an eigenvector: with [1, 0] a basis of ${Ewords(S.l)} = ℝ²` });
        hits.push({ x: px.X(-2), y: px.Y(-2), r: 40, name: `${Ewords(S.l)}, the eigenspace of λ = ${lamT(S.l)}: the whole plane, a two-dimensional eigenspace` });
        noteParts.push(`$${Esub(S.l)} = \\kNul(\\kA${shiftTex(S.l)}) = \\mathbb{R}^2$: every vector is an eigenvector`);
        return;
      }
      const v = S.v, L = Math.hypot(v[0], v[1]), scale = L > 3.6 ? 3 / Math.max(Math.abs(v[0]), Math.abs(v[1])) : 1;
      lineThrough(ctx, px, v, cR, 4, g);
      ctx.save(); ctx.globalAlpha *= g;
      arrow(ctx, px.X(0), px.Y(0), px.X(v[0] * scale), px.Y(v[1] * scale), cV, 4);
      ctx.restore();
      const sgn = i === 0 ? 1 : -1;   /* the two names at opposite ends, so close lines keep their labels apart */
      lineLabel(ctx, px, v, Ewords(S.l), cR, sgn, g);
      const [ex, ey] = exitPoint(v, sgn);
      hits.push({ x: px.X(ex * 0.55), y: px.Y(ey * 0.55), r: 18, name: `${Ewords(S.l)} = Nul(A − ${lamT(S.l)}I), the eigenspace of λ = ${lamT(S.l)}: the line through ${vecT(v)}` });
      hits.push({ x: px.X(v[0] * scale), y: px.Y(v[1] * scale), r: 16, name: scale === 1 ? `${vecT(v)}, a basis vector of ${Ewords(S.l)}: A${vecT(v)} = ${lamT(S.l)}${vecT(v)}` : `the direction of ${vecT(v)}, a basis vector of ${Ewords(S.l)}, drawn shorter to fit` });
      noteParts.push(`$${Esub(S.l)} = \\kNul(\\kA${shiftTex(S.l)})$ is the line through $${vecX(v)}$`);
    });
    if (ev.kind === 'complex') {
      text(ctx, 'no eigenspace in the plane', (PB.l + PB.r) / 2, PB.t + 24, mu, { size: 20, align: 'center', bg: PAL.panel });
    }
    /* headline and readout */
    let h, form;
    if (ev.kind === 'distinct') { h = `The eigenvalues of $\\kA$ are the two roots $\\klambda = ${lamX(ev.roots[0])}$ and $\\klambda = ${lamX(ev.roots[1])}$ of its characteristic polynomial, each of multiplicity $1$.`; form = 'distinct'; }
    else if (ev.kind === 'repeated') { h = `$\\kA$ has one eigenvalue $\\klambda = ${lamX(ev.roots[0])}$ of multiplicity $2$: the parabola touches the axis without crossing it${spaces[0] && spaces[0].plane ? ', and every vector is an eigenvector' : ', and its eigenspace is a single line'}.`; form = 'repeated'; }
    else { h = `The parabola never meets the axis: the eigenvalues $\\klambda = ${cplx(ev.re, ev.im, 1)}$ and $\\klambda = ${cplx(ev.re, ev.im, -1)}$ are complex, and $\\kA$ has no real eigenvector.`; form = 'complex'; }
    headline(ctx, h);
    const fac = ev.kind === 'distinct' ? `\\mk{f1}{${factor(ev.roots[0])}}\\mk{f2}{${factor(ev.roots[1])}}`
      : ev.kind === 'repeated' ? `\\mk{f1}{${factor(ev.roots[0])}^2}`
        : `\\mk{f1}{${cfactor(ev.re, ev.im, 1)}}\\mk{f2}{${cfactor(ev.re, ev.im, -1)}}`;
    const note = ev.kind === 'complex' ? `No real $\\klambda$ makes $\\kA - \\klambda\\kI$ singular, so $\\kA$ has no eigenspace in $\\mathbb{R}^2$.` : noteParts.join('; ') + '.';
    ro.set(`\\det(\\kA - \\klambda\\kI) = \\mk{p}{${polyTex(tr, det)}} = ${fac}`, note, { form });
  }
  still(d, draw);
})();
};
