/* The corpora the search reads: every book of the library, fetched the first
   time the reader searches and kept for the session. Every book is read the
   same way: its manifest through the registry, which registers its TeX, and
   the rest off the build beside its pages. Nothing here is persisted: it is a
   copy of build output, cheaper to fetch again than to keep in step. */
import { registry } from '../sections/registry.svelte';
import { focus } from '../sections/focus.svelte';
import { library } from '../explorer/library.svelte';
import { parseBookConcepts, parseBookFormulas } from '../practice/books';
import { bookPagesOf } from '../content/roles';
import type { BookManifest } from '../content/schema';
import { bookId } from '../types/ids';
import { parseIndex } from './books';
import { type Corpus, emptyCorpus } from './model';

/* Where every built page of a book is served, by its id. */
const urlsOf = (m: BookManifest): Readonly<Record<string, string>> => Object.fromEntries(bookPagesOf(m).filter((s) => s.built && s.url).map((s) => [s.id, s.url]));

export type CorpusStatus = 'idle' | 'loading' | 'loaded' | 'failed';

const get = async (url: string): Promise<unknown> => {
  try { const r = await fetch(url); if (!r.ok) throw new Error(String(r.status)); return await r.json(); } catch { return null; }
};

class Search {
  corpora = $state.raw<Readonly<Record<string, Corpus>>>({});
  status = $state.raw<Readonly<Record<string, CorpusStatus>>>({});
  private loading: Partial<Record<string, Promise<void>>> = {};

  /* Every book the library lists, in the library's order and the focused book first. */
  get books(): readonly string[] {
    const first = focus.book;
    return [first, ...library.books.map((b) => b.id).filter((id) => id !== first)];
  }
  /* The corpora that have arrived, in that order. */
  get loaded(): readonly Corpus[] { return this.books.flatMap((b) => (this.corpora[b] ? [this.corpora[b]] : [])); }
  get busy(): boolean { return library.status === 'loading' || this.books.some((b) => this.status[b] === 'loading'); }

  /* The catalogue, then every book of it, each fetched once however many askers there are. */
  async loadAll(): Promise<void> {
    await library.load();
    await Promise.all(this.books.map((b) => this.load(b)));
  }
  load(book: string): Promise<void> {
    const pending = this.loading[book]; if (pending) return pending;
    if (this.status[book] === 'loaded') return Promise.resolve();
    this.setStatus(book, 'loading');
    const run = this.fetchBook(book).finally(() => { delete this.loading[book]; });
    this.loading[book] = run;
    return run;
  }

  private setStatus(book: string, status: CorpusStatus): void { this.status = { ...this.status, [book]: status }; }
  private set(corpus: Corpus, failed: boolean): void {
    this.corpora = { ...this.corpora, [corpus.book]: corpus };
    this.setStatus(corpus.book, failed ? 'failed' : 'loaded');
  }
  private titleOf(book: string): string { return library.book(book)?.title || book; }
  private base(book: string): string { return library.book(book)?.url || `/${book}/`; }

  /* Everything off the build beside its pages — the manifest, its text, its
     concepts and its formula sheets. A file that failed leaves the rest standing. */
  private async fetchBook(book: string): Promise<void> {
    const manifest = await registry.ensureBook(bookId(book));
    if (!manifest) { this.set(emptyCorpus(book, this.titleOf(book)), true); return; }
    const [index, concepts, formulas] = await Promise.all([get(`${this.base(book)}search.json`), get(manifest.concepts), get(manifest.formulas)]);
    const sheets = Object.values(parseBookFormulas(formulas));
    this.set({
      book, title: manifest.title || this.titleOf(book),
      /* The book file carries every concept once, so nothing has to be deduplicated here. */
      concepts: parseBookConcepts(concepts).concepts,
      variables: sheets.flatMap((s) => s.variables), glossary: sheets.flatMap((s) => s.glossary), equations: sheets.flatMap((s) => s.equations),
      pages: parseIndex(index).pages, urls: urlsOf(manifest),
    }, index === null || concepts === null || formulas === null);
  }
}
export const searchStore = new Search();
