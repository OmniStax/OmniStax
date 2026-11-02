/* Figures for section 1.3 Computation with Sage. */
window.OMNISTAX_FIGURES = window.OMNISTAX_FIGURES || {};
window.OMNISTAX_FIGURES['1.3'] = function (root, F) {
const { PAL, alpha, ctl, choice, begin, axes, plot, line, dot, text, headline, register, readout, hover, labeller, solve, fmt } = F;
const sim = (id, H) => F.sim(root, id, H);
const still = (d, draw) => register(d.fig, { update: () => {}, draw });
const L10 = Math.log10;
const YEAR = 3.156e7;                 /* seconds in a year */
const RATE = 1e12;                    /* the text's computer: a trillion operations a second */
const UNIVERSE = 1e10 * YEAR;         /* the age of the universe, 10¹⁰ years, in seconds */
/* digits as superscripts, for text that is not TeX (hover names, the headline's plain run) */
const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
const sup = (e) => String(e).split('').map((c) => SUP[c] ?? c).join('');
/* a count: an integer with thousands separators up to ten million, else three significant figures times a power of ten;
   `big` as TeX, `bigT` as figure text */
const parts = (v, sig) => { const e = Math.floor(L10(v)); let m = Math.round((v / 10 ** e) * 10 ** (sig - 1)) / 10 ** (sig - 1); return m >= 10 ? { m: 1, e: e + 1 } : { m, e }; };
const big = (v, sig = 3) => {
  if (!(v > 0)) return '0';
  if (v < 1e7 && Number.isInteger(v)) return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '{,}');
  const { m, e } = parts(v, sig); return `${m.toFixed(sig - 1)} \\times 10^{${e}}`;
};
const bigT = (v, sig = 3) => {
  if (!(v > 0)) return '0';
  if (v < 1e7 && Number.isInteger(v)) return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const { m, e } = parts(v, sig); return `${m.toFixed(sig - 1)} × 10${sup(e)}`;
};
/* n as TeX: in full below a million, else as a power of ten where the slider sits on one, else three figures */
const nTex = (n) => (n < 1e6 ? big(n) : L10(n) % 1 === 0 ? `10^{${L10(n)}}` : big(n));
/* a time in seconds as a reader would say it: 3.0 ps, 2.0 µs, 3.2 s, 14 minutes, 2.1 days, 6.3 × 10¹⁶ years */
function timeOf(t) {
  if (t < 1e-9) return { s: fmt(t * 1e12, 1), unit: 'ps' };
  if (t < 1e-6) return { s: fmt(t * 1e9, 1), unit: 'ns' };
  if (t < 1e-3) return { s: fmt(t * 1e6, 1), unit: 'µs' };
  if (t < 1) return { s: fmt(t * 1e3, 1), unit: 'ms' };
  if (t < 60) return { s: fmt(t, 1), unit: 's' };
  if (t < 3600) return { s: fmt(t / 60, 1), unit: 'minutes' };
  if (t < 86400) return { s: fmt(t / 3600, 1), unit: 'hours' };
  if (t < YEAR) return { s: fmt(t / 86400, 1), unit: 'days' };
  if (t < 1e4 * YEAR) return { s: fmt(t / YEAR, t < 100 * YEAR ? 1 : 0), unit: 'years' };
  return { v: t / YEAR, unit: 'years' };
}
const when = (t) => { const p = timeOf(t); return `${p.s ?? bigT(p.v, 2)} ${p.unit}`; };
const whenTex = (t) => { const p = timeOf(t); return `${p.s ?? big(p.v, 2)}\\ ${p.unit === 'µs' ? '\\mu\\text{s}' : `\\text{${p.unit}}`}`; };

/* Sim: the effort of row reduction against n. A log–log graph: n from 1 to 10¹² across, the operation
   count from 1 to 10⁴⁰ up, both fixed. The section's count 2n³ + n² is a line of slope 3; the n² spent
   on scaling is a fainter line of slope 2 that falls ever farther below it; the careful ⅔n³ and the
   broad n³ of the trillion-row paragraph run parallel to it. Three dashed levels give the time at a
   trillion operations a second: one second (10¹² operations), one year and the age of the universe,
   10¹⁰ years, the text's own yardsticks. From the point an L reaches to 10n: ten times the rows, and
   the count climbs by the factor the leg is labelled with, ×1000 as n grows (the text's sentence).
   One slider, log₁₀ n (n is rounded to a whole number), detents at the integers, the text's n = 100 the
   default and n = 10¹² the far end, specials where the time reaches a year and the universe's age; a
   choice of the count. Still: nothing here has a clock; a change of count morphs the point between
   the parallel lines. Untyped throughout: n and an operation count are numbers, in ink. */
(function () {
  const d = sim('sim-row-reduction-effort', 820);
  const BOX = { l: 150, r: 1240, t: 120, b: 700 };
  const XR = [0, 12], YR = [0, 40];
  const COUNTS = {
    rough: { f: (n) => 2 * n ** 3 + n ** 2, tex: '2n^3 + n^2', sub: (n) => `2(${nTex(n)})^3 + ${n >= 1e6 ? `(${nTex(n)})` : nTex(n)}^2`, name: '2n³ + n²', plain: '2n^3 + n^2' },
    careful: { f: (n) => (2 / 3) * n ** 3, tex: '\\tfrac23 n^3', sub: (n) => `\\tfrac23 (${nTex(n)})^3`, name: '⅔n³', plain: '⅔n^3' },
    broad: { f: (n) => n ** 3, tex: 'n^3', sub: (n) => `(${nTex(n)})^3`, name: 'n³', plain: 'n^3' },
  };
  const ORDER = ['rough', 'careful', 'broad'];
  const logCount = (key) => (k) => L10(COUNTS[key].f(10 ** k));
  /* where the chosen count reaches a time t at a trillion operations a second, as log₁₀ n */
  const reach = (t) => solve((k) => logCount(pick.value)(k) - L10(t * RATE), XR[0], XR[1]);
  const pick = choice(d.controls, {
    label: '\\text{count}', key: 'count', value: 'rough', aria: 'which count of operations to follow',
    options: ORDER.map((v) => ({ value: v, label: COUNTS[v].name })),
  });
  const kk = ctl(d.controls, {
    label: '\\log_{10} n', cls: '', key: 'k', min: 0, max: 12, step: 0.1, value: 2, unit: '', dec: 1,
    aria: 'the number of rows and columns n, as a power of ten',
    detents: Array.from({ length: 13 }, (_, i) => i),
    specials: [{ at: () => reach(YEAR), label: 'a year' }, { at: () => reach(UNIVERSE), label: 'the age of the universe' }],
  });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);

  function draw() {
    const { ctx, H } = begin(d.c);
    const ink = PAL.ink, mu = PAL.muted;
    const k = Math.round(kk.v * 10) / 10, n = Math.round(10 ** k), key = pick.value, cnt = COUNTS[key];
    const ops = cnt.f(n), t = ops / RATE, ky = L10(ops);
    hits = [];
    const ax = axes(ctx, BOX, XR, YR, {
      xl: 'n, the number of rows and columns', yl: 'operations', nx: 12, ny: 8,
      fx: (v) => (v === 0 ? '1' : v === 1 ? '10' : `10^{${v}}`), fy: (v) => (v === 0 ? '1' : `10^{${v}}`),
    });
    const lab = labeller(ctx, H, { headline: true });
    /* the three yardsticks at a trillion operations a second */
    const LEVELS = [[1, 'one second'], [YEAR, 'one year'], [UNIVERSE, 'the age of the universe, 10^{10} years']];
    LEVELS.forEach(([s, name]) => {
      const y = ax.Y(L10(s * RATE));
      line(ctx, BOX.l, y, BOX.r, y, alpha(mu, 0.8), 2, [10, 10]);
      lab.add(name, BOX.r - 10, y - 16, -1, 0, mu, 17, 1);
      hits.push({ x: BOX.r - 120, y, r: 16, name: `${name}: ${bigT(s * RATE, 2)} operations at a trillion a second` });
    });
    /* the lines: the chosen count in ink, the other two faint and dashed, n² dotted */
    const wt = pick.mix((v) => ORDER.map((o) => (o === v ? 1 : 0)));
    ORDER.forEach((o, i) => {
      const a = wt[i];
      if (a < 0.999) { ctx.save(); ctx.setLineDash([10, 10]); plot(ctx, ax, logCount(o), alpha(ink, 0.35 * (1 - a) + 0.35), { w: 3 }); ctx.restore(); }
      if (a > 0.001) { ctx.save(); ctx.globalAlpha *= a; plot(ctx, ax, logCount(o), ink, { w: 5 }); ctx.restore(); }
    });
    ctx.save(); ctx.setLineDash([4, 8]); plot(ctx, ax, (x) => 2 * x, alpha(ink, 0.55), { w: 3 }); ctx.restore();
    /* names at each line's upper end, stepped out where the n³ family crowds */
    const end = (f) => ({ x1: ax.X(11.4), y1: ax.Y(f(11.4)), x2: ax.X(12), y2: ax.Y(f(12)) });
    lab.beside(end(logCount(key)), 'left', cnt.plain, ink, 22, { offset: 1, gap: 26 });
    ORDER.filter((o) => o !== key).forEach((o) => lab.beside(end(logCount(o)), 'right', COUNTS[o].plain, mu, 20, { offset: 1, gap: 26 }));
    lab.beside(end((x) => 2 * x), 'right', 'n^2, the scaling', mu, 20, { offset: 1, gap: 26 });
    /* the point for this n on the chosen line, its drop lines, and the L to 10n */
    const [px, py] = pick.mix((v) => [ax.X(k), ax.Y(logCount(v)(k))]);
    line(ctx, px, py, px, BOX.b, alpha(ink, 0.5), 2.5, [4, 8]);
    line(ctx, BOX.l, py, px, py, alpha(ink, 0.5), 2.5, [4, 8]);
    const up = k <= 11, k0 = up ? k : k - 1, k1 = k0 + 1, fy = logCount(key);
    const ratio = COUNTS[key].f(Math.round(10 ** k1)) / COUNTS[key].f(Math.round(10 ** k0));
    const sx0 = ax.X(k0), sx1 = ax.X(k1), sy0 = ax.Y(fy(k0)), sy1 = ax.Y(fy(k1));
    line(ctx, sx0, sy0, sx1, sy0, alpha(ink, 0.6), 2.5, [7, 7]);
    line(ctx, sx1, sy0, sx1, sy1, alpha(ink, 0.6), 2.5, [7, 7]);
    lab.beside({ x1: sx0, y1: sy0, x2: sx1, y2: sy0 }, 'right', '×10', ink, 19, { gap: 18 });
    lab.beside({ x1: sx1, y1: sy0, x2: sx1, y2: sy1 }, up ? 'right' : 'left', `×${fmt(Math.round(ratio), 0)}`, ink, 19, { gap: 18 });
    hits.push({ x: (sx0 + sx1) / 2, y: sy0, r: 16, name: `ten times the rows: from n = ${bigT(Math.round(10 ** k0))} to ${bigT(Math.round(10 ** k1))}` });
    hits.push({ x: sx1, y: (sy0 + sy1) / 2, r: 16, name: `${fmt(Math.round(ratio), 0)} times the work: ${cnt.name} grows from ${bigT(cnt.f(Math.round(10 ** k0)))} to ${bigT(cnt.f(Math.round(10 ** k1)))}` });
    dot(ctx, px, py, ink, true, 10);
    hits.push({ x: px, y: py, r: 22, name: `n = ${bigT(n)}: ${cnt.name} = ${bigT(ops)} operations, ${when(t)} at a trillion a second` });
    lab.flush();
    /* headline and readout */
    headline(ctx, `$n = ${nTex(n)}$: about $${big(ops)}$ operations, ${when(t)} at a trillion operations a second.`);
    const exact = Number.isInteger(ops) && ops < 1e7;
    ro.set(`\\mk{count}{${cnt.tex}} = \\mk{sub}{${cnt.sub(n)}} ${exact ? '=' : '\\approx'} \\mk{ops}{${big(ops)}}`,
      `$${big(ops)} \\div 10^{12}\\ \\text{per second} \\approx ${whenTex(t)}$`, { form: key });
  }
  still(d, draw);
})();
};
