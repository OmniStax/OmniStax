import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import { config } from './omnistax.config.ts';
import { chooseBooks, findBooks } from './src/lib/content/load.ts';
import content from './content.mjs';

/* Which books this build carries, resolved once here so that the integration
   watching and copying their media reads the same list the pages do. */
const books = chooseBooks(await findBooks(config.content.root), config.content.books);

export default defineConfig({
  site: config.site.baseUrl,
  output: 'static',
  build: { format: 'directory', assets: 'assets' },
  integrations: [svelte(), content(config.content.root, books.map((b) => b.dir))],
  /* Naming an allowed directory replaces Vite's own list rather than adding to
     it, so the project is named beside the content: the books sit outside the
     project, and the project's src and node_modules must still be served. */
  vite: { server: { fs: { allow: ['.', config.content.root] } } },
});
