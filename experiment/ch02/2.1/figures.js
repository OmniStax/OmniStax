/* Figures for section 2.1 Displacement. Boots against the section's text article. */
window.OMNIA_FIGURES = window.OMNIA_FIGURES || {};
window.OMNIA_FIGURES['2.1'] = function (root, F) {
const { fmt, tex, C, PAL, REDUCED, LW, ctl, cycle, register, begin, line, arrow, dot, text, headline, hbracket, scale, runner } = F;
const demo = (id, H) => F.demo(root, id, H);
function xfLabel(ctx, x, y, color) { text(ctx, 'x', x - 6, y, color, { align: 'center', weight: 600, size: 24 }); text(ctx, 'f', x + 8, y + 8, color, { align: 'center', weight: 600, size: 16 }); }
function twoLine(host, a, b) { if (!host._a) { host._a = document.createElement('div'); host._b = document.createElement('small'); host.replaceChildren(host._a, host._b); } tex(host._a, a); tex(host._b, b); }
const sgn = (n, d) => (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n), d);

/* a bicycle sprite, ink coloured, about 90 units long */
function bike(ctx, x, y, color, dir, phase) {
  ctx.save(); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 4; ctx.lineCap = 'round';
  const r = 15, w = 46 * dir;
  [x - w / 2, x + w / 2].forEach((cx) => { ctx.beginPath(); ctx.arc(cx, y, r, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx, y); ctx.lineTo(cx + r * Math.cos(phase), y + r * Math.sin(phase)); ctx.stroke(); });
  ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w * 0.1, y - 26); ctx.lineTo(x + w * 0.35, y - 26); ctx.lineTo(x + w / 2, y); ctx.moveTo(x - w * 0.1, y - 26); ctx.lineTo(x + w * 0.05, y); ctx.lineTo(x + w * 0.35, y - 26); ctx.stroke();
  // rider
  ctx.beginPath(); ctx.moveTo(x + w * 0.05, y - 4); ctx.lineTo(x - w * 0.05, y - 40); ctx.lineTo(x + w * 0.4, y - 36); ctx.stroke();
  ctx.beginPath(); ctx.arc(x - w * 0.02, y - 54, 9, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

/* =====================================================================
   DEMO 1: displacement on a line. The professor (1.5 → 3.5 m) by default;
   set 6.0 → 2.0 for the airplane passenger.
===================================================================== */
(function () {
  const d = demo('demo-displacement', 440);
  const x0 = ctl(d.controls, { label: '\\kxo', cls: 'position', min: 0, max: 8, step: 0.5, value: 1.5, unit: 'm', dec: 1, onInput: reset });
  const xf = ctl(d.controls, { label: '\\kxf', cls: 'position', min: 0, max: 8, step: 0.5, value: 3.5, unit: 'm', dec: 1, onInput: reset, aria: 'final position' });
  const T = () => Math.max(1.5, Math.abs(xf.v - x0.v) * 0.9);
  const cy = cycle(T, 1.4);
  function reset() { cy.reset(); }
  function draw() {
    const { ctx } = begin(d.c);
    const dx = xf.v - x0.v, f = cy.now() / T(), xm = x0.v + dx * f;
    const L = 110, R = 1290, y = 300; const X = (m) => L + (R - L) * m / 8;
    // the whiteboard: the reference frame
    ctx.save(); ctx.fillStyle = PAL.soft; ctx.fillRect(L - 30, 90, R - L + 60, 130); ctx.strokeStyle = PAL.rule; ctx.lineWidth = 3; ctx.strokeRect(L - 30, 90, R - L + 60, 130); ctx.restore();
    text(ctx, 'whiteboard (reference frame)', L - 10, 108, PAL.muted, { size: 17 });
    line(ctx, L - 30, y, R + 30, y, PAL.muted, 3); scale(ctx, X, 0, 8, 1, y, 'm', 1);
    // displacement arrow above the axis
    if (Math.abs(dx) >= 0.25) { arrow(ctx, X(x0.v), y - 56, X(xf.v), y - 56, C('position'), 5); text(ctx, 'Δx = ' + sgn(dx, 1) + ' m', (X(x0.v) + X(xf.v)) / 2, y - 84, C('position'), { align: 'center', weight: 600 }); }
    else text(ctx, 'Δx = 0', X(x0.v), y - 84, C('position'), { align: 'center', weight: 600 });
    dot(ctx, X(x0.v), y, C('position'), false, 11); dot(ctx, X(xf.v), y, C('position'), true, 11);
    text(ctx, 'x₀', X(x0.v), y + 66, C('position'), { align: 'center', weight: 600, size: 24 });
    xfLabel(ctx, X(xf.v), y + 66, C('position'));
    // the professor in transit, on the axis
    runner(ctx, X(xm), y - 8, PAL.ink, f * Math.PI * 6);
    const dir = dx > 0 ? 'to the right' : dx < 0 ? 'to the left' : 'she ends where she started';
    headline(ctx, Math.abs(dx) < 0.25 ? 'Δx = 0: no displacement, whatever the path' : 'Δx = ' + fmt(xf.v, 1) + ' − ' + fmt(x0.v, 1) + ' = ' + sgn(dx, 1) + ' m, ' + dir);
    tex(d.readout, `\\kdx = \\kxf - \\kxo = ${fmt(xf.v, 1)}\\ \\text{m} - ${fmt(x0.v, 1)}\\ \\text{m} = ${dx >= 0 ? '+' : ''}${fmt(dx, 1)}\\ \\text{m}`);
  }
  register(d.fig, { update: (dt) => cy.step(dt, () => 1), draw });
})();

/* =====================================================================
   DEMO 2: distance traveled vs displacement. The cyclist from Check Your
   Understanding: 0 → −3 → −1 km.
===================================================================== */
(function () {
  const d = demo('demo-path', 540);
  const x0 = ctl(d.controls, { label: '\\kxo', cls: 'position', min: -5, max: 5, step: 0.5, value: 0, unit: 'km', dec: 1, onInput: reset });
  const xt = ctl(d.controls, { label: 'x_{\\text{turn}}', cls: 'position', min: -5, max: 5, step: 0.5, value: -3, unit: 'km', dec: 1, onInput: reset, aria: 'turning point' });
  const xf = ctl(d.controls, { label: '\\kxf', cls: 'position', min: -5, max: 5, step: 0.5, value: -1, unit: 'km', dec: 1, onInput: reset, aria: 'final position' });
  const leg1 = () => Math.abs(xt.v - x0.v), leg2 = () => Math.abs(xf.v - xt.v), total = () => leg1() + leg2();
  const T = () => Math.max(1.5, total() * 0.8);
  const cy = cycle(T, 1.6);
  function reset() { cy.reset(); }
  function draw() {
    const { ctx } = begin(d.c);
    const dx = xf.v - x0.v, s = total() * cy.now() / T();   // s = path length covered so far
    const L = 110, R = 1090, y = 350; const X = (m) => L + (R - L) * (m + 5) / 10;
    line(ctx, L - 30, y, R + 30, y, PAL.muted, 3); scale(ctx, X, -5, 5, 1, y, 'km', 1);
    text(ctx, 'west', L - 30, y - 30, PAL.muted, { size: 17 }); text(ctx, 'east (+)', R + 30, y - 30, PAL.muted, { size: 17, align: 'right' });
    // the path: leg 1 on one row, leg 2 on the row above, like the book's paths figure
    const y1 = y - 90, y2 = y - 150;
    const s1 = Math.min(s, leg1()), s2 = Math.max(0, s - leg1());
    const p1 = x0.v + Math.sign(xt.v - x0.v) * s1, p2 = xt.v + Math.sign(xf.v - xt.v) * s2;
    if (leg1() > 0) { line(ctx, X(x0.v), y1, X(xt.v), y1, PAL.rule, 4); if (s1 > 0.05) arrow(ctx, X(x0.v), y1, X(p1), y1, PAL.ink, 5); }
    if (leg2() > 0) { line(ctx, X(xt.v), y2, X(xf.v), y2, PAL.rule, 4); line(ctx, X(xt.v), y1, X(xt.v), y2, PAL.rule, 4); if (s2 > 0.05) arrow(ctx, X(xt.v), y2, X(p2), y2, PAL.ink, 5); }
    const onLeg2 = s > leg1() + 1e-6, px = onLeg2 ? p2 : p1, py = onLeg2 ? y2 : y1, dir = onLeg2 ? Math.sign(xf.v - xt.v) || 1 : Math.sign(xt.v - x0.v) || 1;
    bike(ctx, X(px), py - 22, PAL.ink, dir, s * 4);
    // displacement bracket below the axis, start and end markers on it
    dot(ctx, X(x0.v), y, C('position'), false, 11); dot(ctx, X(xf.v), y, C('position'), true, 11);
    text(ctx, 'x₀', X(x0.v), y + 66, C('position'), { align: 'center', weight: 600, size: 24 }); xfLabel(ctx, X(xf.v), y + 66, C('position'));
    if (Math.abs(dx) >= 0.25) hbracket(ctx, X(x0.v), X(xf.v), y + 150, C('position'), 'displacement Δx = ' + sgn(dx, 1) + ' km');
    else text(ctx, 'displacement Δx = 0', X(x0.v), y + 130, C('position'), { align: 'center', weight: 600 });
    // odometer
    ctx.save(); ctx.fillStyle = PAL.panel; ctx.strokeStyle = PAL.rule; ctx.lineWidth = 3; ctx.fillRect(1130, 150, 200, 96); ctx.strokeRect(1130, 150, 200, 96); ctx.restore();
    text(ctx, 'distance traveled', 1230, 176, PAL.muted, { size: 17, align: 'center' });
    text(ctx, fmt(s, 1) + ' km', 1230, 214, PAL.ink, { size: 30, weight: 600, align: 'center' });
    headline(ctx, 'distance traveled ' + fmt(total(), 1) + ' km · displacement ' + sgn(dx, 1) + ' km · magnitude ' + fmt(Math.abs(dx), 1) + ' km');
    twoLine(d.readout, `\\kdx = \\kxf - \\kxo = ${sgn(dx, 1).replace('−', '-')}\\ \\text{km}`, `\\text{distance traveled} = |${fmt(xt.v, 1)} - ${fmt(x0.v, 1)}| + |${fmt(xf.v, 1)} - (${fmt(xt.v, 1)})| = ${fmt(total(), 1)}\\ \\text{km}`);
  }
  register(d.fig, { update: (dt) => cy.step(dt, () => 1), draw });
})();

/* =====================================================================
   FIGURE 3: the book's four paths for the problems (Figure 2.57). No sliders:
   the problems need these numbers. Each path is traced in turn.
===================================================================== */
(function () {
  const d = demo('fig-paths', 540);
  const PATHS = [{ n: 'A', p: [0, 7] }, { n: 'B', p: [12, 7] }, { n: 'C', p: [2, 10, 8, 11] }, { n: 'D', p: [9, 3, 5] }];
  const rows = [110, 170, 250, 350];                       // top row of each path
  const lens = PATHS.map((P) => P.p.slice(1).reduce((a, x, i) => a + Math.abs(x - P.p[i]), 0));
  const PER = 2.6, T = () => PATHS.length * PER;
  const cy = cycle(T, 1.4);
  function draw() {
    const { ctx } = begin(d.c);
    const L = 150, R = 1250, y = 460; const X = (m) => L + (R - L) * m / 12;
    line(ctx, L - 30, y, R + 30, y, PAL.ink, 3); scale(ctx, X, 0, 12, 2, y, '', 1);
    text(ctx, 'position x (m)', (L + R) / 2, y + 66, C('position'), { align: 'center', weight: 600, size: 24 });
    const tau = cy.now(), k = Math.min(PATHS.length - 1, Math.floor(tau / PER)), f = REDUCED ? 1 : Math.min(1, (tau - k * PER) / (PER * 0.75));
    PATHS.forEach((P, i) => {
      const active = i === k, done = i < k || REDUCED, color = active ? C('position') : done ? PAL.ink : PAL.rule;
      let sLeft = active ? f * lens[i] : done ? Infinity : 0, cx = P.p[0], row = rows[i];
      text(ctx, P.n, X(P.p[0]) + (P.p[1] > P.p[0] ? -34 : 34), row - 30, PAL.ink, { align: 'center', weight: 600, size: 24 });
      dot(ctx, X(P.p[0]), row, color, false, 9);
      for (let j = 1; j < P.p.length; j++) {
        const from = P.p[j - 1], to = P.p[j], len = Math.abs(to - from); const ry = row + (j - 1) * 22;
        line(ctx, X(from), ry, X(to), ry, PAL.rule, 4);
        if (j > 1) line(ctx, X(from), ry - 22, X(from), ry, color, 4);
        if (sLeft <= 0) continue;
        const seg = Math.min(len, sLeft); const end = from + Math.sign(to - from) * seg; sLeft -= seg;
        arrow(ctx, X(from), ry, X(end), ry, color, 5); cx = end;
        if (sLeft <= 0 && active) { dot(ctx, X(end), ry, color, true, 9); line(ctx, X(end), ry, X(end), y, color, 2, [4, 8]); }
      }
      if (done) dot(ctx, X(P.p[P.p.length - 1]), row + (P.p.length - 2) * 22, color, true, 9);
    });
    const P = PATHS[k];
    headline(ctx, 'path ' + P.n + ': ' + P.p.join(' → ') + ' m');
  }
  register(d.fig, { update: (dt) => cy.step(dt, () => 1), draw });
})();
};
