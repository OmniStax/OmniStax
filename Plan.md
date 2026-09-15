# Plan: finishing College Physics 2e

Written 2026-09-11 by Fable (the orchestrating session) on Chen's instruction
to finish the physics textbook with Opus agents in one job, planning and
executing without check-ins, until usage runs out. This file is the plan and
the running record; the per-chapter detail is in each chapter's
`exploration.md`, `config.md`, the sections' `plan.md`, and `LOG.md`.

## Where the book stood

Four of 34 chapters were built: 1, 2, 3 and 16, with their introductions and
the Preface (LOG passes 1 to 26). Thirty chapters and 219 sections remained.
`check:content` was clean, 339 unit tests passed.

## The process, per chapter

The three-phase split that built Chapters 2 and 3 (LOG passes 20 and 21),
with one change: `book.json` is never edited by hand. Each chapter stages
its book-level rows in `<chapter>/book-rows.json` and merges them with
`tools/mergebook.py merge chNN`, which takes a lock, replaces the rows the
chapter owns, refuses duplicate concept ids, symbols, macros and types, and
writes atomically. Log passes go the same way: `<chapter>/log-pass.md`,
appended by `tools/mergebook.py log chNN` with the next pass number. This
lets several chapters run every phase at the same time.

1. **Prep** (one Opus agent per chapter): `exploration.md`, `config.md`,
   `chapter.json` (sections, variables, equations, glossary; no anchors),
   `source.md` for every section, the chapter introduction page in
   `intro/`, and `book-rows.json` (types the chapter needs that the book
   does not declare, symbols with macros, concept nodes with prerequisite
   edges), merged and validated.
2. **Sections** (one Opus agent per section, all of a wave in parallel):
   `plan.md`, `text.html`, `figures.js`, `section.json`, media copies.
   Rule 2's stop and rule 5's review are replaced by the plan file, as
   Chapters 1 to 3 did. Wants at chapter level go in the plan under
   "Wanted at chapter level".
3. **Chapter pass** (one Opus agent per chapter): applies the wants
   (anchors, concept fixes, symbols), checks cross-section consistency,
   reads every page, runs the full checks and a headless pass, writes the
   log pass.

Fable commits after each wave, updates this file, and at the end updates
the book's `RULES.md` (chapters built) and merges the worktree branch back
onto main.

## Standing decisions for this job

- Templates: `ch03/3.4` (a moving figure with a graph), `ch02/2.4`,
  `ch01/1.2` (qualitative, photographs), `ch16/16.3` (oscillation),
  `ch03/intro` (an introduction page).
- Mass, length of a scene, angle, count, and dimensionless coefficients
  stay untyped and in ink, as in the built chapters. A chapter may declare
  a new type when it introduces a kind of quantity its figures will draw
  and its readouts will colour (momentum, torque, pressure, temperature,
  charge, current, voltage, resistance, field strength, power, and so on);
  the prep agent decides, records the case in `exploration.md`, and the
  merge refuses a duplicate. Types are canonical across chapters
  (`pressure` is the same type in 11 and 13).
- Existing symbol rows are never changed by a chapter; a chapter that
  needs one changed says so in its report and Fable decides.
- `source_section` may only name a section in the same chapter or in a
  chapter already built; an exercise that belongs to a later chapter is
  left out and named in `exercise_notes`.
- Answers: the book's key only, never computed. Unkeyed problems are left
  out and named. Conceptual questions and unkeyed AP items get an
  AI-marked suggested approach. Unkeyed AP choice items are kept as open
  items with an AI-marked approach, never as a graded choice.
- `ai` is `{"text": "Claude Opus 5", "figures": "Claude Opus 5"}`; `built`
  is the day the section was built.

## Waves

Three chapters per wave, in book order, since prerequisites run forward.
Prep for the next wave starts while the current wave's sections build.

| Wave | Chapters | Sections | Status |
|---|---|---|---|
| 1 | 4, 5, 6 | 17 | sections built 2026-09-11; chapter passes interrupted (see Record) |
| 2 | 7, 8, 9 | 22 | all built 2026-09-11; Chapter 7's pass done (LOG pass 28), passes of 8 and 9 still owed |
| 3 | 10, 11, 12 | 23 | built 2026-09-14 (LOG passes 35 to 37) |
| 4 | 13, 14, 15 | 20 | built 2026-09-14 (LOG passes 38 to 40) |
| 5 | 17, 18, 19 | 22 | built 2026-09-14 and 15 (LOG passes 42 to 44), with 16.7 to 16.11 (pass 41) |
| 6 | 20, 21, 22 | 24 | prepared 2026-09-15; 20 passed (LOG 45), 21 and 22 in their passes |
| 7 | 23, 24, 25 | 23 | prepared 2026-09-15 (types magnetic flux, inductance; none for 24 and 25); sections building |
| 8 | 26, 27, 28 | 21 | |
| 9 | 29, 30, 31 | 24 | |
| 10 | 32, 33, 34 | 20 | |

## Record

Updated as waves finish. See LOG.md for the pass entries.

**2026-09-11, paused on Chen's word with credits running low.** Merged
onto main: Chapters 4, 5, 6, 8 and 9 whole (every section, every
introduction, 30 section pages and 5 introduction pages; LOG pass 27),
and Chapter 7's preparation (chapter tables, 44 concepts, the `power`
type, its introduction page). `check:content` clean at 10 chapters and
53 sections, 348 tests, `astro check` clean, 66 pages built, and a
headless pass over all 36 new pages in light and dark with no console
error, every image loading and every canvas booting.

What was cut short:

- The chapter passes of 4, 5 and 6 were stopped mid-way. Chapter 4's
  pass had merged its new symbols and applied them in 4.5 and 4.7;
  Chapter 5's had applied its anchors; Chapter 6's had edited
  `book-rows.json` (re-merged by Fable). None wrote its log pass, and
  the anchors, cross-section checks and full-chapter headless pass of the
  brief are still owed for 4, 5, 6, 8 and 9. Every section's `plan.md`
  carries its "Wanted at chapter level" list, so the passes can be
  re-run from the briefs as they stand.
- Chapter 7: 7.1 and 7.2 were built whole but take exercises from 7.6
  and 7.9 with `source_section`, which the validator refuses until those
  are built; 7.3 and 7.4 had text and figures but no `section.json`; 7.5
  had a plan. All of it is held, untracked, at
  `/home/flober/repos/OmniStax/.claude/partial-sections/ch07/` (one
  folder per section) and goes back into `ch07/` when the chapter
  resumes; the `source.md` files and `media/ch07/` copies stayed in the
  tree.
- Book-level things a later pass should settle: 16.1's
  `elastic-potential-energy` now sits at 7.4 (16.1 reinforces it); the
  symbol `PE_el` keeps `\kPE` and plain `PE` took `\kPEtot`; `r` (5.3,
  untyped) beside `r_curv` (`\kr`, position); `v_1`/`v_2` are Chapter 6
  rows reused by Chapter 8; `T_1`/`T_2` are tensions, so Kepler's
  periods are `T_orb1`/`T_orb2`; the book's own Table 4.1 is printed
  as printed, contradictions and all.
- The converter now emits a table nested in a paragraph (only 5.3 ever
  had one); it still drops every table's title, which the exploration
  files carry instead.

**2026-09-11, later the same night.** Chen cancelled the timer and had
Chapter 7 finished with the usage left: 7.1 to 7.5 restored from the
holding folder, 7.3 to 7.9 built, and the chapter pass run (LOG pass
28: 125 anchors, two inline hosts that were missing, the `F_fr` symbol,
a rule on dollar signs in exercise strings). Checks on the whole:
`check:content` clean at 10 chapters and 62 sections, 361 tests,
`astro check` clean, 75 pages built, 45 new pages smoke-tested in light
and dark with nothing wrong. Two things noted for a later pass: the
chapter passes of 4, 5, 6, 8 and 9 are still owed, and the angle unit
in `chapter.json` variables is the ordinal `º` rather than `°` across
Chapters 3 to 9.

**2026-09-12, 12:53 am.** The chapter passes of 4, 5, 6, 8 and 9 ran
in parallel (LOG passes 29 to 33): every variable and equation row of
those chapters anchored, the angle unit swept to `°` book-wide, four
inline exercise hosts that were missing added, "Professional
Application" made a card tag across Chapter 8, two exercise figures
dropped from 6.3 whose problems are unkeyed, and a file name with a
space made an underscore in 8 and 9 (the convention now). Checks on the
whole: validator clean at 10 chapters and 62 sections, 361 tests, astro
check clean, 75 pages, 45 pages smoke-tested in light and dark with
nothing wrong. Chapters 1 to 9 and 16 are complete.

Next: wave 3 (10, 11, 12) as planned, after Chen's todolist.md. Chen's root
`RULES.md` items 22 (COLOR.md) and 23 (BE INSPIRING), uncommitted when
these chapters were built, should be folded into the briefs first. The briefs, `modules.json` and the
per-section launch notes are in the job's tmp dir
(`/home/flober/.claude/jobs/dbf4848c/tmp/`); the concurrent-agent cap
is 20.

**2026-09-12, 2 am to 3 am.** Chen's `todolist.md` applied (commits
ccb467c, 3679e05, 0cf2973 on the worktree branch): the seven figure
approaches he approved from the demonstrations, swept across Chapters 2
to 9 by three Fable 5.1 low-effort agents and one Opus agent (people,
objects, labels and strokes, graph ranges and locked-view 3D), the four
app items by one Opus agent (tabs open and close in a frame, text zoom
on Ctrl+= and Ctrl+-, reserved chords on Alt in the browser, a section
contents list), multi-part solutions shown per part, the colour menu
ending in an ellipsis, and the "Figure clarity" rules appended to
`docs/prompts/interactive-figures.md`. Fable is credited in every
section it touched. Checks: validator clean, 378 tests, astro check
clean, 75 pages, all 72 pages smoke-tested in light and dark. Root
`RULES.md` items were not renumbered because Chen's own items 22 and
23 are uncommitted on main; the figure rules live in the figure prompt.

**2026-09-14, wave 3 begun.** Chen asked for the remaining chapters. The
job runs from the main checkout, no worktree, committing onto main after
each chapter lands. The split is the one above with the 2026-09-12
refinement: prep and chapter passes are Opus agents, the section pages
are Fable 5.1 agents, so a section's `ai` reads Claude Fable 5.1 and an
introduction's Claude Opus 5. Briefs for this job are in the session
scratchpad (`brief-{common,prep,section,final}.md`), filled from
`docs/prompts/briefs`; root rules 22 and 23 are in them, and the
Chapter 10 prep agent writes the book's missing `COLOR.md`. Sections
build eight or so at a time per chapter as each prep finishes.

**2026-09-14, wave 3 built.** The Fable section agents hit the monthly
spend limit an hour in; Chen switched the job to Opus 5 for every agent,
planning included, and capped it at eight agents at once for this
repository. Chapter 10's seven sections resumed from the plan, text and
figure files the Fable agents had left (credited "Claude Opus 5, with
Claude Fable 5.1"); Chapters 11 and 12 were built by Opus from the
start. Three chapter passes (LOG passes 35 to 37): 112, about 130 and
97 anchors, three, three and two new types, `L_len` for a bare length,
the grindstone problem moved to 10.3, a stranded conceptual question
given a home in 10.6, cross-references settled as plain text book-wide.
Found on the way and fixed: seven inline Check Your Understanding cards
(4.4, 4.7, 6.3, 9.1, 9.2, 10.x, 11.2) never rendered because their
`text.html` had no `<div class="exercises" data-place=…>` host, and the
validator does not catch it; eight concept rows of Chapter 11 carried
tab characters from a single backslash before `times` and `text` in
the staged JSON. Left for Chen: the app's scheme hands out near-identical
hues past about fifteen types (four magentas on one Bernoulli page, a
pale surface tension); root rule 20's `weights_by` is not in the
schema; the validator should refuse a `place.after` with no host; the
section `lead` is not swept for math (6.5 and 7.4 print raw `$…$`);
`p.tnote` has no style; a slider with a long label collapses to zero
width in the controls grid. Next: wave 4 (13, 14, 15).

**2026-09-14, wave 4 built.** Chapters 13, 14 and 15 whole, all Opus 5,
eight agents at a time: 20 section pages and three introductions, LOG
passes 38 (13), 40 (14) and 39 (15); `temperature` and `entropy` declared,
twenty-four types in all; 285 anchors; Chapter 13's equation rows given
their coloured forms in a follow-up; the book's `COLOR.md` table brought
to every declared type and its prose to the four families the built
chapters now use. Checks: validator clean at 16 chapters and 105
sections, 405 tests, astro check clean, every page of the three chapters
smoke-tested in light and dark by its pass. Recurring findings for Chen:
the scheme's pressure hue is a pale yellow illegible on the light theme
on every PV diagram, and temperature, energy and entropy are near-identical
magentas; the app prints `choice` option strings raw, so an option cannot
carry math; `p.tnote` (a table footnote) has no style; a segmented control
of four options wraps to a grid and its labels clip past about sixteen
characters. Left for a later pass: a constants and materials sheet
(Tables 11.1 to 11.3, 13.2, 14.1 to 14.4). Next: wave 5 (17, 18, 19).

**2026-09-14 and 15, wave 5 built, and the figure sweep.** Chapter 16's
last five sections, which the early passes had never built, went first
(LOG pass 41), then Chapters 17, 18 and 19 (passes 43, 42, 44); the
types intensity, charge, electric field, voltage and capacitance, and
twenty-nine in all. In the middle of the wave Chen looked at the figures
and said they did not look good enough, so every interactive figure of
Chapters 1 to 19 got a Fable 5.1 pass, one agent per chapter under the
cap of eight: people redrawn as filled silhouettes with limbs thinner
than force arrows, objects at recognisable fidelity, labels off their
lines and inside the canvas at every slider position, scenes on one
fixed scale, and every figure Chen named in his list fixed. What the
passes kept hand-drawing went into figlib in two rounds (the
silhouette with poses and a stride, twenty sprites, clamped labels, a
headline that wraps, brackets with a side, a graph-corner note, angle
arcs, a fixed-scale helper, a vector triangle, a cable round pulleys,
a headline on a 3D stage). App fixes on the way: the element palette
names the electron, proton and neutron; a lead or note is swept for
math; the schema and the content tool accept the weights_by mark; an
untyped LaTeX may begin with a backslash k; the scheme is being reworked
so that twenty-nine types stay legible and distinct on both themes. The
usage limit cut the job twice, once on Fable and once on everything at
the session cap, and each time the agents were resumed from disk.
Left for Chen: 19.4 carries no problems because all ten are unkeyed
sketches; the election of a hue for pressure once the scheme lands.
Next: wave 6 (20, 21, 22).

**2026-09-15, waves 6 and 7.** Chapters 20 to 22 prepared with the types
current, resistance and magnetic field and built section by section
under the eight-agent cap; Chapter 20 passed (LOG pass 45) and is on
main. Chapter 22 carries three full 3D scenes, the right-hand rule, the
motor and the wire, loop and solenoid fold, as Chen asked for true 3D
where the book draws an arrangement in space. Chapters 23 to 25 prepared
the same day (magnetic flux and inductance declared; optics adds no
type, its rays coloured by wavelength as the physical fact); 23.1's
tilted loop, 23.5's generator and 24.7's electromagnetic wave are argued
for 3D, the rainbow's cone of 25.24 left to its plan. A restart wiped
the session scratchpad and with it the job briefs; they were rewritten
and are now also kept under `/home/flober/.claude/jobs/e1acb7c5/briefs/`.
Tool fixes on the way: the merge keeps a chapter's type and symbol rows
where they stand (the types' order is the scheme's order), and `ost`
refuses an answer field the app's schema does not take. The scheme's
co-drawn pairs did not name force with current, which the magnetic
chapters draw on one loop; the two hues sit close and are told apart by
label and position, for Chen to weigh.
