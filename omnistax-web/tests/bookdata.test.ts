import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bookConceptsOf, bookExercisesOf, chapterConceptsOf, type ChapterTables } from '../src/lib/content/bookdata';
import { parseBookConcepts, parseBookExercises, parseManifest } from '../src/lib/practice/books';
import type { ConceptDTO, ConceptsDTO, ExerciseDTO, VariableDTO } from '../src/lib/content/schema';
import { conceptId, sectionId, spanId } from '../src/lib/types/ids';

const concept = (id: string, section: string, name: string): ConceptDTO =>
  ({ status: 'built', id: conceptId(id), kind: 'idea', section: sectionId(section), name, terms: [], forms: [], prereqs: [] });
const cover = (span: string, introduces: string[]) =>
  ({ span: spanId(span), introduces: introduces.map(conceptId), uses: [], reinforces: [] });
const ex = (id: string): ExerciseDTO =>
  ({ id, sourceId: id, kind: 'problem', bloom: 'Apply', concepts: [], place: { at: 'end' }, prompt: id, answer: { type: 'open', generated_by: 'source' } });
const variable = (sym: string, section: string): VariableDTO => ({ sym, meaning: 'a thing', unit: 'm', section: sectionId(section) });

/* Two chapters that share a concept: ch03 reaches back into ch02, as a real
   chapter's file does through the prerequisite edges. */
const CH2: ConceptsDTO = { concepts: [concept('velocity', '2.3', 'Velocity')], coverage: [cover('2.3-p1', ['velocity'])], variables: [variable('v', '2.3')] };
const CH3: ConceptsDTO = { concepts: [concept('velocity', '2.3', 'Velocity'), concept('acceleration', '3.1', 'Acceleration')], coverage: [cover('3.1-p1', ['acceleration'])], variables: [variable('a', '3.1')] };
const CHAPTERS: readonly ChapterTables[] = [{ dir: 'ch02', concepts: CH2 }, { dir: 'ch03', concepts: CH3 }];

test('a concept shared by two chapters is carried once', () => {
  const book = bookConceptsOf(CHAPTERS);
  assert.deepEqual(book.concepts.map((c) => String(c.id)), ['velocity', 'acceleration']);
  assert.deepEqual(book.chapters.ch03.concepts.map(String), ['velocity', 'acceleration']);
  assert.deepEqual(book.chapters.ch02.coverage.map((c) => String(c.span)), ['2.3-p1']);
});

test('a chapter comes back out of the book file exactly as it went in', () => {
  const book = bookConceptsOf(CHAPTERS);
  assert.deepEqual(chapterConceptsOf(book, 'ch02'), CH2);
  assert.deepEqual(chapterConceptsOf(book, 'ch03'), CH3);
});

test('a chapter the file does not carry is empty rather than missing', () => {
  assert.deepEqual(chapterConceptsOf(bookConceptsOf(CHAPTERS), 'ch99'), { concepts: [], coverage: [], variables: [] });
});

test('an id with no row behind it is dropped', () => {
  const book = { concepts: [], chapters: { ch02: { concepts: [conceptId('velocity')], coverage: [], variables: [] } } };
  assert.deepEqual(chapterConceptsOf(book, 'ch02'), { concepts: [], coverage: [], variables: [] });
});

test('the book files survive the round trip over the wire', () => {
  const concepts = parseBookConcepts(JSON.parse(JSON.stringify(bookConceptsOf(CHAPTERS))));
  assert.deepEqual(chapterConceptsOf(concepts, 'ch03'), CH3);
  assert.equal(chapterConceptsOf(concepts, 'ch03').variables[0].sym, 'a');
  const exercises = parseBookExercises(JSON.parse(JSON.stringify(bookExercisesOf([{ id: '2.3', exercises: [ex('p1'), ex('p2')] }]))));
  assert.deepEqual(exercises['2.3'].map((e) => e.id), ['p1', 'p2']);
});

/* The manifest is where the two files are named, so that nothing but
   book.json is addressed by convention. A manifest written before it carried
   them still says where they are. */
test('the manifest carries the book-level file urls, and falls back where it does not', () => {
  const chapters = [{ dir: 'ch15', sections: [{ id: '15.1', built: true, url: '/up/ch15/15.1/' }] }];
  const m = parseManifest({ id: 'up', chapters, exercises: '/up/exercises.json', concepts: '/up/concepts.json' })!;
  assert.deepEqual([m.exercises, m.concepts], ['/up/exercises.json', '/up/concepts.json']);
  const old = parseManifest({ id: 'up', chapters })!;
  assert.deepEqual([old.exercises, old.concepts], ['/up/exercises.json', '/up/concepts.json']);
});

test('a file that is not an object at all comes back empty', () => {
  assert.deepEqual(parseBookExercises('nonsense'), {});
  assert.deepEqual(parseBookConcepts(42), { concepts: [], chapters: {} });
});
