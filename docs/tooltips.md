# Tooltips

The rule (issue #37):

- An icon or glyph control is named by its tooltip, short, with its shortcut where the app has one.
- A tooltip may say what there is no room to show: a truncated name's full text, a value behind a chart mark, why something is greyed out.
- A tooltip never repeats words on screen, restates the obvious, or explains what a click plainly does. Drag handles carry none: the cursor says it.
- The shell's tooltip (`components/Tooltip.svelte`) shows an element's `title`; failing that, the `aria-label` of a control (button, link, `role=button|tab|radio|checkbox|img|…`) with no words of its own. A region's aria-label (nav, toolbar, dialog, canvas) is never a tooltip, and a title equal to the element's visible text is not shown. Titles that may go away are set to `''`, not removed.

What remains:

| Kind | Where | Content |
| --- | --- | --- |
| Icon names | rail, tab strip (close, +, splits), Explorer row tools, drawer tools and swatches, highlight bar, Annotations, crumbs' ▾, pin, PDF zoom, chat frame, Settings ↺ and × | the name: "Split right", "New note", "Ink", "Size 4", "Reset to 100%", "Pin to 2.1" |
| Shortcuts | rail palette and Settings; drawer tools; Fit, Reset view, Undo, Redo, Group; note Edit/View | "Pen (P)", "Settings (Ctrl+,)"; on a labelled button the keys alone: "Ctrl+Z", "Shift+0" |
| Hidden affordance | note, drawing and chat names; shortcut cells in Settings; connector dots on drawing nodes; Colors grip | "Rename", "Click to change", "Drag to connect", "Reorder" |
| Full text of something cut short | view crumbs, symbol lists, sync paths, chat and composer chips, Elements section numbers, tree-view node time when compact | the full words |
| Values behind marks | Pomodoro stats bars, category dots, Exercises heat-map days, mastery boxes, standing meter, chapter/section row counts, Colors strip | "2026-10-01 · 4 exercises · 3 correct", "3 concepts and 12 problems", "0/1373 mastered · 0 practiced" |
| Why disabled or odd | Exercises "No exercises", "Not built yet", "Only for overridden mastery", "Included by a chosen section"; a blocked Send; a session needing another release; browser-reserved shortcut | one short phrase |
| Small explanations | Explorer "Updated" and Import, Bloom ⓘ, Detach, PDF zoom %, screen lock, Colors light/dark chip, undo/redo labels in Colors | "Updated since your last visit", "Import PDF, images (…), Markdown or text as notes", "Fit width", "Screen lock (5s grace)" |

Untouched: hover cards, CodeMirror autocomplete, tip toasts, and titles inside a book page, a figure or a note body (the browser's own tooltip shows those).
