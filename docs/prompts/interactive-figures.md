# Prompt: interactive figures for one section

What an agent building a section's figures needs: the plan-line format, the drawing layer, the style numbers, the archetypes and the check. The rules the plan applies are root items 7, 14, 15, 24, 25 and 26. The long form with the reasons is `docs/rationale/interactive-figures.md`, kept for people.

## Inputs

The section's `source.md` with its `{eq:id}` markers and `FIGURE` blocks; the `ost show` summaries of the chapter (variables with type, meaning, unit; equation ids) and the section (coverage rows); the book's `RULES.md` and `COLOR.md`; the chapter's `COLOR.md`; and `omnistax-web/src/lib/fig/figlib.ts`, the drawing layer every `figures.js` calls through `F`. The book's prose is verbatim and untouched; everything added is OmniStax's, set in the sans face and written in the book's voice.

## 1. The plan line

One line per figure in `plan.md`, before any code:

```
id · replaces (Figure N.M, "Figure N.M + N.K" when folded, or Sim) · concept ids it serves · value add (root rule 24.4) · moving, with what moves, or still, with the reason · sliders and choices with their types · what the headline reads · graph below, beside, or none · 3D, with the orbit bound and the reason, or 2D
```

One figure per idea or result the section introduces; a worked example gets one only when it adds a quantity the section figure does not show. Every sketch figure in the book is replaced. Every photograph and unnumbered image is listed with keep or drop and the reason. A figure that serves an exercise is a faithful copy: no sliders, no animation. The book's numbers are the slider defaults so the figure reproduces the worked example on load. A `FIGURE` block that carries `width:` copies its widths to the row's `widths` and to `data-width` or `data-original-width` in the text; where any image lacks one, `widths` stays empty. Two to four sliders per figure, each carrying the type of its variable as its colour class, or an empty class when untyped. Extra simulations go in a separate list after the required figures, one line each saying what the reader would see; none is built until picked or until `config.md` says the plan decides. Scene above graph for a horizontal scene, graph beside for a vertical one, graph alone when the graph is the idea.

## 2. The drawing layer

Every figure is one IIFE inside `window.OMNISTAX_FIGURES['<sec>'] = function (root, F) {...}`:

```
const d = sim('sim-<id>', H);            // F.sim(root, id, H); H = canvas height in logical units
                                         // d.fig, d.c (canvas), d.stage, d.controls, d.readout
const v = ctl(d.controls, {label:'\\kv', cls:'v', min, max, step, value, unit, dec, onInput: reset});
const cy = cycle(() => T, hold);         // moving figures only: model time 0..T, then hold s
function draw() { const {ctx, W, H} = begin(d.c); ... tex(d.readout, `...`); }
register(d.fig, { update: (dt) => cy.step(dt, () => rate), draw });   // still: update: () => {}
```

The logical canvas is 1400 units wide; `begin()` scales it. Primitives, all in logical units:

```
line(ctx,x1,y1,x2,y2,color,w=3,dash)      arrow(ctx,x1,y1,x2,y2,color,w=4)
dot(ctx,x,y,color,filled=true,r=9)        text(ctx,s,x,y,color,{size=22,weight,align,base,bg})
headline(ctx,s) / topline(ctx,s)          block(...)  reserves the headline band
hbracket(ctx,x1,x2,y,color,label)         vbracket(ctx,x,y1,y2,color,label,side)
strip(ctx,x1,x2,y,h)                      scale(ctx,X,from,to,step,y,unit,every)
axes(ctx,box,[x0,x1],[y0,y1],{xl,xc,yl,yc,nx,ny,fx,fy}) -> {X,Y}     nice(lo,hi,want) -> {lo,hi,n}
curve(ctx,f,t0,t1,X,Y,color,w,n)          pinned(ctx,box,X,Y,xv,yv,color,label) -> {x,y,out}
labeller()                                a label beside its thing, stepped out and leadered when the slot is taken
person(...)                               a jointed, filled body anchored at the feet, hands to what it holds (reach, lean, phase, crouch)
view({yaw,pitch,dist,cx,cy}) -> {P,shade}  face(ctx,pts,k,stroke)     a locked perspective of a solid, no orbit
runner/car/plane/dragster(ctx,x,y,color,s) sprites; a new one stays under 12 path commands, 80 to 120 units long
```

Controls beyond the slider (root rule 26.1):

```
choice(host,{label,options:[{value,label}],value,aria,onInput}) -> {value,set}   a discrete state as a button row, arrow keys walk it
select(host,{label,options,value,aria,onInput}) -> {value,set}                    the same as a dropdown where a row would wrap
ctl(d.controls,{..., detents:[0,1,2,3] | [{v,label}], snap})                      preset values as soft ticks the thumb settles on
hover(d.stage, () => [{x,y,r,name}]) -> {hide}                                    names under the pointer where labels would crowd (rule 26.6)
```

Three dimensions (root rules 24.8, 26.2, 26.3):

```
const v = F.view3d(d.stage, {h, dist, tilt, spin, views, pitch, yaw, zoomMin, zoomMax, onRender});
v.part(x)  v.label(s,p,g,dy)  v.clear()  v.project(p,g)  v.pickable(mesh,name)  v.setView(yaw,pitch)  v.invalidate()
F.mesh.sphere(g,p,r,color,extra)   F.mesh.stick(g,a,b,r,color,extra) / setStick(m,a,b)
F.mesh.bond(g,a,b,order,r,color)   F.mesh.lobe(g,from,dir,len,color) / setLobe(m,from,dir,len)
F.mesh.arrow(g,a,b,r,color)        F.mesh.arc(g,a,b,R,centre,color) -> the label's point
F.mesh.polyline(g,pts,color)       F.mesh.box(g,p,[w,h,d],color,extra)   F.mesh.vec(p)  F.mesh.mat(color,extra)  F.mesh.geo()
```

`spin` is `'idle'`, `'off'` or `'none'` (no button); `views: [{label,yaw,pitch}]` gives one snap button each; `pitch` and `yaw` are `[min,max]` or `'free'`; the aspect comes from the stage's `data-h` or `h`, never inline. The scene mounts on the page's THREE global and disposes itself.

Colours: `C('t'|'x'|...)` for typed quantities, `PAL.ink / muted / rule / soft / panel` for everything else, `F.el('O')` only as the fill of an atom, `F.cat(i)` for instances with no type and no element, and a hex only where the colour is the physical fact and the plan names it. No other hex literal in a figure. `alpha(PAL.ink, 0.3 to 0.4)` at 2 to 3 px for guide lines.

Axis ranges are fixed per figure from the slider maxima (or from the default range where the maximum would leave the default state tiny), rounded to ticks, stated in a comment, never rescaled; a value outside the range goes through `pinned()`.

## 3. Style numbers

Type 22px for labels, 17px for ticks and notes, 24px for symbol labels, 26px for the headline; weight 600 for anything that names a variable. Strokes 3px reference, 5px main curve, 4 to 5px arrows; dashed [10,10] for averages and levels, [4,8] for drop lines; body strokes thinner than force arrows. Markers r = 9 for the moving object, 10 to 11 for endpoints; hollow = initial, filled = current or final. A strip is 44 to 56 tall; the graph box about 1080 wide and 190 to 390 tall; 60 to 110 units above the strip, 60 below for tick labels. The headline is one sentence at y = 46 stating the live numbers, wrapped by `topline()`. Labels sit beside their thing on a panel, never on it or on a colour band, clamped inside the canvas at every slider position; text is flushed last, above arrows, above bodies. A spoke ends at the rim's inner edge less half its stroke, and the rim is stroked over it. Chrome is a 1px rule border with 6px radius; sliders in a wrapping row below, readout centred under them. Chart frames are two axis lines, a few faint gridlines, round ticks, coloured axis titles.

Motion: one loop takes 4 to 6 real seconds and holds about 1.2 s; slider changes call `reset()`; the library adds the transport and reduced-motion starts the figure stopped at t = T; a still figure calls no `cycle()` and registers `update: () => {}`, and its sliders need no `onInput`.

Readout: `tex(d.readout, ...)` writes the equation with the current numbers through the `\k` macros; one line, with a second `small` line only for a fact the figure makes visible. Caption, headline and readout are full sentences in the book's voice saying what to drag and what to watch.

## 4. Archetypes

1. Strip + graph: the object on a strip with its arrows, the graph below with the moving point and a drop line.
2. Graph with a filled region: the quantity is an area or a slope, so the graph is the scene.
3. Number line + instrument: two marked positions, a bracket for the difference, a clock or gauge.
4. Root finding: a curve crossing a level twice, the unphysical crossing greyed, the object above showing the real one.
5. 3D + bars: the situation in 3D, a 2D bar canvas beneath carrying the reading.
6. Number line + sprite: two draggable positions, a bracket, a sprite between them, an odometer when path length matters.
7. Faithful copy: a book figure the problems refer to, redrawn with the book's numbers and no sliders.
8. Choice + scene: a segmented control or dropdown swaps the state or the material and the scene redraws.
9. 3D scene: a molecule or lattice with snap views, bounded orbit and hover names.

## 5. Check, once

Build into an outDir outside the repo, serve it, and run a headless Playwright pass (Python 3 with Playwright is installed; `python3 -m http.server <port> -d <outDir>` serves a build) over the page in light and dark: no console or page error, every `<img>` with `naturalWidth > 0`, every `figure.sim` with a canvas, a `.transport` on moving figures only and none on still ones, every eyebrow reading "Sim" or "Figure N.M" as its row says. Screenshot every figure once at 1400 wide in both themes at its slider extremes, then one pass of fixes for labels touching, non-round ticks, text clipped at an edge or drawn outside the canvas (the `fillText` sweep), a label under the headline. Do not loop.
