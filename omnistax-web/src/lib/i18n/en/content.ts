/* English UI text for src/lib/content/{fragment,attribution,roles}.ts, src/layouts/*.astro: written into static pages in the book's language.

   Keys are dotted, area.component.thing ('content.…'), sorted inside the file;
   the value is the English the reader sees, a template of index.ts (format):
   {name} placeholders and {n, plural, one {…} other {…}} branches. The
   extraction agent that owns these sources fills this file; every key here
   needs a value in zh-CN/content.ts too, or npm run check fails. */
export const content = {
  'content.next': 'Next',
  'content.notes': 'Notes',
  'content.previous': 'Previous',
} as const;
