/* Loaded sections and their DOM. The page's own section is adopted from the
   static pool; others are fetched as fragments on demand. A document may be
   shown in several groups: the first gets the adopted element, the rest get a
   copy built from the fragment source with its own exercises and figures. A
   chapter's concepts and formulas are loaded on their own, since a view scoped
   to a chapter or to the book wants them before any of its sections is open. */
import type { SectionMetaDTO, ExerciseDTO, ConceptsDTO, FormulasDTO, ConceptDTO, CoverageDTO, BookManifest, SectionEntry, ChapterEntry } from '../content/schema';
import { type SectionId, type ChapterId, type GroupKey, type ItemId, type DocKind, type PageKind, PAGE_KINDS, bookId, sectionId, itemKey, figItem } from '../types/ids';
import { noteDocs } from '../notes/docs.svelte';
import type { Fig } from '../fig/figlib';
import { ICON } from '../icons';
import { originalButtons } from './original';
import { decorateTerms } from '../hover';
import { foldControls } from './fold.svelte';

/* A figure's tab title: its local id without the demo-/fig- prefix, "demo-plane" → "plane". */
const figName = (local: string): string => local.replace(/^(demo|fig)-/, '').replace(/-/g, ' ');

export type SectionStatus = 'loaded' | 'loading' | 'failed';
export type SectionState = {
  readonly meta: SectionMetaDTO | null;
  readonly exercises: readonly ExerciseDTO[];
  readonly docs: Partial<Record<DocKind, HTMLElement>>;
  readonly src: Partial<Record<DocKind, string>>;
  readonly status: SectionStatus;
  readonly error?: string;
};
export type ChapterData = { readonly concepts: ConceptsDTO; readonly formulas: FormulasDTO };
export type ChapterStatus = SectionStatus;
export type Mounter = (root: HTMLElement, section: SectionId) => void;

const sectionDataOf = (s: HTMLScriptElement): { meta: SectionMetaDTO; exercises: ExerciseDTO[] } => JSON.parse(s.textContent ?? '{}');

class Registry {
  manifest = $state.raw<BookManifest>({ id: bookId(''), title: '', publisher: '', authors: [], license: '', types: {}, macros: {}, symbols: {}, exerciseKinds: {}, chapters: [] });
  sections = $state.raw<Readonly<Record<string, SectionState>>>({});
  pages = $state.raw<Partial<Record<PageKind, HTMLElement>>>({});             /* the standing pages, adopted from a pool or fetched */
  chapters = $state.raw<Readonly<Record<string, ChapterData>>>({});
  chapterStatus = $state.raw<Readonly<Record<string, ChapterStatus>>>({});   /* by chapter dir, beside the data above */
  private fig: Fig | null = null;
  private mountExercises: Mounter = () => {};
  private decorate: (root: HTMLElement) => void = () => {};
  private owner: Record<string, GroupKey> = {};
  private clones: Record<string, HTMLElement> = {};
  private loading: Partial<Record<string, Promise<void>>> = {};
  private loadingChapters: Partial<Record<string, Promise<void>>> = {};
  private loadingPages: Partial<Record<PageKind, Promise<void>>> = {};

  init(manifest: BookManifest, fig: Fig, mounter: Mounter, decorate?: (root: HTMLElement) => void): void { this.manifest = manifest; this.fig = fig; this.mountExercises = mounter; if (decorate) this.decorate = decorate; }

  entry(sec: SectionId): SectionEntry | undefined { return this.manifest.chapters.flatMap((c) => c.sections).find((s) => s.id === sec); }
  chapterOf(sec: SectionId): ChapterEntry | undefined { return this.manifest.chapters.find((c) => c.sections.some((s) => s.id === sec)); }
  chapterById(id: ChapterId): ChapterEntry | undefined { return this.manifest.chapters.find((c) => c.id === id); }
  isBuilt(sec: SectionId): boolean { return this.entry(sec)?.built ?? false; }
  state(sec: SectionId): SectionState | undefined { return this.sections[sec]; }
  title(id: ItemId): string {
    if (id.kind === 'view') return id.view;
    if (id.kind === 'page') return id.page === 'about' ? 'About OmniStax' : this.manifest.title || 'The book';
    if (id.kind === 'note') return noteDocs.get(id.note)?.name ?? 'Note';
    if (id.kind === 'fig') return `${id.section} ${figName(id.fig)}`;
    if (id.kind === 'ex') { const label = this.exerciseLabel(id.section, id.ex); return label ? `${id.section} · ${label} ${id.ex}` : `${id.section} · exercise ${id.ex}`; }
    return `${id.section} ${id.doc === 'text' ? 'Text' : 'Exercises'}`;
  }
  /* What the book calls an exercise's kind, once the section holding it has been loaded. */
  private exerciseLabel(sec: SectionId, ex: string): string | null {
    const kind = this.sections[sec]?.exercises.find((e) => e.id === ex)?.kind;
    return kind === undefined ? null : this.manifest.exerciseKinds[kind] ?? kind;
  }
  /* Concept ids are canonical and a chapter reaches into the chapters before it, so two loaded chapters may name the same concept; the map draws it once. */
  get concepts(): readonly ConceptDTO[] {
    const seen = new Set<string>();
    return Object.values(this.chapters).flatMap((c) => c.concepts.concepts).filter((k) => (seen.has(k.id) ? false : (seen.add(k.id), true)));
  }
  get coverage(): readonly CoverageDTO[] { return Object.values(this.chapters).flatMap((c) => c.concepts.coverage); }
  concept(id: string): ConceptDTO | undefined { return this.concepts.find((c) => c.id === id); }
  setChapter(dir: string, data: ChapterData): void { this.chapters = { ...this.chapters, [dir]: data }; this.setChapterStatus(dir, 'loaded'); }
  private setChapterStatus(dir: string, status: ChapterStatus): void { this.chapterStatus = { ...this.chapterStatus, [dir]: status }; }

  /* A chapter's concepts and formulas, fetched once however many askers there are;
     a chapter that will not load is remembered as failed rather than thrown at each of them. */
  loadChapter(dir: string): Promise<void> {
    if (this.chapters[dir]) return Promise.resolve();
    const pending = this.loadingChapters[dir]; if (pending) return pending;
    const ch = this.manifest.chapters.find((c) => c.dir === dir);
    if (!ch) return Promise.reject(new Error(`unknown chapter ${dir}`));
    this.setChapterStatus(dir, 'loading');
    this.loadingChapters[dir] = Promise.all([fetch(ch.concepts).then((r) => r.json()), fetch(ch.formulas).then((r) => r.json())])
      .then(([concepts, formulas]) => this.setChapter(dir, { concepts, formulas }))
      .catch(() => this.setChapterStatus(dir, 'failed'))
      .finally(() => { delete this.loadingChapters[dir]; });
    return this.loadingChapters[dir]!;
  }
  async loadChapters(dirs: readonly string[]): Promise<void> { await Promise.all(dirs.map((d) => this.loadChapter(d))); }

  /* Take the articles and data block out of a container (the static pool or a
     fetched fragment). A standing page is an article of its own, named by the
     page it is rather than by a section. */
  adopt(container: ParentNode): SectionId[] {
    const seen = new Set<SectionId>();
    const next: Record<string, SectionState> = { ...this.sections };
    container.querySelectorAll<HTMLElement>('article[data-page]').forEach((a) => {
      const kind = a.dataset.page as PageKind;
      if ((PAGE_KINDS as readonly string[]).includes(kind)) this.pages = { ...this.pages, [kind]: a };
    });
    container.querySelectorAll<HTMLScriptElement>('script[data-section]').forEach((s) => {
      const sec = sectionId(s.dataset.section ?? ''); const d = sectionDataOf(s);
      next[sec] = { ...(next[sec] ?? { docs: {}, src: {} }), meta: d.meta, exercises: d.exercises, status: 'loaded' }; seen.add(sec); s.remove();
    });
    container.querySelectorAll<HTMLElement>('article[data-doc]').forEach((a) => {
      const [sec, doc] = (a.dataset.doc ?? '').split('/') as [SectionId, DocKind];
      const cur = next[sec] ?? { meta: null, exercises: [], docs: {}, src: {}, status: 'loaded' as const };
      next[sec] = { ...cur, docs: { ...cur.docs, [doc]: a }, src: { ...cur.src, [doc]: a.outerHTML }, status: 'loaded' }; seen.add(sec);
    });
    this.sections = next;
    seen.forEach((sec) => { const s = next[sec]; (['text', 'exercises'] as const).forEach((d) => { const root = s.docs[d]; if (root) this.prepare(root, sec, d); }); });
    return [...seen];
  }
  private prepare(root: HTMLElement, sec: SectionId, doc: DocKind): void {
    if (root.dataset.math !== 'rendered') this.fig?.renderMath(root);
    this.mountExercises(root, sec);
    if (doc === 'text') { this.splitButtons(root, sec); originalButtons(root); foldControls(root); this.bootFigures(root, sec); decorateTerms(root, sec); }
    this.decorate(root);
  }
  /* A root the shell built itself — one exercise in a tab of its own — asks for the
     same document-wide decoration a prepared document gets. */
  decorateRoot(root: HTMLElement): void { this.decorate(root); }
  /* Every figure in a document gets a button that opens it in a split of its own;
     the key it carries is the one the shell delegates on, the same attribute an
     exercise card's split button uses, so one selector finds them both. */
  private splitButtons(root: HTMLElement, sec: SectionId): void {
    root.querySelectorAll<HTMLElement>('figure.demo[id] .demo-head').forEach((head) => {
      if (head.querySelector('.fig-split')) return;
      const local = (head.closest('figure')!.id).replace(`${sec}-`, '');
      const b = document.createElement('button'); b.type = 'button'; b.className = 'fig-split'; b.dataset.splitKey = itemKey(figItem(sec, local));
      b.title = 'Open in a split'; b.setAttribute('aria-label', `Open ${figName(local)} in a split`); b.innerHTML = ICON.split;
      head.appendChild(b);
    });
  }
  private bootFigures(root: HTMLElement, sec: SectionId): void {
    const figs = (window as unknown as { OMNISTAX_FIGURES?: Record<string, (root: HTMLElement, F: Fig) => void> }).OMNISTAX_FIGURES;
    const f = figs?.[sec]; if (!f || !this.fig || root.dataset.booted) return;
    root.dataset.booted = '1';
    try { f(root, this.fig); } catch (e) { console.error(`figures ${sec}`, e); }
  }

  /* Fetch a section's chapter data, figure module and fragment, then adopt it. */
  load(sec: SectionId): Promise<void> {
    if (this.sections[sec]?.docs.text) return Promise.resolve();
    const pending = this.loading[sec]; if (pending) return pending;
    const e = this.entry(sec), ch = this.chapterOf(sec);
    if (!e || !ch || !e.built) return Promise.reject(new Error(`unknown section ${sec}`));
    this.sections = { ...this.sections, [sec]: { meta: null, exercises: [], docs: {}, src: {}, status: 'loading' } };
    const chapterData = this.loadChapter(ch.dir);
    const script = new Promise<void>((res) => { const s = document.createElement('script'); s.src = e.figuresJs; s.onload = () => res(); s.onerror = () => res(); document.body.appendChild(s); });
    const html = fetch(e.fragment).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.text(); });
    this.loading[sec] = Promise.all([chapterData, script, html])
      .then(([, , text]) => { const t = document.createElement('template'); t.innerHTML = text; this.adopt(t.content); })
      .catch((err: Error) => { this.sections = { ...this.sections, [sec]: { meta: null, exercises: [], docs: {}, src: {}, status: 'failed', error: err.message } }; })
      .finally(() => { delete this.loading[sec]; });
    return this.loading[sec]!;
  }

  /* One of the standing pages, for a tab that holds it: the article the pool
     carried, or nothing yet and a fetch of its fragment, which adopts the
     article and so answers the next ask. */
  pageFor(kind: PageKind): HTMLElement | null {
    const have = this.pages[kind];
    if (have) return have;
    if (!this.loadingPages[kind]) {
      const url = kind === 'about' ? '/about.html' : `/${this.manifest.id}/book.html`;
      this.loadingPages[kind] = fetch(url)
        .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.text(); })
        .then((text) => { const t = document.createElement('template'); t.innerHTML = text; this.adopt(t.content); })
        .catch(() => { /* the page stays empty; the pane says it is loading */ });
    }
    return null;
  }

  /* One figure on its own: a root holding just that figure's static markup, with the section script booted on it. */
  figureFor(group: GroupKey, id: Extract<ItemId, { kind: 'fig' }>): HTMLElement | null {
    const ck = `${group}|${itemKey(id)}`;
    if (this.clones[ck]) return this.clones[ck];
    const src = this.sections[id.section]?.src.text; if (!src) return null;
    const t = document.createElement('template'); t.innerHTML = src;
    const f = t.content.querySelector<HTMLElement>(`[id="${id.section}-${id.fig}"]`); if (!f) return null;
    const root = document.createElement('div'); root.className = 'fig-root'; root.dataset.sec = id.section; root.dataset.chapter = this.chapterOf(id.section)?.dir ?? ''; root.dataset.one = '1'; root.appendChild(f);
    originalButtons(root); this.bootFigures(root, id.section);
    return (this.clones[ck] = root);
  }
  /* One element per (group, document). */
  instanceFor(group: GroupKey, id: ItemId, holds: (group: GroupKey, key: string) => boolean): HTMLElement | null {
    if (id.kind !== 'doc') return null;
    const key = itemKey(id); const ck = `${group}|${key}`;
    if (this.clones[ck]) return this.clones[ck];
    const s = this.sections[id.section]; const primary = s?.docs[id.doc];
    if (!primary) return null;
    const owner = this.owner[key];
    const held = owner !== undefined && owner !== group && holds(owner, key);
    if (!held) { this.owner[key] = group; return primary; }
    const src = s.src[id.doc]; if (!src) return null;
    const t = document.createElement('template'); t.innerHTML = src;
    const a = t.content.firstElementChild as HTMLElement; this.prepare(a, id.section, id.doc);
    return (this.clones[ck] = a);
  }
  /* Drop copies no group shows any more. */
  release(used: ReadonlySet<HTMLElement>): void {
    Object.entries(this.clones).forEach(([ck, a]) => { if (!used.has(a)) { a.remove(); delete this.clones[ck]; } });
  }
  primaryDocs(): HTMLElement[] { return Object.values(this.sections).flatMap((s) => Object.values(s.docs)); }
}
export const registry = new Registry();
