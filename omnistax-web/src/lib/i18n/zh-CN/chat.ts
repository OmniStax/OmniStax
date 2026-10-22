/* Simplified Chinese for en/chat.ts: one value per key, no more and no fewer
   (the type says so). Still the English text until Step 4 translates it.
   Chinese has one plural form, so a plural keeps only its other branch. */
import type { chat as source } from '../en/chat';

export const chat: Readonly<Record<keyof typeof source, string>> = {
  'chat.composer.message': 'Message',
  'chat.conversations.filter': 'Filter',
};
