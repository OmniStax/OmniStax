# Experiment takeaways

Ideas for the interactive pipeline, taken from the first transformed section
(College Physics 2e, section 2.5, September 2026). These are design
decisions, not observations; the running notes are in
`experiment/EXPERIMENT-LOG.md` and the per-book rules in
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

## 7. Keep the colour scheme by variable type

Variables of the same type share a colour (time, position, velocity,
acceleration in the kinematics chapters). The scheme binds sliders,
equation symbols and drawn objects across the whole page, and it can be
switched off. Keep it.

## 8. The page is a shell of items, not a fixed three-column article

Documents (section text, problem set) and views (concept map, contents,
formulas, definitions, later comments) are items that can sit in a sidebar
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

## 10. After exploration, ask how the user wants to proceed

The agent has defaults: one section per page, sections in book order, the
sub-concept split it proposes, figures replacing the book's sketches. It
should not silently apply them. After the exploration phase it stops with
a message that states the defaults it intends to use and asks how the user
would like to proceed: which chapter or section to start with, whether to
go section by section or chapter by chapter, what to skip. Only then does
the per-section loop of item 2 begin.
