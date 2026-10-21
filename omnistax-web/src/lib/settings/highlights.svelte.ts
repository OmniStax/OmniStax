/* The book layer of the highlights for every book the shell knows: each book's
   declared defaults from its manifest and the reader's choices for it, kept in
   this browser under one key per book that holds only what they changed. Books
   come in as the colours store's do, through ensureBook as the registry learns
   each manifest; the Colours page reads and sets the layer of the book it has
   selected, where the reader changes it. `values` is the layer of the focused
   book, which the page being read is drawn by, so a change on its Theme page
   shows at once; the about page stands on no book, and there the layer is all on. The model is highlights.ts; this
   only reads and writes. */
import type { BookId } from '../types/ids';
import type { BookManifest } from '../content/schema';
import { readerWritesAllowed } from '../backup/guard';
import { focus } from '../sections/focus.svelte';
import { type BookHighlights, type HighlightKey, type HighlightOverrides, HIGHLIGHTS_ON, bookLayer, parseOverrides, withChoice } from './highlights';

export const highlightsKey = (book: BookId | string): string => `omnistax-highlights-${book}`;
const read = (key: string): string | null => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, v: string): void => { if (!readerWritesAllowed()) return; try { localStorage.setItem(key, v); } catch { /* private mode */ } };
const remove = (key: string): void => { if (!readerWritesAllowed()) return; try { localStorage.removeItem(key); } catch { /* private mode */ } };
const readOverrides = (book: BookId): HighlightOverrides => { try { return parseOverrides(JSON.parse(read(highlightsKey(book)) ?? '{}')); } catch { return {}; } };

export type HighlightBook = { readonly id: BookId; readonly title: string; readonly defaults: BookHighlights };
type Entry = { readonly book: HighlightBook; readonly overrides: HighlightOverrides };

class Highlights {
  private books = $state.raw<Readonly<Record<BookId, Entry>>>({});
  private home = $state.raw<BookId | null>(null);

  /* A book the shell has learnt of: its defaults, and what was saved for it.
     A manifest cached from before books declared them falls back to all on. */
  ensureBook(m: BookManifest): void {
    if (this.books[m.id]) return;
    this.books = { ...this.books, [m.id]: { book: { id: m.id, title: m.title, defaults: { ...HIGHLIGHTS_ON, ...m.highlights } }, overrides: readOverrides(m.id) } };
  }
  /* The book the shell stands on. */
  init(m: BookManifest): void { this.ensureBook(m); this.home = m.id; }

  /* Any known book, by id. */
  bookOf(id: BookId): HighlightBook | null { return this.books[id]?.book ?? null; }
  defaultsOf(id: BookId): BookHighlights { return this.bookOf(id)?.defaults ?? HIGHLIGHTS_ON; }
  /* The book layer: the reader's choice where they made one, else the book's default. */
  valuesOf(id: BookId): BookHighlights { const e = this.books[id]; return e ? bookLayer(e.book.defaults, e.overrides) : HIGHLIGHTS_ON; }

  /* The same for the book the shell stands on: the focused one, else the one it was served for.
     One layer on the root, so panes of two books side by side both wear the focused book's. */
  private get here(): BookId | null { return focus.book ?? this.home; }
  get book(): HighlightBook | null { const id = this.here; return id ? this.bookOf(id) : null; }
  get defaults(): BookHighlights { const id = this.here; return id ? this.defaultsOf(id) : HIGHLIGHTS_ON; }
  get values(): BookHighlights { const id = this.here; return id ? this.valuesOf(id) : HIGHLIGHTS_ON; }

  /* The reader sets one key of a book, the one the shell stands on unless another is named. */
  set(k: HighlightKey, on: boolean, id: BookId | null = this.home): void {
    const e = id ? this.books[id] : undefined; if (!e) return;
    const overrides = withChoice(e.book.defaults, e.overrides, k, on);
    this.books = { ...this.books, [e.book.id]: { book: e.book, overrides } };
    if (Object.keys(overrides).length) write(highlightsKey(e.book.id), JSON.stringify(overrides)); else remove(highlightsKey(e.book.id));
  }
  reset(k: HighlightKey, id: BookId | null = this.home): void { if (id) this.set(k, this.defaultsOf(id)[k], id); }
}
export const highlights = new Highlights();
