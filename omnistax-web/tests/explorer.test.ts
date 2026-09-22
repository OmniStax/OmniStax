import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addBook, addFolder, addNote, bookKey, chapterKey, childrenOf, descendants, emptyTree, entryById,
  entryId, isExpanded, migrateTree, move, newEntryId, parseTree, pathOf, remove, rename, sectionKey, toggleExpanded, uniqueName,
  type Tree,
} from '../src/lib/explorer/model';

const id = entryId;
const names = (t: Tree, parent: ReturnType<typeof entryId> | null): string[] => childrenOf(t, parent).map((e) => e.name);

test('a fresh id is eight characters of base 36', () => {
  for (let i = 0; i < 200; i++) assert.match(newEntryId(), /^[a-z0-9]{8}$/);
});

test('folders and notes are added under the row that holds them', () => {
  const f = id('f1');
  const t = addNote(addFolder(emptyTree(), null, 'Physics', f), f, id('n1'), 'Kinematics');
  assert.equal(entryById(t, f)?.kind, 'folder');
  assert.deepEqual(names(t, null), ['Physics']);
  assert.deepEqual(names(t, f), ['Kinematics']);
  assert.equal(entryById(t, id('n1'))?.parent, f);
});

test('a book is added once, however often it is asked for', () => {
  const one = addBook(emptyTree(), 'college-physics-2e', 'College Physics 2e', id('b1'));
  const two = addBook(one, 'college-physics-2e', 'College Physics 2e', id('b2'));
  assert.equal(two.entries.length, 1);
  assert.equal(two, one);
  assert.equal(entryById(two, id('b1'))?.bookId, 'college-physics-2e');
});

test('renaming touches only the row named', () => {
  const t = rename(addFolder(addFolder(emptyTree(), null, 'A', id('a')), null, 'B', id('b')), id('a'), 'Alpha');
  assert.deepEqual(names(t, null), ['Alpha', 'B']);
});

test('removing a folder takes everything it held', () => {
  let t = addFolder(emptyTree(), null, 'Physics', id('f'));
  t = addFolder(t, id('f'), 'Chapter 2', id('g'));
  t = addNote(t, id('g'), id('n'), 'Deep');
  t = addNote(t, null, id('keep'), 'Elsewhere');
  assert.deepEqual(descendants(t, id('f')).sort(), ['f', 'g', 'n']);
  const after = remove(t, id('f'));
  assert.deepEqual(after.entries.map((e) => e.id), ['keep']);
});

test('a row may not be moved inside itself', () => {
  let t = addFolder(emptyTree(), null, 'A', id('a'));
  t = addFolder(t, id('a'), 'B', id('b'));
  t = addFolder(t, id('b'), 'C', id('c'));
  assert.equal(move(t, id('a'), id('c')), t, 'into a descendant');
  assert.equal(move(t, id('a'), id('a')), t, 'into itself');
  assert.equal(move(t, id('a'), id('nowhere')), t, 'into a row that is not there');
  const moved = move(t, id('c'), null);
  assert.equal(entryById(moved, id('c'))?.parent, null);
  assert.deepEqual(names(moved, null), ['A', 'C']);
});

test('children read folders first, then books, then notes, each by name', () => {
  let t = addNote(emptyTree(), null, id('n1'), 'zeta note');
  t = addNote(t, null, id('n2'), 'Alpha note');
  t = addFolder(t, null, 'Work', id('f1'));
  t = addFolder(t, null, 'admin', id('f2'));
  t = addBook(t, 'cp2e', 'College Physics 2e', id('b1'));
  assert.deepEqual(names(t, null), ['admin', 'Work', 'College Physics 2e', 'Alpha note', 'zeta note']);
});

test('the path names the rows from the root down, and the root has none', () => {
  let t = addFolder(emptyTree(), null, 'Physics', id('f'));
  t = addFolder(t, id('f'), 'Waves', id('g'));
  t = addNote(t, id('g'), id('n'), 'Beats');
  assert.equal(pathOf(t, id('n')), 'Physics/Waves/Beats');
  assert.equal(pathOf(t, id('f')), 'Physics');
  assert.equal(pathOf(t, null), '');
});

test('a new name counts up until it is free among its siblings', () => {
  let t = addFolder(emptyTree(), null, uniqueName(emptyTree(), null, 'Untitled'), id('a'));
  assert.equal(entryById(t, id('a'))?.name, 'Untitled');
  assert.equal(uniqueName(t, null, 'Untitled'), 'Untitled 2');
  t = addNote(t, null, id('b'), 'Untitled 2');
  assert.equal(uniqueName(t, null, 'Untitled'), 'Untitled 3');
  /* the count is per parent, so a folder of its own starts again */
  assert.equal(uniqueName(t, id('a'), 'Untitled'), 'Untitled');
});

test('expanded rows toggle, virtual ones included', () => {
  const key = sectionKey('cp2e', '2.1');
  let t = toggleExpanded(emptyTree(), bookKey('cp2e'));
  t = toggleExpanded(t, key);
  assert.ok(isExpanded(t, bookKey('cp2e')) && isExpanded(t, key));
  assert.equal(isExpanded(t, chapterKey('cp2e', '2')), false);
  t = toggleExpanded(t, key);
  assert.equal(isExpanded(t, key), false);
  assert.deepEqual(t.expanded, [bookKey('cp2e')]);
});

test('a saved tree comes back as it went in', () => {
  let t = addFolder(emptyTree(), null, 'Physics', id('f'));
  t = addNote(t, id('f'), id('n'), 'Beats');
  t = addBook(t, 'cp2e', 'College Physics 2e', id('b'));
  t = toggleExpanded(t, bookKey('cp2e'));
  const back = parseTree(JSON.parse(JSON.stringify(t)));
  assert.deepEqual(back, t);
});

test('garbage is refused and half-sound trees are made whole', () => {
  assert.equal(parseTree(null), null);
  assert.equal(parseTree('a tree'), null);
  assert.equal(parseTree({}), null);
  assert.equal(parseTree({ entries: 'no' }), null);
  assert.equal(parseTree({ entries: [{ id: 'a', parent: null, kind: 'wardrobe', name: 'A' }] }), null);
  assert.equal(parseTree({ entries: [{ id: 'a', parent: null, kind: 'folder' }] }), null, 'no name');
  assert.equal(parseTree({ entries: [{ id: 'b', parent: null, kind: 'book', name: 'B' }] }), null, 'a book without its book id');

  const orphan = parseTree({ entries: [{ id: 'n', parent: 'gone', kind: 'note', name: 'Lost' }], expanded: ['book:x', 7] });
  assert.equal(orphan?.entries[0].parent, null, 'a row whose parent has gone returns to the root');
  assert.deepEqual(orphan?.expanded, ['book:x']);

  const loop = parseTree({ entries: [{ id: 'a', parent: 'b', kind: 'folder', name: 'A' }, { id: 'b', parent: 'a', kind: 'folder', name: 'B' }] });
  assert.deepEqual(loop?.entries.map((e) => e.parent), [null, null], 'a chain that comes round on itself is broken');

  const twice = parseTree({ entries: [{ id: 'a', parent: null, kind: 'folder', name: 'A' }, { id: 'a', parent: null, kind: 'folder', name: 'Again' }] });
  assert.deepEqual(twice?.entries.map((e) => e.name), ['A'], 'an id is kept once');

  assert.deepEqual(parseTree({ entries: [] }), emptyTree());
});

test('a book never moves, and a note only ever goes into a folder', () => {
  let t = addFolder(emptyTree(), null, 'Physics', id('f'));
  t = addNote(t, null, id('n'), 'Beats');
  t = addBook(t, 'cp2e', 'College Physics 2e', id('b'));
  assert.equal(move(t, id('b'), id('f')), t, 'a book stays under Books');
  assert.equal(move(t, id('n'), id('b')), t, 'a note may not go into a book');
  assert.equal(entryById(move(t, id('n'), id('f')), id('n'))?.parent, id('f'));
});

test('an old User tree migrates into the two roots, losing nothing', () => {
  /* The shape as it was saved: notes, folders and books all mixed under one
     root, with a folder inside a folder and a book dragged into one of them. */
  const old = {
    entries: [
      { id: 'f1', parent: null, kind: 'folder', name: 'Physics' },
      { id: 'f2', parent: 'f1', kind: 'folder', name: 'Waves' },
      { id: 'n1', parent: 'f2', kind: 'note', name: 'Beats' },
      { id: 'n2', parent: null, kind: 'note', name: 'Scratch' },
      { id: 'b1', parent: null, kind: 'book', name: 'College Physics 2e', bookId: 'cp2e' },
      { id: 'b2', parent: 'f1', kind: 'book', name: 'Chemistry 2e', bookId: 'chem2e' },
    ],
    expanded: ['f1', bookKey('cp2e')],
  };
  const t = migrateTree(old);
  assert.ok(t);
  assert.equal(t.entries.length, 6, 'every row survives');
  /* The books come out of the folders and stand under Books. */
  assert.deepEqual(t.entries.filter((e) => e.kind === 'book').map((e) => [e.bookId, e.parent]),
    [['cp2e', null], ['chem2e', null]]);
  /* The notes and folders keep the shape they had under Notes. */
  assert.equal(entryById(t, id('f2'))?.parent, id('f1'));
  assert.equal(entryById(t, id('n1'))?.parent, id('f2'));
  assert.deepEqual(names(t, null).filter((n) => n !== 'College Physics 2e' && n !== 'Chemistry 2e'), ['Physics', 'Scratch']);
  assert.deepEqual(t.expanded, ['f1', bookKey('cp2e')], 'what was open stays open');
  /* Migrating again changes nothing. */
  assert.deepEqual(migrateTree(JSON.parse(JSON.stringify(t))), t);
  assert.equal(migrateTree('not a tree'), null);
});
