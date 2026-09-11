/* The content as tables. Three files hold the book — book.json, a chapter.json
   and a section.json — and each is a record whose scalars describe the level
   itself and whose arrays are tables of flat rows that refer to one another by
   id. This file holds one zod object per table, strict so that an unknown key
   fails the build, and the DTOs the app consumes. Fields may be renamed or
   dropped at this boundary and nowhere else; what is folded together out of
   several tables is derived in load.ts.

   Every field carries a description, because the reference in
   docs/content-format.md is generated from these objects and the
   description is the only place the meaning of a field is written down. */
import { z } from 'zod';
import { type BookId, type EquationId, type SectionId, type SpanId, conceptId, equationId, sectionId, spanId, typeId } from '../types/ids';

/* A row refers to another row by id alone, and the ids are branded so that a
   section is never handed where a concept is asked for. */
const CONCEPT_REF = z.string().transform(conceptId);
const SECTION_REF = z.string().transform(sectionId);
const SPAN_REF = z.string().transform(spanId);
const TYPE_REF = z.string().transform(typeId);
const EQUATION_REF = z.string().transform(equationId);

/* The levels of thinking the pipeline sorts exercises by, from recalling a fact
   to making something new. An exercise is worth points by its level. */
export const BLOOM_LEVELS = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'] as const;
export type Bloom = (typeof BLOOM_LEVELS)[number];
/* What a concept is: an idea in the usual sense, a result derived from ideas, or
   a procedure the book teaches and tests on its own. */
export const CONCEPT_KINDS = ['idea', 'result', 'skill'] as const;
export type ConceptKind = (typeof CONCEPT_KINDS)[number];
/* What a span of the text does with a concept: meets it for the first time,
   leans on it, or comes back to it. */
export const COVERAGE_VERBS = ['introduces', 'uses', 'reinforces'] as const;
export type CoverageVerb = (typeof COVERAGE_VERBS)[number];
/* Who wrote a piece of content: the book it was adapted from, or the AI that
   built the section. */
export const GENERATED_BY = ['source', 'ai'] as const;
export type GeneratedBy = (typeof GENERATED_BY)[number];
/* What a figure is: a simulation the reader can play with, a faithful copy of a
   book figure that the exercises need, or a photograph. */
export const FIGURE_KINDS = ['demo', 'figure', 'photo'] as const;
export type FigureKind = (typeof FIGURE_KINDS)[number];

/* ---------- book.json ---------- */

export const TypeSchema = z.object({
  id: TYPE_REF.describe('The id of the type, which is the class a coloured symbol wears in the text and the key the reader\u2019s colour choices are kept under.'),
  label: z.string().describe('What the book calls quantities of this type, as the legend and the colour menu name them.'),
  dimension: z.string().optional().describe('The unit quantities of this type are measured in, written as the book writes it.'),
}).strict();
export type TypeDTO = z.infer<typeof TypeSchema>;

export const SymbolSchema = z.object({
  sym: z.string().describe('The key the symbol is known by across the book, which is what the text carries in a \\htmlData{sym=\u2026} and what a chapter\u2019s variables are listed under.'),
  latex: z.string().describe('The LaTeX the symbol is set in, without any colour or data of its own.'),
  type: TYPE_REF.optional().describe('The type of quantity the symbol stands for, which is what gives it its colour. A symbol of no type is set in ink.'),
  macro: z.string().optional().describe('The KaTeX macro the text writes the symbol as, such as \\kx. A symbol with no macro is one the hover layer knows but the text writes in plain LaTeX.'),
}).strict();
export type SymbolDTO = z.infer<typeof SymbolSchema>;

export const ExerciseKindSchema = z.object({
  id: z.string().describe('The id an exercise names its kind by.'),
  label: z.string().describe('What the book calls exercises of this kind, as the card\u2019s eyebrow prints it.'),
}).strict();
export type ExerciseKindDTO = z.infer<typeof ExerciseKindSchema>;

export const ConceptSchema = z.object({
  id: CONCEPT_REF.describe('The concept\u2019s id, which is canonical across books, so another textbook\u2019s section on the same matter maps to the same concept.'),
  kind: z.enum(CONCEPT_KINDS).describe('Whether the concept is an idea, a result derived from ideas, or a skill the exercises test on its own.'),
  section: SECTION_REF.describe('The section that introduces the concept. A concept whose section the app has not built yet stands as a placeholder.'),
  name: z.string().describe('The concept\u2019s name as the map prints it, with its equation in $\u2026$ where the name is a result.'),
  why: z.string().optional().describe('Why the concept matters and where it comes from, in the book\u2019s voice. A concept whose section is built carries one.'),
  evidence: z.string().optional().describe('What in the section shows the concept is taught there: the examples, the questions and the problems that turn on it.'),
  eq: EQUATION_REF.optional().describe('The equation of the formula sheet that states the concept, where one does.'),
}).strict();
export type ConceptRowDTO = z.infer<typeof ConceptSchema>;

export const ConceptPrereqSchema = z.object({
  concept: CONCEPT_REF.describe('The concept that rests on another.'),
  prereq: CONCEPT_REF.describe('The concept it rests on. Mastery runs downward along these edges: mastering a concept freshens what it is built on.'),
}).strict();
export type ConceptPrereqDTO = z.infer<typeof ConceptPrereqSchema>;

export const BookSchema = z.object({
  id: z.string().describe('The book\u2019s id, which names its pages, the storage the reader keeps for it and the colour file they export.'),
  title: z.string().describe('The book\u2019s title as the publisher prints it.'),
  publisher: z.string().describe('Who published the book.'),
  authors: z.array(z.string()).default([]).describe('The authors named on the book, in the order it names them.'),
  source_url: z.string().url().optional().describe('The book\u2019s own page at the publisher.'),
  copyright: z.string().optional().describe('The holder named in the book\u2019s copyright notice, kept because the licence asks for it.'),
  license: z.string().describe('The licence the book is shared under, as its notice names it.'),
  license_url: z.string().url().optional().describe('The licence\u2019s own page.'),
  openstax: z.string().url().optional().describe('The prefix of the publisher\u2019s section pages; a chapter\u2019s section slugs complete it.'),
  chapters: z.array(z.string()).describe('The chapter directories, in the order the book sets them.'),
  types: z.array(TypeSchema).default([]).describe('The kinds of physical quantity the book declares. The order is the order the colour scheme lays its hues along, so it is a table and not a record.'),
  symbols: z.array(SymbolSchema).default([]).describe('Every symbol the book writes with a macro or names in a \\htmlData{sym=\u2026}. The macro expansions are derived from these rows.'),
  exercise_kinds: z.array(ExerciseKindSchema).default([]).describe('The kinds of exercise the book sets, each with the name it prints above them.'),
  concepts: z.array(ConceptSchema).default([]).describe('Every concept of the book in one table, because ids are canonical and a chapter\u2019s prerequisites live in other chapters.'),
  concept_prereqs: z.array(ConceptPrereqSchema).default([]).describe('The edges of the concept map: which concept rests on which.'),
}).strict().transform((b) => ({
  id: b.id, title: b.title, publisher: b.publisher, authors: b.authors, sourceUrl: b.source_url, copyright: b.copyright,
  license: b.license, licenseUrl: b.license_url, openstax: b.openstax, chapterDirs: b.chapters,
  types: b.types, symbols: b.symbols, exerciseKinds: b.exercise_kinds, concepts: b.concepts, conceptPrereqs: b.concept_prereqs,
}));
export type BookDTO = z.infer<typeof BookSchema>;

/* ---------- <chapter>/chapter.json ---------- */

export const SectionRefSchema = z.object({
  id: z.string().describe('The section\u2019s number as the book prints it, such as 16.1, which is also the directory it is kept in.'),
  module: z.string().optional().describe('The publisher\u2019s own id for the section, kept so the source can be found again.'),
  title: z.string().describe('The section\u2019s title as the book prints it.'),
  slug: z.string().optional().describe('The last part of the section\u2019s address at the publisher, which completes the book\u2019s page prefix.'),
}).strict();
export type SectionRefDTO = z.infer<typeof SectionRefSchema>;

export const VariableSchema = z.object({
  sym: z.string().describe('The symbol\u2019s key in the book\u2019s symbol table.'),
  type: TYPE_REF.optional().describe('The type of quantity the symbol stands for here. The book declares the types and the app picks the hues.'),
  meaning: z.string().describe('What the symbol stands for in this section, in the book\u2019s words.'),
  unit: z.string().default('').describe('The unit the quantity is measured in.'),
  section: SECTION_REF.describe('The section that gives the symbol this meaning. A chapter may give one symbol two meanings in two sections.'),
  anchor: SPAN_REF.optional().describe('The qualified span of the text where the symbol is introduced, such as 16.1-hookes-law.'),
}).strict();
export type VariableDTO = z.infer<typeof VariableSchema>;

export const EquationSchema = z.object({
  id: EQUATION_REF.describe('The equation\u2019s id, which the concepts refer to it by.'),
  concept: CONCEPT_REF.optional().describe('The concept the equation states, where it states one.'),
  section: SECTION_REF.describe('The section that states the equation.'),
  latex: z.string().describe('The equation in plain LaTeX, as the book prints it.'),
  ktex: z.string().optional().describe('The same equation written with the book\u2019s macros, so that each symbol wears the colour of its type. The sheet prints this where it is given.'),
  condition: z.string().optional().describe('The condition under which the equation holds, stated as the book would state it, such as \u201cconstant acceleration\u201d. Absent where the equation holds generally.'),
  anchor: SPAN_REF.optional().describe('The qualified span of the text where the equation is stated.'),
  important: z.boolean().default(false).describe('Whether the equation belongs on the formula sheet, or is only a step of a derivation.'),
}).strict();
export type EquationRowDTO = z.infer<typeof EquationSchema>;

export const GlossarySchema = z.object({
  section: SECTION_REF.describe('The section that defines the term.'),
  term: z.string().describe('The term as the book defines it, in the words the text marks.'),
  definition: z.string().describe('The book\u2019s own definition of the term.'),
}).strict();
export type GlossaryDTO = z.infer<typeof GlossarySchema>;

export const ChapterSchema = z.object({
  id: z.string().describe('The chapter\u2019s number as the book prints it.'),
  dir: z.string().describe('The directory the chapter is kept in, which is also what its pages are addressed by.'),
  title: z.string().describe('The chapter\u2019s title as the book prints it.'),
  intro_module: z.string().optional().describe('The publisher\u2019s own id for the chapter\u2019s opening pages.'),
  sections: z.array(SectionRefSchema).default([]).describe('Every section of the chapter, built or not, in the order the book sets them.'),
  variables: z.array(VariableSchema).default([]).describe('The symbols the chapter\u2019s sections give a meaning to.'),
  equations: z.array(EquationSchema).default([]).describe('The equations the chapter\u2019s sections state.'),
  glossary: z.array(GlossarySchema).default([]).describe('The terms the chapter\u2019s sections define.'),
}).strict().transform((c) => ({
  id: c.id, dir: c.dir, title: c.title, sections: c.sections,
  variables: c.variables, equations: c.equations, glossary: c.glossary,
}));
export type ChapterDTO = z.infer<typeof ChapterSchema>;

/* ---------- <chapter>/<section>/section.json ---------- */

/* The AI a section was built with, by role: the model that transformed the text, and the model that built the simulations. */
export const AiCreditSchema = z.object({
  text: z.string().describe('The model that transformed the section\u2019s text.'),
  figures: z.string().describe('The model that built the section\u2019s simulations.'),
}).strict();
export type AiCreditDTO = z.infer<typeof AiCreditSchema>;

export const FigureSchema = z.object({
  id: z.string().describe('The figure\u2019s local id, which is the id the <figure> element carries in the section\u2019s text.'),
  kind: z.enum(FIGURE_KINDS).describe('Whether the figure is a simulation the reader can play with, a faithful copy of a book figure that the exercises need, or a photograph.'),
  number: z.string().optional().describe('The number the book prints the figure under, such as 16.4, where the figure keeps one.'),
  folds: z.array(z.string()).default([]).describe('The further numbers the book prints the figure under, where the book drew one scene several times and the demo replaces them all; the number stays the demo\u2019s own, and the eyebrow reads every number in the book\u2019s order.'),
  originals: z.array(z.string()).default([]).describe('The book\u2019s own images of the figure, served at /media, which the reader can call up beside the simulation.'),
  original_caption: z.string().optional().describe('The caption the book prints under the figure, kept word for word.'),
  draws: z.array(TYPE_REF).default([]).describe('The types the figure colours. The page\u2019s binds are the union of them, so the page need not say again what it colours.'),
}).strict();
export type FigureRowDTO = z.infer<typeof FigureSchema>;

export const CoverageSchema = z.object({
  span: z.string().describe('The local id of the span of the text, such as hookes-law. The build qualifies it with the section.'),
  concept: CONCEPT_REF.describe('The concept the span deals with.'),
  verb: z.enum(COVERAGE_VERBS).describe('What the span does with the concept: meets it for the first time, leans on it, or comes back to it. A span that introduces two concepts is two rows.'),
}).strict();
export type CoverageRowDTO = z.infer<typeof CoverageSchema>;

/* Where an exercise is set: at the end of the section with the rest of the
   problem set, or inline in the text, right after the span it follows on from. */
export const PlaceSchema = z.discriminatedUnion('at', [
  z.object({ at: z.literal('end').describe('The exercise is set at the end of the section, with the problem set.') }).strict(),
  z.object({
    at: z.literal('inline').describe('The exercise is set in the text itself, as a "Try it" beside what it tests.'),
    after: z.string().describe('The local id of the span the exercise follows.'),
  }).strict(),
]);
export type PlaceDTO = z.infer<typeof PlaceSchema>;
/* What the DOM calls a place: "end", or the local id an inline exercise follows. */
export const placeKey = (p: PlaceDTO): string => (p.at === 'end' ? 'end' : p.after);

/* Answers are an ADT: each type carries its own fields and its own checker. */
const GEN = z.enum(GENERATED_BY).default('source').describe('Whether the answer comes from the book\u2019s own key or was written by the AI that built the section.');
const PartSchema = z.object({
  part: z.string().describe('Which part of the question this answers, as the book letters it.'),
  value: z.number().describe('The number the part comes to.'),
  unit: z.string().default('').describe('The unit the number is in.'),
  hint: z.string().optional().describe('A nudge the reader can ask for before seeing the answer.'),
}).strict();
export const AnswerSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('number').describe('One number, checked to within two percent.'),
    value: z.number().describe('The number the answer comes to.'),
    unit: z.string().default('').describe('The unit the number is in.'),
    part: z.string().optional().describe('Which part of the question this answers, where the book asks several and keys only one.'),
    hint: z.string().optional().describe('A nudge the reader can ask for before seeing the answer.'),
    solution: z.string().optional().describe('The worked answer, as the book gives it or as the AI wrote it.'),
    generated_by: GEN,
  }).strict(),
  z.object({
    type: z.literal('multi').describe('Several numbers, one per part of the question.'),
    parts: z.array(PartSchema).describe('The parts, in the order the question asks them.'),
    solution: z.string().optional().describe('The worked answer, as the book gives it or as the AI wrote it.'),
    generated_by: GEN,
  }).strict(),
  z.object({
    type: z.literal('choice').describe('One of a list of options.'),
    options: z.array(z.string()).describe('The options, in the order the book prints them.'),
    correct: z.number().int().describe('Which option is right, counted from zero.'),
    hint: z.string().optional().describe('A nudge the reader can ask for before seeing the answer.'),
    solution: z.string().optional().describe('The worked answer, as the book gives it or as the AI wrote it.'),
    generated_by: GEN,
  }).strict(),
  z.object({
    type: z.literal('open').describe('An answer in words, which the reader checks themselves.'),
    solution: z.string().optional().describe('The answer the book gives, which the reader compares their own against.'),
    generated_by: GEN,
  }).strict(),
]);
export type AnswerDTO = z.infer<typeof AnswerSchema>;

const ExerciseFigureSchema = z.object({
  src: z.string().describe('The image the problem refers to, served at /media.'),
  alt: z.string().default('').describe('What the image shows, for a reader who cannot see it.'),
  caption: z.string().default('').describe('The caption the book prints under the image.'),
}).strict();

export const ExerciseSchema = z.object({
  id: z.string().describe('The exercise\u2019s local id, such as cq1 or p3, which names its card and its tab.'),
  source_id: z.string().describe('The publisher\u2019s own id for the exercise, so that it can be found again in the source.'),
  source_section: SECTION_REF.optional().describe('The section whose source the exercise was taken from, where the book places it in a section other than the one that introduces what it tests. Absent where it is this section\u2019s own.'),
  kind: z.string().describe('The kind of exercise it is, naming a row of the book\u2019s exercise kinds.'),
  bloom: z.enum(BLOOM_LEVELS).describe('The level of thinking the exercise asks for, which is what it is worth in points.'),
  tag: z.string().optional().describe('A word the book prints beside the exercise, such as the topic of an AP item.'),
  place: PlaceSchema.describe('Where the exercise is set: at the end with the problem set, or inline after a span of the text.'),
  cite: z.string().optional().describe('The local id of the passage the exercise turns on, which the card can show the reader.'),
  figure: ExerciseFigureSchema.optional().describe('A book figure the problem refers to, kept in the card.'),
  prompt: z.string().describe('The question as the book asks it.'),
  answer: AnswerSchema.describe('The answer and how it is checked.'),
}).strict();
export type ExerciseRowDTO = z.infer<typeof ExerciseSchema>;

export const ExerciseConceptSchema = z.object({
  exercise: z.string().describe('The local id of the exercise.'),
  concept: CONCEPT_REF.describe('A concept the exercise tests.'),
  weight: z.number().optional().describe('What the exercise is worth for this concept, overriding the points its Bloom level would earn. Always written by the pipeline.'),
}).strict();
export type ExerciseConceptDTO = z.infer<typeof ExerciseConceptSchema>;

export const SectionSchema = z.object({
  id: z.string().describe('The section\u2019s number as the book prints it, which is also the directory it is kept in.'),
  module: z.string().optional().describe('The publisher\u2019s own id for the section.'),
  chapter: z.string().describe('The chapter the section belongs to.'),
  title: z.string().describe('The section\u2019s title as the book prints it.'),
  short: z.string().optional().describe('A short name for the section, for the places a full title will not fit.'),
  lead: z.string().default('').describe('The line under the title that says what the section is about.'),
  objectives: z.array(z.string()).default([]).describe('What the reader should be able to do by the end, as the book lists it.'),
  summary_html: z.string().default('').describe('The section\u2019s summary, as the book prints it at the end of the chapter.'),
  notes: z.string().default('').describe('What this section left out of the book and why, one sentence, which the footer prints under the attribution.'),
  ai: AiCreditSchema.optional().describe('Which model transformed the text and which built the simulations; named in the footer.'),
  built: z.string().describe('The date the section was built.'),
  exercises_lead: z.string().default('').describe('The line the book prints above the problem set.'),
  exercise_notes: z.string().default('').describe('What the pipeline did with the section\u2019s exercises: where the answers came from, what was left out and why, and what was held for a later section.'),
  figures: z.array(FigureSchema).default([]).describe('The figures the section draws, in the order it draws them.'),
  coverage: z.array(CoverageSchema).default([]).describe('Which spans of the text introduce, use and reinforce each concept.'),
  exercises: z.array(ExerciseSchema).default([]).describe('The exercises the section sets, in the order the book sets them.'),
  exercise_concepts: z.array(ExerciseConceptSchema).default([]).describe('Which concepts each exercise tests, and what it is worth for them.'),
}).strict().transform((s) => ({
  id: sectionId(s.id), module: s.module, chapter: s.chapter, title: s.title, short: s.short ?? s.title,
  lead: s.lead, objectives: s.objectives, summaryHtml: s.summary_html, notes: s.notes, ai: s.ai, built: s.built,
  exercisesLead: s.exercises_lead, exerciseNotes: s.exercise_notes,
  figures: s.figures, coverage: s.coverage, exercises: s.exercises, exerciseConcepts: s.exercise_concepts,
}));
export type SectionDTO = z.infer<typeof SectionSchema>;

/* ---------- every table by name, for the docs generator ---------- */

/* Which of the three files a table is written in, and so which level of the
   book owns it. */
export type ContentLevel = 'book' | 'chapter' | 'section';
export type TableDoc = {
  readonly level: ContentLevel;
  readonly file: string;                /* the file the table is written in, as the reference names it */
  readonly field: string | null;        /* the array field the table is, or nothing for the file's own scalars */
  readonly schema: z.ZodTypeAny;        /* the strict object one row is parsed by */
  readonly note: string;                /* one sentence saying what the table is for */
};
export const TABLES: Readonly<Record<string, TableDoc>> = {
  book: { level: 'book', file: 'book.json', field: null, schema: BookSchema, note: 'The book itself: who wrote it, who published it, under what licence, and the chapters it is read in.' },
  types: { level: 'book', file: 'book.json', field: 'types', schema: TypeSchema, note: 'The kinds of physical quantity the book declares, in the order the colour scheme lays its hues along.' },
  symbols: { level: 'book', file: 'book.json', field: 'symbols', schema: SymbolSchema, note: 'Every symbol the book writes with a macro or names in a \\htmlData{sym=\u2026}.' },
  exercise_kinds: { level: 'book', file: 'book.json', field: 'exercise_kinds', schema: ExerciseKindSchema, note: 'The kinds of exercise the book sets.' },
  concepts: { level: 'book', file: 'book.json', field: 'concepts', schema: ConceptSchema, note: 'Every concept of the book, since ids are canonical and a chapter\u2019s prerequisites live in other chapters.' },
  concept_prereqs: { level: 'book', file: 'book.json', field: 'concept_prereqs', schema: ConceptPrereqSchema, note: 'The edges of the concept map.' },
  chapter: { level: 'chapter', file: '<chapter>/chapter.json', field: null, schema: ChapterSchema, note: 'One chapter: its number, its title and the sections it is read in.' },
  sections: { level: 'chapter', file: '<chapter>/chapter.json', field: 'sections', schema: SectionRefSchema, note: 'Every section of the chapter, built or not.' },
  variables: { level: 'chapter', file: '<chapter>/chapter.json', field: 'variables', schema: VariableSchema, note: 'The symbols the chapter\u2019s sections give a meaning to.' },
  equations: { level: 'chapter', file: '<chapter>/chapter.json', field: 'equations', schema: EquationSchema, note: 'The equations the chapter\u2019s sections state.' },
  glossary: { level: 'chapter', file: '<chapter>/chapter.json', field: 'glossary', schema: GlossarySchema, note: 'The terms the chapter\u2019s sections define.' },
  section: { level: 'section', file: '<chapter>/<section>/section.json', field: null, schema: SectionSchema, note: 'One section: what it is about, what it teaches, who built it and what it left out.' },
  figures: { level: 'section', file: '<chapter>/<section>/section.json', field: 'figures', schema: FigureSchema, note: 'The figures the section draws, and the types each of them colours.' },
  coverage: { level: 'section', file: '<chapter>/<section>/section.json', field: 'coverage', schema: CoverageSchema, note: 'Which spans of the text introduce, use and reinforce each concept.' },
  exercises: { level: 'section', file: '<chapter>/<section>/section.json', field: 'exercises', schema: ExerciseSchema, note: 'The exercises the section sets.' },
  exercise_concepts: { level: 'section', file: '<chapter>/<section>/section.json', field: 'exercise_concepts', schema: ExerciseConceptSchema, note: 'Which concepts each exercise tests, and what it is worth for them.' },
  place: { level: 'section', file: '<chapter>/<section>/section.json', field: 'exercises[].place', schema: PlaceSchema, note: 'Where an exercise is set: at the end with the problem set, or inline after a span.' },
  answer: { level: 'section', file: '<chapter>/<section>/section.json', field: 'exercises[].answer', schema: AnswerSchema, note: 'An exercise\u2019s answer, one shape per way of checking it.' },
  ai: { level: 'section', file: '<chapter>/<section>/section.json', field: 'ai', schema: AiCreditSchema, note: 'The AI the section was built with, by role.' },
};

/* ---------- what the build serves ---------- */

/* The endpoints below the manifest do not carry the tables as they are written;
   they carry what the runtime reads, folded together out of several of them.
   These are the shapes of that, and the shapes another book of the library is
   read back by when a practice session draws on it. */

/* A concept as a view of it needs it: its prerequisites folded in from the edge
   table, and whether the section that introduces it has been built. A
   placeholder stands for a section nobody has built, so it has nothing to say
   about why it matters. */
const CONCEPT_BASE = ConceptSchema.omit({ why: true, evidence: true }).shape;
export const ServedConceptSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('placeholder'), ...CONCEPT_BASE, prereqs: z.array(CONCEPT_REF).default([]) }),
  z.object({ status: z.literal('built'), ...ConceptSchema.shape, prereqs: z.array(CONCEPT_REF).default([]) }),
]);
export type ConceptDTO = z.infer<typeof ServedConceptSchema>;

/* Coverage as the text reads it: one row per span, with the concepts it
   introduces, uses and reinforces, and the span qualified by its section. */
export const ServedCoverageSchema = z.object({
  span: SPAN_REF,
  introduces: z.array(CONCEPT_REF).default([]),
  uses: z.array(CONCEPT_REF).default([]),
  reinforces: z.array(CONCEPT_REF).default([]),
});
export type CoverageDTO = z.infer<typeof ServedCoverageSchema>;

export const ServedConceptsSchema = z.object({
  concepts: z.array(ServedConceptSchema).default([]),
  coverage: z.array(ServedCoverageSchema).default([]),
});
export type ConceptsDTO = z.infer<typeof ServedConceptsSchema>;

/* An exercise as a card sets it: the concepts it tests folded in from the join
   table, and the points it is worth for them where the pipeline overrode the
   Bloom table. */
export const ServedExerciseSchema = ExerciseSchema
  .extend({
    concepts: z.array(CONCEPT_REF).default([]),
    weights: z.record(z.number()).optional(),
  })
  .strip()
  .transform(({ source_id, source_section, ...e }) => ({ ...e, sourceId: source_id, ...(source_section === undefined ? {} : { sourceSection: source_section }) }));
export type ExerciseDTO = z.infer<typeof ServedExerciseSchema>;

/* An equation as the sheet prints it: the coloured form where the chapter wrote
   one, and the plain one otherwise. */
export type EquationDTO = {
  readonly id: EquationId;
  readonly section: SectionId;
  readonly tex: string;
  readonly condition?: string;   /* what the equation holds under, where it does not hold generally: "constant acceleration" */
  readonly anchor?: SpanId;
  readonly important: boolean;
};
export const equationOf = (e: EquationRowDTO): EquationDTO => ({ id: e.id, section: e.section, tex: e.ktex ?? e.latex, condition: e.condition, anchor: e.anchor, important: e.important });

export type FormulasDTO = {
  readonly variables: readonly VariableDTO[];
  readonly equations: readonly EquationDTO[];
  readonly glossary: readonly GlossaryDTO[];
};

/* What one section's page carries about itself: enough to draw its head, its
   footer and its colours, and nothing of the tables below it. */
export type SectionMetaDTO = {
  readonly id: SectionId;
  readonly chapter: string;
  readonly title: string;
  readonly short: string;
  readonly lead: string;
  readonly objectives: readonly string[];
  readonly summaryHtml: string;
  readonly notes: string;
  readonly binds: readonly string[];   /* the types this page colours, the union of what its figures draw; the rest render in ink on it */
  readonly ai?: AiCreditDTO;
};

/* ---------- the manifest ---------- */

/* What the shell receives about the book: the manifest the pages and the picker are built from. */
/* The book's types by id, in the order the book declares them, which is the order the colour scheme lays its hues along. */
export type TypeMap = Readonly<Record<string, { readonly label: string; readonly dimension?: string }>>;
/* Every KaTeX macro of the book by name, expanded: "\\kx" → "\htmlClass{kv-position}{\htmlData{sym=x}{x}}". */
export type MacroMap = Readonly<Record<string, string>>;
/* Every symbol by its key, as the hover layer sets it: its macro where it has one, else its plain LaTeX. */
export type SymbolMap = Readonly<Record<string, string>>;
/* What the book calls each kind of exercise. */
export type KindMap = Readonly<Record<string, string>>;
/* One figure of a section, as the browser walks below it: the local id the figure carries in the section's text ("demo-shm-oscillator") and the label its head reads out ("Figure 16.9 · An object on a spring slides on a frictionless surface."). */
export type FigureEntry = { readonly id: string; readonly label: string };
/* One exercise of a section: its id and its kind, which names a label in the book's exercise kinds. */
export type ExerciseEntry = { readonly id: string; readonly kind: string };
export type SectionEntry = {
  readonly id: string; readonly title: string; readonly built: boolean; readonly url: string;
  readonly fragment: string;                     /* the section's HTML fragment, doc.html */
  readonly figuresJs: string;                    /* the section's figure module, figures.js */
  readonly figures: readonly FigureEntry[];      /* what the section draws; empty until the section is built */
  readonly binds: readonly string[];             /* the types this page colours, from its meta; empty until the section is built, and empty means all */
  readonly exercises: readonly ExerciseEntry[];  /* the single exercises of the section, in the order the book sets them */
  readonly openstax?: string;
};
export type ChapterEntry = { readonly id: string; readonly dir: string; readonly title: string; readonly concepts: string; readonly formulas: string; readonly sections: readonly SectionEntry[] };
export type BookManifest = {
  readonly id: BookId; readonly title: string; readonly publisher: string; readonly authors: readonly string[]; readonly sourceUrl?: string; readonly copyright?: string;
  readonly license: string; readonly licenseUrl?: string; readonly openstax?: string;
  readonly types: TypeMap; readonly macros: MacroMap; readonly symbols: SymbolMap; readonly exerciseKinds: KindMap;
  readonly chapters: readonly ChapterEntry[];
};
