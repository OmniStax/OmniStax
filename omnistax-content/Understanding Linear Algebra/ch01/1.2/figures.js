/* Figures for section 1.2 Finding solutions to linear systems. */
window.OMNISTAX_FIGURES = window.OMNISTAX_FIGURES || {};
window.OMNISTAX_FIGURES['1.2'] = function (root, F) {
const { C, PAL, alpha, ctl, choice, begin, axes, line, dot, text, headline, register, readout, hover, ease, fmt, arrival } = F;
const sim = (id, H) => F.sim(root, id, H);
const still = (d, draw) => register(d.fig, { update: () => {}, draw });
/* a number as the figure writes it: at most two decimals, no trailing zeros, never −0 */
const r2 = (v) => { const r = Math.round(v * 100) / 100; return Object.is(r, -0) ? 0 : r; };
const num = (v) => String(r2(v));
const numT = (v) => num(v).replace('-', '−');   /* the same in figure text, with a true minus */
const lerp = (a, b, k) => a + (b - a) * k;
const lerp3 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
/* the equation ax + by = c as TeX: a zero term left out, a coefficient of 1 unwritten */
function eqTex(e) {
  const [a, b, c] = e.map(r2), terms = [];
  const term = (k, v) => { if (k === 0) return; const mag = Math.abs(k); terms.push({ neg: k < 0, t: (mag === 1 ? '' : num(mag)) + v }); };
  term(a, 'x'); term(b, 'y');
  const lhs = terms.length ? terms.map((t, i) => (i === 0 ? (t.neg ? '-' : '') : t.neg ? ' - ' : ' + ') + t.t).join('') : '0';
  return `${lhs} = ${num(c)}`;
}
const eqT = (e) => eqTex(e).replace(/-/g, '−');   /* the same for a hover name */

/* Sim: row operations keep the solution. The system of Observation 1.2.3, x + 2y = 1 and 2x + 3y = 3,
   as two lines in the plane meeting at (3, −1), beside its augmented matrix, and the book's own route
   to a decoupled system as a step control: a replacement (−2 times equation 1 added to equation 2,
   giving −y = 1), a scaling (by −1, to y = −1), a replacement (−2 times equation 2 added to equation 1,
   giving x = 3), and last an interchange of the two equations. At a replacement the line being replaced
   turns about the point and never leaves it; at the scaling it does not move; at the interchange nothing
   in the plane moves and the two rows slide past each other in the matrix. The multiple m of the current
   replacement is a slider (−4 to 2, step 0.5, the book's −2 the default, a dashed special at −2 where
   x, then y, cancels), shown only at the two replacement steps and put back to −2 when the step changes,
   so every later step stands on the book's numbers. Each equation keeps its referent colour through every
   step, in the plane and in the matrix. The plane runs x from −3 to 7 and y from −4 to 4 at 60 units
   to 1; the lines are clipped to the box. Still: an order of steps but no clock; a change of step bends
   the lines and slides the rows over 0.9 s (the choice's own morph). */
(function () {
  const d = sim('sim-row-operations', 680);
  const U = 60, BOX = { l: 80, r: 80 + 10 * U, t: 130, b: 130 + 8 * U };
  const SOL = [3, -1], BOOK_M = -2;
  /* the right column: the system in words above its augmented matrix */
  const CX = 1070, SYS_Y = [214, 258], MAT_Y = [412, 492], COLS = [1000, 1080, 1160], BAR = 1120, BR = [950, 1212];
  const STEPS = [
    { value: 's0', label: 'original' }, { value: 's1', label: '1 · replace' }, { value: 's2', label: '2 · scale' },
    { value: 's3', label: '3 · replace' }, { value: 's4', label: '4 · interchange' },
  ];
  const isRep = (v) => v === 's1' || v === 's3';
  let m = null, mPrev = BOOK_M;
  const step = choice(d.controls, {
    label: 'step', key: 'step', value: 's0', options: STEPS,
    onInput: (v) => {
      mPrev = m.v; m.set(BOOK_M); m.show(isRep(v));
      m.mark([{ at: BOOK_M, label: v === 's3' ? 'y cancels' : 'x cancels' }]);
    },
  });
  m = ctl(d.controls, { label: 'm', cls: '', key: 'm', min: -4, max: 2, step: 0.5, value: BOOK_M, unit: '', dec: 1, aria: 'the multiple of one equation that the replacement adds to the other', specials: [{ at: BOOK_M, label: 'x cancels' }] });
  m.show(false, { ms: 0 });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);

  /* The two equations as [a, b, c] for ax + by = c, by referent (e1 is equation 1, e2 equation 2, whatever
     their order), and the slot equation 1 sits in (0 the top row, 1 the bottom). */
  function stateOf(v, mv) {
    const e1 = [1, 2, 1], e2 = [2, 3, 3];
    if (v === 's1') return { e1, e2: [2 + mv, 3 + 2 * mv, 3 + mv], slot1: 0 };
    if (v === 's2') return { e1, e2: [0, 1, -1], slot1: 0 };
    if (v === 's3') return { e1: [1, 2 + mv, 1 - mv], e2: [0, 1, -1], slot1: 0 };
    if (v === 's4') return { e1: [1, 0, 3], e2: [0, 1, -1], slot1: 1 };
    return { e1, e2, slot1: 0 };
  }
  /* a line's triple signed to agree with the one it bends into, so a scaling by −1 moves nothing */
  const agree = (from, to) => (from[0] * to[0] + from[1] * to[1] + from[2] * to[2] < 0 ? from.map((x) => -x) : from);
  /* the line ax + by = c across the box, clipped */
  function drawLine(ctx, ax, e, color, w, a) {
    const [p, q, c] = e; if (Math.abs(p) < 1e-9 && Math.abs(q) < 1e-9) return;
    const p0 = Math.abs(q) >= Math.abs(p) ? [0, c / q] : [c / p, 0], L = Math.hypot(p, q), dx = q / L, dy = -p / L;
    ctx.save(); ctx.globalAlpha *= a; ctx.beginPath(); ctx.rect(BOX.l, BOX.t, BOX.r - BOX.l, BOX.b - BOX.t); ctx.clip();
    line(ctx, ax.X(p0[0] - 40 * dx), ax.Y(p0[1] - 40 * dy), ax.X(p0[0] + 40 * dx), ax.Y(p0[1] + 40 * dy), color, w);
    ctx.restore();
  }
  /* where the line meets the edges of the window, in the plane */
  function edgePts(e, xr, yr) {
    const [a, b, c] = e, pts = [];
    if (Math.abs(b) > 1e-9) xr.forEach((x) => { const y = (c - a * x) / b; if (y >= yr[0] - 1e-9 && y <= yr[1] + 1e-9) pts.push([x, y]); });
    if (Math.abs(a) > 1e-9) yr.forEach((y) => { const x = (c - b * y) / a; if (x > xr[0] + 1e-9 && x < xr[1] - 1e-9) pts.push([x, y]); });
    return pts;
  }
  /* the distance on the canvas from a point to the line ax + by = c */
  const distTo = (e, q, ax) => { const [a, b, c] = e, n = Math.hypot(a, b) || 1; const x = (q[0] - BOX.l) / U - 3, y = 4 - (q[1] - BOX.t) / U; return (Math.abs(a * x + b * y - c) / n) * U; };
  /* the equation written beside its line, inside the box, at whichever of four spots along it keeps farthest
     from the other line and from the labels already placed */
  function lineLabel(ctx, ax, e, color, avoid, others, a) {
    const pts = edgePts(e, ax.xr, ax.yr); if (pts.length < 2) return null;
    const P = pts.slice(0, 2).map((p) => [ax.X(p[0]), ax.Y(p[1])]);
    const dx = P[1][0] - P[0][0], dy = P[1][1] - P[0][1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    const sp = [ax.X(SOL[0]), ax.Y(SOL[1])];
    const cands = [90, 190].flatMap((t) => [[P[0][0] + ux * t, P[0][1] + uy * t], [P[1][0] - ux * t, P[1][1] - uy * t]]).map((c) => {
      const dp = (c[0] - sp[0]) * nx + (c[1] - sp[1]) * ny, side = Math.abs(dp) < 1 ? (ny < 0 ? 1 : -1) : dp > 0 ? 1 : -1;
      return [Math.min(Math.max(c[0] + nx * side * 28, BOX.l + 70), BOX.r - 70), Math.min(Math.max(c[1] + ny * side * 28, BOX.t + 18), BOX.b - 18)];
    });
    const score = (q) => Math.min(...avoid.map((o) => Math.hypot(q[0] - o[0], q[1] - o[1])), ...others.map((o) => distTo(o, q, ax) + 10));
    const pick = cands.reduce((b, q) => (score(q) > score(b) ? q : b));
    ctx.save(); ctx.globalAlpha *= a;
    text(ctx, `$${eqTex(e)}$`, pick[0], pick[1], color, { size: 20, weight: 600, align: 'center', tex: true, bg: PAL.panel });
    ctx.restore();
    return pick;
  }
  /* the solution's label in whichever quadrant about the point lies farthest from both lines */
  function pointLabel(ctx, ax, lines, color, a) {
    const sx = ax.X(SOL[0]), sy = ax.Y(SOL[1]);
    const cands = [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([h, v]) => ({ x: sx + h * 24, y: sy + v * 26, align: h > 0 ? 'left' : 'right', c: [sx + h * 56, sy + v * 26] }));
    const pick = cands.reduce((b, q) => (Math.min(...lines.map((e) => distTo(e, q.c, ax))) > Math.min(...lines.map((e) => distTo(e, b.c, ax))) ? q : b));
    ctx.save(); ctx.globalAlpha *= a;
    text(ctx, '$(3, -1)$', pick.x, pick.y, color, { size: 20, weight: 600, align: pick.align, tex: true, bg: PAL.panel });
    ctx.restore();
    return pick.c;
  }
  const mid = (ax, e) => { const p = edgePts(e, ax.xr, ax.yr); return p.length < 2 ? null : [ax.X((p[0][0] + p[1][0]) / 2), ax.Y((p[0][1] + p[1][1]) / 2)]; };
  const mtx = (rows) => `\\htmlClass{kv-matrix}{\\left[\\begin{array}{rr|r} ${rows.map((r) => r.map(num).join(' & ')).join(' \\\\ ')} \\end{array}\\right]}`;
  /* a row of the augmented matrix at height y, its entries in the colour of its equation */
  function row(ctx, e, y, color, a, dx = 0) {
    ctx.save(); ctx.globalAlpha *= a;
    e.forEach((v, i) => text(ctx, numT(v), COLS[i] + dx, y, color, { size: 26, weight: 600, align: 'center' }));
    ctx.restore();
  }

  function draw() {
    const { ctx } = begin(d.c);
    const c1 = F.ref('equation-1'), c2 = F.ref('equation-2'), mc = C('matrix'), rc = C('region'), ink = PAL.ink, mu = PAL.muted;
    const g = ease.smooth(arrival(d));
    const v = step.value, from = step.from, k = step.k, mv = m.v;
    const to = stateOf(v, mv), was = from === v ? to : stateOf(from, mPrev);
    const e1 = k >= 1 ? to.e1 : lerp3(agree(was.e1, to.e1), to.e1, k);
    const e2 = k >= 1 ? to.e2 : lerp3(agree(was.e2, to.e2), to.e2, k);
    const slot1 = lerp(was.slot1, to.slot1, k), swapping = was.slot1 !== to.slot1, bow = swapping ? 36 * Math.sin(Math.PI * k) : 0;
    hits = [];
    /* the plane: a faint unit grid under the axes, the two lines, the point they share */
    ctx.save(); ctx.beginPath(); ctx.rect(BOX.l, BOX.t, BOX.r - BOX.l, BOX.b - BOX.t); ctx.clip();
    for (let i = -3; i <= 7; i++) line(ctx, BOX.l + (i + 3) * U, BOX.t, BOX.l + (i + 3) * U, BOX.b, alpha(ink, 0.06), 1.5);
    for (let j = -4; j <= 4; j++) line(ctx, BOX.l, BOX.b - (j + 4) * U, BOX.r, BOX.b - (j + 4) * U, alpha(ink, 0.06), 1.5);
    ctx.restore();
    const ax = axes(ctx, BOX, [-3, 7], [-4, 4], { xl: 'x', yl: 'y', nx: 10, ny: 8, fx: (q) => fmt(q, 0), fy: (q) => fmt(q, 0) });
    drawLine(ctx, ax, e1, c1, 5, g);
    drawLine(ctx, ax, e2, c2, 5, g);
    const sx = ax.X(SOL[0]), sy = ax.Y(SOL[1]);
    ctx.save(); ctx.globalAlpha *= g;
    dot(ctx, sx, sy, rc, true, 9);
    ctx.restore();
    const pl = pointLabel(ctx, ax, [e1, e2], rc, g);
    const l1 = lineLabel(ctx, ax, e1, c1, [[sx, sy], pl], [e2], g);
    lineLabel(ctx, ax, e2, c2, l1 ? [[sx, sy], pl, l1] : [[sx, sy], pl], [e1], g);
    /* the right column: the system, then its augmented matrix with the rows in the equations' colours */
    text(ctx, 'the system', CX, 170, mu, { size: 20, align: 'center' });
    const y1 = lerp(SYS_Y[0], SYS_Y[1], slot1), y2 = lerp(SYS_Y[1], SYS_Y[0], slot1);
    text(ctx, `$${eqTex(e1)}$`, CX - 2.6 * bow, y1, c1, { size: 24, weight: 600, align: 'center', tex: true });
    text(ctx, `$${eqTex(e2)}$`, CX + 2.6 * bow, y2, c2, { size: 24, weight: 600, align: 'center', tex: true });
    text(ctx, 'its augmented matrix', CX, 332, mc, { size: 20, align: 'center' });
    const top = MAT_Y[0] - 44, bot = MAT_Y[1] + 44;
    [BR[0], BR[1]].forEach((x, i) => { const s = i ? -1 : 1; line(ctx, x, top, x, bot, mc, 3); line(ctx, x, top, x + s * 14, top, mc, 3); line(ctx, x, bot, x + s * 14, bot, mc, 3); });
    line(ctx, BAR, top + 8, BAR, bot - 8, mc, 2.5);
    const r1 = lerp(MAT_Y[0], MAT_Y[1], slot1), r2y = lerp(MAT_Y[1], MAT_Y[0], slot1);
    /* a replacement in progress: the scaled copy of one row slides onto the row it is added to, which takes its new entries as the copy lands */
    const rep = k < 1 && isRep(v) && from !== v;
    const landed = !rep || k >= 0.6;
    const shown1 = landed || v !== 's3' ? e1 : was.e1, shown2 = landed || v !== 's1' ? e2 : was.e2;
    row(ctx, shown1, r1, c1, 1, -bow);
    row(ctx, shown2, r2y, c2, 1, bow);
    if (rep) {
      const src = v === 's1' ? e1 : e2, srcC = v === 's1' ? c1 : c2, ys = v === 's1' ? [r1, r2y] : [r2y, r1];
      const ghost = src.map((x) => mv * x), gy = lerp(ys[0], ys[1], ease.smooth(Math.min(1, k / 0.6))), ga = Math.min(1, 4 * k) * (1 - k);
      row(ctx, ghost, gy, srcC, ga);
      text(ctx, `$${num(mv)}\\times$ row ${v === 's1' ? 1 : 2}`, BR[0] - 24, gy, srcC, { size: 18, weight: 600, align: 'right', tex: true, bg: PAL.panel });
    }
    if (v === 's2') {
      ctx.save(); ctx.globalAlpha *= k;
      text(ctx, '$\\times (-1)$', BR[1] + 26, r2y, mu, { size: 20, align: 'left', tex: true });
      ctx.restore();
    }
    /* hover names */
    const p1 = mid(ax, e1), p2 = mid(ax, e2);
    if (p1) hits.push({ x: p1[0], y: p1[1], r: 16, name: `equation 1, ${eqT(e1)}: every point of this line satisfies it` });
    if (p2) hits.push({ x: p2[0], y: p2[1], r: 16, name: `equation 2, ${eqT(e2)}: every point of this line satisfies it` });
    hits.push({ x: sx, y: sy, r: 18, name: '(3, −1): the one point on both lines, the solution of the system; no operation moves it' });
    hits.push({ x: CX, y: r1, r: 30, name: `the row of equation 1: its coefficients ${numT(e1[0])}, ${numT(e1[1])} and its constant ${numT(e1[2])}` });
    hits.push({ x: CX, y: r2y, r: 30, name: `the row of equation 2: its coefficients ${numT(e2[0])}, ${numT(e2[1])} and its constant ${numT(e2[2])}` });
    /* headline and readout */
    const T = (e) => `$${eqTex(e)}$`, mT = `$${num(mv)}$`;
    let h, note;
    if (v === 's0') { h = `The lines $x + 2y = 1$ and $2x + 3y = 3$ meet at $(3, -1)$: the one solution of the system.`; note = 'The augmented matrix of the system, before any operation.'; }
    else if (v === 's1') {
      h = mv === BOOK_M ? `Replacement: $-2$ times the first equation added to the second gives $-y = 1$; the second line turns about $(3, -1)$, and the system is triangular.`
        : mv === 0 ? `Replacement: $0$ times the first equation added to the second leaves the second equation, $2x + 3y = 3$, as it was.`
          : `Replacement: ${mT} times the first equation added to the second gives ${T(to.e2)}; the new second line still passes through $(3, -1)$, but $x$ has not cancelled.`;
      note = `Replacement: ${numT(mv)} times row 1 added to row 2.`;
    } else if (v === 's2') { h = `Scaling: multiplying $-y = 1$ by $-1$ gives $y = -1$, the same line.`; note = 'Scaling: row 2 multiplied by −1.'; }
    else if (v === 's3') {
      h = mv === BOOK_M ? `Replacement: $-2$ times the second equation added to the first gives $x = 3$; the system is decoupled, and the point is still $(3, -1)$.`
        : mv === 0 ? `Replacement: $0$ times the second equation added to the first leaves the first equation, $x + 2y = 1$, as it was.`
          : `Replacement: ${mT} times the second equation added to the first gives ${T(to.e1)}; the first line turns about $(3, -1)$, but $y$ has not cancelled.`;
      note = `Replacement: ${numT(mv)} times row 2 added to row 1.`;
    } else { h = `Interchange: the two equations change places; neither line moves, and the solution is $(3, -1)$ as before.`; note = 'Interchange: rows 1 and 2 change places.'; }
    headline(ctx, h);
    const cur = to.slot1 === 0 ? [to.e1, to.e2] : [to.e2, to.e1];
    ro.set(`${mtx([[1, 2, 1], [2, 3, 3]])} \\sim ${mtx(cur)}`, note);
  }
  still(d, draw);
})();
};
