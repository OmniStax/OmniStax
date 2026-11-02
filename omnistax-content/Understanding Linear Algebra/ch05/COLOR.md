# Chapter 5 colour

Refines the book's `COLOR.md`; no new hue. Prepared 2026-11-02 with `config.md`.

## By root rule 7's four ways

1. Facts: none. No figure of the chapter draws a colour that means anything by its nature.
2. Conventions: none.
3. Referents: the two lines of 5.1's partial-pivot drawing, which the text names apart ("the equation 0.0001x + y = 1, which is a nearly horizontal line", "the equation x + y = 2 … the slope of the associated line is −1"), as 1.1 named its lines; the eigenvectors v₁ and v₂ of 5.2 where one figure draws both and the text names them apart ("stretched by a factor of 3 in the v₁ direction and not at all in the v₂ direction"). No other referent: the iterates x_k of the power method are one sequence, told apart by their index labels, not referents; the four eigenvalues on the number line are told apart by their subscripts and positions.
4. Categories: `vector` for every arrow and its bold letter (x, b, b₁, b₂, c, x₀, x_k, x₁, x₂, x₃, the normalized x̄_k, x̄₁, x̄₂, x̄₃, v, v̄, v₁, v₂, w, q); `matrix` for A, A₁, A₂, A₃, A′, E₁, E₂, E₃, L, U, P, B, C, I, A⁻¹, L⁻¹, U⁻¹ and Aᵏ wherever a figure or a readout draws one as a whole, and for the image of a vector under a matrix where a figure draws v and Av together (Av̄ beside v̄); in the LU Sim the entries of L and U as they fill in wear `matrix`, the vectors b, c, x `vector`; `region` for the eigenspaces E₁ and E₃ of 5.2 and for the eigenvector line E_{λ₁} the normalized vectors approach in the power-method Sim (drawn thin and long, v₁ on it in `vector`), and for Nul and Col in 5.1's text; `eigenvalue` for λ, λ₁, λ₂, λ₃, λ₄ in every readout and for the ticks that mark them on the number line of Figure 5.2.3, the found eigenvalue lighting up in `eigenvalue` as s approaches it. The coordinate grid, the unit square of the normalized panel (the book's gray square) and the number line itself are ink; the shaded ranges of Figure 5.2.3 are muted ink, not a category, since an interval of possible eigenvalues is not a subspace. Symbols: `\kvecx`, `\kvecb`, `\kvecbone`, `\kvecbtwo`, `\kvecc`, `\kvecxzero`, `\kvecxk`, `\kvecxone`, `\kvecxtwo`, `\kvecxthree`, `\kvecxkbar`, `\kvecxonebar`, `\kvecxtwobar`, `\kvecxthreebar`, `\kvecv`, `\kvecvbar`, `\kvecvone`, `\kvecvtwo`, `\kvecw`, `\kvecq` wear `vector`; `\kA`, `\kAone`, `\kAtwo`, `\kAthree`, `\kAprime`, `\kEone`, `\kEtwo`, `\kEthree` (in 5.1), `\kL`, `\kU`, `\kP`, `\kB`, `\kC`, `\kI`, `\kAinv`, `\kLinv`, `\kUinv`, `\kAk` wear `matrix`; `\kEone`, `\kEthree` (in 5.2), `\kNul`, `\kCol` wear `region`; `\klambda`, `\klambdaone`, `\klambdatwo`, `\klambdathree`, `\klambdafour` wear `eigenvalue`.

Untyped, in ink: the multipliers m and m_k; the shift s; the step counts k and N; the size n; the unknowns x and y of Activity 5.1.2's system; the components c₁, c₂, c₃ of c and the weights c₁, c₂ of x₀ = c₁v₁ + c₂v₂ (`c_i`); the entries a, b, c, d of Exercise 5.1.7; the number of digits a computer keeps; det and dim.

## Referents planned per figure

| Section | Figure | Referents |
|---|---|---|
| 5.1 | `sim-partial-pivot-lines` (the unnumbered lines drawing, a Sim with no number) | `line-1`, `line-2`: the first equation's line (0.0001x + y = 1, nearly horizontal) and the second's (x + y = 2, slope −1), named apart in the two paragraphs beside the drawing; the solution point and the error band in ink |
| 5.1 | `sim-lu-steps` (a Sim with no number, Example 5.1.1 stepped) | none: A, E₁, E₂, E₃, L, U `matrix` told apart by their labels, b, c, x `vector` |
| 5.1 | a three-digit computer Sim, if the plan builds it | none: the two orderings are two panels labelled by their first equation; x and y in ink |
| 5.2 | `sim-power-method` (the fold of the two unnumbered drawings of Example 5.2.2) | `v-1`, `v-2`: the eigenvectors v₁ and v₂ the text names apart, the rows of `v_1_vec`, `v_2_vec` of 5.2 set `ref` by the section agent; x₀ and the iterates x_k, x̄_k `vector` with their index labels (at most four drawn, hover names beyond); the eigenvector line `region`; λ₁ and m_k in the readout `eigenvalue` and ink |
| 5.2 | `sim-eigenvalue-line` (Figure 5.2.3) | none: λ₁ … λ₄ `eigenvalue`, told apart by subscript and position; s in ink; the shaded ranges muted |

Two groups wear referent colours in this chapter, the lines of 5.1 and the eigenvector pair of 5.2; they share no figure or block, so they reuse the same two colours.
