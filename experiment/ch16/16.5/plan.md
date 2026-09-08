# Plan: 16.5 Energy and the Simple Harmonic Oscillator (m42244)

Source: `source.md` (converted from CNXML). Book pages 717 to 719.
Status: reviewed and built 2026-09-07. v_max on both sheets as proposed; ω coloured now as the angular-rate type (Chen chose the alternative); the climber simulation was not picked.

One result stated two ways: the energy of a simple harmonic oscillator is
conserved, and the maximum speed follows from it. One sketch to replace
(the energy strip, Fig 16.16, which 16.7 repeats), one example, two Check
Your Understanding, one AP item plus the one held from 16.3, one
conceptual question, two problems, both keyed. No glossary terms.

## Sub-concepts (page headers)

The book has no headers. Proposed page structure, split at a paragraph
boundary:

1. **The energy of a simple harmonic oscillator is conserved** (book:
   PE_el from 16.1, KE, KE + PE_el = constant, the pendulum form
   ½mL²ω² + ½mgLθ² = constant, the energy going completely from one form
   to the other; Fig 16.16)
2. **The maximum speed follows from conservation of energy** (book: total
   energy ½kX², v = ±v_max√(1 − x²/X²), v_max = X√(k/m), the three
   factors, ω_max for the pendulum; Example 16.6)
3. Both Check Your Understanding items (the ruler against the loose
   spring; one way to lower v_max) inline after block 2, since both are
   about the factors in v_max.

Example 16.6 ends, in the source, with three paragraphs on the pendulum's
y(t) = a sin ωt and v(t) inside the example element, after its
Discussion. They stay inside the example, as the book prints them.

## Concept nodes

| id | kind | name | prereqs | evidence |
|---|---|---|---|---|
| shm-energy | result, eq-shm-energy | Energy of a simple harmonic oscillator, ½mv² + ½kx² = constant | simple-harmonic-motion, elastic-potential-energy, kinetic-energy (7.2), conservation-of-energy (7.6) | AP item (internal energy of a 1 kg oscillator); AP question 4 of 16.3 (energy at the centre), placed here; conceptual question 1; problem 2(b); problem 1(b) with gravity |
| shm-max-speed | result, eq-v-of-x | Speed in simple harmonic motion, v = ±v_max√(1 − x²/X²) with v_max = X√(k/m) | shm-energy, amplitude | the learning objective; Example 16.6; CYU 1 and 2; problem 1(a) through the frequency |

Two notes for review:

- v_max = X√(k/m) already sits on the 16.3 sheet (eq-vmax), where the
  book first states it. This section derives it from energy and makes it
  the point of the page, so the 16.5 sheet gets its own entry for it,
  tied to `shm-max-speed`. The chapter sheet will show the equation
  under both sections. The alternative is one entry, listed under 16.3
  only.
- Placeholders: conservation of energy (7.6) is new; kinetic energy
  (7.2) and potential energy (7.3) are already in the map from 16.1.
  Problem 1(b) uses gravitational potential energy and is tagged with
  `potential-energy`.

## Figures

id · replaces · concepts · what moves · sliders · headline · graph · 3D

1. `demo-energy-transfer` · Fig 16.16 (the five energy snapshots) ·
   shm-energy · the block on a spring on a frictionless surface, released
   from x = X and running endlessly, as in 16.3; at the right end of the
   strip two bars, kinetic and elastic potential, rise and fall against
   a line marking the total; below, energy against position: the
   parabola PE = ½kx², the cap KE = ½k(X² − x²), the flat total ½kX²,
   with the moving points on each and the drop line between them ·
   amplitude X (0.02 to 0.20 m, default 0.10, position hue), force
   constant k (10 to 200 N/m, default 50, force hue), mass m (0.1 to 2.0
   kg, default 0.50, ink) · "at x = +0.050 m the spring holds 0.063 J
   and the block carries 0.188 J; the total is 0.250 J throughout" ·
   energy against x below the horizontal scene · no. Endless.
2. `demo-max-speed` · new (Example 16.6 and the three factors have no
   sketch) · shm-max-speed · the car of Example 16.6 bounces on its
   springs above the road, released from an amplitude X, with its
   velocity arrow drawn each frame; beside the car, velocity against
   position: the ellipse v = ±v_max√(1 − x²/X²), the moving point riding
   it, v_max marked where it crosses x = 0 · amplitude X (0.02 to 0.20
   m, default 0.100), force constant k (1×10⁴ to 2×10⁵ N/m, default
   6.53×10⁴), mass m (100 to 2000 kg, default 900) · "at x = +0.037 m
   the car moves at 0.79 m/s; the greatest speed, v_max = X√(k/m) =
   0.852 m/s, is at x = 0" · v against x beside the vertical scene ·
   no. Endless. The small readout line states the three factors with
   the current numbers: doubling X doubles v_max, four times k doubles
   it, four times m halves it.

Photographs: none. Figures that serve exercises: none.

Extra simulations (rule 15): considered the pendulum's energy in its own
clothing (the same view as demo 1) and the Citigroup Center's tuned mass
(resonance, which is 16.8's subject). One survivor:

- **The climber's fall** (problem 1): a climber drops 2.00 m on slack
  rope, then the rope stretches and brings him to rest; gravitational
  potential energy becomes elastic potential energy, and the stretch at
  the bottom is well beyond the static stretch. The text asks the reader
  to use conservation of energy for this and draws nothing.

## Exercises

- 2 Check Your Understanding, open, inline after block 2, with the
  book's answers.
- 2 AP test prep: this section's item (internal energy, 19.7 J, keyed)
  and question 4 held from 16.3 (energy at the centre, 2.5 J, keyed,
  with the book's solution). Both numeric.
- 1 conceptual question (how friction reduces the amplitude and how a
  drive compensates), open, with an AI-marked approach.
- 2 problems, both keyed: 1 (the climber, four numeric parts: 1.99 Hz,
  50.2 cm, and 1.40 Hz with 71.0 cm for the doubled rope), 2 (the
  Citigroup Center mass, two parts, tagged Engineering Application).
- Nothing left out. No generated questions.

## Views

- Formulas: eq-shm-energy (½mv² + ½kx² = constant, important),
  eq-shm-total (½mv² + ½kx² = ½kX²), eq-v-of-x (v = ±v_max√(1 − x²/X²),
  important), eq-vmax-energy (v_max = X√(k/m)), eq-pendulum-energy
  (½mL²ω² + ½mgLθ² = constant), eq-omega-max (ω_max = √(g/L) θ_max).
- Definitions: symbols KE, PE_el, ω, ω_max, θ_max; no glossary terms in
  this section.
- Concept map: two nodes; real prerequisites simple-harmonic-motion,
  elastic-potential-energy, amplitude; placeholders kinetic-energy,
  potential-energy, conservation-of-energy.

## Colour

Nothing new. KE and PE_el have the energy hue from 16.1, v and v_max the
velocity hue, X and x the position hue. One thing to decide: ω appears
here twice, as the bob's angular velocity (v = Lω) and, in the example's
tail, as 2π/T. The config gives ω the time hue as an angular frequency.
Proposed: keep ω in ink in this section and colour it when 16.6
introduces it properly.
