/* Simplified Chinese for en/files.ts: one value per key, no more and no fewer
   (the type says so). Still the English text until Step 4 translates it.
   Chinese has one plural form, so a plural keeps only its other branch. */
import type { files as source } from '../en/files';

export const files: Readonly<Record<keyof typeof source, string>> = {
  'files.pdf.fitWidth': 'Fit width',
  'files.pdf.larger': 'Larger',
  'files.pdf.smaller': 'Smaller',
};
