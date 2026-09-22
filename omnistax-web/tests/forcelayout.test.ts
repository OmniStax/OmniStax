import { test } from 'node:test';
import assert from 'node:assert/strict';
import { layout, extentOf, gridOf, idsIn, type Edge, type LayoutNode } from '../src/lib/sections/forcelayout';

/* A small map: one root, two concepts built on it, and a leaf on one of those. */
const NODES: readonly LayoutNode[] = [
  { id: 'root', depth: 0, r: 30 },
  { id: 'a', depth: 1, r: 30 },
  { id: 'b', depth: 1, r: 30 },
  { id: 'leaf', depth: 2, r: 30 },
];
const EDGES: readonly Edge[] = [['root', 'a'], ['root', 'b'], ['a', 'leaf']];
const rad = (id: string, pos: ReadonlyMap<string, { x: number; y: number }>): number => { const p = pos.get(id)!; return Math.hypot(p.x, p.y); };

test('the layout is the same every run', () => {
  const one = layout(NODES, EDGES), two = layout(NODES, EDGES);
  assert.deepEqual([...two.entries()], [...one.entries()]);
});

test('roots settle nearer the centre than leaves', () => {
  const pos = layout(NODES, EDGES);
  assert.ok(rad('root', pos) < rad('a', pos));
  assert.ok(rad('root', pos) < rad('b', pos));
  assert.ok(rad('a', pos) < rad('leaf', pos));
});

test('nodes keep clear of each other', () => {
  const pos = layout(NODES, EDGES);
  for (const a of NODES) for (const b of NODES) {
    if (a.id >= b.id) continue;
    const p = pos.get(a.id)!, q = pos.get(b.id)!;
    assert.ok(Math.hypot(p.x - q.x, p.y - q.y) > 40, `${a.id} and ${b.id} overlap`);
  }
});

test('the grid answers with the nodes a window holds, and no others', () => {
  const pos = layout(NODES, EDGES), grid = gridOf(pos);
  const all = idsIn(grid, pos, extentOf(pos)).sort();
  assert.deepEqual(all, ['a', 'b', 'leaf', 'root']);
  const p = pos.get('leaf')!;
  const tight = idsIn(grid, pos, { x: p.x - 1, y: p.y - 1, w: 2, h: 2 });
  assert.deepEqual(tight, ['leaf']);
  assert.deepEqual(idsIn(grid, pos, { x: 1e6, y: 1e6, w: 10, h: 10 }), []);
});

test('an empty map lays out to nothing', () => {
  assert.equal(layout([], []).size, 0);
});
