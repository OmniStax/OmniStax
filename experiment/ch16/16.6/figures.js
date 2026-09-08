/* Figures for section 16.6 Uniform Circular Motion and SHM. Boots against the section's text article. */
window.OMNISTAX_FIGURES = window.OMNISTAX_FIGURES || {};
window.OMNISTAX_FIGURES['16.6'] = function (root, F) {
const { el, fmt, tex, C, PAL, alpha, REDUCED, ctl, cycle, register, begin, line, arrow, dot, text, headline, strip, spring, block, fixed } = F;
const demo = (id, H) => F.demo(root, id, H);
const TAU = 2 * Math.PI, DEG = 180 / Math.PI;
function readout(host, main, small) { tex(host, main); if (small) host.appendChild(el('small', null, small)); }
const sgn = (v) => (v < 0 ? '−' : '+');
/* a curved arrow round the top of a circle, counterclockwise, for ω */
function curl(ctx, cx, cy, r, color) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI * 0.35, -Math.PI * 0.65, true); ctx.stroke(); ctx.restore();
  const a = -Math.PI * 0.65, tx = cx + r * Math.cos(a), ty = cy + r * Math.sin(a);
  arrow(ctx, tx + 14 * Math.sin(a), ty - 14 * Math.cos(a), tx - 2 * Math.sin(a), ty + 2 * Math.cos(a), color, 3);
}

/* =====================================================================
   DEMO 1: the turntable. A ball on a circle, its shadow on a line below
   drawn as a block on a spring, and the trace on paper moving downward.
   Endless.
===================================================================== */
(function () {
  const d = demo('demo-turntable', 900);
  const X = ctl(d.controls, { label: '\\kX', cls: 'position', min: 5, max: 20, step: 1, value: 10, unit: 'cm', dec: 0, onInput: reset, aria: 'radius' });
  const T = ctl(d.controls, { label: '\\kT', cls: 'time', min: 0.5, max: 4, step: 0.1, value: 2, unit: 's', dec: 2, onInput: reset, aria: 'period' });
  const cy = cycle(() => Infinity, 0);
  function reset() { cy.reset(); }
  const w = () => TAU / T.v;
  function draw() {
    const { ctx } = begin(d.c);
    const tau = REDUCED ? T.v / 5 : cy.now(), th = w() * tau, x = X.v * Math.cos(th);
    const cx = 700, cyc = 300, R = 9 * X.v, yL = 520;
    /* the lights and the turntable */
    fixed(ctx, cx - 420, 84, 840, 22);
    for (let i = -3; i <= 3; i++) line(ctx, cx + i * 120, 106, cx + i * 120, 122, PAL.muted, 3);
    ctx.save(); ctx.strokeStyle = PAL.muted; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cyc, R, 0, TAU); ctx.stroke(); ctx.restore();
    dot(ctx, cx, cyc, PAL.muted, true, 5);
    curl(ctx, cx, cyc, R + 26, C('angular-rate')); text(ctx, 'ω', cx, cyc - R - 50, C('angular-rate'), { weight: 600, align: 'center' });
    const bx = cx + R * Math.cos(th), byy = cyc - R * Math.sin(th);
    line(ctx, cx, cyc, bx, byy, PAL.muted, 2);
    line(ctx, bx, 122, bx, byy - 12, alpha(C('time'), 0.35), 2); line(ctx, bx, byy + 12, bx, yL - 24, PAL.muted, 2, [6, 6]);
    dot(ctx, bx, byy, PAL.ink, true, 12);
    /* the shadow line, the block on its spring */
    strip(ctx, cx - 420, cx + 420, yL + 12, 24);
    fixed(ctx, cx - 484, yL - 96, 44, 96);
    spring(ctx, cx - 440, yL - 22, bx - 30, yL - 22, 12, 16, PAL.ink, 3);
    ctx.save(); ctx.fillStyle = alpha(PAL.ink, 0.18); ctx.beginPath(); ctx.ellipse(bx, yL + 4, 40, 8, 0, 0, TAU); ctx.fill(); ctx.restore();
    block(ctx, bx, yL - 22, 60, 44, PAL.ink);
    for (const [val, lab] of [[-X.v, '−X'], [0, 'x = 0'], [X.v, '+X']]) { const px = cx + 9 * val; line(ctx, px, yL + 24, px, yL + 38, C('position'), 3); text(ctx, lab, px, yL + 58, C('position'), { size: 18, weight: 600, align: 'center' }); }
    line(ctx, cx, cyc, cx, yL + 24, PAL.muted, 1.5, [4, 8]);
    /* the paper: moving downward, the pen at its top edge under the shadow */
    const pt = 610, pb = 880, perT = 135, span = (pb - pt) / perT;   /* seconds of trace showing */
    ctx.save(); ctx.fillStyle = PAL.soft; ctx.fillRect(cx - 420, pt, 840, pb - pt); ctx.restore();
    line(ctx, cx, pt, cx, pb, PAL.muted, 1.5, [4, 8]);
    for (let n = 1; n * T.v <= span * T.v + 1e-9 && n <= 2; n++) { const yy = pt + n * perT; line(ctx, cx - 420, yy, cx - 406, yy, C('time'), 3); text(ctx, n === 1 ? 'T' : n + 'T', cx - 400, yy, C('time'), { size: 18, weight: 600 }); }
    text(ctx, 'paper moves down', cx + 410, pt + 20, PAL.muted, { size: 17, align: 'right' }); arrow(ctx, cx + 400, pt + 40, cx + 400, pt + 90, PAL.muted, 3);
    ctx.save(); ctx.beginPath(); ctx.rect(cx - 420, pt, 840, pb - pt); ctx.clip(); ctx.strokeStyle = C('position'); ctx.lineWidth = 4; ctx.beginPath();
    const t0 = Math.max(0, tau - span * T.v), n = Math.max(40, Math.ceil(60 * (tau - t0) / T.v));
    for (let i = 0; i <= n; i++) { const s = t0 + ((tau - t0) * i) / n, px = cx + R * Math.cos(w() * s), py = pt + (tau - s) * perT / T.v; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    if (tau > 0) ctx.stroke(); ctx.restore();
    dot(ctx, bx, pt, C('position'), true, 8);
    const deg = ((th * DEG) % 360 + 360) % 360;
    headline(ctx, 'θ = ωt = ' + fmt(deg, 0) + '°, so the shadow is at x = X cos θ = ' + sgn(x) + fmt(Math.abs(x), 1) + ' cm');
    readout(d.readout, `\\kx = \\kX\\cos\\kw\\kt = (${fmt(X.v, 0)}\\ \\text{cm})\\cos(${fmt(deg, 0)}°) = ${sgn(x)}${fmt(Math.abs(x), 1)}\\ \\text{cm}`,
      'ω = 2π/T = ' + fmt(w(), 2) + ' rad/s. The ball goes round once every T = ' + fmt(T.v, 2) + ' s, and the shadow goes back and forth once in the same time.');
  }
  register(d.fig, { update: (dt) => cy.step(dt, () => 1), draw });
})();

/* =====================================================================
   DEMO 2: the two similar triangles. P on the circle, the displacement
   triangle at the centre and the velocity triangle at P. Endless.
===================================================================== */
(function () {
  const d = demo('demo-circle-triangles', 700);
  const X = ctl(d.controls, { label: '\\kX', cls: 'position', min: 5, max: 20, step: 1, value: 10, unit: 'cm', dec: 0, onInput: reset, aria: 'radius' });
  const om = ctl(d.controls, { label: '\\kw', cls: 'angular-rate', min: 0.5, max: 6, step: 0.1, value: 3.1, unit: 'rad/s', dec: 1, onInput: reset, aria: 'angular velocity' });
  const cy = cycle(() => Infinity, 0);
  function reset() { cy.reset(); }
  function draw() {
    const { ctx } = begin(d.c);
    const tau = REDUCED ? 1.1 / om.v : cy.now(), th = om.v * tau, x = X.v * Math.cos(th);
    const vmax = (X.v / 100) * om.v, v = -vmax * Math.sin(th), T = TAU / om.v;
    const cx = 700, cyc = 370, R = Math.min(280, 16 * X.v);
    ctx.save(); ctx.strokeStyle = PAL.muted; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cyc, R, 0, TAU); ctx.stroke(); ctx.restore();
    line(ctx, cx - R - 60, cyc, cx + R + 60, cyc, PAL.muted, 2); text(ctx, 'x', cx + R + 70, cyc, C('position'), { weight: 600 });
    curl(ctx, cx, cyc, R + 28, C('angular-rate')); text(ctx, 'ω', cx, cyc - R - 52, C('angular-rate'), { weight: 600, align: 'center' });
    const px = cx + R * Math.cos(th), py = cyc - R * Math.sin(th), qx = px;
    /* the displacement triangle */
    ctx.save(); ctx.fillStyle = alpha(C('position'), 0.14); ctx.beginPath(); ctx.moveTo(cx, cyc); ctx.lineTo(qx, cyc); ctx.lineTo(px, py); ctx.closePath(); ctx.fill(); ctx.restore();
    line(ctx, cx, cyc, px, py, C('position'), 3); line(ctx, qx, cyc, px, py, PAL.muted, 2, [6, 6]); line(ctx, cx, cyc, qx, cyc, C('position'), 6);
    dot(ctx, qx, cyc, C('position'), true, 8); dot(ctx, px, py, PAL.ink, true, 10); text(ctx, 'P', px + 16 * Math.cos(th), py - 16 * Math.sin(th) - 4, PAL.ink, { weight: 600 });
    const mx = (cx + px) / 2, my = (cyc + py) / 2; text(ctx, 'X', mx - 18 * Math.sin(th), my - 18 * Math.cos(th), C('position'), { weight: 600, align: 'center' });
    if (Math.abs(x) > 0.1 * X.v) text(ctx, 'x = ' + sgn(x) + fmt(Math.abs(x), 1) + ' cm', (cx + qx) / 2, cyc + (py < cyc ? 26 : -26), C('position'), { weight: 600, size: 18, align: 'center' });
    if (Math.abs(Math.sin(th)) > 0.15) { const side = Math.sin(th) >= 0 ? 1 : -1; text(ctx, '√(X² − x²)', qx + side * 12, my, PAL.muted, { size: 17, align: side > 0 ? 'left' : 'right' }); }   /* away from the velocity triangle */
    if (Math.abs(Math.sin(th)) > 0.08 && Math.abs(Math.cos(th)) > 0.08) { ctx.save(); ctx.strokeStyle = PAL.muted; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cyc, 34, 0, -th, th > 0); ctx.stroke(); ctx.restore(); text(ctx, 'θ', cx + 50 * Math.cos(th / 2), cyc - 50 * Math.sin(th / 2), PAL.muted, { size: 18, align: 'center' }); }
    /* the velocity triangle at P: v_max along the tangent, v its projection along x */
    const L = 120 + 80 * Math.min(1, vmax / 1.2), tx = -Math.sin(th), ty = -Math.cos(th);
    const ex = px + L * tx, ey = py + L * ty;
    ctx.save(); ctx.fillStyle = alpha(C('velocity'), 0.14); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ex, ey); ctx.lineTo(ex, py); ctx.closePath(); ctx.fill(); ctx.restore();
    arrow(ctx, px, py, ex, ey, C('velocity'), 4); text(ctx, 'v_max', ex + 12 * tx, ey + 12 * ty - 16, C('velocity'), { weight: 600, size: 18, align: 'center' });
    if (Math.abs(v) > 0.03 * vmax) { arrow(ctx, px, py, ex, py, C('velocity'), 5); text(ctx, 'v', (px + ex) / 2, py + (ey < py ? 20 : -20), C('velocity'), { weight: 600, size: 18, align: 'center' }); }
    line(ctx, ex, py, ex, ey, PAL.muted, 2, [6, 6]);
    headline(ctx, 'θ = ' + fmt(((th * DEG) % 360 + 360) % 360, 0) + '°: x = X cos θ = ' + sgn(x) + fmt(Math.abs(x), 1) + ' cm and v = v_max sin θ = ' + fmt(Math.abs(v), 2) + ' m/s; the two triangles are similar');
    readout(d.readout, `\\kv = \\kvmax\\sqrt{1 - \\frac{\\kx^2}{\\kX^2}} = (${fmt(vmax, 3)}\\ \\text{m/s})\\sqrt{1 - \\frac{(${fmt(Math.abs(x), 1)})^2}{(${fmt(X.v, 0)})^2}} = ${fmt(Math.abs(v), 2)}\\ \\text{m/s}`,
      'v_max = Xω = (' + fmt(X.v / 100, 2) + ' m)(' + fmt(om.v, 1) + ' rad/s) = ' + fmt(vmax, 3) + ' m/s, and the period is T = 2πX/v_max = 2π/ω = ' + fmt(T, 2) + ' s.');
  }
  register(d.fig, { update: (dt) => cy.step(dt, () => 1), draw });
})();
};
