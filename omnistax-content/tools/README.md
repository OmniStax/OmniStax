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
| `find <book> <text>` | where a word lives: ids, titles, symbols, concepts, glossary terms, captions, prompts |
| `check <book> [--section N.M]` | the app's checker, filtered to the section if one is named |
| `ids <book> <section>` | every id of the section's `text.html`, which an anchor, span, cite or place may name |

```
ost books
ost show chemistry-2e                       # types, counts, chapters and what is built, sheets
ost show chemistry-2e 1                     # the sections, built or not, with their counts
ost show chemistry-2e 1.4                   # lead, figures, concepts by verb, exercises by kind, notes
ost rows chemistry-2e concepts --where section=1.4
ost rows chemistry-2e coverage --section 1.4 --where verb=introduces
ost rows chemistry-2e glossary --chapter 1 --where term~densit --fields term,definition
ost rows college-physics-2e equations --chapter 16 --json
ost find college-physics-2e hooke
ost check chemistry-2e --section 1.4
ost ids chemistry-2e 1.4
```

`rows` takes any table of the three files:

- `book.json`: `types`, `symbols`, `exercise_kinds`, `concepts`,
  `concept_prereqs`, `sheets`
- `chapter.json`: `sections`, `variables`, `equations`, `glossary`
- `section.json`: `figures`, `coverage`, `exercises`, `exercise_concepts`

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
| `set <book> <table> <id> --section … '<json>'` | merge fields into the row with that id (`--replace` to replace the whole row) |
| `del <book> <table> <id> --section …` | take one row away |

```
ost add chemistry-2e coverage --section 1.4 \
  '{"span": "density", "concept": "volume", "verb": "uses"}'
ost set chemistry-2e figures sim-density --section 1.4 '{"number": "1.26"}'
ost del chemistry-2e coverage density/volume/uses --section 1.4
ost add chemistry-2e concepts --chapter 1 \
  '{"id": "unit-conversion", "kind": "skill", "section": "1.4", "name": "Converting units"}'
```

A row is named by its key fields joined with `/`: `figures`, `exercises`,
`equations`, `sections`, `types` and `concepts` by their `id` alone, `symbols`
by `sym`, `coverage` by `span/concept/verb`, `exercise_concepts` by
`exercise/concept`, `glossary` by `section/term`, `variables` by `section/sym`,
`concept_prereqs` by `concept/prereq`.

What a write does, in order:

1. **Validates the row** against the table's shape: no unknown field, every
   required field there, every value of the right JSON kind, and every
   enumerated field one of its words (a figure `kind` is `sim`, `figure` or
   `photo`, a coverage `verb` one of `introduces`, `uses`, `reinforces`, a
   `bloom` one of the six levels). `add` refuses a row whose key is already in
   the table, `set` and `del` refuse a key that is in no row. Nothing is written
   when a row is refused.
2. **Writes the file atomically and in its own form**: the new record goes to a
   temp file beside the real one, is parsed back, and is renamed over it, so no
   reader ever sees half a record. The writer learns the form of the file it is
   rewriting — its indent, which rows it sets on one line, how it spelled each
   number — so a write of one row leaves every other byte as it was.
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

`mergebook`'s own two commands are here too, under the same lock, so that a
chapter needs one tool:

```
ost merge chemistry-2e 1     # merge ch01/book-rows.json into book.json
ost log chemistry-2e 1       # append ch01/log-pass.md to LOG.md as the next pass
```

`merge` rewrites the chapter's rows at the end of each table it touches, so a
merge of a chapter that is already merged changes no row but does move some: run
it when there is something to merge.

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
