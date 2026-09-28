/* The pure half of a choice that morphs, LaggedStart, and shapes that bend into shapes. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blend, partAlpha, partOff, stagger, resample, lerpPts, blendFn, parseRgba, mixRgba } from '../src/lib/fig/motion';

const near = (a: number, b: number, eps = 1e-9): void => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test('blend mixes numbers, arrays elementwise and flat records, and takes the new value on a mismatch', () => {
  near(blend(1, 3, 0.5), 2);
  assert.deepEqual(blend([0, 10], [10, 20], 0.5), [5, 15]);
  assert.deepEqual(blend({ n: 1, p: [0, 0] }, { n: 2, p: [2, 4] }, 0.5), { n: 1.5, p: [1, 2] });
  assert.deepEqual(blend([0, 1], [5, 5, 5], 0.5), [5, 5, 5], 'length mismatch');
  assert.deepEqual(blend({ a: 1 } as Record<string, number>, { b: 2 }, 0.5), { b: 2 }, 'key mismatch');
  assert.deepEqual(blend(1 as number | number[], [2], 0.5), [2], 'shape mismatch');
  near(blend(1, 3, 1), 3);
});

test('a part fades out by 60 % and in over the last 60 %; offsets slide in from -shift, out toward +shift', () => {
  near(partAlpha('a', 'a', 'a', 0), 1);
  near(partAlpha('b', 'a', 'a', 0.5), 0);
  near(partAlpha('a', 'a', 'b', 0), 1); near(partAlpha('a', 'a', 'b', 0.3), 0.5); near(partAlpha('a', 'a', 'b', 0.6), 0);
  near(partAlpha('b', 'a', 'b', 0.4), 0); near(partAlpha('b', 'a', 'b', 0.7), 0.5); near(partAlpha('b', 'a', 'b', 1), 1);
  near(partAlpha('c', 'a', 'b', 0.5), 0);
  assert.deepEqual(partOff('b', 'a', 'b', 0.4, [0, 30]), [0, -30]);
  assert.deepEqual(partOff('a', 'a', 'b', 0.6, [0, 30]), [0, 30]);
  assert.deepEqual(partOff('b', 'a', 'b', 1, [0, 30]), [0, 0]);
  assert.deepEqual(partOff('a', 'a', 'a', 0.5, [0, 30]), [0, 0]);
});

test('stagger starts members one lag apart and ends the last at 1', () => {
  near(stagger(0, 0, 3), 0); near(stagger(1, 2, 3), 1);
  const span = 1 / 1.2;
  near(stagger(span, 0, 3), 1);
  near(stagger(0.1 * span, 1, 3), 0);
  assert.ok(stagger(0.5, 0, 3) > stagger(0.5, 1, 3) && stagger(0.5, 1, 3) > stagger(0.5, 2, 3));
  near(stagger(0.5, 0, 1), 0.5);
});

test('resample spaces points evenly by arc length, open or closed, 2D or 3D', () => {
  assert.deepEqual(resample([[0, 0], [10, 0], [10, 10]], 5), [[0, 0], [5, 0], [10, 0], [10, 5], [10, 10]]);
  assert.deepEqual(resample([[0, 0], [4, 0], [4, 4], [0, 4]], 4, true), [[0, 0], [4, 0], [4, 4], [0, 4]]);
  assert.deepEqual(resample([[0, 0], [2, 0], [2, 2], [0, 2]], 8, true)[7], [0, 1]);
  assert.deepEqual(resample([[0, 0, 0], [0, 0, 4]], 3), [[0, 0, 0], [0, 0, 2], [0, 0, 4]]);
  assert.deepEqual(resample([[1, 1]], 3), [[1, 1], [1, 1], [1, 1]]);
  assert.deepEqual(resample([], 3), []);
});

test('lerpPts brings both to the larger count and blends', () => {
  const a: number[][] = [[0, 0], [10, 0]], b: number[][] = [[0, 10], [5, 10], [10, 10]];
  assert.deepEqual(lerpPts(a, b, 0), [[0, 0], [5, 0], [10, 0]]);
  assert.deepEqual(lerpPts(a, b, 0.5), [[0, 5], [5, 5], [10, 5]]);
  assert.deepEqual(lerpPts(a, b, 1), b);
});

test('blendFn mixes two curves at the same t', () => {
  const f = blendFn((t) => t, (t) => 3 * t, 0.5);
  near(f(2), 4);
  near(blendFn((t) => t, () => NaN, 0)(2), 2);
  assert.ok(Number.isNaN(blendFn(() => 1, () => NaN, 1)(0)));
});

test('parseRgba reads what the canvas writes back, and mixRgba blends in sRGB', () => {
  assert.deepEqual(parseRgba('#ff8000'), [255, 128, 0, 1]);
  assert.deepEqual(parseRgba('#f80'), [255, 136, 0, 1]);
  assert.deepEqual(parseRgba('rgba(10, 20, 30, 0.5)'), [10, 20, 30, 0.5]);
  assert.deepEqual(parseRgba('rgb(10 20 30 / 50%)'), [10, 20, 30, 0.5]);
  assert.equal(parseRgba('oklch(0.5 0.1 200)'), null);
  assert.equal(mixRgba([0, 0, 0, 1], [255, 100, 10, 1], 0.5), 'rgb(128, 50, 5)');
  assert.equal(mixRgba([0, 0, 0, 1], [0, 0, 0, 0], 0.5), 'rgba(0, 0, 0, 0.5)');
  assert.equal(mixRgba([0, 0, 0, 1], [9, 9, 9, 1], 2), 'rgb(9, 9, 9)');
});
