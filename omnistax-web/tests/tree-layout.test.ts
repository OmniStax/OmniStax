import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boundsOf, layoutTree, type Box } from '../src/lib/tree/layout';

type Tree = Readonly<Record<string, readonly string[]>>;
const kids = (t: Tree) => (id: string): readonly string[] => t[id] ?? [];
const overlap = (a: Box, b: Box): boolean => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const noOverlaps = (m: ReadonlyMap<string, Box>): void => {
  const all = [...m];
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++)
    assert.ok(!overlap(all[i][1], all[j][1]), `${all[i][0]} overlaps ${all[j][0]}`);
};
const at = (m: ReadonlyMap<string, Box>, id: string): Box => { const b = m.get(id); assert.ok(b, id); return b; };
const centre = (b: Box): number => b.x + b.w / 2;

test('a lone root sits at the origin with its own size', () => {
  const m = layoutTree('r', kids({}), () => ({ w: 40, h: 20 }));
  assert.deepEqual(at(m, 'r'), { x: 0, y: 0, w: 40, h: 20 });
});

test('a chain stacks straight down under its parent, gap by gap', () => {
  const m = layoutTree('a', kids({ a: ['b'], b: ['c'] }), (id) => ({ w: 50, h: id === 'b' ? 30 : 10 }), { x: 5, y: 7 });
  assert.equal(at(m, 'b').y, 17);
  assert.equal(at(m, 'c').y, 17 + 30 + 7);
  assert.equal(at(m, 'a').x, at(m, 'c').x);
});

test('siblings run left to right in the given order, with the parent centred over them', () => {
  const m = layoutTree('r', kids({ r: ['a', 'b', 'c'] }), () => ({ w: 20, h: 10 }), { x: 4, y: 6 });
  const [a, b, c] = ['a', 'b', 'c'].map((id) => at(m, id));
  assert.ok(a.x < b.x && b.x < c.x);
  assert.equal(b.x - a.x, 24);
  assert.equal(centre(at(m, 'r')), (centre(a) + centre(c)) / 2);
  assert.equal(boundsOf(m.values()).x, 0);
});

test('boxes of different sizes never overlap, however deep', () => {
  const t: Tree = { r: ['a', 'b', 'c'], a: ['a1', 'a2', 'a3'], a2: ['x', 'y'], b: ['b1'], b1: ['b2'], b2: ['b3', 'b4'], c: ['c1', 'c2'] };
  const size = (id: string) => ({ w: 20 + (id.charCodeAt(id.length - 1) % 7) * 11, h: 10 + id.length * 9 });
  const m = layoutTree('r', kids(t), size);
  assert.equal(m.size, 15);
  noOverlaps(m);
  for (const [p, cs] of Object.entries(t)) for (const c of cs) assert.ok(at(m, c).y >= at(m, p).y + at(m, p).h, `${c} under ${p}`);
});

test('a small subtree tucks under a wide neighbour rather than beside its whole width', () => {
  const t: Tree = { r: ['a', 'b'], a: ['a1'], a1: ['wide'] };
  const size = (id: string) => ({ w: id === 'wide' ? 300 : 20, h: 10 });
  const m = layoutTree('r', kids(t), size, { x: 4, y: 4 });
  noOverlaps(m);
  assert.ok(at(m, 'b').x < at(m, 'wide').x + 300);
});

test('a cycle in the children stops rather than looping', () => {
  const m = layoutTree('a', kids({ a: ['b'], b: ['a'] }), () => ({ w: 10, h: 10 }));
  assert.equal(m.size, 2);
});
