/* Simplified Chinese for en/drawer.ts: one value per key, no more and no fewer
   (the type says so). Still the English text until Step 4 translates it.
   Chinese has one plural form, so a plural keeps only its other branch. */
import type { drawer as source } from '../en/drawer';

export const drawer: Readonly<Record<keyof typeof source, string>> = {
  'drawer.pane.name': 'Drawing name',
  'drawer.toolbar.label': 'Drawing tools',
};
