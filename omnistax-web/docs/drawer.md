# The Drawer: free-hand drawings (#17)

Implementation handoff. Status: milestones 0 to 4 built. Decisions settled
with Chen on 2026-09-22; not reopened here. Depends on milestone 0 of
`imports.md` (the `drawing` entry and item kinds, the `ex` item kind and the
link prefixes).

## What the reader gets

A **drawing** is a thing the reader makes, beside notes and folders, under
Your Files: a "new drawing" icon on the root row and in a folder's menu, a
tab of its own (`drawing:<id>`), a name they rename like a note, a link
`[[Some drawing]]` and an embed `![[Some drawing]]` in notes (the embed
shows the drawing rendered small and opens the tab on click).

The canvas is an unbounded plane and the whole of the pane is drawable from
the first frame: no page, no sheet edge, no scrollbars, and the ground is
the pane's own. Dragging and zooming only show more of the same plane. Pan
with a finger, two fingers to zoom, and draw with the pencil; on a desktop
the mouse draws, space-drag, middle-drag or the hand tool pans, Ctrl+wheel
zooms about the pointer and a plain wheel walks the plane (Shift for
sideways). Zoom is held between 0.1 and 8. "Fit" on the toolbar, or 0 while
in the tab, frames everything there is; "Reset view", or Shift+0, goes home
to the origin at full size. Where the reader was looking is kept with the
drawing, so opening it again lands where they left off. While a pen is
touching, touches are ignored (palm rejection). Pressure sets the pen width
when the device reports it.

Tools, on a toolbar at the top of the tab: pen, highlighter (wide, half
transparent, multiply blend), eraser (stroke-wise), lasso (select strokes,
boxes and frames by drawing round them; then drag to move, Delete removes,
handles resize), text box, shapes (line, arrow, rectangle, ellipse; Shift
snaps a line to 45° and makes a square or circle; a fill toggle), image.
Colour and stroke size are on the toolbar too; colours are the app's ink
tokens plus the book's quantity colours when a book is open, so a force can
be drawn in the force colour.

Undo is the drawing's own (Ctrl+Z inside the tab), not the shell timeline,
like the note editor and the colour menu.

## Things dropped on the canvas

Anything that drags out of a panel or a page today can be dropped on a
drawing. What lands is a **frame**: a movable, resizable box at the drop
point. What the frame holds depends on what was dropped:

- A **card**: a definition, concept, equation, symbol, highlight, note, file
  or chat message. The frame holds the card the note renderer makes for
  the same embed (`notes/md/render.ts`, a `![[…]]`), live: KaTeX renders,
  links work, a renamed note updates. The frame scales with the canvas by
  CSS transform, which is safe because a card reads no pointer positions.
- A **figure or sim**: a snapshot. The frame holds an image of the figure
  as it stood when dropped (its canvas via `toDataURL`, or its static
  image, composited with its caption) and a small "open" glyph. Tap opens
  the live figure in a split pane to the right of the drawing
  (`layout/model.ts` `split`, as practice does). The snapshot is stored as
  an asset in `omnistax-assets` so it survives reload. Live sims inside
  frames are deliberately not built; see the decision record.
- An **image** file: the image, resizable.

Frames are selectable by lasso and move with strokes.

## Exercise scratch work

An exercise card (`exercises/ExerciseCard.svelte`, in the section and in
the practice view) gains a "scratch" button. It splits a drawing pane to
the right of the exercise. That drawing is **private** to the exercise:
it is not an explorer entry, it lives in the practice-side store keyed by
book, section and exercise id, and returning to the exercise shows the old
work. The card shows a small mark while scratch work exists.

The scratch tab's toolbar has "Save as drawing", which turns it into a real
drawing entry under Your Files, named "<exercise number> scratch", and
links the exercise to it; the card then shows a chip with the drawing's name
that opens it. "Detach" on that chip turns the linked drawing back into
private scratch (the entry is removed, the content kept). Both directions
are undoable compound edits.

An exercise opens as a tab of its own (`ex:<section>/<exId>`, milestone 0 of
`imports.md`), so the practice split can show one exercise beside its
scratch drawing; the card's existing "open" button uses this.

## Storage

- `src/lib/drawer/model.ts` (pure): `Drawing { id: DrawingId (8 base36),
  name, items: Item[], view: { x, y, zoom }, created, updated }` — there is
  no page, so no width and no height; `view` is the plane point at the top
  left of the pane and the scale, written down so that reopening lands where
  the reader was, and setting it does not touch `updated`. A record written
  before the plane was unbounded carries `width` and `height`; the parser
  reads past them and drops them, so old backups still load. `Item` is an
  ADT: `stroke { id, tool: 'pen' | 'highlighter', color, size, points:
  [x, y, p][] }`, `shape { id, shape: 'line' | 'arrow' | 'rect' | 'ellipse',
  color, size, fill, from, to }`, `box { id, x, y, w, h, body }` (markdown,
  the shared `TextBox.svelte` of `imports.md`), `frame { id, x, y, w, h,
  embed: string }` (the `![[…]]` inner text, or `asset:<id>` for a snapshot
  or image with an optional `open: string` item key). Coordinates are canvas
  units at zoom 1. Every operation is a pure function on `Drawing`; the
  undo stack is a list of `Drawing` values with structural sharing.
- `src/lib/drawer/store.svelte.ts`: drawings in IndexedDB database
  `omnistax-drawings`, store `drawings`, one record per drawing, written
  debounced 300 ms after the last change and on tab blur; the name list is
  mirrored in localStorage `omnistax-drawings-v1` (`{ id, name, created,
  updated }[]`) so the explorer and the link resolver never open IndexedDB
  to draw a row. Scratch drawings live in the same database under a
  `scratch` store keyed `<book>/<section>/<ex>`, with a localStorage index
  `omnistax-scratch-v1` mapping that key to `{ linked?: DrawingId }`.
- Backup: both localStorage keys validated in `backup/schema.ts`, and the
  two IndexedDB stores exported as `drawings: Drawing[]` and `scratch:
  { key, drawing }[]`.
- Strokes are rendered to one `<canvas>` (2D) the size of the pane, with the
  DPR handled as `fig/figlib.ts` does; boxes and frames are HTML positioned
  over it inside one transformed container of no size. Rendering is cached by
  view: the items whose bounding box meets the window are drawn into an
  offscreen bitmap under the view's transform, and that bitmap stands until
  either the items or the view move; the live stroke is drawn on top. Every
  item's box is a pure function in `geometry.ts` memoised against the item
  itself, so culling is a filter and not a walk of points. The embed
  thumbnail for notes is the bounding box of everything on the plane, padded,
  produced on demand and cached by `updated`.

## Files

- `src/lib/drawer/{model.ts, store.svelte.ts, geometry.ts (lasso hit test,
  smoothing, shape maths), render.ts (strokes to a canvas context, pure over
  a context), snapshot.ts (a figure root to a data URL)}`, and three the
  building added: `db.ts`, the two IndexedDB stores apart from the reactive
  face over them, because the backup must read and write them and a module
  carrying runes cannot be imported by a plain test; `tools.ts`, the tool set
  and its letters, which the toolbar draws, the tab acts on and the defaults
  name, so all three agree; `cards.ts`, the lookups a frame's card needs,
  which are the note view's own; and `thumb.ts`, the small picture of a
  drawing that a note's card is filled with.
- `src/components/drawer/{DrawingTab.svelte, Toolbar.svelte, Frame.svelte}`,
  with `DrawingPane.svelte` and `ScratchPane.svelte` over the tab — one binds
  a drawing of the reader's own to its row and its name, the other binds the
  private page of an exercise — and `src/components/ui/TextBox.svelte` shared
  with the PDF reader.
- `types/ids.ts` `drawing:<id>` (from milestone 0), and the one kind the
  building had to add, `scratch:<book>/<section>/<ex>`: the private page of an
  exercise is a tab like any other and is named by the thing it belongs to,
  since it has no record of its own to be named by. `links.ts` a drawing by
  name resolves like a note by name (the resolver checks notes then
  drawings), so no new prefix is needed in the grammar beyond milestone 0's.
- `views/Explorer.svelte`: the row, the icon, rename, delete with undo.
- `commands/defaults.ts`: "New drawing" (Ctrl+Alt+D in a tab, Ctrl+Shift+D
  installed), tool shortcuts inside a drawing tab (P pen, H highlighter, E
  eraser, L lasso, T text, S shapes, V pan).

## Milestones

- [x] 1. Model, store, explorer entry, tab with pen, highlighter, eraser,
  colour, size, pan, zoom, growth, local undo, pencil and palm handling,
  backup whitelist. `tests/drawer.test.ts` for the model and geometry.
  `tests/drawer-browser-check.py` draws with synthetic pointer events,
  reloads, sees the stroke.
- [x] 2. Lasso select, move, resize, delete; shapes with Shift snapping and
  fill; text boxes with markdown.
- [x] 3. Frames: cards live, figures as snapshots that open live in a split,
  images; drop from every existing drag source; the note embed of a
  drawing.
- [x] 4. Exercise scratch: the button, the private store, save-as-drawing,
  detach, the card chip, the `ex` tab.

## Progress

2026-09-22 — Milestones 1 to 4 built. A drawing is a row under Your Files, a
tab of its own, a link and an embed, and the ink is an immutable value:
`drawer/model.ts` is a pure Drawing with an Item ADT and an undo stack that is
nothing but the values it hands back, `geometry.ts` holds the lasso, eraser,
smoothing, snapping and handle sums, and `render.ts` puts ink on a context and
nothing else. `store.svelte.ts` is the reactive face over `db.ts`, which is a
plain module so that the backup can read and write the two IndexedDB stores
without pulling a rune into a test; the names are mirrored in
`omnistax-drawings-v1` so the explorer and the link resolver never open a
database to draw a row, and the scratch index in `omnistax-scratch-v1`. Both
keys are whitelisted and validated in `backup/schema.ts`, and the ink travels
as `drawings` and `scratch` beside the chats and the files.

The tab draws finished strokes into an offscreen bitmap and the live stroke
over it, both under one CSS transform with the boxes and frames as HTML;
pointer events only, coalesced for smooth ink, pressure on the nib, and a
touch while a pen is down is a palm and is ignored. Lasso, move, resize and
delete; shapes with Shift snapping and a fill toggle; text boxes through the
`TextBox.svelte` the PDF reader shares. Anything that drags out of a panel
lands as a frame: a card is the very card the note renderer makes, live, and a
figure is a snapshot stored as an asset with a glyph that opens the live
figure in a split — a sim reads pointer positions off its own canvas and would
read them wrongly under the page's transform, which is why the picture is
deliberate. Undo inside the tab is the drawing's own.

An exercise card gained Open and Scratch. Scratch splits a private drawing
keyed by book, section and exercise, with a mark on the card while work
exists; "Save as drawing" gives it a row and a chip, "Detach" hands it back,
and both are one step of the shell's timeline. One exercise opens alone
through the `ex` tab, and a new `scratch:` item kind names the private page.

Two decisions worth recording. The drawing thumbnail a note embeds is filled
in after the rendering rather than during it — a picture takes a turn of the
loop to make, and a resolver called inside a `$derived` may not write state —
so the renderer leaves a waiting card carrying the id and the view fills it,
which is the rule every asset in a note already follows. And a snapshot is
composited on white: it is a picture of paper, looked at on a page of paper,
so a figure drawn for the dark theme still reads.

Left out: a frame holding a live sim (decided against, above); rotating a
selection; and pressure curves beyond the linear one in `geometry.nib`.

2026-09-22 — The canvas is unbounded. Chen booted into a drawing and found a
sheet with an edge in the middle of the pane, which was two things at once: a
`Drawing` carried a `width` and a `height` that grew downward like a pad of
paper, and the tab is an `article`, so the book's own rule for one — 820px of
prose, centred, with a wide margin under it — had been boxing the whole tab in.
Both are gone. The value is now a plane with no edge and a `view` on it, the
tab fills the panel from the first frame, and the ground the reader draws on is
the pane's own rather than a sheet laid over it.

What the rendering became: the canvas is the size of the pane and the finished
ink is cached per view, not per page — on every change and every pan or zoom
frame the items whose box meets the window are drawn into the bitmap under the
view's transform, and the live stroke goes over it as before. `geometry.ts`
gained `meets`, `viewBox` and `fitView`, and `bounds` now keeps each item's box
against the item itself in a `WeakMap`: an item is immutable, so its box is the
same every time it is asked for, and culling is a filter rather than a walk of
every point on the plane. `grownTo`, the page constants and `lowestPoint` are
gone with the page they served.

A pan is not a change to the ink, so `setView` leaves `updated` alone: a
thumbnail is not remade and a row is not touched because the reader looked
somewhere else. The view is written down when a gesture ends — a drag lifted, a
pinch let go, the wheel come to rest — and it rides the tab's own timeline as a
nudge, so taking back a stroke never takes back a pan. Zoom is held between 0.1
and 8; "Fit" and 0 frame everything there is, "Reset view" and Shift+0 go home.

One thing was read more narrowly than the brief wrote it. A card, a figure or
an image dragged onto the plane still lands under the pointer, where it was let
go of, rather than centred on the view: a drop that jumped away from the hand
would read as a bug. Centring is what something with no drop point of its own
gets, which is the toolbar's "place an image".
