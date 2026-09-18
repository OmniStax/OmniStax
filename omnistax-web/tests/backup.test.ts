import test from 'node:test';
import assert from 'node:assert/strict';
import { BACKUP_FORMAT, BACKUP_VERSION, categoryOf, parseBackupText, summarizeBackup, validReaderRecord } from '../src/lib/backup/schema';

const backup = (records: unknown[] = []) => JSON.stringify({
  format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: '2026-09-18T12:00:00.000Z',
  app: { readerFormat: 1 }, records, assets: [], books: [],
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

test('backup parser rejects future versions, duplicates, and malformed assets', () => {
  assert.throws(() => parseBackupText(JSON.stringify({ ...JSON.parse(backup()), version: 2 })));
  const row = { key: 'omnistax-folded', value: '[]', category: 'reading' };
  assert.throws(() => parseBackupText(backup([row, row])));
  assert.throws(() => parseBackupText(JSON.stringify({ ...JSON.parse(backup()), assets: [{ id: 'x', type: 'image/png', dataUrl: 'https://example.test/x.png', created: 1 }] })));
});
