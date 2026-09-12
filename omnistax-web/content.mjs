/* The books' folders, as far as the app is concerned. Two jobs, both about the
   content root rather than the app's own tree: a change under the root reloads
   the open page the way an edit to a component does, and the images each book
   keeps under `<book>/media` are served at `/media/…` in dev and copied into
   `dist/media/` at the end of a build, since `text.html` and the figures table
   name them that way. The books share that one address space, so a build of
   several merges their media folders and says so if two books name one file.
   `public/` keeps only what belongs to the app itself: icons, the manifest and
   the vendored three.js. */
import fs from 'node:fs/promises';
import path from 'node:path';

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

/* `books` are the folders of the books this build carries, under `root`. */
export default function content(root, books) {
  const mediaRoots = books.map((dir) => path.join(dir, 'media'));
  return {
    name: 'omnistax-content',
    hooks: {
      'astro:server:setup': ({ server }) => {
        server.watcher.add(root);
        const onChange = (file) => { if (file.startsWith(root)) server.ws.send({ type: 'full-reload', path: '*' }); };
        server.watcher.on('change', onChange); server.watcher.on('add', onChange); server.watcher.on('unlink', onChange);
        server.middlewares.use('/media', async (req, res, next) => {
          const found = await readMedia(mediaRoots, `/media/${String(req.url ?? '')}`);
          if (found === null) { next(); return; }
          res.setHeader('Content-Type', typeOf(found.file));
          res.end(found.body);
        });
      },
      'astro:build:done': async ({ dir }) => {
        await copyMedia(mediaRoots, path.join(dir.pathname, 'media'));
      },
    },
  };
}
