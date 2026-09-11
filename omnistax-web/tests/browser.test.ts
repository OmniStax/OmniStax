import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTERS, rowsAt, enter, up, crumbs, levelAt, start, keyOfLevel, pickTarget, type BookTree, type Level, type Mode, type Row } from '../src/lib/commands/browser';
import { sectionId, chapterId } from '../src/lib/types/ids';

/* The tree the Open browser walks: two chapters, one of them half built, and one
   built section that draws figures and sets exercises. */
const BOOK: BookTree = {
  title: 'College Physics',
  exerciseKinds: { conceptual: 'Conceptual question', problem: 'Problem' },
  chapters: [
    { id: '2', title: 'Kinematics', sections: [
      { id: '2.1', title: 'Displacement', built: true, figures: [{ id: 'sim-walk', label: 'Figure 2.3 · A professor paces the front of the room.' }, { id: 'graph-x', label: 'Figure 2.4 · Position against time.' }], exercises: [{ id: 'cq1', kind: 'conceptual' }, { id: 'p1', kind: 'problem' }, { id: 'p2', kind: 'unlisted' }] },
      { id: '2.2', title: 'Vectors', built: false },
    ] },
    { id: '3', title: 'Motion in Two Dimensions', sections: [{ id: '3.1', title: 'Vector Addition', built: true }] },
  ],
};
const SECTIONS_2: Level = { kind: 'sections', chapter: '2' };
const DOCS_21: Level = { kind: 'docs', chapter: '2', section: sectionId('2.1') };
const FIGURES_21: Level = { kind: 'figures', chapter: '2', section: sectionId('2.1') };
const EXERCISES_21: Level = { kind: 'exercises', chapter: '2', section: sectionId('2.1') };
const DOCS_31: Level = { kind: 'docs', chapter: '3', section: sectionId('3.1') };
const keys = (rows: readonly Row[]): readonly string[] => rows.map((r) => r.key);
const rowFor = (level: Level, key: string, mode: Mode = 'open'): Row => rowsAt(BOOK, level, mode).find((r) => r.key === key)!;

test('the chapters level lists every chapter and says how much of it is built', () => {
  const rows = rowsAt(BOOK, CHAPTERS);
  assert.deepEqual(keys(rows), ['ch:2', 'ch:3']);
  assert.deepEqual(rows.map((r) => r.label), ['2 Kinematics', '3 Motion in Two Dimensions']);
  assert.deepEqual(rows.map((r) => r.detail), ['1 of 2 sections', '1 section']);
  assert.deepEqual(rows.map((r) => r.enterable), [true, true]);
});
test('a chapter lists all its sections, the unbuilt ones marked and closed', () => {
  const rows = rowsAt(BOOK, SECTIONS_2);
  assert.deepEqual(keys(rows), ['sec:2.1', 'sec:2.2']);
  assert.deepEqual(rows.map((r) => r.label), ['2.1 Displacement', '2.2 Vectors']);
  assert.deepEqual(rows.map((r) => r.detail), ['', 'not yet built']);
  assert.deepEqual(rows.map((r) => r.enterable), [true, false]);
  assert.deepEqual(rows.map((r) => r.kind === 'section' && r.built), [true, false]);
});
test('a section holds its two documents, each opened by Enter and entered for what is inside it', () => {
  const rows = rowsAt(BOOK, DOCS_21);
  assert.deepEqual(keys(rows), ['doc:2.1/text', 'doc:2.1/exercises']);
  assert.deepEqual(rows.map((r) => r.label), ['Text', 'Exercises']);
  assert.deepEqual(rows.map((r) => (r.kind === 'doc' ? [r.section, r.doc] : null)), [['2.1', 'text'], ['2.1', 'exercises']]);
  assert.deepEqual(rows.map((r) => r.openable), [true, true]);
  assert.deepEqual(rows.map((r) => r.enterable), [true, true]);
  /* a section that draws nothing and sets nothing has documents to open but nothing below them */
  assert.deepEqual(rowsAt(BOOK, DOCS_31).map((r) => [r.openable, r.enterable]), [[true, false], [true, false]]);
});
test('the text leads to the figures it draws and the exercises to the ones the book sets', () => {
  const figs = rowsAt(BOOK, FIGURES_21);
  assert.deepEqual(keys(figs), ['fig:2.1/sim-walk', 'fig:2.1/graph-x']);
  assert.deepEqual(figs.map((r) => r.label), ['Figure 2.3 · A professor paces the front of the room.', 'Figure 2.4 · Position against time.']);
  assert.deepEqual(figs.map((r) => [r.openable, r.enterable, r.detail]), [[true, false, ''], [true, false, '']]);
  assert.deepEqual(figs.map((r) => (r.kind === 'fig' ? [r.section, r.fig] : null)), [['2.1', 'sim-walk'], ['2.1', 'graph-x']]);
  const exs = rowsAt(BOOK, EXERCISES_21);
  assert.deepEqual(keys(exs), ['ex:2.1/cq1', 'ex:2.1/p1', 'ex:2.1/p2']);
  /* the book names the kinds; one it has no name for reads as the kind itself */
  assert.deepEqual(exs.map((r) => r.label), ['Conceptual question cq1', 'Problem p1', 'unlisted p2']);
  assert.deepEqual(exs.map((r) => (r.kind === 'ex' ? [r.section, r.ex] : null)), [['2.1', 'cq1'], ['2.1', 'p1'], ['2.1', 'p2']]);
  assert.deepEqual(rowsAt(BOOK, { kind: 'figures', chapter: '3', section: sectionId('3.1') }), []);
  assert.deepEqual(rowsAt(BOOK, { kind: 'exercises', chapter: '9', section: sectionId('9.1') }), []);
});
test('an id the book does not know gives nothing to draw', () => {
  assert.deepEqual(rowsAt(BOOK, { kind: 'sections', chapter: '9' }), []);
  assert.deepEqual(rowsAt(BOOK, { kind: 'docs', chapter: '9', section: sectionId('9.1') }), []);
  assert.deepEqual(rowsAt(BOOK, { kind: 'docs', chapter: '2', section: sectionId('2.9') }), []);
  assert.deepEqual(rowsAt({ title: 'Empty', chapters: [] }, CHAPTERS), []);
});

test('entering and going back are inverse steps down and up the tree', () => {
  const chapter = rowFor(CHAPTERS, 'ch:2');
  assert.deepEqual(enter(CHAPTERS, chapter), SECTIONS_2);
  assert.deepEqual(enter(SECTIONS_2, rowFor(SECTIONS_2, 'sec:2.1')), DOCS_21);
  assert.equal(enter(SECTIONS_2, rowFor(SECTIONS_2, 'sec:2.2')), null, 'an unbuilt section opens nothing');
  assert.deepEqual(enter(DOCS_21, rowFor(DOCS_21, 'doc:2.1/text')), FIGURES_21);
  assert.deepEqual(enter(DOCS_21, rowFor(DOCS_21, 'doc:2.1/exercises')), EXERCISES_21);
  assert.equal(enter(DOCS_31, rowFor(DOCS_31, 'doc:3.1/text')), null, 'a document with nothing inside it is only opened');
  assert.equal(enter(FIGURES_21, rowFor(FIGURES_21, 'fig:2.1/sim-walk')), null);
  assert.deepEqual(up(FIGURES_21), DOCS_21);
  assert.deepEqual(up(EXERCISES_21), DOCS_21);
  assert.deepEqual(up(DOCS_21), SECTIONS_2);
  assert.deepEqual(up(SECTIONS_2), CHAPTERS);
  assert.equal(up(CHAPTERS), null);
  assert.deepEqual(up(enter(CHAPTERS, chapter)!), CHAPTERS);
});
test('the crumbs name the book, the chapter and the section, keeping ids the book has lost', () => {
  assert.deepEqual(crumbs(BOOK, CHAPTERS), ['College Physics']);
  assert.deepEqual(crumbs(BOOK, SECTIONS_2), ['College Physics', '2 Kinematics']);
  assert.deepEqual(crumbs(BOOK, DOCS_21), ['College Physics', '2 Kinematics', '2.1 Displacement']);
  assert.deepEqual(crumbs(BOOK, { kind: 'sections', chapter: '9' }), ['College Physics', '9']);
  assert.deepEqual(crumbs(BOOK, { kind: 'docs', chapter: '2', section: sectionId('2.9') }), ['College Physics', '2 Kinematics', '2.9']);
  assert.deepEqual(crumbs(BOOK, FIGURES_21), ['College Physics', '2 Kinematics', '2.1 Displacement', 'Text']);
  assert.deepEqual(crumbs(BOOK, EXERCISES_21), ['College Physics', '2 Kinematics', '2.1 Displacement', 'Exercises']);
});
test('levelAt returns the ancestor a crumb stands for and never goes deeper', () => {
  assert.deepEqual(levelAt(DOCS_21, 0), CHAPTERS);
  assert.deepEqual(levelAt(DOCS_21, 1), SECTIONS_2);
  assert.deepEqual(levelAt(DOCS_21, 2), DOCS_21);
  assert.deepEqual(levelAt(DOCS_21, 5), DOCS_21);
  assert.deepEqual(levelAt(SECTIONS_2, 0), CHAPTERS);
  assert.deepEqual(levelAt(CHAPTERS, 0), CHAPTERS);
  assert.deepEqual(levelAt(FIGURES_21, 2), DOCS_21);
  assert.deepEqual(levelAt(FIGURES_21, 3), FIGURES_21);
  assert.deepEqual(levelAt(EXERCISES_21, 1), SECTIONS_2);
  crumbs(BOOK, DOCS_21).forEach((_, i) => assert.deepEqual(crumbs(BOOK, levelAt(DOCS_21, i)).length, i + 1));
  crumbs(BOOK, EXERCISES_21).forEach((_, i) => assert.deepEqual(crumbs(BOOK, levelAt(EXERCISES_21, i)).length, i + 1));
});

test('the browser opens beside the section being read, or at the top of the book', () => {
  const found = start(BOOK, sectionId('2.2'));
  assert.deepEqual(found, { level: SECTIONS_2, select: 'sec:2.2' });
  assert.ok(keys(rowsAt(BOOK, found.level)).includes(found.select!), 'the selected key names a row of that level');
  assert.deepEqual(start(BOOK, sectionId('3.1')), { level: { kind: 'sections', chapter: '3' }, select: 'sec:3.1' });
  assert.deepEqual(start(BOOK, sectionId('9.9')), { level: CHAPTERS, select: null });
  assert.deepEqual(start(BOOK, null), { level: CHAPTERS, select: null });
});
test('the key of a level names the row it was entered from, so going back re-selects it', () => {
  assert.equal(keyOfLevel(CHAPTERS), null);
  assert.equal(keyOfLevel(SECTIONS_2), 'ch:2');
  assert.equal(keyOfLevel(DOCS_21), 'sec:2.1');
  assert.equal(keyOfLevel(FIGURES_21), 'doc:2.1/text');
  assert.equal(keyOfLevel(EXERCISES_21), 'doc:2.1/exercises');
  assert.ok(keys(rowsAt(BOOK, up(SECTIONS_2)!)).includes(keyOfLevel(SECTIONS_2)!));
  assert.ok(keys(rowsAt(BOOK, up(DOCS_21)!)).includes(keyOfLevel(DOCS_21)!));
  assert.ok(keys(rowsAt(BOOK, up(FIGURES_21)!)).includes(keyOfLevel(FIGURES_21)!));
  assert.ok(keys(rowsAt(BOOK, up(EXERCISES_21)!)).includes(keyOfLevel(EXERCISES_21)!));
});

/* picking a place in the book, rather than opening what is in it */
test('picking offers the whole book above the chapters, and stops at the sections', () => {
  const rows = rowsAt(BOOK, CHAPTERS, 'pick');
  assert.deepEqual(keys(rows), ['book', 'ch:2', 'ch:3']);
  assert.deepEqual(rows[0].label, 'Whole book');
  assert.deepEqual(rows.map((r) => [r.openable, r.enterable]), [[true, false], [true, true], [true, true]]);
  const sections = rowsAt(BOOK, SECTIONS_2, 'pick');
  assert.deepEqual(keys(sections), ['sec:2.1', 'sec:2.2']);
  assert.deepEqual(sections.map((r) => [r.openable, r.enterable]), [[true, false], [true, false]]);
  assert.deepEqual(enter(CHAPTERS, rowFor(CHAPTERS, 'ch:2', 'pick'), 'pick'), SECTIONS_2);
  assert.equal(enter(SECTIONS_2, rowFor(SECTIONS_2, 'sec:2.1', 'pick'), 'pick'), null, 'there are no documents to pick');
  assert.equal(enter(CHAPTERS, rowFor(CHAPTERS, 'book', 'pick'), 'pick'), null);
});
test('a picked row names the place in the book a view can be pinned to', () => {
  assert.deepEqual(pickTarget(CHAPTERS, rowFor(CHAPTERS, 'book', 'pick')), { level: 'book' });
  assert.deepEqual(pickTarget(CHAPTERS, rowFor(CHAPTERS, 'ch:2', 'pick')), { level: 'chapter', chapter: chapterId('2') });
  assert.deepEqual(pickTarget(SECTIONS_2, rowFor(SECTIONS_2, 'sec:2.1', 'pick')), { level: 'section', section: sectionId('2.1') });
  assert.equal(pickTarget(SECTIONS_2, rowFor(SECTIONS_2, 'sec:2.2', 'pick')), null, 'a section that is not built is no place to stand');
  assert.equal(pickTarget(DOCS_21, rowFor(DOCS_21, 'doc:2.1/text')), null);
  assert.equal(pickTarget(FIGURES_21, rowFor(FIGURES_21, 'fig:2.1/graph-x')), null);
});
