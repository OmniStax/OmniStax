import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addFile, baseName, byId, FILE_KINDS, parseFiles, removeFiles, renameFile, setPages, sizeLabel, takeOf,
  type FileDoc,
} from '../src/lib/files/model';
import {
  addMark, BOX_H, BOX_W, clampFraction, inPageOrder, isMarkId, markById, marksOfPage, newBox, newHighlight,
  newMarkId, parseMarks, patchMark, removeMarks, removeMarksOfFiles, type FileMark,
} from '../src/lib/files/marks';
import { joinItems } from '../src/lib/files/text';
import { healthOf, isWebkit, PERSIST_WORDS, usedFraction } from '../src/lib/storage/health';
import { fileId } from '../src/lib/types/ids';

const f = fileId;
const doc = (id: string, over: Partial<FileDoc> = {}): FileDoc =>
  ({ id: f(id), name: id, type: 'pdf', mime: 'application/pdf', size: 10, created: 1, updated: 1, ...over });

/* ── what the app takes ──────────────────────────────────────────────────── */

test('a PDF, an image and a markdown file are each taken for what they are', () => {
  assert.deepEqual(takeOf('paper.pdf', 'application/pdf'), { kind: 'file', type: 'pdf' });
  assert.deepEqual(takeOf('scan.PNG', 'image/png'), { kind: 'file', type: 'image' });
  assert.deepEqual(takeOf('notes.md', 'text/markdown'), { kind: 'note' });
  assert.deepEqual(takeOf('notes.txt', ''), { kind: 'note' });
});

test('the name decides when the browser says nothing, and the type when it does', () => {
  /* A file manager often hands over no type at all. */
  assert.deepEqual(takeOf('paper.pdf', ''), { kind: 'file', type: 'pdf' });
  assert.deepEqual(takeOf('photo.webp', ''), { kind: 'file', type: 'image' });
  /* And a server may serve a PDF as bytes; it is still a PDF to the reader. */
  assert.deepEqual(takeOf('paper.pdf', 'application/octet-stream'), { kind: 'file', type: 'pdf' });
});

test('anything else is refused rather than thrown', () => {
  assert.deepEqual(takeOf('archive.zip', 'application/zip'), { kind: 'refused' });
  assert.deepEqual(takeOf('sheet.xlsx', 'application/vnd.ms-excel'), { kind: 'refused' });
});

test('a row is named by the file without its extension or its folders', () => {
  assert.equal(baseName('/home/reader/Wave mechanics.pdf'), 'Wave mechanics');
  assert.equal(baseName('scan.jpeg'), 'scan');
  assert.equal(baseName('.gitignore'), '.gitignore');
  assert.equal(baseName('no-extension'), 'no-extension');
});

test('a size reads as a reader would say it', () => {
  assert.equal(sizeLabel(512), '512 B');
  assert.equal(sizeLabel(2048), '2.0 KB');
  assert.equal(sizeLabel(15 * 1024 * 1024), '15 MB');
});

/* ── the list ────────────────────────────────────────────────────────────── */

test('files are added, renamed, counted and taken away as a value', () => {
  const list = addFile(addFile([], doc('aaaaaaaa')), doc('bbbbbbbb', { type: 'image' }));
  assert.equal(byId(list, f('bbbbbbbb'))?.type, 'image');
  const named = renameFile(list, f('aaaaaaaa'), 'Hooke', 20);
  assert.equal(byId(named, f('aaaaaaaa'))?.name, 'Hooke');
  assert.equal(byId(named, f('aaaaaaaa'))?.updated, 20);
  /* The list before it is untouched: every operation is pure. */
  assert.equal(byId(list, f('aaaaaaaa'))?.name, 'aaaaaaaa');
  const paged = setPages(named, f('aaaaaaaa'), 12, 30);
  assert.equal(byId(paged, f('aaaaaaaa'))?.pages, 12);
  assert.deepEqual(removeFiles(paged, [f('aaaaaaaa')]).map((x) => x.id), ['bbbbbbbb']);
  /* Removing nothing hands back the very same list, so no save follows. */
  assert.equal(removeFiles(paged, [f('zzzzzzzz')]), paged);
});

test('a stored list keeps what is sound and drops what is not', () => {
  const list = parseFiles([
    { id: 'aaaaaaaa', name: 'Paper', type: 'pdf', mime: 'application/pdf', size: 99, pages: 4, created: 1, updated: 2 },
    { id: 'bbbbbbbb', name: 'No kind', type: 'video', mime: 'video/mp4', size: 1, created: 1, updated: 1 },
    { name: 'No id', type: 'pdf' },
    'not an object',
  ]);
  assert.deepEqual(list.map((x) => x.id), ['aaaaaaaa']);
  assert.equal(list[0].pages, 4);
  assert.deepEqual(parseFiles(null), []);
  /* A record missing what can be guessed keeps standing, with defaults. */
  const thin = parseFiles([{ id: 'cccccccc', name: 'Thin', type: 'image' }]);
  assert.equal(thin[0].mime, 'application/octet-stream');
  assert.equal(thin[0].size, 0);
  assert.equal(thin[0].pages, undefined);
  assert.deepEqual([...FILE_KINDS], ['pdf', 'image']);
});

/* ── the marks written on a file ─────────────────────────────────────────── */

const anchor = { quote: 'zyxomni', prefix: 'the word ', suffix: ' on page two' };

test('a file mark is named by ten of base 36, which a book highlight is not', () => {
  for (let i = 0; i < 200; i++) assert.match(newMarkId(), /^[a-z0-9]{10}$/);
  assert.ok(isMarkId('abcdefghij'));
  assert.ok(!isMarkId('abcdefgh'));
});

test('a highlight and a box are placed on a page and read back in page order', () => {
  const hl = newHighlight(f('aaaaaaaa'), 2, anchor, 'green', 10);
  const box = newBox(f('aaaaaaaa'), 1, 0.25, 0.4, 20);
  const list = addMark(addMark([], hl), box);
  assert.deepEqual(inPageOrder(list).map((m) => m.page), [1, 2]);
  assert.deepEqual(marksOfPage(list, f('aaaaaaaa'), 2).map((m) => m.id), [hl.id]);
  assert.deepEqual(marksOfPage(list, f('bbbbbbbb'), 2), []);
  assert.equal(box.kind === 'box' && box.w, BOX_W);
  assert.equal(box.kind === 'box' && box.h, BOX_H);
});

test('a box is placed in fractions of the page, so it cannot leave it', () => {
  assert.equal(clampFraction(-0.5), 0);
  assert.equal(clampFraction(1.7), 1);
  assert.equal(clampFraction(Number.NaN), 0);
  const box = newBox(f('aaaaaaaa'), 1, 2, -1, 5);
  assert.equal(box.kind === 'box' && box.x, 1);
  assert.equal(box.kind === 'box' && box.y, 0);
});

test('marks are changed and taken away as a value', () => {
  const hl = newHighlight(f('aaaaaaaa'), 2, anchor, 'yellow', 10);
  const list = addMark([], hl);
  const noted = patchMark(list, hl.id, { text: 'the odd word' }, 40);
  assert.equal(markById(noted, hl.id)?.kind === 'highlight' && markById(noted, hl.id)?.updated, 40);
  assert.equal(list[0].kind === 'highlight' && list[0].text, '');
  assert.deepEqual(removeMarks(noted, [hl.id]), []);
  assert.equal(removeMarks(noted, ['nothing']), noted);
  assert.deepEqual(removeMarksOfFiles(noted, [f('aaaaaaaa')]), []);
  assert.equal(removeMarksOfFiles(noted, [f('bbbbbbbb')]), noted);
});

test('a stored mark keeps what is sound and drops what is not', () => {
  const marks: readonly FileMark[] = parseMarks([
    { kind: 'highlight', id: 'abcdefghij', file: 'aaaaaaaa', page: 2, anchor, color: 'blue', text: '', created: 1, updated: 1 },
    { kind: 'box', id: 'bcdefghijk', file: 'aaaaaaaa', page: 1, x: 0.1, y: 0.2, w: 0.3, h: 0.1, body: 'hello', created: 1, updated: 1 },
    { kind: 'highlight', id: 'nope', file: 'aaaaaaaa', page: 0, anchor, color: 'blue', text: '', created: 1, updated: 1 },
    { kind: 'scribble', id: 'cdefghijkl', file: 'aaaaaaaa', page: 1 },
  ]);
  assert.deepEqual(marks.map((m) => m.kind), ['highlight', 'box']);
  assert.equal(marks[0].kind === 'highlight' && marks[0].color, 'blue');
  assert.deepEqual(parseMarks('nonsense'), []);
});

/* ── the text pulled out of a PDF ────────────────────────────────────────── */

test('the runs of a page join into one searchable line', () => {
  const items = [{ str: 'The word', transform: [] }, { str: '  zyxomni  ', transform: [] }, { str: 'ends it.', transform: [] }];
  assert.equal(joinItems(items), 'The word zyxomni ends it.');
  assert.equal(joinItems([]), '');
});

/* ── whether the data is safe where it is ────────────────────────────────── */

test('the fraction in use needs both numbers', () => {
  assert.equal(usedFraction({ usage: 25, quota: 100 }), 0.25);
  assert.equal(usedFraction({ usage: 25, quota: null }), null);
  assert.equal(usedFraction({ usage: null, quota: 100 }), null);
  /* A browser that reports more used than it allows is still telling the truth. */
  assert.equal(usedFraction({ usage: 300, quota: 100 }), 1);
});

test('Safari is named by its engine and not by its brand', () => {
  assert.ok(isWebkit('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'));
  assert.ok(isWebkit('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15'));
  assert.ok(!isWebkit('Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/120.0 Safari/537.36'));
  assert.ok(!isWebkit('Mozilla/5.0 (X11; Linux x86_64) Gecko/20100101 Firefox/121.0'));
});

test('the block says one thing per answer, and warns Safari of its seven days', () => {
  const granted = healthOf('granted', { usage: 10, quota: 100 }, false);
  assert.equal(granted.words, PERSIST_WORDS.granted);
  assert.equal(granted.safari, false);
  assert.equal(granted.fraction, 0.1);
  const denied = healthOf('denied', { usage: null, quota: null }, true);
  assert.match(denied.words, /may clear this data/);
  assert.equal(denied.safari, true);
  assert.equal(denied.fraction, null);
});
