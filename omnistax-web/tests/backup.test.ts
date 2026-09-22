import test from 'node:test';
import assert from 'node:assert/strict';
import { BACKUP_FORMAT, BACKUP_VERSION, MAX_BACKUP_BYTES, categoryOf, parseBackupText, summarizeBackup, validReaderRecord } from '../src/lib/backup/schema';
import { readBackupFile } from '../src/lib/backup/adapters';

const backup = (records: unknown[] = []) => JSON.stringify({
  format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: '2026-09-18T12:00:00.000Z',
  app: { readerFormat: 1 }, records, assets: [], books: [],
});

test('oversized backup files are rejected before allocating their text', async () => {
  const file = { size: MAX_BACKUP_BYTES + 1, text: () => { throw new Error('must not read oversized file'); } } as unknown as File;
  await assert.rejects(readBackupFile(file), /50 MB import limit/);
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

test('an exported tree may carry a drawing and a file, and a row naming no record is refused', () => {
  const tree = (entries: unknown[]) => ({ key: 'omnistax-explorer-v1', value: JSON.stringify({ entries, expanded: [] }), category: 'library' as const });
  assert.equal(validReaderRecord(tree([
    { id: 'd1', parent: null, kind: 'drawing', name: 'Free body', drawingId: 'd1' },
    { id: 'x1', parent: null, kind: 'file', name: 'Handout', fileId: 'x1' },
    { id: 'n1', parent: null, kind: 'note', name: 'Beats' },
  ])), true);
  assert.equal(validReaderRecord(tree([{ id: 'z1', parent: null, kind: 'chat', name: 'Chat', chatId: 'z1' }])), false);
});

test('backup parser rejects future versions, duplicates, and malformed assets', () => {
  assert.throws(() => parseBackupText(JSON.stringify({ ...JSON.parse(backup()), version: 2 })));
  const row = { key: 'omnistax-folded', value: '[]', category: 'reading' };
  assert.throws(() => parseBackupText(backup([row, row])));
  assert.throws(() => parseBackupText(JSON.stringify({ ...JSON.parse(backup()), assets: [{ id: 'x', type: 'image/png', dataUrl: 'https://example.test/x.png', created: 1 }] })));
});
