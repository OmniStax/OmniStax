import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { buildOfflineArtifacts } from '../scripts/build-offline.mjs';
import { BookReleaseManifestSchema } from '../src/lib/offline/schema';
import { beginInstall, bookMarks, commitInstall, failInstall, readableLines, releaseChanges, releaseForBook, savedSessionReleaseReferences, sectionChanges, sharedAutoUpdate } from '../src/lib/offline/model';

const put = async (root: string, rel: string, body: string) => { const file = path.join(root, rel); await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, body); };
const fixture = async (root: string, changed = false, runtime = 'body{}', archive?: string) => {
  const out = path.join(root, 'dist'); const sources = path.join(root, 'content');
  for (const rel of ['index.html', 'about.html']) await put(out, rel, '<html><link href="/assets/app.css"></html>');
  await put(out, 'library.json', '[]'); await put(out, 'manifest.webmanifest', '{}'); await put(out, 'assets/app.css', runtime);
  await put(out, 'media/a(x).jpg', 'image-a'); await put(out, 'media/b.jpg', 'image-b');
  for (const id of ['a', 'b']) {
    const dir = path.join(sources, id); const value = id === 'a' && changed ? 'changed' : 'same';
    const manifest = { id, title: `Book ${id}`, chapters: [{ dir: 'ch01', sections: [{ id: '1.1', built: true, url: `/${id}/ch01/1.1/` }] }] };
    await put(dir, 'book.json', JSON.stringify(manifest)); await put(dir, 'ch01/chapter.json', '{}'); await put(dir, 'ch01/1.1/section.json', '{}'); await put(dir, 'ch01/1.1/text.html', `${value}<figure data-original="/media/a(x).jpg,/media/b.jpg"></figure>`);
    await put(out, `${id}/book.json`, JSON.stringify(manifest)); await put(out, `${id}/ch01/1.1/index.html`, `<p>${value}</p><figure data-original="/media/a(x).jpg,/media/b.jpg"></figure>`); await put(out, `${id}/ch01/1.1/doc.html`, `<p>${value}</p>`);
  }
  await buildOfflineArtifacts(out, ['a', 'b'].map((id) => ({ id, dir: path.join(sources, id) })), archive);
  const catalog = JSON.parse(await readFile(path.join(out, 'offline-catalog.json'), 'utf8'));
  const manifests = Object.fromEntries(await Promise.all(catalog.books.map(async (book: { id: string; manifestUrl: string }) => [book.id, JSON.parse(await readFile(path.join(out, book.manifestUrl.slice(1)), 'utf8'))])));
  return manifests as Record<string, ReturnType<typeof BookReleaseManifestSchema.parse>>;
};

test('release ids are deterministic per book and section changes are explicit', async () => {
  const one = await fixture(await mkdtemp(path.join(os.tmpdir(), 'omnistax-release-a-')));
  const same = await fixture(await mkdtemp(path.join(os.tmpdir(), 'omnistax-release-b-')));
  const changed = await fixture(await mkdtemp(path.join(os.tmpdir(), 'omnistax-release-c-')), true);
  assert.equal(one.a.releaseId, same.a.releaseId);
  assert.equal(one.b.releaseId, changed.b.releaseId);
  assert.notEqual(one.a.releaseId, changed.a.releaseId);
  assert.deepEqual(releaseChanges(one.a, changed.a).sections.changed, ['1.1']);
  assert.equal(BookReleaseManifestSchema.safeParse(one.a).success, true);
  for (const resource of one.a.resources) assert.match(resource.downloadUrl, new RegExp(`/offline/releases/a/${one.a.releaseId}/${one.a.runtime.artifactId}/`));
});

test('an app change leaves every book download where it was', async () => {
  const firstRoot = await mkdtemp(path.join(os.tmpdir(), 'omnistax-runtime-a-'));
  const secondRoot = await mkdtemp(path.join(os.tmpdir(), 'omnistax-runtime-b-'));
  const first = await fixture(firstRoot, false, 'body{color:black}');
  const second = await fixture(secondRoot, false, 'body{color:blue}');
  assert.equal(first.a.releaseId, second.a.releaseId);
  assert.equal(first.a.runtime.artifactId, second.a.runtime.artifactId);
  assert.deepEqual(first.a.resources.map((r) => r.downloadUrl), second.a.resources.map((r) => r.downloadUrl));
  const apps = await Promise.all([firstRoot, secondRoot].map(async (root) => JSON.parse(await readFile(path.join(root, 'dist', 'offline-catalog.json'), 'utf8')).artifactId));
  assert.notEqual(apps[0], apps[1], 'the catalog still names the app build, for the update notice');
  for (const [root, manifest] of [[firstRoot, first.a], [secondRoot, second.a]] as const) {
    for (const resource of manifest.resources) {
      const body = await readFile(path.join(root, 'dist', resource.downloadUrl.slice(1)));
      assert.equal(body.byteLength, resource.bytes);
      assert.equal(crypto.createHash('sha256').update(body).digest('hex'), resource.sha256);
    }
  }
});

test('a release archive retains the prior immutable snapshot', async () => {
  const firstRoot = await mkdtemp(path.join(os.tmpdir(), 'omnistax-archive-a-'));
  const secondRoot = await mkdtemp(path.join(os.tmpdir(), 'omnistax-archive-b-'));
  const first = await fixture(firstRoot);
  const second = await fixture(secondRoot, true, 'body{}', path.join(firstRoot, 'dist'));
  assert.notEqual(first.a.releaseId, second.a.releaseId);
  const oldManifest = path.join(secondRoot, 'dist', 'offline', 'releases', 'a', first.a.releaseId, first.a.runtime.artifactId, 'manifest.json');
  assert.equal(BookReleaseManifestSchema.safeParse(JSON.parse(await readFile(oldManifest, 'utf8'))).success, true);
});

test('the shell list carries the runtime and the first page of each book, not book content', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'omnistax-shell-'));
  const books = await fixture(root);
  assert.ok(!books.a.resources.some((r) => r.logicalUrl.endsWith('/index.html') || r.logicalUrl.startsWith('/assets/')), 'a download holds no page and no app file');
  assert.ok(books.a.resources.some((r) => r.logicalUrl === '/a/ch01/1.1/doc.html'), 'a download holds the section fragments');
  const shell = JSON.parse(await readFile(path.join(root, 'dist', 'offline-shell.json'), 'utf8'));
  const urls = shell.resources.map((row: { url: string }) => row.url).sort();
  assert.deepEqual(urls, ['/a/book.json', '/a/ch01/1.1/index.html', '/about.html', '/assets/app.css', '/b/book.json', '/b/ch01/1.1/index.html', '/index.html', '/library.json', '/manifest.webmanifest']);
  assert.equal(shell.totalBytes, shell.resources.reduce((sum: number, row: { bytes: number }) => sum + row.bytes, 0));
});

test('failed updates retain an existing ready release', () => {
  const ready = commitInstall({ phase: 'absent', availableRelease: 'a' }, 'a');
  const updating = beginInstall({ ...ready, availableRelease: 'b' }, 'b');
  assert.equal(updating.phase, 'ready');
  assert.deepEqual(failInstall(updating, 'network'), { phase: 'ready', installedRelease: 'a', availableRelease: 'b', stagingRelease: undefined, error: 'network' });
});

test('saved practice releases are exact, typed cache-retention references', () => {
  const refs = savedSessionReleaseReferences({
    one: { drawn: [{ book: 'a', release: 'release-a' }, { book: 'a', release: 'release-a' }, { book: 'b' }] },
    two: { drawn: [{ book: 'b', release: 'release-b' }, null, 'bad'] },
    malformed: { drawn: 'nope' },
  });
  assert.deepEqual(refs, [{ bookId: 'a', release: 'release-a' }, { bookId: 'b', release: 'release-b' }]);
});

test('a live client pin is authoritative for new practice provenance', () => {
  assert.equal(releaseForBook('a', { a: 'release-a' }, { a: 'release-b' }, { a: 'release-c' }), 'release-a');
  assert.equal(releaseForBook('a', {}, { a: 'release-b' }, { a: 'release-c' }), 'release-b');
  assert.equal(releaseForBook('a', {}, {}, { a: 'release-c' }), 'release-c');
});

test('a book row is marked Updated against what the reader last saw, and Update while a newer release waits', () => {
  const seen = { release: 'a', artifact: 'x', sections: [] };
  assert.deepEqual(bookMarks(undefined, undefined, 'b'), { updated: false, update: false });
  assert.deepEqual(bookMarks(seen, undefined, 'a'), { updated: false, update: false });
  assert.deepEqual(bookMarks(seen, undefined, 'b'), { updated: true, update: false });
  assert.deepEqual(bookMarks(seen, 'a', 'b'), { updated: false, update: true });
  assert.deepEqual(bookMarks(seen, 'b', 'b'), { updated: true, update: false });
  const f = (c: string) => c.repeat(64);
  assert.deepEqual(sectionChanges([{ id: '1.1', fingerprint: f('a') }, { id: '1.2', fingerprint: f('b') }], [{ id: '1.1', fingerprint: f('c') }, { id: '1.3', fingerprint: f('d') }]), { added: ['1.3'], changed: ['1.1'], removed: ['1.2'] });
});

test('a section reads as one line per block, maths as TeX', () => {
  const html = `<article><div class="eyebrow">Chapter 2</div><h1>Vectors</h1>
<p class="lead">A <span data-concept="v">vector</span> has <em>direction</em>.<span class="ai-mark"><svg><path d="M0"/></svg></span></p>
<!-- marker --><figure><img src="/a.jpg" alt="jet"><figcaption><span class="eyebrow">Figure 2.6</span><span>The <span class="katex"><span class="katex-mathml"><math><semantics><mrow><mi>x</mi></mrow><annotation encoding="application/x-tex">x</annotation></semantics></math></span><span class="katex-html" aria-hidden="true"><span class="mord">x</span></span></span>-axis &amp; more.</span></figcaption></figure>
<ul><li>One</li><li>Two</li></ul><script>var a = 1;</script><button>Try</button></article>`;
  assert.deepEqual(readableLines(html), ['Chapter 2', 'Vectors', 'A vector has direction.', 'Figure 2.6', 'The $x$-axis & more.', 'One', 'Two']);
});

test('sharedAutoUpdate: one setting over a book and its translations, on unless an edition was turned off', () => {
  assert.equal(sharedAutoUpdate({}, ['cp', 'cp-zh']), true, 'nothing recorded is on');
  assert.equal(sharedAutoUpdate({ cp: true }, ['cp', 'cp-zh']), true);
  assert.equal(sharedAutoUpdate({ 'cp-zh': false }, ['cp', 'cp-zh']), false, 'one edition off turns the family off');
  assert.equal(sharedAutoUpdate({ 'cp-zh': false }, ['cp']), true, 'another family is not touched');
  assert.equal(sharedAutoUpdate({}, []), true);
});
