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
| 3 | 10, 11, 12 | 23 | |
| 4 | 13, 14, 15 | 20 | |
| 5 | 17, 18, 19 | 22 | |
| 6 | 20, 21, 22 | 24 | |
| 7 | 23, 24, 25 | 23 | |
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

Next: relaunch the chapter passes for 4, 5, 6, 8 and 9 (one agent each,
`brief-final.md`), then wave 3 (10, 11, 12) as planned. Chen's root
`RULES.md` items 22 (COLOR.md) and 23 (BE INSPIRING), uncommitted when
these chapters were built, should be folded into the briefs first. The briefs, `modules.json` and the
per-section launch notes are in the job's tmp dir
(`/home/flober/.claude/jobs/dbf4848c/tmp/`); the concurrent-agent cap
is 20.
