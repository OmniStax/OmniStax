import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import { config } from './omnistax.config.ts';
import content from './content.mjs';

export default defineConfig({
  site: config.site.baseUrl,
  output: 'static',
  build: { format: 'directory', assets: 'assets' },
  integrations: [svelte(), content(config.content.root)],
  /* Naming an allowed directory replaces Vite's own list rather than adding to
     it, so the project is named beside the content: the book sits outside the
     project, and the project's src and node_modules must still be served. */
  vite: { server: { fs: { allow: ['.', config.content.root] } } },
});
