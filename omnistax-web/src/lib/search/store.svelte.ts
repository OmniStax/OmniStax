/* The corpora the search reads: every book of the library, fetched the first
   time the reader searches and kept for the session. The book being read comes
   out of the registry — its manifest is on the page and its chapters are what
   the companion views already fetch — and any other book is read off the build
   beside its own pages: book.json, each built chapter's concepts and formulas,
   and search.json for its text. Nothing here is persisted: it is a copy of
   build output, cheaper to fetch again than to keep in step. */
import { registry } from '../sections/registry.svelte';
import { library } from '../explorer/library.svelte';
import { parseConcepts, parseManifest } from '../practice/books';
import { bookPagesOf } from '../content/roles';
import type { BookManifest } from '../content/schema';
import { parseFormulas, parseIndex } from './books';
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

  /* Every book the library lists, in the library's order and the book being read first. */
  get books(): readonly string[] {
    const home = registry.manifest.id;
    return [...(home ? [home] : []), ...library.books.map((b) => b.id).filter((id) => id !== home)];
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
    const run = (book === registry.manifest.id ? this.fetchHome() : this.fetchForeign(book)).finally(() => { delete this.loading[book]; });
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

  /* The book being read: its chapters through the registry, which the views share, and its text off the build. */
  private async fetchHome(): Promise<void> {
    const m = registry.manifest;
    const dirs = m.chapters.filter((c) => c.sections.some((s) => s.built)).map((c) => c.dir);
    const [index] = await Promise.all([get(`${this.base(m.id)}search.json`), registry.loadChapters(dirs).catch(() => {})]);
    const chapters = dirs.flatMap((d) => (registry.chapters[d] ? [registry.chapters[d]] : []));
    this.set({
      book: m.id, title: m.title,
      concepts: registry.concepts,
      variables: chapters.flatMap((c) => c.formulas.variables), glossary: chapters.flatMap((c) => c.formulas.glossary), equations: chapters.flatMap((c) => c.formulas.equations),
      pages: parseIndex(index).pages, urls: urlsOf(m),
    }, index === null || chapters.length < dirs.length);
  }
  /* Any other book: everything off the build beside its pages. A file that failed leaves the rest standing. */
  private async fetchForeign(book: string): Promise<void> {
    const raw = await get(`${this.base(book)}book.json`);
    const manifest = parseManifest(raw);
    if (!manifest) { this.set(emptyCorpus(book, this.titleOf(book)), true); return; }
    const chapters = manifest.chapters.filter((c) => c.concepts && c.sections.some((s) => s.built));
    const [index, concepts, formulas] = await Promise.all([
      get(`${this.base(book)}search.json`),
      Promise.all(chapters.map(async (c) => get(c.concepts))),
      Promise.all(chapters.map(async (c) => get(c.formulas))),
    ]);
    const seen = new Set<string>();
    const sheets = formulas.map(parseFormulas);
    this.set({
      book, title: manifest.title || this.titleOf(book),
      concepts: concepts.flatMap((c) => parseConcepts(c).concepts).filter((k) => (seen.has(k.id) ? false : (seen.add(k.id), true))),
      variables: sheets.flatMap((s) => s.variables), glossary: sheets.flatMap((s) => s.glossary), equations: sheets.flatMap((s) => s.equations),
      pages: parseIndex(index).pages, urls: urlsOf(manifest),
    }, index === null || concepts.includes(null) || formulas.includes(null));
  }
}
export const searchStore = new Search();
