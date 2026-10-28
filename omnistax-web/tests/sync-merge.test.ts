import test from 'node:test';
import assert from 'node:assert/strict';
import { BACKUP_FORMAT, BACKUP_VERSION, parseBackup, type ReaderBackup } from '../src/lib/backup/schema';
import { MANIFEST, explode, fileProblem, foreignRecord, fromRepo, isLegacyRecords, jsonBytes, recordKeyOf, recordPath, toRepo, type RepoPath } from '../src/lib/sync/layout';
import { gitSha } from '../src/lib/sync/github';
import { changesOf, oneWay, planOf, rebase, type Base, type Change, type Merged, type Status } from '../src/lib/sync/plan';
import { bothWays, carry, hashed, settle, survey } from '../src/lib/sync/run';
import { ABSENT, merge3 } from '../src/lib/sync/merge';
import { blocksOf, conflictCount, duplicateKey, mergeTexts, resolvedText } from '../src/lib/sync/conflict';
import { blobFrom, github, remote, shaOf } from './fake-github';

const enc = new TextEncoder(), dec = new TextDecoder();

/* ── merge3 ───────────────────────────────────────────────────────────── */

test('changes to different keys of one object both land, and the same change made twice lands once', () => {
  const r = merge3({ a: 1, b: 1, c: 1 }, { a: 2, b: 1, c: 3 }, { a: 1, b: 2, c: 3 });
  assert.deepEqual(r, { mine: { a: 2, b: 2, c: 3 }, theirs: { a: 2, b: 2, c: 3 }, conflicts: [] });
});

test('a leaf both sides changed differently is a conflict, and each side’s value is kept for it', () => {
  const r = merge3({ s: { x: 1, y: 1 } }, { s: { x: 2, y: 2 } }, { s: { x: 3, y: 1 } });
  assert.deepEqual(r.conflicts, [['s', 'x']]);
  assert.deepEqual(r.mine, { s: { x: 2, y: 2 } }, 'this device’s way, with the repo’s other changes');
  assert.deepEqual(r.theirs, { s: { x: 3, y: 2 } }, 'the repo’s way, with this device’s other changes');
});

test('a key one side deleted and the other left alone is deleted; deleted against changed is a conflict', () => {
  assert.deepEqual(merge3({ a: 1, b: 1 }, { b: 1 }, { a: 1, b: 2 }), { mine: { b: 2 }, theirs: { b: 2 }, conflicts: [] });
  const r = merge3({ a: 1 }, {}, { a: 2 });
  assert.deepEqual(r.conflicts, [['a']]);
  assert.deepEqual([r.mine, r.theirs], [{}, { a: 2 }]);
});

test('a list of things with ids merges item by item: additions from both, deletions honoured, fields merged, the later touch kept', () => {
  const n = (id: string, text: string, updated = 1) => ({ id, text, color: 'yellow', updated });
  const base = [n('a', 'A'), n('b', 'B'), n('c', 'C')];
  const mine = [n('a', 'A!', 5), n('c', 'C'), n('m', 'mine')];            // edited a, deleted b, added m
  const theirs = [n('a', 'A', 1), n('b', 'B'), { ...n('c', 'C', 7), color: 'pink' }, n('t', 'theirs')];   // recoloured c, added t
  const r = merge3(base, mine, theirs);
  assert.deepEqual(r.conflicts, []);
  assert.deepEqual(r.mine, [n('a', 'A!', 5), { ...n('c', 'C', 7), color: 'pink' }, n('m', 'mine'), n('t', 'theirs')], 'what each appended, this device’s first');
});

test('deleting an item another side edited is a conflict on that item alone', () => {
  const r = merge3([{ id: 'a', v: 1 }, { id: 'b', v: 1 }], [{ id: 'b', v: 2 }], [{ id: 'a', v: 9 }, { id: 'b', v: 1 }]);
  assert.deepEqual(r.conflicts, [['a']]);
  assert.deepEqual(r.mine, [{ id: 'b', v: 2 }]);
  assert.deepEqual(r.theirs, [{ id: 'a', v: 9 }, { id: 'b', v: 2 }]);
});

test('a list of names is a set: both additions kept, a removal honoured', () => {
  assert.deepEqual(merge3(['phys', 'chem'], ['phys', 'chem', 'calc'], ['phys', 'bio']).mine, ['phys', 'calc', 'bio']);
});

test('a log both sides appended to keeps every entry, and a list of numbers is positional', () => {
  const a = (at: number) => ({ ex: 'e', at, ok: true });
  assert.deepEqual(merge3([a(1)], [a(1), a(2)], [a(1), a(3)]), { mine: [a(1), a(2), a(3)], theirs: [a(1), a(2), a(3)], conflicts: [] });
  assert.equal(merge3([0.5, 0.5], [0.3, 0.7], [0.6, 0.4]).conflicts.length, 1);
  assert.equal(merge3(ABSENT, [0.3, 0.7], [0.6, 0.4]).conflicts.length, 1, 'without a base two lists are two lists');
});

test('without a base, what only one side holds is kept and only what both hold differently conflicts', () => {
  const r = merge3(ABSENT, { a: 1, b: 2 }, { a: 1, c: 3, b: 4 });
  assert.deepEqual(r.conflicts, [['b']]);
  assert.deepEqual(r.mine, { a: 1, b: 2, c: 3 });
});

/* ── conflict blocks ─────────────────────────────────────────────────── */

test('the two texts of a merge cut into conflicts that are each settled, and nothing is made while one is open', () => {
  const m = mergeTexts(
    JSON.stringify({ x: 1, y: 1, z: 1 }),
    JSON.stringify({ x: 2, y: 1, z: 5 }),
    JSON.stringify({ x: 3, y: 9, z: 6 }),
  );
  assert.equal(m.merged, null);
  const blocks = blocksOf(m.mine, m.theirs);
  assert.equal(conflictCount(blocks), 2);
  assert.equal(resolvedText(blocks, ['mine', null]), null);
  assert.deepEqual(JSON.parse(resolvedText(blocks, ['mine', 'theirs'])!), { x: 2, y: 9, z: 6 }, 'the repo’s y is no conflict and is kept');
  assert.deepEqual(JSON.parse(resolvedText(blocks, ['theirs', 'mine'])!), { x: 3, y: 9, z: 5 });
  assert.equal(duplicateKey(resolvedText(blocks, ['both', 'mine'])!), 'x', 'both of two values of one key names the key twice');
  assert.equal(duplicateKey('{"a": {"x": 1}, "b": {"x": "a,\\"x"}, "x": [{"x": 1}, {"x": 2}]}'), null);
});

test('accepting both of two additions to a list keeps both', () => {
  const m = mergeTexts('[\n  "a"\n]', '[\n  "a",\n  "b"\n]', '[\n  "a",\n  "c"\n]');
  assert.deepEqual(JSON.parse(m.merged!), ['a', 'b', 'c'], 'names are a set and merge on their own');
  const blocks = blocksOf('one\ntwo\n', 'one\nthree\n');
  assert.equal(resolvedText(blocks, ['both']), 'one\ntwo\nthree\n');
});

test('a file deleted on one side and changed on the other is one conflict of the whole file', () => {
  const m = mergeTexts('{"a":1}', null, '{"a":2}');
  assert.equal(m.merged, null);
  assert.equal(m.mine, '');
  assert.equal(conflictCount(blocksOf(m.mine, m.theirs)), 1);
});

/* ── layout ──────────────────────────────────────────────────────────── */

const at = '2026-10-20T12:00:00.000Z';
const profile = (records: { key: string; value: string }[]): ReaderBackup => parseBackup({
  format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: at, app: { readerFormat: 1 },
  records: records.map((r) => ({ ...r, category: 'appearance' })), assets: [], books: [],
});
const v1Manifest = { format: 'omnistax-sync', version: 1, exportedAt: at, books: [], files: [], images: [], labels: {} };

test('a record’s file is named by its key alone, and a category file of the first layout is told from one', () => {
  assert.equal(recordPath('omnistax-colours-college-physics-2e'), 'records/omnistax-colours-college-physics-2e.json');
  assert.equal(recordKeyOf('records/omnistax-theme.json'), 'omnistax-theme');
  assert.equal(recordKeyOf('records/appearance.json'), null);
  assert.equal(isLegacyRecords('records/appearance.json'), true);
  assert.equal(isLegacyRecords('records/omnistax-theme.json'), false);
  assert.equal(isLegacyRecords('chats/abcd1234.json'), false);
  assert.equal(foreignRecord('records/omnistax-hologram-v1.json'), true, 'a newer version’s record');
  assert.equal(foreignRecord('records/omnistax-theme.json'), false);
});

test('a repo of the first layout reads back, and a category file comes apart into the files toRepo writes', () => {
  const legacy = jsonBytes({ 'omnistax-theme': 'dark', 'omnistax-library-v1': ['phys'] });
  const back = fromRepo(new Map([[MANIFEST, jsonBytes(v1Manifest)], ['records/appearance.json', legacy]]));
  assert.deepEqual(back.records.map((r) => [r.key, r.value, r.category]).sort(), [['omnistax-library-v1', '["phys"]', 'library'], ['omnistax-theme', 'dark', 'appearance']]);
  const parts = explode(legacy);
  const now = toRepo(back);
  for (const [path, bytes] of parts) assert.deepEqual(bytes, now.find((f) => f.path === path)?.bytes, path);
});

test('a record in its own file wins over the copy a category file still holds', () => {
  const back = fromRepo(new Map([
    [MANIFEST, jsonBytes(v1Manifest)],
    ['records/appearance.json', jsonBytes({ 'omnistax-theme': 'light', 'omnistax-anim': '0' })],
    [recordPath('omnistax-theme'), jsonBytes('dark')],
  ]));
  assert.deepEqual(back.records.map((r) => `${r.key}=${r.value}`).sort(), ['omnistax-anim=0', 'omnistax-theme=dark']);
});

test('a value that is not what its key holds travels, is named on the other side, and never stops a push', () => {
  /* A JSON key whose stored value is not JSON used to throw out of toRepo. */
  const bad = { ...profile([{ key: 'omnistax-theme', value: 'dark' }]), records: [{ key: 'omnistax-library-v1', value: '["phys"', category: 'library' as const }] };
  const files = toRepo(bad);
  const lib = files.find((f) => f.path === recordPath('omnistax-library-v1'))!;
  assert.equal(dec.decode(lib.bytes), '"[\\"phys\\""\n');
  assert.match(fileProblem(lib.path, lib.bytes) ?? '', /^Expected array, received string/);
  /* A setting a file holds as null, or as a number, is read as the JSON it is,
     not as String(null). */
  assert.match(fileProblem(recordPath('omnistax-theme'), jsonBytes(null)) ?? '', /“null”/);
  assert.equal(fileProblem(recordPath('omnistax-zoom'), jsonBytes(1.25)), null);
  const back = fromRepo(new Map([[MANIFEST, jsonBytes(v1Manifest)], [recordPath('omnistax-theme'), jsonBytes(null)], [recordPath('omnistax-anim'), jsonBytes('1')]]));
  assert.deepEqual(back.records.map((r) => r.key), ['omnistax-anim']);
  assert.deepEqual(back.skipped.map((s) => s.key), ['omnistax-theme']);
});

test('a file is checked as what it holds before it is taken', () => {
  assert.equal(fileProblem(recordPath('omnistax-theme'), jsonBytes('dark')), null);
  assert.match(fileProblem(recordPath('omnistax-library-v1'), enc.encode('[nope')) ?? '', /isn’t valid JSON/);
  assert.match(fileProblem('chats/abcd1234.json', jsonBytes({ id: 'abcd1234' })) ?? '', /^name: Required/);
  assert.match(fileProblem('records/appearance.json', jsonBytes({ 'omnistax-theme': 'purple' })) ?? '', /^omnistax-theme: “purple”/);
  assert.equal(fileProblem('files/x.pdf', new Uint8Array([1, 2])), null);
});

/* ── plan ────────────────────────────────────────────────────────────── */

const sha = gitSha;
const change = (path: string, local: string | null, remote: string | null): Change => ({ path, group: 'records', label: path, side: 'both', letter: '!', local: local === null ? null : sha(local), remote: remote === null ? null : sha(remote), size: 1 });

test('a merge goes both ways with its bytes, a stale one is no choice, and a one-way sync leaves merges out', () => {
  const c = change('records/omnistax-x.json', 'l', 'r');
  const merged: Merged = { kind: 'merged', bytes: enc.encode('{}\n'), sha: sha('m'), local: sha('l'), remote: sha('r'), auto: true };
  const plan = planOf([c], new Map([[c.path, merged]]));
  assert.deepEqual([plan.up.map((x) => x.local), plan.down.map((x) => x.remote)], [['m'], ['m']]);
  assert.equal(plan.held?.get(c.path), merged.bytes);
  assert.deepEqual(oneWay(plan, 'down'), { up: [], down: [] });
  const stale = planOf([change(c.path, 'l2', 'r')], new Map([[c.path, merged]]));
  assert.deepEqual([stale.up.length, stale.down.length], [0, 0]);
});

test('changesOf leaves a newer version’s records where they are', () => {
  const got = changesOf([], [{ path: 'records/omnistax-hologram-v1.json', sha: sha('h'), size: 1 }, { path: recordPath('omnistax-theme'), sha: sha('t'), size: 1 }], {}, null);
  assert.deepEqual(got.map((c) => c.path), [recordPath('omnistax-theme')]);
});

test('on a repo of the first layout, a record changed there and another changed here are no conflict, and the push moves the repo to a file per record', async () => {
  /* Both devices last agreed on this appearance file. */
  const agreed = jsonBytes({ 'omnistax-theme': 'dark', 'omnistax-anim': '1', 'omnistax-voice': '0' });
  const theirs = jsonBytes({ 'omnistax-theme': 'light', 'omnistax-anim': '1', 'omnistax-voice': '0' });   // the laptop chose light
  const gh = github({ [MANIFEST]: jsonBytes(v1Manifest), 'records/appearance.json': theirs }, [agreed]);
  const base: Base = { 'records/appearance.json': await shaOf(agreed) };
  const seen = await survey(remote, gh.f, base);
  assert.deepEqual(seen.legacy, ['records/appearance.json']);
  assert.deepEqual([...seen.virtual].sort(), ['omnistax-anim', 'omnistax-theme', 'omnistax-voice'].map(recordPath));
  const local = await hashed(toRepo(profile([{ key: 'omnistax-theme', value: 'dark' }, { key: 'omnistax-anim', value: '0' }, { key: 'omnistax-voice', value: '0' }])));   // this device paused figures
  const agreedNow = rebase({ ...seen.base, ...base }, new Map(local.map((f) => [f.path, f.sha])), new Map(seen.remote.map((e) => [e.path, e.sha])));
  const changes = changesOf(local, seen.remote, agreedNow, seen.manifest);
  assert.deepEqual(changes.map((c) => `${c.side} ${c.path}`).sort(), [`down ${recordPath('omnistax-theme')}`, `up ${recordPath('omnistax-anim')}`]);

  const out = await carry(remote, gh.f, seen, local, planOf(changes, new Map()), agreedNow, () => undefined);
  const tree = new Map(gh.committed().map((e) => [e.path, e.sha]));
  assert.equal(tree.get('records/appearance.json'), null, 'the category file goes');
  assert.ok(tree.has(recordPath('omnistax-theme')) && tree.has(recordPath('omnistax-voice')), 'every record it held is written as the repo had it');
  assert.equal(dec.decode(gh.blobs.get(tree.get(recordPath('omnistax-theme'))!)), '"light"\n');
  assert.equal(dec.decode(gh.blobs.get(tree.get(recordPath('omnistax-anim'))!)), '"0"\n');
  const manifest = JSON.parse(dec.decode(gh.blobs.get(tree.get(MANIFEST)!)));
  assert.equal(manifest.version, 2);
  assert.deepEqual(out.backup?.records.map((r) => `${r.key}=${r.value}`).sort(), ['omnistax-anim=0', 'omnistax-theme=light', 'omnistax-voice=0']);
  assert.equal(out.base['records/appearance.json'], undefined, 'the base forgets the category file');
  assert.equal(out.base[recordPath('omnistax-voice')], await shaOf(jsonBytes('0')));
});

const practice = (attempts: number[], target = 3) => JSON.stringify({
  attempts: attempts.map((at) => ({ book: 'b', section: '1.1', ex: `e${at}`, at, ok: true, concepts: ['c'] })), shown: [], rounds: [], self: {},
  settings: { masteryTarget: target, freshnessDecay: true, startingHalfLife: 3, maxHalfLife: 240, order: 'mixed', includeFresh: false, generated: 'include', grading: 'reveal', promptNote: 'p', fresh: false, stopwatch: false, model: null },
});
const practiceFile = (attempts: number[], target = 3) => toRepo(profile([{ key: 'omnistax-practice-v2', value: practice(attempts, target) }])).find((f) => f.path === recordPath('omnistax-practice-v2'))!.bytes;

test('practice on two devices merges on its own: both sides’ attempts go both ways as one file', async () => {
  const P = recordPath('omnistax-practice-v2');
  const was = practiceFile([1]), here = practiceFile([1, 2]), there = practiceFile([1, 3]);
  const gh = github({ [MANIFEST]: jsonBytes({ ...v1Manifest, version: 2 }), [P]: there }, [was]);
  const base: Base = { [P]: await shaOf(was) };
  const seen = await survey(remote, gh.f, base);
  const local = await hashed([{ path: MANIFEST, group: 'records', label: MANIFEST, bytes: jsonBytes({ ...v1Manifest, version: 2 }) }, { path: P, group: 'records', label: P, bytes: here }]);
  const changes = changesOf(local, seen.remote, base, seen.manifest);
  assert.deepEqual(changes.map((c) => c.side), ['both']);
  const merges = await bothWays(changes, local, base, blobFrom(gh));
  const merged = merges.get(P)?.merged;
  assert.ok(merged, 'nothing conflicted');
  assert.deepEqual(JSON.parse(dec.decode(merged.bytes)).attempts.map((a: { at: number }) => a.at), [1, 2, 3]);

  const statuses = new Map<string, Status>();
  const out = await carry(remote, gh.f, seen, local, planOf(changes, new Map([[P, merged]])), base, (p, s) => statuses.set(p, s));
  assert.equal(gh.calls.filter((c) => c.method === 'GET' && c.path === `/git/blobs/${merged.sha}`).length, 0, 'the merge is not fetched: it travels with the plan');
  assert.equal(new Map(gh.committed().map((e) => [e.path, e.sha])).get(P), merged.sha, 'the merge goes up');
  assert.deepEqual(JSON.parse(out.backup!.records.find((r) => r.key === 'omnistax-practice-v2')!.value).attempts.length, 3, 'and comes down');
  assert.equal(out.base[P], merged.sha, 'and both sides now agree on it');
  assert.equal(statuses.get(P)?.kind, 'done');
});

test('where the two sides changed the same setting, the reader settles it conflict by conflict and the result is checked', async () => {
  const P = recordPath('omnistax-practice-v2');
  const was = practiceFile([1], 3), here = practiceFile([1, 2], 4), there = practiceFile([1], 5);
  const gh = github({ [P]: there }, [was]);
  const base: Base = { [P]: await shaOf(was) };
  const local = await hashed([{ path: P, group: 'records', label: P, bytes: here }]);
  const changes = changesOf(local, [{ path: P, sha: await shaOf(there), size: there.length }], base, null);
  const m = (await bothWays(changes, local, base, blobFrom(gh))).get(P)!;
  assert.equal(m.merged, null);
  const blocks = blocksOf(m.mine, m.theirs);
  assert.equal(conflictCount(blocks), 1);
  const theirsWay = await settle(changes[0], resolvedText(blocks, ['theirs'])!, false);
  const v = JSON.parse(dec.decode(theirsWay.merged!.bytes));
  assert.deepEqual([v.settings.masteryTarget, v.attempts.length], [5, 2], 'the repo’s target, and this device’s attempt all the same');
  const both = await settle(changes[0], resolvedText(blocks, ['both'])!, false);
  assert.equal(both.merged, null);
  assert.match(both.problem ?? '', /“masteryTarget” appears twice/);
  const wrong = await settle(changes[0], JSON.stringify({ attempts: 'none' }), false);
  assert.match(wrong.problem ?? '', /^attempts: Expected array/, 'JSON, but not a practice record');
});

test('a file this version cannot read is not taken: its row says why, the rest come down, and the base stays for it', async () => {
  const T = recordPath('omnistax-theme'), A = recordPath('omnistax-anim');
  const gh = github({ [MANIFEST]: jsonBytes({ ...v1Manifest, version: 2 }), [T]: jsonBytes('ultraviolet'), [A]: jsonBytes('0') });
  const seen = await survey(remote, gh.f);
  const local = await hashed(toRepo(profile([{ key: 'omnistax-theme', value: 'dark' }, { key: 'omnistax-anim', value: '1' }])));
  const base: Base = Object.fromEntries(local.map((f) => [f.path, f.sha]));
  const changes = changesOf(local, seen.remote, base, seen.manifest);
  assert.deepEqual(changes.map((c) => `${c.side} ${c.path}`).sort(), [`down ${A}`, `down ${T}`]);
  const statuses = new Map<RepoPath, Status>();
  const out = await carry(remote, gh.f, seen, local, planOf(changes, new Map()), base, (p, s) => statuses.set(p, s));
  const why = statuses.get(T);
  assert.equal(why?.kind, 'failed');
  assert.match(why?.kind === 'failed' ? why.why : '', /“ultraviolet”/);
  assert.deepEqual(out.backup?.records.map((r) => `${r.key}=${r.value}`).sort(), ['omnistax-anim=0', 'omnistax-theme=dark']);
  assert.equal(out.base[T], base[T], 'still the last agreed: offered again, and never pushed over');
  assert.equal(out.base[A], await shaOf(jsonBytes('0')));
});

test('a record deleted here and left alone there is deleted there; deleted here and changed there waits for the reader', async () => {
  const A = recordPath('omnistax-anim'), V = recordPath('omnistax-voice');
  const was = jsonBytes('1'), changed = jsonBytes('0');
  const base: Base = { [A]: await shaOf(was), [V]: await shaOf(was) };
  const remoteTree = [{ path: A, sha: await shaOf(was), size: was.length }, { path: V, sha: await shaOf(changed), size: changed.length }];
  const changes = changesOf([], remoteTree, base, null);
  assert.deepEqual(changes.map((c) => `${c.side} ${c.letter} ${c.path}`), [`up D ${A}`, `both ! ${V}`]);
  const gh = github({ [V]: changed }, [was]);
  const m = (await bothWays(changes, [], base, blobFrom(gh))).get(V)!;
  assert.equal(m.merged, null, 'a deletion against a change is never merged away');
  assert.deepEqual([m.mine, m.theirs], ['', '"0"\n']);
  assert.equal(rebase(base, new Map(), new Map([[V, await shaOf(changed)]]))[A], undefined, 'once both lack it, the base forgets it');
});
