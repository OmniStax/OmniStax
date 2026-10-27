/* Every chat the reader has, read from IndexedDB once; the chats open this session come from the store. */
import { exportChats } from '../chat/db';
import { chats } from '../chat/store.svelte';
import type { Chat } from '../chat/model';
import { chatEntries, currentChats, type ChatEntry } from './chats';

class ChatCorpus {
  private stored = $state.raw<readonly Chat[]>([]);
  private asked = false;
  /* Every chat as it stands now, whole: what the mentions of a section read, chips and all. */
  readonly current: readonly Chat[] = $derived(currentChats(this.stored, chats.open, new Set(chats.index.map((e) => e.id))));
  readonly entries: readonly ChatEntry[] = $derived(chatEntries(this.current));

  async load(): Promise<void> {
    if (this.asked) return;
    this.asked = true;
    this.stored = await exportChats();
  }
}
export const chatCorpus = new ChatCorpus();
