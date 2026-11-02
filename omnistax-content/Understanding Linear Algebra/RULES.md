# Understanding Linear Algebra: the book's rules

What is true of this book and of no other; the rules for every book are the root `RULES.md`, and this is the file its item 18 asks for. A chapter's decisions are in its `config.md`, the book's colour plan in `COLOR.md` beside this file (root rule 22). `exploration.md` has the counts and the reasons. The standing decisions below were made by the orchestrating session on 2026-11-02 on Chen's instruction to build the whole book without check-ins; a chapter's `config.md` carries them over and changes only its chapter-specific lines.

## Source

David Austin, *Understanding Linear Algebra*, 2026 Update (git b6ea263, 2026-09-18; the PDF at `source/ula/site/ula.pdf` built 2026-08-02), from the PreTeXt at `source/ula/` in this folder (a clone of github.com/davidaustinm/ula, gitignored, read-only). `src/chap1.xml` … `src/chap7.xml` include one `src/sectionN-M.xml` per section, which includes `src/exercises/exercisesN-M.xml`; `src/bookinfo.xml` holds the book's LaTeX macros, `src/prefigure/` the PreFigure diagrams, `assets/images/` the author's rendered SVGs and photographs, `assets/jslibrary/` his JavaScript interactives. The web edition keeps only the `production` component (`publication/publication.ptx`): everything marked `rs-preview`, `proteus` or `proteus-playground` is Runestone-only and is not part of the book.

`tools/convert.py` converts one section to `source.md` (its docstring is the marker reference); `toc.md` and `modules.json` map every section to its file and xml:id. A section's `module` is its xml:id (`sec-expect`, `sec-pivots`). An exercise's `source_id` is its printed number, `1.2.3`; an activity's is its printed number too, `1.2.1` for Preview Activity 1.2.1, with the task letter where one part is meant, `1.2.1.b`.

## Structure

book → chapters (1–7) → sections (N.M, 32) → subsections (N.M.k, the book's own, the last two always Summary and Exercises) → activities, examples, definitions, theorems. One `<section>`, one page; sections are never folded. Chapters 2–7 open on an `<introduction>` of a paragraph or two, built as `chNN/intro/` (root rule 21.1); Chapter 1 has none. The book's preface, "Our goals", is `intro/`, with the acknowledgements under it; the print note, the dedication and the colophon are not built. No chapter or book summary. The back matter (Appendix A, a Sage reference; the index) is not built; a reference to it is plain text.

| Id | Chapter | File | Sections |
|---|---|---|---|
| ch01 | Systems of equations | chap1.xml | 1.1–1.4 |
| ch02 | Vectors, matrices, and linear combinations | chap2.xml | 2.1–2.6 |
| ch03 | Invertibility, bases, and coordinate systems | chap3.xml | 3.1–3.5 |
| ch04 | Eigenvalues and eigenvectors | chap4.xml | 4.1–4.5 |
| ch05 | Linear algebra and computing | chap5.xml | 5.1–5.2 |
| ch06 | Orthogonality and Least Squares | chap6.xml | 6.1–6.5 |
| ch07 | Singular value decompositions | chap7.xml | 7.1–7.5 |

A chapter's book-level rows are staged in its `book-rows.json` and merged with `ost merge understanding-linear-algebra N`.

## Numbering

Sections N.M; subsections N.M.k. Figures, tables, definitions, examples, theorems, propositions, observations, questions and the one checkpoint share one counter per section, N.M.k, counted through the Exercises subsection too (a figure inside an exercise's statement takes the next number); a figure inside an answer or a solution prints no number. Activities and preview activities share a counter of their own (Preview Activity 1.2.1, Activity 1.2.2). End exercises are N.M.k by their place in the Exercises subsection. Every number was checked against the PDF (495 of 495 agree). The app's figure linker links "Figure N.M.k" to the row whose `number` is `N.M.k`.

## Apparatus

- **The section introduction** (`<introduction>`) stays at the top of `text.html` as the first block, under OmniStax's own `<h2>` for it, since the book prints it unheaded.
- **Subsections** keep the book's titles as `<h2>`; the book's number (1.2.1) is not printed. The **Summary** subsection's bullet list goes to `summary_html`; the **Exercises** subsection goes to the Exercises system. The book prints no learning objectives: `objectives` is empty.
- **A defined term** is the italic `<em>` in running prose beside its `<idx>` entry (`{index-entry:…}` in `source.md`); it stays in the prose, its concept a `definition` whose `terms` are the italicised words. A **Definition N.M.k** box stays in the text as `<div class="note">` with the eyebrow "Definition N.M.k"; its concept is a `definition`.
- **A Proposition, Theorem, Principle or Convention** stays in the text as `div.note` with its eyebrow and the book's title; its concept is a `result` (a convention is a `definition`). The book prints no `proof` environment; a justification written as equations is a derivation (root rule 29), and the plan scores it.
- **An Example N.M.k** stays in the text whole, as `<h3>` "Example N.M.k" with the book's title; its parts a., b., … as `<ol type="a">`; a `SOLUTION:` the converter prints is the book's solution and stays in the example.
- **An Observation N.M.k** and a **Question N.M.k** are `div.note` with that eyebrow. An **assemblage** (the framed summary boxes, "Solutions to sets of linear equations") is `div.note` with the eyebrow "Summary" and the book's title.
- **A Preview Activity N.M.k and an Activity N.M.k** are the book's inquiry tasks, printed in the running text with the author's answer and solution for every part. Root rule 12: a question printed inline stays inline, so each is one inline Try It (`kind` `preview` or `activity`, `place` inline after the span that precedes it, `source_id` its number), its tasks the parts a), b), … of one card, the book's answer as the card's answer and the book's solution as its `solution`, both `generated_by: "source"`. It gives immediate feedback only. A figure inside a task (the empty grids "plot the lines here", the scatter plots) is listed in the plan: an empty grid that only invites the reader to draw is dropped and the part's prompt keeps the book's words; a figure that shows something is a faithful copy in the card's `figure` or, where the task is the book's own interactive, the section's Sim with the part citing it.
- **Checkpoint 6.2.16** (the one `<exercise>` printed in running text) is an inline Try It of kind `checkpoint`.
- **End exercises** go to the Exercises system, kind `exercise`, `source_number` the printed number. The book keys 292 of 297 with an answer and 293 with a solution: the answer is the card's answer and the solution its `solution`, `generated_by: "source"`. An answer that is one number is `type: "number"`, several numbers one per part `multi`, everything else `open`; a matrix or a vector answer is `open` with the book's TeX. The four unkeyed exercises (1.1.1–1.1.4; the full-book pass counted one of 6.5 too, but Exercise 6.5.3 prints the author's solution) and Checkpoint 6.2.16, which prints none, carry an AI-marked solution (`generated_by: "ai"`), stating the answer and the reasoning, checked by computation where the answer is computable; this is the orchestrator's choice under root rule 13, since Chen asked for no check-ins. Bloom levels and concept tags are AI-judged.
- **Sage cells** (290) are the book's computational apparatus. OmniStax has no Sage runtime, so a cell stays in the text as a code block, `<pre class="sage"><code>…</code></pre>`, with its printed output under it where the book prints one; the section's `notes` says the cells are not live. Section 1.3, "Computation with Sage", is built like the others. The Sage reference appendix is a candidate `cas` sheet for later.
- **The author's JavaScript interactives** (14, `assets/jslibrary/`) are the book's own simulations: linear combinations, span (two), matrix multiplication, the stick-figure transformation, RGB and YCbCr colour, the Fourier basis (three), the determinant, eigenvectors, the HSV colour, the singular values. Each is rebuilt as an OmniStax Sim in the house style with the same idea and the book's numbers; where the book prints it inside a numbered figure, the Sim is that Figure and its preview PNG is the original.
- **Footnotes** (one) are book footnotes. **Tables** (9) stay in the text as `div.book-table` with the book's number. **Blockquotes** (3, in the preface) stay as `<blockquote>`.
- **Cross-references** the converter writes as `[Figure 1.1.2](ref:id)` link to the item's id on the page (`#id`) or on its page (`/understanding-linear-algebra/chNN/N.M/#id`); a reference to Appendix A stays plain text.

## Licence and attribution

CC BY 4.0, `license_url` https://creativecommons.org/licenses/by/4.0/. Copyright David Austin, who publishes it himself at https://understandinglinearalgebra.org (`publisher`, `copyright`, `source_url`). The footer generates the attribution from `book.json`: the title, David Austin, the home page and CC BY 4.0, the page named as adapted. Adapted pages are shared under CC BY 4.0. The iris illustration of 7.3 (Figure 7.3.5, "Artwork by @allison_horst", CC0) keeps its credit in the caption.

## Types

Six, in `book.json`, in scheme order: vector, matrix, region, eigenvalue, point, curve. The ids shared with Calculus and Diffy Qs (vector, matrix, region, eigenvalue, point, curve) mean the same thing there, so a linked concept wears one role across the three books. `COLOR.md` says why each is there and what its variants are.

A type is a role, not a letter: **v**, **w**, **x**, **b**, the columns of a matrix, an eigenvector, a residual, a principal component are `vector`; A, B, P, D, Q, U, Σ, V and the transformation T(**x**) = A**x** are `matrix` (the map and its matrix are one object in this book); a span, a subspace, a column space, a null space, an eigenspace, an orthogonal complement, a solution set drawn as a line or a plane are `region`; λ and σ are `eigenvalue`; a data point of a scatter plot (6.5, 7.1, 7.3) is `point`; a trajectory of a dynamical system (4.4) is `curve`. Untyped and in ink: a scalar weight c₁, c₂, a coordinate or component, an entry a_ij, a variable x, y, z of a linear system, a dimension m, n, a count k, the rank as a number, a probability, a pixel value.

## Formulas list

The chapter's equations table is printed as **Equations and formulas**: the forms of every definition, proposition and theorem that is an equation (the matrix–vector product as a linear combination, A = PDP⁻¹, the projection formula, the normal equation, the SVD), plus the named equations the text states.

## Exercise kinds

Four, declared in `book.json`: `preview` ("Preview Activity") and `activity` ("Activity"), inline Try Its at their place; `checkpoint` ("Checkpoint", one); `exercise` ("Exercise"), the Exercises document. A keyed answer always comes from the book's `<answer>` and `<solution>`; only the four exercises and the one checkpoint the book leaves unanswered carry an AI solution, named in `exercise_notes`.

## Figures

Figures are numbered per section (Figure 2.1.3). 188 figures in the sections and exercises: 279 PreFigure diagrams in the sections and 113 in the exercises (vectors, grids, lines and planes, transformed grids, scatter plots, phase portraits), 19 photographs and pictures (the JPEG chapter's Spring Canyon photographs and its chrominance planes, the iris, the Chutes and Ladders board, the penguins), 14 JavaScript interactives. Every PreFigure diagram is a picture of a computation, so it is the book's sketch figure under root rule 14: drawn live with the book's vectors, matrices and windows as defaults, the author's SVG behind the toggle (`assets/images/NAME.svg`, or rendered by `prefig` where the book ships none; `media/chNN/`). A photograph is kept where the text reads from it (the JPEG chapter, the iris) and dropped where it is decoration; the plan says which. A figure an exercise reads from is a faithful copy.

The borderline groups (root rules 24 and 28):

- **Vectors, spans and linear combinations** (2.1–2.4, 3.2, 6.1–6.4) are 2D with draggable heads; a span of two vectors in ℝ³ or a plane through the origin (2.3, 3.5, 6.2) is mathematical 3D, free orbit, no ground, and the flat drawing stays beside it only where the plan argues it.
- **Matrix transformations** (2.5, 2.6, 3.1, 3.4, 4.1, 7.4) are 2D: the unit grid and the unit square carried to their images, the reader editing the entries; the determinant is the parallelogram's area with its sign as orientation. A 3D transformation (the rotation of 2.6, the SVD of 7.4) is mathematical 3D.
- **Dynamical systems** (4.4, 4.5) are moving: the state point rides its trajectory in the phase plane, the eigenvector lines drawn; a Markov chain's state vector walks as bars. The transport runs time.
- **Data** (6.5, 7.1, 7.3): scatter plots with the fitted line or the principal components as arrows; data from `source/ula/src/data`, embedded in `figures.js`.
- **Images** (3.3, 7.5): a pixel block as a grid of grey values, its Fourier or SVD reconstruction under a slider for the number of terms kept.

## Files

The root layout, plus `COLOR.md`, `modules.json`, `toc.md`, `briefs/` (the filled briefs the build's agents read), `tools/convert.py` and `tools/mergebook.py`, and `media/chNN/` with the author's SVGs, rendered PreFigure diagrams, photographs and interactive previews. `intro/` is the preface; `chNN/intro/` the chapter introductions.

## Template sections

Until this book's first sections are built, the template is Diffy Qs: `omnistax-content/Differential Equations for Engineers/appA/A.1` (vectors and matrices, draggable arrows, a derivation, keyed and AI-answered exercises) and `ch03/3.5` (a moving phase portrait under a matrix); `ch00/0.2` for the id and exercise conventions. Once built, `ch01/1.2` (Gaussian elimination, activities as inline cards) and `ch02/2.1` (vectors, interactives rebuilt as Sims) are this book's templates, and `ch02/intro` for an introduction page.

## Standing decisions for the build (carried into every chapter's `config.md`)

1. Loop: build straight through with no stops; plans and decisions are reported afterwards. The whole book is built.
2. Exercises: the book's answers and solutions key everything they cover; the four unanswered exercises and Checkpoint 6.2.16 get AI solutions; no new exercises are written.
3. Activities and preview activities are inline Try Its, one card per activity with its parts; the one checkpoint too.
4. Sage cells stay as static code blocks.
5. Figures: every PreFigure diagram live with the original behind the toggle; the author's interactives rebuilt as Sims; empty worksheet grids dropped; photographs kept where read from.
6. Sims (root rule 15): the plan decides and builds its picks; the 3Blue1Brown survivors listed in `exploration.md` are built in their sections.
7. Tier default: the lowest tier that carries the value add; 3D only where the lesson is an arrangement in space (a plane in ℝ³, a 3D rotation, the SVD's ellipsoid).
8. Concept ids: a concept Calculus or Diffy Qs already states keeps that id (`ost find calculus …`, `ost find diffyqs …` before coining one); this book's own ids are canonical names.
9. Types: the six of `book.json`; a chapter may add one where root rule 7.4's test calls for it, saying so in its `exploration.md`.
10. `ai`: the model id and effort the agent ran at, per part; `built` the day the section was built.
11. Recolour: `npm run colours:default -- understanding-linear-algebra` is run by the orchestrator after each chapter pass.
