# Experiment log: College Physics 2e (OpenStax)

Source: OpenStax College Physics 2e, CC BY-NC-SA 4.0 (per the source repo's
collection metadata). PDF: `college-physics-2e_-_WEB.pdf`, 1671 pages, 34
chapters. CNXML source: `osbooks-college-physics-bundle/` (full clone of
github.com/openstax/osbooks-college-physics-bundle, 882MB with media;
gitignored).
Table of contents with PDF page numbers: `toc.md`.

Workflow: inline prompts in chat, one pass at a time. Outputs go under
`ch<NN>/`. Prompts that survive get promoted to `docs/claude/prompts/`.

## 2026-09-05: orientation

- Text extraction (pymupdf) gets prose, headings, figure captions, example
  structure ("Strategy", "Solution", "Discussion"), learning objectives and
  equation numbers cleanly.
- **All equations are lost in text extraction.** They are vector outlines, not
  text and not images. Inline math like $\Delta x$ leaves a blank gap in the
  sentence; display equations leave only their number (e.g. "2.26").
- So a pass that needs math must read the rendered page image. Pages are
  rendered at 110 dpi under `ch02/pages/` (gitignored, regenerate with
  pymupdf). Prose-only passes can use `ch02/text.txt`.
- Alternative source worth remembering: OpenStax publishes the same book as
  HTML/CNXML with MathML. Would give equations for free, but the milestone
  goal is a PDF pipeline, so first try the PDF-only path and see how bad it is.
- Figures are mostly raster images (66 in chapter 2), extractable per page.
- Starting chapter: **Chapter 2, Kinematics** (PDF pages 57 to 118). Has
  definitions, a dense equation section (2.5), worked examples, graphs
  (2.8), PhET simulation callouts (obvious widget candidates), conceptual
  questions and problems with an answer key at PDF page 1607.

## 2026-09-05: switched to the CNXML source

The PDF is a rendering of CNXML files that OpenStax keeps on GitHub. Each
section is one module (`osbooks-college-physics-bundle/modules/m*/index.cnxml`), and
`collections/college-physics-2e.collection.xml` gives chapter order. One
module (2.4 Acceleration, m42100) already has, as explicit tags: 15
`<equation>` in MathML, 9 `<term>`, 4 `<definition>` with `<meaning>`, 7
`<example>` with Strategy/Solution/Discussion, 12 `<exercise>` (typed, e.g.
`check-understanding`), 13 `<figure>` with alt text and media path, 30
`<link>` cross references. This removes most of the extraction problem:
equations, definitions and exercises are already structured. The PDF stays
useful as the visual reference for layout and figures.

Consequence for the milestone: the "pdf -> Omnia" pipeline is really
"source -> Omnia", with PDF as the fallback when no structured source exists.
LibreTexts also has an HTML/XML export, so check that before doing PDF work.

## Book structure worth knowing (per chapter)

Chapter outline, intro, numbered sections (each with learning objectives,
boxed strategies, numbered Examples with Strategy/Solution/Discussion,
"Check Your Understanding", PhET callouts), Glossary, Section Summary,
Conceptual Questions, Problems & Exercises. Answer key at the back covers
odd-numbered problems.

## Passes

(append one entry per pass: prompt used, what came out, what to change)

### Pass 1 (2026-09-05): section 2.5 end to end, from CNXML

Prompt (user, paraphrased): Ciechanowski-style single-page explainer for
section 2.5 with slider demos, 3D where appropriate, strict color coding of
variables across prose/equations/figures with a toggle, exercises and a
concept DAG extracted, DAG as a left floater doubling as ToC, formula sheet
and definitions as a right floater.

Outputs in `ch02/2.5/`:
- `source.md`: CNXML converted to markdown+LaTeX by `tools/cnxml2md.py`.
- `concepts.json`: 9 concepts, 3 external prerequisites, prereq edges, a
  "why" per concept, anchor into the page.
- `formulas.json`: 9 variables with color role and unit, 6 equations.
- `exercises.json`: 23 book exercises + 3 AI-generated equation-relationship
  questions. Each has Bloom level, concept set, answer spec (number with 2%
  tolerance, choice, or open), `generated_by` on answers. Remember/Understand
  items carry a `cite` anchor.
- `template.html` + `app.js` -> `tools/build_explainer.py` -> `index.html`.
  Open it locally; KaTeX, three.js and fonts load from CDNs.

What worked:
- CNXML is rich enough that "extraction" of equations, examples and
  exercises is parsing, not AI. AI work is concept DAG, Bloom tags, concept
  tags, "why", equation questions, and deciding which figures become demos.
- Color coding via KaTeX `\htmlClass` macros (`\kx`, `\kvo`, ...) plus CSS
  tokens. One toggle class on `<html>` switches prose, equations, sliders
  and canvas drawings. The macro set is the color standard in code form.
- Replacing the book's sketch figures with demos worked for every figure in
  this section; the photos carried no physics and were dropped.
- Verbatim prose + sans-serif Omnia additions keeps the tone rule honest and
  visible.

What hurt / to change:
- Book answers only cover odd problems. AI-computed answers had to be
  marked; a checker pass (independent recomputation) is needed before these
  reach learners.
- Bloom tagging is almost all "Apply" for problem sets. The interesting
  Remember/Understand material has to be generated (equation-relationship
  questions), which random.md already anticipated.
- The concept DAG for one section is small (9 nodes). Value will show at
  chapter scale, where a node like "displacement" is shared.
- The DAG nodes labelled by equation read better than labelled by name.
- Widgets were hand-coded (~600 lines of JS for 7 demos). A declarative
  spec should cover: number line, v-t / x-t plot, animated object on a
  strip with arrows, root-finding plot, 3D road scene. Archetypes look
  viable; the 3D scene is the one that resists a spec.
- Decision: local HTML only, no Claude artifacts. They add a share URL and a
  sandbox that blocks CDN stylesheets, nothing Omnia needs.
- No glossary in this module; definitions came from the notation paragraph.

Next: run the same passes on 2.4 (has `<definition>` tags and 12 exercises
of mixed type) to see what generalizes, then draft `docs/content-format.md`.

### Pass 2 (2026-09-06): concept layer refactor on 2.5

Prompted by: the pass-1 DAG was header-shaped ("Putting Equations
Together" was a node). Headers organize information; concepts organize
knowledge. They are different layers.

Changes:
- `concepts.json` rewritten. Nodes are testable units, justified by a
  definition or by exercises (`evidence` field). 11 headers became 8 nodes:
  1 idea (constant-acceleration model), 5 results (the equations, linked to
  the formula sheet by `eq`), 2 skills (choose the equation; interpret the
  solution physically). "Notation" dropped: nothing tests it, it lives under
  Definitions. Prerequisite edges unchanged in spirit; the four big
  equations now hang off the one idea rather than sitting beside it.
- `coverage` table: every section/example span lists what it introduces,
  uses, reinforces. Spans can map to nothing (notation, summary header).
- Page: Concept map and Contents are separate blocks in the left floater.
  Map rows are derived from kind and depth, not hand-listed. Clicking a
  node pins it: introducing span gets an accent bar, using spans a muted
  bar, and the exercises that test it light up. Exercise concept chips are
  clickable and pin the same way. Scroll-spy drives the TOC from the
  section and the map from the innermost span's coverage.
- Exercises retagged to canonical ids; p10 gained `physical-solution`
  because its answer key says "(b) does not make sense".

What it showed:
- Extracting from exercises first is the right order. Three of the old
  nodes had no exercise behind them; the two skills that survived are the
  ones the book actually tests.
- `kind` is metadata, not structure. The map layout uses it, nothing else
  should yet.
- "Tested by N exercises" per node is a cheap, honest signal of what the
  book cares about: v-from-at 8, v-squared 8, const-a 3, physical-solution 2.

Next: same two passes on 2.4, then see whether chapter-level extraction
(all nine 2.x modules together) produces the same nodes for 2.5.

### Pass 3 (2026-09-06): figure restyle on 2.5

Prompted by: the pass-1 demos were chart-first, small and thin. The user
pointed at an earlier photoelectron-spectroscopy explainer whose figures
read better. Adopted its idiom (see RULES.md, "Figure style"): fixed
1400-unit logical canvas, big type and strokes, scene above graph, ambient
looping animation with a headline readout, a global pause pill, no card
chrome. Per-demo Play buttons and the `animator` helper are gone; one rAF
loop drives every visible figure. Kept: colour coding, dark mode, KaTeX
readouts, the 3D braking scene (now with a distance-bar canvas beneath it,
which is the reading the equation is actually about).

Cost: about 450 lines of demo code rewritten; the primitives (`strip`,
`scale`, `axes`, `nice`, `hbracket`, `vbracket`, `runner`, `car`, `plane`,
`dragster`) are the start of the declarative widget vocabulary the todo
asks for.

Promoted after pass 3: `docs/claude/prompts/interactive-figures.md` (the figure prompt) and `docs/andrew/pipeline-rules.md` (pipeline decisions 1 to 7).

## Pass 4: shell layout (2026-09-06)

The page is now an app shell instead of a three-column article: activity
rails on both edges, sidebars of draggable view boxes, and a document area
with one or two tabbed groups. Text and the problem set are separate
documents opened as tabs; concept map, contents, formulas and definitions
are views that can sit in either sidebar or open as a tab. Settings moved
to a gear popover. Layout is saved in localStorage. Design note:
`docs/claude/shell-layout.md`.

Checks: no console errors; scroll-spy follows the focused group; a concept
chip in the Exercises tab pins the node and reveals the map; a contents
link switches back to the Text tab; split, drag to tab strip, and the
narrow-screen overlay flow all work in headless Chromium.

Left for later: comments (needs a decoration layer), keyboard shortcuts
for group focus, the same document in two groups.

## Pass 5: static site build, chapter-level data (2026-09-06)

The single-page build is replaced by `tools/build_site.py`, which emits
`site/`: per section a full page (`index.html`) and a fragment
(`doc.html`) plus its `figures.js`; per chapter `concepts.json` and
`formulas.json`; a book manifest; and shared assets (shell.css, shell.js,
figlib.js, KaTeX, three.js). Math is pre-rendered at build time with
KaTeX in Node (`tools/prerender_math.js`), so the article reads without
JS and the page paints without a rendering pass. Element ids are
qualified by section at build time (`2.5-notation`), so two sections can
share one DOM. Figures boot against a root element
(`OMNIA_FIGURES['2.5'](root, FIG)`); the drawing layer lives in
`shell/figlib.js`. The shell fetches other sections' fragments on demand,
updates the address bar to the focused section's canonical URL, and
restores saved tabs lazily. The old files are in `_old/2.5-single-page/`.

Per the confirmed config, 2.5 lost its three generated relationship
questions and nine problems whose answers were AI-computed; 14 exercises
remain, all with book answers or AI-marked suggested approaches.

Design note: `docs/claude/static-composition.md`.

## Pass 6: section 2.1 Displacement (2026-09-06)

First section built by the agent loop: exploration → config list → plan
→ build. Plan in `ch02/2.1/plan.md`. Five idea nodes (reference frame,
position, displacement, distance, distance traveled); no results or
skills. Three figures: displacement on a line (the professor, with the
passenger as a slider setting), path length vs displacement (the cyclist
from Check Your Understanding, with an odometer), and the book's four
paths for the problems, traced in turn. Seven exercises: the CYU inline
with three parts on one card, one AP item, three conceptual questions
with AI-marked suggested approaches, and problems 1 and 3. Problems 2 and
4 have no keyed answer and were left out.

Converter fix: figures nested inside a paragraph were being flattened to
their caption text; `cnxml2md.py` now emits them as blocks.

Checks: no console errors on either page over http and on 2.1 over
file://; opening 2.5 from the 2.1 page boots its eight figures and moves
the URL; the 2.5 map shows displacement as an other-section node and
clicking it focuses the 2.1 group; split and drag work across sections.

## Pass 7: Astro and Svelte port (2026-09-07)

The DOM shell (one 585-line script) was rewritten as an Astro project with a
Svelte 5 island, in `experiment/app`. The old shell, build script and output
are in `_old/dom-shell/`.

What changed in shape:
- Content is parsed into DTOs with zod at one boundary (`content/schema.ts`);
  the build reads the same `ch02/` sources as before.
- The layout is an immutable value with pure operations (`layout/model.ts`),
  covered by unit tests; the store applies and persists.
- Ids are branded; a tab's content is an ADT (`ItemId`); answers are an ADT
  (`AnswerDTO`) and each type has its own component.
- Book-specific values (colour set, macros, symbols, exercise kinds) moved from
  the shell into `book.json`.
- The figure library is a typed ES module; section figures are unchanged.

Verified in headless Chromium against the served build: default layout, split
right duplicating the active document, closing one copy keeping the other's
typed answer, opening 2.5 from the "+" into the second group with its figures,
the 2.5 map's displacement node pinning and jumping into the 2.1 copy, contents
links and scroll spy, exercise modes, per-figure transport, the three settings
switches, persistence across reload, and the narrow-screen overlay. No console
errors. `astro check` is clean.


## Pass 8: attribution (2026-09-07)

College Physics 2e is CC BY-NC-SA 4.0 (verified against openstax.org; the
book is not plain CC BY). OpenStax asks digital reuse to carry "Access for
free at <page url>" on every page view, and CC 4.0 asks for credit, the
licence, and a note of changes wherever the work is shared. A section is
what gets linked to, so every article gets it.

- `book.json` gained `authors`, `source_url` and `license_url`.
- `content/attribution.ts` is the one place the credit is worded: the
  section's source URL, the footer HTML for both articles (text and
  exercises), and a plain-text citation for metadata. The footer is the
  credit, the "Access for free at" line, a link to the long form, and the
  section's `notes` (what was left out).
- Section pages carry `<link rel="license">` and JSON-LD with the authors,
  `isBasedOn` the source page, the licence URL and `creditText`.
- `/<book>/attribution/` is the long form: source, what Omnia changes,
  the licence of the adapted pages (the same, by ShareAlike), and each built
  section beside its original with its notes.
- Root `LICENSE.md` separates adapted content (CC BY-NC-SA 4.0) from the
  software (licence not chosen yet).
- The credited figures in 2.1 and 2.5 are all photographs, which are
  dropped, so nothing third-party is carried over; the rule for when one is
  went into RULES.md.

Checked: 20 unit tests, `astro check` clean, build, and a headless pass in
light and dark with no console errors.
