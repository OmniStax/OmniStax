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
module, which boots the demos inside that pane. As the reader switches
tabs the address bar is updated with `replaceState` to the focused
section's canonical URL, so any link they copy is a static page. On
reload, the saved layout is restored and the other tabs' fragments are
fetched when first activated.

## How the build does it

1. **Shared assets are separate files.** KaTeX, three.js, the shell CSS
   and JS, and the figure primitives (`figlib.js`) are served from
   `assets/` with long cache lifetimes. A section page costs its own HTML
   plus cached shared assets.
2. **Figures are scoped to a root.** Each section's `figures.js` registers
   `OMNIA_FIGURES['<sec>'] = function (root, F) {...}` and finds its
   canvases inside `root`, so two sections can share one DOM.
3. **Chapter-level data.** The concept map, formula sheet and definitions
   are per chapter and grow across sections. Element ids are qualified by
   section at build time (`2.1-distance`, `2.1-ex-p1`), and the views
   scope to the focused section, showing other sections' nodes only as
   prerequisites.
4. **Book manifest.** `book.json` lists chapters, sections, titles,
   fragment URLs and figure module URLs. The "+" on each tab strip lists
   it, which is how a reader picks what to load into that group.
5. **Pre-rendered math.** The Python build pipes each article through
   `tools/prerender_math.js`, which runs KaTeX in Node with the shared
   colour macros.

## Stack

The build is `tools/build_site.py` plus the Node step for math. If the
site outgrows it, Astro with static output is the fit: one route per
section from a content collection, zero client JS by default, per-route
dynamic imports for figure modules, canonical and sitemap handled, and no
component model forced on the figures, which stay plain canvas code.

## What stays dynamic on purpose

Layout state, the pinned concept, exercise input, notes and highlights.
The first three are per browser. Notes and, later, comments need either a
backend or a sync service, which is a separate decision and does not
affect static delivery of the content.

## Limits

Loading another section into a tab needs the site served over http. A
single page still works from `file://`.
