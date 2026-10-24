import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import { config } from './omnistax.config.ts';
import { chooseBooks, findBooks, mediaDirsOf } from './src/lib/content/load.ts';
import content from './content.mjs';

/* Which books this build carries, resolved once here so that the integration
   watching and copying their media reads the same list the pages do. A
   translation keeps no media of its own, so its source's folder is served and
   copied with it even when the source is not built. */
const found = await findBooks(config.content.root);
const books = chooseBooks(found, config.content.books);
const mediaDirs = mediaDirsOf(found, books);

export default defineConfig({
  site: config.site.baseUrl,
  output: 'static',
  /* Builds running side by side each name their own cache; the default sits in node_modules, which checkouts may share. */
  ...(process.env.OMNISTAX_CACHE_DIR ? { cacheDir: process.env.OMNISTAX_CACHE_DIR } : {}),
  build: { format: 'directory', assets: 'assets' },
  integrations: [svelte(), content(config.content.root, books.map((b) => b.dir), mediaDirs)],
  /* Naming an allowed directory replaces Vite's own list rather than adding to
     it, so the project is named beside the content: the books sit outside the
     project, and the project's src and node_modules must still be served. */
  vite: {
    server: { fs: { allow: ['.', config.content.root] } },
    /* Vite's dependency cache also defaults into node_modules; a shared one is rewritten under a running dev server. */
    ...(process.env.OMNISTAX_CACHE_DIR ? { cacheDir: `${process.env.OMNISTAX_CACHE_DIR}/vite` } : {}),
  },
});
