/* Layered build configuration. Every user-settable value lives here, grouped
   by concern, and is read from the environment with a default. */
import path from 'node:path';

type ContentConfig = { readonly root: string; readonly bookId: string };
type SiteConfig = { readonly baseUrl: string };
type BuildConfig = { readonly threeUrl: string };
export type OmniStaxConfig = { readonly content: ContentConfig; readonly site: SiteConfig; readonly build: BuildConfig };

/* Paths resolve against the project directory (where astro runs), not this file, which is bundled at build time. */
const here = process.cwd();
const str = (env: NodeJS.ProcessEnv, key: string, fallback: string): string => env[key]?.trim() || fallback;

export const parseConfig = (env: NodeJS.ProcessEnv): OmniStaxConfig => ({
  content: { root: path.resolve(here, str(env, 'OMNISTAX_CONTENT_DIR', '..')), bookId: str(env, 'OMNISTAX_BOOK', 'college-physics-2e') },
  site: { baseUrl: str(env, 'OMNISTAX_BASE_URL', 'https://omnistax.local') },
  build: { threeUrl: str(env, 'OMNISTAX_THREE_URL', '/vendor/three.min.js') },
});

export const config: OmniStaxConfig = parseConfig(process.env);
