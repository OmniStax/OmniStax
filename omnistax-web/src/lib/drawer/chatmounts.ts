/* The whole-chat cards of one rendered note, each filled with the live tree.
   The renderer leaves a card naming the chat; the note fills it here, keeps
   the mount across passes, and lets go of the ones it no longer holds. */
import { mount, unmount } from 'svelte';

type ChatEmbedComponent = typeof import('../../components/drawer/ChatEmbed.svelte').default;
type Live = { readonly root: HTMLElement; readonly app: Record<string, unknown> };

const CARD = '.chat-tree-embed[data-chat-tree]';

let component: ChatEmbedComponent | null = null;
const load = (): Promise<ChatEmbedComponent> =>
  component ? Promise.resolve(component) : import('../../components/drawer/ChatEmbed.svelte').then((m) => (component = m.default));

export class ChatMounts {
  private live = new Map<string, Live>();

  fill(host: HTMLElement): void {
    const cards = [...host.querySelectorAll<HTMLElement>(CARD)];
    if (!cards.length) { this.releaseAll(); return; }
    void load().then((C) => {
      const shown = new Set<string>();
      const seen: Record<string, number> = {};
      for (const card of cards) {
        if (!card.isConnected) continue;
        const id = card.dataset.chatTree ?? '';
        const key = `${id}#${(seen[id] = (seen[id] ?? -1) + 1)}`;
        const m = this.live.get(key) ?? this.mount(C, id);
        this.live.set(key, m);
        shown.add(key);
        if (m.root.parentElement !== card) card.replaceChildren(m.root);
      }
      [...this.live.keys()].filter((k) => !shown.has(k)).forEach((k) => this.drop(k));
    });
  }

  releaseAll(): void { [...this.live.keys()].forEach((k) => this.drop(k)); }

  private mount(C: ChatEmbedComponent, chat: string): Live {
    const root = document.createElement('div');
    return { root, app: mount(C, { target: root, props: { chat } }) };
  }

  private drop(key: string): void {
    const m = this.live.get(key);
    if (!m) return;
    this.live.delete(key);
    void unmount(m.app);
    m.root.remove();
  }
}
