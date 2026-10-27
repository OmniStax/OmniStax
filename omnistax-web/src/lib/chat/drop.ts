/* Something dropped on a chat. A row of a panel, a figure's head, a concept off
   the map, a highlight or a bubble of another chat drags out as the words that
   embed it, `![[concept:college-physics-2e/16.1:hooke]]`, which a note writes
   where it lands; a chat makes of them the chip the picker would have made for
   the same thing, with everything it sends read in. Words that name nothing a
   chip can stand for are left to be typed into the composer as they are. */
import { parseLink, linkInner, type Link } from '../notes/md/links';
import { rowOfLink } from '../picker/sources';
import { registry } from '../sections/registry.svelte';
import { focus } from '../sections/focus.svelte';
import { books } from '../practice/books.svelte';
import { bookId, chatId, sectionId, sectionRef } from '../types/ids';
import { chip, type Chip } from './context';
import { chipOfRow } from './library';
import { chats } from './store.svelte';
import { firstWords, messageId, messageOf } from './model';
import { speakerOf } from './tree';

const EMBED = /^!?\[\[([^\]\n]+)\]\]$/;

/* The link a drop carries, when what it carries is one link and nothing else. */
export const linkOfDrop = (text: string): Link | null => {
  const m = EMBED.exec(text.trim());
  return m ? parseLink(m[1]) : null;
};

/* What a thing of a book needs fetched before its row can be read: the book's
   manifest, the chapter's tables, the problem sets and the section itself. */
const fetchFor = async (link: Link): Promise<void> => {
  if (!('section' in link)) return;
  const book = bookId(link.book ?? focus.book ?? ''); if (!book) return;
  await registry.ensureBook(book).catch(() => null);
  const ref = sectionRef(book, sectionId(link.section));
  const ch = registry.chapterOf(ref);
  await Promise.all([
    ch ? registry.loadChapter(book, ch.dir) : undefined,
    link.kind === 'exercise' ? books.load(book) : undefined,
    link.kind === 'figure' || link.kind === 'section' ? registry.load(ref) : undefined,
  ].map((p) => p?.catch(() => undefined)));
};

export const chipOfLink = async (link: Link): Promise<Chip | null> => {
  if (link.kind === 'chat' && link.message !== undefined) {
    const chat = await chats.load(chatId(link.chat)).catch(() => null);
    const m = chat ? messageOf(chat, messageId(link.message)) : null;
    return m && m.text.trim() ? chip('message', linkInner(link), `${speakerOf(m)} · ${firstWords(m.text, 8)}`, m.text) : null;
  }
  await fetchFor(link);
  const row = rowOfLink(link);
  return row ? chipOfRow(row) : null;
};
