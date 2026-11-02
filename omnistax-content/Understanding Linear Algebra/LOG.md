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
