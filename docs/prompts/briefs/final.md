# Chapter pass: after the sections are built

You own the chapter whole and `book.json` through `ost merge`; never `LOG.md` or `RULES.md` by hand. Model: <data model>.

1. Apply every `## Wanted at chapter level`: anchors (`ost set … variables|equations`), concept and edge fixes through `book-rows.json` and `ost merge`, glossary and symbol rows. Record each decision under the same heading in that plan.
2. Cross-section: no exercise kept twice, held items landed, figure and table numbers in book order without gaps, every concept id resolves.
3. Read every `text.html` and `figures.js` once for what the validator misses: leftover markers, a cited number with no row, a lost credit clause, `$` in prose, the word demo, a hex colour, a still figure with a cycle, a half-coloured figure (rule 7), a slider for a discrete state (rule 26).
4. `config.md` updated where the build changed a default; `chNN/log-pass.md` then `ost log <book> N`.
5. `ost check <book>` clean for the whole book, `npm test`, `astro check`, a build, Playwright over every page of the chapter in light and dark, one fix pass.
