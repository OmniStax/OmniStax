# Manim style: what makes a figure feel like Manim

Rules for figures that should carry the Manim feel, whether rendered as a film or drawn live. Colour, type hues and caption voice follow the figure rules as usual.

## When to use it

Use it for a change the page can only print as a row of stills, where the order of the steps is the lesson:
- a limit closing in (secant → tangent, disks thinning, partial sums);
- a flat drawing lifted into space (region → solid of revolution, level curves → surface);
- the whole plane or space carried by a map (grids under a matrix, projection flattening space);
- algebra rewritten in step with the picture.

Keep a canvas sim when the reader should choose the numbers. A fixed tour of something the reader could drag teaches less than the drag.

Teach the book's lesson at the book's level. A zoom that shows a curve is locally straight is a calculus lesson; an algebra-based book that mentions the limit in passing gains nothing from it.

## In a live figure

1. **One timeline.** A figure has at most one transport. Physical motion has its clock; a story has its slider; never both.
2. **A story is a slider.** The steps of a story are the stops of a slider with a meaning (straight · loop · solenoid; reduction step 1 to 5). Play animates that slider; dragging it scrubs the story. Everything the story changes, the camera, morphs and fades included, is a function of the slider's value, so every position is exact in either direction.
3. **The reader's sliders are the reader's.** A story drives only what the reader has no control for: an arrangement, a bend, a step. It never moves a slider the reader owns. A value a beat wants the reader to see is a special value marked on that slider.
4. **The camera follows the values.** It is a function of the reader's sliders (the view widens as v₀ grows so the path stays framed) or of the story slider (keyframes). It is never a script over the reader's values.
5. **A camera move earns its place by changing which relation is visible.** Looking down a wire shows the circles a side view hides; tilting a wedge-and-dash drawing shows the depth it encodes. A walk around an object the reader can already orbit is removed.
6. **Special values are marked.** Every special case the text names (a limit, a threshold, a resonance) is a dashed circle on each slider it involves, recomputed from the other values, with a slight snap; landing on it fires the morph.
7. **Symbolic lines never travel.** A line that pairs two things (this transition, that spectral line) is drawn once when it changes and then holds; only kinematic arrows move (root rule 24.1).
8. **Style alone is not the point.** What reads as Manim is the motion. A restyle with no new motion is not a figure of its own; style lives in the drawing library's defaults.

## The ten rules

1. **Nothing appears; everything arrives.**
   - Curves and lines are drawn along their length (`Create`).
   - Formulas are written stroke by stroke (`Write`).
   - Vectors grow from their tail (`GrowArrow`).
   - Solids and regions fill from their outline (`DrawBorderThenFill`).
   - When a choice swaps a whole set of parts (one arrangement's graph and labels for another's), the old set fades out and the new set fades in, each with a slight shift (`FadeOut(shift=…)`, `FadeIn(shift=…)`).
2. **Nothing is replaced; it becomes.**
   - The next state is a morph of the last: p₃ bends into p₅, and 4 disks split into 8.
   - Never cut from one picture to another.
3. **Equations morph by shape.**
   - Glyph outlines bend into their counterparts point by point (`Transform`); terms that survive travel to their new places.
   - Parts match by term key first, then by identical glyph shape (`TransformMatchingTex`, `TransformMatchingShapes`).
   - Dropped parts fade out toward the parts that replace them, and new parts fade in from the parts they replace; nothing blinks in place.
   - About 1–1.5 s, `smooth`, and the formula is large enough that the morph is the event.
   - The term that changes carries the hue of the thing moving in the picture.
4. **One beat at a time.**
   - Only one idea moves at once. The eye goes to motion, so two motions split it.
   - Each beat is followed by a rest of about 1 s.
   - The film is a list of beats, and each can be named in a sentence.
5. **Families cascade.**
   - A fan of vectors, a set of grid lines or a stack of disks enters staggered (`LaggedStart`, a lag of about 0.1), never all at once.
   - When one member proves the point, it gets a pulse or a flash (`Indicate`, `Flash`).
6. **Easing is always on.**
   - Ease in and out (`smooth`) is the default.
   - A parameter running to a limit eases out, so it slows as it arrives.
   - "Try it and come back" moves use `there_and_back`.
   - Linear motion is only for time itself.
7. **The camera narrates, and only where a move changes what can be seen** (live figures: items 4 and 5 above).
   - It zooms to show local behaviour: keep zooming on (1, 1) until the curve is its tangent.
   - It orbits to show depth, and pans to follow the action.
   - It moves between beats, not during a detail.
   - A slow ambient orbit is allowed while a 3D result holds.
8. **Start flat, then lift.**
   - A scene that becomes 3D opens looking straight down, as the book page does.
   - Draw the 2D picture first. Then tilt the camera into space and build the solid from it, so the reader makes the same mental move the text asks for.
9. **Everything is live.**
   - Quantities are trackers, and every line, area and readout redraws from them (`ValueTracker`, `always_redraw`).
   - Numbers tick (`DecimalNumber`); never swap one typeset number for another.
10. **End on the answer and hold.**
    - The last beat writes the result, such as V = 412π/15, and holds it for 3–4 s.
    - The final frame is the poster.

## Numbers

| | |
|---|---|
| Length | 20–40 s, one question per film |
| Beat | 0.8–2 s of motion, then about 1 s of rest |
| Camera move | 2–3 s |
| Colour | ground `--panel`; structure in ink; axes and ticks muted; type hues for quantities; one accent moving at a time |
| Text | only formulas and one-word labels on screen; the caption carries the sentences |

## The API

Live figures reach these on `F`. Physical time (a sim's cycles, linear, the grey transport) and story time (a tour, eased, in beats, the accent transport) never mix; a figure may have both. Durations are in milliseconds.

**Easing.** `F.ease.smooth | out | inOut | thereAndBack | linear`, each `(t) => k` on [0, 1]. `smooth` is the default everywhere; `out` for a parameter running to a limit; `linear` only for time.

**Arrival.** `F.partial(pts, k)` is the first fraction k of a polyline (2D or 3D points) by arc length. Draw a curve along its length with `partial(pts, k)`; grow an arrow from its tail by putting its head on the last point.
```js
const pts = partial(orbit, reveal.v); F.mesh.polyline(g, pts, C('position'));
```

**Trackers.** `F.tween(d, v0)` returns `{ v, to(x, ms = 1000, ease = smooth): Promise, set(x) }`; `d` is the object `F.sim` returned. The draw reads `.v`; while `.to` runs the figure redraws every frame. A new `.to` or `.set` takes over from one running. Reduced motion jumps.
```js
const reveal = F.tween(d, 0); reveal.to(1, 1500);
```

**Camera.** A `view3d` also has `at` (`{ yaw, pitch, zoom, target }`), `look(aim)` (jump), `glide(aim, ms = 2000, ease)` (resolves on arrival or when the reader takes over) and `onReader(f)` (called on a drag, wheel, zoom, view or spin button; returns its removal). `aim` is any part of `at`; `target` is the point looked at, so a glide can pan and dolly. The orbit bound still clamps. `setView` is unchanged. `look` and `glide` stop the idle spin.

**Controls a script can move.** `ctl`, `choice` and `select` handles have `drive(x)`: set the value and fire the events a reader's hand fires, so the figure reacts as if dragged. `set(x)` stays silent, as before.

**Tours.** `F.tour(d, { beats, camera? })` returns `{ play, pause, seek(s), next, prev, t, total, playing, bar }`. Create it after the controls and the view, at their opening values: those are the base of the script.
- A beat is `{ name, ms = 1200, rest = 1000, ease = smooth, knobs?, view?, run?, enter? }`. `name` is one sentence; it titles the beat's tick and the play button.
- `knobs: [[handle, value], …]` names the objects the figure holds. A number glides over the beat; a choice switches at the beat start.
- `view` is a camera aim for `camera` (a `view3d`), eased over the beat.
- `run(k)` receives the beat's eased progress, 0 before the beat and 1 after it; derive everything from `k`, never accumulate.
- `enter()` fires when the beat becomes the current one, in either direction.
- The state at story time s depends only on s, so seeking backward is exact.
- The tour autoplays the first time the figure is on screen and holds its last beat. Any reader input on the figure (a control, the camera, the canvas) pauses it; play then glides every scripted knob and the camera back to the script in 0.8 s and continues.
- Reduced motion: no autoplay; play, previous and next jump to the end of a beat.
```js
const tour = F.tour(d, { camera: V, beats: [
  { name: 'The current doubles.', knobs: [[iS, 50]], view: { yaw: 0.4, pitch: 0.8 } },
  { name: 'The wire closes into a loop.', knobs: [[arrC, 'loop']], view: { zoom: 1.4, target: [0.3, 0, 0] } },
] });
```

**Formula morphs.** Tag terms with `\mk{key}{…}`; the book's colour macros work inside a tag. `F.morph(host, tex, display?)` renders like `F.tex`. When the set of keys differs from the host's last render, kept terms slide to their new places, dropped terms fade where they stood and new terms wipe in, over 0.6 s. The same keys re-render plainly, so live numbers stay cheap: keep the numbers out of the keys. Reduced motion swaps and highlights the new terms.
```js
F.morph(d.readout, n === 1 ? '\\mk{B}{B} = \\mk{f}{\\frac{\\mu_0 I}{2R}}' : '\\mk{B}{B} = \\mk{N}{N}\\mk{f}{\\frac{\\mu_0 I}{2R}}');
```
