/* The data format: one name per record, what an older build wrote brought up
   to date wherever it arrives (this device, a backup file, a sync repo), and
   a newer build's data left alone in both directions. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { BACKUP_FORMAT, BACKUP_VERSION, RECORD_KEYS, categoryOf, parseBackup, parseBackupText, validReaderRecord, type ReaderBackup } from '../src/lib/backup/schema';
import { RENAMES, RETIRED, currentKeyOf, isOldKey, migrateRecords, migrateStorage, migration } from '../src/lib/backup/migrate';
import { DATA_VERSION } from '../src/lib/backup/format';
import { DEFAULT_BINDINGS } from '../src/lib/commands/defaults';
import { GATE, GATE_BYTES, MANIFEST, SYNC_VERSION, explode, jsonBytes, parseManifest, recordBytes, recordPath, toRepo, type RepoPath } from '../src/lib/sync/layout';
import { blobSha, type Fetch, type Remote } from '../src/lib/sync/github';
import { changesOf, oneWay, planOf, type Base } from '../src/lib/sync/plan';
import { NewerRepo, carry, hashed, newerRelease, survey } from '../src/lib/sync/run';
import { describe, describeRecord } from '../src/lib/sync/describe';
import { LOCALES } from '../src/lib/i18n';

const at = '2026-11-06T12:00:00.000Z';
const row = (id: string, updated: number) => ({ id, name: `chat ${id}`, created: 1, updated });
const practice = { attempts: [{ book: 'calculus', section: '1.1', ex: 'e1', at: 5, ok: true, concepts: ['limits'] }], shown: [], rounds: [], self: {} };

/* ── the table ─────────────────────────────────────────────────────────── */

test('every record this build keeps has one name, and no old name is still read as a record', () => {
  assert.equal(SYNC_VERSION, DATA_VERSION);
  assert.equal(BACKUP_VERSION, DATA_VERSION);
  for (const r of RENAMES) {
    assert.notEqual(categoryOf(r.to), null, `${r.to} is a record`);
    assert.doesNotMatch(r.to, /-v\d+$/, `${r.to} carries no version`);
    for (const old of r.from) {
      assert.equal(categoryOf(old), null, `${old} is no longer a record`);
      assert.equal(isOldKey(old), true);
      assert.equal(currentKeyOf(old), r.to);
    }
  }
  for (const old of RETIRED) { assert.equal(categoryOf(old), null, old); assert.equal(isOldKey(old), true); }
  const tos = RENAMES.map((r) => r.to), froms = RENAMES.flatMap((r) => r.from);
  assert.equal(new Set(tos).size, tos.length, 'no two old records land on one name');
  assert.equal(tos.some((k) => froms.includes(k) || RETIRED.includes(k)), false, 'no current name is also an old one');
  /* The scalar settings already had no version, and the one called tips is the on/off switch, not the history. */
  assert.equal(categoryOf('omnistax-tips'), 'appearance');
  assert.equal(currentKeyOf('omnistax-tips-v1'), 'omnistax-tip-history');
});

/* ── the rules ─────────────────────────────────────────────────────────── */

const run = (records: Record<string, string>) => {
  const m = migration((k) => k in records, (k) => records[k]);
  return { set: Object.fromEntries(m.set), remove: [...m.remove].sort() };
};

test('a record under an old name moves to its name as it is', () => {
  assert.deepEqual(run({ 'omnistax-library-v1': '["calculus"]', 'omnistax-theme': 'dark' }), { set: { 'omnistax-library': '["calculus"]' }, remove: ['omnistax-library-v1'] });
  assert.deepEqual(run({ 'omnistax-theme': 'dark', 'omnistax-library': '[]' }), { set: {}, remove: [] }, 'nothing to do on a device already moved');
});

test('where the current name is already there, the old names only go', () => {
  assert.deepEqual(run({ 'omnistax-practice': JSON.stringify({ ...practice, settings: {} }), 'omnistax-practice-v2': '{}', 'omnistax-practice-v1': '{}' }), { set: {}, remove: ['omnistax-practice-v1', 'omnistax-practice-v2'] });
});

test('of several old names, the newest is taken and the older ones go', () => {
  const out = run({ 'omnistax-practice-v2': JSON.stringify({ ...practice, settings: { masteryTarget: 7 } }), 'omnistax-practice-v1': JSON.stringify({ attempts: [] }) });
  assert.deepEqual(out.remove, ['omnistax-practice-v1', 'omnistax-practice-v2']);
  assert.equal(JSON.parse(out.set['omnistax-practice']).settings.masteryTarget, 7);
});

test('the first practice record is converted into the shape the current one holds', () => {
  const out = run({ 'omnistax-practice-v1': JSON.stringify({ attempts: practice.attempts, settings: { masteryTarget: 'old' } }) });
  const value = out.set['omnistax-practice'];
  assert.ok(value);
  assert.equal(validReaderRecord({ key: 'omnistax-practice', value, category: 'practice' }), true, 'it passes the check a backup and a sync hold it to');
  assert.equal(JSON.parse(value).attempts.length, 1);
});

test('the chat indexes: the third wins, else the second and the first are put together row by row', () => {
  const third = JSON.stringify([row('aaaaaaaa', 9)]);
  assert.deepEqual(run({ 'omnistax-chats-v3': third, 'omnistax-chats-v1': JSON.stringify([row('bbbbbbbb', 1)]) }), { set: { 'omnistax-chat-index': third }, remove: ['omnistax-chats-v1', 'omnistax-chats-v3'] });
  const out = run({ 'omnistax-chats-v2': JSON.stringify([{ ...row('aaaaaaaa', 2), book: 'calculus' }]), 'omnistax-chats-v1': JSON.stringify([row('aaaaaaaa', 1), row('bbbbbbbb', 1)]) });
  const merged = JSON.parse(out.set['omnistax-chat-index']) as { id: string }[];
  assert.deepEqual(merged.map((r) => r.id).sort(), ['aaaaaaaa', 'bbbbbbbb']);
  assert.equal(validReaderRecord({ key: 'omnistax-chat-index', value: out.set['omnistax-chat-index'], category: 'chats' }), true);
});

test('the whole map of shortcuts an old build saved becomes the changes from the defaults', () => {
  const [chord, id] = Object.entries(DEFAULT_BINDINGS)[0];
  const old = { ...Object.fromEntries(Object.entries(DEFAULT_BINDINGS).filter(([c]) => c !== chord)), 'Ctrl+Alt+Shift+F9': id };
  const out = run({ 'omnistax-keys': JSON.stringify(old) });
  assert.deepEqual(JSON.parse(out.set['omnistax-shortcuts'])[id], ['Ctrl+Alt+Shift+F9']);
  assert.deepEqual(run({ 'omnistax-keys-v2': '{}', 'omnistax-keys': JSON.stringify(old) }).set, { 'omnistax-shortcuts': '{}' }, 'the second wins over the first');
});

test('the pins before views had levels become scopes', () => {
  const out = run({ 'omnistax-scope': JSON.stringify({ 'view:1': { follow: true, level: 'section' } }) });
  assert.equal(validReaderRecord({ key: 'omnistax-scopes', value: out.set['omnistax-scopes'], category: 'layout' }), true);
  assert.deepEqual(out.remove, ['omnistax-scope']);
});

test('records no build reads any more only go, and one that cannot be converted stays where it is', () => {
  assert.deepEqual(run({ 'omnistax-layout-v5': '{}', 'omnistax-seen-releases-v1': '{}' }), { set: {}, remove: ['omnistax-layout-v5', 'omnistax-seen-releases-v1'] });
  assert.deepEqual(run({ 'omnistax-practice-v1': '[not json' }), { set: {}, remove: [] });
});

/* ── where it runs ─────────────────────────────────────────────────────── */

class Memory implements Storage {
  private m = new Map<string, string>();
  constructor(init: Record<string, string>) { Object.entries(init).forEach(([k, v]) => this.m.set(k, v)); }
  get length(): number { return this.m.size; }
  clear(): void { this.m.clear(); }
  getItem(k: string): string | null { return this.m.get(k) ?? null; }
  key(i: number): string | null { return [...this.m.keys()][i] ?? null; }
  removeItem(k: string): void { this.m.delete(k); }
  setItem(k: string, v: string): void { this.m.set(k, v); }
  all(): Record<string, string> { return Object.fromEntries([...this.m].sort(([a], [b]) => a.localeCompare(b))); }
}

test('as the app starts, this device’s records move to their names, and a second start changes nothing', () => {
  const s = new Memory({ 'omnistax-theme': 'dark', 'omnistax-tips-v1': '{"first":1,"day":null,"next":0}', 'omnistax-chats-v3': '[]', 'omnistax-chats-v1': '[]', 'omnistax-layout-v5': '{}', 'omnistax-sync-v1': '{"keep":1}' });
  migrateStorage(s);
  const once = s.all();
  assert.deepEqual(once, { 'omnistax-chat-index': '[]', 'omnistax-sync-v1': '{"keep":1}', 'omnistax-theme': 'dark', 'omnistax-tip-history': '{"first":1,"day":null,"next":0}' });
  migrateStorage(s);
  assert.deepEqual(s.all(), once);
});

const v1Backup = (records: { key: string; value: string }[], extra: Record<string, unknown> = {}) => JSON.stringify({
  format: BACKUP_FORMAT, version: 1, exportedAt: at, app: { readerFormat: 1 }, records, assets: [], books: [], ...extra,
});

test('a backup file an older build wrote restores under the current names', () => {
  const back = parseBackupText(v1Backup([
    { key: 'omnistax-library-v1', value: '["calculus"]' },
    { key: 'omnistax-practice-v2', value: JSON.stringify({ ...practice, settings: { masteryTarget: 3, freshnessDecay: true, startingHalfLife: 1, maxHalfLife: 2, order: 'mixed', includeFresh: true } }) },
    { key: 'omnistax-chats-v3', value: '[]' }, { key: 'omnistax-chats-v1', value: '[]' },
    { key: 'omnistax-theme', value: 'dark' },
  ]));
  assert.deepEqual(back.records.map((r) => `${r.key}:${r.category}`).sort(), ['omnistax-chat-index:chats', 'omnistax-library:library', 'omnistax-practice:practice', 'omnistax-theme:appearance']);
  assert.deepEqual(back.skipped, []);
});

test('a backup file of a newer data format is refused whole, naming the release that wrote it', () => {
  assert.throws(() => parseBackupText(JSON.stringify({ ...JSON.parse(v1Backup([])), version: DATA_VERSION + 1, app: { readerFormat: 1, release: '2027.2.3.1', hologram: true } })), /2027\.2\.3\.1/);
  assert.equal(migrateRecords([{ key: 'omnistax-theme', value: 'dark' }], (key, value) => ({ key, value })).length, 1);
});

/* ── a sync repo ───────────────────────────────────────────────────────── */

type Call = { method: string; path: string; body: unknown };
/* GitHub as a map of paths to bytes; a commit lands its tree changes on it. */
const github = (files: Record<string, Uint8Array>) => {
  const blobs = new Map<string, Uint8Array>();
  const tree = new Map<string, string>();
  const calls: Call[] = [];
  const ready = (async () => { for (const [p, b] of Object.entries(files)) { const s = await blobSha(b); blobs.set(s, b); tree.set(p, s); } })();
  let staged: { path: string; sha: string | null }[] = [];
  const f: Fetch = async (input, init) => {
    await ready;
    const path = new URL(String(input)).pathname.replace(/^\/repos\/chen\/notes/, '');
    const method = init?.method ?? 'GET';
    const body: unknown = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, path, body });
    const ok = (v: unknown) => new Response(JSON.stringify(v), { status: 200 });
    if (method === 'GET' && path.startsWith('/git/ref/heads/')) return ok({ object: { sha: 'c0' } });
    if (method === 'GET' && path.startsWith('/git/commits/')) return ok({ tree: { sha: 'tree0' } });
    if (method === 'GET' && path.startsWith('/git/trees/')) return ok({ truncated: false, tree: [...tree].map(([p, s]) => ({ path: p, type: 'blob', sha: s, size: blobs.get(s)!.length })) });
    if (method === 'GET' && path.startsWith('/git/blobs/')) { const b = blobs.get(path.slice('/git/blobs/'.length)); return b ? new Response(new Blob([b as BlobPart])) : new Response('{}', { status: 404 }); }
    if (method === 'POST' && path === '/git/blobs') { const b = Uint8Array.from(atob((body as { content: string }).content), (c) => c.charCodeAt(0)); const s = await blobSha(b); blobs.set(s, b); return ok({ sha: s }); }
    if (method === 'POST' && path === '/git/trees') { staged = (body as { tree: { path: string; sha: string | null }[] }).tree; return ok({ sha: 'tree1' }); }
    if (method === 'POST' && path === '/git/commits') return ok({ sha: 'c1' });
    if (method === 'PATCH' && path.startsWith('/git/refs/')) { for (const c of staged) { if (c.sha === null) tree.delete(c.path); else tree.set(c.path, c.sha); } return ok({}); }
    return new Response('{}', { status: 500 });
  };
  const read = (p: string): Uint8Array | undefined => { const s = tree.get(p); return s ? blobs.get(s) : undefined; };
  return { f, calls, paths: () => [...tree.keys()].sort(), read, ready };
};
const remote: Remote = { repo: 'chen/notes' as Remote['repo'], branch: 'main', token: 't' };
const writes = (calls: readonly Call[]): number => calls.filter((c) => c.method !== 'GET').length;

const profile = (records: { key: string; value: string }[]): ReaderBackup => parseBackup({ format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: at, app: { readerFormat: 1 }, records, assets: [], books: [] });
/* The repo as a build of the second data format laid it out: a file per record, under the names it knew. */
const olderRepo = (records: Record<string, unknown>): Record<string, Uint8Array> => ({
  [MANIFEST]: jsonBytes({ format: 'omnistax-sync', version: 2, exportedAt: at, books: [], files: [], images: [], labels: {} }),
  ...Object.fromEntries(Object.entries(records).map(([k, v]) => [recordPath(k), jsonBytes(v)])),
});

test('a repo an older build last synced is shown under the current names, and one sync moves it to the current format', async () => {
  const lib = ['calculus'];
  const gh = github(olderRepo({ 'omnistax-library-v1': lib, 'omnistax-theme': 'dark', 'omnistax-chats-v3': [row('aaaaaaaa', 2)], 'omnistax-chats-v1': [row('aaaaaaaa', 2)] }));
  await gh.ready;
  /* The last sync agreed on the old files as the repo holds them. */
  const base: Base = Object.fromEntries(await Promise.all(gh.paths().filter((p) => p !== MANIFEST).map(async (p) => [p, await blobSha(gh.read(p)!)] as const)));
  const seen = await survey(remote, gh.f, base);
  assert.equal(seen.upgrade, true);
  assert.deepEqual(seen.remote.map((e) => e.path).sort(), [MANIFEST, recordPath('omnistax-chat-index'), recordPath('omnistax-library'), recordPath('omnistax-theme')].sort());
  assert.deepEqual([...seen.legacy].sort(), [recordPath('omnistax-chats-v1'), recordPath('omnistax-chats-v3'), recordPath('omnistax-library-v1')].sort());
  assert.ok(seen.base[recordPath('omnistax-library')], 'what was agreed under the old name is agreed under the new');

  /* This device moved its own records as it started: nothing differs. */
  const local = await hashed(toRepo(profile([{ key: 'omnistax-library', value: JSON.stringify(lib) }, { key: 'omnistax-theme', value: 'dark' }, { key: 'omnistax-chat-index', value: JSON.stringify([row('aaaaaaaa', 2)]) }])));
  const merged = { ...seen.base, ...base };
  const changes = changesOf(local, seen.remote, merged, seen.manifest);
  assert.deepEqual(changes, []);

  /* A pull alone with nothing to pull still writes the repo in this format. */
  const out = await carry(remote, gh.f, seen, local, oneWay(planOf(changes, new Map()), 'down'), merged, () => undefined);
  assert.equal(out.backup, null);
  assert.deepEqual(gh.paths(), [GATE, MANIFEST, recordPath('omnistax-chat-index'), recordPath('omnistax-library'), recordPath('omnistax-theme')].sort());
  const manifest = parseManifest(gh.read(MANIFEST)!);
  assert.equal(manifest.version, SYNC_VERSION);
  assert.equal(manifest.app, 'dev');
  assert.deepEqual(JSON.parse(new TextDecoder().decode(gh.read(recordPath('omnistax-library'))!)), lib);

  /* And the next look finds nothing to upgrade and nothing to send. */
  const again = await survey(remote, gh.f, out.base);
  assert.equal(again.upgrade, false);
  assert.deepEqual(changesOf(local, again.remote, out.base, again.manifest), []);
});

test('a record changed on an older build and moved here comes down under its new name', async () => {
  const gh = github(olderRepo({ 'omnistax-library-v1': ['calculus', 'chemistry-2e'] }));
  await gh.ready;
  const agreed = jsonBytes(['calculus']);
  const base: Base = { [recordPath('omnistax-library-v1')]: await blobSha(agreed) };
  /* The base blob is in the repo's history. */
  const history = github({ x: agreed });
  await history.ready;
  const f: Fetch = async (input, init) => { const r = await gh.f(input, init); return r.status === 404 ? history.f(input, init) : r; };
  const seen = await survey(remote, f, base);
  const local = await hashed(toRepo(profile([{ key: 'omnistax-library', value: '["calculus"]' }])));
  const changes = changesOf(local, seen.remote, { ...seen.base, ...base }, seen.manifest);
  assert.deepEqual(changes.map((c) => `${c.side} ${c.path}`), [`down ${recordPath('omnistax-library')}`]);
  const out = await carry(remote, f, seen, local, planOf(changes, new Map()), { ...seen.base, ...base }, () => undefined);
  assert.deepEqual(out.backup?.records.find((r) => r.key === 'omnistax-library')?.value, '["calculus","chemistry-2e"]');
  assert.equal(gh.paths().includes(recordPath('omnistax-library-v1')), false);
});

test('a repo a newer build last synced is left alone: nothing is read past the manifest and nothing is written', async () => {
  const gh = github({
    [MANIFEST]: jsonBytes({ format: 'omnistax-sync', version: SYNC_VERSION + 1, app: '2027.1.5.0', exportedAt: at, books: [], files: [], images: [], labels: {}, hologram: 1 }),
    [recordPath('omnistax-library')]: jsonBytes(['calculus']),
  });
  await assert.rejects(survey(remote, gh.f), (e: unknown) => e instanceof NewerRepo && e.release === '2027.1.5.0' && /2027\.1\.5\.0/.test(e.message));
  assert.equal(writes(gh.calls), 0);
  assert.equal(gh.calls.filter((c) => c.path.startsWith('/git/blobs/')).length, 1, 'only the manifest was read');
  assert.equal(newerRelease(jsonBytes({ format: 'omnistax-sync', version: SYNC_VERSION })), null, 'its own format is not newer');
  assert.equal(newerRelease(jsonBytes({ format: 'omnistax-sync', version: SYNC_VERSION + 1 })), '?', 'nor does it need the release named');
});

test('the gate file stops a build from before the data format gate in its survey, and this build passes it by', async () => {
  /* Such a build takes the gate for a category file of the first layout and takes it apart, as this explode does. */
  assert.throws(() => explode(GATE_BYTES));
  const gh = github({ [MANIFEST]: jsonBytes({ format: 'omnistax-sync', version: SYNC_VERSION, app: 'dev', exportedAt: at, books: [], files: [], images: [], labels: {} }), [GATE]: GATE_BYTES, [recordPath('omnistax-theme')]: recordBytes({ key: 'omnistax-theme', value: 'dark' }) });
  const seen = await survey(remote, gh.f);
  assert.equal(seen.upgrade, false);
  assert.deepEqual(seen.remote.map((e) => e.path).sort(), [MANIFEST, recordPath('omnistax-theme')].sort(), 'the gate is not a file of the profile');
  assert.match(new TextDecoder().decode(GATE_BYTES), /newer OmniStax/);
});

test('a push writes the gate, the manifest names this build’s release, and a first push to a fresh repo is in the current format', async () => {
  const gh = github({ [MANIFEST]: jsonBytes({ format: 'omnistax-sync', version: SYNC_VERSION, exportedAt: at, books: [], files: [], images: [], labels: {} }) });
  const seen = await survey(remote, gh.f);
  const local = await hashed(toRepo(profile([{ key: 'omnistax-theme', value: 'dark' }])));
  await carry(remote, gh.f, seen, local, planOf(changesOf(local, seen.remote, {}, seen.manifest), new Map()), {}, () => undefined);
  assert.ok(gh.paths().includes(GATE));
  assert.equal(parseManifest(gh.read(MANIFEST)!).app, 'dev');
  assert.deepEqual(gh.read(GATE), GATE_BYTES);
  assert.equal(new Set<RepoPath>(gh.paths()).has(recordPath('omnistax-theme')), true);
});

/* ── what each file is ─────────────────────────────────────────────────── */

test('every record says what it holds, in every language, and a per-book one names its book', () => {
  for (const locale of LOCALES) {
    const seen = new Set<string>();
    for (const key of RECORD_KEYS) {
      const d = describeRecord(key, locale);
      assert.ok(d && !d.includes('files.sync.record'), `${key} in ${locale}`);
      assert.doesNotMatch(d, /omnistax-/, `${key} in ${locale} says more than its name`);
      assert.equal(seen.has(d), false, `${key} in ${locale} is described like another record`);
      seen.add(d);
    }
    assert.match(describeRecord('omnistax-notes-calculus', locale, (id) => (id === 'calculus' ? 'Calculus Volume 1' : id))!, /Calculus Volume 1/);
    assert.match(describeRecord('omnistax-colours-calculus', locale)!, /calculus/);
    assert.match(describeRecord('omnistax-highlights-calculus', locale)!, /calculus/);
    assert.ok(describe(MANIFEST, locale));
  }
  assert.equal(describe(recordPath('omnistax-chat-index'), 'en'), 'The list of your chats');
  assert.equal(describe('chats/abcd1234.json', 'en'), null, 'a chat is named by its own name');
  assert.equal(describeRecord('omnistax-hologram', 'en'), null);
});

test('the settings no backup used to carry now travel with the rest', () => {
  for (const [key, value] of [['omnistax-fill-all', '1'], ['omnistax-finger-draws', '0']] as const) {
    assert.equal(categoryOf(key), 'appearance', key);
    assert.equal(validReaderRecord({ key, value, category: 'appearance' }), true, key);
  }
  assert.equal(validReaderRecord({ key: 'omnistax-drawing-palette', value: JSON.stringify(['ink', '#6b7280']), category: 'appearance' }), true);
  assert.deepEqual(run({ 'omnistax-drawing-palette-v1': '["ink"]' }), { set: { 'omnistax-drawing-palette': '["ink"]' }, remove: ['omnistax-drawing-palette-v1'] });
  assert.deepEqual(run({ 'omnistax-cc': '1', 'omnistax-underlines': '0', 'omnistax-zoom-keys': '1' }).remove, ['omnistax-cc', 'omnistax-underlines', 'omnistax-zoom-keys']);
});
