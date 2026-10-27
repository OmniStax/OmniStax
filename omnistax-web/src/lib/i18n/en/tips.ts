/* English UI text for src/lib/tips/.

   Keys are dotted, area.component.thing ('tips.…'), sorted inside the file;
   the value is the English the reader sees, a template of index.ts (format):
   {name} placeholders and {n, plural, one {…} other {…}} branches. The
   extraction agent that owns these sources fills this file; every key here
   needs a value in zh-CN/tips.ts too, or npm run check fails. */
export const tips = {
  'tips.drag': 'Drag concepts, figures and annotations straight into a Markdown note or an Ask AI chat.',
  'tips.drawing': 'Work notes and exercises by hand in the drawing view, with a tablet and pen.',
  'tips.drawing.action': 'New drawing',
  'tips.import': 'Upload your own files into OmniStax. PDFs can be annotated.',
  'tips.import.action': 'Import files',
  'tips.newGroup': '{mod}-click a link to open its page in a new group.',
  'tips.theme': 'Each book has a theme editor, behind the palette button on its row in the Explorer. Color coding for words is off by default.',
  'tips.toast.close': 'Close tip',
  'tips.toast.label': 'Tip',
  'tips.toast.next': 'Next tip',
  'tips.toast.previous': 'Previous tip',
  'tips.toast.stop': 'Stop showing tips',
} as const;
