/* The chats as something the search can read. A book comes to the search as a
   corpus of what the book names and what it says; a chat is neither, so it is
   a corpus of its own: one entry per message, found by the words in it, and a
   hit that opens the chat at that message's branch.

   It stands apart from `model.ts` and `index.ts` on purpose. The search view is
   being reworked beside this to read a list of sources rather than a list of
   books, and when that lands this module is one more source in it; until then
   it is a pure function the view can call without anything else moving, and
   nothing in the book search has been disturbed to make room for it. */
import { excerpt, wordsOf } from './model';
import type { Piece } from '../commands/pieces';
import { spokenIn, type Chat, type MessageId, type Role } from '../chat/model';
import type { ChatId } from '../types/ids';

export type ChatHit = {
  readonly kind: 'chat';
  readonly chat: ChatId;
  readonly name: string;
  readonly message: MessageId;
  readonly role: Role;
  readonly at: number;
  readonly excerpt: readonly Piece[];
};

/* One entry per message with words in it: the chat's name comes along so a hit
   can say which conversation it was in without reading the chat again. */
export type ChatEntry = { readonly chat: ChatId; readonly name: string; readonly message: MessageId; readonly role: Role; readonly at: number; readonly text: string };

export const chatEntries = (chats: readonly Chat[]): readonly ChatEntry[] =>
  chats.flatMap((c) => spokenIn(c).map((m) => ({ chat: c.id, name: c.name, message: m.id, role: m.role, at: m.at, text: m.text })));

/* Every word of the query must be in the message, as it must be in a block of
   the book's prose; the newest messages come first, since a reader looking for
   something they were told is usually looking for the last time they were told
   it. `cap` keeps the list readable beside the book's own hits. */
export const CHAT_CAP = 40;

export const findInChats = (entries: readonly ChatEntry[], query: string, cap = CHAT_CAP): readonly ChatHit[] => {
  const words = wordsOf(query);
  if (words.length === 0) return [];
  return [...entries]
    .filter((e) => { const text = e.text.toLowerCase(); return words.every((w) => text.includes(w)); })
    .sort((a, b) => b.at - a.at)
    .slice(0, cap)
    .map((e) => ({ kind: 'chat' as const, chat: e.chat, name: e.name, message: e.message, role: e.role, at: e.at, excerpt: excerpt(e.text, words) }));
};
