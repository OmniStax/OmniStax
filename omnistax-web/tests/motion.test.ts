/* The pure half of the Manim layer: easing, partial polylines, the story clock and morph keys. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ease, partial, timeline, beatAt, valueAt, mkKeys, morphPlan } from '../src/lib/fig/motion';

const near = (a: number, b: number, eps = 1e-9): void => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test('every ease runs 0 to 1, clamps outside, and thereAndBack returns', () => {
  for (const [name, e] of Object.entries(ease)) {
    near(e(0), 0); near(e(-1), 0);
    near(e(1), name === 'thereAndBack' ? 0 : 1); near(e(2), name === 'thereAndBack' ? 0 : 1);
  }
  near(ease.smooth(0.5), 0.5); near(ease.inOut(0.5), 0.5); near(ease.thereAndBack(0.5), 1);
  assert.ok(ease.out(0.5) > 0.5, 'out is ahead of linear');
  assert.ok(ease.smooth(0.1) < 0.1, 'smooth starts slow');
});

test('partial cuts a polyline by arc length', () => {
  const pts = [[0, 0], [10, 0], [10, 30]] as const;
  assert.deepEqual(partial(pts, 0), [[0, 0]]);
  assert.deepEqual(partial(pts, 1), pts.slice());
  assert.deepEqual(partial(pts, 0.25), [[0, 0], [10, 0]]);
  assert.deepEqual(partial(pts, 0.5), [[0, 0], [10, 0], [10, 10]]);
  assert.deepEqual(partial(pts, 0.125), [[0, 0], [5, 0]]);
  assert.deepEqual(partial([[0, 0, 0], [0, 0, 4]], 0.5), [[0, 0, 0], [0, 0, 2]], '3D points too');
});

test('the story clock lays beats end to end and values depend only on s', () => {
  const beats = [{ ms: 1000, rest: 500 }, { ms: 2000 }, { ms: 0, rest: 0 }];
  const tl = timeline(beats);
  assert.deepEqual(tl.starts, [0, 1500, 4500]); assert.equal(tl.total, 4500);
  assert.equal(beatAt(tl, 0), 0); assert.equal(beatAt(tl, 1499), 0); assert.equal(beatAt(tl, 1500), 1); assert.equal(beatAt(tl, 9999), 2);
  const targets = [10, undefined, 30];
  near(valueAt(0, targets, tl, beats, 0), 0);
  near(valueAt(0, targets, tl, beats, 500), 5);
  near(valueAt(0, targets, tl, beats, 1200), 10);
  near(valueAt(0, targets, tl, beats, 4500), 30);
  const forward = [0, 700, 3000, 4500].map((s) => valueAt(0, targets, tl, beats, s));
  const backward = [4500, 3000, 700, 0].map((s) => valueAt(0, targets, tl, beats, s)).reverse();
  assert.deepEqual(forward, backward, 'seeking back lands where playing forward did');
  assert.equal(valueAt('wire', [undefined, 'loop', undefined], tl, beats, 1499), 'wire');
  assert.equal(valueAt('wire', [undefined, 'loop', undefined], tl, beats, 1500), 'loop', 'a choice switches at its beat start');
});

test('morph keys are read from \\mk tags and matched by set', () => {
  const a = 'p + \\mk{rho}{\\tfrac12\\rho v^2} + \\mk{gh}{\\rho g h} = \\mk{c}{3.1}';
  assert.deepEqual(mkKeys(a), ['rho', 'gh', 'c']);
  assert.deepEqual(mkKeys('\\mk{x}{1} \\mk{x}{2}'), ['x']);
  assert.equal(morphPlan(['rho', 'gh', 'c'], ['c', 'gh', 'rho']).same, true, 'order alone is no morph');
  assert.deepEqual(morphPlan(['rho', 'gh', 'c'], ['rho', 'c', 'w']), { same: false, keep: ['rho', 'c'], drop: ['gh'], add: ['w'] });
});
