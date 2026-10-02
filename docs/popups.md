# Popups, cards and popovers (#35)

## Hover cards

One component draws every card: `src/components/Hover.svelte`. Targets are listed in `src/lib/hover/cards.ts` (`TARGET`), cards are composed in `src/lib/hover/resolve.ts`. A card opens on hover (250 ms, 500 ms on an equation block) or on click, per Settings → card opening.

| card | trigger | shows | actions |
| --- | --- | --- | --- |
| Definition | a glossary word (`.term[data-term]`) or a symbol (`[data-sym]`) of a concept, or a display equation that is a form of a definition | eyebrow: the concept's kind and the unit ("Definition · m"); title: name · symbol (the hovered symbol, else the concept's own); the statement; "In this section" with the symbol's meaning and "Elsewhere in this chapter (N.M)" with the other one, where the chapter gives the symbol two meanings; "Formula(s)": the concept's first three forms, each a link to where the text states it | **Go to where it is first introduced** (the concept's introducing span; its section when that chapter is not loaded); **Show in Reference** |
| Symbol | a symbol whose variables row names no concept | "Symbol · type · unit", the symbol, its meaning in this section; "Elsewhere in this chapter (N.M): …" | **Go to definition** (the row has an anchor) or **Go to section**; **Show in Reference**. Chapter not loaded: "Defined in N.M." and **Go to section** |
| Reference | a link to an example or section, `a.xref`, `a[href^="#"]` | "Reference", the title, the first sentence | **Go** |
| Formula | a display equation, `.katex-display`, or a form named by id, `[data-eq]`, of an axiom, result, idea or skill | "Formula · Result", the concept's name, its statement; "Holds under" with the form's condition, where it has one | **Go to where it is introduced**, else **Go to section**; **Show in Reference** |
| Concept | a concept name in prose, a concept map node, an Exercises progress row, an exercise card chip, `[data-concept]` | its kind and section ("Result · section 2.5"), the name, its statement, "Introduced in" and "Used in" lists (four each, then "and N more") | **Go to definition**; **Show in Reference**; **Show in Concept map** unless on the map. Unbuilt section: **Go to section** or **Open in OpenStax** |
| Formula (Chemistry) | a chemical formula, `.formula[data-formula]` | "Formula", one chip per element with its count, molar mass | **Go to the elements**; each chip opens its element |

A word, a symbol and a defining form of one concept open one card, so the reader meets a definition the same way whichever of its names they hovered. The symbol card remains only for a variables row the book has not linked to a concept. A word that names an axiom or an idea opens the same card under that kind; a word the book glosses twice ("power") opens the concept of the chapter the reader stands in.

## Reference and concepts

Everything the book teaches is a concept (RULES item 6), and the concept is the one record: its glossary words, its one symbol and its forms, the main form first. The pure model is `src/lib/sections/reference.ts`; the view is `src/components/views/Reference.svelte`, which replaced the Definitions and Formulas views (#39).

- **Reference** lists one row per built concept of the place it stands at, in the order the text introduces them: the kind tag (every kind, a definition's too), the name, the symbol where the concept has one (never the list of its variants), the unit of that symbol, the statement and the main form with what it holds under. The other forms stand behind a "N more forms" toggle. Flat for a section, under a line per section for a chapter, under a fold per chapter for the book; nothing outside the place is listed. A row goes to where its concept is introduced, a form to where the text states it, and a row dragged into a note writes the concept as a card.
- A saved layout holding a Definitions or a Formulas tab opens Reference in its place.
- The list colours symbols and forms as the text does, under the reader's colour-coding setting and the page's binds, and carries no colour legend; the rows keep `data-book` and `data-sec`, which the colour rules and the cards both read.
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
