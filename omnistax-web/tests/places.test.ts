import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePlaces, placeKey, prunePlaces } from '../src/lib/layout/places';

test('a saved place is read back with its anchor, or as an offset alone, or not at all', () => {
  const read = parsePlaces({ a: { top: 120, at: '2.1-p3', off: -14 }, b: { top: 40 }, c: { top: 0 }, d: { top: 'x' }, e: null, f: { top: 9, at: '', off: 1 }, g: { top: 9, at: 'p' } });
  assert.deepEqual(read, { a: { top: 120, at: '2.1-p3', off: -14 }, b: { top: 40 }, f: { top: 9 }, g: { top: 9 } });
  assert.deepEqual(parsePlaces(null), {});
  assert.deepEqual(parsePlaces([1]), {});
});

test('the place of a tab that has been closed is let go', () => {
  const all = { [placeKey('g1', 'doc:b/1.1')]: { top: 10 }, [placeKey('g2', 'doc:b/1.1')]: { top: 20 } };
  assert.deepEqual(prunePlaces(all, new Set([placeKey('g2', 'doc:b/1.1')])), { 'g2|doc:b/1.1': { top: 20 } });
});
