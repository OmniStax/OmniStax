/* Figures for section 2.4 Linear independence. */
window.OMNISTAX_FIGURES = window.OMNISTAX_FIGURES || {};
window.OMNISTAX_FIGURES['2.4'] = function (root, F) {
const { C, PAL, alpha, ctl, choice, register, readout } = F;
const SP = F.space;
const sim = (id, H) => F.sim(root, id, H);
const still = (d, draw) => register(d.fig, { update: () => {}, draw });
/* a number as the readout writes it: at most two decimals, no trailing zeros, never −0; TeX minus is a hyphen */
const r2 = (v) => { const r = Math.round(v * 100) / 100; return Object.is(r, -0) ? 0 : r; };
const num = (v) => String(r2(v));
const numT = (v) => num(v).replace('-', '−');          /* the same in plain text, with a true minus */
const near = (a, b) => Math.abs(a - b) < 1e-9;
/* the term c·v of a linear combination as TeX: 1 unwritten, −1 a sign, 0 dropped; `first` drops a leading plus */
function term(c, v, first) {
  const k = r2(c); if (k === 0) return '';
  const mag = Math.abs(k), body = (mag === 1 ? '' : num(mag)) + v;
  return k < 0 ? ` - ${body}` : first ? body : ` + ${body}`;
}
function combo(a, b, v1, v2) {
  const s = (term(a, v1, true) + term(b, v2, false)).trim().replace(/^- /, '-');
  return s === '' ? '\\kveczero' : s;
}

/* Figure 2.4.3 + 2.4.4: the plane Span{v₁, v₂} in space and a third vector in or out of it. The two examples share
   v₁ = [2, 2, 0] and v₂ = [1, 1, −1], so the plane is x = y, drawn in region with the lattice of combinations
   i v₁ + j v₂ ruled across it as the book's panels do; the third vector is v₃ = [−1, 0, 1] of Example 2.4.1 (out of
   the plane) or w₃ = [−5, −5, 1] of Example 2.4.2 (in it), a choice, and its three components are sliders. The vector
   lies in the plane exactly when its first two components agree, so the x slider carries a dashed special at the
   current y and the y slider one at the current x. Out of the plane, a dashed drop from the head to its foot on the
   plane shows how far it stands off; in the plane, the walk a v₁ then b v₂ from the origin to the head shows the
   dependence relation the readout writes. The readout is the matrix [v₁ v₂ v₃] with the live third column and its
   reduced row echelon form, exact: the first two columns always carry pivots, and the third is (a, b, 0) with
   a = (x + z)/2 and b = −z when x = y, else e₃. Each vector wears its referent colour and is labelled at its head.
   Mathematical 3D (root rule 28.3): free orbit, no ground; the box is x, y ±5.5 and z ±2.5, so w₃'s head sits inside the sheet;
   the arrows are raw marks so that their names are hover names only, never printed labels.
   Still: no clock; a change of example slides the third arrow to its new head over 0.9 s (an F.tween the draw reads). */
(function () {
  const d = sim('sim-third-vector');
  const box = [[-5.5, 5.5], [-5.5, 5.5], [-2.5, 2.5]];
  const S = F.space3d(d, { box, h: 640, fit: 3.1, turn: -0.85, tilt: 0.5 });
  const V1 = [2, 2, 0], V2 = [1, 1, -1], N = SP.unit(SP.cross(V1, V2));   /* the plane's unit normal, (−1, 1, 0)/√2 */
  const EX = {
    v: { third: [-1, 0, 1], refs: ['v-1', 'v-2', 'v-3'], tex: ['\\kvecvone', '\\kvecvtwo', '\\kvecvthree'], plain: ['v₁', 'v₂', 'v₃'], label: 'Example 2.4.1: v₁, v₂, v₃' },
    w: { third: [-5, -5, 1], refs: ['w-1', 'w-2', 'w-3'], tex: ['\\kvecwone', '\\kvecwtwo', '\\kvecwthree'], plain: ['w₁', 'w₂', 'w₃'], label: 'Example 2.4.2: w₁, w₂, w₃' },
  };
  let sl = [];
  /* the third arrow slides from one preset to the other over 0.9 s; the sliders and the readout take the new numbers at once */
  const slide = { p: F.tween(d, 1), from: null, to: null };
  const ex = choice(d.controls, {
    label: 'vectors', key: 'example', value: 'v', aria: 'the three vectors of Example 2.4.1 or of Example 2.4.2',
    options: Object.entries(EX).map(([value, e]) => ({ value, label: e.label })),
    onInput: (v) => { slide.from = sl.map((c) => c.v); slide.to = EX[v].third; EX[v].third.forEach((c, i) => sl[i].set(c)); slide.p.set(0); slide.p.to(1, 900); },
  });
  const comp = (label, key, value, aria, special) => ctl(d.controls, { label, cls: '', key, min: -6, max: 6, step: 0.5, value, unit: '', dec: 1, aria, specials: special ? [special] : [] });
  const sx = comp('x', 'x3', -1, 'the first component of the third vector', { at: () => sy.v, label: 'in the plane' });
  const sy = comp('y', 'y3', 0, 'the second component of the third vector', { at: () => sx.v, label: 'in the plane' });
  const sz = comp('z', 'z3', 1, 'the third component of the third vector');
  sl = [sx, sy, sz];
  const ro = readout(d);
  const mtx = (rows) => `\\htmlClass{kv-matrix}{\\begin{bmatrix} ${rows.map((r) => r.map(num).join(' & ')).join(' \\\\ ')} \\end{bmatrix}}`;
  const vecT = (p) => `[${numT(p[0])}, ${numT(p[1])}, ${numT(p[2])}]`;

  function draw() {
    const rc = C('region'), e = EX[ex.value], [T1, T2, T3] = e.tex, [P1, P2, P3] = e.plain, cols = e.refs.map((r) => F.ref(r));
    const third = [sx.v, sy.v, sz.v];
    /* the arrow drawn: the choice's morph slides it between the two presets, the sliders have it the rest of the time */
    const k = F.ease.smooth(slide.p.v), head = k < 1 && slide.from ? slide.from.map((c, i) => c + (slide.to[i] - c) * k) : third;
    const inPlane = near(third[0], third[1]);
    const a = (third[0] + third[2]) / 2, b = -third[2];                   /* v₃ = a v₁ + b v₂ when it lies in the plane */
    const zero = inPlane && near(third[0], 0) && near(third[2], 0);
    const spanName = `the plane Span{${P1}, ${P2}}: every linear combination of ${P1} and ${P2}`;
    /* the frame */
    S.set('axes', SP.axes(box, { ticks: 2 }));
    /* the plane and the lattice of combinations i v₁ + j v₂ ruled across it */
    const lattice = [];
    for (let i = -6; i <= 6; i++) {
      lattice.push(...SP.line(SP.mul(V2, i), V1, 'guide', { box, w: 1.5 }));
      lattice.push(...SP.line(SP.mul(V1, i), V2, 'guide', { box, w: 1.5 }));
    }
    S.set('plane', [
      ...SP.plane([0, 0, 0], N, rc, { box, alpha: 0.32 }).map((m) => ({ ...m, name: spanName })),
      ...lattice,
    ]);
    /* the two vectors that span the plane, labelled at their heads */
    const pair = [
      { k: 'arrow', a: [0, 0, 0], b: V1, color: cols[0], w: 5, name: `${P1} = ${vecT(V1)}` },
      { k: 'label', s: `$${T1}$`, p: SP.add(V1, [0.55, 0.55, 0.3]) },
      { k: 'arrow', a: [0, 0, 0], b: V2, color: cols[1], w: 5, name: `${P2} = ${vecT(V2)}` },
      { k: 'label', s: `$${T2}$`, p: SP.add(V2, [0.2, 0.2, -0.35]) },
    ];
    S.set('pair', pair);
    /* the third vector: its drop to the plane when it stands off, its walk along v₁ and v₂ when it lies in it */
    const marks = [];
    const L = SP.norm(head);
    if (L > 1e-6) marks.push({ k: 'arrow', a: [0, 0, 0], b: head, color: cols[2], w: 5, name: `${P3} = ${vecT(third)}` });
    else marks.push({ k: 'dot', p: [0, 0, 0], color: cols[2], r: 9, name: `${P3} = ${vecT(third)}, the zero vector` });
    marks.push({ k: 'label', s: `$${T3}$`, p: SP.add(head, SP.mul(SP.unit(L > 1e-6 ? head : [0, 0, 1]), 0.45)) });
    if (k >= 1) {
      if (!inPlane) {
        const foot = SP.sub(third, SP.mul(N, SP.dot(N, third)));
        marks.push({ k: 'line', pts: [third, foot], color: 'guide', w: 2.5, dash: [5, 7], name: `how far ${P3} stands off the plane: no linear combination of ${P1} and ${P2} reaches its head` });
        marks.push({ k: 'dot', p: foot, color: 'guide', r: 5, hollow: true });
      } else if (!zero) {
        const mid = SP.mul(V1, a);
        const walk = [[0, 0, 0], mid, third];
        marks.push({ k: 'line', pts: walk, color: 'guide', w: 3, dash: [8, 6], name: `the walk ${numT(a)} ${P1} then ${numT(b)} ${P2} from the origin to the head of ${P3}, all inside the plane` });
        marks.push({ k: 'dot', p: mid, color: 'guide', r: 5, hollow: true });
      }
    }
    S.set('third', marks);
    /* headline, readout */
    let head3;
    if (zero) head3 = `$${T3} = \\kveczero$ is the zero vector, a linear combination of $${T1}$ and $${T2}$ with both weights $0$: the set is linearly dependent.`;
    else if (inPlane) head3 = `$${T3} = ${combo(a, b, T1, T2)}$ lies in the plane $\\kSpan\\{${T1}, ${T2}\\}$, so adding it does not change the span.`;
    else head3 = `$${T3}$ is not a linear combination of $${T1}$ and $${T2}$: it points out of the plane, and the three vectors span $\\mathbb{R}^3$.`;
    S.headline(head3);
    const M = [[2, 1, third[0]], [2, 1, third[1]], [0, -1, third[2]]];
    const R = inPlane ? [[1, 0, a], [0, 1, b], [0, 0, 0]] : [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    let tex = `\\kA = \\begin{bmatrix} ${T1} & ${T2} & ${T3} \\end{bmatrix} = ${mtx(M)} \\sim ${mtx(R)}`;
    if (inPlane) tex += `,\\qquad ${T3} = ${combo(a, b, T1, T2)}`;
    const note = inPlane
      ? `the third column has no pivot position: $${T1}$, $${T2}$, $${T3}$ are linearly dependent, and $\\kSpan\\{${T1}, ${T2}, ${T3}\\} = \\kSpan\\{${T1}, ${T2}\\}$ is a plane`
      : `a pivot position in every column: $${T1}$, $${T2}$, $${T3}$ are linearly independent, and $\\kSpan\\{${T1}, ${T2}, ${T3}\\} = {\\mathbb R}^3$`;
    ro.set(tex, note, { form: `${ex.value}-${inPlane ? 'in' : 'out'}` });
  }
  still(d, draw);
})();
};
