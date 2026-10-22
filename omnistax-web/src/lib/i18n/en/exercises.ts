/* English UI text for src/components/exercises/, src/lib/exercises/.

   Keys are dotted, area.component.thing ('exercises.…'), sorted inside the file;
   the value is the English the reader sees, a template of index.ts (format):
   {name} placeholders and {n, plural, one {…} other {…}} branches. The
   extraction agent that owns these sources fills this file; every key here
   needs a value in zh-CN/exercises.ts too, or npm run check fails. */
export const exercises = {
  'exercises.card.backToScratch': 'Back to scratch work',
  'exercises.card.markAnswer': 'Mark your answer',
  'exercises.check.pickOne': 'Pick one.',
} as const;
