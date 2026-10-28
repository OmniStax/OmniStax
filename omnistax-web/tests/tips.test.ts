import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RETURNING_AFTER, modKeyOf, tipsOf, dayOf, stepTip, visit } from '../src/lib/tips/model';
import { tIn } from '../src/lib/i18n/index';

const TIPS = tipsOf((k) => k);

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

test('the card walks every tip in turn, wrapping at either end', () => {
  assert.equal(stepTip(0, 1), 1);
  assert.equal(stepTip(TIPS.length - 1, 1), 0);
  assert.equal(stepTip(0, -1), TIPS.length - 1);
});

test('every tip is said by its key, and an action carries a label of its own', () => {
  assert.deepEqual(TIPS.map((x) => x.text), ['tips.drawing', 'tips.theme', 'tips.drag', 'tips.import', 'tips.newGroup']);
  assert.deepEqual(TIPS.flatMap((x) => (x.action ? [x.action.label] : [])), ['tips.drawing.action', 'tips.import.action']);
});

test('the new-group tip names the key the reader holds: ⌘ on a Mac, Ctrl elsewhere', () => {
  assert.equal(modKeyOf('MacIntel'), '⌘');
  assert.equal(modKeyOf('macOS'), '⌘');
  assert.equal(modKeyOf('iPad'), '⌘');
  assert.equal(modKeyOf('Win32'), 'Ctrl');
  assert.equal(modKeyOf('Linux x86_64'), 'Ctrl');
  assert.equal(modKeyOf(''), 'Ctrl');
  const said = (mod: string) => tipsOf((k, p) => tIn('en', k, p), mod).map((x) => x.text).find((x) => x.includes('new group'));
  assert.equal(said('⌘'), '⌘-click a link to open its page in a new group.');
  assert.equal(said('Ctrl'), 'Ctrl-click a link to open its page in a new group.');
});
