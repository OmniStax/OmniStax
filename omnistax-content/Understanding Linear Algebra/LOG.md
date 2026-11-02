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


## Pass 4 (2026-11-02): Chapter 3 pass: Invertibility, bases, and coordinate systems (3.1–3.5) after the section builds

Date 2026-11-02; claude-fable-5-1 at high effort. Steps of `briefs/final.md`:

1. Wants applied: anchors on 117 of the chapter's 122 variables rows (the five of 3.5 that first appear inside cards, `B`, `w_1_vec`, `w_2_vec`, `w_3_vec`, `b_vec`, have no span to anchor to) and on 57 of its 58 forms (`eq-fourier-average` is stated by no span of the running text and stays unanchored, as 3.3's plan allowed); `type: "vector"` on every row of a vector symbol that names no concept (`x_vec` in 3.1, 3.2, 3.3, 3.5; `b_vec` in 3.1, 3.5), and `redefines: true` on `3.5/x_vec`, which cleared the checker's one warning; the `ref`s of 3.2 and 3.4 stand as the sections set them. No concept, edge, form or glossary change was wanted or made; the chapter's 63 concepts keep the prep's statements and terms.
2. Cross-section: 49 end exercises, each kept once under its own source number; 19 activity cards (5 preview, 14 activity) against `modules.json`'s 19; 63 concepts, each with exactly one `introduces` span, every one the span `config.md` 18 named; 123 edges from the chapter's concepts, acyclic and Hasse-reduced, every prerequisite resolving (checked by script over the whole book's 427 edges); figures in book order in every section, 3.3.17 the one placed ahead of its number (config 7, cited from Exercise 3.3.5's card), every gap a definition, example, proposition, table or an exercise figure kept in a card; nothing held across sections.
3. Read of every `text.html` and `figures.js`: no leftover marker, no `$` as currency, no "demo", no hex colour outside `F.fact`, no still figure with a cycle, no slider for a discrete state, no unmarked referent. Fixed: 3.4's two links to Subsection 3.1.4 named the book's xml:id `subsec-triangular-invertible`, which 3.1 does not carry (repointed to its block `triangular-matrices-and-gaussian-elimination`); every cross-page fragment of the chapter and every link inside a card was unqualified and landed nowhere, confirmed in the build with Playwright (a bare `#id` in a card, and `/…/N.M/#id` anywhere, scroll nowhere; `#N.M-id` lands): qualified in 3.4, 3.5, the intro page and five cards (3.1 a3, e12; 3.3 e4; 3.4 a2, a3), the convention recorded as `config.md` 19; eight caption closers that told the reader to slide or drag, named the sliders' dashed circles or listed the presets (3.2.1, 3.2.2, 3.2.11, 3.3.7 + 3.3.8, 3.4's area Sim, 3.4.6, the parallelepiped Sim, 3.4.9) reworded to the subject (root rule 17; the maker already listed in each `ai.text` is the one that rewrote them); a comma inside an anchor in 3.5.
4. `config.md` status line and lines 5, 10, 13, 14, 17 updated; lines 19 (links) and 20 (captions) added; the five plans carry "Chapter pass (2026-11-02): … applied" under their `## Wanted at chapter level`.
5. `ost check` clean for the whole book; `npm test` 1062 of 1063, the one failure a race with Chapter 5's concurrent build (`ch05/5.2/section.json` not yet written when the figures test walked the directories), not this chapter; `test:books` and `astro check` clean; a build into scratch and a Playwright pass over the six pages of the chapter in light and dark: no console, page or request error, every image of each page loaded, every `figure.sim` booted a canvas (26 across the chapter), every inline card rendered, the derivation of 3.4 drawn. The checker's one remaining warning, that `book.json`'s colours are stale, is the orchestrator's `npm run colours:default` after the pass (standing decision 11).


## Pass 5 (2026-11-02): Chapter 4 pass: Eigenvalues and eigenvectors (4.1–4.5 and the introduction) after the section builds

Date 2026-11-02; claude-fable-5-1 at high effort. Steps of `briefs/final.md`:

1. Wants applied: anchors on 117 of the chapter's 128 variables rows through `ost set` (the eleven left unanchored are written in no block of the running text: `4.1/A_k`, `4.2/rank`, `4.3/C_prime`, `4.3/P_prime`, `4.4/J_k`, `4.4/Y_k`, `4.4/A_k_count`, `4.4/p`, `4.5/D`, `4.5/S`, `4.5/x_i`, each named only inside a card) and on 46 of its 53 forms (the seven left are stated only inside cards: 4.3's `eq-powers-of-similar-matrices` and `eq-rotation-scaling-factored`, 4.4's `eq-two-species-equations`, 4.5's four of Activity 4.5.5); 4.5's rows and forms, which its plan did not list, anchored by the pass from its text. `type: null` on `4.5/x_i` so the PageRank x_j stays in ink; no `type: "vector"` override was needed, since every vector row of the chapter names a typed concept. The `ref`s of 4.1, 4.3, 4.4 (v₁, v₂) and 4.5 (the three parties) confirmed. No concept, edge, form, statement or glossary change; the decisions are recorded under each plan's heading.
2. Cross-section: 48 end exercises, each kept once under its own source number, none held; 25 activity cards (5 preview, 20 activity) against `modules.json`'s 25; 53 concepts, each with a statement and exactly one `introduces` span, every one the span `config.md` 18 named; 101 edges from the chapter's concepts, every id resolving, acyclic and Hasse-reduced (checked by script over the book's 427 edges); figures in book order on every page (eleven Sims: the folds 4.1.3 + 4.1.4 + 4.1.5, 4.1.6 + 4.1.7, 4.4.2 + … + 4.4.7, 4.4.8 + 4.4.9, 4.5.7 + … + 4.5.11, Figures 4.3.1 and 4.4.1 with the unnumbered pair, and four Sims with no number), every gap a definition, example, proposition, question, theorem or an exercise figure kept in a card (4.1.9, 4.5.12–4.5.14); the Chutes and Ladders photograph withheld from Exercise 4.5.10's card and said in `exercise_notes` (config 6, no `withheld` row since it has no number and no figure); 17 referents, 23 correction footnotes (every slip the exploration listed, and ten the sections found, listed in config 21), two derivations.
3. Read of every `text.html` and `figures.js`: no leftover marker, no `$` as currency, no "demo", no hex colour outside `F.fact`, no still figure with a cycle (4.3's step slider is a story, not a clock), no slider for a discrete state, every referent drawn with `F.ref` and marked in the text. Fixed: Activity 4.2.2's card linked Activity 4.1.2 as `/…/4.1/#activity-eigen-geom`, an id 4.1 never carried (repointed to `#4.1-ex-a2`); every other cross-page link of the chapter, and 1.3's into 4.5, names an id its target carries (config 19); 4.2's Sim caption told the reader to drag an entry, named the sliders' dashed mark and listed the presets (reworded to the subject, config 20; the maker already in `ai.text`); the intro page's second paragraph opened on the converter's orphan comma (moved into the display before it).
4. `config.md` status line and lines 5, 6, 10, 14, 16, 17 updated; lines 19 (links), 20 (captions) and 21 (corrections) added; the chapter `COLOR.md`'s note that G had no macro replaced (4.5 writes `\kG`); the five plans carry "Chapter pass (2026-11-02): … applied" under `## Wanted at chapter level`.
5. `ost check` clean for the whole book (no errors; the one warning is that `book.json`'s colours are stale, the orchestrator's `npm run colours:default` after the pass, standing decision 11); `npm test` 1063 of 1063; `test:books` 4 of 4; `astro check` 0 errors; a build into the pass's scratch and a Node Playwright pass over the six pages of the chapter in light and dark: no console, page or request error, every image of each page loaded, every `figure.sim` booted a canvas (11 across the chapter), both derivations drawn, every inline card host rendered.


## Pass 6 (2026-11-02): Chapter 5 pass: Linear algebra and computing (5.1–5.2 and the introduction) after the section builds

Date 2026-11-02; claude-fable-5-1 at high effort. Steps of `briefs/final.md`:

1. Wants applied: anchors on 60 of the chapter's 64 variables rows through `ost set` (the three of 5.2 written only in cards, `E_3`, `q_vec`, `w_vec`, and the new `5.2/B` are unanchored, as the plan asked) and on all 29 forms; the variables row `5.2/B` added (the 2 × 2 matrix of Exercise 5.2.6, `type: "matrix"`, no concept, `redefines: true` against 5.1's B; `B` was already a symbol of the book), and the card now writes `\kB`; `type: "vector"` was already on every vector row that names no concept (five in 5.1, nine in 5.2); the `ref`s on `5.2/v_1_vec` and `5.2/v_2_vec` confirmed. No concept, edge, form, statement or glossary change; the decisions are recorded under each plan's heading.
2. Cross-section: 19 end exercises, each kept once under its own source number, none held (5.1.5 stays in 5.1, as the exploration decided); 8 activity cards (2 preview, 6 activity) against `modules.json`'s 8; 17 concepts, each with a statement and exactly one `introduces` span, every one the span `config.md` 18 named; 32 edges from the chapter's concepts, every id resolving, acyclic and Hasse-reduced (checked by script over the book's 427 edges and 235 concepts); figures in book order on both pages (four Sims: 5.1's two with no number, 5.2's power-method fold of the two unnumbered drawings with no number, and Figure 5.2.3), the one gap in 5.2's run its two examples; 4 referents in two groups; 10 correction footnotes (every slip the exploration listed, and the one 5.1 found); no derivation, no photograph.
3. Read of every `text.html` and `figures.js`: no leftover marker, no `$` as currency, no "demo", no hex colour, no still figure with a cycle (the LU Sim's step slider is a story, as 4.3's), no slider for a discrete state (the order of the equations is a choice), every referent drawn with `F.ref`; the four captions stand (root rule 17). Fixed: 5.1's link to Subsection 1.3.3 named `#subsec-compute-effort`, an id 1.3 never carried (repointed to `#computational-effort`, as 4.5 links it); the two `v₂` of 5.2's `p#initial-vector` (`x₀ = v₂`, `λ₂ᵏv₂`) were the paragraph's only unmarked references to the referent (now `data-ref="v-2"`); the caption of Figure 5.2.3 names Exercise 5.2.4 without a link (now `#5.2-ex-e4`). Every other cross-page link of the chapter names an id its target carries (config 19). No words were rewritten, so no maker was appended.
4. `config.md` status line and lines 7, 10, 14, 16 and 18 updated; lines 19 (links), 20 (captions) and 21 (corrections) added; both plans carry "Chapter pass (2026-11-02): … applied" under `## Wanted at chapter level`.
5. `ost check` clean for the whole book (no errors; the one warning, that `book.json`'s colours are stale, is the orchestrator's `npm run colours:default` after the pass, standing decision 11); `npm test` 1063 of 1063; `test:books` 4 of 4 (one skipped); `astro check` 0 errors, 0 warnings; a build into the pass's scratch and a Node Playwright pass over the three pages of the chapter in light and dark: no console, page or request error, every image of each page loaded, all four `figure.sim` booted a canvas (the two moving Sims of 5.2 with their transport), every inline card host rendered. Checked in the build: a bare `#example-LU` clicked in a card and a `hashchange` to it land on the qualified element (config 19 of Chapter 4 holds); a link to an end-exercise card (`#5.2-ex-e5`, as 3.1, 4.3 and 4.5 write theirs) sets the hash but mounts nothing on the section page, since the Exercises document is an item of its own; noted for the orchestrator.
