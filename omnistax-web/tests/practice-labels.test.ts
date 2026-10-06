import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STATE_WORD, count, durationText, excerpt, exerciseName, pickLabel, plain, standingLine, type PickNames } from '../src/lib/practice/labels';
import type { Bloom, ExerciseDTO } from '../src/lib/content/schema';
import { conceptId, sectionId } from '../src/lib/types/ids';

const ex = (id: string, kind = 'conceptual-question', sourceNumber?: string): ExerciseDTO => ({
  id, sourceId: id, kind, bloom: 'apply' as Bloom, concepts: [], place: { at: 'end' }, prompt: id,
  answer: { type: 'open', generated_by: 'source' }, ...(sourceNumber ? { sourceNumber } : {}),
} as ExerciseDTO);

test('plain strips maths delimiters and tags and collapses whitespace', () => {
  assert.equal(plain('A <b>mass</b> of  $m = 2$\n kg and $$v^2$$'), 'A mass of m = 2 kg and v^2');
});

test('STATE_WORD uses the reader words', () => {
  assert.deepEqual(STATE_WORD, { untouched: 'unpracticed', practised: 'practiced', mastered: 'mastered' });
});

test('count says what it counts', () => {
  assert.equal(count(1, 'exercise'), '1 exercise');
  assert.equal(count(12, 'exercise'), '12 exercises');
  assert.equal(count(0, 'quiz', 'quizzes'), '0 quizzes');
});

test('exerciseName prefers generated, then source number, then ordinal, then kind', () => {
  assert.equal(exerciseName(ex('ai:x1')), 'AI-generated exercise');
  assert.equal(exerciseName(ex('cq3', 'conceptual-question', '5.17')), 'Exercise 5.17');
  assert.equal(exerciseName(ex('cq03')), 'Conceptual question 3');
  assert.equal(exerciseName(ex('P12', 'problem'), 'Problems & Exercises'), 'Problems & Exercises 12');
  assert.equal(exerciseName(ex('fig-2', 'try-it')), 'Try it');
});

test('excerpt cuts at a word boundary', () => {
  assert.equal(excerpt('Short <i>one</i>'), 'Short one');
  const out = excerpt('alpha beta gamma delta epsilon', 16);
  assert.equal(out, 'alpha beta…');
  assert.ok(out.length <= 16);
});

test('durationText', () => {
  assert.equal(durationText(20_000), 'under a minute');
  assert.equal(durationText(12 * 60_000), '12 min');
  assert.equal(durationText(65 * 60_000), '1 h 5 min');
  assert.equal(durationText(120 * 60_000), '2 h');
});

test('standingLine', () => {
  assert.equal(standingLine({ untouched: 39, practised: 5, mastered: 3 }), '3/47 mastered · 5 practiced');
  assert.equal(standingLine({ untouched: 0, practised: 0, mastered: 0 }), 'No concepts yet');
});

test('pickLabel names each kind of pick', () => {
  const names: PickNames = {
    book: (id) => `book ${id}`, chapter: (b, c) => `${b} ch ${c}`, section: (b, s) => `${b} § ${s}`,
    concept: (id) => `concept ${id}`, exercise: (r) => `${r.book} ${r.section} ${r.ex}`,
  };
  assert.equal(pickLabel({ book: 'cp' }, names), 'book cp');
  assert.equal(pickLabel({ book: 'cp', chapter: '2' }, names), 'cp ch 2');
  assert.equal(pickLabel({ book: 'cp', chapter: '2', section: sectionId('2.1') }, names), 'cp § 2.1');
  assert.equal(pickLabel({ concept: conceptId('a') }, names), 'concept a');
  assert.equal(pickLabel({ exercise: { book: 'cp', section: sectionId('2.1'), ex: 'p3' } }, names), 'cp 2.1 p3');
});
