# Derivation style: a graph worked in place

A derivation is drawn once as a graph. Every fact and every result appears exactly once; a result stands one layer past what it rests on, a fact one layer before its first use; curves join what rests on what. Played, each result box does its own work inside the graph. Nothing is laid out in advance: the placement is redone every frame from the boxes' present sizes, so a box that opens pushes its neighbours aside and lets them back.

## 1. The reader sees

1. **At rest**, the whole graph: facts as dashed cards with a small number at the top left and the provenance at the bottom right; results as solid cards with the step number at the top right and only their result line. A result shows no provenance; a fact omits its provenance when it comes from the derivation's own example or section. The title bar reads *Derivation · what is derived*, or *Derivations ·* where more than one result is an end of the graph, or *Example N.M ·* where `source` names the worked example the record replaces (rule 29.5); its buttons sit at the right.
2. **A step opens**: the camera glides to frame the step's box and everything it rests on; the box's rows fade and its border goes dashed. Only the line the step starts from is lit, blue for a fact, yellow for a result, while it is carried into the box. No other source is lit; the edges say the rest.
3. **The box takes its full width at once** and then grows only downward. The first line arrives from its source and its reason is written beside it: *Fact 5.* or *Result 2.*, then *Holds by fact 4.* where a condition licenses it, then the why if one is written.
4. **Each move** with show-all-work on: a copy of the line drops into a new row with the yellow boxes already on the terms the move will change, then morphs there, then the boxes fade, and the reason stays beside the row (*Using fact 2 and fact 3.* then the why). With show-all-work off: the one line morphs in place, and the reason shows under it and fades. While a move uses them, the first fact it uses glows blue, the second green, the third pink; a result it uses glows yellow. The terms a move changes are read off its two lines: a keyed term that crosses the relation, changes, appears or disappears.
5. **A step closes** with its result as its last line, unlit; the box stays open at its full work when show-all-work is on, and shows only the result when it is off.
6. **The end** glides back to the whole graph; with show-all-work on, every box folds back to its result.
7. **Reveal** (eye half-open, the default): a fact or result appears when the derivation first reaches it; everything else is hidden ahead and dims behind. **Show all** (eye open): the whole graph stays, and what the current step does not touch is dimmed.
8. **The view**: a bounded pane with the transport always beneath it. Drag pans, the wheel zooms about the pointer, double-click lets the camera frame again. The reader's pan and zoom ride on top of the camera and fade out over the next step's opening. The padlock holds the camera still. Within a step the scale never changes: the box is framed at its full worked-out size from the start, and only the centre follows.
9. **Play enters the first step at once.** The step dots on the scrubber jump to each step; the first dot is the rest view. Right-click on the speed button lists every speed.

## 2. Timing

| | |
|---|---|
| Opening (camera and carry-in) | 0.8 s glide, 1.2 s carry-in |
| Holds by (lighting the conditions) | 1.5 s, only where the start line has conditions |
| A move | 0.6 s drop, 1.25 s morph, 0.55 s fade |
| Closing | 0.5 s result, 1.0 s settle |
| Return to the whole | 0.9 s |
| Box size | eases to its content, τ ≈ 0.12 s; width settled during the opening |
| Layout | layers 64 px apart, nodes 30 px apart; horizontal when no chain is deeper than any step is wide, else vertical |

## 3. Words

- Reasons name their sources as *fact n* and *result n*, never coloured, never bold: *Using fact 2, fact 3 and result 1.* A start line reads *Fact 5.* or *Result 2.* alone, then *Holds by fact 4.* where a condition licenses it.
- A why is one or two short sentences in the book's voice, American spelling, `$…$` for inline maths, only where item 29.4 asks for one.
- Provenance is the book's own: `(17.3)`, `(Example 4.6)`, `(17.1, Table 17.1)`, `(3.3, Product Rule)`.
- Tooltips on the buttons say the state and what a click does: *Revealing each fact and result as the derivation reaches it; click to show all.*

## 4. Data

One record per derivation in the section's `derivations` table (`docs/content-format.md`); the text hosts it as `<figure class="dv" id="drv-<id>"></figure>`, which the app fills from the table.

```js
{
  id: 'underdamped-spring',          // the id the <figure class="dv"> in the text carries, as drv-<id>
  what: 'the motion of an underdamped spring',   // the title phrase, lower case, no full stop
  source: 'Calculus, 17.3 Applications',
  nodes: [                           // one per result, in the book's order
    {
      assumes: [                     // every fact and earlier result this node uses, each once
        { tex: '\\kW = \\km\\kg', src: '17.3, Example 17.17' },
        { text: 'The stretch $s$ is measured with the mass at rest at equilibrium.', src: '17.3' },
        { step: 1 },                 // the result of node 1 (0-based)
      ],
      then: { tex: '\\mk{w}{\\km\\kg} = \\mk{k}{\\kk}\\,\\mk{s}{\\kslen}', src: '17.3', uses: [1], why: '…' },
      steps: [
        { tex: '…', uses: [0] },
        { tex: '…', uses: [], cap: 'A difference of squares: $(a+b)(a-b) = a^2 - b^2$.' },
        { tex: '…', uses: [], map: { v: ['v1', 'v2'] } },
      ],
      num: '(17.21)',                // the book's number for this result, only where it prints one
      src: 'Example 17.21',          // where the book prints this result
      note: '',                      // a correction of the book, where one is needed
    },
  ],
}
```

Rules the sandbox settled, which hold:

1. **A node per equation brought in and worked to a result.** A result, once formed, is a `{ step }` fact of later nodes and is never re-derived. A node whose `then` is exactly an earlier result starts from that result. Two independent lines are two nodes, so the graph branches where the book's argument does.
2. **`then` is the raw equation before any fact is applied.** Applying a fact is a step with `uses`. `then.uses` lists the conditions under which the start line holds (constant acceleration, a circular orbit); `then.why` says why where the fact alone does not.
3. **Every fact is used where it is used.** Every entry of `assumes` appears in `then.uses` or some step's `uses`; the checker enforces it. Given numbers are facts; elementary algebra is not.
4. **Keys name terms by role**, `\mk{key}{…}`, and a term keeps its key when it moves; what replaces a term takes its key; a key is never split unless the parts go separate ways later, and then `map` says how; equals signs and lone operators stay untagged; every key is unique within a line. The widget computes the highlighted terms from the keys; `hi` is not written.
5. **Plugging in numbers is its own last node**, unless an intermediate result itself depends on numbers.
6. **Every line is true as written** and checked by the builder; the book's lines are kept and its skipped lines inserted; a book error is followed by the correct mathematics and a `note`.
7. **Symbols** go through the book's macros; a new symbol is declared in `symbols` with its type (rule 7); a `sym` that already exists is reused when the meaning is the same and renamed when it is not.

## 5. Checks

Run per derivation before the section is reported: the node must parse; every node has a `then` and at least one step; every key is unique within its line; every `uses` index is in range; every fact is used somewhere; no step of elementary algebra carries a `cap`; every step changes at least one keyed term; no term fades out and returns within one node. `ost check` carries them.

## 6. The API

The app draws every `<figure class="dv">` with `F.derivation(host, record)` from the section's `derivations` table, so sections ship data only. The widget is `src/lib/fig/derivation.ts`, its styles sit under `.dv` in `global.css`, and the build carries the table inside the section's figure module. `check:content` pairs every host with its row and checks each node's facts, uses and keys (`checkDerivations`); `ost check` knows the table's shape.

Nothing in a derivation is clickable but its own controls: provenance, step numbers and the words of a reason are plain text.
