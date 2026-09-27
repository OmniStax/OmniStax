/* Special values on a slider, keyframes: the pure parts. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solve, snapTo, nextSpecial, trackAt, keyframes, ease, CATCH, LET_GO } from '../src/lib/fig/motion';

const near = (a: number, b: number, eps = 1e-9): void => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test('solve finds a root in the bracket, or null', () => {
  near(solve((x) => x * x - 2, 0, 3)!, Math.SQRT2);
  assert.equal(solve((x) => x * x + 1, -5, 5), null);
  const C = 1e-6, f = 1000, L = 1 / ((2 * Math.PI * f) ** 2 * C);
  near(solve((l) => 1 / (2 * Math.PI * Math.sqrt(l * C)) - f, 0.001, 1)!, L, 1e-9);
  assert.equal(solve((x) => x - 2, 0, 1), null, 'root outside the range');
  near(solve((x) => x - 1, 0, 2)!, 1, 1e-12);
});

test('snap catches within CATCH, holds to LET_GO, then lets go', () => {
  const sp = [5, null, 80], span = 100;
  assert.deepEqual(snapTo(5 + CATCH * span * 0.9, sp, span, null), { v: 5, held: 0 });
  assert.deepEqual(snapTo(5 + CATCH * span * 1.5, sp, span, null), { v: 5 + CATCH * span * 1.5, held: null }, 'not caught from outside');
  assert.deepEqual(snapTo(5 + LET_GO * span * 0.9, sp, span, 0), { v: 5, held: 0 }, 'held past the catch radius');
  assert.equal(snapTo(5 + LET_GO * span * 1.1, sp, span, 0).held, null, 'let go beyond');
  assert.deepEqual(snapTo(79, sp, span, null), { v: 80, held: 2 }, 'the nearest circle');
});

test('next special and track positions', () => {
  const sp = [3, null, 7, 1];
  assert.equal(nextSpecial(sp, 3, 1), 7); assert.equal(nextSpecial(sp, 3, -1), 1);
  assert.equal(nextSpecial(sp, 7, 1), null);
  assert.equal(trackAt(5, 0, 10), 0.5); assert.equal(trackAt(11, 0, 10), null); assert.equal(trackAt(null, 0, 10), null);
});

test('keyframes ease between neighbours, hold at the ends, and carry keys', () => {
  const F = [{ at: 0, yaw: 0, t: [0, 0, 0] }, { at: 1, yaw: 1 }, { at: 3, yaw: 3, t: [2, 4, 6], ease: ease.linear }];
  assert.deepEqual(keyframes(-1, F), { yaw: 0, t: [0, 0, 0] });
  assert.deepEqual(keyframes(9, F), { yaw: 3, t: [2, 4, 6] });
  near(keyframes<{ yaw: number }>(0.5, F).yaw, 0.5);
  near(keyframes<{ yaw: number }>(0.2, F).yaw, ease.smooth(0.2));
  const m = keyframes<{ yaw: number; t: number[] }>(2, F);
  near(m.yaw, 2); assert.deepEqual(m.t, [1, 2, 3]);
  assert.deepEqual(keyframes(0.5, [{ at: 1, a: 2 }, { at: 0, a: 0 }]), { a: ease.smooth(0.5) * 2 }, 'unsorted frames');
});
