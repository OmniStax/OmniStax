import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CATEGORIES, CATEGORY_CHIP, atCursor, categoriesFor, faceOf, into, matches, move, nextIndex, open, out, queryIn, rowsIn, type PickerRow,
} from '../src/lib/picker/model';
import { candidatesOf } from '../src/lib/notes/md/complete';

const rows: readonly PickerRow[] = [
  { category: 'notes', key: 'a1b2c3d4', label: 'Damped motion', detail: 'notes/', target: { kind: 'note', name: 'Damped motion' }, text: 'my words' },
  { category: 'sections', key: '16.4', label: '16.4 · The Simple Pendulum', detail: 'Oscillations', target: { kind: 'section', section: '16.4' } },
  { category: 'sections', key: '16.1', label: '16.1 · Hooke’s Law', detail: 'Oscillations', target: { kind: 'section', section: '16.1' } },
  { category: 'equations', key: 'eq-hooke', label: 'F = -kx', detail: 'equation · 16.1', target: { kind: 'equation', section: '16.1', id: 'eq-hooke' }, embed: true },
];

test('the picker opens on the categories, in the order the spec sets', () => {
  const face = faceOf(open(), rows, '');
  assert.equal(face.kind, 'categories');
  assert.deepEqual(face.rows, CATEGORIES);
  assert.equal(CATEGORIES[0], 'notes');
  assert.equal(CATEGORIES[CATEGORIES.length - 1], 'messages');
});

test('what is typed narrows the categories, and going in narrows their rows', () => {
  assert.deepEqual(categoriesFor('sec'), ['sections']);
  /* The field said "sec" when the reader went in, and goes on saying it: what
     narrows the rows is only what is typed after that. */
  const inside = into('sections', 'sec');
  assert.equal(inside.category, 'sections');
  assert.equal(queryIn(inside, 'sec'), '', 'the words that named the category are not the words inside it');
  assert.equal(queryIn(inside, 'sec16.4'), '16.4');
  const face = faceOf(inside, rows, 'sec16.4');
  assert.equal(face.kind, 'rows');
  assert.equal(face.rows.length, 1);
  assert.equal(out(inside).category, null);
  assert.equal(queryIn(out(inside), 'sec'), 'sec', 'coming out, the whole of what is typed reads the categories again');
});

test('a query that names no category searches every row instead', () => {
  const face = faceOf(open(), rows, 'hooke');
  assert.equal(face.kind, 'rows');
  assert.equal(face.rows.length, 1, 'the section whose title says Hooke');
});

test('every word of the query must be somewhere in the row', () => {
  assert.ok(matches('16.4 · The Simple Pendulum', 'simple 16.4'));
  assert.ok(!matches('16.4 · The Simple Pendulum', 'simple kangaroo'));
  assert.equal(rowsIn(rows, 'notes', 'damped').length, 1);
});

test('the cursor walks the list and wraps at either end', () => {
  const face = faceOf(open(), rows, '');
  const count = face.rows.length;
  assert.equal(move(open(), -1, count).index, count - 1);
  assert.equal(move(move(open(), 1, count), -1, count).index, 0);
  assert.equal(move(open(), 1, 0).index, 0, 'an empty list has nowhere to walk');
  assert.equal(nextIndex(0, -1, count), count - 1);
  assert.equal(atCursor(open(), face), CATEGORIES[0]);
  assert.equal(atCursor(open(), { kind: 'rows', rows: [] }), null);
});

test('every category says what kind of chip its rows become', () => {
  assert.deepEqual(CATEGORIES.filter((c) => !CATEGORY_CHIP[c]), []);
  assert.equal(CATEGORY_CHIP.sections, 'section');
  assert.equal(CATEGORY_CHIP.messages, 'message');
});

test('the same rows write wiki links for the note editor', () => {
  const candidates = candidatesOf(rows);
  assert.equal(candidates[0].insert, 'Damped motion');
  assert.equal(candidates[1].insert, '16.4');
  assert.equal(candidates[3].insert, 'eq:16.1:eq-hooke');
  assert.equal(candidates[3].embed, true, 'an equation is read in the note, not pointed at');
  assert.equal(candidates[0].embed, undefined);
});
