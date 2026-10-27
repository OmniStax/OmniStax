import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ask, newChat } from '../src/lib/chat/model';
import { chip } from '../src/lib/chat/context';
import { bookOfChat, bookOfChip, bookOfChips, booksOf, byBook, mergeIndex, parseIndex, unfiled, NO_BOOK, type ChatEntry } from '../src/lib/chat/entries';
import type { ChatId } from '../src/lib/types/ids';

const row = (id: string, updated: number, book?: string): ChatEntry => ({ id: id as ChatId, name: id, created: 1, updated, ...(book !== undefined ? { book } : {}) });

test('a chip names the book its key starts with, and only a thing of a book names one', () => {
  assert.equal(bookOfChip(chip('section', 'college-physics-2e/16.4', '16.4', '')), 'college-physics-2e');
  assert.equal(bookOfChip(chip('figure', 'fig:calculus/2.1:f-limit', 'Figure', '')), 'calculus');
  assert.equal(bookOfChip(chip('concept', 'concept:college-physics-2e/16.1:hooke', 'Hooke', '')), 'college-physics-2e');
  assert.equal(bookOfChip(chip('exercise', 'ex:college-physics-2e/16.1:ai:abc', 'Ex', '')), 'college-physics-2e');
  assert.equal(bookOfChip(chip('definition', 'term:calculus/1.1:function', 'function', '')), 'calculus');
  assert.equal(bookOfChip(chip('book', 'book:calculus', 'Calculus', '')), 'calculus');
  /* the reader's own things, and a section written without its book, name none */
  assert.equal(bookOfChip(chip('note', 'note:a1b2c3d4', 'Note', '')), null);
  assert.equal(bookOfChip(chip('message', 'chat:a1b2c3d4:m1', 'msg', '')), null);
  assert.equal(bookOfChip(chip('section', '16.4', '16.4', '')), null);
});

test('the first chip that names a book files the chat, in the order it was asked', () => {
  assert.equal(bookOfChips([chip('note', 'note:x', 'n', ''), chip('section', 'calculus/2.1', 's', '')]), 'calculus');
  assert.equal(bookOfChips([chip('image', 'asset:1', 'i', '')]), null);
  const first = ask(newChat('aaaaaaaa' as ChatId, 1), 'one', [chip('note', 'note:x', 'n', '')]);
  const second = ask(first.chat, 'two', [chip('section', 'college-physics-2e/16.4', 's', ''), chip('section', 'calculus/2.1', 's', '')]);
  assert.equal(bookOfChat(second.chat), 'college-physics-2e');
  assert.equal(bookOfChat(newChat('bbbbbbbb' as ChatId)), null);
});

test('the index reads a row with its book or without one, and writes the first key without', () => {
  const read = parseIndex([{ id: 'aaaaaaaa', name: 'A', created: 1, updated: 2, book: 'calculus' }, { id: 'bbbbbbbb', name: 'B', created: 1, updated: 3 }, { id: 'bad' }]);
  assert.deepEqual(read.map((e) => e.book), ['calculus', undefined]);
  assert.deepEqual(unfiled(read).map((e) => Object.keys(e).sort()), [['created', 'id', 'name', 'updated'], ['created', 'id', 'name', 'updated']]);
});

test('the two indexes merge: every chat of either, the later name, the book kept', () => {
  const now = [row('aaaaaaaa', 5, 'calculus'), row('bbbbbbbb', 5, NO_BOOK)];
  const old = [{ ...row('aaaaaaaa', 9), name: 'renamed' }, row('bbbbbbbb', 1), row('cccccccc', 2)];
  const merged = mergeIndex(now, old);
  assert.deepEqual(merged.map((e) => [e.id, e.name, e.book]), [['aaaaaaaa', 'renamed', 'calculus'], ['bbbbbbbb', 'bbbbbbbb', NO_BOOK], ['cccccccc', 'cccccccc', undefined]]);
});

test('conversations by book: books in the order of their latest chat, newest first in each, no book last', () => {
  const rows = [row('aaaaaaaa', 1, 'calculus'), row('bbbbbbbb', 9), row('cccccccc', 5, 'college-physics-2e'), row('dddddddd', 7, 'calculus'), row('eeeeeeee', 3, NO_BOOK)];
  const shelves = byBook(rows);
  assert.deepEqual(shelves.map((s) => [s.book, s.entries.map((e) => e.id)]), [
    ['calculus', ['dddddddd', 'aaaaaaaa']],
    ['college-physics-2e', ['cccccccc']],
    [NO_BOOK, ['bbbbbbbb', 'eeeeeeee']],
  ]);
  assert.deepEqual(booksOf(rows), ['calculus', 'college-physics-2e', NO_BOOK]);
  assert.deepEqual(byBook([]), []);
});
