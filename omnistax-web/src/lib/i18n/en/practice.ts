/* English UI text for src/components/practice/, src/lib/practice/.

   Keys are dotted, area.component.thing ('practice.…'), sorted inside the file;
   the value is the English the reader sees, a template of index.ts (format):
   {name} placeholders and {n, plural, one {…} other {…}} branches. The
   extraction agent that owns these sources fills this file; every key here
   needs a value in zh-CN/practice.ts too, or npm run check fails. */
export const practice = {
  'practice.builder.newSession': 'New session',
  'practice.dashboard.title': 'Practice',
  'practice.review.correct': 'Correct',
} as const;
