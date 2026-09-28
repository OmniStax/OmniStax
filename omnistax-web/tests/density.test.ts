/* The backing store a canvas draws into: device pixels times pinch zoom, capped by area. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIG } from '../src/lib/fig/figlib';

const { backing, glRatio } = FIG;

test('the density is device pixels times the pinch zoom, with no 2x cap', () => {
  assert.deepEqual(backing(700, 1400, 600, 1, 1, 16e6), { bw: 700, bh: 300, k: 0.5 });
  assert.deepEqual(backing(700, 1400, 600, 3, 1, 16e6), { bw: 2100, bh: 900, k: 1.5 });
  assert.deepEqual(backing(700, 1400, 600, 2, 2.5, 16e6), { bw: 3500, bh: 1500, k: 2.5 });
});

test('past the area budget the density gives way and keeps the aspect', () => {
  const b = backing(1000, 1400, 700, 3, 4, 16e6);
  assert.ok(b.bw * b.bh <= 16e6 * 1.001);
  assert.ok(b.bw * b.bh > 15.9e6);
  assert.ok(Math.abs(b.bh - b.bw / 2) <= 1);
  assert.ok(Math.abs(b.k * 1400 - b.bw) < 0.5);
});

test('a WebGL canvas takes the same rule under a smaller budget', () => {
  assert.equal(glRatio(700, 300, 3, 1), 3);
  const r = glRatio(1000, 500, 3, 3);
  assert.ok(Math.abs(1000 * r * 500 * r - 8e6) < 1);
});
