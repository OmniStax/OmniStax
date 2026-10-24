# Beta text review

Written 2026-10-22 against issue 46 ("checklist before releasing beta"). Three
tables for Chen to review, a proposal for figures on small screens, and the
tip list. Each table row has a suggestion from the humanizer skill
(`.claude/skills/humanizer/SKILL.md`); the owner's rewrite wins. Nothing in
these tables has been changed in the app except where the "Done" column says
so.

The subheaders of every book are in `subheaders.md` beside this file: 2497
headers, 76 flagged by the skill's mechanical rules (a gerund opener, a
"Topic: subtitle" form, a summary label). Most flagged ones are the books'
own headers ("Volume and pressure: Boyle's law" is OpenStax's), which RULES
item 3 keeps; the ones to look at are the agent-written ones in the Calculus
and Chemistry chapters whose source headers were split.

## 1. Platform texts

Legend for the suggestion column: **cut** (the UI already says it), **keep**,
**rewrite** (with the rewrite).

### Settings

| Where | Current text | Suggestion | Done |
|---|---|---|---|
| Text size hint | Change the size of the text without resizing the window. | cut | yes |
| Zoom keys row + hint | Ctrl +, Ctrl − and Ctrl 0 change the text size. Turn off to let the browser zoom the whole page instead. | cut (row removed, keys always on) | yes |
| Tips hint | Show a tip each day in the bottom-right corner. | rewrite: "One tip a day." | |
| Cards open on hint | Hover opens a card as you point at it. Click keeps it open until you click elsewhere; on the concept map, where a click selects, a double-click opens it. | rewrite: "Click keeps a card open until you click elsewhere. On the concept map a double-click opens it." | |
| Play animations hint | Turn off to pause every interactive figure. | cut (row is now "Figures start: paused / playing") | yes |
| Voice hint | Add a Read aloud button to the rail and a Read section aloud command. | rewrite: "Adds Read aloud to the rail." | |
| Voice unsupported | This browser doesn't support speech. | keep | |
| Mastery target hint | Correct answers needed to master a concept, capped at its exercise count. | rewrite: "Correct answers needed to master a concept." | yes |
| Freshness decay hint | Mastered concepts come due for review as they fade. Turn off to keep them fresh. | rewrite: "Mastered concepts come due for review. Off keeps them fresh." | |
| Starting half-life hint | Days until a newly mastered concept is first due for review. | keep | |
| Maximum half-life hint | The longest gap between reviews. | keep | |
| Half-life summary line | Reviews come due after {intervals} days. | keep | |
| Lock grace hint | Seconds before a focus lock starts. | keep | |
| Shortcuts note | {browser} reserves N shortcuts in a browser tab, marked ⊘. Install as app to use them. | keep | |
| Shortcuts empty | No matching shortcuts. | keep | |
| Reset chord tooltip | Click to change | cut | |
| Storage (no quota) | Your browser doesn't report how much space is used. | keep | |
| Storage, best effort | Your browser may clear this data when storage runs low. Install OmniStax as an app or bookmark it, then reload. Keep a backup either way. | rewrite: "Your browser may clear this when space runs low. Install OmniStax as an app, or keep a backup." | |
| Storage, persisted | Your browser won't clear this data on its own. | keep | |
| Storage, Safari | Safari clears site data after 7 days without a visit, unless OmniStax is on your Home Screen. | keep | |

### Settings → AI

| Where | Current text | Suggestion | Done |
|---|---|---|---|
| Intro | Use your own API keys. Requests go straight from this browser to the provider. OmniStax never sees your keys, and backups leave them out. Tick the models to offer in chat. | rewrite: "Your keys stay in this browser: requests go straight to the provider, and backups leave keys out." The "Tick the models" sentence is what the checkboxes already say. | |
| Widgets switch hint | Answers can include a small interactive page, run in a sandbox. | keep | |
| Local server hint | Any server that answers POST /v1/chat/completions with streamed events and allows browser requests: Ollama with OLLAMA_ORIGINS, LM Studio with CORS on, llama.cpp or vLLM with their CORS flags. | keep (this one earns its length) | |
| Placeholders | Paste your key · Filter models · Add a model · Name · http://localhost:11434 | keep | |

### Theme page (Colours.svelte)

| Where | Current text | Suggestion | Done |
|---|---|---|---|
| Categories explain | Each kind of quantity, like force or velocity, keeps one color everywhere in the book: in words, in symbols and in figures. | rewrite: "One color per kind of quantity, in words, symbols and figures." | |
| Concepts-off note | Concepts is off for this book, so these colors do not show on its pages. | keep | |
| Picker hint | Type a hex code or drag to pick. | cut | |
| Vision note | The palettes below are made for {vision} vision. Apply one to use it. | rewrite: "Palettes for {vision} vision." The button says Apply. | |
| Empty | Nothing to color here. | keep | |
| Referents explain | Referents are things both a figure and the text point to, so they get the same color in both. They take colors from a set of 36, kept clear of the other colors near them. | rewrite: "A referent keeps one color in the figure and in the text." | |
| Tooltip: order (categories) | Give the first color to the first quantity in your order, the second to the second, and so on. | rewrite: "Colors in your order." | |
| Tooltip: smart (categories) | Assign colors with an algorithm that maximizes the color distance on each page, judged over the whole book. | rewrite: "Colors kept far apart on every page." | |
| Tooltip: order (referents) | Give each referent the color at its own position in this set. | rewrite: "Colors in set order." | |
| Tooltip: smart (referents) | Assign referent colors the same way: on each page, every referent gets a color far from the other colors there, judged over the whole book. | rewrite: "Colors kept far apart on every page." | |
| Reset switch tooltip | Back to the book's default (on/off) | keep | |
| Reset colour tooltip | Back to the book's color | keep | |
| Chip tooltip | Light theme color / Dark theme color | keep | |

### Sync and backup

| Where | Current text | Suggestion | Done |
|---|---|---|---|
| Sync, no remote | A repo of your own, private is fine. Requests go straight from this browser to GitHub. | rewrite: "Your own repo, private is fine." | |
| Sync, bad repo | Write it as owner/name. | keep | |
| Sync, token | A fine-grained token for this repo only, with Contents read and write. Make one. | keep | |
| Sync, pull | Pulling reloads OmniStax. | keep | |
| Sync, push | The repo's history keeps the old versions; other devices see these as changes to pull. | rewrite: "Old versions stay in the repo's history." | |
| Sync, conflicts | Keep one version of each. | keep | |
| Backup | Export everything to one file and import it on another device. Importing replaces what's there. | rewrite: "Importing replaces what's here." The buttons say Export and Import. | |
| Sync diff empty | Choose a changed file in Sync to see what differs. | keep | |
| Sync diff same | The same text on both sides. | keep | |
| Sync diff too big | {n} changed lines: too many to show. | keep | |

### Search, picker, chat, practice

| Where | Current text | Suggestion | Done |
|---|---|---|---|
| Search hint | Search text, concepts, definitions and formulas in your textbooks. | cut (the placeholder says "Search your library…") | |
| Search placeholder | Search your library… | keep | |
| Search empty | Nothing matches. | keep | |
| Picker placeholder | Filter… | keep | |
| Palette placeholder | Type a command… | keep | |
| Pin command | Pin the view to a place in the book | keep | |
| Chat empty | No chats yet. / No chat matches. | keep | |
| Chat opening | Opening this chat… | keep | |
| Chat send disabled | Configure a model under Settings → AI first | keep | |
| Widget tooltip | A widget written by the model | keep | |
| Session plan, nothing ticked | Tick a chapter, section, concept or exercise. | keep | |
| Session plan, no exercises | Your choice has no exercises. Pick another part of the book. | rewrite: "Nothing here has exercises." | |
| Session plan, exhausted | No exercises left for now. Choose more of the book or try again later. | rewrite: "No exercises left for now." | |
| Generated hint | AI writes more when the book runs short. | keep | |
| Order hint | Mixed interleaves concepts. Grouped keeps each concept's exercises together. | cut (the two button names say it) | |
| Grading hint | Check your answers against the solution yourself, or hide it and have your model grade. | rewrite: "Reveal shows the solution. AI hides it and grades your answer." | |
| Include fresh hint | Include ones not yet due for review. | keep | |
| Prompt note hint | Say what the new exercises should be like. | keep | |
| Reuse hint | Use AI exercises already written before writing new ones. | rewrite: "Reuse exercises already written." | |
| End session | End this session? Your completed exercises are kept. | keep | |
| Exercise, no key | This exercise has no answer to check against. | rewrite: "No answer key." | |
| Section end button | Open a practice session on this section / This section has no exercises | keep | |
| Curriculum empty rows | No exercises here. / No concepts introduced here. / Nothing matches. / This book could not be loaded. | keep | |
| Explorer headings | Open the section to list its headings | keep | |
| Offline | The offline download could not be removed. / This book has no earlier release to compare. | keep | |
| Hover card, unbuilt | Section {n} is not built yet. | keep | |
| Hover card, variable | Defined in {section}. | keep | |

### Derivations and figures (toolbar tooltips that explain state)

| Where | Current text | Suggestion |
|---|---|---|
| Derivation reveal | Showing every fact and result; click to reveal them step by step | rewrite: "Reveal step by step" |
| Derivation follow | View follows each step; click to hold it still | rewrite: "Hold the view still" |
| Derivation work | Showing all work: each move on its own line with its reason; click to replace the line instead | rewrite: "Replace the line move by move" (and the other state: "Show all work") |
| Original figure | Show the book's original figure / Show the live figure | keep |
| WebGL | This figure needs WebGL, which this browser does not provide. | keep |

## 2. Tooltips, by kind

**Shortcut reminders** (keep, these are the convention): Command palette
(Ctrl+Shift+P) · Settings (Ctrl+,) · Ctrl+E (note edit) · Ctrl+G, Ctrl+Z,
Ctrl+Shift+Z, 0, Shift+0 (drawing) · {tool} ({key}) (drawing tools) ·
Screen lock ({n}s grace) · Lasso (or Shift-drag).

**Plain actions** (keep): Close · Rename · Delete · Remove · Reorder · More ·
Previous tip · Next tip · Fit width · Check for changes · Edit repo, branch
and token · Open a section here · Back to scratch work · Custom color · Draw
with finger · Drag to connect · Start arrowhead · End arrowhead · Import
{types} · Theme · Play / Pause · Focus on the selection / Unfocus · Progress ·
Go to where this is introduced · Go to where this form is stated.

**State or explanation** (review): Select what you are ready to learn (the
Ready button; suggest "Ready to learn") · Pause and return; the session stays
open (suggest "Pause; the session stays open") · In use / In use, {mode} ·
Pin to {place} / Unpin · the four palette-mode tooltips above · the three
derivation tooltips above · A widget written by the model · {n} atoms (element
card) · credit line and Bloom help on an exercise card · day heatmap cells ·
Continue ({needs}) on a session row.

## 3. Tips (TipToast)

1. Work notes and exercises by hand in the drawing view, with a tablet and pen. [New drawing]
2. Each book has a theme, behind the palette button on its row in the Explorer: the color of every quantity, the palette, and what it color codes.
3. Drag a concept, formula, definition, figure or sim straight into a note.
4. Import your own PDFs, annotate them, and link their highlights into your notes. [Import files]
5. Hold Ctrl as you open most things, or middle-click them, to open them in a new group beside this one. (merged with the old Ctrl-click tip)

Suggested cuts: tip 2 to "Each book has a theme: the palette button on its
Explorer row." Tip 4 to "Import your own PDFs and annotate them."

## 4. Figures on small screens

What the screenshots at 420px show (ODE 3.3, the fundamental-matrix sim):

- The headline text drawn inside the canvas ("X(0)c = b gives c1 = 1.00…")
  runs over the top of the plot, because the canvas is a fixed 1400-unit
  scene scaled to the pane width, and a headline that fits beside the axes
  at 700px lands on them at 400px.
- A derivation at phone width draws the whole graph at its fit scale, so the
  boxes are unreadably small; the camera fits the graph rather than the
  first step.
- The readout wraps at its text and the matrix rows now keep a little air
  (the inline-block padding rule in global.css). Before the rule the second
  row's bracket touched the first row's baseline.

Is one inner-canvas resize reasonable for all figures? No. Each figure places
its own elements in scene units, so there is no general scaling that keeps a
figure's composition. What is general:

1. **A taller scene under a width.** figlib already has this for the Bloch
   ball (`blochScene`: under 520px the stage becomes 1400 × 1300). Lift that
   into the library: a figure declares a tall aspect for narrow panes, and the
   library switches the canvas aspect ratio and tells the figure its logical
   height changed. The physics figures with a plot beside a scene would then
   stack them. This is a per-figure opt-in with a one-line declaration, not a
   rewrite.
2. **Headlines out of the canvas.** `headline()` draws text in scene space.
   On a narrow pane, draw it as a DOM line above the canvas instead (the
   library already positions DOM labels over the stage for 3D). The text then
   wraps and never overlaps the drawing. This is a library change every
   figure gets for free.
3. **Controls.** `ctl()` already drops a slider to its own line when the
   track would be under 120px. Keep.
4. **Readouts.** Done above. If a readout is mostly matrices, a figure can
   use `\\` line breaks rather than relying on text wrapping.
5. **Derivations.** Frame the first step at a minimum scale on narrow panes
   rather than the whole graph; the reader pans to the rest, as they do in
   the disk.

Proposed order: 2 (one change, every figure), then 1 for the dozen figures
that are a scene beside a plot, then 5. I have not started any of these.

## 5. Row spacing for tall math

Applied: `.readout .katex .minner, .readout .katex .mfrac` and the same
under `.dv-node` are inline-block with 0.2em of padding above and below, so a
matrix or a fraction keeps its row clear of the next when a readout wraps.
No size checks; it is one CSS rule. If the matrix case in ODE 3.3 still
reads too tight, the next step is 0.3em, not a script.
