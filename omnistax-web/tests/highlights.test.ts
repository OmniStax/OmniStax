import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { COLOURS_ON } from '../src/lib/colours/switches';
import { HIGHLIGHTS_ON, bookLayer, effectiveSwitches, heldOffBy, highlightClasses, pageHighlights, parseOverrides, withChoice, type BookHighlights } from '../src/lib/settings/highlights';
import { BookSchema } from '../src/lib/content/schema';
import { loadBook } from '../src/lib/content/load';
import { bookDir, bookId } from '../src/lib/types/ids';

/* A mathematics book: everything on but the words that name a concept. */
const MATHS: BookHighlights = { ...HIGHLIGHTS_ON, words: false };
const ON = { colours: COLOURS_ON, underlines: true };

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

test('a key shows only when its global switch and the book both have it on', () => {
  assert.equal(highlightClasses(ON, MATHS)['cc-words'], false, 'the book holds words off');
  assert.equal(highlightClasses(ON, HIGHLIGHTS_ON)['cc-words'], true, 'a physics book shows them');
  assert.equal(highlightClasses({ ...ON, colours: { ...COLOURS_ON, words: false } }, HIGHLIGHTS_ON)['cc-words'], false, 'global off beats the book on');
  assert.equal(highlightClasses({ ...ON, colours: { ...COLOURS_ON, concepts: false } }, HIGHLIGHTS_ON)['cc-words'], false, 'a global parent off beats the book on');
  assert.equal(highlightClasses(ON, { ...HIGHLIGHTS_ON, concepts: false })['cc-symbols'], false, 'the book’s own parent off holds its children off');
  assert.equal(highlightClasses(ON, bookLayer(MATHS, { words: true }))['cc-words'], true, 'book default off, reader override on');
  assert.equal(highlightClasses({ ...ON, colours: { ...COLOURS_ON, all: false } }, HIGHLIGHTS_ON)['cc-facts'], false, 'All off sets everything in ink');
  assert.equal(highlightClasses(ON, { ...HIGHLIGHTS_ON, underlines: false })['no-underlines'], true);
  assert.equal(highlightClasses({ ...ON, underlines: false }, HIGHLIGHTS_ON)['no-underlines'], true, 'global underlines off beats the book on');
  assert.equal(highlightClasses(ON, HIGHLIGHTS_ON)['no-underlines'], false);
});

test('the figures read the families both layers allow', () => {
  assert.deepEqual(pageHighlights(ON, { ...HIGHLIGHTS_ON, refs: false }).shown, { facts: true, refs: false, concepts: true });
  assert.deepEqual(pageHighlights(ON, MATHS).shown, { facts: true, refs: true, concepts: true }, 'words reach the text only');
  assert.deepEqual(effectiveSwitches(COLOURS_ON, HIGHLIGHTS_ON), COLOURS_ON, 'no book holds nothing back');
});

test('a book key says what holds it off, or nothing when it is free', () => {
  assert.equal(heldOffBy(ON, MATHS, 'words'), null, 'off by its own value is not held');
  assert.match(heldOffBy({ ...ON, colours: { ...COLOURS_ON, concepts: false } }, HIGHLIGHTS_ON, 'symbols') ?? '', /Concepts is off in Color coding/);
  assert.match(heldOffBy(ON, { ...HIGHLIGHTS_ON, concepts: false }, 'words') ?? '', /Concepts is off for this book/);
  assert.match(heldOffBy({ ...ON, underlines: false }, HIGHLIGHTS_ON, 'underlines') ?? '', /Underlines is off/);
  assert.match(heldOffBy({ ...ON, colours: { ...COLOURS_ON, all: false } }, HIGHLIGHTS_ON, 'facts') ?? '', /All is off/);
});

const BOOK = { id: 'b', title: 'B', publisher: 'P', license: 'L', chapters: [] };
test('book.json must declare its highlights, all six', () => {
  assert.deepEqual(BookSchema.parse({ ...BOOK, highlights: MATHS }).highlights, MATHS);
  assert.throws(() => BookSchema.parse(BOOK), /highlights/);
  const { underlines: _, ...five } = MATHS;
  assert.throws(() => BookSchema.parse({ ...BOOK, highlights: five }), /underlines/);
  assert.throws(() => BookSchema.parse({ ...BOOK, highlights: { ...MATHS, colours: true } }), /Unrecognized key/);
});

test('the manifest carries the book’s highlights to the shell', async () => {
  const tree = await loadBook(bookDir(path.resolve(import.meta.dirname, 'fixtures/framed-book')), bookId('framed'));
  assert.deepEqual(tree.manifest.highlights, MATHS);
});
