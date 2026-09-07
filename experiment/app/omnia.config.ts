/* Layered build configuration. Every user-settable value lives here, grouped
   by concern, and is read from the environment with a default. */
import path from 'node:path';

type ContentConfig = { readonly root: string; readonly bookId: string };
type SiteConfig = { readonly baseUrl: string };
type BuildConfig = { readonly threeUrl: string };
export type OmniaConfig = { readonly content: ContentConfig; readonly site: SiteConfig; readonly build: BuildConfig };

/* Paths resolve against the project directory (where astro runs), not this file, which is bundled at build time. */
const here = process.cwd();
const str = (env: NodeJS.ProcessEnv, key: string, fallback: string): string => env[key]?.trim() || fallback;

export const parseConfig = (env: NodeJS.ProcessEnv): OmniaConfig => ({
  content: { root: path.resolve(here, str(env, 'OMNIA_CONTENT_DIR', '..')), bookId: str(env, 'OMNIA_BOOK', 'college-physics-2e') },
  site: { baseUrl: str(env, 'OMNIA_BASE_URL', 'https://omnia.local') },
  build: { threeUrl: str(env, 'OMNIA_THREE_URL', '/vendor/three.min.js') },
});

export const config: OmniaConfig = parseConfig(process.env);
