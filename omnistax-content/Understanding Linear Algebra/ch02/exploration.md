# Chapter 2 exploration: Vectors, matrices, and linear combinations

Prepared 2026-11-02 by the prep agent (claude-fable-5-1, high effort) from the six `source.md` files and `intro/source.md` (`tools/convert.py 2.1` … `2.6`), the XML under `source/ula/src/` (`chap2.xml`, `section2-M.xml`, `exercises/exercises2-M.xml`), the PreFigure sources in `src/prefigure/section2-{1,3,4,5,6}/`, the author's interactives in `assets/jslibrary/` and the PDF (pages 47–146). Chapter 1 is merged, so prerequisite edges point into it (`ost rows understanding-linear-algebra concepts --chapter 1`) and to the ids shared with Calculus and Diffy Qs.

The chapter opens on an introduction of two paragraphs and one displayed augmented matrix (`chap2.xml`'s `<introduction>`, no xml:id of its own; built as `ch02/intro/`, module `chap2-introduction`), then runs 2.1 to 2.6.

## The modules

| Section | xml:id | Preview | Activities | Examples | Definition boxes · italic terms | Propositions · other boxes | Figures (environments) | Tables | Sage cells (with code) | Interactives | End exercises (answered) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 2.1 Vectors and linear combinations | sec-vectors-lin-combs | 1 (2.1.1) | 2 (2.1.2, 2.1.3) | 2 (2.1.11, 2.1.13) | 1 (2.1.9) · vector, scalars, linear combination, weights | 1 (2.1.12) · 1 observation (2.1.8) | 14 (2.1.1–2.1.7, 2.1.10, 2.1.14–2.1.19) | 0 | 9 (1) | 1 (2.1.10, linear combinations) | 8 (8) |
| 2.2 Matrix multiplication and linear combinations | sec-matrices-lin-combs | 1 (2.2.1) | 4 (2.2.2–2.2.5) | 3 (2.2.1, 2.2.5, 2.2.7) | 2 (2.2.2, 2.2.6) · shape, identity | 2 (2.2.3, 2.2.4) · 1 observation (2.2.8), 2 assemblages ("Properties of Matrix-matrix Multiplication", "Caution") | 3 (2.2.9 and the two unnumbered answer figures of Exercise 2.2.4) | 0 | 18 (1) | 0 | 13 (13) |
| 2.3 The span of a set of vectors | sec-span | 1 (2.3.1) | 2 (2.3.2, 2.3.3) | 3 (2.3.2, 2.3.5, 2.3.7) | 1 (2.3.1) · span | 2 (2.3.14, 2.3.15) · 1 convention (2.3.9), 1 assemblage ("Terminology") | 8 (2.3.3, 2.3.4, 2.3.6, 2.3.8, 2.3.10–2.3.13) | 0 | 8 (0) | 2 (2.3.3, 2.3.4, span) | 11 (11) |
| 2.4 Linear independence | sec-linear-dep | 1 (2.4.1) | 2 (2.4.2, 2.4.3) | 3 (2.4.1, 2.4.2, 2.4.8) | 1 (2.4.5) · linearly dependent, linearly independent, homogeneous | 3 (2.4.6, 2.4.7, 2.4.9) · 0 | 2 (2.4.3, 2.4.4, each two panels) | 1 (2.4.10) | 5 (0) | 0 | 10 (10) |
| 2.5 Matrix transformations | sec-linear-trans | 1 (2.5.1) | 4 (2.5.2–2.5.5) | 2 (2.5.4, 2.5.5) | 1 (2.5.3) · matrix transformation, composition, state vector, transition function, discrete dynamical system | 2 (2.5.6, 2.5.8) · 0 | 5 (2.5.1, 2.5.2, 2.5.7, 2.5.9, 2.5.10) | 0 | 5 (0) | 0 | 10 (10) |
| 2.6 The geometry of matrix transformations | sec-transforms-geom | 1 (2.6.1) | 3 (2.6.2–2.6.4) | 1 (2.6.4) | 0 · shear, projection, identity (in Activity 2.6.2's solution), translations, homogeneous coordinates | 1 (2.6.3) · 1 assemblage ("Linearity of Matrix Transformations") | 22 (2.6.1, 2.6.2, 2.6.5–2.6.24) | 0 | 1 (0) | 2 (2.6.2, matrix transformation; 2.6.13, the stick figure) | 8 (8) |
| **Chapter** | | **6** | **17** | **14** | **6 boxes** | **11 propositions, 1 convention, 2 observations, 4 assemblages** | **54 environments (63 `<figure>` counting panels)** | **1** | **46 (2)** | **5** | **60 (60)** |

Every preview activity carries the author's answer and solution (2.1.1's solution says the answers are given in the text that follows). Activities 2.1.2 (answer a–g, solution a–h), 2.1.3 and 2.2.2–2.2.5 carry answer and solution; 2.3.2, 2.3.3, 2.4.2, 2.4.3, 2.5.2–2.5.5 and 2.6.2–2.6.4 carry a solution only, so their cards are `open` with the solution. Two Sage cells hold code (the `vector` demonstration of 2.1 and the `A*v` demonstration opening Activity 2.2.3); the other 44 are empty cells for the reader to type into, every one inside an activity or exercise part, dropped under the standing decision with the part keeping the book's words. The book's one footnote is not in this chapter.

## The exercise count report (root rule 13)

Counted from `src/exercises/exercises2-M.xml`.

- End exercises: 60 printed (2.1: 8, 2.2: 13, 2.3: 11, 2.4: 10, 2.5: 10, 2.6: 8); 60 keyed with the author's answer and solution, available now; 0 unkeyed; proposed new: 0.
- Inline: 6 preview activities and 17 activities, 23 inline Try Its, every part answered or solved by the author.
- The standing choice (`$BOOK/RULES.md`, standing decision 2): the book's answers key all 60; no AI solution is needed in this chapter; no new exercises are written. Bloom levels and concept tags are AI-judged.

## Figures in book order

| Number | Draws | Sits in | Kind |
|---|---|---|---|
| 2.1.1 | the vector v = [2, 1] as an arrow from the origin (`vector-u`) | running text | PreFigure |
| 2.1.2, 2.1.3, 2.1.4 | an empty 6 × 6 coordinate grid (`empty-6.svg`, one file three times) | Preview Activity 2.1.1's tasks (a), (c), (d) | PreFigure, worksheet grid |
| 2.1.5 | v = [2, 1] and its scalar multiples on one line (`scalar-mult`) | running text | PreFigure |
| 2.1.6 | two panels: v, w and v + w tip to tail (`vector-addition-a`); the parallelogram with the sum as its diagonal (`vector-addition-b`) | running text | PreFigure |
| 2.1.7 | the vectors cv + w for several c, their tips on a line through w parallel to v (`line-param`) | running text | PreFigure |
| 2.1.10 | the author's interactive: v = [2, 1], w = [1, 2], sliders c, d, the combination cv + dw and the grid of combinations (`linearcomb.js`, preview `linearcomb-preview.png`) | Activity 2.1.2's statement | interactive |
| 2.1.14 | v = [−1, 1] and w = [2, −2] on one line (`lin-comb-ex`) | Example 2.1.13 | PreFigure |
| 2.1.15, 2.1.16, 2.1.17 | an empty 6 × 6 grid (`empty-6.svg`) | Exercise 2.1.1's parts (a), (c), (d); its answer shows the author's drawn sketches `ex2-1-1-a.svg`, `ex2-1-1-b.svg`, unnumbered | worksheet grid; answer images |
| 2.1.18 | v, w, the skewed grid of their combinations and seven labelled points p … v on it (`ex-linear-combs-2-1.svg`) | Exercise 2.1.2's statement | the author's drawing |
| 2.1.19 | two panels: the Cartesian grid with e₁, e₂ and the point (2, −3); the skewed grid of v₁ = [2, 1], v₂ = [1, 2] with the point {2, −3} (`ex-coord-std-2-1.svg`, `ex-coord-nonstd-2-1.svg`) | Exercise 2.1.8's statement | the author's drawings |
| 2.2.9 | two vectors v₁, v₂ on a grid of their combinations (`ex-matrix-cols-2-2.svg`) | Exercise 2.2.4's statement; its answer shows `ex-matrix-cols-sol-2-2.svg` with the three products marked, unnumbered, twice (answer and solution) | the author's drawing; answer image |
| 2.3.3 | the author's interactive: v = [1, 2], w = [−2, −4], sliders c, d, the combination on a line (`span1.js`, `span1-preview.png`) | Activity 2.3.2 (a) | interactive |
| 2.3.4 | the author's interactive: v = [2, 1], w = [1, 2], the combinations filling the plane (`span2.js`, `span2-preview.png`) | Activity 2.3.2 (b) | interactive |
| 2.3.6 | v = [2, 0], w = [−1, 1] and the grid of their combinations (`span-linear-indep`) | Example 2.3.5 | PreFigure |
| 2.3.8 | v = [−1, 1], w = [2, −2] on one line with their combinations (`span-linear-dep`) | Example 2.3.7 | PreFigure |
| 2.3.10, 2.3.11 | empty three-dimensional axes (`coordinates-3d.svg`, one file twice) | Activity 2.3.3's tasks (a), (b) | worksheet axes (3D) |
| 2.3.12 | a vector [−2, 3, 1] in ℝ³ and the line it spans (`3d-line`) | running text | PreFigure (3D) |
| 2.3.13 | v₁ = [−2, 3, 1], v₂ = [1, −1, 3] in ℝ³ and the plane they span (`3d-plane-nonstd`) | running text | PreFigure (3D) |
| 2.4.3 | two panels: v₁, v₂ of Example 2.4.1 and their plane (`3d-plane-nonstd`); the same with v₃ out of the plane (`3d-plane-span-no-w`) | running text | PreFigure (3D) |
| 2.4.4 | two panels: w₁, w₂ of Example 2.4.2 and their plane (`3d-plane-nonstd-w`); the same with w₃ inside the plane (`3d-plane-span-yes-w`) | running text | PreFigure (3D) |
| 2.5.1 | an empty 4 × 4 grid (`empty-4.svg`) | Preview Activity 2.5.1 (d); its answer shows `ex-graph-x-squared.svg` | worksheet grid; answer image |
| 2.5.2 | two empty 4 × 4 grids | Preview Activity 2.5.1 (e), (f); the answers show `ex-graph-2x.svg`, `ex-graph-fracx.svg` | worksheet grids; answer images |
| 2.5.7 | two panels: three vectors, v = [−2, −1] among them (`two-dim-basis`); the same rotated 90° counterclockwise (`two-dim-basis-rotate`) | Activity 2.5.3 (a) | PreFigure |
| 2.5.9 | two panels: the same three vectors; the same rotated 180° (`two-dim-basis-180`) | Activity 2.5.4 (a), part 3 | PreFigure |
| 2.5.10 | three vectors v₁, v₂, v₃ in the plane, the images T(eⱼ) (`ex-linear-trans-2-5.svg`) | Exercise 2.5.4's statement | the author's drawing |
| 2.6.1 | a vector x and its reflection T(x) across the horizontal axis (`reflect-intro`) | Preview Activity 2.6.1's statement | PreFigure |
| 2.6.2 | the author's interactive: the unit grid, the unit square and a figure on the left, their images under an editable 2 × 2 matrix on the right (`mult.c.js`, `mult-preview.png`) | Activity 2.6.2's statement | interactive |
| 2.6.5 | two panels: a vector x; its rotation by 45° (`45-rotation-a`, `45-rotation-b`) | Example 2.6.4 | PreFigure |
| 2.6.6 | two panels: v and cv; T(v) and T(cv) (`45-rotation-linear-a-a`, `-a-b`) | Example 2.6.4 | PreFigure |
| 2.6.7 | two panels: the parallelogram of v, w and v + w; its rotation (`45-rotation-linear-b-a`, `-b-b`) | Example 2.6.4 | PreFigure |
| 2.6.8 | two panels: e₁, e₂; T(e₁), T(e₂) (`45-rotation-basis-a`, `-b`) | Example 2.6.4 | PreFigure |
| 2.6.9 | T(e₁) as the hypotenuse of a right isosceles triangle with legs 1/√2 (`45-rotation-e1`) | Example 2.6.4 | PreFigure |
| 2.6.10 | two photographs: a Pixar test character in its bind pose and leaning to one side (`char-bind.jpg`, `char-mvt.jpg`, © Disney/Pixar) | running text | photograph |
| (unnumbered) | the stick-figure character (`animate-char`) | running text, before 2.6.11 | PreFigure |
| 2.6.11 | the character translated two units right and one up (`animate-translate`) | running text | PreFigure |
| 2.6.12 | the plane z = 1 inside ℝ³ with the character on it (`animate-homogeneous`) | running text | PreFigure (3D) |
| 2.6.13 | the author's interactive: the character under an editable 3 × 3 homogeneous-coordinate matrix with a Compose button (`animate.js`, `animation-preview.png`) | Activity 2.6.4 (a) | interactive |
| 2.6.14 | two panels: the character; translated (`animate-char`, `animate-translate`) | Activity 2.6.4 (b) | PreFigure |
| 2.6.15 | two panels: the character; reflected in the vertical axis (`animate-reflect`) | Activity 2.6.4 (c) | PreFigure |
| 2.6.16 | four panels: the character rotated 45°, 90°, 135°, 180° (`animate-rotate-a` … `-d`) | Activity 2.6.4 (d) | PreFigure |
| 2.6.17 | four panels: the character; translated down one, down two, then enlarged by two (`animate-closeup-a` … `-c`) | Activity 2.6.4 (e) | PreFigure |
| 2.6.18 | four panels: the character; sheared, then compressed vertically twice (`animate-shadow-a` … `-c`) | Activity 2.6.4 (f) | PreFigure |
| 2.6.19 | e₁, e₂, e₃ on three-dimensional axes (`3d-basis-2-6.svg`) | Exercise 2.6.3's statement | the author's drawing (3D) |
| 2.6.20 | four panels: a vector based at (1, 2), translated to the origin, rotated 90°, translated back (`ex-rotate-about-p-a` … `-d`) | Exercise 2.6.5's statement | the author's drawings |
| 2.6.21 | two panels: x = [2, 3]; its shadow on the x-axis (`v-projection-a`, `-b`) | Exercise 2.6.6's statement | the author's drawings |
| 2.6.22 | a vector [a, b] with its length r and angle θ (`ex-complex-polar.svg`) | Exercise 2.6.7 (d) | the author's drawing |
| 2.6.23 | the line L_θ, a vector x and its reflection (`ex-reflection-def.svg`) | Exercise 2.6.8's statement | the author's drawing |
| 2.6.24 | four panels: x and L_θ; rotated by −θ; reflected in the horizontal axis; rotated back (`ex-reflection-compose-a` … `-d`) | Exercise 2.6.8 (a) | the author's drawings |

Sketches to replace (root rule 14): every PreFigure diagram in running text and in an example is a picture of a computation and is drawn live with the book's vectors as defaults and the author's SVG behind the toggle (`media/ch02/`). The worksheet grids 2.1.2–2.1.4, 2.3.10, 2.3.11, 2.5.1, 2.5.2 and the exercise grids 2.1.15–2.1.17 hold nothing but empty axes and are dropped; their parts keep the book's words, and a preview or activity part that asks for a sketch cites the section's Sim where one draws the scene (2.1.2–2.1.4 cite the rebuilt 2.1.10; 2.3.10, 2.3.11 cite the 3D span figure with v = [1, 2, 1] and e₁, e₂ as presets). The answer images of 2.1.1, 2.2.4 and 2.5.1 are the author's drawings inside answers and stay in the cards' solutions as images, unnumbered. Figures inside exercise statements (2.1.18, 2.1.19, 2.2.9, 2.5.10, 2.6.19–2.6.24) are faithful copies in the cards, the author's SVGs at `/media/ch02/`; a card's `figure` takes one image, so 2.1.19, 2.6.20, 2.6.21 and 2.6.24 compose their panels into one image or take the panel that holds the others.

Folds (the plan decides, these are the candidates): `2.1.1 + 2.1.5` (one vector and its scalar multiples on a slider c, c = 1 being 2.1.1); `2.3.3 + 2.3.4` (the two span interactives are one Sim with the pair of vectors as a choice, the 3Blue1Brown sweep); `2.3.12 + 2.3.13` (the span of one, two or three vectors in ℝ³ as a line, a plane or the space, the count as a choice; mathematical 3D); `2.4.3 + 2.4.4` (the plane of two vectors with the third in or out of it, the two triples as a choice; mathematical 3D); `2.5.7 + 2.5.9` (the three vectors rotated by 90° or 180°, the angle as a choice); `2.6.5 + 2.6.6 + 2.6.7 + 2.6.8` (the 45° rotation of a vector, of a scalar multiple, of a parallelogram and of e₁, e₂, as choices of what is rotated); `2.6.11 + 2.6.13 + 2.6.14 + 2.6.15 + 2.6.16 + 2.6.17 + 2.6.18` (the rebuilt stick-figure Sim with the book's poses as presets and a Compose control). 2.3.6 and 2.3.8 are the same scene in two different examples and stay two figures, each still and live.

Photographs: one, Figure 2.6.10, the Pixar test character. The text reads from it ("On the left is the original definition of the character; on the right…"), so it is kept by the rule, but the two images are © Disney/Pixar and not under the book's CC BY licence: the row keeps its number and caption and sets `withheld`, and no image is served. Nothing else in the chapter is a photograph.

The author's interactives in this chapter (5 of the book's 14): linear combinations (2.1.10, `linearcomb.js`), span (2.3.3 `span1.js`, 2.3.4 `span2.js`), the matrix transformation of the plane (2.6.2, `mult.c.js`; the book's own exploration names this "matrix multiplication in 2.2", but the source places it in Activity 2.6.2 and Section 2.2 holds no interactive) and the stick figure (2.6.13, `animate.js`). Each is rebuilt as a Sim that is the Figure with that number, the preview PNG its original.

The 3Blue1Brown survivors of `$BOOK/exploration.md` that fall here: 1 (the grid under a transformation, built in 2.6 as the rebuilt 2.6.2 with e₁ and e₂ landing on the columns and the book's eight matrices of Activity 2.6.2 as choices), 2 (matrix multiplication as composition, built in 2.5 beside Proposition 2.5.8, the 90° rotation twice and the bakery chain as choices, the order swapped), 5 (span as the sweep of combinations, built in 2.3 as the rebuilt 2.3.3 + 2.3.4 and the 3D fold 2.3.12 + 2.3.13, and in 2.4 as 2.4.3 + 2.4.4), 10 (weak; non-square matrices as maps between dimensions, 2.5, built only if 2.5's plan finds the bakery's T: ℝ² → ℝ³ opens a view the square case does not).

## What is new in the chapter

Vectors, components, dimension and ℝᵐ, scalars, scalar multiplication and vector addition and their geometry, vectors as points, the line cv + w, the commutative and distributive properties, linear combinations and weights, and the equivalence of "is b a linear combination" with "is the system consistent" (2.1). The columns of a matrix as vectors, the shape m × n, scalar multiplication and addition of matrices, the identity matrix, the matrix-vector product as a linear combination of columns and its row shortcut, the zero vector, linearity, the matrix equation Ax = b and its three readings, the solution space in vector form, the matrix-matrix product, the shape of a product, associativity and distributivity, and the failures of commutativity, cancellation and zero divisors (2.2). The span, its notation and terminology, the walking picture, spans in ℝ³ as a line, a plane or the space, span and pivot rows, and the count of vectors needed to span (2.3). Linear dependence and independence, a dependent vector adding nothing to the span, independence and pivot columns, the size of an independent set, the homogeneous equation, the five equivalent conditions, and the comparison of span with independence (2.4). Matrix transformations T(x) = Ax with T: ℝⁿ → ℝᵐ, the standard vectors eⱼ, the columns of A as T(eⱼ), composition as the product BA, state vectors, transition functions and discrete dynamical systems (2.5). Geometric operations as matrix transformations (reflections, stretches, rotations, shear, projection, identity), the rotation matrix, linearity as the characterisation of matrix transformations, composing geometric operations, computer animation, translations and homogeneous coordinates (2.6).

Ids reused from Calculus and Diffy Qs where the book states the same thing (`ost find calculus …`, `ost find diffyqs …`, standing decision 8): `vector`, `scalar`, `scalar-multiplication`, `vector-addition`, `properties-of-vector-operations`, `vector-equation-of-a-line` and `zero-vector` (Calculus 12.1, 12.5); `euclidean-space`, `linear-combination`, `matrix-addition`, `scalar-multiplication-of-a-matrix`, `identity-matrix`, `matrix-product-as-linear-combination` (the book's Definition 2.2.2, a definition here), `matrix-vector-product` (the row shortcut, a result here), `matrix-product`, `rules-of-matrix-algebra`, `noncommutativity-of-matrix-multiplication` (the "Caution" box), `span`, `linear-independence-of-vectors`, `homogeneous-matrix-equation`, `linear-mapping` (the book's matrix transformation), `standard-unit-vectors`, `matrix-of-a-linear-mapping`, `matrix-product-as-composition` (Diffy Qs 2.1, 3.2, A.1–A.3). Each is staged as a concept of this book with the section that introduces it here. The rest are this book's own and canonical from now on; `discrete-dynamical-system`, `state-vector` and `transition-function` are coined here for 2.5 (the book's exploration listed `dynamical-system` without a section; Chapter 4's prep reuses these).

## Exercises that belong to another section

None is held. 2.1.8 (a non-standard coordinate system) previews 3.2 but tests linear combinations and stays. 2.2.7 (row operations as matrix products) previews 5.1 and 2.2.8 (the inverse of a 2 × 2 matrix) previews 3.1; both test the matrix product and the identity and stay in 2.2. 2.2.11 says "homogeneous" before 2.4 defines it (as 1.4.8 did) but tests linearity and the vector form of a solution space; 2.2.12 and 2.2.13 (bicycles) are a discrete dynamical system with an eigenvector preview, but test Ax and linearity; all stay in 2.2. 2.6.4 says "inverse" (3.1's concept) and tests composition and the geometric matrices; 2.6.7 (the matrices a, −b; b, a) previews 4.4; both stay in 2.6.

## The chapter's answer to root rule 23

The chapter's objects are arrows, the grids they weave and the plane carried by a matrix; every one can be dragged.

- 2.1: a vector with a draggable head and a slider c showing the scalar multiples lying on its line; two vectors, the sum walked tip to tail and drawn as the parallelogram's diagonal; the line cv + w traced as c runs; the author's linear-combinations interactive rebuilt with sliders c, d, the parallelogram grid and Activity 2.1.2's targets ([3, 0], [1.3, −1.7]) as detents.
- 2.2: the matrix–vector product as the combination of columns drawn as tip-to-tail steps along the columns, the components of x on sliders and the row shortcut in the readout; the composition Sim is 2.5's.
- 2.3: span as the sweep: c v + d w drawn as the sliders run, the tips filling a line (w on v's line) or the plane, the two pairs of Activity 2.3.2 and the examples as presets; in ℝ³, one, two or three vectors whose span is a line, a plane or the space, turned by the reader.
- 2.4: the plane of two vectors in ℝ³ with a third vector in or out of it, the two triples of Examples 2.4.1 and 2.4.2 as presets, the readout counting the pivot positions.
- 2.5: the three vectors rotated by 90° and 180° as a choice; two transformations applied one after the other, the grid morphing twice and the product's columns shown as where e₁, e₂ end up, the order swapped to show BA ≠ AB; the truck fleet's state vector walking as bars under the transport, x_k = A^k x_0.
- 2.6: the unit grid and the unit square carried to their images by an editable 2 × 2 matrix with Activity 2.6.2's eight matrices as choices, e₁ and e₂ landing on the columns; the 45° rotation of a vector, a multiple, a parallelogram and the standard vectors; the stick figure under an editable homogeneous-coordinate matrix with the book's poses (translate, reflect, cartwheel, zoom, shadow) as presets and a Compose control; the plane z = 1 inside ℝ³.

Only the dynamical system of 2.5 has a time in it (the state walks day by day; the transport runs the days). Every other figure is still, with sliders, choices or draggable heads; three scenes are mathematical 3D (2.3.12 + 2.3.13, 2.4.3 + 2.4.4, 2.6.12).
