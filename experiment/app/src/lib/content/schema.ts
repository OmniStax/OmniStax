/* DTOs at the content boundary. The files under the content root are parsed
   into these; fields may be renamed or dropped here and nowhere else. */
import { z } from 'zod';

const zColor = z.object({ label: z.string(), light: z.string(), dark: z.string() });

export const zBook = z.object({
  id: z.string(),
  title: z.string(),
  publisher: z.string(),
  authors: z.array(z.string()).default([]),
  source_url: z.string().url().optional(),   /* the book at the publisher */
  copyright: z.string().optional(),          /* the holder named in the book's copyright notice */
  license: z.string(),
  license_url: z.string().url().optional(),
  openstax: z.string().url().optional(),     /* prefix of the publisher's section pages; a chapter's section slugs complete it */
  chapters: z.array(z.string()),
  colors: z.record(zColor).default({}),
  macros: z.record(z.string()).default({}),
  symbols: z.record(z.string()).default({}),
  exercise_kinds: z.record(z.string()).default({}),
}).transform((b) => ({
  id: b.id, title: b.title, publisher: b.publisher, authors: b.authors, sourceUrl: b.source_url, copyright: b.copyright, license: b.license, licenseUrl: b.license_url, openstax: b.openstax,
  chapterDirs: b.chapters, colors: b.colors, macros: b.macros, symbols: b.symbols, exerciseKinds: b.exercise_kinds,
}));
export type BookDTO = z.infer<typeof zBook>;

export const zChapterSectionRef = z.object({ id: z.string(), module: z.string().optional(), title: z.string(), slug: z.string().optional() });
export const zChapter = z.object({ id: z.string(), dir: z.string(), title: z.string(), intro_module: z.string().optional(), sections: z.array(zChapterSectionRef) })
  .transform((c) => ({ id: c.id, dir: c.dir, title: c.title, sections: c.sections }));
export type ChapterDTO = z.infer<typeof zChapter>;

export const zSectionMeta = z.object({
  id: z.string(), module: z.string().optional(), chapter: z.string(), title: z.string(), short: z.string().optional(),
  lead: z.string().default(''), objectives: z.array(z.string()).default([]), summary_html: z.string().default(''), notes: z.string().default(''),
}).transform((s) => ({ id: s.id, chapter: s.chapter, title: s.title, short: s.short ?? s.title, lead: s.lead, objectives: s.objectives, summaryHtml: s.summary_html, notes: s.notes }));
export type SectionMetaDTO = z.infer<typeof zSectionMeta>;

/* Answers are an ADT: each type carries its own fields and its own checker. */
const zGen = z.enum(['source', 'ai']).default('source');
const zPart = z.object({ part: z.string(), value: z.number(), unit: z.string().default(''), hint: z.string().optional() });
export const zAnswer = z.discriminatedUnion('type', [
  z.object({ type: z.literal('number'), value: z.number(), unit: z.string().default(''), part: z.string().optional(), hint: z.string().optional(), solution: z.string().optional(), generated_by: zGen }),
  z.object({ type: z.literal('multi'), parts: z.array(zPart), solution: z.string().optional(), generated_by: zGen }),
  z.object({ type: z.literal('choice'), options: z.array(z.string()), correct: z.number().int(), hint: z.string().optional(), solution: z.string().optional(), generated_by: zGen }),
  z.object({ type: z.literal('open'), solution: z.string().optional(), generated_by: zGen }),
]);
export type AnswerDTO = z.infer<typeof zAnswer>;

export const zExercise = z.object({
  id: z.string(), kind: z.string(), bloom: z.string(), tag: z.string().optional(), concepts: z.array(z.string()).default([]),
  place: z.string().default('end'), cite: z.string().optional(), prompt: z.string(), answer: zAnswer,
  figure: z.object({ src: z.string(), alt: z.string().default(''), caption: z.string().default('') }).optional(),   /* a book figure the problem refers to, kept in the card */
});
export type ExerciseDTO = z.infer<typeof zExercise>;
export const zExerciseFile = z.object({ exercises: z.array(zExercise) });

export const zConcept = z.object({
  id: z.string(), kind: z.enum(['idea', 'result', 'skill']).default('idea'), section: z.string(), name: z.string(),
  prereqs: z.array(z.string()).default([]), why: z.string().optional(), evidence: z.string().optional(), eq: z.string().optional(), placeholder: z.boolean().default(false),
});
export type ConceptDTO = z.infer<typeof zConcept>;
export const zCoverage = z.object({ span: z.string(), introduces: z.array(z.string()).default([]), uses: z.array(z.string()).default([]), reinforces: z.array(z.string()).default([]) });
export type CoverageDTO = z.infer<typeof zCoverage>;
export const zConceptsFile = z.object({ chapter: z.string().optional(), concepts: z.array(zConcept), coverage: z.array(zCoverage).default([]) })
  .transform((f) => ({ concepts: f.concepts, coverage: f.coverage }));
export type ConceptsDTO = z.infer<typeof zConceptsFile>;

export const zVariable = z.object({ sym: z.string(), color: z.string().optional(), meaning: z.string(), unit: z.string().default(''), section: z.string() });
export const zEquation = z.object({
  id: z.string(), concept: z.string().optional(), section: z.string(), latex: z.string(), ktex: z.string().optional(), anchor: z.string().optional(),
  important: z.boolean().default(false), constant_a: z.boolean().optional(),
}).transform((e) => ({ id: e.id, section: e.section, tex: e.ktex ?? e.latex, anchor: e.anchor, important: e.important, constantA: e.constant_a }));
export const zGlossary = z.object({ section: z.string(), term: z.string(), definition: z.string() });
export const zFormulasFile = z.object({ chapter: z.string().optional(), variables: z.array(zVariable).default([]), equations: z.array(zEquation).default([]), glossary: z.array(zGlossary).default([]) })
  .transform((f) => ({ variables: f.variables, equations: f.equations, glossary: f.glossary }));
export type FormulasDTO = z.infer<typeof zFormulasFile>;
export type VariableDTO = z.infer<typeof zVariable>;
export type EquationDTO = z.infer<typeof zEquation>;
export type GlossaryDTO = z.infer<typeof zGlossary>;

/* What the shell receives about the book: the manifest the pages and the picker are built from. */
export type SectionEntry = { readonly id: string; readonly title: string; readonly built: boolean; readonly url: string; readonly fragment: string; readonly figures: string; readonly openstax?: string };
export type ChapterEntry = { readonly id: string; readonly dir: string; readonly title: string; readonly concepts: string; readonly formulas: string; readonly sections: readonly SectionEntry[] };
export type BookManifest = {
  readonly id: string; readonly title: string; readonly publisher: string; readonly authors: readonly string[]; readonly sourceUrl?: string; readonly copyright?: string;
  readonly license: string; readonly licenseUrl?: string; readonly openstax?: string;
  readonly colors: BookDTO['colors']; readonly macros: BookDTO['macros']; readonly symbols: BookDTO['symbols']; readonly exerciseKinds: BookDTO['exerciseKinds'];
  readonly chapters: readonly ChapterEntry[];
};
