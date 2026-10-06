import test from 'node:test';
import assert from 'node:assert/strict';
import { BACKUP_FORMAT, BACKUP_VERSION, categoryOf, parseBackup, validReaderRecord, type ReaderBackup } from '../src/lib/backup/schema';
import { MANIFEST, filePath, fromRepo, imagePath, parseManifest, toRepo, type RepoPath } from '../src/lib/sync/layout';
import { blobSha, gitSha, readHead, repoName, type Fetch, type Remote, type RemoteEntry } from '../src/lib/sync/github';
import { changesOf, manifestOf, overwrite, planOf, rebase, type Base, type Status } from '../src/lib/sync/plan';
import { carry, hashed, survey, type HashedFile } from '../src/lib/sync/run';

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

const sha = gitSha;
const entry = (path: string, s: string, size = 1): RemoteEntry => ({ path, sha: sha(s), size });
const fileAt = (path: string, s: string, group: HashedFile['group'] = 'records'): HashedFile => ({ path, group, label: path, bytes: new Uint8Array(1), sha: sha(s) });

test('only files that differ are listed, each by which side changed it since the base', () => {
  const base: Base = { 'records/a.json': sha('a0'), 'records/b.json': sha('b0'), 'records/c.json': sha('c0'), 'chats/d.json': sha('d0'), 'chats/gone.json': sha('g0'), 'chats/x.json': sha('x0') };
  const local = [fileAt(MANIFEST, 'm1'), fileAt('records/a.json', 'a1'), fileAt('records/b.json', 'b0'), fileAt('records/c.json', 'c1'), fileAt('chats/d.json', 'd0'), fileAt('chats/new.json', 'n1', 'chats'), fileAt('chats/x.json', 'x0', 'chats')];
  const remote = [entry(MANIFEST, 'm2'), entry('records/a.json', 'a0'), entry('records/b.json', 'b2'), entry('records/c.json', 'c2'), entry('chats/d.json', 'd0'), entry('chats/gone.json', 'g0'), entry('README.md', 'r')];
  const got = changesOf(local, remote, base, null).map((c) => `${c.side} ${c.letter} ${c.path}`);
  assert.deepEqual(got.sort(), [
    'both ! records/c.json', 'down M records/b.json', 'up A chats/new.json', 'up D chats/gone.json', 'up M records/a.json', 'down D chats/x.json',
  ].sort());
});

test('with no base, a file only one side has goes to the other, and one both hold differently waits for a choice', () => {
  const got = changesOf([fileAt(MANIFEST, 'm'), fileAt('records/a.json', 'a1'), fileAt('records/b.json', 'b1')], [entry('records/a.json', 'a2'), entry('chats/c.json', 'c')], {}, null);
  assert.deepEqual(got.map((c) => `${c.side} ${c.letter} ${c.path}`).sort(), ['both ! records/a.json', 'down A chats/c.json', 'up A records/b.json']);
});

test('a plan sends ups, fetches downs, holds an unchosen conflict and an oversize upload', () => {
  const changes = changesOf(
    [fileAt('records/a.json', 'a1'), fileAt('records/b.json', 'b1'), fileAt('records/c.json', 'c1'), { ...fileAt('files/big.pdf', 'p1', 'files'), bytes: new Uint8Array(0) }],
    [entry('records/a.json', 'a0'), entry('records/b.json', 'b2'), entry('records/c.json', 'c2'), entry('records/d.json', 'd2')],
    { 'records/a.json': sha('a0') }, null,
  ).map((c) => (c.path === 'files/big.pdf' ? { ...c, size: 101 * 1024 * 1024 } : c));
  const plan = planOf(changes, new Map([['records/b.json', 'mine']]));
  assert.deepEqual(plan.up.map((c) => c.path), ['records/a.json', 'records/b.json']);
  assert.deepEqual(plan.down.map((c) => c.path), ['records/d.json']);
  assert.deepEqual(overwrite(changes, 'device').down.length, changes.length);
  assert.deepEqual(overwrite(changes, 'repo').up.map((c) => c.path).includes('files/big.pdf'), false);
});

test('the base keeps what both sides agree on and forgets what both lack', () => {
  const base: Base = { a: sha('1'), b: sha('1'), c: sha('1') };
  const next = rebase(base, new Map([['a', sha('2')], ['b', sha('2')], ['d', sha('4')]]), new Map([['a', sha('2')], ['b', sha('3')], ['d', sha('4')]]));
  assert.deepEqual(next, { a: '2', b: '1', d: '4' });
});

test('a merged manifest lists each file and label from the side its file came from', () => {
  const mine = parseManifest(toRepo(sample()).find((f) => f.path === MANIFEST)!.bytes);
  const theirs = { ...mine, files: [], images: [{ id: 'img2', type: 'image/png', created: 5 }], labels: { 'chats/abcd1234.json': 'Theirs' }, books: [{ id: 'chemistry-2e' }] };
  const origins = new Map([['chats/abcd1234.json', 'remote'], [filePath('ffff0000', 'application/pdf'), 'local'], [imagePath('img2', 'image/png'), 'remote']] as const);
  const m = manifestOf(origins, mine, theirs, '2026-10-06T00:00:00.000Z');
  assert.deepEqual(m.files.map((f) => f.id), ['ffff0000']);
  assert.deepEqual(m.images.map((i) => i.id), ['img2']);
  assert.equal(m.labels['chats/abcd1234.json'], 'Theirs');
  assert.deepEqual(m.books.map((b) => b.id).sort(), ['chemistry-2e', 'college-physics-2e']);
});

test('generated exercises travel as files of their own', () => {
  const g = { id: 'gen1', book: 'college-physics-2e', section: '1.1', concepts: ['c'], prompt: 'p', answer: { type: 'number', value: 2, unit: 'm' }, bloom: 'Apply', facet: 'f', model: { provider: 'anthropic', model: 'm' }, created: 1, uses: 0, request: { standard: true } };
  const withGen = parseBackup({ ...sample(), generated: [g] });
  const files = toRepo(withGen);
  assert.ok(files.some((f) => f.path === 'generated/gen1.json'));
  assert.equal(fromRepo(mapOf(files)).generated[0]?.id, 'gen1');
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

const treeOf = async (files: readonly { path: string; bytes: Uint8Array }[]) =>
  Object.fromEntries(await Promise.all(files.map(async (f) => [f.path, { sha: await blobSha(f.bytes), bytes: f.bytes }] as const)));

test('a sync pushes only what changed here, as one commit on the head with a manifest of the merged tree', async () => {
  const local = await hashed(toRepo(sample()));
  const theme = local.find((f) => f.path === 'records/appearance.json')!;
  const gh = github({ head: 'c0', tree: { 'records/appearance.json': { sha: theme.sha, bytes: theme.bytes }, 'chats/gone.json': { sha: 'g', bytes: new Uint8Array(1) } } });
  const seen = await survey(remote, gh.f);
  const base: Base = { 'chats/gone.json': sha('g') };
  const changes = changesOf(local, seen.remote, base, seen.manifest);
  assert.equal(changes.some((c) => c.path === 'records/appearance.json'), false);
  const statuses = new Map<string, Status>();
  const out = await carry(remote, gh.f, seen, local, planOf(changes, new Map()), base, (p, s) => statuses.set(p, s));
  assert.equal(out.commit, 'commit1');
  assert.equal(out.backup, null);
  assert.equal(statuses.get('chats/abcd1234.json')?.kind, 'done');
  assert.equal(statuses.has('records/appearance.json'), false);
  const tree = gh.calls.find((c) => c.path === '/git/trees' && c.method === 'POST')?.body as { base_tree: string; tree: { path: string; sha: string | null }[] };
  assert.equal(tree.base_tree, 'tree0');
  assert.deepEqual(tree.tree.filter((e) => e.sha === null).map((e) => e.path), ['chats/gone.json']);
  assert.ok(tree.tree.some((e) => e.path === MANIFEST));
  assert.equal(tree.tree.some((e) => e.path === 'records/appearance.json'), false);
  assert.deepEqual((gh.calls.find((c) => c.path === '/git/commits' && c.method === 'POST')?.body as { parents: string[] }).parents, ['c0']);
  assert.deepEqual(gh.calls.find((c) => c.method === 'PATCH')?.body, { sha: 'commit1', force: false });
  assert.equal(out.base['chats/gone.json'], undefined);
  assert.equal(out.base['records/appearance.json'], theme.sha);
});

test('a sync pulls what changed in the repo and keeps what changed here', async () => {
  const theirs = toRepo(sample());
  const gh = github({ head: 'c9', tree: await treeOf(theirs) });
  const seen = await survey(remote, gh.f);
  const backup = sample();
  const mine = await hashed(toRepo({ ...backup, chats: [], drawings: [...backup.drawings, { id: 'ffff9999', name: 'Mine', items: [], created: 3, updated: 3 }] }));
  const base: Base = Object.fromEntries(mine.filter((f) => f.path !== 'drawings/ffff9999.json').map((f) => [f.path, f.sha]));
  const changes = changesOf(mine, seen.remote, base, seen.manifest);
  assert.deepEqual(changes.map((c) => `${c.side} ${c.path}`), ['down chats/abcd1234.json', 'up drawings/ffff9999.json']);
  const reads = gh.calls.length;
  const out = await carry(remote, gh.f, seen, mine, planOf(changes, new Map()), base, () => undefined);
  assert.equal(gh.calls.filter((c, i) => i >= reads && c.path.startsWith('/git/blobs/')).length, 1);
  assert.equal(out.backup?.chats[0]?.name, 'Springs');
  assert.deepEqual(out.backup?.drawings.map((d) => d.name).sort(), ['Free body', 'Mine']);
  assert.equal(out.backup?.files[0]?.base64, btoa('%PD'));
});

test('replacing this device with the repo drops what only this device has', async () => {
  const gh = github({ head: 'c9', tree: await treeOf(toRepo({ ...sample(), drawings: [] })) });
  const seen = await survey(remote, gh.f);
  const mine = await hashed(toRepo(sample()));
  const changes = changesOf(mine, seen.remote, {}, seen.manifest);
  const out = await carry(remote, gh.f, seen, mine, overwrite(changes, 'device'), {}, () => undefined);
  assert.equal(out.backup?.drawings.length, 0);
  assert.equal(gh.calls.some((c) => c.method === 'POST'), false);
});

test('a push to an empty repo starts the branch through the Contents API first', async () => {
  const gh = github({ head: null, empty: true, tree: {} });
  assert.deepEqual(await readHead(remote, gh.f), { kind: 'empty' });
  const local = await hashed(toRepo(sample()));
  const seen = await survey(remote, gh.f);
  await carry(remote, gh.f, seen, local, planOf(changesOf(local, seen.remote, {}, null), new Map()), {}, () => undefined);
  assert.ok(gh.calls.some((c) => c.method === 'PUT' && c.path === `/contents/${MANIFEST}`));
  assert.deepEqual((gh.calls.find((c) => c.path === '/git/commits')?.body as { parents: string[] }).parents, ['seed']);
});

test('a push to a branch the repo lacks makes a first commit and the branch', async () => {
  const gh = github({ head: null, tree: {} });
  const local = await hashed(toRepo(sample()));
  const seen = await survey(remote, gh.f);
  assert.deepEqual(seen.head, { kind: 'missing' });
  await carry(remote, gh.f, seen, local, overwrite(changesOf(local, seen.remote, {}, null), 'repo'), {}, () => undefined);
  assert.equal((gh.calls.find((c) => c.path === '/git/trees')?.body as { base_tree?: string }).base_tree, undefined);
  assert.deepEqual(gh.calls.find((c) => c.method === 'POST' && c.path === '/git/refs')?.body, { ref: 'refs/heads/main', sha: 'commit1' });
});
