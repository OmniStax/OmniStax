/* The build and the browser must agree about the concept map, or the file the
   build writes is never the file the browser asks for. Two things have to hold:
   the key a node set is written under is the key it is looked up under, and the
   places written under it are the places the browser would have settled. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { DagNode } from '../src/lib/sections/dag';
import { boxOf, hashOf, keyOf, layoutNodes, placesFor, seedPositions } from '../src/lib/sections/forcelayout';
import { LayoutFileSchema, layoutUrlOf, positionsOf } from '../src/lib/sections/layouts';

/* A small scope: two concepts taken for granted and three built on them. */
const concept = (id: string, name: string, prereqs: string[], ext = false): DagNode =>
  ({ status: 'built', id, name, kind: 'idea', section: '1.1', bloom: 'understand', why: '', prereqs, ext } as unknown as DagNode);
const LIST: readonly DagNode[] = [
  concept('newton-second', "Newton's second law", []),
  concept('mass', 'mass', []),
  concept('momentum', 'momentum', ['mass']),
  concept('impulse', 'impulse', ['momentum', 'newton-second']),
  concept('collision', 'collision', ['impulse']),
];

/* What the build endpoint writes, and what the reader's browser reads back. */
const built = (list: readonly DagNode[]): Record<string, Record<string, [number, number]>> =>
  ({ [keyOf(list)]: Object.fromEntries([...placesFor(list)].map(([id, p]) => [id, [p.x, p.y] as [number, number]])) });

test('the layout the build writes is the layout the browser would settle', () => {
  const file = LayoutFileSchema.parse(built(LIST));
  const fromFile = positionsOf(file, keyOf(LIST));
  assert.ok(fromFile, 'the file is keyed by what the browser looks up');
  assert.deepEqual([...fromFile!.entries()].sort(), [...placesFor(LIST).entries()].sort());
});

test('a node set the build did not write falls through to a settle of its own', () => {
  const file = LayoutFileSchema.parse(built(LIST));
  assert.equal(positionsOf(file, keyOf(LIST.slice(1))), null);
});

test('the key is the node set, whatever order it comes in', () => {
  const ids = LIST.map((c) => c.id);
  assert.equal(hashOf(ids), hashOf([...ids].reverse()));
  assert.notEqual(hashOf(ids), hashOf(ids.slice(1)));
});

test('a node takes up the same box on both sides, and another section costs a line', () => {
  const plain = boxOf({ name: 'mass', ext: false });
  assert.ok(plain.w >= 62 && plain.h > 0);
  assert.equal(boxOf({ name: 'mass', ext: true }).h, plain.h + 12);
  assert.deepEqual(boxOf({ name: 'mass', ext: false }), boxOf({ name: 'mass', ext: false }));
});

test('the seed rings hold every node and grow with depth', () => {
  const nodes = layoutNodes(LIST);
  const seeds = seedPositions(nodes);
  assert.equal(seeds.size, LIST.length);
  const rad = (id: string) => { const p = seeds.get(id)!; return Math.hypot(p.x, p.y); };
  assert.ok(rad('mass') < rad('collision'));
});

test("the layout file stands beside the book's concepts", () => {
  assert.equal(layoutUrlOf('/college-physics-2e/concepts.json'), '/college-physics-2e/layout.json');
});
