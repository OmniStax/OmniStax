/* English UI text for src/components/pomodoro/, src/lib/pomodoro/.

   Keys are dotted, area.component.thing ('pomodoro.…'), sorted inside the file;
   the value is the English the reader sees, a template of index.ts (format):
   {name} placeholders and {n, plural, one {…} other {…}} branches. The
   extraction agent that owns these sources fills this file; every key here
   needs a value in zh-CN/pomodoro.ts too, or npm run check fails. */
export const pomodoro = {
  'pomodoro.category.placeholder': 'Category name',
  'pomodoro.editor.day': 'Day',
} as const;
