/* English UI text for src/components/pomodoro/, src/lib/pomodoro/.

   Keys are dotted, area.component.thing ('pomodoro.…'), sorted inside the file;
   the value is the English the reader sees, a template of index.ts (format):
   {name} placeholders and {n, plural, one {…} other {…}} branches. The
   extraction agent that owns these sources fills this file; every key here
   needs a value in zh-CN/pomodoro.ts too, or npm run check fails. */
export const pomodoro = {
  'pomodoro.cancel': 'Cancel',
  'pomodoro.category.add': 'Add',
  'pomodoro.category.color': 'Color {color}',
  'pomodoro.category.empty': 'No categories yet.',
  'pomodoro.category.label': 'Categories',
  'pomodoro.category.new': 'New category…',
  'pomodoro.category.placeholder': 'Category name',
  'pomodoro.editor.add': 'Add session',
  'pomodoro.editor.day': 'Day',
  'pomodoro.editor.edit': 'Edit session',
  'pomodoro.editor.from': 'From',
  'pomodoro.editor.placeholder': 'What did you work on?',
  'pomodoro.editor.save': 'Save',
  'pomodoro.editor.summary': 'Summary',
  'pomodoro.editor.to': 'To',
  'pomodoro.lock.failing': 'Session failing in {secs} {n, plural, one {second} other {seconds}}',
  'pomodoro.row.actions': 'Actions for this session',
  'pomodoro.row.ask': 'Delete?',
  'pomodoro.row.delete': 'Delete',
  'pomodoro.row.edit': 'Edit',
  'pomodoro.row.no': 'No',
  'pomodoro.row.yes': 'Yes',
} as const;
