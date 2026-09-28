/* Controls that change with a story: the pure parts. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layoutPlan, rangeAt } from '../src/lib/fig/regroup';

const near = (a: number, b: number, eps = 1e-9): void => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test('layoutPlan names the sliders that stay, enter and leave', () => {
  assert.deepEqual(layoutPlan(['I', 'r'], ['I', 'r', 'N']), { stay: ['I', 'r'], enter: ['N'], leave: [] });
  assert.deepEqual(layoutPlan(['I', 'R', 'N'], ['I', 'n']), { stay: ['I'], enter: ['n'], leave: ['R', 'N'] });
  assert.deepEqual(layoutPlan(['I'], ['I']), { stay: ['I'], enter: [], leave: [] });
});

test('rangeAt eases the ends and the thumb as a function of k, the text from the nearer end', () => {
  const a = { min: 5, max: 50, step: 1, unit: 'A' }, b = { min: 200, max: 2000, step: 50, unit: 'A' };
  const at = (k: number) => rangeAt(a, b, 25, 1600, k);
  assert.ok(at(0).done && at(1).done && !at(0.5).done);
  near(at(0).min, 5); near(at(0).max, 50); near(at(0).frac, 20 / 45);
  near(at(1).min, 200); near(at(1).max, 2000); near(at(1).frac, 1400 / 1800);
  near(at(0.5).min, 102.5); near(at(0.5).frac, (20 / 45 + 1400 / 1800) / 2);
  assert.equal(at(0.49).near, a); assert.equal(at(0.5).near, b);
  assert.ok(at(0.2).min < at(0.4).min && at(0.4).min < at(0.8).min, 'monotone in k');
  assert.deepEqual(at(0.3), at(0.3), 'the same k gives the same frame');
  near(at(-1).min, 5); near(at(2).max, 2000);
});
