/* Figures for section 7.3 Principal Component Analysis. */
window.OMNISTAX_FIGURES = window.OMNISTAX_FIGURES || {};
window.OMNISTAX_FIGURES['7.3'] = function (root, F) {
const { C, PAL, alpha, ctl, choice, select, begin, axes, drag, line, arrow, dot, text, headline, register, readout, hover } = F;
const SP = F.space;
const sim = (id, H) => F.sim(root, id, H);
const still = (d, draw) => register(d.fig, { update: () => {}, draw });
/* a number as the figure writes it: at most p decimals, no trailing zeros, never −0; TeX takes a hyphen, figure text a true minus */
const rnd = (v, p = 2) => { const q = 10 ** p, r = Math.round(v * q) / q; return Object.is(r, -0) ? 0 : r; };
const num = (v, p = 2) => String(rnd(v, p));
const numT = (v, p = 2) => num(v, p).replace('-', '−');
const col = (v, p = 2) => `\\left[\\begin{array}{r} ${v.map((x) => num(x, p)).join(' \\\\ ')} \\end{array}\\right]`;
const pct = (v) => `${num(100 * v, 1)}\\%`;
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

/* ---------- the principal components of a data set, computed here from the data ----------
   The demeaned data matrix A (one column per point), the covariance matrix C = (1/N)AAᵀ, and its
   eigenvalues and orthonormal eigenvectors by Jacobi rotations, sorted so that the eigenvalues
   decrease (the principal components u₁, u₂, …). `sign(u, j)` fixes each eigenvector's sign to the
   book's, since an eigenvector is only defined up to sign. */
function pca(rows, sign) {
  const N = rows.length, n = rows[0].length;
  const m = Array.from({ length: n }, (_, i) => rows.reduce((s, r) => s + r[i], 0) / N);
  const A = rows.map((r) => r.map((x, i) => x - m[i]));
  const Cm = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => A.reduce((s, r) => s + r[i] * r[j], 0) / N));
  const a = Cm.map((r) => r.slice()), V = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 60; sweep++) {
    let off = 0; for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += a[p][q] ** 2;
    if (off < 1e-22) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(a[p][q]) < 1e-15) continue;
      const th = (a[q][q] - a[p][p]) / (2 * a[p][q]), t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1));
      const c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) { const akp = a[k][p], akq = a[k][q]; a[k][p] = c * akp - s * akq; a[k][q] = s * akp + c * akq; }
      for (let k = 0; k < n; k++) { const apk = a[p][k], aqk = a[q][k]; a[p][k] = c * apk - s * aqk; a[q][k] = s * apk + c * aqk; }
      for (let k = 0; k < n; k++) { const vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq; }
    }
  }
  const order = a.map((r, i) => [r[i], i]).sort((x, y) => y[0] - x[0]);
  const lam = order.map(([l]) => l), U = order.map(([, i], j) => { const u = V.map((r) => r[i]); const sg = sign(u, j) < 0 ? -1 : 1; return u.map((x) => sg * x); });
  const dt = (u, v) => u.reduce((s, x, i) => s + x * v[i], 0);
  return { N, n, m, A, C: Cm, lam, U, V: lam.reduce((s, l) => s + l, 0), coords: A.map((r) => [dt(U[0], r), dt(U[1], r)]), dt };
}

/* ---------- Figure 7.3.1: a cloud in ℝ³, the plane of its first two principal components, and the coordinates ----------
   Activity 7.3.3's 100 demeaned points in ℝ³ (`pca-demo.csv`, from github.com/davidaustinm/ula_modules),
   C = (1/100)AAᵀ with eigenvalues 10216, 1776, 204; u₁ = [0.75, 0.51, 0.42], u₂ = [−0.45, 0.86, −0.25]
   (signs chosen with u₁'s first and u₂'s second component positive). Above, mathematical 3D (rule 28.3) on
   F.space3d: the box ±220 × ±170 × ±120 holds every point, free orbit with the pitch bounded to
   [−0.3, 1.45] (x₃ reads up), no spin, no zoom, no ground. W₂ is drawn in `region`, ruled every 100 along
   u₁ and u₂; the data points in `point`, each one's projection a small hollow dot on the plane. u₁ and u₂
   are unit vectors and would not show at the data's scale, so they are drawn as 100u₁ and 100u₂ and
   labelled so. The data point x the slider picks (the book's sketch has one) is drawn dashed to its dot,
   x̂ = (u₁·x)u₁ + (u₂·x)u₂ solid, and x − x̂ dotted from x̂ to x with its right-angle mark. Below, flat: the
   coordinates (u₁·x, u₂·x) of all 100 projections on equal scales, so the plot is honestly wider than tall,
   x̂ as an arrow to its coordinates; a click on a dot picks that point. Still: no clock. */
(function () {
  const d = sim('sim-pca-projection', 680);
  const box = [[-220, 220], [-170, 170], [-120, 120]];
  const S = F.space3d(d, { box, h: 600, pitch: [-0.3, 1.45], fit: 3.1, turn: -2.75, tilt: 0.78 });
  if (d.c && d.c.parentNode === d.stage) d.stage.appendChild(d.c);     /* the flat panel under the scene, as the book reads space, then plane */
  const DEMO = [[9.41,17.77,1.92],[-71.1,-20.46,-28.54],[-80.94,-60.99,-26.9],[27.98,34.3,17.58],[23.07,-91.21,22.19],[-62.74,-39.34,-36.52],[-21.29,-77.07,-46.95],[-6.66,-63.79,-16.99],[35.42,-6.52,30.4],[-11.62,45.71,-26.98],[-30.47,-45.24,8.36],[-23.97,-104.61,-24.37],[-58.29,-53.98,-25.75],[-51.68,10.07,-40.34],[96.62,-1.14,70.34],[19.95,19.5,19.92],[-121.19,-56.68,-78.44],[163.73,103.29,78.06],[-24.6,31.37,-17.16],[-93.32,13.76,-34.34],[-48.66,-18.39,-22.81],[130.14,114.84,68.05],[35.26,-14.37,22.2],[25.84,-57.34,10.62],[47.21,-12.23,57.55],[-144.64,-100.44,-74.72],[45.14,35.05,33.26],[0.24,-101.83,-24.75],[15.22,153.58,2.02],[122.94,67.61,86.51],[45.62,120.05,34.71],[75.56,-29.55,20.57],[-6.69,-29.36,7.1],[-206.11,-122.99,-111.49],[-61.15,41.41,-13.54],[45.21,29.07,52.86],[-47.49,-52.72,-53.35],[55.76,-59.62,33.38],[-37.25,-63.39,-54.95],[168.1,121.16,91.47],[-161.7,-155.71,-90.35],[-33.45,-9.44,-27.79],[26.22,-9.81,10.26],[86.47,13.45,35.49],[12.84,-51.91,-6.41],[33.59,20.47,-1.81],[-1.71,0.55,4.4],[41.22,-25.98,18.88],[59.14,-1.4,37.26],[-52.89,-64.47,8.13],[48.09,-9.07,-12.42],[38.36,107.41,20.4],[-28.39,-50.02,-1.9],[-4.26,30.23,11.01],[42.0,-46.31,42.45],[-6.83,-26.18,-19.2],[-48.92,-51.1,-40.02],[-164.8,-64.29,-81.99],[91.58,39.29,47.86],[130.16,125.88,57.19],[-75.69,-9.81,-56.15],[36.8,31.61,46.11],[-59.3,-0.63,-13.47],[-11.29,-81.37,-19.13],[72.94,107.75,13.55],[-67.76,10.49,-35.09],[20.98,42.5,-6.42],[28.82,76.67,33.23],[70.23,-10.81,40.31],[93.62,6.5,43.78],[-24.23,13.07,18.58],[70.31,11.7,59.47],[39.3,109.59,21.07],[5.7,22.57,-4.11],[-70.8,-45.4,-37.13],[-87.85,-3.27,-57.71],[36.13,28.41,-5.1],[-31.83,-5.62,11.87],[-112.17,-88.75,-57.32],[83.92,22.78,45.62],[-37.13,-38.17,-28.39],[37.79,85.1,53.53],[184.61,153.29,99.18],[134.71,23.02,55.5],[48.02,33.43,4.85],[-92.26,-55.82,-48.53],[-35.6,9.18,-40.06],[-15.77,53.33,-21.0],[-105.76,-27.67,-76.07],[-120.05,-7.09,-83.55],[-84.14,-21.19,-34.55],[91.57,42.05,78.08],[77.86,-26.83,46.38],[94.96,113.18,39.29],[39.74,38.9,41.81],[-182.94,-40.4,-91.28],[-159.59,-122.43,-78.82],[5.16,20.48,-1.61],[-57.05,-29.19,-16.8],[72.79,111.93,38.48]];
  const P = pca(DEMO, (u, j) => (j === 0 ? u[0] : j === 1 ? u[1] : 1));
  const [u1, u2] = P.U, u3 = SP.cross(u1, u2);
  const xr = [-280, 280], yr = [-130, 140], BOX = { l: 150, r: 1290, t: 40, b: 0 };
  BOX.b = BOX.t + ((yr[1] - yr[0]) / (xr[1] - xr[0])) * (BOX.r - BOX.l);     /* one scale on both axes */
  const jS = ctl(d.controls, { label: 'j', cls: '', key: 'point', min: 1, max: 100, step: 1, value: 82, unit: '', dec: 0, aria: 'which of the 100 data points is followed as x' });
  const ro = readout(d);
  let ax = null, hits = [];
  hover(d.stage, () => hits, d.c);
  d.c.addEventListener('pointerdown', (e) => {
    if (!ax) return;
    const r = d.c.getBoundingClientRect(), H = +(d.c.dataset.h ?? 0); if (!r.width || !H) return;
    const px = ((e.clientX - r.left) / r.width) * 1400, py = ((e.clientY - r.top) / r.height) * H;
    let best = -1, bd = 22;
    P.coords.forEach(([a, b], i) => { const dd = Math.hypot(ax.X(a) - px, ax.Y(b) - py); if (dd < bd) { bd = dd; best = i; } });
    if (best >= 0) jS.drive(best + 1);
  });
  const pbox = [[-200, 200], [-160, 160], [-110, 110]];
  const lattice = [];
  for (let i = -3; i <= 3; i++) { lattice.push(...SP.line(SP.mul(u2, 100 * i), u1, 'guide', { box: pbox, w: 1.2 })); lattice.push(...SP.line(SP.mul(u1, 100 * i), u2, 'guide', { box: pbox, w: 1.2 })); }
  const pt = (v, p = 1) => `(${v.map((x) => numT(x, p)).join(', ')})`;
  still(d, () => {
    const pc = C('point'), vc = C('vector'), rc = C('region');
    const j = Math.round(jS.v) - 1, x = DEMO[j], [c1, c2] = P.coords[j];
    const xh = SP.add(SP.mul(u1, c1), SP.mul(u2, c2)), r = SP.sub(x, xh), rl = SP.norm(r);
    S.set('axes', SP.axes(box, { ticks: 100, names: ['$x_1$', '$x_2$', '$x_3$'] }));
    S.set('plane', [
      ...SP.plane([0, 0, 0], u3, rc, { box: pbox, alpha: 0.24 }).map((mk) => ({ ...mk, name: 'W₂, the plane spanned by the first two principal components u₁ and u₂' })),
      ...lattice,
      { k: 'arrow', a: [0, 0, 0], b: SP.mul(u1, 100), color: vc, w: 4, name: `u₁ = [${u1.map((v) => numT(v)).join(', ')}], the first principal component, drawn 100 times its length` },
      { k: 'arrow', a: [0, 0, 0], b: SP.mul(u2, 100), color: vc, w: 4, name: `u₂ = [${u2.map((v) => numT(v)).join(', ')}], the second principal component, drawn 100 times its length` },
      { k: 'label', s: '$100\\kvecuone$', p: SP.add(SP.mul(u1, 150), [0, 0, 18]), color: vc },
      { k: 'label', s: '$100\\kvecutwo$', p: SP.add(SP.mul(u2, 150), [0, 0, 18]), color: vc },
      { k: 'label', s: '$\\kWtwo$', p: SP.add(SP.mul(u1, -190), SP.mul(u2, 120)), color: rc },
    ]);
    const cloud = [];
    DEMO.forEach((p, i) => {
      if (i === j) return;
      const [a, b] = P.coords[i], q = SP.add(SP.mul(u1, a), SP.mul(u2, b));
      cloud.push({ k: 'dot', p, color: alpha(pc, 0.9), r: 4, name: `data point ${i + 1}: ${pt(p)}; its coordinates in W₂ are ${pt([a, b])}` });
      cloud.push({ k: 'dot', p: q, color: alpha(pc, 0.55), r: 2.5, hollow: true, name: `the projection of data point ${i + 1} onto W₂` });
    });
    S.set('cloud', cloud);
    const marks = [
      { k: 'line', pts: [[0, 0, 0], x], color: vc, w: 4, dash: [10, 8], name: `x = ${pt(x)}, data point ${j + 1}` },
      { k: 'dot', p: x, color: pc, r: 7, name: `x = ${pt(x)}, data point ${j + 1}` },
      { k: 'label', s: '$\\kvecx$', p: SP.add(x, SP.mul(SP.unit(rl > 1 ? r : u3), 24)), color: vc },
      { k: 'arrow', a: [0, 0, 0], b: xh, color: vc, w: 5, name: `x̂ = ${numT(c1, 1)}u₁ ${c2 < 0 ? '−' : '+'} ${numT(Math.abs(c2), 1)}u₂ = ${pt(xh)}, the projection of x onto W₂` },
      { k: 'label', s: '$\\kvecxhat$', p: SP.add(xh, SP.mul(SP.unit(rl > 1 ? r : u3), -26)), color: vc },
    ];
    if (rl > 2) {
      marks.push({ k: 'line', pts: [xh, x], color: vc, w: 3.5, dash: [3, 7], name: `x − x̂, of length ${numT(rl, 1)}, orthogonal to W₂` });
      if (rl > 12) {
        const ur = SP.unit(r), up = SP.unit(SP.norm(xh) > 1 ? SP.mul(xh, -1) : u1), q = 10;
        marks.push({ k: 'line', pts: [SP.add(xh, SP.mul(up, q)), SP.add(SP.add(xh, SP.mul(up, q)), SP.mul(ur, q)), SP.add(xh, SP.mul(ur, q))], color: 'ink', w: 2 });
      }
    }
    S.set('x', marks);
    S.headline(`$\\kvecx = ${pt(x).replace(/−/g, '-')}$ projects onto $\\kWtwo$ at $\\kvecxhat = ${num(c1, 1)}\\kvecuone ${c2 < 0 ? '-' : '+'} ${num(Math.abs(c2), 1)}\\kvecutwo$, a distance $${num(rl, 1)}$ from $\\kvecx$.`);

    /* the flat panel: the coordinates of the projections */
    const { ctx } = begin(d.c);
    hits = [];
    ax = axes(ctx, BOX, xr, yr, { nx: 6, ny: 3, nice: true });
    const ox = ax.X(0), oy = ax.Y(0);
    line(ctx, BOX.l, oy, BOX.r, oy, alpha(PAL.ink, 0.45), 2); line(ctx, ox, BOX.t, ox, BOX.b, alpha(PAL.ink, 0.45), 2);
    text(ctx, '$\\kvecuone\\cdot\\kvecx$', BOX.r, BOX.b + 58, PAL.ink, { align: 'right', weight: 600, size: 20, tex: true });
    text(ctx, '$\\kvecutwo\\cdot\\kvecx$', BOX.l + 10, BOX.t + 22, PAL.ink, { align: 'left', weight: 600, size: 20, tex: true, bg: PAL.panel });
    P.coords.forEach(([a, b], i) => {
      if (i === j) return;
      dot(ctx, ax.X(a), ax.Y(b), alpha(pc, 0.85), true, 6);
      hits.push({ x: ax.X(a), y: ax.Y(b), r: 12, name: `data point ${i + 1}: coordinates ${pt([a, b])}` });
    });
    arrow(ctx, ox, oy, ax.X(100), oy, alpha(vc, 0.8), 3); arrow(ctx, ox, oy, ox, ax.Y(100), alpha(vc, 0.8), 3);
    text(ctx, '$100\\kvecuone$', ax.X(100), oy + 26, vc, { size: 20, weight: 600, align: 'center', tex: true, bg: PAL.panel });
    text(ctx, '$100\\kvecutwo$', ox - 12, ax.Y(100), vc, { size: 20, weight: 600, align: 'right', tex: true, bg: PAL.panel });
    const hx = ax.X(c1), hy = ax.Y(c2);
    arrow(ctx, ox, oy, hx, hy, vc, 5);
    dot(ctx, hx, hy, pc, true, 9);
    const right = hx < (BOX.l + BOX.r) / 2, up = hy > (BOX.t + BOX.b) / 2;
    text(ctx, `$\\kvecxhat = ${pt([c1, c2]).replace(/−/g, '-')}$`, hx + (right ? 18 : -18), hy + (up ? -22 : 26), vc, { size: 22, weight: 600, align: right ? 'left' : 'right', tex: true, bg: PAL.panel });
    hits.push({ x: hx, y: hy, r: 14, name: `x̂: data point ${j + 1} projected onto W₂, coordinates ${pt([c1, c2])}` });

    const QT = `\\htmlClass{kv-matrix}{\\left[\\begin{array}{rrr} ${num(u1[0])} & ${num(u1[1])} & ${num(u1[2])} \\\\ ${num(u2[0])} & ${num(u2[1])} & ${num(u2[2])} \\end{array}\\right]}`;
    ro.set(`\\kQT\\kvecx = ${QT}${col(x, 1)} = \\left[\\begin{array}{r}\\kvecuone\\cdot\\kvecx \\\\ \\kvecutwo\\cdot\\kvecx \\end{array}\\right] = ${col([c1, c2], 1)}`,
      `$\\kWtwo$ retains $(\\klambdaone + \\klambdatwo)/\\kV = (${num(P.lam[0], 0)} + ${num(P.lam[1], 0)})/${num(P.V, 0)} = ${pct((P.lam[0] + P.lam[1]) / P.V)}$ of the variance.`);
  });
})();

/* ---------- Sim: the irises and the penguins in the plane of their first two principal components ----------
   Data, from github.com/davidaustinm/ula_modules: the 150 irises of Activity 7.3.5 (`iris.data`: sepal length,
   sepal width, petal length, petal width in cm, and the species) and the 333 penguins of Exercise 7.3.6
   (`penguins.csv`: culmen length and depth in mm, flipper length in mm, body mass in g, species and sex),
   standardized as the book does (demeaned, each measurement divided by its standard deviation, N − 1 in the
   denominator, which gives `penguins_data.csv`). The principal components are computed here; the iris signs
   are the book's, u₁ = [0.36, −0.08, 0.85, 0.36] and u₂ = [−0.66, −0.73, 0.18, 0.07] (NumPy's are opposite),
   and the penguin signs agree with Exercise 7.3.6's answers (u₁'s body mass negative, u₂'s culmen
   components positive). Every point is drawn at (u₁·x, u₂·x), its species its referent colour, on equal
   scales so the plot is honestly wider than tall; the female or male penguins alone are Exercise 7.3.6 f's
   plots, on the components of all 333. A choice of W₁ or W₂ morphs every point's second coordinate to 0 and
   back (choice.mix), and the c₂ slider fades out at W₁. The reader's point (c₁, c₂) is dragged in the plane
   or set on the sliders; Q[c₁; c₂] + m is read back as measurements, the species whose centroid in the
   plane is nearest is named. Specials: the book's three flowers of Activity 7.3.5 e, f, g. Still. */
(function () {
  const d = sim('sim-pca-species', 720);
  const IRIS = '5.1,3.5,1.4,0.2,0;4.9,3.0,1.4,0.2,0;4.7,3.2,1.3,0.2,0;4.6,3.1,1.5,0.2,0;5.0,3.6,1.4,0.2,0;5.4,3.9,1.7,0.4,0;4.6,3.4,1.4,0.3,0;5.0,3.4,1.5,0.2,0;4.4,2.9,1.4,0.2,0;4.9,3.1,1.5,0.1,0;5.4,3.7,1.5,0.2,0;4.8,3.4,1.6,0.2,0;4.8,3.0,1.4,0.1,0;4.3,3.0,1.1,0.1,0;5.8,4.0,1.2,0.2,0;5.7,4.4,1.5,0.4,0;5.4,3.9,1.3,0.4,0;5.1,3.5,1.4,0.3,0;5.7,3.8,1.7,0.3,0;5.1,3.8,1.5,0.3,0;5.4,3.4,1.7,0.2,0;5.1,3.7,1.5,0.4,0;4.6,3.6,1.0,0.2,0;5.1,3.3,1.7,0.5,0;4.8,3.4,1.9,0.2,0;5.0,3.0,1.6,0.2,0;5.0,3.4,1.6,0.4,0;5.2,3.5,1.5,0.2,0;5.2,3.4,1.4,0.2,0;4.7,3.2,1.6,0.2,0;4.8,3.1,1.6,0.2,0;5.4,3.4,1.5,0.4,0;5.2,4.1,1.5,0.1,0;5.5,4.2,1.4,0.2,0;4.9,3.1,1.5,0.1,0;5.0,3.2,1.2,0.2,0;5.5,3.5,1.3,0.2,0;4.9,3.1,1.5,0.1,0;4.4,3.0,1.3,0.2,0;5.1,3.4,1.5,0.2,0;5.0,3.5,1.3,0.3,0;4.5,2.3,1.3,0.3,0;4.4,3.2,1.3,0.2,0;5.0,3.5,1.6,0.6,0;5.1,3.8,1.9,0.4,0;4.8,3.0,1.4,0.3,0;5.1,3.8,1.6,0.2,0;4.6,3.2,1.4,0.2,0;5.3,3.7,1.5,0.2,0;5.0,3.3,1.4,0.2,0;7.0,3.2,4.7,1.4,1;6.4,3.2,4.5,1.5,1;6.9,3.1,4.9,1.5,1;5.5,2.3,4.0,1.3,1;6.5,2.8,4.6,1.5,1;5.7,2.8,4.5,1.3,1;6.3,3.3,4.7,1.6,1;4.9,2.4,3.3,1.0,1;6.6,2.9,4.6,1.3,1;5.2,2.7,3.9,1.4,1;5.0,2.0,3.5,1.0,1;5.9,3.0,4.2,1.5,1;6.0,2.2,4.0,1.0,1;6.1,2.9,4.7,1.4,1;5.6,2.9,3.6,1.3,1;6.7,3.1,4.4,1.4,1;5.6,3.0,4.5,1.5,1;5.8,2.7,4.1,1.0,1;6.2,2.2,4.5,1.5,1;5.6,2.5,3.9,1.1,1;5.9,3.2,4.8,1.8,1;6.1,2.8,4.0,1.3,1;6.3,2.5,4.9,1.5,1;6.1,2.8,4.7,1.2,1;6.4,2.9,4.3,1.3,1;6.6,3.0,4.4,1.4,1;6.8,2.8,4.8,1.4,1;6.7,3.0,5.0,1.7,1;6.0,2.9,4.5,1.5,1;5.7,2.6,3.5,1.0,1;5.5,2.4,3.8,1.1,1;5.5,2.4,3.7,1.0,1;5.8,2.7,3.9,1.2,1;6.0,2.7,5.1,1.6,1;5.4,3.0,4.5,1.5,1;6.0,3.4,4.5,1.6,1;6.7,3.1,4.7,1.5,1;6.3,2.3,4.4,1.3,1;5.6,3.0,4.1,1.3,1;5.5,2.5,4.0,1.3,1;5.5,2.6,4.4,1.2,1;6.1,3.0,4.6,1.4,1;5.8,2.6,4.0,1.2,1;5.0,2.3,3.3,1.0,1;5.6,2.7,4.2,1.3,1;5.7,3.0,4.2,1.2,1;5.7,2.9,4.2,1.3,1;6.2,2.9,4.3,1.3,1;5.1,2.5,3.0,1.1,1;5.7,2.8,4.1,1.3,1;6.3,3.3,6.0,2.5,2;5.8,2.7,5.1,1.9,2;7.1,3.0,5.9,2.1,2;6.3,2.9,5.6,1.8,2;6.5,3.0,5.8,2.2,2;7.6,3.0,6.6,2.1,2;4.9,2.5,4.5,1.7,2;7.3,2.9,6.3,1.8,2;6.7,2.5,5.8,1.8,2;7.2,3.6,6.1,2.5,2;6.5,3.2,5.1,2.0,2;6.4,2.7,5.3,1.9,2;6.8,3.0,5.5,2.1,2;5.7,2.5,5.0,2.0,2;5.8,2.8,5.1,2.4,2;6.4,3.2,5.3,2.3,2;6.5,3.0,5.5,1.8,2;7.7,3.8,6.7,2.2,2;7.7,2.6,6.9,2.3,2;6.0,2.2,5.0,1.5,2;6.9,3.2,5.7,2.3,2;5.6,2.8,4.9,2.0,2;7.7,2.8,6.7,2.0,2;6.3,2.7,4.9,1.8,2;6.7,3.3,5.7,2.1,2;7.2,3.2,6.0,1.8,2;6.2,2.8,4.8,1.8,2;6.1,3.0,4.9,1.8,2;6.4,2.8,5.6,2.1,2;7.2,3.0,5.8,1.6,2;7.4,2.8,6.1,1.9,2;7.9,3.8,6.4,2.0,2;6.4,2.8,5.6,2.2,2;6.3,2.8,5.1,1.5,2;6.1,2.6,5.6,1.4,2;7.7,3.0,6.1,2.3,2;6.3,3.4,5.6,2.4,2;6.4,3.1,5.5,1.8,2;6.0,3.0,4.8,1.8,2;6.9,3.1,5.4,2.1,2;6.7,3.1,5.6,2.4,2;6.9,3.1,5.1,2.3,2;5.8,2.7,5.1,1.9,2;6.8,3.2,5.9,2.3,2;6.7,3.3,5.7,2.5,2;6.7,3.0,5.2,2.3,2;6.3,2.5,5.0,1.9,2;6.5,3.0,5.2,2.0,2;6.2,3.4,5.4,2.3,2;5.9,3.0,5.1,1.8,2';
  const PENG = '39.1,18.7,181,3750,0,m;39.5,17.4,186,3800,0,f;40.3,18,195,3250,0,f;36.7,19.3,193,3450,0,f;39.3,20.6,190,3650,0,m;38.9,17.8,181,3625,0,f;39.2,19.6,195,4675,0,m;41.1,17.6,182,3200,0,f;38.6,21.2,191,3800,0,m;34.6,21.1,198,4400,0,m;36.6,17.8,185,3700,0,f;38.7,19,195,3450,0,f;42.5,20.7,197,4500,0,m;34.4,18.4,184,3325,0,f;46,21.5,194,4200,0,m;37.8,18.3,174,3400,0,f;37.7,18.7,180,3600,0,m;35.9,19.2,189,3800,0,f;38.2,18.1,185,3950,0,m;38.8,17.2,180,3800,0,m;35.3,18.9,187,3800,0,f;40.6,18.6,183,3550,0,m;40.5,17.9,187,3200,0,f;37.9,18.6,172,3150,0,f;40.5,18.9,180,3950,0,m;39.5,16.7,178,3250,0,f;37.2,18.1,178,3900,0,m;39.5,17.8,188,3300,0,f;40.9,18.9,184,3900,0,m;36.4,17,195,3325,0,f;39.2,21.1,196,4150,0,m;38.8,20,190,3950,0,m;42.2,18.5,180,3550,0,f;37.6,19.3,181,3300,0,f;39.8,19.1,184,4650,0,m;36.5,18,182,3150,0,f;40.8,18.4,195,3900,0,m;36,18.5,186,3100,0,f;44.1,19.7,196,4400,0,m;37,16.9,185,3000,0,f;39.6,18.8,190,4600,0,m;41.1,19,182,3425,0,m;36,17.9,190,3450,0,f;42.3,21.2,191,4150,0,m;39.6,17.7,186,3500,0,f;40.1,18.9,188,4300,0,m;35,17.9,190,3450,0,f;42,19.5,200,4050,0,m;34.5,18.1,187,2900,0,f;41.4,18.6,191,3700,0,m;39,17.5,186,3550,0,f;40.6,18.8,193,3800,0,m;36.5,16.6,181,2850,0,f;37.6,19.1,194,3750,0,m;35.7,16.9,185,3150,0,f;41.3,21.1,195,4400,0,m;37.6,17,185,3600,0,f;41.1,18.2,192,4050,0,m;36.4,17.1,184,2850,0,f;41.6,18,192,3950,0,m;35.5,16.2,195,3350,0,f;41.1,19.1,188,4100,0,m;35.9,16.6,190,3050,0,f;41.8,19.4,198,4450,0,m;33.5,19,190,3600,0,f;39.7,18.4,190,3900,0,m;39.6,17.2,196,3550,0,f;45.8,18.9,197,4150,0,m;35.5,17.5,190,3700,0,f;42.8,18.5,195,4250,0,m;40.9,16.8,191,3700,0,f;37.2,19.4,184,3900,0,m;36.2,16.1,187,3550,0,f;42.1,19.1,195,4000,0,m;34.6,17.2,189,3200,0,f;42.9,17.6,196,4700,0,m;36.7,18.8,187,3800,0,f;35.1,19.4,193,4200,0,m;37.3,17.8,191,3350,0,f;41.3,20.3,194,3550,0,m;36.3,19.5,190,3800,0,m;36.9,18.6,189,3500,0,f;38.3,19.2,189,3950,0,m;38.9,18.8,190,3600,0,f;35.7,18,202,3550,0,f;41.1,18.1,205,4300,0,m;34,17.1,185,3400,0,f;39.6,18.1,186,4450,0,m;36.2,17.3,187,3300,0,f;40.8,18.9,208,4300,0,m;38.1,18.6,190,3700,0,f;40.3,18.5,196,4350,0,m;33.1,16.1,178,2900,0,f;43.2,18.5,192,4100,0,m;35,17.9,192,3725,0,f;41,20,203,4725,0,m;37.7,16,183,3075,0,f;37.8,20,190,4250,0,m;37.9,18.6,193,2925,0,f;39.7,18.9,184,3550,0,m;38.6,17.2,199,3750,0,f;38.2,20,190,3900,0,m;38.1,17,181,3175,0,f;43.2,19,197,4775,0,m;38.1,16.5,198,3825,0,f;45.6,20.3,191,4600,0,m;39.7,17.7,193,3200,0,f;42.2,19.5,197,4275,0,m;39.6,20.7,191,3900,0,f;42.7,18.3,196,4075,0,m;38.6,17,188,2900,0,f;37.3,20.5,199,3775,0,m;35.7,17,189,3350,0,f;41.1,18.6,189,3325,0,m;36.2,17.2,187,3150,0,f;37.7,19.8,198,3500,0,m;40.2,17,176,3450,0,f;41.4,18.5,202,3875,0,m;35.2,15.9,186,3050,0,f;40.6,19,199,4000,0,m;38.8,17.6,191,3275,0,f;41.5,18.3,195,4300,0,m;39,17.1,191,3050,0,f;44.1,18,210,4000,0,m;38.5,17.9,190,3325,0,f;43.1,19.2,197,3500,0,m;36.8,18.5,193,3500,0,f;37.5,18.5,199,4475,0,m;38.1,17.6,187,3425,0,f;41.1,17.5,190,3900,0,m;35.6,17.5,191,3175,0,f;40.2,20.1,200,3975,0,m;37,16.5,185,3400,0,f;39.7,17.9,193,4250,0,m;40.2,17.1,193,3400,0,f;40.6,17.2,187,3475,0,m;32.1,15.5,188,3050,0,f;40.7,17,190,3725,0,m;37.3,16.8,192,3000,0,f;39,18.7,185,3650,0,m;39.2,18.6,190,4250,0,m;36.6,18.4,184,3475,0,f;36,17.8,195,3450,0,f;37.8,18.1,193,3750,0,m;36,17.1,187,3700,0,f;41.5,18.5,201,4000,0,m;46.1,13.2,211,4500,2,f;50,16.3,230,5700,2,m;48.7,14.1,210,4450,2,f;50,15.2,218,5700,2,m;47.6,14.5,215,5400,2,m;46.5,13.5,210,4550,2,f;45.4,14.6,211,4800,2,f;46.7,15.3,219,5200,2,m;43.3,13.4,209,4400,2,f;46.8,15.4,215,5150,2,m;40.9,13.7,214,4650,2,f;49,16.1,216,5550,2,m;45.5,13.7,214,4650,2,f;48.4,14.6,213,5850,2,m;45.8,14.6,210,4200,2,f;49.3,15.7,217,5850,2,m;42,13.5,210,4150,2,f;49.2,15.2,221,6300,2,m;46.2,14.5,209,4800,2,f;48.7,15.1,222,5350,2,m;50.2,14.3,218,5700,2,m;45.1,14.5,215,5000,2,f;46.5,14.5,213,4400,2,f;46.3,15.8,215,5050,2,m;42.9,13.1,215,5000,2,f;46.1,15.1,215,5100,2,m;47.8,15,215,5650,2,m;48.2,14.3,210,4600,2,f;50,15.3,220,5550,2,m;47.3,15.3,222,5250,2,m;42.8,14.2,209,4700,2,f;45.1,14.5,207,5050,2,f;59.6,17,230,6050,2,m;49.1,14.8,220,5150,2,f;48.4,16.3,220,5400,2,m;42.6,13.7,213,4950,2,f;44.4,17.3,219,5250,2,m;44,13.6,208,4350,2,f;48.7,15.7,208,5350,2,m;42.7,13.7,208,3950,2,f;49.6,16,225,5700,2,m;45.3,13.7,210,4300,2,f;49.6,15,216,4750,2,m;50.5,15.9,222,5550,2,m;43.6,13.9,217,4900,2,f;45.5,13.9,210,4200,2,f;50.5,15.9,225,5400,2,m;44.9,13.3,213,5100,2,f;45.2,15.8,215,5300,2,m;46.6,14.2,210,4850,2,f;48.5,14.1,220,5300,2,m;45.1,14.4,210,4400,2,f;50.1,15,225,5000,2,m;46.5,14.4,217,4900,2,f;45,15.4,220,5050,2,m;43.8,13.9,208,4300,2,f;45.5,15,220,5000,2,m;43.2,14.5,208,4450,2,f;50.4,15.3,224,5550,2,m;45.3,13.8,208,4200,2,f;46.2,14.9,221,5300,2,m;45.7,13.9,214,4400,2,f;54.3,15.7,231,5650,2,m;45.8,14.2,219,4700,2,f;49.8,16.8,230,5700,2,m;49.5,16.2,229,5800,2,m;43.5,14.2,220,4700,2,f;50.7,15,223,5550,2,m;47.7,15,216,4750,2,f;46.4,15.6,221,5000,2,m;48.2,15.6,221,5100,2,m;46.5,14.8,217,5200,2,f;46.4,15,216,4700,2,f;48.6,16,230,5800,2,m;47.5,14.2,209,4600,2,f;51.1,16.3,220,6000,2,m;45.2,13.8,215,4750,2,f;45.2,16.4,223,5950,2,m;49.1,14.5,212,4625,2,f;52.5,15.6,221,5450,2,m;47.4,14.6,212,4725,2,f;50,15.9,224,5350,2,m;44.9,13.8,212,4750,2,f;50.8,17.3,228,5600,2,m;43.4,14.4,218,4600,2,f;51.3,14.2,218,5300,2,m;47.5,14,212,4875,2,f;52.1,17,230,5550,2,m;47.5,15,218,4950,2,f;52.2,17.1,228,5400,2,m;45.5,14.5,212,4750,2,f;49.5,16.1,224,5650,2,m;44.5,14.7,214,4850,2,f;50.8,15.7,226,5200,2,m;49.4,15.8,216,4925,2,m;46.9,14.6,222,4875,2,f;48.4,14.4,203,4625,2,f;51.1,16.5,225,5250,2,m;48.5,15,219,4850,2,f;55.9,17,228,5600,2,m;47.2,15.5,215,4975,2,f;49.1,15,228,5500,2,m;46.8,16.1,215,5500,2,m;41.7,14.7,210,4700,2,f;53.4,15.8,219,5500,2,m;43.3,14,208,4575,2,f;48.1,15.1,209,5500,2,m;50.5,15.2,216,5000,2,f;49.8,15.9,229,5950,2,m;43.5,15.2,213,4650,2,f;51.5,16.3,230,5500,2,m;46.2,14.1,217,4375,2,f;55.1,16,230,5850,2,m;48.8,16.2,222,6000,2,m;47.2,13.7,214,4925,2,f;46.8,14.3,215,4850,2,f;50.4,15.7,222,5750,2,m;45.2,14.8,212,5200,2,f;49.9,16.1,213,5400,2,m;46.5,17.9,192,3500,1,f;50,19.5,196,3900,1,m;51.3,19.2,193,3650,1,m;45.4,18.7,188,3525,1,f;52.7,19.8,197,3725,1,m;45.2,17.8,198,3950,1,f;46.1,18.2,178,3250,1,f;51.3,18.2,197,3750,1,m;46,18.9,195,4150,1,f;51.3,19.9,198,3700,1,m;46.6,17.8,193,3800,1,f;51.7,20.3,194,3775,1,m;47,17.3,185,3700,1,f;52,18.1,201,4050,1,m;45.9,17.1,190,3575,1,f;50.5,19.6,201,4050,1,m;50.3,20,197,3300,1,m;58,17.8,181,3700,1,f;46.4,18.6,190,3450,1,f;49.2,18.2,195,4400,1,m;42.4,17.3,181,3600,1,f;48.5,17.5,191,3400,1,m;43.2,16.6,187,2900,1,f;50.6,19.4,193,3800,1,m;46.7,17.9,195,3300,1,f;52,19,197,4150,1,m;50.5,18.4,200,3400,1,f;49.5,19,200,3800,1,m;46.4,17.8,191,3700,1,f;52.8,20,205,4550,1,m;40.9,16.6,187,3200,1,f;54.2,20.8,201,4300,1,m;42.5,16.7,187,3350,1,f;51,18.8,203,4100,1,m;49.7,18.6,195,3600,1,m;47.5,16.8,199,3900,1,f;47.6,18.3,195,3850,1,f;52,20.7,210,4800,1,m;46.9,16.6,192,2700,1,f;53.5,19.9,205,4500,1,m;49,19.5,210,3950,1,m;46.2,17.5,187,3650,1,f;50.9,19.1,196,3550,1,m;45.5,17,196,3500,1,f;50.9,17.9,196,3675,1,f;50.8,18.5,201,4450,1,m;50.1,17.9,190,3400,1,f;49,19.6,212,4300,1,m;51.5,18.7,187,3250,1,m;49.8,17.3,198,3675,1,f;48.1,16.4,199,3325,1,f;51.4,19,201,3950,1,m;45.7,17.3,193,3600,1,f;50.7,19.7,203,4050,1,m;42.5,17.3,187,3350,1,f;52.2,18.8,197,3450,1,m;45.2,16.6,191,3250,1,f;49.3,19.9,203,4050,1,m;50.2,18.8,202,3800,1,m;45.6,19.4,194,3525,1,f;51.9,19.5,206,3950,1,m;46.8,16.5,189,3650,1,f;45.7,17,195,3650,1,f;55.8,19.8,207,4000,1,m;43.5,18.1,202,3400,1,f;49.6,18.2,193,3775,1,m;50.8,19,210,4100,1,m;50.2,18.7,198,3775,1,f';
  const iris = IRIS.split(';').map((s) => s.split(',')).map((r) => ({ x: r.slice(0, 4).map(Number), s: +r[4] }));
  const peng = PENG.split(';').map((s) => s.split(',')).map((r) => ({ raw: r.slice(0, 4).map(Number), s: +r[4], sex: r[5] }));
  const pm = [0, 1, 2, 3].map((i) => peng.reduce((a, p) => a + p.raw[i], 0) / peng.length);
  const psd = [0, 1, 2, 3].map((i) => Math.sqrt(peng.reduce((a, p) => a + (p.raw[i] - pm[i]) ** 2, 0) / (peng.length - 1)));
  peng.forEach((p) => { p.x = p.raw.map((v, i) => (v - pm[i]) / psd[i]); });
  const PI = pca(iris.map((p) => p.x), (u, j) => (j === 0 ? u[2] : j === 1 ? -u[1] : 1));
  const PP = pca(peng.map((p) => p.x), (u, j) => (j === 0 ? -u[3] : j === 1 ? u[0] : 1));
  iris.forEach((p, i) => { p.c = PI.coords[i]; });
  peng.forEach((p, i) => { p.c = PP.coords[i]; });
  const centroids = (pts, k) => [0, 1, 2].map((s) => { const g = pts.filter((p) => p.s === s); return [0, 1].map((t) => g.reduce((a, p) => a + p.c[t], 0) / g.length); });
  const IC = centroids(iris), PC = centroids(peng);
  const SPECIES = { iris: ['setosa', 'versicolor', 'virginica'], peng: ['adelie', 'chinstrap', 'gentoo'] };
  const NAMES = { iris: ['Iris setosa', 'Iris versicolor', 'Iris virginica'], peng: ['Adelie', 'Chinstrap', 'Gentoo'] };
  const SETS = {
    iris: { label: 'irises', fam: 'iris', P: PI, pts: iris, cen: IC, xr: [-4, 4.5], yr: [-1.6, 1.6], c: [-2.5, -0.75], step: 0.01 },
    peng: { label: 'penguins', fam: 'peng', P: PP, pts: peng, cen: PC, xr: [-4.5, 3.5], yr: [-2.5, 3], c: [-2, -0.4], step: 0.01 },
    female: { label: 'female penguins', fam: 'peng', P: PP, pts: peng.filter((p) => p.sex === 'f'), cen: PC, xr: [-4.5, 3.5], yr: [-2.5, 3], c: [-2, -0.4], step: 0.01, who: 'female ' },
    male: { label: 'male penguins', fam: 'peng', P: PP, pts: peng.filter((p) => p.sex === 'm'), cen: PC, xr: [-4.5, 3.5], yr: [-2.5, 3], c: [-2, -0.4], step: 0.01, who: 'male ' },
  };
  const FLOWERS = [{ c: [-2.5, -0.75], label: 'Activity 7.3.5 e' }, { c: [0.18, 0.40], label: 'Activity 7.3.5 f' }, { c: [2.90, -0.53], label: 'Activity 7.3.5 g' }];
  const specials = (fam, t) => (fam === 'iris' ? FLOWERS.map((f) => ({ at: f.c[t], label: f.label })) : []);
  let key = 'iris';
  let c1S = null, c2S = null;
  select(d.controls, {
    label: 'data', key: 'data', value: 'iris', aria: 'the data set plotted',
    options: Object.keys(SETS).map((v) => ({ value: v, label: SETS[v].label })),
    onInput: (v) => {
      const was = SETS[key].fam; key = v; const set = SETS[v];
      if (set.fam !== was) {
        c1S.mark(specials(set.fam, 0)); c2S.mark(specials(set.fam, 1));
        c1S.range({ min: set.xr[0], max: set.xr[1], step: set.step, value: set.c[0], unit: '', dec: 2 });
        c2S.range({ min: set.yr[0], max: set.yr[1], step: set.step, value: set.c[1], unit: '', dec: 2 });
      }
    },
  });
  const wC = choice(d.controls, {
    label: 'subspace', key: 'subspace', value: '2', aria: 'project onto W₁, the line of the first principal component, or onto W₂, the plane of the first two',
    options: [{ value: '1', label: 'W₁' }, { value: '2', label: 'W₂' }],
    onInput: (v) => { c2S.show(v === '2'); },
  });
  c1S = ctl(d.controls, { label: 'c_1', cls: '', key: 'c1', min: -4, max: 4.5, step: 0.01, value: -2.5, unit: '', dec: 2, aria: 'the first coordinate c₁ of the point, along u₁', specials: specials('iris', 0) });
  c2S = ctl(d.controls, { label: 'c_2', cls: '', key: 'c2', min: -1.6, max: 1.6, step: 0.01, value: -0.75, unit: '', dec: 2, aria: 'the second coordinate c₂ of the point, along u₂', specials: specials('iris', 1) });
  const Pt = drag(d, { x: c1S, y: c2S });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits, d.c);
  const fmtM = (v, p) => numT(v, p);
  still(d, () => {
    const { ctx } = begin(d.c);
    const set = SETS[key], fam = set.fam, P = set.P, pc = C('point');
    const two = wC.value === '2', k = wC.mix((v) => (v === '2' ? 1 : 0));
    hits = [];
    /* the frame: equal scales, the box as wide as the window lets it be */
    const W = 1120, Hm = 470, sc = Math.min(W / (set.xr[1] - set.xr[0]), Hm / (set.yr[1] - set.yr[0]));
    const bw = sc * (set.xr[1] - set.xr[0]), bh = sc * (set.yr[1] - set.yr[0]), top = 158;
    const BOX = { l: 160 + (W - bw) / 2, r: 160 + (W - bw) / 2 + bw, t: top, b: top + bh };
    const ax = axes(ctx, BOX, set.xr, set.yr, { nx: 8, ny: 5, nice: true });
    const ox = ax.X(0), oy = ax.Y(0);
    line(ctx, BOX.l, oy, BOX.r, oy, alpha(PAL.ink, 0.45), 2); line(ctx, ox, BOX.t, ox, BOX.b, alpha(PAL.ink, 0.45), 2);
    text(ctx, '$\\kvecuone\\cdot\\kvecx$', BOX.r, BOX.b + 58, PAL.ink, { align: 'right', weight: 600, size: 20, tex: true });
    if (two || k > 0) F.faded(ctx, k, [0, 0], () => text(ctx, '$\\kvecutwo\\cdot\\kvecx$', BOX.l + 10, BOX.t + 22, PAL.ink, { align: 'left', weight: 600, size: 20, tex: true, bg: PAL.panel }));
    /* the points, by species */
    const cols = SPECIES[fam].map((id) => F.ref(id));
    set.pts.forEach((p) => {
      const x = ax.X(p.c[0]), y = ax.Y(p.c[1] * k);
      dot(ctx, x, y, alpha(cols[p.s], 0.82), true, 6);
      const meas = fam === 'iris'
        ? `sepal ${fmtM(p.x[0], 1)} × ${fmtM(p.x[1], 1)} cm, petal ${fmtM(p.x[2], 1)} × ${fmtM(p.x[3], 1)} cm`
        : `${p.sex === 'f' ? 'female' : 'male'}; culmen ${fmtM(p.raw[0], 1)} × ${fmtM(p.raw[1], 1)} mm, flipper ${fmtM(p.raw[2], 0)} mm, ${fmtM(p.raw[3], 0)} g`;
      hits.push({ x, y, r: 9, name: `${NAMES[fam][p.s]}: ${meas}; coordinates (${numT(p.c[0])}, ${numT(p.c[1])})` });
    });
    /* the legend: one dot and name per species, above the frame */
    let lx = BOX.l;
    NAMES[fam].forEach((nm, s) => {
      dot(ctx, lx + 8, 116, cols[s], true, 8);
      text(ctx, nm, lx + 24, 116, cols[s], { size: 20, weight: 600, align: 'left' });
      lx += 60 + F.measure(ctx, nm, { size: 20, weight: 600 });
    });
    /* the reader's point and what it reconstructs */
    const c1 = c1S.v, c2 = two ? c2S.v : 0;
    const p = Pt.draw(ctx, two ? ax : { ...ax, Y: () => oy }, pc);
    if (p) { dot(ctx, p.x, p.y, pc, false, 10); hits.push({ x: p.x, y: p.y, r: 16, name: `your point (${numT(c1)}, ${numT(c2)})` }); }
    const Q = two ? [P.U[0], P.U[1]] : [P.U[0]], cc = two ? [c1, c2] : [c1];
    const rec = [0, 1, 2, 3].map((i) => Q.reduce((s, u, t) => s + u[i] * cc[t], 0));
    const near = set.cen.map((m, s) => [Math.hypot(m[0] - c1, two ? m[1] - c2 : 0), s]).sort((a, b) => a[0] - b[0])[0][1];
    const lam = P.lam, kept = two ? (lam[0] + lam[1]) / P.V : lam[0] / P.V;
    const keptTex = two ? `(\\klambdaone + \\klambdatwo)/\\kV = (${num(lam[0])} + ${num(lam[1])})/${num(P.V)} = ${pct(kept)}` : `\\klambdaone/\\kV = ${num(lam[0])}/${num(P.V)} = ${pct(kept)}`;
    const sub = two ? `\\kWtwo` : `\\kWone`;
    const cTex = two ? `\\kQ${col([c1, c2])}` : `${num(c1)}\\kvecuone`;
    if (fam === 'iris') {
      const m = PI.m, meas = rec.map((v, i) => v + m[i]);
      const lab = { size: 22, weight: 600, align: 'left', bg: PAL.panel };
      if (p) text(ctx, 'your iris', p.x + (p.x > BOX.r - 150 ? -150 : 18), p.y - 24, pc, lab);
      headline(ctx, `The point $(${num(c1)}, ${num(c2)})$ sits nearest the ${NAMES.iris[near]}: sepal ${fmtM(meas[0])} × ${fmtM(meas[1])} cm, petal ${fmtM(meas[2])} × ${fmtM(meas[3])} cm.`);
      ro.set(`${cTex} + \\kvecm = ${col(meas)}`, `$${sub}$ retains $${keptTex}$ of the variance of the irises.`);
    } else {
      const meas = rec.map((v, i) => pm[i] + psd[i] * v);
      const lab = { size: 22, weight: 600, align: 'left', bg: PAL.panel };
      if (p) text(ctx, 'your penguin', p.x + (p.x > BOX.r - 180 ? -180 : 18), p.y - 24, pc, lab);
      headline(ctx, `The point $(${num(c1)}, ${num(c2)})$ sits nearest the ${set.who ?? ''}${NAMES.peng[near]}: culmen ${fmtM(meas[0], 1)} × ${fmtM(meas[1], 1)} mm, flipper ${fmtM(meas[2], 0)} mm, body mass ${fmtM(meas[3], 0)} g.`);
      ro.set(`${cTex} = ${col(rec)}`, `Standardized culmen length, culmen depth, flipper length and body mass; $${sub}$ retains $${keptTex}$ of the variance of the penguins.`);
    }
  });
})();
};
