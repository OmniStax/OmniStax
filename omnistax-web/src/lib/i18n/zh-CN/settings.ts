/* Simplified Chinese for en/settings.ts: one value per key, no more and no fewer
   (the type says so). Still the English text until Step 4 translates it.
   Chinese has one plural form, so a plural keeps only its other branch. */
import type { settings as source } from '../en/settings';

export const settings: Readonly<Record<keyof typeof source, string>> = {
  'settings.saved': 'Settings are saved in this browser.',
  'settings.search.placeholder': 'Search settings',
  'settings.title': 'Settings',
};
