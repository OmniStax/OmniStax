/* English UI text for src/components/views/Explorer.svelte, src/components/explorer/, src/lib/explorer/.

   Keys are dotted, area.component.thing ('explorer.…'), sorted inside the file;
   the value is the English the reader sees, a template of index.ts (format):
   {name} placeholders and {n, plural, one {…} other {…}} branches. The
   extraction agent that owns these sources fills this file; every key here
   needs a value in zh-CN/explorer.ts too, or npm run check fails. */
export const explorer = {
  'explorer.findTextbook.size': '{chapters, plural, one {# chapter} other {# chapters}}, {sections, plural, one {# section} other {# sections}}',
  'explorer.findTextbook.title': 'Find a textbook',
  'explorer.import': 'Import',
  'explorer.title': 'Explorer',
} as const;
