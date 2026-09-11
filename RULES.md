# Rules for transforming a textbook

How the agent turns a textbook into OmniStax pages. Each item is a decision,
numbered so that a book's rules, a chapter's config and the prompts can
refer to it. These rules hold for every book. What is true of one book only
(its structure, its source format, its voice, its types) goes in that
book's own `RULES.md`, which item 18 describes.

## Where things live

```
omnistax-content/<Book Title>/   one folder per book, named by the title in its book.json
  book.json                      the book: identity, licence, types, symbols, concepts
  RULES.md                       the book's own rules (item 18)
  LOG.md                         the running log of passes over this book
  tools/                         the scripts written for this book's source format
  media/                         the book's figures and photographs, served at /media/
  <chapter>/                     one folder per chapter
    chapter.json                 sections, variables, equations, glossary
    config.md                    the agreed defaults for the chapter (item 10)
    exploration.md               what the exploration phase found (item 1)
    <section>/                   one folder per section
      source.md                  the section as converted from the book's source
      plan.md                    the plan that was reviewed before building (item 5)
      section.json               the section: lead, objectives, figures, coverage, exercises
      text.html                  the article body
      figures.js                 the section's interactive figures
omnistax-web/                    the app that builds every book into a site
docs/                            designs, prompts and the generated content reference
```

The shape of every JSON file is the subject of `docs/content-tables.md`,
and the field-by-field reference, `docs/content-format.md`, is generated
from the schema in `omnistax-web/src/lib/content/schema.ts`. Item 19 says
how to read and check them.

## 1. Start with a textbook exploration phase

Before transforming anything, the agent reads the book to learn how it
organizes information, and reports the granularity of its organizing units
(for example book → units → chapters → sections, or book → chapters →
sections → subsections). This is where module ids, the collection order,
the licence, and the location of exercises and answer keys are found.

## 2. Build one section at a time, one page per section

Whatever the book's own structure, the working format is
book → chapters → sections → concepts. One section corresponds to one HTML
page. After each section completes, the agent stops with a distinct,
interrupting message to the user and waits for feedback before starting the
next section.

## 3. Decide the sub-concepts within a section

The agent proposes the subheaders (sub-concepts) for the section. Not every
section needs subdivision, but many do. The agent decides where to divide,
neither over- nor under-dividing. The goal is digestible chunks: each idea
is an independent block so the reader can take the material apart one piece
at a time.

## 4. Pull meta-information out of the running text

Learning objectives, formula sheets, key terms, section summaries and
similar apparatus are ingested into structured data and removed from the
main text. The tool displays them elsewhere (floaters, formula sheet,
definitions tab), so they must not also sit inline.

## 5. Report the plan per section before building

For each section, the agent reports which subheaders (sub-concepts) it
plans to create and which diagrams it plans to make, and gets this plan
reviewed before writing the page. The figure half of that plan is specified
in `docs/prompts/interactive-figures.md`.

Andrew: I liked especially the part where adjusting the variables values of interested updated live. And, that those values are shown to be updated within the formula. Wonderful.

## 6. Keep the concepts in an organized data format

Concepts are written down in a structured file as the sections progress,
not inferred from headers afterwards. Later sections point back to earlier
concepts and sub-concepts, so the concept map grows across the book. The
concept map holds strictly the concept description: name, kind, prerequisite
edges, why, evidence. Narrative structure stays out of it.

## 7. Colour is a function of type

A colour belongs to a type, and a type is a kind of physical quantity:
its dimension (time, position, velocity, force, energy, frequency,
stiffness). A symbol takes the colour of its type; a derived quantity is
a different type and takes a different colour (v = dx/dt is velocity,
not position); a variant of the same type (initial, average, maximum)
keeps the colour and differs by decoration (hollow, dashed, subscript).
A drawn thing takes the colour of its result type: the area under a
force line is an energy and is shaded as one. Nothing is coerced into a
neighbouring type to save a colour: frequency is not a time and a force
constant is not a force.

The book declares its types and says nothing about their hues. The
app dresses them from a **scheme**: the first of its recommended
palettes that can dress every type the book declares, and hues spaced
evenly round the OKLCH circle when none is long enough, laid along the
order the book declares its types in. The reader may reorder the types
and override any colour for the book, a chapter or a section in the
colour menu, and export or load what they chose. Finally, **a page
colours only the types it binds**, the ones its figures draw, its sliders
carry, or its readouts state; every other symbol renders in ink on that
page, so colour stays a signal rather than wallpaper. The plan for a
section lists what it binds.

The scheme ties sliders, equation symbols and drawn objects together
across the page, and it can be switched off. Keep it.

## 8. The page is a shell of items, not a fixed three-column article

Documents (section text, problem set) and views (concept map, contents,
formulas, definitions, notes) are items that can sit in a sidebar
or open as a tab, with rails on both edges and up to two document groups
side by side. See `omnistax-web/docs/shell-layout.md`.

## 9. Scan ahead for exercises that live at the end of the chapter

Some textbooks put all exercises at the end of the chapter rather than
after each section (College Physics 2e does this: the problem set for 2.5
is in the chapter-end material, keyed by section). Building one section at
a time must not mean reading one section at a time. In the exploration
phase the agent records where exercises, answer keys, glossaries and
summaries sit, and when it builds a section it scans ahead to those places
and pulls out the items that belong to the section. The same applies to
any apparatus that is aggregated per chapter or per book.

## 10. After exploration, present the defaults as a config list

The agent has defaults: one section per page, sections in book order, the
sub-concept split it proposes, figures replacing the book's sketches, what
it generates and what it never generates (item 13). It should not silently
apply them. After the exploration phase the loop starts with a message
that lists these defaults as a config list, one line per setting with its
default value, and asks whether the user is okay with them: which chapter
or section to start with, whether to go section by section or chapter by
chapter, what to skip, what to generate. The user edits the list; only
then does the per-section loop of item 2 begin. The agreed config is
written down next to the exploration report so later sections use it.

## 11. Do not fold sections together

The book's sections are the unit, even when one is thin. A section with no
equations or problems (a sign-convention note, a problem-solving strategy
box) still gets its own page. The agent may point out that a section is
thin, but it does not merge it into a neighbour. Splitting a section into
sub-concepts (item 3) is the agent's call; joining sections is not.

## 12. Exercises come from different places and go to different places

Exercises are sourced from several locations in a book (inline Check Your
Understanding boxes, end-of-section problem sets, end-of-chapter problem
sets, test-prep sections, worked examples) and they come in different
types. The type decides where an exercise shows up on the page:

- **Inline**, in the running text right after the idea it tests: typically
  Check Your Understanding items and other Remember/Understand level
  questions. These are the short, low-effort checks that belong next to
  the passage.
- **Exercises tab**, as a separate document: the problem sets that the
  book puts at the end of a section or chapter, test prep, and anything
  at the Apply/Analyze level that takes real work.

The agent records the source location and the type of every exercise so
the placement is a rule, not a per-item choice.

An exercise goes with the section that introduces what it tests, not
where the book happens to put it. The reader should be ready for an
exercise when they meet it. When a book places an exercise ahead of the
ideas it needs (the AP test-prep blocks do this: 16.1 carries a question
about amplitude and period, which are 16.2 and 16.3 ideas), the exercise
is held and placed on the later page, and both sections' notes say so.

Every exercise is tagged with the concepts it tests, and the app scores a
correct answer into each of them by the exercise's Bloom level. Where an
exercise leans on one concept and only touches another, the agent may write
`weights`, points per concept id, so the practice gives credit where the
work is: a problem that turns on Hooke's law and merely names displacement
gives displacement less. The field is marked `"weights_by": "ai"` and the
Bloom table applies wherever it is absent, so it is never required. A
weight is a small whole number in the Bloom range (1 to 6), and the
concept that the exercise is really about keeps the full Bloom value.

## 13. What the agent may generate, and what it must not

Defaults, all overridable in the config list of item 10:

- **Answers to book problems: never generate.** Answers come from the
  book's answer key only. Most books key only some problems (often the
  odd-numbered ones), and that is enough to work with. When a problem the
  page needs has no keyed answer, the agent asks the user rather than
  computing one.
- **Suggested approaches for open questions: generate by default.**
  Conceptual questions have no key; the agent writes the points the text
  supports, labelled as an AI suggestion, never as a graded answer.
- **Questions of any kind (relationship questions, new problems, worked
  examples, definitions): not by default.** Books have enough questions.
  The one exception the agent may raise: when a concept node has no
  exercise in the book that tests it, the agent asks the user whether to
  generate one for that node. It never generates unasked.
- Everything generated is marked as generated on the item itself and set
  in OmniStax's face, not the book's.

## 14. When a figure is made, and what kind

Three triggers, three treatments:

- **An idea or result the section introduces gets an interactive figure.**
  Sliders are whatever is interesting and variable in that idea:
  positions for displacement, a starting speed for a stopping car. They
  do not have to be the variables of a single equation, and an idea with
  no equation still gets sliders for the quantities its definition names.
- **A sketch figure in the book is replaced by an interactive figure**
  that covers the same quantities, with the book's numbers as defaults.
  A photograph is kept when it serves the narrative and the original
  text and dropped when it is decoration; the plan says which and why,
  and a kept photograph carries the book's caption and credit line.
- **Several book figures may fold into one interactive figure.** A book
  often draws one scene several times because print cannot move: the
  walk across the city, then the right triangle it makes, then the same
  grid with the helicopter's diagonal (Figures 3.3, 3.4 and 3.5 of
  College Physics 2e). One figure that walks the legs, shades the
  triangle and flies the diagonal is clearer than three drawings of the
  same grid, so the agent folds them when the fold is obvious and reads
  better, and says so in the plan line. A folded figure keeps every
  number it replaces: its row names its own `number` and lists the
  others under `folds`, its
  eyebrow reads "Figure 3.3 + 3.4 + 3.5", its `originals` carry every
  folded image, and the build links each of those numbers in the prose
  to the one figure, so "as pictured in Figure 3.5" still jumps somewhere.
  A fold is never a way to skip a figure: every number the prose cites
  must land on a figure that shows what that number showed.
- **A figure that exists to serve exercises is copied over as it is.**
  The paths figure of 2.1, a diagram a problem refers to: these are
  redrawn faithfully, with no sliders and no animation beyond what makes
  the original readable. The point is that the reader sees exactly what
  the problem is about.

An interactive figure carries one of two labels, and the reader sees no
other word for it. A figure the agent made on its own suggestion,
replacing nothing in the book, is a **Sim**: its row carries no number
and its eyebrow reads "Sim". A figure that transforms a book figure is
still a **Figure**: its row carries the book's number and its eyebrow
reads "Figure 2.39", or "Figure 3.3 + 3.4 + 3.5" when it folds several.
A faithful copy and a kept photograph are Figures as before. The
validator reads the eyebrow of every figure element against its row and
refuses any other label. The mechanism behind both is a sim, a
simulation the reader can play with, and that is its name wherever the
tables and the code refer to it: the row's `kind`, the `.sim` class, the
`sim-` id prefix, `F.sim()`. The label follows from the number, never
from the kind.

Whether an interactive figure moves is a decision of its own, made in the
plan line, and the agent thinks it through for every figure rather than
defaulting to motion. A figure moves when the idea has a time in it:
something travels, oscillates, falls, or a quantity accumulates as a clock
runs. That figure registers a cycle and gets the app's transport (play and
pause, stop, a scrubber when the run is finite, speed). A figure whose
idea has no time in it, one that answers its sliders and nothing else (a
bull's-eye that scatters as the spread changes, a value placed on a
ladder of powers of ten, two lengths summed with their rejected digits
muted), is a still picture: it registers no cycle, gets no transport, and
redraws when a slider moves. A transport on a still picture is a promise
of motion the figure cannot keep, and a dummy loop added to earn one is
worse. The plan line says which of the two each figure is, and why.

## 15. Proposing extra simulations

Beyond the figures the triggers above call for, the agent may propose
additional interactive simulations. A new simulation has to earn its place:
it must open a view on the material the text and the required figures do
not give. The agent works in three steps, in order:

1. Think creatively about what simulations could be useful for this
   section.
2. Judge each one strictly: does it truly add insight, or does it only
   animate something the reader already sees?
3. Offer the survivors as suggestions in the plan message, one line each
   with what the learner would see that they cannot see otherwise. The
   user picks; nothing is built unasked.

## 16. Let the user answer everything before proceeding

When the agent asks for feedback, it stops. It does not build, refactor, or
move to the next section until the user has had the chance to respond to
every point in the message: every plan line, every question, every
suggestion. A partial reply is answered with the remaining points, not with
work. This is what makes the plan review of item 5 and the per-section stop
of item 2 real rather than ceremonial.

## 17. The page talks about the subject, not about itself, in the book's voice

Every sentence OmniStax adds to a page is about the physics. A section lead
says what the section is about. A figure caption says what to drag and what
to watch. Nothing on the page explains that the prose is quoted, that a
figure is a redrawn or live version of the book's, or that a card was
generated. Attribution and omissions go in the footer, and the AI mark on
a suggested approach is the only in-place flag. The footer is generated
by the app from the book's metadata (title, authors, publisher, copyright
holder, licence, the section's page at the publisher); the pipeline writes
only the section's `notes`, one plain sentence saying what was left out,
and its `ai`, the name of the model that transformed the text and of the
model that built the simulations. Every article carries the footer
because a section is what gets linked to, and the licence asks for credit
wherever the work is shared. The footer is the whole of the attribution:
it names the adaptation, the licence the adapted page is shared under
(the same as the source, when the source is ShareAlike), and the AI that
did each job, so a reader always knows which model wrote the page's
words and built its figures.

Everything OmniStax writes (leads, figure captions, readouts, suggested
approaches, concept "why" lines) is written in the book's own voice:
its register, sentence shape, person and vocabulary. The typeface already
marks the words as OmniStax's, so the language must not; the reader should
feel one writer across the page. The agent reads a few pages of the book
before writing for it, and the per-book `RULES.md` records what the voice
is (for College Physics 2e: full sentences, plain second person, patient
rather than clever). Clipped fragments, semicolon chains and editorial
framing are out even where they would be shorter.


## 18. Every book begins with a full-book pass that writes its rules and tools

Before the first section of a new book is planned, the agent makes one pass
over the whole book and leaves two things behind in the book's folder.

The first is the book's `RULES.md`. It is the exploration report of item 1
turned into standing decisions, and it must say:

- **Source.** The format the book comes in (CNXML, PDF, HTML), where the
  files sit, how the book names its modules or pages, and which tool in
  `tools/` turns one unit of it into `source.md`.
- **Structure.** The organizing units the book uses and how they map onto
  OmniStax's chapters and sections; the list of chapters with their ids;
  where the chapter introductions are.
- **Apparatus.** Where the learning objectives, summaries, glossaries,
  worked examples, exercises and answer keys sit, and which problems the
  key covers (item 9 and item 13 depend on this).
- **Licence and attribution.** The licence, the copyright holder, the
  publisher's page for a section, and what a kept photograph's credit line
  must carry. The same facts go in `book.json`; the rules say where they
  came from.
- **Voice.** The book's register, sentence shape, person and vocabulary,
  with a few quoted sentences as the reference for item 17.
- **Types.** The table of physical types the book declares, in the order
  the colour scheme should lay its hues along, and what stays untyped
  (item 7).
- **Exercise kinds.** The kinds of exercise the book has, where each kind
  comes from and where it goes on the page (item 12).
- **Figures.** What the book numbers, what it does not, and any figure
  convention of the book that the app has to honour.

The second is `tools/`: the converter from the book's source to
`source.md`, and any other script the pass needed (a table-of-contents
extractor, an answer-key parser). A tool is written once for the book and
run for every section after, so that conversion is parsing and the agent's
judgement is spent on concepts, figures and exercises. A tool belongs to
the book whose format it reads; a tool that turns out to be general moves
up to `omnistax-content/tools/` when a second book uses it.

The full-book pass ends with the config list of item 10 for the first
chapter. Only then does the per-section loop of item 2 begin.

## 19. The content is tables, and the schema is the reference

The three JSON files of a book, `book.json`, `chapter.json` and
`section.json`, are each a record of scalars and named tables, one table
per kind of row, every row flat, every reference by id. The layout is
`docs/content-tables.md`; the reference for every field is
`docs/content-format.md`, generated from the schema and never edited by
hand. The agent reads the reference before writing a file and writes only
the fields it lists: the schema is strict, and an unknown key fails the
build.

Every reference must resolve. `npm run check:content` in `omnistax-web`
parses every file and checks that every concept, prerequisite, exercise,
type, section and equation named anywhere exists, that every anchor, span,
cite and place names an id in the section's `text.html`, that every figure
row matches a figure in the text, and that every built concept has its
`why`, its `evidence` and a span that introduces it. The agent runs it
after every section and before every stop for feedback.

## 20. Exercise weights

An exercise is evidence for every concept in its `exercise_concepts` rows,
and the app scores it into each of them by the Bloom table. When an
exercise leans on one concept and merely touches another, the agent may
write a `weight` on the row, so that a Hooke's law problem that mentions
displacement gives displacement less. Weights are always the agent's
judgement and are documented as such; where the field is absent the Bloom
table applies.
