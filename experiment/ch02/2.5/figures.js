/* Figures for section 2.5. Boots against a root element (the section's text article). */
window.OMNIA_FIGURES = window.OMNIA_FIGURES || {};
window.OMNIA_FIGURES['2.5'] = function (root, F) {
const { el, fmt, tex, C, PAL, alpha, REDUCED, LW, ctl, cycle, register, begin, line, arrow, dot, text, headline, hbracket, vbracket, strip, scale, axes, nice, curve, runner, car, plane, dragster } = F;
const demo = (id, H) => F.demo(root, id, H);
/* =====================================================================
   DEMO 1: notation. A number line, two positions, one stopwatch.
===================================================================== */
(function () {
  const d = demo('demo-notation', 460);
  const x0 = ctl(d.controls, { label: '\\kxo', cls: 'x', min: 0, max: 100, step: 1, value: 20, unit: 'm', dec: 0, onInput: reset });
  const x = ctl(d.controls, { label: '\\kx', cls: 'x', min: 0, max: 100, step: 1, value: 80, unit: 'm', dec: 0, onInput: reset });
  const t = ctl(d.controls, { label: '\\kt', cls: 't', min: 1, max: 60, step: 0.5, value: 12, unit: 's', dec: 1, onInput: reset });
  const cy = cycle(() => t.v, 1.2);
  function reset() { cy.reset(); }
  function draw() {
    const { ctx, W, H } = begin(d.c);
    const tau = cy.now(), dx = x.v - x0.v, f = tau / t.v;
    const L = 90, R = 1040, y = 300; const X = (m) => L + (R - L) * m / 100;
    line(ctx, L, y, R, y, PAL.muted, 3); scale(ctx, X, 0, 100, 10, y, '', 2);
    if (Math.abs(dx) >= 2) hbracket(ctx, X(x0.v), X(x.v), y - 92, C('x'), 'Δx = ' + dx + ' m');
    // the object in transit
    const xm = x0.v + dx * f; line(ctx, X(x0.v), y - 40, X(xm), y - 40, C('x'), 3, [6, 8]);
    dot(ctx, X(x0.v), y, C('x'), false, 11); dot(ctx, X(x.v), y, C('x'), true, 11);
    dot(ctx, X(xm), y - 40, PAL.ink, true, 8);
    text(ctx, 'x₀', X(x0.v), y + 60, C('x'), { align: 'center', weight: 600, size: 24 });
    text(ctx, 'x', X(x.v), y + 60, C('x'), { align: 'center', weight: 600, size: 24 });
    // stopwatch
    const cx = 1230, cyy = 250, r = 96;
    ctx.save(); ctx.lineWidth = 4; ctx.strokeStyle = C('t'); ctx.fillStyle = PAL.panel; ctx.beginPath(); ctx.arc(cx, cyy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C('t'); ctx.fillRect(cx - 10, cyy - r - 18, 20, 12);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; line(ctx, cx + (r - 8) * Math.sin(a), cyy - (r - 8) * Math.cos(a), cx + (r - 18) * Math.sin(a), cyy - (r - 18) * Math.cos(a), PAL.muted, 2.5); }
    const ang = f * Math.PI * 2;
    ctx.strokeStyle = C('t'); ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(cx, cyy, r - 30, -Math.PI / 2, -Math.PI / 2 + ang); ctx.stroke();
    line(ctx, cx, cyy, cx + (r - 26) * Math.sin(ang), cyy - (r - 26) * Math.cos(ang), C('t'), 4); dot(ctx, cx, cyy, C('t'), true, 5); ctx.restore();
    text(ctx, 't = ' + fmt(tau, 1) + ' s', cx, cyy + r + 34, C('t'), { align: 'center', weight: 600, size: 24 });
    text(ctx, 't₀ = 0', cx, cyy + r + 64, PAL.muted, { align: 'center', size: 17 });
    headline(ctx, 'the clock starts at 0 when the object is at x₀; after ' + fmt(t.v, 1) + ' s it is at x');
    tex(d.readout, `\\kdt = \\kt = ${fmt(t.v, 1)}\\ \\text{s}\\qquad \\kdx = \\kx - \\kxo = ${x.v} - ${x0.v} = ${dx}\\ \\text{m}`);
  }
  register(d.fig, { update: (dt) => cy.step(dt, () => t.v / 4), draw });
})();

/* =====================================================================
   DEMO 2: average velocity under constant acceleration is the midpoint
===================================================================== */
(function () {
  const d = demo('demo-avg', 600);
  const v0 = ctl(d.controls, { label: '\\kvo', cls: 'v', min: 0, max: 30, step: 0.5, value: 10, unit: 'm/s', onInput: reset });
  const v = ctl(d.controls, { label: '\\kv', cls: 'v', min: 0, max: 30, step: 0.5, value: 20, unit: 'm/s', onInput: reset });
  const t = ctl(d.controls, { label: '\\kt', cls: 't', min: 1, max: 20, step: 0.5, value: 10, unit: 's', onInput: reset });
  const cy = cycle(() => t.v, 1.2);
  function reset() { cy.reset(); }
  function draw() {
    const { ctx } = begin(d.c);
    const tau = cy.now(), vb = (v0.v + v.v) / 2, a = (v.v - v0.v) / t.v, vel = (s) => v0.v + a * s, area = (s) => v0.v * s + 0.5 * a * s * s;
    const box = { l: 130, r: 1180, t: 110, b: 500 };
    const { X, Y } = axes(ctx, box, [0, 20], [0, 30], { xl: 't (s)', xc: C('t'), yl: 'v (m/s)', yc: C('v'), nx: 4, ny: 3 });
    // area so far = displacement so far
    ctx.save(); ctx.fillStyle = alpha(C('x'), 0.2); ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(0), Y(v0.v)); ctx.lineTo(X(tau), Y(vel(tau))); ctx.lineTo(X(tau), Y(0)); ctx.closePath(); ctx.fill(); ctx.restore();
    line(ctx, X(0), Y(vb), X(t.v), Y(vb), C('v'), 3, [10, 10]);
    line(ctx, X(t.v), Y(0), X(t.v), Y(v.v), C('t'), 3, [4, 8]);
    line(ctx, X(0), Y(v0.v), X(t.v), Y(v.v), C('v'), 5);
    dot(ctx, X(0), Y(v0.v), C('v'), false, 11); dot(ctx, X(t.v), Y(v.v), C('v'), true, 11);
    dot(ctx, X(tau), Y(vel(tau)), PAL.ink, true, 9);
    vbracket(ctx, X(t.v) + 40, Y(v.v), Y(v0.v), C('v'), 'v − v₀', 1);
    text(ctx, 'v̄ = ' + fmt(vb, 1) + ' m/s', X(t.v / 2), Y(vb) - 22, C('v'), { align: 'center', weight: 600 });
    text(ctx, 'Δx = area = ' + fmt(area(tau), 0) + ' m', X(tau / 2), Y(Math.min(v0.v, vel(tau)) / 2), C('x'), { align: 'center', weight: 600, bg: alpha(PAL.panel, 0.7) });
    text(ctx, 'v₀', X(0) + 24, Y(v0.v) - 22, C('v'), { weight: 600, size: 24 });
    text(ctx, 'v', X(t.v), Y(v.v) - 30, C('v'), { align: 'center', weight: 600, size: 24 });
    text(ctx, 'slope = a = ' + fmt(a, 2) + ' m/s²', X(t.v) + 40, Y(Math.min(v0.v, v.v)) + 34, C('a'), { size: 18, weight: 600 });
    headline(ctx, 'the velocity line is straight, so its average sits halfway between v₀ and v');
    tex(d.readout, `\\kvb = \\frac{\\kvo + \\kv}{2} = \\frac{${fmt(v0.v, 1)} + ${fmt(v.v, 1)}}{2} = ${fmt(vb, 1)}\\ \\text{m/s}\\qquad \\kdx = \\kvb\\kt = ${fmt(area(t.v), 0)}\\ \\text{m}`);
  }
  register(d.fig, { update: (dt) => cy.step(dt, () => t.v / 4), draw });
})();

/* =====================================================================
   DEMO 3: the jogger, x = x0 + v̄ t
===================================================================== */
(function () {
  const d = demo('demo-jogger', 660);
  const vb = ctl(d.controls, { label: '\\kvb', cls: 'v', min: 0, max: 8, step: 0.05, value: 4, unit: 'm/s', dec: 2, onInput: reset });
  const t = ctl(d.controls, { label: '\\kt', cls: 't', min: 10, max: 180, step: 1, value: 120, unit: 's', dec: 0, onInput: reset });
  const x0 = ctl(d.controls, { label: '\\kxo', cls: 'x', min: -200, max: 200, step: 10, value: 0, unit: 'm', dec: 0, onInput: reset });
  const cy = cycle(() => t.v, 1.2); let ph = 0;
  function reset() { cy.reset(); }
  function draw() {
    const { ctx } = begin(d.c);
    const tau = cy.now(), x = x0.v + vb.v * t.v, xm = x0.v + vb.v * tau;
    const L = 80, R = 1320, y = 190; const X = (m) => L + (R - L) * (m + 200) / 1900;
    strip(ctx, L, R, y, 44); scale(ctx, X, 0, 1600, 200, y + 22, 'm', 2);
    dot(ctx, X(x0.v), y, C('x'), false, 10); text(ctx, 'x₀', X(x0.v), y + 76, C('x'), { align: 'center', weight: 600, size: 24 });
    if (Math.abs(x - x0.v) > 20) hbracket(ctx, X(x0.v), X(x), y - 100, C('x'), 'Δx = v̄ t = ' + fmt(x - x0.v, 0) + ' m');
    runner(ctx, X(xm), y, PAL.ink, ph);
    dot(ctx, X(x), y, C('x'), true, 10); text(ctx, 'x = ' + fmt(x, 0) + ' m', X(x), y + 76, C('x'), { align: 'center', weight: 600, size: 22 });
    arrow(ctx, X(xm) + 24, y - 60, X(xm) + 24 + vb.v * 22, y - 60, C('v'), 4); text(ctx, 'v̄', X(xm) + 34 + vb.v * 22, y - 60, C('v'), { weight: 600, size: 24 });
    // the book's Figure 2.26: final position against average velocity, a straight line of slope t
    const box = { l: 160, r: 1240, t: 360, b: 590 };
    const yr = nice(Math.min(0, x0.v), Math.max(400, x0.v + 8 * t.v), 3);
    const { X: GX, Y: GY } = axes(ctx, box, [0, 8], [yr.lo, yr.hi], { xl: 'v̄ (m/s)', xc: C('v'), yl: 'x (m)', yc: C('x'), nx: 4, ny: yr.n });
    line(ctx, GX(0), GY(x0.v), GX(8), GY(x0.v + 8 * t.v), C('x'), 5);
    line(ctx, GX(vb.v), GY(yr.lo), GX(vb.v), GY(x), C('v'), 3, [4, 8]); line(ctx, GX(0), GY(x), GX(vb.v), GY(x), C('x'), 3, [4, 8]);
    dot(ctx, GX(vb.v), GY(x), C('x'), true, 11); dot(ctx, GX(0), GY(x0.v), C('x'), false, 9);
    text(ctx, 'slope = t = ' + t.v + ' s', GX(8) - 20, GY(x0.v + 8 * t.v) + 34, C('t'), { align: 'right', weight: 600, size: 20 });
    headline(ctx, 't = ' + fmt(tau, 0) + ' s · the jogger is at x = ' + fmt(xm, 0) + ' m');
    tex(d.readout, `\\kx = \\kxo + \\kvb\\kt = ${fmt(x0.v, 0)} + (${fmt(vb.v, 2)}\\ \\text{m/s})(${t.v}\\ \\text{s}) = ${fmt(x, 0)}\\ \\text{m}`);
  }
  register(d.fig, { update: (dt) => { cy.step(dt, () => t.v / 5); if (cy.tau < t.v) ph += dt * 14; }, draw });
})();

/* =====================================================================
   DEMO 4: the airplane, v = v0 + a t
===================================================================== */
(function () {
  const d = demo('demo-plane', 680);
  const v0 = ctl(d.controls, { label: '\\kvo', cls: 'v', min: 0, max: 90, step: 1, value: 70, unit: 'm/s', dec: 1, onInput: reset });
  const a = ctl(d.controls, { label: '\\ka', cls: 'a', min: -4, max: 4, step: 0.05, value: -1.5, unit: 'm/s²', dec: 2, onInput: reset });
  const t = ctl(d.controls, { label: '\\kt', cls: 't', min: 1, max: 60, step: 0.5, value: 40, unit: 's', dec: 1, onInput: reset });
  const cy = cycle(() => t.v, 1.2);
  function reset() { cy.reset(); }
  const pos = (s) => v0.v * s + 0.5 * a.v * s * s, vel = (s) => v0.v + a.v * s;
  function draw() {
    const { ctx } = begin(d.c);
    const tau = cy.now();
    let smin = 0, smax = 1; for (let i = 0; i <= 60; i++) { const s = pos(t.v * i / 60); smin = Math.min(smin, s); smax = Math.max(smax, s); }
    const L = 80, R = 1320, y = 230; const X = (m) => L + (R - L) * (m - smin) / (smax - smin || 1);
    strip(ctx, L, R, y, 56);
    dot(ctx, X(0), y + 28, C('x'), false, 7); text(ctx, 'x₀ = 0', X(0), y + 64, C('x'), { align: 'center', size: 18, weight: 600 });
    line(ctx, X(smax), y - 28, X(smax), y + 28, C('x'), 3); text(ctx, fmt(smax, 0) + ' m', X(smax), y + 64, C('x'), { align: 'center', size: 18, weight: 600 });
    const px = X(pos(tau)), vv = vel(tau);
    plane(ctx, px, y - 2, PAL.ink, 1.1);
    arrow(ctx, px, y - 110, px + vv * 3.2, y - 110, C('v'), 5); text(ctx, 'v = ' + fmt(vv, 1) + ' m/s', px + (vv >= 0 ? -10 : 10), y - 142, C('v'), { align: vv >= 0 ? 'left' : 'right', weight: 600 });
    arrow(ctx, px, y + 110, px + a.v * 60, y + 110, C('a'), 5); text(ctx, 'a = ' + fmt(a.v, 2) + ' m/s²', px + (a.v >= 0 ? -10 : 10), y + 142, C('a'), { align: a.v >= 0 ? 'left' : 'right', weight: 600 });
    // v against t
    const box = { l: 160, r: 1240, t: 430, b: 610 };
    const vend = vel(t.v), vmin = Math.min(0, vend, v0.v), vmax = Math.max(10, vend, v0.v);
    const { X: GX, Y: GY } = axes(ctx, box, [0, t.v], [Math.floor(vmin / 10) * 10, Math.ceil(vmax / 10) * 10], { xl: 't (s)', xc: C('t'), yl: 'v (m/s)', yc: C('v'), nx: 4, ny: 2, fx: (v) => fmt(v, 0) });
    line(ctx, GX(0), GY(v0.v), GX(t.v), GY(vend), C('v'), 5);
    dot(ctx, GX(0), GY(v0.v), C('v'), false, 10); dot(ctx, GX(t.v), GY(vend), C('v'), true, 10);
    line(ctx, GX(tau), box.b, GX(tau), GY(vv), C('t'), 3, [4, 8]); dot(ctx, GX(tau), GY(vv), PAL.ink, true, 9);
    text(ctx, 'v₀', GX(0) + 26, GY(v0.v) + (a.v < 0 ? 30 : -30), C('v'), { weight: 600, size: 22 });
    headline(ctx, 't = ' + fmt(tau, 1) + ' s · the velocity arrow shrinks by a each second; the acceleration arrow never changes');
    tex(d.readout, `\\kv = \\kvo + \\ka\\kt = ${fmt(v0.v, 1)} + (${fmt(a.v, 2)})(${fmt(t.v, 1)}) = ${fmt(vend, 1)}\\ \\text{m/s}`);
  }
  register(d.fig, { update: (dt) => cy.step(dt, () => t.v / 6), draw });
})();

/* =====================================================================
   DEMO 5: the dragster, x = x0 + v0 t + ½ a t²
===================================================================== */
(function () {
  const d = demo('demo-dragster', 680);
  const v0 = ctl(d.controls, { label: '\\kvo', cls: 'v', min: 0, max: 20, step: 0.5, value: 0, unit: 'm/s', dec: 1, onInput: reset });
  const a = ctl(d.controls, { label: '\\ka', cls: 'a', min: 1, max: 30, step: 0.1, value: 26, unit: 'm/s²', dec: 1, onInput: reset });
  const t = ctl(d.controls, { label: '\\kt', cls: 't', min: 0.5, max: 8, step: 0.01, value: 5.56, unit: 's', dec: 2, onInput: reset });
  const cy = cycle(() => t.v, 1.4);
  function reset() { cy.reset(); }
  const pos = (s) => v0.v * s + 0.5 * a.v * s * s;
  function draw() {
    const { ctx } = begin(d.c);
    const tau = cy.now(), xe = pos(t.v), xh = pos(t.v / 2);
    const L = 80, R = 1320, y = 230; const X = (m) => L + (R - L) * m / (xe || 1);
    strip(ctx, L, R, y, 56);
    line(ctx, X(0), y - 40, X(0), y + 40, PAL.muted, 4); text(ctx, 'start', X(0), y + 66, PAL.muted, { align: 'center', size: 18 });
    line(ctx, X(xe), y - 40, X(xe), y + 40, C('x'), 4); text(ctx, 'x = ' + fmt(xe, 0) + ' m', X(xe), y + 66, C('x'), { align: 'center', size: 20, weight: 600 });
    dot(ctx, X(xh), y + 28, C('x'), false, 9); text(ctx, 'at t/2: ' + fmt(xh, 0) + ' m, ' + fmt(100 * xh / (xe || 1), 0) + '% of the way', X(xh), y + 66, C('x'), { align: 'center', size: 18, weight: 600 });
    const px = X(pos(tau)), vv = v0.v + a.v * tau;
    dragster(ctx, px, y - 4, PAL.ink, 1);
    arrow(ctx, px, y - 100, px + vv * 1.6, y - 100, C('v'), 5); text(ctx, 'v = ' + fmt(vv, 0) + ' m/s', px, y - 132, C('v'), { weight: 600 });
    arrow(ctx, px, y - 62, px + a.v * 3, y - 62, C('a'), 5); text(ctx, 'a', px + a.v * 3 + 14, y - 62, C('a'), { weight: 600, size: 24 });
    // x against t
    const box = { l: 160, r: 1240, t: 420, b: 610 };
    const { X: GX, Y: GY } = axes(ctx, box, [0, t.v], [0, Math.max(10, xe)], { xl: 't (s)', xc: C('t'), yl: 'x (m)', yc: C('x'), nx: 4, ny: 2, fx: (v) => fmt(v, 1), fy: (v) => fmt(v, 0) });
    curve(ctx, pos, 0, t.v, GX, GY, C('x'), 5);
    line(ctx, GX(t.v / 2), box.b, GX(t.v / 2), GY(xh), C('t'), 2, [4, 8]);
    dot(ctx, GX(t.v / 2), GY(xh), C('x'), false, 10); dot(ctx, GX(t.v), GY(xe), C('x'), true, 10);
    dot(ctx, GX(tau), GY(pos(tau)), PAL.ink, true, 9);
    headline(ctx, 't = ' + fmt(tau, 2) + ' s · x = ' + fmt(pos(tau), 0) + ' m · distance grows with the square of time');
    tex(d.readout, `\\kx = \\kxo + \\kvo\\kt + \\tfrac{1}{2}\\ka\\kt^2 = 0 + (${fmt(v0.v, 1)})(${fmt(t.v, 2)}) + \\tfrac{1}{2}(${fmt(a.v, 1)})(${fmt(t.v, 2)})^2 = ${fmt(xe, 0)}\\ \\text{m}`);
    const s = el('small', null, 'At half the time, t/2 = ' + fmt(t.v / 2, 2) + ' s, the dragster has gone ' + fmt(xh, 0) + ' m' + (v0.v === 0 ? ', exactly one fourth of the distance.' : '. With a running start it is more than a fourth.')); d.readout.appendChild(s);
  }
  register(d.fig, { update: (dt) => cy.step(dt, () => 1), draw });
})();

/* =====================================================================
   DEMO 6 (3D): braking on dry vs wet concrete, v² = v0² + 2aΔx
===================================================================== */
(function () {
  const fig = F.byId(root, 'demo-braking'); if (!fig) return;   /* a split-out pane for another figure: no WebGL context here */
  const d = demo('demo-braking', 300);
  const wrap = el('div', 'three-wrap'); d.stage.insertBefore(wrap, d.stage.firstChild);   /* the 3D view above the graph canvas */
  const v0 = ctl(d.controls, { label: '\\kvo', cls: 'v', min: 5, max: 40, step: 0.5, value: 30, unit: 'm/s', dec: 1, onInput: reset });
  const tr = ctl(d.controls, { label: 't_{\\text{react}}', cls: 't', min: 0, max: 1.5, step: 0.05, value: 0.5, unit: 's', dec: 2, onInput: reset, aria: 'reaction time' });
  const ad = ctl(d.controls, { label: '\\ka_{\\text{dry}}', cls: 'a', min: -10, max: -2, step: 0.1, value: -7, unit: 'm/s²', dec: 2, onInput: reset, aria: 'deceleration on dry concrete' });
  const aw = ctl(d.controls, { label: '\\ka_{\\text{wet}}', cls: 'a', min: -10, max: -2, step: 0.1, value: -5, unit: 'm/s²', dec: 2, onInput: reset, aria: 'deceleration on wet concrete' });
  const react = () => v0.v * tr.v, brake = (a) => v0.v * v0.v / (2 * -a), tstop = (a) => tr.v + v0.v / -a;
  const T = () => Math.max(tstop(ad.v), tstop(aw.v));
  function pos(a, s) { if (s <= tr.v) return v0.v * s; const tb = Math.min(s - tr.v, v0.v / -a); return v0.v * tr.v + v0.v * tb + 0.5 * a * tb * tb; }
  function vel(a, s) { if (s <= tr.v) return v0.v; return Math.max(0, v0.v + a * (s - tr.v)); }
  const cy = cycle(T, 1.6);
  function reset() { cy.reset(); }
  let three = null;
  try {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); wrap.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(36, 16 / 9, 0.5, 3000);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x556070, 1.0));
    const sun = new THREE.DirectionalLight(0xffffff, 0.7); sun.position.set(-80, 120, 60); scene.add(sun);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(2400, 800), new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.set(300, -0.02, 0); scene.add(ground);
    const laneDry = new THREE.Mesh(new THREE.PlaneGeometry(900, 8), new THREE.MeshStandardMaterial({ color: 0x8c9199, roughness: 0.95 })); laneDry.rotation.x = -Math.PI / 2; laneDry.position.set(350, 0, -5); scene.add(laneDry);
    const laneWet = new THREE.Mesh(new THREE.PlaneGeometry(900, 8), new THREE.MeshStandardMaterial({ color: 0x4f5964, roughness: 0.15, metalness: 0.35 })); laneWet.rotation.x = -Math.PI / 2; laneWet.position.set(350, 0, 5); scene.add(laneWet);
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0xf2f2f2 });
    [-9.1, -0.9, 0.9, 9.1].forEach((z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(900, 0.02, 0.2), edgeMat); m.position.set(350, 0.01, z); scene.add(m); });
    for (let x = 0; x <= 400; x += 10) { const tick = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.02, x % 50 ? 1 : 2.4), edgeMat); tick.position.set(x, 0.012, -9.1 - (x % 50 ? 0.6 : 1.3)); scene.add(tick); const t2 = tick.clone(); t2.position.z = 9.1 + (x % 50 ? 0.6 : 1.3); scene.add(t2); }
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 7, 12), new THREE.MeshStandardMaterial({ color: 0x333333 })); pole.position.set(0, 3.5, -10.5); scene.add(pole);
    const housing = new THREE.Mesh(new THREE.BoxGeometry(1, 2.6, 1), new THREE.MeshStandardMaterial({ color: 0x222222 })); housing.position.set(0, 7.5, -10.5); scene.add(housing);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff2020 })); lamp.position.set(0.55, 8.2, -10.5); scene.add(lamp);
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.02, 21), new THREE.MeshBasicMaterial({ color: 0xff4040 })); beam.position.set(0, 0.015, 0); scene.add(beam);
    function makeCar() {
      const g = new THREE.Group(); const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.5, metalness: 0.2 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(4.6, 1.1, 2.1), bodyMat); body.position.y = 0.95; g.add(body);
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.9, 1.9), new THREE.MeshStandardMaterial({ color: 0x9fb4c8, roughness: 0.2, metalness: 0.3 })); cabin.position.set(-0.3, 1.9, 0); g.add(cabin);
      const wmat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
      [[1.5, 1.05], [1.5, -1.05], [-1.5, 1.05], [-1.5, -1.05]].forEach(([x, z]) => { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.35, 16), wmat); w.rotation.x = Math.PI / 2; w.position.set(x, 0.42, z); g.add(w); });
      const vArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 3.2, 0), 8, 0xff0000, 1.8, 1.2); g.add(vArrow);
      const aArrow = new THREE.ArrowHelper(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 4.8, 0), 5, 0x8000ff, 1.8, 1.2); g.add(aArrow);
      g.userData = { vArrow, aArrow }; return g;
    }
    const carDry = makeCar(); carDry.position.z = -5; scene.add(carDry);
    const carWet = makeCar(); carWet.position.z = 5; scene.add(carWet);
    function bar(z) { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 1.4), new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0.85 })); m.position.set(0, 0.05, z); scene.add(m); return m; }
    const bars = { rDry: bar(-5), bDry: bar(-5), rWet: bar(5), bWet: bar(5) };
    bars.rDry.material.opacity = bars.rWet.material.opacity = 0.45;
    const labDry = el('span', 'lab3d', 'dry concrete'), labWet = el('span', 'lab3d', 'wet concrete'); wrap.append(labDry, labWet);
    let yaw = -0.72, pitch = 0.34, dist = 74, drag = null;
    const target = new THREE.Vector3(60, 0, 0);
    wrap.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, yaw, pitch }; wrap.setPointerCapture(e.pointerId); });
    wrap.addEventListener('pointermove', (e) => { if (!drag) return; yaw = drag.yaw - (e.clientX - drag.x) * 0.006; pitch = Math.min(1.3, Math.max(0.08, drag.pitch + (e.clientY - drag.y) * 0.005)); });
    wrap.addEventListener('pointerup', () => { drag = null; }); wrap.addEventListener('pointercancel', () => { drag = null; });
    wrap.addEventListener('wheel', (e) => { e.preventDefault(); dist = Math.min(200, Math.max(20, dist * (1 + e.deltaY * 0.001))); }, { passive: false });
    function project(v) { const p = v.clone().project(cam); return [(p.x + 1) / 2 * wrap.clientWidth, (1 - p.y) / 2 * wrap.clientHeight]; }
    function applyColors() {
      const cv = new THREE.Color(C('v')), ca = new THREE.Color(C('a')), cx = new THREE.Color(C('x'));
      [carDry, carWet].forEach((c) => { c.userData.vArrow.setColor(cv); c.userData.aArrow.setColor(ca); });
      Object.values(bars).forEach((b) => b.material.color.copy(cx));
      ground.material.color.set(PAL.soft2); scene.background = null;
    }
    function render(tau) {
      const xd = pos(ad.v, tau), xw = pos(aw.v, tau);
      carDry.position.x = xd; carWet.position.x = xw;
      const vd = vel(ad.v, tau), vw = vel(aw.v, tau);
      carDry.userData.vArrow.setLength(Math.max(0.01, vd * 0.35), 1.6, 1.1); carWet.userData.vArrow.setLength(Math.max(0.01, vw * 0.35), 1.6, 1.1);
      carDry.userData.aArrow.visible = tau > tr.v && vd > 0; carDry.userData.aArrow.setLength(-ad.v * 0.9, 1.6, 1.1);
      carWet.userData.aArrow.visible = tau > tr.v && vw > 0; carWet.userData.aArrow.setLength(-aw.v * 0.9, 1.6, 1.1);
      const rd = react(), bd = brake(ad.v), bw = brake(aw.v);
      bars.rDry.scale.x = Math.max(0.01, rd); bars.rDry.position.x = rd / 2; bars.bDry.scale.x = bd; bars.bDry.position.x = rd + bd / 2;
      bars.rWet.scale.x = Math.max(0.01, rd); bars.rWet.position.x = rd / 2; bars.bWet.scale.x = bw; bars.bWet.position.x = rd + bw / 2;
      target.x = (rd + Math.max(bd, bw)) * 0.5;
      cam.position.set(target.x + dist * Math.cos(pitch) * Math.sin(yaw), dist * Math.sin(pitch), dist * Math.cos(pitch) * Math.cos(yaw));
      cam.lookAt(target);
      const wpx = wrap.clientWidth, hpx = wrap.clientHeight;
      if (wpx && renderer.domElement.width !== Math.round(wpx * renderer.getPixelRatio())) { renderer.setSize(wpx, hpx, false); cam.aspect = wpx / hpx; cam.updateProjectionMatrix(); }
      renderer.render(scene, cam);
      const pd = project(new THREE.Vector3(xd, 6.2, -5)), pw = project(new THREE.Vector3(xw, 6.2, 5));
      labDry.style.left = pd[0] + 'px'; labDry.style.top = pd[1] + 'px'; labWet.style.left = pw[0] + 'px'; labWet.style.top = pw[1] + 'px';
    }
    three = { render, applyColors };
  } catch (e) { console.error(e); wrap.innerHTML = '<p style="padding:20px;color:var(--muted)">3D view needs WebGL. The distance bars below still work.</p>'; }
  function draw() {
    const tau = cy.now();
    if (three) { three.applyColors(); three.render(tau); }
    // distance bars: what the equation is really about
    const { ctx } = begin(d.c);
    const rd = react(), bd = brake(ad.v), bw = brake(aw.v), total = rd + Math.max(bd, bw);
    const L = 190, R = 1110; const X = (m) => L + (R - L) * m / total;
    [['dry', ad.v, bd, 120], ['wet', aw.v, bw, 220]].forEach(([name, a, b, y]) => {
      text(ctx, name, L - 24, y, PAL.ink, { align: 'right', weight: 600, size: 22 });
      ctx.save(); ctx.fillStyle = alpha(C('v'), 0.28); ctx.fillRect(X(0), y - 18, X(rd) - X(0), 36); ctx.fillStyle = alpha(C('x'), 0.55); ctx.fillRect(X(rd), y - 18, X(rd + b) - X(rd), 36); ctx.restore();
      if (rd > 0.5) text(ctx, 'reaction ' + fmt(rd, 1) + ' m', (X(0) + X(rd)) / 2, y - 36, C('v'), { align: 'center', size: 17, weight: 600 });
      text(ctx, 'braking ' + fmt(b, 1) + ' m', (X(rd) + X(rd + b)) / 2, y - 36, C('x'), { align: 'center', size: 17, weight: 600 });
      text(ctx, fmt(rd + b, 1) + ' m in ' + fmt(tstop(a), 2) + ' s', X(rd + b) + 16, y, PAL.muted, { size: 17 });
      dot(ctx, X(pos(a, tau)), y, PAL.ink, true, 9);
    });
    line(ctx, X(0), 80, X(0), 260, C('v'), 3, [4, 8]); text(ctx, 'light turns red', X(0), 282, PAL.muted, { align: 'center', size: 16 });
    headline(ctx, 't = ' + fmt(tau, 2) + ' s · the speed and the driver are the same, and only the road differs');
    tex(d.readout, `\\kx_{\\text{braking}} = \\frac{\\kv^2 - \\kvo^2}{2\\ka}:\\quad \\text{dry } \\frac{0 - (${fmt(v0.v, 1)})^2}{2(${fmt(ad.v, 2)})} = ${fmt(bd, 1)}\\ \\text{m},\\quad \\text{wet } ${fmt(bw, 1)}\\ \\text{m}`);
  }
  new ResizeObserver(() => draw()).observe(wrap);
  register(fig, { update: (dt) => cy.step(dt, () => 1), draw });
})();

/* =====================================================================
   DEMO 7: merging car, two roots of the quadratic
===================================================================== */
(function () {
  const d = demo('demo-merge', 700);
  const x = ctl(d.controls, { label: '\\kx', cls: 'x', min: 50, max: 400, step: 10, value: 200, unit: 'm', dec: 0, onInput: reset });
  const v0 = ctl(d.controls, { label: '\\kvo', cls: 'v', min: 0, max: 20, step: 0.5, value: 10, unit: 'm/s', dec: 1, onInput: reset });
  const a = ctl(d.controls, { label: '\\ka', cls: 'a', min: 0.5, max: 4, step: 0.05, value: 2, unit: 'm/s²', dec: 2, onInput: reset });
  const roots = () => { const disc = Math.sqrt(v0.v * v0.v + 2 * a.v * x.v); return [(-v0.v + disc) / a.v, (-v0.v - disc) / a.v]; };
  const cy = cycle(() => roots()[0], 1.4);
  function reset() { cy.reset(); }
  function draw() {
    const { ctx } = begin(d.c);
    const tau = cy.now(), [rp, rm] = roots(), pos = (s) => v0.v * s + 0.5 * a.v * s * s;
    // the ramp
    const L = 80, R = 1320, y = 170; const X = (m) => L + (R - L) * m / x.v;
    strip(ctx, L, R, y, 50);
    dot(ctx, X(0), y + 25, C('x'), false, 7); text(ctx, 'x₀ = 0', X(0), y + 62, C('x'), { align: 'center', size: 18, weight: 600 });
    line(ctx, X(x.v), y - 36, X(x.v), y + 36, C('x'), 4); text(ctx, 'end of ramp, x = ' + x.v + ' m', X(x.v) - 14, y + 62, C('x'), { align: 'right', size: 18, weight: 600 });
    const px = X(pos(tau)), vv = v0.v + a.v * tau;
    car(ctx, px, y - 6, PAL.ink, 1);
    arrow(ctx, px, y - 64, px + vv * 5, y - 64, C('v'), 5); text(ctx, 'v = ' + fmt(vv, 1) + ' m/s', px + vv * 5 + 16, y - 64, C('v'), { weight: 600, size: 20 });
    // the parabola with both roots
    const tmin = rm * 1.25 - 2, tmax = rp * 1.25 + 2, xmin = Math.min(0, -v0.v * v0.v / (2 * a.v)) * 1.3 - 5, xmax = Math.max(pos(tmin), pos(tmax));
    const box = { l: 160, r: 1240, t: 300, b: 620 };
    const tr = nice(tmin, tmax, 5), xr = nice(xmin, xmax, 4), t0 = tr.lo, t1 = tr.hi;
    const { X: GX, Y: GY } = axes(ctx, box, [t0, t1], [xr.lo, xr.hi], { xl: 't (s)', xc: C('t'), yl: 'x (m)', yc: C('x'), nx: tr.n, ny: xr.n });
    ctx.save(); ctx.fillStyle = alpha(PAL.muted, 0.08); ctx.fillRect(GX(t0), box.t, GX(0) - GX(t0), box.b - box.t); ctx.restore();
    curve(ctx, pos, t0, t1, GX, GY, C('x'), 5, 120);
    line(ctx, box.l, GY(x.v), box.r, GY(x.v), C('x'), 3, [10, 10]); text(ctx, 'end of ramp, x = ' + x.v + ' m', GX((rm + rp) / 2), GY(x.v) - 22, C('x'), { align: 'center', weight: 600, size: 18 });
    line(ctx, GX(rp), GY(0), GX(rp), GY(x.v), C('t'), 3, [4, 8]); line(ctx, GX(rm), GY(0), GX(rm), GY(x.v), PAL.muted, 3, [4, 8]);
    dot(ctx, GX(rp), GY(x.v), C('t'), true, 11); dot(ctx, GX(rm), GY(x.v), PAL.muted, false, 11);
    dot(ctx, GX(tau), GY(pos(tau)), PAL.ink, true, 9);
    text(ctx, 't = ' + fmt(rp, 1) + ' s', GX(rp) + 16, GY(0) - 22, C('t'), { weight: 600, size: 20 });
    text(ctx, 't = ' + fmt(rm, 1) + ' s, before the motion began', GX(rm) + 16, GY(0) + 26, PAL.muted, { weight: 600, size: 18 });
    text(ctx, 'past', GX(0) - 14, box.b - 22, PAL.muted, { size: 17, align: 'right' }); text(ctx, 'future', GX(0) + 14, box.b - 22, PAL.muted, { size: 17 });
    headline(ctx, 't = ' + fmt(tau, 1) + ' s · the parabola crosses the ramp length twice; only one crossing is in the future');
    tex(d.readout, `\\tfrac{1}{2}\\ka\\kt^2 + \\kvo\\kt - \\kx = 0 \\;\\Rightarrow\\; \\kt = \\frac{-\\kvo \\pm \\sqrt{\\kvo^2 + 2\\ka\\kx}}{\\ka} = ${fmt(rp, 1)}\\ \\text{s}\\ \\text{or}\\ ${fmt(rm, 1)}\\ \\text{s}`);
  }
  register(d.fig, { update: (dt) => cy.step(dt, () => roots()[0] / 5), draw });
})();
};
