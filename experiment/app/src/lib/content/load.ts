/* Reads the content tree (book → chapters → sections) from disk into DTOs and
   folds the tables into what the runtime reads. Runs at build time only. Every
   path convention lives here, and so does every derivation: the macros a
   symbol expands to, the concepts a chapter reaches, the coverage of a span,
   the types a page binds. */
import fs from 'node:fs/promises';
import path from 'node:path';
import type { z } from 'zod';
import { BookSchema, ChapterSchema, SectionSchema, equationOf } from './schema';
import type {
  BookDTO, BookManifest, ChapterDTO, ChapterEntry, ConceptDTO, ConceptPrereqDTO, ConceptRowDTO, ConceptsDTO, CoverageDTO,
  ExerciseDTO, FigureRowDTO, FormulasDTO, KindMap, MacroMap, SectionDTO, SectionEntry, SectionMetaDTO, SymbolDTO, SymbolMap, TypeDTO, TypeMap,
} from './schema';
import { prerenderMath } from '../math/prerender';
import { sectionSourceUrl } from './attribution';
import { figureIds, figureList, linkFigureRefs } from './fragment';
import { type ConceptId, bookId, qualifiedId } from '../types/ids';

export type SectionSource = {
  readonly dir: string;             /* where the section's files live, for anything that reads one the build does not */
  readonly dto: SectionDTO;         /* the tables as the section writes them, which the validator reads */
  readonly meta: SectionMetaDTO;
  readonly textHtml: string;        /* article body, local ids, math prerendered */
  readonly figuresJs: string;
  readonly figures: readonly FigureRowDTO[];
  readonly coverage: readonly CoverageDTO[];   /* spans already qualified by the section */
  readonly exercises: readonly ExerciseDTO[];
  readonly exercisesLead: string;   /* math prerendered */
};
export type ChapterTree = { readonly dto: ChapterDTO; readonly concepts: ConceptsDTO; readonly formulas: FormulasDTO; readonly sections: readonly SectionSource[] };
export type BookTree = { readonly dto: BookDTO; readonly chapters: readonly ChapterTree[]; readonly manifest: BookManifest };

const readJson = async <T>(file: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>): Promise<T> => schema.parse(JSON.parse(await fs.readFile(file, 'utf8')));
const readText = (file: string): Promise<string> => fs.readFile(file, 'utf8');
const exists = (file: string): Promise<boolean> => fs.access(file).then(() => true, () => false);

/* URL conventions: /<book>/<chapterDir>/<section>/ with a fragment, a figure module and chapter data beside it. */
export const sectionUrl = (bookId: string, chapterDir: string, sectionId: string): string => `/${bookId}/${chapterDir}/${sectionId}/`;
const chapterUrl = (bookId: string, chapterDir: string): string => `/${bookId}/${chapterDir}/`;

/* ---------- the book's symbols ---------- */

/* What a macro stands for. A symbol of a declared type carries its type as a
   class and its own key as data, so that the rendered glyph knows both its
   colour and what the hover layer should look up; a symbol of no type is set
   in ink, as the book writes it. */
export const macroExpansion = (s: SymbolDTO): string =>
  (s.type ? `\\htmlClass{kv-${s.type}}{\\htmlData{sym=${s.sym}}{${s.latex}}}` : s.latex);
/* Every macro the text may write, by name. */
export const macrosOf = (symbols: readonly SymbolDTO[]): MacroMap =>
  Object.fromEntries(symbols.flatMap((s) => (s.macro ? [[s.macro, macroExpansion(s)] as const] : [])));
/* Every symbol by its key, as anything that sets one glyph on its own reads it:
   its macro where the text has one, and its plain LaTeX where it has none. */
export const symbolsOf = (symbols: readonly SymbolDTO[]): SymbolMap =>
  Object.fromEntries(symbols.map((s) => [s.sym, s.macro ?? s.latex] as const));
/* The types by id, in the order the book declares them, since that order is the
   one the colour scheme lays its hues along. */
export const typesOf = (types: readonly TypeDTO[]): TypeMap =>
  Object.fromEntries(types.map((t) => [t.id, { label: t.label, dimension: t.dimension }] as const));
export const kindsOf = (kinds: readonly { id: string; label: string }[]): KindMap =>
  Object.fromEntries(kinds.map((k) => [k.id, k.label] as const));

/* ---------- one section's tables ---------- */

/* The types a page colours: the union of what its figures draw, in one order so
   that two pages drawing the same types say so the same way. */
export const bindsOf = (figures: readonly FigureRowDTO[]): readonly string[] =>
  [...new Set(figures.flatMap((f) => f.draws))].sort();

/* The exercises of a section with the concepts they test folded in, in the order
   the join table lists them, and the pipeline's points where it overrode the
   Bloom table. */
export const exercisesOf = (s: SectionDTO): readonly ExerciseDTO[] => {
  const rowsOf = (id: string) => s.exerciseConcepts.filter((r) => r.exercise === id);
  return s.exercises.map(({ source_id, source_section, ...e }) => {
    const rows = rowsOf(e.id);
    const weighted = rows.flatMap((r) => (r.weight === undefined ? [] : [[r.concept, r.weight] as const]));
    return { ...e, sourceId: source_id, ...(source_section === undefined ? {} : { sourceSection: source_section }), concepts: rows.map((r) => r.concept), ...(weighted.length ? { weights: Object.fromEntries(weighted) } : {}) };
  });
};

/* One row per span, as the text reads it, with the span qualified by its
   section: a span that introduces two concepts is one row with two names. */
export const coverageOf = (s: SectionDTO): readonly CoverageDTO[] => {
  const spans = [...new Set(s.coverage.map((r) => r.span))];
  const of = (span: string, verb: string): ConceptId[] => s.coverage.filter((r) => r.span === span && r.verb === verb).map((r) => r.concept);
  return spans.map((span) => ({ span: qualifiedId(s.id, span), introduces: of(span, 'introduces'), uses: of(span, 'uses'), reinforces: of(span, 'reinforces') }));
};

/* ---------- the book's concepts ---------- */

const prereqIndex = (edges: readonly ConceptPrereqDTO[]): ReadonlyMap<string, readonly ConceptId[]> => {
  const out = new Map<string, ConceptId[]>();
  edges.forEach((e) => { const g = out.get(e.concept); if (g) g.push(e.prereq); else out.set(e.concept, [e.prereq]); });
  return out;
};

/* Everything the seeds reach through the prerequisite edges, the seeds
   themselves included, so that a chapter's map can draw what it takes for
   granted as well as what it teaches. */
const reachable = (seeds: readonly ConceptId[], prereqs: ReadonlyMap<string, readonly ConceptId[]>): ReadonlySet<string> => {
  const seen = new Set<string>();
  const walk = (id: ConceptId): void => {
    if (seen.has(id)) return;
    seen.add(id);
    (prereqs.get(id) ?? []).forEach(walk);
  };
  seeds.forEach(walk);
  return seen;
};

/* A concept whose section the app has not built stands as a placeholder: it has
   a name and a place in the map, and nothing to say about why it matters. */
const conceptOf = (c: ConceptRowDTO, prereqs: readonly ConceptId[], built: ReadonlySet<string>): ConceptDTO =>
  (built.has(c.section)
    ? { status: 'built', ...c, prereqs: [...prereqs] }
    : { status: 'placeholder', id: c.id, kind: c.kind, section: c.section, name: c.name, eq: c.eq, prereqs: [...prereqs] });

/* What one chapter's concept map is drawn from: the concepts its sections
   introduce, everything those reach through the prerequisite edges, and the
   coverage of the sections it has built. */
export const conceptsOfChapter = (book: BookDTO, chapter: ChapterDTO, sections: readonly SectionSource[], built: ReadonlySet<string>): ConceptsDTO => {
  const here = new Set(chapter.sections.map((s) => s.id));
  const prereqs = prereqIndex(book.conceptPrereqs);
  const seen = reachable(book.concepts.filter((c) => here.has(c.section)).map((c) => c.id), prereqs);
  return {
    concepts: book.concepts.filter((c) => seen.has(c.id)).map((c) => conceptOf(c, prereqs.get(c.id) ?? [], built)),
    coverage: sections.flatMap((s) => s.coverage),
  };
};

export const formulasOf = (chapter: ChapterDTO): FormulasDTO => ({ variables: chapter.variables, equations: chapter.equations.map(equationOf), glossary: chapter.glossary });

/* ---------- reading the files ---------- */

const metaOf = (s: SectionDTO): SectionMetaDTO => ({
  id: s.id, chapter: s.chapter, title: s.title, short: s.short, lead: s.lead, objectives: s.objectives,
  summaryHtml: s.summaryHtml, notes: s.notes, binds: bindsOf(s.figures), ai: s.ai,
});

const loadSection = async (dir: string, macros: MacroMap): Promise<SectionSource | null> => {
  if (!(await exists(path.join(dir, 'section.json')))) return null;
  const [dto, text, figuresJs] = await Promise.all([
    readJson(path.join(dir, 'section.json'), SectionSchema),
    readText(path.join(dir, 'text.html')),
    exists(path.join(dir, 'figures.js')).then((ok) => (ok ? readText(path.join(dir, 'figures.js')) : '')),
  ]);
  return {
    dir, dto, meta: metaOf(dto), textHtml: prerenderMath(text, macros), figuresJs,
    figures: dto.figures, coverage: coverageOf(dto), exercises: exercisesOf(dto),
    exercisesLead: dto.exercisesLead ? prerenderMath(dto.exercisesLead, macros) : '',
  };
};

type ChapterLoaded = { readonly dto: ChapterDTO; readonly sections: readonly SectionSource[] };
const loadChapter = async (root: string, dir: string, macros: MacroMap): Promise<ChapterLoaded> => {
  const base = path.join(root, dir);
  const dto = await readJson(path.join(base, 'chapter.json'), ChapterSchema);
  const loaded = await Promise.all(dto.sections.map((s) => loadSection(path.join(base, s.id), macros)));
  const built = loaded.filter((s): s is SectionSource => s !== null);
  /* Figure numbers are chapter-wide: a section may refer to a figure another section keeps. */
  const figs = new Map(built.flatMap((s) => [...figureIds(s.textHtml, s.meta.id)]));
  return { dto, sections: built.map((s) => ({ ...s, textHtml: linkFigureRefs(s.textHtml, figs) })) };
};

const manifestOf = (book: BookDTO, chapters: readonly ChapterTree[]): BookManifest => ({
  id: bookId(book.id), title: book.title, publisher: book.publisher, authors: book.authors, sourceUrl: book.sourceUrl, copyright: book.copyright, license: book.license, licenseUrl: book.licenseUrl, openstax: book.openstax,
  types: typesOf(book.types), macros: macrosOf(book.symbols), symbols: symbolsOf(book.symbols), exerciseKinds: kindsOf(book.exerciseKinds),
  chapters: chapters.map((ch): ChapterEntry => ({
    id: ch.dto.id, dir: ch.dto.dir, title: ch.dto.title,
    concepts: `${chapterUrl(book.id, ch.dto.dir)}concepts.json`, formulas: `${chapterUrl(book.id, ch.dto.dir)}formulas.json`,
    sections: ch.dto.sections.map((s): SectionEntry => {
      const src = ch.sections.find((b) => b.meta.id === s.id);   /* an unbuilt section is listed with nothing below it */
      const url = sectionUrl(book.id, ch.dto.dir, s.id);
      return {
        id: s.id, title: s.title, built: src !== undefined, url, fragment: `${url}doc.html`, figuresJs: `${url}figures.js`,
        figures: src ? figureList(src.textHtml, s.id) : [], binds: src ? src.meta.binds : [], exercises: src ? src.exercises.map((e) => ({ id: e.id, kind: e.kind })) : [],
        openstax: sectionSourceUrl(book, ch.dto, s.id),
      };
    }),
  })),
});

export const loadBook = async (root: string, bookId: string): Promise<BookTree> => {
  const dto = await readJson(path.join(root, 'book.json'), BookSchema);
  if (dto.id !== bookId) throw new Error(`book.json is "${dto.id}", expected "${bookId}"`);
  const loaded = await Promise.all(dto.chapterDirs.map((dir) => loadChapter(root, dir, macrosOf(dto.symbols))));
  /* A concept is a placeholder or not by whether its section is built anywhere in the book, so the whole tree is read before any chapter's concepts are folded. */
  const built = new Set<string>(loaded.flatMap((ch) => ch.sections.map((s) => String(s.meta.id))));
  const chapters = loaded.map((ch): ChapterTree => ({ ...ch, concepts: conceptsOfChapter(dto, ch.dto, ch.sections, built), formulas: formulasOf(ch.dto) }));
  return { dto, chapters, manifest: manifestOf(dto, chapters) };
};

/* The tree is read once per build. In dev every request reads the files again, so a content edit shows on reload. */
let cached: Promise<BookTree> | null = null;
export const bookTree = (root: string, bookId: string): Promise<BookTree> => (import.meta.env.PROD ? (cached ??= loadBook(root, bookId)) : loadBook(root, bookId));
