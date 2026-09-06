# Shell layout: rails, sidebars, tabbed groups

Design decision from the 2.5 experiment (2026-09-06), after the features
outgrew two fixed sidebars. First implementation: `experiment/ch02/2.5`
(`template.html` shell markup and CSS, the "Shell" block in `app.js`).

## The model

Everything a page shows is an **item**, and an item is one persistent DOM
element that gets moved around, never re-rendered:

- **Documents** (`[data-doc]`): the section text, the problem set. Later a
  second section, an answer key, a chapter summary.
- **Views** (`.view`): concept map, contents, formulas, definitions. Later
  comments, search, a notebook.

An item lives in exactly one of three places: a **sidebar** box (left or
right), a **tab** in a document group, or the hidden **pool** when closed.
Reparenting keeps state, so the pinned concept, the rendered math and the
running figure survive a move.

The chrome:

- **Activity rails** on both edges, 44px. Left rail: document icons, a
  rule, then the views that live on the left, then the gear. Right rail:
  the views that live on the right. An icon is lit when its item is open
  anywhere and carries a dot when it is open as a tab.
- **Sidebars** hold a stack of collapsible boxes. A box header drags; the
  edge grip resizes (200 to 520px). A sidebar with no boxes disappears.
- **Document area** holds one or two groups side by side. Each group has a
  tab strip and one scroll pane per tab, so scroll positions survive tab
  switches. The focused group has the underlined tab, and the companion
  views follow its scroll position.
- **Settings** is a popover from the gear, not a view: colour coding, dark
  mode, reset layout.

Interactions:

- Rail click: opens a closed item (view into its home sidebar, document
  into the focused group); closes a view that is in a sidebar; focuses a
  tab that is already open.
- Drag anywhere: rail icon, box header or tab onto a rail, a sidebar, a
  tab strip (drops before the tab under the cursor), or a group body. A
  drop on the right half of the only group splits it.
- "Split right" button: moves the tab you are not reading into a new
  group, or opens the next unopened item there.
- Navigation goes through `jump(el)` / `go(id)`: reveal the item that
  contains the target (activate its tab, expand its box, open it if
  closed), then scroll. Every in-page link, formula card, concept node and
  exercise chip uses it, so a link into a hidden tab works.
- Under 900px the sidebars become one-at-a-time overlays opened from the
  rail, and groups stack vertically.

State is one JSON object in `localStorage` (`omnia-layout-v1`): the items
in each sidebar and their widths, collapsed boxes, the groups with their
tabs and active tab, the focused group, and each view's home side. It is
validated against the registered items on load and falls back to the
default: text and exercises as tabs, concept map and contents on the left,
formulas and definitions on the right.

## Why this and not more

- Two sidebars and at most two groups cover every feature listed so far.
  Free-form docking, floating panels and multiple "screens" were left out
  on purpose: screens are browser tabs, and floating panels break the
  scroll sync that makes the companion views useful.
- The reading column stays the product. The shell is a way to bring
  reference material next to it, not an IDE.
- Adding a feature means registering one item. The rails, drag and drop,
  persistence and reveal logic do not change. Comments will need one more
  thing, a decoration layer that paints on the document, which the concept
  map's intro and uses highlights already prototype.

## Open questions

- Should a document be openable in two groups at once (the same section
  side by side at different places)? It would need a second DOM copy and
  duplicated figure state. Not needed yet.
- The home side of a view is remembered per browser. With accounts it
  moves to the user's profile with the rest of the layout.
- Keyboard: tabs and boxes are reachable, but there is no shortcut to move
  focus between groups or cycle tabs yet.
