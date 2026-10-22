/* Simplified Chinese for en/tips.ts: one value per key, no more and no fewer
   (the type says so). Still the English text until Step 4 translates it.
   Chinese has one plural form, so a plural keeps only its other branch. */
import type { tips as source } from '../en/tips';

export const tips: Readonly<Record<keyof typeof source, string>> = {
  'tips.drawing': 'Work notes and exercises by hand in the drawing view, with a tablet and pen.',
  'tips.drawing.action': 'New drawing',
};
