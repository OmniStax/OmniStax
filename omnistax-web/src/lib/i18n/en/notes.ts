/* English UI text for src/components/notes/, src/lib/notes/.

   Keys are dotted, area.component.thing ('notes.…'), sorted inside the file;
   the value is the English the reader sees, a template of index.ts (format):
   {name} placeholders and {n, plural, one {…} other {…}} branches. The
   extraction agent that owns these sources fills this file; every key here
   needs a value in zh-CN/notes.ts too, or npm run check fails. */
export const notes = {
  'notes.tab.name': 'Note name',
  'notes.tab.rename': 'Rename',
} as const;
