/* Simplified Chinese for en/shell.ts: one value per key, no more and no fewer
   (the type says so). Still the English text until Step 4 translates it.
   Chinese has one plural form, so a plural keeps only its other branch. */
import type { shell as source } from '../en/shell';

export const shell: Readonly<Record<keyof typeof source, string>> = {
  'shell.close': 'Close',
  'shell.docGroup.empty': 'Nothing open. Press + to open a section.',
};
