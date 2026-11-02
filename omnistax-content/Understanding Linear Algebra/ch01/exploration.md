# Chapter 1 exploration: Systems of equations

Prepared 2026-11-02 by the prep agent (claude-fable-5-1, high effort) from the four `source.md` files (`tools/convert.py 1.1` … `1.4`), the XML under `source/ula/src/`, the PreFigure sources in `src/prefigure/section1-1/` and the PDF (pages 1–46). Chapter 1 prints no introduction: the book opens on 1.1. No chapter before it, so every prerequisite edge points within the chapter or to a concept id shared with Calculus or Diffy Qs.

## The modules

| Section | xml:id | Preview | Activities | Examples | Definition boxes · italic terms | Theorems, propositions · other boxes | Figures | Tables | Sage cells | Interactives | End exercises (answered) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1.1 What can we expect | sec-expect | 0 | 3 (1.1.1–1.1.3) | 0 | 3 (1.1.11–1.1.13) · linear equation, coefficients, variables, system of linear equations, linear system, solution, solution space | 0 · 1 assemblage ("Solutions to sets of linear equations") | 10 numbered (1.1.1–1.1.10; 17 PreFigure diagrams in all, 1.1.5–1.1.10 having two or three panels) + 4 unnumbered PreFigure diagrams in Activity 1.1.1's solution | 0 | 0 | 0 | 4 (0) |
| 1.2 Finding solutions to linear systems | sec-finding-solutions | 1 (1.2.1) | 3 (1.2.2–1.2.4) | 2 (1.2.4, 1.2.7) | 1 (1.2.5) · Gaussian elimination, decoupled, triangular, back substitution, scaling, interchange, replacement, augmented matrix, coefficient matrix, row equivalent, reduced row echelon form, leading entry, reduced row echelon matrix, free variable, basic variables, parametric description | 1 theorem (1.2.6) · 3 observations (1.2.1–1.2.3) | 0 | 0 | 0 | 0 | 6 (6) |
| 1.3 Computation with Sage | sec-sage-introduction | 0 | 2 (1.3.1, 1.3.2) | 0 | 0 · arguments, augmentation; the m × n matrix in prose | 1 proposition (1.3.1, Augmentation Principle) · 1 observation (1.3.2), 2 assemblages ("Sage syntax", "Sage practices") | 3 numbered (1.3.3, 1.3.4, 1.3.5), all in exercises, the author's drawn SVGs, not PreFigure | 0 | 23 (7 with code, 16 empty for the reader to fill) | 0 | 6 (6) |
| 1.4 Pivots and their influence on solution spaces | sec-pivots | 1 (1.4.1) | 2 (1.4.2, 1.4.3) | 0 | 1 (1.4.1) · pivot position, consistent, inconsistent; homogeneous (italic inside Exercise 1.4.8 only) | 2 propositions (1.4.3, 1.4.4), 1 principle (1.4.5) · 1 question (1.4.2, "Two Fundamental Questions") | 0 numbered; 2 unnumbered drawn SVGs in Exercise 1.4.9 | 0 | 5 (all empty, in exercises 1.4.2 and 1.4.9) | 0 | 9 (9) |
| **Chapter** | | **2** | **10** | **2** | **5 boxes** | **4 theorems and propositions, 1 principle, 4 observations, 1 question, 3 assemblages** | **13 numbered** | **0** | **28** | **0** | **25 (21)** |

Every activity and preview activity carries the author's solution; Activities 1.4.2 and 1.4.3 carry a solution but no separate answer. 1.3.1's answers are Sage code. The book's one footnote and its tables are not in this chapter.

## The exercise count report (root rule 13)

Counted from `src/exercises/exercises1-M.xml`.

- End exercises: 25 printed (1.1: 4, 1.2: 6, 1.3: 6, 1.4: 9); 21 keyed with the author's answer and solution, available now; 4 unkeyed (1.1.1–1.1.4), available with AI solutions (1.1.1 explain, 1.1.2 explain, 1.1.3 compute and explain, 1.1.4 explain or sketch); proposed new: 0.
- The four unkeyed exercises are the chapter's three activities asked again: 1.1.1 is Activity 1.1.2 (e) and (f), 1.1.2 is Activity 1.1.3 (a), 1.1.3 is Activity 1.1.3 (b), 1.1.4 is Activity 1.1.2 (a)–(d) in another order. The AI solutions can therefore follow the author's own solutions to those parts and state the same answers ((1, 2, 0) is a solution, (3, 0, −2) is the solution with y = 0, two planes never meet in one point, and so on); they are still AI-marked, since the book keys no exercise of 1.1.
- Inline: 2 preview activities and 10 activities, 12 inline Try Its, every part answered by the author.
- The standing choice (`$BOOK/RULES.md`, standing decision 2): the book's answers key the 21; the 4 get AI solutions, `generated_by: "ai"`; no new exercises.

## Figures in book order

| Number | Draws | Sits in | Kind |
|---|---|---|---|
| 1.1.1, 1.1.2, 1.1.3, 1.1.4 | an empty 4 × 4 coordinate grid (`empty-4.svg`, one file four times) | Activity 1.1.1's tasks (a)–(d) | PreFigure, worksheet grid |
| (unnumbered) | two lines meeting at (2, 3); two parallel lines; one line; three lines with no common point (`intro-two`, `intro-parallel`, `intro-single`, `intro-three`) | Activity 1.1.1's solution (a)–(d) | PreFigure |
| 1.1.5 | three panels: one line; two lines meeting in a point; three lines with no common point (`three-possibilities-1/2/3`) | running text | PreFigure |
| 1.1.6 | two panels: two parallel lines; three lines through one point (`intro-parallel-2`, `intro-coincident`) | running text | PreFigure |
| 1.1.7 | two panels: the x, y axes; the x, y, z axes (`coordinates-2d`, `coordinates-3d`) | running text | PreFigure (the right panel a 3D projection) |
| 1.1.8 | two panels: the line y = 0 in the plane; the plane z = 0 in space (`2dy0`, `3dz0`) | running text | PreFigure (3D right panel) |
| 1.1.9 | two panels: a single plane; two planes meeting in a line (`plane-simple`, `plane-int-1`) | running text | PreFigure (3D) |
| 1.1.10 | two panels: three planes meeting in a point; three planes with no common point (`plane-int-2`, `plane-int-3`) | running text | PreFigure (3D) |
| 1.3.3 | a four-intersection street grid with the hourly traffic on each road and the unknown flows x, y, z, w (`1-3-traffic-b.svg`) | Exercise 1.3.2 (a) | the author's drawing |
| 1.3.4 | a second street grid with its flows (`1-3-traffic-a.svg`) | Exercise 1.3.2 (b) | the author's drawing |
| 1.3.5 | a thin plate with six interior nodes T₁ … T₆ and the boundary temperatures (`1-3-heat.svg`) | Exercise 1.3.3 | the author's drawing |
| (unnumbered) | four points in the plane; the same four points with the cubic through them (`1-4-interpolation-0/1.svg`) | Exercise 1.4.9's statement | the author's drawings |

Sketches to replace (root rule 14): every PreFigure diagram of 1.1 is a picture of a computation (lines and planes from their equations) and is drawn live. Figures 1.1.1–1.1.4 hold nothing but an empty grid to draw on and are never cited by number; they are dropped, the activity's parts keep the book's words and cite the lines Sim instead (standing decision 5). Figures 1.1.5 and 1.1.6 are one scene, lines in the plane, drawn five times: they fold into one Figure "1.1.5 + 1.1.6" with the five cases and Activity 1.1.1's four systems as presets. Figures 1.1.7 and 1.1.8 are the axes and then one equation's solution set on those axes, flat and in space: they fold into one two-pane figure "1.1.7 + 1.1.8" whose right pane turns. Figures 1.1.9 and 1.1.10 are planes in space drawn four times: one Figure "1.1.9 + 1.1.10", mathematical 3D with a free orbit, the chapter's one 3D scene (book RULES, borderline groups: a plane through ℝ³). The four solution diagrams of Activity 1.1.1 are the same scenes as the presets of the lines Sim; the card's solution keeps the book's words and the section agent decides whether to embed the author's SVGs in the solution or to cite the Sim's preset. The exercise figures of 1.3 and 1.4 are faithful copies in the cards (root rule 14), the author's SVGs at `/media/ch01/`; Exercise 1.4.9 prints two images and the card's `figure` takes one, so the plan picks the second (the points with the cubic, which contains the first) or composes the two.

Photographs: none in the chapter. The author's interactives: none in Chapter 1. 3Blue1Brown survivors (`$BOOK/exploration.md`): none fall in Chapter 1 (the first, the grid under a transformation, is 2.5–2.6).

## What is new in the chapter

Everything: it is the first chapter. Linear equation, linear system, solution, solution space and the three possibilities (1.1); Gaussian elimination, decoupled and triangular systems, back substitution, the three row operations, the augmented and coefficient matrices, row equivalence, reduced row echelon form and its uniqueness, free and basic variables, the parametric description (1.2); Sage arithmetic, entering a matrix and `rref()`, the shape of a matrix, augmentation and the Augmentation Principle, the effort of row reduction growing as n³ (1.3); pivot positions, the two fundamental questions, consistent and inconsistent systems, Propositions 1.4.3 and 1.4.4, Principle 1.4.5, and that a unique solution needs at least as many equations as variables (1.4). "Homogeneous" is defined inside Exercise 1.4.8 and again by the text in 2.4 (A**x** = **0**); the concept is 2.4's, and 1.4.8's card is tagged with the pivot results it tests.

Ids reused from Diffy Qs where the book states the same thing (`ost find diffyqs`, standing decision 8): `linear-system-of-equations`, `augmented-matrix`, `elementary-row-operations` (the book's scaling, interchange and replacement; the exploration's `scaling-interchange-replacement` is not coined), `matrix`, `leading-entry`, `reduced-row-echelon-form`, `free-variable`, `backsubstitution` (the book's back substitution), `gauss-jordan-elimination` (the book's Gaussian elimination, which ends in reduced row echelon form), `pivot` (the book's pivot position), `consistent-system`, `inconsistent-system`. Calculus has none of this chapter's concepts (its "linear equation" ids are differential equations). Each reused id is staged as a concept of this book with the section that introduces it here.

## Exercises that belong to another section

None. Exercise 1.2.6 (a) says "consistent" before 1.4 defines it, but it tests 1.2's basic variables and row equivalence and stays in 1.2. Exercise 1.4.8 defines "homogeneous" in its own prompt and stays in 1.4. The Sage exercises of 1.3 (traffic, the heat plate, the rocket fuel, balancing reactions, round-off) test setting up a linear system and reading its solution space from `rref()`, all of 1.2 and 1.3, and stay.

## The chapter's answer to root rule 23

The chapter's objects are lines, planes and a matrix being reduced, and each can be moved.

- 1.1: two or three lines whose coefficients the reader drags, their meeting point marked, the moment they go parallel or all three pass through one point; one equation's solution set tilting as a line in the plane and as a plane in space; three planes in space the reader turns, meeting in a point, in a line, or nowhere, so that Activity 1.1.2's index cards are on the page.
- 1.2: row operations that keep the solution: the two lines of Observation 1.2.3's system redrawn after each scaling, interchange or replacement, the lines turning about the one point that never moves, beside the augmented matrix morphing row by row; Example 1.2.4 stepped through with each row operation a morph of the augmented matrix. A step control, not a transport: the idea has an order but no clock.
- 1.3: the effort of row reduction on a slider for n, the operation count 2n³ + n² and the time at a trillion operations a second, with the book's n = 10¹² and its 10¹⁶ years as the far detent.
- 1.4: a reduced row echelon shape the reader sets, rows, columns and which columns carry a pivot, the readout answering the two fundamental questions and naming the basic and free variables, the rightmost-column pivot lighting the inconsistent case. The pivots light up as columns are read.

Nothing here has a time in it; every figure of the chapter is still, with sliders, choices or a step control, and one 3D scene.
