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
import { type BookId, type SectionId, conceptId, equationId, sectionId, spanId, typeId } from '../types/ids';
import { type PageRole, pageId, pageRoleOf } from './roles';

/* A row refers to another row by id alone, and the ids are branded so that a
   section is never handed where a concept is asked for. */
const CONCEPT_REF = z.string().transform(conceptId);
const SECTION_REF = z.string().transform(sectionId);
const SPAN_REF = z.string().transform(spanId);
const TYPE_REF = z.string().transform(typeId);
const EQUATION_REF = z.string().transform(equationId);

/* The levels of thinking the pipeline sorts exercises by, from recalling a fact
   to making something new. Practice keeps the level as descriptive metadata. */
export const BLOOM_LEVELS = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'] as const;
export type Bloom = (typeof BLOOM_LEVELS)[number];
/* What a concept is, as the book treats it (RULES item 6): a definition is
   stipulated, a name for something; an axiom is taken as given, a postulate or
   a law found by experiment; a result follows from other concepts; an idea
   earns a place in the map and is none of those; a skill is know-how for
   applying the others. */
export const CONCEPT_KINDS = ['definition', 'axiom', 'result', 'idea', 'skill'] as const;
export type ConceptKind = (typeof CONCEPT_KINDS)[number];
/* What a span of the text does with a concept: meets it for the first time,
   leans on it, or comes back to it. */
export const COVERAGE_VERBS = ['introduces', 'uses', 'reinforces'] as const;
export type CoverageVerb = (typeof COVERAGE_VERBS)[number];
/* Who wrote a piece of content: the book it was adapted from, or the AI that
   built the section. */
export const GENERATED_BY = ['source', 'ai'] as const;
export type GeneratedBy = (typeof GENERATED_BY)[number];
/* What a figure is: an interactive figure the reader can play with, a faithful
   copy of a book figure that the exercises need, or a photograph. The kind names
   the mechanism; the label the reader sees follows from the number. */
export const FIGURE_KINDS = ['sim', 'figure', 'photo'] as const;
export type FigureKind = (typeof FIGURE_KINDS)[number];

/* ---------- book.json ---------- */

export const TypeSchema = z.object({
  id: TYPE_REF.describe('The id of the type, which is the class a coloured symbol wears in the text and the key the reader\u2019s colour choices are kept under.'),
  label: z.string().describe('What the book calls things of this type, as the legend and the colour menu name them.'),
  dimension: z.string().optional().describe('The unit, where the type is a quantity, written as the book writes it.'),
}).strict();
export type TypeDTO = z.infer<typeof TypeSchema>;

export const SymbolSchema = z.object({
  sym: z.string().describe('The key the symbol is known by across the book, which is what the text carries in a \\htmlData{sym=\u2026} and what a chapter\u2019s variables are listed under.'),
  latex: z.string().describe('The LaTeX the symbol is set in, without any colour or data of its own.'),
  type: TYPE_REF.nullable().optional().describe('Not written: a symbol takes its type in each section from its variables row there, and the checker warns on a type stored here, which belongs on the variables row. Where a section has no row of the symbol, it wears the type its variables rows share across the book, else the type shared by the concepts that name it as their symbol.'),
  macro: z.string().optional().describe('The KaTeX macro the text writes the symbol as, such as \\kx. A symbol with no macro is one the hover layer knows but the text writes in plain LaTeX.'),
}).strict();
export type SymbolDTO = z.infer<typeof SymbolSchema>;

export const ExerciseKindSchema = z.object({
  id: z.string().describe('The id an exercise names its kind by.'),
  label: z.string().describe('What the book calls exercises of this kind, as the card\u2019s eyebrow prints it.'),
}).strict();
export type ExerciseKindDTO = z.infer<typeof ExerciseKindSchema>;

/* One way the book writes a concept down as an equation. A concept's forms are
   ordered and the first is its main form: the one a card, the Reference view and
   the search lead with. The rest are its rearrangements, special cases and the
   lines of worked examples that apply it. */
export const FormSchema = z.object({
  id: EQUATION_REF.describe('The form\u2019s id, unique in the book, which a span of the text, an answer or a note names it by.'),
  latex: z.string().describe('The equation in plain LaTeX, as the book prints it.'),
  ktex: z.string().optional().describe('The same equation written with the book\u2019s macros, so that each symbol wears the colour of its type. The app prints this where it is given.'),
  condition: z.string().optional().describe('The condition under which the form holds, stated as the book would state it, such as \u201cconstant acceleration\u201d. Absent where it holds generally.'),
  section: SECTION_REF.optional().describe('The section that states the form, where it is not the concept\u2019s own.'),
  anchor: SPAN_REF.optional().describe('The qualified span of the text where the form is stated, such as 16.1-hookes-law.'),
}).strict();
export type FormRowDTO = z.infer<typeof FormSchema>;

export const ConceptSchema = z.object({
  id: CONCEPT_REF.describe('The concept\u2019s id, which is canonical across books, so another textbook\u2019s section on the same matter maps to the same concept.'),
  kind: z.enum(CONCEPT_KINDS).describe('What the book treats the concept as: a definition, stipulated, a name for something (displacement, the joule); an axiom, taken as given, a postulate or a law found by experiment (F = ma, Ohm\u2019s law); a result, which follows from other concepts whether or not the book shows the steps (v = v\u2080 + at); an idea, which earns a place in the map and is none of those (the Bohr model); or a skill, know-how for applying the others (drawing a free-body diagram).'),
  section: SECTION_REF.describe('The section that introduces the concept. A concept whose section the app has not built yet stands as a placeholder.'),
  name: z.string().describe('What a reader would look the concept up by: the term for a definition, the book\u2019s own name for a law or a result, else the fewest words that pick it out; a skill is a short gerund phrase. No formula, no symbol and no gloss.'),
  symbol: z.string().optional().describe('The one symbol the book denotes the concept by, as a key of the book\u2019s symbol table, where it has one. Its variants and components are rows of the chapters\u2019 variables, not of the concept.'),
  terms: z.array(z.string()).default([]).describe('The words the book\u2019s glossary defines the concept under, as the text writes them. The app marks every mention of each in the prose of the chapters that deal with the concept.'),
  type: TYPE_REF.optional().describe('The type the concept names, where it names one. It is declared here and nowhere else: the symbols and the variables rows that denote the concept inherit it, its hover card\u2019s title wears it, and every `<span data-concept>` naming it in the prose wears it.'),
  statement: z.string().optional().describe('The meaning of a definition, the claim of an axiom or a result, what an idea is or what a skill lets the reader do, in the book\u2019s voice. A concept whose section is built carries one.'),
  forms: z.array(FormSchema).default([]).describe('The equations that state the concept, the main form first.'),
}).strict();
export type ConceptRowDTO = z.infer<typeof ConceptSchema>;

export const ConceptPrereqSchema = z.object({
  concept: CONCEPT_REF.describe('The concept that rests on another.'),
  prereq: CONCEPT_REF.describe('The concept it rests on. Mastery runs downward along these edges: mastering a concept freshens what it is built on.'),
}).strict();
export type ConceptPrereqDTO = z.infer<typeof ConceptPrereqSchema>;

/* Where a book or a chapter prints an introduction or a summary of its own, the
   record names the page's module and its slug at the publisher, and the page
   itself is built in the intro/ or summary/ folder beside the sections (rule 21). */
export const FrontPageRefSchema = z.object({
  module: z.string().optional().describe('The publisher\u2019s own id for the page, kept so the source can be found again.'),
  slug: z.string().optional().describe('The last part of the page\u2019s address at the publisher, which completes the book\u2019s page prefix.'),
}).strict();
export type FrontPageRefDTO = z.infer<typeof FrontPageRefSchema>;
/* The two records as a DTO carries them: as fields only where the file wrote them. */
const framed = (o: { readonly intro?: FrontPageRefDTO; readonly summary?: FrontPageRefDTO }): { readonly intro?: FrontPageRefDTO; readonly summary?: FrontPageRefDTO } =>
  ({ ...(o.intro ? { intro: o.intro } : {}), ...(o.summary ? { summary: o.summary } : {}) });

/* ---------- book.json `sheets` ---------- */

/* What a sheet is. The app owns the gestures — a page of its own, a row in the
   explorer, a card on hover — and the book says what tokens its text has and
   what each gesture does with them; a sheet is the table a gesture looks a
   token up in. The kind is an ADT tag, since a sheet of one kind carries data
   a sheet of another kind does not: an `elements` sheet is the periodic table,
   which the app draws and the formula hover reads, and a `table` is a plain
   reference table of rows and columns. */
export const SHEET_KINDS = ['elements', 'table'] as const;
export type SheetKind = (typeof SHEET_KINDS)[number];
/* One sheet's id, which names its page under the book: "elements". */
export type SheetId = string & { readonly __brand: 'SheetId' };
export const sheetId = (s: string): SheetId => s as SheetId;

export const SheetSchema = z.object({
  id: z.string().describe('The sheet\u2019s id, which names its page at /<book>/sheets/<id>/ and the storage anything keyed by sheet is kept under.'),
  title: z.string().describe('The sheet\u2019s title as the book prints it, which is what the explorer and the contents page call it.'),
  kind: z.enum(SHEET_KINDS).describe('What the sheet is, which is what the app draws it as: "elements" is the periodic table and "table" a plain reference table.'),
  file: z.string().describe('The sheet\u2019s data file, as a path under the book\u2019s own folder; by convention sheets/<id>.json.'),
}).strict();
export type SheetDTO = z.infer<typeof SheetSchema>;

const HEX6 = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const StoredHueSchema = z.object({
  light: HEX6.describe('The colour on the light theme, as #rrggbb.'),
  dark: HEX6.describe('The colour on the dark theme, as #rrggbb.'),
}).strict();
export const BookColoursSchema = z.object({
  palette: z.string().describe('The palette the colours were taken from, by its id in the app (oklab).'),
  vision: z.enum(['normal', 'protan', 'deutan', 'tritan']).describe('The colour vision the assignment keeps the colours of one page apart for: normal, protan, deutan or tritan.'),
  assign: z.record(z.string(), StoredHueSchema).describe('Each type\u2019s colour, keyed by type id. A type the book declares and this omits takes the next palette colour no listed type wears, and the checker says the default is stale.'),
}).strict();
export type BookColoursDTO = z.infer<typeof BookColoursSchema>;

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
  intro: FrontPageRefSchema.optional().describe('The book\u2019s own introduction or preface, where it prints one; the page is built in intro/ and listed before the first chapter.'),
  summary: FrontPageRefSchema.optional().describe('The book\u2019s own closing summary, where it prints one; the page is built in summary/ and listed after the last chapter.'),
  types: z.array(TypeSchema).default([]).describe('The kinds of thing the book colours (a quantity, a curve, a part\u2026). The order is the order the colour scheme lays its hues along, so it is a table and not a record.'),
  symbols: z.array(SymbolSchema).default([]).describe('Every symbol the book writes with a macro or names in a \\htmlData{sym=\u2026}. The macro expansions are derived from these rows.'),
  exercise_kinds: z.array(ExerciseKindSchema).default([]).describe('The kinds of exercise the book sets, each with the name it prints above them.'),
  concepts: z.array(ConceptSchema).default([]).describe('Every concept of the book in one table, because ids are canonical and a chapter\u2019s prerequisites live in other chapters.'),
  concept_prereqs: z.array(ConceptPrereqSchema).default([]).describe('The edges of the concept map: which concept rests on which.'),
  sheets: z.array(SheetSchema).default([]).describe('The reference sheets the book keeps beside its chapters, each a page of its own at the book\u2019s root.'),
  colours: BookColoursSchema.optional().describe('The book\u2019s default colour for each type, written by `npm run colours:default -- <book-id>` and kept as it was written until the script is run again. Absent, the types take the OKLab palette in the order they are declared.'),
}).strict().transform((b) => ({
  id: b.id, title: b.title, publisher: b.publisher, authors: b.authors, sourceUrl: b.source_url, copyright: b.copyright,
  license: b.license, licenseUrl: b.license_url, openstax: b.openstax, chapterDirs: b.chapters, ...framed(b),
  types: b.types, symbols: b.symbols, exerciseKinds: b.exercise_kinds, concepts: b.concepts, conceptPrereqs: b.concept_prereqs, sheets: b.sheets,
  ...(b.colours ? { colours: b.colours } : {}),
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
  concept: CONCEPT_REF.optional().describe('The concept that defines the symbol\u2019s quantity. A variant or a component (a_x, B\u2081) names the definition of its base quantity.'),
  type: TYPE_REF.nullable().optional().describe('An override of the type the row inherits from its concept, written only where it must differ or where the row names no typed concept; null sets the row in ink whatever its concept\u2019s type. The type colours the symbol wherever the section writes it. The book declares the types and the app picks the hues.'),
  ref: z.string().optional().describe('A referent of the section the symbol\u2019s quantity belongs to, such as tug-1 for the force of the first tugboat: the symbol is then split, its main letter in its type\u2019s colour and its subscript in the referent\u2019s.'),
  meaning: z.string().describe('What the symbol stands for in this section, in the book\u2019s words.'),
  unit: z.string().default('').describe('The unit the quantity is measured in.'),
  section: SECTION_REF.describe('The section that gives the symbol this meaning. A chapter may give one symbol two meanings in two sections.'),
  anchor: SPAN_REF.optional().describe('The qualified span of the text where the symbol is introduced, such as 16.1-hookes-law.'),
  redefines: z.boolean().optional().describe('Set where the book itself gives a symbol already used earlier in the chapter a new meaning; the meaning is then written to stand alone.'),
}).strict();
export type VariableDTO = z.infer<typeof VariableSchema>;

export const ChapterSchema = z.object({
  id: z.string().describe('The chapter\u2019s number as the book prints it.'),
  dir: z.string().describe('The directory the chapter is kept in, which is also what its pages are addressed by.'),
  title: z.string().describe('The chapter\u2019s title as the book prints it.'),
  intro: FrontPageRefSchema.optional().describe('The chapter\u2019s own introduction, where the book prints one; the page is built in intro/ and listed before the first section.'),
  summary: FrontPageRefSchema.optional().describe('The chapter\u2019s own summary or conclusion, where the book prints one; the page is built in summary/ and listed after the last section.'),
  sections: z.array(SectionRefSchema).default([]).describe('Every section of the chapter, built or not, in the order the book sets them.'),
  variables: z.array(VariableSchema).default([]).describe('The symbols the chapter\u2019s sections give a meaning to.'),
}).strict().transform((c) => ({
  id: c.id, dir: c.dir, title: c.title, ...framed(c), sections: c.sections, variables: c.variables,
}));
export type ChapterDTO = z.infer<typeof ChapterSchema>;

/* ---------- <chapter>/<section>/section.json ---------- */

/* A model by its API id, any model; the reader meets a known one by name and any other by its id. */
export type AiModelId = string;
export const AI_MODEL_NAMES: Readonly<Record<AiModelId, string>> = {
  'claude-fable-5-1': 'Claude Fable 5.1', 'claude-opus-5': 'Claude Opus 5', 'claude-opus-5-5': 'Claude Opus 5.5',
};
export const aiModelName = (model: AiModelId): string => AI_MODEL_NAMES[model] ?? model;
export const AI_EFFORTS = ['low', 'medium', 'high', 'max'] as const;
export type AiEffort = (typeof AI_EFFORTS)[number];

export const AiMakerSchema = z.object({
  model: z.string().trim().min(1).describe('The model\u2019s API id, whichever model it is.'),
  effort: z.enum(AI_EFFORTS).optional().describe('The reasoning effort it ran at, where known.'),
}).strict();
export type AiMakerDTO = z.infer<typeof AiMakerSchema>;

/* The old credit named its models in prose: "Claude Opus 5, with Claude Fable 5.1 and Claude Opus 5.5".
   A name it does not know is dropped rather than guessed; an empty result is Claude Opus 5, the default. */
const modelOfName = (name: string): AiModelId | undefined =>
  Object.keys(AI_MODEL_NAMES).find((m) => AI_MODEL_NAMES[m] === name.trim());
export const parseAiMakers = (prose: string): readonly AiMakerDTO[] => {
  const models = prose.split(/,\s*with\s+|\s+and\s+|,\s*/).map(modelOfName).filter((m): m is AiModelId => m !== undefined);
  const unique = [...new Set(models)];
  return (unique.length ? unique : ['claude-opus-5']).map((model) => ({ model }));
};
/* One part's makers, the first the principal: a list of models with their effort, or the old prose. */
const AiPartSchema = z.union([z.array(AiMakerSchema).min(1), z.string().transform(parseAiMakers)]);

/* The AI a section was built with, by role: the models that transformed the text, and the models that built the simulations. */
export const AiCreditSchema = z.object({
  text: AiPartSchema.describe('The models that transformed the section\u2019s text, the principal first.'),
  figures: AiPartSchema.describe('The models that built the section\u2019s simulations, the principal first.'),
}).strict();
export type AiCreditDTO = z.infer<typeof AiCreditSchema>;

export const FigureSchema = z.object({
  id: z.string().describe('The figure\u2019s local id, which is the id the <figure> element carries in the section\u2019s text.'),
  kind: z.enum(FIGURE_KINDS).describe('Whether the figure is an interactive one the reader can play with, a faithful copy of a book figure that the exercises need, or a photograph. A sim is a simulation the reader can play with: its eyebrow reads Sim where the row carries no number, since the figure replaces nothing in the book, and Figure with the book\u2019s numbers where it transforms a book figure.'),
  number: z.string().optional().describe('The number the book prints the figure under, such as 16.4, where the figure keeps one.'),
  folds: z.array(z.string()).default([]).describe('The further numbers the book prints the figure under, where the book drew one scene several times and one interactive figure replaces them all; the number stays the figure\u2019s own, and the eyebrow reads every number in the book\u2019s order.'),
  originals: z.array(z.string()).default([]).describe('The book\u2019s own images of the figure, served at /media, which the reader can call up beside the simulation.'),
  original_caption: z.string().optional().describe('The caption the book prints under the figure, kept word for word.'),
  widths: z.array(z.number().int().positive()).default([]).describe('The book\u2019s display width in pixels for each image the row shows, one per image in order (a photo\u2019s one image, or the originals), taken from the width attribute the CNXML gives the image. Empty where the book gives none, and then the image sits at its natural size.'),
  draws: z.array(TYPE_REF).default([]).describe('The types the figure colours. The default colours keep these types apart from one another and from the page\u2019s other colours.'),
  conventions: z.array(z.string()).default([]).describe('The convention colours the figure draws, as `F.el` takes them: element symbols and the particle keys (e-, p+, n0\u2026). The default colours keep the types apart from these on the page.'),
  facts: z.array(z.string().regex(/^(#[0-9a-fA-F]{6}|spectrum)$/)).default([]).describe('The colours the figure draws as the fact (`F.fact`), each as #rrggbb, or "spectrum" for a figure that draws a run of real colours, which is not weighed. The default colours keep the types apart from these on the page.'),
}).strict();
export type FigureRowDTO = z.infer<typeof FigureSchema>;

/* A particular thing that exists only in one example or figure of the section
   (block 1 and block 2, Firm A and Firm B), which the text and the figure both point at. */
export const ReferentSchema = z.object({
  id: z.string().describe('The referent\u2019s id, unique in the section, which a `<span data-ref="\u2026">` of the text and `F.ref` of the figure name it by.'),
  label: z.string().describe('What the text calls it, such as Firm B.'),
  figures: z.array(z.string()).nonempty().describe('The ids of every figure of the section that draws it, in the order the section sets them. Its colour is dealt from the reader\u2019s thirty-six referent colours in the table\u2019s order among the referents it is seen with: those whose figures or text blocks it shares.'),
}).strict();
export type ReferentDTO = z.infer<typeof ReferentSchema>;

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
  tol: z.number().positive().optional().describe('The relative tolerance the answer is checked to, as a fraction such as 0.00001; two percent where absent.'),
  hint: z.string().optional().describe('A nudge the reader can ask for before seeing the answer.'),
}).strict();
export const AnswerSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('number').describe('One number, checked to within two percent unless it names a tolerance.'),
    value: z.number().describe('The number the answer comes to.'),
    unit: z.string().default('').describe('The unit the number is in.'),
    tol: z.number().positive().optional().describe('The relative tolerance the answer is checked to, as a fraction such as 0.00001; two percent where absent.'),
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
  id: z.string().describe('The exercise\u2019s local id, such as cq1 or p3, which names its card.'),
  source_id: z.string().describe('The publisher\u2019s own id for the exercise, so that it can be found again in the source.'),
  source_section: SECTION_REF.optional().describe('The section whose source the exercise was taken from, where the book places it in a section other than the one that introduces what it tests. Absent where it is this section\u2019s own.'),
  source_number: z.string().optional().describe('The exercise number exactly as the source prints it, such as 5.17. Optional because older extracted books did not preserve it.'),
  kind: z.string().describe('The kind of exercise it is, naming a row of the book\u2019s exercise kinds.'),
  bloom: z.enum(BLOOM_LEVELS).describe('The level of thinking the exercise asks for.'),
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
  weight: z.number().optional().describe('Legacy relative concept weight retained for compatibility; practice attainment is discrete.'),
  weights_by: z.literal('ai').optional().describe('Legacy marker for a concept weight chosen by the agent; practice attainment is discrete.'),
}).strict();
export type ExerciseConceptDTO = z.infer<typeof ExerciseConceptSchema>;

export const SectionSchema = z.object({
  id: z.string().describe('The section\u2019s number as the book prints it, which is also the directory it is kept in; or the literal intro or summary for a chapter\u2019s or the book\u2019s own introduction or summary page, which the app then reads under the chapter\u2019s number ("2.intro").'),
  module: z.string().optional().describe('The publisher\u2019s own id for the section.'),
  chapter: z.string().optional().describe('The chapter the section belongs to. Absent only on the book\u2019s own introduction or summary page, which belongs to no chapter.'),
  title: z.string().describe('The section\u2019s title as the book prints it.'),
  short: z.string().optional().describe('A short name for the section, for the places a full title will not fit.'),
  lead: z.string().default('').describe('One or two sentences under the title that say what the section is about, at most 80 words and stating no result the section works out. Empty on an introduction or summary page, and only there, since nothing is invented in the book\u2019s place.'),
  objectives: z.array(z.string()).default([]).describe('What the reader should be able to do by the end, as the book lists it.'),
  summary_html: z.string().default('').describe('The section\u2019s summary, as the book prints it at the end of the chapter.'),
  notes: z.string().default('').describe('What this section left out of the book and why, one sentence, which the footer prints under the attribution.'),
  ai: AiCreditSchema.optional().describe('Which model transformed the text and which built the simulations; named in the footer.'),
  built: z.string().describe('The date the section was built.'),
  exercises_lead: z.string().default('').describe('The line the book prints above the problem set.'),
  exercise_notes: z.string().default('').describe('What the pipeline did with the section\u2019s exercises: where the answers came from, what was left out and why, and what was held for a later section.'),
  figures: z.array(FigureSchema).default([]).describe('The figures the section draws, in the order it draws them.'),
  referents: z.array(ReferentSchema).default([]).describe('The particular things of the section\u2019s examples and figures that the text and a figure both point at.'),
  coverage: z.array(CoverageSchema).default([]).describe('Which spans of the text introduce, use and reinforce each concept.'),
  exercises: z.array(ExerciseSchema).default([]).describe('The exercises the section sets, in the order the book sets them.'),
  exercise_concepts: z.array(ExerciseConceptSchema).default([]).describe('Which concepts each exercise tests, and what it is worth for them.'),
}).strict().transform((s) => ({
  id: sectionId(pageId(s.id, s.chapter)), role: pageRoleOf(s.id), module: s.module, chapter: s.chapter, title: s.title, short: s.short ?? s.title,
  lead: s.lead, objectives: s.objectives, summaryHtml: s.summary_html, notes: s.notes, ai: s.ai, built: s.built,
  exercisesLead: s.exercises_lead, exerciseNotes: s.exercise_notes,
  figures: s.figures, referents: s.referents, coverage: s.coverage, exercises: s.exercises, exerciseConcepts: s.exercise_concepts,
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
  types: { level: 'book', file: 'book.json', field: 'types', schema: TypeSchema, note: 'The kinds of thing the book colours (a quantity, a curve, a part\u2026), in the order the colour scheme lays its hues along.' },
  symbols: { level: 'book', file: 'book.json', field: 'symbols', schema: SymbolSchema, note: 'Every symbol the book writes with a macro or names in a \\htmlData{sym=\u2026}.' },
  exercise_kinds: { level: 'book', file: 'book.json', field: 'exercise_kinds', schema: ExerciseKindSchema, note: 'The kinds of exercise the book sets.' },
  concepts: { level: 'book', file: 'book.json', field: 'concepts', schema: ConceptSchema, note: 'Every concept of the book, since ids are canonical and a chapter\u2019s prerequisites live in other chapters.' },
  forms: { level: 'book', file: 'book.json', field: 'concepts[].forms', schema: FormSchema, note: 'The equations that state one concept, the main form first.' },
  concept_prereqs: { level: 'book', file: 'book.json', field: 'concept_prereqs', schema: ConceptPrereqSchema, note: 'The edges of the concept map.' },
  sheets: { level: 'book', file: 'book.json', field: 'sheets', schema: SheetSchema, note: 'The reference sheets the book keeps beside its chapters, each a page of its own whose data is read from the file the row names.' },
  book_pages: { level: 'book', file: 'book.json', field: 'intro, summary', schema: FrontPageRefSchema, note: 'The book\u2019s own introduction and closing summary, where it prints them. Each is a page built in intro/ or summary/ beside the chapters, with a section.json whose id is the literal intro or summary and which names no chapter.' },
  chapter: { level: 'chapter', file: '<chapter>/chapter.json', field: null, schema: ChapterSchema, note: 'One chapter: its number, its title and the sections it is read in.' },
  sections: { level: 'chapter', file: '<chapter>/chapter.json', field: 'sections', schema: SectionRefSchema, note: 'Every section of the chapter, built or not.' },
  variables: { level: 'chapter', file: '<chapter>/chapter.json', field: 'variables', schema: VariableSchema, note: 'The symbols the chapter\u2019s sections give a meaning to.' },
  chapter_pages: { level: 'chapter', file: '<chapter>/chapter.json', field: 'intro, summary', schema: FrontPageRefSchema, note: 'The chapter\u2019s own introduction and summary, where the book prints them. Each is a page built in intro/ or summary/ beside the sections, with a section.json whose id is the literal intro or summary, whose chapter is this chapter\u2019s, and whose objectives, summary, exercises and coverage are empty; its lead may be empty too.' },
  section: { level: 'section', file: '<chapter>/<section>/section.json', field: null, schema: SectionSchema, note: 'One section: what it is about, what it teaches, who built it and what it left out. The same record, under intro/ or summary/, is a chapter\u2019s or the book\u2019s own introduction or summary page.' },
  figures: { level: 'section', file: '<chapter>/<section>/section.json', field: 'figures', schema: FigureSchema, note: 'The figures the section draws, and the types each of them colours.' },
  referents: { level: 'section', file: '<chapter>/<section>/section.json', field: 'referents', schema: ReferentSchema, note: 'The particular things of one example or figure that the text marks with `<span data-ref>` and the figure colours with `F.ref`.' },
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

/* A form as the app reads it: where it is stated, always, and the coloured
   equation where the book wrote one, beside the plain one the search reads (a
   macro names nothing to a reader typing "kx"). */
export const ServedFormSchema = z.object({
  id: EQUATION_REF,
  section: SECTION_REF,
  tex: z.string(),
  latex: z.string(),
  condition: z.string().optional(),
  anchor: SPAN_REF.optional(),
});
export type FormDTO = z.infer<typeof ServedFormSchema>;
export const formOf = (f: FormRowDTO, home: SectionId): FormDTO => ({
  id: f.id, section: f.section ?? home, tex: f.ktex ?? f.latex, latex: f.latex,
  ...(f.condition === undefined ? {} : { condition: f.condition }), ...(f.anchor === undefined ? {} : { anchor: f.anchor }),
});

/* A concept as a view of it needs it: its forms placed, its prerequisites folded
   in from the edge table, and whether the section that introduces it has been
   built. A placeholder stands for a section nobody has built, so it states
   nothing. */
const CONCEPT_BASE = { ...ConceptSchema.omit({ statement: true, forms: true }).shape, forms: z.array(ServedFormSchema).default([]), prereqs: z.array(CONCEPT_REF).default([]) };
export const ServedConceptSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('placeholder'), ...CONCEPT_BASE }),
  z.object({ status: z.literal('built'), ...CONCEPT_BASE, statement: ConceptSchema.shape.statement }),
]);
export type ConceptDTO = z.infer<typeof ServedConceptSchema>;
/* The form a concept leads with, and the rest. */
export const mainForm = (c: Pick<ConceptDTO, 'forms'>): FormDTO | undefined => c.forms[0];
export const extraForms = (c: Pick<ConceptDTO, 'forms'>): readonly FormDTO[] => c.forms.slice(1);

/* Coverage as the text reads it: one row per span, with the concepts it
   introduces, uses and reinforces, and the span qualified by its section. */
export const ServedCoverageSchema = z.object({
  span: SPAN_REF,
  introduces: z.array(CONCEPT_REF).default([]),
  uses: z.array(CONCEPT_REF).default([]),
  reinforces: z.array(CONCEPT_REF).default([]),
});
export type CoverageDTO = z.infer<typeof ServedCoverageSchema>;

/* What one chapter serves: the concepts it introduces and reaches, the coverage
   of its sections, and the meanings its sections give the book's symbols. */
export const ServedConceptsSchema = z.object({
  concepts: z.array(ServedConceptSchema).default([]),
  coverage: z.array(ServedCoverageSchema).default([]),
  variables: z.array(VariableSchema.strip()).default([]),
});
export type ConceptsDTO = z.infer<typeof ServedConceptsSchema>;

/* An exercise as a card sets it: the concepts it tests folded in from the join
   table. `weights` remains readable for older built books but practice uses one
   discrete evidence step for every tested concept. */
const SourceNamedServedExerciseSchema = ExerciseSchema
  .extend({
    concepts: z.array(CONCEPT_REF).default([]),
    weights: z.record(z.number()).optional(),
  })
  .strip()
  .transform(({ source_id, source_section, source_number, ...e }) => ({
    ...e, sourceId: source_id,
    ...(source_section === undefined ? {} : { sourceSection: source_section }),
    ...(source_number === undefined ? {} : { sourceNumber: source_number }),
  }));
/* The generated exercises.json is already in runtime form (sourceId,
   sourceSection, sourceNumber). Older generated books may still carry the
   source-table spellings, so normalize the runtime names before applying the
   one strict parser and transformation. */
export const ServedExerciseSchema = z.preprocess((raw) => {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return raw;
  const row = raw as Record<string, unknown>;
  if (typeof row.sourceId !== 'string' || typeof row.source_id === 'string') return raw;
  return {
    ...row,
    source_id: row.sourceId,
    ...(row.sourceSection === undefined ? {} : { source_section: row.sourceSection }),
    ...(row.sourceNumber === undefined ? {} : { source_number: row.sourceNumber }),
  };
}, SourceNamedServedExerciseSchema);
export type ExerciseDTO = z.infer<typeof ServedExerciseSchema>;

/* ---------- the same two things for a whole book ----------

   A view that stands over the whole library — the practice picker, the search —
   wants every section's problem set and every chapter's concepts at once, and
   fetching them a page at a time is hundreds of requests. The build writes
   these two beside `book.json`, carrying exactly what the per-page files
   carry and nothing more, so the per-page files stay the cheaper thing for one
   open page to read. */

/* Every built section's problem set, by section id: section ids are unique
   inside a book, which is all this key has to be. */
export const BookExercisesSchema = z.record(z.array(ServedExerciseSchema));
export type BookExercisesDTO = z.infer<typeof BookExercisesSchema>;

/* Every concept of the book once, and per chapter the ids it reaches, the
   coverage of its own sections and the meanings it gives the symbols. A chapter
   reaches into the chapters before it, so the same concept is named by many of
   them; repeating it per chapter is most of what the per-chapter files weigh.
   `chapterConceptsOf` in content/bookdata.ts rebuilds a chapter's `ConceptsDTO`
   from the two. */
export const BookConceptsSchema = z.object({
  concepts: z.array(ServedConceptSchema).default([]),
  chapters: z.record(z.object({
    concepts: z.array(CONCEPT_REF).default([]),
    coverage: z.array(ServedCoverageSchema).default([]),
    variables: z.array(VariableSchema.strip()).default([]),
  })).default({}),
});
export type BookConceptsDTO = z.infer<typeof BookConceptsSchema>;
export type ChapterConceptsDTO = BookConceptsDTO['chapters'][string];

/* What one section's page carries about itself: enough to draw its head, its
   footer and its colours, and nothing of the tables below it. */
export type SectionMetaDTO = {
  readonly id: SectionId;
  readonly role: PageRole;             /* a section, or the introduction or summary a chapter or the book opens or closes on */
  readonly chapter?: string;           /* absent on the book's own introduction or summary */
  readonly title: string;
  readonly short: string;
  readonly lead: string;
  readonly objectives: readonly string[];
  readonly summaryHtml: string;
  readonly notes: string;
  readonly types: readonly string[];   /* the types the page wears: what its figures draw, its variables rows and its marked words */
  readonly ai?: AiCreditDTO;
  readonly openstax?: string;          /* the page at the publisher, which the footer credits */
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
/* One figure of a section, as the browser walks below it: the local id the figure carries in the section's text ("sim-shm-oscillator") and the label its head reads out ("Figure 16.9 · An object on a spring slides on a frictionless surface."). */
export type FigureEntry = { readonly id: string; readonly label: string };
/* One referent of a section as the text and its figures colour it, by its place among its figure's rows. */
export type ReferentEntry = { readonly id: string; readonly figures: readonly string[] };
/* Referents seen together, which are dealt their colours together (colours/scopes.ts): their ids in table order,
   the figures their scope covers, and the colour keys it shows (colours/counts.ts). */
export type RefGroupEntry = { readonly referents: readonly string[]; readonly figures: readonly string[]; readonly shows: readonly string[] };
/* One exercise of a section: its id and its kind, which names a label in the book's exercise kinds. */
export type ExerciseEntry = { readonly id: string; readonly kind: string };
export type SectionEntry = {
  readonly id: string; readonly title: string; readonly built: boolean; readonly url: string;
  readonly fragment: string;                     /* the section's HTML fragment, doc.html */
  readonly figuresJs: string;                    /* the section's figure module, figures.js */
  readonly figures: readonly FigureEntry[];      /* what the section draws; empty until the section is built */
  readonly types: readonly string[];             /* the types the page wears, from its meta; empty until the section is built */
  readonly referents?: readonly ReferentEntry[]; /* the section's referents in table order; absent where it has none */
  readonly refGroups?: readonly RefGroupEntry[]; /* its referents by what they are seen with; absent where it has none */
  readonly macros?: MacroMap;                    /* the macros this page sets otherwise than the book, from its variables rows; absent where none differ */
  readonly counts?: Readonly<Record<string, number>>;   /* how often the page shows each colour key (colours/counts.ts); absent until built */
  readonly exercises: readonly ExerciseEntry[];  /* the single exercises of the section, in the order the book sets them */
  readonly openstax?: string;
};
/* A chapter's introduction and summary are listed beside its sections, in the
   same shape, and only once built: the chapter file names their modules, but
   a page's title is its own. */
export type ChapterEntry = {
  readonly id: string; readonly dir: string; readonly title: string; readonly concepts: string;
  readonly intro?: SectionEntry; readonly sections: readonly SectionEntry[]; readonly summary?: SectionEntry;
};
/* One sheet as the shell reads it: what the row says, the page it is served at
   and the data behind that page, which the sheet's own component fetches. */
export type SheetEntry = {
  readonly id: string; readonly title: string; readonly kind: SheetKind;
  readonly url: string;      /* the page, /<book>/sheets/<id>/ */
  readonly data: string;     /* the sheet's data, sheet.json beside the page */
};
export type BookManifest = {
  readonly id: BookId; readonly title: string; readonly publisher: string; readonly authors: readonly string[]; readonly sourceUrl?: string; readonly copyright?: string;
  readonly license: string; readonly licenseUrl?: string; readonly openstax?: string;
  readonly types: TypeMap; readonly macros: MacroMap; readonly symbols: SymbolMap; readonly exerciseKinds: KindMap;
  readonly colours?: BookColoursDTO;         /* the book's stored default colours */
  readonly intro?: SectionEntry; readonly chapters: readonly ChapterEntry[]; readonly summary?: SectionEntry;   /* the book's own pages, built, stand either side of the chapters */
  readonly sheets: readonly SheetEntry[];   /* the book's reference sheets, which stand above the chapters wherever the book is listed */
} & BookFileUrls;
/* The book's own files, one apiece, beside its pages: every section's problem
   set, and every concept once with each chapter's symbols. The manifest names
   them, so that it is the one contract for where a book's files are, as it
   already is for a chapter's concepts. */
export type BookFileUrls = { readonly exercises: string; readonly concepts: string };
