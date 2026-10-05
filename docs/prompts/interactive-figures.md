# Prompt: interactive figures for one section

What an agent building a section's figures needs: the plan-line format, the drawing layer, the style numbers, the archetypes and the check. The rules the plan applies are root items 7, 14, 15, 24, 25 and 26. The long form with the reasons is `docs/rationale/interactive-figures.md`, kept for people.

## Inputs

The section's `source.md` with its `{eq:id}` markers and `FIGURE` blocks; the `ost show` summaries of the chapter (variables with type, meaning, unit; `ost rows <book> forms --section N.M` for the form ids) and the section (coverage rows); the book's `RULES.md` and `COLOR.md`; the chapter's `COLOR.md`; and `omnistax-web/src/lib/fig/figlib.ts`, the drawing layer every `figures.js` calls through `F`. The book's prose is verbatim and untouched; everything added is OmniStax's, set in the sans face and written in the book's voice.

## 1. The plan line

One line per figure in `plan.md`, before any code:

```
id · replaces (Figure N.M, "Figure N.M + N.K" when folded, or Sim) · concept ids it serves · value add (root rule 24.4) · arrows: kinematic (naming what moves or flows), symbolic, or none (24.1; kinematic sets the floor at a moving figure) · moving, with what moves, or still, with the reason · sliders and choices with their types · what the headline reads · graph below, beside, or none · 3D, with the orbit bound and the reason, or 2D
```

One figure per idea or result the section introduces; a worked example gets one only when it adds a quantity the section figure does not show. Every sketch figure in the book is replaced. Every photograph and unnumbered image is listed with keep or drop and the reason. A figure that serves an exercise is a faithful copy: no sliders, no animation. The book's numbers are the slider defaults so the figure reproduces the worked example on load. A `FIGURE` block that carries `width:` copies its widths to the row's `widths` and to `data-width` or `data-original-width` in the text; where any image lacks one, `widths` stays empty. Two to four sliders per figure, each carrying the type of its variable as its colour class, or an empty class when untyped. Extra simulations go in a separate list after the required figures, one line each saying what the reader would see; none is built until picked or until `config.md` says the plan decides. Scene above graph for a horizontal scene, graph beside for a vertical one, graph alone when the graph is the idea.

## 2. The drawing layer

Every figure is one IIFE inside `window.OMNISTAX_FIGURES['<sec>'] = function (root, F) {...}`, and finds its elements only through `F.sim(root, id, H)` or `F.byId(root, id)`. The types it draws are the ones its sliders carry (`cls`), its `C()` lookups name and its readouts write with a `\k` macro; the figure row's `draws` lists them.

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
measure(ctx,s,{size=22,weight}) -> width  the width text() gives s, subscripts included; never set ctx.font to measure
headline(ctx,s) / topline(ctx,s)          both wrap to two lines where one will not fit and return the line count; a $…$ run is set
                                          as TeX under the figure's macros (\k symbols wear their colours), and v.headline does the same
label(ctx,s,x,y,{side,size,color,gap,leader}) -> box   one label beside one thing, clamped inside the canvas, leadered
hbracket(ctx,x1,x2,y,color,label,{side})  vbracket(ctx,x,y1,y2,color,label,side,{side})  label clamped when the span is short
note(ctx,box,text,avoid) -> box           a sentence in whichever corner of a graph box the forbidden boxes leave clear
angleArc(ctx,{x,y},r,a0,a1,text,labeller) an angle's arc, its two arms and its name at the bisector
fitScale(box,{w,h}) -> units per metre    one fixed scale for a scene, from the greatest extents the sliders reach
strip(ctx,x1,x2,y,h)                      scale(ctx,X,from,to,step,y,unit,every)
axes(ctx,box,[x0,x1],[y0,y1],{xl,xc,yl,yc,nx,ny,fx,fy}) -> {X,Y}     nice(lo,hi,want) -> {lo,hi,n}
curve(ctx,f,t0,t1,X,Y,color,w,n)          pinned(ctx,box,X,Y,xv,yv,color,label) -> {x,y,out}
arrival(d) -> 0..1                        axes and curves arrive on first view; register(fig,{...,arrive:false}) opts out
stagger(k,i,n,lag=0.1)                    member i of n within progress k (LaggedStart)
resample(pts,n,closed) / lerpPts(a,b,k,closed)   polylines evenly by arc length; two blended point by point
faded(ctx,alpha,[dx,dy],draw)             draw under globalAlpha × alpha, translated; choice.only(ctx,v,draw,shift) and presence.draw(ctx,key,draw) use it
mixColor(a,b,k)                           two CSS colours blended in sRGB; choice.mixColor(f) crossfades f(from) to f(value)
blendCurve(ctx,fa,fb,k,t0,t1,X,Y,color,w,n)   curve of two functions blended at the same t; choice.curve(ctx,fOf,...) bends fOf(from) into fOf(value)
readout(d) -> {formula,note,set(tex,note,{form})}   a morphing formula over a note line; a new form forces the morph
tex(host,s,display,{values})              a changed number in a figure's readout is highlighted; values:false opts out
labeller(ctx,H,{headline})                a label beside its thing, stepped out and leadered when the slot is taken; headline blocks the band
labeller.beside(seg,side,text,color,size,{offset,gap})   beside the line, offset 0 at the tail and 1 at the head (0.5 default)
labeller.place(box,text) -> box           a box the figure drew itself joins the collision set, so queued labels step round it
labeller.halo(seg,w)                      a panel band under an arrow that crosses a body; flush() returns the labels that found no slot
vectorTriangle(ctx,tail,a,b,{color,color2,diff,names,dy,lab}) -> {tail,head}   two vectors from one tail and their difference a row below
wrap(ctx,[start,end],pulleys,r,color)     one cable: outside tangents, the rim round each pulley, the wheels drawn
person(...)                               a jointed, filled body anchored at the feet, hands to what it holds (reach, lean, phase, crouch)
silhouette(ctx,{x,y,s,face,pose,color,phase,front,kneeSide,...joints})   a filled body posed by name (stand, walk, run, lean, crouch,
                                          push, pull, sit, reach) or by joint, a joint passed as undefined keeping the pose's own;
                                          phase 0..1 swings the feet and hands of walk and run; kneeSide is one sign or one per leg and
                                          front splays the knees for a frontal crouch; a hand past F.silhouette.reach(s) is drawn at the
                                          reach; limbs never pass 3 units, and F.silhouette.height(s) is how tall it stands
view({yaw,pitch,dist,cx,cy}) -> {P,shade}  face(ctx,pts,k,stroke)     a locked perspective of a solid, no orbit
runner/car/plane/dragster(ctx,x,y,color,s) sprites; a new one stays under 12 path commands, 80 to 120 units long
crate(ctx,x,y,w,h,color)                  a framed box of planks with a batten down each end, filling w by h
house(ctx,x,y,w,stories,color) -> height  w wide on the ground line, 0.62 w a story under a roof half as wide again
shopfront(ctx,x,y,w,h,name,color)         a scalloped awning over a door and a window, the name on the sign above
horse(ctx,x,y,s,phase,color,face)         about 156 by 120 at s = 1; phase runs the gallop
helicopterTop(ctx,x,y,s,a,rotor,color)    seen from above, about 150 by 88 at s = 1; a is the heading in radians
rowboat(ctx,x,y,s,heading,color)          seen from above, about 64 by 66 at s = 1, oars included
sailboat(ctx,x,y,s,color)                 waterline at (x, y), about 78 by 76 at s = 1
skydiver(ctx,x,y,s,color)                 spread-eagled and seen from below, about 92 by 112 at s = 1
fist(ctx,x,y,ux,uy,s,color)               a gripping hand on a forearm; (x, y) is the grip, (ux, uy) the way the forearm runs back
hand(ctx,x,y,{aim,view,curl,thumb,right,s,color,ink})   the library's hand, wrist at (x, y), fingers along aim [dx,dy], about 110
                                          wrist to fingertip at s = 1; view 'palm' | 'back' | 'side' (the palm faces aim turned a quarter
                                          clockwise); curl 0 straight to 1 closed; thumb 'up' (across the fingers), 'along' or 'out' (of the
                                          palm); right false mirrors it; outlined in ink, filled at half opacity; a figure never draws its own
cart(ctx,x,y,w,h,color)                   a block w by h on two wheels, the wheels standing on y + h / 2 + 2 r
personTop(ctx,x,y,s,heading,color,reach)  head and shoulders from above, about 56 by 26 at s = 1; reach is the two points the hands hold
motorcycle(ctx,x,y,s,color)               side view facing right, (x, y) the rear hub, about 330 by 200 at s = 1
helicopterSide(ctx,x,y,s,color)           side view, nose right, about 215 by 110 at s = 1
coasterCar(ctx,x,y,s,color)               a car and its rider, wheels on the rail at (x, y), about 62 by 58 at s = 1
cardboardBox(ctx,x,y,w,h,color)           a taped box, w by h on the front face and h / 4 of perspective up and to the right
cupOnSide(ctx,x,y,s,color)                a foam cup lying on its side, mouth at (x, y), about 84 by 66 at s = 1
guitar(ctx,x,y,s,color)                   a classical guitar lying flat, about 980 by 280 at s = 1; F.guitar.string(x,s) -> {nut,bridge}
book(ctx,x,y,w,h,color)                   a closed book with its cover, spine and pages, filling w by h
backpack(ctx,x,y,s,color)                 a pack hanging by its straps, top at (x, y), about 96 by 130 at s = 1
```

Controls beyond the slider (root rule 26.1):

```
choice(host,{label,options:[{value,label}],value,aria,onInput,ms}) -> {value,set,drive,k,from,mix,a,off}   a discrete state as a button row, arrow keys walk it
select(host,{label,options,value,aria,onInput,ms}) -> the same handle            the same as a dropdown where a row would wrap
  k 0..1 since the last change; mix(f) blends f(from) to f(value); a(v), off(v,shift) fade and slide the parts only v has
ctl(d.controls,{..., detents:[0,1,2,3] | [{v,label}], snap})                      preset values as soft ticks the thumb settles on
ctl / choice / select {..., key}                                                   the id a note stores the value under; default the cls ("choice" for a picker), then cls-2, cls-3
  a track under 120 px drops to its own line below its name and value (rule 26.12); keep names short rather than lean on it
hover(d.stage, () => [{x,y,r,name}]) -> {hide}                                    names under the pointer where labels would crowd (rule 26.6)
```

Three dimensions (root rules 24.8, 26.2, 26.3):

```
const v = F.view3d(d.stage, {h, dist, tilt, spin, views, pitch, yaw, zoomMin, zoomMax, onRender});
v.part(x)  v.label(s,p,g,dy)  v.headline(s)  v.clear()  v.project(p,g)  v.pickable(mesh,name)  v.setView(yaw,pitch)  v.invalidate()
F.mesh.sphere(g,p,r,color,extra)   F.mesh.stick(g,a,b,r,color,extra) / setStick(m,a,b)
F.mesh.bond(g,a,b,order,r,color)   F.mesh.lobe(g,from,dir,len,color) / setLobe(m,from,dir,len)
F.mesh.arrow(g,a,b,r,color)        F.mesh.arc(g,a,b,R,centre,color) -> the label's point
F.mesh.polyline(g,pts,color)       F.mesh.box(g,p,[w,h,d],color,extra)   F.mesh.vec(p)  F.mesh.mat(color,extra)  F.mesh.geo()
F.mesh.hand({curl,thumb,right,scale,color,ink,opacity,aim,palm,at,grip}) -> THREE.Group, the caller adds it: the hand of F.hand in
                                   3D, wrist at `at` or fingers closed round `grip` (a wire), fingers along aim, palm facing palm, thumb
                                   along aim × palm on a right hand; ink rim and half fill, recoloured through userData.ink and .fill,
                                   each mesh's part (palm, wrist, thumb, index, middle, ring, little) in userData.part for hover names
```

`v.label` is one line pinned to a point of the scene; `v.headline` is the stage's own band, centred at the top edge and wrapped over as many lines as the sentence takes. `spin` is `'idle'`, `'off'` or `'none'` (no button); `views: [{label,yaw,pitch}]` gives one snap button each; `pitch` and `yaw` are `[min,max]` or `'free'`; the aspect comes from the stage's `data-h` or `h`, never inline. The scene mounts on the page's THREE global and disposes itself.

Colours: `C('t'|'x'|...)` for typed quantities, `PAL.ink / muted / rule / soft / panel` for everything else, `F.el('O')` only as the fill of an atom, ion or molecule and `F.el('e-')`, `F.el('p+')`, `F.el('n0')` as the fill of a lone electron, proton or neutron (a charge's sign is told by its label, never by a hue), `F.ref(id)` for the section's referents and `F.cat(i)` for other instances with no element that must be told apart, and a hex only where the colour is the physical fact and the plan names it: a named constant, named as the fact, unchanged in both themes, drawn through `F.fact(hex)` (the NFPA diamond of Chemistry 2e 1.3; a spectral colour computed from a wavelength goes through `F.fact` too). No other hex literal in a figure. `alpha(PAL.ink, 0.3 to 0.4)` at 2 to 3 px for guide lines.

`F.ref('block-1')` for a row of the section's `referents` table, the one thing of an example that the text marks `<span data-ref="block-1">`: it returns the referent colour the text wears beside it, one of the reader's thirty-six, dealt within the referent's scope (its figures and the text blocks that mention it) and kept at the reader's target distance from the scope's category, convention and fact colours, so it is one colour in every figure; referents whose scopes don't touch reuse colours. List in the referent's `figures` every figure that draws it, and in `draws`, `conventions` and `facts` what the figure colours, so the referent colours keep clear of them. `F.cat(i)` already skips the colours of the section's referents. Call it in `draw`, as `C`. A symbol for a referent's quantity (F_x of the first tug) is split by its variables row's `ref`: its subscript wears the referent's hue in the text, and a readout set through `F.tex` inside the section does the same.

Axis ranges are fixed per figure from the slider maxima (or from the default range where the maximum would leave the default state tiny), rounded to ticks, stated in a comment, never rescaled; a value outside the range goes through `pinned()`.

The reader has four colour switches, All, Facts and conventions, Referents and Concepts (its two sub-switches, Words and phrases and Symbols, reach only text and readouts: Symbols off sets a readout's and a slider value's `.kv-` symbols in ink), and a figure reaches them only through the library: `C` follows Concepts, `F.ref` and `F.cat` follow Referents, `F.el` and `F.fact` follow Facts and conventions, and each answers `PAL.ink` while its switch is off; All off turns all of them to ink. A colour written any other way stays on whatever the reader chose. Every switch redraws every figure, so read colours in `draw`, never once at setup; a scene that caches its materials keys them on a signature that includes `F.CC`, the `F.el` and `F.cat` it uses (`F.shown` holds all three families).

## 3. Style numbers

Type 22px for labels, 17px for ticks and notes, 24px for symbol labels, 26px for the headline; weight 600 for anything that names a variable (a serif figure font sets it at regular weight; root rule 26.10). Every string goes through the library's text functions, never `fillText` (root rule 26.8). Strokes 3px reference, 5px main curve, 4 to 5px arrows; dashed [10,10] for averages and levels, [4,8] for drop lines; body strokes thinner than force arrows. Markers r = 9 for the moving object, 10 to 11 for endpoints; hollow = initial, filled = current or final. A strip is 44 to 56 tall; the graph box about 1080 wide and 190 to 390 tall; 60 to 110 units above the strip, 60 below for tick labels. The headline is one sentence at y = 46 stating the live numbers, wrapped by `topline()`. Labels sit beside their thing on a panel, never on it or on a colour band, clamped inside the canvas at every slider position; text is flushed last, above arrows, above bodies. A spoke ends at the rim's inner edge less half its stroke, and the rim is stroked over it. Chrome is a 1px rule border with 6px radius; sliders in a wrapping row below, readout centred under them. Chart frames are two axis lines, a few faint gridlines, round ticks, coloured axis titles.

Motion: one loop takes 4 to 6 real seconds and holds about 1.2 s; slider changes call `reset()`; the library adds the transport and reduced-motion starts the figure stopped at t = T; a still figure calls no `cycle()` and registers `update: () => {}`, and its sliders need no `onInput`.

Readout: `tex(d.readout, ...)` writes the equation with the current numbers through the `\k` macros; one line, with a second `small` line only for a fact the figure makes visible, and that line writes its symbols through the macros too (root rule 26.13). Caption, headline and readout are full sentences in the book's voice saying what to drag and what to watch. Headline, scene, controls, readout and note are not a form to fill: a part that would repeat another is left out, and a note that says what the caption or readout already says is dropped.

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
10. Two views: a flat drawing and a 3D scene of the same thing behind an `F.choice` labelled view (2D, 3D), 2D the default, the `F.view3d` stage mounted on the first switch and disposed with the figure; sliders and readout shared by both.

## 5. Check, once

Build into an outDir outside the repo, serve it, and run a headless Playwright pass (Python 3 with Playwright is installed; `python3 -m http.server <port> -d <outDir>` serves a build) over the page in light and dark: no console or page error, every `<img>` with `naturalWidth > 0`, every `figure.sim` with a canvas, a `.transport` on moving figures only and none on still ones, every eyebrow reading "Sim" or "Figure N.M" as its row says. Screenshot every figure once at 1400 wide in both themes at its slider extremes, then one pass of fixes for labels touching, non-round ticks, text clipped at an edge or drawn outside the canvas, a label under the headline. A figure that moves or morphs is judged from frames, not from its end state: capture each change mid-way (about 40 %) and at rest, in light and dark, and once with reduced motion, and look at them as a reader. Read the caption and the plan line again against what the figure now does. Do not loop.
