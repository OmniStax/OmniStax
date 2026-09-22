/* Opening a chat, and the one thing that arrives from outside one: the words
   the reader selected on a page and pressed "Ask AI" on. The selection is left
   here for the chat tab to pick up, because the highlight bar has no hold on a
   tab that may not even be mounted yet — it says which chat is meant, and the
   tab takes the words when it is there. */
import { layoutStore } from '../layout/store.svelte';
import { openInSplit, split } from '../layout/model';
import { chatItem, itemKey, type ChatId } from '../types/ids';
import { chats } from './store.svelte';

/* A chat of its own, opened in a split to the right of what is being read,
   like a page of one of the middle four views: every asking opens another. */
export const newChatTab = (): ChatId => {
  const chat = chats.create();
  layoutStore.apply((l) => split(l, l.focus, 'right', chatItem(chat.id)));
  return chat.id;
};

/* An existing chat, shown where it already stands or opened beside what is
   being read. */
export const showChat = (id: ChatId): void => {
  layoutStore.apply((l) => openInSplit(l, chatItem(id)));
};

/* The chats that stand open as tabs, in the order the groups hold them. */
export const openChatTabs = (): readonly ChatId[] =>
  layoutStore.layout.groups.flatMap((g) => g.tabs.flatMap((t) => { const m = /^chat:([a-z0-9]{8})$/.exec(t); return m ? [m[1] as ChatId] : []; }));

/* The words waiting for a chat: one message per chat, taken by the tab and
   cleared as it takes them. */
class Pending {
  words = $state.raw<Readonly<Record<string, string>>>({});

  put(id: ChatId, text: string): void { this.words = { ...this.words, [id]: text }; }
  take(id: ChatId): string { const text = this.words[id] ?? ''; if (text) { const { [id]: _gone, ...rest } = this.words; this.words = rest; } return text; }
}
export const pending = new Pending();

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
