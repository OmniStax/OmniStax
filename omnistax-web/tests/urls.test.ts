import { test } from 'node:test';
import assert from 'node:assert/strict';
import { refOfPath, resolvePath, sectionOfUrl } from '../src/lib/content/urls';
import {
  chatId, chatItem, drawingId, drawingItem, exItem, fileId, fileItem, itemKey, newChatId, newDrawingId, newFileId,
  bookId, parseItemKey, sectionId, sectionOfItem, sectionRef,
} from '../src/lib/types/ids';
import type { BookManifest, SectionEntry } from '../src/lib/content/schema';

/* A book of two chapters, one section of which was never built. */
const section = (id: string, dir: string, built: boolean): SectionEntry => ({
  id, title: id, built, url: `/college-physics-2e/${dir}/${id}/`,
  fragment: `/college-physics-2e/${dir}/${id}/doc.html`, figuresJs: `/college-physics-2e/${dir}/${id}/figures.js`,
  figures: [], binds: [], exercises: [],
});
const chapter = (id: string, dir: string, sections: readonly SectionEntry[]) =>
  ({ id, dir, title: id, concepts: '', formulas: '', sections });
const MANIFEST = {
  id: 'college-physics-2e', title: 'College Physics', publisher: 'OpenStax', authors: [], license: 'CC BY',
  types: {}, macros: {}, symbols: {}, exerciseKinds: {}, exercises: '', concepts: '', formulas: '',
  chapters: [
    chapter('2', 'ch02', [section('2.1', 'ch02', true), section('2.2', 'ch02', false)]),
    chapter('16', 'ch16', [section('16.4', 'ch16', true)]),
  ],
} as unknown as BookManifest;

test('a built section is found by the path of its page, with or without the last slash', () => {
  assert.equal(sectionOfUrl(MANIFEST, '/college-physics-2e/ch02/2.1/'), '2.1');
  assert.equal(sectionOfUrl(MANIFEST, '/college-physics-2e/ch02/2.1'), '2.1');
  assert.equal(sectionOfUrl(MANIFEST, '/college-physics-2e/ch16/16.4/'), '16.4');
});

test('everything else is nobody: an unbuilt section, a chapter, a front page, another book', () => {
  assert.equal(sectionOfUrl(MANIFEST, '/college-physics-2e/ch02/2.2/'), null);
  assert.equal(sectionOfUrl(MANIFEST, '/college-physics-2e/ch02/'), null);
  assert.equal(sectionOfUrl(MANIFEST, '/college-physics-2e/'), null);
  assert.equal(sectionOfUrl(MANIFEST, '/'), null);
  assert.equal(sectionOfUrl(MANIFEST, '/other-book/ch02/2.1/'), null);
});

test('a path says its book, chapter and section on its face', () => {
  assert.deepEqual(refOfPath('/college-physics-2e/ch123/145.6/'), { book: 'college-physics-2e', chapterDir: 'ch123', section: '145.6' });
  assert.deepEqual(refOfPath('/college-physics-2e/intro'), { book: 'college-physics-2e', chapterDir: null, section: 'intro' });
  assert.equal(refOfPath('/college-physics-2e/'), null);
  assert.equal(refOfPath('/'), null);
  assert.equal(refOfPath('/College_Physics/ch02/2.1/'), null, 'a book id is lowercase letters, digits and dashes');
});

test('a path resolves against its book, and a page the book lacks stays as spelled', () => {
  const B = bookId('college-physics-2e');
  assert.deepEqual(resolvePath(MANIFEST, refOfPath('/college-physics-2e/ch02/2.1/')!), sectionRef(B, sectionId('2.1')));
  assert.deepEqual(resolvePath(MANIFEST, refOfPath('/college-physics-2e/ch123/145.6/')!), sectionRef(B, sectionId('145.6')));
  assert.deepEqual(resolvePath(null, refOfPath('/no-such-book/ch01/1.1/')!), sectionRef(bookId('no-such-book'), sectionId('1.1')));
});

/* ── the keys of the things the reader owns ─────────────────────────────── */

test('a fresh file, drawing and chat id is eight characters of base 36', () => {
  for (let i = 0; i < 200; i++) {
    assert.match(newFileId(), /^[a-z0-9]{8}$/);
    assert.match(newDrawingId(), /^[a-z0-9]{8}$/);
    assert.match(newChatId(), /^[a-z0-9]{8}$/);
  }
});

test('a file, a drawing, a chat and an exercise each write a key and read back as themselves', () => {
  const pairs = [
    ['file:abcd1234', fileItem(fileId('abcd1234'))],
    ['drawing:abcd1234', drawingItem(drawingId('abcd1234'))],
    ['chat:abcd1234', chatItem(chatId('abcd1234'))],
    ['ex:college-physics-2e/2.1/cq1', exItem(sectionRef(bookId('college-physics-2e'), sectionId('2.1')), 'cq1')],
    ['ex:college-physics-2e/7.intro/p3', exItem(sectionRef(bookId('college-physics-2e'), sectionId('7.intro')), 'p3')],
  ] as const;
  pairs.forEach(([key, item]) => {
    assert.equal(itemKey(item), key);
    assert.deepEqual(parseItemKey(key), item, `${key} reads back as itself`);
  });
});

test('nothing of another shape is one of them, and two keys tell two things apart', () => {
  assert.equal(parseItemKey('file:ABCD1234'), null, 'an id is eight lowercase letters and digits');
  assert.equal(parseItemKey('file:abcd123'), null);
  assert.equal(parseItemKey('drawing:'), null);
  assert.equal(parseItemKey('chat:abcd1234:m1'), null, 'a message of a chat is a link, not a tab');
  assert.equal(parseItemKey('ex:college-physics-2e/2.1/'), null);
  assert.notEqual(itemKey(fileItem(fileId('abcd1234'))), itemKey(drawingItem(drawingId('abcd1234'))));
});

test('an exercise belongs to its section and the reader’s own things belong to none', () => {
  const ref = sectionRef(bookId('college-physics-2e'), sectionId('2.1'));
  assert.deepEqual(sectionOfItem(exItem(ref, 'cq1')), ref);
  assert.equal(sectionOfItem(fileItem(fileId('abcd1234'))), null);
  assert.equal(sectionOfItem(drawingItem(drawingId('abcd1234'))), null);
  assert.equal(sectionOfItem(chatItem(chatId('abcd1234'))), null);
});
