/* Simplified Chinese for en/views.ts: one value per key, no more and no fewer
   (the type says so). Still the English text until Step 4 translates it.
   Chinese has one plural form, so a plural keeps only its other branch. */
import type { views as source } from '../en/views';

export const views: Readonly<Record<keyof typeof source, string>> = {
  'views.annotations.lost': 'The text changed and this highlight no longer matches. Your note is kept.',
  'views.colours.redo': 'Redo',
  'views.colours.undo': 'Undo',
};
