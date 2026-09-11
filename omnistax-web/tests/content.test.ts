import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BookSchema, ChapterSchema, SectionSchema } from '../src/lib/content/schema';
import { bindsOf, conceptsOfChapter, coverageOf, exercisesOf } from '../src/lib/content/load';

/* The tables as the three files write them, small enough to read whole: a book
   whose chapter 16 rests on a chapter 2 that has been built and on a chapter 4
   that has not, and one section of it. */
const BOOK = BookSchema.parse({
  id: 'college-physics-2e', title: 'College Physics 2e', publisher: 'OpenStax', license: 'CC BY-NC-SA 4.0',
  chapters: ['ch02', 'ch16'],
  types: [{ id: 'force', label: 'force', dimension: 'N' }, { id: 'position', label: 'position', dimension: 'm' }],
  concepts: [
    { id: 'displacement', kind: 'idea', section: '2.1', name: 'Displacement', why: 'w', evidence: 'e' },
    { id: 'newtons-first-law', kind: 'idea', section: '4.2', name: 'Newton’s first law' },
    { id: 'restoring-force', kind: 'idea', section: '16.1', name: 'Restoring force', why: 'w', evidence: 'e' },
    { id: 'hookes-law', kind: 'result', section: '16.1', name: 'Hooke’s law', why: 'w', evidence: 'e', eq: 'eq-hooke' },
    { id: 'shm', kind: 'idea', section: '16.3', name: 'Simple harmonic motion' },
  ],
  concept_prereqs: [
    { concept: 'restoring-force', prereq: 'displacement' },
    { concept: 'restoring-force', prereq: 'newtons-first-law' },
    { concept: 'hookes-law', prereq: 'restoring-force' },
  ],
});
const CH16 = ChapterSchema.parse({ id: '16', dir: 'ch16', title: 'Oscillatory Motion and Waves', sections: [{ id: '16.1', title: 'Hooke’s Law' }, { id: '16.3', title: 'Simple Harmonic Motion' }] });
const SECTION = SectionSchema.parse({
  id: '16.1', chapter: '16', title: 'Hooke’s Law', built: '2026-09-07',
  figures: [
    { id: 'sim-ruler', kind: 'sim', number: '16.2', draws: ['position', 'force'] },
    { id: 'sim-spring-scale', kind: 'sim', draws: ['force'] },
  ],
  coverage: [
    { span: 'hookes-law', concept: 'hookes-law', verb: 'introduces' },
    { span: 'hookes-law', concept: 'restoring-force', verb: 'uses' },
    { span: 'hookes-law', concept: 'displacement', verb: 'uses' },
    { span: 'ex-car', concept: 'hookes-law', verb: 'reinforces' },
  ],
  exercises: [
    { id: 'cq1', source_id: 'fs-1', kind: 'conceptual-question', bloom: 'Understand', place: { at: 'inline', after: 'hookes-law' }, prompt: 'Why?', answer: { type: 'open' } },
    { id: 'p1', source_id: 'fs-2', kind: 'problem', bloom: 'Apply', place: { at: 'end' }, prompt: 'How far?', answer: { type: 'number', value: 1.5, unit: 'm' } },
  ],
  exercise_concepts: [
    { exercise: 'cq1', concept: 'restoring-force' },
    { exercise: 'p1', concept: 'hookes-law', weight: 5 },
    { exercise: 'p1', concept: 'displacement' },
  ],
});

test('a strict table refuses a key nobody declared', () => {
  assert.throws(() => ChapterSchema.parse({ id: '16', dir: 'ch16', title: 'Waves', colour: 'blue' }), /Unrecognized key/);
});

test('a chapter draws the concepts its sections teach and everything those rest on', () => {
  const built = new Set(['2.1', '16.1']);
  const { concepts } = conceptsOfChapter(BOOK, CH16, [], built);
  assert.deepEqual(concepts.map((c) => c.id), ['displacement', 'newtons-first-law', 'restoring-force', 'hookes-law', 'shm'], 'a prerequisite in another chapter comes with the concept that rests on it');
  assert.deepEqual(concepts.find((c) => c.id === 'hookes-law')?.prereqs, ['restoring-force']);
  assert.deepEqual(concepts.find((c) => c.id === 'restoring-force')?.prereqs, ['displacement', 'newtons-first-law']);
});
test('a concept stands as a placeholder until the section that introduces it is built', () => {
  const { concepts } = conceptsOfChapter(BOOK, CH16, [], new Set(['2.1', '16.1']));
  const status = Object.fromEntries(concepts.map((c) => [c.id, c.status]));
  assert.deepEqual(status, { displacement: 'built', 'newtons-first-law': 'placeholder', 'restoring-force': 'built', 'hookes-law': 'built', shm: 'placeholder' });
  const none = conceptsOfChapter(BOOK, CH16, [], new Set()).concepts;
  assert.deepEqual(none.map((c) => c.status), ['placeholder', 'placeholder', 'placeholder', 'placeholder', 'placeholder']);
  assert.equal(none.find((c) => c.id === 'hookes-law' && c.status === 'placeholder' && !('why' in c)) !== undefined, true, 'a placeholder says nothing about why it matters');
});

test('a page binds the union of what its figures draw, in one order', () => {
  assert.deepEqual(bindsOf(SECTION.figures), ['force', 'position']);
  assert.deepEqual(bindsOf([]), []);
});

test('coverage folds to one row per span, qualified by its section', () => {
  assert.deepEqual(coverageOf(SECTION), [
    { span: '16.1-hookes-law', introduces: ['hookes-law'], uses: ['restoring-force', 'displacement'], reinforces: [] },
    { span: '16.1-ex-car', introduces: [], uses: [], reinforces: ['hookes-law'] },
  ]);
});

test('an exercise carries the concepts it tests, and the points the pipeline gave them', () => {
  const [cq1, p1] = exercisesOf(SECTION);
  assert.deepEqual(cq1.concepts, ['restoring-force']);
  assert.equal(cq1.weights, undefined, 'no override leaves the Bloom table to say what it is worth');
  assert.deepEqual(cq1.place, { at: 'inline', after: 'hookes-law' });
  assert.equal(cq1.sourceId, 'fs-1');
  assert.deepEqual(p1.concepts, ['hookes-law', 'displacement']);
  assert.deepEqual(p1.weights, { 'hookes-law': 5 });
  assert.deepEqual(p1.place, { at: 'end' });
});
