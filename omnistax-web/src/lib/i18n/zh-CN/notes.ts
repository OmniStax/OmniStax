/* Simplified Chinese for en/notes.ts: one value per key, no more and no fewer
   (the type says so). Still the English text until Step 4 translates it.
   Chinese has one plural form, so a plural keeps only its other branch. */
import type { notes as source } from '../en/notes';

export const notes: Readonly<Record<keyof typeof source, string>> = {
  'notes.tab.name': 'Note name',
  'notes.tab.rename': 'Rename',
};
