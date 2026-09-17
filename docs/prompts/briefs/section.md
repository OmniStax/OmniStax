# Section: build one page

You own `chNN/N.M/plan.md`, `text.html`, `figures.js`, `section.json`, and files you copy into `$BOOK/media/chNN/` (copy only). Model: <figures and prose model>. Read `ost show <book> N.M`, `ost rows <book> concepts --where section=N.M`, and the chapter's rows for your section.

1. `plan.md` first (rule 5; plan lines per `docs/prompts/interactive-figures.md`; value add and tier per rule 24; controls per rule 26; `## Wanted at chapter level` with every anchor `<row> → N.M-<span id>`).
2. `text.html`: prose verbatim in `<section id>` spans with your `<h2>`; the book's headers and examples as `<h3>`; notes as `div.note` with eyebrow and title; tables as `div.book-table`; figures where the book has them; apparatus out to the tables.
3. `figures.js`: `window.OMNISTAX_FIGURES['N.M']`, one IIFE per figure, primitives of figlib only, colours by rule 7, controls by rule 26, cycle only where the idea has a clock.
4. `section.json` whole once (temp file, then copy in), then `ost set` for corrections. `ost check <book> --section N.M` clean.
5. Build into your scratch, serve, Playwright in light and dark: no console or page errors, images load, every `figure.sim` has a canvas, transports only on moving figures, inline exercises render. One fix pass. Screenshots at 1400 wide.
