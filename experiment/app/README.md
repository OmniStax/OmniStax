# Omnia app

Astro builds one static page per textbook section; a Svelte 5 shell mounts on
top and composes sections, views and exercises into a VS Code-like layout.

```
npm install
npm run dev          # http://localhost:4321, hot reload for components and for content edits
npm run build        # dist/, one directory per section
npm test             # pure modules: layout model, answer checking
npm run check        # astro check (TypeScript + Svelte)
python3 tests/e2e.py # browser scenarios against a served dist/ (Playwright for Python)
```

Serve `dist/` over http (`python3 -m http.server -d dist 8080`). Loading a
second section into a tab fetches its fragment, so `file://` is not enough.

## Configuration

`omnia.config.ts` is the only place user-settable values live, grouped by
concern and read from the environment with defaults:

| Section | Key | Env | Default |
|---|---|---|---|
| content | root | `OMNIA_CONTENT_DIR` | `..` (the experiment directory) |
| content | bookId | `OMNIA_BOOK` | `college-physics-2e` |
| site | baseUrl | `OMNIA_BASE_URL` | `https://omnia.local` |
| build | threeUrl | `OMNIA_THREE_URL` | `/vendor/three.min.js` |

## Layout of the source

```
src/lib/content     schema.ts (DTOs, zod), load.ts (disk → DTOs, math prerendered), fragment.ts (section HTML), attribution.ts (the credit, one wording), paths.ts (routes)
src/lib/types       ids.ts: branded ids, the ItemId ADT and its key/parse pair
src/lib/layout      model.ts (pure Layout operations), store.svelte.ts (live value + persistence), drag.svelte.ts (actions)
src/lib/sections    registry (loaded sections, DOM instances, fetch), nav (find/reveal/jump), concepts (pin), spy (scroll), focus, dag
src/lib/settings    colour coding, theme, animations, exercise mode
src/lib/exercises   check.ts: pure answer checking
src/lib/fig         figlib.ts: math, palette, animation loop with per-figure transport, drawing primitives (window.FIG for section scripts)
src/lib/math        prerender.ts: KaTeX at build time
src/components      Shell, Rail, Sidebar, ViewBox, DocGroup, TabStrip, Pane, Picker, Settings
src/components/views      View dispatcher, ConceptMap, Contents, Formulas, Definitions, Notes
src/components/exercises  ExerciseList, ExerciseCard, NumberAnswer, MultiAnswer, ChoiceAnswer
src/components/actions    adopt (move a DOM node into a component), math (render $…$)
src/layouts/Page.astro    head, metadata, colour tokens from the book, the static pool, the shell island
src/pages                 [book]/[chapter]/[section]/{index.astro,doc.html.ts,figures.js.ts}, chapter json, book.json
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
- Book-specific values (colour set, macros, symbol table, exercise kind labels)
  come from `book.json` through the manifest. The shell has no physics in it.
- Attribution is generated, never written by hand: `attribution.ts` builds the
  footer of every article and the citation from `book.json` and a section's
  `notes`.
- Section figure modules are plain scripts against `window.FIG`; their contract
  is in `docs/claude/prompts/interactive-figures.md`.
