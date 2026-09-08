import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTERS, rowsAt, enter, up, crumbs, levelAt, start, keyOfLevel, type BookTree, type Level, type Row } from '../src/lib/commands/browser';
import { sectionId } from '../src/lib/types/ids';

/* The tree the Open browser walks: two chapters, one of them half built. */
const BOOK: BookTree = {
  title: 'College Physics',
  chapters: [
    { id: '2', title: 'Kinematics', sections: [{ id: '2.1', title: 'Displacement', built: true }, { id: '2.2', title: 'Vectors', built: false }] },
    { id: '3', title: 'Motion in Two Dimensions', sections: [{ id: '3.1', title: 'Vector Addition', built: true }] },
  ],
};
const SECTIONS_2: Level = { kind: 'sections', chapter: '2' };
const DOCS_21: Level = { kind: 'docs', chapter: '2', section: sectionId('2.1') };
const keys = (rows: readonly Row[]): readonly string[] => rows.map((r) => r.key);
const rowFor = (level: Level, key: string): Row => rowsAt(BOOK, level).find((r) => r.key === key)!;

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
test('a section holds its two documents, which are opened rather than entered', () => {
  const rows = rowsAt(BOOK, DOCS_21);
  assert.deepEqual(keys(rows), ['doc:2.1/text', 'doc:2.1/exercises']);
  assert.deepEqual(rows.map((r) => r.label), ['Text', 'Exercises']);
  assert.deepEqual(rows.map((r) => (r.kind === 'doc' ? [r.section, r.doc] : null)), [['2.1', 'text'], ['2.1', 'exercises']]);
  assert.deepEqual(rows.map((r) => r.enterable), [false, false]);
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
  assert.equal(enter(DOCS_21, rowFor(DOCS_21, 'doc:2.1/text')), null);
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
});
test('levelAt returns the ancestor a crumb stands for and never goes deeper', () => {
  assert.deepEqual(levelAt(DOCS_21, 0), CHAPTERS);
  assert.deepEqual(levelAt(DOCS_21, 1), SECTIONS_2);
  assert.deepEqual(levelAt(DOCS_21, 2), DOCS_21);
  assert.deepEqual(levelAt(DOCS_21, 5), DOCS_21);
  assert.deepEqual(levelAt(SECTIONS_2, 0), CHAPTERS);
  assert.deepEqual(levelAt(CHAPTERS, 0), CHAPTERS);
  crumbs(BOOK, DOCS_21).forEach((_, i) => assert.deepEqual(crumbs(BOOK, levelAt(DOCS_21, i)).length, i + 1));
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
  assert.ok(keys(rowsAt(BOOK, up(SECTIONS_2)!)).includes(keyOfLevel(SECTIONS_2)!));
  assert.ok(keys(rowsAt(BOOK, up(DOCS_21)!)).includes(keyOfLevel(DOCS_21)!));
});
