# No book lock

Any section of any book can stand in any pane beside any other. Nothing in the
runtime has a "current book" that the rest resolves against. Every reference to
a book's thing carries its book.

Book content stays book-local on disk: ids inside a book's JSON and fragments
(section "15.4", span "15.4-carnot-cycle", chapter "ch15", type "energy", macro
`\kT`) mean that book's thing. A reference gains its book the moment it leaves
the book's own files: an item key, a link, a DOM lookup, a stored key, a card.

## Ids (`src/lib/types/ids.ts`)

- `SectionRef = { book: BookId; section: SectionId }`; `SecKey` branded
  `"<book>/<section>"`, `secKey(ref)`, `parseSecKey(k)`, `sameSection(a, b)`.
- `SpanRef = { book: BookId; span: SpanId }`. `qualifiedId`, `exerciseDomId`,
  `sectionOfSpan` stay book-local (they build and read DOM ids).
- `ItemId` doc, fig, ex and sheet gain `book`. `page` 'book' gains `book`;
  'about' has none. Keys:
  - `doc:<book>/<sec>/text`, `fig:<book>/<sec>/<fig>`, `ex:<book>/<sec>/<ex>`
  - `sheet:<book>/<sheet>`, `page:book/<book>`, `page:about`
  - `scratch:<book>/<sec>/<ex>` (unchanged)
- `sectionOfItem(id): SectionRef | null`.
- Book ids are `[a-z0-9-]+`, which keeps `/` free as the separator.

## Registry (`src/lib/sections/registry.svelte.ts`)

- Holds many books: `books: Record<BookId, BookManifest>` (full manifests).
  `ensureBook(book): Promise<BookManifest | null>` fetches `/<book>/book.json`
  once; null when there is no such book. `manifest(book)`.
- Sections keyed by `SecKey`; chapters keyed `"<book>/<dir>"`.
- `entry(ref)`, `chapterOf(ref)`, `state(ref)`, `load(ref)`, `title(id)`,
  `chapter(book, dir)`, `loadChapter(book, dir)`, `loadChapters(book, dirs)`,
  `concepts(book)`, `concept(book, id)`, `coverage(book)`, `pageFor(page)`,
  `figureRoot(ref, fig)`, `instanceFor(...)`.
- `SectionStatus` gains `'missing'`: the book does not exist, or has no such
  page, or the page is not built. `load` records it; it never rejects silently
  into a pane that waits forever.
- No `switchTo`. Nothing is dropped when the reader moves between books.
- Figure scripts register under `OMNISTAX_FIGURES["<book>/<section>"]` (the
  build rewrites the key); `bootFigures` looks up by `SecKey` and hands the
  script `figFor(book)`.
- `onBook(cb)`: called once per manifest when it first arrives. The shell uses
  it to register the book's figure config and colour rules.

## DOM

- Every article carries `data-book` beside `data-sec` and `data-chapter`; so
  does its `script[data-section]`. Any root the app builds to show book content
  (figure root, exercise card root, hover card, view rows, note embeds) carries
  `data-book` too, and `data-chapter`/`data-sec` where it did before.
- `findEl(book, id)` searches only inside `[data-book="<book>"]`. Same-numbered
  spans of two books never answer for each other.
- `goSpan(ref: SpanRef)`, `openDoc(ref: SectionRef, doc, group?)`.

## Per-book rendering

- **Macros and symbols** (`src/lib/fig/figlib.ts`): `registerFigBook(manifest)`
  and `figFor(book): Fig`, a Fig whose `tex`/`renderMath`/palette use that
  book's macros, symbols and types. Anything that sets a book's TeX goes
  through `figFor(book)`, never a global.
- **Colours**: `/<book>/colours.css` scopes every rule under
  `[data-book="<book>"]`: variables on `[data-book=b]`, chapter tier on
  `[data-book=b][data-chapter=c]`, section tier on `[data-book=b][data-sec=s]`,
  `.kv-<type>` as `[data-book=b] .kv-<type>`. One `<link>` per book in use,
  added by `colours.ensureBook(manifest)`. Reader choices stay stored per book
  (`omnistax-colours-<book>`) and apply through one `<style>` per book with
  the same scoping. The Colours view edits one book, the focused one by
  default. Nothing is coloured on `:root` or `<html>` any more.
- The palette cache in figlib keys by book, chapter and section and reads the
  variables off the figure's own scope.

## Focus and the shell

- `focus.book`: the book of the focused tab, else the boot book. It is only a
  default (which book a new Concept map, Formulas or Colours view opens on).
  Nothing resolves a reference against it.
- Clicking a link to another book's page opens it as a tab in that group.
  Nothing swaps the shell. The book crumb and the explorer open a book's last
  page, else its first built page, as a tab.
- The address bar and `document.title` follow the focused tab, whatever its
  book. `rememberPage(book)` per book as now.
- Views scoped to a book, chapter or section carry the book in their `Target`.

## Stores

- Layout `omnistax-layout-v6`: book-qualified keys. v5 is migrated once by
  qualifying doc, fig, ex and sheet keys with the boot book. An unknown tab no
  longer resets the layout; it stays, and its pane says what is missing.
- Notes: one in-memory store over every book. `Note` gains `book`. Storage
  stays per book (`omnistax-notes-<book>`); every such key is read at start.
- Fold and hidden figures: keys `<book>|<span>`; old keys take the boot book.
- Scope: `Target` gains `book`; old pins take the boot book.
- Practice already carries `{book, section, ex}`. The books cache loses its
  "home" special case: any book loads the same way.

## Links (`src/lib/notes/md/links.ts`)

- Every section-bearing target has `book?: BookId`, written as a prefix on
  the section:
  - `[[<book>/16.4]]`
  - `[[eq:<book>/16.1:<key>]]`, and likewise `def:`, `sym:`, `concept:`
  - `[[fig:<book>/7.intro:<id>]]`
  - `[[ex:<book>/15.4:p3]]`
- Everything that writes a link (the picker, dragouts, embeds, chat) always
  writes the book.
- A link written without one resolves against the book of the note that holds
  it, when that note belongs to a book, else `focus.book`.

## Missing pages

- The pane for a `'missing'` section says so in one line: "College Physics 2e
  has no section 145.6." or "There is no book called x."
- `src/pages/404.astro` boots the shell on any unknown address. The shell reads
  `/<book>/<chapter>/<section>/` and opens that section, which lands on the
  missing state. `wrangler.jsonc` serves the 404 page for unknown addresses.

## Build order

1. Seams, in parallel: runtime core (ids, registry, nav, pane, shell, layout,
   link grammar) and build plus rendering (fragment attributes, figure keys,
   colour scoping, `figFor`, 404). Call sites the core does not own are fixed
   mechanically through `assumedBook()` in `focus.svelte.ts`, which phase 2
   removes.
2. Consumers, in parallel: hover and views; notes, chat, drawer and picker;
   exercises, practice, search and explorer; stores and colour UI.
   `assumedBook()` is deleted at the end.
