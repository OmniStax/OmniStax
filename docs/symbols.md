# Symbols and their meanings (#20)

## Are symbols redefined?

Yes. `book.json` `symbols` holds one row per key (glyph and macro, no meaning). Meanings live in each chapter's `variables`, one row per `section/sym`, so a key may mean different things in different sections:

| sym | where | meanings |
| --- | --- | --- |
| `R` | CP 3.2, 3.4 | the resultant of added vectors; the range of a projectile |
| `W_prime` | CP 15.3, 15.5 | the Otto cycle's greater work output; the part of the work input that reaches the heat pump |
| `W` | CP 15.4, 15.5 | the Carnot engine's work output; the heat pump's work input |
| `T_c` | CP 13.5, 15.x, 34.6 | critical temperature; cold reservoir; superconducting critical temperature |

Most rows of one key differ only in wording. The ones above are the book reusing a letter for another quantity.

## What the app does

- The symbol card shows the row of the section it is read in, else the chapter's first row (`lookupVariable`, `src/lib/hover/data.ts`).
- When another row of the chapter gives the key a different meaning, the card adds "Elsewhere in this chapter (N.M): …".
- `npm run check:content` warns (never fails) on two meanings of one key in one chapter unless the later row sets `redefines: true`.

## Commands

- `ost meanings <book> <sym>`: every row of the key across chapters, with section, type and meaning.
- `ost find <book> <text>`: where a key or a word appears.
- `ost rows <book> variables --chapter N --where sym=<sym>`: one chapter's rows.

## What agents were asked

Before this change, prep agents wrote each chapter's `variables` from the section's text and were told not to restage an existing `symbols` row. Nothing told them to look at earlier meanings, so each section wrote its own.

Now (RULES §19, §27; `docs/prompts/briefs/prep.md`, `section.md`): run `ost meanings` before adding a row; reuse the earlier meaning when it is the same quantity; when the book reuses the symbol for a new quantity, keep the section's row, word the meaning to stand alone, and set `redefines: true`.

## The heuristic

Two rows of one key differ when their types differ, or when their meanings share under 15% of content words (words of four letters or more, stop words dropped, a plural `s` trimmed), measured against the shorter meaning. Tuned on both books: it flags `R`, `W_prime` and `r_curv` (radius vs. distance between bodies) and leaves rewordings of one quantity alone. It misses a flipped direction that keeps its words (`Q_h` into the engine in 15.4, into the hot reservoir in 15.5); such rows need the meaning itself to say which way.
