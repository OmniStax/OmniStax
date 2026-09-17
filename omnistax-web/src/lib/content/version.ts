/* How old a read of the content root is. The loader caches what it has read and
   the dev server's watcher moves these numbers when a file under the root
   changes, so a cached tree is kept exactly as long as nothing it was read from
   has moved. The two sides live in different module graphs — `content.mjs` runs
   in Astro's config and integration context, the pages in Vite's SSR graph — so
   the numbers hang off `globalThis`, which both share, rather than off this
   module's own state. In a build nothing ever bumps them and the cache is the
   one-shot cache it has always been. */
import path from 'node:path';
import type { ContentRoot } from '../types/ids';

/* A count of the changes seen, meaningful only against another read of itself. */
export type ContentVersion = number;

/* The root's own version and one per book folder, named by folder path. */
type Versions = { root: ContentVersion; books: Map<string, ContentVersion> };

const KEY = '__omnistaxContentVersion';

const versions = (): Versions => {
  const holder = globalThis as unknown as Record<string, Versions | undefined>;
  return (holder[KEY] ??= { root: 0, books: new Map() });
};

/* The folder directly under the root that a changed file lies in, which is the
   book it belongs to; a file at the root itself belongs to no book. */
const folderOf = (root: ContentRoot, file: string): string | null => {
  const rest = path.relative(root, file);
  if (rest === '' || rest.startsWith('..') || path.isAbsolute(rest)) return null;
  const [first] = rest.split(path.sep);
  return first === undefined || first === '' ? null : path.join(root, first);
};

/* A file under the root changed. Its book is stale, and on an add or an unlink
   so is the root, since the set of books — or of a book's pages — may differ
   from what was read. */
export const bumpContent = (root: ContentRoot, file: string, event: 'change' | 'add' | 'unlink'): void => {
  const v = versions();
  if (event !== 'change') v.root += 1;
  const folder = folderOf(root, file);
  if (folder !== null) v.books.set(folder, (v.books.get(folder) ?? 0) + 1);
};

/* What the loader compares its cache against. */
export const rootVersion = (): ContentVersion => versions().root;
export const bookVersion = (dir: string): ContentVersion => versions().books.get(dir) ?? 0;
