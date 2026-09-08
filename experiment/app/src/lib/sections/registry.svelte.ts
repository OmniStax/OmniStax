/* Loaded sections and their DOM. The page's own section is adopted from the
   static pool; others are fetched as fragments on demand. A document may be
   shown in several groups: the first gets the adopted element, the rest get a
   copy built from the fragment source with its own exercises and figures. */
import type { SectionMetaDTO, ExerciseDTO, ConceptsDTO, FormulasDTO, ConceptDTO, CoverageDTO, BookManifest, SectionEntry, ChapterEntry } from '../content/schema';
import { type SectionId, type GroupKey, type ItemId, type DocKind, sectionId, itemKey, figItem } from '../types/ids';
import type { Fig } from '../fig/figlib';
import { ICON } from '../icons';

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
export type Mounter = (root: HTMLElement, section: SectionId) => void;

const sectionDataOf = (s: HTMLScriptElement): { meta: SectionMetaDTO; exercises: ExerciseDTO[] } => JSON.parse(s.textContent ?? '{}');

class Registry {
  manifest = $state.raw<BookManifest>({ id: '', title: '', publisher: '', authors: [], license: '', types: {}, pool: [], macros: {}, symbols: {}, exerciseKinds: {}, chapters: [] });
  sections = $state.raw<Readonly<Record<string, SectionState>>>({});
  chapters = $state.raw<Readonly<Record<string, ChapterData>>>({});
  private fig: Fig | null = null;
  private mountExercises: Mounter = () => {};
  private decorate: (root: HTMLElement) => void = () => {};
  private owner: Record<string, GroupKey> = {};
  private clones: Record<string, HTMLElement> = {};
  private loading: Partial<Record<string, Promise<void>>> = {};

  init(manifest: BookManifest, fig: Fig, mounter: Mounter, decorate?: (root: HTMLElement) => void): void { this.manifest = manifest; this.fig = fig; this.mountExercises = mounter; if (decorate) this.decorate = decorate; }

  entry(sec: SectionId): SectionEntry | undefined { return this.manifest.chapters.flatMap((c) => c.sections).find((s) => s.id === sec); }
  chapterOf(sec: SectionId): ChapterEntry | undefined { return this.manifest.chapters.find((c) => c.sections.some((s) => s.id === sec)); }
  isBuilt(sec: SectionId): boolean { return this.entry(sec)?.built ?? false; }
  state(sec: SectionId): SectionState | undefined { return this.sections[sec]; }
  title(id: ItemId): string {
    if (id.kind === 'view') return id.view;
    if (id.kind === 'fig') return `${id.section} ${figName(id.fig)}`;
    return `${id.section} ${id.doc === 'text' ? 'Text' : 'Exercises'}`;
  }
  get concepts(): readonly ConceptDTO[] { return Object.values(this.chapters).flatMap((c) => c.concepts.concepts); }
  get coverage(): readonly CoverageDTO[] { return Object.values(this.chapters).flatMap((c) => c.concepts.coverage); }
  concept(id: string): ConceptDTO | undefined { return this.concepts.find((c) => c.id === id); }
  setChapter(dir: string, data: ChapterData): void { this.chapters = { ...this.chapters, [dir]: data }; }

  /* Take the articles and data block out of a container (the static pool or a fetched fragment). */
  adopt(container: ParentNode): SectionId[] {
    const seen = new Set<SectionId>();
    const next: Record<string, SectionState> = { ...this.sections };
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
    if (doc === 'text') { this.splitButtons(root, sec); this.bootFigures(root, sec); }
    this.decorate(root);
  }
  /* Every figure in a document gets a button that opens it in a split of its own. */
  private splitButtons(root: HTMLElement, sec: SectionId): void {
    root.querySelectorAll<HTMLElement>('figure.demo[id] .demo-head').forEach((head) => {
      if (head.querySelector('.fig-split')) return;
      const local = (head.closest('figure')!.id).replace(`${sec}-`, '');
      const b = document.createElement('button'); b.type = 'button'; b.className = 'fig-split'; b.dataset.key = itemKey(figItem(sec, local));
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
    const chapterData = this.chapters[ch.dir] ? Promise.resolve() : Promise.all([fetch(ch.concepts).then((r) => r.json()), fetch(ch.formulas).then((r) => r.json())]).then(([concepts, formulas]) => this.setChapter(ch.dir, { concepts, formulas }));
    const script = new Promise<void>((res) => { const s = document.createElement('script'); s.src = e.figures; s.onload = () => res(); s.onerror = () => res(); document.body.appendChild(s); });
    const html = fetch(e.fragment).then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.text(); });
    this.loading[sec] = Promise.all([chapterData, script, html])
      .then(([, , text]) => { const t = document.createElement('template'); t.innerHTML = text; this.adopt(t.content); })
      .catch((err: Error) => { this.sections = { ...this.sections, [sec]: { meta: null, exercises: [], docs: {}, src: {}, status: 'failed', error: err.message } }; })
      .finally(() => { delete this.loading[sec]; });
    return this.loading[sec]!;
  }

  /* One figure on its own: a root holding just that figure's static markup, with the section script booted on it. */
  figureFor(group: GroupKey, id: Extract<ItemId, { kind: 'fig' }>): HTMLElement | null {
    const ck = `${group}|${itemKey(id)}`;
    if (this.clones[ck]) return this.clones[ck];
    const src = this.sections[id.section]?.src.text; if (!src) return null;
    const t = document.createElement('template'); t.innerHTML = src;
    const f = t.content.querySelector<HTMLElement>(`[id="${id.section}-${id.fig}"]`); if (!f) return null;
    const root = document.createElement('div'); root.className = 'fig-root'; root.dataset.sec = id.section; root.dataset.chapter = this.chapterOf(id.section)?.dir ?? ''; root.dataset.one = '1'; root.appendChild(f);
    this.bootFigures(root, id.section);
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
