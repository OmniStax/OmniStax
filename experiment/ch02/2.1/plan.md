# Plan: 2.1 Displacement (m42033)

Source: `source.md` (converted from CNXML). Book pages 58 to 60.

## Sub-concepts (page headers)

The book has three headers: Position, Displacement, Distance. Proposed
page structure, one block per idea:

1. **Position needs a reference frame** (book: Position)
2. **Displacement is a change in position** (book: Displacement, first half)
3. **The sign carries the direction** (book: Displacement, professor and passenger calculations)
4. **Distance and distance traveled** (book: Distance + misconception alert)
5. Check Your Understanding (cyclist) stays inline as a Try it card.

Learning objectives, section summary and glossary come out of the running
text into the views. AP test prep, conceptual questions and the four
problems go to the Exercises document.

## Concept nodes (all ideas; no results, no skills)

| id | kind | name | prereqs | evidence |
|---|---|---|---|---|
| reference-frame | idea | Reference frame | – | definition of position; AP question distinguishes position from displacement |
| position | idea | Position | reference-frame | glossary; AP question |
| displacement | idea, eq-dx | Displacement, Δx = x_f − x_0 | position | CYU (a), problems 1–4 (c), AP |
| distance | idea | Distance (magnitude of displacement) | displacement | CYU (c), problems 1–4 (b), CQ 2 |
| distance-traveled | idea | Distance traveled (path length) | position | CYU (b), problems 1–4 (a), CQ 1–3 |

The equation Δx = x_f − x_0 is the definition of displacement, so it hangs
on the idea node (`eq` field) rather than getting a result node of its own.
"Choose which direction is positive" is stated here but only tested in
2.2, so it becomes a node there.

2.5's external prerequisite `displacement` will resolve to this node once
2.1 is built.

## Figures

id · replaces · concepts · what moves · sliders · headline · graph · 3D

1. `demo-displacement` · Fig 2.2 (professor) and Fig 2.3 (passenger) · displacement, position · a person on a number line walks from x₀ to x_f, displacement arrow grows · x₀, x_f (−6 to 6 m; defaults 1.5, 3.5 reproduce the professor; set 6.0 → 2.0 for the passenger) · "Δx = 3.5 − 1.5 = +2.0 m, to the right" · none · no
2. `demo-path` · Fig 2.4 (cyclist CYU) · distance-traveled, distance, displacement · a rider goes x₀ → x_turn → x_f while an odometer counts path length and a bracket shows displacement · x₀, x_turn, x_f (defaults 0, −3, −1 km reproduce the CYU) · "distance traveled 5 km · displacement −1 km · magnitude 1 km" · none · no
3. `fig-paths` · Fig 2.5 (paths A to D for the problems) · distance-traveled, displacement · four dots trace the four paths in turn, each leaving its trail · none (the problems need the book's numbers) · "path C: 2 → 10 → 8 → 11 m" · none · no

Photograph of the cyclists (splash) dropped.

## Exercises

- 1 Check Your Understanding, three numeric parts (inline, after block 4).
- 1 AP test prep, multiple choice, tagged position, displacement, distance-traveled.
- 3 conceptual questions, open, with the book's expected points as the suggested approach.
- 4 problems × 3 parts, numeric, tagged distance-traveled, distance, displacement; path data from Fig 2.5: A 0→7, B 12→7, C 2→10→8→11, D 9→3→5. Book answers exist for A and C only, so problems 2 (path B) and 4 (path D) are left out (user decision 2026-09-06).
- No generated questions.

## Views

- Formulas: eq-dx.
- Definitions: symbols x, x₀, x_f, Δx; plus the five glossary terms as a Terms list (new for this section: the Definitions view gets terms as well as symbols).
- Concept map: five nodes above; external prerequisites: none.

## Converter note

`cnxml2md.py` dropped the FIGURE block for the professor figure
(import-auto-id2972079) and emitted its caption as a paragraph. Fix in the
converter before 2.2.
