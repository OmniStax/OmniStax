import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { COLOURS_ON } from '../src/lib/colours/switches';
import { HIGHLIGHTS_ON, bookLayer, heldOffBy, highlightClasses, pageHighlights, parseOverrides, switchesOf, withChoice, type BookHighlights } from '../src/lib/settings/highlights';
import { BookSchema } from '../src/lib/content/schema';
import { loadBook } from '../src/lib/content/load';
import { bookDir, bookId } from '../src/lib/types/ids';

/* A mathematics book: everything on but the words that name a concept. */
const MATHS: BookHighlights = { ...HIGHLIGHTS_ON, words: false };

test('the book layer is its default where the reader chose nothing, and their choice where they did', () => {
  assert.deepEqual(bookLayer(MATHS, {}), MATHS);
  assert.equal(bookLayer(MATHS, { words: true }).words, true, 'a default off, turned on by the reader');
  assert.equal(bookLayer(HIGHLIGHTS_ON, { underlines: false }).underlines, false);
});

test('a choice equal to the book default clears itself, so the key follows the book again', () => {
  const on = withChoice(MATHS, {}, 'words', true);
  assert.deepEqual(on, { words: true });
  const back = withChoice(MATHS, on, 'words', false);
  assert.deepEqual(back, {}, 'cleared, not stored as false');
  assert.equal(bookLayer(MATHS, back).words, false, 'back to the default');
  assert.equal(bookLayer({ ...MATHS, words: true }, back).words, true, 'a later change of the default reaches a reader who cleared the key');
  assert.deepEqual(withChoice(MATHS, { refs: false }, 'words', true), { refs: false, words: true }, 'other choices stay');
});

test('stored choices are read past anything that is not a known key with a boolean', () => {
  assert.deepEqual(parseOverrides({ words: true, colour: true, refs: 'no' }), { words: true });
  assert.deepEqual(parseOverrides([true]), {});
  assert.deepEqual(parseOverrides(null), {});
});

test('the root wears what the book highlights', () => {
  assert.equal(highlightClasses(MATHS)['cc-words'], false, 'the book holds words off');
  assert.equal(highlightClasses(HIGHLIGHTS_ON)['cc-words'], false, 'words are off unless a book or the reader turns them on');
  assert.equal(highlightClasses({ ...HIGHLIGHTS_ON, words: true })['cc-words'], true, 'a book that colours its words shows them');
  assert.equal(highlightClasses({ ...HIGHLIGHTS_ON, concepts: false })['cc-symbols'], false, 'a parent off holds its children off');
  assert.equal(highlightClasses(bookLayer(MATHS, { words: true }))['cc-words'], true, 'book default off, reader override on');
  assert.equal(highlightClasses({ ...HIGHLIGHTS_ON, underlines: false })['no-underlines'], true);
  assert.equal(highlightClasses(HIGHLIGHTS_ON)['no-underlines'], false);
});

test('the figures read the families the book allows', () => {
  assert.deepEqual(pageHighlights({ ...HIGHLIGHTS_ON, refs: false }).shown, { facts: true, refs: false, concepts: true });
  assert.deepEqual(pageHighlights(MATHS).shown, { facts: true, refs: true, concepts: true }, 'words reach the text only');
  assert.deepEqual(switchesOf(HIGHLIGHTS_ON), COLOURS_ON, 'a book that holds nothing back');
});

test('a book key says what holds it off, or nothing when it is free', () => {
  assert.equal(heldOffBy(MATHS, 'words'), null, 'off by its own value is not held');
  assert.match(heldOffBy({ ...HIGHLIGHTS_ON, concepts: false }, 'words') ?? '', /Concepts is off for this book/);
  assert.equal(heldOffBy({ ...HIGHLIGHTS_ON, concepts: false }, 'underlines'), null);
});

const BOOK = { id: 'b', title: 'B', publisher: 'P', license: 'L', chapters: [] };
test('book.json declares its highlights, all six, or none and takes the default', () => {
  assert.deepEqual(BookSchema.parse({ ...BOOK, highlights: MATHS }).highlights, MATHS);
  assert.equal(BookSchema.parse(BOOK).highlights, undefined, 'a book that says nothing declares nothing');
  const { underlines: _, ...five } = MATHS;
  assert.throws(() => BookSchema.parse({ ...BOOK, highlights: five }), /underlines/);
  assert.throws(() => BookSchema.parse({ ...BOOK, highlights: { ...MATHS, colours: true } }), /Unrecognized key/);
});

test('the manifest carries the book’s highlights to the shell', async () => {
  const tree = await loadBook(bookDir(path.resolve(import.meta.dirname, 'fixtures/framed-book')), bookId('framed'));
  assert.deepEqual(tree.manifest.highlights, MATHS);
});
