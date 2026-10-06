import { isConceptPick, isExercisePick, isPlacePick, conceptsOf, type Catalog, type Curriculum, type Pick, type PlacePick } from './model';
import { conceptId, type SectionId } from '../types/ids';

export type Node =
  | { readonly level: 'book'; readonly book: string }
  | { readonly level: 'chapter'; readonly book: string; readonly chapter: string }
  | { readonly level: 'section'; readonly book: string; readonly chapter: string; readonly section: SectionId }
  | { readonly level: 'concept'; readonly concept: string }
  | { readonly level: 'exercise'; readonly book: string; readonly section: SectionId; readonly ex: string };
export type Check = 'on' | 'some' | 'off';
export type Shape = { readonly chapters: (book: string) => readonly string[]; readonly conceptsIn: (book: string, section: SectionId) => readonly string[] };
type Summary = { readonly books: number; readonly chapters: number; readonly sections: number; readonly concepts: number; readonly exercises: number };

const isBookPick = (p: Pick, book: string): boolean => isPlacePick(p) && p.book === book && !p.chapter && !p.section;
const isChapterPick = (p: Pick, book: string, chapter: string): boolean => isPlacePick(p) && p.book === book && p.chapter === chapter && !p.section;
const isSectionPick = (p: Pick, book: string, section: SectionId): boolean => isPlacePick(p) && p.book === book && p.section === section;
const inBook = (p: Pick, book: string): boolean => isPlacePick(p) && p.book === book;
const inChapter = (p: Pick, book: string, chapter: string, cat: Catalog): boolean =>
  isChapterPick(p, book, chapter) || (isPlacePick(p) && p.book === book && !!p.section && (p.chapter === chapter || cat.sectionsOf(book, chapter).includes(p.section)));
const roll = (checks: readonly Check[]): Check => checks.length > 0 && checks.every((k) => k === 'on') ? 'on' : checks.some((k) => k !== 'off') ? 'some' : 'off';

export const checkOf = (c: Curriculum, node: Node, cat: Catalog, shape: Shape): Check => {
  switch (node.level) {
    case 'exercise': return c.some((p) => isExercisePick(p) && p.exercise.book === node.book && p.exercise.section === node.section && p.exercise.ex === node.ex) ? 'on' : 'off';
    case 'concept':
      if (c.some((p) => isConceptPick(p) && p.concept === node.concept)) return 'on';
      if (conceptsOf(c, cat).has(node.concept)) return 'some';
      return c.filter(isExercisePick).some((p) => cat.exercises.some((e) => e.book === p.exercise.book && e.section === p.exercise.section && e.ex.id === p.exercise.ex && e.ex.concepts.includes(conceptId(node.concept)))) ? 'some' : 'off';
    case 'section': {
      if (c.some((p) => isBookPick(p, node.book) || isChapterPick(p, node.book, node.chapter) || isSectionPick(p, node.book, node.section))) return 'on';
      const inside = new Set(shape.conceptsIn(node.book, node.section));
      return c.some((p) => isExercisePick(p) ? p.exercise.book === node.book && p.exercise.section === node.section : isConceptPick(p) && inside.has(p.concept)) ? 'some' : 'off';
    }
    case 'chapter':
      if (c.some((p) => isBookPick(p, node.book) || isChapterPick(p, node.book, node.chapter))) return 'on';
      return roll(cat.sectionsOf(node.book, node.chapter).map((section) => checkOf(c, { level: 'section', book: node.book, chapter: node.chapter, section }, cat, shape)));
    case 'book':
      if (c.some((p) => isBookPick(p, node.book))) return 'on';
      return roll(shape.chapters(node.book).map((chapter) => checkOf(c, { level: 'chapter', book: node.book, chapter }, cat, shape)));
  }
};

const toggled = (c: Curriculum, pick: Pick, matches: (p: Pick) => boolean, on: boolean): Curriculum =>
  on ? (c.some(matches) ? c : [...c, pick]) : c.filter((p) => !matches(p));

export const setNode = (c: Curriculum, node: Node, on: boolean, cat: Catalog, shape: Shape): Curriculum => {
  if (node.level === 'exercise') {
    const exercise = { book: node.book, section: node.section, ex: node.ex };
    return toggled(c, { exercise }, (p) => isExercisePick(p) && p.exercise.book === node.book && p.exercise.section === node.section && p.exercise.ex === node.ex, on);
  }
  if (node.level === 'concept') return toggled(c, { concept: conceptId(node.concept) }, (p) => isConceptPick(p) && p.concept === node.concept, on);
  const { book } = node, hasBook = c.some((p) => isBookPick(p, book));
  if (node.level === 'book') return !on ? c.filter((p) => !inBook(p, book)) : hasBook ? c : [...c.filter((p) => !inBook(p, book)), { book }];
  const { chapter } = node, hasChapter = c.some((p) => isChapterPick(p, book, chapter));
  const otherChapters = (): readonly PlacePick[] => hasBook ? shape.chapters(book).filter((k) => k !== chapter).map((k) => ({ book, chapter: k })) : [];
  const withoutAncestors = (keep: Curriculum): Curriculum => keep.filter((p) => !isBookPick(p, book));
  if (node.level === 'chapter') {
    if (on) return hasBook || hasChapter ? c : [...c.filter((p) => !inChapter(p, book, chapter, cat)), { book, chapter }];
    return [...withoutAncestors(c.filter((p) => !inChapter(p, book, chapter, cat))), ...otherChapters()];
  }
  const { section } = node;
  if (on) return hasBook || hasChapter ? c : toggled(c, { book, chapter, section }, (p) => isSectionPick(p, book, section), true);
  const otherSections: readonly PlacePick[] = hasBook || hasChapter ? cat.sectionsOf(book, chapter).filter((s) => s !== section).map((s) => ({ book, chapter, section: s })) : [];
  return [...withoutAncestors(c.filter((p) => !isSectionPick(p, book, section) && !isChapterPick(p, book, chapter))), ...otherChapters(), ...otherSections];
};

export const summaryOf = (c: Curriculum): Summary => {
  const places = c.filter(isPlacePick);
  return {
    books: places.filter((p) => !p.chapter && !p.section).length,
    chapters: places.filter((p) => p.chapter && !p.section).length,
    sections: places.filter((p) => p.section).length,
    concepts: c.filter(isConceptPick).length,
    exercises: c.filter(isExercisePick).length,
  };
};
