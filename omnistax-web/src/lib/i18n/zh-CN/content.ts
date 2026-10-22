/* Simplified Chinese for en/content.ts: one value per key, no more and no fewer
   (the type says so). Still the English text until Step 4 translates it.
   Chinese has one plural form, so a plural keeps only its other branch. */
import type { content as source } from '../en/content';

export const content: Readonly<Record<keyof typeof source, string>> = {
  'content.next': 'Next',
  'content.notes': 'Notes',
  'content.previous': 'Previous',
};
