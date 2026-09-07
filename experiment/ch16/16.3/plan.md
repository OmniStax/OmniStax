# Plan: 16.3 Simple Harmonic Motion: A Special Periodic Motion (m42242)

Source: `source.md` (converted from CNXML). Book pages 710 to 714.
Status: reviewed and built 2026-09-07. Approved as proposed; the marble-in-the-bowl simulation was not picked; AP question 4 held for 16.5.

The chapter's central section: three definitions, the period formula,
the x(t), v(t), a(t) equations, one example, two Take-Home Experiment
boxes, a PhET callout, two Check Your Understanding, four AP items plus
the one held from 16.1, six conceptual questions, nine problems. Four
sketches and one drawing to replace, two exercise graphs, two exercise
photographs.

## Sub-concepts (page headers)

The book has one untitled opening and one header, "The Link between
Simple Harmonic Motion and Waves". Proposed page structure:

1. **Simple harmonic motion and its amplitude** (book: opening paragraph;
   the spring oscillator of Fig 16.9; Take-Home Experiment: SHM and the
   Marble, kept verbatim as a note)
2. **The period depends on mass and stiffness, not on amplitude** (book:
   the three paragraphs on amplitude, stiffness and mass; the boxed
   Period of Simple Harmonic Oscillator with T = 2π√(m/k) and f; Take-Home
   Experiment: Mass and Ruler Oscillations as a note; Example 16.4 bad
   shock absorbers)
3. **The link between simple harmonic motion and waves** (book's own
   header: the bouncing car's headlight streak, the paper strip, x(t),
   v(t), a(t), the triple graph)
4. Check Your Understanding 1 (the banjo note fades: amplitude falls,
   period and frequency stay) inline after block 2; Check Your
   Understanding 2 (the swing at X is a crest or trough of the wave)
   inline after block 3.

The boxed period formulas render as a highlighted equation block in the
text, the way the book boxes them. The two Take-Home Experiments are
boxed notes, verbatim (config). One thing to decide: the section also
carries a PhET callout ("Masses and Springs", an OpenStax link), which
the exploration missed. Proposed: keep it as a short note with the link,
since it is the book's own pointer and costs nothing; the alternative is
to drop it as apparatus.

## Concept nodes

| id | kind | name | prereqs | evidence |
|---|---|---|---|---|
| simple-harmonic-motion | idea | Simple harmonic motion | hookes-law, restoring-force | glossary (SHM, simple harmonic oscillator); conceptual questions 1, 3; CYU 1 |
| amplitude | idea | Amplitude X | displacement (2.1), simple-harmonic-motion | glossary; CYU 1, 2; the AP item held from 16.1 (distance in one period is 4A) |
| shm-period | result, eq-shm-period | Period of a simple harmonic oscillator, T = 2π√(m/k) | simple-harmonic-motion, force-constant, period-frequency | Example 16.4; AP question 2; problems 1, 3, 6, 9; conceptual questions 2, 4, 5, 6; CYU 1 (independence of amplitude) |
| shm-kinematics | result, eq-shm-x | Position, velocity and acceleration in SHM | amplitude, shm-period, velocity (2.3), acceleration (2.4), newtons-second-law (4.3) | CYU 2; AP question 3 (if kept); problems 5 and 8 (v_max, if kept) |

No skill nodes: problems 3, 6 and 9 compare two periods for two masses on
one spring, which is the period result applied. Two notes for review:

- x(t), v(t) and a(t) are one node. The exercises test them together
  (reading x off a graph, v_max from X and T), and the book presents them
  as one description. The alternative is three nodes, one per equation,
  which would leave v and a with no exercise of their own.
- Placeholders needed: velocity and acceleration from 2.3 and 2.4, and
  Newton's second law from 4.3. Chapter 2's map has `average-velocity`
  only; the instantaneous ids are settled at build time against ch02.

## Figures

id · replaces · concepts · what moves · sliders · headline · graph · 3D

1. `demo-shm-oscillator` · Fig 16.9 (a–e, the block on a frictionless
   surface) · simple-harmonic-motion, amplitude · a block on a spring
   slides on a frictionless strip, released from x = +X and running
   endlessly; the restoring force arrow and the velocity arrow are drawn
   on the block every frame, and the marks x = +X, 0, −X sit on the
   strip · amplitude X (0.02 to 0.20 m, default 0.10, position hue),
   force constant k (10 to 200 N/m, default 50, force hue), mass m (0.1
   to 2.0 kg, default 0.50, ink) · "the block is at x = +0.10 m: the
   force points left, the speed is zero" and, through equilibrium, "x =
   0: the net force is zero and the speed is greatest" · none, the scene
   is the idea · no. Endless. The small readout line carries the held AP
   item: "in one full period the block covers 4X = 0.40 m of ground".
2. `demo-shm-period` · new (the stiffness and mass paragraphs and the
   diving board have no sketch; serves Example 16.4) · shm-period · two
   identical block-and-spring systems on two strips, released together,
   the lower with half the amplitude of the upper; they pass through
   equilibrium together forever, which is the independence of amplitude;
   below, T against m for the current k with the current point, so that
   more mass is visibly a longer period and a stiffer spring a lower
   curve · mass m (100 to 2000 kg, default 900, ink), force constant k
   (1×10⁴ to 2×10⁵ N/m, default 6.53×10⁴, force hue), amplitude X (0.02
   to 0.10 m, default 0.05, position hue) · "m = 900 kg and k = 6.53×10⁴
   N/m give T = 0.738 s, for either amplitude" · T against m, curve
   T = 2π√(m/k), current point filled · no. Endless. Horizontal scene, so
   the graph stacks below.
3. `demo-paper-strip` · Fig 16.11 (the paper strip) and Fig 16.10 (the
   car's headlight streak, a drawing of the same idea) · shm-kinematics
   (x(t)) · a mass hangs on a spring beside a strip of paper that moves
   left; a pen on the mass draws its position onto the paper, and the
   trace is the cosine, with the marks X, 0, −X on the paper's edge and
   T bracketed between crests · amplitude X (0.02 to 0.10 m, default
   0.05), period T (0.5 to 3.0 s, default 1.0) · "t = 0.25 s = T/4, and
   x = X cos(2π · 0.25) = 0" · the paper strip is the graph, beside the
   vertical scene (layout rule) · no. Endless. The car streak is folded
   in: it draws the same sine, and the paper strip is the one the
   equation x(t) refers to. If you would rather see the car, the sprite
   exists and the demo can drive a bouncing car to the right with the
   headlight tracing behind it instead.
4. `demo-shm-xva` · Fig 16.12 (the ten snapshots and the x, v, a graphs)
   · shm-kinematics · a mass on a vertical spring with the position,
   velocity and acceleration arrows drawn each frame, and three stacked
   graphs beside it, x(t), v(t), a(t), each with its moving point and the
   drop line between them · amplitude X (default 0.05 m), force constant
   k (default 50 N/m), mass m (default 0.50 kg); T, v_max = X√(k/m) and
   a_max = kX/m follow · "at t = T/4 the mass passes through equilibrium:
   x = 0, v = −v_max = −0.50 m/s, a = 0" · three graphs beside the
   vertical scene · no. Endless.

Example 16.4 (the 900 kg car) gets no figure of its own: its numbers are
the defaults of demo 2.

Figures that serve exercises, copied faithfully, "Figure" not "Demo":

- The two pendulum graphs of AP question 1 (A against t to 8π, 3A/2
  against t to 24π) and the single graph of AP question 3. Neither
  question has a keyed answer in the source, so both are left out with
  their figures unless you supply answers. If you do, the config allows
  the pendulum pair to move: a point riding each curve at the same time
  rate shows that B is the faster one.

Photographs, two, both attached to problems:

- Fig 16.13, the child in the jumper (credit: Humboldthead, Flickr):
  serves problem 8, which is unkeyed, so it goes with the problem.
- Fig 16.14, the two skydivers (credit: U.S. Army): **keep**, inside the
  card of problem 9, which is keyed and refers to it. First photograph
  inside an exercise card; the card needs to render an image with its
  caption and credit line.

Extra simulations (rule 15): considered the two rulers of the second
Take-Home Experiment (demo 2's mass slider already shows it), a car
crossing a bump with bad shock absorbers (decoration), a two-masses-on-
one-spring comparison for problems 3, 6 and 9 (demo 2's graph already
shows T against m), and the distance-per-period counter for the held AP
item (folded into demo 1's readout). One survivor:

- **The marble in the bowl** (first Take-Home Experiment): a marble
  rolling in a hemispherical bowl with the force on it drawn, so the
  learner sees where the restoring force comes from when there is no
  spring, and that the motion is simple harmonic only for small swings.
  Nothing in the text draws it, and 16.4 leans on the same idea.

## Exercises

- 2 Check Your Understanding, open, inline (after blocks 2 and 3), with
  the book's answers.
- AP test prep: the item held from 16.1 (distance in one period is 4A,
  keyed d) is placed here, tagged amplitude and period. Question 2
  (0.100 kg on 40 N/m, keyed c) kept. Questions 1 and 3 are unkeyed and
  left out with their figures unless you supply answers. Question 4
  (energy of the pendulum at the centre, keyed 2.5 J) tests kinetic
  energy at the equilibrium point, which is 16.5's subject; proposed:
  hold it for 16.5 under the placement rule. The alternative is to keep
  it here tagged to a kinetic-energy placeholder.
- 6 conceptual questions, open, each with an AI-marked suggested
  approach. Question 6 (lowered cars and stiffer springs) is answered
  from Hooke's law and the period formula together.
- 9 problems. Keyed and kept: 1 (cuckoo clock, 2.37 N/m), 3 (the
  untyped one, classed a problem by its header: mass added to change
  the period, 0.389 kg), 6 (the two divers, 94.7 kg), 9 (the skydivers,
  1.94 s, with its photograph). Unkeyed and left out unless you supply
  answers: 2 (double k, what happens to m), 4 (leeway on problem 3), 5
  (the released spring, three parts), 7 (diving board at 4.00 Hz), 8 (the
  child's jumper, three parts, with its photograph). Note that 4 depends
  on 3.
- No generated questions: every node has a book exercise.

## Views

- Formulas: eq-shm-period (T = 2π√(m/k), important), eq-shm-frequency
  (f = (1/2π)√(k/m)), eq-shm-x (x(t) = X cos(2πt/T), important),
  eq-shm-v (v(t) = −v_max sin(2πt/T)), eq-vmax (v_max = 2πX/T = X√(k/m)),
  eq-shm-a (a(t) = −(kX/m) cos(2πt/T)).
- Definitions: symbols X, v_max, x(t), v(t), a(t); the three glossary
  terms (amplitude, simple harmonic motion, simple harmonic oscillator).
- Concept map: four nodes above; real prerequisites hookes-law,
  restoring-force, force-constant, period-frequency, displacement;
  placeholders velocity, acceleration, newtons-second-law.

## Colour

Amplitude X takes the position hue (config). Two macros to add to
`book.json`: `\kX` (class `kv-x`) and `\kvmax` (class `kv-v`). v and a
use the chapter 2 macros already there. No new hue.
