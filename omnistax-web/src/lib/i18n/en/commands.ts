/* English UI text for src/lib/commands/ (labels and group names; ids and chords stay).

   Keys are dotted, area.component.thing ('commands.…'), sorted inside the file;
   the value is the English the reader sees, a template of index.ts (format):
   {name} placeholders and {n, plural, one {…} other {…}} branches. The
   extraction agent that owns these sources fills this file; every key here
   needs a value in zh-CN/commands.ts too, or npm run check fails. */
export const commands = {
  'commands.focusGroup': 'Focus group {direction}',
  'commands.group.layout': 'Layout',
} as const;
