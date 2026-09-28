import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkNumber, checkChoice, nearly, solutionText } from '../src/lib/exercises/check';
test('nearly allows two percent', () => { assert.ok(nearly(20.3, 20)); assert.ok(!nearly(21, 20)); assert.ok(nearly(0.001, 0)); });
test('checkNumber verdicts', () => {
  assert.equal(checkNumber('abc', 5, 'm').ok, false);
  assert.equal(checkNumber('5.05', 5, 'm').ok, true);
  assert.match(checkNumber('-5', 5, 'm').text, /sign/);
  assert.equal(checkNumber('1', 5, 'm', 'try again').text, 'try again');
});
test('checkChoice verdicts', () => { assert.equal(checkChoice(null, 1).text, 'Pick one.'); assert.ok(checkChoice(1, 1).ok); assert.ok(!checkChoice(0, 1).ok); });
test('solutionText prefers the book, then composes from the answer', () => {
  assert.equal(solutionText({ type: 'number', value: 5, unit: 'm', solution: 'Use Hooke.', generated_by: 'source' }), 'Use Hooke.');
  assert.equal(solutionText({ type: 'number', value: 5, unit: 'm', generated_by: 'source' }), '5 m');
  assert.equal(solutionText({ type: 'multi', parts: [{ part: 'a', value: 1, unit: 'N' }, { part: 'b', value: 2, unit: '' }], generated_by: 'source' }), 'a: 1 N · b: 2');
  assert.equal(solutionText({ type: 'open', generated_by: 'source' }), undefined);
});
test('a named tolerance tightens the check', () => {
  assert.ok(!nearly(1, 0.99995, 0.00001));
  assert.ok(nearly(0.99995, 0.99995, 0.00001));
  assert.equal(checkNumber('1', 0.99995, 'c', undefined, false, 0.00001).ok, false);
  assert.equal(checkNumber('1.019', 1, 'c').ok, true);
});
