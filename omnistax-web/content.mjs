/* The books' folders, as far as the app is concerned. Two jobs, both about the
   content root rather than the app's own tree: a change under the root reloads
   the open page the way an edit to a component does, and the images each book
   keeps under `<book>/media` are served at `/media/…` in dev and copied into
   `dist/media/` at the end of a build, since `text.html` and the figures table
   name them that way. The books share that one address space, so a build of
   several merges their media folders and says so if two books name one file.
   `public/` keeps only what belongs to the app itself: icons, the manifest and
   the vendored three.js. */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { bumpContent } from './src/lib/content/version.ts';
import { bookBase } from './src/lib/content/urls.ts';
import { STORED_OUT, STORED_ROW, pruneStore, storeBook } from './src/lib/content/stored.ts';
import { buildOfflineArtifacts } from './scripts/build-offline.mjs';

const TYPES = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.mp4': 'video/mp4',
};
const typeOf = (file) => TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream';

/* `/media/ch16/Figure_17_01_01.jpg` names a file under a book's `media`; a path
   that climbs out of that folder names nothing. */
export const mediaFile = (mediaRoot, url) => {
  const rest = decodeURIComponent(String(url ?? '').split('?')[0]).replace(/^\/*media\/*/, '');
  const file = path.resolve(mediaRoot, rest);
  return rest !== '' && file.startsWith(`${mediaRoot}${path.sep}`) ? file : null;
};

/* The first book whose media folder holds the file, since the books answer at one address. */
const readMedia = async (mediaRoots, url) => {
  for (const root of mediaRoots) {
    const file = mediaFile(root, url);
    const body = file === null ? null : await fs.readFile(file).catch(() => null);
    if (body !== null) return { file, body };
  }
  return null;
};

/* Every file of one media folder, as paths relative to it. */
const filesUnder = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const deep = await Promise.all(entries.map(async (e) => {
    const rest = path.join(dir, e.name);
    return e.isDirectory() ? (await filesUnder(rest)).map((f) => path.join(e.name, f)) : [e.name];
  }));
  return deep.flat();
};

/* The books' media folders merged into one, first book wins, a clash named out loud. */
const copyMedia = async (mediaRoots, out) => {
  const taken = new Map();
  for (const root of mediaRoots) {
    for (const rel of await filesUnder(root)) {
      const held = taken.get(rel);
      if (held !== undefined) { console.warn(`content: ${rel} is in both ${held} and ${root}; the first is served`); continue; }
      taken.set(rel, root);
      await fs.mkdir(path.join(out, path.dirname(rel)), { recursive: true });
      await fs.copyFile(path.join(root, rel), path.join(out, rel));
    }
  }
};

/* The books' own files of a build, without the page shells every build renders:
   what the store keeps of a book (decision 25 of docs/release-plan.md). */
const bookFiles = async (out, id, shells) => {
  const base = bookBase(id).slice(1, -1);
  const pages = new Set(shells.map((s) => path.join(s.url.slice(1), 'index.html')));
  return (await filesUnder(path.join(out, base))).map((f) => path.join(base, f)).filter((f) => !pages.has(f));
};

/* `plan` is the books this build carries, under `root`, and which of them it
   takes from the store (stored.ts); `mediaRoots` the media folders it serves
   and copies, first wins: each book's own and, for a translation, its
   source's, which the translation's pages name (mediaDirsOf in load.ts).
   `cacheDir` is Astro's, which Cloudflare's build cache keeps. */
export default function content(root, plan, mediaRoots, cacheDir) {
  const made = plan.books.filter((b) => b.stored === null);
  return {
    name: 'omnistax-content',
    hooks: {
      'astro:server:setup': ({ server }) => {
        server.watcher.add(root);
        /* The stamp is moved before the reload goes out, so the pages the reload
           asks for again read the files afresh and everything else keeps its tree. */
        const onEvent = (event) => (file) => {
          if (!file.startsWith(root)) return;
          bumpContent(root, file, event);
          server.ws.send({ type: 'full-reload', path: '*' });
        };
        for (const event of ['change', 'add', 'unlink']) server.watcher.on(event, onEvent(event));
        server.middlewares.use('/media', async (req, res, next) => {
          const found = await readMedia(mediaRoots, `/media/${String(req.url ?? '')}`);
          if (found === null) { next(); return; }
          res.setHeader('Content-Type', typeOf(found.file));
          res.end(found.body);
        });
      },
      /* A book is checked when it is built to be stored, so the store holds no
         book that failed; a book with uncommitted changes is work in progress,
         checked by whoever is writing it. */
      'astro:build:start': () => {
        const checked = made.filter((b) => b.key !== null).map((b) => b.id);
        if (checked.length === 0) return;
        console.log(`content: checking ${checked.join(', ')}`);
        execFileSync(process.execPath, ['--test', '--import', 'tsx', 'tests/books/on-disk.test.ts'], { stdio: 'inherit', env: { ...process.env, OMNISTAX_BOOKS: checked.join(',') } });
      },
      'astro:build:done': async ({ dir }) => {
        const out = dir.pathname;
        for (const b of plan.books) if (b.stored !== null) await fs.cp(path.join(b.stored, STORED_OUT), out, { recursive: true });
        await copyMedia(mediaRoots, path.join(out, 'media'));
        const shells = new Map(await Promise.all(made.map(async (b) => {
          const file = path.join(out, bookBase(b.id).slice(1, -1), 'shells.json');
          const held = JSON.parse(await fs.readFile(file, 'utf8'));
          await fs.rm(file);
          return [b.id, held];
        })));
        const books = await Promise.all(plan.books.map(async (b) => ({ id: b.id, dir: b.dir, row: b.stored === null ? null : JSON.parse(await fs.readFile(path.join(b.stored, STORED_ROW), 'utf8')) })));
        const rows = await buildOfflineArtifacts(out, books, process.env.OMNISTAX_RELEASE_ARCHIVE_DIR, { figureCache: path.join(cacheDir, 'omnistax-figures') });
        for (const b of made.filter((m) => m.key !== null)) {
          const row = rows.get(b.id);
          const release = path.dirname(row.manifestUrl.slice(1));
          const offline = (await filesUnder(path.join(out, release))).map((f) => path.join(release, f));
          await storeBook(path.join(plan.store, b.key), out, [...await bookFiles(out, b.id, shells.get(b.id)), ...offline], shells.get(b.id), row);
        }
        await pruneStore(plan);
        console.log(`content: ${plan.books.length - made.length} book(s) from the store, ${made.length} built: ${made.map((b) => b.id).join(', ') || 'none'}`);
      },
    },
  };
}
