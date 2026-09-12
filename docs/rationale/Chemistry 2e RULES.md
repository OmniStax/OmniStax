> Long form of `omnistax-content/Chemistry 2e/RULES.md`, kept verbatim for people; agents read the short form, not this file.

# Chemistry 2e: the book's rules

What is true of this book and of no other. The rules that hold for every
book are in the repository's root `RULES.md`, and this file is the one
item 18 there asks for. It is revised as chapters are added; the
decisions for one chapter are in that chapter's `config.md`, and the
colour plan for the book is in `COLOR.md` beside this file (root rule
22).

## Source

The book comes from OpenStax as a CNXML bundle, a shallow clone of
github.com/openstax/osbooks-chemistry-bundle, kept at
`source/osbooks-chemistry-bundle/` in this folder and not committed. No
PDF has been downloaded, and none is needed: in CNXML every piece of
apparatus sits inside its module. The bundle holds two books that share
modules; only `collections/chemistry-2e.collection.xml` (collection
col26069) is built, and `chemistry-atoms-first-2e.collection.xml` is
ignored.

One module is one section. Modules are numbered `m68NNN` and live at
`source/osbooks-chemistry-bundle/modules/<module>/index.cnxml`; the
chapter's `chapter.json` records which module each section is, and its
`intro` record names the chapter introduction's module and its slug at
the publisher, as `book.json`'s `intro` names the Preface's (m68662,
`preface`). The whole table of contents, with module ids, is in `toc.md`
and `modules.json`. Figures sit beside the modules under the bundle's
`media/`, and the ones a page keeps are copied to `media/<chapter>/`
here.

The shared converter at `omnistax-content/tools/cnxml2md.py` turns one
module into `source.md`:

```
python3 ../tools/cnxml2md.py source/osbooks-chemistry-bundle/modules/m68664/index.cnxml > ch01/1.1/source.md
```

It converts MathML to LaTeX and keeps the markers the later steps read:
`{eq:id}` after an equation, `{term:…}` round a defined term,
`[ref:target]` for a cross reference, a `> FIGURE {fig:id}` block with
the image path, alt text and caption, `:::example {ex:id}` and
`:::exercise {id}` blocks with `PROBLEM:` and `SOLUTION:` inside them,
`:::note` blocks with their class, and `- {def}` for a glossary entry.
What this book needs of it beyond those markers is listed in
`exploration.md`: the learning objectives from the module's
`<md:abstract>`, the unnumbered inline images (bare `<media>`, 529 in
the book), equations inside notes and list items, footnotes set apart
from the sentence, and the four note classes as named kinds. The ids
are the book's own CNXML ids, and an exercise's `source_id` is the id
its block carries.

## Structure

book → chapters (21) → sections (numbered N.M) → titled narrative
headers, two levels deep in places → worked examples. Each chapter has
an unnumbered introduction of its own, one module of two to four
paragraphs under a splash photograph, and the book opens on a Preface;
it prints no chapter summary and no closing summary. The working format
maps onto it directly: one module, one section, one page, and, by root
rule 21, the chapter introduction is a page of its own in the chapter's
`intro/` folder, listed before the first section, and the Preface is the
book's own introduction in `intro/` beside the chapters, listed before
Chapter 1. An introduction page keeps the book's words and its opening
photograph, which is the point of the page and so is kept with its
number (Figure N.1), caption and credit; it has no lead, no objectives,
no summary, no glossary of its own and no exercises. Sections are never
folded, not even 13.1, the shortest.

The chapters and their ids:

| Id | Chapter | Introduction |
|---|---|---|
| ch01 | Essential Ideas | m68663 |
| ch02 | Atoms, Molecules, and Ions | m68684 |
| ch03 | Composition of Substances and Solutions | m68699 |
| ch04 | Stoichiometry of Chemical Reactions | m68730 |
| ch05 | Thermochemistry | m68723 |
| ch06 | Electronic Structure and Periodic Properties of Elements | m68728 |
| ch07 | Chemical Bonding and Molecular Geometry | m68736 |
| ch08 | Advanced Theories of Covalent Bonding | m68743 |
| ch09 | Gases | m68748 |
| ch10 | Liquids and Solids | m68760 |
| ch11 | Solutions and Colloids | m68776 |
| ch12 | Kinetics | m68785 |
| ch13 | Fundamental Equilibrium Concepts | m68796 |
| ch14 | Acid-Base Equilibria | m68802 |
| ch15 | Equilibria of Other Reaction Classes | m68810 |
| ch16 | Thermodynamics | m68815 |
| ch17 | Electrochemistry | m68820 |
| ch18 | Representative Metals, Metalloids, and Nonmetals | m68828 |
| ch19 | Transition Metals and Coordination Chemistry | m68841 |
| ch20 | Organic Chemistry | m68845 |
| ch21 | Nuclear Chemistry | m68850 |

A chapter folder is `ch` followed by the two-digit chapter number. A
chapter's book-level rows (types, symbols, concepts, prerequisite edges)
are staged in its `book-rows.json` and merged into `book.json` with
`tools/mergebook.py merge chNN`, never written by hand.

The thirteen appendices (A, the periodic table, to M, half-lives) are
top-level modules outside any chapter. They are not built as pages.
Twelve of them are tables of reference data, and they become **sheets**:
files `sheets/<id>.json` in this folder (`periodic-table`, `units`,
`constants`, `water`, `commercial-acids-bases`, `thermodynamic-properties`,
`ka`, `kb`, `ksp`, `kf`, `electrode-potentials`, `half-lives`), each
written from its module's CNXML table by a tool of this book, which the
app serves beside every page as it serves the formula sheet. The
periodic table is the first of them and the one the whole book leans on.
Appendix B, Essential Mathematics, is prose with worked examples and is
the one appendix that becomes a page, converted as a section is and
listed after the chapters; the app has no place for such a page yet, so
it waits. Until the app serves sheets, a cross-reference to an appendix
points at the publisher's page.

## Apparatus

Inside each module, in this order: the learning objectives (in
`<md:abstract>`), the narrative with its examples, figures, equations,
inline definitions and notes, then "Key Concepts and Summary", "Key
Equations" (in 51 of the 114 sections), "Chemistry End of Chapter
Exercises", and the glossary. Nothing is aggregated at the end of a
chapter in CNXML. The section summary goes to `summary_html` and the app
prints it at the end of the section's text, as the book prints it at
the end of the section (root rule 21); the objectives, the key equations
and the glossary go to the tables and the views. A chapter introduction
module carries none of this apparatus, only its photograph and its
paragraphs.

Worked examples are `<example>` elements, numbered Example N.M on the
publisher's site, each with a title, a problem statement, a "Solution"
paragraph and a "Check Your Learning" that poses a parallel problem and
carries its answer in a note. There is no strategy or discussion
paragraph.

The answer key covers the odd-numbered exercises of each section's list
(873 of the book's 1736), as the Preface says and every section confirms:
the solution sits inline in the `<exercise>` element when the book gives
one, and an even-numbered exercise has no keyed answer. Every Check Your
Learning carries its answer. Because the key runs by position, a
conceptual question is keyed as often as a numerical one; a keyed
"Answers will vary" or a solution that narrates a PhET run is not a
graded answer and is kept as an open answer the reader compares with.
An unkeyed numerical exercise is left out and named in the section's
`exercise_notes`, and no answer is ever generated (root rule 13). An
unkeyed conceptual exercise is kept with a suggested approach that the
page marks as OmniStax's own, never as a graded answer, which is the
default root rule 13 sets for open questions. Chapter 1 was built this
way.

A periodic table sheet, a constants sheet and a units table are wanted
from Chapter 1 on: 1.3 shows the table, 1.4 and 1.6 convert units, and
2.3 reads atomic masses off it.

## Licence and attribution

The book is CC BY-NC-SA 4.0, copyright Rice University, published by
OpenStax, by Paul Flowers, Klaus Theopold, Richard Langley and William R.
Robinson, the senior contributing authors named in the Preface (m68662)
and on openstax.org; the fourteen contributing authors are not named in
the footer. The adapted pages are shared under the same licence and the
footer says so. A section's page at the publisher is the `openstax`
prefix of `book.json`, `https://openstax.org/books/chemistry-2e/pages/`,
followed by the section's `slug` from `chapter.json`. The book's
third-party credits live on its photographs as a "(credit: …)" clause at
the end of the caption, sometimes one per panel ("credit a: …; credit b:
…"), so a kept photograph keeps the whole clause. The Preface adds that
art without an attribution is "Copyright Rice University, OpenStax,
under CC BY-NC-SA 4.0 license", which the footer already states. All of
this is in `book.json`; this file records where it came from.

## Voice

Full sentences in a plain, measured register, on the formal side of
plain: the book says "we" when it works something out and "you"
when it addresses the reader, prefers "note that" and a parenthetical
aside to a colon, names a thing by its full name before its symbol, and
explains a rule before it states it. It is patient with its own
technicalities and says why they matter. A few sentences to write
against:

> Whether you are aware or not, chemistry is part of your everyday world.
> In this course, you will learn many of the essential principles
> underlying the chemistry of modern-day life.

> It is important to understand that no single boron atom weighs exactly
> 10.8 amu; 10.8 amu is the average mass of all boron atoms, and
> individual boron atoms weigh either approximately 10 amu or 11 amu.

> It's important to emphasize that chemical equilibria are dynamic; a
> reaction at equilibrium has not "stopped," but is proceeding in the
> forward and reverse directions at the same rate.

> The spontaneity of a process is not correlated to the speed of the
> process. A spontaneous change may be so rapid that it is essentially
> instantaneous or so slow that it cannot be observed over any practical
> period of time.

No fragment-headed captions, no telegraphic semicolon chains, no
editorial framing. OmniStax's sentences are set in the sans face; the
reader should feel a change of typeface, not a change of writer.

## Types

The book declares fourteen types in `book.json`, in the order the colour
scheme lays its hues along: time, amount of substance, mass, volume,
concentration, pressure, temperature, energy, entropy, rate, wavelength,
frequency, potential, charge. Length, density, a count of particles, a
percent, a mole ratio, an equilibrium constant and a reaction quotient
are not typed and stay in ink; so does a rate constant, whose units
change with the order. `COLOR.md` says why each type is there, what its
variants are, and how the book's second family of colour, the atom
palette of its molecular drawings, is kept apart from the scheme.

Variants of one type share its hue and differ by decoration: an initial
value (subscript i or 0) is hollow or dashed, a final one filled, a
standard-state value (°) told by its mark, a per-mole value by its
unit. A derived quantity is another type: molarity is not an amount, a
rate is not a concentration, entropy is not an energy. pH and pOH are
variants of concentration, since each is the concentration written as
its negative logarithm and stands for nothing else; they take the
concentration hue with the p as their decoration.

Every symbol the text colours has a row in the `symbols` table with its
type and its macro name (`\kn`, `\kM`, `\kdH`); a symbol with no type
(Z, A, K_c, k) has a row with its LaTeX only, or none. The macros are
derived from the table, so a new symbol is a new row, not a new macro.

## Exercise kinds

Three kinds, declared in `book.json`:

- `check-your-learning`: the Check Your Learning item at the end of every
  worked example. Inline, right after the example it parallels, with the
  book's answer.
- `exercise`: the items under "Chemistry End of Chapter Exercises" at the
  end of the module. The Exercises document. The book gives them no
  type; conceptual and numerical items sit in one list and are told apart
  only by their content, so the kind stays one and the Bloom level does
  the sorting.
- `simulation-exercise`: an end-of-chapter exercise whose prompt is an
  instruction to open a PhET or other external simulation (the density,
  Rutherford, Build an Atom, isotope-mixture and Build a Molecule items
  of Chapters 1 and 2 are the first). The Exercises document, but only
  once a Sim of our own carries the same idea, when the prompt is
  rewritten against it in the section's plan; until then the item is
  held and named in `exercise_notes`.

An exercise goes with the section that introduces what it tests. The
book keeps its exercises inside the section they belong to, so nothing
is expected to be held for a later page; where one is, both sections'
`exercise_notes` say so.

## Figures

The book numbers its figures chapter-wide on openstax.org (Figure 9.4),
starting from the chapter opener's photograph as Figure N.1; the number
is the book's, not a count of the CNXML figures. Tables are numbered the
same way (Table 2.3) and worked examples too (Example 4.2). Images the
book prints without a number or a caption, as a bare `<media>` in the
running text, an example or an exercise, are unnumbered; there are 529
of them, most of them Lewis structures, reaction schemes and exercise
diagrams, and they are content the page cannot do without. An
interactive figure that replaces a numbered book figure keeps the book's
number, its eyebrow reads "Figure" with that number, and it carries the
book's images as its `originals` and the book's caption as
`original_caption`. One that replaces an unnumbered image is a figure
without a number whose `originals` carry the image, and its eyebrow
reads "Figure"; one that replaces nothing is a Sim. A kept photograph is
a `photo` row with its number. A figure that folds several book figures
names its own `number` and the rest under `folds`. Sub-figures the book
prints under one number, (a) and (b), are one number with several
`originals`. The validator reads every eyebrow against its row.

Images in this bundle carry no `width` attribute, so `widths` stays
empty and the app shows each image at its natural size, capped at three
fifths of the viewport. The book's images are served from
`media/<chapter>/` in this folder, with the file names the bundle gives
them.

Two conventions of the book's own that the app honours. First, the atom
palette: the molecular drawings colour carbon black, hydrogen white,
oxygen red, nitrogen blue, chlorine green, sulfur yellow, phosphorus
orange, copper brown, sodium purple and titanium gray, and a live
drawing of a molecule uses the same colours, from the fixed element
palette `COLOR.md` describes, never from the type scheme. Second, the
spectra: Chapter 6 paints its line spectra and blackbody curves in the
colours of visible light, and a figure that redraws them keeps those
colours as a physical fact, not a type.

Photographs are kept where they show the thing the passage is about
(mercury oxide decomposing in 1.2, lead iodide forming in 4.2, the copper
wire in silver nitrate of 17.2, the bromine tube of 13.1), where the
text points the reader at them, and in every Portrait of a Chemist box;
they are dropped where they are a stock scene beside an example or a
note. Every chapter opener's photograph is kept on the introduction
page.

The book's boxed notes are kept in the text verbatim as titled asides
(`aside.book-note`) whose eyebrow is the book's own heading (Chemistry
in Everyday Life, How Sciences Interconnect, Portrait of a Chemist) and
whose figures are treated as any figure. The Link to Learning notes are
not kept: their links (140, all through openstax.org redirects, 28 of
them to PhET simulations) are left out and named in the section's
`notes`, and a link to a simulation of an idea the section teaches is
the trigger for a Sim of our own.

The book's tables stay in the text as tables, in a `div.book-table`
whose eyebrow is the number the book prints and whose caption is the
book's title for it; a spanned header is written from the CNXML by hand.
A table is never a `<figure>`.

Three ideas in the book are spatial and want three.js, which the app
loads on every page: molecular geometry (7.6), hybrid orbitals (8.2) and
crystal lattices (10.6). Everything else, including the particle boxes,
the cells and the titrations, is planar and drawn through `figlib`.

## Files

The layout is the one the root `RULES.md` draws, with two additions for
this book:

- `sheets/`, the reference data of the appendices, one JSON file per
  appendix as the Structure section lists them, written by a tool of
  this book and served by the app as sheets; and `COLOR.md`, the book's
  colour plan, beside this file. The first of them is
  `sheets/elements.json`, Appendix A as data — all 118 elements, which
  `book.json` declares as the sheet `elements` and which the app draws as
  the periodic table and reads every chemical formula of the prose
  against. It is written by `tools/elements.py` and marked
  `"generated_by": "tool"`: the values in it are standard reference
  values rather than the book's words, so a later pass may replace any of
  them with Appendix A's own, and the list of sections that name each
  element is recomputed by the tool as more of the book is built. The
  eleven data appendices, C and D through M, are the book's `table`
  sheets, written from the CNXML tables by `tools/appendices.py` and
  marked `"generated_by": "tool"` with the module each was read from: a
  cell carries the same HTML the prose does, so a formula in a table
  opens the same card a formula in a paragraph does. Appendix B is prose
  and becomes a page of its own rather than a sheet, and the Lewis
  structures Appendices H and I print beside their constants are images
  and are not carried into the data.
- The degree sign in a temperature is `°` (U+00B0) everywhere, in the
  tables as in the text; the bundle sometimes prints the masculine
  ordinal `º` in its place, and the conversion normalises it.
- `figures.js`, `text.html` and the dollar-sign rule: one function per
  figure through `F.sim(root, id, H)`, every `<figure>` carrying `id`, `class`,
  `data-figure`, `data-original` and `data-original-caption` in
  agreement with the figures table, and a dollar sign written `&#36;` in
  the prose and as the fullwidth `＄` inside an exercise string. A live
  drawing of a molecule takes its atom colours from the element palette
  (`F.el('O')`, once the app has it) and its quantity colours from
  `C(type)`, and never from a hex literal.
