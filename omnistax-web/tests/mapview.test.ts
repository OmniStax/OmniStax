/* The concept map's view and selection: the scale a level opens at, what a
   focus keeps, how it packs, and where a level is remembered. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { connectedOf, crowdScale, mapViews, packed, touched, viewKeyOf, OPENING_MOST } from '../src/lib/sections/mapview';
import { GAP, type Edge, type Pt } from '../src/lib/sections/forcelayout';
import { bookId, chapterId, sectionId } from '../src/lib/types/ids';

/* a square grid of points, one map unit apart, centred on the origin */
const square = (n: number): Pt[] => Array.from({ length: n * n }, (_, i) => ({ x: (i % n) - (n - 1) / 2, y: Math.floor(i / n) - (n - 1) / 2 }));
const inside = (pts: readonly Pt[], k: number, w: number, h: number): number =>
  pts.filter((p) => Math.abs(p.x) <= w / (2 * k) && Math.abs(p.y) <= h / (2 * k)).length;

test('a level of a hundred concepts or fewer opens fitted', () => {
  assert.equal(crowdScale(square(10), { x: 0, y: 0 }, 800, 600), null);
});

test('a larger level opens at the scale that holds no more than a hundred', () => {
  const pts = square(40), w = 800, h = 600;
  const k = crowdScale(pts, { x: 0, y: 0 }, w, h)!;
  const held = inside(pts, k, w, h);
  assert.ok(held <= OPENING_MOST && held > OPENING_MOST / 2, `${held} held`);
  /* a little further out holds more than a hundred */
  assert.ok(inside(pts, k * 0.9, w, h) > OPENING_MOST);
});

/* a chain a → b → c → d, and a side branch x → c, and an island y */
const EDGES: readonly Edge[] = [['a', 'b'], ['b', 'c'], ['c', 'd'], ['x', 'c']];

test('a focus keeps every prerequisite and every concept built on the selection', () => {
  assert.deepEqual([...connectedOf(EDGES, ['b'])].sort(), ['a', 'b', 'c', 'd']);
  assert.deepEqual([...connectedOf(EDGES, ['c'])].sort(), ['a', 'b', 'c', 'd', 'x']);
  assert.deepEqual([...connectedOf(EDGES, ['y'])], ['y']);
});

test('a focus is not the whole component: a sibling through a shared dependent stays out', () => {
  assert.ok(!connectedOf(EDGES, ['a']).has('x'));
});

test('a packed focus is closer together, and no two of its boxes overlap', () => {
  const box = () => ({ w: 60, h: 30 });
  const pos = new Map(['a', 'b', 'c', 'd'].map((id, i) => [id, { x: i * 900, y: (i % 2) * 700 }]));
  const ids = new Set(pos.keys());
  const out = packed(pos, ids, new Set(['a']), box);
  const span = (m: ReadonlyMap<string, Pt>) => Math.max(...[...m.values()].map((p) => p.x)) - Math.min(...[...m.values()].map((p) => p.x));
  assert.ok(span(out) < span(pos) / 2);
  const ps = [...out.values()];
  ps.forEach((p, i) => ps.slice(i + 1).forEach((q) => assert.ok(Math.abs(p.x - q.x) >= 60 + GAP - 0.1 || Math.abs(p.y - q.y) >= 30 + GAP - 0.1)));
});

test('a lasso takes every box it touches', () => {
  const pos = new Map([['a', { x: 0, y: 0 }], ['b', { x: 100, y: 0 }], ['c', { x: 300, y: 0 }]]);
  const hit = touched({ x: 60, y: -5, w: 20, h: 10 }, pos.keys(), (id) => pos.get(id), () => ({ w: 50, h: 20 }));
  assert.deepEqual(hit, ['b']);
});

test('each map tab remembers each level apart, until it is let go', () => {
  const book = bookId('b');
  const ch = viewKeyOf('concepts:1', { level: 'chapter', book, chapter: chapterId('6') });
  const sec = viewKeyOf('concepts:1', { level: 'section', book, section: sectionId('6.1') });
  assert.notEqual(ch, sec);
  assert.notEqual(ch, viewKeyOf('concepts:2', { level: 'chapter', book, chapter: chapterId('6') }));
  mapViews.keep(ch, { x: 10, y: 20, k: 0.5 });
  assert.deepEqual(mapViews.get(ch), { x: 10, y: 20, k: 0.5 });
  assert.equal(mapViews.get(sec), undefined);
  mapViews.forget(ch);
  assert.equal(mapViews.get(ch), undefined);
});
