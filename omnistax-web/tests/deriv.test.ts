/* Calculus Chapter 3's figlib parts: the tracer's covered span and the one-sided secants. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { widen, sides } from '../src/lib/fig/deriv';

test('the traced span starts at the first point and widens both ways, never narrowing', () => {
  let s = widen(null, 2);
  assert.deepEqual(s, [2, 2]);
  s = widen(s, 3); s = widen(s, 0.5); s = widen(s, 1);
  assert.deepEqual(s, [0.5, 3]);
});

test('one-sided secant slopes: a corner keeps them apart, a smooth point brings them together', () => {
  const corner = sides(Math.abs, 0, 0.01);
  assert.equal(corner.left, -1); assert.equal(corner.right, 1);
  const smooth = sides((x) => x * x, 3, 1e-4);
  assert.ok(Math.abs(smooth.left - 6) < 1e-3 && Math.abs(smooth.right - 6) < 1e-3);
  const cube = sides(Math.cbrt, 0, 0.001);
  assert.ok(Math.abs(cube.left - 100) < 1e-6 && Math.abs(cube.right - 100) < 1e-6);
});
