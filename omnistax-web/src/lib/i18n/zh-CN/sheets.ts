/* Simplified Chinese for en/sheets.ts: one value per key, no more and no fewer
   (the type says so). Still the English text until Step 4 translates it.
   Chinese has one plural form, so a plural keeps only its other branch. */
import type { sheets as source } from '../en/sheets';

export const sheets: Readonly<Record<keyof typeof source, string>> = {
  'sheets.elements.search': 'name or symbol',
  'sheets.grapher.zoomIn': 'Zoom in',
  'sheets.grapher.zoomOut': 'Zoom out',
};
