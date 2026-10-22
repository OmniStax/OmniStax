/* Simplified Chinese for en/practice.ts: one value per key, no more and no fewer
   (the type says so). Still the English text until Step 4 translates it.
   Chinese has one plural form, so a plural keeps only its other branch. */
import type { practice as source } from '../en/practice';

export const practice: Readonly<Record<keyof typeof source, string>> = {
  'practice.builder.newSession': 'New session',
  'practice.dashboard.title': 'Practice',
  'practice.review.correct': 'Correct',
};
