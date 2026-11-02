/* Figures for section 7.5 Using Singular Value Decompositions. */
window.OMNISTAX_FIGURES = window.OMNISTAX_FIGURES || {};
window.OMNISTAX_FIGURES['7.5'] = function (root, F) {
const { C, PAL, alpha, ctl, choice, begin, axes, line, dot, text, headline, register, readout, hover, fmt } = F;
const sim = (id, H) => F.sim(root, id, H);
const still = (d, draw) => register(d.fig, { update: () => {}, draw });
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
/* a number as the figure writes it: at most p decimals, no trailing zeros, never −0 */
const rd = (v, p = 2) => { const m = 10 ** p, r = Math.round(v * m) / m; return Object.is(r, -0) ? 0 : r; };
const num = (v, p = 2) => String(rd(v, p));
const numT = (v, p = 2) => num(v, p).replace('-', '−');
const SUB = (k) => String(k).replace(/\d/g, (c) => '₀₁₂₃₄₅₆₇₈₉'[c]);
const big = (v) => Math.round(v).toLocaleString('en-US');
/* the book's typed symbols with a live index, for the readouts */
const MAT = (s) => `\\htmlClass{kv-matrix}{${s}}`;
const VEC = (s) => `\\htmlClass{kv-vector}{${s}}`;
const SIG = (s) => `\\htmlClass{kv-eigenvalue}{${s}}`;

/* the data the two figures embed (generated from ch07/data by the section's build script) */
const LETTER = '111111111111111111111111111111111111111111111111111111111111111111111111111110000000000011110000000000011110000000000011110001111100011110001111100011110001111100011110001111100011110001111100011110001111100011110001111100011110001111100011110001111100011110000000000011110000000000011110000000000011111111111111111111111111111111111111111111111111111111111111111111111111111';
const NOISE = [9866,9153,9236,9745,9505,9551,9348,9211,9906,9972,9164,9567,9238,9998,9555,9278,9771,9055,9099,9969,9975,9459,9061,9619,9783,9578,9971,9778,9562,9504,9767,9769,9781,9540,9710,9979,9162,9444,9358,9814,9007,9140,9879,9667,9279,9289,9064,9578,9170,9330,9697,9412,9118,9154,9495,9411,9965,9757,9203,9586,9827,9451,9297,9326,9625,9561,9492,9222,9479,9607,9510,9970,9957,9297,9017,9407,9606,170,502,982,771,540,860,232,514,952,578,459,9731,9452,9043,9994,784,820,886,741,809,519,561,426,56,870,570,9800,9495,9515,9643,346,538,623,612,458,28,230,177,584,861,798,9203,9184,9745,9158,673,83,17,9985,9244,9750,9891,9375,344,70,160,9473,9832,9727,9288,455,322,474,9976,9613,9579,9812,9891,900,510,209,9394,9183,9979,9982,146,719,160,9295,9322,9455,9779,9024,798,517,223,9351,9605,9424,9679,631,59,299,9032,9124,9694,9141,9690,939,744,416,9748,9992,9121,9962,819,962,570,9828,9132,9026,9296,9491,378,347,206,9326,9567,9806,9896,666,296,500,9675,9128,9100,9982,9799,328,987,783,9661,9787,9326,9162,932,344,882,9313,9516,9014,9765,9275,85,170,911,9787,9241,9400,9159,368,340,291,9133,9396,9046,9113,9865,551,104,39,9927,9134,9212,9171,341,615,782,9622,9429,9776,9918,9733,891,564,925,9542,9723,9213,9172,12,670,92,115,885,40,240,988,421,116,167,9759,9256,9897,9089,378,970,909,294,253,477,100,652,40,11,983,9704,9403,9550,9687,63,913,970,970,111,215,618,980,543,688,662,9741,9458,9693,9754,9919,9719,9017,9552,9348,9357,9059,9610,9693,9673,9683,9153,9106,9697,9666,9456,9421,9404,9755,9980,9756,9928,9449,9929,9925,9365,9709,9208,9507,9137,9846,9499,9205,9923,9051,9827,9224,9015,9178,9680,9893,9486,9081,9707,9106,9858,9090,9968,9684,9097,9196,9093,9159,9254,9310,9822,9567,9842,9285,9332,9747,9936,9037,9192,9451,9459,9149,9547,9604,9661,9742,9976,9354];
const COURT = {"all":{"votes":"+++++-++++++++++++++++++++++++++++++---+-+++++--++++++++++++++++++++++++++++++++++++++++++-+-+-+++-+++++-++++++++--++++++++++++--++++++----+++++++++++++++++++-+++++++-+++++++++++++---++++++---+++++++++++-+++++++++++++--++++--+++++-+-++++++++++++-++++++++++++++++--+-+-++++++++++++++++++++++++++++++++++++++++++-+++-+++++-++++++++-+-+++++++++++++++++++++++++++++++++-+-+--+++++++++++-+-+-----+++++++++++++++++++--++-+--++++++++++----+++++++++++++++++++++++++++-+++-+-+++---+++++++++++++++++++-++----+-++++++++++++++++++++++++-+++++++++++++++-+-+++++++++++-++++++++----++++++++++++++----+++++-+++++++++++++++++++++++-+-+-++++++++++++++++-+++---+++-++++++---+-+++++----++++++++++++++++++++++++++++---++++++++-+---+++++---++---++++++++++++++++++++-+-++++++----+++++----+++++----++++++++++++++++++++++++++++++++-++++-++++++-+++++++++-+-+++++++++++++++++++++++++++++++++++++++++++--++++++---++++++++++++++++++++++++++-++-++++++++++++++++++++++++++-++++++++-++-++++++++++++++-++++++++---++++++++++++++++++++++-+--+-+++++++++++++++++++--+-+++++++++++++++++++++++++++--------+++++++++++++++++++++++----++++++++++-++++++++---+++++++++++++++++++---+-+++++++-+-++++++++-++++++++++++++++++++++++++++++---++++-+---++++++-+-+-++++++-+++++++-+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++----+++++------+++++++++++---+-+++++----++++-+++-++++++++++++++----+++++-++-++++++++++++++-++++++++-++++++++-+-++++++-+++---++++++---+-+++++++++-+-+++++++++++--+++++++--+++++++++-+++-+-++++++-++++++-+-++++++++++++++++++++++++++++++++++++++++++-+++++++++++++++++-+++++++++++++--+-++++---+++++++++++++++---+-++++++++++++++++++++++++++++++++++++-+++++++++++++++++-++++++++++++++++++++++++++++++++++++++++---++++++++-+-++++++++++++++++++++++++++++++++++++++++++++-++++++++-++-++++++++++++++++++++++++++++-++++++-+++++++++++++++++++--+-++-+++++++++++++++++++++++++++++++++-+++-++++++++++++++++++++++---+++++++++++++++----+++++++++++++++++++++++--+++++++++++++++--+--+++++-+-----++++-+++++++++++++++++++++++++++++++++++++++++++++++++++-+--+++++----+++++++++-+++-++--+--+-++++-+++++++-+++++++++++++++++++++++++++++++++++++++++-+++---+++++++++++----+--+-+++++++++----++++++++++++++----+++++--------++++++++++--------++++++++++-+-+---+++-+++----++++---+++++++++++++++++++++++++++++-++-++++++++++++++----++++++++++++++-++-+++++-+++++++++++++++++++++++++++-+-+++++++++++++++++++++++-++++++++++++++++++++++++++++++++++++++++++++-+-++++++++++++++++++++++++++++-++-++-++++++++++++++++-+---++-+++-+++++++++++++++----+++++-++----++++++++++++++++++++-++++--+-+++++++++++++++++---+-++++++++++++++-+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-+++++----++++++++++-++++++++++++++++++++++-+++---++++++++++++++++++++++++-++++++++++++++++++++++++++-+--++++++++++--+++++++++++++++++++++---++++++++++++++++++++++++++++++++-------+-++++++++++++++--+++++++--++++++++++++++++++++---++++++++++++++++++++++++++++++-++-+-++--++-+++++++++++++++++-++-++++++++++--+-++++++++++++++++++++++++++++++++++++-+++++++++++++++++++++--++++--+++++++++++++++------+++++-++++++++++---+-++++++++++++++++++----+--+++-++--+--+++++++++----++++++++++--+-+++++-++-+++-+++++----++++++-++---+-+++++++++++--+-+++---++--+++++++--++++++++++++++++++++++++++++++++++++++++++++++++++++++++---++++++++++++++++++++++++++++++++++++++++++----+++++-++++++++-+++-+++-+++-+++++++++++++++++++++++++++++-+++++++++++++++++++++---+++++++++++++++++++++++++++++++++-+++--+++++++++++++++++++++++++++++-+++++--+++++---+-+++++++++-++++++++-+++++++++++++++++++++----+++++-++--+++-+++++-++++-+++-+++++++++++++++++---+---+-++++---+++++++++++++++++++++++++++++++++++++++++++++++-++++++++++++-+-+++++++++++++++++++++++++++++-+-++++++++++++++++++++++++-+++----+++++++++++++++++-+-+--++++++++++++++-++++++++-++++++--++-++++++-+--+-++++--+---+++++++++++++++-++-+++-+++++++++++++++++++----+++++---+-+++++++-++-+++++++----+++++-+-++++++----++++-+++-+++++-++++++++-++-+++++-++-+++++----+++++-++----+++++++++++----+++++----+++++----+++++-++-+++++-++++--+++++++++++-++++++++-++++++++-++++++++-+++++++++++++++++-++++++++++++++++++++++++-+-+++++++++++++++++----++++++++++++++----++++++++++++++++++++++++++++++++----++++++++++++++----++++++++++++++----+---+++++++++++++++++++++++++++++++++++++---++++++-+-++++++++++++++++++++---+-++++++++++++++++++--+++++++++++++++----++++++++++++++++++++++++++++++++---+++++++++++++++---++-++++++-+++++-+-+---++++++++++++++++++++-++-++++++++++--+++++++++++--++-++--++-++++++-+--+++++----+--+++++++-+++++++++++++++++++++----+++++++++--++-+++-+++++++++++-++---+++++++++++++++++++-+++++++++-+-+-+++--+-++++-+++++++++++++++++++++++----+++++++++++++++++++++++-------+++++++++++----+++++++++-+-+-+++++--++++++-++--+++-+++++-+-++++++----+---++++++++++---+----++++++++++++++++++++++++++++++++++++++++++++++++++---++++++++++++++++++++++++++++++++++++++----+++++----+++++++++++++++++-+++++++++-++-+-++++++++-+++++++++++++++++++++----+++++++++++++++++++-+++++++++++++++++----+++++++++++++++++++++++++++++++++++++++++++++---+-++++++++++++++++++++++++++++++++--+++++++++++++++---+++++++++++----+++++-++-+++++----+++++++++++++++++++++++++++----+++++++++++++++++++----++++--+--+++++----+++++----++++++++++++++++-++--++-++-+++++-+++---++++++++++++++++++++----++++++++++--+++++++++++----++++++++++++++++++++++++++++++++++++---++++++++++++++++++++-++++--+-++++-++---+++++++-+---+++++---++++++++++++++++++++++++++--++++++++++-+++++++----+++++---+-++++---+-+++++++++++++++++-++------++++++++++-++-+++++----+++++----+++++--------+++++++++++++++++++++++++++++++++++++----++++-+-++++++++++++++++++++++++++++++++++----++++++++++++++--------++++++++++++++---++++++++++++++++---++++++--+++++++++++++++++++--++-+-++--++++++++++++++++++++++++++--+-+---+++++++++++++++++++-+++++++-+---++++++++++++++----+++++----+++++++++++++++++++++++++++--++-+++++--++-+++---++++++-++++-+--++++++--++++++----+++++-+++++++++++++++++++++----++++++++++-+++++++++++++++++----+-++++++++++++++++++++++++++---++++++++++----++++++++++++++++++--+--+++++++++++++-++++++++++++++++++++++---+----++++++--+++-++++++++++++++++-+-+---++++++----+++++++++++++++-++-+++++----+++++++++++++++-++---+-+++-+++++++++++++++++++++++++++-------+++++++++++----++++----++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-++++++++----++++++++++--+-+++++++++-++-+++++-++++++++++++++++++++-++-++++++++++++++++++++-+++++++++++++--++++++----+++++++++---+++++++++++++++++++++++++----+++++----+++++-+--+++++++++-++--+++-+++++++++++++++-------+++++++-+-++++++-++-+++++++++++++--+++++++--++++-++++++++--+++++++++++++++++++++++++++++++++++++++++----+---+-++++++++++++++++++++++++++++++-++--+++++++++++++++++++++++++++++++++++++++++---++++++++-+-+-+++++-+++-+++++++++-+--++++++--++++++++++++++++++++++++++-++++++--+++++--+++++++++++++++++++++++++++++++++++++--+++++++--+-+++++++++---++++++---+----++++++--++-+-+-+---+++++++++----+--++++++---++++++----++++++++--+++-++++++++++++++++++++++++++++++++++++----++++++++++++++++++++++++++++++++++++++++++++++---+++++++++++++++++++----++++++++++++++++++++++++++++++++----++++++---++++++++++-+--+--+++++++--++++++++++++++++++++++++++++++++++++++-++++++++++++++++++++++++++++++++++++++++++++-++++++++++++++++++++++++++---++-++++-+++++++++++++++++-+++++++----++++++++++++-+--+++--+++++++++++++++++++++++++--++++++--+--++++----++++++++++----++++++++++++++--++++++++++++++++-----+--++++++++++++++++++++++++++++++++++++++++++++++++++----+++++++-+++++++++++----++++++++++++++++--++++++++----++++++-++--+++-+++++----++++++--++++++----+++++-------++++++++-++++++---+-+++++++++------++-+++----+++++++++++++++++++++++++--+++++++-+++++++++++++++++++++-+++++++++++++++++---++++++-+-++++++-+++++++++++++--++--+++++++-----+-++++++++++++++++++++++++-++-+++-----+-+++++++++++++-+-+++++++++-+++++++++++++++++++++++----++++++++++-++++++++++++++++++++++-+-+-+-++++++++++++++++++++-++++---+++++----+--++++++-+-+--+++++++++++++++-+--+++++++---++--++++++++++---+-+++++++++++++++++++--++++++-+-+-++++---++++++--++-++++++-+++++++++++++++++++++++++++++++++---+++++++++++++++++++++++++++++--------++++++++++++--+++++++++-++--++++---+-+++++++++--++++++--+--++++++++++--+++++++++++--++++++----++++++-+-++++++--------+++++++++++++++-++++--+","U":[[-0.3543,0.3003,0.2026,0.1285,-0.2166,0.1939,-0.7122,0.3537,-0.0993],[-0.3207,0.3873,-0.4175,-0.2069,0.1251,0.0932,0.188,-0.1211,-0.6751],[-0.3167,0.3994,-0.4365,-0.1021,0.1373,0.0075,0.0592,0.0315,0.7182],[-0.369,0.1646,0.2439,0.4982,-0.5147,-0.0248,0.4979,-0.1214,0.0278],[-0.3677,0.108,0.5284,0.0059,0.5989,-0.3776,-0.0381,-0.2666,0.0041],[-0.247,-0.4574,-0.404,0.653,0.3392,0.0654,-0.1165,0.0541,-0.0656],[-0.3415,-0.3342,-0.0895,-0.2987,-0.1753,-0.5705,0.127,0.5468,-0.0565],[-0.3298,-0.3715,-0.1262,-0.2732,-0.3506,-0.0237,-0.3148,-0.6599,0.0678],[-0.337,-0.3204,0.2611,-0.3029,0.1619,0.6929,0.2753,0.1898,0.076]],"s":[67.9726,42.6913,20.8351,18.1554,16.6126,15.1722,14.0518,12.7915,11.19]},"five":{"votes":"---+-++++-+-+-+++-----++++++--++++--+--+-+-++----++++++++++-------+-+++++++++----+++++-------+++-++++++---+-+++++----+++-+---++++++----+++++----+++++----+++-+--+-+++++--------+++++----+++++---+-++++---++++-++++++----+++++----++++---+-+++++----+++++-------+-++++---+-+++++--+-++-++++++----++++--+-----++++-++++++-----+++-++--+++++----+++++----+++++----+++++--------++++++++++--------+++++---+++-+++----+++++++++----+++++----++++---+-----++++++-+++---++++++-------+-++++--++++--++++++-------+-+++++++++------+--+++++++++----+++++-------+-+++++-+++---++++++-------+-++++----+++++-++--+++----+-++++----++++++++-+-+------+++++---+-+++++++++----+++++----+++++----+++++----+++++----+++++----+++++----+++++----+++++----+++++----+++++----+---+-++++++++-----++--++-++++++----+++++------++-+++-++-++---+--+-++++-+++++----+++++----+++++-----++--+++-+++++--------++++++++++----+++++--------++++++++++-------+-+++++++++----+++++--------++++++++++----++++--+--+++++----+++++----+--++-++-+++++----+++++-----++---+++++++-+-------+++++---+-++++---+-++++----++++++++++----+++++----+++++--------++++++++++----+++++----+++++--------+++++++++-+---+++++----+++++-----++++-+--+++++--------++++++++++----+++++------+--++++----+++++----++++++----++++++-++---++++++----+++++----++++----++++++--------++++++++++----+++++-----++--+++-----++++++++++----+---+-+++--+++++------++++++--++-+-+-+---+++++++++--------+++++----+++++----+++++----++++++++++------+--++++----++++++++++----+++++--------++++++++++-----++--+++-+++++----+++++----+++++-------+-+++++++++------++-+++-+--++--+++++++-----++-+++-----+-++++----++++++-+-+-+-++-++++---+++++-----+-+--+++++++---+-+++++--------+++++---+-++++++++--+--++++----++++++--------+++++","U":[[-0.3617,0.0631,-0.1436,0.4583,0.0372,0.1955,0.5283,-0.2285,0.5134],[-0.355,-0.2373,0.3036,0.0385,-0.0868,0.1341,-0.698,-0.1932,0.417],[-0.3485,-0.2094,0.3599,-0.2434,0.1421,-0.2801,0.2657,0.6567,0.2133],[-0.2824,-0.1715,-0.7948,-0.4183,-0.1415,0.1195,-0.1023,0.1616,0.1152],[-0.1883,0.8996,0.1055,-0.29,-0.1599,0.0497,-0.0798,0.0618,0.1475],[0.363,-0.0719,0.0107,-0.4541,0.0842,-0.4424,0.141,-0.4304,0.4987],[0.357,-0.0632,0.1511,-0.285,0.2891,0.7792,0.0895,0.1458,0.2111],[0.3569,-0.0934,0.0607,0.1348,-0.8368,0.0511,0.0712,0.2699,0.2477],[0.3463,0.198,-0.2969,0.4056,0.3667,-0.2078,-0.3366,0.4122,0.3569]],"s":[34.1795,12.9982,10.7681,8.9117,6.8487,6.2929,5.7951,5.2917,3.3692]}};

/* ---------- the symmetric eigenproblem: Householder tridiagonalisation and the implicit QL method
   (the Jama routines tred2 and tql2). G is n × n as an array of rows; returns the eigenvalues d and
   the eigenvectors as the columns of V, in ascending order of eigenvalue. ---------- */
function symEig(G) {
  const n = G.length, V = G.map((r) => Float64Array.from(r)), d = new Float64Array(n), e = new Float64Array(n);
  for (let j = 0; j < n; j++) d[j] = V[n - 1][j];
  for (let i = n - 1; i > 0; i--) {
    let scale = 0, h = 0;
    for (let k = 0; k < i; k++) scale += Math.abs(d[k]);
    if (scale === 0) {
      e[i] = d[i - 1];
      for (let j = 0; j < i; j++) { d[j] = V[i - 1][j]; V[i][j] = 0; V[j][i] = 0; }
    } else {
      for (let k = 0; k < i; k++) { d[k] /= scale; h += d[k] * d[k]; }
      let f = d[i - 1], g = Math.sqrt(h);
      if (f > 0) g = -g;
      e[i] = scale * g; h -= f * g; d[i - 1] = f - g;
      for (let j = 0; j < i; j++) e[j] = 0;
      for (let j = 0; j < i; j++) {
        f = d[j]; V[j][i] = f; g = e[j] + V[j][j] * f;
        for (let k = j + 1; k <= i - 1; k++) { g += V[k][j] * d[k]; e[k] += V[k][j] * f; }
        e[j] = g;
      }
      f = 0;
      for (let j = 0; j < i; j++) { e[j] /= h; f += e[j] * d[j]; }
      const hh = f / (h + h);
      for (let j = 0; j < i; j++) e[j] -= hh * d[j];
      for (let j = 0; j < i; j++) {
        f = d[j]; g = e[j];
        for (let k = j; k <= i - 1; k++) V[k][j] -= f * e[k] + g * d[k];
        d[j] = V[i - 1][j]; V[i][j] = 0;
      }
    }
    d[i] = h;
  }
  for (let i = 0; i < n - 1; i++) {
    V[n - 1][i] = V[i][i]; V[i][i] = 1;
    const h = d[i + 1];
    if (h !== 0) {
      for (let k = 0; k <= i; k++) d[k] = V[k][i + 1] / h;
      for (let j = 0; j <= i; j++) {
        let g = 0;
        for (let k = 0; k <= i; k++) g += V[k][i + 1] * V[k][j];
        for (let k = 0; k <= i; k++) V[k][j] -= g * d[k];
      }
    }
    for (let k = 0; k <= i; k++) V[k][i + 1] = 0;
  }
  for (let j = 0; j < n; j++) { d[j] = V[n - 1][j]; V[n - 1][j] = 0; }
  V[n - 1][n - 1] = 1; e[0] = 0;
  for (let i = 1; i < n; i++) e[i - 1] = e[i];
  e[n - 1] = 0;
  let f = 0, tst1 = 0;
  const eps = 2 ** -52;
  for (let l = 0; l < n; l++) {
    tst1 = Math.max(tst1, Math.abs(d[l]) + Math.abs(e[l]));
    let m = l;
    while (m < n) { if (Math.abs(e[m]) <= eps * tst1) break; m++; }
    if (m > l) {
      do {
        let g = d[l], p = (d[l + 1] - g) / (2 * e[l]), r = Math.hypot(p, 1);
        if (p < 0) r = -r;
        d[l] = e[l] / (p + r); d[l + 1] = e[l] * (p + r);
        const dl1 = d[l + 1];
        let h = g - d[l];
        for (let i = l + 2; i < n; i++) d[i] -= h;
        f += h;
        p = d[m];
        let c = 1, c2 = c, c3 = c, s = 0, s2 = 0;
        const el1 = e[l + 1];
        for (let i = m - 1; i >= l; i--) {
          c3 = c2; c2 = c; s2 = s;
          g = c * e[i]; h = c * p; r = Math.hypot(p, e[i]);
          e[i + 1] = s * r; s = e[i] / r; c = p / r;
          p = c * d[i] - s * g; d[i + 1] = h + s * (c * g + s * d[i]);
          for (let k = 0; k < n; k++) { h = V[k][i + 1]; V[k][i + 1] = s * V[k][i] + c * h; V[k][i] = c * V[k][i] - s * h; }
        }
        p = -s * s2 * c3 * el1 * e[l] / dl1; e[l] = s * p; d[l] = c * p;
      } while (Math.abs(e[l]) > eps * tst1);
    }
    d[l] += f; e[l] = 0;
  }
  return { d, V };
}

/* A singular value decomposition of an m × n matrix A (m ≥ n, row-major), from the eigenvectors vᵢ of
   AᵀA: σᵢ = √λᵢ, largest first, and the columns Avᵢ = σᵢuᵢ, so that A_k = Σ_{i ≤ k} (Avᵢ)vᵢᵀ is A
   projected onto the span of v₁, …, v_k, exact for every k however small σ_k is. */
function svdOf(A, m, n) {
  const G = Array.from({ length: n }, () => new Float64Array(n));
  for (let i = 0; i < n; i++) for (let j = i; j < n; j++) {
    let s = 0;
    for (let r = 0; r < m; r++) s += A[r * n + i] * A[r * n + j];
    G[i][j] = G[j][i] = s;
  }
  const { d, V } = symEig(G);
  const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => d[b] - d[a]);
  const sig = order.map((i) => Math.sqrt(Math.max(0, d[i])));
  const vs = order.map((j) => Float64Array.from({ length: n }, (_, i) => V[i][j]));
  const Av = vs.map((v) => { const o = new Float64Array(m); for (let r = 0; r < m; r++) { let s = 0; for (let c = 0; c < n; c++) s += A[r * n + c] * v[c]; o[r] = s; } return o; });
  return { sig, vs, Av };
}

/* ======================================================================================
   Sim: an image rebuilt from its first k singular values. The photograph of Activity 7.5.5 b
   (the book's utah-gray.png, 316 × 310, copied into the book.s media folder for ch07 and read in the page), the letter O
   of part a (25 × 15, rank 3) and its noisy copy of part c (embedded). The decomposition is
   computed once per image in the page; A_k is kept and moved term by term as k changes. The grey
   values are the fact: 0 black, 1 white, on one scale with its legend; A − A_k is a second
   scalar on a second scale (−0.25 black, 0 mid grey, 0.25 white) with its own legend. Still: no
   clock. Panels: A, A_k, A − A_k across; the singular values as stems below.
   ====================================================================================== */
(function () {
  const d = sim('sim-image-rank-k', 900);
  const NAMES = { photo: 'the photograph', letter: 'the letter O', noise: 'the noisy letter O' };
  const pick = choice(d.controls, { label: '\\text{image}', key: 'image', value: 'photo', aria: 'the image rebuilt', options: [{ value: 'photo', label: 'photograph' }, { value: 'letter', label: 'letter O' }, { value: 'noise', label: 'noisy letter O' }], onInput: (v) => { kP.show(v === 'photo'); kL.show(v !== 'photo'); } });
  const kP = ctl(d.controls, { label: 'k', cls: '', key: 'k', min: 1, max: 310, step: 1, value: 20, unit: '', dec: 0, aria: 'k, the number of singular values kept', detents: [1, 10, 20, 50, 100] });
  const kL = ctl(d.controls, { label: 'k', cls: '', key: 'k-letter', min: 1, max: 15, step: 1, value: 3, unit: '', dec: 0, aria: 'k, the number of singular values kept',
    specials: [{ at: () => (pick.value === 'letter' ? 3 : null), label: 'rank 3' }, { at: () => (pick.value === 'noise' ? 3 : null), label: 'the drop-off' }] });
  kL.show(false, { ms: 0 });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);

  /* the three images as row-major matrices with their shapes */
  const DATA = {
    letter: { m: 25, n: 15, A: Float64Array.from(LETTER, (ch) => +ch) },
    noise: { m: 25, n: 15, A: Float64Array.from(NOISE, (v) => v / 10000) },
    photo: { m: 316, n: 310, A: null, failed: false },
  };
  function prepare(key) {
    const D = DATA[key];
    if (D.svd || !D.A) return;
    D.svd = svdOf(D.A, D.m, D.n);
    D.r = D.svd.sig.filter((s) => s > 1e-6 * D.svd.sig[0]).length;
    D.Ak = new Float64Array(D.m * D.n); D.kNow = 0;
  }
  /* A_k moved from the k it holds to k by adding or taking away the terms (Avᵢ)vᵢᵀ */
  function rebuild(D, k) {
    const { Av, vs } = D.svd, n = D.n, Ak = D.Ak;
    const add = (i, sgn) => { const a = Av[i], v = vs[i]; for (let r = 0; r < D.m; r++) { const ar = sgn * a[r], o = r * n; for (let c = 0; c < n; c++) Ak[o + c] += ar * v[c]; } };
    if (k === D.kNow) return;
    if (k > D.kNow) for (let i = D.kNow; i < k; i++) add(i, 1);
    else if (k < D.kNow) { if (D.kNow - k > k) { Ak.fill(0); for (let i = 0; i < k; i++) add(i, 1); } else for (let i = D.kNow - 1; i >= k; i--) add(i, -1); }
    D.kNow = k;
    let mx = 0, ss = 0;
    for (let i = 0; i < Ak.length; i++) { const e = D.A[i] - Ak[i]; mx = Math.max(mx, Math.abs(e)); ss += e * e; }
    D.maxErr = mx; D.rmsErr = Math.sqrt(ss / Ak.length);
  }

  /* the photograph: read once, its decomposition once, then a redraw */
  const img = new Image();
  img.onload = () => {
    try {
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const x = c.getContext('2d'); x.drawImage(img, 0, 0);
      const px = x.getImageData(0, 0, c.width, c.height).data, P = DATA.photo;
      P.m = c.height; P.n = c.width; P.A = new Float64Array(P.m * P.n);
      for (let i = 0; i < P.A.length; i++) P.A[i] = px[4 * i] / 255;
      setTimeout(() => { prepare('photo'); F.redrawAll(); }, 30);
    } catch (err) { DATA.photo.failed = true; F.redrawAll(); }
  };
  img.onerror = () => { DATA.photo.failed = true; F.redrawAll(); };
  img.src = '/media/ch07/utah-gray.png';
  prepare('letter'); prepare('noise');

  /* the two ends of the grey scale as the fact; with facts switched off, ink on the panel */
  const probe = document.createElement('canvas'); probe.width = probe.height = 1;
  const pctx = probe.getContext('2d', { willReadFrequently: true });
  const rgbOf = (css) => { pctx.clearRect(0, 0, 1, 1); pctx.fillStyle = css; pctx.fillRect(0, 0, 1, 1); const p = pctx.getImageData(0, 0, 1, 1).data; return [p[0], p[1], p[2]]; };
  function ends() {
    const black = F.fact('#000000'), white = F.fact('#ffffff');
    return black === white ? [rgbOf(PAL.ink), rgbOf(PAL.panel)] : [rgbOf(black), rgbOf(white)];
  }
  const greyCss = (t, E) => { const [a, b] = E, q = clamp(t, 0, 1); return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * q)).join(', ')})`; };
  /* one offscreen picture per panel, redrawn only when what it shows changes */
  const pics = {};
  function picture(slot, D, vals, toT, sig) {
    let p = pics[slot];
    if (!p) { p = pics[slot] = { c: document.createElement('canvas'), sig: '' }; }
    if (p.sig === sig) return p.c;
    const E = ends(); p.c.width = D.n; p.c.height = D.m;
    const x = p.c.getContext('2d'), im = x.createImageData(D.n, D.m);
    for (let i = 0; i < vals.length; i++) {
      const q = clamp(toT(vals[i]), 0, 1);
      im.data[4 * i] = E[0][0] + (E[1][0] - E[0][0]) * q; im.data[4 * i + 1] = E[0][1] + (E[1][1] - E[0][1]) * q; im.data[4 * i + 2] = E[0][2] + (E[1][2] - E[0][2]) * q; im.data[4 * i + 3] = 255;
    }
    x.putImageData(im, 0, 0); p.sig = sig;
    return p.c;
  }

  const PW = 400, PX = [50, 500, 950], TY = 124, IY = 146, IH = 408, LY = IY + IH + 26;
  const BOX = { l: 150, r: 1330, t: 700, b: 820 };
  function draw() {
    const { ctx } = begin(d.c);
    const ink = PAL.ink, mu = PAL.muted, key = pick.value, D = DATA[key];
    hits = [];
    const k = key === 'photo' ? Math.round(kP.v) : Math.round(kL.v);
    if (!D.svd) {
      headline(ctx, D.failed ? 'The photograph could not be read on this page.' : 'Reading the photograph and finding its singular value decomposition…');
      ro.set(`${MAT('A_k')} = ${SIG('\\sigma_1')}${VEC('\\mathbf{u}_1')}${VEC('\\mathbf{v}_1')}^T + \\cdots + ${SIG('\\sigma_k')}${VEC('\\mathbf{u}_k')}${VEC('\\mathbf{v}_k')}^T`, '');
      return;
    }
    const kk = clamp(k, 1, D.n);
    rebuild(D, kk);
    const { m, n } = D, sig = D.svd.sig, E = ends(), eSig = E.join(';'), EM = key === 'photo' ? 0.25 : 0.1;
    /* the three panels, each image scaled to the panel's height and centred in its width */
    const s = IH / m, w = n * s, fade = pick.a(key);
    const panels = [
      { title: `$\\kA$, ${NAMES[key]}`, vals: D.A, toT: (v) => v, sig: `${key};A;${eSig}` },
      { title: `$${MAT(`A_{${kk}}`)}$, from ${kk} singular value${kk === 1 ? '' : 's'}`, vals: D.Ak, toT: (v) => v, sig: `${key};Ak;${kk};${eSig}` },
      { title: `$\\kA - ${MAT(`A_{${kk}}`)}$, the error`, vals: null, toT: (v) => 0.5 + v / (2 * EM), sig: `${key};E;${kk};${eSig}` },
    ];
    const err = new Float64Array(m * n);
    for (let i = 0; i < err.length; i++) err[i] = D.A[i] - D.Ak[i];
    panels[2].vals = err;
    ctx.save(); ctx.globalAlpha *= fade;
    panels.forEach((p, j) => {
      const x0 = PX[j] + (PW - w) / 2;
      text(ctx, p.title, PX[j] + PW / 2, TY, ink, { size: 21, weight: 600, align: 'center', tex: true });
      const pic = picture('p' + j, D, p.vals, p.toT, p.sig);
      ctx.imageSmoothingEnabled = key === 'photo';
      ctx.drawImage(pic, x0, IY, w, IH);
      ctx.strokeStyle = alpha(ink, 0.35); ctx.lineWidth = 1.5; ctx.strokeRect(x0, IY, w, IH);
      hits.push({ x: PX[j] + PW / 2, y: IY + IH / 2, r: Math.min(w, IH) / 2, name: j === 0 ? `A: ${NAMES[key]}, a ${m} × ${n} matrix of grey values` : j === 1 ? `A${SUB(kk)} = σ₁u₁v₁ᵀ + ⋯ + σ${SUB(kk)}u${SUB(kk)}v${SUB(kk)}ᵀ, the rank ${Math.min(kk, D.r)} approximation` : `A − A${SUB(kk)}: each entry at most ${num(D.maxErr, 3)} in size` });
    });
    ctx.restore();
    /* the two grey scales */
    const strip = (x1, x2, f, labels, title) => {
      const N = 60, ww = (x2 - x1) / N;
      for (let i = 0; i < N; i++) { ctx.fillStyle = greyCss(f((i + 0.5) / N), E); ctx.fillRect(x1 + i * ww, LY, ww + 0.6, 16); }
      ctx.strokeStyle = alpha(ink, 0.35); ctx.lineWidth = 1.5; ctx.strokeRect(x1, LY, x2 - x1, 16);
      labels.forEach(([q, s2]) => { const x = x1 + q * (x2 - x1); line(ctx, x, LY + 16, x, LY + 22, mu, 1.5); text(ctx, s2, x, LY + 38, mu, { size: 17, align: 'center' }); });
      text(ctx, title, (x1 + x2) / 2, LY + 64, mu, { size: 17, align: 'center' });
    };
    strip(PX[0] + 40, PX[1] + PW - 40, (q) => q, [[0, '0'], [0.25, '0.25'], [0.5, '0.5'], [0.75, '0.75'], [1, '1']], 'pixel value: 0 is black, 1 is white');
    strip(PX[2] + 40, PX[2] + PW - 40, (q) => q, [[0, '\u2212' + EM], [0.5, '0'], [1, String(EM)]], `entry of A − A_k, clamped at ±${EM}`);
    /* the singular values as stems, the kept ones in the eigenvalue colour */
    const top = key === 'photo' ? 150 : 16, ny = key === 'photo' ? 3 : 4;
    const ax = axes(ctx, BOX, [0, n + 1], [0, top], { xl: 'i', yl: '', nx: 0, ny, fy: (v) => fmt(v, 0) });
    text(ctx, 'singular values $\\ksigmai$', BOX.l - 120, BOX.t - 30, ink, { size: 20, weight: 600, tex: true });
    const step = key === 'photo' ? 50 : 1;
    for (let i = step; i <= n; i += step) text(ctx, String(i), ax.X(i), BOX.b + 26, mu, { size: 17, align: 'center' });
    if (key === 'photo') text(ctx, '1', ax.X(1), BOX.b + 26, mu, { size: 17, align: 'center' });
    const sc = C('eigenvalue'), r0 = key === 'photo' ? 3 : 7;
    sig.forEach((sv, i) => {
      const x = ax.X(i + 1), y = ax.Y(Math.min(sv, top)), kept = i < kk;
      line(ctx, x, ax.Y(0), x, y, kept ? alpha(sc, 0.7) : alpha(mu, 0.45), key === 'photo' ? 1.5 : 3);
      dot(ctx, x, y, kept ? sc : mu, kept, r0);
      hits.push({ x, y, r: Math.max(r0 + 3, key === 'photo' ? 4 : 10), name: `σ${SUB(i + 1)} = ${num(sv, sv < 1 ? 3 : 2)}${kept ? ', kept' : ', set to zero'}` });
    });
    const xk = (ax.X(kk) + ax.X(kk + 1)) / 2;
    line(ctx, xk, BOX.t, xk, BOX.b, alpha(ink, 0.45), 2, [10, 10]);
    text(ctx, `k = ${kk}`, xk + 8, BOX.t + 6, ink, { size: 17, weight: 600, align: 'left', bg: alpha(PAL.panel, 0.85) });
    /* the headline and the readout */
    const size = kk * (1 + m + n), ratio = (m * n) / size;
    let h;
    if (key === 'photo') {
      h = ratio >= 1
        ? `The photograph from ${kk === 1 ? 'its first singular value' : `its first ${kk} of ${n} singular values`}: ${big(size)} numbers in place of ${big(m * n)}, a compression ratio of ${num(ratio)}.`
        : `The photograph from ${kk} of its ${n} singular values: ${big(size)} numbers, more than its ${big(m * n)} pixels, a compression ratio of ${num(ratio)}.`;
    } else if (key === 'letter') {
      h = kk < 3 ? `With ${kk} singular value${kk === 1 ? '' : 's'} the letter O is not yet itself; its rank is 3.`
        : kk === 3 ? `$${MAT('A_3')} = \\kA$: the letter O has rank 3, so 123 numbers rebuild all 375 of its pixels, a compression ratio of ${num(ratio)}.`
          : `The letter O has rank 3: the singular values past the third are zero, so $${MAT(`A_{${kk}}`)} = \\kA$ with nothing gained.`;
    } else {
      h = kk < 3 ? `With ${kk} singular value${kk === 1 ? '' : 's'} the letter is not yet clear; three singular values stand far above the rest.`
        : kk === 3 ? 'Three large singular values, then a drop: keeping three rebuilds the letter and leaves the splotches in $\\kA - ' + MAT('A_3') + '$.'
          : `Past the drop the small singular values bring the splotches back: $${MAT(`A_{${kk}}`)}$ keeps ${kk - 3} terms of noise.`;
    }
    headline(ctx, h);
    const term = (i) => `${SIG(`\\sigma_{${i}}`)}${VEC(`\\mathbf{u}_{${i}}`)}${VEC(`\\mathbf{v}_{${i}}`)}^T`;
    const sum = kk <= 3 ? Array.from({ length: kk }, (_, i) => term(i + 1)).join(' + ') : `${term(1)} + \\cdots + ${term(kk)}`;
    ro.set(`${MAT(`A_{${kk}}`)} = ${sum}, \\qquad \\frac{${m}\\cdot${n}}{${kk}(1+${m}+${n})} = \\frac{${m * n}}{${size}} \\approx ${num(ratio)}`,
      `${Math.min(kk, D.r)} of ${D.r} nonzero singular values kept (${num(100 * Math.min(kk, D.r) / D.r, kk / D.r < 0.01 ? 1 : 0)}%); the entries of A − A${SUB(kk)} are at most ${num(D.maxErr, 3)} in size and ${num(D.rmsErr, 3)} on average (root mean square).`);
  }
  still(d, draw);
})();

/* ======================================================================================
   Sim: the voting records of the second Rehnquist court (Activity 7.5.6, Exercises 7.5.5 and
   7.5.6). U and σ of the 9 × 911 matrix of all cases and of the 9 × 188 matrix of the 5-4 cases
   were computed with NumPy (LAPACK's signs, those the book's Sage reports) and are embedded with the
   votes; a case's coefficients are c = Uᵀaⱼ, the column of Γ. Votes ±1 in ink as bars; u₁, u₂, u₃
   in the vector colour; the singular values in the eigenvalue colour. Still: no clock.
   ====================================================================================== */
(function () {
  const d = sim('sim-supreme-court', 700);
  const JUSTICES = ['Rehnquist', 'Scalia', 'Thomas', 'Kennedy', 'O’Connor', 'Stevens', 'Souter', 'Ginsburg', 'Breyer'];
  const FULL = ['William Rehnquist', 'Antonin Scalia', 'Clarence Thomas', 'Anthony Kennedy', 'Sandra Day O’Connor', 'John Paul Stevens', 'David Souter', 'Ruth Bader Ginsburg', 'Stephen Breyer'];
  const SETS = {
    all: { label: 'all 911 cases', N: COURT.all.votes.length / 9, ...COURT.all, book: [{ at: 1, label: 'the second case' }, { at: 47, label: 'the 48th case' }], start: 1 },
    five: { label: 'the 188 decided 5-4', N: COURT.five.votes.length / 9, ...COURT.five, book: [{ at: 5, label: 'the 6th case' }, { at: 6, label: 'the 7th case' }], start: 6 },
  };
  const pick = choice(d.controls, { label: '\\text{cases}', key: 'cases', value: 'all', aria: 'which cases', options: [{ value: 'all', label: 'all 911' }, { value: 'five', label: 'decided 5-4' }],
    onInput: (v) => { const S = SETS[v]; j.range({ min: 0, max: S.N - 1, step: 1, value: S.start, dec: 0, unit: '' }); j.mark(S.book); } });
  const j = ctl(d.controls, { label: '\\text{case index}', cls: '', key: 'case', min: 0, max: SETS.all.N - 1, step: 1, value: 1, unit: '', dec: 0, aria: 'the index of the case, counted from 0 as Sage does', specials: SETS.all.book });
  const ro = readout(d);
  let hits = [];
  hover(d.stage, () => hits);
  const votesOf = (S, c) => Array.from({ length: 9 }, (_, i) => (S.votes[9 * c + i] === '+' ? 1 : -1));
  const coefOf = (S, a) => S.U[0].map((_, q) => S.U.reduce((s, row, i) => s + row[q] * a[i], 0));

  const RY0 = 150, RH = 48, NX = 40;                       /* rows: one per justice */
  const COLS = [{ x: 330, half: 80, s: 80 }, { x: 560, half: 90, s: 100 }, { x: 790, half: 90, s: 100 }, { x: 1020, half: 90, s: 100 }];
  const SBOX = { l: 1170, r: 1360, t: 170, b: 560 };
  function draw() {
    const { ctx } = begin(d.c);
    const ink = PAL.ink, mu = PAL.muted, vc = C('vector'), ec = C('eigenvalue');
    const key = pick.value, S = SETS[key], c = clamp(Math.round(j.v), 0, S.N - 1);
    const a = votesOf(S, c), cf = coefOf(S, a), maj = a.filter((v) => v > 0).length;
    const two = a.map((_, i) => cf[0] * S.U[i][0] + cf[1] * S.U[i][1]);
    hits = [];
    const yOf = (i) => RY0 + 40 + i * RH;
    /* the justices, most conservative first as the book lists them */
    JUSTICES.forEach((nm, i) => text(ctx, nm, NX, yOf(i), ink, { size: 19, align: 'left' }));
    text(ctx, 'more conservative', NX, RY0 - 2, mu, { size: 16, align: 'left' });
    text(ctx, 'more progressive', NX, yOf(8) + 36, mu, { size: 16, align: 'left' });
    /* a column of nine horizontal bars from a centre line */
    const column = (col, vals, color, filled, title, nameOf) => {
      const { x, half, s } = col;
      if (title) { text(ctx, title, x, RY0 - 2, ink, { size: 19, weight: 600, align: 'center', tex: true }); line(ctx, x, RY0 + 14, x, yOf(8) + 22, alpha(ink, 0.35), 1.5); }
      vals.forEach((v, i) => {
        const len = clamp(v * s, -half, half), y = yOf(i);
        ctx.save();
        if (filled) { ctx.fillStyle = alpha(color, color === PAL.ink ? 0.3 : 0.8); ctx.fillRect(Math.min(x, x + len), y - 13, Math.abs(len), 26); }
        else { ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.setLineDash([6, 5]); ctx.strokeRect(Math.min(x, x + len), y - 9, Math.abs(len), 18); }
        ctx.restore();
        if (nameOf) hits.push({ x: x + len / 2, y, r: Math.max(14, Math.abs(len) / 2), name: nameOf(i, v) });
      });
    };
    column(COLS[0], a, ink, true, `case ${c}: ${maj}–${9 - maj}`, (i, v) => `${FULL[i]} voted ${v > 0 ? 'with the majority (+1)' : 'in the minority (−1)'}; c₁u₁ + c₂u₂ gives ${numT(two[i])} here`);
    column(COLS[0], two, ink, false, '', null);
    [0, 1, 2].forEach((q) => {
      const vals = S.U.map((row) => row[q]);
      column(COLS[q + 1], vals, vc, true, `$${['\\kvecuone', '\\kvecutwo', '\\kvecuthree'][q]}$`, (i, v) => `u${'₁₂₃'[q]}: ${FULL[i]}, ${numT(v, 3)}`);
      const big1 = Math.abs(cf[q]) === Math.max(...cf.map(Math.abs));
      text(ctx, `c${'₁₂₃'[q]} = ${numT(cf[q])}`, COLS[q + 1].x, yOf(8) + 46, big1 ? ink : mu, { size: 19, weight: big1 ? 600 : 400, align: 'center' });
    });
    text(ctx, 'dashed: c₁u₁ + c₂u₂', COLS[0].x, yOf(8) + 46, mu, { size: 17, align: 'center' });
    /* the singular values as bars */
    const top = key === 'all' ? 70 : 35;
    const ax = axes(ctx, SBOX, [0.4, 9.6], [0, top], { nx: 0, ny: key === 'all' ? 7 : 7, fy: (v) => fmt(v, 0) });
    text(ctx, 'singular values $\\ksigmai$', (SBOX.l + SBOX.r) / 2 - 20, RY0 - 2, ink, { size: 19, weight: 600, align: 'center', tex: true });
    S.s.forEach((sv, i) => {
      const x = ax.X(i + 1), y = ax.Y(sv);
      ctx.fillStyle = alpha(ec, i < 3 ? 0.85 : 0.4); ctx.fillRect(x - 8, y, 16, ax.Y(0) - y);
      text(ctx, String(i + 1), x, SBOX.b + 24, mu, { size: 16, align: 'center' });
      hits.push({ x, y: (y + ax.Y(0)) / 2, r: 12, name: `σ${'₁₂₃₄₅₆₇₈₉'[i]} = ${num(sv)}` });
    });
    text(ctx, 'i', SBOX.r, SBOX.b + 52, ink, { size: 18, weight: 600, align: 'right' });
    /* headline: the vote and the coefficient that dominates */
    const qb = cf.map(Math.abs).indexOf(Math.max(...cf.map(Math.abs)));
    const share = (cf[0] ** 2 + cf[1] ** 2) / 9;
    const kind = maj === 9 ? 'is unanimous, 9–0,' : `is decided ${maj}–${9 - maj},`;
    headline(ctx, `Case index ${c} ${kind} and its largest coefficient is $c_{${qb + 1}} = ${num(cf[qb])}$: it is ${Math.abs(cf[qb]) ** 2 / 9 > 0.8 ? 'almost exactly' : 'mostly'} $${num(cf[qb])}\\,${VEC(`\\mathbf{u}_{${qb + 1}}`)}$.`);
    const t = (x, q, first) => `${first ? (x < 0 ? '-' : '') : x < 0 ? ' - ' : ' + '}${num(Math.abs(x))}\\,${VEC(`\\mathbf{u}_{${q}}`)}`;
    ro.set(`\\text{case } ${c} = ${t(cf[0], 1, true)}${t(cf[1], 2)}${t(cf[2], 3)} + \\cdots`,
      `${maj} justices in the majority; c₁u₁ + c₂u₂ carries ${num(100 * share, 0)}% of the case’s squared length, 9.`);
  }
  still(d, draw);
})();
};
