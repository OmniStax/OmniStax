# Reviewing a built section: figures, their text, and the lead

The review runs over every built section. A judge reads the section and looks at every figure in
a browser, gives each figure and the lead a verdict, fixes what is small on the spot, and files the
rest for a rewrite. Rules cited are the root `RULES.md` (items 14, 21, 24 to 28) and
`docs/prompts/interactive-figures.md`.

## 1. Verdicts

- **pass**: no defect below.
- **fix**: defects a reviewer corrects in the same sitting, each a change of a few lines: a caption
  or headline sentence, a note dropped, a colour, a stroke width, a label moved, a readout written
  through the macros, a slider range, a z-order.
- **rewrite**: the drawing or the approach is wrong (a body that does not read as what it is, a flat
  guess at a perspective scene, a 3D scene that earns nothing, a figure that shows less than the
  original, a layout that cannot hold its labels). A rewrite is filed with what the better figure
  does, in the plan-line format of `interactive-figures.md` §1, and built by a second agent.

Any single must-fix defect takes a figure out of **pass**. A reviewer does not score; it names the
defect by rule and says what it saw.

## 2. Must-fix defects

Drawing
1. A thing drawn as a glyph where a body is meant: a hand of a box and sticks, a stick figure whose
   limbs pass through what it holds or climbs, a person who is not walking the stairs they are on, a
   package, nail, guitar, pencil or planet the reader cannot recognise without the caption (26.6).
   Bodies come from the library's primitives; a figure that draws its own hand or person is a rewrite.
2. Anything the caption or the book's original shows that the figure no longer shows: the moon's
   path, the tidal bulges, the children pushing the wagon (24.4, the value-add gate runs both ways).
3. Text over text, text over an arrow, labels colliding, a label or readout running past the stage
   edge at any slider setting (interactive-figures.md §3; the labeller exists for this).
4. Stroke discipline: a line visibly crossing a boundary it should meet (spokes through a rim), an
   arrow as thick as the body it acts on, a dashed helper too faint to see (26.8, §3 widths).
5. Contrast: text on a fill it cannot be read against, in light or dark theme.
6. A graph whose axes rescale as the reader drags: the range is fixed with headroom for the slider
   extremes, or the figure says in its readout that the view is clipped. A jumping axis is a defect.
7. A flat drawing that guesses at a perspective the book draws in 3D (a table, an apparatus seen
   from above and the side): use `F.view3d` with a locked or bounded view, or the flat view the book
   itself uses (28).
8. A 3D scene that adds nothing a flat drawing would not show (24.4, cost tiers).
9. A symbol, unit or glyph that does not display (missing macro, escaped TeX, a font without the
   glyph).
10. Depth order wrong: a force arrow drawn through the label that names it, a label behind the body.

Text in the figure (headline, readout, note, caption)
11. A readout without an equation line written through the `\k` macros where the figure has
    quantities (24.7); a note that repeats the caption, the headline or the readout (26.13); a note
    longer than the fact it states needs, which is one or two sentences.
12. A headline that is not a full sentence saying what to watch, or that is a formula in plain text
    (headlines are typeset, so symbols wear their colours).
13. A caption that names a control the figure does not have, or omits the control the figure is about,
    or is not in the book's voice (14).
14. Values in the readout that do not add up as written, or a term a case cancels that is still shown
    (24.7).

Interaction
15. A slider with no visible consequence (24.6); a discrete state on a slider (26.1); a loop with no
    hold; a still figure with a transport; a special value the text names with no detent.
16. A figure not legible on its own page from its labels and caption (26.5); an unnamed entity (26.6).

The lead (21.5)
17. More than two sentences, more than 80 words, or a result the section itself works out.

## 3. What a reviewer fixes itself

Anything in **fix**: edit `figures.js`, `text.html` (caption, eyebrow) or `section.json` (lead)
directly, run `ost check <book> --section N.M`, and look again in the browser. A lead is rewritten
in place. A figure rewritten in full is not a fix.

## 4. Provenance after a review

Every figure row carries `ai: [{model, effort, part}]`. A review that changed a figure appends an
entry whose `part` says what it did in a few words ("hand, outline and headline"; "caption and
note"; "rewritten: 3D scene with the library hand"). A pass appends nothing. A section whose lead
was rewritten appends to the section's `ai.text`. The reviewer's own model and effort are in its
brief.

## 5. Looking

Playwright on the reviewer's own dev server, light and dark, 1400 px wide: each figure at its
defaults, at each slider's extremes, at mid-morph for a storied figure, and at two orbit views for a
3D one. Screenshots are the evidence for every verdict; a verdict names the screenshot it rests on.
