# Shell layout: rails, sidebars, tabbed groups

The page is a shell of movable items rather than a fixed three-column
article. Implementation: Svelte 5 components under
`experiment/app/src/components/` over a pure layout model in
`src/lib/layout/model.ts`; see `experiment/app/README.md` for the file map. Documents are per section (`doc:2.1/text`,
`doc:2.1/exercises`) and other sections load on demand through the "+"
on each tab strip; see `static-composition.md`.

## The model

Everything a page shows is an **item**. A view is one persistent DOM
element that gets moved around, never re-rendered. A document is one
such element too, plus a fresh copy for every further group it is open
in:

- **Documents** (`[data-doc]`): the section text and the problem set of
  every section that has been opened.
- **Views** (`.view`): concept map, contents, formulas, definitions, and
  notes/highlights. The notes view has no content yet. Comments and
  search are planned as further views.

A view lives in exactly one of three places: a **sidebar** box (left or
right), a **tab** in a document group, or hidden when closed. A document
may be a tab in several groups at once. The first group to show it gets
the page's own element; each further group gets a copy built from the
section's source, with its own exercise cards, figures and scroll
position. Reparenting keeps state, so the pinned concept, the rendered
math and the running figure survive a move. Links, citations and concept
highlights find the copy in the focused group first.

The chrome:

- **Activity rails** on both edges, 44px. Left rail: the views that live
  on the left, then the gear. Right rail: the views that live on the
  right. Documents have no rail icon; the page opens with its text and
  exercises as tabs, and the "+" on a tab strip brings any of them back.
  There is no top bar; the tab strip is the top of the page. A view's
  icon is lit when it is open anywhere and carries a dot when it is open
  as a tab.
- **Sidebars** hold a stack of collapsible boxes. A box header drags; the
  edge grip resizes (200 to 520px). A sidebar with no boxes disappears.
- **Document area** holds one or two groups side by side. Each group has a
  tab strip and one scroll pane per tab, so scroll positions survive tab
  switches. The strip ends with a "+" that lists the book's sections and
  opens the chosen text or exercises as a tab in that group. The focused group has the underlined tab, and the companion
  views follow its scroll position.
- **Settings** is a popover from the gear, not a view: colour coding, dark
  mode, a "Play animations" switch that pauses every figure in every
  loaded section, reset layout.
- **Exercises** in the end-of-section list show all at once or one at a
  time with previous/next; the choice is remembered per browser, and a
  link into a hidden card switches to that card.

Interactions:

- Rail click: opens a closed item (view into its home sidebar, document
  into the focused group); closes a view that is in a sidebar; focuses a
  tab that is already open.
- Drag anywhere: rail icon, box header or tab onto a rail, a sidebar, a
  tab strip (drops before the tab under the cursor), or a group body. A
  drop on the right half of the only group splits it. Dragging a tab
  moves it; opening from the "+" adds it.
- "Split right" button: as in VS Code, opens the active document again
  in a new group to the right and focuses it; the original stays. A view
  moves instead, since it has one instance.
- Navigation goes through `jump(el)` / `go(id)`: reveal the item that
  contains the target (activate its tab, expand its box, open it if
  closed), then scroll. Every in-page link, formula card, concept node and
  exercise chip uses it, so a link into a hidden tab works.
- Under 900px the sidebars become one-at-a-time overlays opened from the
  rail, and groups stack vertically.

State is one JSON object in `localStorage` (`omnia-layout-v4`): the items
in each sidebar and their widths, collapsed boxes, the groups with their
tabs and active tab, a stable key per group, the focused group, and each
view's home side. It is
validated against the registered items on load and falls back to the
default: text and exercises as tabs, concept map and contents on the left,
formulas, definitions and notes on the right.

## Why this and not more

- Two sidebars and at most two groups cover every item above.
  Free-form docking, floating panels and multiple "screens" were left out
  on purpose: screens are browser tabs, and floating panels break the
  scroll sync that makes the companion views useful.
- The reading column stays the product. The shell is a way to bring
  reference material next to it, not an IDE.
- Adding a feature means registering one item. The rails, drag and drop,
  persistence and reveal logic do not change. Comments will need one more
  thing, a decoration layer that paints on the document. The concept
  map's intro and uses highlights are already such a layer.

## Open questions

- The home side of a view is remembered per browser. With accounts it
  moves to the user's profile with the rest of the layout.
- Keyboard: tabs and boxes are reachable, but there is no shortcut to move
  focus between groups or cycle tabs yet.
