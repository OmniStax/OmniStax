import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bookConceptsOf, bookExercisesOf, bookFormulasOf, chapterConceptsOf, type ChapterTables } from '../src/lib/content/bookdata';
import { parseBookConcepts, parseBookExercises, parseBookFormulas } from '../src/lib/practice/books';
import type { ConceptDTO, ConceptsDTO, ExerciseDTO, FormulasDTO } from '../src/lib/content/schema';
import { conceptId, sectionId, spanId } from '../src/lib/types/ids';

const concept = (id: string, section: string, name: string): ConceptDTO =>
  ({ status: 'built', id: conceptId(id), kind: 'idea', section: sectionId(section), name, prereqs: [] });
const cover = (span: string, introduces: string[]) =>
  ({ span: spanId(span), introduces: introduces.map(conceptId), uses: [], reinforces: [] });
const ex = (id: string): ExerciseDTO =>
  ({ id, sourceId: id, kind: 'problem', bloom: 'Apply', concepts: [], place: { at: 'end' }, prompt: id, answer: { type: 'open', generated_by: 'source' } });
const sheet = (sym: string, section: string): FormulasDTO =>
  ({ variables: [{ sym, meaning: 'a thing', unit: 'm', section: sectionId(section) }], equations: [], glossary: [] });

/* Two chapters that share a concept: ch03 reaches back into ch02, as a real
   chapter's file does through the prerequisite edges. */
const CH2: ConceptsDTO = { concepts: [concept('velocity', '2.3', 'Velocity')], coverage: [cover('2.3-p1', ['velocity'])] };
const CH3: ConceptsDTO = { concepts: [concept('velocity', '2.3', 'Velocity'), concept('acceleration', '3.1', 'Acceleration')], coverage: [cover('3.1-p1', ['acceleration'])] };
const CHAPTERS: readonly ChapterTables[] = [
  { dir: 'ch02', concepts: CH2, formulas: sheet('v', '2.3') },
  { dir: 'ch03', concepts: CH3, formulas: sheet('a', '3.1') },
];

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
  assert.deepEqual(chapterConceptsOf(bookConceptsOf(CHAPTERS), 'ch99'), { concepts: [], coverage: [] });
});

test('an id with no row behind it is dropped', () => {
  const book = { concepts: [], chapters: { ch02: { concepts: [conceptId('velocity')], coverage: [] } } };
  assert.deepEqual(chapterConceptsOf(book, 'ch02'), { concepts: [], coverage: [] });
});

test('the book files survive the round trip over the wire', () => {
  const concepts = parseBookConcepts(JSON.parse(JSON.stringify(bookConceptsOf(CHAPTERS))));
  assert.deepEqual(chapterConceptsOf(concepts, 'ch03'), CH3);
  const formulas = parseBookFormulas(JSON.parse(JSON.stringify(bookFormulasOf(CHAPTERS))));
  assert.deepEqual(Object.keys(formulas), ['ch02', 'ch03']);
  assert.equal(formulas.ch03.variables[0].sym, 'a');
  const exercises = parseBookExercises(JSON.parse(JSON.stringify(bookExercisesOf([{ id: '2.3', exercises: [ex('p1'), ex('p2')] }]))));
  assert.deepEqual(exercises['2.3'].map((e) => e.id), ['p1', 'p2']);
});

test('a file that is not an object at all comes back empty', () => {
  assert.deepEqual(parseBookExercises('nonsense'), {});
  assert.deepEqual(parseBookFormulas(null), {});
  assert.deepEqual(parseBookConcepts(42), { concepts: [], chapters: {} });
});
