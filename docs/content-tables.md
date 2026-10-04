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

- `types`: `{ id, label, dimension? }`. The kinds of thing the book
  colours: a quantity, a curve, a part. `dimension` is the unit, where the
  type is a quantity. Ordered; the order is the order the colour scheme
  lays its hues along, so it is an array and not a record.
- `symbols`: `{ sym, latex, macro? }`. One row per symbol the book
  writes with a KaTeX macro or names in a `\htmlData{sym=…}`. A symbol
  carries no type: in each section it wears the type of its variables row
  there (the row's override, else its concept's; `null` is ink), so one
  symbol may read as two kinds in two sections. Where a section has no row
  of it, and outside any section (the chat, the formula sheet), it wears
  the type its variables rows share across the book, else the type shared
  by the concepts whose `symbol` it is. A `type` stored here is a
  warning: it belongs on the variables rows. The macro expansion is
  derived, per page: a typed symbol expands to
  `\htmlClass{kv-<type>}{\htmlData{sym=<sym>}{<latex>}}`, an untyped one to
  its `latex`, and the manifest lists for each page only the macros it
  sets otherwise than the book. A row with no `macro` is a symbol the hover
  layer knows but the text writes in plain LaTeX (`θ`).
- `exercise_kinds`: `{ id, label }`.
- `concepts`: `{ id, kind, section, name, symbol?, terms, type?,
  statement?, forms }`. The whole
  book's concept nodes in one table, because ids are canonical and a
  chapter's prerequisites live in other chapters. Everything the book
  teaches is a concept (RULES item 6), and `kind` is one of five:
  `definition` (stipulated, a name for something: displacement, the joule),
  `axiom` (taken as given: a postulate, or a law found by experiment such as
  F = ma or Ohm's law), `result` (follows from other concepts, whether or not
  the book shows the steps), `idea` (earns a place in the map and is none of
  those: the Bohr model, the Michelson–Morley experiment) and `skill`
  (know-how for applying the others: drawing a free-body diagram). The kind
  is what this book treats as given or derived. `statement` is the meaning of
  a definition, the claim of an axiom or a result, what an idea is or what a
  skill lets the reader do, in the book's voice. `name` is what a reader would
  look the concept up by and nothing more: the term for a definition (average
  speed, the joule), the book's own name for a law or result (Hooke's law, the
  transformer equation), else the fewest words that pick it out (subshell
  capacity); a skill is a short gerund phrase (converting units). A name holds
  no formula, no symbol and no gloss after a comma or colon; the statement
  says what it means and the concept's forms carry the formula. The concept
  is the one record of what it is (issue #39): `terms` are the words the
  book's glossary defines it under, which the app marks at every mention
  in the prose of the chapters that deal with it (in a paragraph or list
  item, never in a link, heading, maths, caption or exercise, and a
  shorter term never inside a longer one); `symbol` is the one key of
  `symbols` the book denotes it by, where it has one, never the list of
  its variants; `type` is the type the concept names, where it names one,
  the one place a kind is declared: the symbols and variables rows that
  denote the concept inherit it, its hover card's title wears it, and every
  `data-concept` span naming it in the prose wears it (rule 7.4, below);
  `forms`
  are the equations that state it, each `{ id, latex, ktex?, condition?,
  section?, anchor? }`, ordered, the first the main form a card, the
  Reference view and the search lead with. A form's `id` is unique in the
  book, since a text span, an answer or a note names it; its `section` is
  written only where the form is stated outside the concept's own section (a
  rearrangement in a later chapter); `condition` is what the form holds
  under, in the book's words ("constant acceleration"). Forms live on their
  concept in `book.json` rather than in the chapter that states them: the
  concept is one record, `book.json` is read at build time only, and what a
  page fetches is its chapter's `concepts.json`, which carries the forms of
  the concepts it reaches. A concept whose section is not built yet
  is a placeholder; that is derived from the section list, not written down.
  A concept whose section is built must carry a `statement` and be introduced
  by exactly one coverage row; the validator enforces both. Exercises reach a
  concept through `exercise_concepts`, so it needs no field for them.
- `concept_prereqs`: `{ concept, prereq }`.
- `sheets`: `{ id, title, kind, file }`. The reference sheets the book keeps
  beside its chapters, each a page of its own at `/<book>/sheets/<id>/`,
  listed in the explorer and on the contents page above the chapters. The
  `kind` is an ADT tag and today it is `"elements"`, the periodic table the
  app draws and the formula hover reads, or `"table"`, a plain reference
  table of named columns and rows. `file` is a path under the book's own
  folder, by convention `sheets/<id>.json`.

  A sheet file is one record with the same `id` and `title` the row gives
  it, a `kind` that must be the row's, a `source` sentence saying where the
  values came from, since a sheet is reference data and not the book's
  words, and `generated_by`, `"tool"` or `"hand"`, so that a later pass
  knows what it may overwrite. An `elements` sheet then carries `elements`,
  one row per element with its symbol, name, atomic number, weight (as a
  number and as the table prints it), group, period, block, category, the
  book's three-way shading, state at 25 °C, electron configuration,
  electronegativity, first ionization energy, covalent radius, year of
  discovery, and the sections of this book that name it. A `table` sheet is one
  data appendix of the book: its `source` is `{ module, appendix }` rather than
  a sentence, and it carries `tables`, one per table the appendix prints, each
  `{ id, title, columns, rows, notes }`. A column is
  `{ id, label, unit?, kind }`, where `label` and `unit` are HTML, since a
  heading may carry a subscript, and `kind` is `"text"`, `"number"` — a column
  the page sorts by, whose cells read as a decimal or as a coefficient times a
  power of ten — or `"formula"`. A row is one cell per column in column order,
  each the same HTML the prose carries, so the formula hover marks a formula in
  a cell as it marks one in a paragraph; a row whose first cell alone is filled
  is a heading the book prints inside the table. `notes` are the table's
  footnotes, marked in the cells they belong to as `<sup class="fn">n</sup>`.
  The shapes are zod objects in
  `src/lib/content/sheets.ts`, beside the tables of the three content files.

### `<chapter>/chapter.json`

Scalars: `id`, `dir`, `title`, and, where the book prints them, `intro`
and `summary`, each `{ module?, slug? }`: the chapter's own introduction
and its summary or conclusion, pages of their own in `intro/` and
`summary/` beside the sections. The old scalar `intro_module` is gone;
the module sits in the record, beside the page's slug at the publisher.

Tables:

- `sections`: `{ id, module, title, slug }`. Every section of the chapter,
  built or not.
- `variables`: `{ sym, concept?, type?, ref?, meaning, unit, section,
  anchor?, redefines? }`. A row inherits its `concept`'s type, and `type` is
  an override, written only where the row must differ or where its concept
  has no type, and `null` sets the row in ink whatever its concept's type;
  the book declares types, the app picks hues. The row's type is the
  colour the symbol wears wherever its section writes it. `ref` names a
  referent of the same section whose quantity the symbol is (F_x for the
  first tug's push): the symbol is then split, its main letter in its
  type's colour and its subscript, the part after the first `_` outside
  braces, in the referent's. `concept` is the definition of the symbol's
  quantity; a variant or a component (a_x, B₁) names the definition of its
  base quantity. This is the table a symbol's card reads its meaning in
  this section from.

The chapter's `equations` and `glossary` tables folded onto the concepts on
2026-10-02, as their `forms` and `terms`. `concept` is optional on a
variables row in the schema; a row without one is a warning, which
`UNLINKED_ROWS_ARE_ERRORS` in `check.ts` turns into an error.

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
  row reads "Figure N". `draws` lists the types the figure colours, which
  its referents' hues keep clear of. `widths` is the width the book prints each of the row's
  images at, in pixels of the book's own column, one per image in the
  order the row shows them (a photograph's one image, or the
  `originals`), read off the CNXML `<image width>`; it is empty where
  the book gives none, and the app then shows the image at its natural
  size. The `<figure>` element in `text.html` still carries the
  same facts as `data-*` attributes for the browser (a photograph's
  `<img data-width>`, a figure's `data-original-width`, comma-separated
  in the order of `data-original`); the validator checks that the two
  agree until the build injects them.
- `referents`: `{ id, label, figures }`. A particular thing that
  exists only in one example or figure (block 1 and block 2, Firm A and
  Firm B, the crank of one engine) and that the text and the figure both
  point at. A referent is a value of a type, not a type, so it carries
  none. The text marks every reference to it, pronouns included,
  `<span data-ref="<id>">Firm B</span>`, and the figure colours it with
  `F.ref('<id>')`. A phrase naming several lists them,
  `data-ref="firm-a firm-b"`, and its words wear their colours in turn.
  `figures` lists every figure of the section that draws it, at least
  one. The section deals its referents the reader's thirty-six referent
  colours (by default the OKLab colours picked next after the book's
  categories) in table order: in order, the i-th referent wears colour
  i; smart, the default, it wears the first colour from i on, wrapping,
  that no earlier referent of the section wears and that stands clear of
  every category, convention and fact colour the page shows, and a
  section where any referent finds none is dealt in order. So a referent
  wears one colour in every figure and in the text, and no two referents
  of a section match. `F.cat` skips the colours the section's referents
  wear; both follow the reader's Referents switch, not Concepts. A
  section with more than thirty-six referents is a warning.
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

Beside the tables, the words of `text.html` wear their concepts' types
(rule 7.4). The builder reads each mention in its sentence and, where it
names a concept, generally or in particular, writes
`<span data-concept="<id>">`; the build colours it by the concept's type.
A word in another sense ("at the same time") stays plain.
`<span data-type="<type>">` marks a value no concept names, such as
`20.0 m`. A type is coloured on every page, whatever the page's figures
draw.

The `lead` is prose of the same kind: it may write the page's symbol
macros, `<span data-concept="<id>">`, `<span data-type="<type>">` and `<span data-ref="<id>">`, which
render and are coloured as in `text.html`. A referent named only in the
lead counts as named.

### An introduction or summary page

A chapter's or the book's introduction or summary (rule 21) is the same
record in `intro/section.json` or `summary/section.json`, with `id` the
literal `intro` or `summary` and `chapter` the chapter's id, or absent for
the book's own pages. The app reads such a page under an id of its own,
the chapter's number and the role, `2.intro`, so that two chapters'
introductions can stand open in one shell; the book's own stays `intro`.
Its `title`, `notes`, `ai`, `built` and `figures` are as on a section, its
`figures` rows are checked as a section's are and its local ids qualify as
`2.intro-fig-kestrel`; `lead` is empty, since nothing is written in
the book's place, and so are `objectives`, `summary_html`, `exercises_lead`,
`exercise_notes`, `coverage`, `exercises` and `exercise_concepts`. The page has no problem set, no concept coverage and no anchors
into it. Its address is `/<book>/<chapter dir>/intro/`, or
`/<book>/intro/` for the book's own, and the explorer and the book's
front page list it where the book prints it: before the first section or
chapter, after the last.

## Types in the app

`schema.ts` keeps zod, since it already runs at build, and gains three
things. Every object is `.strict()`, so an unknown key fails the build.
Every enumerated field is a `z.enum`, so its inferred type is a literal
union: `bloom: "Remember" | "Understand" | "Apply" | "Analyze" | "Evaluate"
| "Create"`, concept `kind: "definition" | "axiom" | "result" | "idea" | "skill"`, `verb`, `generated_by`,
figure `kind`. Every field carries a `.describe()` that the docs generator
reads.

Naming follows the house style: the zod object for a table is
`<Table>Schema` (the on-disk row), and the parsed, camel-cased value the
app consumes is `<Table>DTO`. Ids that cross tables are the branded
strings of `types/ids.ts` (`ConceptId`, `SectionId`, `SpanId`) plus
`TypeId` and `EquationId`, applied in the transform.

Where the disk holds a minimal row and the app wants a variant, the DTO is
the ADT and the transform builds it. A `ConceptDTO` is
`{ status: "placeholder", … } | { status: "built", statement, … }`,
decided by whether the concept's section is built.

## What the build derives

The app's runtime consumers do not change. The loader reads the three
files and produces the same manifest and the same per-chapter and
per-section endpoints as before:

- `<book>/book.json`: the manifest, with `macros` and `symbols` records
  built from the `symbols` table, and `types` as before.
- `<chapter>/concepts.json`: the concepts introduced in the chapter plus
  every concept they reach through `concept_prereqs`, each with its
  `prereqs` folded in and every form placed in the section that states it,
  the chapter's coverage rows folded into the old `{ span, introduces, uses,
  reinforces }` shape with spans qualified, and the chapter's `variables`.
  It is the one file a chapter serves; `formulas.json` is gone.
- `<book>/concepts.json`: every concept of the book once, and per chapter
  the ids it reaches, its coverage and its variables, which a view over the
  whole book, the search and practice read in place of every chapter's file.
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

- every `concept`, `prereq`, `exercise`, `type`, `section`, `symbol` and
  `kind` reference resolves to a row, a form's `section` among them;
- every `anchor` (of a variables row or a form), `span`, `cite` and
  `place.after` is an `id` in the section's `text.html`;
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
- every built concept has a `statement` and exactly one coverage row that
  introduces it;
- `concept_prereqs` closes no loop: the concept map is a DAG (rule 6), and
  a loop is an error that names it, `a → b → c → a`;
- every variables row names a concept (a warning until
  `UNLINKED_ROWS_ARE_ERRORS` is set, then an error);
- no two forms of the book share an id, and no two concepts a name; two
  concepts may share a glossary word, since the book glosses
  some words twice ("power" of a force and of a lens) and the reader's place
  says which is meant;
- every `draws` entry is a declared type, and so is every `type` of a
  concept or a variables row; an override equal to the type the row
  inherits is a warning, so is a `null` on a row that inherits no type,
  and so is any `type` stored on a symbol, which belongs on its variables
  rows;
- every `data-type` in `text.html` or the lead is a declared type;
- every `referents` id is unique in its section, every entry of its
  `figures` is a figure row of the section, and every figure whose block
  of `figures.js` calls `F.ref` on it, with a string or a string joined to
  something (`'path-' + k`), is listed; every `data-ref` in `text.html` or the lead names a row
  (each id of a span that lists several), and a row no span names is a
  warning; a section with more than thirty-six referents is a warning;
- a variables row's `ref` names a referent of its own section, and its
  symbol has a subscript to colour (a warning otherwise);
- every section names its chapter and has a lead (a lead over 80 words
  is a warning), and its text keeps off
  the id `section-summary`, which the build gives the summary block it
  appends after the last span;
- every introduction or summary page is named by an `intro` or `summary`
  record of the chapter or the book that keeps it, names that chapter (or
  none, for the book's own), and carries none of a section's apparatus:
  its lead, objectives, summary, exercises lead and notes, coverage,
  exercises and exercise concepts are empty;
- no chapter table anchors into an introduction or summary page;
- every `sheets` row names a file that is there and parses, holds the kind
  the row promised and calls itself by the row's id; a title that disagrees
  with the row is a warning, and so is an element that names a section the
  book does not build, since the sections are computed by a tool from what
  has been built;
  and, in a `table` sheet, every table has an id of its own, no two columns of
  one table share an id, and every row is as wide as the columns. A cell of a
  numeric column that carries a digit and is not a number — the book prints
  "0.9999720 (density maximum)" — is a warning, since the page simply leaves
  that row out of the column's order, and a cell with no digit at all is the
  book's em dash for a value nobody has measured and is not reported.

The same checks run in `npm test` against the real content, so a content
edit that breaks a reference fails the suite, not only the build.

## Documentation

`npm run docs:content` walks the schema and writes `content-format.md`:
one section per file, one table per table, one row per field with its
type, whether it is required, and its description. The file is generated
and not edited by hand; the description lives on the field in the schema.
