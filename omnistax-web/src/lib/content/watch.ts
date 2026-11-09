/* What the dev server does not watch under the content root. A book may keep
   files beside its content that are not part of any page: the CS book fetches
   its whole corpus of sources into `sources/_cache/` (1.3 GB, gitignored), and
   a book's build scripts leave `__pycache__` folders. Watching them spends the
   machine's file watchers (inotify) and the server stops seeing real edits, so
   they are named in Vite's `server.watch.ignored`, which the content watcher
   (content.mjs adds the root to the same chokidar instance) obeys too. Vite
   adds these to its own list (.git, node_modules, its cache). */
export const WATCH_IGNORED: readonly string[] = ['**/sources/_cache/**', '**/__pycache__/**'];
