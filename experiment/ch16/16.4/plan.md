# Plan: 16.4 The Simple Pendulum (m42243)

Source: `source.md` (converted from CNXML). Book pages 715 to 716.
Status: proposed 2026-09-07, awaiting review.

One idea, one derivation, one result. One sketch to replace, no
photographs, one example, three notes (a career connection, a Take-Home
Experiment, a PhET callout), one Check Your Understanding, three AP items,
one conceptual question, thirteen problems of which seven are keyed.

## Sub-concepts (page headers)

The book has no headers. Proposed page structure, each split at a
paragraph boundary:

1. **The restoring force on a pendulum** (book: pendulums in common use,
   the definition, the arc length s, the weight split into mg cos θ along
   the string and mg sin θ along the arc, tension cancelling the first)
2. **For small angles, a pendulum is a simple harmonic oscillator** (book:
   sin θ ≈ θ below about 15°, F ≈ −mgθ, s = Lθ, F ≈ −(mg/L)s, so k = mg/L)
3. **The period depends on length and gravity alone** (book: T = 2π√(m/k)
   with k = mg/L gives T = 2π√(L/g), independent of mass and nearly of
   amplitude; measuring g; Example 16.5; the career note and the
   Take-Home Experiment as notes; the Pendulum Lab callout as a note, as
   in 16.3)
4. Check Your Understanding (two bobs of 10 kg and 100 kg swing alike)
   inline after block 3.

## Concept nodes

| id | kind | name | prereqs | evidence |
|---|---|---|---|---|
| simple-pendulum | idea | Simple pendulum | simple-harmonic-motion, restoring-force | glossary; CYU; AP question 3 |
| pendulum-restoring-force | result, eq-pendulum-force | Restoring force on a pendulum, F ≈ −(mg/L)s for small angles | simple-pendulum, hookes-law, tension (4.5), acceleration-due-to-gravity (2.7) | CYU (a 12° swing is within the small-angle range); the derivation Example 16.5 rests on |
| pendulum-period | result, eq-pendulum-period | Period of a simple pendulum, T = 2π√(L/g) | pendulum-restoring-force, shm-period | Example 16.5; AP questions 2 and 3; conceptual question 1; every problem |
| measuring-g | skill | Measuring g with a pendulum, g = 4π²L/T² | pendulum-period | the learning objective; Example 16.5; AP question 2; the Take-Home Experiment; problems 7, 8 and 13 |

Two notes for review:

- `pendulum-restoring-force` is thin on exercise evidence. It is kept
  because the small-angle condition is what the whole section turns on,
  and the CYU and the example's discussion (keep the angle below 0.5°
  for five-digit precision) both lean on it. The alternative is to fold
  it into `simple-pendulum`.
- Placeholders: tension (4.5) and the acceleration due to gravity (2.7).
  The force components use vectors (3.3) too; not tagged, the text does
  it in words.

## Figures

id · replaces · concepts · what moves · sliders · headline · graph · 3D

1. `demo-pendulum-force` · Fig 16.15 (the bob with its forces) ·
   simple-pendulum, pendulum-restoring-force · a bob on a string swings
   from a pivot, endlessly and without damping, with the true equation of
   motion (not the small-angle one, so a wide swing is visibly slower);
   the weight arrow is split each frame into mg cos θ along the string,
   cancelled by the tension arrow, and mg sin θ along the arc; the arc
   length s is bracketed along the arc from the equilibrium line · swing
   amplitude θ₀ (2° to 60°, default 15°, ink), length L (0.5 to 2.0 m,
   default 1.00, ink), mass m (0.1 to 2.0 kg, default 0.50, ink) · "θ =
   8.3°, so the net force is mg sin θ = 0.71 N along the arc, back toward
   equilibrium" · beside the scene: restoring force against arc length s,
   the true curve −mg sin(s/L) and the straight line −(mg/L)s over it,
   the band of small angles (below 15°) shaded, the moving point riding
   the curve; the two agree in the band and part outside it · no. The
   scene is the bob's swing (square, vertical), so the graph sits beside
   it. The small readout line gives the difference between sin θ and θ
   at the current amplitude, and how much longer the period is than
   2π√(L/g) when the amplitude is large.
2. `demo-pendulum-period` · new (the length and gravity paragraphs and
   the CYU have no sketch) · pendulum-period · two pendulums hang side by
   side and swing together from the same release, one of length L₁ and
   one of L₂, the bobs of different mass; below the pair, T against L for
   the current g with the two points on the curve · L₁ (0.1 to 2.0 m,
   default 1.00, ink), L₂ (default 0.25, ink), mass of the second bob
   (0.1 to 10 kg, default 5.0, ink; dragging it changes nothing, which is
   the CYU), g (1.6 to 25 m/s², default 9.80, acceleration hue; the Moon
   at 1.63 for problems 10 and 11) · "L = 1.00 m and g = 9.80 m/s² give
   T = 2.01 s; the pendulum a quarter as long swings twice as fast" ·
   T against L, curve for the current g, two points · no. Endless. Two
   pendulums side by side make a wide scene, so the graph stacks below.
3. `demo-measure-g` · new (Example 16.5 and the Take-Home Experiment) ·
   measuring-g · a pendulum of known length swings while a stopwatch
   runs and a counter ticks off ten complete swings, as the Take-Home
   Experiment instructs; at the tenth the run stops, the period is the
   time divided by ten, and g follows from g = 4π²L/T² · length L (0.25
   to 2.0 m, default 0.75000 for the example, ink), the local g (1.6 to
   12 m/s², default 9.8281, acceleration hue; the demo swings at that g
   and the readout recovers it) · "ten swings took 17.357 s, so T =
   1.7357 s and g = 4π²(0.75000 m)/(1.7357 s)² = 9.8281 m/s²" · none: the
   stopwatch and the counter are the instrument, as in 16.2 · no.
   Finite, so it gets the scrubber. The readout is carried to five
   digits, as the example insists.

Example 16.5 gets no separate figure: demo 3 reproduces it on load.

Photographs: none in this section. Figures that serve exercises: none.

Extra simulations (rule 15): considered the pendulum on the Moon (demo
2's g slider), the large-amplitude period (folded into demo 1's readout),
and a conical or physical pendulum (not in the text). One survivor:

- **A clock that runs slow** (for problems 12 and 13): a clock face
  driven by a pendulum whose length is off by a set percentage, run for
  a day in fast time, so the learner sees a 1% change in length become
  minutes of drift by the next noon, and why a clock is trimmed by its
  length. Nothing in the text draws how a tiny change accumulates.

## Exercises

- 1 Check Your Understanding, open, inline after block 3, with the
  book's answer.
- 3 AP test prep: question 2 (which formula gives g, keyed b) kept as a
  choice; its options are formulas, and choice options render as plain
  text, so they go in as "g = 4π²L/T²" and the like. Questions 1 (g at
  two Earth radii, which also needs 6.5) and 3 (Tom's two pendulums) are
  unkeyed and left out unless you supply answers.
- 1 conceptual question (greater g: lengthen or shorten), open, with an
  AI-marked approach.
- 13 problems. Keyed and kept: 1 (6.21 cm), 3 (2.01 s), 5 (2.23 Hz), 7
  (two parts, 2.99541 s and the digits explanation, as a number with the
  book's full solution), 9 (two parts, factor 1.41 and 97.5%), 11 (the
  Moon clock, 2.45 h per revolution), 13 (0.0116%). Unkeyed and left out
  unless you supply answers: 2, 4, 6, 8, 10, 12.
- The problem set opens with the book's line "As usual, the acceleration
  due to gravity in these problems is taken to be g = 9.80 m/s², unless
  otherwise specified." Proposed: the exercises file gains a `lead`
  that the Exercises document prints above the cards, so the line stays
  with the problems it governs. Small schema and fragment change.
- No generated questions: every node has a book exercise.

## Views

- Formulas: eq-pendulum-force (F ≈ −(mg/L)s), eq-arc (s = Lθ),
  eq-pendulum-period (T = 2π√(L/g), important), eq-g-from-pendulum
  (g = 4π²L/T²).
- Definitions: symbols s, θ, L, g; the glossary term simple pendulum.
- Concept map: four nodes; real prerequisites simple-harmonic-motion,
  restoring-force, hookes-law, shm-period; placeholders tension and
  acceleration-due-to-gravity.

## Colour

The arc length s is a displacement and takes the position hue; g is an
acceleration and takes the acceleration hue. Two macros to add: `\ks`
(class `kv-x`) and `\kg` (class `kv-a`). θ and L stay in ink. No new hue.
