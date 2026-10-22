/* Simplified Chinese for en/exercises.ts: one value per key, no more and no fewer
   (the type says so). Still the English text until Step 4 translates it.
   Chinese has one plural form, so a plural keeps only its other branch. */
import type { exercises as source } from '../en/exercises';

export const exercises: Readonly<Record<keyof typeof source, string>> = {
  'exercises.card.backToScratch': 'Back to scratch work',
  'exercises.card.markAnswer': 'Mark your answer',
  'exercises.check.pickOne': 'Pick one.',
};
