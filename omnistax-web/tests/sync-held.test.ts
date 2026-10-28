import test from 'node:test';
import assert from 'node:assert/strict';
import { BACKUP_FORMAT, BACKUP_VERSION, categoryOf, parseBackup, staysOnDevice, type ReaderBackup } from '../src/lib/backup/schema';
import { recordsToRestore } from '../src/lib/backup/adapters';
import { MANIFEST, deviceRecord, jsonBytes, recordBytes, recordPath, toRepo } from '../src/lib/sync/layout';
import { changesOf, overwrite, planOf, type Base, type Change } from '../src/lib/sync/plan';
import { carry, hashed, screen, survey } from '../src/lib/sync/run';
import { holdOf, newerHere, reconcile, takeable, waiting, withHeld, type Held } from '../src/lib/sync/held';
import { ABSENT, merge3 } from '../src/lib/sync/merge';
import { gitSha } from '../src/lib/sync/github';
import { blobFrom, github, remote, shaOf } from './fake-github';

const enc = new TextEncoder();
const at = '2026-10-20T12:00:00.000Z';
const profile = (records: { key: string; value: string }[]): ReaderBackup => parseBackup({
  format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: at, app: { readerFormat: 1 },
  records: records.map((r) => ({ ...r, category: 'appearance' })), assets: [], books: [],
});
const manifest = jsonBytes({ format: 'omnistax-sync', version: 2, exportedAt: at, books: [], files: [], images: [], labels: {} });
const fileOf = (key: string, value: string): Uint8Array => recordBytes({ key, value });

const NOTES = 'omnistax-notes-college-physics-2e';
const note = (id: string, text: string, updated: number) => ({ id, section: '1.1', doc: 'text', anchor: { quote: 'q', prefix: '', suffix: '' }, color: 'yellow', text, created: 1, updated });
const notes = (...n: ReturnType<typeof note>[]): string => JSON.stringify(n);

const mastery = (level: number, lastAt: number, mastered: boolean) => ({ c: { level, target: 3, mastered, masteredAt: lastAt, lastAt, halfLife: 3, reviewedAt: lastAt, dueAt: lastAt + 10, selfAssessed: false, noDecay: false } });
const session = (after: ReturnType<typeof mastery>) => JSON.stringify({ s1: { id: 's1', curriculum: [], concepts: ['c'], drawn: [{ book: 'b', section: '1.1', ex: 'e1', why: 'new' }], at: 1, outcomes: [true], started: 1, before: mastery(0, 1, false), status: 'done', ended: 2, after } });
const settings = { masteryTarget: 3, freshnessDecay: true, startingHalfLife: 3, maxHalfLife: 240, order: 'mixed', includeFresh: false, generated: 'include', grading: 'reveal', promptNote: 'p', fresh: false, stopwatch: false, model: null };
const attempt = (at: number) => ({ book: 'b', section: '1.1', ex: `e${at}`, at, ok: true, concepts: ['c'] });
const practice = (attempts: number[], self: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) => JSON.stringify({ attempts: attempts.map(attempt), shown: [], rounds: [], self, settings: { ...settings, ...extra } });

/* ── what is held, and why ───────────────────────────────────────────── */

test('a repo copy that would undo an edit made here is held; a later edit or a deletion there is not', () => {
  const P = recordPath(NOTES);
  const here = fileOf(NOTES, notes(note('a', 'mine, later', 20), note('b', 'B', 5)));
  assert.equal(holdOf(P, here, fileOf(NOTES, notes(note('a', 'theirs, earlier', 10), note('b', 'B', 5))))?.reason, 'older');
  assert.equal(holdOf(P, here, fileOf(NOTES, notes(note('a', 'theirs, later', 30), note('b', 'B', 5)))), null);
  assert.equal(holdOf(P, here, fileOf(NOTES, notes(note('b', 'B', 5)))), null, 'a note deleted on the other device comes down');
  assert.equal(holdOf(P, null, fileOf(NOTES, notes(note('a', 'new', 1)))), null, 'nothing here to undo');
});

test('a copy this version cannot read is held as a newer version’s or as unreadable, and only an older one can be taken', () => {
  const P = recordPath('omnistax-practice-v2');
  const newer = holdOf(P, null, fileOf('omnistax-practice-v2', practice([1], {}, { metronome: true })));
  assert.equal(newer?.reason, 'newer');
  assert.match(newer?.why ?? '', /metronome/);
  assert.equal(holdOf(recordPath('omnistax-theme'), null, jsonBytes('sepia'))?.reason, 'newer', 'a setting’s value this version does not offer');
  assert.equal(holdOf(P, null, enc.encode('{"attempts": ['))?.reason, 'unreadable');
  assert.equal(holdOf('chats/abcd1234.json', null, jsonBytes({ id: 'abcd1234' }))?.reason, 'unreadable', 'a chat missing its fields');
  assert.deepEqual([takeable({ reason: 'older', why: '' }), takeable({ reason: 'newer', why: '' }), takeable({ reason: 'unreadable', why: '' })], [true, false, false]);
});

test('mastery, freshness and every other number that falls on its own never holds a file', () => {
  /* A session's mastery snapshot fallen, its review dates earlier, mastered lost to decay. */
  const S = recordPath('omnistax-practice-sessions-v2');
  assert.equal(holdOf(S, fileOf('omnistax-practice-sessions-v2', session(mastery(3, 900, true))), fileOf('omnistax-practice-sessions-v2', session(mastery(1, 100, false)))), null);
  /* An attempt taken back, a self-assessment lowered and dated earlier. */
  const P = recordPath('omnistax-practice-v2');
  const self = (level: number, when: number) => ({ c: { level, mastered: level >= 3, at: when, noDecay: false } });
  assert.equal(holdOf(P, fileOf('omnistax-practice-v2', practice([1, 2, 3], self(3, 50))), fileOf('omnistax-practice-v2', practice([1, 3], self(1, 40)))), null);
  /* Only `updated` is compared, at any depth. */
  assert.equal(newerHere({ level: 3, lastAt: 9, dueAt: 9, halfLife: 40 }, { level: 0, lastAt: 1, dueAt: 1, halfLife: 3 }), false);
  assert.equal(newerHere({ chat: { updated: 9 } }, { chat: { updated: 8 } }), true);
  assert.equal(newerHere([{ id: 'x', updated: 9 }], [{ id: 'y', updated: 1 }]), false, 'different things are not compared');
});

test('a log one side took an attempt out of merges with the other side’s new attempts, and mastery follows the log', () => {
  const base = [attempt(1), attempt(2)];
  const r = merge3(base, [attempt(1)], [attempt(1), attempt(2), attempt(3)]);
  assert.deepEqual(r.conflicts, []);
  assert.deepEqual((r.mine as { at: number }[]).map((a) => a.at), [1, 3], 'the attempt taken back stays out, the new one comes in');
});

test('without a base, both sides’ attempts are kept rather than one log thrown away', () => {
  const r = merge3(ABSENT, [attempt(1), attempt(2)], [attempt(1), attempt(5)]);
  assert.deepEqual(r.conflicts, []);
  assert.deepEqual((r.mine as { at: number }[]).map((a) => a.at), [1, 2, 5]);
});

/* ── the queue ───────────────────────────────────────────────────────── */

const sha = gitSha;
const down = (path: string, local: string, remote: string): Change => ({ path, group: 'records', label: path, side: 'down', letter: 'M', local: sha(local), remote: sha(remote), size: 1 });
const heldOf = (c: Change, reason: Held['reason'], pick: Held['pick'] = null): Held => ({ path: c.path, label: c.label, group: c.group, reason, why: '', local: c.local, remote: c.remote!, pick, seen: false });

test('a held file keeps the reader’s choice while it is held between the same two versions, and leaves once it is not', () => {
  const c = down('records/omnistax-a.json', 'l', 'r');
  const q = [heldOf(c, 'older', 'mine')];
  const found = [{ path: c.path, reason: 'older' as const, why: '', local: c.local, remote: c.remote! }];
  assert.equal(reconcile(q, found, [c])[0].pick, 'mine');
  const again = down(c.path, 'l', 'r2');
  assert.equal(reconcile(q, [{ ...found[0], remote: again.remote! }], [again])[0].pick, null, 'changed again in the repo: asked afresh');
  assert.deepEqual(reconcile(q, [], [c]), [], 'no longer held');
  assert.deepEqual(reconcile(q, found, [{ ...c, side: 'both' }]), [], 'changed here too: a merge now, not a hold');
  assert.deepEqual(waiting(reconcile([], found, [c])).length, 1);
});

test('the plan leaves held files out, takes the repo’s copy or sends this device’s where the reader chose, and never pushes over one it cannot read', () => {
  const a = down('records/omnistax-a.json', 'la', 'ra'), b = down('records/omnistax-b.json', 'lb', 'rb'), n = down('records/omnistax-n.json', 'ln', 'rn'), ok = down('records/omnistax-ok.json', 'lo', 'ro');
  const changes = [a, b, n, ok];
  const plan = (q: Held[]) => { const p = withHeld(planOf(changes, new Map()), changes, q); return { up: p.up.map((c) => c.path), down: p.down.map((c) => c.path) }; };
  assert.deepEqual(plan([heldOf(a, 'older'), heldOf(b, 'older'), heldOf(n, 'newer')]), { up: [], down: [ok.path] }, 'what passed comes down alone');
  assert.deepEqual(plan([heldOf(a, 'older', 'theirs'), heldOf(b, 'older', 'mine'), heldOf(n, 'newer', 'mine')]), { up: [b.path], down: [a.path, ok.path] });
  assert.deepEqual(plan([heldOf(n, 'newer', 'theirs')]), { up: [], down: [a.path, b.path, ok.path] }, 'a newer version’s copy is never taken');
});

/* ── a pull with a held file ─────────────────────────────────────────── */

test('a pull takes what passes and holds what would undo an edit here; the base stays for the held file until the reader keeps this device’s, which goes up', async () => {
  const N = recordPath(NOTES), T = recordPath('omnistax-theme');
  const was = fileOf(NOTES, notes(note('a', 'agreed', 10)));
  const here = was;                                                    // this device has not changed the notes since
  const there = fileOf(NOTES, notes(note('a', 'an old copy pushed again', 5)));
  const gh = github({ [MANIFEST]: manifest, [N]: there, [T]: jsonBytes('light') }, [was]);
  const local = await hashed(toRepo(profile([{ key: NOTES, value: notes(note('a', 'agreed', 10)) }, { key: 'omnistax-theme', value: 'dark' }])));
  assert.deepEqual(local.find((f) => f.path === N)!.bytes, here);
  const base: Base = Object.fromEntries(local.map((f) => [f.path, f.sha]));
  const seen = await survey(remote, gh.f, base);
  const changes = changesOf(local, seen.remote, base, seen.manifest);
  assert.deepEqual(changes.map((c) => `${c.side} ${c.path}`).sort(), [`down ${N}`, `down ${T}`]);

  const checked = await screen(changes, local, blobFrom(gh));
  assert.deepEqual(checked.found.map((f) => [f.path, f.reason]), [[N, 'older']]);
  let queue = reconcile([], checked.found, changes);
  const out = await carry(remote, gh.f, { ...seen, held: new Map([...seen.held, ...checked.bytes]) }, local, withHeld(planOf(changes, new Map()), changes, queue), base, () => undefined);
  assert.deepEqual(out.backup?.records.map((r) => r.key === NOTES ? `${r.key}=${JSON.parse(r.value)[0].text}` : `${r.key}=${r.value}`).sort(), [`${NOTES}=agreed`, 'omnistax-theme=light'], 'the theme came down beside the held notes');
  assert.equal(out.base[N], base[N], 'the base does not move for the held file');
  assert.equal(out.base[T], await shaOf(jsonBytes('light')));

  /* Next look: still held, the reader keeps this device's, and it goes up. */
  const after = changesOf(local, seen.remote, out.base, seen.manifest).filter((c) => c.path === N);
  queue = reconcile(queue, (await screen(after, local, blobFrom(gh))).found, after);
  assert.equal(queue.length, 1);
  queue = queue.map((h) => ({ ...h, pick: 'mine' }));
  const plan = withHeld(planOf(after, new Map()), after, queue);
  assert.deepEqual([plan.up.map((c) => c.path), plan.down.length], [[N], 0]);
  const gh2 = github({ [MANIFEST]: manifest, [N]: there, [T]: jsonBytes('light') }, [was]);
  const pushed = await carry(remote, gh2.f, await survey(remote, gh2.f, out.base), local, plan, out.base, () => undefined);
  assert.equal(new Map(gh2.committed().map((e) => [e.path, e.sha])).get(N), local.find((f) => f.path === N)!.sha, 'this device’s copy replaces the repo’s');
  assert.equal(pushed.base[N], local.find((f) => f.path === N)!.sha, 'and both sides agree on it');
});

test('a forced pull still refuses a file this version cannot read, and hands it to the queue', async () => {
  const P = recordPath('omnistax-practice-v2'), T = recordPath('omnistax-theme');
  const gh = github({ [MANIFEST]: manifest, [P]: fileOf('omnistax-practice-v2', practice([1], {}, { metronome: true })), [T]: jsonBytes('light') });
  const local = await hashed(toRepo(profile([{ key: 'omnistax-practice-v2', value: practice([1]) }, { key: 'omnistax-theme', value: 'dark' }])));
  const base: Base = Object.fromEntries(local.map((f) => [f.path, f.sha]));
  const seen = await survey(remote, gh.f, base);
  const out = await carry(remote, gh.f, seen, local, overwrite(changesOf(local, seen.remote, base, seen.manifest), 'device'), base, () => undefined);
  assert.deepEqual(out.held.map((h) => [h.path, h.reason]), [[P, 'newer']]);
  assert.equal(JSON.parse(out.backup!.records.find((r) => r.key === 'omnistax-practice-v2')!.value).settings.metronome, undefined, 'this device keeps its own');
  assert.equal(out.base[P], base[P]);
});

/* ── the workspace stays on each device ──────────────────────────────── */

test('the workspace is never pushed, never pulled, never deleted from the repo, and a pull leaves this device’s as it is', async () => {
  const LAYOUT = 'omnistax-layout-v6';
  for (const key of [LAYOUT, 'omnistax-layout-v5', 'omnistax-scope-v2', 'omnistax-scope', 'omnistax-chat-pages-v1', 'omnistax-practice-pages-v2', 'omnistax-practice-pages-v1']) {
    assert.equal(staysOnDevice(key), true, key);
    assert.equal(categoryOf(key), 'layout', key);
    assert.equal(deviceRecord(recordPath(key)), true, key);
  }
  assert.equal(staysOnDevice('omnistax-practice-v2'), false);
  const layout = JSON.stringify({ sides: { left: { width: 200, items: [] }, right: { width: 200, items: [] } }, home: {}, collapsed: [], groups: [{ key: 'g', tabs: [], active: null }], focus: 0, tree: { type: 'leaf', group: 'g' } });
  const mine = profile([{ key: LAYOUT, value: layout }, { key: 'omnistax-theme', value: 'dark' }]);
  assert.equal(mine.records.length, 2, 'the file backup carries the layout');
  const files = toRepo(mine);
  assert.equal(files.some((f) => f.path === recordPath(LAYOUT)), false, 'not pushed');

  /* The repo holds an earlier version's layout file, which the base knows too. */
  const theirs = jsonBytes(JSON.parse(layout.replace('200', '900')));
  const local = await hashed(files);
  const remoteTree = [{ path: recordPath(LAYOUT), sha: await shaOf(theirs), size: theirs.length }, ...local.map((f) => ({ path: f.path, sha: f.sha, size: f.bytes.length }))];
  for (const base of [{}, { [recordPath(LAYOUT)]: await shaOf(jsonBytes('old')) }] as Base[])
    assert.deepEqual(changesOf(local, remoteTree, base, null), [], 'neither pulled nor deleted');

  /* A sync's profile leaves this device's own in place; a file restore takes the file's. */
  const here = new Map([[LAYOUT, layout], ['omnistax-practice-pages-v2', '{}'], ['omnistax-theme', 'dark']]);
  const pulled = { records: [{ key: 'omnistax-theme', value: 'light', category: 'appearance' as const }], skipped: [] };
  assert.deepEqual(recordsToRestore(pulled, true, [...here.keys()], (k) => here.get(k) ?? null).map((r) => `${r.key}=${r.value}`).sort(), [`${LAYOUT}=${layout}`, 'omnistax-practice-pages-v2={}', 'omnistax-theme=light']);
  const restored = { records: [{ key: LAYOUT, value: 'from the file', category: 'layout' as const }], skipped: [] };
  assert.deepEqual(recordsToRestore(restored, false, [...here.keys()], (k) => here.get(k) ?? null).map((r) => r.value), ['from the file']);
  assert.deepEqual(recordsToRestore(restored, true, [...here.keys()], (k) => here.get(k) ?? null).find((r) => r.key === LAYOUT)?.value, layout, 'and a sync never takes one');
});

test('a backup’s set-aside records say whether a newer version probably wrote them', () => {
  const back = parseBackup({
    format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: at, app: { readerFormat: 1 }, assets: [], books: [],
    records: [{ key: 'omnistax-practice-v2', value: practice([1], {}, { metronome: true }) }, { key: 'omnistax-library-v1', value: '[nope' }, { key: 'omnistax-hologram-v1', value: '1' }],
  });
  assert.deepEqual(back.skipped.map((s) => [s.key, s.newer]), [['omnistax-practice-v2', true], ['omnistax-library-v1', false], ['omnistax-hologram-v1', true]]);
});
