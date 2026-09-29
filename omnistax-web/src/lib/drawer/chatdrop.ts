/* "Send to drawing" on a chat: a small chooser, then the chat lands on the
   drawing — referenced as one live item, or copied plain as cards and
   connectors — and the drawing opens. */
import { mount, unmount } from 'svelte';
import { chats } from '../chat/store.svelte';
import { explorer } from '../explorer/store.svelte';
import { layoutStore } from '../layout/store.svelte';
import { openInFocus } from '../layout/model';
import { drawingItem, type ChatId, type DrawingId } from '../types/ids';
import { addItem, type Drawing } from './model';
import { drawings } from './store.svelte';
import { createDrawing } from './edits';
import { chatItemAt, plainCopy } from './chatcopy';

export type ChatDropChoice = { readonly drawing: DrawingId | null; readonly plain: boolean };

/* Where the chat lands: a little in from the corner the reader last looked
   from, so it is on screen when the drawing opens. */
const landing = (d: Drawing): readonly [number, number] => [d.view.x + 60 / d.view.zoom, d.view.y + 60 / d.view.zoom];

const send = async (id: ChatId, choice: ChatDropChoice): Promise<void> => {
  const chat = await chats.load(id);
  const target = choice.drawing;
  if (target) await drawings.load(target);
  const d = target ? drawings.get(target) : createDrawing(null, explorer.uniqueName(null, chats.nameOf(id)));
  if (!d) return;
  const at = landing(d);
  const items = choice.plain ? plainCopy(chat, at) : [chatItemAt(chat, at)];
  drawings.put(items.reduce<Drawing>((acc, i) => addItem(acc, i), d));
  layoutStore.apply((l) => openInFocus(l, drawingItem(d.id)));
};

export const sendChatToDrawing = (chatId: ChatId): void => {
  if (typeof document === 'undefined') return;
  const host = document.createElement('div');
  document.body.appendChild(host);
  let app: Record<string, unknown> | null = null;
  const close = (): void => { if (app) void unmount(app); app = null; host.remove(); };
  void import('../../components/drawer/ChatDrop.svelte').then(({ default: ChatDrop }) => {
    app = mount(ChatDrop, {
      target: host,
      props: {
        name: chats.nameOf(chatId),
        oncancel: close,
        onpick: (c: ChatDropChoice) => { close(); void send(chatId, c); },
      },
    });
  });
};
