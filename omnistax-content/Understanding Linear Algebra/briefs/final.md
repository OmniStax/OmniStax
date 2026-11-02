# Chapter pass: after the sections are built

You own the chapter whole and `book.json` through `ost merge`; never `LOG.md` or `RULES.md` by hand.

1. Apply every `## Wanted at chapter level` of the chapter's `plan.md`s: anchors (`ost set … variables|forms`), concept and edge fixes through `book-rows.json` and `ost merge`, glossary words and symbols on concepts, variables rows the sections asked for. Record each decision under the same heading in that plan ("Chapter pass (date): … applied").
2. Cross-section: no exercise kept twice, held items landed, figure numbers in book order with no gap unexplained (a figure inside an answer prints none), every concept id resolves, every section's concepts have exactly one `introduces` span, every activity of the source is a card (count them against `modules.json`).
3. Read every `text.html` and `figures.js` once for what the validator misses: leftover markers (`{index-entry:`, `(ref:`, `:::`), a cited number with no row, a lost credit, `$` in prose, the word demo, a hex colour outside `F.fact`, a still figure with a cycle, a referent drawn without `F.ref` or a reference to it left unmarked (rule 7), a slider for a discrete state (rule 26), a caption that talks about the figure rather than the subject (rule 17). A section whose words you rewrite gets your maker appended to its `ai.text`.
4. `config.md` updated where the build changed a default; `chNN/log-pass.md` (first line the pass title) then `ost log understanding-linear-algebra N`.
5. `ost check understanding-linear-algebra` clean for the whole book, `npm test`, `OMNISTAX_BOOKS=understanding-linear-algebra npm run test:books`, `astro check`, a build into your scratch, Node Playwright over every page of the chapter in light and dark (no console or page error, every image loading, every `figure.sim` booting a canvas, inline cards rendering), one fix pass.

Report: what was applied, what was wrong and fixed, what remains for the orchestrator (an app change, a rule to amend), the counts (sections, figures by kind, activities, exercises, concepts, edges).
