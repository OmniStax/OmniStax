# Exercises as a curriculum: points, mastery, and a practice session

Status: design, 2026-09-09; phases 1 and 2 built 2026-09-09, phase 3 on
2026-09-10. The phases at the end say what was built in which order. The rail places this view right above the
concept map.

## What the reader gets

The Exercises view is where a reader practises on purpose, as opposed to
answering the problems that sit inside a section's text. It always opens on
a choice: which books, chapters, sections or concepts to practise. From that
choice it draws a session of exercises, one at a time, scores each answer
into the concepts the exercise tests, and shows how those concepts stand:
practised, mastered, or due for review. More can be added to the curriculum
at any time from inside a session. Progress is kept across every textbook
in the reader's library, because concept ids are canonical and
book-independent (`experiment/RULES.md`, "Global objects"): mastering
`hookes-law` in one book is mastering it in all.

The README fixes three things this design keeps: only exercises earn
points; points depend on the Bloom level of the exercise; mastery decays,
so review is spaced. The phase-5 todo adds a fourth: a correct answer
propagates downward through the concept DAG, never up.

## The model

All of this is pure code in `src/lib/practice/model.ts`, tested without a
DOM, with a store in `src/lib/practice/store.svelte.ts` the way notes,
colours and the library are kept.

### Points

An exercise is worth a number of points to each concept it tests.

- Default, from the app: a table by Bloom level. Remember 1, Understand 2,
  Apply 3, Analyze 4, Evaluate 5, Create 6. Every concept in the exercise's
  `concepts` list receives the full amount; an exercise that joins two
  concepts is evidence for both (the SOLO note in the README).
- Override, from the pipeline: an optional `weights` field on the exercise,
  `{ conceptId: points }`, written by the agent at build time and marked
  `weights_by: "ai"` in the same way `generated_by` marks an answer. The
  agent gives weight where the exercise leans: a problem that turns on
  Hooke's law and merely mentions displacement gives displacement less. The
  pipeline rules gain an item for this. Where the field is absent the Bloom
  table applies, so no content has to change to start.

A wrong answer earns nothing. Only a multiple-choice answer is scored by
the app. Every other kind, a number, a set of parts or an open question,
is scored by the reader: the card shows the book's solution and asks "Did
you get it?", and the reader's own verdict is the attempt, flagged as
self-checked. The number widget stays as a scratch check and earns
nothing. A setting can exclude self-checked answers from mastery.

### Mastery per concept

Each concept the reader has practised has a record:

```
{ score, lastAt, days: number of distinct days in a row with a correct answer,
  mastered: boolean, halfLife }
```

- `score` is points earned, decayed. The decay is exponential with a
  half-life in days. Reading the score at time `t` gives
  `score * 0.5 ^ ((t - lastAt) / halfLife)`; a correct answer adds its
  points to the decayed score and resets `lastAt`.
- A concept becomes **mastered** when its decayed score reaches the
  mastery threshold and the reader has answered it correctly on N distinct
  days in a row (the "multiple days in a row" rule). Each further day in
  the streak doubles the half-life, which is what spaces the reviews: the
  first review comes soon, the fifth comes weeks later. A wrong answer
  resets the streak and halves the half-life, back to no shorter than the
  base.
- A mastered concept becomes **due** when its decayed score falls below the
  threshold. It stays mastered in name (the reader did master it) but is
  queued for review. A correct review answer restores the score.
- A correct answer also touches the concept's prerequisites: their
  `lastAt` moves to now, so using Hooke's law keeps "restoring force" from
  decaying, but they earn no points. This is the downward propagation the
  phase-5 note asks for, done as freshness rather than as score.

There are no tiers above mastered. The four states a concept can be in are
what the reader sees: **untouched**, **practised** (some score, not yet
mastered), **mastered**, and **due**. Total points across all concepts is
the reader's one running number, and it is the sum of what was earned, not
what remains after decay, so it never goes down.

The numbers are the reader's to set, in Settings under Exercises:

| Setting | Default | Meaning |
|---|---|---|
| Mastery threshold | 10 points | decayed score that counts as mastered |
| Days in a row | 3 | distinct days with a correct answer before mastery |
| Base half-life | 7 days | how fast an unpractised concept fades |
| Session size | 8 exercises | how many a session draws |
| Review share | one third | how much of a session is review when anything is due |
| Spaced review | on | off freezes decay: scores never fade, nothing comes due |
| Count self-checked answers | on | open questions score by the reader's own verdict |

### The curriculum

The curriculum is a set of picks, kept in the store:

```
pick = { book, chapter? , section? } | { concept }
```

A pick of a book, chapter or section expands to the concepts those
sections introduce (coverage `introduces`), and a concept pick is itself.
The curriculum's concept set is the union. Exercises are drawn from every
loaded section whose exercises test a concept in the set, from any book in
the library, so a chapter picked in one book draws in the other book's
problems on the same concepts once that book is loaded.

### Drawing a session

`draw(curriculum, mastery, exercises, settings, today)` returns an ordered
list of `(book, section, exercise)` of the session size:

1. Review first: concepts that are due, most overdue first, up to the
   review share of the session. One exercise per due concept, preferring
   one the reader has not seen recently.
2. Then the frontier: unmastered concepts whose prerequisites are either
   mastered or outside the curriculum, so the reader works upward through
   the DAG. Within the frontier, a concept with no score gets its lowest
   Bloom exercise first (the expert-reversal note: pattern before problem),
   and a concept with score gets a higher one.
3. Then the rest of the unmastered concepts, and finally exercises on
   mastered concepts that are not due, so a session is always full while
   exercises remain.
4. Exercises answered correctly in the last two days are skipped unless
   the concept is due; exercises answered wrongly this session come back
   at the end of it.
5. Ties break on a hash of the day and the exercise id, so a page refresh
   gives the same session and tomorrow gives a different one.

Attempts are recorded as `{ book, section, ex, at, ok, self, points }`;
the mastery records are derived from attempts and can be rebuilt from
them, which is how a change of settings takes effect on old work.

## The view

`view:exercises`, a page in a split like the concept map, opened from the
rail button above the map's. It has three faces, and the store remembers
which one is showing so reopening resumes.

**Choose.** The opening face, and the one a reader always sees first. A
tree of the library's books, with chapters and sections under each, every
row a tri-state checkbox; beside it a concept list of the loaded chapters,
searchable, each a checkbox, with its state shown. A row of presets above:
"this section", "this chapter", "this book", "everything due". The foot
says what the choice comes to, "14 concepts, 3 due, 41 exercises", and the
button starts the session. This face is a purpose-built tree, not the
Open browser: the browser is a single-select place picker.

**Practise.** One exercise at a time in the existing card, standalone, with
a strip above it: exercise k of N, points this session, and the concepts
the current exercise tests with their bars. A check writes the attempt and
the card shows what it earned, "+3 Hooke's law". Skip moves on; an open
question shows the book's solution and asks for the reader's verdict. The
strip carries "add to curriculum", which opens the Choose face beside the
session without ending it. The session ends on a summary: points earned,
concepts that moved state, what is due next and when, and the two ways
on: another round, or change the curriculum.

**Progress.** Every concept in the curriculum (and a switch to every
concept practised, across books) with its state, decayed score against the
threshold, streak, last practised and when it comes due; the reader's total
points and the per-book totals. Later, the concept map tints its nodes by
this state and the rail button carries the count of concepts due.

## What changes where

- `src/lib/types/ids.ts`: `exercises` joins `VIEW_KINDS` before `concepts`,
  which places it above the map on the rail, and gives the palette its
  open commands for free. `VIEW_TITLE.exercises` in `icons.ts`; the icon
  exists already.
- `src/components/views/View.svelte`: the branch, with no scope bar, since
  the curriculum spans books.
- `ChoiceAnswer` gains an `oncheck` callback carrying the verdict;
  `ExerciseCard` records it, and adds the self-check row under the solution
  for every other answer type. Cards inside a section's text record to the
  same store, so reading and answering there counts too.
- `src/lib/practice/model.ts` (points, decay, mastery, draw; tested in
  `tests/practice.test.ts`), `store.svelte.ts` (`omnistax-practice-v1`,
  one key across books, book id inside every record; not on the shell's
  undo stack, like colours).
- `src/components/views/Exercises.svelte` and its three faces.
- `Settings.svelte`: an Exercises group with the table above; the first
  numeric rows in the settings, done as a small stepper input beside the
  name.
- Cross-book: `registry` grows a manifest cache keyed by book id, loaded
  from `/${bookId}/book.json`, and `load(book, section)`; the library
  already lists the books. Section ids are not unique across books, so
  everything in the practice store is keyed `(book, section, ex)`.
- Content: `zExercise` gains optional `weights` and `weights_by`; the
  pipeline rules gain the item that says when the agent writes them.

## Phases

1. Model and store with tests; `oncheck` on the choice widget and the
   self-check on the cards; the view
   with Choose (current book only), Practise and the summary; the Settings
   group; rail placement. This is the whole loop for one book.
2. The Progress face; concept map nodes tinted by state; the due count on
   the rail button.
3. Cross-book: manifest cache, library-wide Choose tree, foreign sections
   loaded on demand; `weights` in the schema and the pipeline rule.

## Decisions taken, and open

Taken here, all reversible: no tiers above mastered; every answer but a
multiple choice scores by self-report; propagation is freshness, not points; the Bloom table is
the default weight and the agent's `weights` the override; the half-life
doubles per streak day and that is the whole spacing rule.

Chen agreed the self-report and the name "due" on 2026-09-09 and said go
with the defaults above; a wrong answer costs nothing.
