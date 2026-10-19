# Plan: build Differential Equations for Engineers, and finish the Calculus 3Blue1Brown Sims

**Delete this file in the commit that finishes the work below.** It is a hand-off from a paused local job (2026-10-19) to whoever continues; everything needed is here or in the repository.

## What and why

Chen (repo owner) asked for Jiří Lebl's *Notes on Diffy Qs* (github.com/jirilebl/diffyqs, dual CC BY-NC-SA 4.0 / CC BY-SA 4.0; OmniStax takes CC BY-SA 4.0) as an OmniStax book, published as **Differential Equations for Engineers** (id `diffyqs`, folder `omnistax-content/Differential Equations for Engineers/`, `$BOOK` below), and said to build the whole book ("just do it"). He also asked for Sims informed by how 3Blue1Brown teaches calculus and differential equations, judged strictly under root `RULES.md` items 15 and 24–26; he picked every survivor of that survey.

Read first: root `README.md`, root `RULES.md`, `docs/prompts/briefs/{common,prep,section,final}.md`, `$BOOK/RULES.md`, `$BOOK/COLOR.md`, `$BOOK/exploration.md` (its "3Blue1Brown survey" section lists the DE Sims by section), `$BOOK/ch00/config.md` (agreed; the standing defaults for every chapter).

## Setup

- The LaTeX source is gitignored. Clone it before converting: `git clone https://github.com/jirilebl/diffyqs "$BOOK/source/diffyqs"` and check out `658bcae` (version 6.11) so line numbers in `modules.json` hold. Never `git add` the `source` folder.
- Convert with `python3 tools/convert.py <N | N.M | A>` from `$BOOK` (docstring lists the markers). Chapters 0–3 are already converted. Figures are already rendered to `$BOOK/media/*.svg` (`tools/figures.py` needs pdflatex only to re-render a `.pdf_t` figure).
- Tables only through `python3 omnistax-content/tools/ost.py` (reference `omnistax-content/tools/README.md`); never hand-edit `book.json`; stage book rows in `chNN/book-rows.json` and `ost merge diffyqs N` (chapters merge in order).
- Checks: from `omnistax-web/`, `OMNISTAX_BOOKS=diffyqs npm run check:content` (and `calculus` for the Calculus work); `astro build --outDir <scratch>` and Playwright in light and dark per section. The original machine had 7 GB RAM, so builds were serialised under a `flock`; do the same if memory is tight.
- Commit to `main` (Chen's rule: no new branches unless asked), by explicit paths, one commit per chapter, message style as in `git log`.

## Chen's standing decisions (all in `$BOOK/ch00/config.md`)

- Build straight through, no stops; he reviews plans and decisions afterwards.
- Every exercise kept. 101+ carry the book's `\exsol`. Every other end exercise (434 in the book) and every inline Try It (62) carries an **AI-marked solution** stating the answer and the reasoning, in the book's terms; **every computed answer verified by computation (SymPy or numerics) before it is written**. This overrides root rule 13's first default.
- Section notes (`\sectionnotes`) dropped; Further Reading citations as footnotes at first citation; 0.1 built as a section page; 0.2 is the template section.
- The book declares its own types (15 in `book.json`); it need not follow other books' types.
- 3Blue1Brown-informed Sims borrow the teaching idea only: every figure is OmniStax's own design in its house style (`docs/prompts/manim-style.md`), no characters, branding, copied scene compositions or wording from his videos.
- `ai` maker `{"model": "<your model id>", "effort": "<effort>"}`, `built` the build date.

## State at pause (main, after the WIP commit that adds this file)

`OMNISTAX_BOOKS=diffyqs npm run check:content` reports 49 errors, all from the mid-build state (Chapter 0's merged concepts anchor forms into 0.3, which is not built; `ch01/1.1/section.json` is a partial draft). They clear as Chapters 0 and 1 are built.

| Chapter | State | Next |
|---|---|---|
| ch00 (0.1–0.3) | prep done (chapter.json, book-rows merged, COLOR, exploration); 0.2 has plan.md, text.html, figures.js, no section.json | finish 0.2 (template: make its conventions clean), then 0.3, 0.1, chapter pass |
| ch01 (1.1–1.9) | config, COLOR, chapter.json (sections), plan.md for every section; `build-status.md` has decisions; 1.1/section.json partial | book-rows + `ost merge diffyqs 1` (after ch00), variables, sections, chapter pass |
| ch02 (2.1–2.6) | converted; exploration, config, COLOR; `build-status.md` | plans, chapter.json, merge after ch01, sections, pass |
| ch03 (3.1–3.9) | converted; exploration, config, COLOR; `build-status.md` | same |
| ch04–ch08, appA | not started (appA folder, chapter id `A`, waits for ch03's concepts) | full chapter build |
| Appendix B | not started | the Laplace table as `sheets/laplace-table.json` (see `$BOOK/RULES.md`) |

Each chapter keeps `chNN/build-status.md` (done, in progress, next, decisions Chen must hear); read it before resuming and keep it current.

## Per chapter (the order the paused job used)

1. **Prep** per `docs/prompts/briefs/prep.md`: `chNN/config.md` copied from `ch00/config.md` with only chapter-specific lines changed (status "agreed by carry-over"); exploration, COLOR, chapter.json, book-rows.json, merge after the previous chapter, variables with `ost meanings` first; plan.md for every section (`docs/prompts/briefs/section.md` step 1).
2. **Sections** in order per `docs/prompts/briefs/section.md`; template `ch00/0.2` once built (before that, Calculus `ch08/8.1`, `8.2` for an ODE page). Links: `/diffyqs/chNN/N.M/#N.M-<id>`, into Calculus `/calculus/chNN/N.M/#N.M-<id>`. Equations and figures are numbered chapter-wide (N.k), examples/theorems/exercises per section (N.M.k); every cited number must match a visible one.
3. **Chapter pass** per `docs/prompts/briefs/final.md`, corrections per root rule 13, `chNN/log-pass.md` then `ost log diffyqs N`.
4. Build every 3Blue1Brown survivor that falls in the chapter (`exploration.md`: 2.2 e^{st}; 2.2–2.6 fold with moving roots and critical damping; 2.10–2.11 transient vs steady; 3.8 e^{tA} grid flow; 4.2 coefficient areas; 4.6 discrete rod and decaying modes; 4.7–4.8 partial-sum probe; 4.17–4.19 time slice; 6.1 Laplace area; 6.3 convolution; 8.6–8.7 pendulum with phase point; 8.12–8.13 Duffing divergence), judging each one's exact form under rules 24–26; dropping one needs a stated reason.

figlib edits are additive, in a named block, with a test.

## Calculus: seven 3Blue1Brown-informed changes (written, not yet verified)

Written in the WIP commit, `OMNISTAX_BOOKS=calculus npm run check:content` clean, **not yet checked in a browser**. Before anything else touches Calculus: build, Playwright light and dark on 3.5, 3.9, 4.9, 5.3, 6.4, 16.6 (no console errors, every figure has a canvas, the new choices and drags work, readouts true in every state), fix, then commit. Each section's `plan.md` ends with an "Added 2026-10-19" block describing the change.

1. 6.4 `sim-arc-segments`: choice segments / staircase (staircase length stays Σ(Δx+|Δy|)).
2. 6.4 `sim-frustum-bands`: choice frustums / cylinders (cylinders sum to the wrong area).
3. 3.5 new `sim-unit-circle-nudge`: Δθ's small triangle similar to the big one, Δsin ≈ cos θ Δθ.
4. 16.6 new `sim-sphere-cylinder` at Example 16.63: sphere band equals its cylinder shadow, 4πr².
5. 5.3 `sim-ftc`: chord on F whose slope is f's average value.
6. 3.9 `sim-find-e`: draggable x, slope ÷ height = B′(0) everywhere.
7. 4.9 Figure 4.80 now `sim-wrong-root`: drag x₀; a band colours starts by the root reached.

## Finish

- `npm run colours:default -- diffyqs` after the last chapter, then a whole-book consistency pass (numbers, links, concepts resolve, Hasse-reduced prereqs), a full build and Playwright over every page.
- Report to Chen: per chapter the key decisions from `build-status.md`, the 3Blue1Brown Sims built or dropped and why, corrections of the book, anything that departs from `config.md`.
- Delete this file in the final commit.
