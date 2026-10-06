import fs from 'node:fs/promises';
import path from 'node:path';
import { buildOfflineArtifacts } from '../scripts/build-offline.mjs';

const [input, output, work, sourceInput] = process.argv.slice(2).map((value) => path.resolve(value));
if (!input || !output || !work || !sourceInput) throw new Error('usage: node offline-update-fixture.mjs INPUT_DIST OUTPUT WORK SOURCE_BOOK');

const copy = async (rel) => fs.cp(path.join(input, rel), path.join(output, rel), { recursive: true });
await fs.mkdir(output, { recursive: true });
/* Copy the app shell: every top-level entry the build emits except the
   generated offline release tree, the shared media pool (only the sandbox's
   own media is copied below) and the other books, so the fixture cannot rot
   when the build starts or stops emitting a page. */
const excluded = new Set(['offline', 'offline-catalog.json', 'media']);
const isOtherBook = async (entry) => entry.isDirectory() && entry.name !== 'sandbox'
  && await fs.stat(path.join(input, entry.name, 'book.json')).then(() => true).catch(() => false);
const entries = await fs.readdir(input, { withFileTypes: true });
for (const entry of entries) {
  if (excluded.has(entry.name) || await isOtherBook(entry)) continue;
  await copy(entry.name);
}

const catalogA = JSON.parse(await fs.readFile(path.join(input, 'offline-catalog.json'), 'utf8'));
catalogA.books = catalogA.books.filter((book) => book.id === 'sandbox');
const entryA = catalogA.books[0]; if (!entryA) throw new Error('sandbox is absent from the input catalog');
const manifestA = JSON.parse(await fs.readFile(path.join(input, entryA.manifestUrl.slice(1)), 'utf8'));
for (const resource of manifestA.resources.filter((item) => item.logicalUrl.startsWith('/media/'))) await copy(resource.logicalUrl.slice(1));

const archive = path.join(work, 'archive');
const oldRelease = path.join('offline', 'releases', 'sandbox', manifestA.releaseId);
await fs.mkdir(path.dirname(path.join(archive, oldRelease)), { recursive: true });
await fs.cp(path.join(input, oldRelease), path.join(archive, oldRelease), { recursive: true });

/* The live site moves A -> app -> B while the output holds B. The server lays
   live-<phase>/ over it, so each phase keeps the files it had. A release copy
   is a hard link to its source, so a changed file is written anew, never
   appended in place. */
const rewrite = async (rel, tail) => {
  const file = path.join(output, rel); const body = await fs.readFile(file);
  await fs.rm(file); await fs.writeFile(file, Buffer.concat([body, Buffer.from(tail)]));
};
const keep = async (phase, rels) => {
  for (const rel of rels) { const dest = path.join(work, `live-${phase}`, rel); await fs.mkdir(path.dirname(dest), { recursive: true }); await fs.copyFile(path.join(output, rel), dest); }
};
const front = await fs.readFile(path.join(output, 'sandbox', 'index.html'), 'utf8');
const css = front.match(/href="\/(assets\/[^"]+\.css)"/)?.[1];
if (!css || !(await fs.readFile(path.join(output, 'sandbox', 'ch01', '1.1', 'index.html'), 'utf8')).includes(`/${css}`)) throw new Error('no stylesheet shared by the sandbox pages');
const pages = ['sandbox/ch01/1.1/doc.html', 'sandbox/ch01/1.1/index.html'];
await keep('a', [css, ...pages]);
await keep('app', pages);

await rewrite(css, '\n:root{--omnistax-fixture:app}\n');
await buildOfflineArtifacts(output, [{ id: 'sandbox', dir: sourceInput }], archive);
const catalogApp = JSON.parse(await fs.readFile(path.join(output, 'offline-catalog.json'), 'utf8'));

const source = path.join(work, 'source'); await fs.cp(sourceInput, source, { recursive: true });
const marker = '\n<!-- offline-release-b -->\n';
await fs.appendFile(path.join(source, 'ch01', '1.1', 'text.html'), marker);
for (const rel of pages) await rewrite(rel, marker);
await buildOfflineArtifacts(output, [{ id: 'sandbox', dir: source }], archive);

const catalogB = JSON.parse(await fs.readFile(path.join(output, 'offline-catalog.json'), 'utf8'));
await fs.writeFile(path.join(output, 'offline-catalog-a.json'), JSON.stringify(catalogA));
await fs.writeFile(path.join(output, 'offline-catalog-app.json'), JSON.stringify(catalogApp));
await fs.writeFile(path.join(output, 'offline-catalog-b.json'), JSON.stringify(catalogB));
process.stdout.write(JSON.stringify({ a: entryA.releaseId, b: catalogB.books[0].releaseId, artifactA: entryA.artifactId, artifactApp: catalogApp.books[0].artifactId, artifactB: catalogB.books[0].artifactId, appRelease: catalogApp.books[0].releaseId }));
