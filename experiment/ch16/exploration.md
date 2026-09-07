# Exploration: College Physics 2e, Chapter 16 Oscillatory Motion and Waves

Written before converting the chapter (2026-09-07). Source of record is the
CNXML bundle (`experiment/osbooks-college-physics-bundle`), not the PDF.
The book's organisation (book → chapters → sections → untitled narrative
headers, one CNXML module per section, apparatus inside the module) is as
recorded in `ch02/exploration.md`; nothing differs here.

## Why this chapter

Chosen over the other 33 by asking, for each chapter, whether a live
figure shows something a printed one cannot. Four criteria:

1. Time is the content. Oscillation, wave travel, beats and resonance
   build-up exist only as motion; the book draws them as five frozen
   instants or a sine curve, and asks the reader to imagine the rest.
2. One slider changes the kind of thing seen, not just its size: damping
   from ringing to creeping, drive frequency swept across resonance, a
   string's harmonic number, two frequencies pulled apart into beats.
3. Reach. Sound (17), AC circuits (23), electromagnetic waves (24), wave
   optics (27) and quantum physics (29) all lean on this chapter.
4. Fit with the figure idiom already built: a mass on a spring on a strip
   with x, v and a graphs below it is the chapter's own Figure 16.10 in
   the 2.5 template, and the t, x, v, a colours carry over unchanged.

Nine of the eleven numbered sections meet criterion 1 (16.2 and 16.11 are
the exceptions). Runner-up was Chapter 3 (projectile motion and relative
velocity are excellent demos, but 3.2 and 3.3 are vector arithmetic);
then Chapter 25 (lens and mirror ray diagrams, which the static figures
already carry well) and Chapter 6 (only 6.5 and 6.6 are orbital).

## Chapter 16 modules

PDF pages 703 to 752; the chapter's glossary, summary, conceptual
questions and problems are aggregated at pp. 743 to 752 in the PDF but
sit inside each module in CNXML. Figures counted include sub-figures and
exercise figures. CYU = Check Your Understanding, AP = AP test prep,
CQ = conceptual questions, Sol = problems with an inline solution.

| Section | Module | PDF | Ex. | Fig. | Eq. | Defs | CYU | AP | CQ | Prob. | Sol. |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Intro | m42239 | 703 | 0 | 1 photo | 0 | 2 | 0 | 0 | 0 | 0 | 0 |
| 16.1 Hooke's Law: Stress and Strain Revisited | m42240 | 704–708 | 2 | 6 | 9 | 4 | 3 | 4 | 0 | 6 | 9 |
| 16.2 Period and Frequency in Oscillations | m42241 | 709 | 1 | 1 | 8 | 3 | 1 | 1 | 0 | 6 | 8 |
| 16.3 Simple Harmonic Motion | m42242 | 710–714 | 1 | 8 | 8 | 3 | 3 | 4 | 6 | 8 | 10 |
| 16.4 The Simple Pendulum | m42243 | 715–716 | 1 | 1 | 11 | 1 | 1 | 3 | 1 | 13 | 11 |
| 16.5 Energy and the Simple Harmonic Oscillator | m42244 | 717–719 | 1 | 1 | 17 | 0 | 2 | 1 | 1 | 2 | 5 |
| 16.6 Uniform Circular Motion and SHM | m42245 | 720–722 | 0 | 4 | 9 | 0 | 1 | 1 | 0 | 4 | 4 |
| 16.7 Damped Harmonic Motion | m42246 | 723–726 | 1 | 4 | 9 | 3 | 2 | 3 | 3 | 1 | 5 |
| 16.8 Forced Oscillations and Resonance | m42247 | 727–729 | 0 | 4 | 0 | 3 | 1 | 1 | 1 | 5 | 5 |
| 16.9 Waves | m42248 | 730–732 | 1 | 7 | 8 | 4 | 1 | 5 | 2 | 10 | 11 |
| 16.10 Superposition and Interference | m42249 | 733–738 | 0 | 9 | 6 | 8 | 3 | 7 | 1 | 6 | 13 |
| 16.11 Energy in Waves: Intensity | m42250 | 739–742 | 2 | 2 | 16 | 1 | 1 | 0 | 2 | 9 | 6 |

Two exercises carry no type attribute (16.1 "describe a system in which
elastic potential energy is stored", which sits under Conceptual
Questions; 16.3 the mass-and-period question). Each is classed by the
header it sits under. The CYU column counts `check-understanding`
exercises only.

## Figures

48 in all. By what they are:

- **Photographs, 12, each kept or dropped in the section plan** (kept when it serves the narrative and the text, dropped when it is decoration): the intro splash, the guitar strings
  (16.2), the child's toy and the skydivers (16.3), the merry-go-round
  (16.6), the swing (16.7), the piano and the Tacoma Narrows bridge
  (16.8), the ocean (16.9), the water-surface pattern (16.10), the
  earthquake damage (16.11). The Tacoma Narrows photograph is the one
  that clearly serves the text (a real resonance failure) and is kept
  with its credit line; the car beside Example 16.1 is the kind that is
  dropped.
- **Sketches and graphs, 31, each replaced by a demo:** the displaced
  ruler and its restoring force (16.1), F against x with the stored-energy
  area (16.1, twice), the toy-gun spring (16.1), the car on its springs (16.1, 16.3), the spring
  oscillator (16.3), the bouncing car and the paper strip recording a sine
  curve (16.3), the x(t), v(t), a(t) triple (16.3), the pendulum (16.4),
  the energy transformation strip (16.5, repeated in 16.7), the shadow of
  a ball on a turntable, the point on the circle and its projection graph
  (16.6), the underdamped, critical and overdamped curves (16.7), the
  paddle ball and the resonance curves (16.8), the gull on the wave, the
  transverse and longitudinal cords, the string and the sheet of paper
  (16.9), constructive, destructive and mixed interference, the standing
  wave, the fundamental and overtones, beats (16.10), the two speakers
  (16.11).
- **Figures that serve exercises, 5, copied faithfully:** the pendulum
  and spring images (16.3 AP items),
  the wave image and the seismograph trace (16.9 AP and problem), the
  rarefaction image (16.10 AP item).

## Observations that affect the plan

- The chapter is planar. Every figure is a strip, a graph or a circle; no
  3D is expected anywhere, which is cheaper than 2.5.
- New drawing vocabulary: a spring, a block, a pendulum bob on a string, a
  cord carrying a wave, energy bars. Two new archetypes beyond the seven
  recorded in the figure prompt: a circle beside a strip with a projection
  line (16.6), and a curve on a strip that travels (16.9, 16.10).
- The 2.5 idiom "loop 0..T with a hold" fits the damped and driven demos
  (finite motions, which get the scrubber) but not the steady oscillations
  and travelling waves, which are infinite and should run as a continuous
  cycle with the plain transport. Both already exist in the library.
- Colour: t, x, v, a carry over exactly. The chapter adds force (F, k),
  energy (PE, KE, E) and the periodic quantities T, f, ω, A, λ. The
  proposed assignment is in `config.md`.
- External prerequisites, all from chapters not built yet: Newton's second
  law (4.3), Hooke's law and elastic deformation (5.3), kinetic energy,
  potential energy and conservation of energy (7.2, 7.3, 7.6), g (2.7),
  angular velocity and uniform circular motion (6.1). They become
  placeholder nodes that open the OpenStax page, the mechanism 2.5 used
  for 2.1, 2.3 and 2.4. Velocity and acceleration resolve to the real 2.3
  and 2.4 nodes when those are built.
- 16.2 is one page: period, frequency, f = 1/T, one example. It stays its
  own page (rule 11).
- 16.8 has no equations. Resonance is taught qualitatively, so the demo
  (a driven oscillator with the drive frequency on a slider) carries the
  section.
- 16.10 is the heaviest section: eight definitions, three sub-ideas
  (superposition, standing waves, beats), 13 solved problems. It will
  need the most sub-concept splitting.
- Two "Take-Home Experiment" boxes (16.3) and one (16.9) are prose
  instructions for the reader; they are kept verbatim as boxed notes.
- No PhET callouts in this chapter.
- Solutions are inline in the exercise element for roughly every second
  problem, as in Chapter 2; the same answer-key rule applies.

## Defaults the agent intends to use

Listed as the config list in `config.md`, to be confirmed before the
per-section loop starts.
