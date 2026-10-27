/* Which chat a Conversations page is showing in place of its list. The page is
   the list and one chat at a time, as a practice page is the dashboard and one
   session: a row opens its chat inside the page, and the way back is the list.
   What each page stands on is its own, kept by the page's item key, so the
   chat is still there when the reader comes back to the tab or reloads; a
   page whose tab is gone is forgotten as the layout settles.

   How the list is laid out, newest first or filed by book, is one choice for
   every page, and kept. */
import { readerWritesAllowed } from '../backup/guard';
import type { ItemKey } from '../layout/model';
import type { ChatId } from '../types/ids';

const KEY = 'omnistax-chat-pages-v1';
const BY_BOOK_KEY = 'omnistax-chats-by-book-v1';

const parse = (raw: unknown): Record<string, ChatId> =>
  typeof raw === 'object' && raw !== null && !Array.isArray(raw)
    ? Object.fromEntries(Object.entries(raw).filter((e): e is [string, string] => typeof e[1] === 'string' && /^[a-z0-9]{8}$/.test(e[1])) as [string, ChatId][])
    : {};

class ChatPages {
  shown = $state.raw<Readonly<Record<ItemKey, ChatId>>>({});
  byBook = $state(false);

  init(): void {
    try { this.shown = parse(JSON.parse(localStorage.getItem(KEY) ?? '{}')); } catch { this.shown = {}; }
    try { this.byBook = JSON.parse(localStorage.getItem(BY_BOOK_KEY) ?? 'false') === true; } catch { this.byBook = false; }
  }

  fileByBook(on: boolean): void {
    this.byBook = on;
    if (!readerWritesAllowed()) return;
    try { localStorage.setItem(BY_BOOK_KEY, JSON.stringify(on)); } catch { /* private mode */ }
  }

  of(page: ItemKey): ChatId | null { return this.shown[page] ?? null; }
  show(page: ItemKey, id: ChatId): void { this.shown = { ...this.shown, [page]: id }; this.save(); }
  back(page: ItemKey): void { if (page in this.shown) { const { [page]: _gone, ...rest } = this.shown; this.shown = rest; this.save(); } }
  prune(open: readonly ItemKey[]): void {
    const keep = new Set(open), entries = Object.entries(this.shown).filter(([page]) => keep.has(page));
    if (entries.length !== Object.keys(this.shown).length) { this.shown = Object.fromEntries(entries); this.save(); }
  }

  private save(): void { if (!readerWritesAllowed()) return; try { localStorage.setItem(KEY, JSON.stringify(this.shown)); } catch { /* private mode */ } }
}
export const chatPages = new ChatPages();
