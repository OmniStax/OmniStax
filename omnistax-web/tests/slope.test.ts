/* Calculus Chapter 8's figlib part: direction-field segments, solution curves and Euler's Method. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { grid, segment, trace, euler } from '../src/lib/fig/slope';

const near = (a: number, b: number, tol: number): void => assert.ok(Math.abs(a - b) < tol, `${a} vs ${b}`);

test('Euler’s Method reproduces the book’s tables (Calculus 8.2)', () => {
  const t1 = euler((x, y) => x * x - y * y, [-1, 2], 0.1, 10).map(([, y]) => y);
  [2, 1.7, 1.492, 1.3334, 1.2046, 1.0955, 1.0004, 0.9164, 0.8414, 0.7746, 0.7156].forEach((v, i) => near(t1[i], v, 1e-3));
  const t2 = euler((x, y) => 3 * x * x - y * y + 1, [0, 2], 0.1, 10).map(([, y]) => y);
  [2, 1.7, 1.514, 1.3968, 1.3287, 1.3001, 1.3061, 1.3435, 1.41, 1.5032, 1.6202].forEach((v, i) => near(t2[i], v, 1e-3));
  const pts = euler((x) => 2 * x - 3, [0, 3], 0.5, 6);
  assert.deepEqual(pts.map(([x]) => x), [0, 0.5, 1, 1.5, 2, 2.5, 3]);
  assert.deepEqual(pts.map(([, y]) => y), [3, 1.5, 0.5, 0, 0, 0.5, 1.5]);
});

test('a solution curve runs both ways through its point and matches the exact solution', () => {
  const c = trace((x) => 2 * x, [2, 7], [-4, 4], [-10, 30]);
  assert.ok(c[0][0] <= -4 + 1e-9 && c[c.length - 1][0] >= 4 - 1e-9);
  c.forEach(([x, y]) => near(y, x * x + 3, 1e-6));
  const e = trace((_x, y) => y, [0, 1], [-1, 1], [-1, 4]);
  near(e[e.length - 1][1], Math.E, 1e-6);
  const ivp = trace((x, y) => 3 * x + 2 * y - 4, [0, 1], [-1, 1], [-20, 20]);
  ivp.forEach(([x, y]) => near(y, -1.5 * x + 1.25 - 0.25 * Math.exp(2 * x), 1e-4));
});

test('a solution that blows up stops once it has left the window', () => {
  const c = trace((_x, y) => y * y, [0, 1], [-2, 2], [-5, 5]);
  const last = c[c.length - 1];
  assert.ok(last[0] < 1 && last[1] > 5);
  assert.ok(c.every(([, y]) => Number.isFinite(y)));
});

test('a segment has its length on the canvas whatever the slope, and is vertical where the slope is infinite', () => {
  const len = (s: ReturnType<typeof segment>, sx: number, sy: number): number => Math.hypot((s![1][0] - s![0][0]) * sx, (s![1][1] - s![0][1]) * sy);
  near(len(segment(0, 0, 1, 30, 50, 20), 50, 20), 30, 1e-9);
  near(len(segment(1, 2, -7, 30, 50, 20), 50, 20), 30, 1e-9);
  const v = segment(1, 2, Infinity, 30, 50, 20)!;
  assert.equal(v[0][0], 1); assert.equal(v[1][0], 1);
  assert.equal(segment(0, 0, NaN, 30, 50, 20), null);
  assert.equal(grid([0, 4], [0, 2], [4, 2]).length, 8);
  assert.deepEqual(grid([0, 4], [0, 2], [4, 2])[0], [0.5, 0.5]);
});
