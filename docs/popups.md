# Popups, cards and popovers (#35)

## Hover cards

One component draws every card: `src/components/Hover.svelte`. Targets are listed in `src/lib/hover/cards.ts` (`TARGET`), cards are composed in `src/lib/hover/resolve.ts`. A card opens on hover (250 ms, 500 ms on an equation block) or on click, per Settings → card opening.

| card | trigger | shows | actions |
| --- | --- | --- | --- |
| Symbol | a coloured symbol in math, `[data-sym]` | "Symbol · type · unit", the symbol, its meaning in this section; "Elsewhere in this chapter (N.M): …" when the key means something else in another section | **Go to definition** (the row has an anchor) or **Go to section**; **Show in Definitions**. Chapter not loaded: "Defined in N.M." and **Go to section** |
| Term | a glossary term, `.term[data-term]` | "Term", the term, its glossary definition | **Go to section** (jumps to the introducing span when known) |
| Reference | a link to an example or section, `a.xref`, `a[href^="#"]` | "Reference", the title, the first sentence | **Go** |
| Equation | a display equation, `.katex-display` | "Equation", the equation, the concept it states and why | **Go to where it is introduced**, else **Go to section**; **Show in Formulas** when important |
| Concept | a concept name in prose, a concept map node, an Exercises progress row, an exercise card chip, `[data-concept]` | "Concept", the name, why, "Introduced in" and "Used in" lists (four each, then "and N more") | **Go to definition**; **Show in Formulas** when it has an equation; **Show in Concept map** unless on the map. Unbuilt section: **Go to section** or **Open in OpenStax** |
| Formula (Chemistry) | a chemical formula, `.formula[data-formula]` | "Formula", one chip per element with its count, molar mass | **Go to the elements**; each chip opens its element |

Why the labels vary: symbol and concept cards say "definition" because they jump to the defining span; term cards say "section" even when they jump to a span; reference cards say only "Go".

## Definitions, formulas and concepts

Agreed 2026-10-01, not yet built. The reader meets three kinds, the same in every subject (RULES item 6):

- **Definition**: what a name means. A word and its symbol are one definition, so "displacement" and Δx share a card. The card carries the word, the symbol, the meaning, the unit, the section that defines it and the defining formula (Δx = x_f − x₀). The Symbol and Term cards above become this card, and the Definitions list shows one row per definition.
- **Formula**: a law or result and the conditions it holds under (F = ma, v = v₀ + at). Formulas whose concept is an idea leave the Formulas list for their definition cards. A book may name the list in its subject's word (Theorems, Laws and equations).
- **Concept**: the concept map and mastery. Definitions and formulas reach their exercises and mastery through their concept.

The `symbols` table is notation for rendering and colour, never a kind the reader sees. The Definitions and Formulas lists carry no colour legend.

## Other popups

| popup | trigger | shows and does | component |
| --- | --- | --- | --- |
| Tooltip | hover on a control with `title`/`aria-label` (not in articles) | its name | `Tooltip.svelte` |
| Highlight bar | a text selection in an article | colour dots, Ask AI, add note, remove | `HighlightBar.svelte` |
| Row menu | right click or `…` on an explorer row | new note, drawing, folder here; import files or folder here; rename; delete | `explorer/RowMenu.svelte`, items in `views/Explorer.svelte` |
| Import menu | the import icon on Your Files | import files (the accepted kinds named), import folder | `explorer/RowMenu.svelte` |
| Breadcrumb menu | a breadcrumb segment | sibling sections or items to open | `views/CrumbMenu.svelte` |
| Session popover | hover on a running practice session | the session's progress, resume | `views/Exercises.svelte` |
| @ picker | typing `@` in a note or chat | books, sections and files to link | `ui/AtPicker.svelte` |
| Autocomplete | typing a link in the note editor | note and section names | `notes/MarkdownEditor.svelte` |
| Category picker | a pomodoro's category button | categories to tag, new category | `pomodoro/CategoryPicker.svelte` |
| Pomodoro row menu and edit | `…` on a pomodoro row | edit, delete; the edit form | `views/PomodoroStats.svelte` |
| Dialogs | the palette key, `+` in a tab bar, Find textbook, the gear | command palette, new tab, book search, Settings | `Palette`, `Browser`, `FindTextbook`, `Settings` |
| Toasts | a tip, a drag, an import | one line; the import toast names refused files | `TipToast`, `DragToast`, `files/ImportToast.svelte` |

## The Practice button

The hover cards never had a "Practice" button (`git log -S` over the hover files finds none). What went:

- `44d62fe` (Sep 16) removed the concept card's "Tested by" list, whose "and N more" opened the problem set with the concept pinned.
- `18814eb` removed a figure card's "Go to figure" and "Show original".
- `2acb9a3` (Sep 23) removed the Exercises view's "Practice" tab button; practice starts from "New Practice Session" or a listed session.

Still there: "Practice this section" at the end of every section (`lib/content/fragment.ts`, `exercises/ExerciseList.svelte`), which opens a practice session on that section.
