# Bring your own AI (#3)

Implementation handoff. Status: in progress. Decisions settled with Chen on
2026-09-22; not reopened here. Depends on milestone 0 of `imports.md` (the
`chat` item and link kinds). AI grading of answers is out of scope.

## What the reader gets

A **chat** view, opened from a rail button like the concept map: every click
opens another chat as a tab (`chat:<id>`), and several may stand open. The
reader brings their own key. Nothing leaves the browser except the request
to the provider they chose; no key ever touches OmniStax's server.

Providers, chosen in Settings under "AI" with a key field each and a model
picker: Anthropic, OpenAI, Google Gemini, and "OpenAI-compatible" with a
base URL for local servers and other hosts. Keys are kept in localStorage
`omnistax-ai-v1` and are **excluded from the backup**; the backup carries the
provider and model chosen, not the key. A provider that refuses a browser
request (no CORS) is reported in the chat with the words "this host does not
allow requests from a browser; run a local proxy or choose another".

## Context and the @ picker

The model is told what the reader is looking at only through **chips** above
the composer. When a chat opens, one chip is pinned: the section being read
(its text, from the registry's fragment, with figures replaced by their
captions). The reader may remove it. Switching to another section offers a
chip for it beside the composer; it is never swapped silently. Selecting
text on a page shows an "Ask AI" action on the highlight bar that pastes the
selection into the composer of the focused chat, or opens one; a selection
carries no other meaning.

Typing `@` in the composer opens the **picker**, `components/ui/AtPicker.svelte`
over `src/lib/picker/model.ts` (pure): first a list of categories, then a
tree or list within the category, filtered by what is typed after the `@`.
Categories, in this order: notes, drawings, files, sections (the book's
tree), figures and sims, concepts, equations, definitions, exercises, chat
messages. Choosing one adds a chip; the chip's text is what the model sees
(a note's markdown, a file's extracted text or page, a section's text, a
figure's caption and alt text, a concept with its why, an equation with
its condition, a definition, an exercise's statement, a message's text).
The picker is built once and **also replaces the `[[` completion in the note
editor** (`notes/md/complete.ts` becomes a consumer of the same model, its
choice writing `[[…]]` instead of a chip). Left, Right, Up, Down, Enter and
Escape drive it; a click does the same.

## The conversation is a tree

A chat is a tree of messages. `src/lib/chat/model.ts` (pure):
`Chat { id: ChatId (8 base36), name, root: MessageId, messages:
Record<MessageId, Message>, leaf: MessageId, created, updated }` and
`Message { id, parent: MessageId | null, role: 'user' | 'assistant', text,
chips: Chip[], model?, at, state: 'done' | 'streaming' | 'stopped' |
'failed' }`. The transcript shown is the path from the root to `leaf`.

- **Edit-and-resend** on a reader message makes a sibling under the same
  parent and moves `leaf` to it; the old message stays. **Retry** on an
  assistant message does the same for that message.
- Every message that has siblings shows a pager on its bubble, "2 of 3",
  with arrows; moving it swaps the transcript below to that branch's latest
  leaf.
- The chat header shows a **breadcrumb of fork points** from the root to the
  current leaf: one crumb per message with siblings, the first words of the
  chosen sibling; a crumb click jumps back so the reader is at the fork,
  and its chevron lists the siblings.
- The chat's side list (a toggle in the header) names every **leaf** by the
  first words of its first divergent message, so every branch has a name
  and one click opens it.
- A chat's name is its first reader message, editable.

## Output

The model answers in markdown. It is rendered with the note renderer
(`notes/md/render.ts`) so KaTeX, links and cards work, and code blocks get
a copy button. The system prompt asks for markdown with `$…$` maths and
says that a fenced block tagged `widget` may hold a self-contained HTML
document, which the app renders in a sandboxed `<iframe sandbox="allow-scripts">`
with a fixed height that the widget may grow by posting a message. The
widget block is opt-in per chat (a toggle in the composer, off by default),
and the prompt does not mention it when off. No other HTML is rendered.

Streaming through each provider's SSE; a Stop button while streaming marks
the message `stopped` and keeps the text so far; a failed request keeps the
error text on the message with a Retry.

## Messages elsewhere

- A bubble drags out as `![[chat:<chatId>:<messageId>]]` and drops into
  notes and drawings as a card with the role, the first line, and a link to
  the chat at that message; `[[chat:<id>]]` opens the chat.
- Search has a corpus per chat over its messages; a hit opens the chat at
  that message's branch.
- Chats live in IndexedDB database `omnistax-chats`, store `chats`, with a
  localStorage index `omnistax-chats-v1` of `{ id, name, created, updated }`
  for the explorer-free places that list them (the picker, search, links).
  Both are in the backup, the store exported as `chats: Chat[]`.

## Files

- `src/lib/chat/{model.ts, store.svelte.ts, providers/{anthropic.ts,
  openai.ts, gemini.ts, compatible.ts, index.ts (one `Provider` interface:
  `stream(request, signal) → AsyncIterable<string>` and `models()`)},
  context.ts (a chip to the text the model sees), prompt.ts (the system
  prompt)}`
- `src/lib/picker/{model.ts, sources.ts (each category's rows, read from
  the stores that exist)}` and `components/ui/AtPicker.svelte`
- `src/components/chat/{ChatTab.svelte, Composer.svelte, Bubble.svelte,
  Crumbs.svelte, Leaves.svelte, Widget.svelte}`
- `types/ids.ts` `chat:<id>` (milestone 0), a `chat` view button on the rail
  (`Rail.svelte`, `ids.ts` VIEW_KINDS if the rail needs a kind; the tab
  itself is the `chat` item), Settings "AI" block, `commands/defaults.ts`
  "New chat" (Ctrl+Alt+L in a tab, Ctrl+Shift+L installed).

## Milestones

- [x] 1. Providers, Settings block, the chat tab with linear conversation,
  the pinned section chip, streaming, stop, retry, markdown output, storage
  and backup. `tests/chat.test.ts` for the model; `tests/chat-browser-check.py`
  against a local mock server that speaks the OpenAI SSE shape.
- [x] 2. The tree: edit-and-resend, sibling pager, fork breadcrumb, leaf
  list; search corpus; the `chat:` embed and drag-out.
- [x] 3. The @ picker with every category, chips from it, and the note
  editor's `[[` completion moved onto it. "Ask AI" on the highlight bar.
- [x] 4. Widget blocks in a sandboxed iframe, opt-in.

## Progress

**2026-09-22.** Milestones 1 to 4 built. The chat is a tab of its own opened
from a new rail button beside the four view buttons and from "New chat"
(Ctrl+Shift+L); `lib/chat/model.ts` is the pure tree — the transcript is the
path from a silent root to the leaf, edit-and-resend and Retry make siblings,
and the pager, the fork breadcrumb and the leaf list are read off it.
`providers/` holds one interface and four providers (Anthropic, OpenAI,
Gemini, and OpenAI-compatible, which is the OpenAI one at the reader's own
address), with `requestOf` pure so a body can be checked without a network and
a `TypeError` from fetch reported as the CORS sentence. Keys live in
`omnistax-ai-v1` and the backup adapter strips them; the chats live in
IndexedDB `omnistax-chats` with the index in `omnistax-chats-v1`, and both
travel in a backup (`chats: Chat[]`). The picker is `lib/picker/` over
`components/ui/AtPicker.svelte`, opened by `@` in the composer and by `[[` in
the note editor, which no longer uses CodeMirror's own completion. Widgets are
opt-in per chat and mount in `<iframe sandbox="allow-scripts">`.

The chat corpus is `lib/search/chats.ts`, pure and tested, and it is one more
source of `lib/search/sources.ts`: `findAll` answers `chats` beside `books` and
`files` under the same filters. What is left is the view — the Search page must
hand the source its rows (`chatEntries` over the chats that have been opened)
and draw the group — and landing on a hit, which is `chats.goTo` at that
message. The widget toggle is per chat and per session rather than persisted. A
chat has no row in the explorer tree; the index is what the picker, the search
and links read it by. `components/notes/NoteTab.svelte` still gathers its own
candidate list and hands it to the editor as `complete`, which the editor now
ignores: that list is the next thing to delete.

**2026-09-22, the picker.** Typing `@` was very slow and neither Enter nor a
click chose anything. Three faults, all now mended. `AtPicker.svelte` copied
the query out of its prop into its own state through an effect that read the
state it wrote, which Svelte stops after a few rounds with
`effect_update_depth_exceeded` — and a component whose effects have been
stopped draws but answers to nothing. The query is no longer held at all: it is
read from the prop wherever it is wanted, `PickerState` keeps only the
category, the cursor and `mark` — what the field said when the category was
opened, so that only what is typed after it narrows the rows — and the cursor
is kept beside the key of the list it was counted in, so a change of category
or of words puts it back at the top without anything having to reset it. The
composer and the note editor gathered the rows in a `$derived`, which walked
the DOM of every loaded section and read every store again on any store change,
once per streamed word; the rows are now gathered once when the picker opens
and again only when a category has had to fetch something (`warm` answers when
it has). `figureRows` holds each section's figures against the document they
were read from, in a `WeakMap`. A row is chosen on `mousedown` with the
default refused, so the press does not take the focus off the field and close
the picker before the click arrives. Two things the note editor needed besides:
its `domEventHandlers` now come first among the extensions, because
CodeMirror's own keymap was taking Enter and making a line of it before the
list saw it; and the list hangs below the cursor when there is no room above,
where before it stood off the top of the window and could not be clicked. The
browser checks cover all of it: `tests/chat-browser-check.py` opens six
sections of three chapters, asserts the picker opens in well under 100 ms, and
walks Enter-on-category, Enter-on-row and click-on-row to a chip;
`tests/note-picker-browser-check.py` is the same walk in a note, ending in
`[[1.2]] and [[3.1]]`.

## Round two (#3, #26)

Scoped with Chen on 2026-09-29. Round one's decisions stand except where this
section replaces them.

### Providers and Settings

- Providers: Anthropic, OpenAI, Google Gemini, DeepSeek, OpenRouter, Mistral,
  and **Local AI**. DeepSeek, OpenRouter and Mistral speak the OpenAI shape at
  their own base URL (`https://api.deepseek.com`, `https://openrouter.ai/api`,
  `https://api.mistral.ai`), so they reuse `openai.ts`. `compatible` becomes
  `local`; stored settings under the old id migrate.
- Settings "AI" shows one card per provider. A card holds the key, a "Get a
  key" link (console.anthropic.com, platform.openai.com/api-keys,
  aistudio.google.com/apikey, platform.deepseek.com/api_keys,
  openrouter.ai/keys, console.mistral.ai/api-keys), the models the provider
  lists (fetched from its models endpoint once a key is there) and a field to
  add a model it does not list. The reader ticks which models appear in the
  chat's menu.
- Local AI holds named endpoints: a name, a base URL, and models (fetched from
  `/v1/models` or typed). One help line says what compatible means: the
  server answers `POST /v1/chat/completions` with SSE and allows browser
  requests (Ollama: `OLLAMA_ORIGINS`; LM Studio: its CORS switch; llama.cpp
  and vLLM: their CORS flags). `http://localhost` is reachable from the https
  site in Chrome and Firefox, not in Safari.
- Settings no longer chooses the provider or the model. Keys stay out of the
  backup.
- Settings gains **"Inline HTML rendering"** (on by default), which replaces
  the composer's "Widgets" toggle. When off, the prompt omits the widget
  paragraph and a widget fence renders as code.

### The model menu

A menu left of Send lists the ticked models grouped by provider. The choice
is stored on the chat (`Chat.pick = { provider, model }`) and the last one
chosen seeds a new chat. A model whose provider lacks a key shows "Needs key";
choosing it opens Settings at that provider's card. Each assistant message
keeps `model`, and its bubble names it.

### Conversations page and time

- The rail's chat button opens **Conversations** (a `chats` view): every chat,
  newest first, with its name, its last message's age ("3 h ago"), rename in
  place, delete with undo, a filter field, and "New chat". Ctrl+Shift+L still
  opens a new chat directly.
- Every bubble shows its time on hover, and a day divider stands where the day
  changes.

### Rendering

- `\(…\)` and `\[…\]` are maths, like `$…$` and `$$…$$`.
- The reader's own messages render as markdown with maths.
- `CARD_LINK` accepts the book prefix, so `![[eq:college-physics-2e/16.1:…]]`
  is a block card.
- Book things in an answer behave as in a note: a term has its hover card, an
  equation sets with the book's macros so symbols keep their colours, and
  `![[fig:…]]` mounts the live figure.

### The tree view

A chat opens as the linear transcript. A header toggle, remembered per chat,
switches to the **tree view**: every message is a node on a pan/zoom plane,
laid out by `lib/tree/layout.ts`, a tidy tree (Reingold–Tilford with variable
node sizes, as in van der Ploeg's flextree), root at the top, children left to
right oldest first. A node shows the role, its first lines rendered, and its
time; a click selects it, a double click opens it in the transcript. The
composer replies under the selected node, which forks there. Nodes on the
current path are emphasised. The linear view keeps the pager and the
breadcrumb; the leaf list gives way to the tree.

`layoutTree` is pure: `(root, childrenOf, sizeOf, gaps) → Map<id, { x, y, w,
h }>`. The pan/zoom plane is `components/ui/Plane.svelte` (a transformed
container with wheel, drag and pinch, Fit and Reset). The drawing canvas and
the note embed of a chat (#34) use both.

### Cost of branching

The providers keep no conversation, so every turn sends its whole path; a
branch costs what a linear chat of the same length costs. Anthropic requests
carry `cache_control: { type: 'ephemeral' }` on the system prompt and on the
last reader turn, so sibling branches read their shared prefix from the cache.
OpenAI, DeepSeek and Gemini cache shared prefixes on their own.

### The system prompt

`prompt.ts` is rewritten from Chen's draft in #3, in active voice (#32): what
OmniStax/万象 is (an Integrated Learning Environment; OmniBooks keep the
original text and replace static figures with interactive ones; notes,
drawings, pomodoro, imports), how answers render (markdown, KaTeX, the link
grammar, widgets when on), and the tools. The link grammar is the note
grammar: `[[book/16.4]]`, `[[def:book/sec:key]]` for a term with its card,
`![[eq:book/sec:key]]` for an equation card, `![[fig:book/sec:id]]` for a live
figure, `[[concept:…]]`, `[[sym:…]]`.

### Tools

The model reads the books through tools, run in the browser against the
registry (`lib/chat/tools.ts`, pure over a `Library` port so tests pass a
fake):

- `list_books` → ids and titles
- `table_of_contents(book, chapter?)` → chapters and sections
- `read_section(book, section)` → the section text, figures as captions
- `search(book, query)` → hits with section and snippet
- `lookup(book, kind, query)` for definitions, equations, symbols and
  concepts, with their links
- `figure(book, section, id, include_source?)` → caption, alt text, parameters
  and their current values, and the source only when asked

A turn with tool calls loops: stream, run the calls, send the results, stream
again, up to 8 rounds. An assistant `Message` gains `steps: Step[]`, where
`Step = { kind: 'text', text } | { kind: 'tool', id, name, input, output?,
error? }`; `text` stays the concatenated prose so search and embeds are
unchanged. The bubble shows each tool step as one collapsed line ("Read 16.4
Simple Harmonic Motion"). `requestOf` expands steps into each provider's
native shape (Anthropic `tool_use`/`tool_result`, OpenAI `tool_calls` and the
`tool` role, Gemini `functionCall`/`functionResponse`). A model that rejects
tools is retried once without them and remembered as tool-less for the
session; chips still work.

### Figures and images as context (#26)

A figure chip carries the caption, the alt text, the parameter values at that
moment (from the figure's control registry, #21) and a snapshot PNG
(`drawer/snapshot.ts`) sent as an image part. Source code goes only through
the `figure` tool. The composer accepts pasted and dropped images, sent as
image parts to every provider that takes them; a chip shows a thumbnail.
Images live in `omnistax-assets`; messages hold `asset:<id>`.

### Round-two files

- `lib/chat/providers/*` (new ids, tools, images, caching), `settings.ts`,
  `settings.svelte.ts`, `components/settings/Ai.svelte`
- `lib/chat/tools.ts`, `prompt.ts`, `context.ts`, `model.ts` (steps, pick),
  `store.svelte.ts` (the tool loop)
- `components/chat/{Composer, ModelMenu, Bubble, ChatTab, TreeView,
  Conversations}.svelte`, `components/ui/Plane.svelte`, `lib/tree/layout.ts`
- `lib/notes/md/render.ts` (delimiters, `CARD_LINK`)

### Round-two milestones

- [x] 5. Providers, cards, Local AI endpoints, model menu, the inline HTML
  setting, caching.
- [x] 6. Tools and the loop, the new prompt, figure and image context.
- [x] 7. Conversations page, times, rendering fixes, `Plane.svelte`,
  `lib/tree/layout.ts` and the tree view.
