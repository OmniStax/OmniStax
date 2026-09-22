/* A chat the reader holds with a model of their own choosing. The conversation
   is a tree rather than a list, because a reader who asks again does not want
   what they asked before thrown away: editing a message or retrying an answer
   makes a sibling beside it, and the transcript on the screen is the path from
   the root down to `leaf`. Everything here is pure — a chat in, a chat out —
   so the branching can be checked without a browser and without a provider.

   The root is a silent anchor: a message of no words that nothing draws. It
   exists so that the reader's very first question has a parent like every
   other, and so two first questions are siblings of each other. */
import type { ChatId } from '../types/ids';
import type { Chip } from './context';

export type MessageId = string & { readonly __brand: 'MessageId' };
export const messageId = (s: string): MessageId => s as MessageId;
const base36 = (n: number): string => { let s = ''; while (s.length < n) s += Math.random().toString(36).slice(2); return s.slice(0, n); };
export const newMessageId = (): MessageId => messageId(base36(8));

export type Role = 'user' | 'assistant';
/* Where a message stands: written and whole, still arriving, stopped by the
   reader with the words that had come, or failed with the reason kept on it. */
export type MessageState = 'done' | 'streaming' | 'stopped' | 'failed';

export type Message = {
  readonly id: MessageId;
  readonly parent: MessageId | null;
  readonly role: Role;
  readonly text: string;
  readonly chips: readonly Chip[];
  readonly model?: string;
  readonly at: number;
  readonly state: MessageState;
  readonly error?: string;
};

export type Chat = {
  readonly id: ChatId;
  readonly name: string;
  readonly root: MessageId;
  readonly messages: Readonly<Record<MessageId, Message>>;
  readonly leaf: MessageId;
  readonly created: number;
  readonly updated: number;
};

export const newChat = (id: ChatId, at = Date.now()): Chat => {
  const root = newMessageId();
  const anchor: Message = { id: root, parent: null, role: 'user', text: '', chips: [], at, state: 'done' };
  return { id, name: '', root, messages: { [root]: anchor }, leaf: root, created: at, updated: at };
};

export const messageOf = (chat: Chat, id: MessageId): Message | null => chat.messages[id] ?? null;
export const isRoot = (chat: Chat, id: MessageId): boolean => id === chat.root;

/* The children of a message, oldest first, which is the order the pager counts
   them in: "2 of 3" is the second thing the reader tried. */
export const childrenOf = (chat: Chat, parent: MessageId): readonly Message[] =>
  Object.values(chat.messages).filter((m) => m.parent === parent).sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));

export const siblingsOf = (chat: Chat, id: MessageId): readonly Message[] => {
  const m = messageOf(chat, id);
  return m && m.parent !== null ? childrenOf(chat, m.parent) : [];
};

/* From the root down to a message, the root included. A message whose parent
   has gone — which nothing here does, but a stored chat might — stops the walk. */
export const pathTo = (chat: Chat, id: MessageId): readonly Message[] => {
  const out: Message[] = [];
  const seen = new Set<string>();
  let at: MessageId | null = id;
  while (at !== null && !seen.has(at)) {
    seen.add(at);
    const m = messageOf(chat, at); if (!m) break;
    out.unshift(m); at = m.parent;
  }
  return out;
};

/* What the reader is shown: the path to the leaf without the silent root. */
export const transcript = (chat: Chat): readonly Message[] => pathTo(chat, chat.leaf).filter((m) => m.id !== chat.root);

/* The end of a branch, following the newest child at every step: where moving
   the pager lands, since the reader means that branch as they last left it. */
export const latestLeafUnder = (chat: Chat, id: MessageId): MessageId => {
  let at = id;
  const seen = new Set<string>();
  for (;;) {
    if (seen.has(at)) return at;
    seen.add(at);
    const kids = childrenOf(chat, at);
    if (kids.length === 0) return at;
    at = kids[kids.length - 1].id;
  }
};

const put = (chat: Chat, m: Message, leaf = m.id): Chat =>
  ({ ...chat, messages: { ...chat.messages, [m.id]: m }, leaf, updated: Math.max(chat.updated, m.at) });

type Draft = { readonly role: Role; readonly text: string; readonly chips?: readonly Chip[]; readonly model?: string; readonly state?: MessageState; readonly at?: number };

/* One message under a parent, which becomes the leaf: this is the one way a
   message is ever added, so every add branches the same way. */
export const addUnder = (chat: Chat, parent: MessageId, d: Draft): { readonly chat: Chat; readonly id: MessageId } => {
  const id = newMessageId();
  /* Siblings are counted in the order they were made, and two made in the same
     millisecond would otherwise be counted in whatever order their ids fell in,
     so a message is never older than the one it follows. */
  const kin = childrenOf(chat, parent);
  const after = kin.length ? kin[kin.length - 1].at + 1 : 0;
  const at = Math.max(d.at ?? Date.now(), after);
  const m: Message = { id, parent, role: d.role, text: d.text, chips: d.chips ?? [], at, state: d.state ?? 'done', ...(d.model ? { model: d.model } : {}) };
  return { chat: named(put(chat, m)), id };
};

/* A chat is called by its first reader message until the reader renames it. */
export const firstWords = (text: string, words = 7): string => {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat === '') return '';
  const cut = flat.split(' ').slice(0, words).join(' ');
  return cut.length < flat.length ? `${cut}…` : cut;
};

const named = (chat: Chat): Chat => {
  if (chat.name !== '') return chat;
  const first = childrenOf(chat, chat.root)[0];
  return first && first.text.trim() !== '' ? { ...chat, name: firstWords(first.text) } : chat;
};

export const rename = (chat: Chat, name: string): Chat => ({ ...chat, name: name.trim(), updated: Date.now() });

export const ask = (chat: Chat, text: string, chips: readonly Chip[] = []): { readonly chat: Chat; readonly id: MessageId } =>
  addUnder(chat, chat.leaf, { role: 'user', text, chips });

export const answer = (chat: Chat, parent: MessageId, model: string): { readonly chat: Chat; readonly id: MessageId } =>
  addUnder(chat, parent, { role: 'assistant', text: '', model, state: 'streaming' });

/* Edit-and-resend and Retry are the same move: another child under the same
   parent, which the leaf follows. The old message stays where it was. */
export const resend = (chat: Chat, id: MessageId, text: string, chips?: readonly Chip[]): { readonly chat: Chat; readonly id: MessageId } => {
  const m = messageOf(chat, id);
  if (!m || m.parent === null) return { chat, id };
  return addUnder(chat, m.parent, { role: m.role, text, chips: chips ?? m.chips });
};

export const retry = (chat: Chat, id: MessageId, model: string): { readonly chat: Chat; readonly id: MessageId } => {
  const m = messageOf(chat, id);
  if (!m || m.parent === null) return { chat, id };
  return addUnder(chat, m.parent, { role: m.role, text: '', model, state: 'streaming' });
};

export const patch = (chat: Chat, id: MessageId, p: Partial<Message>): Chat => {
  const m = messageOf(chat, id); if (!m) return chat;
  return { ...chat, messages: { ...chat.messages, [id]: { ...m, ...p, id, parent: m.parent } }, updated: Date.now() };
};

export const grow = (chat: Chat, id: MessageId, delta: string): Chat => {
  const m = messageOf(chat, id); if (!m) return chat;
  return patch(chat, id, { text: m.text + delta });
};

export const finish = (chat: Chat, id: MessageId): Chat => patch(chat, id, { state: 'done' });
export const stop = (chat: Chat, id: MessageId): Chat => patch(chat, id, { state: 'stopped' });
export const fail = (chat: Chat, id: MessageId, error: string): Chat => patch(chat, id, { state: 'failed', error });

/* Moving the pager on a message: the nth sibling, and the leaf goes to the end
   of that branch as the reader last left it. */
export const chooseSibling = (chat: Chat, id: MessageId, index: number): Chat => {
  const kin = siblingsOf(chat, id);
  const target = kin[index];
  return target ? { ...chat, leaf: latestLeafUnder(chat, target.id) } : chat;
};

/* Where the reader stands among the things they tried at this point. */
export type Pager = { readonly index: number; readonly count: number };
export const pagerOf = (chat: Chat, id: MessageId): Pager | null => {
  const kin = siblingsOf(chat, id);
  if (kin.length < 2) return null;
  return { index: kin.findIndex((m) => m.id === id), count: kin.length };
};

/* The breadcrumb over the transcript: one crumb per message on the path that
   has siblings, saying which of them is being read. The root's own children
   count, so two first questions make a crumb like any other fork. */
export type Crumb = { readonly id: MessageId; readonly role: Role; readonly words: string; readonly index: number; readonly count: number };
export const crumbsOf = (chat: Chat): readonly Crumb[] =>
  transcript(chat).flatMap((m) => {
    const p = pagerOf(chat, m.id);
    return p ? [{ id: m.id, role: m.role, words: firstWords(m.text, 4) || '(empty)', index: p.index, count: p.count }] : [];
  });

/* Every branch of the chat, named by the first words of the first message on
   it that diverged from any other: that is the word the reader would use for
   the branch, since everything above it is shared with its neighbours. */
export type Leaf = { readonly id: MessageId; readonly name: string; readonly at: number };
export const leavesOf = (chat: Chat): readonly Leaf[] =>
  Object.values(chat.messages)
    .filter((m) => childrenOf(chat, m.id).length === 0 && m.id !== chat.root)
    .sort((a, b) => a.at - b.at)
    .map((m) => {
      const path = pathTo(chat, m.id).filter((x) => x.id !== chat.root);
      const divergent = path.find((x) => siblingsOf(chat, x.id).length > 1) ?? path[0] ?? m;
      return { id: m.id, name: firstWords(divergent.text, 6) || '(empty)', at: m.at };
    });

/* What the picker and the search read a chat by: every message with words. */
export const spokenIn = (chat: Chat): readonly Message[] =>
  Object.values(chat.messages).filter((m) => m.id !== chat.root && m.text.trim() !== '').sort((a, b) => a.at - b.at);
