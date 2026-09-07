# Exploration: College Physics 2e, Chapter 2 Kinematics

Written before converting the chapter (2026-09-06). Source of record is the
CNXML bundle (`experiment/osbooks-college-physics-bundle`), not the PDF.

## How the book is organized

book → chapters (34) → sections (numbered N.M) → subsections (untitled
narrative headers). Each chapter also has an unnumbered introduction. The
working format book → chapters → sections → concepts maps onto it directly:
one CNXML module = one section = one page.

Per-section apparatus lives inside each module, in this order: learning
objectives, narrative (with examples, figures, equations, inline
definitions, Check Your Understanding boxes), an "interactive" note (PhET
link) in some sections, AP test prep, section summary, conceptual
questions, problems and exercises. Solutions sit inline in the exercise
element for roughly every second problem.

The PDF aggregates the glossary, section summaries, conceptual questions
and problems at the end of each chapter (pp. 108 to 118 for Chapter 2) and
keeps the answer key in the back matter (p. 1607). Building from CNXML
avoids the scan-ahead problem: every exercise is already in its module.

## Chapter 2 modules

| Section | Module | PDF | Examples | Figures | Equations | Defs | CYU | AP | Conc. Q | Problems | Solutions |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Intro | m42122 | 57 | 0 | 1 photo | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2.1 Displacement | m42033 | 58–60 | 0 | 5 | 4 | 5 | 1 | 1 | 3 | 4 | 4 |
| 2.2 Vectors, Scalars, and Coordinate Systems | m42124 | 61 | 0 | 2 | 0 | 2 | 1 | 1 | 4 | 0 | 1 |
| 2.3 Time, Velocity, and Speed | m42096 | 62–66 | 0 | 4 | 8 | 7 | 1 | 1 | 5 | 11 | 8 |
| 2.4 Acceleration | m42100 | 67–77 | 7 | 13 | 15 | 4 | 1 | 2 | 5 | 4 | 4 |
| 2.5 Motion Equations for Constant Acceleration | m42099 | 78–88 | 6 | 12 | 54 | 0 | 1 | 1 | 0 | 21 | 13 |
| 2.6 Problem-Solving Basics | m42125 | 89–90 | 0 | 1 | 2 | 0 | 0 | 0 | 2 | 0 | 0 |
| 2.7 Falling Objects | m42102 | 91–99 | 3 | 7 | 17 | 2 | 1 | 1 | 6 | 18 | 11 |
| 2.8 Graphical Analysis | m42103 | 100–107 | 3 | 23 | 14 | 4 | 1 | 0 | 6 | 9 | 6 |

Figures counted include sub-figures and solution figures. Most are sketch
figures (position lines, v–t and x–t graphs) that the figure prompt
replaces; the photographs (splash images, a runner, a rocket sled) carry no
physics and are dropped.

## Observations that affect the plan

- 2.5 is done (`ch02/2.5`). Its three external prerequisites point at 2.1,
  2.3 and 2.4, which are not built yet; the nodes are placeholders that
  open the OpenStax page.
- 2.2 and 2.6 are thin. 2.2 is one idea (sign convention on a coordinate
  axis) with no equations or problems. 2.6 is a six-step strategy box plus
  "unreasonable results" with two conceptual questions and no problems.
  Each is a candidate to fold into a neighbour (2.2 into 2.1, 2.6 into 2.5
  or 2.7) rather than get its own page.
- 2.4 has 7 examples and 13 figures, the heaviest narrative in the chapter.
  Its concepts (acceleration, instantaneous vs average, sign of a and v)
  are what 2.5 assumed.
- 2.8 is 23 figures of graphs: the section is graphs, so the figure plan
  there is graph-only archetypes, not strip-plus-graph.
- The colour scheme (t, x, v, a) covers the whole chapter. 2.7 adds g, a
  constant, which takes the acceleration hue.
- Concept ids are book-independent, so the chapter's map is one file that
  grows section by section; 2.5's map will be re-rooted onto real 2.1, 2.3
  and 2.4 nodes when those exist.

## Defaults the agent intends to use

1. Order: 2.1, 2.2, 2.3, 2.4, then re-link 2.5, then 2.6, 2.7, 2.8, one
   page each. The chapter introduction becomes a short landing page.
2. One section per page, built with the 2.5 template and shell; the
   chapter-level concept map and formula sheet accumulate across pages.
3. Per section: a plan message (sub-concepts, figures, which book figures
   are replaced, which exercises are tagged to which nodes), then the build,
   then a stop for feedback.
4. Prose verbatim; learning objectives, summaries, glossary terms and
   formulas pulled out of the running text into the views.
