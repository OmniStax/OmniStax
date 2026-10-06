# Exercises: attainment, freshness, and fixed rounds

Status: built, 2026-09-16.
Redesigned 2026-10-06.

Practice is global across the reader's library because concept ids are
canonical. Attempts still retain `(book, section, exercise)` provenance. There
is no XP or point score. The dashboard reports completed exercises, correct
answers, a completion streak, and concept counts.

## What counts

Source placement is authoritative.

- A question printed inline in the reading remains an inline **Try It**. It may
  give immediate feedback or reveal its answer, but it never records an
  attempt, attainment, freshness, streak, heatmap activity, or completion.
- A question printed in an end exercise collection belongs to the Exercises
  system. Remember and Understand questions are valid here. Open answers are
  graded by the reader's `I got it right` / `I got it wrong` verdict.
- Every submitted Exercises-system question is one completed exercise. Repeats
  in later rounds count again.

Bloom level remains descriptive metadata and may break a scheduling tie. It
does not determine placement or the amount of evidence.

## Attainment

The global mastery target defaults to three. For concept `c`, the actual target
is

```
q(c) = min(global mastery target, distinct end exercises that test c)
```

Concepts with no end exercises can be selected only while generated exercises
are included; then stored generated items count toward availability too (see
`generated-exercises.md`). A correct answer adds one step to every unmastered concept the exercise tests; an
incorrect answer subtracts one, clamped to `0..q(c)`. The UI therefore shows
discrete fractions such as `1/3` and `2/3`.

Outcomes are settled together when the round ends. Reaching the target marks
the concept mastered at the end of that round. Mastery is sticky: raising the
target or adding exercises does not unmaster it. Lowering the target may master
a concept immediately when its existing evidence meets the new target.

## Preparing a round

A round is prepared and frozen before Start. No exercise is added adaptively,
and an exact exercise never repeats inside the round.

For each eligible selected concept, the planner ranks exercises by:

1. never presented;
2. presented but never answered;
3. least recently attempted;
4. stable content order, with lower Bloom levels breaking ties for a new
   concept.

Each concept wants the round's default (the mastery target unless the builder
changes it) or its own override, from 0 to 9. The book gives what it has,
and the gap is filled by generated exercises unless the reader keeps to the
book. It initially takes the best of the book's share for every concept,
adds the generated items, and unions the sets. It then removes a redundant exercise only when every concept that
exercise tests remains at or above its quota. Shared exercises therefore count
for every concept they test, while unavoidable overcoverage is retained.

There is no global round-size cap. The builder (the New session face) lists
"The N exercises", exactly what will be asked, and its per-concept table has
the columns Concept, In book, This session, and AI-generated. Its options are
named rows: Exercises from (Book and AI / Book only), Order (Mixed / Grouped),
Checking (I check / AI grades), Mastered concepts (include ones not yet due),
and Model, Prompt and Reuse only when AI is in play. `Mixed` spreads related
exercises through the round; `Grouped` clusters them. The choice is global and
persisted. Starting a session clears the tab's picks.

## Choosing exactly

The tab has four faces: Practice (the dashboard), New session (the builder),
the session, and the session review. The store names them `dashboard`,
`choose`, `practise` and `review`; a stored `progress` or `summary` reads as
`review`.

Both the dashboard and the builder show one curriculum tree
(`CurriculumTree.svelte`): book, chapter, section, and under a section either
the concepts it introduces (Concepts lens) or its end exercises in print order
(Exercises lens). A concept unfolds to every exercise that tests it. Every row
in the builder has a checkbox, down to a single exercise; selecting happens
only in New session. On the dashboard the tree is read-only progress, with
"Set progress…" on each concept and "Mark all mastered", "Mark all
unpracticed" and "Use exercise history" on each section, chapter or book.
Quick picks in the builder add the due concepts, the concepts in progress, or
the section being read. Ready to learn on the dashboard lists the built,
unmastered concepts whose prerequisites are all mastered, grouped by section,
each opening the concept.

A pick (`model.ts`) is one of three kinds: a place (book, chapter or section),
a concept, or an exercise, `{ exercise: { book, section, ex } }`. Place and
concept picks draw by quota. An exercise pick is pinned: it is always in the
round, counts toward the quota of each enrolled concept it tests, and is never
dropped as redundant. Removing a drawn exercise from the builder's list adds it
to `round.excluded`, and the planner draws a replacement where it can; removing
a picked one unpins it. `select.ts` holds the tri-state checkbox logic
(`checkOf`, `setNode`). Unticking part of a ticked chapter or book splits the
pick into the remaining parts.

In the session a sticky bar holds the numbered grid (✓ or ✗ per answered
exercise), "One at a time | All", and End session. A self-marked answer
advances; a multiple-choice or AI-graded one stays until Next.

An exercise is marked seen only when its card is actually presented. Slots in
an abandoned round that the reader never visited remain unseen.

## Freshness

Freshness begins only after mastery. The default starting half-life is three
days, the maximum is 240 days, and successful intervals double:

```
3 → 6 → 12 → 24 → 48 → 96 → 192 → 240 days
```

Between reviews, freshness is `2^(-elapsed days / half-life)`. A concept is due
at one half-life, when freshness reaches 50%. A successful review at the
maximum schedules another maximum-length interval; mastery itself never
expires.

All enrolled exercises for a mastered concept form its review result:

- 100% correct doubles the half-life, capped at the maximum;
- at least two thirds correct preserves the half-life;
- below two thirds halves it, bounded by the starting value, and schedules a
  recovery review tomorrow.

An early review cannot lengthen the interval, though a poor early result can
shorten it. A good result can preserve or lengthen freshness only when every
enrolled exercise for that concept was answered. Incorrect answers already
submitted can still shorten freshness in an incomplete round. The first End
click warns when mastered concepts have unanswered review exercises; the
reader can keep practising or end anyway.

Fresh mastered concepts are omitted by default. A global toggle includes them.
Due and overdue mastered concepts remain eligible. The mastery-box fill shows
attainment; its border moves from green toward amber with freshness and becomes
dashed when due.

Settings expose mastery target, freshness decay, starting half-life, maximum
half-life, Mixed/Grouped order, and whether fresh mastered concepts are
included. Turning global freshness decay off keeps all mastered concepts fresh.

## Override progress

On the dashboard the curriculum tree stands as Progress, with mastery meters at
every level. The current book is loaded first; other books load their progress
only when opened. Practice still loads the full shelf before it composes a
round.

Override is not a mode. A concept row's ⋯ menu has "Set progress…", which
opens the controls inline. Every built concept has it, including concepts with
no exercise. The reader can choose Unpracticed, an exact fraction, or
Mastered. This is stored as a separate self-assessment rather than as fake
attempts; removing it restores the state rebuilt from exercise history.

An overridden mastered concept begins at the starting half-life. Concepts
with exercises use normal exercise reviews. A due concept with no exercises
offers `Still mastered` and `Needs review` manual checks. Only overridden
mastery can enable the per-concept `No freshness decay` option. Such a concept
is permanently fresh and displays the override and infinity state.

## Persistence and activity

The store separately persists attempts, card presentations, completed round
summaries, current self-assessments, pages, and sessions. A session that ends
is kept as done, with `after` mastery for its concepts, and ending lands on the
session review: the tally, what moved (before and after mastery), and each
exercise as a static record with its solution folded. "Practice all again" and
"Retry the N I missed" seed the builder with those exact exercises. Past
sessions are paged rows on the dashboard (date, duration, what, score), and
each opens to its review; Delete is in the row's ⋯ menu. Old v1
attempts migrate by taking their concept ids from the former point record; old
point totals and settings are discarded.

The heatmap uses completed exercises per day and its tooltip reports
`N exercises · M correct`. Any day with at least one submitted practice
exercise counts toward the calendar-day streak, regardless of correctness.
The dashboard figures are Day streak, Exercises done, Practiced, Mastered, and
Due, then the year heatmap with month labels and a Less/More key. Progress per
book, chapter and section is in the curriculum tree.

The practice catalogue fetches each built section's `exercises.json` directly.
It does not load document HTML or figure modules to populate the picker, and a
loading catalogue is never reported as zero exercises.
