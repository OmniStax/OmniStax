/* Simplified Chinese for en/pomodoro.ts: one value per key, no more and no fewer
   (the type says so). Still the English text until Step 4 translates it.
   Chinese has one plural form, so a plural keeps only its other branch. */
import type { pomodoro as source } from '../en/pomodoro';

export const pomodoro: Readonly<Record<keyof typeof source, string>> = {
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
  'pomodoro.lock.failing': 'Session failing in {secs} {n, plural, other {seconds}}',
  'pomodoro.row.actions': 'Actions for this session',
  'pomodoro.row.ask': 'Delete?',
  'pomodoro.row.delete': 'Delete',
  'pomodoro.row.edit': 'Edit',
  'pomodoro.row.no': 'No',
  'pomodoro.row.yes': 'Yes',
};
