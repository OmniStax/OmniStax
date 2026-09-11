# Shell layout: rails, sidebars, tabbed groups

The page is a shell of movable items rather than a fixed three-column
article. Implementation: Svelte 5 components under
`omnistax-web/src/components/` over a pure layout model in
`src/lib/layout/model.ts`; see `omnistax-web/README.md` for the file map.
Documents are per section (`doc:2.1/text`, `doc:2.1/exercises`) and other
sections load on demand through the "+" on each tab strip; see
`static-composition.md`. A chapter's or the book's own introduction or
summary page (root `RULES.md` item 21) is a text document with no problem
set beside it, keyed by the chapter and its role (`doc:2.intro/text`, or
`doc:intro/text` for the book's own) and titled by its own title; the
explorer and the book's front page list it where the book prints it,
before the first section or after the last.

## The model

Everything a page shows is an **item**. A view is one persistent DOM
element that gets moved around, never re-rendered. A document is one
such element too, plus a fresh copy for every further group it is open
in:

- **Documents** (`[data-doc]`): the section text and the problem set of
  every section that has been opened.
- **Views** (`.view`): concept map, contents, formulas, definitions, and
  notes. Comments and search are planned as further views.

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

State is one JSON object in `localStorage` (`omnistax-layout-v4`): the items
in each sidebar and their widths, collapsed boxes, the groups with their
tabs and active tab, a stable key per group, the focused group, and each
view's home side. It is
validated against the registered items on load and falls back to the
default: text and exercises as tabs, concept map and contents on the left,
formulas, definitions and notes on the right.

## What a view describes: following and pinning

Every view opens with a scope line: the section it describes and a pin.
Unpinned, the view follows the focused document, so switching tabs from
2.1 to 2.5 switches the concept map, contents, formulas, definitions and
notes to 2.5. Pinned, the view holds its section and shows a picker of
the built sections, so 2.1's concept map can stay up while 2.5 is read.
The pin is per view and remembered in this browser (`omnistax-scope`). The
same header appears whether the view sits in a sidebar box or in a tab.
The design chosen over the alternatives: a global freeze would hold every
view at once, which is rarely wanted; turning following off altogether
would make the companion views stale by default. A pin on the one view
the reader wants held keeps the default useful.

## Notes and highlights

Selecting text in any article shows a small bar: four highlight colours
and a Note button. A colour makes a highlight; Note makes a yellow one
and opens its annotation in the notes view. Clicking a highlight reopens
the bar to recolour, annotate or remove it. A highlight with a note
carries a dotted underline.

A highlight is anchored to its text, not to the DOM: the quoted text with
32 characters of context on each side (`src/lib/notes/anchor.ts`, pure
and tested). The painter (`paint.ts`) indexes an article's prose, skipping
figures, controls, photographs and the hidden MathML, finds each anchor
and wraps its text nodes in `mark.hl`. Painting runs when a document is
prepared, including copies opened in a second group, and again whenever a
note is added, removed or recoloured. If the text changes so that a quote
is no longer found, the highlight is kept in the store but not shown.

The notes view lists the scoped section's notes first, each with its
colour, its quote as a link back into the text, and an annotation that
saves as it is typed; the other sections of the book are folded below,
with a control to expand them all. Notes are stored per book in this
browser (`omnistax-notes-<book id>`); with accounts they move to the profile.

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
