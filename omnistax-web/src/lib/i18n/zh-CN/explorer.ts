/* Simplified Chinese for en/explorer.ts: one value per key, no more and no fewer
   (the type says so). Still the English text until Step 4 translates it.
   Chinese has one plural form, so a plural keeps only its other branch. */
import type { explorer as source } from '../en/explorer';

export const explorer: Readonly<Record<keyof typeof source, string>> = {
  'explorer.findTextbook.size': '{chapters, plural, other {# chapters}}, {sections, plural, other {# sections}}',
  'explorer.findTextbook.title': 'Find a textbook',
  'explorer.import': 'Import',
  'explorer.title': 'Explorer',
};
