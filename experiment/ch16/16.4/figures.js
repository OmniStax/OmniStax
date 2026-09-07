/* Figures for section 16.4 The Simple Pendulum. Boots against the section's text article. */
window.OMNIA_FIGURES = window.OMNIA_FIGURES || {};
window.OMNIA_FIGURES['16.4'] = function (root, F) {
const { el, fmt, tex, C, PAL, alpha, REDUCED, ctl, cycle, register, begin, line, arrow, dot, text, headline, axes, nice, curve, scale, fixed } = F;
const demo = (id, H) => F.demo(root, id, H);
const TAU = 2 * Math.PI, DEG = Math.PI / 180;
function readout(host, main, small) { tex(host, main); if (small) host.appendChild(el('small', null, small)); }
const sgn = (v) => (v < 0 ? '−' : '+');
/* the true period of a pendulum released from angle a: T = 4√(L/g) K(sin a/2), K by the arithmetic-geometric mean */
function truePeriod(L, g, a) { let x = 1, y = Math.cos(a / 2); for (let i = 0; i < 8; i++) { const m = (x + y) / 2; y = Math.sqrt(x * y); x = m; } return TAU * Math.sqrt(L / g) / x; }
/* a pendulum: pivot, string, bob; angle th from the vertical, positive to the right */
function pendulum(ctx, px, py, Ld, th, r, color) {
  const bx = px + Ld * Math.sin(th), by = py + Ld * Math.cos(th);
  line(ctx, px, py, bx, by, PAL.ink, 3); dot(ctx, px, py, PAL.muted, true, 6); dot(ctx, bx, by, color, true, r);
  return { bx, by };
}

/* =====================================================================
   DEMO 1: the forces on the bob. True motion (no small-angle
   approximation), the weight split along the string and along the arc,
   and F against s beside it with Hooke's line. Endless.
===================================================================== */
(function () {
  const d = demo('demo-pendulum-force', 640);
  const a0 = ctl(d.controls, { label: '\\theta_0', cls: '', min: 2, max: 60, step: 1, value: 15, unit: '°', dec: 0, onInput: reset, aria: 'swing amplitude' });
  const L = ctl(d.controls, { label: 'L', cls: '', min: 0.5, max: 2, step: 0.05, value: 1, unit: 'm', dec: 2, onInput: reset, aria: 'length' });
  const m = ctl(d.controls, { label: 'm', cls: '', min: 0.1, max: 2, step: 0.1, value: 0.5, unit: 'kg', dec: 1, onInput: reset, aria: 'mass' });
  const G = 9.80;
  const cy = cycle(() => Infinity, 0);
  let th = a0.v * DEG, om = 0;   /* the state: angle and angular velocity, integrated each frame */
  function reset() { cy.reset(); th = a0.v * DEG; om = 0; }
  function integrate(dt) {   /* RK4 on θ'' = −(g/L) sin θ, in steps of at most 4 ms */
    const n = Math.max(1, Math.ceil(dt / 0.004)), h = dt / n, f = (t) => -(G / L.v) * Math.sin(t);
    for (let i = 0; i < n; i++) {
      const k1t = om, k1o = f(th), k2t = om + h / 2 * k1o, k2o = f(th + h / 2 * k1t), k3t = om + h / 2 * k2o, k3o = f(th + h / 2 * k2t), k4t = om + h * k3o, k4o = f(th + h * k3t);
      th += h / 6 * (k1t + 2 * k2t + 2 * k3t + k4t); om += h / 6 * (k1o + 2 * k2o + 2 * k3o + k4o);
    }
  }
  function draw() {
    const { ctx } = begin(d.c);
    const t = REDUCED ? a0.v * DEG : th, mg = m.v * G, s = L.v * t, Fs = -mg * Math.sin(t);
    /* the scene */
    const px = 330, py = 110, Ld = 200 + 90 * L.v;
    fixed(ctx, px - 110, py - 44, 220, 44);
    line(ctx, px, py, px, py + Ld + 50, PAL.muted, 2, [8, 8]);
    ctx.save(); ctx.strokeStyle = PAL.rule; ctx.lineWidth = 2; ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.arc(px, py, Ld, Math.PI / 2 - a0.v * DEG, Math.PI / 2 + a0.v * DEG); ctx.stroke(); ctx.restore();
    if (Math.abs(t) > 0.01) {
      ctx.save(); ctx.strokeStyle = C('x'); ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(px, py, Ld + 14, Math.PI / 2, Math.PI / 2 - t, t > 0); ctx.stroke(); ctx.restore();
      text(ctx, 's = ' + sgn(s) + fmt(Math.abs(s), 3) + ' m', px - Math.sign(t) * 30, py + Ld + 44, C('x'), { weight: 600, size: 20, align: t > 0 ? 'right' : 'left' });
    }
    const { bx, by } = pendulum(ctx, px, py, Ld, t, 16, PAL.ink);
    text(ctx, 'L = ' + fmt(L.v, 2) + ' m', px + Ld / 2 * Math.sin(t) + (t >= 0 ? -16 : 16), py + Ld / 2 * Math.cos(t), PAL.muted, { size: 18, align: t >= 0 ? 'right' : 'left' });
    if (Math.abs(t) > 0.005) { ctx.save(); ctx.strokeStyle = PAL.muted; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, 60, Math.PI / 2, Math.PI / 2 - t, t > 0); ctx.stroke(); ctx.restore(); text(ctx, 'θ = ' + fmt(Math.abs(t) / DEG, 1) + '°', px + (t >= 0 ? 1 : -1) * 78 * Math.sin(Math.abs(t) / 2 + 0.25) , py + 78 * Math.cos(Math.abs(t) / 2 + 0.25) + 4, PAL.muted, { size: 18, align: t >= 0 ? 'left' : 'right' }); }
    /* the forces: weight, its two components, the tension */
    const fs = 180 / mg, ux = Math.sin(t), uy = Math.cos(t), tx = Math.cos(t), ty = -Math.sin(t);   /* u: along the string outward; t: along the arc toward +θ */
    const wl = mg * fs, cl = mg * Math.cos(t) * fs, sl = mg * Math.sin(t) * fs;
    const side = t >= 0 ? 1 : -1;   /* the component leans to the bob's side; the labels sit on opposite sides of the pair */
    arrow(ctx, bx, by, bx, by + wl, C('F'), 4); text(ctx, 'w = mg', bx - side * 16, by + wl * 0.62, C('F'), { size: 18, align: side > 0 ? 'right' : 'left' });
    line(ctx, bx, by, bx + ux * cl, by + uy * cl, C('F'), 2, [6, 6]); line(ctx, bx + ux * cl, by + uy * cl, bx, by + wl, C('F'), 2, [6, 6]); line(ctx, bx - tx * sl, by - ty * sl, bx, by + wl, C('F'), 2, [6, 6]);
    text(ctx, 'mg cos θ', bx + ux * cl * 0.62 + side * 16, by + uy * cl * 0.62, C('F'), { size: 17, align: side > 0 ? 'left' : 'right' });
    arrow(ctx, bx, by, bx - ux * cl, by - uy * cl, PAL.muted, 4); text(ctx, 'tension', bx - ux * cl * 0.55 + (t >= 0 ? 12 : -12), by - uy * cl * 0.55, PAL.muted, { size: 17, align: t >= 0 ? 'left' : 'right' });
    if (Math.abs(t) > 0.01) { arrow(ctx, bx, by, bx - tx * sl, by - ty * sl, C('F'), 6); text(ctx, 'mg sin θ = ' + fmt(Math.abs(Fs), 2) + ' N', bx - tx * (sl + 16), by - ty * (sl + 16) - 22, C('F'), { size: 18, weight: 600, align: t >= 0 ? 'right' : 'left' }); }
    /* the graph beside: F against s, true and Hooke */
    const sm = nice(0, L.v * Math.max(a0.v * DEG, 20 * DEG) * 1.15, 2).hi, Fm = nice(0, mg * 1.05, 2).hi;
    const box = { l: 800, r: 1320, t: 130, b: 540 };
    const { X, Y } = axes(ctx, box, [-sm, sm], [-Fm, Fm], { xl: 'arc length s (m)', xc: C('x'), yl: 'restoring force F (N)', yc: C('F'), nx: 4, ny: 4, fx: (v) => fmt(v, 2), fy: (v) => fmt(v, 1) });
    const sb = Math.min(sm, L.v * 15 * DEG);
    ctx.save(); ctx.fillStyle = alpha(C('x'), 0.1); ctx.fillRect(X(-sb), box.t, X(sb) - X(-sb), box.b - box.t); ctx.restore();
    text(ctx, 'θ below 15°', X(0), box.b - 18, C('x'), { size: 17, align: 'center' });
    ctx.save(); ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip();
    curve(ctx, (v) => -(mg / L.v) * v, -sm, sm, X, Y, C('F'), 3, 2);
    curve(ctx, (v) => -mg * Math.sin(v / L.v), -sm, sm, X, Y, PAL.ink, 4, 120);
    ctx.restore();
    text(ctx, 'F = −(mg/L)s', X(-sm * 0.95), Y(mg / L.v * sm * 0.95) - 20, C('F'), { size: 17, weight: 600 });
    text(ctx, 'F = −mg sin θ', X(sm * 0.95), Y(-mg * Math.sin(sm * 0.95 / L.v)) + 24, PAL.ink, { size: 17, weight: 600, align: 'right' });
    dot(ctx, X(s), Y(Fs), C('F'), true, 9);
    const dev = (a0.v * DEG - Math.sin(a0.v * DEG)) / Math.sin(a0.v * DEG) * 100, Tt = truePeriod(L.v, G, a0.v * DEG), T0 = TAU * Math.sqrt(L.v / G);
    headline(ctx, Math.abs(t) < 0.01 ? 'through the lowest point: the net force along the arc is zero, and the bob is moving fastest'
      : 'θ = ' + fmt(Math.abs(t) / DEG, 1) + '°, so the net force is mg sin θ = ' + fmt(Math.abs(Fs), 2) + ' N along the arc, back toward equilibrium');
    readout(d.readout, `\\kF \\approx -\\frac{m\\kg}{L}\\ks = -\\frac{(${fmt(m.v, 1)}\\ \\text{kg})(9.80\\ \\text{m/s}^2)}{${fmt(L.v, 2)}\\ \\text{m}}(${sgn(s)}${fmt(Math.abs(s), 3)}\\ \\text{m}) = ${sgn(-s)}${fmt(Math.abs(mg / L.v * s), 2)}\\ \\text{N}`,
      'At the amplitude of ' + fmt(a0.v, 0) + '°, θ and sin θ differ by ' + fmt(dev, 1) + '%, and the true period of ' + fmt(Tt, 2) + ' s is ' + fmt((Tt / T0 - 1) * 100, 1) + '% longer than 2π√(L/g) = ' + fmt(T0, 2) + ' s.');
  }
  register(d.fig, { update: (dt) => { cy.step(dt, () => 1); if (!REDUCED) integrate(dt); }, draw });
})();

/* =====================================================================
   DEMO 2: the period. Two pendulums of different length and mass
   released together; T against L below for the set g. Endless.
===================================================================== */
(function () {
  const d = demo('demo-pendulum-period', 760);
  const L1 = ctl(d.controls, { label: 'L_1', cls: '', min: 0.1, max: 2, step: 0.05, value: 1, unit: 'm', dec: 2, onInput: reset, aria: 'length of pendulum 1' });
  const L2 = ctl(d.controls, { label: 'L_2', cls: '', min: 0.1, max: 2, step: 0.05, value: 0.25, unit: 'm', dec: 2, onInput: reset, aria: 'length of pendulum 2' });
  const m2 = ctl(d.controls, { label: 'm_2', cls: '', min: 0.1, max: 10, step: 0.1, value: 5, unit: 'kg', dec: 1, onInput: reset, aria: 'mass of the second bob' });
  const g = ctl(d.controls, { label: '\\kg', cls: 'a', min: 1.6, max: 25, step: 0.01, value: 9.8, unit: 'm/s²', dec: 2, onInput: reset });
  const cy = cycle(() => Infinity, 0);
  function reset() { cy.reset(); }
  const Tof = (L) => TAU * Math.sqrt(L / g.v), A0 = 12 * DEG;
  function draw() {
    const { ctx } = begin(d.c);
    const tau = REDUCED ? 0 : cy.now(), T1 = Tof(L1.v), T2 = Tof(L2.v);
    const Ld = (L) => 40 + 150 * L;
    fixed(ctx, 200, 60, 1000, 40);
    for (const [px, L, T, mass, lab] of [[450, L1.v, T1, 1, '1'], [950, L2.v, T2, m2.v, '2']]) {
      const py = 100, th = A0 * Math.cos(TAU * tau / T);
      line(ctx, px, py, px, py + Ld(2) + 20, PAL.muted, 2, [8, 8]);
      const { bx, by } = pendulum(ctx, px, py, Ld(L), th, 12 + 4 * Math.sqrt(mass), PAL.ink);
      text(ctx, 'L' + lab + ' = ' + fmt(L, 2) + ' m', px + (lab === '1' ? -150 : 150), py + 60, PAL.ink, { size: 20, weight: 600, align: 'center' });
      text(ctx, 'T' + lab + ' = ' + fmt(T, 2) + ' s', px + (lab === '1' ? -150 : 150), py + 90, C('t'), { size: 20, weight: 600, align: 'center' });
      if (lab === '2') text(ctx, 'm₂ = ' + fmt(mass, 1) + ' kg', px + 150, py + 120, PAL.muted, { size: 18, align: 'center' });
    }
    /* the graph: T against L for this g */
    const Tr = nice(0, Tof(2) * 1.05, 4), box = { l: 200, r: 1240, t: 470, b: 660 };
    const { X, Y } = axes(ctx, box, [0, 2], [0, Tr.hi], { xl: 'length L (m)', xc: PAL.ink, yl: 'T (s)', yc: C('t'), nx: 4, ny: Tr.n, fx: (v) => fmt(v, 1), fy: (v) => fmt(v, 1) });
    curve(ctx, Tof, 0, 2, X, Y, C('t'), 4, 100);
    text(ctx, 'T = 2π√(L/g)', X(1.5) + 10, Y(Tof(1.5)) + 38, C('t'), { weight: 600, size: 20 });
    for (const [L, T, lab] of [[L1.v, T1, '1'], [L2.v, T2, '2']]) { line(ctx, X(L), box.b, X(L), Y(T), PAL.ink, 2, [4, 8]); dot(ctx, X(L), Y(T), C('t'), true, 9); text(ctx, lab, X(L) + 14, Y(T) - 14, C('t'), { size: 18, weight: 600 }); }
    headline(ctx, 'L₁ = ' + fmt(L1.v, 2) + ' m and g = ' + fmt(g.v, 2) + ' m/s² give T₁ = ' + fmt(T1, 2) + ' s; the pendulum of ' + fmt(L2.v, 2) + ' m has T₂ = ' + fmt(T2, 2) + ' s');
    readout(d.readout, `\\kT = 2\\pi\\sqrt{\\frac{L}{\\kg}} = 2\\pi\\sqrt{\\frac{${fmt(L1.v, 2)}\\ \\text{m}}{${fmt(g.v, 2)}\\ \\text{m/s}^2}} = ${fmt(T1, 2)}\\ \\text{s}`,
      'The second pendulum, ' + fmt(L2.v, 2) + ' m long with a ' + fmt(m2.v, 1) + ' kg bob, has T = ' + fmt(T2, 2) + ' s. Its mass does not enter; only the length and g do.');
  }
  register(d.fig, { update: (dt) => cy.step(dt, () => 1), draw });
})();

/* =====================================================================
   DEMO 3: measuring g. Ten swings timed on a stopwatch, the period from
   the total, g from the period. Example 16.5 on load. Finite.
===================================================================== */
(function () {
  const d = demo('demo-measure-g', 600);
  const L = ctl(d.controls, { label: 'L', cls: '', min: 0.25, max: 2, step: 0.005, value: 0.75, unit: 'm', dec: 3, onInput: reset, aria: 'length' });
  const gl = ctl(d.controls, { label: '\\kg', cls: 'a', min: 1.6, max: 12, step: 0.0001, value: 9.8281, unit: 'm/s²', dec: 4, onInput: reset, aria: 'local acceleration due to gravity' });
  const N = 10, T = () => TAU * Math.sqrt(L.v / gl.v), total = () => N * T();
  const cy = cycle(total, 1.8);
  function reset() { cy.reset(); }
  function draw() {
    const { ctx } = begin(d.c);
    const tau = cy.now(), done = tau >= total() - 1e-9, n = Math.min(N, Math.floor(tau / T() + 1e-6));
    const Tm = total() / N, gm = 4 * Math.PI * Math.PI * L.v / (Tm * Tm);
    /* the pendulum, a small swing */
    const px = 250, py = 100, Ld = 100 + 150 * L.v, th = 6 * DEG * Math.cos(TAU * tau / T());
    fixed(ctx, px - 100, py - 40, 200, 40);
    line(ctx, px, py, px, py + Ld + 30, PAL.muted, 2, [8, 8]);
    pendulum(ctx, px, py, Ld, th, 14, PAL.ink);
    text(ctx, 'L = ' + fmt(L.v, 3) + ' m', px + 120, py + Ld / 2, PAL.ink, { size: 20, weight: 600 });
    /* the stopwatch: one turn of the hand for the whole run */
    const sx = 760, sy = 230, r = 96;
    ctx.save(); ctx.strokeStyle = PAL.muted; ctx.lineWidth = 3; ctx.fillStyle = PAL.panel; ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillRect(sx - 12, sy - r - 20, 24, 14); ctx.strokeRect(sx - 12, sy - r - 20, 24, 14);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; line(ctx, sx + (r - 12) * Math.sin(a), sy - (r - 12) * Math.cos(a), sx + (r - 4) * Math.sin(a), sy - (r - 4) * Math.cos(a), PAL.muted, i % 3 ? 2 : 4); }
    ctx.restore();
    const ha = (tau / total()) * TAU;
    line(ctx, sx, sy, sx + (r - 22) * Math.sin(ha), sy - (r - 22) * Math.cos(ha), C('t'), 5); dot(ctx, sx, sy, C('t'), true, 7);
    text(ctx, 't = ' + fmt(tau, 3) + ' s', sx, sy + r + 34, C('t'), { weight: 600, size: 26, align: 'center' });
    /* the counter */
    const kx = 1150;
    text(ctx, String(n), kx, sy - 6, PAL.ink, { weight: 700, size: 88, align: 'center' });
    text(ctx, n === 1 ? 'swing completed' : 'swings completed', kx, sy + 64, PAL.muted, { size: 20, align: 'center' });
    /* the time line */
    const tl = 140, tr = 1260, ty = 500, Xt = (t) => tl + ((tr - tl) * t) / total();
    line(ctx, tl, ty, tr, ty, PAL.muted, 3);
    scale(ctx, Xt, 0, Math.floor(total()), Math.max(1, Math.round(total() / 10)), ty, 's', 2);
    for (let i = 1; i <= n; i++) line(ctx, Xt(i * T()), ty - 34, Xt(i * T()), ty - 10, C('t'), 3);
    dot(ctx, Xt(tau), ty, PAL.ink, true, 8);
    text(ctx, 'one mark for each complete swing', tl, ty - 58, PAL.muted, { size: 17 });
    headline(ctx, done ? 'ten swings took ' + fmt(total(), 3) + ' s, so T = ' + fmt(Tm, 4) + ' s and g = 4π²L/T² = ' + fmt(gm, 4) + ' m/s²'
      : n + (n === 1 ? ' swing' : ' swings') + ' completed so far, in ' + fmt(tau, 3) + ' s');
    readout(d.readout, `\\kg = 4\\pi^2\\frac{L}{\\kT^2} = 4\\pi^2\\frac{${fmt(L.v, 5)}\\ \\text{m}}{(${fmt(Tm, 4)}\\ \\text{s})^2} = ${fmt(gm, 4)}\\ \\text{m/s}^2`,
      'Timing ten swings rather than one divides the error of the stopwatch by ten. The swing is kept small so that sin θ ≈ θ holds; the example notes that five-digit precision needs an angle below about 0.5°.');
  }
  register(d.fig, { update: (dt) => cy.step(dt, () => Math.max(1, total() / 7)), draw });
})();
};
