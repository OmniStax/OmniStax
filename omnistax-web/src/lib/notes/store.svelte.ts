/* The reader's notes over every book: highlights, each with a colour and an
   optional annotation, anchored to the text they mark. One list in memory;
   in this browser each book's notes are kept under that book's id. */
import type { Anchor } from './anchor';
import { sameSection, type BookId, type SectionRef, type DocKind } from '../types/ids';
import { history } from '../history/store.svelte';
import { readerWritesAllowed } from '../backup/guard';
import { bookOfNotesKey, notesKey, notesOfBook, parseNotes, type HlColor, type Note } from './stored';

export { HL_COLORS, type HlColor, type Note } from './stored';
const storedBooks = (): readonly BookId[] => {
  const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i) ?? '');
  return keys.flatMap((k) => { const b = bookOfNotesKey(k); return b ? [b] : []; });
};
const readBook = (book: BookId): Note[] => { try { return parseNotes(book, JSON.parse(localStorage.getItem(notesKey(book)) ?? '[]')); } catch { return []; } };
const newId = (): string => Math.random().toString(36).slice(2, 10);

class Notes {
  list = $state.raw<readonly Note[]>([]);
  /* bumps when marks must be repainted (a note added, removed or recoloured); annotation edits do not repaint */
  paintVersion = $state(0);
  editing = $state<string | null>(null);   /* the note whose annotation should take focus in the view */
  unresolved = $state.raw<ReadonlySet<string>>(new Set());
  /* every book this browser has kept notes for, so emptying one still writes its key */
  private books: ReadonlySet<BookId> = new Set();

  init(): void {
    try { this.books = new Set(storedBooks()); this.list = [...this.books].flatMap(readBook); } catch { this.list = []; }
  }
  add(ref: SectionRef, doc: DocKind, anchor: Anchor, color: HlColor): Note {
    const now = Date.now(); const n: Note = { id: newId(), book: ref.book, section: ref.section, doc, anchor, color, text: '', created: now, updated: now };
    this.record(`highlight in ${color}`, () => { this.list = [...this.list, n]; this.save(); this.paintVersion++; });
    return n;
  }
  get(id: string): Note | undefined { return this.list.find((n) => n.id === id); }
  setColor(id: string, color: HlColor): void { this.record('recolour highlight', () => { this.patch(id, { color }); this.paintVersion++; }); }
  /* Typing an annotation is one edit however many keystrokes it took, so long
     as they follow one another and stay with the same highlight. */
  setText(id: string, text: string): void { this.record('annotation', () => this.patch(id, { text }), `annotation:${id}`); }
  remove(id: string): void {
    if (!this.get(id)) return;
    this.record('remove highlight', () => { this.list = this.list.filter((n) => n.id !== id); this.save(); this.paintVersion++; if (this.editing === id) this.editing = null; });
  }
  forSection(ref: SectionRef): readonly Note[] { return this.list.filter((n) => sameSection(n, ref)); }
  setUnresolved(ref: SectionRef, ids: readonly string[]): void {
    const inSection = new Set(this.forSection(ref).map((note) => note.id));
    this.unresolved = new Set([...this.unresolved].filter((id) => !inSection.has(id)).concat(ids));
  }

  /* A change the reader can take back. The list is an immutable value, so the
     two sides of an edit are simply the list before and the list after: undoing
     an added highlight drops it, and undoing a removed one puts the very same
     note back, under the id its links are written with. */
  private record(label: string, change: () => void, coalesceKey?: string): void {
    const before = this.list;
    change();
    const after = this.list;
    if (after === before) return;
    const edit = { label, undo: () => this.restore(before), redo: () => this.restore(after) };
    if (coalesceKey) history.coalesce(coalesceKey, edit); else history.push(edit);
  }
  /* Put a whole list back without recording it: what undo and redo apply. */
  private restore(list: readonly Note[]): void {
    this.list = list; this.save(); this.paintVersion++;
    if (this.editing !== null && !this.get(this.editing)) this.editing = null;
  }
  private patch(id: string, p: Partial<Note>): void { this.list = this.list.map((n) => (n.id === id ? { ...n, ...p, updated: Date.now() } : n)); this.save(); }
  private save(): void {
    if (!readerWritesAllowed()) return;
    this.books = new Set([...this.books, ...this.list.map((n) => n.book)]);
    try { this.books.forEach((b) => localStorage.setItem(notesKey(b), JSON.stringify(notesOfBook(this.list, b)))); } catch { /* private mode */ }
  }
}
export const notes = new Notes();
