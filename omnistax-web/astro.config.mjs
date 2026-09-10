import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import { config } from './omnistax.config.ts';
import content from './content.mjs';

export default defineConfig({
  site: config.site.baseUrl,
  output: 'static',
  build: { format: 'directory', assets: 'assets' },
  integrations: [svelte(), content(config.content.root)],
  vite: { server: { fs: { allow: [config.content.root] } } },
});
