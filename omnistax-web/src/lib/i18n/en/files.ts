/* English UI text for src/components/files/, src/lib/files/.

   Keys are dotted, area.component.thing ('files.…'), sorted inside the file;
   the value is the English the reader sees, a template of index.ts (format):
   {name} placeholders and {n, plural, one {…} other {…}} branches. The
   extraction agent that owns these sources fills this file; every key here
   needs a value in zh-CN/files.ts too, or npm run check fails. */
export const files = {
  'files.pdf.fitWidth': 'Fit width',
  'files.pdf.larger': 'Larger',
  'files.pdf.smaller': 'Smaller',
} as const;
