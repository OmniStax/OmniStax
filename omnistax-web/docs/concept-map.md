# The concept map

The concepts view draws what a scope teaches (a section, a chapter or the whole book) as a graph:
one node per concept, one edge per prerequisite, every edge running from what a concept rests on to
the concept. A section or chapter also shows, dashed, the concepts it takes from elsewhere. Code:
`src/components/views/ConceptMap.svelte`, with the pure parts in `src/lib/sections/`.

## Layouts

One button group switches between three layouts (`MapKind` in `layouts.ts`):

- **Top-down** (`down`, the default; `sugiyama.ts`). Each concept stands one layer below its deepest
  prerequisite (longest path from the sources). An edge that spans layers passes through a dummy
  point at each layer it crosses. Rows are ordered by barycentre over four down and up sweeps, and
  each row is placed at the weighted median of its neighbours, least squares under the minimum gap.
  Edges are cubic curves through their dummy points.
- **Left-to-right** (`right`). The same layout run on swapped boxes and transposed, so prerequisites
  sit on the left.
- **Hyperbolic** (`disk`; `hyperbolic.ts`). The Lamping–Rao–Pirolli tree in the Poincaré disk. The
  spanning tree hangs every source from a virtual root and every other concept from its deepest
  prerequisite. Each child gets a share of its parent's wedge proportional to its subtree's leaves,
  at a fixed hyperbolic distance. Edges outside the tree are drawn as faint geodesic arcs. The
  tree is stored as local steps (each child in its parent's frame) and read relative to an anchor
  node. A book 60 prerequisites deep would otherwise put its leaves closer to the rim than a double
  can resolve. The view is a disk automorphism: a drag keeps the dragged point under the pointer,
  a click glides a node to the middle in 400 ms, and the wheel scales the disk. After each gesture
  the view re-anchors on the node nearest the middle. A node's size follows 1 − |z|², and below a
  threshold it drops its name.

All three are pure functions of the node set and its edges. A layout is keyed by the hash of the
ids plus the kind (`keyOf`) and kept in `sessionLayouts` for the session. The build endpoint
`src/pages/[book]/layout.json.ts` settles the `down` layout for every scope the reader can stand at,
with box sizes estimated by `boxOf`. On first paint the map reads it from that file and computes
nothing. The other kinds, and any set the file lacks, are computed in `layout.worker.ts` when the
set holds more than 150 nodes, and on the main thread otherwise.

**Focus** takes the selection, every prerequisite of it and every concept built on it, and lays out
that set on its own in the current kind. In the layered kinds the result is shifted so the
selection's middle stays where it was (`alignedTo`). In the disk, the focus is anchored on the first
selected node. The nodes then glide from home to their focus places while the rest of the map fades.
Switching layouts under a focus lays out the focus again in the new kind.

## Selection

- Click selects one node. Ctrl- or Cmd-click adds or removes a node. A click on the background
  clears the selection.
- Shift-drag anywhere draws a polygon lasso, and every node whose centre falls inside is selected
  (`inPolygon` from the drawer); add Ctrl or Cmd to extend the selection. The lasso button makes a
  plain drag do the same. Escape turns lasso mode off and clears the selection.
- A double-click pins the concept and opens its card when cards open on click. A middle click goes
  to where the concept is introduced. Dragging a node onto a note embeds the concept (`dragout`).

## Rendering

Each node is a `<g class="node k-kind">` with a `<rect>` and a `<text>`. The meter bar is a
second thin rect, and the axiom's left rule and the result's double rule are extra rects. Each
distinct name is measured once on a canvas in the map's font. Only the rare name with `$` in it
goes through a `<foreignObject>` and KaTeX. One set of handlers on the `<svg>` reads `data-id` from
the target's node, so no node has listeners of its own. Edge paths are built once per layout. While
a focus glides, only the edges with both ends in the focus are recomputed, and Svelte only re-runs
the nodes that move. Hover and focus dimming add one class to the container. A hover also tags
the hovered node, its neighbours and their edges. A layout mounts 250 nodes per frame, nearest the
middle first. Below a zoom of 0.4 the layered map hides its labels, and edges use `stroke-opacity`
instead of per-path `opacity`. Both keep panning at the full physics book (1374 concepts, about
4000 edges) near 50 fps in headless Chromium.
