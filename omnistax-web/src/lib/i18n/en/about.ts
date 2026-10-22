/* English UI text for src/lib/content/pages.ts, src/pages/index.astro, src/pages/404.astro.

   Keys are dotted, area.component.thing ('about.…'), sorted inside the file;
   the value is the English the reader sees, a template of index.ts (format):
   {name} placeholders and {n, plural, one {…} other {…}} branches. The
   extraction agent that owns these sources fills this file; every key here
   needs a value in zh-CN/about.ts too, or npm run check fails. */
export const about = {
  'about.notFound.title': 'Page not found',
  'about.title': 'About',
} as const;
