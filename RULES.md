# Rules for transforming a textbook

Each item is a decision, numbered so that a book's rules, a chapter's config, a plan and a brief can cite it. These hold for every book; what is true of one book goes in that book's `RULES.md` (item 18). The long form with history and examples is `docs/rationale/RULES.md`, kept for people.

## Where things live

```
omnistax-content/<Book Title>/   one folder per book, named by the title in its book.json
  book.json                      the book: identity, licence, types, symbols, concepts
  RULES.md                       the book's own rules (item 18)
  LOG.md                         the running log of passes over this book
  tools/                         the scripts written for this book's source format
  media/                         the book's figures and photographs, served at /media/
  intro/                         the book's own introduction or preface, where it prints one (item 21)
  summary/                       the book's own closing summary, where it prints one (item 21)
  <chapter>/                     one folder per chapter
    chapter.json                 sections, variables, equations, glossary
    config.md                    the agreed defaults for the chapter (item 10)
    exploration.md               what the exploration phase found (item 1)
    intro/                       the chapter's own introduction, where the book prints one (item 21)
    summary/                     the chapter's own summary or conclusion, where the book prints one (item 21)
    <section>/                   one folder per section
      source.md                  the section as converted from the book's source
      plan.md                    the plan that was reviewed before building (item 5)
      section.json               the section: lead, objectives, figures, coverage, exercises
      text.html                  the article body
      figures.js                 the section's interactive figures
omnistax-web/                    the app that builds every book into a site
docs/                            designs, prompts and the generated content reference
```

## 1. Start with a textbook exploration phase

Before transforming anything, read the book and report in `exploration.md` its organizing units and their granularity, its module ids, the collection order, the licence, and where exercises and answer keys sit.

## 2. Build one section at a time, one page per section

The working format is book → chapters → sections → concepts; one section is one page. After each section, stop with an interrupting message and wait for feedback before the next, unless the chapter's `config.md` records that the stop is replaced by a plan file left for review.

## 3. Decide the sub-concepts within a section

Propose the section's sub-concept headers, one independent block per idea, neither over- nor under-divided. Not every section needs dividing.

## 4. Pull meta-information out of the running text

Learning objectives, key equations, key terms, summaries and similar apparatus go to the tables and are removed from the text; the app shows them elsewhere. A section's own introduction and summary are the exception (item 21).

## 5. Report the plan per section before building

Write `plan.md` before building: the sub-concepts, the concept nodes and where each is introduced, one line per figure in the format of `docs/prompts/interactive-figures.md`, every photograph with keep or drop and why, exercises by kind, tables, and the types the page binds. The plan is reviewed before the page is written, or left for review when `config.md` says so. A section build owns its `plan.md`, `text.html`, `figures.js`, `section.json` and the media it copies, nothing at chapter or book level; what it needs changed there goes in `plan.md` under `## Wanted at chapter level`, one line per item with the exact id, and the chapter pass applies it.

## 6. Keep the concepts in an organized data format

Concepts are written to the tables as sections progress, never inferred from headers afterwards; later sections point back to earlier concept ids. A concept row holds only name, kind, prerequisite edges, why and evidence.

## 7. Colour is a function of type

A colour belongs to a type, and a type is a kind of physical quantity. A symbol takes its type's colour; a derived quantity is another type and another colour; a variant of one type (initial, average, maximum) keeps the hue and differs by decoration (hollow, dashed, subscript). A drawn thing takes the colour of its result type. Nothing is coerced into a neighbouring type to save a colour.

The book declares its types in order and says nothing about hues; the app dresses them from a scheme and the reader may override. A page colours only the types it binds, the ones its figures draw, its sliders carry or its readouts state; every other symbol on that page is ink, and the plan lists what the page binds.

Four families of colour: type hues from the scheme, bound per page; the element palette `F.el(symbol)` for every atom, ion, molecule or particle with an identity, always, so no gas box draws an anonymous grey dot; a colour that is the physical fact (a photon's wavelength, a flame, a solution) drawn as the fact; and the categorical palette `F.cat(i)` for instances that must be told apart and carry no type or element, never in a hue the page has bound.

Test for one figure: everything in it with an identity is coloured, or the whole figure is ink. Ink is for the frame and for untyped scalars. A phase is told by packing, not colour; a temperature by its type hue on symbol and slider, never as a tint on a body. Colour-off drops the type hues and keeps element, physical and categorical colours.

## 8. The page is a shell of items, not a fixed three-column article

Documents and views are items that sit in a sidebar or open as a tab; see `omnistax-web/docs/shell-layout.md`.

## 9. Scan ahead for exercises that live at the end of the chapter

Where the book aggregates exercises, keys, glossaries or summaries per chapter or per book, `exploration.md` records where, and building a section scans those places and pulls out what belongs to it.

## 10. After exploration, present the defaults as a config list

After exploration, list the defaults one setting per line with its value (start point, section or chapter loop, what to skip, what to generate, item 13) and ask; the agreed list is `config.md` beside `exploration.md`, and the per-section loop begins only after it is agreed.

## 11. Do not fold sections together

A section is a page even when thin. Splitting into sub-concepts is the agent's call; joining sections is never.

## 12. Exercises come from different places and go to different places

Every exercise records its source location and its kind, and the kind decides placement: inline after the idea it tests for short Remember and Understand checks, the Exercises tab for problem sets, test prep and anything at Apply or above. An exercise goes with the section that introduces what it tests; one the book places early is held for the later page, and both sections' notes say so. Every exercise is tagged with the concepts it tests; item 20 says how weights work.

## 13. What the agent may generate, and what it must not

Defaults, each overridable in the config list: answers to book problems are never generated, they come from the key, and an unkeyed problem the page needs is asked about, not computed; a suggested approach for an open question is generated by default and marked as an AI suggestion, never as a graded answer; questions, problems, worked examples and definitions are not generated unless the user asks, the one prompt being a concept node with no book exercise. Everything generated is marked generated on the item and set in OmniStax's face.

## 14. When a figure is made, and what kind

An idea or result the section introduces gets an interactive figure whose sliders are what is interesting and variable in the idea, not necessarily one equation's variables. A sketch figure in the book is replaced by an interactive figure covering the same quantities with the book's numbers as defaults. A photograph is kept when it serves the narrative or the text points at it, dropped when it is decoration, with the book's caption and credit when kept; the plan says which and why. A figure that serves exercises is copied faithfully, no sliders, no animation.

Several book figures may fold into one interactive figure when the book draws one scene several times and one live drawing is clearly better (a grid walked, then its triangle, then its diagonal). The folded figure keeps every number: its own in `number`, the rest under `folds`, an eyebrow "Figure 3.3 + 3.4 + 3.5", every image in `originals`, and every cited number in the prose links to it.

Two labels, and the reader sees no other word. A figure that replaces nothing in the book is a Sim: no number, eyebrow "Sim". One that transforms a book figure is a Figure with the book's number in its eyebrow. The validator reads every eyebrow against its row. The mechanism is a sim in the tables and code (`kind`, `.sim`, `sim-` ids, `F.sim()`); the label follows the number, never the kind.

Motion is decided per figure in the plan line, with the reason. A figure moves when its idea has a time in it, registers a cycle and gets the app's transport. A figure that only answers its sliders is still: no cycle, no transport, redraw on input. Never add a dummy loop to earn a transport.

## 15. Proposing extra simulations

Beyond the required figures, think broadly about what could help, judge each candidate strictly (does it open a view the text and required figures do not give?), and offer only the survivors as one-line suggestions saying what the reader would see. Nothing is built until picked, or until `config.md` says the plan decides.

## 16. Let the user answer everything before proceeding

When feedback is asked for, stop. A partial reply is answered with the remaining points, not with work.

## 17. The page talks about the subject, not about itself, in the book's voice

Every sentence OmniStax adds is about the subject; nothing on the page says that prose is quoted, a figure redrawn or a card generated. Attribution is the footer, generated by the app from `book.json`; the section writes only `notes`, one plain sentence on what was left out, and `ai`, `{"text": <model>, "figures": <model>}`, with `built` as the ISO date. The AI mark on a suggested approach is the only in-place flag.

Everything OmniStax writes (leads, captions, headlines, readouts, suggested approaches, concept why lines, logs) is in the book's own voice as the book's `RULES.md` records it: full sentences, its register, person and vocabulary. No clipped fragments, semicolon chains or editorial framing.

## 18. Every book begins with a full-book pass that writes its rules and tools

Before the first section, one pass over the whole book leaves the book's `RULES.md` and its `tools/`. The rules state Source, Structure, Apparatus, Licence and attribution, Voice (with quoted sentences), Types (in scheme order, with what stays untyped), Exercise kinds and Figures, plus Files where the layout differs from the block above. The tools convert one unit of the source to `source.md` and do any other parsing the pass needed, once per book; a tool a second book uses moves to `omnistax-content/tools/`. The pass ends with the config list of item 10 for the first chapter.

## 19. The content is tables, and the schema is the reference

`book.json`, `chapter.json` and `section.json` are records of scalars and named tables, every row flat, every reference by id. The layout is `docs/content-tables.md`; the field reference is `docs/content-format.md`, generated from `omnistax-web/src/lib/content/schema.ts`. The schema is strict and an unknown key fails the build, so write only the fields the reference lists.

Agents read and write the tables through `omnistax-content/tools/ost.py`, a cheap local MCP, and its commands `books`, `show`, `rows`, `find`, `add`, `set`, `del`, `merge`, `log`, `check` and `ids`; the reference is `omnistax-content/tools/README.md`. Never open `book.json` or a `chapter.json` to search it, and never edit `book.json` by hand. A `section.json` may be written whole once, then corrected row by row with `set`. A dollar sign is `&#36;` in the prose of `text.html` and the fullwidth `＄` inside an exercise string or a `\text{}`.

Every reference must resolve. `npm run check:content` in `omnistax-web`, with the book's environment variables, checks every id, anchor, span, cite, place and figure row against the text, and that every built concept has `why`, `evidence` and an introducing span. Run it after every JSON write and before every stop.

## 20. Exercise weights

An exercise scores into each concept in its `exercise_concepts` rows by the Bloom table. Where it leans on one concept and merely touches another, a row may carry `weight`, a whole number from 1 to 6, the main concept keeping the full Bloom value, marked `"weights_by": "ai"`. Absent, the Bloom table applies.

## 21. The book's introductions and summaries keep their place

Where the book prints an introduction or a summary, it is kept in the book's words where the book stood it: a chapter's or the book's introduction is a page of its own in `intro/`, listed first; a chapter's or the book's summary is a page in `summary/`, listed last; a section's own go inside its page, at the top and the end. Nothing is invented where the book prints none, and the `lead` is neither. A long introduction is transformed like a section, its opener photograph kept.

## 22. COLOR.md

The full-book pass writes the book's `COLOR.md`, what is coloured and by which family of item 7, and a chapter or section may have its own `COLOR.md` that refines it: it may bind fewer types, never invent a hue.

## 23. BE INSPIRING

In exploration, ask for this specific book what would make an intuitive and stunning learning experience, and brainstorm how interactive figures can tell its stories visually even where the subject is not usually taught that way. Record the answer in `exploration.md`.

## 24. When a figure becomes a simulation

1. An arrow that shows something moving or flowing (a molecule's path, electrons in a wire, heat leaving a body) is kinematic and triggers animation. An arrow that is notation (a reaction arrow, a curly electron-pushing arrow, a dipole or force vector) is symbolic, drawn in the app's arrow style and never animated.
2. The translation must be a value add: standardisation, intuition, variation by slider, flow by animation, shape in 3D.
3. The gate is the mental-translation test: a figure becomes a simulation when the reader would otherwise have to imagine motion (animate), variation (sliders) or depth (let it turn). Otherwise it is a faithful copy or a kept photograph.
4. Every plan line names its value add. Standardisation alone means a faithful copy; a simulation names at least one other and says what the reader sees that the still cannot.
5. Four tiers by cost: faithful copy, still simulation, moving simulation, 3D scene. Default to the lowest tier that delivers the named value adds; argue past it in the plan line.
6. A slider changes the idea, not the scene, and the difference is readable in figure and readout. A slider with no visible consequence is removed.
7. Every simulation carries a readout writing the section's equation or relation with the live numbers in type colours. No mute animations.
8. 3D when the lesson is an arrangement in space (an angle, a packing, a lobe), signalled by the book's perspective or wedge-and-dash drawing; otherwise 2D. The book's `RULES.md` settles its borderline groups.
9. Never a simulation: decoration and splash photographs, a mechanism animation that replays the book's arrows, a molecule viewer for a molecule merely named, a simulation whose slider positions look alike, a transport on a figure with no clock.

## 25. Translating the figure, once the translation is decided

New components and an unhomogenised style are allowed where the idea needs them. The simulation may generalise the figure, reaching states the book did not draw, so long as the book's numbers are the defaults and the book's picture is one state of it.

## 26. Controls and legibility of a simulation

1. A discrete state is a choice, never a slider: a segmented control or, where a row would wrap, a dropdown, one option per state, the current one marked. A quantity with a few preset values is a slider with soft detents.
2. A 3D figure carries buttons, not only gestures: auto-rotate on and off (omitted where an idle spin makes no sense), snap-to-view buttons where a viewpoint matters, zoom in and out with the wheel doing the same.
3. The orbit is bounded to the views that carry meaning; a scene with a ground is never seen from beneath. The plan line says the bound and why.
4. Showing the original figure swaps the caption too; the two captions are never shown together.
5. A simulation is legible on its own page from its labels and caption, using only ideas the book has taught by that page.
6. Every drawn entity can be identified by a label, a hover name or a legend. Nothing is an unnamed coloured ball.

## 27. What an agent reads before building

The root `RULES.md`; the book's `RULES.md` and `COLOR.md`; the chapter's `config.md` and `COLOR.md`; the section's `source.md`; one template section named in the book's rules; `docs/prompts/interactive-figures.md` when the section has figures; and the `ost show` summaries of the book, the chapter and the section in place of the JSON files. Nothing else unless a rule points at it.

## 28. Three ways to show depth, and when each is right

1. **Flat** is the default. A relation between quantities (a graph, a free-body diagram, a strip with a bar) is clearest drawn flat with a fixed frame and honest labels, and it is the cheapest to build and to read.
2. **A locked view** (`view()`/`face()` in the drawing layer) is for a figure the book prints in perspective: a block, a cube, a table. It projects from the book's own viewpoint with shaded faces and no orbit, so the drawing does not have to guess a perspective in flat strokes, and it stays a 2D figure in cost and in chrome.
3. **A full 3D scene** (the app's THREE renderer, item 26's controls) is reached for when the apparatus or the spatial arrangement is the thing being taught and a flat drawing would have to lie about depth or scale to show it: the Cavendish balance, whose fine fibre, small rod and mirrored beam are the explanation, is the case; a molecule's shape or a crystal's packing are others. It is built procedurally in the renderer, ships no external asset unless one is vendored with its licence, and falls back to a flat view where WebGL is missing.
4. When the real motion is too small to see, the scene exaggerates it on a slider and the readout states the true numbers and the factor drawn, so the reader sees the mechanism and is told how far the picture departs from the truth.
5. A 3D scene that adds no view the flat drawing lacks is removed, as the cars of 2.33 + 2.34 were. The plan line argues the tier, as item 24 asks.
