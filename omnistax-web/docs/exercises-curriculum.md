# Exercises: attainment, freshness, and fixed rounds

Status: built, 2026-09-16.

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

Concepts with no end exercises cannot be selected in the practice picker. A
correct answer adds one step to every unmastered concept the exercise tests; an
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

It initially takes the best `q(c)` exercises for every concept and unions the
sets. It then removes a redundant exercise only when every concept that
exercise tests remains at or above its quota. Shared exercises therefore count
for every concept they test, while unavoidable overcoverage is retained.

There is no global round-size cap. The Start button gives the number of unique
exercises and a diagnostic says whether every concept reached the requested
target, how many concepts have fewer exercises available, and how many share
exercises. `Mixed` spreads related exercises through the round; `Grouped`
clusters them. The choice is global and persisted.

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

## Self-set mastery

Dashboard Progress has a flat, searchable self-set mastery editor. It includes
every concept, including concepts with no exercise. The reader can choose
Unpracticed, an exact fraction, or Mastered. This is stored as a separate
self-assessment rather than as fake attempts; removing it restores the state
rebuilt from exercise history.

A self-assessed mastered concept begins at the starting half-life. Concepts
with exercises use normal exercise reviews. A due concept with no exercises
offers `Still mastered` and `Needs review` manual checks. Only self-assessed
mastery can enable the per-concept `No freshness decay` option. Such a concept
is permanently fresh and displays the self-assessment and infinity state.

## Persistence and activity

The store separately persists attempts, card presentations, completed round
summaries, current self-assessments, pages, and running sessions. Old v1
attempts migrate by taking their concept ids from the former point record; old
point totals and settings are discarded.

The heatmap uses completed exercises per day and its tooltip reports
`N exercises · M correct`. Any day with at least one submitted practice
exercise counts toward the calendar-day streak, regardless of correctness.
Book progress remains a flat count of unpracticed, practiced, and mastered
concepts, without chapter or section categories.

The practice catalogue fetches each built section's `exercises.json` directly.
It does not load document HTML or figure modules to populate the picker, and a
loading catalogue is never reported as zero exercises.
