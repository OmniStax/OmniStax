import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bookId, sectionId } from '../src/lib/types/ids';
import { bookOfNotesKey, notesKey, notesOfBook, parseNotes } from '../src/lib/notes/stored';
import { foldKey, qualifyIds } from '../src/lib/sections/fold';
import { render, type Resolver } from '../src/lib/notes/md/render';
import { chip, contextBlock } from '../src/lib/chat/context';

const phys = bookId('college-physics-2e'), chem = bookId('chemistry-2e');
const raw = [{ id: 'a1', section: '1.1', doc: 'text', anchor: { quote: 'q', prefix: '', suffix: '' }, color: 'blue', text: '', created: 1, updated: 1 }];

test('notes read from a book key carry that book, and are written back without it', () => {
  const read = parseNotes(chem, raw);
  assert.equal(read[0].book, chem);
  assert.equal(read[0].section, sectionId('1.1'));
  const both = [...read, ...parseNotes(phys, [{ ...raw[0], id: 'b2' }])];
  assert.deepEqual(notesOfBook(both, chem).map((n) => n.id), ['a1']);
  assert.ok(!('book' in notesOfBook(both, phys)[0]));
});

test('a notes key names its book, and only a notes key does', () => {
  assert.equal(notesKey(phys), 'omnistax-notes-college-physics-2e');
  assert.equal(bookOfNotesKey('omnistax-notes-chemistry-2e'), chem);
  assert.equal(bookOfNotesKey('omnistax-notedocs-v1'), null);
  assert.equal(bookOfNotesKey('omnistax-notes-Bad/key'), null);
});

test('fold keys name the book, and old keys take the boot book once', () => {
  assert.equal(foldKey(phys, '2.5-notation'), 'college-physics-2e|2.5-notation');
  assert.deepEqual(qualifyIds(['2.5-notation', 'chemistry-2e|1.1-intro'], phys), ['college-physics-2e|2.5-notation', 'chemistry-2e|1.1-intro']);
});

const asked: string[] = [];
const r: Resolver = {
  note: () => null, highlight: () => null, asset: () => null,
  section: (id, book) => { asked.push(`${book ?? '-'}/${id}`); return { title: book === chem ? 'Chemistry in Context' : 'Physics' }; },
  equation: () => null, term: () => null, symbol: () => null, figure: () => null,
  concept: (section, id, book) => (book === phys ? { name: 'Carnot', kind: 'idea', section, placeholder: false } : null),
};

test('a link names its book to the resolver, and the anchor it renders keeps the book', () => {
  asked.length = 0;
  const html = render('[[chemistry-2e/1.1]] and [[1.1]]', r);
  assert.deepEqual(asked, ['chemistry-2e/1.1', '-/1.1']);
  assert.match(html, /data-link="section:chemistry-2e\/1\.1" href="#">1\.1 · Chemistry in Context/);
  assert.match(html, /data-link="section:1\.1"/);
});

test('a card of one book does not answer for the same key in another', () => {
  assert.match(render('![[concept:college-physics-2e/15.4:carnot]]', r), /book-embed/);
  assert.match(render('![[concept:chemistry-2e/15.4:carnot]]', r), /wiki dead/);
});

test('a chip of the book tells the model the link that names it', () => {
  const block = contextBlock([chip('section', 'chemistry-2e/1.1', '1.1 · Chemistry in Context', 'words'), chip('note', 'note:x', 'Mine', 'more')]);
  assert.match(block, /Section of the textbook: 1\.1 · Chemistry in Context \[\[chemistry-2e\/1\.1\]\]/);
  assert.match(block, /A note the reader wrote: Mine\n/);
});
