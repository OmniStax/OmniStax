# Prompt: interactive figures for one section

Reverse-engineered from the pass that produced the seven figures in
`experiment/ch02/2.5` (College Physics 2e, constant-acceleration kinematics),
after the restyle that copied the idiom of an earlier photoelectron
spectroscopy explainer. The prompt below is what would have produced that
result in one pass. The notes after it explain why each rule is there.

Status: promoted from inline prompting on 2026-09-06. Not yet run on a
second section; expect edits after 2.4.

## Inputs the prompt needs

- The section's converted text (`source.md`), with `{eq:id}` markers and
  the book's figures listed as `FIGURE` blocks.
- `formulas.json`: the variables with their colour class, meaning, unit;
  the equations with ids.
- `concepts.json`: the nodes with `kind` (idea, result, skill) and the
  `coverage` table, so the figure plan can be checked against what the
  section actually introduces.
- The per-book `RULES.md` (colour-coding table, tone rule, figure style).
- The shared drawing layer in `app.js` (primitives listed below). The prompt
  does not ask the model to reinvent it.

## The prompt

```
You are building the interactive figures for one section of a textbook that
is being turned into a long-form scrolling explainer in the style of
Bartosz Ciechanowski: prose hands off to live, slider-driven drawings, and
one strict colour-coding binds tunable variables, equation symbols and
drawn objects across text and figures.

You are given: the section text (source.md), formulas.json, concepts.json,
RULES.md, and app.js which already contains the drawing layer. The book's
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
- Replace every sketch figure the book has. Drop photographs; they carry
  no physics. Keep the book's numbers as the slider defaults so the figure
  reproduces the worked example on load.
- The sliders are the variables the equation is about, nothing else. Two
  to four per figure. Each slider's colour class is the variable's class
  from formulas.json.
- Scene first: the thing that moves (a runner, a car, a plane) is drawn on
  a strip across the full width, and the graph goes below it in the same
  canvas. A graph-only figure is allowed when the graph is the idea (an
  area under a line, a curve crossing a level twice).
- 3D only when the idea is spatial (two lanes side by side, a hemisphere,
  a field). Otherwise 2D canvas.

## 2. Draw each figure with the shared layer

Every figure is one IIFE that calls:

  const d = demo('demo-<id>', H);            // H = canvas height in logical units
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

Motion:
- every figure animates on its own: model time runs 0..T at a rate that
  makes one loop take 4 to 6 real seconds, holds about 1.2 s, restarts.
- slider changes call reset() which restarts the loop.
- the moving object is an ink-coloured dot or sprite; its arrows for v and
  a are drawn every frame with lengths proportional to the values.
- there is one global pause pill; reduced-motion starts paused at t = T.

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

Each rule came from something that went wrong or right in the 2.5 run.

- **Fixed logical canvas.** The first pass drew in CSS pixels with 11px
  type and 1.5px lines, and the figures looked like thumbnails. A 1400-unit
  space with 22px type is what the photoelectron page did, and it is why
  those figures read as drawings rather than charts.
- **Scene above graph.** Side-by-side layouts squeezed both halves. Stacking
  gave the strip the full width and let the graph share the x-axis story.
- **Ambient loop, no Play button.** Play buttons made the figures still by
  default, and a still figure is a chart. Looping with a hold means the
  page is never static and the reader sees the motion without doing
  anything. The global pause pill and the reduced-motion default keep this
  from being hostile.
- **Headline with live numbers.** The photoelectron page's "KE = 6.0 − 4.5
  = 1.5 eV" line in the canvas is the fastest way to tie the picture to the
  equation. It also doubles as a caption.
- **Hollow = initial.** The book's subscript-0 convention needs a drawn
  equivalent so x₀, v₀ and the current values can be told apart without
  reading labels.
- **Colours only through C() and PAL.** The colour-coding toggle and dark
  mode both work by swapping what those return. One hex literal in a
  figure breaks both.
- **Sliders are the equation's variables.** Anything else on a slider is a
  distraction; the reader is meant to feel the equation, not tune a scene.
- **Plan line first.** Asking for figures directly produced seven figures
  that each drifted in layout. The plan line forces the scene/graph split
  and the slider list to be decided before code.
- **One look, one fix.** All the collisions found (a slope label under a
  bracket, v₀ on an axis title, non-round ticks, a clipped total, a label
  under the headline) were found in the single screenshot pass. A second
  pass found nothing.

## Archetypes seen so far

The seven figures fall into four shapes. A future declarative widget spec
should cover these before anything else.

1. **Strip + graph.** Object on a strip, v and a arrows, graph below with
   the moving point and a drop line. Jogger, plane, dragster.
2. **Graph with a filled region.** The quantity is an area or a slope, so
   the graph is the scene. Average velocity.
3. **Number line + instrument.** Two marked positions, a bracket for the
   difference, a stopwatch. Notation.
4. **Root finding.** A curve crossing a level twice, one crossing greyed
   as unphysical, the object on a strip above showing which root is real.
   Merge.
5. **3D + bars.** The only 3D figure. Two lanes side by side, and a 2D bar
   canvas beneath that shows the quantities the equation is about
   (reaction distance, braking distance). The bars carry the reading; the
   3D carries the situation.

## Sprites

Sprites are tiny path drawings (runner, car, plane, dragster) in ink
colour. A new section will need new ones (a ball, a rocket, a boat). Keep
them under 12 path commands and scale them with the `s` argument; they
must read at 1400-wide logical scale, so bodies are 80 to 120 units long.
