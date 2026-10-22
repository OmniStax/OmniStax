/* English UI text for src/components/Settings.svelte, src/components/settings/, src/lib/settings/.

   Keys are dotted, area.component.thing ('settings.…'), sorted inside the file;
   the value is the English the reader sees, a template of index.ts (format):
   {name} placeholders and {n, plural, one {…} other {…}} branches. The
   extraction agent that owns these sources fills this file; every key here
   needs a value in zh-CN/settings.ts too, or npm run check fails. */
export const settings = {
  'settings.saved': 'Settings are saved in this browser.',
  'settings.search.placeholder': 'Search settings',
  'settings.title': 'Settings',
} as const;
