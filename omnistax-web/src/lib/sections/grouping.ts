/* One list of things the book says, cut into the shape a view draws. Formulas,
   definitions and notes all carry a section id and nothing else about where they
   belong, so each of them groups the same way: by section, by chapter, in the
   order the book sets, and split into what the view's target covers and what
   lies outside it. The split is what the one fold rule folds away. Pure, so the
   views only have to render. */
import { type ChapterId, type SectionId, chapterId, sectionId } from '../types/ids';
import { chapterOf, type Target } from './scope';
import type { BookTree } from '../commands/browser';

export type SectionGroup<T> = { readonly section: SectionId; readonly title: string; readonly items: readonly T[] };
export type ChapterGroup<T> = { readonly chapter: ChapterId; readonly title: string; readonly sections: readonly SectionGroup<T>[] };
export type Grouped<T> = { readonly inside: readonly ChapterGroup<T>[]; readonly outside: readonly ChapterGroup<T>[] };

/* What a chapter or a section is called on the line above its items; a place the book
   has lost the title of is named by its id alone. */
export const label = (id: string, title: string): string => (title ? `${id} · ${title}` : id);
export const countOf = <T>(groups: readonly ChapterGroup<T>[]): number => groups.reduce((n, c) => n + c.sections.reduce((m, s) => m + s.items.length, 0), 0);

/* Whether a section falls inside the target: the section itself, any section its
   chapter lists — built or not, since a chapter's data names them all — and at the
   book every section there is, so nothing is ever left outside. */
const covers = (target: Target, tree: BookTree, section: SectionId): boolean =>
  target.level === 'book' ? true : target.level === 'section' ? section === target.section : chapterOf(tree, section) === target.chapter;

/* Chapters as the tree lists them, sections likewise; a section the tree does not know
   sorts last, in a chapter group of its own named by the section's id, so nothing is lost. */
const chapterGroups = <T>(items: readonly T[], sectionOf: (t: T) => SectionId, tree: BookTree): readonly ChapterGroup<T>[] => {
  const of = (section: SectionId): readonly T[] => items.filter((t) => sectionOf(t) === section);
  const known = new Set(tree.chapters.flatMap((c) => c.sections.map((s) => s.id)));
  const strays = [...new Set(items.map(sectionOf))].filter((s) => !known.has(s));
  return [
    ...tree.chapters.map((c) => ({ chapter: chapterId(c.id), title: c.title, sections: c.sections.map((s) => ({ section: sectionId(s.id), title: s.title, items: of(sectionId(s.id)) })) })),
    ...strays.map((s) => ({ chapter: chapterId(s), title: '', sections: [{ section: s, title: '', items: of(s) }] })),
  ];
};
const keep = <T>(groups: readonly ChapterGroup<T>[], wanted: (s: SectionId) => boolean): readonly ChapterGroup<T>[] =>
  groups.map((c) => ({ ...c, sections: c.sections.filter((s) => s.items.length > 0 && wanted(s.section)) })).filter((c) => c.sections.length > 0);

/* The book's things in book order, on the target's side of the line or beyond it. */
export const groupBySection = <T>(items: readonly T[], sectionOf: (t: T) => SectionId, target: Target, tree: BookTree): Grouped<T> => {
  const groups = chapterGroups(items, sectionOf, tree);
  const inside = (s: SectionId): boolean => covers(target, tree, s);
  return { inside: keep(groups, inside), outside: keep(groups, (s) => !inside(s)) };
};

/* What the fold below the target is called; at the book there is nothing outside to name. */
export const outsideLabel = (target: Target): string =>
  target.level === 'section' ? 'Elsewhere in the chapter' : target.level === 'chapter' ? 'Elsewhere in the book' : '';
