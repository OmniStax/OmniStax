# Understanding Linear Algebra colour plan

The rule is root `RULES.md` item 7. This file records what is particular to this book: its categories, its variants, and the facts and referents it draws. A chapter's `COLOR.md` may refine it, never inventing a hue.

## Categories, in palette order

A category here is a role an object plays, as in Calculus and Diffy Qs, whose ids this book shares wherever the role is the same, since the books link to each other: the test is whether the thing would be its own type in a formal library (a vector in ℝⁿ, an m × n matrix, a subspace of ℝⁿ, a scalar invariant of a matrix, a point of a data set, a path through a phase plane).

| Order | Type id | The book's objects | Why it is a type |
|---|---|---|---|
| 1 | `vector` | **v**, **w**, **x**, **b**, the columns of a matrix, **e**₁ and **e**₂, an eigenvector, a residual **b** − **b̂**, a principal component, a basis vector of a coordinate system | Every page draws vectors as arrows; the arrow and its bold letter are one colour |
| 2 | `matrix` | A, B, P, D, Q, U, Σ, V, the transformation T(**x**) = A**x**, a reduced row echelon matrix, A⁻¹, Aᵀ | The matrix is what acts; its image of the grid is the picture of Chapters 2–4 and 7 |
| 3 | `region` | Span{**v**, **w**}, a subspace, Col(A), Nul(A), an eigenspace, W and W⊥, the solution set of a system drawn as a line or a plane | A shaded set the vectors live in, drawn beside them |
| 4 | `eigenvalue` | λ, the singular values σ, the variance along a direction | Read off the readout and matched to its line or axis in the figure |
| 5 | `point` | a data point of a least-squares fit or a PCA, a pixel, a state in a phase portrait at one time | Dotted, not drawn as arrows |
| 6 | `curve` | a trajectory of a dynamical system **x**ₖ₊₁ = A**x**ₖ, a fitted curve | A path through the plane, not a graph over an axis |

The order keeps the types of Chapters 1–3 (vector, matrix, region) farthest apart, then eigenvalue (Chapter 4), point and curve (Chapters 4, 6, 7). `npm run colours:default -- understanding-linear-algebra` assigns the default colours from the pages built; it is rerun after each chapter pass.

Untyped, in ink: a scalar weight c₁, c₂ of a linear combination, a coordinate or component, an entry a_ij, the unknowns x, y, z or x₁ … xₙ of a system, a dimension m, n, the rank as a number, a probability of a Markov chain, a pixel value, the parameter t of a line.

Two decisions worth naming. `region` carries the span and the subspaces because the book's central picture from 2.3 on is the set of all linear combinations drawn as a line or a plane with the vectors inside it, and the reader must tell the set from the vectors that generate it. `point` is separate from `vector` because the data chapters draw hundreds of points that are not arrows; a point and the vector to it are the same numbers in two roles, and the readout names which.

## Variants and decoration

A variant shares the hue: Aᵀ and A⁻¹ are matrices; **b̂** beside **b** is a vector drawn solid where **b** is dashed; an eigenvector line is a vector's direction drawn thin and long; W⊥ beside W is a region drawn hatched. The image of the unit grid under A is drawn in `matrix`'s hue, the original grid in ink.

## Conventions

None. The author's diagrams fix no colour of their own beyond red, blue and gray for distinct vectors, which OmniStax replaces by the types and referents.

## Facts

The JPEG chapter (3.3) and the colour interactives (RGB, YCbCr, HSV in 3.3 and 7.5) draw colour as the fact: a pixel's colour, a chrominance plane, a hue wheel are drawn in their real colours through `F.fact`, and a greyscale block is one scalar on one scale with its legend.

## Referents

Two or three vectors of one example that the text names apart (**v**₁, **v**₂, **v**₃ of a span, the columns of A, the two basis vectors of a coordinate system, the two data clusters of 6.1); the lines of a system in 1.1 (the three lines that do not meet); the species of 7.3's iris data. A referent's quantity keeps its category: **v**₁ wears `vector`, its subscript the referent's colour.
