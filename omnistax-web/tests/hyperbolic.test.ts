/* The hyperbolic tree and the disk's motions. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abs2, apply, centring, dragged, geodesic, hyperTree, IDENTITY, positionsFrom, reanchored, ROOT } from '../src/lib/sections/hyperbolic';
import type { Edge } from '../src/lib/sections/sugiyama';

const IDS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
const EDGES: Edge[] = [['a', 'b'], ['a', 'c'], ['b', 'd'], ['c', 'd'], ['d', 'e'], ['a', 'e'], ['f', 'g']];

test('every node lands inside the disk, and its tree parent is its deepest prerequisite', () => {
  const { pos, tree } = hyperTree(IDS, EDGES);
  IDS.forEach((id) => assert.ok(abs2(pos.get(id)!) < 1, id));
  assert.ok(tree!.has('d>e') && !tree!.has('a>e'));
  assert.ok(tree!.has('b>d') && !tree!.has('c>d'));
});

test('a drag keeps every point inside the disk and the dragged point under the pointer', () => {
  const { pos } = hyperTree(IDS, EDGES);
  let m = IDENTITY;
  const from = { x: 0.1, y: 0.2 }, to = { x: 0.9, y: -0.3 };
  for (let i = 0; i < 3; i++) m = dragged(m, from, to);
  pos.forEach((z) => assert.ok(abs2(apply(m, z)) < 1));
  const once = dragged(IDENTITY, from, to);
  const q = apply(once, from);
  assert.ok(Math.hypot(q.x - to.x, q.y - to.y) < 1e-9);
});

test('centring a node puts it at 0, and halfway leaves it on its diameter', () => {
  const { pos } = hyperTree(IDS, EDGES);
  const m = dragged(IDENTITY, { x: 0, y: 0 }, { x: 0.3, y: 0.1 });
  const w = apply(m, pos.get('e')!);
  const at = apply(centring(m, w, 1), pos.get('e')!);
  assert.ok(Math.hypot(at.x, at.y) < 1e-9);
  const half = apply(centring(m, w, 0.5), pos.get('e')!);
  assert.ok(Math.abs(half.x * w.y - half.y * w.x) < 1e-9 && abs2(half) < abs2(w));
});

test('a geodesic through the centre is a straight line, and any other an arc', () => {
  assert.match(geodesic({ x: -0.5, y: 0 }, { x: 0.5, y: 0 }, 100, { x: 0, y: 0 }), /^M-50,0L50,0$/);
  assert.match(geodesic({ x: 0.5, y: 0 }, { x: 0, y: 0.5 }, 100, { x: 0, y: 0 }), /A/);
});

test('a view anchored on another node draws every node where it was', () => {
  const { steps } = hyperTree(IDS, EDGES);
  const m = dragged(IDENTITY, { x: 0, y: 0 }, { x: -0.4, y: 0.2 });
  const before = positionsFrom(steps!, ROOT), after = positionsFrom(steps!, 'd'), m2 = reanchored(steps!, ROOT, 'd', m);
  IDS.forEach((id) => {
    const p = apply(m, before.get(id)!), q = apply(m2, after.get(id)!);
    assert.ok(Math.hypot(p.x - q.x, p.y - q.y) < 1e-9, id);
  });
  assert.ok(abs2(after.get('d')!) < 1e-18);
});
