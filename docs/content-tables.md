# Content as tables

Status: design, 2026-09-10. Replaces the document-shaped JSON of passes 1
to 17 with a relational shape on the same files. The field-by-field
reference is generated from the schema into `content-format.md`; this
document says why the shape is what it is and what the build derives.

## What was wrong

The content files grew as documents rather than tables. `concepts.json`
held concepts, prerequisite edges, coverage and a comment block;
`formulas.json` held variables, equations and glossary. Variants were
expressed by missing fields (a placeholder concept was a concept without a
`why`; an inline exercise was one whose `place` was not `"end"`). The zod
schema stripped unknown keys instead of rejecting them, so eight fields
drifted between chapter 2 and chapter 16 without a single error, and no
test ever ran the schema against the files on disk.

## The shape

Three files, one per level of ownership. Each file is a record whose
scalar fields describe the level itself and whose array fields are tables.
Every table row is flat. A row refers to another row by id only.

### `book.json`

Scalars: `id`, `title`, `publisher`, `authors`, `source_url`, `copyright`,
`license`, `license_url`, `openstax`, `chapters` (chapter directories in
order), and, where the book prints them, `intro` and `summary`, each
`{ module?, slug? }`: the book's own introduction or preface and its
closing summary, which are pages of their own in `intro/` and `summary/`
beside the chapters (rule 21).

Tables:

- `types`: `{ id, label, dimension }`. Ordered; the order is the order the
  colour scheme lays its hues along, so it is an array and not a record.
- `symbols`: `{ sym, latex, type?, macro? }`. One row per symbol the book
  writes with a KaTeX macro or names in a `\htmlData{sym=…}`. The macro
  expansion is derived: a typed symbol expands to
  `\htmlClass{kv-<type>}{\htmlData{sym=<sym>}{<latex>}}`, an untyped one to
  its `latex`. A row with no `macro` is a symbol the hover layer knows but
  the text writes in plain LaTeX (`θ`).
- `exercise_kinds`: `{ id, label }`.
- `concepts`: `{ id, kind, section, name, why?, evidence?, eq? }`. The
  whole book's concept nodes in one table, because ids are canonical and a
  chapter's prerequisites live in other chapters. A concept whose section
  is not built yet is a placeholder; that is derived from the section
  list, not written down. A concept whose section is built must carry
  `why` and `evidence`; the validator enforces it.
- `concept_prereqs`: `{ concept, prereq }`.

### `<chapter>/chapter.json`

Scalars: `id`, `dir`, `title`, and, where the book prints them, `intro`
and `summary`, each `{ module?, slug? }`: the chapter's own introduction
and its summary or conclusion, pages of their own in `intro/` and
`summary/` beside the sections. The old scalar `intro_module` is gone;
the module sits in the record, beside the page's slug at the publisher.

Tables:

- `sections`: `{ id, module, title, slug }`. Every section of the chapter,
  built or not.
- `variables`: `{ sym, type?, meaning, unit, section, anchor? }`. `type`
  was `color`; the book declares types, the app picks hues.
- `equations`: `{ id, concept?, section, latex, ktex?, condition?, anchor?,
  important }`. `condition` is what the equation holds under, in the book's
  words ("constant acceleration"); an equation that holds generally has none.
- `glossary`: `{ section, term, definition }`.

Anchors at this level are qualified span ids, `16.1-hookes-law`, since a
chapter file speaks about several sections.

### `<chapter>/<section>/section.json`

Scalars: `id`, `module`, `chapter`, `title`, `short`, `lead`, `objectives`,
`summary_html`, `notes`, `ai`, `built`, `exercises_lead`, `exercise_notes`
(what the pipeline did with the section's exercises: where answers came
from, what was left out and why, what was held for a later section; it
was the `notes` of the old `exercises.json`).

Tables:

- `figures`: `{ id, kind, number?, folds?, originals?, original_caption?,
  widths?, draws }`. `kind` is `sim` (an interactive figure), `figure` (a faithful
  copy that serves exercises) or `photo`. The kind names the mechanism and
  the label follows from the number: a `sim` row with no number is a Sim,
  an interactive figure that replaces nothing in the book, and its
  eyebrow reads "Sim"; a `sim` row with a number transforms a book
  figure and its eyebrow reads "Figure" with its number and folds; a
  `figure` row reads "Figure" or "Figure N" as its number says; a `photo`
  row reads "Figure N". `draws` lists the types the figure colours, and
  the page's `binds` is the union of them, so `binds` is no longer
  written down. `widths` is the width the book prints each of the row's
  images at, in pixels of the book's own column, one per image in the
  order the row shows them (a photograph's one image, or the
  `originals`), read off the CNXML `<image width>`; it is empty where
  the book gives none, and the app then shows the image at its natural
  size. The `<figure>` element in `text.html` still carries the
  same facts as `data-*` attributes for the browser (a photograph's
  `<img data-width>`, a figure's `data-original-width`, comma-separated
  in the order of `data-original`); the validator checks that the two
  agree until the build injects them.
- `coverage`: `{ span, concept, verb }`, `verb` one of `introduces`,
  `uses`, `reinforces`. One row per pair, so a span that introduces two
  concepts is two rows.
- `exercises`: `{ id, source_id, source_section?, kind, bloom, tag?, place,
  cite?, figure?, prompt, answer }`. `source_section` is the section whose
  source the item was taken from, written down where the book places an
  exercise with the concept it tests rather than with the section it is
  printed in; absent when it is the section's own. `place` is an ADT:
  `{ "at": "end" }` or
  `{ "at": "inline", "after": "<local id>" }`. `answer` is the existing
  ADT on `type`.
- `exercise_concepts`: `{ exercise, concept, weight? }`. `weight` is the
  pipeline's override of the Bloom points table, always AI-written, so it
  needs no `generated_by`.

Ids at this level are local (`hookes-law`, not `16.1-hookes-law`); the
build qualifies them.

### An introduction or summary page

A chapter's or the book's introduction or summary (rule 21) is the same
record in `intro/section.json` or `summary/section.json`, with `id` the
literal `intro` or `summary` and `chapter` the chapter's id, or absent for
the book's own pages. The app reads such a page under an id of its own,
the chapter's number and the role, `2.intro`, so that two chapters'
introductions can stand open in one shell; the book's own stays `intro`.
Its `title`, `notes`, `ai`, `built` and `figures` are as on a section, its
`figures` rows are checked as a section's are and its local ids qualify as
`2.intro-fig-kestrel`; `lead` may be empty, since nothing is written in
the book's place, and `objectives`, `summary_html`, `exercises_lead`,
`exercise_notes`, `coverage`, `exercises` and `exercise_concepts` are
empty. The page has no problem set, no concept coverage and no anchors
into it. Its address is `/<book>/<chapter dir>/intro/`, or
`/<book>/intro/` for the book's own, and the explorer and the book's
front page list it where the book prints it: before the first section or
chapter, after the last.

## Types in the app

`schema.ts` keeps zod, since it already runs at build, and gains three
things. Every object is `.strict()`, so an unknown key fails the build.
Every enumerated field is a `z.enum`, so its inferred type is a literal
union: `bloom: "Remember" | "Understand" | "Apply" | "Analyze" | "Evaluate"
| "Create"`, `kind: "idea" | "result" | "skill"`, `verb`, `generated_by`,
figure `kind`. Every field carries a `.describe()` that the docs generator
reads.

Naming follows the house style: the zod object for a table is
`<Table>Schema` (the on-disk row), and the parsed, camel-cased value the
app consumes is `<Table>DTO`. Ids that cross tables are the branded
strings of `types/ids.ts` (`ConceptId`, `SectionId`, `SpanId`) plus
`TypeId` and `EquationId`, applied in the transform.

Where the disk holds a minimal row and the app wants a variant, the DTO is
the ADT and the transform builds it. A `ConceptDTO` is
`{ status: "placeholder", … } | { status: "built", why, evidence, … }`,
decided by whether the concept's section is built.

## What the build derives

The app's runtime consumers do not change. The loader reads the three
files and produces the same manifest and the same per-chapter and
per-section endpoints as before:

- `<book>/book.json`: the manifest, with `macros` and `symbols` records
  built from the `symbols` table, and `types` as before.
- `<chapter>/concepts.json`: the concepts introduced in the chapter plus
  every concept they reach through `concept_prereqs`, each with its
  `prereqs` folded in, and the chapter's coverage rows folded into the
  old `{ span, introduces, uses, reinforces }` shape with spans qualified.
- `<chapter>/formulas.json`: variables, equations, glossary as before.
- `<section>/exercises.json`: exercises with `concepts` and `weights`
  folded in from `exercise_concepts`, and `place` flattened to the local
  id or `"end"`.
- A section's `summary_html` is rendered into its text article, after the
  last span and before the way on to practice, as
  `<section class="summary" id="<section>-section-summary">` under the
  heading "Section summary", with its math prerendered; it is the book's
  own text and is not folded by default.
- The manifest's chapter entries carry `intro` and `summary` beside
  `sections`, in the same shape, only once built; the manifest itself
  carries the book's own `intro` and `summary` the same way. Everything
  that iterates sections (concept maps, exercises, practice, counts)
  keeps iterating sections; the explorer, the book's front page and the
  tab title are what show the new pages.

## Validation

`npm run check:content` parses every file strictly and then checks
references:

- every `concept`, `prereq`, `exercise`, `type`, `section`, `eq` and
  `kind` reference resolves to a row;
- every `anchor`, `span`, `cite` and `place.after` is an `id` in the
  section's `text.html`;
- every `figures.id` is a `<figure id>` in `text.html` and every
  `<figure data-figure>` matches the row's `number` joined with its
  `folds` in the book's order ("3.3 + 3.4 + 3.5"), and no fold repeats a
  number the section already carries;
- every `widths` is empty or one number per image the row shows, and the
  text carries the same numbers: `<img data-width>` on a photograph,
  `<figure data-original-width>` on a figure with originals, and neither
  where the row is empty;
- every `<figure>`'s eyebrow reads what its row says: "Sim" for a `sim`
  row with no number, "Figure" and the joined numbers for a `sim` row
  with one, "Figure" or "Figure N" for a `figure` row, "Figure N" for a
  `photo` row;
- every `Figure N.M` the text cites is carried by some row of the book, as
  its `number` or one of its `folds`; one that is not is a warning rather
  than an error, since the figure may sit in a chapter nobody has built;
- every `source_id` occurs in the `source.md` of `source_section` where the
  row names one and of the section itself where it does not, and a
  `source_section` names a section the app has built;
- every built concept has `why` and `evidence` and at least one coverage
  row that introduces it;
- every `draws` entry is a declared type;
- every section names its chapter and has a lead, and its text keeps off
  the id `section-summary`, which the build gives the summary block it
  appends after the last span;
- every introduction or summary page is named by an `intro` or `summary`
  record of the chapter or the book that keeps it, names that chapter (or
  none, for the book's own), and carries none of a section's apparatus:
  its objectives, summary, exercises lead and notes, coverage, exercises
  and exercise concepts are empty, and only there may the lead be empty;
- no chapter table anchors into an introduction or summary page.

The same checks run in `npm test` against the real content, so a content
edit that breaks a reference fails the suite, not only the build.

## Documentation

`npm run docs:content` walks the schema and writes `content-format.md`:
one section per file, one table per table, one row per field with its
type, whether it is required, and its description. The file is generated
and not edited by hand; the description lives on the field in the schema.
