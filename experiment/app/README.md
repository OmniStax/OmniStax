# OmniStax app

Astro builds one static page per textbook section; a Svelte 5 shell mounts on
top and composes sections, views and exercises into a VS Code-like layout.

```
npm install
npm run dev          # http://localhost:4321, hot reload for components and for content edits
npm run build        # dist/, one directory per section
npm test             # pure modules: layout model, answer checking
npm run check        # astro check (TypeScript + Svelte)
python3 tests/e2e.py # browser scenarios against a served dist/ (Playwright for Python; a base URL may follow)
```

Serve `dist/` over http (`python3 -m http.server -d dist 8080`). Loading a
second section into a tab fetches its fragment, so `file://` is not enough.

## Configuration

`omnistax.config.ts` is the only place user-settable values live, grouped by
concern and read from the environment with defaults:

| Section | Key | Env | Default |
|---|---|---|---|
| content | root | `OMNISTAX_CONTENT_DIR` | `..` (the experiment directory) |
| content | bookId | `OMNISTAX_BOOK` | `college-physics-2e` |
| site | baseUrl | `OMNISTAX_BASE_URL` | `https://omnistax.local` |
| build | threeUrl | `OMNISTAX_THREE_URL` | `/vendor/three.min.js` |

## Layout of the source

```
src/lib/content     schema.ts (DTOs, zod), load.ts (disk → DTOs, math prerendered), fragment.ts (section HTML), attribution.ts (the credit, one wording), paths.ts (routes)
src/lib/types       ids.ts: branded ids, the ItemId ADT (a document, a view, one figure split out of a document, one exercise on its own, a standing page, or one of the reader's notes) and its key/parse pair; VIEW_KINDS and the two of them a sidebar holds
src/lib/layout      model.ts (pure Layout operations), store.svelte.ts (live value + persistence), drag.svelte.ts (actions)
src/lib/sections    registry (loaded sections, DOM instances, fetch), nav (find/reveal/jump), concepts (pin), spy (scroll), focus, scope (the level a view stands at — book, chapter or section — following or pinned), grouping (a list cut by chapter and section, inside the level or outside it), dag
src/lib/notes       anchor.ts (text anchoring, pure), paint.ts (marks on a document), store.svelte.ts (the book's highlights, persisted), go.ts (jump to a highlight), docs.svelte.ts (the reader's markdown notes)
src/lib/history     model.ts (the timeline of the reader's edits, pure), store.svelte.ts (the live stack the palette and Ctrl+Z read)
src/lib/explorer    model.ts (the reader's tree, pure), store.svelte.ts (live and persisted), edits.ts (row and document changed as one, and recorded), library.svelte.ts (the textbooks on offer)
src/lib/settings    colour coding, theme, animations, exercise mode, underlines
src/lib/exercises   check.ts: pure answer checking
src/lib/fig         figlib.ts: math, palette, animation loop with per-figure transport and time scrubber, drawing primitives (window.FIG for section scripts)
src/lib/math        prerender.ts: KaTeX at build time
src/components      Shell, Rail (left), Sidebar (left), ViewBox, DocGroup, TabStrip, Pane, Palette (commands), Browser (the book as a tree), Settings, HighlightBar, Tooltip (one for the whole shell)
src/components/views      View dispatcher (with the scope header, which the explorer does without), Explorer, ConceptMap, Formulas, Definitions, Annotations
src/components/notes      NoteTab (one note in a tab of its own)
src/components/exercises  ExerciseList, ExerciseCard, ExerciseTab (one exercise in a tab of its own), NumberAnswer, MultiAnswer, ChoiceAnswer
src/components/actions    adopt (move a DOM node into a component), math (render $…$)
src/layouts/ShellPage.astro  what every page shares: fonts, the book's colour tokens, the theme script, the static pool and the shell island, over the one item the page is
src/layouts/Page.astro    one section over ShellPage: its metadata, its canonical link and its figure scripts
src/lib/content/pages.ts  the two standing pages as HTML: the front of OmniStax and the front of the book
src/pages                 index.astro (the about page), [book]/index.astro (the book page), [book]/[chapter]/[section]/{index.astro,doc.html.ts,figures.js.ts}, about.html, book.html, chapter json, book.json, library.json
src/styles/global.css     tokens, typography, styles for adopted content (articles, demos)
```

## Conventions

- Types at boundaries: `…DTO` for what is parsed from content files, branded ids
  (`SectionId`, `GroupKey`, `SpanId`, `ConceptId`), ADTs with a `kind` or `type`
  discriminator (`ItemId`, `AnswerDTO`) and smart constructors beside them.
- The layout is an immutable value. `model.ts` has no DOM and no state; the store
  applies its functions and saves. Tests cover it.
- Documents are static HTML that keep running figures and typed answers, so they
  are adopted into panes, never re-rendered. Views and exercise cards are components.
- A figure can be split into a tab of its own: the registry builds a root holding
  just that figure's static markup and boots the section script on it; the other
  figures of the script get detached scaffolds and never draw. One exercise opens
  the same way — the `ex` kind of `ItemId`, reached from the card's own button or
  from the Open browser — but as a card the shell renders rather than adopted
  markup, so what is answered there is that card's own, as it is for a document
  cloned into a second group.
- Every page of the site is the same shell over a different item: `/` carries
  `page:about`, `/<book>/` carries `page:book`, a section page carries its text.
  That item is the shell's `own`, what `ensureOwn` keeps open, and what the
  section-scoped views fall back from when the focused tab belongs to no section.
- The shell is a rail, a sidebar and the document groups, all on the left. The
  rail stands in three sections: the explorer and the annotations at the top,
  which toggle in the sidebar; the other three in the middle of the rail, which
  are only ever tabs; and the palette and the settings at the foot. A click on
  one of the middle three opens a page of that view — an `ItemId` of kind `view`
  with an instance of its own — in a split to the right of the group being read,
  and every click opens another, so several concept maps may stand open at once.
  Each page keeps its own scope, and the rail's button lights while any page of
  that kind is open (`instancesOf`). Every rail button drags into a group all
  the same, carrying the bare key, which is the one page a sidebar can hold.
- A companion view stands at a level of the book — the whole book, one chapter or
  one section — and at that level either follows the page being read or is pinned
  to a place of its own. The bar above it is the trail to that place and the
  control that walks it, Left and Right widen and narrow it, and the palette's
  View group holds the same moves for the view the reader last touched, beside
  the commands that open each view where it belongs. A crumb's label moves the
  view to that level and the chevron beside it chooses another chapter or section,
  and choosing anything but the place the open page lies in pins the view there.
- The explorer is the reader's own tree with the book hanging in it: the two
  things they make — a note, a folder — are icons at the top right, and the
  catalogue of textbooks is a row of the tree itself, first under User and above
  the books they have taken.
- A symbol, a glossary term and an example reference wear a dotted rule that says
  a card will open on them. The rule is a setting ("Underlines"), off leaves the
  page clean and the cards still open, and inside a card nothing is underlined:
  that is where the symbol is explained, not another place to look it up.
- One fold rule for every list a view draws: what the view's level covers is shown
  grouped by chapter and by section, in the order the book sets, and everything
  outside it is folded away under a single heading. `grouping.ts` makes the cut
  and the views only render it.
- Book-specific values (colour set, macros, symbol table, exercise kind labels)
  come from `book.json` through the manifest. The shell has no physics in it.
- Undo and redo are one timeline of the reader's own edits — highlights,
  annotations, the rows and documents of the explorer — and nothing else: the
  layout, what is open and where the reader has scrolled are not edits, and a
  tab closed comes back through Reopen closed tab (Ctrl+Shift+T) instead. An
  edit knows how to take itself back and how to do itself again, and a burst
  under one coalescing key — typing an annotation, dragging an image wider —
  is one step. Where the reader is typing, Ctrl+Z is not the shell's: a field
  keeps the browser's history and the note editor CodeMirror's.
- Attribution is generated, never written by hand: `attribution.ts` builds the
  footer of every article and the citation from `book.json` and a section's
  `notes`.
- Section figure modules are plain scripts against `window.FIG`; their contract
  is in `docs/claude/prompts/interactive-figures.md`.
