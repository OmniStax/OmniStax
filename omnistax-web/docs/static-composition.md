# Static pages, dynamic composition

Readers can open any section or view into a tab, and the content is still
served statically, for SEO and speed. Content and layout are kept apart.
The content is static and pre-rendered, one URL per section. The layout is
client state that composes static fragments. Nothing needs a server.

## The split

- **Content** is built ahead of time. For every section the build emits a
  full page and a fragment. The full page is what crawlers and first
  visits get: the shell markup with that section's article already in the
  document, math pre-rendered, and the section's data inline. The fragment
  is the same article and data without the shell, for loading into a tab.
  Both come from one source, so they cannot drift.
- **Layout** is what the shell does in the browser: which tabs are open,
  which sidebars, which group is focused. It lives in localStorage and is
  never part of a canonical URL.

## What a crawler sees

One URL per section (`/college-physics-2e/ch02/2.1/`), containing the
whole section text as HTML, the title, a description taken from the
learning objectives, a canonical link, previous and next links, and
schema.org `LearningResource` metadata. The article is rendered in place
in the static markup; it is not moved into position by JS, and it is not
hidden until JS runs. Views (formulas, definitions, map) are built from
inline data, and the glossary and formula terms are in the page source.
Math is pre-rendered with KaTeX at build time so the page reads without
JS and paints without a rendering pass.

## What a reader sees

The same page, plus the shell. Opening another section in a tab fetches
its fragment, inserts it into a pane, and loads that section's figure
module, which boots the sims inside that pane. As the reader switches
tabs the address bar is updated with `replaceState` to the focused
section's canonical URL, so any link they copy is a static page. On
reload, the saved layout is restored and the other tabs' fragments are
fetched when first activated.

## How the build does it

The site is an Astro project (`omnistax-web`) with static output and a
Svelte 5 island for the shell.

1. **Routes from content.** `src/lib/content/load.ts` reads the content
   tree into DTOs. `[book]/[chapter]/[section]/index.astro` is the page;
   `doc.html.ts` and `figures.js.ts` beside it emit the fragment and the
   figure module; chapter `concepts.json` and `formulas.json` and the
   `book.json` manifest are endpoints too.
2. **Shared assets are bundled once.** KaTeX, the shell and the figure
   library ship as hashed files under `assets/`; three.js is a vendor
   script. A section page costs its own HTML plus cached shared assets.
3. **Figures are scoped to a root.** Each section's `figures.js` registers
   `OMNISTAX_FIGURES['<sec>'] = function (root, F) {...}` and finds its
   canvases inside `root`, so two sections can share one DOM.
4. **Chapter-level data.** The concept map, formula sheet and definitions
   are per chapter and grow across sections. Element ids are qualified by
   section at build time (`2.1-distance`, `2.1-ex-p1`), and the views
   scope to the focused section, showing other sections' nodes only as
   prerequisites.
5. **Book manifest.** `book.json` lists chapters, sections, titles,
   fragment URLs and figure module URLs, plus the book's colour set,
   macros, symbol table and exercise kind labels. The "+" on each tab
   strip lists its sections.
6. **Pre-rendered math.** `src/lib/math/prerender.ts` runs KaTeX at build
   time with the book's macros, so the article reads without JS.

## Stack

Astro for the pages, Svelte 5 for the shell. Astro because it does the
static, one-URL-per-section, zero-JS-by-default delivery by design. Svelte
because the shell moves live DOM between containers (a document with a
running canvas and a typed answer goes from tab to sidebar to another
group and keeps its state), and Svelte compiles to real DOM operations
with actions, so a pane can adopt an existing element in one line. Figures
stay plain canvas code against `window.FIG`.

## What stays dynamic on purpose

Layout state, the pinned concept, exercise input, notes and highlights.
The first three are per browser. Notes and, later, comments need either a
backend or a sync service, which is a separate decision and does not
affect static delivery of the content.

## Limits

The site must be served over http: asset paths are absolute and loading
another section into a tab fetches its fragment.
