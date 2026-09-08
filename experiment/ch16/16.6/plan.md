# Plan: 16.6 Uniform Circular Motion and Simple Harmonic Motion (m42245)

Source: `source.md` (converted from CNXML). Book pages 720 to 722.
Status: reviewed and built 2026-09-07. Approved as proposed; paper runs downward; the merry-go-round photograph kept.

One idea, argued from one figure: the projection of uniform circular
motion is simple harmonic motion, and everything about simple harmonic
motion can be read off the circle. One photograph, three sketches, no
example, no glossary, one Check Your Understanding, one AP item
(unkeyed), four problems of which two are keyed. This is the section the
exploration flagged for the circle-with-projection archetype.

## Sub-concepts (page headers)

The book has no headers. Proposed page structure, split at a paragraph
boundary:

1. **The shadow of a ball on a turntable moves in simple harmonic
   motion** (book: the turntable and its shadow, Fig 16.18; the point P
   and its projection, Fig 16.19; x = X cos θ with θ = ωt and ω = 2π/T,
   giving x(t) = X cos(2πt/T) again; the trace on paper, Fig 16.20)
2. **The speed and the period follow from the circle** (book: the
   similar triangles give v = v_max√(1 − x²/X²); the period is the
   circumference over v_max, T = 2πX/v_max, which with v_max = X√(k/m)
   gives T = 2π√(m/k); the closing remarks on waves)
3. Check Your Understanding (an object in uniform circular motion, and
   how to trace its motion as a wave) inline after block 1, beside the
   paper trace it asks about.

## Concept nodes

| id | kind | name | prereqs | evidence |
|---|---|---|---|---|
| ucm-shm-projection | idea | The projection of uniform circular motion is simple harmonic motion | simple-harmonic-motion, shm-kinematics, uniform-circular-motion (6.1), angular-velocity (6.1) | CYU; the section summary; the AP item (unkeyed, left out) |

One node for review. The section's second half derives results that
already have nodes: the speed at a position (`shm-max-speed`, 16.5) and
the period (`shm-period`, 16.3). The coverage table records this section
as *reinforcing* those two nodes rather than introducing new ones, and
the two keyed problems are tagged to them. The relation ω = 2π/T is
stated inside the projection idea and goes on the sheet as its equation;
angular velocity itself is a placeholder from 6.1, where the book
introduces it. Two placeholders: uniform-circular-motion and
angular-velocity, both 6.1.

## Figures

id · replaces · concepts · what moves · sliders · headline · graph · 3D

1. `demo-turntable` · Fig 16.18 (the lit turntable and its shadow) and
   Fig 16.20 (the trace on moving paper and the x–t graph) ·
   ucm-shm-projection · a ball rides a circle at constant angular
   velocity, face on; light from above drops its shadow onto a line
   below the circle, and the shadow is drawn as a block on a spring
   riding that line, since the shadow's motion is exactly the block's;
   beneath the line a strip of paper scrolls downward and the shadow's
   pen draws the wave on it, with T, 2T marked down the edge, the way
   Fig 16.20 runs the paper away from the wall · radius X (5 to 20 cm,
   default 10, position hue), period T (0.5 to 4.0 s, default 2.0, time
   hue) · "θ = ωt = 72°, so the shadow is at x = X cos θ = +3.1 cm" · the
   paper strip is the graph, time running down · no. Endless. The small
   readout line gives ω = 2π/T in rad/s. The circle with a projection
   line is the new archetype the exploration listed; the block on the
   line is what makes the "easy way to produce simple harmonic motion"
   literal. If you would rather have the conventional x against t with
   time running right, the paper can be laid beside the circle instead.
2. `demo-circle-triangles` · Fig 16.19 (P on the circle, the two
   triangles) · ucm-shm-projection, reinforcing shm-max-speed and
   shm-period · the point P moves round the circle of radius X at angular
   velocity ω; the radius to P, the projection x on the diameter and the
   vertical side √(X² − x²) form the displacement triangle; at P the
   velocity v_max along the tangent and its projection v along x form
   the velocity triangle; both triangles are shaded so their similarity
   is seen, and the angle θ is marked in both · radius X (5 to 20 cm,
   default 10), angular velocity ω (0.5 to 6.0 rad/s, default π, the
   angular-rate hue) · "θ = 72°: x = X cos θ = +3.1 cm and v = v_max
   sin θ = 0.30 m/s; the two triangles are similar" · none, the circle
   is the idea · no. Endless. The readout gives v = v_max√(1 − x²/X²)
   with the numbers and the small line T = 2πX/v_max = 2π/ω.

Photographs, one:

- Fig 16.17, the merry-go-round (credit: Wonderlane, Flickr): **keep**,
  with the book's caption and credit. The text refers to it directly
  ("the point P is analogous to an object on the merry-go-round"), and
  it is the section's one everyday instance of uniform circular motion.
  Borderline as the guitar was; say drop and it goes.

Figures that serve exercises: none.

Extra simulations (rule 15): considered the ladybug on the record
(problem 4, which demo 1 already shows with other numbers), the bathroom
scale (16.5's view), and a two-phasor sum for the closing remark about
adding waves (16.10's subject, deferred to that plan). Nothing survives;
the two demos cover what the section says.

## Exercises

- 1 Check Your Understanding, open, inline after block 1, with the
  book's answer.
- 1 AP test prep item (the range of x = A sin ωt): unkeyed and left out
  unless you supply the answer.
- No conceptual questions.
- 4 problems. Keyed and kept: 1 (the bathroom scale, two parts, 0.266
  m/s and 3.00 J), 3 (where the speed is half its maximum, ±√3/2; the
  card takes 0.866 and the hint says both signs). Unkeyed and left out
  unless you supply answers: 2 (the novelty clock), 4 (the ladybug).
- No generated questions.

## Views

- Formulas: eq-x-cos-theta (x = X cos θ), eq-x-cos-wt (x = X cos ωt),
  eq-omega-T (ω = 2π/T, important), eq-v-similar (v/v_max =
  √(1 − x²/X²)), eq-T-from-circle (T = 2πX/v_max).
- Definitions: no new symbols beyond θ and ω, already listed; no
  glossary terms.
- Concept map: one node; real prerequisites simple-harmonic-motion and
  shm-kinematics; placeholders uniform-circular-motion and
  angular-velocity.

## Colour

ω takes the angular-rate hue bound at 16.5. X and x position, v and
v_max velocity, T time. θ in ink. Nothing new.
