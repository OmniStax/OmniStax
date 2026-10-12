/* figlib's space: curves and their frames, level curves, regions of integration, Riemann boxes, flow lines, planes and lines. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { frenet, circle, partials, tangents, contours, outline, edges, skins, quads, riemann2, flow, clipPlane, clipLine, tube, axes, graph, frame, plane, type V3 } from '../src/lib/fig/space';
import { volume } from '../src/lib/fig/solid';

const near = (a: number, b: number, tol: number, msg = ''): void => assert.ok(Math.abs(a - b) <= tol, `${msg} ${a} vs ${b}`);
const nearV = (a: readonly number[] | null, b: readonly number[], tol = 1e-5): void => { assert.ok(a); a.forEach((x, i) => near(x, b[i], tol, `[${i}]`)); };
const shoelace = (pts: readonly V3[]): number => Math.abs(pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
const S2 = Math.SQRT1_2;

test('the helix r(t) = ⟨cos t, sin t, t⟩ has curvature 1/2 and its T, N, B at t = 0', () => {
  const f = frenet((t) => [Math.cos(t), Math.sin(t), t], 0);
  near(f.kappa, 0.5, 1e-5);
  nearV(f.T, [0, S2, S2]); nearV(f.N, [-1, 0, 0]); nearV(f.B, [0, -S2, S2]);
});

test('a straight line has no normal and no curvature', () => {
  const f = frenet((t) => [t, 2 * t, 3], 1);
  assert.equal(f.N, null); assert.equal(f.kappa, 0);
});

test('a circle drawn about any normal stays on its radius and in its plane', () => {
  const n: V3 = [1, 2, 2], c: V3 = [1, 0, -1];
  circle(c, n, 2).forEach((p) => {
    const d = [p[0] - c[0], p[1] - c[1], p[2] - c[2]];
    near(Math.hypot(...d), 2, 1e-9); near(d[0] * n[0] + d[1] * n[1] + d[2] * n[2], 0, 1e-9);
  });
});

test('partial derivatives and the normal of a parameterised sphere', () => {
  nearV(partials((x, y) => x * x * y, 1, 2), [4, 1]);
  const { n } = tangents((u, v) => [Math.cos(u) * Math.sin(v), Math.sin(u) * Math.sin(v), Math.cos(v)], 0, Math.PI / 2);
  nearV(n, [-1, 0, 0]);
});

test('the level curve x² + y² = 1/4 on the unit square is one closed circle about its centre', () => {
  const lines = contours((s, t) => (s - 0.5) ** 2 + (t - 0.5) ** 2, 0.0625, 64);
  assert.equal(lines.length, 1);
  const l = lines[0];
  assert.deepEqual(l[0], l[l.length - 1]);
  l.forEach(([s, t]) => near(Math.hypot(s - 0.5, t - 0.5), 0.25, 2e-3));
});

test('a saddle level through the middle splits into two open curves', () => {
  const lines = contours((s, t) => (s - 0.5) * (t - 0.5), 0.02, 40);
  assert.equal(lines.length, 2);
});

test('Type I, Type II and polar regions have the areas their integrals give', () => {
  near(shoelace(outline({ x: [0, 2], y: [(x) => x / 2, 1] }, 200)), 1, 1e-9);
  near(shoelace(outline({ y: [0, 1], x: [0, (y) => 2 * y] }, 200)), 1, 1e-9);
  near(shoelace(outline({ theta: [0, 2 * Math.PI], r: [0, 1] }, 400)), Math.PI, 1e-3);
  near(shoelace(outline({ x: [0, 1], y: [(x) => x * x, (x) => Math.sqrt(x)] }, 400)), 1 / 3, 1e-4);
});

test('a disk has one edge, its circle; a full turn leaves no radial seam', () => {
  const e = edges({ theta: [0, 2 * Math.PI], r: [0, 1] });
  assert.equal(e.length, 1);
  e[0].forEach((p) => near(Math.hypot(p[0], p[1]), 1, 1e-9));
});

test('the tetrahedron under z = 6 − 2x − 3y encloses 6, and a ball of radius 2 encloses 32π/3', () => {
  const tet = skins({ x: [0, 3], y: [0, (x) => (6 - 2 * x) / 3], z: [0, (x, y) => 6 - 2 * x - 3 * y] }, 24).flatMap(quads);
  near(volume(tet), 6, 1e-6);
  const ball = skins({ theta: [0, 2 * Math.PI], phi: [0, Math.PI], rho: [0, 2] }, 96).flatMap(quads);
  near(volume(ball), (32 * Math.PI) / 3, 0.05, "inscribed, so a little under");
  const cyl = skins({ theta: [0, 2 * Math.PI], r: [0, 1], z: [0, 2] }, 96);
  assert.equal(cyl.length, 3, 'the side and the two lids; the seam and the axis left out');
});

test('double Riemann sums: midpoints exact for xy, upper right corners as the book takes them, polar cells', () => {
  near(riemann2({ x: [0, 2], y: [0, 1] }, (x, y) => x * y, 4, 4).sum, 1, 1e-12);
  /* Example 15.1: f(x, y) = 3x² − y on [0, 2] × [0, 2], 2 by 2, is 24 by upper right corners and 11 by midpoints */
  near(riemann2({ x: [0, 2], y: [0, 2] }, (x, y) => 3 * x * x - y, 2, 2, 'ur').sum, 24, 1e-12);
  near(riemann2({ x: [0, 2], y: [0, 2] }, (x, y) => 3 * x * x - y, 2, 2).sum, 11, 1e-12);
  near(riemann2({ theta: [0, 2 * Math.PI], r: [0, 1] }, () => 1, 8, 5).sum, Math.PI, 1e-12);
  near(riemann2({ x: [0, 1], y: [0, (x) => x] }, () => 1, 200, 200).sum, 0.5, 0.01);
  const { cells } = riemann2({ x: [0, 2], y: [0, 2] }, (x, y) => x + y, 2, 2);
  assert.equal(cells.length, 4); assert.deepEqual(cells[0].at, [0.5, 0.5, 1]);
});

test('a flow line of ⟨−y, x⟩ is a closed circle; one of ⟨1, 0⟩ runs across the box', () => {
  const box = [[-2, 2], [-2, 2]] as const;
  const c = flow((p) => [-p[1], p[0]], [1, 0], box);
  c.forEach((p) => near(Math.hypot(p[0], p[1]), 1, 1e-4));
  assert.deepEqual(c[0], c[c.length - 1]);
  const s = flow(() => [1, 0], [0, 0.5], box);
  near(s[0][0], -2, 0.03); near(s[s.length - 1][0], 2, 0.03);
  const sp = flow(() => [0, 0, 1], [0, 0, 0], [[-1, 1], [-1, 1], [-1, 1]]);
  near(sp[0][2], -1, 0.02); near(sp[sp.length - 1][2], 1, 0.02);
});

test('planes and lines cut by a box', () => {
  const box = [[-1, 1], [-1, 1], [-1, 1]] as const;
  const sq = clipPlane([0, 0, 0], [0, 0, 1], box);
  assert.equal(sq.length, 4); sq.forEach((p) => near(p[2], 0, 1e-12));
  assert.equal(clipPlane([0, 0, 0], [1, 1, 1], box).length, 6, 'the hexagon');
  assert.deepEqual(clipPlane([0, 0, 5], [0, 0, 1], box), []);
  const seg = clipLine([0, 0, 0], [1, 2, 0], box);
  nearV(seg?.[0] ?? null, [-0.5, -1, 0]); nearV(seg?.[1] ?? null, [0.5, 1, 0]);
  assert.equal(clipLine([0, 0, 3], [1, 0, 0], box), null);
});

test('a tube has a ring per point and two triangles per side per span', () => {
  const t = tube([[0, 0, 0], [1, 0, 0], [1, 1, 0]], 0.1, 6);
  assert.equal(t.pos.length, 3 * 3 * 6); assert.equal(t.idx.length, 2 * 6 * 6);
});

test('builders: axes tick at round steps, a graph carries its level curves, a frame its three arrows', () => {
  const ax = axes([[-1, 3], [-1, 3], [-1, 4]], { ticks: 1 });
  assert.deepEqual(ax.filter((m) => m.k === 'label' && m.cls === 'tick').map((m) => (m.k === 'label' ? m.s : '')), ['1', '2', '1', '2', '1', '2', '3']);
  const g = graph((x, y) => x * x + y * y, { x: [-2, 2], y: [-2, 2] }, '#000', { levels: [1, 2], floor: -1 });
  assert.equal(g.filter((m) => m.k === 'line').length, 2);
  assert.equal(frame((t) => [Math.cos(t), Math.sin(t), t], 0, ['#1', '#2', '#3']).filter((m) => m.k === 'arrow').length, 3);
  assert.equal(plane([0, 0, 0], [0, 0, 1], '#000', { box: [[-1, 1], [-1, 1], [-1, 1]] }).length, 2);
});
