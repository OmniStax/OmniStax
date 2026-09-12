import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitParts, solutionParts, letterOf, numberText } from '../src/lib/exercises/parts';
import type { AnswerDTO } from '../src/lib/content/schema';

const multi: AnswerDTO = {
  type: 'multi', generated_by: 'source',
  parts: [{ part: '(a)', value: 7910, unit: 'm/s' }, { part: '(b)', value: 11200, unit: 'm/s' }],
};

test('letterOf reads (a) and a as the same part', () => {
  assert.equal(letterOf('(a)'), 'a');
  assert.equal(letterOf('a'), 'a');
  assert.equal(letterOf('(B)'), 'b');
});

test('splitParts reads a run of labels, keeping what stands before the first', () => {
  const got = splitParts('The two answers follow. (a) 5 m (b) 10 m (c) 15 m');
  assert.equal(got.lead, 'The two answers follow.');
  assert.deepEqual(got.parts.map((p) => p.label), ['(a)', '(b)', '(c)']);
  assert.deepEqual(got.parts.map((p) => p.text), ['5 m', '10 m', '15 m']);
});

test('a solution with no parts stays whole', () => {
  assert.deepEqual(splitParts('length: 377 ft; width: 280 ft').parts, []);
  assert.deepEqual(splitParts('(a) only this one').parts, []);
  assert.deepEqual(splitParts('It is (b) that matters, not (a).').parts, []);
});

test('a label inside math is algebra, not a part', () => {
  assert.deepEqual(splitParts('Write $f(a)$ and $g(b)$ for the two.').parts, []);
  const got = splitParts('(a) $f(a) = 2$ (b) $f(b) = 3$');
  assert.deepEqual(got.parts.map((p) => p.text), ['$f(a) = 2$', '$f(b) = 3$']);
});

test('labels out of order are prose', () => {
  const got = splitParts('(a) first (c) still first (b) second');
  assert.deepEqual(got.parts.map((p) => p.label), ['(a)', '(b)']);
  assert.equal(got.parts[0].text, 'first (c) still first');
});

test('a part answered with a number alone says it once, in the answer column', () => {
  const got = solutionParts('(a) $7910\\ \\text{m/s}$ (b) $1.12\\times 10^{4}\\ \\text{m/s}$', 'Something. (a) Speed? (b) Relative velocity?', multi);
  assert.deepEqual(got.rows.map((r) => r.value), ['7910 m/s', '11200 m/s']);
  assert.deepEqual(got.rows.map((r) => r.text), ['', '']);
  assert.deepEqual(got.rows.map((r) => r.ask), ['Speed?', 'Relative velocity?']);
  assert.equal(got.lead, '');
});

test('a part the book works through keeps its working, with the number beside it', () => {
  const long = '(a) ' + 'x'.repeat(80) + ' (b) ' + 'y'.repeat(80);
  const got = solutionParts(long, '(a) Short ask? (b) Also short?', multi);
  assert.deepEqual(got.rows.map((r) => r.ask), ['', ''], 'the working says it itself');
  assert.deepEqual(got.rows.map((r) => r.text.length), [80, 80]);
  assert.deepEqual(got.rows.map((r) => r.value), ['7910 m/s', '11200 m/s']);
});

test('a part with no keyed number keeps its own words as the answer', () => {
  const open: AnswerDTO = { type: 'open', generated_by: 'ai' };
  const got = solutionParts('(a) Yes (b) No', '', open);
  assert.deepEqual(got.rows.map((r) => r.value), ['Yes', 'No']);
});

test('solutionParts keys a number answer against the one part it answers', () => {
  const one: AnswerDTO = { type: 'number', value: 3, unit: 'N', part: 'b', generated_by: 'source' };
  const got = solutionParts('(a) no force (b) somewhere else', '', one);
  assert.deepEqual(got.rows.map((r) => r.value), ['no force', '3 N']);
});

test('a question carrying markup is left where the book set it', () => {
  const got = solutionParts('(a) 5 m (b) 10 m', '(a) <table class="data"><tr><td>1</td></tr></table> (b) And?', multi);
  assert.deepEqual(got.rows.map((r) => r.ask), ['', 'And?']);
});

test('a number is written the way the book writes it', () => {
  assert.equal(numberText(7910), '7910');
  assert.equal(numberText(11200), '11200');
  assert.equal(numberText(0.5), '0.5');
  assert.equal(numberText(10447800), '$1.04478\\times 10^{7}$');
  assert.equal(numberText(5.36e-7), '$5.36\\times 10^{-7}$');
  assert.equal(numberText(0), '0');
  assert.equal(numberText(-0.0000123), '$-1.23\\times 10^{-5}$');
});

test('a solution with no parts gives no rows', () => {
  assert.deepEqual(solutionParts('Just one worked answer.', 'Just one question.', multi).rows, []);
});
