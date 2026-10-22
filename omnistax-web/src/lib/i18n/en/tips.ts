/* English UI text for src/lib/tips/.

   Keys are dotted, area.component.thing ('tips.…'), sorted inside the file;
   the value is the English the reader sees, a template of index.ts (format):
   {name} placeholders and {n, plural, one {…} other {…}} branches. The
   extraction agent that owns these sources fills this file; every key here
   needs a value in zh-CN/tips.ts too, or npm run check fails. */
export const tips = {
  'tips.drawing': 'Work notes and exercises by hand in the drawing view, with a tablet and pen.',
  'tips.drawing.action': 'New drawing',
} as const;
