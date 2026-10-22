/* English UI text for src/components/sheets/, src/lib/{sheets,cas,grapher}/.

   Keys are dotted, area.component.thing ('sheets.…'), sorted inside the file;
   the value is the English the reader sees, a template of index.ts (format):
   {name} placeholders and {n, plural, one {…} other {…}} branches. The
   extraction agent that owns these sources fills this file; every key here
   needs a value in zh-CN/sheets.ts too, or npm run check fails. */
export const sheets = {
  'sheets.elements.search': 'name or symbol',
  'sheets.grapher.zoomIn': 'Zoom in',
  'sheets.grapher.zoomOut': 'Zoom out',
} as const;
