/* The book as a small file tree: chapters, one chapter's sections, one
   section's two documents. Pure, so the walk is testable without a DOM; the
   component keeps only where it stands (Level), what it filtered and what is
   selected. A Level names a place in the tree, a Row is one line drawn at that
   place, and the keys are stable so a row survives filtering and a step back
   re-selects the row it came from. */
import { type DocKind, type SectionId, sectionId, docItem, itemKey } from '../types/ids';

/* What the tree needs of the book; the manifest (content/schema) is assignable to it. */
export type SectionNode = { readonly id: string; readonly title: string; readonly built: boolean };
export type ChapterNode = { readonly id: string; readonly title: string; readonly sections: readonly SectionNode[] };
export type BookTree = { readonly title: string; readonly chapters: readonly ChapterNode[] };

export type Level =
  | { readonly kind: 'chapters' }
  | { readonly kind: 'sections'; readonly chapter: string }                             /* chapter id */
  | { readonly kind: 'docs'; readonly chapter: string; readonly section: SectionId };
export const CHAPTERS: Level = { kind: 'chapters' };

export type Row =
  | { readonly kind: 'chapter'; readonly key: string; readonly label: string; readonly detail: string; readonly enterable: true; readonly chapter: string }
  | { readonly kind: 'section'; readonly key: string; readonly label: string; readonly detail: string; readonly enterable: boolean; readonly section: SectionId; readonly built: boolean }
  | { readonly kind: 'doc'; readonly key: string; readonly label: string; readonly detail: string; readonly enterable: false; readonly section: SectionId; readonly doc: DocKind };

const DOCS: readonly (readonly [DocKind, string])[] = [['text', 'Text'], ['exercises', 'Exercises']];
export const chapterKey = (id: string): string => `ch:${id}`;
export const sectionKey = (id: string): string => `sec:${id}`;

const chapterOf = (tree: BookTree, id: string): ChapterNode | undefined => tree.chapters.find((c) => c.id === id);
const sectionOf = (tree: BookTree, level: Extract<Level, { kind: 'docs' }>): SectionNode | undefined =>
  chapterOf(tree, level.chapter)?.sections.find((s) => s.id === level.section);
const named = (id: string, title: string): string => `${id} ${title}`;

/* A chapter's detail counts every section it lists, since the level below draws them all;
   when some are not yet built it says how many of them can be opened. */
const chapterRow = (c: ChapterNode): Row => {
  const total = c.sections.length; const built = c.sections.filter((s) => s.built).length;
  const detail = built === total ? `${total} section${total === 1 ? '' : 's'}` : `${built} of ${total} sections`;
  return { kind: 'chapter', key: chapterKey(c.id), label: named(c.id, c.title), detail, enterable: true, chapter: c.id };
};
const sectionRow = (s: SectionNode): Row =>
  ({ kind: 'section', key: sectionKey(s.id), label: named(s.id, s.title), detail: s.built ? '' : 'not yet built', enterable: s.built, section: sectionId(s.id), built: s.built });
const docRow = (sec: SectionId, doc: DocKind, label: string): Row =>
  ({ kind: 'doc', key: itemKey(docItem(sec, doc)), label, detail: '', enterable: false, section: sec, doc });

/* The lines at a level; an id the book does not know gives nothing to draw. */
export const rowsAt = (tree: BookTree, level: Level): readonly Row[] => {
  if (level.kind === 'chapters') return tree.chapters.map(chapterRow);
  if (level.kind === 'sections') return chapterOf(tree, level.chapter)?.sections.map(sectionRow) ?? [];
  return sectionOf(tree, level) ? DOCS.map(([doc, label]) => docRow(level.section, doc, label)) : [];
};

/* One step in: a chapter, or a section that has been built. */
export const enter = (level: Level, row: Row): Level | null => {
  if (row.kind === 'chapter') return { kind: 'sections', chapter: row.chapter };
  if (row.kind === 'section' && row.built && level.kind === 'sections') return { kind: 'docs', chapter: level.chapter, section: row.section };
  return null;
};
export const up = (level: Level): Level | null =>
  level.kind === 'docs' ? { kind: 'sections', chapter: level.chapter } : level.kind === 'sections' ? CHAPTERS : null;

/* The book, then the chapter, then the section: an id the book has lost keeps its raw form. */
export const crumbs = (tree: BookTree, level: Level): readonly string[] => {
  if (level.kind === 'chapters') return [tree.title];
  const c = chapterOf(tree, level.chapter);
  const chapter = c ? named(c.id, c.title) : level.chapter;
  if (level.kind === 'sections') return [tree.title, chapter];
  const s = sectionOf(tree, level);
  return [tree.title, chapter, s ? named(s.id, s.title) : level.section];
};

const depthOf = (level: Level): number => (level.kind === 'chapters' ? 0 : level.kind === 'sections' ? 1 : 2);
/* The ancestor a breadcrumb stands for: 0 is the book, 1 its chapter, 2 the section. */
export const levelAt = (level: Level, depth: number): Level =>
  depth >= depthOf(level) ? level : levelAt(up(level) ?? level, depth);

/* Where to open: beside the section being read, else at the top of the book. */
export const start = (tree: BookTree, focused: SectionId | null): { readonly level: Level; readonly select: string | null } => {
  const c = focused === null ? undefined : tree.chapters.find((x) => x.sections.some((s) => s.id === focused));
  return c && focused !== null ? { level: { kind: 'sections', chapter: c.id }, select: sectionKey(focused) } : { level: CHAPTERS, select: null };
};

/* The row in the parent level that leads here, so stepping back lands on it again. */
export const keyOfLevel = (level: Level): string | null =>
  level.kind === 'sections' ? chapterKey(level.chapter) : level.kind === 'docs' ? sectionKey(level.section) : null;
