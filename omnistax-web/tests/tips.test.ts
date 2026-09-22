import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RETURNING_AFTER, TIPS, dayOf, visit } from '../src/lib/tips/model';

const DAY = RETURNING_AFTER;
const t0 = new Date(2026, 8, 1, 9, 0).getTime();

test('a first visit is stamped and shows no tip', () => {
  const v = visit(null, t0, true);
  assert.equal(v.tip, null);
  assert.deepEqual(v.state, { first: t0, day: null, next: 0 });
});

test('a later load within the first 24 hours shows no tip', () => {
  const s = visit(null, t0, true).state;
  assert.equal(visit(s, t0 + DAY - 1, true).tip, null);
});

test('a returning reader gets one tip a day, in turn, cycling', () => {
  let s = visit(null, t0, true).state;
  const seen: number[] = [];
  for (let d = 1; d <= TIPS.length + 1; d++) {
    const v = visit(s, t0 + d * DAY, true);
    assert.notEqual(v.tip, null);
    seen.push(v.tip!);
    const again = visit(v.state, t0 + d * DAY + 60_000, true);
    assert.equal(again.tip, null);
    s = again.state;
  }
  assert.deepEqual(seen, [...TIPS.keys(), 0]);
});

test('turned off, no tip and nothing moves', () => {
  const s = visit(null, t0, true).state;
  const v = visit(s, t0 + 2 * DAY, false);
  assert.equal(v.tip, null);
  assert.deepEqual(v.state, s);
});

test('a day is the local calendar day', () => {
  assert.equal(dayOf(new Date(2026, 0, 5, 23, 59).getTime()), '2026-01-05');
});
