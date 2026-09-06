# Per-book rules: OpenStax College Physics 2e

First draft, written during the section 2.5 experiment. Revise as more
sections get transformed.

## Color-coding standard (kinematics chapters)

One hue per physical quantity. The hue is used everywhere the quantity
appears: prose symbol, equation symbol, slider thumb, readout, drawn object.
Initial values (subscript 0) share the hue and are drawn hollow or dashed.
Averages (bar) share the hue and are drawn dashed.

| Quantity | Symbols | Light | Dark |
|---|---|---|---|
| time | t, Δt | #B45309 | #F5A524 |
| position / displacement | x, x0, Δx | #1D4ED8 | #60A5FA |
| velocity | v, v0, v̄, Δv | #B91C1C | #F87171 |
| acceleration | a, ā | #6D28D9 | #A78BFA |

Later chapters will add force (Ch 4), energy (Ch 7), momentum (Ch 8). Pick
hues that stay distinguishable from these four.

Color coding must be toggleable. With it off, every symbol renders in ink
and figures use greys with text labels.

## Global objects for this book

- Formula sheet for the current section (right floater).
- Variable definitions for the current section (right floater).
- Concept map for the current section (left floater), separate from the
  table of contents. Headers are narrative; they are listed under Contents
  for jumping back. Concept nodes are testable units only: a node exists if
  a definition or an exercise in the book targets it. Each node has a
  `kind` (idea, result, skill), prerequisite edges, a `why`, and `evidence`
  naming the exercises that justify it. A `coverage` table maps every
  section and example span to the nodes it introduces, uses, or
  reinforces; a span may map to nothing. Node ids are canonical and
  book-independent.
- Not yet needed: constants sheet, unit table. Revisit at Ch 4+.

## Tone rule

Textbook prose is quoted verbatim. Omnia's own words (demo instructions,
readouts, AI-generated questions) are set in the sans face and visibly
marked, so a reader can always tell the two apart.

## Widgets

Prefer replacing the book's static sketch figures with a live demo that
covers the same quantities. Keep the book's photos out unless they carry
information. 3D only when the situation is spatial (roads, runways, orbits).

## Figure style (after the photoelectron explainer)

- Scene first. Draw the thing that moves (runner, plane, car) on a strip;
  put the graph below it in the same canvas, never beside it.
- Fixed 1400-unit logical canvas scaled to the column. Type 22px, small
  17px, headline 26px; strokes 3 to 5px; markers 9 to 11px radius. Hollow
  marker = initial value, filled = current, dashed = average or reference.
- Every figure animates on its own, in a loop with a short hold, and reads
  out its live state in a headline inside the canvas. One global pause
  pill; reduced-motion starts paused at the end state.
- Chrome: 1px rule border and 6px radius on the canvas, nothing else. No
  card behind the figure. Sliders in a wrapping row below, readout equation
  centred below that.
- Sparse chart frames: two axis lines, a few faint gridlines, round tick
  values, coloured axis titles.

