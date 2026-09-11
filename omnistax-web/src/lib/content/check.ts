/* The content checked against itself. The tables refer to one another by id and
   to the text by span, and nothing in a JSON file can say whether the row or the
   span it names exists; the schema only says a field is a string. So every
   reference is followed here, once, after the whole book has been read.

   Each rule is one pure function from the content to the findings it has, so a
   test can call it on a fixture of two rows and the runner can call all of them
   on the book. Nothing throws: a check that fails says what is wrong and where,
   and the caller decides what to do with it. The build does not run any of this
   — it stays fast, and `npm run check:content` and the test suite guard the
   content instead. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { bindsOf } from './load';
import type { BookTree } from './load';
import { REF, printedNumbers } from './fragment';
import type { BookDTO, ChapterDTO, FigureRowDTO, SectionDTO } from './schema';

/* What a check found. An error is content that will not work: a reference to a
   row or a span that is not there. A warning is content that works but may be
   a slip: a figure the prose cites that no row of the book carries, which is
   legitimate while the chapter it lives in is unbuilt and a mistake once that
   chapter is there. Info is content that is allowed to be incomplete, and is
   said out loud so that nobody has to remember it: a concept that waits on a
   chapter the book has not added yet. */
export type Finding = { readonly level: 'error' | 'warning' | 'info'; readonly where: string; readonly what: string };
const error = (where: string, what: string): Finding => ({ level: 'error', where, what });
const warning = (where: string, what: string): Finding => ({ level: 'warning', where, what });
const info = (where: string, what: string): Finding => ({ level: 'info', where, what });

/* One built section as a check reads it: the tables as it writes them, the text
   the spans live in, and the source the exercises were taken from. */
export type SectionContent = {
  readonly dto: SectionDTO;
  readonly textHtml: string;          /* the article body, ids still local */
  readonly sourceMd: string | null;   /* the section's source.md, or nothing where the section keeps none */
};
export type ChapterContent = { readonly dto: ChapterDTO; readonly sections: readonly SectionContent[] };
/* The whole book as the checks read it: the three files, and the text and source of every section that is built. */
export type Content = { readonly book: BookDTO; readonly chapters: readonly ChapterContent[] };
export type Check = (content: Content) => readonly Finding[];

/* ---------- what the tables and the text are indexed by ---------- */

/* One reference followed: nothing where the id names a row, and a finding where it does not. */
const ref = (where: string, what: string, rows: ReadonlySet<string>, id: string | undefined): readonly Finding[] =>
  (id === undefined || rows.has(id) ? [] : [error(where, `${what} "${id}" names no row`)]);

const idsOf = <T,>(rows: readonly T[], key: (row: T) => string): ReadonlySet<string> => new Set(rows.map(key));
/* A section id carries its chapter: "16.1" is read in chapter "16". */
const chapterOfSection = (section: string): string => section.split('.')[0];
/* Every id the section's text carries, which is what a span, an anchor, a cite and an inline exercise's place must name. */
export const localIds = (html: string): ReadonlySet<string> => new Set(Array.from(html.matchAll(/\sid="([^"]+)"/g), (m) => m[1]));
/* Every <figure> of the text by its id, with the number the browser reads off it. */
const figureTags = (html: string): ReadonlyMap<string, string | undefined> =>
  new Map(Array.from(html.matchAll(/<figure\b[^>]*>/g), ([tag]) => [/\bid="([^"]+)"/.exec(tag)?.[1] ?? '', /\bdata-figure="([^"]+)"/.exec(tag)?.[1]] as const));

const sectionsOf = (content: Content): readonly SectionContent[] => content.chapters.flatMap((ch) => ch.sections);
/* Where a finding in a section is: the section's number, since that is what its directory is called. */
const inSection = (s: SectionContent, table: string, row: string): string => `${s.dto.id}/section.json ${table}[${row}]`;
const inChapter = (ch: ChapterContent, table: string, row: string): string => `${ch.dto.dir}/chapter.json ${table}[${row}]`;

/* ---------- the rules ---------- */

/* Every id one table writes about another must name a row of it. The one
   reference allowed to dangle is a concept's section: the concept map is drawn
   from the whole book, so a concept may be introduced in a chapter nobody has
   added yet. That is said as info; a section missing from a chapter the book
   does list is an error, because the chapter is there to list it. */
export const checkRefs: Check = (content) => {
  const concepts = idsOf(content.book.concepts, (c) => c.id);
  const kinds = idsOf(content.book.exerciseKinds, (k) => k.id);
  const equations = idsOf(content.chapters.flatMap((ch) => ch.dto.equations), (e) => e.id);
  const sections = idsOf(content.chapters.flatMap((ch) => ch.dto.sections), (s) => s.id);
  const chapters = idsOf(content.chapters, (ch) => ch.dto.id);

  const conceptSection = (where: string, section: string): readonly Finding[] =>
    (sections.has(section) ? []
      : chapters.has(chapterOfSection(section))
        ? [error(where, `is introduced in section "${section}", which chapter ${chapterOfSection(section)} does not list`)]
        : [info(where, `waits on section "${section}", in a chapter the book has not added yet`)]);

  const fromBook = content.book.concepts.flatMap((c) => {
    const where = `book.json concepts[${c.id}]`;
    return [...conceptSection(where, c.section), ...ref(where, 'eq', equations, c.eq)];
  }).concat(content.book.conceptPrereqs.flatMap((e) => {
    const where = `book.json concept_prereqs[${e.concept} ← ${e.prereq}]`;
    return [...ref(where, 'concept', concepts, e.concept), ...ref(where, 'prereq', concepts, e.prereq)];
  }));

  const fromChapters = content.chapters.flatMap((ch) => {
    const own = idsOf(ch.dto.sections, (s) => s.id);
    return [
      ...ch.dto.variables.flatMap((v) => ref(inChapter(ch, 'variables', v.sym), 'section', own, v.section)),
      ...ch.dto.equations.flatMap((e) => [
        ...ref(inChapter(ch, 'equations', e.id), 'section', own, e.section),
        ...ref(inChapter(ch, 'equations', e.id), 'concept', concepts, e.concept),
      ]),
      ...ch.dto.glossary.flatMap((g) => ref(inChapter(ch, 'glossary', g.term), 'section', own, g.section)),
      ...ch.sections.flatMap((s) => [
        ...ref(`${s.dto.id}/section.json`, 'id', own, s.dto.id),
        ...ref(`${s.dto.id}/section.json`, 'chapter', chapters, s.dto.chapter),
      ]),
    ];
  });

  const fromSections = sectionsOf(content).flatMap((s) => {
    const exercises = idsOf(s.dto.exercises, (e) => e.id);
    return [
      ...s.dto.coverage.flatMap((r) => ref(inSection(s, 'coverage', r.span), 'concept', concepts, r.concept)),
      ...s.dto.exercises.flatMap((e) => ref(inSection(s, 'exercises', e.id), 'kind', kinds, e.kind)),
      ...s.dto.exerciseConcepts.flatMap((r) => [
        ...ref(inSection(s, 'exercise_concepts', `${r.exercise} × ${r.concept}`), 'exercise', exercises, r.exercise),
        ...ref(inSection(s, 'exercise_concepts', `${r.exercise} × ${r.concept}`), 'concept', concepts, r.concept),
      ]),
    ];
  });

  return [...fromBook, ...fromChapters, ...fromSections];
};

/* Colour is a function of type, and a page colours the union of what its figures
   draw, so a figure may draw only a type the book declares and a page binds only
   what its figures drew. */
export const checkBinds: Check = (content) => {
  const types = idsOf(content.book.types, (t) => t.id);
  return sectionsOf(content).flatMap((s) => [
    ...s.dto.figures.flatMap((f) => f.draws.flatMap((t) => ref(inSection(s, 'figures', f.id), 'draws', types, t))),
    ...bindsOf(s.dto.figures).flatMap((t) => (types.has(t) ? [] : [error(`${s.dto.id}/section.json`, `the page binds unknown type "${t}"`)])),
  ]);
};

/* A symbol and a variable name the type that gives them their colour, and the book declares the types. */
export const checkTypes: Check = (content) => {
  const types = idsOf(content.book.types, (t) => t.id);
  return [
    ...content.book.symbols.flatMap((sym) => ref(`book.json symbols[${sym.sym}]`, 'type', types, sym.type)),
    ...content.chapters.flatMap((ch) => ch.dto.variables.flatMap((v) => ref(inChapter(ch, 'variables', v.sym), 'type', types, v.type))),
  ];
};

/* An anchor names the span where a variable or an equation is introduced,
   qualified by its section ("16.1-hookes-law"), because a chapter file speaks
   about several sections. It must be an id the built section carries. */
export const checkAnchors: Check = (content) => {
  const ids = new Map(sectionsOf(content).map((s) => [String(s.dto.id), localIds(s.textHtml)] as const));
  const anchor = (where: string, value: string | undefined): readonly Finding[] => {
    if (value === undefined) return [];
    const cut = value.indexOf('-');
    const [section, local] = cut < 0 ? [value, ''] : [value.slice(0, cut), value.slice(cut + 1)];
    const built = ids.get(section);
    if (!built) return [error(where, `anchors "${value}", but section ${section} is not built`)];
    return built.has(local) ? [] : [error(where, `anchors "${value}", but section ${section} has no id "${local}"`)];
  };
  return content.chapters.flatMap((ch) => [
    ...ch.dto.variables.flatMap((v) => anchor(inChapter(ch, 'variables', v.sym), v.anchor)),
    ...ch.dto.equations.flatMap((e) => anchor(inChapter(ch, 'equations', e.id), e.anchor)),
  ]);
};

/* A span of the section's own tables is local, as the section writes it: the
   span coverage is written of, the passage an exercise cites, and the span an
   inline exercise follows. Each must be an id in the section's text. */
export const checkSpans: Check = (content) =>
  sectionsOf(content).flatMap((s) => {
    const ids = localIds(s.textHtml);
    const span = (where: string, what: string, value: string | undefined): readonly Finding[] =>
      (value === undefined || ids.has(value) ? [] : [error(where, `${what} "${value}" is no id in the section’s text`)]);
    return [
      ...s.dto.coverage.flatMap((r) => span(inSection(s, 'coverage', r.span), 'span', r.span)),
      ...s.dto.exercises.flatMap((e) => [
        ...span(inSection(s, 'exercises', e.id), 'cite', e.cite),
        ...span(inSection(s, 'exercises', e.id), 'place.after', e.place.at === 'inline' ? e.place.after : undefined),
      ]),
    ];
  });

/* The figures table and the text say the same thing until the build injects the
   one from the other: one row per <figure> the text draws, no row for a figure
   it does not, and the same number on both. A demo that folds several book
   figures prints them all, so the text's number is the joined string of the
   row's number and its folds, and a fold may not repeat a number the section
   already carries, on this row or another. */
const numbersOf = (f: FigureRowDTO): readonly string[] => (f.number === undefined ? [] : [f.number, ...f.folds]);
export const checkFigures: Check = (content) =>
  sectionsOf(content).flatMap((s) => {
    const drawn = figureTags(s.textHtml);
    const rows = new Map(s.dto.figures.map((f) => [f.id, printedNumbers(f)] as const));
    const carriedBy = (n: string, except: string): readonly string[] => s.dto.figures.filter((f) => f.id !== except && numbersOf(f).includes(n)).map((f) => f.id);
    return [
      ...s.dto.figures.flatMap((f) => (drawn.has(f.id) ? [] : [error(inSection(s, 'figures', f.id), 'is no <figure> of the section’s text')])),
      ...[...drawn.keys()].flatMap((id) => (rows.has(id) ? [] : [error(`${s.dto.id}/text.html`, `<figure id="${id}"> is no row of the figures table`)])),
      ...[...drawn].flatMap(([id, number]) => (!rows.has(id) || rows.get(id) === number ? []
        : [error(inSection(s, 'figures', id), `is numbered ${rows.get(id) ?? '(none)'} in the table and ${number ?? '(none)'} in the text`)])),
      ...s.dto.figures.flatMap((f) => f.folds.flatMap((n) => {
        if (n === f.number) return [error(inSection(s, 'figures', f.id), `folds ${n}, which is its own number`)];
        if (f.number === undefined) return [error(inSection(s, 'figures', f.id), `folds ${n} but carries no number of its own`)];
        const others = carriedBy(n, f.id);
        return others.length === 0 ? [] : [error(inSection(s, 'figures', f.id), `folds ${n}, which figure "${others.join('", "')}" already carries`)];
      })),
    ];
  });

/* Every figure the prose cites should land somewhere: the build links "Figure
   3.5" to the row that carries 3.5, as its number or as a fold, and a number no
   row of the book carries stays plain text. That is legitimate while the figure
   is in a chapter nobody has built, and a slip once it is not, so it is said as
   a warning rather than an error. The eyebrow of a figure names the figure
   itself and is what the row says, so it is not a citation. */
const EYEBROW = /<span\b[^>]*\bclass="[^"]*\beyebrow\b[^"]*"[^>]*>[\s\S]*?<\/span>/g;
export const citedNumbers = (html: string): readonly string[] =>
  [...new Set(Array.from(html.replace(EYEBROW, '').matchAll(REF), ([run]) => run.match(/\d+\.\d+/g) ?? []).flat())];
export const checkFigureRefs: Check = (content) => {
  const carried = new Set(sectionsOf(content).flatMap((s) => s.dto.figures.flatMap(numbersOf)));
  return sectionsOf(content).flatMap((s) => citedNumbers(s.textHtml).flatMap((n) =>
    (carried.has(n) ? [] : [warning(`${s.dto.id}/text.html`, `cites Figure ${n}, which no figure row of the book carries, so it stays plain text`)])));
};

/* An exercise keeps the publisher's own id for it, so that the item can be found
   again in the source it was taken from. That is usually the section's own
   source, and where the book places an item with the concept it tests rather
   than with the section it is printed in, the row says which section's source to
   look in. Either way the id must be in that source, and a section named must be
   one the app has built, since an unbuilt one has no source to look in. Where the
   id is nowhere the finding says which source does hold it, because an id in the
   wrong place reads very differently from one that is nowhere. */
export const checkSources: Check = (content) => {
  const sources = new Map(sectionsOf(content).map((s) => [String(s.dto.id), s.sourceMd] as const));
  const elsewhere = (id: string, from: string): string =>
    [...sources].filter(([of, source]) => of !== from && (source?.includes(id) ?? false)).map(([of]) => of).join(', ');
  return sectionsOf(content).flatMap((s): readonly Finding[] => s.dto.exercises.flatMap((e) => {
    const from = String(e.source_section ?? s.dto.id);
    const where = inSection(s, 'exercises', e.id);
    if (!sources.has(from)) return [error(where, `source_section "${from}" is no section the app has built`)];
    const source = sources.get(from) ?? null;
    if (source === null) return [error(where, `is taken from ${from}, which keeps no source.md beside it`)];
    if (source.includes(e.source_id)) return [];
    const other = elsewhere(e.source_id, from);
    return [error(where, `source_id "${e.source_id}" is nowhere in the source.md of ${from}${other === '' ? '' : `; it is in the source of ${other}`}`)];
  }));
};

/* A concept whose section is built is taught somewhere, so it must say why it
   matters and what in the section shows it, and some span of the text must be
   where the reader meets it. A concept whose section nobody has built yet is a
   placeholder and says none of that. */
export const checkConcepts: Check = (content) => {
  const built = idsOf(sectionsOf(content), (s) => String(s.dto.id));
  const introduced = idsOf(sectionsOf(content).flatMap((s) => s.dto.coverage).filter((r) => r.verb === 'introduces'), (r) => String(r.concept));
  return content.book.concepts.filter((c) => built.has(c.section)).flatMap((c) => {
    const where = `book.json concepts[${c.id}]`;
    return [
      ...(c.why ? [] : [error(where, 'is taught in a built section and says no why')]),
      ...(c.evidence ? [] : [error(where, 'is taught in a built section and shows no evidence')]),
      ...(introduced.has(c.id) ? [] : [error(where, 'is taught in a built section and no coverage row introduces it')]),
    ];
  });
};

/* ---------- every rule, run over the book ---------- */

export const CHECKS: readonly Check[] = [checkRefs, checkTypes, checkBinds, checkAnchors, checkSpans, checkFigures, checkFigureRefs, checkSources, checkConcepts];
export const checkContent: Check = (content) => CHECKS.flatMap((check) => check(content));
export const errorsOf = (findings: readonly Finding[]): readonly Finding[] => findings.filter((f) => f.level === 'error');
export const warningsOf = (findings: readonly Finding[]): readonly Finding[] => findings.filter((f) => f.level === 'warning');

/* ---------- what the checks are read from ---------- */

/* The loader has already read the three files and every text.html; the one thing
   it has no reason to read is the source a section was made from, so this is
   where that is read and the only place any check's input comes off disk. */
const readIf = (file: string): Promise<string | null> => fs.readFile(file, 'utf8').then((s) => s, () => null);
export const contentOf = async (tree: BookTree): Promise<Content> => ({
  book: tree.dto,
  chapters: await Promise.all(tree.chapters.map(async (ch): Promise<ChapterContent> => ({
    dto: ch.dto,
    sections: await Promise.all(ch.sections.map(async (s): Promise<SectionContent> => ({ dto: s.dto, textHtml: s.textHtml, sourceMd: await readIf(path.join(s.dir, 'source.md')) }))),
  }))),
});
