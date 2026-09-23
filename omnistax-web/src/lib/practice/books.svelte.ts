/* The books the reader practises from that are not the book they are reading.
   A session's curriculum spans the library, so the exercises it draws may sit
   in another book entirely; this is the cache that holds one, fetched from the
   JSON the build wrote beside that book's pages.

   Nothing here is persisted: it is a copy of build output, cheaper to fetch
   again than to keep in step with a new build. What the reader owns — the
   attempts, the curriculum, the numbers — is in store.svelte.ts beside it. */
import type { BookManifest, ConceptDTO, ExerciseDTO } from '../content/schema';
import { bookId, sectionRef, type SectionId } from '../types/ids';
import { assumedBook } from '../sections/focus.svelte';
import { registry } from '../sections/registry.svelte';
import { library } from '../explorer/library.svelte';
import { bookBase, bookFiles, parseBookConcepts, parseBookExercises, parseManifest, type ForeignBook } from './books';

export type BookStatus = 'idle' | 'loading' | 'loaded' | 'failed';

class Books {
  loaded = $state.raw<Readonly<Record<string, ForeignBook>>>({});
  status = $state.raw<Readonly<Record<string, BookStatus>>>({});
  homeExercises = $state.raw<Readonly<Record<string, readonly ExerciseDTO[]>>>({});
  private loading: Partial<Record<string, Promise<void>>> = {};

  /* One foreign book, fetched once however many askers there are: its manifest,
     then every built chapter's concepts and every built section's problem set.
     A fetch that fails marks the book failed and keeps what did arrive, so a
     book with one missing file is still practised from. */
  load(book: string): Promise<void> {
    if (!book) return Promise.resolve();
    const pending = this.loading[book]; if (pending) return pending;
    if (this.status[book] === 'loaded') return Promise.resolve();
    this.setStatus(book, 'loading');
    const run = (book === registry.home ? this.fetchHome() : this.fetchBook(book)).finally(() => { delete this.loading[book]; });
    this.loading[book] = run;
    return run;
  }

  manifest(book: string): BookManifest | undefined { return book === registry.home ? registry.manifest(registry.home) : this.loaded[book]?.manifest; }
  /* What to call a book on screen: its manifest if it has arrived, the library
     row if the catalogue has, and the id itself if neither has. */
  title(book: string): string { return this.manifest(book)?.title || library.book(book)?.title || book; }
  /* A concept by its canonical id, wherever it was taught: the book being read
     first, then the books loaded beside it. */
  concept(id: string): ConceptDTO | undefined {
    return registry.concept(assumedBook(), id) ?? Object.values(this.loaded).flatMap((b) => b.concepts).find((c) => c.id === id);
  }
  /* A section's exercises: out of the registry for the book being read, since
     that section may be open in a tab, and out of the cache for any other. */
  exercises(book: string, section: SectionId): readonly ExerciseDTO[] | undefined {
    return book === registry.home ? this.homeExercises[section] ?? registry.state(sectionRef(bookId(book), section))?.exercises : this.loaded[book]?.exercises[section];
  }

  private setStatus(book: string, status: BookStatus): void { this.status = { ...this.status, [book]: status }; }

  /* The current book already has its manifest and concepts in memory. Fetching
     the one exercises.json the book keeps beside book.json avoids constructing
     every document and importing every figure module merely to populate the
     practice picker, and costs one request rather than one per section. */
  private async fetchHome(): Promise<void> {
    const book = registry.home;
    try {
      /* The manifest names the file; the empty manifest the shell starts on does not, and falls back. */
      const r = await fetch(registry.manifest(registry.home).exercises); if (!r.ok) throw new Error(String(r.status));
      this.homeExercises = parseBookExercises(await r.json());
      this.setStatus(book, 'loaded');
    } catch { this.setStatus(book, 'failed'); }
  }

  /* Any other book: its manifest, its concepts and its problem sets, three
     files the build wrote beside its pages. A file that failed marks the book
     failed and leaves what did arrive standing, so a book with one missing
     file is still practised from. */
  private async fetchBook(book: string): Promise<void> {
    const missed: string[] = [];
    const get = async (url: string): Promise<unknown> => {
      try { const r = await fetch(url); if (!r.ok) throw new Error(String(r.status)); return await r.json(); }
      catch { missed.push(url); return null; }
    };
    const manifest = parseManifest(await get(bookFiles(bookBase(book)).book));
    if (!manifest) { this.setStatus(book, 'failed'); return; }
    /* The manifest says where the book's own files are; book.json is the one address derived here. */
    const [concepts, exercises] = await Promise.all([get(manifest.concepts), get(manifest.exercises)]);
    const parsed = parseBookConcepts(concepts);
    this.loaded = {
      ...this.loaded,
      [book]: {
        /* The book file carries every concept once already, which is what the registry keeps for the book being read too. */
        manifest, concepts: parsed.concepts, coverage: Object.values(parsed.chapters).flatMap((c) => c.coverage),
        exercises: parseBookExercises(exercises),
      },
    };
    this.setStatus(book, missed.length ? 'failed' : 'loaded');
  }
}
export const books = new Books();
