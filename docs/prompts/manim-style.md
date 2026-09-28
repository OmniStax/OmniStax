# Figure style: Manim is the house style

Every figure and simulation is drawn and moved in the Manim manner. Manim is three things: its look, its morphing transitions, and its directed camera. The look and the morphing are the default for every figure. A directed sequence, where the figure plays a story with the camera, is rare: the building agent uses one only where it judges that a guided order teaches more than free exploration, and then does it fully. Colour, type hues and caption voice follow the root rules as usual.

## What a figure is

1. **A camera move changes which relation is visible.** Turning a flat diagram edge-on shows the depth it encodes; looking straight down a spinning axle shows the circle a side view hides. A move that only shows the same thing from elsewhere, around an object the reader can already turn, is removed.
2. **A pictured object may become its abstraction.** A drawn crate shrinks to the point of its free-body diagram and carries its forces with it; a sketched pendulum bob becomes the dot on a phase plot. The picture and the abstraction are one thing seen two ways, so one morphs into the other.
3. **Flat or 3D is a teaching choice** (root rule 28): 3D is physical when the object is the lesson, mathematical when the vectors, fields or surfaces are, and a mathematical scene is drawn in this style and may lift out of its own flat drawing.
4. **Physical time is linear; easing is for everything else.** A falling body is never eased. The story, the camera, reveals and morphs always are.

## Timeline and controls

5. **One timeline.** A figure has at most one transport, and every transport is play/pause, the timeline and the speed. Physical motion has its clock; a story has its slider; never both.
6. **A story is a slider.** Its steps are the stops of a slider with a meaning (one spring · two in series · two in parallel). Play animates that slider and dragging it scrubs; everything the story changes, camera, morphs and fades included, is a function of the slider's value, so every position is exact in either direction. A story drives only what the reader has no control for; it never moves a reader's slider. A slider whose part the story folds into another stays, and moving it visibly moves the part it now lives in.
7. **The camera follows the values:** it is a function of the reader's sliders (the view widens as a launch speed grows so the whole path stays framed) or of the story's (keyframes), never a script over the reader's values.
8. **Special values are marked.** Every special case the text names (a limit, a threshold, a resonance, an equal pair) is a dashed circle on each slider it involves, recomputed from the other values, with a slight snap; landing on it fires the morph. On a pulley with two masses, the circle on one mass's slider sits at the other's current value.
9. **Sliders carry over through a story.** A slider whose quantity continues keeps its place and relabels (a separation d that the next stage calls the radius r); only a new quantity fades in and a leaving one fades out, and the row reflows smoothly, never showing both sets at once.
10. **No options for visual settings.** Controls change the physics, never how the figure looks: no toggles to show or hide a part of the drawing, its labels or a helper. The figure decides what is drawn (root rule 26.7).

## Equations

11. **Equations morph by meaning.** The same variable moves to its new place. A new name for essentially the same thing bends into it. Terms that combine into one quantity bend together into it (1/k₁ + 1/k₂ bending into 1/k_eff), and one quantity that splits bends out into its parts. Nothing becomes something it does not stand for, however good it would look: a term with no counterpart fades out toward where the new terms appear.
12. **One inline equation at the book's size:** symbols = numbers = result, one line that wraps at its `=` signs, never a second, larger copy.
13. **Values never morph.** A number a slider changes shows its new value at once, with a faint yellow highlight over the number itself (units left bare) in the picture and in the formula while it moves. Shape morphs are for changes of form. A readout a clock drives never morphs and never highlights.
14. **The equation is true as written in every state.** A term a case cancels leaves its sums too; the numbers shown add up to the result shown.

## Motion

15. **Nothing appears; everything arrives.**
   - Curves and lines are drawn along their length (`Create`); vectors grow from their tail (`GrowArrow`); regions fill from their outline (`DrawBorderThenFill`).
   - When a choice or a story swaps a set of parts, the parts with a counterpart morph into it and only the rest fades, with a slight shift (`FadeOut(shift=…)`, `FadeIn(shift=…)`): a graph of the same kind of quantity keeps its frame while its curve reshapes; a graph of another quantity keeps its frame and replaces its curve and axis. A panel never fades out to fade back in as nearly itself.
16. **Nothing is replaced; it becomes.** The next state is a morph of the last: a square wave's three-term sum bends into its five-term sum; four slices split into eight. Never cut from one picture to another.
17. **Symbolic lines never travel.** A line that pairs two things (this transition, that point on a scale) is drawn once when it changes and then holds; only kinematic arrows move (root rule 24.1).
18. **One beat at a time.** Only one idea moves at once; each beat is followed by a rest of about 1 s, and each can be named in a sentence.
19. **Families cascade.** A fan of vectors, a set of grid lines or a stack of slices enters staggered (`LaggedStart`, a lag of about 0.1). When one member proves the point, it gets a pulse (`Indicate`).
20. **Easing is always on.** `smooth` is the default; a parameter running to a limit eases out; "try it and come back" uses `there_and_back`.
21. **Start flat, then lift.** A scene that becomes 3D opens looking straight down, as the page does; the flat picture comes first, then the camera tilts into space and the solid is built from it.
22. **End on the answer and hold.** A directed sequence's last beat writes the result and holds it for 3–4 s; the final frame is the poster.

## Numbers

| | |
|---|---|
| Directed sequence | 20–40 s, one question |
| Beat | 0.8–2 s of motion, then about 1 s of rest |
| Camera move | 2–3 s |
| Formula morph | 1–1.5 s, `smooth` |
| Value highlight | held while the value changes, fading over 0.6 s after |
| Colour | ground `--panel`; structure in ink; axes and ticks muted; type hues for quantities; one accent moving at a time |
| Text | only formulas and short labels on screen; the caption carries the sentences |

## The API

Live figures reach these on `F`. Physical time (a sim's cycles, linear) and story time (a story slider or a tour, eased) never mix, and a figure has one or the other; both use the same play · timeline · speed transport. Durations are in milliseconds.

**Easing.** `F.ease.smooth | out | inOut | thereAndBack | linear`, each `(t) => k` on [0, 1]. `smooth` is the default everywhere; `out` for a parameter running to a limit; `linear` only for time.

**Arrival.** `F.partial(pts, k)` is the first fraction k of a polyline (2D or 3D points) by arc length. Draw a curve along its length with `partial(pts, k)`; grow an arrow from its tail by putting its head on the last point.
```js
const pts = partial(orbit, reveal.v); F.mesh.polyline(g, pts, C('position'));
```

**Graphs arrive.** The first time a figure is on screen, `axes` draw their frame (lines along their length, then ticks and titles fading in) over the first 40 % of 1.1 s and `curve` draws along its length over 30 % to 100 %, `smooth`; once per figure per page load, never under reduced motion. `register(fig, { update, draw, arrive: false })` opts out. `F.arrival(d)` is the figure's arrival progress (1 once arrived or opted out); `F.stagger(k, i, n, lag = 0.1)` is member i of n within k (LaggedStart).
```js
const k = F.arrival(d); forces.forEach((f, i) => grow(f, F.stagger(F.ease.smooth(k), i, forces.length)));
```

**Shapes that bend.** `F.resample(pts, n, closed = false)`: a polyline (2D or 3D) resampled to n points evenly by arc length. `F.lerpPts(a, b, k, closed = false)`: both at the larger count, blended point by point.
```js
const ring = F.lerpPts(outline, dot, k, true);
```

**Trackers.** `F.tween(d, v0)` returns `{ v, to(x, ms = 1000, ease = smooth): Promise, set(x) }`; `d` is the object `F.sim` returned. The draw reads `.v`; while `.to` runs the figure redraws every frame. A new `.to` or `.set` takes over from one running. Reduced motion jumps.
```js
const reveal = F.tween(d, 0); reveal.to(1, 1500);
```

**Camera.** A `view3d` also has `at` (`{ yaw, pitch, zoom, target }`), `look(aim)` (jump), `glide(aim, ms = 2000, ease)` (resolves on arrival or when the reader takes over) and `onReader(f)` (called on a drag, wheel, zoom, view or spin button; returns its removal). `aim` is any part of `at`; `target` is the point looked at, so a glide can pan and dolly. The orbit bound still clamps. `setView` is unchanged. `look` and `glide` stop the idle spin.

**Controls a script can move.** `ctl`, `choice` and `select` handles have `drive(x)`: set the value and fire the events a reader's hand fires, so the figure reacts as if dragged. `set(x)` stays silent, as before.

**Choices that morph.** `choice` and `select` take `ms` (900; 0 cuts) and their handles have `k` (smooth progress since the last change, 1 at rest), `from` (the value before it), `mix(f)` (`f(from)` blended to `f(value)` at k; f returns a number, a number array or a flat record of those), `a(v)` (opacity of the parts only option v has: the old gone by 60 %, the new arriving over the last 60 %) and `off(v, shift)` ([dx, dy], arriving from -shift, leaving toward +shift). The figure redraws while k < 1; `set` cuts, `drive` morphs; reduced motion cuts. Readouts print the new value's numbers, never a blend.
```js
const n = mat.mix((m) => INDEX[m]); ctx.globalAlpha = mode.a('series');
```
Three more on the same handles: `only(ctx, v, draw, shift = [0, 12])` draws the parts only v has, faded and shifted (`F.faded` at `a(v)`, `off(v, shift)`); `mixColor(f)` is `f(from)` crossfaded to `f(value)`; `curve(ctx, fOf, t0, t1, X, Y, color, w = 4, n = 80)` strokes the curve of `fOf(from)` bending into `fOf(value)`.
```js
mode.only(ctx, 'pump', () => text(ctx, 'heat pump', MX, MY, PAL.ink));
ctx.fillStyle = fl.mixColor((v) => FLUIDS[v].color);
nPick.curve(ctx, (v) => (s) => Math.sin(+v * Math.PI * s / L), 0, L, X, Y, C('position'));
```
`F.faded(ctx, alpha, [dx, dy], draw)`: draw under globalAlpha × alpha, translated; skipped at 0. `F.mixColor(a, b, k)`: any two CSS colours blended in sRGB. `F.blendCurve(ctx, fa, fb, k, t0, t1, X, Y, color, w = 4, n = 80)`: `curve` of fa and fb sampled at the same t, blended at k.

**Tours** (a story slider is preferred; keep a tour only where no slider can carry the story). `F.tour(d, { beats, camera? })` returns `{ play, pause, seek(s), next, prev, t, total, playing, bar }`. Create it after the controls and the view, at their opening values: those are the base of the script.
- A beat is `{ name, ms = 1200, rest = 1000, ease = smooth, knobs?, view?, run?, enter? }`. `name` is one sentence; it titles the beat's tick and the play button.
- `knobs: [[handle, value], …]` names the objects the figure holds. A number glides over the beat; a choice switches at the beat start.
- `view` is a camera aim for `camera` (a `view3d`), eased over the beat.
- `run(k)` receives the beat's eased progress, 0 before the beat and 1 after it; derive everything from `k`, never accumulate.
- `enter()` fires when the beat becomes the current one, in either direction.
- The state at story time s depends only on s, so seeking backward is exact.
- The tour autoplays the first time the figure is on screen and holds its last beat. Any reader input on the figure (a control, the camera, the canvas) pauses it; play then glides every scripted knob and the camera back to the script in 0.8 s and continues.
- The bar is play/pause · the story scrubber with a tick per beat · speed; `next` and `prev` stay for code.
- Reduced motion: no autoplay; play jumps to the end of the next beat.
```js
const tour = F.tour(d, { camera: V, beats: [
  { name: 'The spring constant doubles.', knobs: [[kS, 40]], view: { yaw: 0.4, pitch: 0.8 } },
  { name: 'A second spring joins in series.', knobs: [[arrC, 'series']], view: { zoom: 1.4, target: [0.3, 0, 0] } },
] });
```

**Special values on a slider.**
`F.ctl(host, { ..., specials: [{ at, label? }] })`; `at` is a number or `() => number | null` (null or out of range hides it).
Drawn as a dashed circle on the track in the slider's hue, filled while the thumb sits on it. Positions recompute on every input/change of the figure and on `handle.refresh()`; `handle.mark(list)` replaces the list.
Drag catches within 1.5 % of the track, lets go beyond 3 %, and sets the exact value; arrows step on the step grid; Page Up/Down jump to the next circle. `detents` are unchanged and may sit beside specials.
```js
f = F.ctl(d.controls, { label: 'f', cls: 'f', min: 10, max: 1000, step: 10, value: 300, unit: 'Hz',
  specials: [{ at: () => 1 / (2 * Math.PI * Math.sqrt(L.v * C.v)), label: 'resonance' }] });
```
`F.solve(g, lo, hi)`: a root of g in [lo, hi], or null. A circle for "the value of this variable that makes the relation hold":
`{ at: () => F.solve((l) => 1 / (2 * Math.PI * Math.sqrt(l * C.v)) - f.v, 1e-3, 0.1) }`.

**Story slider.**
`F.story(d, slider, { stops, ms = 1200, rest = 1000, ease = smooth })` → `{ play, pause, next, prev, playing, bar }`.
- The slider is the story; its transport is play/pause · the slider as timeline · speed, the same bar as physical time. Play drives it stop to stop and, at the last stop, starts again from the first; speed scales the moves and rests. Stops (`number | { v, label }`) become its special values; dragging scrubs and pauses; arrows step, Page Up/Down jump between stops.
- `F.story` moves the slider out of the controls row into that transport as its scrubber, spanning the stage: no value readout, each stop's label (one or two short words) small beneath its circle, the current one emphasised; labels that would collide hide, current stop and ends kept. The slider's label is only its aria-label.
- Derive everything from `slider.v`; never drive a reader's slider from a story.
- One timeline per figure: `F.story` refuses (console error, returns null) on a figure with cycles, and `F.register` complains about cycles on a story figure.
- Reduced motion: no autoplay; play jumps to the next stop.
```js
const k = F.ctl(d.controls, { label: 'step', cls: 'k', min: 0, max: 2, step: 0.01, value: 0, unit: '' });
F.story(d, k, { stops: [{ v: 0, label: 'one spring' }, { v: 1, label: 'series' }, { v: 2, label: 'parallel' }] });
```

**Keyframes.**
`F.keyframes(s, frames)`, pure: frames `{ at, ease?, ...numbers or number arrays }`; values at s eased (smooth, or the later frame's `ease`) between neighbours, held beyond the ends; a key a frame omits carries over.
`V.look(F.keyframes(k.v, [{ at: 0, yaw: 0, pitch: 0.3 }, { at: 1, yaw: 1.57, pitch: 0 }]))`

**Fades.**
`F.presence(d)` → `{ show(key, on, { ms = 500, shift? }), swap(from, to, opts), a(key), off(key), draw(ctx, key, draw) }`; `draw` is `F.faded(ctx, a(key), off(key), draw)`. A key never shown is present (a = 1); hide it first with `show(key, false, { ms: 0 })`.
Draw a layer under `ctx.globalAlpha = P.a(key)`, offset by `P.off(key)` ([dx, dy]: arriving from -shift, leaving toward +shift).
```js
P.swap('series', 'parallel', { shift: [0, 30] });
```
`F.fade3(group, a)`: three.js group opacity; materials transparent below 1, own transparency and depthWrite restored at 1, hidden at 0.
`F.fadeEl(el, on, { ms, shift })`: the same for DOM parts, shift in pixels; hidden parts get visibility hidden and aria-hidden.

**Formula morphs.** A morph host shows MathJax glyph outlines (lazy chunk, fetched on the first morph) at the size and baseline of the KaTeX text around it, one line breaking after each top-level `=`; leave the host unsized, as `F.tex` output is. Tag every term by what it means with `\mk{key}{…}`, numbers included; the book's colour macros work inside and outside a tag.

`F.morph(host, tex, display?, opts?)` — `opts: { ms = 1200, pathArc = 0, keyMap, force, values = true }`; `display` may be skipped (`F.morph(host, tex, opts)`).
- The same string again does nothing.
- A new key set (or `force`) morphs as TransformMatchingTex, by meaning: a key moves to the same key; untagged glyphs match only when they are the same operator or relation (= + − × · brackets, fraction bars, radicals) in the same order within the same segment between `=` signs; untagged letters and digits never match. Outlines bend point by point, `smooth` easing, a small lag left to right; unmatched old parts fade out drifting toward the new unmatched parts, new ones fade in from the old.
- Inside a key whose content changed (50 into 51, v into v₁), glyphs bend in place along what the two share, and the terms around it slide; when the two share little (their longest shared run under half the longer, counts differing by more than one) the key crossfades in place as it moves. Parts with no counterpart are gone by 60 % of the morph. At `k <= 0` or `k >= 1`, and on any `F.morph` after a mid-way `morphAt`, the host shows the still formula.
- `keyMap` sends keys elsewhere: one to one `{ k: 'P2' }`, several to one `{ a: 'k', b: 'k' }` (they bend together into it), one to several `{ k: ['a', 'b'] }` (it bends out into them). A key the keyMap names does not also match itself. `pathArc` (radians) bends the travel; positive is counterclockwise.
- The same key set with new contents shows the new formula at once. Each key whose content changed by the reader's hand (an input, a key or a drag within 300 ms, and no change without input in the last second) is highlighted: a pale yellow box (`--hl-yellow`) behind the number itself, from its first digit to its last, units left bare, held while changes keep coming and fading over 600 ms after the last. The highlight layer is sized to the formula and clipped to it, so it never makes the readout scroll. A readout a clock or a story drives is never highlighted; nor is one with `values: false`.
- A key-set morph asked for mid-morph also starts from the present frame.
```js
F.morph(fx, series ? '\\frac{1}{\\mk{k}{k_{eff}}} = \\mk{a}{\\frac{1}{k_1}} + \\mk{b}{\\frac{1}{k_2}}' : '\\mk{k}{k_{eff}} = \\mk{a}{k_1} + \\mk{b}{k_2}');
F.morph(rx, `\\mk{k}{k_{eff}} = \\mk{kv}{${fmt(keff, 1)}}\\ \\mathrm{N/m}`);     // the number is highlighted as k₁ is dragged
F.morph(rx, next, { keyMap: { a: 'k', b: 'k' } });   // the two terms bend together into k_eff
```

`F.readout(d)` → `{ formula, note, set(tex, note?, { form, ...opts }) }`: a morph host over a plain note line in `d.readout`. `set` morphs the formula; a `form` unlike the last call's forces the morph by meaning; a note left out stays as it was.
```js
const ro = F.readout(d);
ro.set(tex, right ? 'At a right angle …' : 'Head to tail …', { form: right });
```

`F.morphAt(host, texA, texB, k, display?, opts?)` — the frame at progress `k` in [0, 1], a pure function of `k`; `k <= 0` and `k >= 1` are the still formulas. For a story slider between two integer stops; cheap on every input (the plan is measured once per pair).
```js
const s = story.v, i = Math.floor(s); F.morphAt(fx, STEPS[i], STEPS[Math.min(i + 1, STEPS.length - 1)], s - i);
```

**Morph rules.**
- One host, one formula; its children are replaced. Numbers may live in the same formula as their symbols, tagged.
- Reduced motion swaps at once and briefly highlights the new terms (morphAt jumps at k = 0.5); the highlight comes and goes without the fade.
- The host carries `role="img"` and an `aria-label` with the formula's plain text; nothing else to add.
- Figure text is highlighted the same way with no figure code: a string drawn through figlib's text (labels, headlines, notes) is known again by its skeleton (numbers blanked) and its order among strings of that skeleton; a number the reader's hand changed becomes its own span with the yellow highlight behind it, and the figure keeps drawing while it fades.
- `F.tex` stays KaTeX for formulas that never morph. Inside a `figure.sim` its numbers are highlighted the same way, matched by the skeleton of the rendered text; `F.tex(host, s, display, { values: false })` opts out.
- `F.measure(ctx, s, { size = 22, weight })`: the width `text` gives s in logical units (figure font, subscripts included); never set `ctx.font` to measure.
