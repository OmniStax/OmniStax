/* Layered build configuration. Every user-settable value lives here, grouped
   by concern, and is read from the environment with a default. The content
   root holds one folder per book, and a build carries every book it finds
   there unless it is told which ones to carry. */
import path from 'node:path';
import { type BookId, type ContentRoot, bookId, contentRoot } from './src/lib/types/ids';

/* Which books of the root a build carries: every one it finds there, or the
   ones it is told to, in the order they are named. */
export type BookSelection = { readonly kind: 'all' } | { readonly kind: 'named'; readonly ids: readonly BookId[] };

type ContentConfig = { readonly root: ContentRoot; readonly books: BookSelection };
type SiteConfig = { readonly baseUrl: string };
type BuildConfig = { readonly threeUrl: string };
export type OmniStaxConfig = { readonly content: ContentConfig; readonly site: SiteConfig; readonly build: BuildConfig };

/* Paths resolve against the project directory (where astro runs), not this file, which is bundled at build time. */
const here = process.cwd();
const str = (env: NodeJS.ProcessEnv, key: string, fallback: string): string => env[key]?.trim() || fallback;

/* A comma-separated list of book ids, empty meaning every book under the root.
   `OMNISTAX_BOOK` stays as the one-book form of the same setting. */
export const parseBooks = (raw: string): BookSelection => {
  const ids = raw.split(',').map((s) => s.trim()).filter((s) => s.length > 0).map(bookId);
  return ids.length === 0 ? { kind: 'all' } : { kind: 'named', ids };
};

export const parseConfig = (env: NodeJS.ProcessEnv): OmniStaxConfig => ({
  content: {
    root: contentRoot(path.resolve(here, str(env, 'OMNISTAX_CONTENT_DIR', '../omnistax-content'))),
    books: parseBooks(str(env, 'OMNISTAX_BOOKS', str(env, 'OMNISTAX_BOOK', ''))),
  },
  site: { baseUrl: str(env, 'OMNISTAX_BASE_URL', 'https://omnistax.local') },
  build: { threeUrl: str(env, 'OMNISTAX_THREE_URL', '/vendor/three.min.js') },
});

export const config: OmniStaxConfig = parseConfig(process.env);
