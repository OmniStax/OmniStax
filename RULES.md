# Rules for transforming a textbook

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
    chapter.json                 sections, variables
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
Before transforming anything, read the book and report a `exploration.md`. This file will explain the apparatus, layout, organization of the book. It will also devise a way for us to map sections back to their provenance.

## 2. Build one section at a time, one page per section

The working format is book → chapters → sections → concepts; one section is one OmniStax HTML page. After processing a section, stop with an interrupting message and wait for feedback before the next (overridable behavior).

## 3. Decide the sub-concepts within a section
A section is organized into sub-sections. Subsection headers are `<h2>`. For some textbooks, the original subsection header readily applies, in this case, do not change or divide them, reuse them. Others don't, and the agent becomes in charged of coming with sub-sections and organizing text underneath them. The criteria for a subsection is akin to when tech blogs create subsections: It's just the boundary between when a set of ideas naturally come to a stop and the next is about to come.

A subsection of course can have further, smaller header levels—whatever the original text uses.

In `text.html` each block is a `<section id>` holding the book's prose verbatim, opened by its sub-concept header as an `<h2>`.

## 4. Pull meta-information out of the running text

Learning objectives, key equations, summaries and similar apparatus are extracted out as structured data fields and are removed from the text. The app will render them elsewhere. A section's own introduction stays in the text and its summary goes to `summary_html`, as item 21 sets out. The agent decides where the structured data ends up at.

## 5. Report the plan per section before building

The agent produces a `plan.md` for each section before building, including the concepts; keep original diagram or make a enhanced interactive figure and why (a one-liner per in the format of `docs/prompts/interactive-figures.md`), exercises, and the page's referents. The plan should be surfaced to the user and reviewed before the page is written (whatever `config.md` says).

## 6. Concepts
The agent has the pedagogical responsbility of extracting concepts from a book and organizing a concept map (directed acyclic graph). When a text matches one of these five concept kinds, extract it:
- A **definition** is stipulated, a name for something: displacement, the joule.
- An **axiom** is what the book takes as given, a postulate or a law found by experiment: F = ma, Ohm's law.
- A **result** follows from other concepts, whether or not the book shows the steps: v = v₀ + at, the work–energy theorem.
- An **idea** earns a place in the map without being any of those: the Bohr model, the Michelson–Morley experiment.
- A **skill** is know-how for applying the others, usually to solve problems: drawing a free-body diagram, balancing an equation.

A concept row holds the name, kind, statement and prerequisite edges, recorded in book.json. It carries the glossary words that name the concept, the main symbol the book denotes it by (if applicable), and every formula that states it, with the main form listed first. Multiple forms can take place for example in an rearrangement (a = F/m beside F = ma). A symbol's variants and components (a_x, B₁) are rows of the chapter's variables, and each names the definition of its quantity. The statement gives a definition's meaning or an axiom's or result's claim. Each concept has exactly one span that introduces it, where the book first does, and the reader can jump there.

Concepts are written to the tables section by section as the build goes, and later sections point back to earlier ids; nothing is inferred from headers afterwards. Reference data a subject needs, such as the periodic table or a table of constants, is a sheet of the book and not a concept.

## 7. Colour

Colour coding exists to lower the load of reading: the reader should recognise a thing across prose, equation and figure without having to work out that they are the same. Colour reaches a page in four ways, and where two apply, the earlier wins: fact, then convention, then referent, then category.

1. Colour is the fact. A wavelength, a spectrum, a flame, a material's own colour or a fluorescence is drawn in its real colour. A false-colour map of one scalar over a region (a stress field, a heatmap) is drawn on one scale with its legend.

2. Fixed conventions of the field: the CPK element palette `F.el(symbol)` for every atom, ion, molecule or particle with an identity, the DNA bases, resistor bands.

3. Referents. A referent is a particular thing in one example or figure that the text and the figure both point at: this swimmer, that tug. If a category is a type, a referent is a value of it. The section lists its referents in `referents`; the figure draws each with `F.ref(id)` and the text marks every reference to it `<span data-ref="…">`, pronouns included. A phrase naming several ("the two skaters") lists them all, `data-ref="skater-1 skater-2"`, and is split evenly across their colours. A referent's row lists every figure that draws it. It takes a colour from a set of twelve kept apart from the category colours, given out per section in table order: the first colour no referent sharing a figure with it already wears, clear of the category colours those figures draw, so a referent wears one colour in every figure and two referents in one figure never match. The build says so when a section runs out. An unnamed instance (`F.cat`) skips the colours its figure's referents wear. Where a fact or a convention wins a referent's body (an electron in the element palette, a photon in its own colour), its name label still wears the referent's colour. An arrow or other quantity drawn on a referent keeps its category's colour; where a graph shows one curve, bar or point per referent (cart 1's position beside cart 2's), each takes its referent's colour, and a single curve keeps its category's. A symbol for a referent's quantity is split in two: the main letter in its category's colour, the subscript in the referent's (F₁, with the 1 in tug 1's colour); its variables row names the referent in `ref`.

4. Categories. A colour category is a named kind a concept may belong to: what would deserve its own type constructor if the subject were formalised in Haskell. Force, mass and the demand curve do; a law, a unit and a constant do not. A variant of one kind (initial, average, maximum) is the same category and differs in a figure by decoration (hollow, dashed). The book declares its categories in order as `types` and gives each concept that belongs to one its `type`; the palette the reader picks maps each category to a real colour. A symbol takes the category of the concept its variables row names in that section. A word takes it wherever it is the name or a glossary word of a concept of that category: the build marks every such mention `<span data-type="…">`, the general ones ("the unit of force") as well as the particular. A word used in its everyday sense ("at the same time", "a range of values") is wrapped `<span data-ink>` and stays ink. The builder marks a phrase by hand only where it names a particular one without those words, such as a value with its unit ("20.0 m"). A category is coloured on every page.

## 8. The page is a shell of items, not a fixed three-column article

Documents and views are items that sit in a sidebar or open as a tab; see `omnistax-web/docs/shell-layout.md`.

## 9. Scan ahead for exercises that live at the end of the chapter

Where the book aggregates exercises, keys, glossaries or summaries per chapter or per book, `exploration.md` records where, and building a section scans those places and pulls out what belongs to it.

## 10. After exploration, present the defaults as a config list

After exploration, list the defaults one setting per line with its value (start point, section or chapter loop, what to skip, what to generate, item 13) and ask; the agreed list is `config.md` beside `exploration.md`, and the per-section loop begins only after it is agreed.

## 11. Do not fold sections together

A section is a page even when thin. Splitting and making sub-sections is the agent's call; joining sections is never.

## 12. Exercises come from different places and go to different places

Every exercise records its source location and kind, and its source location decides placement. A question printed inline in the reading stays inline as a short Try It. It gives immediate feedback only: revealing or checking it never records attainment or freshness and never asks for a self-reported verdict. A question printed in a problem set, review, test-prep set or other end exercise collection goes to the Exercises system, including Remember and Understand questions. Bloom level describes the thinking; it never moves a question. An exercise goes with the section that introduces what it tests; one the book places early is held for the later page, and both sections' notes say so. Every exercise is tagged with the concepts it tests.

## 13. What the agent may generate, and what it must not

These are defaults, and the config list can override each one:

- Answers to book problems are never generated; they come from the key. An unkeyed problem the page needs is asked about, not computed.
- A suggested approach for an open question is generated by default and marked as an AI suggestion, never as a graded answer.
- Questions, problems, worked examples and definitions are not generated unless the user asks.

Everything generated wears the AI mark on the item, whose hover names the model and effort that made it, and is set in OmniStax's face.

## 14. When a figure is made, and what kind

An idea or result the section introduces gets an interactive figure whose sliders are what is interesting and variable in the idea, not necessarily one equation's variables. A sketch figure in the book is replaced by an interactive figure covering the same quantities with the book's numbers as defaults. A photograph is kept when it serves the narrative or the text points at it, dropped when it is decoration, with the book's caption and credit when kept; the plan says which and why. A figure that serves exercises is copied faithfully, no sliders, no animation.

Several book figures may fold into one interactive figure when the book draws one scene several times and one live drawing is clearly better (a grid walked, then its triangle, then its diagonal). The folded figure keeps every number: its own in `number`, the rest under `folds`, an eyebrow "Figure 3.3 + 3.4 + 3.5", every image in `originals`, and every cited number in the prose links to it.

Two labels, and the reader sees no other word. A figure that replaces nothing in the book is a Sim: no number, eyebrow "Sim". One that transforms a book figure is a Figure with the book's number in its eyebrow. The validator reads every eyebrow against its row. The mechanism is a sim in the tables and code (`kind`, `.sim`, `sim-` ids, `F.sim()`); the label follows the number, never the kind.

Motion is decided per figure in the plan line, with the reason. A figure moves when its idea has a time in it, registers a cycle and gets the app's transport. A figure that only answers its sliders is still: no cycle, no transport, redraw on input. Never add a dummy loop to earn a transport.

## 15. Proposing extra simulations

Beyond the required figures, think broadly about what could help, judge each candidate strictly (does it open a view the text and required figures do not give?), and offer only the survivors as one-line suggestions saying what the reader would see. Nothing is built until picked, or until `config.md` says the plan decides.

## 16. Let the user answer everything before proceeding

When feedback is asked for, stop. A partial reply is answered with the remaining points, not with work.

## 17. The page talks about the subject, not about itself

Every sentence OmniStax adds is about the subject; no words on the page say that prose is quoted, a figure redrawn or a card generated. The AI mark is the only in-place flag (on the lead, a sim's head and a suggested approach), and its hover names what made the item: "Generated by Claude Opus 5.5 · low effort". Attribution is the footer, generated by the app from `book.json`, which names the models in plain words; the section writes only `notes`, one plain sentence on what was left out, `ai`, and `built` as the ISO date.

`ai` is `{"text": [<maker>…], "figures": [<maker>…]}`, a maker `{"model": <API id>, "effort": "low"|"medium"|"high"|"max"}`, principal first. Every agent that writes content records its own model id and effort there: a new section writes it whole, and an agent that rewrites a part appends itself to that part unless it is already listed.

A caption speaks of the subject and what the reader sees, never of the figure itself (never "this figure walks through…" or "grab a control to take over"). When a figure's behaviour changes, its caption and plan line are read again and corrected.

## 18. Every book begins with a full-book pass that writes its rules and tools
Before the first section, the agent should iteratively, with the user, walk over the whole book to create book-specific `RULES.md` and its `tools/`. During this phase, you two will together converge to what will be a superlative experience for future learners. The rules will cover special vocabulary that is book-specific. It will always  Source, Structure, Apparatus, Licence and attribution, Types (in scheme order, with what stays untyped), the name of its formulas list where the subject has its own word (Theorems, Laws and equations), Exercise kinds and Figures, plus Files where the layout differs from the block above and the Template sections an agent copies (item 27). The tools convert one unit of the source to `source.md` and do any other parsing the pass needed, once per book; a tool a second book uses moves to `omnistax-content/tools/`. The pass ends with the config list of item 10 for the first chapter.

## 19. The content is tables, and the schema is the reference

`book.json`, `chapter.json` and `section.json` are records of scalars and named tables, every row flat, every reference by id. The layout is `docs/content-tables.md`; the field reference is `docs/content-format.md`, generated from `omnistax-web/src/lib/content/schema.ts`. The schema is strict and an unknown key fails the build, so write only the fields the reference lists.

Agents read and write the tables through `omnistax-content/tools/ost.py`, a cheap local MCP, and its commands `books`, `show`, `rows`, `find`, `meanings`, `add`, `set`, `del`, `merge`, `log`, `check` and `ids`; the reference is `omnistax-content/tools/README.md`. Never open `book.json` or a `chapter.json` to search it, and never edit `book.json` by hand. A `section.json` may be written whole once, then corrected row by row with `set`. A dollar sign is `&#36;` in the prose of `text.html` and the fullwidth `＄` inside an exercise string or a `\text{}`.

`text.html` keeps the blocks of item 3, with `<sub>` and `<sup>` for formulas in prose, LaTeX in math, and `\k` macros only for typed symbols. Every `<figure>` carries `id`, `class` (`sim` or `photo`), `data-figure`, `data-original`, `data-original-caption` and, where its row has `widths`, `data-original-width` (a photograph puts its one width as `data-width` on its `<img>`), all agreeing with its row. No math goes in an attribute: the math pass would break it and the validator does not notice, so a caption attribute writes its symbols as plain text (f₀, ΔL).

Every reference must resolve. `npm run check:content` in `omnistax-web`, with the book's environment variables, checks every id, anchor, span, cite, place and figure row against the text, and that every built concept has a statement and exactly one span that introduces it. Run it after every JSON write and before every stop.

A symbol keeps one key across the book and a meaning per section. Before adding a variables row, run `ost meanings <book> <sym>`: when it is the same quantity, reuse the earlier meaning; when the book itself gives the symbol a new meaning, keep the section's own row, word the meaning so it stands alone, and set `redefines: true`. The checker warns on two meanings in one chapter without it, and the symbol card names the other meaning. `docs/symbols.md` has the detail.

## 20. Exercise evidence is discrete

A completed Exercises-system question supplies one step of evidence to every concept in its `exercise_concepts` rows. Correct adds one and incorrect subtracts one until mastery; Bloom and legacy `weight` fields do not change attainment. Inline Try Its supply no persisted evidence.

## 21. What opens and closes a page

A page opens on the lead and the book's introduction, and closes on the book's summary. The introduction and the summary are the book's words, kept where the book stood them; the lead is the only one of the three OmniStax writes.

1. **The book's or a chapter's introduction** is a page of its own in `intro/`, listed first, named by the `intro` record of `book.json` or `chapter.json`. It is transformed like a section, its opener photograph kept, and carries no lead, objectives, summary, exercises or coverage.
2. **The book's or a chapter's summary** is a page in `summary/`, listed last, on the same terms.
3. **A section's own introduction**, where the book prints one, stays at the top of its `text.html` as the first block.
4. **A section's own summary** goes to `summary_html` in `section.json`; the app prints it at the end of the text under "Section summary".
5. **The lead** is one or two sentences under the title saying what the section is about, at most 80 words. It states no result the section works out, and it never stands in for an introduction or a summary. Introduction and summary pages have none.

Nothing is invented where the book prints no introduction or summary.

## 22. COLOR.md

The full-book pass writes the book's `COLOR.md`, what is coloured and by which of item 7's four ways, and a chapter or section may have its own `COLOR.md` that refines it, never inventing a hue.

## 23. BE INSPIRING

In exploration, ask for this specific book what would make an intuitive and stunning learning experience, and brainstorm how interactive figures can tell its stories visually even where the subject is not usually taught that way. Record the answer in `exploration.md`.

## 24. When a figure becomes a simulation

1. An arrow that shows something moving or flowing (a molecule's path, electrons in a wire, heat leaving a body) is kinematic and triggers animation. An arrow that is notation (a reaction arrow, a curly electron-pushing arrow, a dipole or force vector) is symbolic, drawn in the app's arrow style and never animated.
2. The translation must be a value add: standardisation, intuition, variation by slider, flow by animation, shape in 3D.
3. The gate is the mental-translation test: a figure becomes a simulation when the reader would otherwise have to imagine motion (animate), variation (sliders) or depth (let it turn). Otherwise it is a faithful copy or a kept photograph.
4. Every plan line names its value add. Standardisation alone means a faithful copy; a simulation names at least one other and says what the reader sees that the still cannot.
5. Four tiers by cost: faithful copy, still simulation, moving simulation, 3D scene. Default to the lowest tier that delivers the named value adds; argue past it in the plan line.
6. A slider changes the idea, not the scene, and the difference is readable in figure and readout. A slider with no visible consequence is removed.
7. Every simulation carries a readout writing the section's equation or relation with the live numbers in type colours, so no animation is mute. The equation is true as written in every state: a term a case cancels leaves its sums too, and the numbers shown add up to the result shown.
8. 3D when the lesson is an arrangement in space (an angle, a packing, a lobe), signalled by the book's perspective or wedge-and-dash drawing; otherwise 2D. The book's `RULES.md` settles its borderline groups.
9. Never a simulation: decoration and splash photographs, a mechanism animation that replays the book's arrows, a molecule viewer for a molecule merely named, a simulation whose slider positions look alike, a transport on a figure with no clock.

## 25. Translating the figure, once the translation is decided

Every figure and simulation is drawn and moved in the house style, Manim's (`docs/prompts/manim-style.md`): its look and its morphing transitions always, a directed camera sequence only where the building agent judges a guided order teaches more than free exploration. New components are allowed where the idea needs them. The simulation may generalise the figure, reaching states the book did not draw, so long as the book's numbers are the defaults and the book's picture is one state of it.

## 26. Controls and legibility of a simulation

1. A discrete state is a choice, never a slider: a segmented control or, where a row would wrap, a dropdown, one option per state, the current one marked. A quantity with a few preset values is a slider with soft detents. A special value the text names (a limit, a threshold, a resonance, an equal pair) is a dashed circle on every slider it involves, placed from the other values (`specials` with `F.solve` where the relation must be solved), with a slight snap; landing on it is what fires the figure's morph.
2. A 3D figure carries buttons, not only gestures: auto-rotate on and off (omitted where an idle spin makes no sense), snap-to-view buttons where a viewpoint matters, zoom in and out with the wheel doing the same.
3. The orbit is bounded to the views that carry meaning; a scene with a ground is never seen from beneath. The plan line says the bound and why.
4. Showing the original figure swaps the caption too; the two captions are never shown together.
5. A simulation is legible on its own page from its labels and caption, using only ideas the book has taught by that page.
6. Every drawn entity can be identified by a label, a hover name or a legend. Nothing is an unnamed coloured ball.
7. No options for visual settings: controls change the physics, never how the figure looks, so there is no toggle to show or hide a part of the drawing, its labels or a helper. Labels are tiered and the figure decides: the frame (axis titles, headline, slider names, legend) is always shown; a kind is labelled once, in a legend or on one representative; an individual only where the reader must tell it apart. Entity labels that would exceed six, collide at any slider extreme or sit on things that move are not drawn, and hover names carry them. The plan line says which, and why.
8. Figure text is real text: every string a figure shows goes through the drawing library's text functions, which set it as page text over the canvas; a figure never paints text into its canvas and never names a font family.
9. Font roles: the figure font (a reader setting) for everything read inside the frame, slider values and readout included; the body font for prose and captions; the sans for controls (buttons, slider names, choices, eyebrows).
10. A serif figure font sets labels at regular weight; figure text never renders below the library's size floor.
11. Degrees are written ° (U+00B0), never the ordinal º; the book's own text keeps what it prints.
12. A slider track is never shorter than 120 px: where its name and value leave less, the track takes its own line under them (figlib does this as the pane resizes). A control a note may store takes a `key` when its class alone would not name it across edits.

## 27. What an agent reads before building

The root `RULES.md`; the book's `RULES.md` and `COLOR.md`; the chapter's `config.md` and `COLOR.md`; the section's `source.md`; one template section named in the book's rules; `docs/prompts/interactive-figures.md` and `docs/prompts/manim-style.md` when the section has figures; the `ost show` summaries of the book, the chapter and the section in place of the JSON files; and `ost meanings` for every symbol it gives a row. Nothing else unless a rule points at it.

## 28. Flat or 3D, and which kind of 3D

1. Flat or 3D is a pedagogical choice, made per figure; neither is the default. A relation between quantities (a graph, a free-body diagram, a strip with a bar) reads best flat with a fixed frame and honest labels. An arrangement in space, a direction out of a plane or a field that fills a volume reads best in 3D. The plan line argues the choice.
2. **A locked view** (`view()`/`face()` in the drawing layer) is for a figure the book prints in perspective: a block, a cube, a table. It projects from the book's own viewpoint with shaded faces and no orbit, so the drawing does not have to guess a perspective in flat strokes, and it stays a 2D figure in cost and in chrome.
3. The planner looks for 3D opportunities and classes each one, because the two classes are built differently:
   - **Physical 3D**: the scene is the thing. An apparatus, a real object or an arrangement of matter whose shape, scale or fine parts are the explanation: a balance whose fine fibre is the point, a spinning top, a molecule's shape, a crystal's packing. It is built from meshes with honest proportions and materials, stands on a ground where it has one, and orbits within the bound item 26.3 asks for.
   - **Mathematical 3D**: the maths is the thing. Vectors, fields, planes and surfaces: a cross product and its hand rule, a field filling a volume, a plane tilted through a flow, a wave with two perpendicular parts, a potential drawn as a surface. It is drawn in the house style (`docs/prompts/manim-style.md`): ink and type hues, no materials and no ground, a free orbit, and it may lift out of its own flat drawing and carry a directed sequence.
   The plan line names the class. A scene with both layers (a motor with its field) says which parts are which. Either class is built procedurally in the renderer, ships no external asset unless one is vendored with its licence, and falls back to a flat view where WebGL is missing.
4. When the real motion is too small to see, the scene exaggerates it on a slider and the readout states the true numbers and the factor drawn, so the reader sees the mechanism and is told how far the picture departs from the truth.
5. A 3D scene that adds no view the flat drawing lacks is removed, as the cars of 2.33 + 2.34 were. The plan line argues the tier, as item 24 asks.
