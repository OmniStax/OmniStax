# Popups, cards and popovers (#35)

## Hover cards

One component draws every card: `src/components/Hover.svelte`. Targets are listed in `src/lib/hover/cards.ts` (`TARGET`), cards are composed in `src/lib/hover/resolve.ts`. A card opens on hover (250 ms, 500 ms on an equation block) or on click, per Settings → card opening.

| card | trigger | shows | actions |
| --- | --- | --- | --- |
| Definition | a glossary term (`.term[data-term]`) or a symbol (`[data-sym]`) whose row names a concept, or a display equation whose concept is a definition | eyebrow: the concept's kind and the unit ("Definition · m"); title: word · symbol (the hovered symbol, else the concept's first); the statement; "In this section" with the symbol's meaning and "Elsewhere in this chapter (N.M)" with the other one, where the chapter gives the symbol two meanings; "Formula(s)": up to three formulas that state the concept, each a link to where the text states it | **Go to where it is first introduced** (the concept's introducing span; its section when that chapter is not loaded); **Show in Definitions** |
| Symbol | a symbol whose variables row names no concept | "Symbol · type · unit", the symbol, its meaning in this section; "Elsewhere in this chapter (N.M): …" | **Go to definition** (the row has an anchor) or **Go to section**; **Show in Definitions**. Chapter not loaded: "Defined in N.M." and **Go to section** |
| Term | a glossary term whose row names no concept | "Term", the term, its glossary definition | **Go to section** (jumps to the introducing span when known) |
| Reference | a link to an example or section, `a.xref`, `a[href^="#"]` | "Reference", the title, the first sentence | **Go** |
| Formula | a display equation, `.katex-display`, whose concept is an axiom, result, idea or skill | "Formula · Result", the concept's name, its statement; "Holds under" with the equation's condition, where it has one | **Go to where it is introduced**, else **Go to section**; **Show in Formulas** when important |
| Concept | a concept name in prose, a concept map node, an Exercises progress row, an exercise card chip, `[data-concept]` | its kind and section ("Result · section 2.5"), the name, its statement, "Introduced in" and "Used in" lists (four each, then "and N more") | **Go to definition**; **Show in Formulas** when it has an equation; **Show in Concept map** unless on the map. Unbuilt section: **Go to section** or **Open in OpenStax** |
| Formula (Chemistry) | a chemical formula, `.formula[data-formula]` | "Formula", one chip per element with its count, molar mass | **Go to the elements**; each chip opens its element |

A word, a symbol and a defining formula of one concept open one card, so the reader meets a definition the same way whichever of its names they hovered. The term and the symbol cards remain only for rows the book has not linked to a concept. A term that names an axiom or an idea opens the same card under that kind.

## Definitions, formulas and concepts

Definitions and formulas are concepts (RULES item 6). The pure model is `src/lib/sections/conceptlists.ts`.

- **Definitions** lists one row per concept named by a word or a symbol, and every definition the loaded coverage introduces: the symbols (with their meaning in the section read when there are several or the chapter redefines one), the word, a kind tag on a concept that is not a definition, the unit, the statement and the defining formulas (the important ones, else the concept's `eq`). A word or a symbol with no concept is a row of its own. Rows stand in the concept's section, or, when that is outside the view, the first section in it that gives the concept a symbol or a word; within a section they follow the span that introduces them.
- **Formulas** lists the important equations as before, each under the concept it states: "defines Δx" for a definition, a kind tag and the concept's word otherwise. The list keeps the label "Formulas", since `book.json` has no field for a book's own word for it.
- Both lists set symbols and formulas in ink, with no colour legend; the rows keep `data-book` and `data-sec`, so the symbols in them open their cards.
- The concept map draws five shapes: a definition is a plain box, an axiom has a heavy left rule, a result a double rule, an idea a soft box with no rule, a skill a pill with a wrench. Each kind in the legend is a switch that hides that kind's nodes and edges without moving the layout.

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
