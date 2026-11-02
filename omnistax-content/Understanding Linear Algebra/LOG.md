# Experiment log: Understanding Linear Algebra (David Austin)

Source: David Austin, *Understanding Linear Algebra*, 2026 Update (git
b6ea263, 2026-09-18), CC BY 4.0. PreTeXt source: `source/ula/`, a clone of
github.com/davidaustinm/ula (gitignored): a preface, Chapters 1–7 (32
sections), a Sage reference appendix and an index. The PDF the book
publishes is at `source/ula/site/ula.pdf`. The table of contents with
xml:ids is `toc.md`.

Workflow: the full-book pass of root rule 18 first, then chapters by the
prep / sections / chapter-pass split, orchestrated without check-ins on
Chen's instruction of 2026-11-02.

## Pass 1: the full-book pass (2026-11-02)

Prompted by: Chen's request for a new linear algebra OmniBook, and root
rule 18. The text was chosen among Beezer's FCLA (GFDL), Margalit and
Rabinoff's ILA (GFDL) and Austin's ULA for its CC BY licence, its
PreTeXt source with the author's answer and solution to nearly every
exercise, and its activity-driven, geometric style; Hefferon's text could
not be fetched from this session.

What the exploration found, in brief (`exploration.md` has the whole of
it). One `<section>` is one section, 32 in seven chapters; chapters 2–7
print a short introduction, the book a preface. Apparatus inline: a
section introduction and a Summary subsection; 30 preview activities and
109 activities with answers and solutions; 80 examples, 64 definitions,
64 propositions and theorems, 6 observations, 3 questions, 12 assemblages;
297 end exercises, 292 answered; 290 Sage cells; 188 figures, nearly all
PreFigure diagrams (392 in all), 19 photographs, 14 JavaScript
interactives; one footnote; 9 tables. Every number checked against the
PDF.

Written: `tools/convert.py` (PreTeXt → `source.md`, with the book's
macros expanded, cross-references resolved and media planned), every
`source.md` (32 sections, 6 chapter introductions, the preface), `toc.md`,
`modules.json`, `media/` (295 SVGs, 71 of them rendered by `prefig`, 29
photographs and previews), `book.json` (identity, six types, four
exercise kinds, highlights with words off), `RULES.md`, `COLOR.md`,
`exploration.md` with the 3Blue1Brown survey, and `briefs/` for the
build's agents.


## Pass 2 (2026-11-02): Chapter 1 pass: Systems of equations (1.1–1.4) after the section builds

Date 2026-11-02; claude-fable-5-1 at high effort. Steps of `briefs/final.md`:

1. Wants applied: anchors on all 13 variables rows of the chapter and on its 5 forms; a symbols row `s_i` and a variables row `1.1/s_i` added through `book-rows.json` and `ost merge`; the referent group of 1.1 (six, one group) recorded in `ch01/COLOR.md`. No concept, edge or glossary change was wanted or made.
2. Cross-section: 25 end exercises, each kept once with a distinct source number; 12 activity cards against `modules.json`'s 12 (3 + 4 + 2 + 3); 42 concepts each with exactly one `introduces` span; 61 edges, Hasse-reduced and acyclic (checked by script); figures in book order: 1.1.5 + 1.1.6, 1.1.7 + 1.1.8, 1.1.9 + 1.1.10 as folds, 1.1.1–1.1.4 the dropped grids (said in 1.1's notes), 1.3.3–1.3.5 faithful copies inside the exercise cards; nothing held across sections.
3. Read of every `text.html` and `figures.js`: fixed the 1.4 link to 1.3's Augmentation Principle box (`#principle-augmentation-principle` → `#prop-augmentation-principle`, in the text and in Activity 1.4.2's card); moved the converter's orphan punctuation into the displays before it (1.2 three places, 1.3 two); trimmed three captions that spoke of presets and controls (1.1's two folds, 1.4's Sim) to what the reader sees. No leftover marker, no `$` as currency, no "demo", no hex colour, no still figure with a cycle, no slider for a discrete state, no unmarked referent.
4. `config.md` line 17 and its status line updated.
5. `ost check` clean for Chapter 1; `npm test`, `test:books`, `astro check`, a build and a Playwright pass over the four pages in light and dark are recorded in the pass report.


## Pass 3 (2026-11-02): Chapter 2 pass: Vectors, matrices, and linear combinations (2.1–2.6 and the introduction) after the section builds

Date 2026-11-02; claude-fable-5-1 at high effort. Steps of `briefs/final.md`:

1. Wants applied: anchors on all 85 variables rows of the chapter and on its 56 forms, through `ost set`; `type: "vector"` set on every row of a vector symbol that names no concept (`x_vec`, `b_vec`, `w_vec`, `v_i_vec`, `w_i_vec` in 2.2–2.6, matching 2.1's rows), as the chapter `COLOR.md` asks, which also cleared the checker's eight "means something else in 2.1" warnings: its test counts a type difference as a different meaning, and the meaning strings were equal. The `ref` on 2.3's and 2.4's referent rows confirmed. No concept, edge, glossary or statement change was wanted or made; the decision is recorded under each plan's heading.
2. Cross-section: 60 end exercises, each kept once with a distinct source number, none held; 23 activity cards (6 preview, 17 activity) against `modules.json`'s 23; 60 concepts, each with exactly one `introduces` span, the five first named in cards (config 18) introduced on the running text named there; 110 edges from the chapter's concepts, every id resolving, acyclic and Hasse-reduced (checked by script); figures in book order on every page, the worksheet grids 2.1.2–2.1.4, 2.1.15–2.1.17, 2.3.10, 2.3.11, 2.5.1, 2.5.2 dropped and said in `notes`, the exercise figures faithful copies in their cards; the one figure after a higher number, the stick-figure fold 2.6.11 after 2.6.12, is the rebuilt interactive standing at its place (the pass tried 2.6.13 as its own number and the checker showed the eyebrow prints the row's own number first, so 2.6.11 stays; config 14).
3. Read of every `text.html` and `figures.js`: trimmed the sentences of twelve captions that spoke of sliders, dragging, presets and "the book's"; fixed the caption of Figure 2.6.2, which linked Activity 2.6.2 as `#a2` (no id; cards are `2.6-ex-a2`), and linked 2.6's "Activity 2.5.3" to its card; the vectors of 2.3's and 2.5's displays and of 2.5's state equations and truck readout now go through the macros (`\kvecv_n`, `\kvecvone`, `\kvecb`, `\kvecx_{k+1}`), so every vector wears its colour; removed a stray `form = 'line'` assignment to an undeclared name in 2.3's `figures.js`. No leftover marker, no `$` as currency, no "demo", no hex colour, no still figure with a cycle, no slider for a discrete state, no unmarked referent. Every section's `ai` already names this model and effort.
4. Dropped worksheet figures a card cites (brief item c): Activity 2.3.3 keeps the book's "in Figure 2.3.10" and "in Figure 2.3.11", each linked by hand to the space figure that draws both sets, with a correction note under the card; Preview Activity 2.5.1's three citations leave the parts' words, as 1.1 and 2.1 did, and `changes` names the figures, since nothing draws the graphs and `test:books` forbids a built chapter citing a number no row carries. The convention is config 5. `config.md` lines 3, 5, 10, 14, 17 and 18 updated.
5. `ost check` clean for the whole book (no errors; the one warning is Chapter 3's, under build), `npm test` 1063 passing, `test:books` 4 of 4, `astro check` 0 errors, a build into the pass's scratch and a Node Playwright pass over the seven pages in light and dark: no console or page error, no failed request, every image loading, all 20 Sims booting a canvas (the truck fleet with its transport), every inline card host rendered.
