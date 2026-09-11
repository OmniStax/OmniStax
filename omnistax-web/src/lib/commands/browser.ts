/* The book as a small file tree: chapters, one chapter's sections, one
   section's two documents, and below a document the figures or the single
   exercises it holds. Pure, so the walk is testable without a DOM; the
   component keeps only where it stands (Level), what it filtered and what is
   selected. A Level names a place in the tree, a Row is one line drawn at that
   place, and the keys are stable so a row survives filtering and a step back
   re-selects the row it came from. The same tree is walked to pick a place in
   the book rather than to open something — that is the Mode, and in it the
   rows stop at sections and stand for a scope a view can be pinned to. */
import { type DocKind, type SectionId, sectionId, chapterId, docItem, figItem, exItem, itemKey } from '../types/ids';
import type { Target } from '../sections/scope';   /* type only: scope.ts reads BookTree from here */

/* What the tree needs of the book; the manifest (content/schema) is assignable to it.
   A section's figures and exercises are optional, since a tree may be described without them. */
export type FigureNode = { readonly id: string; readonly label: string };
export type ExerciseNode = { readonly id: string; readonly kind: string };
export type SectionNode = { readonly id: string; readonly title: string; readonly built: boolean; readonly figures?: readonly FigureNode[]; readonly exercises?: readonly ExerciseNode[] };
/* A chapter's introduction and summary, where it keeps them, are pages beside its sections and are named here so a scope can find the chapter of one; the tree lists only the sections. */
export type ChapterNode = { readonly id: string; readonly title: string; readonly intro?: SectionNode; readonly sections: readonly SectionNode[]; readonly summary?: SectionNode };
export type BookTree = { readonly title: string; readonly chapters: readonly ChapterNode[]; readonly exerciseKinds?: Readonly<Record<string, string>> };

export type Level =
  | { readonly kind: 'chapters' }
  | { readonly kind: 'sections'; readonly chapter: string }                                 /* chapter id */
  | { readonly kind: 'docs'; readonly chapter: string; readonly section: SectionId }
  | { readonly kind: 'figures'; readonly chapter: string; readonly section: SectionId }
  | { readonly kind: 'exercises'; readonly chapter: string; readonly section: SectionId };
export const CHAPTERS: Level = { kind: 'chapters' };

/* Opening a document, a figure or an exercise, or picking the place a view stands at. */
export type Mode = 'open' | 'pick';

export type Row =
  | { readonly kind: 'book'; readonly key: string; readonly label: string; readonly detail: string; readonly enterable: false; readonly openable: true }
  | { readonly kind: 'chapter'; readonly key: string; readonly label: string; readonly detail: string; readonly enterable: true; readonly openable: boolean; readonly chapter: string }
  | { readonly kind: 'section'; readonly key: string; readonly label: string; readonly detail: string; readonly enterable: boolean; readonly openable: boolean; readonly section: SectionId; readonly built: boolean }
  | { readonly kind: 'doc'; readonly key: string; readonly label: string; readonly detail: string; readonly enterable: boolean; readonly openable: true; readonly section: SectionId; readonly doc: DocKind }
  | { readonly kind: 'fig'; readonly key: string; readonly label: string; readonly detail: string; readonly enterable: false; readonly openable: true; readonly section: SectionId; readonly fig: string }
  | { readonly kind: 'ex'; readonly key: string; readonly label: string; readonly detail: string; readonly enterable: false; readonly openable: true; readonly section: SectionId; readonly ex: string };

const DOCS: readonly (readonly [DocKind, string])[] = [['text', 'Text'], ['exercises', 'Exercises']];
export const chapterKey = (id: string): string => `ch:${id}`;
export const sectionKey = (id: string): string => `sec:${id}`;
export const BOOK_KEY = 'book';

type Below = Extract<Level, { kind: 'docs' | 'figures' | 'exercises' }>;
const chapterOf = (tree: BookTree, id: string): ChapterNode | undefined => tree.chapters.find((c) => c.id === id);
const sectionOf = (tree: BookTree, level: Below): SectionNode | undefined =>
  chapterOf(tree, level.chapter)?.sections.find((s) => s.id === level.section);
const named = (id: string, title: string): string => `${id} ${title}`;
/* What a document leads to one level further in: the section's figures, or its single exercises. */
const listOf = (s: SectionNode, doc: DocKind): readonly { readonly id: string }[] => (doc === 'text' ? s.figures ?? [] : s.exercises ?? []);

/* A chapter's detail counts every section it lists, since the level below draws them all;
   when some are not yet built it says how many of them can be opened. */
const chapterRow = (c: ChapterNode, mode: Mode): Row => {
  const total = c.sections.length; const built = c.sections.filter((s) => s.built).length;
  const detail = built === total ? `${total} section${total === 1 ? '' : 's'}` : `${built} of ${total} sections`;
  return { kind: 'chapter', key: chapterKey(c.id), label: named(c.id, c.title), detail, enterable: true, openable: mode === 'pick', chapter: c.id };
};
/* A section is entered for its documents when it is built; picking one names it whether or not it is. */
const sectionRow = (s: SectionNode, mode: Mode): Row =>
  ({ kind: 'section', key: sectionKey(s.id), label: named(s.id, s.title), detail: s.built ? '' : 'not yet built', enterable: mode === 'open' && s.built, openable: mode === 'pick', section: sectionId(s.id), built: s.built });
const docRow = (s: SectionNode, doc: DocKind, label: string): Row =>
  ({ kind: 'doc', key: itemKey(docItem(sectionId(s.id), doc)), label, detail: '', enterable: listOf(s, doc).length > 0, openable: true, section: sectionId(s.id), doc });
const figRow = (sec: SectionId, f: FigureNode): Row =>
  ({ kind: 'fig', key: itemKey(figItem(sec, f.id)), label: f.label, detail: '', enterable: false, openable: true, section: sec, fig: f.id });
const exRow = (tree: BookTree, sec: SectionId, e: ExerciseNode): Row =>
  ({ kind: 'ex', key: itemKey(exItem(sec, e.id)), label: `${tree.exerciseKinds?.[e.kind] ?? e.kind} ${e.id}`, detail: '', enterable: false, openable: true, section: sec, ex: e.id });
const bookRow = (): Row => ({ kind: 'book', key: BOOK_KEY, label: 'Whole book', detail: '', enterable: false, openable: true });

/* The lines at a level; an id the book does not know gives nothing to draw. */
export const rowsAt = (tree: BookTree, level: Level, mode: Mode = 'open'): readonly Row[] => {
  if (level.kind === 'chapters') { const cs = tree.chapters.map((c) => chapterRow(c, mode)); return mode === 'pick' ? [bookRow(), ...cs] : cs; }
  if (level.kind === 'sections') return chapterOf(tree, level.chapter)?.sections.map((s) => sectionRow(s, mode)) ?? [];
  const s = sectionOf(tree, level); if (!s) return [];
  if (level.kind === 'docs') return DOCS.map(([doc, label]) => docRow(s, doc, label));
  if (level.kind === 'figures') return (s.figures ?? []).map((f) => figRow(level.section, f));
  return (s.exercises ?? []).map((e) => exRow(tree, level.section, e));
};

/* One step in: a chapter, a section that has been built, or a document that has
   something below it. Picking a place stops at the chapter's sections. */
export const enter = (level: Level, row: Row, mode: Mode = 'open'): Level | null => {
  if (row.kind === 'chapter') return { kind: 'sections', chapter: row.chapter };
  if (mode === 'pick') return null;
  if (row.kind === 'section' && row.built && level.kind === 'sections') return { kind: 'docs', chapter: level.chapter, section: row.section };
  if (row.kind === 'doc' && row.enterable && level.kind === 'docs') return { kind: row.doc === 'text' ? 'figures' : 'exercises', chapter: level.chapter, section: level.section };
  return null;
};
export const up = (level: Level): Level | null =>
  level.kind === 'figures' || level.kind === 'exercises' ? { kind: 'docs', chapter: level.chapter, section: level.section }
    : level.kind === 'docs' ? { kind: 'sections', chapter: level.chapter }
      : level.kind === 'sections' ? CHAPTERS : null;

const DOC_LABEL: Readonly<Record<DocKind, string>> = { text: 'Text', exercises: 'Exercises' };
/* The book, then the chapter, then the section, then the document: an id the book has lost keeps its raw form. */
export const crumbs = (tree: BookTree, level: Level): readonly string[] => {
  if (level.kind === 'chapters') return [tree.title];
  const c = chapterOf(tree, level.chapter);
  const chapter = c ? named(c.id, c.title) : level.chapter;
  if (level.kind === 'sections') return [tree.title, chapter];
  const s = sectionOf(tree, level);
  const trail = [tree.title, chapter, s ? named(s.id, s.title) : level.section];
  return level.kind === 'docs' ? trail : [...trail, DOC_LABEL[level.kind === 'figures' ? 'text' : 'exercises']];
};

const depthOf = (level: Level): number => (level.kind === 'chapters' ? 0 : level.kind === 'sections' ? 1 : level.kind === 'docs' ? 2 : 3);
/* The ancestor a breadcrumb stands for: 0 is the book, 1 its chapter, 2 the section, 3 the document. */
export const levelAt = (level: Level, depth: number): Level =>
  depth >= depthOf(level) ? level : levelAt(up(level) ?? level, depth);

/* Where to open: beside the section being read, else at the top of the book. */
export const start = (tree: BookTree, focused: SectionId | null): { readonly level: Level; readonly select: string | null } => {
  const c = focused === null ? undefined : tree.chapters.find((x) => x.sections.some((s) => s.id === focused));
  return c && focused !== null ? { level: { kind: 'sections', chapter: c.id }, select: sectionKey(focused) } : { level: CHAPTERS, select: null };
};

/* The row in the parent level that leads here, so stepping back lands on it again. */
export const keyOfLevel = (level: Level): string | null =>
  level.kind === 'sections' ? chapterKey(level.chapter)
    : level.kind === 'docs' ? sectionKey(level.section)
      : level.kind === 'figures' ? itemKey(docItem(level.section, 'text'))
        : level.kind === 'exercises' ? itemKey(docItem(level.section, 'exercises')) : null;

/* The place in the book a picked row stands for; rows below a section name no scope. */
export const pickTarget = (level: Level, row: Row): Target | null => {
  if (row.kind === 'book') return { level: 'book' };
  if (row.kind === 'chapter') return { level: 'chapter', chapter: chapterId(row.chapter) };
  if (row.kind === 'section' && row.built && level.kind === 'sections') return { level: 'section', section: row.section };
  return null;
};
