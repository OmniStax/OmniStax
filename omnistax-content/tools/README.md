# `ost`, the content command

A book is three kinds of file and every array field of each is a table of flat
rows: `book.json`, a `chapter.json` per chapter, a `section.json` per section
([content-tables.md](../../docs/content-tables.md) says why, and
[content-format.md](../../docs/content-format.md) says what every field is).
`ost` reads those tables a question at a time and writes them a row at a time,
validating the row before it lands and running the app's own checker after.

    python3 omnistax-content/tools/ost.py <command> ...

It runs from anywhere. A book is named by its id (`chemistry-2e`), a chapter by
its number or its directory (`1`, `01`, `ch01`), a section by its number
(`1.4`), and a chapter's or the book's own front page by `1.intro`, `1.summary`,
`intro` or `summary`. Output is one row per line, the fields that matter,
separated by `·`; `--json` gives the rows as they sit on disk. Every command
takes `-h`. An error is one line on stderr and a non-zero exit.

## Reading

| command | what it answers |
| --- | --- |
| `books` | every book, with its id, title and chapters built |
| `show <book> [chapter] [section]` | a summary of the book, a chapter or a section |
| `rows <book> <table> [filters]` | the rows of one table |
| `find <book> <text>` | where a word lives: ids, titles, symbols, concepts and their glossary words, forms, captions, prompts |
| `meanings <book> <sym>` | every variables row of one symbol across the chapters: section, the type it wears there (its own override or its concept's), meaning, and the referent its subscript wears where it names one; run it before adding a row |
| `check <book> [--section N.M]` | the app's checker, filtered to the section if one is named |
| `ids <book> <section>` | every id of the section's `text.html`, which an anchor, span, cite or place may name |
| `marks <book> [chapter ...] [--word w,...] [--tally]` | every word the build marks with its concept's type (rule 7.4), one a line as `section · type · word · …context…`, from the app's own marker (`npm run marks` in `omnistax-web`, which takes the same arguments); the sweep reads it and wraps each everyday use `<span data-ink>`. `--word` keeps those concept words, `--tally` counts per word |

```
ost books
ost show chemistry-2e                       # types, counts, chapters and what is built, sheets
ost show chemistry-2e 1                     # the sections, built or not, with their counts
ost show chemistry-2e 1.4                   # lead, figures, concepts by verb, exercises by kind, notes
ost rows chemistry-2e concepts --where section=1.4
ost rows chemistry-2e coverage --section 1.4 --where verb=introduces
ost rows chemistry-2e concepts --chapter 1 --where terms~densit --fields id,symbol,statement
ost rows college-physics-2e forms --chapter 16 --json
ost find college-physics-2e hooke
ost meanings college-physics-2e T_c
ost check chemistry-2e --section 1.4
ost ids chemistry-2e 1.4
```

`rows` takes any table of the three files:

- `book.json`: `types`, `symbols`, `exercise_kinds`, `concepts`,
  `concept_prereqs`, `sheets`, and `forms`: every concept's forms as one
  table, each row carrying its `concept` and the `section` it is stated in
  (the concept's own where the form names none)
- `chapter.json`: `sections`, `variables`
- `section.json`: `figures`, `referents`, `coverage`, `exercises`,
  `exercise_concepts`

and these filters:

- `--where field=value`, an exact match, and `--where field~text`, a substring;
  repeat for an and.
- `--fields a,b,c`, the fields to print, in that order.
- `--section N.M` and `--chapter N` pick the file a chapter or section table
  lives in. On a book table they filter instead: `--section` keeps the rows of
  that section, `--chapter` the rows of that chapter's sections.

Nothing is read that is not needed: `rows … coverage --section 1.4` opens that
one `section.json` and neither the chapter's file nor the book's.

## Writing

| command | what it does |
| --- | --- |
| `add <book> <table> --section N.M\|--chapter N '<json>'` | write one new row |
| `set <book> <table> <id> --section … '<json>'` | merge fields into the row with that id (`--replace` to replace the whole row, `--unset field` to take one out) |
| `del <book> <table> <id> --section …` | take one row away |

```
ost add chemistry-2e coverage --section 1.4 \
  '{"span": "density", "concept": "volume", "verb": "uses"}'
ost set chemistry-2e figures sim-density --section 1.4 '{"number": "1.26"}'
ost del chemistry-2e coverage density/volume/uses --section 1.4
ost add chemistry-2e concepts --chapter 1 \
  '{"id": "unit-conversion", "kind": "skill", "section": "1.4", "name": "Converting units", "statement": "…"}'
ost add chemistry-2e forms \
  '{"concept": "density", "id": "eq-mass-from-density", "latex": "m = dV", "anchor": "1.4-density"}'
```

A field set to `null` by `set` is taken out of the row, except a `type` on a
`variables` row: there `null` is stored, and sets the row in ink whatever the
type of its concept. `--unset type` takes the override away, so the row
inherits again. An `add` refuses a `null` anywhere else. A symbol takes its
type in each section from its variables row there, so a `type` on a
`symbols` row is refused. A variables row's `ref` names a referent of its
section; the symbol's subscript then wears that referent's colour.

```
ost set college-physics-2e variables 13.4/v2_bar --chapter 13 '{"type": null}'
ost set college-physics-2e variables 13.4/v2_bar --chapter 13 --unset type '{}'
ost set college-physics-2e variables 4.7/F_x --chapter 4 '{"ref": "tug-1"}'
```

A `referents` row lists every figure that draws it in `figures`, never empty;
the old single `figure` is refused. `rows` and `show` print the list joined by
commas.

```
ost add college-physics-2e referents --section 2.4 \
  '{"id": "train", "label": "the subway train", "figures": ["sim-subway-displacement", "sim-subway-graphs"]}'
```

A row is named by its key fields joined with `/`: `figures`, `referents`,
`exercises`, `forms`, `sections`, `types` and `concepts` by their `id` alone, `symbols`
by `sym`, `coverage` by `span/concept/verb`, `exercise_concepts` by
`exercise/concept`, `variables` by `section/sym`, `concept_prereqs` by
`concept/prereq`.

What a write does, in order:

1. **Validates the row** against the table's shape: no unknown field, every
   required field there, every value of the right JSON kind, and every
   enumerated field one of its words (a figure `kind` is `sim`, `figure` or
   `photo`, a concept `kind` one of `definition`, `axiom`, `result`, `idea`,
   `skill`, a coverage `verb` one of `introduces`, `uses`, `reinforces`, a
   `bloom` one of the six levels). `add` refuses a row whose key is already in
   the table, `set` and `del` refuse a key that is in no row. Nothing is written
   when a row is refused.
2. **Writes the file atomically and in its own form**: the new record goes to a
   temp file beside the real one, is parsed back, and is renamed over it, so no
   reader ever sees half a record. The writer learns the form of the file it is
   rewriting — its indent, which rows it sets on one line, whether such a row
   has a space inside its braces, how it spelled each number — so a write of
   one row leaves every other byte as it was. A row the file breaks over lines
   by hand is the one form it cannot learn: it comes back on one line, or one
   field to a line, as most rows of its table are.
3. **Runs the app's checker** (`npm run check:content` for that book) and prints
   only the findings that name the file that changed, or `ok`. The exit is
   non-zero if one of them is an error. The row stays on disk either way: a row
   often waits on an id in `text.html` that the same pass is about to write.

### book.json is never written by hand

Several chapters are built at once and `book.json` is one file, so a write to
`types`, `symbols`, `concepts` or `concept_prereqs` goes the way `mergebook.py`
lays out: the row is staged into `<chapter>/book-rows.json` — seeded from what
the chapter already owns in `book.json`, if the staged file is not there — and
the chapter is merged under the lock. That is why those writes take `--chapter`.
`exercise_kinds` and `sheets` are `book.json` rows no chapter stages, and a
write to them is refused.

A form is a row of its concept, so a write to `forms` is staged on the
concept, in the chapter that owns the concept, wherever the form is stated,
and takes no `--chapter`. A form is added after the concept's others; one
written with `"main": true` becomes its first, the main form. A form moves to
another concept by a `del` and an `add`.

`mergebook`'s own two commands are here too, under the same lock, so that a
chapter needs one tool:

```
ost merge chemistry-2e 1     # merge ch01/book-rows.json into book.json
ost log chemistry-2e 1       # append ch01/log-pass.md to LOG.md as the next pass
```

`merge` updates the chapter's rows where they stand in each table and appends
only the rows that are new, so a merge of a chapter that is already merged
leaves `book.json` byte for byte as it was.

A symbol belongs to the chapter that merged it, and a change to it is staged
there: `ost set <book> symbols <sym> --chapter N` on a symbol another chapter
owns is refused and names that chapter. A symbol of the book's own, which no
chapter merged, is adopted by the chapter a `set` names, to give it a `macro`
and change nothing else:

```
ost set college-physics-2e symbols θ --chapter 3 '{"macro": "\\ktheta"}'
```

## The fold and the names

`migrate_forms.py` folded each book's `equations` and `glossary` rows onto
their concepts (issue #39): every equation became a form of its concept, the
main form first, every glossary word one of its `terms`, and each concept took
one `symbol` from the variables rows that name it: the one whose meaning is
the concept itself, else the one written most often. An equation id the book
used twice took its chapter's number where it came second. It writes
`book.json`, the staged `book-rows.json` of every chapter and every
`chapter.json` under the mergebook lock, and a folded book has nothing to
change.

```
python3 omnistax-content/tools/migrate_forms.py college-physics-2e --dry-run
python3 omnistax-content/tools/migrate_forms.py college-physics-2e
```

`migrate_referent_figures.py` turned each referent's `figure` into `figures`:
its old figure, then every other figure of the section whose block of
`figures.js` calls `F.ref` on it, read as the app's checker reads it
(`omnistax-web/src/lib/content/figrefs.ts` through `scripts/figure-refs.ts`),
and besides what the checker requires, the figures where an id read from a
variable (`F.ref(id)`) is a referent the figure's code names as a string. Only the
`referents` array of each `section.json` is printed again; it reports the
figures each referent gained and the ones it lists that no readable `F.ref`
draws it in. A migrated book has nothing to change.

```
python3 omnistax-content/tools/migrate_referent_figures.py college-physics-2e --dry-run
python3 omnistax-content/tools/migrate_referent_figures.py college-physics-2e
```

`apply_names.py` applies concept name decisions, one file per chapter,
`{"book", "chapter", "renames": [{"id", "from", "name", "statement"?, "formula"?}]}`:
the new name, the new statement where one is given, and a formula the old name
carried that no form states yet, as a new form (the main one of a concept that
has none). It writes nothing unless every concept still has its old name or
already the new one, and no two concepts of a book would share a name.

```
python3 omnistax-content/tools/apply_names.py names/ --dry-run
python3 omnistax-content/tools/apply_names.py names/college-physics-2e-ch01.json
```

`backfill_types.py` declares each kind on its concept and drops the overrides
that say nothing (docs/content-tables.md). A definition takes its main
symbol's type, else the one type its variables rows carry. A result takes the
type of the symbol its main form's left-hand side spells (`\text{}` and braces
aside), where that is its main symbol or, for a result with none, where one of
the concept's own variables rows is a row of that symbol; a law whose left-hand
side is another concept's quantity is left alone. An axiom, an idea or a skill
is never typed. A concept whose sources carry two types is left untyped and
listed, and so is every row that goes from ink to a colour: a row that must
stay in ink says `"type": null`. Then every type on a symbol or a variables row
equal to the one it inherits is removed, and every null where nothing would be
inherited, in `book.json`, the chapters and the staged `book-rows.json`. With
no book named it runs on every book; a second run changes nothing.

`--move-symbol-types` does one thing instead: each symbol's stored type, a
null included, is set on every variables row of the symbol that wears another,
and taken off the symbol in `book.json` and the staged `book-rows.json`. It
lists the symbols with no variables row to carry the type; those wear, in every
section, what their rows share across the book.

```
python3 omnistax-content/tools/backfill_types.py --dry-run
python3 omnistax-content/tools/backfill_types.py college-physics-2e chemistry-2e
python3 omnistax-content/tools/backfill_types.py --move-symbol-types --dry-run
```

## The checker

`check` and every write shell out to `npm run check:content` in `omnistax-web/`
with `OMNISTAX_BOOKS` set to the book. Node comes from
`/home/flober/.nvm/versions/node/v20.20.2/bin`, which is prepended to `PATH`;
set `OMNISTAX_NODE_BIN` if node lives elsewhere.

## The tests

    python3 -m unittest discover omnistax-content/tools/tests

A fixture book is copied out of Chemistry 2e into a temp directory and the
checker is mocked, so the tests read and write real rows and never touch the
books themselves.
