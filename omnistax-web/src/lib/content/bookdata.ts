/* The three book-level files, both ways: composing them at build time out of
   what the tree already holds, and taking a chapter back out of them in the
   browser. The per-page files stay what one open page reads; these are what a
   view standing over the whole book reads instead of hundreds of them.

   Everything here is pure, and the arguments are the smallest shape that will
   do rather than the build's trees, so the browser side of it can be tested
   without the content root. */
import type { BookConceptsDTO, BookExercisesDTO, BookFormulasDTO, ConceptsDTO, CoverageDTO, ExerciseDTO, FormulasDTO } from './schema';
import type { ConceptId } from '../types/ids';

/* One chapter as the build has it here: where it is served from, and the two
   tables it would otherwise serve on its own. */
export type ChapterTables = { readonly dir: string; readonly concepts: ConceptsDTO; readonly formulas: FormulasDTO };
/* One built page as the build has it here: its id and its problem set. */
export type SectionExercises = { readonly id: string; readonly exercises: readonly ExerciseDTO[] };

export const EMPTY_FORMULAS: FormulasDTO = { variables: [], equations: [], glossary: [] };
const EMPTY_CONCEPTS: ConceptsDTO = { concepts: [], coverage: [] };

/* Every built section's problem set, by section id. */
export const bookExercisesOf = (sections: readonly SectionExercises[]): BookExercisesDTO =>
  Object.fromEntries(sections.map((s) => [s.id, [...s.exercises]]));

/* Every chapter's formula sheet, by chapter directory. */
export const bookFormulasOf = (chapters: readonly ChapterTables[]): BookFormulasDTO =>
  Object.fromEntries(chapters.map((c) => [c.dir, c.formulas]));

/* Every concept of the book once, with each chapter left holding only the ids
   it reaches and the coverage of its own sections. The first chapter to name a
   concept carries its row, and the rows are the same object a chapter file
   would have served, so nothing is lost by the fold. */
export const bookConceptsOf = (chapters: readonly ChapterTables[]): BookConceptsDTO => {
  const concepts = new Map<string, BookConceptsDTO['concepts'][number]>();
  chapters.forEach((ch) => ch.concepts.concepts.forEach((c) => { if (!concepts.has(c.id)) concepts.set(c.id, c); }));
  return {
    concepts: [...concepts.values()],
    chapters: Object.fromEntries(chapters.map((ch) => [ch.dir, {
      concepts: ch.concepts.concepts.map((c) => c.id),
      coverage: [...ch.concepts.coverage] as CoverageDTO[],
    }])),
  };
};

/* A chapter's own `ConceptsDTO` back out of the book file: the rows it names,
   in the order it named them, and its coverage. A chapter the file does not
   carry has nothing to say, and an id with no row behind it is dropped rather
   than faked — the map would have nothing to draw from it. */
export const chapterConceptsOf = (book: BookConceptsDTO, dir: string): ConceptsDTO => {
  const entry = book.chapters[dir];
  if (!entry) return EMPTY_CONCEPTS;
  const byId = new Map(book.concepts.map((c) => [String(c.id), c]));
  return {
    concepts: entry.concepts.flatMap((id: ConceptId) => { const c = byId.get(String(id)); return c ? [c] : []; }),
    coverage: [...entry.coverage],
  };
};
