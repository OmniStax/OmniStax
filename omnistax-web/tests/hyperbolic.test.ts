/* The hyperbolic tree and the disk's motions. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abs2, apply, centring, dragged, geodesic, hyperTree, IDENTITY, positionsFrom, reanchored, ROOT, SEP, STEP } from '../src/lib/sections/hyperbolic';
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

/* Siblings stand apart: a crowd under one parent is pushed out along its wedge, and
   split into two rings when one would not do, so that neighbours in a ring are at
   least SEP apart at the scale a node is drawn at there. A small family keeps STEP. */
test('siblings never overlap, and a small family stands at STEP', () => {
  const ids = Array.from({ length: 30 }, (_, i) => `n${i}`);
  const { pos } = hyperTree(ids, []);
  const rings = new Map<number, string[]>();
  ids.forEach((id) => { const r = Math.round(Math.sqrt(abs2(pos.get(id)!)) * 1e6) / 1e6; (rings.get(r) ?? rings.set(r, []).get(r)!).push(id); });
  assert.ok(rings.size === 2, 'thirty children take two rings');
  rings.forEach((ring, r) => {
    const room = SEP * (1 - r * r);
    ring.forEach((a, i) => ring.slice(i + 1).forEach((b) => {
      const p = pos.get(a)!, q = pos.get(b)!;
      assert.ok(Math.hypot(p.x - q.x, p.y - q.y) >= room - 1e-9, `${a} and ${b} overlap`);
    }));
  });
  ids.forEach((id) => assert.ok(abs2(pos.get(id)!) < 1, id));
  const few = hyperTree(['a', 'b', 'c'], []).pos;
  ['a', 'b', 'c'].forEach((id) => assert.ok(Math.abs(Math.sqrt(abs2(few.get(id)!)) - STEP) < 1e-9));
  /* a dozen in one ring, pushed out past STEP */
  const dozen = Array.from({ length: 12 }, (_, i) => `d${i}`);
  const mid = hyperTree(dozen, []).pos;
  const r12 = Math.sqrt(abs2(mid.get('d0')!));
  assert.ok(r12 > STEP && r12 <= 0.75);
  dozen.forEach((id) => assert.ok(Math.abs(Math.sqrt(abs2(mid.get(id)!)) - r12) < 1e-9));
});
