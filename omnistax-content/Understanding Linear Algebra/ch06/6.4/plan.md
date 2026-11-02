# Plan: 6.4 Finding orthogonal bases (`sec-gram-schmidt`)

Source: `source.md` from `tools/convert.py 6.4`. Status: planned and built 2026-11-02 straight through (chapter config 1) by claude-opus-5-5 at high effort; templates `ch01/1.2` (cards, conventions), `ch05/5.1` (a story slider on the transport), `ch02/2.4` (a plane in `F.space3d`), `ch02/2.1` (draggable heads).

The book prints: an unheaded introduction (two paragraphs, the projection formula and b̂ = QQᵀb recalled); the subsection Introduction holding only Preview Activity 6.4.1 with Figure 6.4.1 and the worksheet grid 6.4.2; Gram-Schmidt orthogonalization (Figure 6.4.3, Activity 6.4.2, Example 6.4.4, the general algorithm, Activity 6.4.3); QR factorizations (Activity 6.4.4, Proposition 6.4.5 "QR factorization", Example 6.4.6, Activity 6.4.5); Summary (a sentence and three bullets); Exercises 6.4.1–6.4.8, all keyed. Nine Sage cells: two with code (the `orthogonality.py` loads of Activities 6.4.3 and 6.4.5), seven empty.

## Sub-concepts (page headers)

`opening` **Orthogonal bases from any basis** (OmniStax's header for the unheaded introduction: `p#projection-formula-recalled` with its display, `p#orthonormal-more-convenient`, `p#forming-orthogonal-bases`); `introduction` **Introduction** (the book's: Figure 6.4.1 `sim-gram-schmidt-plane`, Preview Activity 6.4.1 inline after it); `gram-schmidt-orthogonalization` **Gram-Schmidt orthogonalization** (`p#gram-schmidt-named`, Figure 6.4.3 `sim-gram-schmidt-space`, `p#gram-schmidt-works`, Activity 6.4.2 after it, `p#gram-schmidt-illustrated`, `div#example-gram-schmidt` (Example 6.4.4), `p#gram-schmidt-general` with the algorithm's display, `p#orthonormal-from-orthogonal`, Activity 6.4.3 after it); `qr-factorizations` **$QR$ factorizations** (`p#qr-intro`, Activity 6.4.4 after it, `p#qr-from-gram-schmidt`, `div#prop-qr` (Proposition 6.4.5 · $QR$ factorization), `div#example-6-4-6`, `p#qr-value`, Activity 6.4.5 after it, `p#sage-qr`). The Summary's sentence and bullets are `summary_html`; the Exercises go to the Exercises system. The two Sage loads stay as code in their cards (config 3, 4); the seven empty cells are dropped.

## Concepts (merged by the prep, 4 introduced)

One `introduces` row each (config 18): `gram-schmidt-process` (`p#gram-schmidt-named`, the italic "Gram-Schmidt orthogonalization" beside its index entry; `p#gram-schmidt-general` reinforces it, `p#orthonormal-from-orthogonal` reinforces it with the normalization); `gram-schmidt-preserves-the-span` (`example-gram-schmidt`); `qr-factorization` (`p#qr-from-gram-schmidt`; `prop-qr` reinforces); `finding-a-qr-factorization` (`example-6-4-6`).

Uses: `projection-onto-a-subspace` (the opening's display, linked to 6.3's `prop-proj-formula`), `orthonormal-basis`, `projection-matrix` (b̂ = QQᵀb), `orthogonal-basis`, `basis-of-a-subspace`, `orthogonal-projection` (`p#gram-schmidt-named`, the figures), `orthogonal-vectors`, `vector-projection` (Figure 6.4.1), `span`, `linear-combination`, `unit-vector`, `normalization`, `column-space`, `linear-independence-of-vectors`, `triangular-matrix`, `orthonormal-columns-give-identity`, `least-squares-problem` is not named here (6.5's "least-squares problems" in `p#qr-value` is a forward reference, left plain).

## Colour and referents

Types on the page: `vector` (every bold letter and arrow), `matrix` (A, Q, Qᵀ, R, P, I and the readout's Q and R), `region` (W, W₁, W₂, Col(A), Span{…}, the line W₁ and the plane W₂ in the figures). Q is written `\kQ`, R `\kR` (the 6.4 row, `redefines`), Qᵀ `\kQT`, Rᵀ as `\kR^T`; a vector with no macro of its own (r₁, a₁) is `\htmlClass{kv-vector}{…}`.

Referents (chapter `COLOR.md`): `v-1`, `v-2`, `v-3`, the basis vectors by index. In both figures vⱼ, its shadow v̂ⱼ, wⱼ and uⱼ wear the colour of index j, told apart by label and decoration (vⱼ faint once wⱼ stands, v̂ⱼ dashed beside its drop); the symbols' subscripts carry the same colours through the variables rows' `ref` (wanted at chapter level). The text marks with `data-ref` the vectors of Example 6.4.4 in its own prose (the example Figure 6.4.3 steps through) and the captions' mentions; the generic v₁, …, vₙ of the algorithm wear only the macro colours. b, b̂ and b − b̂ of Figure 6.4.3's first stop are `vector` (b̂ solid, b − b̂ with a right-angle mark).

## Figures

Every figure of the section:

- Figure 6.4.1 (`gram-schmidt-intro`, Preview Activity 6.4.1's statement): replace, by the plane Sim below.
- Figure 6.4.2 (`empty-3`, Preview Activity 6.4.1 c): drop, a worksheet grid (config 5); part c keeps the book's words, and the card cites Figure 6.4.1's Sim, which draws w₁ and w₂.
- Figure 6.4.3 (`3d-orthog-proj-2`, the running text; the same file as Figure 6.3.14): replace, by the space Sim below, built on its own code here.
- Exercise figures: none.

Plan lines:

- `sim-gram-schmidt-plane` · Figure 6.4.1 · `gram-schmidt-process`, `vector-projection`, `orthogonal-basis`, `normalization` · value add: flow by a story (Gram-Schmidt is a sequence of moves, and the reader sees each arrive) and variation by dragging (any basis of the plane, the special cases marked) · arrows: symbolic (vectors), none kinematic · moving: the story slider runs the steps on the transport, five stops: v₁, v₂ (the book's picture) · w₁ (w₁ = v₁, the line W₁ drawn along its length) · v̂₂ (the dashed drop from v₂'s head to the line and the shadow v̂₂ growing along it, a right-angle mark at its foot) · w₂ (the segment from v̂₂ to v₂ slides to the origin and becomes w₂, square to w₁; v₂ stays faint) · u₁, u₂ (the unit circle draws and w₁, w₂ shrink or grow onto it) · controls: the heads of v₁ and v₂ draggable, held by four component sliders (untyped, −3 to 3, the book's (1, 1) and (0, 2)), v₂'s two sliders carrying dashed circles where v₂ lies on the line of v₁ (w₂ = 0: no basis) and where v₂ is already square to v₁ (v̂₂ = 0) · headline the step in words with the live numbers · readout the step's equation (v₁·v₂ with its products; w₁ = v₁; v̂₂ = (v₂·w₁)/(w₁·w₁) w₁ with the numbers; w₂ = v₂ − v̂₂ and w₂·w₁ = 0; uⱼ = wⱼ/|wⱼ|) · no graph · 2D on the book's window [−3, 3]², 110 units to 1.
- `sim-gram-schmidt-space` · Figure 6.4.3 · `gram-schmidt-process`, `orthogonal-projection`, `gram-schmidt-preserves-the-span`, `finding-a-qr-factorization` · value add: 3D (the plane W₂ and a vector square to it, which the flat book draws in one perspective) and flow by a story · arrows: symbolic · moving: a story slider of eight stops on Example 6.4.4's basis v₁ = [2, −1, 2], v₂ = [−3, 3, 0], v₃ = [−2, 7, 1]: b − b̂ ⊥ W (the book's picture: W spanned by Example 6.4.4's w₁ and w₂, b = v₃, b̂ = −w₁ + 2w₂ = [−4, 5, 2] in the plane and b − b̂ = [2, 2, −1] square to it) · v₁, v₂, v₃ (the plane and b̂ fade, w₁ is relabelled v₁, w₂ fades into v₂, b takes v₃'s colour and name: the same arrow) · w₁ (the line W₁) · v̂₂ (the drop to W₁, v̂₂ = −w₁) · w₂ (v₂ − v̂₂ slides to the origin, and the plane W₂ = Span{w₁, w₂} fills in) · v̂₃ (the drop to W₂: the opening picture again, now as a step of the algorithm) · w₃ (v₃ − v̂₃ slides to the origin, rising out of the plane) · u₁, u₂, u₃ (each wⱼ shrinks to a third of its length) · no slider beyond the story: the book's one basis, so the figure reproduces Example 6.4.4 and Example 6.4.6; the R of A = QR fills in, an entry per step as each weight is read off, in the readout's note · headline the step in words · readout the step's equation with Example 6.4.4's numbers, ending on A = QR with Q and R written · 3D, mathematical (root 28.3): the lesson is a vector square to a plane in ℝ³; free orbit, no ground, no buttons (no viewpoint is the lesson and the scene is small enough to read whole); box x −5…5, y −4…8, z −3…4.

Eyebrows "Figure 6.4.1" and "Figure 6.4.3"; `draws` `["vector", "region"]` and `["vector", "matrix", "region"]`. Captions say what the reader sees, never what to drag (chapter 4 config 20).

## Extra simulations (rule 15)

None beyond the two. Considered and rejected: a 4D projection for Activity 6.4.2 (nothing to see); a Sim of Exercise 6.4.5's dependent set (it would answer the exercise; the plane figure's dashed circle shows the same failure, w₂ = 0, on any dependent pair); a QR-filling matrix Sim apart from Figure 6.4.3 (its readout already fills R in step by step).

## Derivations (rule 29)

None (config 16): Example 6.4.4 and Example 6.4.6 are computations of the section's own method; Activity 6.4.4's chain v₁ = 2u₁, … is a card; the span argument of Example 6.4.4 is one equation. Score below the bar.

## Exercises

- Inline cards: `a1` Preview Activity 6.4.1 (`preview`, after `sim-gram-schmidt-plane`, Apply, cite the Sim; the book prints a solution only; part c keeps "sketch them in Figure 6.4.2"); `a2` Activity 6.4.2 (after `p#gram-schmidt-works`, Apply); `a3` Activity 6.4.3 (after `p#orthonormal-from-orthogonal`, Apply, the Sage load and the three command bullets in its prompt); `a4` Activity 6.4.4 (after `p#qr-intro`, Analyze, "Activity 6.4.2" linked to `#6.4-ex-a2`); `a5` Activity 6.4.5 (after `p#qr-value`, Apply, its Sage load in the prompt). Each `open`, the book's answer then its solution, `generated_by: "source"`; the empty Sage cells dropped.
- End exercises `e1`–`e8`, Exercises 6.4.1–6.4.8, all keyed, every answer `open` (matrices, vectors, shapes, true-or-false with the book's line per part); 6.4.3's stray "." after its display moved into it.
- Corrections (root 13), checked with SymPy (`scratchpad/sec-6.4/check.py`): Activity 6.4.2 c "v₁ and v₁" for v₁ and v₂ (answer once, solution twice); Activity 6.4.3 d u₁'s "−6√336" for −6/√336 (answer and solution); Activity 6.4.4 b's solution "w₁ = 2u₁, w₁ = √2u₂, w₁ = 2u₃" for w₁, w₂, w₃; found here: Exercise 6.4.4 d's b̂ = v₁ − (8/3)v₂ − v₃ (answer and solution) for b̂ = 2v₁ − 3v₂ − v₃, which gives [−9, −1, −11, 7, −5]; Exercise 6.4.5 a's answer "w = 0" for w₃ = 0. Every other keyed number agrees.
- `exercise_concepts` for every card; Bloom levels and tags AI-judged (config 2).

## Wanted at chapter level

- Variables rows `ref` (chapter `COLOR.md`, the referents by index): `6.4/v_1_vec`, `6.4/w_1_vec`, `6.4/u_1_vec` → `v-1`; `6.4/v_2_vec`, `6.4/w_2_vec`, `6.4/u_2_vec`, `6.4/v_2_hat_vec` → `v-2`; `6.4/v_3_vec`, `6.4/w_3_vec`, `6.4/u_3_vec`, `6.4/v_3_hat_vec` → `v-3`.
- Anchors: `6.4/W`, `6.4/b_vec`, `6.4/b_hat_vec`, `6.4/w_1_vec` → `6.4-projection-formula-recalled`; `6.4/u_1_vec`, `6.4/u_2_vec`, `6.4/Q_T` → `6.4-orthonormal-more-convenient`; `6.4/R_m` → `6.4-gram-schmidt-named`; `6.4/v_1_vec`, `6.4/v_n_vec` → `6.4-gram-schmidt-illustrated`; `6.4/v_2_vec`, `6.4/v_3_vec`, `6.4/w_2_vec`, `6.4/w_3_vec`, `6.4/u_3_vec`, `6.4/W_1`, `6.4/W_2`, `6.4/Span`, `6.4/c_i` → `6.4-example-gram-schmidt`; `6.4/w_n_vec`, `6.4/w_nm1_vec`, `6.4/m`, `6.4/n` → `6.4-gram-schmidt-general`; `6.4/w_j_vec`, `6.4/u_j_vec` → `6.4-orthonormal-from-orthogonal`; `6.4/A`, `6.4/Q`, `6.4/R`, `6.4/Col` → `6.4-qr-from-gram-schmidt`. `v_2_hat_vec`, `v_3_hat_vec`, `P`, `x_vec`, `r_i_vec`, `a_i_vec` appear only in cards and keep no anchor.
- New 6.4 rows for symbols the cards write (meanings per `ost meanings`): `A_T` (Exercise 6.4.8's AᵀA = RᵀR, 6.2's meaning), `I` (QᵀQ = I), `Nul` (Exercise 6.4.6 e), `y_vec` (Exercise 6.4.3 c, y = Rx), `zero_vec` (Exercise 6.4.5), if the checker asks for them.
- Chapter pass (2026-11-02): applied. The eleven `ref`s and every anchor above set through `ost set`, and `6.4/v_2_hat_vec` → `6.4-sim-gram-schmidt-plane`, whose caption writes it. The new rows added after `ost meanings`: `A_T`, `I`, `Nul` (the meanings 6.2 gives them), `zero_vec` (anchored to the plane figure's caption), `u_n_vec` (6.3's meaning, anchored to `6.4-orthonormal-more-convenient`), `y_vec` (Exercise 6.4.3's y = Rx, `type: "vector"`, `redefines`), `w_i_vec` (the Gram-Schmidt vector wᵢ, `type: "vector"`, `redefines`). All eight forms anchored from the text. Preview Activity 6.4.1 c's "Figure 6.4.2" links to Figure 6.4.1, which draws w₁ and w₂, with a correction note under the card. The referent mentions of the plane figure's caption, the space figure's caption, Example 6.4.4's last span and Example 6.4.6's three lists are now marked `data-ref`. The link to the projection formula names 6.3's `prop-proj-formula`. No concept, edge or glossary change.

## Conventions

As `ch01/1.2`'s list. A figure that sits before the card that cites it takes the card's place after the figure (`data-place` the figure's id), as Figure 5.2.3 does.
