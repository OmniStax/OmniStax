# Prompt: interactive figures for one section

The prompt that produces a section's interactive figures, and the reasons
behind its rules. Sections 2.5 and 2.1 of College Physics 2e were built
with it.

## Inputs the prompt needs

- The section's converted text (`source.md`), with `{eq:id}` markers and
  the book's figures listed as `FIGURE` blocks.
- `formulas.json`: the variables with their colour class, meaning, unit;
  the equations with ids.
- `concepts.json`: the nodes with `kind` (idea, result, skill) and the
  `coverage` table, so the figure plan can be checked against what the
  section actually introduces.
- The per-book `RULES.md` (colour-coding table, tone rule, figure style).
- The shared drawing layer `app/src/lib/fig/figlib.ts` (`window.FIG`,
  primitives listed below). The prompt does not ask the model to reinvent it.

## The prompt

```
You are building the interactive figures for one section of a textbook that
is being turned into a long-form scrolling explainer in the style of
Bartosz Ciechanowski: prose hands off to live, slider-driven drawings, and
one strict colour-coding binds tunable variables, equation symbols and
drawn objects across text and figures.

You are given: the section text (source.md), formulas.json, concepts.json,
RULES.md, and figlib.js which already contains the drawing layer. The book's
prose is quoted verbatim and must not be touched; everything you add is an
Omnia addition, set in the sans face, and is labelled "Demo".

## 1. Plan the figures before drawing anything

Produce a plan, one line per figure, and stop for review if asked to:

  id · replaces (book figure id or "new") · concept ids it serves ·
  what moves · sliders (variable ids) · what the headline reads ·
  graph below (axes) or none · 3D? (only if the idea is spatial)

Rules for the plan:
- One figure per result or idea the section introduces (see coverage
  "introduces" in concepts.json). A worked example gets a figure only if
  it adds a quantity the section figure does not show.
- Replace every sketch figure the book has. Keep a photograph when it
  serves the narrative and the original text (the text refers to it, or
  it shows the thing the passage is about, such as a bridge driven to
  failure by resonance); drop a photograph that is only decoration (a
  splash image, a stock shot beside an example). A kept photograph keeps
  the book's caption and credit line. List every photograph in the plan
  with keep or drop and the reason. Keep the book's numbers as the slider
  defaults so the figure reproduces the worked example on load.
- A figure that exists to serve exercises (a diagram the problems refer
  to) is copied over faithfully, labelled "Figure" rather than "Demo": no
  sliders, no animation beyond what keeps the original readable.
- The sliders are whatever is interesting and variable in the idea:
  positions, a starting speed, a time. They need not be the variables of
  one equation, and an idea with no equation still gets sliders for the
  quantities its definition names. Two to four per figure. Each slider's
  colour class is the variable's class from formulas.json.
- After the required figures, propose extra simulations in a separate
  list. First think broadly about what could help; then judge each one
  strictly, keeping only those that open a view the text and required
  figures do not give; then offer the survivors as one-line suggestions
  saying what the learner would see. Build none of them until the user
  picks.
- Stop after the plan. Do not draw until the user has responded to every
  line, question and suggestion in it.
- Scene first: the thing that moves (a runner, a car, a plane) is drawn on
  a strip across the full width, and the graph goes below it in the same
  canvas. A graph-only figure is allowed when the graph is the idea (an
  area under a line, a curve crossing a level twice).
- 3D only when the idea is spatial (two lanes side by side, a hemisphere,
  a field). Otherwise 2D canvas.

## 2. Draw each figure with the shared layer

Every figure is one IIFE inside the section's figures.js module
(`OMNIA_FIGURES['<sec>'] = function (root, F) {...}`) that calls:

  const d = demo('demo-<id>', H);            // demo = (id, H) => F.demo(root, id, H); H = canvas height in logical units
                                             // d.fig, d.c (canvas), d.stage (canvas + transport), d.controls, d.readout
  const v = ctl(d.controls, {label:'\\kv', cls:'v', min, max, step, value, unit, dec, onInput: reset});
  const cy = cycle(() => T, hold);           // model time loops 0..T then waits `hold` s
  function draw() { const {ctx, W, H} = begin(d.c); ... tex(d.readout, `...`); }
  register(d.fig, { update: (dt) => cy.step(dt, () => rate), draw });

Drawing happens in a fixed 1400-unit-wide logical space; begin() scales it
to the column. Use only these primitives (all take logical units):

  line(ctx,x1,y1,x2,y2,color,w=3,dash)      arrow(ctx,x1,y1,x2,y2,color,w=4)
  dot(ctx,x,y,color,filled=true,r=9)        text(ctx,s,x,y,color,{size=22,weight,align,base,bg})
  headline(ctx,s)                           hbracket(ctx,x1,x2,y,color,label)
  vbracket(ctx,x,y1,y2,color,label,side)    strip(ctx,x1,x2,y,h)
  scale(ctx,X,from,to,step,y,unit,every)    axes(ctx,box,[x0,x1],[y0,y1],{xl,xc,yl,yc,nx,ny,fx,fy}) -> {X,Y}
  nice(lo,hi,want) -> {lo,hi,n}             curve(ctx,f,t0,t1,X,Y,color,w,n)
  runner(ctx,x,y,color,phase)  car(ctx,x,y,color,s)  plane(ctx,x,y,color,s)  dragster(ctx,x,y,color,s)

Colours come from C('t'|'x'|'v'|'a') for variables and PAL.ink / PAL.muted
/ PAL.rule / PAL.soft / PAL.panel for everything else. Never write a hex
colour in a figure: C() returns ink when colour coding is off, and PAL
follows the theme.

Style, as numbers:
- type 22px for labels, 17px for ticks and notes, 24px for symbol labels
  such as x₀, 26px for the headline; weight 600 for anything that names a
  variable.
- strokes: 3px reference lines, 5px the main curve, 4 to 5px arrows;
  dashed [10,10] for averages and levels, [4,8] for drop lines.
- markers: r = 9 for the moving object, 10 to 11 for endpoints; hollow =
  initial value (the subscript-0 convention), filled = current or final.
- a strip is 44 to 56 tall; the graph box is about 1080 wide and 190 to
  390 tall; leave 60 to 110 units above the strip for arrows and their
  labels and 60 below for tick labels.
- the headline is one sentence at y = 46 that states the live numbers
  ("t = 3.3 s · the parabola crosses the ramp length twice; only one
  crossing is in the future").
- the caption under the Demo or Figure label, the headline and every
  readout are written in the book's voice (see the tone rule in the
  per-book `RULES.md`): full sentences that say what to drag and what to
  watch, in the register the book uses, never a fragment headed with a
  title ("The landing.") or a chain of semicolons.

Motion:
- every figure animates on its own: model time runs 0..T at a rate that
  makes one loop take 4 to 6 real seconds, holds about 1.2 s, restarts.
- slider changes call reset() which restarts the loop.
- the moving object is an ink-coloured dot or sprite; its arrows for v and
  a are drawn every frame with lengths proportional to the values.
- the library adds a transport (play/pause, stop, a time scrubber when the
  motion has a finite period, speed) under every
  registered figure; do not draw your own. Reduced-motion starts the
  figure stopped at t = T.

Readout:
- tex(d.readout, ...) renders the equation with the current numbers
  substituted, using the \\k macros so symbols are colour-coded. One line;
  a second `small` line only for a fact the figure makes visible ("at
  half the time the dragster has gone one fourth of the distance").

## 3. Check, once

Screenshot every figure at 1400 wide in light and dark. Then one pass of
fixes for: labels touching each other or an axis title, tick values that
are not round, text clipped at the right edge, a label hidden under the
headline. Do not loop on it.
```

## Why the rules are what they are

- **Fixed logical canvas.** Drawing in CSS pixels with 11px type and
  1.5px lines makes figures look like thumbnails. A 1400-unit space with
  22px type reads as a drawing rather than a chart.
- **Scene above graph.** Side-by-side layouts squeeze both halves.
  Stacking gives the strip the full width and lets the graph share the
  x-axis story.
- **Ambient loop, no Play button.** A Play button leaves the figure still
  by default, and a still figure is a chart. Looping with a hold means the
  page is never static and the reader sees the motion without doing
  anything. The per-figure transport and the reduced-motion default keep
  this from being hostile.
- **Headline with live numbers.** A line like "Δx = 3.5 − 1.5 = +2.0 m"
  inside the canvas is the fastest way to tie the picture to the equation.
  It also doubles as a caption.
- **Hollow = initial.** The book's subscript-0 convention needs a drawn
  equivalent so x₀, v₀ and the current values can be told apart without
  reading labels.
- **Colours only through C() and PAL.** The colour-coding toggle and dark
  mode both work by swapping what those return. One hex literal in a
  figure breaks both.
- **Sliders are what is interesting and variable.** Not every idea has an
  equation: the displacement and path demos of 2.1 have positions on
  their sliders and nothing else to drive them. What matters is that a
  slider changes something the idea is about; one that only tunes the
  scene is a distraction.
- **Plan line first.** Figures written without a plan drift in layout
  from one to the next. The plan line forces the scene/graph split and
  the slider list to be decided before code.
- **One look, one fix.** The collisions a figure can have (a label under a
  bracket, a symbol on an axis title, non-round ticks, a clipped total, a
  label under the headline) all show in one screenshot. A second pass
  finds nothing.

## Archetypes

The figures built for 2.1 and 2.5 fall into these shapes. A declarative
widget spec, if one is written, covers these first.

1. **Strip + graph.** Object on a strip, v and a arrows, graph below with
   the moving point and a drop line. Jogger, plane, dragster.
2. **Graph with a filled region.** The quantity is an area or a slope, so
   the graph is the scene. Average velocity.
3. **Number line + instrument.** Two marked positions, a bracket for the
   difference, a stopwatch. Notation.
4. **Root finding.** A curve crossing a level twice, one crossing greyed
   as unphysical, the object on a strip above showing which root is real.
   Merge.
5. **3D + bars.** Two lanes side by side, and a 2D bar canvas beneath
   that shows the quantities the equation is about (reaction distance,
   braking distance). The bars carry the reading; the 3D carries the
   situation. Braking car.
6. **Number line + sprite.** Two draggable positions on a line, a bracket
   for the displacement, a sprite that walks or rides between them, an
   odometer when path length matters. Professor, cyclist.
7. **Faithful copy.** A book figure that the problems refer to, redrawn
   with the book's numbers and no sliders. Paths.

## Sprites

Sprites are tiny path drawings (runner, car, plane, dragster, bike) in
ink colour. A new section adds its own (a ball, a rocket, a boat). Keep
them under 12 path commands and scale them with the `s` argument; they
must read at 1400-wide logical scale, so bodies are 80 to 120 units long.
