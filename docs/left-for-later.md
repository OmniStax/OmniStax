# Left for later

Gaps left by the 2026-09-29 issues job (every open issue except #9, main `65b3704`).

## Imports (#16)

- Undoing a folder import removes its folders, files and notes, but does not close the tabs of the notes it created; only file tabs close. `explorer/edits.ts` `openImport`.
- Anything the reader changes while a long import is still reading joins the import's undo step.

## Figure values in notes (#21)

- The param registry (`lib/fig/params.ts`) reaches `ctl`, `choice` and `select` only. Not yet storable:
  - the custom canvas drags in 13.5 and 21.1 (figlib has no drag helper to register);
  - the 11 `F.story` timelines;
  - the cameras of the 63 `F.view3d` scenes.
- Undo restores the note's text, but a control the stored link never named stays where the reader left it.

## Redefined symbols (#20)

- The meanings heuristic in `hover/data.ts` misses a quantity whose direction flips under near-identical wording: Q_h and Q_c in 15.4 against 15.5.

## Content check

- Two Chemistry 2e sheet values are not plain numbers and warn: `sheets/water.json` "0.9999720 (density maximum)" and `sheets/ksp.json` "ca 1 × 10−5".

## AI mark (#25)

- An exercise card whose section is not loaded shows the plain "AI generated" hover, without the model.
- The concept map legend keeps "AI generated": no credit exists at that level.
- Concept `why` lines in `book.json` have no credit field, so the sweep's rewrites of them are not attributed.

## Voice (#32)

- The About page intro in `lib/content/pages.ts` is Chen's own writing and was left as it is.
- Narrating header comments remain in some files the app-string sweep touched (e.g. `lib/tips/model.ts`).
- 105 book items still score 3 or more in `tools/voicelint.py`; most are the book's own passive or long answers that must stay complete.

## Tooling

- `svelte-check` is not installed in `omnistax-web/node_modules`; coders type-checked with `tsc` and the build.
- The compiler warns `state_referenced_locally` in `chat/ChatTab`, `chat/Bubble` and `chat/TreeView`.
