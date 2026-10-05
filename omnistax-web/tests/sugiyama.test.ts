/* The layered layout, and what the build and the browser agree on. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sugiyama, layersOf, GAP, type Edge, type LayoutNode } from '../src/lib/sections/sugiyama';
import { boxOf, fileEntryOf, hashOf, keyOf, laidOf, laidOut, LayoutFileSchema, layoutUrlOf } from '../src/lib/sections/layouts';
import type { DagNode } from '../src/lib/sections/dag';

/* a diamond a → b, a → c, b → d, c → d, a long edge a → e skipping two layers, and e under d */
const NODES: LayoutNode[] = ['a', 'b', 'c', 'd', 'e', 'f'].map((id, i) => ({ id, w: 60 + i * 10, h: 30 }));
const EDGES: Edge[] = [['a', 'b'], ['a', 'c'], ['b', 'd'], ['c', 'd'], ['d', 'e'], ['a', 'e'], ['f', 'c']];

test('a concept stands one layer below its deepest prerequisite', () => {
  const l = layersOf(NODES.map((n) => n.id), EDGES);
  assert.deepEqual(['a', 'b', 'c', 'd', 'e', 'f'].map((id) => l.get(id)), [0, 1, 1, 2, 3, 0]);
});

test('no edge points upward, and a long edge bends once per layer it crosses', () => {
  const { pos, bends } = sugiyama(NODES, EDGES);
  EDGES.forEach(([a, b]) => assert.ok(pos.get(a)!.y < pos.get(b)!.y, `${a} → ${b}`));
  assert.equal(bends.get('a>e')?.length, 2);
  assert.equal(bends.get('a>b'), undefined);
});

test('no two boxes on a layer overlap', () => {
  const { pos } = sugiyama(NODES, EDGES);
  const box = new Map(NODES.map((n) => [n.id, n]));
  const ids = [...pos.keys()];
  ids.forEach((a, i) => ids.slice(i + 1).forEach((b) => {
    const p = pos.get(a)!, q = pos.get(b)!;
    if (p.y !== q.y) return;
    assert.ok(Math.abs(p.x - q.x) >= (box.get(a)!.w + box.get(b)!.w) / 2 + GAP - 0.2, `${a} and ${b}`);
  }));
});

test('left to right runs every edge rightward', () => {
  const { pos } = laidOut('right', NODES, EDGES);
  EDGES.forEach(([a, b]) => assert.ok(pos.get(a)!.x < pos.get(b)!.x));
});

test('a cycle does not hang the layering', () => {
  const l = layersOf(['x', 'y'], [['x', 'y'], ['y', 'x']]);
  assert.equal(l.size, 2);
});

const dag = (id: string, prereqs: string[] = []): DagNode =>
  ({ id, name: id, kind: 'definition', section: '1.1', status: 'built', prereqs, ext: false } as unknown as DagNode);

test('the layout the build writes reads back as the layout itself', () => {
  const laid = sugiyama(NODES, EDGES);
  const file = LayoutFileSchema.parse(JSON.parse(JSON.stringify({ k: fileEntryOf(laid) })));
  const back = laidOf(file, 'k')!;
  assert.deepEqual([...back.pos], [...laid.pos]);
  assert.deepEqual([...back.bends], [...laid.bends]);
  assert.equal(laidOf(file, 'other'), null);
});

test('the key is the node set and the kind, whatever order the nodes come in', () => {
  assert.equal(keyOf([dag('a'), dag('b')], 'down'), keyOf([dag('b'), dag('a')], 'down'));
  assert.notEqual(keyOf([dag('a')], 'down'), keyOf([dag('a')], 'disk'));
  assert.equal(hashOf(['x', 'y']), hashOf(['y', 'x']));
});

test('another section costs a line, and a longer name a wider box', () => {
  assert.ok(boxOf({ name: 'Force', ext: true }).h > boxOf({ name: 'Force', ext: false }).h);
  assert.ok(boxOf({ name: 'Conservation of momentum', ext: false }).w > boxOf({ name: 'Force', ext: false }).w);
});

test("the layout file stands beside the book's concepts", () => {
  assert.equal(layoutUrlOf('/b/concepts.json?v=3'), '/b/layout.json?v=3');
});
