/* The glow under a changed value: skeleton keys, changed tokens, the input rule and the timing. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { skeletonOf, tokensOf, changed, step, glowOf, lit, HOLD_MS, FADE_MS, PEAK, CLOCK_MS } from '../src/lib/fig/glow';

test('a string is known again by its skeleton whatever its numbers read', () => {
  assert.equal(skeletonOf('R = 12.4 m'), skeletonOf('R = 9.87 m'));
  assert.equal(skeletonOf('After 1.71 s'), skeletonOf('After −0.5 s'));
  assert.notEqual(skeletonOf('R = 12 m'), skeletonOf('H = 12 m'));
  assert.equal(skeletonOf('v_0 = 3 m/s'), 'v_\u0000 = \u0000 m/s');
});

test('number tokens carry their place in the string', () => {
  assert.deepEqual(tokensOf('P = 1.5e5 Pa, T = 300 K'), [{ s: '1.5e5', i: 4, j: 9 }, { s: '300', i: 18, j: 21 }]);
  assert.deepEqual(changed(['1', '2', '3'], ['1', '5', '3']), [1]);
  assert.deepEqual(changed(['1'], ['1']), []);
});

test('a change by hand lights just the changed readings', () => {
  const a = step(undefined, ['10', '20'], 0, 0, true);
  assert.equal(lit(a, 0), false);
  const b = step(a, ['11', '20'], 1, 100, true);
  assert.deepEqual(b.lit, [100, -Infinity]);
  assert.equal(glowOf(b.lit[0], 100), PEAK);
});

test('a change with no input since the last look is a clock and never glows', () => {
  const a = step(undefined, ['1.70'], 5, 0, true);
  const b = step(a, ['1.71'], 5, 16, true);
  assert.equal(lit(b, 16), false);
  const c = step(b, ['1.72'], 6, 32, true);              /* input arrives while the clock runs */
  assert.equal(lit(c, 32), false);
  const d = step({ ...c, vals: ['1.72'] }, ['2.00'], 7, 32 + CLOCK_MS + 1, true);
  assert.equal(lit(d, 32 + CLOCK_MS + 1), true);         /* quiet a while, then moved by hand */
});

test('outside the input window nothing lights', () => {
  const a = step(undefined, ['1'], 0, 0, false);
  assert.equal(lit(step(a, ['2'], 1, 10, false), 10), false);
});

test('the glow holds, fades and is gone; repeated changes keep it lit', () => {
  assert.equal(glowOf(0, HOLD_MS), PEAK);
  const mid = glowOf(0, HOLD_MS + FADE_MS / 2);
  assert.ok(mid > 0 && mid < PEAK);
  assert.equal(glowOf(0, HOLD_MS + FADE_MS), 0);
  assert.equal(glowOf(-Infinity, 0), 0);
  assert.equal(glowOf(0, HOLD_MS + FADE_MS / 2, true), PEAK);
  let tr = step(undefined, ['0'], 0, 0, true);
  for (let i = 1; i <= 20; i++) { tr = step(tr, [String(i)], i, i * 50, true); assert.equal(glowOf(tr.lit[0], i * 50 + 16), PEAK); }
});
