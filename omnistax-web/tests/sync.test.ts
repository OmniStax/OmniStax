import test from 'node:test';
import assert from 'node:assert/strict';
import { BACKUP_FORMAT, BACKUP_VERSION, categoryOf, parseBackup, validReaderRecord, type ReaderBackup } from '../src/lib/backup/schema';
import { MANIFEST, filePath, fromRepo, imagePath, toRepo, type RepoPath } from '../src/lib/sync/layout';
import { blobSha, gitSha, readHead, repoName, type Fetch, type Remote, type RemoteEntry } from '../src/lib/sync/github';
import { bytesOf, groupMark, pullFiles, pullRows, pushChanges, pushRows, remoteNewer, selectAll, selectNone, setFile, setGroup, type Row, type Status } from '../src/lib/sync/plan';
import { hashed, pull, push, survey } from '../src/lib/sync/run';

const drawing = (id: string, name: string) => ({ id, name, items: [], created: 1, updated: 2 });
const sample = (): ReaderBackup => parseBackup({
  format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: '2026-10-02T12:00:00.000Z', app: { readerFormat: 1 },
  records: [
    { key: 'omnistax-theme', value: 'dark', category: 'appearance' },
    { key: 'omnistax-body-font', value: 'libertinus', category: 'appearance' },
    { key: 'omnistax-library-v1', value: '["college-physics-2e"]', category: 'library' },
    { key: 'omnistax-pomodoros', value: '[{"id":"a","start":1}]', category: 'focus' },
    { key: 'omnistax-files-v1', value: JSON.stringify([{ id: 'ffff0000', name: 'Handout.pdf', type: 'pdf', mime: 'application/pdf', size: 3, created: 1, updated: 1 }]), category: 'notes' },
  ],
  assets: [{ id: 'img000000001', type: 'image/png', dataUrl: 'data:image/png;base64,iVBORw==', created: 2 }],
  chats: [{ id: 'abcd1234', name: 'Springs', root: 'm1', messages: { m1: { id: 'm1', parent: null, role: 'user', text: 'hi', chips: [], at: 1, state: 'done' } }, leaf: 'm1', created: 1, updated: 1 }],
  files: [{ id: 'ffff0000', type: 'pdf', mime: 'application/pdf', base64: btoa('%PD'), created: 1 }],
  drawings: [drawing('dddd1111', 'Free body')],
  scratch: [{ key: 'college-physics-2e|1.1|ex 3', drawing: drawing('eeee2222', 'Scratch') }],
  books: [{ id: 'college-physics-2e' }],
});
const mapOf = (files: readonly { path: RepoPath; bytes: Uint8Array }[]): Map<RepoPath, Uint8Array> => new Map(files.map((f) => [f.path, f.bytes]));

test('every key the reader owns is backed up, and the sync token and repo never are', () => {
  for (const key of ['omnistax-pomodoros', 'omnistax-pomodoro-len', 'omnistax-pomodoro-categories', 'omnistax-pomodoro-lock', 'omnistax-lock-grace']) assert.equal(categoryOf(key), 'focus', key);
  for (const key of ['omnistax-body-font', 'omnistax-figure-font', 'omnistax-card-open', 'omnistax-swap-drag']) assert.equal(categoryOf(key), 'appearance', key);
  assert.equal(categoryOf('omnistax-chat-tree-v1'), 'chats');
  assert.equal(categoryOf('omnistax-tips-v1'), 'reading');
  assert.equal(categoryOf('omnistax-last-page-v1'), 'reading');
  assert.equal(categoryOf('omnistax-github-token'), null);
  assert.equal(categoryOf('omnistax-sync-v1'), null);
  assert.equal(validReaderRecord({ key: 'omnistax-figure-font', value: 'cmu', category: 'appearance' }), true);
  assert.equal(validReaderRecord({ key: 'omnistax-figure-font', value: 'comic', category: 'appearance' }), false);
  assert.equal(validReaderRecord({ key: 'omnistax-tips-v1', value: '{"first":1,"day":null,"next":0}', category: 'reading' }), true);
  assert.equal(validReaderRecord({ key: 'omnistax-lock-grace', value: '12', category: 'focus' }), true);
  assert.equal(validReaderRecord({ key: 'omnistax-chat-tree-v1', value: '["abcd1234"]', category: 'chats' }), true);
});

test('a profile lays out as one file per category, chat, drawing, scratch page and blob, and reads back whole', () => {
  const backup = sample();
  const files = toRepo(backup);
  assert.deepEqual(files.map((f) => f.path).sort(), [
    'chats/abcd1234.json', 'drawings/dddd1111.json', 'files/ffff0000.pdf', 'images/img000000001.png', MANIFEST,
    'records/appearance.json', 'records/focus.json', 'records/library.json', 'records/notes.json',
    `scratch/${encodeURIComponent('college-physics-2e|1.1|ex 3')}.json`,
  ].sort());
  assert.equal(new TextDecoder().decode(files.find((f) => f.path === filePath('ffff0000', 'application/pdf'))?.bytes), '%PD');
  assert.equal(files.find((f) => f.group === 'files')?.label, 'Handout.pdf');
  const appearance = JSON.parse(new TextDecoder().decode(files.find((f) => f.path === 'records/appearance.json')?.bytes));
  assert.deepEqual(appearance, { 'omnistax-theme': 'dark', 'omnistax-body-font': 'libertinus' });

  const back = fromRepo(mapOf(files));
  const norm = (b: ReaderBackup) => ({ ...b, records: b.records.map((r) => ({ ...r, value: r.category === 'appearance' ? r.value : JSON.stringify(JSON.parse(r.value)) })).sort((x, y) => x.key.localeCompare(y.key)) });
  assert.deepEqual(norm(back), norm(backup));
});

test('a file the repo lacks is left out of the profile rather than failing it', () => {
  const files = mapOf(toRepo(sample()));
  files.delete(imagePath('img000000001', 'image/png'));
  assert.equal(fromRepo(files).assets.length, 0);
  assert.throws(() => fromRepo(new Map()), /no OmniStax data/);
});

test('repo names are read from owner/name or a GitHub URL', () => {
  assert.equal(repoName('chen/notes'), 'chen/notes');
  assert.equal(repoName('https://github.com/chen/notes.git'), 'chen/notes');
  assert.equal(repoName('notes'), null);
});

test('a blob sha matches the one git computes', async () => {
  assert.equal(await blobSha(new Uint8Array()), 'e69de29bb2d1d6434b8b29ae775ad8c2e48c5391');
  assert.equal(await blobSha(new TextEncoder().encode('hello\n')), 'ce013625030ba8dba906f756967f9e9ca394464a');
});

const row = (path: string, group: Row['group'], size: number, same = false): Row => ({ path, group, label: path, size, sha: gitSha(`sha-${path}`), same, required: path === MANIFEST });

test('selection works by all, none, group and file, and never drops the manifest', () => {
  const rows = [row(MANIFEST, 'records', 10), row('records/a.json', 'records', 5), row('files/x.pdf', 'files', 100), row('files/y.pdf', 'files', 200)];
  const all = selectAll(rows);
  assert.equal(bytesOf(rows, all), 315);
  const none = selectNone(rows);
  assert.deepEqual([...none], [MANIFEST]);
  assert.equal(groupMark(none, rows, 'files'), 'none');
  const one = setFile(none, rows[2], true);
  assert.equal(groupMark(one, rows, 'files'), 'some');
  assert.equal(groupMark(setGroup(one, rows, 'files', true), rows, 'files'), 'all');
  assert.equal(setGroup(all, rows, 'records', false).has(MANIFEST), true);
  assert.equal(setFile(all, rows[0], false).has(MANIFEST), true);
});

test('a remote is newer when its head is not the commit this device last saw', () => {
  const at = (sha: string) => ({ kind: 'at', commit: gitSha(sha), tree: gitSha('t') }) as const;
  assert.equal(remoteNewer(at('a'), gitSha('a')), false);
  assert.equal(remoteNewer(at('b'), gitSha('a')), true);
  assert.equal(remoteNewer(at('b'), null), true);
  assert.equal(remoteNewer({ kind: 'empty' }, null), false);
  assert.equal(remoteNewer({ kind: 'missing' }, gitSha('a')), false);
});

test('a push writes what changed, drops what this device deleted, and leaves the rest', () => {
  const remote: RemoteEntry[] = [
    { path: 'chats/old.json', sha: gitSha('o'), size: 1 },
    { path: 'records/a.json', sha: gitSha('a1'), size: 1 },
    { path: 'files/kept.pdf', sha: gitSha('k'), size: 1 },
    { path: 'README.md', sha: gitSha('r'), size: 1 },
  ];
  const sent = new Map([['records/a.json', gitSha('a2')], [MANIFEST, gitSha('m')]]);
  const changes = pushChanges(['records/a.json', MANIFEST, 'files/kept.pdf'], sent, remote);
  assert.deepEqual(changes, [{ path: 'records/a.json', sha: 'a2' }, { path: MANIFEST, sha: 'm' }, { path: 'chats/old.json', sha: null }]);
});

test('a pull keeps this device’s copy of what was left unticked and drops what only this device has', () => {
  const rows = [row(MANIFEST, 'records', 1), row('records/a.json', 'records', 1), row('files/x.pdf', 'files', 1, true), row('files/y.pdf', 'files', 1)];
  const sel = new Set([MANIFEST, 'records/a.json', 'files/x.pdf']);
  const b = (s: string) => new TextEncoder().encode(s);
  const fetched = new Map([[MANIFEST, b('m')], ['records/a.json', b('remote a')]]);
  const local = new Map([['records/a.json', b('local a')], ['files/x.pdf', b('x')], ['files/y.pdf', b('local y')], ['chats/z.json', b('z')]]);
  const out = pullFiles(rows, sel, fetched, local);
  const text = (p: string) => new TextDecoder().decode(out.get(p));
  assert.equal(text('records/a.json'), 'remote a');
  assert.equal(text('files/x.pdf'), 'x');
  assert.equal(text('files/y.pdf'), 'local y');
  assert.equal(out.has('chats/z.json'), false);
});

/* A GitHub that answers from a few maps, and remembers what it was asked. */
type Call = { readonly method: string; readonly path: string; readonly body: unknown };
const github = (state: { head: string | null; empty?: boolean; tree: Record<string, { sha: string; bytes: Uint8Array }> }) => {
  const calls: Call[] = [];
  let blobs = 0;
  const f: Fetch = async (input, init) => {
    const url = new URL(String(input));
    const path = url.pathname.replace(/^\/repos\/chen\/notes/, '');
    const method = init?.method ?? 'GET';
    const body: unknown = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, path, body });
    const ok = (v: unknown) => new Response(JSON.stringify(v), { status: 200 });
    if (method === 'GET' && path.startsWith('/git/ref/heads/')) return state.empty ? new Response('{}', { status: 409 }) : state.head ? ok({ object: { sha: state.head } }) : new Response('{}', { status: 404 });
    if (method === 'GET' && path === '') return ok({});
    if (method === 'GET' && path.startsWith('/git/commits/')) return ok({ tree: { sha: 'tree0' } });
    if (method === 'GET' && path.startsWith('/git/trees/')) return ok({ truncated: false, tree: Object.entries(state.tree).map(([p, e]) => ({ path: p, type: 'blob', sha: e.sha, size: e.bytes.length })) });
    if (method === 'GET' && path.startsWith('/git/blobs/')) {
      const hit = Object.values(state.tree).find((e) => path.endsWith(e.sha));
      return hit ? new Response(new Blob([hit.bytes as BlobPart]), { status: 200 }) : new Response('{}', { status: 404 });
    }
    if (method === 'POST' && path === '/git/blobs') return ok({ sha: `blob${++blobs}` });
    if (method === 'PUT' && path.startsWith('/contents/')) return ok({ commit: { sha: 'seed', tree: { sha: 'seedtree' } } });
    if (method === 'POST' && path === '/git/trees') return ok({ sha: 'tree1' });
    if (method === 'POST' && path === '/git/commits') return ok({ sha: 'commit1' });
    if (path.startsWith('/git/refs')) return ok({});
    return new Response('{}', { status: 500 });
  };
  return { f, calls };
};
const remote: Remote = { repo: 'chen/notes' as Remote['repo'], branch: 'main', token: 't' };

test('a push sends only changed files, fails an oversize one visibly, and makes one commit on the head', async () => {
  const local = await hashed(toRepo(sample()));
  const theme = local.find((f) => f.path === 'records/appearance.json');
  assert.ok(theme);
  const gh = github({ head: 'c0', tree: { 'records/appearance.json': { sha: theme.sha, bytes: theme.bytes }, 'chats/gone.json': { sha: 'g', bytes: new Uint8Array(1) } } });
  const seen = await survey(remote, gh.f);
  assert.equal(remoteNewer(seen.head, gitSha('c0')), false);
  assert.equal(remoteNewer(seen.head, gitSha('older')), true);
  const rows = pushRows(local, seen.remote).map((r) => r.group === 'files' ? { ...r, size: 101 * 1024 * 1024 } : r);
  assert.equal(rows.find((r) => r.path === 'records/appearance.json')?.same, true);
  const statuses = new Map<string, Status>();
  const sel = setFile(selectAll(rows), rows.find((r) => r.group === 'drawings') as Row, false);
  const sha = await push(remote, gh.f, seen, local, rows, sel, (p, s) => statuses.set(p, s));
  assert.equal(sha, 'commit1');
  assert.equal(statuses.get('records/appearance.json')?.kind, 'same');
  assert.equal(statuses.get(filePath('ffff0000', 'application/pdf'))?.kind, 'failed');
  assert.equal(statuses.has('drawings/dddd1111.json'), false);
  assert.equal(gh.calls.filter((c) => c.method === 'POST' && c.path === '/git/blobs').length, rows.length - 3);
  const tree = gh.calls.find((c) => c.path === '/git/trees' && c.method === 'POST')?.body as { base_tree: string; tree: { path: string; sha: string | null }[] };
  assert.equal(tree.base_tree, 'tree0');
  assert.deepEqual(tree.tree.filter((e) => e.sha === null).map((e) => e.path), ['chats/gone.json']);
  assert.equal(tree.tree.some((e) => e.path.startsWith('files/') || e.path.startsWith('drawings/')), false);
  assert.deepEqual((gh.calls.find((c) => c.path === '/git/commits' && c.method === 'POST')?.body as { parents: string[] }).parents, ['c0']);
  assert.deepEqual(gh.calls.find((c) => c.method === 'PATCH')?.body, { sha: 'commit1', force: false });
});

test('a push to an empty repo starts the branch through the Contents API first', async () => {
  const gh = github({ head: null, empty: true, tree: {} });
  assert.deepEqual(await readHead(remote, gh.f), { kind: 'empty' });
  const local = await hashed(toRepo(sample()));
  const seen = await survey(remote, gh.f);
  const rows = pushRows(local, seen.remote);
  await push(remote, gh.f, seen, local, rows, selectAll(rows), () => undefined);
  assert.ok(gh.calls.some((c) => c.method === 'PUT' && c.path === `/contents/${MANIFEST}`));
  assert.deepEqual((gh.calls.find((c) => c.path === '/git/commits')?.body as { parents: string[] }).parents, ['seed']);
});

test('a pull fetches the chosen files that differ and builds the profile from them', async () => {
  const theirs = toRepo(sample());
  const tree = Object.fromEntries(await Promise.all(theirs.map(async (f) => [f.path, { sha: await blobSha(f.bytes), bytes: f.bytes }] as const)));
  const gh = github({ head: 'c9', tree });
  const seen = await survey(remote, gh.f);
  assert.equal(seen.manifest?.books[0]?.id, 'college-physics-2e');
  const mine = await hashed(toRepo(sample()).filter((f) => f.group !== 'chats'));
  const rows = pullRows(seen.remote, seen.manifest, new Map(mine.map((f) => [f.path, f.sha] as const)));
  assert.equal(rows.find((r) => r.group === 'files')?.label, 'Handout.pdf');
  const reads = gh.calls.length;
  const backup = await pull(remote, gh.f, rows, selectAll(rows), new Map(mine.map((f) => [f.path, f.bytes])), () => undefined);
  assert.equal(gh.calls.length - reads, 1);
  assert.equal(backup.chats[0]?.name, 'Springs');
  assert.equal(backup.files[0]?.base64, btoa('%PD'));
});

test('a push to a branch the repo lacks makes a first commit and the branch', async () => {
  const gh = github({ head: null, tree: {} });
  const local = await hashed(toRepo(sample()));
  const seen = await survey(remote, gh.f);
  assert.deepEqual(seen.head, { kind: 'missing' });
  const rows = pushRows(local, seen.remote);
  await push(remote, gh.f, seen, local, rows, selectAll(rows), () => undefined);
  assert.equal((gh.calls.find((c) => c.path === '/git/trees')?.body as { base_tree?: string }).base_tree, undefined);
  assert.deepEqual(gh.calls.find((c) => c.method === 'POST' && c.path === '/git/refs')?.body, { ref: 'refs/heads/main', sha: 'commit1' });
});
