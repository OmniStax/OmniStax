import path from 'node:path';
import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import { config } from './omnistax.config.ts';
import { chooseBooks, findBooks, mediaDirsOf } from './src/lib/content/load.ts';
import { builderHash, planBuild, setBuildPlan } from './src/lib/content/stored.ts';
import content from './content.mjs';

/* Which books this build carries, resolved once here so that the integration
   watching and copying their media reads the same list the pages do. A
   translation keeps no media of its own, so its source's folder is served and
   copied with it even when the source is not built. */
const found = await findBooks(config.content.root);
const books = chooseBooks(found, config.content.books);
const mediaDirs = mediaDirsOf(found, books);
/* A build takes from the store every book whose commit and builder it already
   built (decision 25 of docs/release-plan.md); `OMNISTAX_STORE=off` builds
   them all and keeps none. Dev and the type check never store. */
const cacheDir = path.resolve(process.env.OMNISTAX_CACHE_DIR || 'node_modules/.astro');
const storing = process.argv.includes('build') && process.env.OMNISTAX_STORE !== 'off';
const plan = planBuild(path.join(cacheDir, 'omnistax-books'), books, storing ? builderHash(process.cwd(), config.site) : null);
setBuildPlan(plan);

export default defineConfig({
  site: config.site.baseUrl,
  output: 'static',
  /* Builds running side by side each name their own cache; the default sits in node_modules, which checkouts may share. */
  ...(process.env.OMNISTAX_CACHE_DIR ? { cacheDir: process.env.OMNISTAX_CACHE_DIR } : {}),
  build: { format: 'directory', assets: 'assets' },
  integrations: [svelte(), content(config.content.root, plan, mediaDirs, cacheDir)],
  /* Naming an allowed directory replaces Vite's own list rather than adding to
     it, so the project is named beside the content: the books sit outside the
     project, and the project's src and node_modules must still be served. */
  vite: {
    server: { fs: { allow: ['.', config.content.root] } },
    /* Vite's dependency cache also defaults into node_modules; a shared one is rewritten under a running dev server. */
    ...(process.env.OMNISTAX_CACHE_DIR ? { cacheDir: `${process.env.OMNISTAX_CACHE_DIR}/vite` } : {}),
  },
});
