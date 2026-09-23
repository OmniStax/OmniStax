/* Loaded books, sections and their DOM. Any number of books stand loaded at
   once, each known by its manifest; a section is known by its book and its
   number together. The page's own section is adopted from the static pool;
   others are fetched as fragments on demand. A document may be shown in
   several groups: the first gets the adopted element, the rest get a copy
   built from the fragment source with its own exercises and figures. A
   chapter's concepts and formulas are loaded on their own, since a view scoped
   to a chapter or to the book wants them before any of its sections is open. */
import type { SectionMetaDTO, ExerciseDTO, ConceptsDTO, FormulasDTO, ConceptDTO, CoverageDTO, BookManifest, SectionEntry, ChapterEntry } from '../content/schema';
import { type BookId, type SectionId, type ChapterId, type GroupKey, type ItemId, type DocKind, type SectionRef, type SecKey, type PageItem, bookId, sectionId, sectionRef, secKey, itemKey, figItem, aboutItem, bookPageItem } from '../types/ids';
import { noteDocs } from '../notes/docs.svelte';
import { explorer } from '../explorer/store.svelte';
import { entryId } from '../explorer/model';
import type { Fig } from '../fig/figlib';
import { type ThreeUrl, ensureThree, hasThree, needsThree } from '../fig/three';
import { ICON } from '../icons';
import { originalButtons } from './original';
import { decorateTerms } from '../hover';
import { dragFigures } from '../notes/md/dragfig';
import { foldControls } from './fold.svelte';
import { bookPagesOf, pageLabel, pageRoleOf, pagesOf } from '../content/roles';
import { EMPTY_FORMULAS, chapterConceptsOf } from '../content/bookdata';
import { parseBookConcepts, parseBookFormulas } from '../practice/books';

/* When the book's own concepts.json and formulas.json are worth fetching over
   the chapters' own files: a chapter file is about a tenth of the book file, so
   the pair pays for itself only once most of the book is wanted at once, which
   is what the practice, the search and a book-scoped view ask for; the reading
   path asks for one chapter, and gets that chapter's files. */
const bulkWorthwhile = (wanted: number, chapters: number): boolean => wanted > chapters / 2;

/* A figure's tab title: its local id without the sim-/fig- prefix, "sim-plane" → "plane". */
const figName = (local: string): string => local.replace(/^(sim|fig)-/, '').replace(/-/g, ' ');
/* What the reader calls one of their own things: the name on its explorer row,
   since a file, a drawing and a chat share their id with the row that holds
   them, and nothing where the tree has no such row. */
const entryName = (id: string): string | undefined => explorer.tree.entries.find((e) => e.id === entryId(id))?.name;

/* 'missing': the book does not exist, or has no such page, or has not built it. */
export type SectionStatus = 'loaded' | 'loading' | 'failed' | 'missing';
export type SectionState = {
  readonly meta: SectionMetaDTO | null;
  readonly exercises: readonly ExerciseDTO[];
  readonly docs: Partial<Record<DocKind, HTMLElement>>;
  readonly src: Partial<Record<DocKind, string>>;
  readonly status: SectionStatus;
  readonly error?: string;
};
export type ChapterData = { readonly concepts: ConceptsDTO; readonly formulas: FormulasDTO };
export type ChapterStatus = Exclude<SectionStatus, 'missing'>;
/* "<book>/<dir>": a chapter's directory is book-local, like its sections. */
export type ChapterKey = string & { readonly __brand: 'ChapterKey' };
export const chapterKey = (book: BookId, dir: string): ChapterKey => `${book}/${dir}` as ChapterKey;
export type Mounter = (root: HTMLElement, ref: SectionRef) => void;
export type RegistryInit = {
  readonly figFor: (book: BookId) => Fig;
  readonly mounter: Mounter;
  readonly decorate?: (root: HTMLElement) => void;
  readonly threeUrl?: ThreeUrl;
};
type FigureScript = (root: HTMLElement, F: Fig) => void;

const EMPTY_STATE: Omit<SectionState, 'status'> = { meta: null, exercises: [], docs: {}, src: {} };
const EMPTY_MANIFEST: BookManifest = { id: bookId(''), title: '', publisher: '', authors: [], license: '', types: {}, macros: {}, symbols: {}, exerciseKinds: {}, chapters: [], sheets: [], exercises: '', concepts: '', formulas: '' };
const BOOK_ID = /^[a-z0-9-]+$/;

const sectionDataOf = (s: HTMLScriptElement): { meta: SectionMetaDTO; exercises: ExerciseDTO[] } => JSON.parse(s.textContent ?? '{}');
const templateOf = (html: string): DocumentFragment => { const t = document.createElement('template'); t.innerHTML = html; return t.content; };
const getText = (url: string): Promise<string> => fetch(url).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.text(); });
const pageKey = (p: PageItem): string => itemKey(p);

class Registry {
  books = $state.raw<Readonly<Record<string, BookManifest>>>({});
  /* Books asked for that the site does not carry. */
  absent = $state.raw<ReadonlySet<BookId>>(new Set());
  sections = $state.raw<Readonly<Record<SecKey, SectionState>>>({});
  pages = $state.raw<Readonly<Record<string, HTMLElement>>>({});             /* the standing pages by item key, adopted from a pool or fetched */
  chapters = $state.raw<Readonly<Record<ChapterKey, ChapterData>>>({});
  chapterStatus = $state.raw<Readonly<Record<ChapterKey, ChapterStatus>>>({});
  /* The book the page was served for, which an article without its own data-book belongs to. */
  home: BookId = bookId('');
  private figFor: ((book: BookId) => Fig) | null = null;
  private threeUrl: ThreeUrl = '';                                          /* the vendor script, fetched the first time a figure draws in three dimensions */
  private mountExercises: Mounter = () => {};
  private decorate: (root: HTMLElement) => void = () => {};
  private owner: Record<string, GroupKey> = {};
  private clones: Record<string, HTMLElement> = {};
  private loading: Partial<Record<SecKey, Promise<void>>> = {};
  private loadingChapters: Partial<Record<ChapterKey, Promise<void>>> = {};
  private loadingPages: Partial<Record<string, Promise<void>>> = {};
  private loadingBooks: Partial<Record<BookId, Promise<BookManifest | null>>> = {};
  private bookHooks: ((m: BookManifest) => void)[] = [];

  init(o: RegistryInit): void { this.figFor = o.figFor; this.mountExercises = o.mounter; if (o.decorate) this.decorate = o.decorate; if (o.threeUrl) this.threeUrl = o.threeUrl; }

  /* A manifest the shell already holds, the boot book's. */
  addBook(m: BookManifest): void {
    if (this.books[m.id]) return;
    this.books = { ...this.books, [m.id]: m };
    this.bookHooks.forEach((cb) => cb(m));
  }
  /* Called once for every book, those already here included. */
  onBook(cb: (m: BookManifest) => void): void { this.bookHooks.push(cb); Object.values(this.books).forEach(cb); }
  /* The book's manifest, fetched once; null when the site carries no such book. */
  ensureBook(book: BookId): Promise<BookManifest | null> {
    const have = this.books[book]; if (have) return Promise.resolve(have);
    if (this.absent.has(book) || !BOOK_ID.test(book)) { this.markAbsent(book); return Promise.resolve(null); }
    const pending = this.loadingBooks[book]; if (pending) return pending;
    const run = fetch(`/${book}/book.json`)
      .then((r) => (r.ok ? (r.json() as Promise<BookManifest>) : null))
      .catch(() => null)
      .then((m) => { if (m) this.addBook(m); else this.markAbsent(book); return m; })
      .finally(() => { delete this.loadingBooks[book]; });
    return (this.loadingBooks[book] = run);
  }
  private markAbsent(book: BookId): void { if (!this.absent.has(book)) this.absent = new Set([...this.absent, book]); }
  /* The book's manifest, or an empty one with its id while it has not arrived. */
  manifest(book: BookId): BookManifest { return this.books[book] ?? { ...EMPTY_MANIFEST, id: book }; }
  hasBook(book: BookId): boolean { return this.books[book] !== undefined; }
  /* What a pane says for a section that is 'missing'. */
  missingLine(ref: SectionRef): string {
    const m = this.books[ref.book];
    return m ? `${m.title} has no section ${ref.section}.` : `There is no book called ${ref.book}.`;
  }

  /* Any page of a book by its id: a section, or an introduction or summary of a chapter or of the book itself. */
  entry(ref: SectionRef): SectionEntry | undefined { const m = this.books[ref.book]; return m ? bookPagesOf(m).find((s) => s.id === ref.section) : undefined; }
  /* The chapter a page belongs to; the book's own pages belong to none. */
  chapterOf(ref: SectionRef): ChapterEntry | undefined { return this.books[ref.book]?.chapters.find((c) => pagesOf(c).some((s) => s.id === ref.section)); }
  chapterById(book: BookId, id: ChapterId): ChapterEntry | undefined { return this.books[book]?.chapters.find((c) => c.id === id); }
  isBuilt(ref: SectionRef): boolean { return this.entry(ref)?.built ?? false; }
  state(ref: SectionRef): SectionState | undefined { return this.sections[secKey(ref)]; }
  /* Every section of one book that has any state, by its number. */
  sectionsOf(book: BookId): readonly (readonly [SectionId, SectionState])[] {
    const prefix = `${book}/`;
    return Object.entries(this.sections).flatMap(([k, s]) => (k.startsWith(prefix) ? [[sectionId(k.slice(prefix.length)), s] as const] : []));
  }
  title(id: ItemId): string {
    if (id.kind === 'view') return id.view;
    if (id.kind === 'page') return id.page === 'about' ? 'About OmniStax' : this.books[id.book]?.title || id.book;
    if (id.kind === 'note') return noteDocs.get(id.note)?.name ?? 'Note';
    /* A file, a drawing and a chat are the reader's own, and the name they
       know one by is the one on its row of the explorer; a tab opened for
       something the tree has no row for falls back to its key. */
    if (id.kind === 'file') return entryName(id.file) ?? itemKey(id);
    if (id.kind === 'drawing') return entryName(id.drawing) ?? itemKey(id);
    if (id.kind === 'chat') return entryName(id.chat) ?? 'New chat';
    if (id.kind === 'ex') return `${id.section} ${id.ex}`;
    if (id.kind === 'sheet') return this.books[id.book]?.sheets.find((s) => s.id === id.sheet)?.title ?? id.sheet;
    if (id.kind === 'fig') return `${id.section} ${figName(id.fig)}`;
    if (id.kind === 'scratch') return `${id.section} ${id.ex}`;
    /* A section's tab carries the name the reader knows it by — "7.6 Momentum
       and Force". A section the manifest does not name falls back to its
       number and the bare word. An introduction or summary page is named by
       its own title. */
    const e = this.entry(id);
    if (pageRoleOf(id.section) !== 'section') return e ? pageLabel(e) : id.section;
    return e === undefined ? `${id.section} Text` : `${id.section} ${e.title}`;
  }
  /* One book's chapter data, loaded so far. */
  chaptersOf(book: BookId): readonly ChapterData[] {
    const prefix = `${book}/`;
    return Object.entries(this.chapters).flatMap(([k, c]) => (k.startsWith(prefix) ? [c] : []));
  }
  chapter(book: BookId, dir: string): ChapterData | undefined { return this.chapters[chapterKey(book, dir)]; }
  chapterStatusOf(book: BookId, dir: string): ChapterStatus | undefined { return this.chapterStatus[chapterKey(book, dir)]; }
  /* Concept ids are canonical and a chapter reaches into the chapters before it, so two loaded chapters may name the same concept; the map draws it once. */
  concepts(book: BookId): readonly ConceptDTO[] {
    const seen = new Set<string>();
    return this.chaptersOf(book).flatMap((c) => c.concepts.concepts).filter((k) => (seen.has(k.id) ? false : (seen.add(k.id), true)));
  }
  coverage(book: BookId): readonly CoverageDTO[] { return this.chaptersOf(book).flatMap((c) => c.concepts.coverage); }
  concept(book: BookId, id: string): ConceptDTO | undefined { return this.concepts(book).find((c) => c.id === id); }
  setChapter(book: BookId, dir: string, data: ChapterData): void { this.chapters = { ...this.chapters, [chapterKey(book, dir)]: data }; this.setChapterStatus(chapterKey(book, dir), 'loaded'); }
  private setChapterStatus(k: ChapterKey, status: ChapterStatus): void { this.chapterStatus = { ...this.chapterStatus, [k]: status }; }

  /* A chapter's concepts and formulas, fetched once however many askers there are;
     a chapter that will not load is remembered as failed rather than thrown at each of them. */
  loadChapter(book: BookId, dir: string): Promise<void> {
    const k = chapterKey(book, dir);
    if (this.chapters[k]) return Promise.resolve();
    const pending = this.loadingChapters[k]; if (pending) return pending;
    const ch = this.books[book]?.chapters.find((c) => c.dir === dir);
    if (!ch) return Promise.reject(new Error(`unknown chapter ${k}`));
    this.setChapterStatus(k, 'loading');
    const run = Promise.all([fetch(ch.concepts).then((r) => r.json()), fetch(ch.formulas).then((r) => r.json())])
      .then(([concepts, formulas]) => this.setChapter(book, dir, { concepts, formulas }))
      .catch(() => this.setChapterStatus(k, 'failed'))
      .finally(() => { delete this.loadingChapters[k]; });
    return (this.loadingChapters[k] = run);
  }
  /* Several chapters of one book at once. Past a handful of them the two
     book-level files are the cheaper read, and what is already loaded or in
     flight is left to the fetch that owns it. */
  async loadChapters(book: BookId, dirs: readonly string[]): Promise<void> {
    const m = await this.ensureBook(book); if (!m) return;
    const wanted = dirs.filter((d) => !this.chapters[chapterKey(book, d)] && !this.loadingChapters[chapterKey(book, d)]);
    if (bulkWorthwhile(wanted.length, m.chapters.length)) await this.loadBulk(m, wanted);
    await Promise.all(dirs.map((d) => this.loadChapter(book, d)));
  }

  /* The book's concepts and formulas in one pair of requests, spread over the
     chapters asked for. Each of them is marked loading against this one
     promise, so a chapter the shell asks for meanwhile waits on it rather than
     fetching its own file; a pair that will not load leaves them all failed. */
  private loadBulk(m: BookManifest, dirs: readonly string[]): Promise<void> {
    const keys = dirs.map((d) => chapterKey(m.id, d));
    keys.forEach((k) => this.setChapterStatus(k, 'loading'));
    const run = Promise.all([fetch(m.concepts).then((r) => r.json()), fetch(m.formulas).then((r) => r.json())])
      .then(([concepts, formulas]) => {
        const book = parseBookConcepts(concepts);
        const sheets = parseBookFormulas(formulas);
        dirs.forEach((d) => this.setChapter(m.id, d, { concepts: chapterConceptsOf(book, d), formulas: sheets[d] ?? EMPTY_FORMULAS }));
      })
      .catch(() => keys.forEach((k) => this.setChapterStatus(k, 'failed')))
      .finally(() => keys.forEach((k) => { delete this.loadingChapters[k]; }));
    keys.forEach((k) => { this.loadingChapters[k] = run; });
    return run;
  }

  /* Take the articles and data block out of a container (the static pool or a
     fetched fragment). Each names its book; one that does not belongs to
     `book`. A standing page is an article of its own, named by the page it is
     rather than by a section. */
  adopt(container: ParentNode, book: BookId = this.home): SectionRef[] {
    const bookOf = (el: HTMLElement): BookId => bookId(el.dataset.book || book);
    const seen = new Map<SecKey, SectionRef>();
    const next: Record<SecKey, SectionState> = { ...this.sections };
    container.querySelectorAll<HTMLElement>('article[data-page]').forEach((a) => {
      const page = a.dataset.page === 'about' ? aboutItem() : a.dataset.page === 'book' ? bookPageItem(bookOf(a)) : null;
      if (page?.kind === 'page') this.pages = { ...this.pages, [pageKey(page)]: a };
    });
    container.querySelectorAll<HTMLScriptElement>('script[data-section]').forEach((s) => {
      const ref = sectionRef(bookOf(s), sectionId(s.dataset.section ?? '')); const k = secKey(ref); const d = sectionDataOf(s);
      next[k] = { ...(next[k] ?? EMPTY_STATE), meta: d.meta, exercises: d.exercises, status: 'loaded' }; seen.set(k, ref); s.remove();
    });
    container.querySelectorAll<HTMLElement>('article[data-doc]').forEach((a) => {
      const [sec, doc] = (a.dataset.doc ?? '').split('/') as [SectionId, DocKind];
      const ref = sectionRef(bookOf(a), sec); const k = secKey(ref); a.dataset.book = ref.book;
      const cur = next[k] ?? { ...EMPTY_STATE, status: 'loaded' as const };
      next[k] = { ...cur, docs: { ...cur.docs, [doc]: a }, src: { ...cur.src, [doc]: a.outerHTML }, status: 'loaded' }; seen.set(k, ref);
    });
    this.sections = next;
    seen.forEach((ref, k) => { const root = next[k].docs.text; if (root) this.prepare(root, ref); });
    return [...seen.values()];
  }
  private prepare(root: HTMLElement, ref: SectionRef): void {
    if (root.dataset.math !== 'rendered') this.figFor?.(ref.book).renderMath(root);
    this.mountExercises(root, ref);
    this.splitButtons(root, ref); originalButtons(root); foldControls(root); this.bootFigures(root, ref); decorateTerms(root, ref.section); dragFigures(root, ref);
    this.decorate(root);
  }
  /* A root the shell built itself — one exercise in a tab of its own — asks for the
     same document-wide decoration a prepared document gets. */
  decorateRoot(root: HTMLElement): void { this.decorate(root); }
  /* Every figure in a document gets a button that opens it in a split of its own;
     the key it carries is the one the shell delegates on, the same attribute an
     exercise card's split button uses, so one selector finds them both. */
  private splitButtons(root: HTMLElement, ref: SectionRef): void {
    root.querySelectorAll<HTMLElement>('figure.sim[id] .sim-head').forEach((head) => {
      if (head.querySelector('.fig-split')) return;
      const local = (head.closest('figure')!.id).replace(`${ref.section}-`, '');
      const b = document.createElement('button'); b.type = 'button'; b.className = 'fig-split'; b.dataset.splitKey = itemKey(figItem(ref, local));
      b.title = 'Open in a split'; b.setAttribute('aria-label', `Open ${figName(local)} in a split`); b.innerHTML = ICON.split;
      head.appendChild(b);
    });
  }
  /* Boot a section's figures on a root, once. A script that draws in three
     dimensions and finds no THREE yet waits for the vendor script — the root is
     marked booted straight away, so nothing boots it a second time while the
     fetch is in flight. Every other script runs in this same turn. */
  private bootFigures(root: HTMLElement, ref: SectionRef): void {
    const figs = (window as unknown as { OMNISTAX_FIGURES?: Record<string, FigureScript> }).OMNISTAX_FIGURES;
    const f = figs?.[secKey(ref)]; if (!f || !this.figFor || root.dataset.booted) return;
    root.dataset.booted = '1';
    if (!needsThree(f) || hasThree()) { this.runFigures(root, ref, f); return; }
    /* The script is run whether or not the root is in the document by then: a
       figure split into its own tab is booted detached and mounted after, and
       the library draws only while a figure is on screen anyway. */
    ensureThree(this.threeUrl)
      .then(() => this.runFigures(root, ref, f))
      .catch((e: Error) => console.error(`figures ${secKey(ref)}`, e));
  }
  private runFigures(root: HTMLElement, ref: SectionRef, f: FigureScript): void {
    try { f(root, this.figFor!(ref.book)); } catch (e) { console.error(`figures ${secKey(ref)}`, e); }
  }

  private settle(ref: SectionRef, status: 'failed' | 'missing', error?: string): void {
    this.sections = { ...this.sections, [secKey(ref)]: { ...EMPTY_STATE, status, ...(error ? { error } : {}) } };
  }
  /* Fetch a section's book, chapter data, figure module and fragment, then
     adopt it. It never rejects: a section that cannot be shown is recorded as
     failed or missing, and the pane says which. */
  load(ref: SectionRef): Promise<void> {
    const k = secKey(ref);
    if (this.sections[k]?.docs.text) return Promise.resolve();
    const pending = this.loading[k]; if (pending) return pending;
    this.sections = { ...this.sections, [k]: { ...EMPTY_STATE, status: 'loading' } };
    const run = this.ensureBook(ref.book).then((m) => {
      const e = m ? this.entry(ref) : undefined;
      if (!e || !e.built) { this.settle(ref, 'missing'); return; }
      const ch = this.chapterOf(ref);
      /* A page of the book's own has no chapter, and so no concepts or formulas to fetch beside it. */
      const chapterData = ch ? this.loadChapter(ref.book, ch.dir) : Promise.resolve();
      const script = new Promise<void>((res) => { const s = document.createElement('script'); s.src = e.figuresJs; s.onload = () => res(); s.onerror = () => res(); document.body.appendChild(s); });
      return Promise.all([chapterData, script, getText(e.fragment)])
        .then(([, , text]) => { this.adopt(templateOf(text), ref.book); if (!this.sections[k]?.docs.text) this.settle(ref, 'failed', 'empty fragment'); });
    })
      .catch((err: Error) => this.settle(ref, 'failed', err.message))
      .finally(() => { delete this.loading[k]; });
    return (this.loading[k] = run);
  }

  /* One of the standing pages, for a tab that holds it: the article the pool
     carried, or nothing yet and a fetch of its fragment, which adopts the
     article and so answers the next ask. */
  pageFor(page: PageItem): HTMLElement | null {
    const k = pageKey(page);
    const have = this.pages[k];
    if (have) return have;
    if (!this.loadingPages[k]) {
      const url = page.page === 'about' ? '/about.html' : `/${page.book}/book.html`;
      const book = page.page === 'book' ? page.book : this.home;
      this.loadingPages[k] = getText(url)
        .then((text) => { this.adopt(templateOf(text), book); })
        .catch(() => { /* the page stays empty; the pane says it is loading */ });
    }
    return null;
  }

  /* One figure on its own: a root holding just that figure's static markup, with the section script booted on it. */
  figureFor(group: GroupKey, id: Extract<ItemId, { kind: 'fig' }>): HTMLElement | null {
    const ck = `${group}|${itemKey(id)}`;
    if (this.clones[ck]) return this.clones[ck];
    const root = this.figureRoot(id, id.fig); if (!root) return null;
    return (this.clones[ck] = root);
  }
  /* The same root, built for a holder that keeps it itself: a note holding a
     figure of the book shows the very figure, live, and answers for its life
     rather than leaving it among the copies the panes release. The figure is
     built from the section's source, so it is a figure nothing has drawn on
     yet, and the section's script is booted on it as it is on a pane's. */
  figureRoot(ref: SectionRef, fig: string): HTMLElement | null {
    const src = this.state(ref)?.src.text; if (!src) return null;
    const f = templateOf(src).querySelector<HTMLElement>(`[id="${ref.section}-${fig}"]`); if (!f) return null;
    const root = document.createElement('div'); root.className = 'fig-root';
    root.dataset.book = ref.book; root.dataset.sec = ref.section; root.dataset.chapter = this.chapterOf(ref)?.dir ?? ''; root.dataset.one = '1'; root.appendChild(f);
    originalButtons(root); this.bootFigures(root, sectionRef(ref.book, ref.section));
    return root;
  }
  /* One element per (group, document). */
  instanceFor(group: GroupKey, id: ItemId, holds: (group: GroupKey, key: string) => boolean): HTMLElement | null {
    if (id.kind !== 'doc') return null;
    const key = itemKey(id); const ck = `${group}|${key}`;
    if (this.clones[ck]) return this.clones[ck];
    const s = this.state(id); const primary = s?.docs[id.doc];
    if (!s || !primary) return null;
    const owner = this.owner[key];
    const held = owner !== undefined && owner !== group && holds(owner, key);
    if (!held) { this.owner[key] = group; return primary; }
    const src = s.src[id.doc]; if (!src) return null;
    const a = templateOf(src).firstElementChild as HTMLElement; this.prepare(a, sectionRef(id.book, id.section));
    return (this.clones[ck] = a);
  }
  /* Drop copies no group shows any more. */
  release(used: ReadonlySet<HTMLElement>): void {
    Object.entries(this.clones).forEach(([ck, a]) => { if (!used.has(a)) { a.remove(); delete this.clones[ck]; } });
  }
  primaryDocs(): HTMLElement[] { return Object.values(this.sections).flatMap((s) => Object.values(s.docs)); }
}
export const registry = new Registry();
