# Exploration: Understanding Linear Algebra, the full-book pass

Written 2026-11-02, before any section was built. The source of record is the PreTeXt at `source/ula/` (a clone of github.com/davidaustinm/ula at git b6ea263, 2026-09-18, "2026 Update"), gitignored and read-only, with the book's own PDF beside it (`source/ula/site/ula.pdf`, 519 pages, built 2026-08-02). The PDF settled the numbering; everything else is in the XML.

What was read: `project.ptx`, `publication/publication.ptx`, `bookinfo.xml` (the macros), `frontmatter.xml`, `preface.xml`, `backmatter.xml` and the seven chapter files in full; sections 1.1 and 1.2 and their exercise files in full, the rest by their element inventory, their titles, their activities and their figure environments. The counts below come from a script over the XML (`tools/convert.py --index`, which writes `toc.md` and `modules.json`) and were checked against the PDF.

## Why this book

Three open texts were weighed: Beezer's *A First Course in Linear Algebra* (GFDL, PreTeXt), Margalit and Rabinoff's *Interactive Linear Algebra* (GFDL, PreTeXt, with its own demos) and Austin's *Understanding Linear Algebra* (CC BY 4.0, PreTeXt). Austin's was chosen for the cleanest licence, for the author's answer and solution to 292 of its 297 exercises and to every activity (root rule 13's keyed count is nearly the whole book), for its geometric, activity-driven treatment that already thinks in pictures, and for the PreFigure source of every diagram, which tells the builder exactly what each figure draws. Hefferon's *Linear Algebra* could not be fetched from this session (hefferon.net is outside its network).

## The organising units

book → chapters (1–7) → sections (N.M, 32) → subsections (N.M.k, one level, the last two always "Summary" and "Exercises") → activities, examples, definitions, propositions. One `<section>`, one page. Chapters 2–7 open on an `<introduction>` of one to three paragraphs; Chapter 1 opens on 1.1. The book opens on a preface, "Our goals", with a print note, a dedication and an acknowledgement; it closes on a Sage reference (Appendix A) and the index. No chapter summary; each section carries its own Summary subsection.

| Id | Chapter | File | Sections | Intro |
|---|---|---|---|---|
| ch01 | Systems of equations | chap1.xml | 1.1–1.4 | no |
| ch02 | Vectors, matrices, and linear combinations | chap2.xml | 2.1–2.6 | yes |
| ch03 | Invertibility, bases, and coordinate systems | chap3.xml | 3.1–3.5 | yes |
| ch04 | Eigenvalues and eigenvectors | chap4.xml | 4.1–4.5 | yes |
| ch05 | Linear algebra and computing | chap5.xml | 5.1–5.2 | yes |
| ch06 | Orthogonality and Least Squares | chap6.xml | 6.1–6.5 | yes |
| ch07 | Singular value decompositions | chap7.xml | 7.1–7.5 | yes |

## Provenance

A section is traced by its file and its `xml:id`, which is its `module`:

| Section | xml:id | Section | xml:id | Section | xml:id |
|---|---|---|---|---|---|
| 1.1 | sec-expect | 3.3 | sec-jpeg | 6.1 | sec-dot-product |
| 1.2 | sec-finding-solutions | 3.4 | sec-determinants | 6.2 | sec-transpose |
| 1.3 | sec-sage-introduction | 3.5 | sec-subspaces | 6.3 | sec-orthogonal-bases |
| 1.4 | sec-pivots | 4.1 | sec-eigen-intro | 6.4 | sec-gram-schmidt |
| 2.1 | sec-vectors-lin-combs | 4.2 | sec-eigen-find | 6.5 | sec-least-squares |
| 2.2 | sec-matrices-lin-combs | 4.3 | sec-eigen-diag | 7.1 | sec-symmetric-matrices |
| 2.3 | sec-span | 4.4 | sec-dynamical | 7.2 | sec-quadratic-forms |
| 2.4 | sec-linear-dep | 4.5 | sec-stochastic | 7.3 | sec-pca |
| 2.5 | sec-linear-trans | 5.1 | sec-gaussian-revisited | 7.4 | sec-svd-intro |
| 2.6 | sec-transforms-geom | 5.2 | sec-power-method | 7.5 | sec-svd-uses |
| 3.1 | sec-matrix-inverse | | | | |
| 3.2 | sec-bases | | | | |

The publisher's HTML edition (understandinglinearalgebra.org) names its pages by these ids (`sec-expect.html`), so `slug` is the xml:id with `.html`. Every cross-reference is an `<xref ref="…">` on an xml:id and resolves to a link with the book's own number; items without an xml:id are named from their kind and number (`example-1-2-4`, `fig-2-1-3`, `preview-1-2-1`, `activity-1-2-2`).

## Numbering

PreTeXt's defaults, as the PDF prints them: sections N.M, subsections N.M.k ("1.2.4 Summary", "1.2.5 Exercises"). Figures, tables, definitions, examples, theorems, propositions, observations, questions and the one in-text checkpoint share one counter per section (Figure 1.1.1 … Figure 1.1.10, Definition 1.1.11; Observation 1.2.1–1.2.3, Example 1.2.4, Definition 1.2.5, Theorem 1.2.6, Example 1.2.7), counted through the Exercises subsection (Figures 2.1.14–2.1.19 sit in 2.1's exercises); a figure inside an answer or a solution prints no number (6.5's answer figures). Activities and preview activities share a second counter (Preview Activity 1.2.1, Activity 1.2.2, 1.2.3). End exercises are 1, 2, … within the Exercises subsection, referred to as Exercise 1.2.3. Assemblages and Sage cells print no number. Every one of the 495 numbered items in the PDF's text agrees with the converter's.

## Where the apparatus sits

Everything is inline in the section; nothing is aggregated per chapter or per book.

- **Section introduction**: an unheaded `<introduction>` of one to three paragraphs under the title (32).
- **Subsections** (145): the book's own headers, always ending with Summary (a bullet list, "We saw several important concepts in this section") and Exercises.
- **Defined terms**: `<em>` in running prose beside an `<idx>` entry (94 `idx`, 11 `term`); the Index lists them. Definition boxes (64, `<definition>`, numbered) carry the formal ones (reduced row echelon form, linear combination, span, linear independence, matrix transformation, inverse, basis, determinant, subspace, eigenvalue, Markov chain, orthogonal complement, least-squares solution, symmetric matrix, quadratic form, singular value decomposition).
- **Propositions and theorems** (58 propositions, 6 theorems), a principle (1.4) and a convention (2.3). No `<proof>` environment: a justification is prose or a short run of displayed equations after the box.
- **Examples** (80): Example N.M.k, often titled, a statement with its worked solution inside (a few with a separate `<solution>`), parts a., b., …
- **Observations** (6, in 1.2 and 1.4), **questions** (3: "Two Fundamental Questions" in 1.4, 4.1, 4.5), **assemblages** (12, framed summary boxes such as "Solutions to sets of linear equations").
- **Preview activities** (30, one per section but 1.1 and 1.3) and **activities** (109): the book's inquiry tasks, `<exploration>` and `<activity>`, each a statement with parts as `<task>`s or an `<ol>`, and the author's `<answer>` and `<solution>` to every part (the Runestone-only `rs-preview` tasks, polls and "scan your work" prompts are not in the book). An activity's figures: empty coordinate grids to draw on (1.1, 6.5), scatter plots, phase portraits, the author's interactives.
- **End exercises** (297, in `src/exercises/exercisesN-M.xml`): 4 to 13 per section, with parts; the author's `<answer>` on 292 and `<solution>` on 293 (1.1.1–1.1.4 and one of 6.5 have neither). No exercise groups but one; one exercise has an xml:id (`exercise-poly-fit`).
- **Sage cells** (290 in the sections, 102 in the exercises): `<sage>` with `<input>` and, where the book prints it, `<output>`. Section 1.3 is a Sage tutorial; 2.2, 3.3, 5.1, 5.2, 6.5, 7.3 and 7.5 lean on them for computations too large by hand.
- **Figures** (157 in the sections, 31 in the exercises): PreFigure diagrams (279 in the sections, 113 in the exercises; the XML in `src/prefigure/`, the author's SVGs in `assets/images/`, 71 diagrams rendered here with `prefig` because the book ships no SVG for them), photographs and pictures (19 `.jpg`/`.png`: the Spring Canyon photograph and its luminance and chrominance planes, the JPEG block zoom and quality comparison of 3.3; the Chutes and Ladders board of 4.5; Remy the dog and his cage of 7.5's dynamical pictures; the iris and the penguins of 7.3; the characteristic polynomial sketches of 4.2), 14 JavaScript interactives (`assets/jslibrary/`, with preview PNGs: linear combinations and span in 2.1 and 2.3, matrix multiplication in 2.2, the stick-figure transformation in 2.6, RGB, YCbCr and the Fourier basis of 3.3, the determinant in 3.4, eigenvectors in 4.1, HSV and the singular values in 7.4–7.5).
- **Tables** (9): 2.4, 3.2, 6.5 (two), 7.3, 7.5 and three in exercises.
- **Footnotes** (1), **blockquotes** (3, in the preface), **citations**: none (the book has no bibliography; the data sets of 6.5 and 7.3 name their sources in the prose).
- **Index**: every `<idx>` entry, the nearest thing to a glossary.
- **Appendix A, Sage Reference**: a list of commands by task; a candidate `cas` sheet, not a page.

### Per chapter

| Ch | Sections | Preview | Activities | Examples | Definitions | Props/Thms | Figures | Tables | Sage | Interactives | Exercises | Answered |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 4 | 2 | 10 | 2 | 5 | 4 | 13 | 0 | 28 | 0 | 25 | 21 |
| 2 | 6 | 6 | 17 | 14 | 6 | 11 | 63 | 1 | 46 | 5 | 60 | 60 |
| 3 | 5 | 5 | 14 | 13 | 9 | 14 | 32 | 1 | 30 | 4 | 49 | 49 |
| 4 | 5 | 5 | 20 | 19 | 6 | 7 | 24 | 0 | 30 | 1 | 48 | 48 |
| 5 | 2 | 2 | 6 | 3 | 0 | 0 | 1 | 0 | 16 | 0 | 19 | 19 |
| 6 | 5 | 5 | 20 | 17 | 8 | 14 | 32 | 2 | 54 | 0 | 51 | 50 |
| 7 | 5 | 5 | 22 | 12 | 4 | 14 | 22 | 2 | 86 | 4 | 45 | 45 |
| **all** | **32** | **30** | **109** | **80** | **38 boxes + italics** | **64** | **187** | **6** | **290** | **14** | **297** | **292** |

(The definitions column counts `<definition>` boxes plus the italic terms the converter marks; the figure column counts `<figure>` environments in sections and exercises; `toc.md` has the line per section.)

### Where exercises and answers live (root rule 9)

Exercises sit at the end of their own section, never aggregated, each with its answer and solution in the same element; building a section needs no scan beyond the section's own file and its exercises file. An activity's answers sit in the activity. Nothing is aggregated per chapter or per book.

## Figures

Every PreFigure diagram is a picture of a computation the reader can run (`<diagram>` with `<coordinates bbox>`, `<vector>`, `<line>`, `<grid-axes>`, `<polygon>`, `<point>`, often with the vector's components written in the XML), so it is the book's sketch figure under root rule 14: drawn live with the book's numbers as defaults and the author's SVG behind the toggle. Groups by what they draw:

- Lines and planes as solution sets (1.1): two or three lines meeting, parallel, coincident; three planes meeting in a point, a line, or not at all (3D).
- Vectors, sums, scalar multiples, linear combinations (2.1, 6.1): arrows from the origin, the parallelogram, tip-to-tail; a grid of linear combinations.
- Spans (2.3, 2.4, 3.5): a line or plane through the origin in ℝ² and ℝ³, the vectors inside it.
- Matrix transformations and their geometry (2.5, 2.6, 3.1, 3.4): the unit grid and the unit square carried to their images; rotations, reflections, shears, projections, the composition of two; the determinant as signed area.
- Bases and coordinates (3.2, 3.5): a second grid laid over the plane, coordinates read in it.
- Eigenvectors (4.1, 4.3): the vectors a matrix only stretches; the eigenvector lines; phase portraits of **x**ₖ₊₁ = A**x**ₖ with their trajectories (4.4, 4.5: attractor, repellor, saddle, centre, spirals).
- Orthogonality and projection (6.1–6.4): the projection onto a line or a plane, the orthogonal complement, Gram–Schmidt stepping.
- Data (6.5, 7.1, 7.3): scatter plots with a fitted line or curve, the principal components; the penguin and iris data sets (`src/data/`).
- Images (3.3, 7.5): the pixel block and its reconstructions.

Two figure elements hold nothing but an empty coordinate grid for the reader to draw on (the preview activity of 1.1, the activity of 6.5): worksheet apparatus, dropped under the standing decisions, their parts keeping the book's words. The photographs of 3.3 and 7.3 are the subject of their sections and are kept; the dog of 7.5 and the Chutes and Ladders board of 4.5 are read from by the text and kept; the quality-comparison photograph of 3.3 is kept.

## The overlap with Calculus and Diffy Qs

Calculus (id `calculus`) teaches vectors in its Chapter 12 and Diffy Qs (id `diffyqs`) a linear-algebra appendix (A.1–A.6) and matrices in 3.2, both built in full. Concept ids are canonical across books, so a concept this book states that either already has keeps that id; the mastery earned here counts there. The ids the prep agents reuse where the book states the same thing (checked with `ost find`):

- From Calculus Chapter 12: `vector`, `zero-vector`, `scalar`, `scalar-multiplication`, `vector-addition`, `vector-difference`, `magnitude-of-a-vector`, `unit-vector`, `normalization`, `standard-unit-vectors`, `dot-product`, `properties-of-the-dot-product`, `angle-between-two-vectors`, `orthogonal-vectors`, `vector-projection`, `scalar-projection`, `determinant`, `area-of-a-parallelogram`, `parallel-vectors`.
- From Diffy Qs 3.2 and Appendix A: `matrix`, `matrix-entry`, `square-matrix`, `row-vector`, `matrix-addition`, `scalar-multiplication-of-a-matrix`, `transpose`, `matrix-product`, `identity-matrix`, `rules-of-matrix-algebra`, `matrix-inverse`, `invertible-matrix`, `inverse-of-a-2x2-matrix`, `determinant-of-a-product`, `invertibility-and-the-determinant`, `determinant-as-area-scale`, `cofactor-expansion`, `augmented-matrix`, `elementary-row-operations`, `reduced-row-echelon-form`, `leading-entry`, `free-variable`, `inconsistent-system`, `consistent-system`, `gauss-jordan-elimination` (the book's Gaussian elimination to reduced row echelon form), `linear-system-of-equations`, `pivot`, `homogeneous-matrix-equation`, `kernel` (the book's null space, with `terms` "null space"), `column-space`, `span`, `linear-independence-of-vectors`, `subspace`, `basis`, `dimension`, `rank`, `rank-nullity-theorem`, `linear-combination` (Diffy Qs 2.1), `linear-mapping` (the book's matrix transformation), `matrix-vector-product`, `matrix-product-as-linear-combination`, `matrix-of-a-linear-mapping`, `matrix-product-as-composition`, `eigenvalue`, `eigenvector`, `characteristic-equation-of-a-matrix`, `diagonal-matrix`, `triangular-matrix`, `orthogonal-basis`, `orthonormal-basis`, `coordinates-in-an-orthogonal-basis`, `projection-onto-a-subspace`, `gram-schmidt-process`, `source`, `sink`, `saddle-point`, `center`, `spiral-source`, `spiral-sink`, `trajectory`, `phase-portrait`, `vector-valued-function`.
- New here (this book's own, canonical from now on): `decoupled-system`, `triangular-system`, `back-substitution`, `basic-variable`, `parametric-description`, `coefficient-matrix`, `row-equivalence`, `scaling-interchange-replacement`, `uniqueness-of-reduced-row-echelon-form`, `existence-and-uniqueness-questions`, `matrix-transformation`-level results, `coordinate-system`, `change-of-basis-matrix`, `jpeg-compression`, `discrete-cosine-transform`, `determinant-by-row-reduction`, `similarity`, `diagonalization`, `dynamical-system`, `markov-chain`, `stochastic-matrix`, `steady-state-vector`, `pagerank`, `lu-factorization`, `partial-pivoting`, `power-method`, `inverse-power-method`, `orthogonal-complement`, `orthogonal-projection`, `qr-factorization`, `least-squares-solution`, `normal-equations`, `symmetric-matrix`, `spectral-decomposition`, `variance`, `covariance-matrix`, `quadratic-form`, `principal-component-analysis`, `singular-value`, `singular-value-decomposition`, `reduced-svd`, `rank-k-approximation`, `condition-number`, `pseudoinverse`, and the rest the prep agents name.

The book's pages stay whole (root rule 11); where it leans on calculus (a derivative in 7.2's optimisation, the normal distribution nowhere) the prose links Calculus rather than repeating it.

## What would make this book stunning (root rule 23)

Linear algebra is the subject whose every object is a picture: a vector is an arrow, a matrix is what it does to the grid, a span is the line or plane the arrows sweep out, an eigenvector is the arrow that stays on its line, a least-squares fit is a shadow, a singular value decomposition is a circle becoming an ellipse. Austin's book already draws these; the page can let the reader move them.

- **Systems (1.1–1.4).** Two or three lines the reader tilts by dragging the coefficients, their meeting point, the moment they go parallel; three planes in ℝ³ meeting in a point, a line, or nowhere, turned by the reader. Row reduction as a sequence the reader steps through, each row operation a morph of the augmented matrix and, beside it, of the lines it stands for, so the solution never moves while the equations do. Pivots lighting up as columns are read.
- **Vectors and combinations (2.1–2.4).** Two arrows with draggable heads, c₁**v** + c₂**w** tracing the parallelogram grid as the sliders run, the span filling in as a line (dependent) or the whole plane (independent); three vectors in ℝ³ whose span is a plane until the third leaves it. The matrix–vector product as the combination of columns, drawn as tip-to-tail steps along the columns.
- **Transformations (2.5–2.6, 3.1).** The unit grid carried to its image under A with the entries on sliders and the book's named transformations as choices (rotation, reflection, shear, projection, the stick figure, the composition of two); the inverse undoing it, and the collapse to a line when the determinant vanishes.
- **Bases and coordinates (3.2, 3.5).** A second grid drawn from **b**₁ and **b**₂ over the standard one, the same vector read in both, the coordinates changing as the basis is dragged; the "space has no grid" lesson of 3Blue1Brown's change of basis. The JPEG chapter's block of 64 pixels and its reconstruction from k cosine terms on a slider.
- **Determinants (3.4).** The unit square's image as a parallelogram whose area is the determinant and whose sign is its orientation, the reader watching it flip; the 3D parallelepiped for 3 × 3.
- **Eigenvectors (4.1–4.3).** A vector dragged round the plane while A**x** is drawn beside it, the two aligning at the eigenvectors; the eigenvector lines, A acting as a stretch along them; A = PDP⁻¹ as change of basis, stretch, change back; powers Aᵏ**x** walking toward the dominant eigenvector.
- **Dynamical systems and Markov chains (4.4, 4.5).** A state point riding its trajectory in the phase plane under the transport, the book's attractor, repellor, saddle, centre and spirals as choices; the Chutes and Ladders board and a Markov chain's probability vector settling to its steady state; a small web's PageRank.
- **Computing (5.1, 5.2).** LU factorisation stepping; the power method's vector swinging into the dominant eigenvector, the Rayleigh quotient converging.
- **Orthogonality (6.1–6.5).** Projection as a shadow with the light square to the line or plane; the orthogonal complement; Gram–Schmidt stepping one vector at a time; least squares as the closest point of the column space, the residual drawn square to it, and the fitted line through the data moving as a point is dragged.
- **Symmetric matrices and the SVD (7.1–7.5).** A quadratic form's level curves turning into their principal axes; the variance along a rotating direction; the unit circle carried to an ellipse whose axes are the singular vectors and whose semi-axes are the singular values; an image rebuilt from its first k singular values on a slider.

### 3Blue1Brown survey

The sixteen lessons of 3Blue1Brown's *Essence of Linear Algebra* (2016) were read for teaching ideas through their Manim sources (github.com/3b1b/videos, `_2016/eola/`) and the published transcripts (github.com/3b1b/captions, `2016/`) for the eigenvalue, change-of-basis and abstract-vector-space lessons; the lesson pages at 3blue1brown.com are outside this session's network. Only the pedagogical idea is borrowed; every figure is OmniStax's own, in its house style, with Austin's numbers. Judged under root rules 15 and 24–26 and mapped to this book's sections.

Proposed Sims, strongest first (standing decision 6: built in their sections, as the plans lay them out):

1. **2.5–2.6, the grid under a transformation.** The whole unit grid carried to its image by A with the entries on sliders, grid lines staying parallel and evenly spaced, the origin fixed, **e**₁ and **e**₂ landing on the columns ("where î and ĵ land"); the book's rotation, shear, reflection, projection and stick figure as choices. Replaces and generalises the author's stick-figure interactive and the grid figures of 2.6.
2. **2.2, 2.5, matrix multiplication as composition.** Two transformations applied one after the other, the grid morphing twice, and the product matrix's columns shown as where **e**₁ and **e**₂ end up; the order swapped shows AB ≠ BA. (Lesson 4.)
3. **3.4, the determinant as area and orientation.** The unit square's image shaded, its area reading det A live, the colour flipping when the orientation reverses, the square collapsing to a line at det A = 0 ("columns must be linearly dependent"); 3 × 3 as a parallelepiped's volume in mathematical 3D. Replaces the author's determinant interactive. (Lesson 6.)
4. **3.1, the inverse as the transformation undone.** A then A⁻¹ returning the grid; a singular A squashing the plane to a line so that no inverse exists; the solution of A**x** = **b** as the point A⁻¹**b** found by running the transformation backward. (Lesson 7.)
5. **2.3, 2.4, span as the sweep of combinations.** c₁**v** + c₂**w** drawn as the sliders run, the tips filling a line or the plane; a third vector in ℝ³ in or out of the plane of the first two. Replaces the author's span interactives. (Lesson 2.)
6. **4.1, eigenvectors as the arrows that stay on their line.** A vector dragged round the plane with A**x** beside it; the eigenvector lines marked where they align; the 90° rotation with no real eigenvectors and the shear with one as choices. Replaces the author's eigenvector interactive. (Lesson 14.)
7. **3.2, change of basis as a second grid.** The book's basis **b**₁, **b**₂ drawn as a grid over the standard one, the same vector read in both coordinate systems, the change-of-basis matrix's columns the basis vectors; 3Blue1Brown's "space has no grid". (Lesson 13.)
8. **6.1, the dot product as a projection.** **w** projected onto the line of **v**, the signed length times ‖**v**‖ equal to the dot product, the sign shown as the projection falls on either side of the origin; the three cases similar, perpendicular, opposing. (Lesson 9.)
9. **4.3, diagonalisation as change of basis, stretch, change back.** P⁻¹ taking the eigenbasis grid to the standard one, D stretching along the axes, P taking it back, the three steps on a transport, so A = PDP⁻¹ is seen as a sentence; Aᵏ as D's diagonal raised to k. (Lesson 14, the eigenbasis.)
10. **(weak) 2.5, nonsquare matrices as maps between dimensions.** A 3 × 2 matrix sending the plane into ℝ³ as a plane through the origin, a 1 × 2 matrix sending it onto a number line with the grid's evenly spaced dots staying evenly spaced. (Lesson 8.) Built only where 2.5's plan finds it opens a view the square case does not.

Ideas that sharpen required transforms: the yellow unit square beside its matrix (every transformation figure keeps the unit square shaded in `matrix`'s hue); "read right to left" for a product (the composition Sim's headline); the "knocked off its span" test for eigenvectors (the eigenvector Sim's hover names); the column-space picture of 2.5 and 3.5 (Span of columns ⇔ Column space, the 2.3 Sim reused).

Not carried over: cross products and duality (lessons 10–11; the book has no cross product), Cramer's rule (lesson 12; not in the book), the quick 2 × 2 eigenvalue trick (lesson 15; the book finds eigenvalues from the characteristic polynomial), abstract vector spaces (lesson 16; the book stays in ℝⁿ), and the three-student framing of lesson 1. The hypercube projections and the function-as-vector pictures have no section here.

## What the full-book pass decided

The standing decisions are in `RULES.md`. In brief: the whole book is built without stops; the book's answers key every exercise they cover and the five unanswered ones get AI solutions; activities are inline Try Its with the book's answers; Sage cells stay as code; every diagram is drawn live with the author's SVG behind it; the author's fourteen interactives and the nine 3Blue1Brown survivors above are Sims; six types (vector, matrix, region, eigenvalue, point, curve), words not coloured, since the symbols carry the meaning in mathematics (root rule 7).
