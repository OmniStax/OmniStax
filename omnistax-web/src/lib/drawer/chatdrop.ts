/* A chat copied for pasting elsewhere. By reference it is the embed a note or
   a drawing draws live; plain, it is the path the chat stands on as Markdown,
   with what a drawing needs to lay the tree out as linked text boxes. */
import type { Chat } from '../chat/model';
import { markdownOf } from '../chat/tree';
import type { ChatId } from '../types/ids';
import { CHAT_MIME, chatClip } from './chatcopy';

type Clip = Readonly<Record<string, string>>;

/* A custom type reaches a later paste only when written in a copy event, so
   the copy is made through one; the plain text alone where that is refused. */
const put = async (clip: Clip): Promise<boolean> => {
  let held = false;
  const oncopy = (e: ClipboardEvent): void => {
    const data = e.clipboardData; if (!data) return;
    e.preventDefault();
    Object.entries(clip).forEach(([type, value]) => data.setData(type, value));
    held = true;
  };
  document.addEventListener('copy', oncopy, true);
  try { document.execCommand('copy'); } finally { document.removeEventListener('copy', oncopy, true); }
  if (held) return true;
  return navigator.clipboard?.writeText(clip['text/plain'] ?? '').then(() => true, () => false) ?? false;
};

export const chatReference = (id: ChatId): string => `![[chat:${id}]]`;

export const copyChatReference = (id: ChatId): Promise<boolean> => put({ 'text/plain': chatReference(id) });

export const copyChatPlain = (chat: Chat): Promise<boolean> => put({ 'text/plain': markdownOf(chat), [CHAT_MIME]: chatClip(chat.id) });
