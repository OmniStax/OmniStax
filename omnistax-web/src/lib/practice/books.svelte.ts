/* The books the reader practises from. A session's curriculum spans the
   library, so the exercises it draws may sit in any book; this is the cache
   that holds one, fetched from the JSON the build wrote beside that book's
   pages. Every book, the one being read included, loads the same way.

   Nothing here is persisted: it is a copy of build output, cheaper to fetch
   again than to keep in step with a new build. What the reader owns — the
   attempts, the curriculum, the numbers — is in store.svelte.ts beside it. */
import type { BookManifest, ConceptDTO, ExerciseDTO } from '../content/schema';
import { bookId, sectionRef, type SectionId } from '../types/ids';
import { registry } from '../sections/registry.svelte';
import { library } from '../explorer/library.svelte';
import { bookBase, bookFiles, parseBookConcepts, parseBookExercises, parseManifest, type ForeignBook } from './books';

export type BookStatus = 'idle' | 'loading' | 'loaded' | 'failed';

class Books {
  loaded = $state.raw<Readonly<Record<string, ForeignBook>>>({});
  status = $state.raw<Readonly<Record<string, BookStatus>>>({});
  private loading: Partial<Record<string, Promise<void>>> = {};

  /* One book, fetched once however many askers there are: its manifest, then
     every built chapter's concepts and every built section's problem set. */
  load(book: string): Promise<void> {
    if (!book) return Promise.resolve();
    const pending = this.loading[book]; if (pending) return pending;
    if (this.status[book] === 'loaded') return Promise.resolve();
    this.setStatus(book, 'loading');
    const run = this.fetchBook(book).finally(() => { delete this.loading[book]; });
    this.loading[book] = run;
    return run;
  }

  /* The registry's manifest when it holds the book, since it is the full one. */
  manifest(book: string): BookManifest | undefined {
    const id = bookId(book);
    return registry.hasBook(id) ? registry.manifest(id) : this.loaded[book]?.manifest;
  }
  /* What to call a book on screen: its manifest if it has arrived, the library
     row if the catalogue has, and the id itself if neither has. */
  title(book: string): string { return this.manifest(book)?.title || library.book(book)?.title || book; }
  /* A concept by its canonical id: out of the named book first, then any book loaded. */
  concept(id: string, book?: string): ConceptDTO | undefined {
    const own = book ? registry.concept(bookId(book), id) ?? this.loaded[book]?.concepts.find((c) => c.id === id) : undefined;
    return own ?? Object.values(this.loaded).flatMap((b) => b.concepts).find((c) => c.id === id);
  }
  /* The first loaded book that teaches a concept. */
  bookOf(id: string): string | undefined { return Object.entries(this.loaded).find(([, b]) => b.concepts.some((c) => c.id === id))?.[0]; }
  /* A section's exercises: out of the cache, else out of the registry, since that section may be open in a tab. */
  exercises(book: string, section: SectionId): readonly ExerciseDTO[] | undefined {
    return this.loaded[book]?.exercises[section] ?? registry.state(sectionRef(bookId(book), section))?.exercises;
  }

  private setStatus(book: string, status: BookStatus): void { this.status = { ...this.status, [book]: status }; }

  /* Its manifest, its concepts and its problem sets, three files the build
     wrote beside its pages. A file that failed marks the book failed and
     leaves what did arrive standing, so a book with one missing file is still
     practised from. */
  private async fetchBook(book: string): Promise<void> {
    const missed: string[] = [];
    const get = async (url: string): Promise<unknown> => {
      try { const r = await fetch(url); if (!r.ok) throw new Error(String(r.status)); return await r.json(); }
      catch { missed.push(url); return null; }
    };
    const manifest = parseManifest(await get(bookFiles(bookBase(book)).book));
    if (!manifest) { this.setStatus(book, 'failed'); return; }
    const [concepts, exercises] = await Promise.all([get(manifest.concepts), get(manifest.exercises)]);
    const parsed = parseBookConcepts(concepts);
    this.loaded = {
      ...this.loaded,
      [book]: {
        manifest, concepts: parsed.concepts, coverage: Object.values(parsed.chapters).flatMap((c) => c.coverage),
        exercises: parseBookExercises(exercises),
      },
    };
    this.setStatus(book, missed.length ? 'failed' : 'loaded');
  }
}
export const books = new Books();
