/* English UI text for src/components/drawer/, src/lib/drawer/.

   Keys are dotted, area.component.thing ('drawer.…'), sorted inside the file;
   the value is the English the reader sees, a template of index.ts (format):
   {name} placeholders and {n, plural, one {…} other {…}} branches. The
   extraction agent that owns these sources fills this file; every key here
   needs a value in zh-CN/drawer.ts too, or npm run check fails. */
export const drawer = {
  'drawer.pane.name': 'Drawing name',
  'drawer.toolbar.label': 'Drawing tools',
} as const;
