/* The book layer of the highlights for the book the shell stands on: its
   declared defaults from the manifest and the reader's choices for it, kept in
   this browser under one key per book that holds only what they changed. The
   about page stands on no book, and there the layer is all on and the settings
   show no block for it. The model is highlights.ts; this only reads and writes. */
import type { BookId } from '../types/ids';
import type { BookManifest } from '../content/schema';
import { readerWritesAllowed } from '../backup/guard';
import { type BookHighlights, type HighlightKey, type HighlightOverrides, HIGHLIGHTS_ON, bookLayer, parseOverrides, withChoice } from './highlights';

export const highlightsKey = (book: BookId | string): string => `omnistax-highlights-${book}`;
const read = (key: string): string | null => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, v: string): void => { if (!readerWritesAllowed()) return; try { localStorage.setItem(key, v); } catch { /* private mode */ } };
const remove = (key: string): void => { if (!readerWritesAllowed()) return; try { localStorage.removeItem(key); } catch { /* private mode */ } };
const readOverrides = (book: BookId): HighlightOverrides => { try { return parseOverrides(JSON.parse(read(highlightsKey(book)) ?? '{}')); } catch { return {}; } };

export type HighlightBook = { readonly id: BookId; readonly title: string; readonly defaults: BookHighlights };

class Highlights {
  book = $state.raw<HighlightBook | null>(null);
  overrides = $state.raw<HighlightOverrides>({});
  /* The book's defaults; a manifest cached from before books declared them falls back to all on. */
  get defaults(): BookHighlights { return this.book?.defaults ?? HIGHLIGHTS_ON; }
  /* The book layer, which the settings and with it the page combine with the masters. */
  get values(): BookHighlights { return bookLayer(this.defaults, this.overrides); }
  init(m: BookManifest): void {
    this.book = { id: m.id, title: m.title, defaults: { ...HIGHLIGHTS_ON, ...m.highlights } };
    this.overrides = readOverrides(m.id);
  }
  set(k: HighlightKey, on: boolean): void {
    const b = this.book; if (!b) return;
    this.overrides = withChoice(b.defaults, this.overrides, k, on);
    if (Object.keys(this.overrides).length) write(highlightsKey(b.id), JSON.stringify(this.overrides)); else remove(highlightsKey(b.id));
  }
  reset(k: HighlightKey): void { this.set(k, this.defaults[k]); }
}
export const highlights = new Highlights();
