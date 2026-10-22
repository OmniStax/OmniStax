/* Simplified Chinese for en/tips.ts: one value per key, no more and no fewer
   (the type says so). Still the English text until Step 4 translates it.
   Chinese has one plural form, so a plural keeps only its other branch. */
import type { tips as source } from '../en/tips';

export const tips: Readonly<Record<keyof typeof source, string>> = {
  'tips.drag': 'Drag a concept, formula, definition, figure or sim straight into a note.',
  'tips.drawing': 'Work notes and exercises by hand in the drawing view, with a tablet and pen.',
  'tips.drawing.action': 'New drawing',
  'tips.import': 'Import your own PDFs, annotate them, and link their highlights into your notes.',
  'tips.import.action': 'Import files',
  'tips.newGroup': 'Ctrl-click or middle-click a section, note, drawing or link to open it in a new group beside this one.',
  'tips.theme': 'Each book has a theme, behind the palette button on its row in the Explorer: the color of every quantity, the palette, and what it color codes.',
  'tips.toast.close': 'Close tip',
  'tips.toast.label': 'Tip',
  'tips.toast.next': 'Next tip',
  'tips.toast.previous': 'Previous tip',
  'tips.toast.stop': 'Stop showing tips',
};
