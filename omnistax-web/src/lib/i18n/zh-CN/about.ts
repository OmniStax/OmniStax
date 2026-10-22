/* Simplified Chinese for en/about.ts: one value per key, no more and no fewer
   (the type says so). Still the English text until Step 4 translates it.
   Chinese has one plural form, so a plural keeps only its other branch. */
import type { about as source } from '../en/about';

export const about: Readonly<Record<keyof typeof source, string>> = {
  'about.notFound.title': 'Page not found',
  'about.title': 'About',
};
