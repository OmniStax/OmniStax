import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import { config } from './omnia.config.ts';
import contentWatch from './content-watch.mjs';

export default defineConfig({
  site: config.site.baseUrl,
  output: 'static',
  build: { format: 'directory', assets: 'assets' },
  integrations: [svelte(), contentWatch(config.content.root)],
  vite: { server: { fs: { allow: [config.content.root] } } },
});
