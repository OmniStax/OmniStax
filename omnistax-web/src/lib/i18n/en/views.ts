/* English UI text for src/components/views/ (other than Explorer), src/lib/sections/, src/lib/search/, src/lib/hover/, src/lib/colours/.

   Keys are dotted, area.component.thing ('views.…'), sorted inside the file;
   the value is the English the reader sees, a template of index.ts (format):
   {name} placeholders and {n, plural, one {…} other {…}} branches. The
   extraction agent that owns these sources fills this file; every key here
   needs a value in zh-CN/views.ts too, or npm run check fails. */
export const views = {
  'views.annotations.lost': 'The text changed and this highlight no longer matches. Your note is kept.',
  'views.colours.redo': 'Redo',
  'views.colours.undo': 'Undo',
} as const;
