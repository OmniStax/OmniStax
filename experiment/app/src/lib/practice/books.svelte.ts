/* The books the reader practises from that are not the book they are reading.
   A session's curriculum spans the library, so the exercises it draws may sit
   in another book entirely; this is the cache that holds one, fetched from the
   JSON the build wrote beside that book's pages.

   Nothing here is persisted: it is a copy of build output, cheaper to fetch
   again than to keep in step with a new build. What the reader owns — the
   attempts, the curriculum, the numbers — is in store.svelte.ts beside it. */
import type { BookManifest, ConceptDTO, ExerciseDTO } from '../content/schema';
import type { SectionId } from '../types/ids';
import { registry } from '../sections/registry.svelte';
import { library } from '../explorer/library.svelte';
import { builtSections, parseConcepts, parseExercises, parseManifest, type ForeignBook } from './books';

export type BookStatus = 'idle' | 'loading' | 'loaded' | 'failed';

class Books {
  loaded = $state.raw<Readonly<Record<string, ForeignBook>>>({});
  status = $state.raw<Readonly<Record<string, BookStatus>>>({});
  private loading: Partial<Record<string, Promise<void>>> = {};

  /* One foreign book, fetched once however many askers there are: its manifest,
     then every built chapter's concepts and every built section's problem set.
     A fetch that fails marks the book failed and keeps what did arrive, so a
     book with one missing file is still practised from. */
  load(book: string): Promise<void> {
    if (!book || book === registry.manifest.id) return Promise.resolve();
    const pending = this.loading[book]; if (pending) return pending;
    if (this.status[book] === 'loaded') return Promise.resolve();
    this.setStatus(book, 'loading');
    const run = this.fetchBook(book).finally(() => { delete this.loading[book]; });
    this.loading[book] = run;
    return run;
  }

  manifest(book: string): BookManifest | undefined { return book === registry.manifest.id ? registry.manifest : this.loaded[book]?.manifest; }
  /* What to call a book on screen: its manifest if it has arrived, the library
     row if the catalogue has, and the id itself if neither has. */
  title(book: string): string { return this.manifest(book)?.title || library.book(book)?.title || book; }
  /* A concept by its canonical id, wherever it was taught: the book being read
     first, then the books loaded beside it. */
  concept(id: string): ConceptDTO | undefined {
    return registry.concept(id) ?? Object.values(this.loaded).flatMap((b) => b.concepts).find((c) => c.id === id);
  }
  /* A section's exercises: out of the registry for the book being read, since
     that section may be open in a tab, and out of the cache for any other. */
  exercises(book: string, section: SectionId): readonly ExerciseDTO[] | undefined {
    return book === registry.manifest.id ? registry.sections[section]?.exercises : this.loaded[book]?.exercises[section];
  }

  private setStatus(book: string, status: BookStatus): void { this.status = { ...this.status, [book]: status }; }

  private async fetchBook(book: string): Promise<void> {
    const missed: string[] = [];
    const get = async (url: string): Promise<unknown> => {
      try { const r = await fetch(url); if (!r.ok) throw new Error(String(r.status)); return await r.json(); }
      catch { missed.push(url); return null; }
    };
    const manifest = parseManifest(await get(`/${book}/book.json`));
    if (!manifest) { this.setStatus(book, 'failed'); return; }
    const chapters = manifest.chapters.filter((c) => c.concepts && c.sections.some((s) => s.built));
    const parsed = await Promise.all(chapters.map(async (c) => parseConcepts(await get(c.concepts))));
    const sections = builtSections(manifest).filter((s) => s.url);
    const exercises = await Promise.all(sections.map(async (s) => [s.id, parseExercises(await get(`${s.url}exercises.json`))] as const));
    this.loaded = {
      ...this.loaded,
      [book]: {
        manifest, concepts: parsed.flatMap((p) => p.concepts), coverage: parsed.flatMap((p) => p.coverage),
        exercises: Object.fromEntries(exercises),
      },
    };
    this.setStatus(book, missed.length ? 'failed' : 'loaded');
  }
}
export const books = new Books();
