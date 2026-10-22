/* English UI text for src/components/chat/, src/lib/chat/.

   Keys are dotted, area.component.thing ('chat.…'), sorted inside the file;
   the value is the English the reader sees, a template of index.ts (format):
   {name} placeholders and {n, plural, one {…} other {…}} branches. The
   extraction agent that owns these sources fills this file; every key here
   needs a value in zh-CN/chat.ts too, or npm run check fails. */
export const chat = {
  'chat.composer.message': 'Message',
  'chat.conversations.filter': 'Filter',
} as const;
