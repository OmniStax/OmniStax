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
import { inheritedTypes, splitSub } from './load';
import type { BookTree, SectionSource, SheetSource } from './load';
import { REF, SUMMARY_ID, printedNumbers } from './fragment';
import { type FrontRole, pageRoleOf, pagesOf as framedPagesOf } from './roles';
import type { BookDTO, ChapterDTO, FigureRowDTO, FrontPageRefDTO, SectionDTO } from './schema';
import { cellNumber } from './sheets';
import { isHex, normHex } from '../colours/model';
import { REFERENT_COUNT } from '../colours/referents';
import { asidesOf, referentGroups } from '../colours/scopes';
import { isElementSymbol } from '../fig/elements';
import { figureLiterals, figureRefs } from './figrefs';
import { conceptSpanIds } from './conceptspans';
import type { TableSheetDTO } from './sheets';

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

/* One built page as a check reads it: the tables as it writes them, the text
   the spans live in, and the source the exercises were taken from. A page is a
   section, or the introduction or summary a chapter or the book keeps beside
   its sections, which writes the same record with most of it empty. */
export type SectionContent = {
  readonly dto: SectionDTO;
  readonly textHtml: string;          /* the article body, ids still local */
  readonly sourceMd: string | null;   /* the section's source.md, or nothing where the section keeps none */
  readonly figuresJs: string;         /* the section's figures.js, empty where it keeps none */
};
export type ChapterContent = { readonly dto: ChapterDTO; readonly intro?: SectionContent; readonly sections: readonly SectionContent[]; readonly summary?: SectionContent };
/* The whole book as the checks read it: the three files, and the text and source of every page that is built. */
export type Content = { readonly book: BookDTO; readonly sheets: readonly SheetSource[]; readonly intro?: SectionContent; readonly chapters: readonly ChapterContent[]; readonly summary?: SectionContent };
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
/* The label an eyebrow prints: the eyebrow's own text, which is what sits at depth one inside the first span of
   class eyebrow. A badge nested in it (the 3D tag) is chrome beside the label and is left out, as the tag walk of
   linkFigureRefs leaves it. Nothing where the element has no eyebrow. */
const EYEBROW_OPEN = /<span\b[^>]*\bclass="[^"]*\beyebrow\b[^"]*"[^>]*>/;
type Walk = { readonly depth: number; readonly text: string };
const eyebrowText = (body: string): string | undefined => {
  const open = EYEBROW_OPEN.exec(body); if (!open) return undefined;
  const walked = body.slice(open.index + open[0].length).split(/(<[^>]+>)/).reduce<Walk>(({ depth, text }, part) => {
    if (depth === 0) return { depth, text };
    if (!part.startsWith('<')) return { depth, text: depth === 1 ? text + part : text };
    return { depth: /^<span\b/.test(part) ? depth + 1 : /^<\/span>/.test(part) ? depth - 1 : depth, text };
  }, { depth: 1, text: '' });
  return walked.text.replace(/\s+/g, ' ').trim();
};
/* Every <figure> of the text by its id, with the label its eyebrow prints. Figures do not nest. */
const figureEyebrows = (html: string): ReadonlyMap<string, string | undefined> =>
  new Map(Array.from(html.matchAll(/<figure\b([^>]*)>([\s\S]*?)<\/figure>/g), ([, attrs, body]) => [/\bid="([^"]+)"/.exec(attrs)?.[1] ?? '', eyebrowText(body)] as const));

/* The sections of the book, which is what the tables of concepts, exercises and anchors speak about. */
const sectionsOf = (content: Content): readonly SectionContent[] => content.chapters.flatMap((ch) => ch.sections);
/* Every page of the book, the introductions and summaries included, which is what the checks on a page's own text and figures read. */
const pagesOf = (content: Content): readonly SectionContent[] =>
  [...(content.intro ? [content.intro] : []), ...content.chapters.flatMap((ch) => framedPagesOf(ch)), ...(content.summary ? [content.summary] : [])];
/* Where a finding in a page is: the section's number, since that is what its directory is called, or the id the app reads an introduction or summary under ("2.intro"). */
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
  const symbols = idsOf(content.book.symbols, (s) => s.sym);
  const sections = idsOf(content.chapters.flatMap((ch) => ch.dto.sections), (s) => s.id);
  const chapters = idsOf(content.chapters, (ch) => ch.dto.id);

  const conceptSection = (where: string, section: string): readonly Finding[] =>
    (sections.has(section) ? []
      : chapters.has(chapterOfSection(section))
        ? [error(where, `is introduced in section "${section}", which chapter ${chapterOfSection(section)} does not list`)]
        : [info(where, `waits on section "${section}", in a chapter the book has not added yet`)]);

  const fromBook = content.book.concepts.flatMap((c) => {
    const where = `book.json concepts[${c.id}]`;
    return [
      ...conceptSection(where, c.section),
      ...ref(where, 'symbol', symbols, c.symbol),
      ...c.forms.flatMap((f) => ref(`${where} forms[${f.id}]`, 'section', sections, f.section)),
    ];
  }).concat(content.book.conceptPrereqs.flatMap((e) => {
    const where = `book.json concept_prereqs[${e.concept} ← ${e.prereq}]`;
    return [...ref(where, 'concept', concepts, e.concept), ...ref(where, 'prereq', concepts, e.prereq)];
  }));

  const fromChapters = content.chapters.flatMap((ch) => {
    const own = idsOf(ch.dto.sections, (s) => s.id);
    return [
      ...ch.dto.variables.flatMap((v) => [
        ...ref(inChapter(ch, 'variables', v.sym), 'section', own, v.section),
        ...ref(inChapter(ch, 'variables', v.sym), 'concept', concepts, v.concept),
      ]),
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

/* A figure may draw only a type the book declares. */
export const checkDraws: Check = (content) => {
  const types = idsOf(content.book.types, (t) => t.id);
  return pagesOf(content).flatMap((s) => s.dto.figures.flatMap((f) => f.draws.flatMap((t) => ref(inSection(s, 'figures', f.id), 'draws', types, t))));
};

/* The book declares the types, and a kind is declared once, on the concept: a variables row inherits it, so a
   type stored on the row is an override, and a stored null sets the row in ink. An override equal to what the
   row inherits says nothing, and a null where it inherits no type says nothing either. A symbol takes its type
   in each section from its row there, so a type stored on the symbol belongs on the variables row. */
export const checkTypes: Check = (content) => {
  const types = idsOf(content.book.types, (t) => t.id);
  const inherit = inheritedTypes(content.book.concepts, content.chapters.flatMap((ch) => ch.dto.variables));
  const redundant = (where: string, type: string | null | undefined, inherited: string | undefined): readonly Finding[] =>
    (type === null && inherited === undefined ? [warning(where, 'sets itself in ink, which it is already, inheriting no type')]
      : type !== undefined && type === inherited ? [warning(where, `overrides its type with "${type}", which is the type it inherits`)] : []);
  return [
    ...content.book.symbols.flatMap((sym) => {
      const where = `book.json symbols[${sym.sym}]`;
      return sym.type === undefined ? [] : [...ref(where, 'type', types, sym.type ?? undefined), warning(where, `stores type ${sym.type === null ? 'null' : `"${sym.type}"`}, which belongs on the variables row of each section that writes it`)];
    }),
    ...content.chapters.flatMap((ch) => ch.dto.variables.flatMap((v) => {
      const where = inChapter(ch, 'variables', v.sym);
      return [...ref(where, 'type', types, v.type ?? undefined), ...redundant(where, v.type, inherit.variable(v))];
    })),
    ...content.book.concepts.flatMap((c) => ref(`book.json concepts[${c.id}]`, 'type', types, c.type)),
  ];
};

/* Every value the text gives an attribute, each once. */
const attrValues = (html: string, attr: string): readonly string[] =>
  [...new Set(Array.from(html.matchAll(new RegExp(`<[^>]*\\s${attr}="([^"]*)"`, 'g')), (m) => m[1]))];
/* The prose a page marks its words in: the text, and the lead under the title, each with the file it is written in. */
type Marked = { readonly file: string; readonly html: string };
const markedOf = (s: SectionContent): readonly Marked[] =>
  [{ file: `${s.dto.id}/text.html`, html: s.textHtml }, { file: `${s.dto.id}/section.json`, html: s.dto.lead }];
/* The text may mark a run of words <span data-type="…"> to wear a type as a symbol does: the type is one the book declares. */
export const checkTypeSpans: Check = (content) => {
  const types = idsOf(content.book.types, (t) => t.id);
  return pagesOf(content).flatMap((s) => markedOf(s).flatMap((m) => attrValues(m.html, 'data-type').flatMap((t) =>
    (types.has(t) ? [] : [error(m.file, `marks words with type "${t}", which the book does not declare`)]))));
};

/* Every prose a page writes, each with the file it is written in: the text, the lead, the summary and the exercises' lead. */
const proseOf = (s: SectionContent): readonly Marked[] => [
  ...markedOf(s),
  { file: `${s.dto.id}/section.json`, html: s.dto.summaryHtml },
  { file: `${s.dto.id}/section.json`, html: s.dto.exercisesLead },
];
/* A phrase the builder judged to name a concept is marked <span data-concept="…">: the concept is one of the book. */
export const checkConceptSpans: Check = (content) => {
  const concepts = idsOf(content.book.concepts, (c) => c.id);
  return pagesOf(content).flatMap((s) => proseOf(s).flatMap((m) => conceptSpanIds(m.html).flatMap((id) =>
    (concepts.has(id) ? [] : [error(m.file, `<span data-concept="${id}"> names no concept of the book`)]))));
};

/* A referent is one thing of one example or figure (block 1, Firm B), which the text marks <span data-ref="…">
   and the figures colour with F.ref. Its id is unique in the section, its row lists the figures of the section
   that draw it and every figure whose script calls F.ref on it (figrefs.ts), and the text or the lead names it:
   a span that names no row is an error, and a row no span names a warning. */
export const checkReferents: Check = (content) =>
  pagesOf(content).flatMap((s) => {
    const figures = idsOf(s.dto.figures, (f) => f.id); const rows = idsOf(s.dto.referents, (r) => r.id);
    const spans = markedOf(s).flatMap((m) => attrValues(m.html, 'data-ref').flatMap((v) => v.split(/\s+/).filter(Boolean).map((id) => ({ id, file: m.file }))));
    const named = new Set(spans.map((n) => n.id));
    const drawn = s.dto.referents.length ? figureRefs(s.figuresJs, s.dto.figures.map((f) => f.id), s.dto.referents.map((r) => r.id), false) : new Map();
    return [
      ...s.dto.referents.flatMap((r, i) => {
        const where = inSection(s, 'referents', r.id);
        return [
          ...(s.dto.referents.findIndex((o) => o.id === r.id) < i ? [error(where, 'is declared twice')] : []),
          ...r.figures.flatMap((f) => ref(where, 'figures', figures, f)),
          ...[...drawn].flatMap(([f, ids]) => (ids.has(r.id) && !r.figures.includes(f) ? [error(where, `is drawn with F.ref in figure "${f}", which its figures do not list`)] : [])),
          ...(named.has(r.id) ? [] : [warning(where, 'is named by no <span data-ref> of the text')]),
        ];
      }),
      ...[...new Map(spans.map((n) => [`${n.file}|${n.id}`, n])).values()].flatMap((n) => (rows.has(n.id) ? [] : [error(n.file, `<span data-ref="${n.id}"> is no row of the referents table`)])),
    ];
  });

/* Referents seen together are dealt the thirty-six colours of the referent palette together, so a group of
   more repeats one. */
const groupsOf = (s: SectionContent) => referentGroups({ referents: s.dto.referents, figures: s.dto.figures, text: s.textHtml, asides: asidesOf(s.dto.lead, s.dto.summaryHtml, s.dto.exercisesLead) });
export const checkReferentCount: Check = (content) =>
  pagesOf(content).flatMap((s) => groupsOf(s).flatMap((g) => (g.referents.length > REFERENT_COUNT
    ? [warning(`${s.dto.id}/section.json referents`, `has ${g.referents.length} referents seen together; the referent palette has ${REFERENT_COUNT} colours, so ${g.referents.slice(REFERENT_COUNT).join(', ')} repeat${g.referents.length - REFERENT_COUNT === 1 ? 's' : ''} a colour`)]
    : [])));

/* The default colours a book stores (book.json `colours`) are written by a script and kept as written, so a
   type declared since, or one dropped since, makes them stale until the script is run again. */
export const checkColourDefault: Check = (content) => {
  const stored = content.book.colours;
  if (!stored) return [];
  const declared = content.book.types.map((t) => String(t.id));
  const missing = declared.filter((t) => !(t in stored.assign));
  const gone = Object.keys(stored.assign).filter((t) => !declared.includes(t));
  return [
    ...(missing.length ? [warning('book.json colours', `is stale: ${missing.join(', ')} ${missing.length === 1 ? 'has' : 'have'} no stored colour; run npm run colours:default`)] : []),
    ...(gone.length ? [warning('book.json colours', `is stale: ${gone.join(', ')} ${gone.length === 1 ? 'is' : 'are'} no longer a declared type`)] : []),
  ];
};

/* A figure that passes a literal to F.el or F.fact lists it in its row's conventions or facts, which the default
   colours keep the types apart from. A call is credited to every figure whose statement reaches it (figrefs.ts);
   a call no figure's statement reaches is held to the section's rows together. */
type Tag = { readonly fn: string; readonly field: 'conventions' | 'facts'; readonly read: (lit: string) => string | null };
const TAGS: readonly Tag[] = [
  { fn: 'el', field: 'conventions', read: (lit) => (isElementSymbol(lit) || /^[A-Z]/.test(lit) ? lit : null) },
  { fn: 'fact', field: 'facts', read: (lit) => (lit.startsWith('#') && isHex(lit) ? normHex(lit) : null) },
];
const listed = (f: FigureRowDTO, tag: Tag): ReadonlySet<string> =>
  new Set(f[tag.field].flatMap((v) => (tag.field === 'facts' ? (isHex(v) ? [normHex(v)] : []) : [v])));
export const checkFixedColours: Check = (content) =>
  pagesOf(content).flatMap((s) => (s.figuresJs ? TAGS.flatMap((tag) => {
    const found = figureLiterals(s.figuresJs, s.dto.figures.map((f) => f.id), tag.fn);
    const call = (lit: string): string => `F.${tag.fn}('${lit}')`;
    const unlisted = (lits: ReadonlySet<string>, has: ReadonlySet<string>): readonly string[] =>
      [...lits].flatMap((lit) => { const k = tag.read(lit); return k !== null && !has.has(k) ? [lit] : []; });
    const union = new Set(s.dto.figures.flatMap((f) => [...listed(f, tag)]));
    return [
      ...s.dto.figures.flatMap((f) => unlisted(found.byFigure.get(f.id) ?? new Set(), listed(f, tag))
        .map((lit) => warning(inSection(s, 'figures', f.id), `draws ${call(lit)}, which its ${tag.field} do not list`))),
      ...unlisted(found.loose, union).map((lit) => warning(`${s.dto.id}/figures.js`, `draws ${call(lit)}, which no figure row's ${tag.field} lists`)),
    ];
  }) : []));

/* A variables row that names a referent splits its symbol, the subscript in the referent's colour: the referent
   is a row of the same section's referents, and the symbol has a subscript to colour. */
export const checkVariableRefs: Check = (content) => {
  const pages = new Map(pagesOf(content).map((s) => [String(s.dto.id), s] as const));
  const symbols = new Map(content.book.symbols.map((sym) => [sym.sym, sym] as const));
  return content.chapters.flatMap((ch) => ch.dto.variables.flatMap((v) => {
    if (v.ref === undefined) return [];
    const where = inChapter(ch, 'variables', `${v.section}/${v.sym}`); const page = pages.get(v.section); const sym = symbols.get(v.sym);
    return [
      ...(page === undefined ? [error(where, `names referent "${v.ref}", but section ${v.section} is not built`)]
        : page.dto.referents.some((r) => r.id === v.ref) ? [] : [error(where, `ref "${v.ref}" is no row of section ${v.section}\u2019s referents`)]),
      ...(sym !== undefined && splitSub(sym.latex) === null ? [warning(where, `names referent "${v.ref}", but ${sym.latex} has no subscript to colour`)] : []),
    ];
  }));
};

/* An anchor names the span where a variable or a form is introduced,
   qualified by its section ("16.1-hookes-law"), because a chapter file speaks
   about several sections. It must be an id the built section carries. */
export const checkAnchors: Check = (content) => {
  const ids = new Map(sectionsOf(content).map((s) => [String(s.dto.id), localIds(s.textHtml)] as const));
  const anchor = (where: string, value: string | undefined): readonly Finding[] => {
    if (value === undefined) return [];
    const cut = value.indexOf('-');
    const [section, local] = cut < 0 ? [value, ''] : [value.slice(0, cut), value.slice(cut + 1)];
    const built = ids.get(section);
    if (pageRoleOf(section) !== 'section') return [error(where, `anchors "${value}", but an introduction or summary page carries no anchors`)];
    if (!built) return [error(where, `anchors "${value}", but section ${section} is not built`)];
    return built.has(local) ? [] : [error(where, `anchors "${value}", but section ${section} has no id "${local}"`)];
  };
  return [
    ...content.chapters.flatMap((ch) => ch.dto.variables.flatMap((v) => anchor(inChapter(ch, 'variables', v.sym), v.anchor))),
    ...content.book.concepts.flatMap((c) => c.forms.flatMap((f) => anchor(`book.json concepts[${c.id}] forms[${f.id}]`, f.anchor))),
  ];
};

/* A span of the section's own tables is local, as the section writes it: the
   span coverage is written of, the passage an exercise cites, and the span an
   inline exercise follows. Each must be an id in the section's text. */
export const checkSpans: Check = (content) =>
  pagesOf(content).flatMap((s) => {
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
   it does not, and the same number on both. A sim that folds several book
   figures prints them all, so the text's number is the joined string of the
   row's number and its folds, and a fold may not repeat a number the section
   already carries, on this row or another.

   The eyebrow follows from the row. An interactive figure that replaces
   nothing in the book is a Sim, and its eyebrow reads exactly that; one that
   transforms a book figure is still a Figure, and its eyebrow reads "Figure"
   with every number it carries. A faithful copy reads "Figure" or "Figure N"
   as its number says, and a photograph reads "Figure N". The kind sim names
   the mechanism, a simulation the reader can play with, and the label
   follows from the number. */
const numbersOf = (f: FigureRowDTO): readonly string[] => (f.number === undefined ? [] : [f.number, ...f.folds]);
/* What a row's eyebrow must read, or nothing where the row cannot be labelled (a photograph with no number). */
export const eyebrowOf = (f: FigureRowDTO): string | undefined => {
  const printed = printedNumbers(f);
  if (f.kind === 'sim') return printed === undefined ? 'Sim' : `Figure ${printed}`;
  if (f.kind === 'figure') return printed === undefined ? 'Figure' : `Figure ${printed}`;
  return printed === undefined ? undefined : `Figure ${printed}`;
};
const eyebrowFinding = (where: string, f: FigureRowDTO, read: string | undefined): readonly Finding[] => {
  const expected = eyebrowOf(f);
  if (expected === undefined) return [error(where, 'is a photograph with no number, so its eyebrow has nothing to read')];
  if (read === undefined) return [error(where, `has no eyebrow in the text; it should read "${expected}"`)];
  return read === expected ? [] : [error(where, `reads "${read}" in the text and should read "${expected}"`)];
};
export const checkFigures: Check = (content) =>
  pagesOf(content).flatMap((s) => {
    const drawn = figureTags(s.textHtml);
    const eyebrows = figureEyebrows(s.textHtml);
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
      ...s.dto.figures.flatMap((f) => (drawn.has(f.id) ? eyebrowFinding(inSection(s, 'figures', f.id), f, eyebrows.get(f.id)) : [])),
    ];
  });

/* A figure the AI made keeps its own `ai`, one entry per model and pass saying what it did, and its mark
   names them; a row without the list falls back to the section's `ai.figures`, which cannot tell the reader
   which model did which part. A section with no `ai.figures` drew nothing of its own and is not asked. */
export const checkFigureAi: Check = (content) =>
  pagesOf(content).flatMap((s) => (s.dto.ai?.figures.length ? s.dto.figures : [])
    .filter((f) => f.kind !== 'photo' && f.ai === undefined)
    .map((f) => warning(inSection(s, 'figures', f.id), 'keeps no ai of its own, so its mark names only the section’s ai.figures')));

/* The book says how wide it prints an image, as the width attribute of the
   CNXML <image>, and a row keeps that in `widths`: one number per image the
   row shows, in the order it shows them, or nothing where the book gives none.
   The text carries the same numbers for the browser, as the other facts of a
   row are carried: a photograph's <img> has data-width, and a figure with
   originals has data-original-width, comma-separated and aligned with
   data-original. Both must agree with the row, and both are absent where the
   row is empty. */
/* The width attributes one <figure> of the text carries: the data-width of its image and its own data-original-width. */
type WidthTags = { readonly image?: string; readonly originals?: string };
const widthTags = (html: string): ReadonlyMap<string, WidthTags> =>
  new Map(Array.from(html.matchAll(/<figure\b([^>]*)>([\s\S]*?)<\/figure>/g), ([, attrs, body]) => [/\bid="([^"]+)"/.exec(attrs)?.[1] ?? '', {
    image: /<img\b[^>]*\bdata-width="([^"]*)"/.exec(body)?.[1],
    originals: /\bdata-original-width="([^"]*)"/.exec(attrs)?.[1],
  }] as const));
/* How many images a row shows: a photograph shows one, and any other row shows its originals. */
const imageCount = (f: FigureRowDTO): number => (f.kind === 'photo' ? 1 : f.originals.length);
const widthFinding = (where: string, f: FigureRowDTO, tags: WidthTags | undefined): readonly Finding[] => {
  if (f.widths.length > 0 && f.widths.length !== imageCount(f)) return [error(where, `gives ${f.widths.length} widths for ${imageCount(f)} images`)];
  if (tags === undefined) return [];
  const expected = f.widths.length === 0 ? undefined : f.kind === 'photo' ? String(f.widths[0]) : f.widths.join(',');
  const [attr, read] = f.kind === 'photo' ? ['data-width', tags.image] : ['data-original-width', tags.originals];
  if (read === expected) return [];
  if (expected === undefined) return [error(where, `gives no widths, but its ${attr} in the text reads "${read}"`)];
  if (read === undefined) return [error(where, `gives widths ${expected}, but carries no ${attr} in the text`)];
  return [error(where, `gives widths ${expected} and its ${attr} in the text reads "${read}"`)];
};
export const checkWidths: Check = (content) =>
  pagesOf(content).flatMap((s) => {
    const tags = widthTags(s.textHtml);
    return s.dto.figures.flatMap((f) => widthFinding(inSection(s, 'figures', f.id), f, tags.get(f.id)));
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
  const carried = new Set(pagesOf(content).flatMap((s) => s.dto.figures.flatMap(numbersOf)));
  return pagesOf(content).flatMap((s) => citedNumbers(s.textHtml).flatMap((n) =>
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

/* A concept whose section is built is taught there, so it carries its
   statement, and exactly one span of the text introduces it: where the book
   first does, which the reader can always go to (RULES item 6). A concept whose
   section nobody has built yet is a placeholder and says none of that. */
export const checkConcepts: Check = (content) => {
  const built = idsOf(sectionsOf(content), (s) => String(s.dto.id));
  const introductions = sectionsOf(content).flatMap((s) => s.dto.coverage.filter((r) => r.verb === 'introduces').map((r) => [String(r.concept), `${s.dto.id}#${r.span}`] as const));
  const spansOf = (id: string): readonly string[] => introductions.filter(([c]) => c === id).map(([, at]) => at);
  return content.book.concepts.filter((c) => built.has(c.section)).flatMap((c) => {
    const where = `book.json concepts[${c.id}]`;
    const spans = spansOf(c.id);
    return [
      ...(c.statement ? [] : [error(where, 'is taught in a built section and has no statement')]),
      ...(spans.length === 0 ? [error(where, 'is taught in a built section and no coverage row introduces it')] : []),
      ...(spans.length > 1 ? [error(where, `is introduced ${spans.length} times (${spans.join(', ')}); exactly one span introduces a concept`)] : []),
    ];
  });
};

/* A symbol belongs to the definition of its quantity (RULES item 6), so every
   variables row names its concept. A row that names none is a warning while
   the books are being linked, and an error once this is set. A form and a
   glossary word name their concept by standing on it. */
export const UNLINKED_ROWS_ARE_ERRORS = true;
export const checkConceptLinks: Check = (content) => {
  const finding = UNLINKED_ROWS_ARE_ERRORS ? error : warning;
  return content.chapters.flatMap((ch) =>
    ch.dto.variables.flatMap((v) => (v.concept === undefined ? [finding(inChapter(ch, 'variables', `${v.section}/${v.sym}`), 'names no concept')] : [])));
};

/* A form is named by its id wherever the text, an answer or a note names it,
   so no two forms of the book share one; and a reader looks a concept up by
   its name, so no two concepts of the book share one. A glossary word may
   stand on two concepts, since the book glosses some words twice ("power" of a force and of
   a lens), and the reader's place says which is meant. */
export const checkConceptNames: Check = (content) => {
  const twice = <T,>(rows: readonly T[], key: (row: T) => string): ReadonlyMap<string, readonly T[]> => {
    const by = new Map<string, T[]>();
    rows.forEach((r) => { const k = key(r); by.set(k, [...(by.get(k) ?? []), r]); });
    return new Map([...by].filter(([, rs]) => rs.length > 1));
  };
  const forms = content.book.concepts.flatMap((c) => c.forms.map((f) => ({ id: String(f.id), concept: String(c.id) })));
  const named = content.book.concepts.map((c) => ({ name: c.name.trim().toLowerCase(), concept: String(c.id) }));
  return [
    ...[...twice(forms, (f) => f.id)].map(([id, rs]) => error(`book.json concepts[${rs.map((r) => r.concept).join(', ')}]`, `share the form id "${id}"`)),
    ...[...twice(named, (n) => n.name)].map(([n, rs]) => error(`book.json concepts[${rs.map((r) => r.concept).join(', ')}]`, `share the name "${n}"`)),
  ];
};

/* A page is what its role says (rule 21). A section belongs to a chapter and
   opens on a lead. An introduction or summary page keeps the book's own words
   and nothing else: it has no lead, lists no objectives, prints no section
   summary, sets no exercises and covers no concepts, since the lead and the
   apparatus belong to sections and nothing is invented in the book's place; and
   the chapter or the book that keeps it must name it, so that the page's module
   and its slug are written down where the sections' are. A section's text also
   keeps off the one id the build adds to it, the summary block's. */
const EMPTY_ON_FRONT: readonly (readonly [string, (s: SectionDTO) => number])[] = [
  ['lead', (s) => s.lead.length], ['objectives', (s) => s.objectives.length], ['summary_html', (s) => s.summaryHtml.length], ['exercises_lead', (s) => s.exercisesLead.length],
  ['exercise_notes', (s) => s.exerciseNotes.length], ['coverage', (s) => s.coverage.length], ['exercises', (s) => s.exercises.length], ['exercise_concepts', (s) => s.exerciseConcepts.length],
];
const frontPage = (s: SectionContent, role: FrontRole, owner: string, named: FrontPageRefDTO | undefined, chapter: string | undefined): readonly Finding[] => {
  const where = `${s.dto.id}/section.json`;
  return [
    ...(named === undefined ? [error(where, `is the ${role} of ${owner}, which names no ${role} of its own`)] : []),
    ...(s.dto.chapter === chapter ? [] : [error(where, chapter === undefined ? `belongs to the book and names chapter "${s.dto.chapter}"` : `belongs to chapter ${chapter} and names chapter "${s.dto.chapter ?? ''}"`)]),
    ...EMPTY_ON_FRONT.flatMap(([field, count]) => (count(s.dto) === 0 ? [] : [error(where, `is ${role === 'intro' ? 'an introduction' : 'a summary'} page and carries ${field}, which belongs to a section`)])),
  ];
};
/* A lead says what the section is about and stops (rule 21); one that runs on
   has become a précis of the section in the book's place. */
const LEAD_WORDS = 80;
const wordsOf = (text: string): number => text.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length;
const section = (s: SectionContent): readonly Finding[] => [
  ...(s.dto.chapter === undefined ? [error(`${s.dto.id}/section.json`, 'is a section and names no chapter')] : []),
  ...(s.dto.lead === '' ? [error(`${s.dto.id}/section.json`, 'is a section and has no lead')] : []),
  ...(wordsOf(s.dto.lead) > LEAD_WORDS ? [warning(`${s.dto.id}/section.json`, `has a lead of ${wordsOf(s.dto.lead)} words, over the ${LEAD_WORDS} rule 21 allows`)] : []),
  ...(localIds(s.textHtml).has(SUMMARY_ID) ? [error(`${s.dto.id}/text.html`, `carries the id "${SUMMARY_ID}", which the build keeps for the section summary`)] : []),
];
export const checkPages: Check = (content) => {
  const ownedBy = (owner: string, named: { readonly intro?: FrontPageRefDTO; readonly summary?: FrontPageRefDTO }, pages: { readonly intro?: SectionContent; readonly summary?: SectionContent }, chapter: string | undefined): readonly Finding[] =>
    (['intro', 'summary'] as const).flatMap((role) => { const page = pages[role]; return page ? frontPage(page, role, owner, named[role], chapter) : []; });
  return [
    ...ownedBy('the book', content.book, content, undefined),
    ...content.chapters.flatMap((ch) => [...ownedBy(`chapter ${ch.dto.id}`, ch.dto, ch, ch.dto.id), ...ch.sections.flatMap(section)]),
  ];
};


/* ---------- the sheets ---------- */

/* A sheet is a table the app looks a token up in, so the one thing that can go
   wrong in the book is the file: the row names a path, and nothing in book.json
   can say whether the file is there, whether it parses, or whether what it
   holds is the kind the row promised. The loader has read it already and kept
   the error rather than thrown, so every sheet of every book is reported in one
   run. A sheet whose data names a section the book does not have is a warning
   and not an error: the sections are computed by a tool from what is built, and
   a book that drops a chapter should still serve its table. */
/* A table sheet's own shape, which nothing but this can check: the zod object
   says a row is a list of strings and cannot say that it is as long as the
   columns, nor that two tables of one appendix have different ids. A cell of a
   numeric column that is not a number is a warning and not an error, since the
   book itself prints a value with a word beside it ("0.9999720 (density
   maximum)") and the page simply leaves such a row out of that column's order.
   A cell with no digit in it at all is the book's own em dash for a value
   nobody has measured, and it is not reported. */
const checkTableSheet = (file: string, d: TableSheetDTO): readonly Finding[] => {
  const tables = new Set<string>();
  return d.tables.flatMap((t): readonly Finding[] => {
    const where = `${file}/${t.id}`;
    const twice = tables.has(t.id) ? [error(where, 'is declared twice')] : (tables.add(t.id), []);
    const columns = new Set<string>();
    const ids = t.columns.flatMap((c) => (columns.has(c.id) ? [error(where, `has two columns called "${c.id}"`)] : (columns.add(c.id), [])));
    const lengths = t.rows.flatMap((row, i) => (row.length === t.columns.length ? [] : [error(where, `row ${i + 1} has ${row.length} cells and the table has ${t.columns.length} columns`)]));
    const numbers = t.columns.flatMap((c, i) => (c.kind !== 'number' ? [] : t.rows
      .filter((row) => /\d/.test(plainText(row[i] ?? '')) && cellNumber(row[i] ?? '') === null)
      .map((row) => warning(where, `the ${plainText(c.label) || `column ${i + 1}`} of "${plainText(row[0] ?? '')}" is "${plainText(row[i] ?? '')}", which is not a number`))));
    return [...twice, ...ids, ...lengths, ...numbers];
  });
};
const plainText = (html: string): string => html.replace(/<[^>]*>/g, '').trim();

export const checkSheets: Check = (content) => {
  const pages = new Set<string>(pagesOf(content).map((p) => String(p.dto.id)));
  const seen = new Set<string>();
  return content.sheets.flatMap((s): readonly Finding[] => {
    const where = `book.json/sheets/${s.row.id}`;
    const duplicate = seen.has(s.row.id) ? [error(where, 'is declared twice')] : (seen.add(s.row.id), []);
    if (s.data === null) return [...duplicate, error(where, `names "${s.row.file}", which does not read: ${s.error ?? 'unknown'}`)];
    const d = s.data;
    return [
      ...duplicate,
      ...(d.kind === s.row.kind ? [] : [error(where, `is of kind "${s.row.kind}" and its file holds a "${d.kind}" sheet`)]),
      ...(d.id === s.row.id ? [] : [error(`${s.row.file}`, `calls itself "${d.id}" and the book lists it as "${s.row.id}"`)]),
      ...(d.title === s.row.title ? [] : [warning(`${s.row.file}`, `is titled "${d.title}" and the book lists it as "${s.row.title}"`)]),
      ...(d.kind !== 'table' ? [] : checkTableSheet(s.row.file, d)),
      ...(d.kind !== 'elements' ? [] : d.elements.flatMap((e) => e.sections.filter((sec) => !pages.has(sec)).map((sec) => warning(`${s.row.file}`, `${e.symbol} names section "${sec}", which the book does not build`)))),
    ];
  });
};

/* ---------- every rule, run over the book ---------- */

/* The concept map is a DAG (rule 6). Peeling off every concept whose prerequisites are all peeled leaves
   exactly the ones on a loop or resting on one, and each of those has a prerequisite left; walking back
   along those from each in turn must come round on itself, which names the loop. */
type ConceptKey = string;
export const prereqLoops = (edges: readonly { readonly concept: ConceptKey; readonly prereq: ConceptKey }[]): readonly (readonly ConceptKey[])[] => {
  const prereqs = new Map<ConceptKey, ConceptKey[]>();
  const dependents = new Map<ConceptKey, ConceptKey[]>();
  edges.forEach((e) => {
    prereqs.set(e.concept, [...(prereqs.get(e.concept) ?? []), e.prereq]);
    dependents.set(e.prereq, [...(dependents.get(e.prereq) ?? []), e.concept]);
  });
  const nodes = [...new Set(edges.flatMap((e) => [e.concept, e.prereq]))];
  const waiting = new Map(nodes.map((n) => [n, (prereqs.get(n) ?? []).length]));
  const peel = (ready: readonly ConceptKey[]): void => ready.forEach((n) => {
    waiting.delete(n);
    peel((dependents.get(n) ?? []).filter((d) => waiting.has(d) && waiting.set(d, waiting.get(d)! - 1).get(d) === 0));
  });
  peel(nodes.filter((n) => waiting.get(n) === 0));
  const seen = new Set<ConceptKey>();
  return [...waiting.keys()].flatMap((start) => {
    if (seen.has(start)) return [];
    const path: ConceptKey[] = [];
    let at = start;
    while (!seen.has(at)) { seen.add(at); path.push(at); at = (prereqs.get(at) ?? []).find((p) => waiting.has(p))!; }
    const from = path.indexOf(at);
    if (from < 0) return [];
    const loop = path.slice(from).reverse();
    const first = loop.indexOf([...loop].sort()[0]);
    const turned = [...loop.slice(first), ...loop.slice(0, first)];
    return [[...turned, turned[0]]];
  });
};
export const checkPrereqCycles: Check = (content) =>
  prereqLoops(content.book.conceptPrereqs).map((loop) =>
    error('book.json concept_prereqs', `closes a loop, each concept resting on the one before: ${loop.join(' → ')}`));

export const CHECKS: readonly Check[] = [checkPages, checkRefs, checkTypes, checkTypeSpans, checkConceptSpans, checkReferents, checkReferentCount, checkColourDefault, checkFixedColours, checkVariableRefs, checkDraws, checkAnchors, checkSpans, checkFigures, checkFigureAi, checkWidths, checkFigureRefs, checkSources, checkConcepts, checkConceptLinks, checkConceptNames, checkPrereqCycles, checkSheets];
export const checkContent: Check = (content) => CHECKS.flatMap((check) => check(content));
export const errorsOf = (findings: readonly Finding[]): readonly Finding[] => findings.filter((f) => f.level === 'error');
export const warningsOf = (findings: readonly Finding[]): readonly Finding[] => findings.filter((f) => f.level === 'warning');

/* ---------- what the checks are read from ---------- */

/* The loader has already read the three files and every text.html; the one thing
   it has no reason to read is the source a section was made from, so this is
   where that is read and the only place any check's input comes off disk. The
   tables are taken as written, before any type is inherited, since a stored
   override is itself something to check. */
const readIf = (file: string): Promise<string | null> => fs.readFile(file, 'utf8').then((s) => s, () => null);
const pageContent = async (s: SectionSource): Promise<SectionContent> => ({ dto: s.dto, textHtml: s.textHtml, sourceMd: await readIf(path.join(s.dir, 'source.md')), figuresJs: s.figuresJs });
const frontContent = async (s: SectionSource | undefined): Promise<SectionContent | undefined> => (s ? pageContent(s) : undefined);
/* The introduction and summary of a level, as fields only where the level keeps them, so a fixture without them reads the same as one written without them. */
const framed = (intro: SectionContent | undefined, summary: SectionContent | undefined) => ({ ...(intro ? { intro } : {}), ...(summary ? { summary } : {}) });
export const contentOf = async (tree: BookTree): Promise<Content> => ({
  book: tree.stored,
  sheets: tree.sheets,
  ...framed(await frontContent(tree.intro), await frontContent(tree.summary)),
  chapters: await Promise.all(tree.chapters.map(async (ch): Promise<ChapterContent> => ({
    dto: ch.stored,
    ...framed(await frontContent(ch.intro), await frontContent(ch.summary)),
    sections: await Promise.all(ch.sections.map(pageContent)),
  }))),
});
