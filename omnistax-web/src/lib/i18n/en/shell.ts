/* English UI text for src/components/{Shell,Rail,Sidebar,ViewBox,DocGroup,TabStrip,Pane,Palette,Browser,HighlightBar,Hover,Tooltip,SplitTree,SpotCurve,ShellLoader}.svelte, src/components/ui/, src/lib/layout/, src/lib/icons.ts, src/lib/history/, src/lib/voice*.ts, src/lib/storage/, src/lib/backup/.

   Keys are dotted, area.component.thing ('shell.…'), sorted inside the file;
   the value is the English the reader sees, a template of index.ts (format):
   {name} placeholders and {n, plural, one {…} other {…}} branches. The
   extraction agent that owns these sources fills this file; every key here
   needs a value in zh-CN/shell.ts too, or npm run check fails. */
export const shell = {
  'shell.close': 'Close',
  'shell.docGroup.empty': 'Nothing open. Press + to open a section.',
} as const;
