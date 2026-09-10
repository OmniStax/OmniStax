/* Another book of the library, as a practice session needs to see it: its
   manifest, the concepts its chapters teach and the exercises its sections set.
   The build writes all three as JSON beside the pages, so a foreign book is
   read over the wire rather than bundled — this module is only the reading of
   it, and the joining of what came back to the book being read.

   Everything here is pure: the parsers are hand-written where the wire format
   is the manifest (which has no zod schema of its own, being built rather than
   read from disk) and zod's where the content root already has one. A file
   that will not parse comes back empty rather than thrown, because a book that
   half-loaded is still worth practising from. */
import { z } from 'zod';
import { ServedConceptsSchema, ServedExerciseSchema } from '../content/schema';
import type { BookManifest, ChapterEntry, ConceptDTO, CoverageDTO, ExerciseDTO, SectionEntry } from '../content/schema';
import { bookId, sectionId } from '../types/ids';
import type { Catalog } from './model';

/* One foreign book, whole: what `/${id}/book.json` said, what its chapters'
   concepts.json held, and its exercises by section id — section ids are unique
   inside a book, which is all this record has to be. */
export type ForeignBook = {
  readonly manifest: BookManifest;
  readonly concepts: readonly ConceptDTO[];
  readonly coverage: readonly CoverageDTO[];
  readonly exercises: Readonly<Record<string, readonly ExerciseDTO[]>>;   /* by section id */
};

const obj = (raw: unknown): Record<string, unknown> | null => (typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const arr = (v: unknown): readonly unknown[] => (Array.isArray(v) ? v : []);

/* The sections of a book that were actually built, in the manifest's order: the
   only ones with a problem set to fetch. */
export const builtSections = (m: BookManifest): readonly SectionEntry[] => m.chapters.flatMap((c) => c.sections.filter((s) => s.built));

const parseSection = (raw: unknown): SectionEntry[] => {
  const o = obj(raw); if (!o || !str(o.id)) return [];
  const url = str(o.url);
  return [{
    id: str(o.id), title: str(o.title), built: o.built === true, url,
    fragment: str(o.fragment) || `${url}doc.html`, figuresJs: str(o.figuresJs) || `${url}figures.js`,
    figures: [], binds: [], exercises: [],   /* the shell reads these off the book it is reading; a foreign book is only practised from */
  }];
};
const parseChapter = (raw: unknown): ChapterEntry[] => {
  const o = obj(raw); if (!o) return [];
  const id = str(o.id), dir = str(o.dir);
  if (!id && !dir) return [];
  return [{ id: id || dir, dir: dir || id, title: str(o.title), concepts: str(o.concepts), formulas: str(o.formulas), sections: arr(o.sections).flatMap(parseSection) }];
};
/* A manifest off the wire. Only what a session draws on is read — the book's
   name, its chapters and their built sections — and the rest is defaulted, so
   a manifest written by a later build still loads. Nothing comes of a file
   without an id or without chapters: there would be nothing to practise. */
export const parseManifest = (raw: unknown): BookManifest | null => {
  const o = obj(raw); if (!o || !str(o.id) || !Array.isArray(o.chapters)) return null;
  return {
    id: bookId(str(o.id)), title: str(o.title), publisher: '', authors: [], license: '',
    types: {}, macros: {}, symbols: {}, exerciseKinds: {},
    chapters: o.chapters.flatMap(parseChapter),
  };
};

/* The chapter's concepts and coverage, by the same schema the shell reads for
   the book it is in. */
export const parseConcepts = (raw: unknown): { concepts: ConceptDTO[]; coverage: CoverageDTO[] } => {
  const p = ServedConceptsSchema.safeParse(raw);
  return p.success ? { concepts: [...p.data.concepts], coverage: [...p.data.coverage] } : { concepts: [], coverage: [] };
};
/* A section's problem set. One bad row fails the array, which is the honest
   answer: an exercise the app cannot read is one it must not draw. */
export const parseExercises = (raw: unknown): ExerciseDTO[] => {
  const p = z.array(ServedExerciseSchema).safeParse(raw);
  return p.success ? p.data : [];
};

const builtOf = (c: ChapterEntry) => c.sections.filter((s) => s.built).map((s) => sectionId(s.id));

/* The book being read, joined with the books loaded beside it. Concept ids are
   canonical, so the same concept taught by two books is one concept here: the
   first seen wins, and the book being read is seen first. Places stay their
   own book's, since section ids are not unique across books, and every foreign
   exercise carries the book it came from. */
export const mergeCatalog = (home: Catalog, foreign: readonly [bookId: string, ForeignBook][]): Catalog => {
  if (!foreign.length) return home;
  const byBook = new Map(foreign);
  const byId = new Map<string, ConceptDTO>();
  [home.concepts, ...foreign.map(([, b]) => b.concepts)].forEach((list) => list.forEach((c) => { if (!byId.has(c.id)) byId.set(c.id, c); }));
  const chapterOf = (book: string, chapter: string): ChapterEntry | undefined =>
    byBook.get(book)?.manifest.chapters.find((c) => c.id === chapter || c.dir === chapter);
  return {
    concepts: [...byId.values()],
    sectionsOf: (book, chapter) => { const h = home.sectionsOf(book, chapter); if (h.length) return h; const c = chapterOf(book, chapter); return c ? builtOf(c) : []; },
    allSections: (book) => { const h = home.allSections(book); if (h.length) return h; const b = byBook.get(book); return b ? b.manifest.chapters.flatMap(builtOf) : []; },
    exercises: [
      ...home.exercises,
      ...foreign.flatMap(([book, b]) => Object.entries(b.exercises).flatMap(([section, list]) => list.map((ex) => ({ book, section: sectionId(section), ex })))),
    ],
  };
};
