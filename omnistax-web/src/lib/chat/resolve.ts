/* An answer is markdown, and it is read with the note renderer, so a model
   that writes `[[16.4]]` or `[[eq:16.1:eq-hooke]]` gives the reader a link into
   the book rather than a string of punctuation. The renderer knows nothing by
   itself: it asks a resolver, and this builds the one a chat needs, out of the
   same registry the note view reads.

   A chat resolves less than a note does. There are no pasted images in an
   answer and no highlights of the model's own, so those two answer nothing;
   what the book holds, and what the reader owns and might be pointed back at,
   answer as they do everywhere else. */
import { noteDocs } from '../notes/docs.svelte';
import { BookResolver } from '../notes/resolve';
import type { ChatId } from '../types/ids';
import type { Resolver } from '../notes/md/render';
import { chats } from './store.svelte';
import { firstWords, spokenIn } from './model';

export const chatBooks = new BookResolver();

export const chatResolver = (): Resolver => ({
  ...chatBooks.lookups(),
  note: (name) => noteDocs.byName(name)?.id ?? null,
  asset: () => null,
  /* A chat, and one message of it: what the card over a `[[chat:…]]` says.
     The index names every chat whether it has been opened or not; a message is
     only known once its chat has been read, and until then the card says the
     chat's name, which is still the truth about where the link goes. */
  chat: (id) => {
    const chat = chats.get(id as ChatId);
    const entry = chats.entry(id as ChatId);
    if (!chat && !entry) return null;
    return { name: chat?.name || entry?.name || 'Chat' };
  },
  chatMessage: (id, message) => {
    const chat = chats.get(id as ChatId); if (!chat) return null;
    const m = chat.messages[message as keyof typeof chat.messages];
    if (!m) return null;
    return { name: chat.name || 'Chat', role: m.role, line: firstWords(m.text, 18) };
  },
});

/* The first words of a chat, for a card that has nothing else to show: the
   opening question, which is what a reader remembers a chat by. */
export const openingOf = (id: ChatId): string => {
  const chat = chats.get(id);
  const first = chat ? spokenIn(chat)[0] : null;
  return first ? firstWords(first.text, 12) : '';
};
