import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const TYPES = { '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.webmanifest': 'application/manifest+json' };
const mime = (file) => TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
const sha = (body) => crypto.createHash('sha256').update(body).digest('hex');
const canonicalHash = (rows) => sha(Buffer.from([...rows].sort((a, b) => a[0].localeCompare(b[0])).map(([name, hash]) => `${name}\0${hash}\n`).join('')));
const walk = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  return (await Promise.all(entries.map(async (entry) => entry.isDirectory() ? (await walk(path.join(dir, entry.name))).map((file) => path.join(entry.name, file)) : [entry.name]))).flat();
};
const role = (logical) => logical.endsWith('.html') || logical.endsWith('/') ? 'page' : logical.endsWith('.json') || logical.endsWith('.webmanifest') ? 'data' : /\.(?:png|jpe?g|gif|svg|webp|avif|mp4)$/.test(logical) ? 'media' : /\.(?:woff2?|ttf)$/.test(logical) ? 'font' : logical.endsWith('.css') ? 'style' : logical.endsWith('.js') ? 'script' : 'app';
const logicalOf = (rel) => `/${rel.split(path.sep).join('/')}`;
const publishedAt = () => new Date(Number(process.env.SOURCE_DATE_EPOCH ?? Math.floor(Date.now() / 1000)) * 1000).toISOString();

const mergeArchive = async (archive, out) => {
  if (!archive) return;
  const source = path.resolve(archive, 'offline', 'releases');
  for (const rel of await walk(source)) {
    const dest = path.join(out, 'offline', 'releases', rel); await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.copyFile(path.join(source, rel), dest);
  }
};

const materialize = async (source, dest) => {
  await fs.mkdir(path.dirname(dest), { recursive: true });
  try { await fs.link(source, dest); }
  catch (error) {
    if (error?.code === 'EEXIST') {
      const [before, after] = await Promise.all([fs.readFile(dest), fs.readFile(source)]);
      if (sha(before) !== sha(after)) throw new Error(`Immutable release collision at ${dest}`);
      return;
    }
    await fs.copyFile(source, dest, constants.COPYFILE_EXCL);
  }
};
const writeImmutable = async (dest, body) => {
  await fs.mkdir(path.dirname(dest), { recursive: true });
  const previous = await fs.readFile(dest).catch((error) => error?.code === 'ENOENT' ? null : Promise.reject(error));
  if (previous !== null) {
    if (!previous.equals(body)) throw new Error(`Immutable release collision at ${dest}`);
    return;
  }
  await fs.writeFile(dest, body, { flag: 'wx' });
};

export async function buildOfflineArtifacts(out, bookIds, archive) {
  await mergeArchive(archive, out);
  const rootRels = ['index.html', 'about.html', 'book.html', 'library.json', 'manifest.webmanifest', 'sw.js'];
  const runtimeRels = [
    ...(await walk(path.join(out, 'assets'))).map((file) => path.join('assets', file)),
    ...(await walk(path.join(out, 'icons'))).map((file) => path.join('icons', file)),
    ...(await walk(path.join(out, 'vendor'))).map((file) => path.join('vendor', file)),
    ...(await Promise.all(rootRels.map(async (file) => await fs.stat(path.join(out, file)).then(() => file).catch(() => null)))).filter(Boolean),
  ];
  const runtimeRows = await Promise.all(runtimeRels.map(async (rel) => [logicalOf(rel), sha(await fs.readFile(path.join(out, rel)))]));
  const artifactId = canonicalHash(runtimeRows);
  const catalog = [];
  for (const { id, dir } of bookIds) {
    const bookRoot = path.join(out, id); const bookJson = JSON.parse(await fs.readFile(path.join(bookRoot, 'book.json'), 'utf8'));
    const sourceBook = JSON.parse(await fs.readFile(path.join(dir, 'book.json'), 'utf8'));
    const bookRels = (await walk(bookRoot)).map((file) => path.join(id, file));
    const text = (await Promise.all(bookRels.filter((file) => /\.(?:html|js|json|css)$/.test(file)).map((file) => fs.readFile(path.join(out, file), 'utf8')))).join('\n');
    const mediaUrls = [...new Set([...text.matchAll(/(\/media\/[^"',\]\s?#\\]+?\.(?:png|jpe?g|gif|svg|webp|avif|mp4|webm))/gi)].map((match) => decodeURI(match[1])))];
    const mediaRels = mediaUrls.map((url) => url.slice(1)).filter((rel) => !rel.split('/').includes('..'));
    const semanticRels = (await Promise.all([...new Set([...bookRels, ...mediaRels])].map(async (rel) => await fs.stat(path.join(out, rel)).then(() => rel).catch(() => null)))).filter(Boolean);
    /* Semantic identity comes from the actual content inputs, not generated
       page chrome or hashed runtime filenames. Plans/source transcripts are
       intentionally excluded because changing them without changing a reader-
       visible input is not a textbook release. */
    const inputRels = (await walk(dir)).filter((rel) => rel === 'book.json' || /(?:^|\/)(?:chapter|section)\.json$/.test(rel) || /(?:^|\/)(?:text\.html|figures\.js)$/.test(rel) || rel.startsWith(`media${path.sep}`) || rel.startsWith(`sheets${path.sep}`));
    const inputRows = await Promise.all(inputRels.map(async (rel) => [rel.split(path.sep).join('/'), sha(await fs.readFile(path.join(dir, rel)))]));
    /* Shared /media is resolved after all books are copied. Include the bytes
       this book will actually receive so a same-path collision cannot mutate an
       existing release directory without changing its semantic identity. */
    const resolvedMediaRows = await Promise.all(mediaRels.map(async (rel) => [`@resolved/${rel.split(path.sep).join('/')}`, sha(await fs.readFile(path.join(out, rel)))]));
    const releaseId = canonicalHash([...inputRows, ...resolvedMediaRows]);
    const allRels = [...new Set([...semanticRels, ...runtimeRels])];
    const resources = [];
    for (const rel of allRels) {
      const source = path.join(out, rel); const body = await fs.readFile(source); const logicalUrl = logicalOf(rel);
      const downloadUrl = `/offline/releases/${encodeURIComponent(id)}/${releaseId}/${artifactId}/${rel.split(path.sep).join('/')}`;
      await materialize(source, path.join(out, downloadUrl.slice(1)));
      resources.push({ logicalUrl, downloadUrl, sha256: sha(body), bytes: body.byteLength, mime: mime(rel), role: role(logicalUrl) });
    }
    resources.sort((a, b) => a.logicalUrl.localeCompare(b.logicalUrl));
    const common = inputRows.filter(([rel]) => rel === 'book.json');
    const sections = (bookJson.chapters ?? []).flatMap((chapter) => (chapter.sections ?? []).map((section) => ({ chapter, section }))).map(({ chapter, section }) => {
      const prefix = `${chapter.dir}/${section.id}/`;
      const rows = [...common, ...inputRows.filter(([rel]) => rel === `${chapter.dir}/chapter.json` || rel.startsWith(prefix))];
      return { id: section.id, fingerprint: canonicalHash(rows.length ? rows : [[prefix, sha(Buffer.alloc(0))]]) };
    });
    const authoredDate = sourceBook.release_date ?? sourceBook.releaseDate;
    const authoredNotes = sourceBook.release_notes ?? sourceBook.releaseNotes;
    const manifest = { schemaVersion: 1, contentFormat: 1, book: { id, title: bookJson.title }, releaseId, publishedAt: authoredDate ? new Date(authoredDate).toISOString() : new Date(0).toISOString(), ...(typeof authoredNotes === 'string' && authoredNotes.trim() ? { releaseNotes: authoredNotes.trim() } : {}), runtime: { artifactId, compatibleReaderFormat: 1 }, resources, sections, totalBytes: resources.reduce((sum, item) => sum + item.bytes, 0) };
    const manifestRel = `offline/releases/${id}/${releaseId}/${artifactId}/manifest.json`;
    await writeImmutable(path.join(out, manifestRel), Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`));
    catalog.push({ id, title: bookJson.title, releaseId, artifactId, publishedAt: manifest.publishedAt, manifestUrl: `/${manifestRel}`, totalBytes: manifest.totalBytes });
  }
  await fs.writeFile(path.join(out, 'offline-catalog.json'), `${JSON.stringify({ schemaVersion: 1, generatedAt: publishedAt(), books: catalog }, null, 2)}\n`);
  await fs.writeFile(path.join(out, '_headers'), `/offline/releases/*\n  Cache-Control: public, max-age=31536000, immutable\n/offline-catalog.json\n  Cache-Control: no-cache\n/sw.js\n  Cache-Control: no-cache\n/*.html\n  Cache-Control: no-cache\n`);
}
