import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeAnchor, locate, overlaps } from '../src/lib/notes/anchor';

const text = 'The period is the time for one oscillation. The period of a pendulum depends on its length. The period is constant.';
test('a unique quote is found by itself', () => {
  const a = makeAnchor(text, { start: 4, end: 10 });
  assert.equal(a.quote, 'period'); assert.deepEqual(locate('xx ' + text, a), { start: 7, end: 13 });
});
test('a repeated quote is told apart by its context', () => {
  const second = text.indexOf('The period of');
  const a = makeAnchor(text, { start: second, end: second + 10 });
  assert.deepEqual(locate(text, a), { start: second, end: second + 10 });
  const third = text.lastIndexOf('The period');
  const b = makeAnchor(text, { start: third, end: third + 10 });
  assert.deepEqual(locate(text, b), { start: third, end: third + 10 });
});
test('a quote that is gone anchors nowhere', () => { assert.equal(locate(text, { quote: 'frequency', prefix: '', suffix: '' }), null); assert.equal(locate(text, { quote: '', prefix: '', suffix: '' }), null); });
test('overlaps', () => { assert.ok(overlaps({ start: 0, end: 5 }, { start: 4, end: 9 })); assert.ok(!overlaps({ start: 0, end: 5 }, { start: 5, end: 9 })); });
