import test from 'node:test';
import assert from 'node:assert/strict';
import { BACKUP_FORMAT, BACKUP_VERSION, MAX_BACKUP_BYTES, categoryOf, parseBackupText, recordProblem, skippedLine, summarizeBackup, validReaderRecord } from '../src/lib/backup/schema';
import { keptRecords, readBackupFile, readerRecords } from '../src/lib/backup/adapters';
import { KEY, PAGES, SESSIONS, parsePages, parseSessions, parseSettings } from '../src/lib/practice/stored';

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
  const bad = parseBackupText(backup([
    { key: 'omnistax-theme', value: 'purple', category: 'appearance' },
    { key: 'omnistax-practice-v2', value: '{"attempts":"lost"}', category: 'practice' },
    { key: 'omnistax-library-v1', value: '["physics"]', category: 'library' },
  ]));
  assert.deepEqual(bad.records.map((r) => r.key), ['omnistax-library-v1'], 'what can be read is restored');
  assert.deepEqual(bad.skipped.map((r) => r.key), ['omnistax-theme', 'omnistax-practice-v2'], 'what cannot is set aside, by name');
});

/* The report behind "This is not a valid OmniStax backup: invalid reader
   record.": the practice store writes settings.stopwatch (and exercise picks,
   a round's exclusions, the review and sessions faces, a slot's concept, a
   finished round's after) which the backup's schema did not know. Every
   profile that had practised once was refused whole, on import and on every
   sync pull alike, since a pull reads this device's own records too. */
test('a practice record as the store writes it passes the backup check', () => {
  const settings = parseSettings({ stopwatch: true, model: { provider: 'anthropic', model: 'claude' }, grading: 'ai' });
  const v2 = JSON.stringify({ attempts: [], shown: [], rounds: [], self: {}, settings });
  assert.equal(recordProblem({ key: KEY, value: v2 }), null);
  const mastery = { c1: { level: 1, target: 3, mastered: false, masteredAt: 0, lastAt: 1, halfLife: 3, reviewedAt: 1, dueAt: 2, selfAssessed: false, noDecay: false } };
  const sessions = parseSessions({ s1: {
    curriculum: [{ concept: 'c1' }, { exercise: { book: 'b', section: '1.1', ex: 'e1' } }, { book: 'b', chapter: '1' }],
    concepts: ['c1'], drawn: [{ book: 'b', section: '1.1', ex: 'pending:1', why: 'new', concept: 'c1' }], at: 0, outcomes: [null], started: 1, before: mastery,
    status: 'done', ended: 2, after: mastery,
  } });
  assert.equal(recordProblem({ key: SESSIONS, value: JSON.stringify(sessions) }), null);
  const pages = parsePages({
    'view:practice@1': { curriculum: [{ exercise: { book: 'b', section: '1.1', ex: 'e1' } }], session: 's1', face: 'review', showAll: false, round: { perConcept: 2, excluded: ['b|1.1|e2'] } },
    'view:practice@2': { face: 'sessions' }, 'view:practice@3': { face: 'summary' },
  });
  assert.equal(recordProblem({ key: PAGES, value: JSON.stringify(pages) }), null);
});

test('a record that cannot be read says which it is and why, and the device keeps its own value for it', () => {
  const settings = { ...parseSettings({}), zzz: 1 };
  assert.match(recordProblem({ key: 'omnistax-practice-v2', value: JSON.stringify({ attempts: [], shown: [], rounds: [], self: {}, settings }) }) ?? '', /^settings: Unrecognized key\(s\) in object: 'zzz'/);
  assert.match(recordProblem({ key: 'omnistax-library-v1', value: '[nope' }) ?? '', /isn’t valid JSON/);
  assert.match(recordProblem({ key: 'omnistax-theme', value: 'purple' }) ?? '', /“purple”/);
  assert.match(recordProblem({ key: 'omnistax-practice-v99', value: '{}' }) ?? '', /doesn’t know/);
  const parsed = parseBackupText(backup([{ key: 'omnistax-practice-v99', value: '{}', category: 'practice' }, { key: 'omnistax-theme', value: 'purple', category: 'appearance' }]));
  assert.equal(skippedLine(parsed.skipped[1]), 'omnistax-theme: “purple” isn’t a value this setting takes');
  const here = new Map([['omnistax-theme', 'dark']]);
  assert.deepEqual(keptRecords(parsed.skipped, (k) => here.get(k) ?? null), [{ key: 'omnistax-theme', value: 'dark', category: 'appearance' }], 'an unknown key is not this version’s to keep');
});

test('a record filed under the category it once had restores under today’s', () => {
  const parsed = parseBackupText(backup([{ key: 'omnistax-pomodoro-len', value: '25', category: 'appearance' }, { key: 'omnistax-folded', value: '[]' }]));
  assert.deepEqual(parsed.records, [{ key: 'omnistax-pomodoro-len', value: '25', category: 'focus' }, { key: 'omnistax-folded', value: '[]', category: 'reading' }]);
  assert.equal(parsed.skipped.length, 0);
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
  assert.throws(() => parseBackupText(backup([row, row])), /omnistax-folded appears twice/);
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
  assert.deepEqual(parsed.skipped, []);
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

test('the reader’s language travels with the appearance records, and only a language the app speaks', () => {
  assert.equal(categoryOf('omnistax-lang'), 'appearance');
  const kept = new Map([['omnistax-lang', 'zh-CN'], ['unrelated', 'x']]);
  const was = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { get length() { return kept.size; }, key: (i: number) => [...kept.keys()][i] ?? null, getItem: (k: string) => kept.get(k) ?? null } });
  let exported: ReturnType<typeof readerRecords>;
  try { exported = readerRecords(); }
  finally { if (was) Object.defineProperty(globalThis, 'localStorage', was); else delete (globalThis as { localStorage?: unknown }).localStorage; }
  assert.deepEqual(exported, [{ key: 'omnistax-lang', value: 'zh-CN', category: 'appearance' }]);
  const back = parseBackupText(backup(exported));
  assert.deepEqual(back.records, exported);
  assert.deepEqual(back.skipped, []);
  assert.equal(validReaderRecord({ key: 'omnistax-lang', value: 'en', category: 'appearance' }), true);
  assert.deepEqual(parseBackupText(backup([{ key: 'omnistax-lang', value: 'fr', category: 'appearance' }])).skipped.map((r) => r.key), ['omnistax-lang']);
  assert.equal(validReaderRecord({ key: 'omnistax-lang', value: 'zh-CN', category: 'reading' }), false);
});
