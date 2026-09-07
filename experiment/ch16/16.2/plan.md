# Plan: 16.2 Period and Frequency in Oscillations (m42241)

Source: `source.md` (converted from CNXML). Book page 709.
Status: reviewed and built 2026-09-07. Approved as proposed; the tire-tread simulation was not picked.

A thin section: one page in the book, one photograph, no sketches, one
example, one Check Your Understanding, one AP item, six problems, all six
keyed. It stays a page of its own (rule 11).

## Sub-concepts (page headers)

The book has one untitled run of text and the example. Proposed page
structure, one block per idea:

1. **Periodic motion and the period** (book: the plucked guitar string,
   periodic motion, the period T, period of an event that need not repeat)
2. **Frequency is the number of cycles per unit time** (book: the
   paycheck, frequency f, f = 1/T, the hertz, cycle against vibration;
   Example 16.3 ultrasound and middle C)
3. Check Your Understanding (period and frequency of an event in your
   life) stays inline after block 2, since it asks for both quantities.

One thing to decide: the split between blocks 1 and 2 falls inside the
book's single paragraph, at "A concept closely related to period is the
frequency of an event." The words stay verbatim; only a header goes in
and the paragraph breaks there. The alternative is one block for the
whole section under a single header.

Learning objectives, section summary and glossary come out of the running
text into the views. The AP item and the problems go to the Exercises
document.

## Concept nodes

| id | kind | name | prereqs | evidence |
|---|---|---|---|---|
| periodic-motion | idea | Periodic motion | none | glossary; CYU |
| period | idea | Period T | periodic-motion | glossary; CYU; AP item; problems 1, 2, 3 |
| frequency | idea | Frequency f | periodic-motion | glossary; CYU; AP item; problems 2, 4, 5, 6 |
| period-frequency | result, eq-period-frequency | f = 1/T | period, frequency | Example 16.3; AP item; problems 1 to 4 |

No skill nodes: every problem is a definition or the one result applied.
Problems 5 (tire tread) and 6 (engine) turn a speed and a spacing into a
count per second, which uses speed (2.3); it is tagged as a placeholder
prerequisite of those exercises, not as a node of this section.

Two notes for review:

- `periodic-motion` has no edge to `restoring-force` (16.1). The book
  defines periodic motion by its timing alone; what causes it is 16.1's
  business and 16.3 joins the two.
- The 16.1 plan mentioned tagging AP question 1 to a forward placeholder
  `period`. It was held for 16.3 instead and no placeholder was written,
  so `period` is a new node here with nothing to resolve.

## Figures

id · replaces · concepts · what moves · sliders · headline · graph · 3D

1. `demo-period` · new (the book has no sketch; the photograph is
   discussed below) · periodic-motion, period, period-frequency · a
   guitar string across the strip is plucked and vibrates as an endless
   cycle, no damping, so the tone "lasts a long time"; below it the
   displacement of the string's midpoint traces against time on a
   scrolling graph, a bracket between two successive crests is labelled
   T, and a second bracket marks a counting window on the time axis with
   the crests inside it counted · period T (0.25 to 4.00 s, default
   0.500, time hue), counting window (1 to 5 s, default 2.0, time hue) ·
   "each cycle takes 0.500 s, so 2.00 cycles fit in every second" ·
   displacement against t below · no. Steady oscillation, so it runs as a
   continuous cycle with the plain transport.
   Readout: f = 1/T = 1/(0.500 s) = 2.00 Hz. Small line: "4 crests pass
   in 2.0 s, which is also 2.00 Hz."
2. `demo-count` · new · frequency, period-frequency · a mass on a spring
   (the 16.1 coil spring and block sprites) bobs while a stopwatch runs
   and a counter ticks off completed cycles; the run stops when the
   stopwatch reaches the set time · cycles N (5 to 50, default 10, ink),
   elapsed time t (2 to 30 s, default 6.0, time hue) · "10 cycles in
   6.0 s, so the frequency is 1.67 Hz" · none: the stopwatch and the
   counter are the graph · no. Finite motion, so it gets the scrubber.
   Readout: f = N/t = 10/(6.0 s) = 1.67 Hz. Small line: T = t/N =
   0.600 s. The defaults keep the AP item's ratio (50 cycles in 30 s) at
   a speed the eye can follow; dialling in 50 and 30 reproduces the item.

Why two demos rather than one: demo 1 is the reciprocal relation, read
off one trace. Demo 2 is frequency as the book defines it, a count of
events over an interval, with no trace at all; it is the method the AP
item and problems 2, 5 and 6 actually use, and no equation in the section
writes it down. If you would rather have one figure, the counting window
of demo 1 already carries most of demo 2 and I would drop demo 2.

Example 16.3 (0.400 µs ultrasound, 264 Hz middle C) gets no figure of its
own: its numbers are too fast to animate and it adds no quantity demo 1
does not show.

Photographs, one:

- Fig 16.7, the guitar strings (credit: JAR): **keep**, with the book's
  caption and credit line. The passage opens with the plucked guitar
  string, the first learning objective names it, and the caption is
  about the strings vibrating at regular intervals, so it shows the
  thing the passage is about. It is a borderline case: the strings are
  at rest, and demo 1 shows them moving. Say the word and it is dropped.

Figures that serve exercises: none in this section.

Extra simulations (rule 15): considered a frequency ladder from heartbeat
to ultrasound (a static scale, not a simulation, and the text does not
need it), a heartbeat trace for problem 2 (the same view as demo 2), and
the eight-cylinder engine of problem 6 (too contrived to draw). One
survivor:

- **Tire tread** (for problem 5): a tire rolls along the strip with a
  crevice every 2.00 cm, and each crevice striking the road makes a tick
  on a time line below; sliders for the car's speed and the crevice
  spacing. The learner sees a pattern that repeats in space become a
  frequency in time through the speed, which is the relation 16.9 builds
  wave speed on. Nothing in the text draws why.

## Exercises

- 1 Check Your Understanding, open, inline after block 2, with the book's
  answer.
- 1 AP test prep item (50 cycles in 30 s), keyed. The book's key writes
  1.66 Hz and 0.6 s; the key is kept verbatim and the 2% tolerance
  covers the exact 1.67 Hz.
- 6 problems, all keyed: 1 (60.0 Hz power), 2 (heart rate), 3 (tuning
  fork), 4 (stroboscope), 5 (tire tread), 6 (engine, two parts).
- No conceptual questions in this section, nothing held for a later
  page, nothing held from 16.1.
- No generated questions: every node has a book exercise.

## Views

- Formulas: eq-period-frequency (f = 1/T, important), eq-frequency-period
  (T = 1/f, from Example 16.3, not important). The hertz (1 Hz = 1
  cycle/s) goes in as the definition of the unit symbol Hz rather than
  as an equation. Say if you want it on the formula sheet as well.
- Definitions: symbols T, f, Hz; the three glossary terms (period,
  periodic motion, frequency).
- Concept map: four nodes above, no external prerequisites; speed (2.3)
  is tagged on problems 5 and 6 only.

## Colour

T and f take the time hue, as the config says. Two macros to add to
`book.json`: `\kT` and `\kf`, both class `kv-t`. No new hue. The cycle
count N and the counting window are not colour-coded quantities; N
renders in ink, and the window shares the time hue since it is a time.

## Converter

`cnxml2md.py` now emits a figure, note or equation nested inside a
paragraph as its own block (the 16.1 note). 16.1's `source.md` was
regenerated with the fix; the only change is that figure, plus three
blank lines.
