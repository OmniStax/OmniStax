# Exercises as a curriculum: points, mastery, and a practice session

Status: design, 2026-09-09; phases 1 and 2 built 2026-09-09, phase 3 on
2026-09-10, phase 4 on 2026-09-10, phase 5 on 2026-09-12. The phases at the
end say what was built in which order. The rail places this view right above
the concept map.

## What the reader gets

The Exercises view is where a reader practises on purpose, as opposed to
answering the problems that sit inside a section's text. It always opens on
a choice: which books, chapters, sections or concepts to practise. From that
choice it draws a session of exercises, one at a time, scores each answer
into the concepts the exercise tests, and shows how those concepts stand:
unpracticed, practiced, or mastered. A session is the reader's own and not
the tab's: it can be paused, ended early, and taken up again from any
practice page. Progress is kept across every textbook
in the reader's library, because concept ids are canonical and
book-independent (`docs/content-tables.md`, the `concepts` table): mastering
`hookes-law` in one book is mastering it in all.

The README fixes two things this design keeps: only exercises earn points,
and points depend on the Bloom level of the exercise. Mastery does not decay.

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
  mastered: boolean, earned }
```

- `score` is points earned toward mastery. A correct answer adds its points.
- A concept becomes **mastered** when its score reaches the
  mastery threshold and the reader has answered it correctly on N distinct
  days in a row (the "multiple days in a row" rule). A wrong answer resets
  the streak but does not take away earned points or mastery.

There are no tiers above mastered. The three states a concept can be in are
what the reader sees: **untouched**, **practised** (some score, not yet
mastered), and **mastered**. Total points across all concepts is the
reader's one running number, so it never goes down.

The numbers are the reader's to set, in Settings under Exercises:

| Setting | Default | Meaning |
|---|---|---|
| Mastery threshold | 10 points | score that counts as mastered |
| Days in a row | 3 | distinct days with a correct answer before mastery |
| Session size | 8 exercises | how many a session draws |
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

1. The frontier: unmastered concepts whose prerequisites are either
   mastered or outside the curriculum, so the reader works upward through
   the DAG. Within the frontier, a concept with no score gets its lowest
   Bloom exercise first (the expert-reversal note: pattern before problem),
   and a concept with score gets a higher one.
2. Then the rest of the unmastered concepts, and finally exercises on
   mastered concepts, so a session is always full while exercises remain.
3. Exercises answered correctly in the last two days are skipped.
4. Ties break on a hash of the day and the exercise id, so a page refresh
   gives the same session and tomorrow gives a different one.

Attempts are recorded as `{ book, section, ex, at, ok, self, points }`;
the mastery records are derived from attempts and can be rebuilt from
them, which is how a change of settings takes effect on old work.

## The view

`view:exercises`, a page in a split like the concept map, opened from the
rail button above the map's. It has four faces, and the store remembers
which one is showing so reopening resumes.

**Choose.** The builder shows the library's books, with chapters and sections
under each. Books and chapters start folded; disclosure buttons expand them
without changing their tri-state selection checkboxes. Concept search adds
individual concepts. Selected items appear at the bottom with remove buttons
and Clear, followed by the concept/exercise totals and the Practice button.
This face is a purpose-built selection tree, not the single-select Open browser.

**Practise.** One exercise at a time, with a numbered grid below it as both
navigation and progress. A completed square is green or red; selecting any
square jumps directly to it. Multiple choice keeps radio choices and is marked
by the app. Every other answer reveals the book solution and asks the reader
for a green “I got it right” or red “I got it wrong” verdict. The card folds
Bloom level, concepts and source provenance into Exercise Meta. Show all
exercises stacks the cards and leaves only Pause and End below them.

**Progress.** What the round came to in one sentence — the points earned and
how many of its problems were answered — and every concept that gained points,
shown as its old mastery box → new mastery box. One button, Return to
Dashboard, which is also where the session is let go of.

**Book concept progress.** Each book on the shelf shows three counts:
unpracticed, practiced, and mastered concepts. Each built concept is counted
once, including concepts repeated as prerequisites in chapter data; placeholders
are excluded. Practiced means begun but not mastered. There is no chapter or
section breakdown. Loading and failed books show a status instead of zero counts.

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
- `src/lib/practice/model.ts` (points, mastery, draw; tested in
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
   with Choose (current book only), Practise and Progress; the Settings
   group; rail placement. This is the whole loop for one book.
2. The Progress face and concept map nodes tinted by state.
3. Cross-book: manifest cache, library-wide Choose tree, foreign sections
   loaded on demand; `weights` in the schema and the pipeline rule.
4. The practice desk: the dashboard, practice state per view instance, the
   way in from the end of a section, book order, and the
   concept map's progress switch. Below.
5. Sessions of their own, the Progress hierarchy and the mastery box.
   Below.

## Phase 4: the practice desk

Phases 1 to 3 gave the reader a place to practise. Phase 4 makes it a place
to come back to: something to open on that says where the practice stands,
a way in from the section just read, and a second practice view beside the
first when the reader wants one.

**A way in from the section.** The end-of-section problem list carries a
button, "Practise this section". It opens a *new* practice view, split to
the right of the group the section is reading in, with the curriculum
replaced by the single pick of that section, landing on Choose with the
section ticked, so the reader sees what was picked before starting. The
shell catches the click the way it catches the rail's split buttons: the
list writes `data-practise-section`, the shell reads the group from the
enclosing pane. No chapter button yet — that waits for chapter summary
pages to have somewhere to put one.

**Practice state per view instance.** Curriculum, face and show-all mode belong
to the view's page, keyed by the tab's item key the way a document's scope is.
Attempts, mastery and the settings
stay global, one record across every book. Two practice views can therefore
run two sessions at once — for example, one on the section just read and one
on the whole chapter — and closing a tab takes its page with it. Phase 5 takes the session
itself out of the page; see below.

**Faces.** The tab row is `Dashboard | Practice`. A fresh view opens on the
dashboard. Behind those two are four faces: `dashboard`, `choose`,
`practise` and `progress`. The Practice tab goes to the live session if there
is one and to Choose if there is not.

**The dashboard.** One screen, little vertical spread. Four tiles: the
streak (days in a row with a correct answer, ending today or yesterday),
lifetime points, skills practiced and skills mastered. Under them, a card per
session still running. Then an activity heatmap in the GitHub manner: 52 weeks by 7 days,
one cell a day, depth by the points earned that day across every book, today
at the right edge, the date and the points in the hover title. Then Progress:
one row per book with counts of unpracticed, practiced and mastered concepts.
The counts use distinct built concepts directly, not aggregated chapter or
section states.

**Choose, less busy.** Books and chapters start folded and open independently
of their selection checkboxes. The builder has no “This section,” “This
chapter” or “This book” shortcuts. Tri-state checkboxes select books,
chapters and sections, with counts in hover titles. A search box finds
individual concepts, each with its mastery box. At the bottom, Selected
items lists the current picks with individual removal buttons, beside Clear.
Folding a book keeps its selections in this list. The footer also shows
"Practice N" with a − + stepper that writes the session size setting.

**Draw order.** The frontier comes first, then the rest. Within a bucket the order is the book on the shelf, the section in the
manifest, and the exercise in the section, so a session reads in the order the
book teaches.

**Progress on the concept map.** The states legend grows a "progress"
switch that hides the mastery bars for that map alone, for a reader who
wants the map as a map. Where a map starts is a setting, "Progress on the
concept map" in Settings under Exercises, on by default.

## Phase 5: sessions of their own, and one picture of mastery

**A session is not a tab's.** Sessions live in a table of their own,
`omnistax-practice-sessions-v1`, each with an id, the picks it was drawn
from, what it drew, where the reader has got to and what they have earned. A
page points at one by id. So several may run at once, a paused one stands
until it is finished or thrown away, and closing a tab leaves the session
where it is. A session is running while `at < drawn.length`; an answer is
marked on every session standing on that exercise, not only the one it was
typed into. A page whose stored session was written the old way — inside the
page — has it lifted into the table on `init`.

**Pause and End.** Pause leaves the session standing and goes back to the
dashboard, still this page's, so the Practice tab comes back to it. End
finishes the round here, after an inline confirmation, and shows Progress.
That screen repeats the rich concept rows from the dashboard and draws each
gain as the previous mastery box, an arrow, and the new mastery box. Return to
Dashboard is where the session is let go of. Starting a
new session on a page that already has one leaves the old one in the table,
detached, and the dashboard offers it back.

**Still running.** Every running session is a card on every dashboard,
headed by the day and time it began and reading "Exercise k of N · p
points". A card says where its session is — this view, another view, or not
open in any tab — and resting on it opens a popover of what it tests, the
picks set out as the Choose face sets them. Clicking a card raises the tab
it is running in; a session with no tab is taken onto this page when this
page has nothing running, and into a page of its own when it has.

**Book progress, at a glance.** Each book's concept counts are always visible,
with no disclosures or chapter/section categories. Individual concept detail
remains available in the concept map, concept search and session progress.

**The mastery box.** One drawing of how a concept stands, everywhere it is
shown: a rounded square outlined in the colour of the state and filled from
the bottom by the score against the threshold. Untouched is an empty
outline; practiced is `--m-low` below half the threshold and `--m-mid` at or
above it; mastered is full `--m-high` under the ink. A box that is filled at all is filled enough to be seen.
The breakdown rows, the bars beside the running exercise, the concept search
and the concept map's bars and legend follow it too.

## Decisions taken, and open

Taken here, all reversible: no tiers above mastered; every answer but a
multiple choice scores by self-report; the Bloom table is the default weight
and the agent's `weights` the override; a wrong answer costs nothing and
mastery does not decay.
