# Pipeline rules

How the agent turns a textbook into OmniStax pages. Each item is a decision,
numbered so the per-chapter config and the prompts can refer to it. The
running log is `experiment/EXPERIMENT-LOG.md`; the per-book rules are in
`experiment/RULES.md`.

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
in `../claude/prompts/interactive-figures.md`.

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

A book has more types than a page can carry in distinguishable hues, so
hues are allocated in two tiers. The **global tier** pins one hue for
the whole book to the handful of types nearly every chapter uses (time,
position, velocity, acceleration, force, energy). Every other type is
**chapter tier**: the chapter binds it to a hue from a small pool,
choosing so that no two types that share a page in that chapter share a
hue. A type may take a different pool hue in another chapter, since no
reader is on both at once; the chapter is the unit a reader studies at
a stretch. Finally, **a page colours only the types it binds**, the ones
its demos draw, its sliders carry, or its readouts state; every other
symbol renders in ink on that page, so colour stays a signal rather than
wallpaper. The plan for a section lists what it binds.

The scheme ties sliders, equation symbols and drawn objects together
across the page, and it can be switched off. Keep it.

## 8. The page is a shell of items, not a fixed three-column article

Documents (section text, problem set) and views (concept map, contents,
formulas, definitions, notes) are items that can sit in a sidebar
or open as a tab, with rails on both edges and up to two document groups
side by side. See `../claude/shell-layout.md`.

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

- **An idea or result the section introduces gets a demo.** Sliders are
  whatever is interesting and variable in that idea: positions for
  displacement, a starting speed for a stopping car. They do not have to
  be the variables of a single equation, and an idea with no equation
  still gets sliders for the quantities its definition names.
- **A sketch figure in the book is replaced by a demo** that covers the
  same quantities, with the book's numbers as defaults. A photograph is
  kept when it serves the narrative and the original text and dropped
  when it is decoration; the plan says which and why, and a kept
  photograph carries the book's caption and credit line.
- **A figure that exists to serve exercises is copied over as it is.**
  The paths figure of 2.1, a diagram a problem refers to: these are
  redrawn faithfully, with no sliders and no animation beyond what makes
  the original readable. The point is that the reader sees exactly what
  the problem is about.

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
says what the section is about. A demo caption says what to drag and what
to watch. Nothing on the page explains that the prose is quoted, that a
figure is a redrawn or live version of the book's, or that a card was
generated. Attribution and omissions go in the footer, and the AI mark on
a suggested approach is the only in-place flag. The footer is generated
by the app from the book's metadata (title, authors, publisher, copyright
holder, licence, the section's page at the publisher); the pipeline writes
only the section's `notes`, one plain sentence saying what was left out.
Every article carries the footer because a section is what gets linked
to, and the licence asks for credit wherever the work is shared. The
footer is the whole of the attribution: it names the adaptation and the
licence the adapted page is shared under (the same as the source, when
the source is ShareAlike).

Everything OmniStax writes (leads, demo captions, readouts, suggested
approaches, concept "why" lines) is written in the book's own voice:
its register, sentence shape, person and vocabulary. The typeface already
marks the words as OmniStax's, so the language must not; the reader should
feel one writer across the page. The agent reads a few pages of the book
before writing for it, and the per-book `RULES.md` records what the voice
is (for College Physics 2e: full sentences, plain second person, patient
rather than clever). Clipped fragments, semicolon chains and editorial
framing are out even where they would be shorter.

