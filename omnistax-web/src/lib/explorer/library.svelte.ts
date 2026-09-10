/* The textbooks this build knows, and the ones the reader has taken into
   their tree. The list is fetched once from /library.json, which the build
   writes; the choice of what to add is kept in this browser. Adding a book
   also puts its row under User, so the two never drift apart. */
import { explorer } from './store.svelte';

export type LibraryStatus = 'idle' | 'loading' | 'loaded' | 'failed';
export type LibraryBookDTO = {
  readonly id: string; readonly title: string; readonly publisher: string; readonly authors: readonly string[];
  readonly chapters: number; readonly sections: number; readonly url: string;
};

const KEY = 'omnistax-library-v1';

const parseBook = (raw: unknown): LibraryBookDTO | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== 'string' || typeof o.title !== 'string') return null;
  return {
    id: o.id, title: o.title,
    publisher: typeof o.publisher === 'string' ? o.publisher : '',
    authors: Array.isArray(o.authors) ? o.authors.filter((a): a is string => typeof a === 'string') : [],
    chapters: Number(o.chapters) || 0, sections: Number(o.sections) || 0,
    url: typeof o.url === 'string' ? o.url : `/${o.id}/`,
  };
};
export const parseBooks = (raw: unknown): LibraryBookDTO[] => (Array.isArray(raw) ? raw.flatMap((b) => { const p = parseBook(b); return p ? [p] : []; }) : []);
const parseAdded = (raw: unknown): string[] => (Array.isArray(raw) ? raw.filter((id): id is string => typeof id === 'string') : []);

class Library {
  books = $state.raw<readonly LibraryBookDTO[]>([]);
  status = $state<LibraryStatus>('idle');
  added = $state.raw<readonly string[]>([]);

  /* Called after the explorer has loaded its tree. The book of the page being
     read is always added, so that the tree is never empty under a section. */
  init(currentBookId: string, title?: string): void {
    try { this.added = parseAdded(JSON.parse(localStorage.getItem(KEY) ?? '[]')); } catch { this.added = []; }
    if (currentBookId) this.add(currentBookId, title);
  }

  /* The catalogue is read once; a second call while it is in flight, or after
     it has arrived, does nothing. */
  async load(): Promise<void> {
    if (this.status === 'loading' || this.status === 'loaded') return;
    this.status = 'loading';
    try {
      const res = await fetch('/library.json');
      if (!res.ok) throw new Error(String(res.status));
      this.books = parseBooks(await res.json());
      this.status = 'loaded';
    } catch { this.status = 'failed'; }
  }

  has(id: string): boolean { return this.added.includes(id); }
  add(id: string, title?: string): void {
    if (!this.has(id)) { this.added = [...this.added, id]; this.save(); }
    explorer.addBook(id, title ?? this.books.find((b) => b.id === id)?.title ?? id);
  }
  book(id: string): LibraryBookDTO | undefined { return this.books.find((b) => b.id === id); }

  private save(): void { try { localStorage.setItem(KEY, JSON.stringify(this.added)); } catch { /* private mode */ } }
}
export const library = new Library();
