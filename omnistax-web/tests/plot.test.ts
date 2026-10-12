/* figlib's function plotter: where a graph breaks, and the numbers drawn beside it. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trace, limit, slope, area, cells, clipLine, judge, ticks } from '../src/lib/fig/plot';

const box = { l: 100, r: 1300, t: 100, b: 500 };
const frame = (xr: [number, number], yr: [number, number]) => ({
  box, X: (v: number) => box.l + ((v - xr[0]) / (xr[1] - xr[0])) * (box.r - box.l), Y: (v: number) => box.b - ((v - yr[0]) / (yr[1] - yr[0])) * (box.b - box.t),
});
const X0 = frame([-2, 2], [-4, 4]).X(0);

test('a pole breaks the line and no chord crosses it', () => {
  const runs = trace((x) => 1 / x, -2, 2, frame([-2, 2], [-4, 4]));
  assert.equal(runs.length, 2);
  runs.forEach((r) => assert.ok(r.every(([x]) => x < X0) || r.every(([x]) => x > X0)));
});

test('tan breaks at every pole in view', () => {
  assert.equal(trace(Math.tan, -4, 4, frame([-4, 4], [-4, 4])).length, 3);
});

test('a jump breaks the line; a continuous curve is one run of short chords', () => {
  assert.equal(trace(Math.floor, 0, 2.5, frame([0, 3], [0, 3])).length, 3);
  const [run, ...rest] = trace((x) => x * x, -2, 2, frame([-2, 2], [0, 4]));
  assert.equal(rest.length, 0);
  run.slice(1).forEach((p, i) => assert.ok(Math.hypot(p[0] - run[i][0], p[1] - run[i][1]) <= 6 + 1e-9));
});

test('the edge of the domain is found, and a hole at 0/0 leaves a gap', () => {
  const F = frame([-1, 4], [0, 2]), [run] = trace(Math.sqrt, -1, 4, F);
  assert.ok(run[0][0] - F.X(0) < 0.05 && run[0][0] >= F.X(0));
  assert.equal(trace((x) => (x * x - 1) / (x - 1), 0, 2, frame([0, 2], [0, 4])).length, 2);
});

test('limits, slopes, areas and Riemann sums', () => {
  assert.ok(Math.abs(limit((x) => (x * x - 1) / (x - 1), 1) - 2) < 1e-6);
  assert.ok(Math.abs(limit(Math.sign, 0, -1) + 1) < 1e-12);
  assert.ok(Math.abs(slope((x) => x * x, 1) - 2) < 1e-6);
  assert.ok(Math.abs(area((x) => x * x, () => 0, 0, 2) - 8 / 3) < 1e-9);
  assert.ok(Math.abs(cells((x) => x * x, 0, 2, 4, 'left').sum - 1.75) < 1e-12);
  assert.ok(Math.abs(cells((x) => x * x, 0, 2, 4, 'right').sum - 3.75) < 1e-12);
  assert.ok(Math.abs(cells((x) => x * x, 0, 2, 4, 'trap').sum - 2.75) < 1e-12);
  assert.equal(cells((x) => x * x, 0, 2, 4, 'upper').sum, cells((x) => x * x, 0, 2, 4, 'right').sum);
});

test('a line is clipped to the frame, or is nowhere in it', () => {
  const [a, b] = clipLine(0, 0, 2, [-5, 5], [-4, 4])!;
  assert.deepEqual([a[0], a[1], b[0], b[1]], [-2, -4, 2, 4]);
  assert.equal(clipLine(0, 10, 0, [-5, 5], [-4, 4]), null);
});

const near = (a: number, b: number, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${a} is not ${b}`);

test('the largest δ for ε is found where the graph leaves the band', () => {
  near(judge((x) => 2 * x + 1, 1, 0.1, { L: 3, eps: 0.5 }, 0, 4).best, 0.25);
  const sq = judge((x) => x * x, 2, 0.2, { L: 4, eps: 1 }, 0, 4);
  near(sq.best, Math.min(2 - Math.sqrt(3), Math.sqrt(5) - 2)); assert.ok(sq.ok);
  near(sq.left, 2 - Math.sqrt(3)); near(sq.right, Math.sqrt(5) - 2);
  assert.equal(judge((x) => x * x, 2, 0.3, { L: 4, eps: 1 }, 0, 4).ok, false);
  assert.ok(judge((x) => 2 * x + 1, 1, 0.25, { L: 3, eps: 0.5 }, 0, 4).ok);
  assert.equal(judge(() => 3, 1, 1, { L: 3, eps: 0.5 }, 0, 4).best, Infinity);
});

test('no δ works for a wrong L or a jump, and one side can work alone', () => {
  assert.ok(judge((x) => Math.abs(x) / x, 0, 1e-3, { L: 0.3, eps: 0.5 }, 0, 2).best < 1e-6);
  assert.equal(judge((x) => Math.abs(x) / x, 0, 1, { L: 1, eps: 0.5 }, 1, 2).best, Infinity);
  near(judge((x) => Math.sqrt(x - 4), 4, 0.01, { L: 0, eps: 0.5 }, 1, 4).best, 0.25);
  assert.ok(judge((x) => Math.sin(1 / x), 0, 1e-3, { L: 0, eps: 0.5 }, 0, 1).best < 1e-6);
});

test('an infinite limit: δ where f stays past M', () => {
  near(judge((x) => 1 / (x - 1) ** 2, 1, 0.1, { M: 25 }, 0, 4).best, 0.2);
  near(judge((x) => 1 / (x - 1), 1, 0.1, { M: -10, to: -1 }, -1, 4).best, 0.1);
  assert.ok(judge((x) => 1 / (x - 1), 1, 0.1, { M: -10, to: -1 }, 1, 4).best < 1e-6);
});

test('ticks fall on round values at every zoom', () => {
  assert.deepEqual(ticks(-1, 1, 4), { vals: [-1, -0.5, 0, 0.5, 1], dec: 1 });
  const t = ticks(-0.0037, 0.0037, 4);
  assert.equal(t.dec, 3); assert.equal(t.vals.length, 3); near(t.vals[0], -0.002, 1e-12);
  assert.deepEqual(ticks(0, 8, 4).vals, [0, 2, 4, 6, 8]);
});
