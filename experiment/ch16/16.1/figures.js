/* Figures for section 16.1 Hooke's Law. Boots against the section's text article. */
window.OMNIA_FIGURES = window.OMNIA_FIGURES || {};
window.OMNIA_FIGURES['16.1'] = function (root, F) {
const { el, fmt, tex, C, PAL, alpha, REDUCED, ctl, cycle, register, begin, line, arrow, dot, text, headline, hbracket, vbracket, strip, axes, nice } = F;
const demo = (id, H) => F.demo(root, id, H);
const G = 9.80;
function readout(host, main, small) { tex(host, main); if (small) host.appendChild(el('small', null, small)); }

/* a coil spring between two points: n coils of half-width a */
function spring(ctx, x1, y1, x2, y2, n, a, color, w = 4) {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, px = -uy, py = ux;
  const lead = Math.min(24, L * 0.1), seg = (L - 2 * lead) / (2 * n);
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x1 + ux * lead, y1 + uy * lead);
  for (let i = 0; i < 2 * n; i++) { const s = lead + seg * (i + 0.5), side = i % 2 ? -1 : 1; ctx.lineTo(x1 + ux * s + px * a * side, y1 + uy * s + py * a * side); }
  ctx.lineTo(x2 - ux * lead, y2 - uy * lead); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
}
/* a block hanging from or resting against something */
function block(ctx, x, y, w, h, color) { ctx.save(); ctx.fillStyle = PAL.panel; ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.fillRect(x - w / 2, y - h / 2, w, h); ctx.strokeRect(x - w / 2, y - h / 2, w, h); ctx.restore(); }
/* a fixed surface: a beam, a clamp, a wall */
function fixed(ctx, x, y, w, h) {
  ctx.save(); ctx.fillStyle = PAL.soft; ctx.fillRect(x, y, w, h); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.strokeStyle = PAL.muted; ctx.lineWidth = 2; ctx.beginPath(); for (let s = x - h; s < x + w; s += 14) { ctx.moveTo(s, y + h); ctx.lineTo(s + h, y); } ctx.stroke(); ctx.restore();
  line(ctx, x, y, x + w, y, PAL.muted, 3); line(ctx, x, y + h, x + w, y + h, PAL.muted, 3);
}

/* =====================================================================
   DEMO 1: the plucked ruler. A cantilever clamped at the bottom, pulled
   aside and released; the restoring force always points back to the
   equilibrium line and grows with the displacement. Finite motion.
===================================================================== */
(function () {
  const d = demo('demo-ruler', 640);
  const x0 = ctl(d.controls, { label: '\\kxo', cls: 'x', min: -6, max: 6, step: 0.5, value: 4, unit: 'cm', dec: 1, onInput: reset, aria: 'initial pull of the tip' });
  const Lr = ctl(d.controls, { label: '\\text{free length}', cls: '', min: 10, max: 30, step: 1, value: 30, unit: 'cm', dec: 0, onInput: reset, aria: 'free length of the ruler' });
  const damp = ctl(d.controls, { label: '\\text{damping}', cls: '', min: 0.1, max: 3, step: 0.1, value: 0.6, unit: '/s', dec: 1, onInput: reset });
  /* Omnia's model of a plastic ruler: about 30 N/m and 1.5 Hz at 30 cm; a shorter length is stiffer as the cube and faster as the square */
  const k = () => 30 * Math.pow(30 / Lr.v, 3), freq = () => 1.5 * Math.pow(30 / Lr.v, 2);
  const T = () => Math.min(20, Math.max(2, Math.log(50) / damp.v));
  const cy = cycle(T, 1.4);
  function reset() { cy.reset(); }
  const xAt = (s) => x0.v * Math.exp(-damp.v * s) * Math.cos(2 * Math.PI * freq() * s);   /* cm */
  function draw() {
    const { ctx } = begin(d.c);
    const tau = cy.now(), x = REDUCED ? 0 : xAt(tau), atRest = REDUCED || tau >= T() - 1e-6;
    const cx = 700, yb = 570, len = 130 + 300 * Lr.v / 30, yt = yb - len, U = 40;   /* 1 cm = 40 units */
    fixed(ctx, cx - 130, yb, 260, 44); text(ctx, 'clamped here', cx, yb + 24, PAL.muted, { size: 17, align: 'center', base: 'middle', bg: PAL.soft });
    line(ctx, cx, 96, cx, yb, PAL.muted, 3, [10, 10]); text(ctx, 'equilibrium position', cx - 16, yb - 40, PAL.muted, { size: 17, align: 'right' });
    /* the ruler bends as the square of the distance from the clamp */
    const tip = cx + x * U;
    ctx.save(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 14; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, yb);
    for (let i = 1; i <= 24; i++) { const f = i / 24; ctx.lineTo(cx + x * U * f * f, yb - len * f); } ctx.stroke();
    ctx.strokeStyle = PAL.bg; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 2; i < 24; i += 2) { const f = i / 24, px = cx + x * U * f * f, py = yb - len * f; ctx.moveTo(px - 5, py); ctx.lineTo(px + 5, py); } ctx.stroke(); ctx.restore();
    if (Math.abs(x) > 0.15) {
      hbracket(ctx, cx, tip, yt - 50, C('x'), 'x = ' + (x > 0 ? '+' : '−') + fmt(Math.abs(x), 1) + ' cm');
      const s = x > 0 ? -1 : 1, al = 64 * Math.abs(x);
      arrow(ctx, tip, yt + 8, tip + s * al, yt + 8, C('F'), 5);
      text(ctx, 'restoring force F', tip + s * (al + 14), yt + 8, C('F'), { weight: 600, align: x > 0 ? 'right' : 'left', base: 'middle' });
    }
    dot(ctx, tip, yt, PAL.ink, true, 9);
    headline(ctx, atRest ? 'the ruler has come to rest at its equilibrium position, where the net force is zero'
      : Math.abs(x) < 0.15 ? 'the tip passes through equilibrium: the net force is zero, but the ruler has momentum and keeps moving'
      : 'the tip is ' + fmt(Math.abs(x), 1) + ' cm to the ' + (x < 0 ? 'left' : 'right') + ', so the restoring force points to the ' + (x < 0 ? 'right' : 'left'));
    const Fn = -k() * x / 100;
    readout(d.readout, `\\kF = -\\kk\\kx = -(${fmt(k(), 0)}\\ \\text{N/m})(${x < 0 ? '-' : '+'}${fmt(Math.abs(x) / 100, 3)}\\ \\text{m}) = ${Fn < 0 ? '-' : '+'}${fmt(Math.abs(Fn), 2)}\\ \\text{N}`,
      'A ' + Lr.v + ' cm length of this ruler has a force constant of about ' + fmt(k(), 0) + ' N/m and swings back and forth ' + fmt(freq(), 1) + ' times each second. A shorter length is stiffer and oscillates faster.');
  }
  register(d.fig, { update: (dt) => cy.step(dt, () => Math.min(1, 4 / freq())), draw });
})();

/* =====================================================================
   DEMO 2: the spring scale. Weights hung one at a time, each stretch
   plotted against the weight; the slope of the line is k. Book data:
   0.100 kg steps, k about 39 N/m.
===================================================================== */
(function () {
  const d = demo('demo-spring-scale', 640);
  const m = ctl(d.controls, { label: 'm', cls: '', min: 0.1, max: 0.5, step: 0.1, value: 0.5, unit: 'kg', dec: 1, onInput: reset, aria: 'mass hung on the spring' });
  const k = ctl(d.controls, { label: '\\kk', cls: 'F', min: 10, max: 100, step: 1, value: 39, unit: 'N/m', dec: 0, onInput: reset });
  const STEP = 1.1, steps = () => Math.round(m.v / 0.1), T = () => steps() * STEP;
  const cy = cycle(T, 1.6);
  function reset() { cy.reset(); }
  const xOf = (mass) => mass * G / k.v;
  function draw() {
    const { ctx } = begin(d.c);
    const tau = cy.now(), n = steps(), done = REDUCED || tau >= T() - 1e-6;
    const i = Math.min(n, Math.floor(tau / STEP)), f = Math.min(1, (tau - i * STEP) / 0.45), ease = 1 - (1 - f) * (1 - f);
    const mNow = done ? m.v : Math.min(m.v, 0.1 * (i + ease)), hung = done ? n : i;
    const x = xOf(mNow), w = mNow * G;
    const SC = Math.min(1600, 300 / Math.max(0.05, xOf(m.v)));   /* units per metre of stretch, so the full load always fits */
    /* the scene: beam, spring, block */
    const cx = 330, yBeam = 110, y0 = yBeam + 230, yEnd = y0 + x * SC;
    fixed(ctx, cx - 150, yBeam - 44, 300, 44);
    spring(ctx, cx, yBeam, cx, yEnd, 9, 26, PAL.ink, 4);
    block(ctx, cx, yEnd + 32, 96, 64, PAL.ink);
    if (mNow > 0.001) text(ctx, fmt(mNow, 1) + ' kg', cx, yEnd + 32, PAL.ink, { size: 20, weight: 600, align: 'center', base: 'middle' });
    line(ctx, cx - 150, y0, cx + 190, y0, PAL.muted, 2, [10, 10]); text(ctx, 'x = 0', cx - 160, y0, C('x'), { align: 'right', base: 'middle', weight: 600, size: 22 });
    if (x > 0.004) vbracket(ctx, cx + 150, y0, yEnd, C('x'), 'x = ' + fmt(x, 3) + ' m', 1);
    if (mNow > 0.001) {
      const al = 40 + 26 * w;
      arrow(ctx, cx + 30, yEnd + 64, cx + 30, yEnd + 64 + al, C('F'), 5); text(ctx, 'w = ' + fmt(w, 2) + ' N', cx + 46, yEnd + 64 + al - 4, C('F'), { weight: 600, size: 20 });
      arrow(ctx, cx - 30, yEnd, cx - 30, yEnd - al, C('F'), 5); text(ctx, 'F = ' + fmt(w, 2) + ' N', cx - 46, yEnd - al + 2, C('F'), { weight: 600, size: 20, align: 'right', base: 'bottom' });
    }
    /* the graph beside a vertical scene: F against x, one dot per weight hung */
    const xr = nice(0, Math.max(0.02, xOf(m.v)) * 1.05, 3), Fr = nice(0, Math.max(0.5, m.v * G) * 1.05, 4);
    const box = { l: 760, r: 1320, t: 120, b: 500 };
    const { X, Y } = axes(ctx, box, [0, xr.hi], [0, Fr.hi], { xl: 'x (m)', xc: C('x'), yl: 'F (N)', yc: C('F'), nx: xr.n, ny: Fr.n, fx: (v) => fmt(v, 2), fy: (v) => fmt(v, 1) });
    const xe = Math.min(xr.hi, Fr.hi / k.v);
    line(ctx, X(0), Y(0), X(xe), Y(k.v * xe), C('F'), 5);
    text(ctx, 'slope = k = ' + fmt(k.v, 0) + ' N/m', X(xe * 0.55) + 30, Y(k.v * xe * 0.55) + 44, C('F'), { weight: 600, size: 20 });
    for (let j = 1; j <= hung; j++) dot(ctx, X(xOf(0.1 * j)), Y(0.1 * j * G), C('F'), true, 9);
    if (mNow > 0.001) { line(ctx, X(x), box.b, X(x), Y(w), C('x'), 2, [4, 8]); line(ctx, box.l, Y(w), X(x), Y(w), C('F'), 2, [4, 8]); dot(ctx, X(x), Y(w), PAL.ink, true, 9); }
    headline(ctx, mNow < 0.001 ? 'with no load the spring hangs at its unstretched length, x = 0'
      : 'a ' + fmt(mNow, 1) + ' kg load weighs ' + fmt(w, 2) + ' N and stretches the spring ' + fmt(x, 3) + ' m');
    readout(d.readout, `\\kF = \\kk\\kx = (${fmt(k.v, 0)}\\ \\text{N/m})(${fmt(x, 3)}\\ \\text{m}) = ${fmt(w, 2)}\\ \\text{N} = w = mg`,
      'Each dot is one weight hung on the spring. The restoring force equals the weight supported while the mass hangs still, and the slope of the line through the dots is the force constant.');
  }
  register(d.fig, { update: (dt) => cy.step(dt, () => 1), draw });
})();

/* =====================================================================
   DEMO 3: energy stored in a compressed spring. The toy gun of Example
   16.2: compress, hold, release; the work done is the triangle under the
   applied-force line, and it becomes the dart's kinetic energy.
===================================================================== */
(function () {
  const d = demo('demo-stored-energy', 720);
  const k = ctl(d.controls, { label: '\\kk', cls: 'F', min: 10, max: 200, step: 1, value: 50, unit: 'N/m', dec: 0, onInput: reset });
  const x = ctl(d.controls, { label: '\\kx', cls: 'x', min: 0.02, max: 0.3, step: 0.005, value: 0.15, unit: 'm', dec: 3, onInput: reset, aria: 'compression of the spring' });
  const m = ctl(d.controls, { label: 'm', cls: '', min: 1, max: 10, step: 0.5, value: 2, unit: 'g', dec: 1, onInput: reset, aria: 'mass of the dart' });
  const T1 = 2.4, HOLD = 0.8, REL = 0.3, FLY = 1.2, T = () => T1 + HOLD + REL + FLY;
  const cy = cycle(T, 1.6);
  function reset() { cy.reset(); }
  const pe = () => 0.5 * k.v * x.v * x.v, vOut = () => Math.sqrt(2 * pe() / (m.v / 1000));
  function draw() {
    const { ctx } = begin(d.c);
    const tau = cy.now();
    let phase, xc, fly = 0;
    if (tau < T1) { phase = 'compress'; xc = x.v * tau / T1; }
    else if (tau < T1 + HOLD) { phase = 'hold'; xc = x.v; }
    else if (tau < T1 + HOLD + REL) { phase = 'release'; xc = x.v * (1 - (tau - T1 - HOLD) / REL); }
    else { phase = 'flight'; xc = 0; fly = (tau - T1 - HOLD - REL) / FLY; }
    if (REDUCED) { phase = 'hold'; xc = x.v; }
    const xs = phase === 'compress' ? xc : x.v;   /* the deformation the shaded work refers to */
    const L = 100, R = 1300, y = 220, SC = 1000, wall = 160, nat = 420;
    strip(ctx, L, R, y, 56);
    fixed(ctx, wall - 44, y - 76, 44, 152);
    const plate = wall + nat - xc * SC;
    spring(ctx, wall, y, plate, y, 12, 22, PAL.ink, 4);
    line(ctx, plate, y - 36, plate, y + 36, PAL.ink, 8);
    const vv = vOut(), dartX = plate + 34 + (phase === 'flight' ? fly * Math.min(1000, 14 * vv) : 0);
    line(ctx, dartX - 44, y, dartX - 10, y, PAL.ink, 6); dot(ctx, dartX, y, PAL.ink, true, 12);
    line(ctx, wall + nat, y - 44, wall + nat, y + 44, PAL.muted, 2, [6, 6]); text(ctx, 'x = 0', wall + nat, y - 58, C('x'), { size: 18, align: 'center', weight: 600 });
    if (xc > 0.003) hbracket(ctx, plate, wall + nat, y + 80, C('x'), 'x = ' + fmt(xc, 3) + ' m');
    if (phase === 'compress' || phase === 'hold') {
      const Fn = k.v * xc, al = 50 + 200 * xc / x.v;
      arrow(ctx, plate + 60 + al, y - 96, plate + 60, y - 96, C('F'), 5);
      text(ctx, 'applied force = kx = ' + fmt(Fn, 2) + ' N', plate + 74 + al, y - 96, C('F'), { weight: 600, base: 'middle' });
    }
    if (phase === 'flight') { arrow(ctx, dartX + 24, y - 80, dartX + 24 + Math.min(300, vv * 6), y - 80, C('v'), 5); text(ctx, 'v = ' + fmt(vv, 1) + ' m/s', dartX + 24, y - 112, C('v'), { weight: 600 }); }
    /* the graph: applied force against deformation, work as the area */
    const xr = nice(0, x.v * 1.05, 3), Fr = nice(0, k.v * x.v * 1.05, 4);
    const box = { l: 200, r: 1240, t: 370, b: 620 };
    const { X, Y } = axes(ctx, box, [0, xr.hi], [0, Fr.hi], { xl: 'deformation x (m)', xc: C('x'), yl: 'applied force (N)', yc: C('F'), nx: xr.n, ny: Fr.n, fx: (v) => fmt(v, 2), fy: (v) => fmt(v, 1) });
    if (xs > 0.001) { ctx.save(); ctx.fillStyle = alpha(C('E'), 0.25); ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(xs), Y(0)); ctx.lineTo(X(xs), Y(k.v * xs)); ctx.closePath(); ctx.fill(); ctx.restore(); }
    line(ctx, X(0), Y(0), X(x.v), Y(k.v * x.v), C('F'), 5);
    if (xc > 0.001) { line(ctx, X(xc), box.b, X(xc), Y(k.v * xc), C('x'), 2, [4, 8]); dot(ctx, X(xc), Y(k.v * xc), C('F'), true, 9); }
    const W = 0.5 * k.v * xs * xs;
    text(ctx, (phase === 'compress' ? 'work done so far = area = ' : phase === 'hold' ? 'work done = area = ½kx² = ' : 'energy released = ') + fmt(W, 3) + ' J', box.l + 24, box.t + 26, C('E'), { weight: 600 });
    headline(ctx, phase === 'compress' ? 'pushing the spring in: x = ' + fmt(xc, 3) + ' m, the applied force is kx = ' + fmt(k.v * xc, 2) + ' N, and the work so far is ' + fmt(W, 3) + ' J'
      : phase === 'hold' ? 'compressed by ' + fmt(x.v, 3) + ' m: the work done, ½kx² = ' + fmt(pe(), 3) + ' J, is stored as elastic potential energy'
      : 'released: the ' + fmt(pe(), 3) + ' J of elastic potential energy becomes kinetic energy, and the dart leaves at ' + fmt(vv, 1) + ' m/s');
    readout(d.readout, `\\kPE = \\tfrac{1}{2}\\kk\\kx^2 = \\tfrac{1}{2}(${fmt(k.v, 1)}\\ \\text{N/m})(${fmt(x.v, 3)}\\ \\text{m})^2 = ${fmt(pe(), 3)}\\ \\text{J}`,
      'Method B gives the same answer: the average force is ½kx = ' + fmt(0.5 * k.v * x.v, 2) + ' N, and (' + fmt(0.5 * k.v * x.v, 2) + ' N)(' + fmt(x.v, 3) + ' m) = ' + fmt(pe(), 3) + ' J. With no friction, ½mv² = PE_el gives v = ' + fmt(vv, 1) + ' m/s.');
  }
  register(d.fig, { update: (dt) => cy.step(dt, () => 1), draw });
})();
};
