/* The book's folder, as far as the app is concerned. Two jobs, both about the
   content root rather than the app's own tree: a change under the root reloads
   the open page the way an edit to a component does, and the book's images
   under `<root>/media` are served at `/media/…` in dev and copied into
   `dist/media/` at the end of a build, since `text.html` and the figures table
   name them that way. `public/` keeps only what belongs to the app itself:
   icons, the manifest and the vendored three.js. */
import fs from 'node:fs/promises';
import path from 'node:path';

const TYPES = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.mp4': 'video/mp4',
};
const typeOf = (file) => TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream';

/* `/media/ch16/Figure_17_01_01.jpg` names a file under `<root>/media`; a path
   that climbs out of that folder names nothing. */
export const mediaFile = (mediaRoot, url) => {
  const rest = decodeURIComponent(String(url ?? '').split('?')[0]).replace(/^\/*media\/*/, '');
  const file = path.resolve(mediaRoot, rest);
  return rest !== '' && file.startsWith(`${mediaRoot}${path.sep}`) ? file : null;
};

export default function content(root) {
  const mediaRoot = path.join(root, 'media');
  return {
    name: 'omnistax-content',
    hooks: {
      'astro:server:setup': ({ server }) => {
        server.watcher.add(root);
        const onChange = (file) => { if (file.startsWith(root)) server.ws.send({ type: 'full-reload', path: '*' }); };
        server.watcher.on('change', onChange); server.watcher.on('add', onChange); server.watcher.on('unlink', onChange);
        server.middlewares.use('/media', async (req, res, next) => {
          const file = mediaFile(mediaRoot, `/media/${String(req.url ?? '')}`);
          const body = file === null ? null : await fs.readFile(file).catch(() => null);
          if (body === null) { next(); return; }
          res.setHeader('Content-Type', typeOf(file));
          res.end(body);
        });
      },
      'astro:build:done': async ({ dir }) => {
        await fs.cp(mediaRoot, path.join(dir.pathname, 'media'), { recursive: true });
      },
    },
  };
}
