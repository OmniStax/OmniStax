# Prompt: interactive figures for one section

The prompt that produces a section's interactive figures, and the reasons
behind its rules. Sections 2.5 and 2.1 of College Physics 2e were built
with it.

## Inputs the prompt needs

- The section's converted text (`source.md`), with `{eq:id}` markers and
  the book's figures listed as `FIGURE` blocks.
- The chapter's `chapter.json`: the variables with their type, meaning and
  unit; the equations with their ids.
- The book's `book.json` concepts, each with its `kind` (idea, result,
  skill), and the section's `coverage` rows in `section.json`, so the figure
  plan can be checked against what the section actually introduces.
- The book's own `RULES.md`: its type table, its tone rule, and any figure
  convention of the book. The drawing conventions the app holds to for every
  book are the "Figure style" section at the end of this file.
- The shared drawing layer `omnistax-web/src/lib/fig/figlib.ts`
  (`window.FIG`, primitives listed below). The prompt does not ask the model
  to reinvent it.

## The prompt

```
You are building the interactive figures for one section of a textbook that
is being turned into a long-form scrolling explainer in the style of
Bartosz Ciechanowski: prose hands off to live, slider-driven drawings, and
one strict colour-coding binds tunable variables, equation symbols and
drawn objects across text and figures.

You are given: the section text (source.md), the chapter's chapter.json, the
book's book.json and the section's section.json, the book's RULES.md, and
figlib.ts which already contains the drawing layer. The book's
prose is quoted verbatim and must not be touched; everything you add is an
OmniStax addition, set in the sans face. An interactive figure carries one
of two labels in its eyebrow: "Sim" where it is your own addition and
replaces nothing in the book, and "Figure" with the book's number (or
numbers, when it folds several) where it transforms a book figure. The
validator checks the eyebrow against the row.

## 1. Plan the figures before drawing anything

Produce a plan, one line per figure, and stop for review if asked to:

  id · replaces (book figure numbers, several when one scene is drawn
  several times, or "new") · concept ids it serves ·
  what moves, or "still" when nothing does · sliders (variable ids) ·
  what the headline reads · graph below (axes) or none · 3D? (only if
  the idea is spatial)

Rules for the plan:
- One figure per result or idea the section introduces (see coverage
  "introduces" in the section's coverage rows). A worked example gets a
  figure only if
  it adds a quantity the section figure does not show.
- Fold several book figures into one interactive figure when the book
  draws one scene several times and one live drawing says it better (a
  grid walked, then its triangle, then its diagonal). The figure keeps
  every number it replaces: `number` for its own, `folds` for the
  others, the eyebrow "Figure 3.3 + 3.4 + 3.5", every image under
  `originals`. The build links each number in the prose to the folded
  figure. Fold only when it is obvious and clearer, and say which
  numbers in the plan line.
- Replace every sketch figure the book has. Keep a photograph when it
  serves the narrative and the original text (the text refers to it, or
  it shows the thing the passage is about, such as a bridge driven to
  failure by resonance); drop a photograph that is only decoration (a
  splash image, a stock shot beside an example). A kept photograph keeps
  the book's caption and credit line. List every photograph in the plan
  with keep or drop and the reason. Keep the book's numbers as the slider
  defaults so the figure reproduces the worked example on load.
- The `FIGURE` block of `source.md` carries `width: 400` where the book
  says how wide it prints the image. A row that shows book images (a
  photograph, or a figure with `originals`) copies those widths into
  `widths`, one per image in the row's order, and the text carries the
  same numbers: `data-width` on a photograph's `<img>`,
  `data-original-width` (comma-separated, aligned with `data-original`)
  on a figure. Where any image of the row has no width, leave `widths`
  empty and say so in the plan; the app never upscales a book image and
  never lets one stand taller than three fifths of the viewport, so a
  row without widths still reads well.
- A figure that exists to serve exercises (a diagram the problems refer
  to) is copied over faithfully, labelled "Figure" (with the book's
  number where it has one) and never "Sim": no sliders, no animation
  beyond what keeps the original readable.
- The sliders are whatever is interesting and variable in the idea:
  positions, a starting speed, a time. They need not be the variables of
  one equation, and an idea with no equation still gets sliders for the
  quantities its definition names. Two to four per figure. Each slider's
  colour class is the variable's type (position, time, force...), the
  `type` of the variable in the chapter's chapter.json; a quantity with no
  type is
  in ink and gets an empty class.
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
  canvas. A vertical scene (a spring hanging from a beam) takes its graph
  beside it instead. Pick whichever layout leaves neither half squeezed.
  A graph-only figure is allowed when the graph is the idea (an area
  under a line, a curve crossing a level twice).
- 3D only when the idea is spatial (two lanes side by side, a hemisphere,
  a field). Otherwise 2D canvas.
- Decide for every figure whether it moves, and say so in the plan line.
  It moves when the idea has a time in it: something travels, falls,
  oscillates, or a quantity accumulates as a clock runs. It is still
  when it answers its sliders and nothing else: a scatter of attempts
  about a target, a value placed on a ladder of powers of ten, two
  lengths summed with the rejected digits muted. Do not default to
  motion, and never add a dummy loop so that a still figure earns a
  transport; a transport on a picture that cannot play is a broken
  promise.

## 2. Draw each figure with the shared layer

Every figure is one IIFE inside the section's figures.js module
(`OMNISTAX_FIGURES['<sec>'] = function (root, F) {...}`) that calls:

  const d = sim('sim-<id>', H);              // sim = (id, H) => F.sim(root, id, H); H = canvas height in logical units
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
  pinned(ctx,box,X,Y,xv,yv,color,label) -> {x,y,out}
  view({yaw,pitch,dist,cx,cy}) -> {P,shade}   /* a locked perspective view */
  face(ctx,pts,k,stroke)                     /* one face of a solid; null k fills nothing */

Controls beyond the slider, for the states and the spaces a slider cannot
carry:

  choice(host,{label,options:[{value,label}],value,aria,onInput}) -> {value, set}

A state the figure switches between rather than slides through — solid,
liquid and gas; cis and trans; the four gas laws — is a row of buttons
with the current one marked, never a slider. The row sits in d.controls
beside the sliders, arrow keys walk it, and pressing one redraws the
figure as a slider does.

  select(host,{label,options,value,aria,onInput}) -> {value, set}

The same control where the list of states is long enough that a row of
buttons would wrap: the twelve molecules of a gallery, the book's list of
materials. Same shape, same reading, a dropdown instead of a row.

  ctl(d.controls, {..., detents:[0,1,2,3] | [{v,label}], snap})

A quantity that takes a few preset values stays a slider and the presets
are drawn as soft ticks under its track, with a name under a tick where
one is given. The thumb settles on the nearest preset when it is released
close by; a step that already walks the detents snaps by itself, and any
other step snaps only when `snap: true` asks it to.

  hover(d.stage, () => [{x, y, r, name}]) -> {hide}

Rule 26.6: nothing a figure draws is an unnamed coloured ball. Where
labels beside every body would crowd the picture, hand back the circles
just drawn, in the same 1400-unit space, and the reader gets the name
under the pointer. The list is asked for on every move, so bodies that
travel need registering only once.

Three dimensions, where the lesson is an arrangement in space:

  const v = F.view3d(d.stage, {h, dist, tilt, spin, views, pitch, yaw, zoomMin, zoomMax, onRender});

It mounts a transparent WebGL scene on the page's THREE global in the
figure's stage (and says so in the stage if the browser has no WebGL),
lights it, follows the container and the theme, gates itself on being on
screen and disposes itself when the figure goes. `v.part(x)` is a group
the orbit turns, `v.label(s,p,g,dy)` an HTML label laid over the point,
`v.clear()` empties it for a rebuild, `v.project(p,g)` gives the point in
canvas pixels, `v.pickable(mesh,name)` names a body for the hover tooltip,
`v.setView(yaw,pitch)` aims it and `v.invalidate()` asks for a frame.
The stage's `data-h`, or `h`, sets the aspect; never write one inline.

Rule 26.2 hangs a button row under it: auto-rotate (`spin: 'idle'` starts
it turning until the reader takes hold, `'off'` starts still, `'none'`
leaves the button out where an idle spin makes no sense), one button per
entry of `views: [{label, yaw, pitch}]` for the viewpoints that carry
meaning (along an axis, down a bond, face-on), and zoom in and out, which
the wheel also does over the canvas within `[zoomMin, zoomMax]`.
Rule 26.3 bounds the orbit: `pitch: [min, max]` and `yaw: [min, max]` or
`'free'`, so a molecule turns any way at all and a bench is never seen
from beneath. The plan line says what the orbit is limited to, and why.

  F.mesh.sphere(g,p,r,color,extra)     F.mesh.stick(g,a,b,r,color,extra) / setStick(m,a,b)
  F.mesh.bond(g,a,b,order,r,color)     F.mesh.lobe(g,from,dir,len,color) / setLobe(m,from,dir,len)
  F.mesh.arrow(g,a,b,r,color)          F.mesh.arc(g,a,b,R,centre,color) -> the label's point
  F.mesh.polyline(g,pts,color)         F.mesh.box(g,p,[w,h,d],color,extra)
  F.mesh.vec(p)  F.mesh.mat(color,extra)  F.mesh.geo()

The bodies a scene is built from — balls, sticks between two points, the
lobe of a lone pair, an arrow with a cone for a head, an arc for an angle
— all in the same palette the flat figures read. A figure carries none of
this itself.

Axis ranges are fixed per figure. Work out the largest value the sliders
can reach, round it up to a tick, and pass that range to axes() as a
constant stated in a comment beside it; the range never changes while the
figure runs or when a slider moves. A value the range cannot hold is not
followed by rescaling: draw it through pinned(), which holds it at the
edge as a hollow marker with an arrow and its number.
  runner(ctx,x,y,color,phase)  car(ctx,x,y,color,s)  plane(ctx,x,y,color,s)  dragster(ctx,x,y,color,s)

Colours come from C('t'|'x'|'v'|'a') for variables and PAL.ink / PAL.muted
/ PAL.rule / PAL.soft / PAL.panel for everything else. Never write a hex
colour in a figure: C() returns ink when colour coding is off, and PAL
follows the theme. The exceptions are F.el('O'), the fixed CPK element
palette, and only ever as the fill of an atom; F.cat(i), the small ordinal
palette for instances that must be told apart and carry no type and no
element — three gases on one graph, four archers — where i wraps and the
hues a page has bound to a type are skipped for you; and a colour that is
the physical fact itself, a photon's wavelength or a flame, where the
figure's own prompt names the hex. All three are the book's conventions
rather than the app's signal, so they keep their colours when the reader
switches colour coding off; only the type hues of C() go to ink.

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
- the caption under the Sim or Figure label, the headline and every
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
  motion has a finite period, speed) under every registered figure that
  called cycle(); do not draw your own. Reduced-motion starts the
  figure stopped at t = T.
- a still figure calls no cycle() and registers with
  `update: () => {}`; the library then adds no transport, and the
  slider's input event alone redraws it. Its sliders need no onInput.

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
- **Scene above graph.** Side-by-side layouts squeeze both halves when
  the scene is horizontal. Stacking gives the strip the full width and
  lets the graph share the x-axis story. A vertical scene has the
  opposite problem, so its graph goes beside it; the layout is the
  agent's call each time.
- **Ambient loop, no Play button.** A Play button leaves the figure still
  by default, and a still figure is a chart. Looping with a hold means the
  page is never static and the reader sees the motion without doing
  anything. The per-figure transport and the reduced-motion default keep
  this from being hostile.
- **No transport on a still figure.** The five still sims of Chapter 1
  first shipped with a dummy infinite cycle so that they would register
  like the others, and so each carried play, stop and speed buttons that
  did nothing. A transport says "this plays"; on a figure that cannot,
  it is chrome that lies. Motion is a judgment made per figure, not a
  default.
- **Headline with live numbers.** A line like "Δx = 3.5 − 1.5 = +2.0 m"
  inside the canvas is the fastest way to tie the picture to the equation.
  It also doubles as a caption.
- **Hollow = initial.** The book's subscript-0 convention needs a drawn
  equivalent so x₀, v₀ and the current values can be told apart without
  reading labels.
- **Colours only through C() and PAL.** The colour-coding toggle, dark
  mode and the colours the reader chooses all work by swapping what
  those return; C() takes a type name, never a hue. One hex literal in a
  figure breaks all three.
- **Sliders are what is interesting and variable.** Not every idea has an
  equation: the displacement and path figures of 2.1 have positions on
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

## Figure style

These are the app's drawing conventions, the same for every book: what the
canvas is, how large the type is, what animates and what chrome a figure
carries.

- Scene first. Draw the thing that moves (runner, plane, car) on a strip;
  put the graph below it in the same canvas. That is the layout for a
  horizontal scene, which wants the full width. A vertical scene, such as
  a spring hanging from a beam, takes its graph beside it instead, since
  the scene leaves the width free. Use whichever layout leaves neither
  half squeezed; the point of the rule is legibility, not the stacking.
- Fixed 1400-unit logical canvas scaled to the column. Type 22px, small
  17px, headline 26px; strokes 3 to 5px; markers 9 to 11px radius. Hollow
  marker = initial value, filled = current, dashed = average or reference.
- Every figure whose idea has a time in it animates on its own, in a loop
  with a short hold, and reads out its live state in a headline inside the
  canvas. Each such figure has its own transport under the canvas
  (play/pause, stop and rewind, speed); reduced-motion starts every
  figure stopped at its end state. A figure whose idea has no time in it
  is a still picture that answers its sliders, with no transport.
- Chrome: 1px rule border and 6px radius on the canvas, nothing else. No
  card behind the figure. Sliders in a wrapping row below, readout equation
  centred below that.
- Sparse chart frames: two axis lines, a few faint gridlines, round tick
  values, coloured axis titles.

## Figure clarity

What Chen's review of Chapters 2 to 9 (2026-09-12) taught, written as
rules so the next chapter is drawn right the first time. Each has a
helper in `figlib.ts` where one is named.

- **A person is a body, not a stick.** Draw people with `person()`:
  the anchor is the sole of the feet on the surface they stand on, so
  nobody sinks into a stair or floats above a slope; the torso is filled;
  limbs are jointed and the hands go to what the person holds or pushes
  (`reach`), so a pusher is connected to the crate and a puller to the
  rope; the posture matches the action (`lean`, `phase`, `crouch`). Body
  strokes are thinner than force arrows, so a free-body diagram never
  looks like a limb.
- **An object reads as the thing.** A guitar has a body, a neck and a
  bridge; a nail has a head, a shank and a point; a package is a box
  with flaps; a table has legs. Fill in `PAL.soft` or `PAL.muted`, line
  in `PAL.ink`, and where the drawing alone cannot say what it is, a
  short text label does ("a planet", "steel nail"). The book's original
  image is the reference for what the scene must show: the water on the
  Earth, the Moon's path, the magnified inset.
- **A label sits beside its thing, never on it.** Use `labeller()`: a
  label starts one gap past the arrowhead along the arrow's own
  direction, steps out through a fixed ladder of gaps when that slot is
  taken and ties back with a dotted leader, sits on a small panel in the
  page colour so no line runs through the letters, and is clamped
  inside the canvas at every slider position. `block()` reserves the
  headline band first. Labels are flushed last, so text is above
  arrows and arrows above bodies. Headlines go through `topline()`,
  which wraps them rather than letting them run to the border. Text is
  never set on a filled colour band; the panel carries it.
- **Guide lines must read in both themes.** A dotted distance or
  reference line is `alpha(PAL.ink, 0.3 to 0.4)` at 2 to 3 px, not
  `PAL.rule`.
- **Strokes have width.** A spoke ends at the rim's inner edge less half
  its own stroke (a round cap reaches that far), and the rim is stroked
  over the spokes; the same at every join of a drawn geometry.
- **A graph's frame never moves.** The axis range is fixed once per
  figure from the slider maxima (or from the default range where the
  maximum would leave the default state tiny), with round ticks and a
  comment saying where the range came from; it is never rescaled while
  the figure runs or when a slider moves. A value the range cannot hold
  is drawn with `pinned()`, held at the edge with a hollow marker and
  its number, so growth is seen against a still frame.
- **A perspective figure keeps the book's viewpoint.** Where the
  original is a perspective view of a solid, draw it with `view()` and
  `face()`: a fixed yaw and pitch chosen to match the original, faces
  shaded from one fixed lamp, no orbit controls. Do not guess a
  perspective in flat strokes, and do not add a full 3D scene where a
  flat graph carries the idea.
- **Interactivity has to earn its place.** A figure that serves an
  exercise or shows a static arrangement is a faithful drawing with no
  sliders; a sim is built only where a slider or a clock shows the reader
  something the still picture cannot. Every figure is looked at once in
  a screenshot at 1400 wide, in both themes, at its slider extremes,
  before it is called done; text drawn outside its canvas is a fault the
  `fillText` sweep catches.
