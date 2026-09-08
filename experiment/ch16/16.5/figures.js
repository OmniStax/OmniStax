/* Figures for section 16.5 Energy and the Simple Harmonic Oscillator. Boots against the section's text article. */
window.OMNISTAX_FIGURES = window.OMNISTAX_FIGURES || {};
window.OMNISTAX_FIGURES['16.5'] = function (root, F) {
const { el, fmt, tex, C, PAL, alpha, REDUCED, ctl, cycle, register, begin, line, arrow, dot, text, headline, strip, axes, nice, curve, spring, block, fixed } = F;
const demo = (id, H) => F.demo(root, id, H);
const TAU = 2 * Math.PI;
function readout(host, main, small) { tex(host, main); if (small) host.appendChild(el('small', null, small)); }
const sgn = (v) => (v < 0 ? '−' : '+');
function sci(v, d = 2) { const e = Math.floor(Math.log10(Math.abs(v))), m = v / Math.pow(10, e); return `${fmt(m, d)}\\times10^{${e}}`; }

/* =====================================================================
   DEMO 1: energy going back and forth. The block on a spring, two energy
   bars, and energy against position below. Endless.
===================================================================== */
(function () {
  const d = demo('demo-energy-transfer', 740);
  const X = ctl(d.controls, { label: '\\kX', cls: 'position', min: 0.02, max: 0.2, step: 0.01, value: 0.1, unit: 'm', dec: 2, onInput: reset, aria: 'amplitude' });
  const k = ctl(d.controls, { label: '\\kk', cls: 'stiffness', min: 10, max: 200, step: 1, value: 50, unit: 'N/m', dec: 0, onInput: reset });
  const m = ctl(d.controls, { label: 'm', cls: '', min: 0.1, max: 2, step: 0.1, value: 0.5, unit: 'kg', dec: 1, onInput: reset, aria: 'mass' });
  const cy = cycle(() => Infinity, 0);
  function reset() { cy.reset(); }
  const w = () => Math.sqrt(k.v / m.v), T = () => TAU / w();
  function draw() {
    const { ctx } = begin(d.c);
    const tau = REDUCED ? T() / 8 : cy.now();
    const x = X.v * Math.cos(w() * tau), v = -X.v * w() * Math.sin(w() * tau);
    const E = 0.5 * k.v * X.v * X.v, PE = 0.5 * k.v * x * x, KE = 0.5 * m.v * v * v;
    /* the scene */
    const floorY = 300, eq = 620, SC = 1500;
    strip(ctx, 100, 1040, floorY + 12, 24);
    fixed(ctx, 156, floorY - 116, 44, 116);
    const bx = eq + x * SC, by = floorY - 40;
    spring(ctx, 200, by, bx - 48, by, 12, 22, PAL.ink, 4); block(ctx, bx, by, 96, 80, PAL.ink); text(ctx, 'm', bx, by, PAL.ink, { size: 20, weight: 600, align: 'center' });
    line(ctx, eq, floorY - 130, eq, floorY + 24, PAL.muted, 2, [8, 8]);
    for (const [val, lab] of [[-X.v, '−X'], [0, 'x = 0'], [X.v, '+X']]) { const px = eq + val * SC; line(ctx, px, floorY + 24, px, floorY + 40, C('position'), 3); text(ctx, lab, px, floorY + 62, C('position'), { size: 18, weight: 600, align: 'center' }); }
    if (Math.abs(v) > 0.02 * X.v * w()) { const al = 40 + 160 * Math.abs(v) / (X.v * w()), s = v < 0 ? -1 : 1; arrow(ctx, bx, by - 70, bx + s * al, by - 70, C('velocity'), 5); text(ctx, 'v', bx + s * (al + 16), by - 70, C('velocity'), { weight: 600, align: s < 0 ? 'right' : 'left' }); }
    /* the bars */
    const b0 = 320, bh = 200, bw = 70, bxs = [1130, 1240];
    line(ctx, bxs[0] - 30, b0 - bh, bxs[1] + bw + 30, b0 - bh, C('energy'), 2, [8, 6]); text(ctx, 'total ½kX² = ' + fmt(E, 3) + ' J', (bxs[0] + bxs[1] + bw) / 2, b0 - bh - 22, C('energy'), { size: 18, weight: 600, align: 'center' });
    for (const [i, val, lab] of [[0, KE, 'KE'], [1, PE, 'PE_el']]) {
      const h = bh * val / E; ctx.save(); ctx.fillStyle = alpha(C('energy'), i ? 0.35 : 0.8); ctx.fillRect(bxs[i], b0 - h, bw, h); ctx.restore();
      ctx.save(); ctx.strokeStyle = C('energy'); ctx.lineWidth = 2; ctx.strokeRect(bxs[i], b0 - bh, bw, bh); ctx.restore();
      text(ctx, lab, bxs[i] + bw / 2, b0 + 22, C('energy'), { size: 18, weight: 600, align: 'center' }); text(ctx, fmt(val, 3) + ' J', bxs[i] + bw / 2, b0 + 46, C('energy'), { size: 17, align: 'center' });
    }
    /* the graph: energy against position */
    const xr = nice(0, X.v * 1.1, 2).hi, Er = nice(0, E * 1.2, 4);
    const box = { l: 200, r: 1240, t: 440, b: 660 };
    const { gx, gy } = (() => { const { X: gx, Y: gy } = axes(ctx, box, [-xr, xr], [0, Er.hi], { xl: 'position x (m)', xc: C('position'), yl: 'energy (J)', yc: C('energy'), nx: 4, ny: Er.n, fx: (val) => fmt(val, 2), fy: (val) => fmt(val, 2) }); return { gx, gy }; })();
    ctx.save(); ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip();
    line(ctx, gx(-xr), gy(E), gx(xr), gy(E), C('energy'), 2, [8, 6]);
    curve(ctx, (s) => 0.5 * k.v * s * s, -X.v, X.v, gx, gy, alpha(C('energy'), 0.55), 4, 80);
    curve(ctx, (s) => Math.max(0, E - 0.5 * k.v * s * s), -X.v, X.v, gx, gy, C('energy'), 4, 80);
    ctx.restore();
    text(ctx, 'PE_el = ½kx²', gx(X.v * 0.8), gy(0.5 * k.v * X.v * X.v * 0.64) - 24, alpha(C('energy'), 0.7), { size: 17, weight: 600, align: 'center' });
    text(ctx, 'KE = ½kX² − ½kx²', gx(-X.v * 0.3), gy(E) - 20, C('energy'), { size: 17, weight: 600, align: 'center' });
    text(ctx, 'total', gx(-xr) + 12, gy(E) - 16, C('energy'), { size: 17, weight: 600 });
    line(ctx, gx(x), box.b, gx(x), gy(E), C('position'), 2, [4, 8]);
    dot(ctx, gx(x), gy(PE), alpha(C('energy'), 0.7), true, 8); dot(ctx, gx(x), gy(KE), C('energy'), true, 8);
    headline(ctx, KE < 0.02 * E ? 'at x = ' + sgn(x) + 'X the block is at rest: all ' + fmt(E, 3) + ' J is stored in the spring'
      : PE < 0.02 * E ? 'through equilibrium: the spring is unstretched and all ' + fmt(E, 3) + ' J is kinetic energy'
      : 'at x = ' + sgn(x) + fmt(Math.abs(x), 3) + ' m the spring holds ' + fmt(PE, 3) + ' J and the block carries ' + fmt(KE, 3) + ' J; the total is ' + fmt(E, 3) + ' J throughout');
    readout(d.readout, `\\tfrac{1}{2}m\\kv^2 + \\tfrac{1}{2}\\kk\\kx^2 = ${fmt(KE, 3)}\\ \\text{J} + ${fmt(PE, 3)}\\ \\text{J} = ${fmt(E, 3)}\\ \\text{J} = \\tfrac{1}{2}\\kk\\kX^2`,
      'With k = ' + fmt(k.v, 0) + ' N/m and X = ' + fmt(X.v, 2) + ' m the total is ½kX² = ' + fmt(E, 3) + ' J. The mass sets how fast the energy changes hands, not how much there is.');
  }
  register(d.fig, { update: (dt) => cy.step(dt, () => Math.min(1, T() / 1.2)), draw });
})();

/* =====================================================================
   DEMO 2: the maximum speed. Example 16.6's car bouncing, and v against
   x beside it: the ellipse with v_max at x = 0. Endless.
===================================================================== */
(function () {
  const d = demo('demo-max-speed', 620);
  const X = ctl(d.controls, { label: '\\kX', cls: 'position', min: 0.02, max: 0.2, step: 0.005, value: 0.1, unit: 'm', dec: 3, onInput: reset, aria: 'amplitude' });
  const k = ctl(d.controls, { label: '\\kk', cls: 'stiffness', min: 10000, max: 200000, step: 100, value: 65300, unit: 'N/m', dec: 0, onInput: reset });
  const m = ctl(d.controls, { label: 'm', cls: '', min: 100, max: 2000, step: 10, value: 900, unit: 'kg', dec: 0, onInput: reset, aria: 'mass' });
  const cy = cycle(() => Infinity, 0);
  function reset() { cy.reset(); }
  const w = () => Math.sqrt(k.v / m.v), T = () => TAU / w(), vmax = () => X.v * w();
  function draw() {
    const { ctx } = begin(d.c);
    const tau = REDUCED ? T() / 8 : cy.now();
    const x = X.v * Math.cos(w() * tau), v = -vmax() * Math.sin(w() * tau);
    /* the scene: a car body on two springs over its wheels */
    const cx = 330, road = 540, y0 = 330, SC = 900, by = y0 - x * SC;
    strip(ctx, 80, 600, road + 12, 24);
    for (const wx of [cx - 110, cx + 110]) { dot(ctx, wx, road - 22, PAL.ink, false, 22); dot(ctx, wx, road - 22, PAL.ink, true, 6); spring(ctx, wx, road - 44, wx, by + 36, 7, 18, PAL.ink, 3); }
    ctx.save(); ctx.fillStyle = PAL.panel; ctx.strokeStyle = PAL.ink; ctx.lineWidth = 4; ctx.beginPath();
    ctx.moveTo(cx - 170, by + 36); ctx.lineTo(cx - 170, by - 6); ctx.lineTo(cx - 120, by - 12); ctx.lineTo(cx - 80, by - 56); ctx.lineTo(cx + 60, by - 56); ctx.lineTo(cx + 120, by - 12); ctx.lineTo(cx + 170, by - 6); ctx.lineTo(cx + 170, by + 36); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    text(ctx, fmt(m.v, 0) + ' kg', cx, by + 10, PAL.ink, { size: 20, weight: 600, align: 'center' });
    line(ctx, 80, y0 + 36, 600, y0 + 36, PAL.muted, 2, [8, 8]); text(ctx, 'x = 0', 84, y0 + 20, C('position'), { size: 18, weight: 600 });
    if (Math.abs(v) > 0.02 * vmax()) { const al = 40 + 140 * Math.abs(v) / vmax(), s = v > 0 ? -1 : 1; arrow(ctx, cx + 200, by + 36, cx + 200, by + 36 + s * al, C('velocity'), 5); text(ctx, 'v = ' + sgn(v) + fmt(Math.abs(v), 2) + ' m/s', cx + 214, by + 36 + s * al * 0.5, C('velocity'), { size: 18, weight: 600 }); }
    /* the graph beside: v against x */
    const xr = nice(0, X.v * 1.1, 2).hi, vr = nice(0, vmax() * 1.15, 2).hi;
    const box = { l: 760, r: 1320, t: 110, b: 520 };
    const { X: gx, Y: gy } = axes(ctx, box, [-xr, xr], [-vr, vr], { xl: 'position x (m)', xc: C('position'), yl: 'velocity v (m/s)', yc: C('velocity'), nx: 4, ny: 4, fx: (val) => fmt(val, 2), fy: (val) => fmt(val, 2) });
    const vOf = (s) => vmax() * Math.sqrt(Math.max(0, 1 - (s * s) / (X.v * X.v)));
    curve(ctx, vOf, -X.v, X.v, gx, gy, C('velocity'), 4, 120); curve(ctx, (s) => -vOf(s), -X.v, X.v, gx, gy, C('velocity'), 4, 120);
    dot(ctx, gx(0), gy(vmax()), C('velocity'), false, 8); text(ctx, 'v_max = ' + fmt(vmax(), 3) + ' m/s', gx(0) + 16, gy(vmax()) - 20, C('velocity'), { size: 18, weight: 600 });
    dot(ctx, gx(0), gy(-vmax()), C('velocity'), false, 8);
    line(ctx, gx(x), box.b, gx(x), gy(v), C('position'), 2, [4, 8]); dot(ctx, gx(x), gy(v), C('velocity'), true, 9);
    headline(ctx, Math.abs(x) < 0.03 * X.v ? 'through x = 0 the car moves at its greatest speed, v_max = X√(k/m) = ' + fmt(vmax(), 3) + ' m/s'
      : Math.abs(x) > 0.97 * X.v ? 'at x = ' + sgn(x) + 'X the car is momentarily at rest and turns back'
      : 'at x = ' + sgn(x) + fmt(Math.abs(x), 3) + ' m the car moves at ' + fmt(Math.abs(v), 2) + ' m/s; the greatest speed, v_max = X√(k/m) = ' + fmt(vmax(), 3) + ' m/s, is at x = 0');
    readout(d.readout, `\\kvmax = \\kX\\sqrt{\\frac{\\kk}{m}} = (${fmt(X.v, 3)}\\ \\text{m})\\sqrt{\\frac{${sci(k.v)}\\ \\text{N/m}}{${fmt(m.v, 0)}\\ \\text{kg}}} = ${fmt(vmax(), 3)}\\ \\text{m/s}`,
      'The angular frequency is ω = 2π/T = √(k/m) = ' + fmt(w(), 2) + ' rad/s, and v_max = Xω. Doubling the amplitude to ' + fmt(2 * X.v, 3) + ' m would double v_max to ' + fmt(2 * vmax(), 2) + ' m/s; four times the force constant would double it too; four times the mass would halve it.');
  }
  register(d.fig, { update: (dt) => cy.step(dt, () => Math.min(1, T() / 1.2)), draw });
})();
};
