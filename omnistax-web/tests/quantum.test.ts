/* figlib's quantum: the Bloch ball's maps and the circuit simulator behind F.bloch and F.circuit. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rotate, affine, channels, rho, blochOf, layoutOf, run, prepare, modulus, phase, bitsOf, ketTex, type Step } from '../src/lib/fig/quantum';

const near = (a: number, b: number, tol = 1e-12, msg = ''): void => assert.ok(Math.abs(a - b) <= tol, `${msg} ${a} vs ${b}`);
const S2 = Math.SQRT1_2;

test('H then CNOT takes |00⟩ to |Φ⁺⟩ = (|00⟩ + |11⟩)/√2', () => {
  const L = layoutOf([1, 1]), st = run('00', L, [{ g: 'H', t: 0 }, { g: 'X', t: 1, c: 0 }]);
  const end = st[2];
  [S2, 0, 0, S2].forEach((a, x) => { near(end.re[x], a, 1e-12, `re ${x}`); near(end.im[x], 0); });
  near(modulus(st[1], 0), S2); near(modulus(st[1], 2), S2); near(modulus(st[1], 1), 0);   /* after H: (|00⟩ + |10⟩)/√2 */
  assert.equal(ketTex(end, 2), '\\tfrac{1}{\\sqrt{2}}\\left(|00\\rangle + |11\\rangle\\right)');
  assert.equal(ketTex(run('11', L, [{ g: 'H', t: 0 }, { g: 'X', t: 1, c: 0 }])[2], 2), '\\tfrac{1}{\\sqrt{2}}\\left(|01\\rangle - |10\\rangle\\right)');
});

test('teleportation hands q₀\'s state to q₂ for every outcome of the Bell measurement', () => {
  const L = layoutOf([1, 1, 1]), a: [number, number] = [Math.cos(0.4), 0], b: [number, number] = [Math.sin(0.4) * Math.cos(1.1), Math.sin(0.4) * Math.sin(1.1)];
  [[0, 0], [0, 1], [1, 0], [1, 1]].forEach(([m0, m1]) => {
    const steps: Step[] = [{ g: 'H', t: 1 }, { g: 'X', t: 2, c: 1 }, { g: 'X', t: 1, c: 0 }, { g: 'H', t: 0 },
      [{ g: 'M', t: 0, outcome: m0 as 0 | 1 }, { g: 'M', t: 1, outcome: m1 as 0 | 1 }], { g: 'X', t: 2, c: 1 }, { g: 'Z', t: 2, c: 0 }];
    const end = run({ wires: [[a, b], 0, 0] }, L, steps).at(-1)!, x0 = (m0 << 2) | (m1 << 1);
    near(end.re[x0], a[0], 1e-12); near(end.im[x0], a[1], 1e-12); near(end.re[x0 + 1], b[0], 1e-12); near(end.im[x0 + 1], b[1], 1e-12);
  });
});

test('the four-bit Toffoli from three θ⁽³⁾ and a scratch bit flips w exactly when x, y and z are 1, and clears the scratch', () => {
  const L = layoutOf([1, 1, 1, 1, 1]), steps: Step[] = [{ g: 'X', t: 3, c: [0, 1] }, { g: 'X', t: 4, c: [2, 3] }, { g: 'X', t: 3, c: [0, 1] }];
  for (let x = 0; x < 8; x++) {
    const bits = bitsOf(run(x << 2, L, steps).at(-1)!, L);
    assert.deepEqual(bits, [(x >> 2) & 1, (x >> 1) & 1, x & 1, 0, x === 7 ? 1 : 0]);
  }
});

test('controls on 0, SWAP, R_k and a register gate as its tensor power', () => {
  const L = layoutOf([1, 1]);
  assert.deepEqual(bitsOf(run('00', L, [{ g: 'X', t: 1, o: 0 }]).at(-1)!, L), [0, 1]);
  assert.deepEqual(bitsOf(run('10', L, [{ g: 'SWAP', t: [0, 1] }]).at(-1)!, L), [0, 1]);
  near(phase(run('11', L, [{ g: 'R', k: 2, t: 1, c: 0 }]).at(-1)!, 3), Math.PI / 2);
  const R = layoutOf([3]), all = run(0, R, [{ g: 'H', t: 0 }]).at(-1)!;
  for (let x = 0; x < 8; x++) near(all.re[x], 1 / Math.sqrt(8));
  assert.equal(bitsOf(prepare({ wires: ['101'] }, R), R)[0], 5);
});

test('a matrix gate of the wrong size is refused', () => {
  assert.throws(() => run('00', layoutOf([1, 1]), [{ g: 'U', t: [0, 1], m: [[1, 0], [0, 1]] }]));
});

test('the Bloch ball: rotation, ρ, a pure state\'s vector and the channels', () => {
  const P = rotate([0, 0, 1], [1, 0, 0], Math.PI / 2);
  near(P[0], 0); near(P[1], -1); near(P[2], 0);
  const r = rho([0.3, -0.2, 0.5]);
  near(r[0][0][0], 0.75); near(r[0][1][0], 0.15); near(r[0][1][1], 0.1); near(r[1][1][0], 0.25);
  const plus = blochOf(S2, S2); near(plus[0], 1); near(plus[2], 0);
  const iy = blochOf(S2, [0, S2]); near(iy[1], 1);
  const d = channels.depolarizing(0.75); near(affine(d.M, d.c, [0, 0, 1])[2], 0);
  const a = channels.amplitudeDamping(1); near(affine(a.M, a.c, [0, 0, -1])[2], 1);
});
