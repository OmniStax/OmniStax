/* figlib's solids of revolution: the outline of a region, the skin it sweeps, and the volumes the book computes. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { between, betweenY, rect, strips, turn, lathe, cuts, solid, runs, triangulate, volume, area, ring, camera, backToFront, normal } from '../src/lib/fig/solid';

const near = (a: number, b: number, rel: number, msg?: string): void => assert.ok(Math.abs(a - b) <= rel * Math.abs(b), `${msg ?? ''} ${a} vs ${b}`);
const M = 720;   /* a fine turn, so the inscribed polygon's shortfall is under 0.002 % */

test('the disk method: f(x) = (x − 1)² + 1 on [−1, 3] about the x-axis sweeps 412π/15', () => {
  const f = (x: number) => (x - 1) ** 2 + 1;
  near(volume(solid(between(f, () => 0, -1, 3, 400), { y: 0 }, { m: M })), (412 * Math.PI) / 15, 1e-3);
});

test('the washer method: f(x) = x over g(x) = 1/x on [1, 4] about the x-axis sweeps 81π/4', () => {
  near(volume(solid(between((x) => x, (x) => 1 / x, 1, 4, 400), { y: 0 }, { m: M })), (81 * Math.PI) / 4, 1e-3);
});

test('another axis: 4 − x on [0, 4] about the line y = −2 sweeps 160π/3', () => {
  near(volume(solid(between((x) => 4 - x, () => 0, 0, 4, 200), { y: -2 }, { m: M })), (160 * Math.PI) / 3, 1e-3);
});

test('shells: 2x − x² on [0, 2] about the y-axis sweeps 8π/3, and x on [1, 2] about x = −1 sweeps 23π/3', () => {
  near(volume(solid(between((x) => 2 * x - x * x, () => 0, 0, 2, 400), { x: 0 }, { m: M })), (8 * Math.PI) / 3, 1e-3);
  near(volume(solid(between((x) => x, () => 0, 1, 2, 50), { x: -1 }, { m: M })), (23 * Math.PI) / 3, 1e-3);
});

test('a region given in y: g(y) = √(4 − y) on [0, 4] about the y-axis sweeps 8π', () => {
  near(volume(solid(betweenY((y) => Math.sqrt(4 - y), () => 0, 0, 4, 2000), { x: 0 }, { m: M })), 8 * Math.PI, 2e-3);
});

test('Pappus: a circle of radius 2 about 4 from the y-axis sweeps 32π²', () => {
  const disk = Array.from({ length: 400 }, (_, i) => [4 + 2 * Math.cos((2 * Math.PI * i) / 400), 2 * Math.sin((2 * Math.PI * i) / 400)] as const);
  near(volume(solid(disk, { x: 0 }, { m: M })), 32 * Math.PI * Math.PI, 1e-3);
});

test('a part turn is closed by its two cut faces, and holds that share of the volume', () => {
  const R = between((x) => Math.sqrt(x), () => 1, 1, 4, 300), whole = (9 * Math.PI) / 2;
  assert.equal(cuts(R, { y: 0 }, {}).length, 0, 'a full turn has no cut');
  near(volume(solid(R, { y: 0 }, { to: Math.PI / 2, m: M })), whole / 4, 1e-3, 'a quarter turn');
  near(volume(solid(R, { y: 0 }, { from: 0.3, to: 0.3 + Math.PI, m: M })), whole / 2, 1e-3, 'a half turn from 0.3');
});

test('the Riemann rectangles: their disks sum to the midpoint rule, their shells to the shell sum', () => {
  const f = (x: number) => Math.sqrt(x), n = 6, w = 3 / n;
  const disks = strips(f, () => 0, 1, 4, n).reduce((s, r) => s + volume(solid(r, { y: 0 }, { m: M })), 0);
  const mid = Array.from({ length: n }, (_, i) => Math.PI * (1 + (i + 0.5) * w) * w).reduce((a, b) => a + b, 0);
  near(disks, mid, 1e-4);
  const shells = strips((x) => 2 * x - x * x, () => 0, 0, 2, 4).reduce((s, r) => s + volume(solid(r, { x: 0 }, { m: M })), 0);
  const sum = [0.25, 0.75, 1.25, 1.75].reduce((s, x) => s + 2 * Math.PI * x * (2 * x - x * x) * 0.5, 0);
  near(shells, sum, 1e-4);
});

test('a curve sweeps a surface of revolution: √x on [1, 4] about the x-axis has area (π/6)(17√17 − 5√5)', () => {
  const xs = Array.from({ length: 1201 }, (_, i) => 1 + (3 * i) / 1200), line = xs.map((x) => [x, Math.sqrt(x)] as const);
  near(area(lathe(line, { y: 0 }, { m: M }, false)), (Math.PI / 6) * (17 * Math.sqrt(17) - 5 * Math.sqrt(5)), 1e-3);
});

test('a point turns about either axis and keeps its distance; at a quarter turn it faces the reader', () => {
  const p = turn([2, 3], { y: 1 }, Math.PI / 2);
  near(p[2], 2, 1e-12); near(p[0], 2, 1e-12); assert.ok(Math.abs(p[1] - 1) < 1e-12);
  const q = turn([3, 5], { x: -1 }, Math.PI / 2);
  near(q[2], 4, 1e-12); assert.ok(Math.abs(q[0] + 1) < 1e-12); near(q[1], 5, 1e-12);
  assert.equal(ring([1, 1], { y: 0 }, { m: 12 }).length, 13);
});

test('a rectangle is cut into its four sides; a smooth closed outline stays one run', () => {
  assert.equal(runs(rect(0, 1, 0, 2)).length, 4);
  const circle = Array.from({ length: 60 }, (_, i) => [Math.cos(i / 9.55), Math.sin(i / 9.55)] as const);
  assert.equal(runs(circle).length, 1);
  assert.equal(runs([[0, 0], [1, 0], [1, 1]], false).length, 2, 'an open outline cut at its corner');
});

test('ear clipping covers a non-convex outline exactly once', () => {
  const L = [[0, 0], [2, 0], [2, 1], [1, 1], [1, 2], [0, 2]] as const;
  const tris = triangulate(L);
  assert.equal(tris.length, 4);
  const a = tris.reduce((s, [i, j, k]) => s + Math.abs((L[j][0] - L[i][0]) * (L[k][1] - L[i][1]) - (L[j][1] - L[i][1]) * (L[k][0] - L[i][0])) / 2, 0);
  near(a, 3, 1e-12);
});

test('the painter orders faces far to near and lights either side alike', () => {
  const cam = camera({ yaw: 0, pitch: 0, dist: 1000, cx: 700, cy: 300, s: 100 });
  const near3 = [[0, 0, 1], [1, 0, 1], [1, 1, 1]] as const, far3 = [[0, 0, -1], [1, 0, -1], [1, 1, -1]] as const;
  assert.deepEqual(backToFront([near3, far3], cam), [far3, near3]);
  assert.equal(cam.light(normal(near3)), cam.light(normal([...near3].reverse())));
  const [x, y] = cam.P([0, 0, 0]); near(x, 700, 1e-9); near(y, 300, 1e-9);
});
