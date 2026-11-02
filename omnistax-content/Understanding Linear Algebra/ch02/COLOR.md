# Chapter 2 colour

Refines the book's `COLOR.md`; no new hue. Prepared 2026-11-02 with `config.md`.

## By root rule 7's four ways

1. Facts: none. The author's diagrams colour nothing by its nature; the Pixar photograph of 2.6.10 is withheld.
2. Conventions: none.
3. Referents: the two or three subscripted vectors of one example that the text names apart (below). An unsubscripted pair such as v and w is not a referent pair: both wear `vector` in prose and in a figure, told apart by their labels and hover names, since nothing in the symbol could carry a second colour.
4. Categories: `vector` for every arrow and its bold letter (v, w, u, b, x, 0, the columns v₁ … vₙ and w₁ … wₙ, e₁, e₂, e₃, eⱼ, the state vectors xₖ and x₀) and for the sum, the scalar multiple and the linear combination drawn as arrows; `matrix` for A, B, C, I, Iₙ, Aᵏ wherever a figure or a readout draws one as a whole, for the transformations T, S, R, and for the image of anything under a transformation: the image of the unit grid and the unit square (2.6.2), the images T(v), T(cv), T(v + w), T(e₁), T(e₂) of the 45° rotation and of the 90° and 180° rotations (2.5.7, 2.5.9, 2.6.5–2.6.9), the character's new pose (2.6.13 and its presets), while the original grid, the original pose and the character are ink and the original vectors `vector`; `region` for a span drawn as a line or a plane (2.3.3 + 2.3.4 when the combinations fill a line or the plane, 2.3.6, 2.3.8, 2.3.12 + 2.3.13, 2.4.3 + 2.4.4), for the line of vectors cv + w (2.1.7) and for the solution space of Example 2.2.5 if a figure draws it. Symbols: `\kvecv`, `\kvecw`, `\kvecu`, `\kvecb`, `\kvecx`, `\kveczero`, `\kvecvi`, `\kvecvone` … `\kvecvthree`, `\kvecwi`, `\kvecwone` … `\kvecwthree`, `\kvecej`, `\kveceone` … `\kvecethree`, `\kvecxk`, `\kvecxzero` wear `vector`; `\kA`, `\kB`, `\kC`, `\kI`, `\kIn`, `\kAk`, `\kT`, `\kS`, `\kR` wear `matrix`; `\kSpan` wears `region`.

Untyped, in ink: the scalars c, d and the weights c₁ … cₙ, the components x₁ … xₙ of x and x, y of a point or vector in the plane, the dimensions m, n, p, the step count k, the angle θ, the entries of every matrix (a, b, c, d, e, f of the homogeneous-coordinate matrix included), ℝᵐ, and the parameter k of Exercises 2.1.6 and 2.4.9. The grid of a coordinate plane is ink; the skewed grid of linear combinations (2.1.10, 2.1.18, 2.3.6) is ink too, since it is the lattice the two vectors weave and not a set in its own right, unless the figure fills the span, which is then `region`.

## Referents planned per figure

| Section | Figure | Referents |
|---|---|---|
| 2.1 | `sim-vector-scalar-multiples` (Figures 2.1.1 + 2.1.5), `sim-vector-sum` (2.1.6), `sim-line-of-vectors` (2.1.7), `sim-linear-combinations` (2.1.10), `sim-vectors-on-a-line` (2.1.14) | none: v and w both `vector`, labelled; the combination cv + dw `vector`, its walk along v then along w in ink; the line of 2.1.7 and of 2.1.14 in `region` |
| 2.2 | a Sim of the matrix-vector product as steps along the columns, if the plan builds it | `column-1`, `column-2`, …: the columns v₁, v₂ of A that the walk follows, the text's "the first column", "the second column" of the row-shortcut paragraph marked `data-ref`; the variables rows of `v_1_vec`, `v_2_vec` set `ref` |
| 2.3 | `sim-span` (Figures 2.3.3 + 2.3.4), `sim-span-plane` (2.3.6), `sim-span-line` (2.3.8) | none: v, w `vector`; the span `region` |
| 2.3 | `sim-span-in-space` (Figures 2.3.12 + 2.3.13, 3D) | `v-1`, `v-2`, `v-3`: the vectors v₁, v₂ (and the third of the ℝ³ list) whose span is drawn; the span `region`; the rows of `v_1_vec`, `v_2_vec`, `v_3_vec` set `ref` |
| 2.4 | `sim-third-vector` (Figures 2.4.3 + 2.4.4, 3D) | `v-1`, `v-2`, `v-3` for Example 2.4.1's triple and `w-1`, `w-2`, `w-3` for Example 2.4.2's; the plane Span{v₁, v₂} or Span{w₁, w₂} in `region`; the rows of `v_1_vec` … `w_3_vec` set `ref`; the two triples are one group since they share the figure, so six colours in distinct families |
| 2.5 | `sim-rotated-vectors` (Figures 2.5.7 + 2.5.9) | none: the three vectors `vector` (v labelled, the others carried by hover names), their rotations `matrix` |
| 2.5 | the composition Sim (survivor 2) and a dynamical-system Sim, if built | none: the grid's two images in `matrix` told apart by decoration (the first dashed), the bars of the state vector `vector`; the two warehouses P and Q are labels, not referents, unless the plan draws each bar in its own colour, in which case `warehouse-p`, `warehouse-q` |
| 2.6 | `sim-matrix-transformation` (Figure 2.6.2), `sim-rotation-45` (2.6.5 + 2.6.6 + 2.6.7 + 2.6.8), `sim-rotation-triangle` (2.6.9), `sim-reflection` (2.6.1) | none: originals `vector` or ink, images `matrix`; the unit square's outline ink and its image `matrix` |
| 2.6 | `sim-homogeneous-plane` (Figure 2.6.12, 3D), `sim-stick-figure` (2.6.11 + 2.6.13 + 2.6.14 … 2.6.18) | none: the character ink, its pose under the matrix `matrix`, the plane z = 1 `region` |

Two groups wear referent colours in this chapter, the three vectors of 2.3's space figure and the six of 2.4's; they never share a block, so they may reuse colours. Where a figure draws two or three things of one kind that labels cannot keep clear at every slider position, hover names carry the labels (root rule 26.7).
