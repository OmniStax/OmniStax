/* English UI text for src/lib/offline/ and the offline controls of src/components/explorer/.

   Keys are dotted, area.component.thing ('offline.…'), sorted inside the file;
   the value is the English the reader sees, a template of index.ts (format):
   {name} placeholders and {n, plural, one {…} other {…}} branches. The
   extraction agent that owns these sources fills this file; every key here
   needs a value in zh-CN/offline.ts too, or npm run check fails. */
export const offline = {
  'offline.available': 'Available offline',
  'offline.checkUpdates': 'Check for updates',
  'offline.lastCheck': 'Last successful check: {when}',
} as const;
