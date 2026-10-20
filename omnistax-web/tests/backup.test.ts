import test from 'node:test';
import assert from 'node:assert/strict';
import { BACKUP_FORMAT, BACKUP_VERSION, MAX_BACKUP_BYTES, categoryOf, parseBackupText, summarizeBackup, validReaderRecord } from '../src/lib/backup/schema';
import { readBackupFile, readerRecords } from '../src/lib/backup/adapters';

const backup = (records: unknown[] = []) => JSON.stringify({
  format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: '2026-09-18T12:00:00.000Z',
  app: { readerFormat: 1 }, records, assets: [], books: [],
});

test('oversized backup files are rejected before allocating their text', async () => {
  const file = { size: MAX_BACKUP_BYTES + 1, text: () => { throw new Error('must not read oversized file'); } } as unknown as File;
  await assert.rejects(readBackupFile(file), /500 MB import limit/);
});

test('reader key inventory is exact and excludes unrelated or future keys', () => {
  assert.equal(categoryOf('omnistax-practice-v2'), 'practice');
  assert.equal(categoryOf('omnistax-notes-physics'), 'notes');
  assert.equal(categoryOf('omnistax-practice-v99'), null);
  assert.equal(categoryOf('unrelated'), null);
});

test('backup parser validates typed records before writes', () => {
  const good = parseBackupText(backup([
    { key: 'omnistax-theme', value: 'dark', category: 'appearance' },
    { key: 'omnistax-library-v1', value: '["physics"]', category: 'library' },
  ]));
  assert.equal(good.records.length, 2);
  assert.deepEqual(summarizeBackup(good).categories, { appearance: 1, library: 1 });

  assert.equal(validReaderRecord({ key: 'omnistax-library-v1', value: '{}', category: 'library' }), false);
  assert.throws(() => parseBackupText(backup([{ key: 'omnistax-theme', value: 'purple', category: 'appearance' }])));
  assert.throws(() => parseBackupText(backup([{ key: 'omnistax-practice-v2', value: '{"attempts":"lost"}', category: 'practice' }])));
});

test('an exported tree may carry a drawing, a file and a chat, and a row naming no record is refused', () => {
  const tree = (entries: unknown[]) => ({ key: 'omnistax-explorer-v1', value: JSON.stringify({ entries, expanded: [] }), category: 'library' as const });
  assert.equal(validReaderRecord(tree([
    { id: 'd1', parent: null, kind: 'drawing', name: 'Free body', drawingId: 'd1' },
    { id: 'x1', parent: null, kind: 'file', name: 'Handout', fileId: 'x1' },
    { id: 'n1', parent: null, kind: 'note', name: 'Beats' },
    { id: 'c1', parent: null, kind: 'chat', name: 'Chat', chatId: 'c1' },
  ])), true);
  assert.equal(validReaderRecord(tree([{ id: 'z1', parent: null, kind: 'video', name: 'Clip', videoId: 'z1' }])), false);
});

test('backup parser rejects future versions, duplicates, and malformed assets', () => {
  assert.throws(() => parseBackupText(JSON.stringify({ ...JSON.parse(backup()), version: 2 })));
  const row = { key: 'omnistax-folded', value: '[]', category: 'reading' };
  assert.throws(() => parseBackupText(backup([row, row])));
  assert.throws(() => parseBackupText(JSON.stringify({ ...JSON.parse(backup()), assets: [{ id: 'x', type: 'image/png', dataUrl: 'https://example.test/x.png', created: 1 }] })));
});

test('book-qualified notes, pins, layout and fold keys pass the backup check', () => {
  const note = { id: 'n1', book: 'chemistry-2e', section: '1.1', doc: 'text', anchor: { quote: 'q', prefix: '', suffix: '' }, color: 'yellow', text: '', created: 1, updated: 1 };
  assert.equal(validReaderRecord({ key: 'omnistax-notes-chemistry-2e', value: JSON.stringify([note]), category: 'notes' }), true);
  const pins = { 'view:1': { follow: false, target: { level: 'section', book: 'college-physics-2e', section: '15.4' } } };
  assert.equal(validReaderRecord({ key: 'omnistax-scope-v2', value: JSON.stringify(pins), category: 'layout' }), true);
  assert.equal(categoryOf('omnistax-layout-v6'), 'layout');
  assert.equal(validReaderRecord({ key: 'omnistax-folded', value: JSON.stringify(['chemistry-2e|1.1-intro']), category: 'reading' }), true);
});

test('a book’s highlights travel with the appearance, and a malformed one is refused', () => {
  const key = 'omnistax-highlights-calculus', value = JSON.stringify({ words: true, underlines: false });
  assert.equal(categoryOf(key), 'appearance');
  const parsed = parseBackupText(backup([{ key, value, category: 'appearance' }]));
  assert.deepEqual(parsed.records, [{ key, value, category: 'appearance' }], 'exported and read back as it was written');
  assert.deepEqual(JSON.parse(parsed.records[0].value), { words: true, underlines: false });
  assert.equal(validReaderRecord({ key, value: '{}', category: 'appearance' }), true, 'a book whose every switch follows its default');
  assert.equal(validReaderRecord({ key, value, category: 'notes' }), false);
  assert.equal(validReaderRecord({ key, value: '{"words":"yes"}', category: 'appearance' }), false);
  assert.equal(validReaderRecord({ key, value: '{"colour":true}', category: 'appearance' }), false);
});

test('an export picks a book’s highlights out of this browser', () => {
  const kept = new Map([['omnistax-highlights-diffyqs', '{"words":true}'], ['unrelated', 'x']]);
  const was = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { get length() { return kept.size; }, key: (i: number) => [...kept.keys()][i] ?? null, getItem: (k: string) => kept.get(k) ?? null } });
  try { assert.deepEqual(readerRecords(), [{ key: 'omnistax-highlights-diffyqs', value: '{"words":true}', category: 'appearance' }]); }
  finally { if (was) Object.defineProperty(globalThis, 'localStorage', was); else delete (globalThis as { localStorage?: unknown }).localStorage; }
});
