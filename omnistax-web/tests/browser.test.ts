import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openTree, pickTree, pickTarget, start, tabOfRow, type BookTree } from '../src/lib/commands/browser';
import { faceOf, levelOf, trailOf, type PickerNode, type PickerRow } from '../src/lib/picker/model';
import { bookId, sectionId, chapterId } from '../src/lib/types/ids';

/* One book of two chapters, one of them half built. */
const BOOK: BookTree = {
  id: bookId('college-physics-2e'), title: 'College Physics',
  chapters: [
    { id: '2', title: 'Kinematics', sections: [{ id: '2.1', title: 'Displacement', built: true }, { id: '2.2', title: 'Vectors', built: false }] },
    { id: '3', title: 'Motion in Two Dimensions', sections: [{ id: '3.1', title: 'Vector Addition', built: true }] },
  ],
};
const keys = (nodes: readonly PickerNode[]): readonly string[] => nodes.map((n) => n.key);
const node = (nodes: readonly PickerNode[], key: string): PickerNode => nodes.find((n) => n.key === key)!;

/* The picker's tree as the @ menu sees it: a book down to a section and the things in it, and a folder of the reader's files. */
const row = (r: Omit<PickerRow, 'detail'>): PickerRow => ({ detail: '', ...r });
const leaf = (r: PickerRow): PickerNode => ({ key: r.key, label: r.label, detail: '', row: r });
const B = 'college-physics-2e';
const PICKER: readonly PickerNode[] = [
  { key: 'books', label: 'OmniBooks', detail: '', children: () => [
    { key: B, label: 'College Physics', detail: '1 chapter', row: row({ category: 'books', key: B, label: 'College Physics' }), children: () => [
      { key: '2', label: 'Kinematics', detail: '1 section', row: row({ category: 'chapters', key: `${B}/2`, label: 'Kinematics' }), children: () => [
        { key: '2.1', label: '2.1 Displacement', detail: '', row: row({ category: 'sections', key: `${B}/2.1`, label: '2.1 Displacement', target: { kind: 'section', book: bookId(B), section: '2.1' } }), children: () => [
          { key: 'figures', label: 'Figures', detail: '1', children: () => [leaf(row({ category: 'figures', key: `${B}/2.1:f1`, label: 'Figure 2.3' }))] },
          { key: 'concepts', label: 'Concepts', detail: '1', children: () => [leaf(row({ category: 'concepts', key: `${B}/c1`, label: 'displacement' }))] },
        ] },
      ] },
    ] },
  ] },
  { key: 'files', label: 'Files', detail: '', children: () => [
    { key: 'f1', label: 'Lab', detail: '2 items', row: row({ category: 'folders', key: 'f1', label: 'Lab' }), children: () => [
      leaf(row({ category: 'notes', key: 'n1', label: 'Week one' })),
      leaf(row({ category: 'drawings', key: 'd1', label: 'Sketch' })),
    ] },
    leaf(row({ category: 'files', key: 'x1', label: 'paper.pdf' })),
  ] },
];
const OPEN = openTree(PICKER);

test('the open tree keeps OmniBooks and Files, and walks books, chapters and folders without opening them', () => {
  assert.deepEqual(keys(OPEN), ['books', 'files']);
  const book = node(levelOf(OPEN, ['books']), B);
  assert.equal(book.row, undefined, 'a book is walked into, never opened');
  assert.equal(node(levelOf(OPEN, ['books', B]), '2').row, undefined);
  assert.equal(node(levelOf(OPEN, ['files']), 'f1').row, undefined);
});
test('a section opens its text directly: nothing below it is listed', () => {
  const sec = node(levelOf(OPEN, ['books', B, '2']), '2.1');
  assert.equal(sec.children, undefined);
  assert.equal(tabOfRow(sec.row!), 'doc:college-physics-2e/2.1/text');
  const hits = faceOf({ path: [], index: 0 }, OPEN, 'displacement').map((l) => l.node.key);
  assert.deepEqual(hits, ['2.1'], 'a search finds the section and none of the things in it');
});
test('notes, drawings and imported files open as their own tabs', () => {
  const lab = levelOf(OPEN, ['files', 'f1']);
  assert.deepEqual(lab.map((n) => tabOfRow(n.row!)), ['note:n1', 'drawing:d1']);
  assert.equal(tabOfRow(node(levelOf(OPEN, ['files']), 'x1').row!), 'file:x1');
});

test('picking offers the whole book above the chapters, and stops at the sections', () => {
  const tree = pickTree(BOOK);
  assert.deepEqual(keys(tree), ['book', 'ch:2', 'ch:3']);
  assert.deepEqual(tree.map((n) => n.label), ['Whole book', '2 Kinematics', '3 Motion in Two Dimensions']);
  assert.deepEqual(tree.map((n) => n.detail), ['', '1 of 2 sections', '1 section']);
  const sections = levelOf(tree, ['ch:2']);
  assert.deepEqual(keys(sections), ['sec:2.1', 'sec:2.2']);
  assert.deepEqual(sections.map((n) => [n.detail, !!n.row, !!n.children]), [['', true, false], ['not yet built', false, false]]);
});
test('a picked row names the place in the book a view can be pinned to', () => {
  const tree = pickTree(BOOK);
  assert.deepEqual(pickTarget(BOOK, node(tree, 'book').row!), { level: 'book', book: BOOK.id });
  assert.deepEqual(pickTarget(BOOK, node(tree, 'ch:2').row!), { level: 'chapter', book: BOOK.id, chapter: chapterId('2') });
  assert.deepEqual(pickTarget(BOOK, node(levelOf(tree, ['ch:2']), 'sec:2.1').row!), { level: 'section', book: BOOK.id, section: sectionId('2.1') });
});

test('the browser opens beside the section being read, or at the top', () => {
  assert.deepEqual(start(BOOK, sectionId('2.2'), 'pick'), { path: ['ch:2'], select: 'sec:2.2' });
  assert.deepEqual(start(BOOK, sectionId('3.1'), 'open'), { path: ['books', BOOK.id, '3'], select: '3.1' });
  assert.deepEqual(start(BOOK, sectionId('9.9'), 'open'), { path: [], select: null });
  assert.deepEqual(start(BOOK, null, 'pick'), { path: [], select: null });
  const at = start(BOOK, sectionId('2.1'), 'open');
  assert.equal(trailOf(OPEN, at.path).length, at.path.length, 'the path names nodes of the open tree');
  assert.ok(keys(levelOf(OPEN, at.path)).includes(at.select!));
});
