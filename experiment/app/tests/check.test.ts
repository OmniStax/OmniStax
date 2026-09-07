import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkNumber, checkChoice, nearly } from '../src/lib/exercises/check';
test('nearly allows two percent', () => { assert.ok(nearly(20.3, 20)); assert.ok(!nearly(21, 20)); assert.ok(nearly(0.001, 0)); });
test('checkNumber verdicts', () => {
  assert.equal(checkNumber('abc', 5, 'm').ok, false);
  assert.equal(checkNumber('5.05', 5, 'm').ok, true);
  assert.match(checkNumber('-5', 5, 'm').text, /sign/);
  assert.equal(checkNumber('1', 5, 'm', 'try again').text, 'try again');
});
test('checkChoice verdicts', () => { assert.equal(checkChoice(null, 1).text, 'Pick one.'); assert.ok(checkChoice(1, 1).ok); assert.ok(!checkChoice(0, 1).ok); });
