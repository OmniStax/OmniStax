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
order).

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

Scalars: `id`, `dir`, `title`, `intro_module`.

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

- `figures`: `{ id, kind, number?, originals?, original_caption?, draws }`.
  `kind` is `demo`, `figure` (a faithful copy that serves exercises) or
  `photo`. `draws` lists the types the figure colours, and the page's
  `binds` is the union of them, so `binds` is no longer written down.
  The `<figure>` element in `text.html` still carries the same facts as
  `data-*` attributes for the browser; the validator checks that the two
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

## Validation

`npm run check:content` parses every file strictly and then checks
references:

- every `concept`, `prereq`, `exercise`, `type`, `section`, `eq` and
  `kind` reference resolves to a row;
- every `anchor`, `span`, `cite` and `place.after` is an `id` in the
  section's `text.html`;
- every `figures.id` is a `<figure id>` in `text.html` and every
  `<figure data-figure>` matches the row's `number`;
- every `source_id` occurs in the `source.md` of `source_section` where the
  row names one and of the section itself where it does not, and a
  `source_section` names a section the app has built;
- every built concept has `why` and `evidence` and at least one coverage
  row that introduces it;
- every `draws` entry is a declared type.

The same checks run in `npm test` against the real content, so a content
edit that breaks a reference fails the suite, not only the build.

## Documentation

`npm run docs:content` walks the schema and writes `content-format.md`:
one section per file, one table per table, one row per field with its
type, whether it is required, and its description. The file is generated
and not edited by hand; the description lives on the field in the schema.
