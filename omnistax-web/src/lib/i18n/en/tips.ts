/* English UI text for src/lib/tips/.

   Keys are dotted, area.component.thing ('tips.…'), sorted inside the file;
   the value is the English the reader sees, a template of index.ts (format):
   {name} placeholders and {n, plural, one {…} other {…}} branches. The
   extraction agent that owns these sources fills this file; every key here
   needs a value in zh-CN/tips.ts too, or npm run check fails. */
export const tips = {
  'tips.drag': 'Drag a concept, formula, definition, figure or sim straight into a note.',
  'tips.drawing': 'Work notes and exercises by hand in the drawing view, with a tablet and pen.',
  'tips.drawing.action': 'New drawing',
  'tips.import': 'Import your own PDFs, annotate them, and link their highlights into your notes.',
  'tips.import.action': 'Import files',
  'tips.newGroup': 'Hold Ctrl as you open most things, or middle-click them, to open them in a new group beside this one.',
  'tips.theme': 'Each book has a theme, behind the palette button on its row in the Explorer: the color of every quantity, the palette, and what it color codes.',
  'tips.toast.close': 'Close tip',
  'tips.toast.label': 'Tip',
  'tips.toast.next': 'Next tip',
  'tips.toast.previous': 'Previous tip',
  'tips.toast.stop': 'Stop showing tips',
} as const;
