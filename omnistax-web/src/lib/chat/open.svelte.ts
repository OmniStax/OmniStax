/* Opening a chat, and the one thing that arrives from outside one: the words
   the reader selected on a page and pressed "Ask AI" on. The selection is left
   here for the chat tab to pick up, because the highlight bar has no hold on a
   tab that may not even be mounted yet — it says which chat is meant, and the
   tab takes the words when it is there. */
import { layoutStore } from '../layout/store.svelte';
import { openInFocus, openTab } from '../layout/model';
import { chatItem, itemKey, type ChatId } from '../types/ids';
import { chats } from './store.svelte';
import { focus } from '../sections/focus.svelte';
import type { MessageId } from './model';
import type { Chip } from './context';

/* A chat of its own, opened as a tab of the focused group,
   like a page of one of the middle four views: every asking opens another. */
export const newChatTab = (): ChatId => {
  const chat = chats.create(focus.book);
  layoutStore.apply((l) => openTab(l, chatItem(chat.id), l.focus));
  return chat.id;
};

/* An existing chat, shown where it already stands or opened as a tab of the
   focused group. */
export const showChat = (id: ChatId): void => {
  layoutStore.apply((l) => openInFocus(l, chatItem(id)));
};

/* The chats that stand open as tabs, in the order the groups hold them. */
export const openChatTabs = (): readonly ChatId[] =>
  layoutStore.layout.groups.flatMap((g) => g.tabs.flatMap((t) => { const m = /^chat:([a-z0-9]{8})$/.exec(t); return m ? [m[1] as ChatId] : []; }));

/* What waits for a chat from outside it: words for its composer, one message
   per chat, and chips for above it, taken by the tab as they arrive — a chip
   that is slow to gather, a section still being fetched, comes after the tab
   is already standing, and joins the ones it took first. */
class Pending {
  words = $state.raw<Readonly<Record<string, string>>>({});
  chips = $state.raw<Readonly<Record<string, readonly Chip[]>>>({});

  put(id: ChatId, text: string): void { this.words = { ...this.words, [id]: text }; }
  take(id: ChatId): string { const text = this.words[id] ?? ''; if (text) { const { [id]: _gone, ...rest } = this.words; this.words = rest; } return text; }
  give(id: ChatId, chips: readonly Chip[]): void { if (chips.length) this.chips = { ...this.chips, [id]: [...(this.chips[id] ?? []), ...chips] }; }
}
export const pending = new Pending();
/* The chips handed to a chat and not yet taken, taken now: the tab puts them
   up in place of the focused section. */
export const takeChips = (id: ChatId): readonly Chip[] | null => {
  const c = pending.chips[id]; if (!c) return null;
  const { [id]: _gone, ...rest } = pending.chips; pending.chips = rest;
  return c;
};

/* "Ask AI" on the highlight bar: the selection goes to the chat the reader
   already has open, and where they have none it opens one. A selection means
   nothing more than the words themselves — no chip, no section, no highlight. */
export const askAi = (selection: string): void => {
  const words = selection.replace(/\s+/g, ' ').trim();
  if (words === '') return;
  const open = openChatTabs();
  const id = open[0] ?? newChatTab();
  if (open.length) showChat(id);
  pending.put(id, `> ${words}\n\n`);
};

export const chatTabKey = (id: ChatId): string => itemKey(chatItem(id));

export const showChatAt = async (id: ChatId, message: MessageId): Promise<void> => {
  showChat(id);
  await chats.load(id);
  chats.goTo(id, message);
};
