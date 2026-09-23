import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CATEGORIES, CATEGORY_CHIP, atCursor, descendants, faceOf, into, levelOf, matches, move, nextIndex, open, pickable, queryIn, trailOf, up, type PickerNode, type PickerRow,
} from '../src/lib/picker/model';
import { candidatesOf } from '../src/lib/notes/md/complete';

const rows: readonly (PickerRow & { target: NonNullable<PickerRow['target']> })[] = [
  { category: 'notes', key: 'a1b2c3d4', label: 'Damped motion', detail: 'notes/', target: { kind: 'note', name: 'Damped motion' }, text: 'my words' },
  { category: 'sections', key: '16.4', label: '16.4 · The Simple Pendulum', detail: 'Oscillations', target: { kind: 'section', section: '16.4' } },
  { category: 'sections', key: '16.1', label: '16.1 · Hooke’s Law', detail: 'Oscillations', target: { kind: 'section', section: '16.1' } },
  { category: 'equations', key: 'eq-hooke', label: 'F = -kx', detail: 'equation · 16.1', target: { kind: 'equation', section: '16.1', id: 'eq-hooke' }, embed: true },
];

const leaf = (row: PickerRow): PickerNode => ({ key: row.key, label: row.label, detail: row.detail, row });
const eq: PickerNode = { key: 'equations', label: 'Equations', detail: '1', children: () => [leaf({ ...rows[3], detail: '' })] };
const sec161: PickerNode = { key: '16.1', label: rows[2].label, detail: '', row: rows[2], children: () => [eq] };
const sec164: PickerNode = { key: '16.4', label: rows[1].label, detail: '', row: rows[1], children: () => [] };
const chapter: PickerNode = { key: 'ch16', label: 'Oscillatory Motion', detail: '2 sections', row: { category: 'chapters', key: 'b/ch16', label: 'Oscillatory Motion', detail: '', text: 'x' }, children: () => [sec161, sec164] };
const book: PickerNode = { key: 'b', label: 'College Physics', detail: '1 chapter', row: { category: 'books', key: 'b', label: 'College Physics', detail: '' }, children: () => [chapter] };
const root: readonly PickerNode[] = [
  { key: 'books', label: 'OmniBooks', detail: '', children: () => [book] },
  { key: 'files', label: 'Files', detail: '', children: () => [leaf(rows[0])] },
];

test('the picker opens on OmniBooks and Files alone', () => {
  const face = faceOf(open(), root, '');
  assert.deepEqual(face.map((l) => l.node.label), ['OmniBooks', 'Files']);
  assert.equal(pickable(face[0].node, false), false, 'the two roots are walked into, never picked');
});

test('walking down a book reaches its sections, then their kinds, then the items', () => {
  const at = (path: string[]) => levelOf(root, path).map((n) => n.label);
  assert.deepEqual(at(['books']), ['College Physics']);
  assert.deepEqual(at(['books', 'b', 'ch16']), ['16.1 · Hooke’s Law', '16.4 · The Simple Pendulum']);
  assert.deepEqual(at(['books', 'b', 'ch16', '16.1']), ['Equations'], 'a section is not the end of the walk');
  assert.deepEqual(at(['books', 'b', 'ch16', '16.1', 'equations']), ['F = -kx']);
  assert.deepEqual(trailOf(root, ['books', 'b', 'gone']).map((n) => n.key), ['books', 'b'], 'a step that names nothing stops the walk');
});

test('typing searches everything below the level, and says where each hit lives', () => {
  const top = faceOf(open(), root, 'hooke');
  assert.deepEqual(top.map((l) => l.node.label), ['16.1 · Hooke’s Law']);
  assert.equal(top[0].where, 'OmniBooks › College Physics › Oscillatory Motion');
  assert.deepEqual(top[0].path, ['books', 'b', 'ch16', '16.1']);
  const inFiles = faceOf(into(open(), ['files'], ''), root, 'hooke');
  assert.equal(inFiles.length, 0, 'the books are not below Files');
  assert.equal(descendants(root, '', 3).length, 3, 'a search is cut short at its limit');
});

test('going down marks the field, and going up returns to the level above', () => {
  const inside = into(open(), ['books'], 'col');
  assert.equal(queryIn(inside, 'col'), '', 'what found the level is not what narrows it');
  assert.equal(queryIn(inside, 'colphys'), 'phys');
  const deep = into(inside, ['b', 'ch16'], 'col');
  assert.deepEqual(deep.path.map((s) => s.key), ['books', 'b', 'ch16']);
  assert.deepEqual(up(deep).path.map((s) => s.key), ['books', 'b']);
  assert.deepEqual(up(deep, 0).path, [], 'the breadcrumb goes straight to the top');
  assert.deepEqual(up(open()).path, []);
});

test('a container picks whole in a chat, and only a row with a link picks in a note', () => {
  assert.ok(pickable(book, false));
  assert.equal(pickable(book, true), false, 'a book writes no wiki link');
  assert.ok(pickable(sec161, true));
});

test('every word of the query must be somewhere in the row', () => {
  assert.ok(matches('16.4 · The Simple Pendulum', 'simple 16.4'));
  assert.ok(!matches('16.4 · The Simple Pendulum', 'simple kangaroo'));
});

test('the cursor walks the list and wraps at either end', () => {
  const face = faceOf(open(), root, '');
  const count = face.length;
  assert.equal(move(open(), -1, count).index, count - 1);
  assert.equal(move(move(open(), 1, count), -1, count).index, 0);
  assert.equal(move(open(), 1, 0).index, 0, 'an empty list has nowhere to walk');
  assert.equal(nextIndex(0, -1, count), count - 1);
  assert.equal(atCursor(open(), face)?.node.key, 'books');
  assert.equal(atCursor(open(), []), null);
});

test('every category says what kind of chip its rows become', () => {
  assert.deepEqual(CATEGORIES.filter((c) => !CATEGORY_CHIP[c]), []);
  assert.equal(CATEGORY_CHIP.sections, 'section');
  assert.equal(CATEGORY_CHIP.books, 'book');
  assert.equal(CATEGORY_CHIP.folders, 'folder');
});

test('the same rows write wiki links for the note editor', () => {
  const candidates = candidatesOf(rows);
  assert.equal(candidates[0].insert, 'Damped motion');
  assert.equal(candidates[1].insert, '16.4');
  assert.equal(candidates[3].insert, 'eq:16.1:eq-hooke');
  assert.equal(candidates[3].embed, true, 'an equation is read in the note, not pointed at');
  assert.equal(candidates[0].embed, undefined);
});
