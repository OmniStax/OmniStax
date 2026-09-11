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
| 1 | 4, 5, 6 | 17 | prep started 2026-09-11 |
| 2 | 7, 8, 9 | 22 | |
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
