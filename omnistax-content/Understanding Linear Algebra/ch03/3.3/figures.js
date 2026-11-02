/* Figures for section 3.3 Image compression. */
window.OMNISTAX_FIGURES = window.OMNISTAX_FIGURES || {};
window.OMNISTAX_FIGURES['3.3'] = function (root, F) {
const { C, PAL, alpha, ctl, choice, select, begin, axes, line, dot, text, headline, register, readout, hover, ease, fmt, arrival } = F;
const sim = (id, H) => F.sim(root, id, H);
const still = (d, draw) => register(d.fig, { update: () => {}, draw });
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
/* a number as the figure writes it: at most `p` decimals, no trailing zeros, never −0 */
const rd = (v, p = 1) => { const m = 10 ** p, r = Math.round(v * m) / m; return Object.is(r, -0) ? 0 : r; };
const num = (v, p = 1) => String(rd(v, p));
const numT = (v, p = 1) => num(v, p).replace('-', '−');           /* the same in figure text, with a true minus */
const lerp = (a, b, k) => a + (b - a) * k;
/* a CSS colour from R, G, B in 0..255, clamped, drawn as the fact */
const rgbFact = (r, g, b) => F.fact(`rgb(${Math.round(clamp(r, 0, 255))}, ${Math.round(clamp(g, 0, 255))}, ${Math.round(clamp(b, 0, 255))})`);
const colT = (xs, p = 0) => `\\begin{bmatrix} ${xs.map((x) => num(x, p)).join(' \\\\ ')} \\end{bmatrix}`;
/* a vector of eight written as a row with a transpose, so the readout stays one line */
const rowT = (xs, p = 0) => `\\begin{bmatrix} ${xs.map((x) => num(x, p)).join(' & ')} \\end{bmatrix}^{\\mathsf T}`;

/* ---------- the YCbCr change of basis (the book's basis B) ---------- */
const PB = [[1, 0, 1.402], [1, -0.34413, -0.71414], [1, 1.772, 0]];
const inv3 = (m) => {
  const [a, b, c] = m[0], [d, e, f] = m[1], [g, h, i] = m[2];
  const A = e * i - f * h, B = -(d * i - f * g), Cc = d * h - e * g, det = a * A + b * B + c * Cc;
  return [[A / det, -(b * i - c * h) / det, (b * f - c * e) / det], [B / det, (a * i - c * g) / det, -(a * f - c * d) / det], [Cc / det, -(a * h - b * g) / det, (a * e - b * d) / det]];
};
const PBI = inv3(PB);
const mul3 = (m, v) => m.map((r) => r[0] * v[0] + r[1] * v[1] + r[2] * v[2]);
const rgb2ycc = (c) => mul3(PBI, c);
const ycc2rgb = (y) => mul3(PB, y);

/* ---------- the Fourier (cosine) basis of R^8 ---------- */
const N = 8;
const basis = (j, i) => Math.cos((2 * i + 1) * j * Math.PI / 16);
const P8 = Array.from({ length: N }, (_, i) => Array.from({ length: N }, (_, j) => basis(j, i)));   /* columns are v_j */
/* the columns of P are orthogonal: v_0 · v_0 = 8 and v_j · v_j = 4 for j > 0, so P^-1 = D^-1 P^T */
const P8I = Array.from({ length: N }, (_, j) => Array.from({ length: N }, (_, i) => basis(j, i) / (j === 0 ? 8 : 4)));
const matvec = (M, x) => M.map((r) => r.reduce((s, m, k) => s + m * x[k], 0));
const matmul = (A, B) => A.map((r) => B[0].map((_, j) => r.reduce((s, a, k) => s + a * B[k][j], 0)));
const transpose = (A) => A[0].map((_, j) => A.map((r) => r[j]));
const VMAC = ['\\kvecvzero', '\\kvecvone', '\\kvecvtwo', '\\kvecvthree', '\\kvecvfour', '\\kvecvfive', '\\kvecvsix', '\\kvecvseven'];
const SUB = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇'];

/* The 8 × 8 block of Figure 3.3.7 (the author's PreFigure data) and its luminance values (Figure 3.3.8). */
const RED = [[233, 227, 227, 226, 221, 219, 214, 209], [240, 238, 234, 226, 222, 220, 214, 209], [224, 229, 228, 220, 222, 221, 220, 218], [198, 209, 223, 225, 219, 220, 222, 223], [191, 197, 217, 225, 223, 223, 224, 224], [193, 194, 215, 223, 229, 229, 229, 231], [202, 204, 219, 228, 228, 228, 229, 231], [212, 214, 222, 230, 234, 232, 230, 230]];
const GREEN = [[157, 152, 152, 151, 144, 142, 136, 131], [162, 160, 156, 148, 143, 141, 135, 130], [147, 152, 151, 143, 143, 142, 141, 139], [121, 132, 146, 148, 140, 141, 143, 144], [113, 119, 139, 147, 144, 144, 145, 145], [112, 113, 134, 142, 148, 148, 148, 149], [120, 122, 137, 146, 147, 147, 148, 149], [130, 132, 140, 148, 153, 151, 149, 149]];
const BLUE = [[121, 113, 113, 112, 102, 100, 97, 92], [124, 121, 117, 109, 102, 100, 94, 91], [105, 108, 107, 99, 102, 101, 100, 100], [75, 86, 100, 102, 99, 100, 102, 103], [67, 73, 93, 99, 101, 103, 104, 104], [69, 70, 89, 97, 105, 105, 105, 109], [80, 82, 97, 106, 104, 104, 105, 109], [92, 94, 102, 110, 110, 108, 106, 106]];
const LUM = [[176, 170, 170, 169, 162, 160, 155, 150], [181, 179, 175, 167, 162, 160, 154, 149], [165, 170, 169, 161, 162, 161, 160, 158], [139, 150, 164, 166, 159, 160, 162, 163], [131, 137, 157, 165, 163, 163, 164, 164], [131, 132, 153, 161, 167, 167, 167, 169], [140, 142, 157, 166, 166, 166, 167, 169], [150, 152, 160, 168, 172, 170, 168, 168]];
const COL0 = LUM.map((r) => r[0]);                     /* the first column x of luminance values */
const COL0_F = matvec(P8I, COL0);                      /* its Fourier coefficients 151.6, 20.0, 15.3, … */

/* A horizontal strip of colours: `at(k)` gives the colour at fraction k of the strip, and a marker stands at fraction m. */
function strip(ctx, x1, x2, y, h, at, m, label, lo, hi, color) {
  const n = 96, g = ctx.createLinearGradient(x1, 0, x2, 0);
  for (let i = 0; i <= n; i++) g.addColorStop(i / n, at(i / n));
  ctx.fillStyle = g; ctx.fillRect(x1, y, x2 - x1, h);
  ctx.strokeStyle = alpha(PAL.ink, 0.35); ctx.lineWidth = 1.5; ctx.strokeRect(x1, y, x2 - x1, h);
  if (m !== null) {
    const mx = x1 + clamp(m, 0, 1) * (x2 - x1);
    line(ctx, mx, y - 8, mx, y + h + 8, PAL.ink, 3);
    ctx.fillStyle = PAL.panel; ctx.beginPath(); ctx.moveTo(mx - 7, y - 9); ctx.lineTo(mx + 7, y - 9); ctx.lineTo(mx, y - 1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2; ctx.stroke();
  }
  text(ctx, label, x1 - 16, y + h / 2, color, { size: 24, weight: 600, align: 'right', base: 'middle' });
  text(ctx, lo, x1, y + h + 22, PAL.muted, { size: 17, align: 'left' });
  text(ctx, hi, x2, y + h + 22, PAL.muted, { size: 17, align: 'right' });
}
/* a wide swatch of one colour, outlined */
function swatch(ctx, x, y, w, h, css) {
  ctx.fillStyle = css; ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = alpha(PAL.ink, 0.35); ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, h);
}

/* Figure 3.3.2 + 3.3.3: the RGB and YCbCr colour models as one colour read in two coordinate systems.
   The author's two interactives, linked: moving R, G or B recomputes Y, Cb, Cr by P_B^-1 and moving
   Y, Cb or Cr recomputes R, G, B by P_B; the readout writes the change of basis with the live numbers.
   Each channel is a strip over its whole range with the other two held as the author holds them
   (R alone, G alone, B alone; Y with the chrominances at 0, Cb and Cr each at Y = 128) and a marker
   at the current value; the colour itself is the wide swatch in the middle. The colour is the fact
   (facts "spectrum"). A select carries the seven colours Activity 3.3.2 names. Still: no clock. */
(function () {
  const d = sim('sim-color-models', 560);
  const L1 = 110, L2 = 560, R1 = 900, R2 = 1350, SX = 630, SW = 210, Y0 = 150, DY = 112, SH = 44;
  const colour = { c: [128, 128, 128] };            /* the true R, G, B, which may leave 0..255 under the YCbCr sliders */
  let pick = null, quiet = false;
  const sl = (label, key, min, max, step, value, dec, aria, on) => ctl(d.controls, { label, cls: '', key, min, max, step, value, unit: '', dec, aria, onInput: on });
  const fromRGB = () => { if (quiet) return; colour.c = [R.v, G.v, B.v]; const y = rgb2ycc(colour.c); quiet = true; Y.set(y[0]); Cb.set(y[1]); Cr.set(y[2]); pick.set('own'); quiet = false; };
  const fromYCC = () => { if (quiet) return; colour.c = ycc2rgb([Y.v, Cb.v, Cr.v]); quiet = true; R.set(clamp(colour.c[0], 0, 255)); G.set(clamp(colour.c[1], 0, 255)); B.set(clamp(colour.c[2], 0, 255)); pick.set('own'); quiet = false; };
  const R = sl('R', 'R', 0, 255, 1, 128, 0, 'the amount of red, from 0 to 255', fromRGB);
  const G = sl('G', 'G', 0, 255, 1, 128, 0, 'the amount of green, from 0 to 255', fromRGB);
  const B = sl('B', 'B', 0, 255, 1, 128, 0, 'the amount of blue, from 0 to 255', fromRGB);
  const Y = sl('Y', 'Y', 0, 255, 0.5, 128, 1, 'the luminance, from 0 to 255', fromYCC);
  const Cb = sl('C_b', 'Cb', -127.5, 127.5, 0.5, 0, 1, 'the blue chrominance, from −127.5 to 127.5', fromYCC);
  const Cr = sl('C_r', 'Cr', -127.5, 127.5, 0.5, 0, 1, 'the red chrominance, from −127.5 to 127.5', fromYCC);
  const PRESETS = {
    red: { rgb: [255, 0, 0] }, blue: { rgb: [0, 0, 255] }, white: { rgb: [255, 255, 255] }, black: { rgb: [0, 0, 0] },
    f1: { ycc: [128, 0, 0] }, f2: { ycc: [128, 60, 0] }, f3: { ycc: [128, 0, 60] },
  };
  pick = select(d.controls, {
    label: 'colour', key: 'colour', value: 'own', aria: 'one of the colours the activity names',
    options: [
      { value: 'own', label: 'your own' }, { value: 'red', label: 'pure red (255, 0, 0)' }, { value: 'blue', label: 'pure blue (0, 0, 255)' },
      { value: 'white', label: 'pure white (255, 255, 255)' }, { value: 'black', label: 'pure black (0, 0, 0)' },
      { value: 'f1', label: 'Y, Cb, Cr = 128, 0, 0' }, { value: 'f2', label: 'Y, Cb, Cr = 128, 60, 0' }, { value: 'f3', label: 'Y, Cb, Cr = 128, 0, 60' },
    ],
    onInput: (v) => {
      const p = PRESETS[v]; if (!p) return;
      quiet = true;
      if (p.rgb) { colour.c = p.rgb.slice(); R.set(p.rgb[0]); G.set(p.rgb[1]); B.set(p.rgb[2]); const y = rgb2ycc(p.rgb); Y.set(y[0]); Cb.set(y[1]); Cr.set(y[2]); }
      else { Y.set(p.ycc[0]); Cb.set(p.ycc[1]); Cr.set(p.ycc[2]); colour.c = ycc2rgb(p.ycc); R.set(clamp(colour.c[0], 0, 255)); G.set(clamp(colour.c[1], 0, 255)); B.set(clamp(colour.c[2], 0, 255)); }
      quiet = false;
    },
  });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  const ycc128 = (cb, cr) => ycc2rgb([128, cb, cr]);
  function describe(c, y) {
    const out = c.some((v) => v < -0.5 || v > 255.5);
    const grey = Math.abs(y[1]) < 1 && Math.abs(y[2]) < 1;
    if (out) {
      const which = ['R', 'G', 'B'].filter((_, i) => c[i] < -0.5 || c[i] > 255.5).join(', ');
      return `lies outside the $RGB$ cube: ${which} ${which.length > 1 ? 'fall' : 'falls'} outside 0 to 255, so no display shows it exactly and the swatch is clamped.`;
    }
    if (grey) return y[0] < 1 ? 'black.' : y[0] > 254 ? 'white.' : `a grey whose brightness is $Y$.`;
    const parts = [];
    if (y[1] > 8) parts.push('$C_b > 0$ pulls it toward blue'); else if (y[1] < -8) parts.push('$C_b < 0$ pulls it away from blue');
    if (y[2] > 8) parts.push('$C_r > 0$ pulls it toward red'); else if (y[2] < -8) parts.push('$C_r < 0$ pulls it away from red');
    return parts.length ? `${parts.join(' and ')}.` : 'nearly a grey.';
  }
  function draw() {
    const { ctx } = begin(d.c);
    const ink = PAL.ink, mu = PAL.muted;
    const c = colour.c, y = rgb2ycc(c);
    hits = [];
    text(ctx, 'RGB coordinates', (L1 + L2) / 2, 108, ink, { size: 22, weight: 600, align: 'center' });
    text(ctx, 'YCbCr coordinates', (R1 + R2) / 2, 108, ink, { size: 22, weight: 600, align: 'center' });
    strip(ctx, L1, L2, Y0, SH, (k) => rgbFact(255 * k, 0, 0), c[0] / 255, 'R', '0', '255', ink);
    strip(ctx, L1, L2, Y0 + DY, SH, (k) => rgbFact(0, 255 * k, 0), c[1] / 255, 'G', '0', '255', ink);
    strip(ctx, L1, L2, Y0 + 2 * DY, SH, (k) => rgbFact(0, 0, 255 * k), c[2] / 255, 'B', '0', '255', ink);
    strip(ctx, R1, R2, Y0, SH, (k) => rgbFact(255 * k, 255 * k, 255 * k), y[0] / 255, 'Y', '0', '255', ink);
    strip(ctx, R1, R2, Y0 + DY, SH, (k) => { const q = ycc128(-127.5 + 255 * k, 0); return rgbFact(q[0], q[1], q[2]); }, (y[1] + 127.5) / 255, 'C_b', '−127.5', '127.5', ink);
    strip(ctx, R1, R2, Y0 + 2 * DY, SH, (k) => { const q = ycc128(0, -127.5 + 255 * k); return rgbFact(q[0], q[1], q[2]); }, (y[2] + 127.5) / 255, 'C_r', '−127.5', '127.5', ink);
    swatch(ctx, SX, Y0 - 20, SW, 2 * DY + SH + 40, rgbFact(c[0], c[1], c[2]));
    text(ctx, 'the colour', SX + SW / 2, 108, ink, { size: 22, weight: 600, align: 'center' });
    const out = c.some((v) => v < -0.5 || v > 255.5);
    if (out) text(ctx, 'clamped to 0–255', SX + SW / 2, Y0 + 2 * DY + SH + 42, mu, { size: 17, align: 'center' });
    /* hover names */
    const row = (x1, x2, yy, name) => hits.push({ x: (x1 + x2) / 2, y: yy + SH / 2, r: (x2 - x1) / 2, name });
    row(L1, L2, Y0, 'the reds alone: G = B = 0 and R from 0 to 255');
    row(L1, L2, Y0 + DY, 'the greens alone: R = B = 0 and G from 0 to 255');
    row(L1, L2, Y0 + 2 * DY, 'the blues alone: R = G = 0 and B from 0 to 255');
    row(R1, R2, Y0, 'the luminance alone: Cb = Cr = 0 and Y from 0 to 255, a scale of greys');
    row(R1, R2, Y0 + DY, 'the blue chrominance at Y = 128, Cr = 0: Cb from −127.5 to 127.5');
    row(R1, R2, Y0 + 2 * DY, 'the red chrominance at Y = 128, Cb = 0: Cr from −127.5 to 127.5');
    hits.push({ x: SX + SW / 2, y: Y0 + DY + SH / 2, r: 120, name: `the colour R, G, B = ${numT(c[0], 0)}, ${numT(c[1], 0)}, ${numT(c[2], 0)}, which is Y, Cb, Cr = ${numT(y[0])}, ${numT(y[1])}, ${numT(y[2])}` });
    headline(ctx, `$RGB$ $(${num(c[0], 0)}, ${num(c[1], 0)}, ${num(c[2], 0)})$ is $Y = ${num(y[0])}$, $C_b = ${num(y[1])}$, $C_r = ${num(y[2])}$: ${describe(c, y)}`);
    ro.set(`\\left\\{${colT(c, 0)}\\right\\}_{\\mathcal{B}} = ${colT(y, 1)}`,
      `$Y = 0.299 \\cdot ${num(c[0], 0)} + 0.587 \\cdot ${num(c[1], 0)} + 0.114 \\cdot ${num(c[2], 0)} = ${num(y[0])}$`);
  }
  still(d, draw);
})();

/* Figure 3.3.17: the HSV colour model, the author's hsv.js on the exercise's own scale: H, S and V from
   0 to 255 (the script runs H over 0..360 and S, V over 0..1; Exercise 3.3.5's answers are on 0..255).
   Three strips, the hues at full saturation and value, the saturations and the values at the author's
   fixed hue of 180°, a marker on each, and the colour as a wide swatch. The colour is the fact. Still. */
function hsv2rgb(hDeg, s, v) {
  if (s <= 0) return [255 * v, 255 * v, 255 * v];
  let h = hDeg >= 360 ? 0 : hDeg; h /= 60;
  const i = Math.floor(h), f = h - i, p = v * (1 - s), q = v * (1 - s * f), t = v * (1 - s * (1 - f));
  switch (i) {
    case 0: return [255 * v, 255 * t, 255 * p];
    case 1: return [255 * q, 255 * v, 255 * p];
    case 2: return [255 * p, 255 * v, 255 * t];
    case 3: return [255 * p, 255 * q, 255 * v];
    case 4: return [255 * t, 255 * p, 255 * v];
    default: return [255 * v, 255 * p, 255 * q];
  }
}
(function () {
  const d = sim('sim-hsv', 480);
  const L1 = 110, L2 = 880, SX = 960, SW = 380, Y0 = 118, DY = 112, SH = 44;
  const sl = (label, key, aria) => ctl(d.controls, { label, cls: '', key, min: 0, max: 255, step: 1, value: 128, unit: '', dec: 0, aria });
  const H = sl('H', 'H', 'the hue, from 0 to 255'), S = sl('S', 'S', 'the saturation, from 0 to 255'), V = sl('V', 'V', 'the value, from 0 to 255');
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  const deg = (h) => (h / 255) * 360;
  function draw() {
    const { ctx } = begin(d.c);
    const ink = PAL.ink;
    const h = H.v, s = S.v / 255, v = V.v / 255, c = hsv2rgb(deg(h), s, v);
    hits = [];
    strip(ctx, L1, L2, Y0, SH, (k) => { const q = hsv2rgb(360 * k, 1, 1); return rgbFact(q[0], q[1], q[2]); }, h / 255, 'H', '0', '255', ink);
    strip(ctx, L1, L2, Y0 + DY, SH, (k) => { const q = hsv2rgb(180, k, 1); return rgbFact(q[0], q[1], q[2]); }, s, 'S', '0', '255', ink);
    strip(ctx, L1, L2, Y0 + 2 * DY, SH, (k) => { const q = hsv2rgb(180, 1, k); return rgbFact(q[0], q[1], q[2]); }, v, 'V', '0', '255', ink);
    swatch(ctx, SX, Y0 - 20, SW, 2 * DY + SH + 40, rgbFact(c[0], c[1], c[2]));
    text(ctx, 'the colour', SX + SW / 2, 86, ink, { size: 22, weight: 600, align: 'center' });
    const row = (yy, name) => hits.push({ x: (L1 + L2) / 2, y: yy + SH / 2, r: (L2 - L1) / 2, name });
    row(Y0, 'every hue at full saturation and value: H from 0 to 255 runs once round the colour wheel');
    row(Y0 + DY, 'the saturations at the hue 180° and full value: S from 0 (grey) to 255 (vivid)');
    row(Y0 + 2 * DY, 'the values at the hue 180° and full saturation: V from 0 (black) to 255 (bright)');
    hits.push({ x: SX + SW / 2, y: Y0 + DY + SH / 2, r: 180, name: `the colour H, S, V = ${H.v}, ${S.v}, ${V.v}, which is R, G, B = ${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}` });
    const what = S.v === 0 ? (V.v === 0 ? 'black' : V.v === 255 ? 'white' : 'a grey, since the saturation is 0') : V.v === 0 ? 'black, since the value is 0' : `a hue of ${Math.round(deg(h))}°, ${s < 0.34 ? 'washed out' : s < 0.67 ? 'half saturated' : 'vivid'}, ${v < 0.34 ? 'dark' : v < 0.67 ? 'at half value' : 'bright'}`;
    headline(ctx, `$H = ${H.v}$, $S = ${S.v}$, $V = ${V.v}$: ${what}.`);
    ro.set(`(H, S, V) = (${H.v}, ${S.v}, ${V.v}) \\quad \\begin{bmatrix} R \\\\ G \\\\ B \\end{bmatrix} = ${colT(c.map((x) => Math.round(x)), 0)}`);
  }
  still(d, draw);
})();

/* Figure 3.3.7 + 3.3.8: the 8 × 8 block in its colours, its luminance values on one grey scale, and the
   luminance rebuilt from the Fourier coefficients kept under a quality threshold, the difference from the
   original written in each cell. The computation is the book's: the coefficients of the columns, then of
   the rows, G = P^-1 L P^-T; every coefficient whose absolute value is below the threshold is set to zero
   and the rest are rounded to integers; the block is rebuilt as P G' P^T and the difference rounded. That
   reproduces the book's two matrices (12 and 5 nonzero coefficients at thresholds 2 and 4) and both of its
   difference tables entry for entry. The greys and the pixel colours are facts. Still: no clock. */
(function () {
  const d = sim('sim-pixel-block', 620);
  const CELL = 42, GW = 8 * CELL, GX = [60, 532, 1004], GY = 146, LY = GY - 22;
  const G = matmul(matmul(P8I, LUM), transpose(P8I));
  const t = ctl(d.controls, { label: '\\text{threshold}', cls: '', key: 't', min: 0, max: 20, step: 1, value: 2, unit: '', dec: 0, aria: 'the quality threshold: Fourier coefficients smaller than it are set to zero', specials: [{ at: 2, label: 'high quality' }, { at: 4, label: 'low quality' }] });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  const grey = (v) => rgbFact(v, v, v);
  function rebuild(th) {
    const H = G.map((r) => r.map((g) => (Math.abs(g) < th ? 0 : Math.round(g))));
    const kept = H.flat().filter((v) => v !== 0).length;
    const Lr = matmul(matmul(P8, H), transpose(P8));
    const diff = LUM.map((r, i) => r.map((v, j) => rd(v - Lr[i][j], 0)));
    const maxd = Math.max(...diff.flat().map(Math.abs));
    return { H, kept, Lr, diff, maxd };
  }
  /* an 8 × 8 grid at x0 with each cell filled by fill(i, j) and labelled by lab(i, j) */
  function grid(ctx, x0, fill, lab, name) {
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      const x = x0 + j * CELL, y = GY + i * CELL;
      ctx.fillStyle = fill(i, j); ctx.fillRect(x, y, CELL, CELL);
      ctx.strokeStyle = alpha(PAL.ink, 0.3); ctx.lineWidth = 1; ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
      hits.push({ x: x + CELL / 2, y: y + CELL / 2, r: CELL / 2 - 2, name: name(i, j) });
    }
    if (lab) for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
      text(ctx, lab(i, j), x0 + j * CELL + CELL / 2, GY + i * CELL + CELL / 2, PAL.ink, { size: 15, weight: 600, align: 'center', base: 'middle', bg: alpha(PAL.panel, 0.78) });
    }
  }
  function draw() {
    const { ctx } = begin(d.c);
    const ink = PAL.ink, mu = PAL.muted;
    const th = t.v, { kept, Lr, diff, maxd } = rebuild(th);
    hits = [];
    text(ctx, 'the block', GX[0] + GW / 2, LY, ink, { size: 22, weight: 600, align: 'center' });
    text(ctx, 'its luminance', GX[1] + GW / 2, LY, ink, { size: 22, weight: 600, align: 'center' });
    text(ctx, `rebuilt from ${kept} coefficient${kept === 1 ? '' : 's'}`, GX[2] + GW / 2, LY, ink, { size: 22, weight: 600, align: 'center' });
    grid(ctx, GX[0], (i, j) => rgbFact(RED[i][j], GREEN[i][j], BLUE[i][j]), null, (i, j) => `pixel in row ${i + 1}, column ${j + 1}: R, G, B = ${RED[i][j]}, ${GREEN[i][j]}, ${BLUE[i][j]}; its luminance is ${LUM[i][j]}`);
    grid(ctx, GX[1], (i, j) => grey(LUM[i][j]), (i, j) => String(LUM[i][j]), (i, j) => `row ${i + 1}, column ${j + 1}: luminance ${LUM[i][j]}`);
    grid(ctx, GX[2], (i, j) => grey(Lr[i][j]), (i, j) => numT(diff[i][j], 0), (i, j) => `row ${i + 1}, column ${j + 1}: rebuilt luminance ${rd(Lr[i][j], 0)} against the original ${LUM[i][j]}, a difference of ${numT(diff[i][j], 0)}`);
    text(ctx, 'the difference, original minus rebuilt, in each cell', GX[2] + GW / 2, GY + GW + 24, mu, { size: 17, align: 'center' });
    text(ctx, 'the luminance of each pixel', GX[1] + GW / 2, GY + GW + 24, mu, { size: 17, align: 'center' });
    /* the grey scale the two right-hand grids share: luminance 120 to 190, a stretch of 0 to 255 */
    const lx1 = GX[1], lx2 = GX[2] + GW, ly = GY + GW + 56;
    const n = 70; const w = (lx2 - lx1) / n;
    for (let k = 0; k < n; k++) { ctx.fillStyle = grey(120 + 70 * (k + 0.5) / n); ctx.fillRect(lx1 + k * w, ly, w + 0.6, 16); }
    ctx.strokeStyle = alpha(ink, 0.35); ctx.lineWidth = 1.5; ctx.strokeRect(lx1, ly, lx2 - lx1, 16);
    [120, 140, 160, 180].forEach((v) => { const x = lx1 + (v - 120) / 70 * (lx2 - lx1); line(ctx, x, ly + 16, x, ly + 22, mu, 1.5); text(ctx, String(v), x, ly + 38, mu, { size: 17, align: 'center' }); });
    text(ctx, 'luminance, on the scale 0 to 255', lx1 - 16, ly + 8, mu, { size: 17, align: 'right', base: 'middle' });
    const pct = Math.round(100 * kept / 64);
    const h = th === 0
      ? `Threshold 0: all 64 coefficients kept and rounded (${kept} are nonzero); rounding alone changes the luminance by at most ${maxd}.`
      : `Threshold ${th}: ${kept} of 64 coefficients kept, ${pct}% of the data; the rebuilt luminance is off by at most ${maxd}.`;
    headline(ctx, h);
    const note = th === 2 ? 'the book’s high-quality setting: 12 coefficients, a difference of at most 7' : th === 4 ? 'the book’s low-quality setting: 5 coefficients, a difference of at most 9' : `the largest difference between the original and the rebuilt luminance is ${maxd}`;
    ro.set(`\\frac{${kept}}{64} \\approx ${pct}\\% \\text{ of the Fourier coefficients recorded}`, note);
  }
  still(d, draw);
})();

/* the frame the two Fourier figures share: i from 0 to 7 across, the values up */
function stemFrame(ctx, box, yr, ny) {
  return axes(ctx, box, [-0.5, 7.5], yr, { xl: 'component i', yl: '', nx: 8, ny, nice: true, fx: (q) => (Number.isInteger(q) && q >= 0 && q <= 7 ? fmt(q, 0) : ''), fy: (q) => fmt(q, Number.isInteger(q) ? 0 : 1) });
}
/* eight values as points on stems from the zero line, the curve they sample faint behind them */
function stems(ctx, ax, f, vals, color, k = 1) {
  const { X, Y, box } = ax, y0 = clamp(Y(0), box.t, box.b);
  ctx.save(); ctx.beginPath(); ctx.rect(box.l, box.t, box.r - box.l, box.b - box.t); ctx.clip();
  ctx.save(); ctx.globalAlpha *= 0.45;
  ctx.strokeStyle = PAL.muted; ctx.lineWidth = 2.5; ctx.beginPath();
  for (let s = 0; s <= 160; s++) { const tt = -0.5 + 8 * s / 160, x = X(tt), y = Y(f(tt)); if (s === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
  ctx.stroke(); ctx.restore();
  ctx.save(); ctx.globalAlpha *= k;
  vals.forEach((v, i) => { line(ctx, X(i), y0, X(i), Y(v), alpha(color, 0.45), 2.5); dot(ctx, X(i), Y(v), color, true, 9); });
  ctx.restore();
  ctx.restore();
}

/* Figure 3.3.9: the Fourier basis vectors v_0, …, v_7 of R^8, one at a time, as the author draws four of
   them: the eight components as points on stems and the cosine they sample behind them. j is a choice;
   a change bends the curve and slides the points. Still. */
(function () {
  const d = sim('sim-fourier-basis', 520);
  const BOX = { l: 110, r: 1310, t: 110, b: 430 };
  const j = choice(d.controls, { label: 'j', key: 'j', value: '0', aria: 'which basis vector is drawn', options: Array.from({ length: 8 }, (_, k) => ({ value: String(k), label: `v${SUB[k]}` })) });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  function draw() {
    const { ctx } = begin(d.c);
    const vc = C('vector');
    const jj = +j.value, g = ease.smooth(arrival(d));
    const f = (tt) => j.mix((v) => basis(+v, tt));
    const vals = Array.from({ length: 8 }, (_, i) => f(i));
    hits = [];
    const ax = stemFrame(ctx, BOX, [-1.25, 1.25], 0);
    [-1, 1].forEach((v) => { line(ctx, BOX.l, ax.Y(v), BOX.r, ax.Y(v), alpha(PAL.ink, 0.12), 1.5, [10, 10]); text(ctx, fmt(v, 0), BOX.l - 10, ax.Y(v), PAL.muted, { size: 17, align: 'right', base: 'middle' }); });
    text(ctx, '0', BOX.l - 10, ax.Y(0), PAL.muted, { size: 17, align: 'right', base: 'middle' });
    stems(ctx, ax, f, vals, vc, g);
    vals.forEach((v, i) => hits.push({ x: ax.X(i), y: ax.Y(v), r: 16, name: `component ${i} of v${SUB[jj]}: cos((2·${i} + 1)·${jj}π/16) = ${numT(basis(jj, i), 2)}` }));
    text(ctx, `$${VMAC[jj]}$`, BOX.r - 14, BOX.t + 26, vc, { size: 24, weight: 600, align: 'right', tex: true, bg: PAL.panel });
    const h = jj === 0 ? `$\\kvecvzero$: every component is $\\cos 0 = 1$, so the vector is constant.`
      : jj === 1 ? `$\\kvecvone$ runs through half a period of the cosine over the eight components: it varies relatively slowly.`
        : jj === 7 ? `$\\kvecvseven$ changes sign at every step: it varies as rapidly as a vector of eight components can.`
          : `$${VMAC[jj]}$ runs through ${jj} half-periods of the cosine over the eight components: ${jj <= 3 ? 'a moderate variation' : 'a rapid variation'}.`;
    headline(ctx, h);
    ro.set(`${VMAC[jj]} = ${rowT(Array.from({ length: 8 }, (_, i) => basis(jj, i)), 2)}`, `the $i$th component of $${VMAC[jj]}$ is $\\cos\\dfrac{(2i + 1)\\cdot ${jj}\\pi}{16}$`);
  }
  still(d, draw);
})();

/* Figure 3.3.10 + 3.3.11 + 3.3.12 (with the unnumbered column graph): the vector x built from its Fourier
   coefficients. The author's three cases as a choice: x = F_0 v_0 with F_0 from 5 to 8, and x = 5v_0 + F_3 v_3,
   x = 5v_0 + F_7 v_7 with the coefficient from −1.5 to 1.5 (his ranges and initial values); a fourth case,
   the first column of luminance values with its real coefficients 151.6, 20.0, 15.3, …, rebuilt from its
   first n coefficients under a slider for the terms kept, the true column as hollow marks (n = 8 is the
   book's unnumbered graph, n = 6 is Activity 3.3.3 (g)). One slider relabels with the case; the frame
   runs −3 to 10 in the author's cases (his window) and 0 to 255 for the column. Still. */
(function () {
  const d = sim('sim-fourier-coefficients', 560);
  const BOX = { l: 110, r: 1310, t: 110, b: 470 };
  const CASES = { f0: { label: 'F₀v₀', j: 0, min: 5, max: 8, value: 5, base: 0 }, f3: { label: '5v₀ + F₃v₃', j: 3, min: -1.5, max: 1.5, value: 0, base: 5 }, f7: { label: '5v₀ + F₇v₇', j: 7, min: -1.5, max: 1.5, value: 0, base: 5 }, col: { label: 'the column x' } };
  let Fs = null, n = null;
  const kase = select(d.controls, {
    label: 'vector', key: 'case', value: 'f0', aria: 'which vector is built', options: Object.entries(CASES).map(([value, c]) => ({ value, label: c.label })),
    onInput: (v) => {
      const c = CASES[v];
      if (v === 'col') { Fs.show(false); n.show(true); }
      else { Fs.relabel(`F_${c.j}`, `the Fourier coefficient F${SUB[c.j]}`); Fs.range({ min: c.min, max: c.max, step: 0.1, value: c.value, unit: '', dec: 1 }); Fs.show(true); n.show(false); }
    },
  });
  Fs = ctl(d.controls, { label: 'F_0', cls: '', key: 'F', min: 5, max: 8, step: 0.1, value: 5, unit: '', dec: 1, aria: 'the Fourier coefficient F₀' });
  n = ctl(d.controls, { label: '\\text{terms kept}', cls: '', key: 'n', min: 1, max: 8, step: 1, value: 8, unit: '', dec: 0, aria: 'how many of the Fourier coefficients F₀, F₁, … are kept', specials: [{ at: 6, label: 'F₆ and F₇ dropped' }] });
  n.show(false, { ms: 0 });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  /* the coefficients of each case, as a function of the live sliders, so the choice can blend them */
  const coefsOf = (v) => {
    if (v === 'col') return COL0_F.map((c, j) => (j < n.v ? c : 0));
    const c = CASES[v], out = new Array(8).fill(0); out[0] = c.base; out[c.j] += Fs.v; return out;
  };
  const sumAt = (co, tt) => co.reduce((s, c, j) => s + c * basis(j, tt), 0);
  function draw() {
    const { ctx } = begin(d.c);
    const vc = C('vector'), ink = PAL.ink;
    const v = kase.value, g = ease.smooth(arrival(d)), k = kase.k;
    const co = kase.mix((w) => coefsOf(w));
    const yr = kase.mix((w) => (w === 'col' ? [0, 255] : [-3, 10]));
    const colCase = v === 'col';
    hits = [];
    const ax = stemFrame(ctx, BOX, yr, 5);
    const f = (tt) => sumAt(co, tt);
    const vals = Array.from({ length: 8 }, (_, i) => f(i));
    stems(ctx, ax, f, vals, vc, g);
    /* the column case: the true column as hollow marks where the rebuilt points miss them */
    if (colCase || kase.from === 'col') {
      const a = kase.a('col');
      ctx.save(); ctx.globalAlpha *= a;
      COL0.forEach((x, i) => { if (Math.abs(x - vals[i]) > 0.6) dot(ctx, ax.X(i), ax.Y(x), ink, false, 8); });
      ctx.restore();
    }
    vals.forEach((val, i) => hits.push({ x: ax.X(i), y: ax.Y(val), r: 16, name: colCase ? `component ${i}: rebuilt ${numT(val, 1)}, the original luminance ${COL0[i]}` : `component ${i} of x: ${numT(val, 2)}` }));
    text(ctx, '$\\kvecx$', BOX.r - 14, BOX.t + 26, vc, { size: 24, weight: 600, align: 'right', tex: true, bg: PAL.panel });
    if (k >= 1) {
      if (colCase) {
        const nn = n.v, maxd = Math.max(...COL0.map((x, i) => Math.abs(x - vals[i])));
        const terms = COL0_F.slice(0, nn).map((c, j) => `${j === 0 ? '' : c < 0 ? ' - ' : ' + '}${num(Math.abs(c), 1)}${VMAC[j]}`).join('');
        headline(ctx, nn === 8 ? `From all eight Fourier coefficients the column is rebuilt exactly: $F_0 = 151.6$ is its average and the rest are small.`
          : `From its first ${nn} Fourier coefficient${nn === 1 ? '' : 's'} the column is rebuilt to within ${num(maxd, 1)} of every luminance value${nn === 1 ? ': the constant vector of its average' : ''}.`);
        ro.set(`\\kvecx ${nn === 8 ? '=' : '\\approx'} ${terms} = ${rowT(vals, 0)}`, nn === 8 ? 'the first column of luminance values, written in the Fourier basis' : `the largest difference from $\\kvecx$ is ${num(maxd, 1)}`);
      } else {
        const c = CASES[v], Fv = Fs.v;
        const h = v === 'f0' ? `$\\kvecx = F_0\\kvecvzero$ with $F_0 = ${num(Fv)}$: every component is ${num(Fv)}, so $\\kvecx$ is constant.`
          : Fv === 0 ? `$F_${c.j} = 0$: $\\kvecx = 5\\kvecvzero$ is constant at 5.`
            : `$F_${c.j} = ${num(Fv)}$ adds a ${c.j === 3 ? 'slow' : 'rapid'} variation of size ${num(Math.abs(Fv))} about the level 5.`;
        headline(ctx, h);
        const lhs = v === 'f0' ? `${num(Fv)}\\kvecvzero` : `5\\kvecvzero ${Fv < 0 ? '-' : '+'} ${num(Math.abs(Fv))}${VMAC[c.j]}`;
        ro.set(`\\kvecx = ${lhs} = ${rowT(vals, 2)}`, v === 'f0' ? 'the first coefficient sets the level of every component' : `the components of $${VMAC[c.j]}$ are values of a cosine that completes ${c.j} half-periods over the eight components`);
      }
    }
  }
  still(d, draw);
})();
};
