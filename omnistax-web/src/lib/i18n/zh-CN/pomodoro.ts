/* Simplified Chinese for en/pomodoro.ts: one value per key, no more and no fewer
   (the type says so). Still the English text until Step 4 translates it.
   Chinese has one plural form, so a plural keeps only its other branch. */
import type { pomodoro as source } from '../en/pomodoro';

export const pomodoro: Readonly<Record<keyof typeof source, string>> = {
  'pomodoro.category.placeholder': 'Category name',
  'pomodoro.editor.day': 'Day',
};
