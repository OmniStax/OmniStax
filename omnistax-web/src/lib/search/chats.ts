/* One entry per message of every chat; a hit opens the chat at that message's branch. */
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

export type ChatEntry = { readonly chat: ChatId; readonly name: string; readonly message: MessageId; readonly role: Role; readonly at: number; readonly text: string };

/* What the store holds this session outruns what was read from disk; a chat gone from the index was deleted. */
export const currentChats = (stored: readonly Chat[], open: Readonly<Record<string, Chat>>, live: ReadonlySet<string>): readonly Chat[] => {
  const byId = new Map<string, Chat>(stored.map((c) => [c.id, c]));
  Object.values(open).forEach((c) => byId.set(c.id, c));
  return [...byId.values()].filter((c) => live.has(c.id));
};

export const chatEntries = (chats: readonly Chat[]): readonly ChatEntry[] =>
  chats.flatMap((c) => spokenIn(c).map((m) => ({ chat: c.id, name: c.name, message: m.id, role: m.role, at: m.at, text: m.text })));

/* Newest first: a reader looking for something they were told usually wants the last time. */
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
