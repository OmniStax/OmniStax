/* Preskill's quantum information notes with no canvas and no three.js: the Bloch ball's geometry
   (rotations, the affine maps of channels, ρ from the Bloch vector) and a state-vector simulator for
   circuits of up to eight qubits, exact in complex doubles. figlib draws them as F.bloch and F.circuit.
   Basis order is the book's: wire 0 is the leftmost bit of |x⟩, so |01⟩ has wire 0 at 0 and wire 1 at 1. */
export type V3 = readonly [number, number, number];
export type Cx = readonly [number, number];
export type CxIn = number | Cx;
export type M3 = readonly [V3, V3, V3];
export type Amps = { readonly re: Float64Array; readonly im: Float64Array };

const cx = (z: CxIn): Cx => (typeof z === 'number' ? [z, 0] : z);
const TAU = 2 * Math.PI;

/* ---------- the Bloch ball ---------- */
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (a: V3): V3 => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const I3: M3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
/* P turned about the axis n by the angle a, right-handed (Rodrigues) */
export function rotate(P: V3, n: V3, a: number): V3 {
  const u = unit(n), c = Math.cos(a), s = Math.sin(a), k = dot(u, P) * (1 - c);
  const x: V3 = [u[1] * P[2] - u[2] * P[1], u[2] * P[0] - u[0] * P[2], u[0] * P[1] - u[1] * P[0]];
  return [P[0] * c + x[0] * s + u[0] * k, P[1] * c + x[1] * s + u[1] * k, P[2] * c + x[2] * s + u[2] * k];
}
/* the arc P sweeps turning about n from angle a0 to a1 */
export const arc = (P: V3, n: V3, a0: number, a1: number, m = 64): V3[] =>
  Array.from({ length: m + 1 }, (_, i) => rotate(P, n, a0 + ((a1 - a0) * i) / m));
/* the channel's affine map on the Bloch vector, P → M P + c */
export const affine = (M: M3, c: V3, P: V3): V3 => [dot(M[0], P) + c[0], dot(M[1], P) + c[1], dot(M[2], P) + c[2]];
/* the map k of the way from the identity to (M, c): the morph of the ball into its image */
export const toward = (M: M3, c: V3, k: number): { M: M3; c: V3 } => ({
  M: M.map((r, i) => r.map((x, j) => (i === j ? 1 : 0) * (1 - k) + x * k)) as unknown as M3,
  c: [c[0] * k, c[1] * k, c[2] * k],
});
/* the image of the unit sphere under (M, c) as rows of a grid, nu around and nv pole to pole */
export function ellipsoid(M: M3, c: V3, nu = 32, nv = 16): V3[][] {
  return Array.from({ length: nv + 1 }, (_, j) => {
    const th = (Math.PI * j) / nv;
    return Array.from({ length: nu + 1 }, (_, i) => { const ph = (TAU * i) / nu; return affine(M, c, [Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)]); });
  });
}
/* ρ = ½(1 + P·σ) as [[ρ00, ρ01], [ρ10, ρ11]] */
export const rho = (P: V3): readonly [readonly [Cx, Cx], readonly [Cx, Cx]] =>
  [[[(1 + P[2]) / 2, 0], [P[0] / 2, -P[1] / 2]], [[P[0] / 2, P[1] / 2], [(1 - P[2]) / 2, 0]]];
/* the Bloch vector of a pure state a|0⟩ + b|1⟩ */
export function blochOf(a: CxIn, b: CxIn): V3 {
  const [ar, ai] = cx(a), [br, bi] = cx(b), n = ar * ar + ai * ai + br * br + bi * bi || 1;
  /* P_x + i P_y = 2 a* b */
  return [(2 * (ar * br + ai * bi)) / n, (2 * (ar * bi - ai * br)) / n, (ar * ar + ai * ai - br * br - bi * bi) / n];
}
/* Preskill 3.4: the three channels of one qubit as affine maps, p their probability */
export const channels = {
  depolarizing: (p: number): { M: M3; c: V3 } => { const s = 1 - (4 * p) / 3; return { M: [[s, 0, 0], [0, s, 0], [0, 0, s]], c: [0, 0, 0] }; },
  phaseDamping: (p: number): { M: M3; c: V3 } => ({ M: [[1 - p, 0, 0], [0, 1 - p, 0], [0, 0, 1]], c: [0, 0, 0] }),
  amplitudeDamping: (p: number): { M: M3; c: V3 } => { const s = Math.sqrt(1 - p); return { M: [[s, 0, 0], [0, s, 0], [0, 0, 1 - p]], c: [0, 0, p] }; },
};

/* ---------- circuits ---------- */
export type Mat = readonly (readonly CxIn[])[];
/* a gate as a figure writes it: g its name, t its target wire(s), c and o its controls on 1 and on 0;
   m a matrix for a gate the library does not know; k for R_k, phi for P, theta for Rx, Ry, Rz;
   outcome for a measurement that collapses (none: deferred, the state unchanged) */
export type GateSpec = {
  readonly g: string; readonly t: number | readonly number[]; readonly c?: number | readonly number[]; readonly o?: number | readonly number[];
  readonly m?: Mat; readonly label?: string; readonly name?: string; readonly k?: number; readonly phi?: number; readonly theta?: number; readonly outcome?: 0 | 1;
};
export type Step = GateSpec | readonly GateSpec[];
const list = (x: number | readonly number[] | undefined): number[] => (x === undefined ? [] : typeof x === 'number' ? [x] : [...x]);
export const stepGates = (s: Step): readonly GateSpec[] => (Array.isArray(s) ? s : [s as GateSpec]);
export const targets = (g: GateSpec): number[] => list(g.t);
export const controls = (g: GateSpec): { on: number[]; off: number[] } => ({ on: list(g.c), off: list(g.o) });

const S2 = Math.SQRT1_2;
const diag = (a: CxIn, b: CxIn): Mat => [[a, 0], [0, b]];
const e = (a: number): Cx => [Math.cos(a), Math.sin(a)];
/* the matrix of a built-in single-qubit gate, or null */
export function known(g: GateSpec): Mat | null {
  const th = (g.theta ?? 0) / 2;
  switch (g.g) {
    case 'H': return [[S2, S2], [S2, -S2]];
    case 'X': return [[0, 1], [1, 0]];
    case 'Y': return [[0, [0, -1]], [[0, 1], 0]];
    case 'Z': return diag(1, -1);
    case 'S': return diag(1, [0, 1]);
    case 'T': return diag(1, e(Math.PI / 4));
    case 'R': return diag(1, e(TAU / 2 ** (g.k ?? 1)));
    case 'P': return diag(1, e(g.phi ?? 0));
    case 'Rx': return [[Math.cos(th), [0, -Math.sin(th)]], [[0, -Math.sin(th)], Math.cos(th)]];
    case 'Ry': return [[Math.cos(th), -Math.sin(th)], [Math.sin(th), Math.cos(th)]];
    case 'Rz': return diag(e(-th), e(th));
    default: return null;
  }
}

/* wire w of a circuit spans qubits from[w] .. from[w] + width[w] − 1 */
export type Layout = { readonly n: number; readonly from: readonly number[]; readonly width: readonly number[] };
export const layoutOf = (widths: readonly number[]): Layout => {
  const from: number[] = []; let n = 0;
  widths.forEach((w) => { from.push(n); n += w; });
  if (n > 8) throw new Error(`a circuit simulates at most 8 qubits, not ${n}`);
  return { n, from, width: widths };
};
const qubitsOf = (L: Layout, wires: readonly number[]): number[] => wires.flatMap((w) => Array.from({ length: L.width[w] }, (_, i) => L.from[w] + i));
const bitAt = (x: number, q: number, n: number): number => (x >> (n - 1 - q)) & 1;
const maskOf = (q: number, n: number): number => 1 << (n - 1 - q);

export const zeros = (n: number): Amps => ({ re: new Float64Array(1 << n), im: new Float64Array(1 << n) });
const copy = (s: Amps): Amps => ({ re: s.re.slice(), im: s.im.slice() });

/* U on the qubits T of s, where every qubit of on reads 1 and every qubit of off reads 0 */
function applyOn(s: Amps, n: number, U: Mat, T: readonly number[], on: readonly number[], off: readonly number[]): void {
  const d = 1 << T.length;
  if (U.length !== d || U.some((r) => r.length !== d)) throw new Error(`a gate on ${T.length} qubit(s) needs a ${d}×${d} matrix`);
  const tm = T.reduce((m, q) => m | maskOf(q, n), 0), U2 = U.map((r) => r.map(cx));
  const offs = Array.from({ length: d }, (_, j) => T.reduce((m, q, i) => m | (((j >> (T.length - 1 - i)) & 1) ? maskOf(q, n) : 0), 0));
  const re = new Float64Array(d), im = new Float64Array(d);
  for (let x = 0; x < 1 << n; x++) {
    if (x & tm) continue;
    if (on.some((q) => !bitAt(x, q, n)) || off.some((q) => bitAt(x, q, n))) continue;
    for (let j = 0; j < d; j++) { re[j] = s.re[x | offs[j]]; im[j] = s.im[x | offs[j]]; }
    for (let i = 0; i < d; i++) {
      let r = 0, m = 0;
      for (let j = 0; j < d; j++) { const [a, b] = U2[i][j]; r += a * re[j] - b * im[j]; m += a * im[j] + b * re[j]; }
      s.re[x | offs[i]] = r; s.im[x | offs[i]] = m;
    }
  }
}
/* one gate on a copy of s */
export function apply(s0: Amps, L: Layout, g: GateSpec): Amps {
  const s = copy(s0), n = L.n, T = qubitsOf(L, targets(g)), { on: cw, off: ow } = controls(g), on = qubitsOf(L, cw), off = qubitsOf(L, ow);
  if (g.g === 'M') {
    if (g.outcome === undefined) return s;
    const keep = g.outcome; let p = 0;
    for (let x = 0; x < 1 << n; x++) { if (T.some((q) => bitAt(x, q, n) !== keep)) { s.re[x] = 0; s.im[x] = 0; } else p += s.re[x] ** 2 + s.im[x] ** 2; }
    const k = p > 1e-15 ? 1 / Math.sqrt(p) : 0;
    for (let x = 0; x < 1 << n; x++) { s.re[x] *= k; s.im[x] *= k; }
    return s;
  }
  if (g.g === 'SWAP') {
    if (T.length !== 2) throw new Error('SWAP takes two wires of one qubit each');
    applyOn(s, n, [[1, 0, 0, 0], [0, 0, 1, 0], [0, 1, 0, 0], [0, 0, 0, 1]], T, on, off); return s;
  }
  const one = g.m ? null : known(g);
  if (one) { T.forEach((q) => applyOn(s, n, one, [q], on, off)); return s; }   /* a one-qubit gate on a register is its tensor power */
  if (!g.m) throw new Error(`no matrix for the gate "${g.g}"; give it one as m`);
  applyOn(s, n, g.m, T, on, off); return s;
}
/* the input as amplitudes: a bit string over the qubits ("010"), a basis index, a vector of 2ⁿ, or one ket per wire */
export type Input = string | number | { readonly vec: readonly CxIn[] } | { readonly wires: readonly (string | number | readonly [CxIn, CxIn])[] };
export function prepare(x: Input, L: Layout): Amps {
  const s = zeros(L.n), N = 1 << L.n;
  if (typeof x === 'number') { s.re[x % N] = 1; return s; }
  if (typeof x === 'string') { s.re[parseInt(x.replace(/[^01]/g, '') || '0', 2) % N] = 1; return s; }
  if ('vec' in x) {
    if (x.vec.length !== N) throw new Error(`an input vector needs ${N} amplitudes`);
    let p = 0; x.vec.forEach((z, i) => { const [a, b] = cx(z); s.re[i] = a; s.im[i] = b; p += a * a + b * b; });
    const k = 1 / Math.sqrt(p || 1); for (let i = 0; i < N; i++) { s.re[i] *= k; s.im[i] *= k; }
    return s;
  }
  /* a product state, wire by wire; a register's ket is a value or a bit string */
  let re = [1], im = [0];
  x.wires.forEach((w, i) => {
    const d = 1 << L.width[i], kr = new Array(d).fill(0), ki = new Array(d).fill(0);
    if (typeof w === 'number' || typeof w === 'string') kr[(typeof w === 'number' ? w : parseInt(w || '0', 2)) % d] = 1;
    else { const [a, b] = [cx(w[0]), cx(w[1])], k = 1 / Math.hypot(a[0], a[1], b[0], b[1]); kr[0] = a[0] * k; ki[0] = a[1] * k; kr[1] = b[0] * k; ki[1] = b[1] * k; }
    const r2: number[] = [], i2: number[] = [];
    re.forEach((a, j) => kr.forEach((c, m) => { r2.push(a * c - im[j] * ki[m]); i2.push(a * ki[m] + im[j] * c); }));
    re = r2; im = i2;
  });
  re.forEach((v, i) => { s.re[i] = v; s.im[i] = im[i]; });
  return s;
}
/* the state before every step and after the last: states[i] is the state with i steps applied */
export function run(input: Input, L: Layout, steps: readonly Step[]): Amps[] {
  const out = [prepare(input, L)];
  steps.forEach((st) => out.push(stepGates(st).reduce((s, g) => apply(s, L, g), out[out.length - 1])));
  return out;
}
export const modulus = (s: Amps, x: number): number => Math.hypot(s.re[x], s.im[x]);
export const phase = (s: Amps, x: number): number => Math.atan2(s.im[x], s.re[x]);
export const probs = (s: Amps): number[] => Array.from(s.re, (r, i) => r * r + s.im[i] ** 2);
/* the bits of the likeliest basis state, wire by wire (a register's value as one number) */
export function bitsOf(s: Amps, L: Layout): number[] {
  const p = probs(s), x = p.indexOf(Math.max(...p));
  return L.width.map((w, i) => (x >> (L.n - L.from[i] - w)) & ((1 << w) - 1));
}
export const basisLabel = (x: number, n: number): string => x.toString(2).padStart(n, '0');

/* ---------- the state as TeX ---------- */
/* v as m/√2ᵏ when it is one (k ≤ 6, |m| ≤ 8), else null: 1/√2, 1/2, 1/(2√2) are the amplitudes of the book's circuits */
function surd(v: number): { m: number; k: number } | null {
  for (let k = 0; k <= 6; k++) { const m = v * Math.SQRT2 ** k; if (Math.abs(m - Math.round(m)) < 1e-9 && Math.abs(Math.round(m)) <= 8 && Math.round(m) !== 0) return { m: Math.round(m), k }; }
  return null;
}
const surdTex = (m: number, k: number): string => {
  const den = 2 ** Math.floor(k / 2), root = k % 2 ? '\\sqrt{2}' : '';
  const d = den === 1 ? root : `${den}${root}`;
  return d ? `\\tfrac{${m}}{${d}}` : String(m);
};
/* a phase as a unit factor: ±1, ±i, or e^{iφ} with φ a simple multiple of π, else in degrees */
function phaseTex(a: number): { sign: 1 | -1; f: string } {
  const q = a / (Math.PI / 4), r = Math.round(q);
  if (Math.abs(q - r) < 1e-9) {
    const k = ((r % 8) + 8) % 8;
    if (k === 0) return { sign: 1, f: '' }; if (k === 4) return { sign: -1, f: '' };
    if (k === 2) return { sign: 1, f: 'i' }; if (k === 6) return { sign: -1, f: 'i' };
    return { sign: 1, f: ({ 1: 'e^{i\\pi/4}', 3: 'e^{3i\\pi/4}', 5: 'e^{-3i\\pi/4}', 7: 'e^{-i\\pi/4}' } as Record<number, string>)[k] };
  }
  return { sign: 1, f: `e^{i\\,${(a * 180 / Math.PI).toFixed(0)}^\\circ}` };
}
/* The state as Σ a_x |x⟩ in TeX, the common modulus factored out where every term shares one. ket
   wraps each basis label (default |x⟩) and dec sets the numbers that are not surds. */
export function ketTex(s: Amps, n: number, o: { readonly dec?: number; readonly ket?: (x: number) => string } = {}): string {
  const dec = o.dec ?? 3, ket = o.ket ?? ((x: number) => `|${basisLabel(x, n)}\\rangle`);
  const terms = Array.from({ length: 1 << n }, (_, x) => x).filter((x) => modulus(s, x) > 1e-9);
  if (!terms.length) return '0';
  const mods = terms.map((x) => modulus(s, x)), same = mods.every((m) => Math.abs(m - mods[0]) < 1e-9) && terms.length > 1;
  const num = (v: number): string => { const q = surd(v); return q ? surdTex(q.m, q.k) : v.toFixed(dec).replace(/\.?0+$/, ''); };
  const body = terms.map((x, i) => {
    const ph = phaseTex(phase(s, x)), m = same ? 1 : modulus(s, x);
    const coef = (Math.abs(m - 1) < 1e-9 ? '' : num(m)) + ph.f;
    return `${i === 0 ? (ph.sign < 0 ? '-' : '') : ph.sign < 0 ? ' - ' : ' + '}${coef}${ket(x)}`;
  }).join('');
  return same ? `${num(mods[0])}\\left(${body}\\right)` : body;
}
