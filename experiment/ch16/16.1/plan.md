# Plan: 16.1 Hooke's Law: Stress and Strain Revisited (m42240)

Source: `source.md` (converted from CNXML). Book pages 704 to 708.
Status: proposed 2026-09-07, awaiting review.

## Sub-concepts (page headers)

The book has one untitled opening and one header, "Energy in Hooke's Law
of Deformation". Proposed page structure, one block per idea:

1. **A restoring force makes an oscillation** (book: opening paragraph;
   the plucked ruler, equilibrium, momentum carrying it through, damping)
2. **Hooke's law: the force is proportional to the displacement** (book:
   F = −kx, the force constant, the F–x graph, Example 16.1 car springs)
3. **The energy stored in a deformation** (book: Energy in Hooke's Law of
   Deformation; PE_el = ½kx², work as the area under F_app; Example 16.2
   toy gun)
4. Check Your Understanding 1 (make the ruler stiffer) stays inline after
   block 1; Check Your Understanding 2 (where did the work go) after
   block 3.

Learning objectives, section summary and glossary come out of the running
text into the views. AP test prep, the conceptual question and the
problems go to the Exercises document.

## Concept nodes

| id | kind | name | prereqs | evidence |
|---|---|---|---|---|
| restoring-force | idea | Restoring force | displacement (2.1), newtons-first-law (4.2, placeholder) | glossary; CYU 1; AP question on the minus sign; AP question on the splashing liquid |
| force-constant | idea | Force constant k | restoring-force | glossary; every problem asks for k; CYU 1 (a shorter ruler is stiffer) |
| hookes-law | result, eq-hooke | Hooke's law, F = −kx | restoring-force, force-constant | Example 16.1; problems 1 to 6; AP question on the minus sign |
| elastic-potential-energy | result, eq-pe-el | Elastic potential energy, PE_el = ½kx² | hookes-law, work (7.1, placeholder), potential-energy (7.3, placeholder) | Example 16.2; CYU 2; conceptual question 1; problem 3 (BB gun) |

No skill nodes: every problem is the one result applied. Problem 3 and
Example 16.2(b) turn the stored energy into a speed, which uses
kinetic-energy (7.2) and conservation-of-energy (7.6); both are tagged as
placeholder prerequisites of the exercise, not as nodes of this section.

Two notes for review:

- The book says Hooke's law was named in 5.3 (stress and strain, F = kΔL).
  Node ids are canonical, so `hookes-law` is introduced here for now and
  reinforced by 5.3 when that section is built, or moved there then.
- AP question 1 (distance covered in one period is 4A) tests amplitude
  and period, which are 16.2 and 16.3 ideas. Proposed: keep it, tagged to
  forward placeholders `amplitude` (16.3) and `period` (16.2), so the map
  shows what it really tests. The alternative is to leave it out of 16.1.

## Figures

id · replaces · concepts · what moves · sliders · headline · graph · 3D

1. `demo-ruler` · Fig 16.2 (plucked ruler) and Fig 16.3 (a–e) ·
   restoring-force, force-constant · a ruler clamped at the bottom is
   pulled aside and released; the tip swings through the equilibrium line
   and settles under light damping, with a force arrow on the tip that
   always points back toward equilibrium and grows with the displacement
   · initial pull x₀ (−6 to 6 cm, default 4), free length of the ruler
   (10 to 30 cm, default 30; shortening it is CYU 1), damping (default
   light) · "the tip is 3.1 cm to the left, so the restoring force points
   to the right" · none: the scene is the idea · no. Finite motion, so it
   gets the scrubber.
2. `demo-spring-scale` · Fig 16.4 (a) graph and (b) hanging springs ·
   hookes-law, force-constant · a spring hangs from a beam; a mass is
   hung on it and the spring stretches to x = mg/k; the load steps
   through the book's masses (0 to 0.500 kg) in a loop, each step adding
   a dot to the graph · mass m (0 to 0.5 kg, default 0.300), force
   constant k (10 to 100 N/m, default 39, the slope of the book's data) ·
   "a 0.300 kg load weighs 2.94 N and stretches the spring 0.076 m" ·
   F against x below, the book's six data points as dots, the line with
   slope k, the current point filled · no.
3. `demo-stored-energy` · Fig 16.6 (applied force against deformation,
   area = work) and the toy-gun figure of Example 16.2 ·
   elastic-potential-energy · a toy-gun spring on a strip is compressed
   by x (the applied force arrow grows as it goes), holds, then releases
   and the dart leaves at v = √(2 PE_el / m) · force constant k (10 to
   200 N/m, default 50.0), compression x (0 to 0.30 m, default 0.150),
   dart mass m (1 to 10 g, default 2.00) · "PE_el = ½(50.0 N/m)(0.150 m)²
   = 0.563 J, so the dart leaves at 23.7 m/s" · F_app against x below,
   the triangle under the line shaded as the work done, filling as the
   spring is compressed · no. Finite motion, so it gets the scrubber.
   The readout's small line shows Method B: average force ½kx times x.

Example 16.1 (car settling 1.20 cm under 80.0 kg) gets no figure of its
own: it adds no quantity that `demo-spring-scale` does not show.

Photographs, one:

- Fig 16.5, the car beside Example 16.1 (credit: exfordy on Flickr):
  **drop**. It shows a parked car's rear wheel; the example is about the
  car settling, which the photograph does not show, and the text never
  refers to it.

Figures that serve exercises: none in this section.

Extra simulations (rule 15): considered a ruler-length slider (folded
into `demo-ruler` as the CYU 1 slider), an unloaded-length demo for
problem 6 (the line on `demo-spring-scale` already shows the intercept),
and a quadratic-versus-linear energy plot (the shaded triangle already
shows it). One survivor:

- **Springs sharing a load** (for problem 4, four truck springs): n
  identical springs side by side under one load, with n on a slider; the
  learner sees each spring stretch by the same x while the load is split,
  so the combined force constant is n·k. Nothing in the text draws why.

## Exercises

- 2 Check Your Understanding, open, inline (after blocks 1 and 3), with
  the book's answers.
- 4 AP test prep: question 1 (choice, 4A; see the note above), question
  3 (choice, the minus sign), question 4 (choice, gravity as restoring
  force). Question 2 (force to compress 5 cm and stretch 15 cm) has no
  keyed answer and is left out unless you supply one.
- 1 conceptual question (untyped in the source, sits under Conceptual
  Questions), open, with an AI-marked suggested approach.
- 6 problems. Keyed: 1 (spring scale, three parts), 3 (BB gun, two
  parts), 5 (pogo stick, two parts). Unkeyed and left out unless you
  supply answers: 2 (rugby scale), 4 (pickup truck), 6 (two loads, two
  lengths).
- No generated questions.

## Views

- Formulas: eq-hooke (F = −kx), eq-pe-el (PE_el = ½kx²).
- Definitions: symbols F, k, x, PE_el, W, m; the four glossary terms
  (deformation, elastic potential energy, force constant, restoring
  force). The chapter intro's terms (oscillate, wave) go with the
  landing page.
- Concept map: four nodes above; external prerequisites displacement
  (real, 2.1), newtons-first-law, work, potential-energy (placeholders);
  forward placeholders amplitude and period if AP question 1 is kept.

## Colour (new hues, to be added to book.json and RULES.md)

| Quantity | Symbols | Light | Dark |
|---|---|---|---|
| force | F, F_app, k | #15803D | #4ADE80 |
| energy | PE_el, KE, W | #0E7490 | #22D3EE |

k takes the force hue because it is the force per unit stretch; m stays
in ink. Macros: `\kF`, `\kFa`, `\kk`, `\kPE`, `\kKE`, `\kW`.

## Converter note

`cnxml2md.py` emitted the figure `import-auto-id1471703` (the F–x graph)
with its alt and caption on one line because the source figure sits
inside a paragraph without a newline. To fix before 16.2.
