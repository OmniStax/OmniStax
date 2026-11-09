/* The book's default colours are stable (src/lib/colours/defaults.ts): a type keeps its stored colour, a new
   type takes a free one, a colour moves only when it collides or no longer reads, and a pin holds. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assignStable, withPins } from '../src/lib/colours/defaults';
import { familyHues } from '../src/lib/colours/sample';
import type { PageCounts } from '../src/lib/colours/counts';
import type { Hue } from '../src/lib/colours/model';
import { distance } from '../src/lib/colours/oklab';

const PAL = familyHues(12, 'normal') as readonly Hue[];
const pages: readonly PageCounts[] = [new Map([['a', 3], ['b', 2], ['c', 1]]), new Map([['c', 2], ['d', 2]])];
const base = { colours: PAL, pages, fixed: new Map(), vision: 'normal' as const };

test('assignStable: stored types keep their colours and a new type takes a free one', () => {
  const stored = { a: PAL[5], b: PAL[2], c: PAL[7] };
  const { assign, moves } = assignStable({ ...base, categories: ['a', 'b', 'c', 'd'], stored });
  assert.deepEqual([assign.get('a'), assign.get('b'), assign.get('c')], [PAL[5], PAL[2], PAL[7]]);
  const d = assign.get('d') as Hue;
  assert.ok(![PAL[5], PAL[2], PAL[7]].some((h) => h.light === d.light), 'the new type wears no colour already in use');
  assert.deepEqual(moves.map((m) => [m.type, m.why]), [['d', 'is new']]);
});

test('assignStable: a type sharing a page with a twin of its colour moves, and the move is reported', () => {
  const { assign, moves } = assignStable({ ...base, categories: ['a', 'b', 'c'], stored: { a: PAL[1], b: PAL[1], c: PAL[3] } });
  assert.deepEqual(assign.get('a'), PAL[1]);
  assert.notDeepEqual(assign.get('b'), PAL[1]);
  assert.ok(distance(assign.get('b') as Hue, PAL[1], 'normal') > 0.03);
  assert.equal(moves.length, 1);
  assert.equal(moves[0].type, 'b');
  assert.match(moves[0].why, /within ΔE 0.03 of a/);
});

test('assignStable and withPins: a pin holds, and the type that wore its colour takes the pinned type’s old one', () => {
  const stored = { a: PAL[1], b: PAL[2], c: PAL[3] };
  const { assign, moves } = assignStable({ ...base, categories: ['a', 'b', 'c'], stored, pins: { a: PAL[2] } });
  assert.deepEqual([assign.get('a'), assign.get('b'), assign.get('c')], [PAL[2], PAL[1], PAL[3]]);
  assert.deepEqual(moves.map((m) => m.type).sort(), ['a', 'b']);
  assert.deepEqual([...withPins(new Map([['x', PAL[0]], ['y', PAL[4]]]), { x: PAL[4] })], [['x', PAL[4]], ['y', PAL[0]]]);
});
