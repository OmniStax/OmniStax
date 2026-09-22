# Importing the reader's own materials (#16)

Implementation handoff. Status: in progress. Decisions were settled with Chen
on 2026-09-22 and are not reopened here; a coding agent builds from this
document and records progress at the foot. Sibling documents: `drawer.md`
(#17) and `byoai.md` (#3). Milestone 0 below is shared with them and lands
first.

## What the reader gets

The explorer's two roots become **OmniBooks** and **Your Files**. Everything
the reader owns hangs under Your Files: folders, notes, drawings (#17), and
now files they import. Beside the "new note" and "new folder" icons on the
Your Files row stands an **import** icon. It accepts PDF, image and markdown
files, one or many, and so does dropping files onto the row or onto a folder.

- A **markdown** file becomes an ordinary note (`NoteDoc`) named after the
  file without its extension. Nothing else changes for it.
- An **image** becomes a file entry whose tab shows the image; it may be
  dragged into notes and drawings like any asset.
- A **PDF** becomes a file entry whose tab is a reader: pages rendered by
  pdf.js, the text layer selectable, highlights in the four colours with a
  comment, and text boxes placed anywhere on a page.

Imported files take part in the reader's tools: the annotations view lists
their highlights and boxes, search finds their text, notes link to them, and
the profile backup carries them. The book-only views (concept map, formulas,
definitions, exercises) ignore them.

## Storage

Files are heavy, so their bytes live in IndexedDB and their metadata in
localStorage, mirroring how note images already split (`notes/assets.ts`).

- `src/lib/files/model.ts` (pure) and `store.svelte.ts`: the file list,
  localStorage key `omnistax-files-v1`, an array of
  `FileDoc { id: FileId (8 base36), name, type: 'pdf' | 'image', mime, size,
  pages?: number, created, updated }`. A `FileId` is shared with the explorer
  entry that stands for the file, as a note's id is with its `NoteDoc`.
- `src/lib/files/blobs.ts`: IndexedDB database `omnistax-files`, store
  `blobs`, records `{ id, blob: Blob, created }`. Store Blobs, not data URLs;
  the backup exporter turns them into base64 on the way out. Reuse the
  transaction wrapper shape of `notes/assets.ts` rather than the module.
- `src/lib/files/marks.svelte.ts`: annotations on files, localStorage key
  `omnistax-filemarks-v1`, an array of `FileMark`, one ADT:
  - `{ kind: 'highlight', id, file, page, anchor: { quote, prefix, suffix },
    color, text, created, updated }` — the anchor is the same
    `Anchor` type and the same pure code as book highlights
    (`notes/anchor.ts`), applied to the page's text layer, so a highlight
    survives re-rendering and a pdf.js upgrade.
  - `{ kind: 'box', id, file, page, x, y, w, h, body, created, updated }` —
    x, y, w, h are fractions of the page's width and height, so the box
    stays put at any zoom. `body` is note markdown and renders with the note
    renderer. It is the same component the Drawer's text box uses
    (`components/ui/TextBox.svelte`, see `drawer.md`); if the Drawer has not
    landed, build the component here and the Drawer adopts it.
- Every new key joins `backup/schema.ts`: `omnistax-files-v1` and
  `omnistax-filemarks-v1` as validated JSON, category `notes`, and the blob
  store beside `assets` in the backup document as `files: [{ id, type, mime,
  base64, created }]`. Raise `MAX_BACKUP_BYTES` to 500 MB and, in the Settings
  export, show the estimated size before writing. A backup over 50 MB warns
  that browsers may refuse to load it on some devices; it is not refused.

## Explorer

`explorer/model.ts` gains `EntryKind = 'folder' | 'note' | 'book' | 'file' |
'drawing'` (drawing is the Drawer's; add the kind here in milestone 0 so
both features share one migration). A file entry carries `fileId`; RANK
orders folders, books, notes, drawings, files. Root labels change to
"OmniBooks" and "Your Files" wherever they are drawn (Explorer.svelte, the
palette's commands, the backup category names are untouched). Deleting a
file entry deletes the `FileDoc`, its blob and its marks as one undoable
compound edit in `explorer/edits.ts`; undo restores all three.

The import icon and drop handling live in `Explorer.svelte`, calling one
function `importFiles(files: FileList | File[], parent: EntryId | null)` in
`src/lib/files/import.ts`, which dispatches on type: markdown to the note
store, image and PDF to the file store. A file the app does not take is
reported in the drag toast, not thrown.

## The PDF tab

- A new `ItemId` kind `file` (`file:<id>`) in `types/ids.ts`, with `fileItem`
  and the parser and key cases. The Pane dispatches it to
  `components/files/FileTab.svelte`, which shows an image or mounts
  `PdfReader.svelte`.
- pdf.js is vendored under `public/vendor/pdfjs/` (the `pdf.min.mjs` build
  and its worker) and fetched on demand the way `fig/three.ts` fetches three:
  `src/lib/files/pdfjs.ts` exposes one `loadPdfjs()` promise. Nothing of it is
  in the app bundle until a PDF opens.
- The reader renders pages lazily: a page canvas and its text layer are
  drawn when the page nears the viewport and released when it is far. Zoom
  is the app's text zoom plus a fit-width default; Ctrl+wheel is not taken.
- Selecting text shows the existing `HighlightBar` colours; choosing one
  writes a `highlight` mark anchored by page and quote. Marks paint through
  a file-flavoured twin of `notes/paint.ts` over the text layer. Clicking a
  painted highlight opens the same comment editing the book's highlights
  have (Annotations view row, or the bar).
- A "text box" tool in the tab's toolbar: click on a page to place a box,
  drag its edge to resize, drag its bar to move, double-click to edit
  markdown, Escape closes. Boxes render with `notes/md/render.ts` and their
  links open where note links open.
- Search (Ctrl+F inside the tab) is left to a later milestone; the global
  search covers the text.

## Links

`notes/md/links.ts` gains one prefix, `file`:

- `[[file:<id>]]` opens the file tab; `![[file:<id>]]` embeds a card with
  the name, kind and page count (and the image itself for an image).
- `[[file:<id>:p12]]` opens the file at page 12; the embed shows the page
  rendered small when the blob is at hand, else the card.
- A file highlight or box is `[[hl:<markId>]]`, the same prefix as book
  highlights; the resolver looks the id up in the book's highlights first
  and then in the file marks, so the two stores need distinct id shapes:
  file marks use 10 base36 characters, book highlights keep theirs.

`LinkTarget` gains `{ kind: 'file', file, page? }`. The renderer's `Resolver`
gains `file(id)` and `filePage(id, page)`; the autocomplete lists files under
their names. The `@` picker of `byoai.md` replaces this autocomplete later;
until then the `[[` completion offers files like notes.

## Views that see files

- **Annotations** (`views/Annotations.svelte`): a "Your Files" group after the
  book's sections, one heading per file, its highlights and boxes as rows in
  page order; a row jumps to the mark in the file tab, and drags out as
  `![[hl:<id>]]`.
- **Search** (`search/model.ts`, `store.svelte.ts`): a corpus per file. The
  text is extracted once per file at import with pdf.js `getTextContent`,
  page by page, into IndexedDB store `text` in the same database, as
  `{ id, pages: string[] }`, so search never re-parses a PDF. Hits show the
  file name and page, and land on the page with the term flashed in the
  text layer. Images have no corpus.
- Scope bars ignore files: a file tab is no section, so section-scoped views
  fall back as they do for a note tab.

## Storage health

A "Storage" block in Settings, backed by `src/lib/storage/health.ts`:

- On the first write of a file blob, call `navigator.storage.persist()` once
  and remember the answer in `omnistax-storage-persist` (`granted`,
  `denied`, `unsupported`).
- Show `navigator.storage.estimate()` as "Using X of Y" with a bar, the
  persist status in words, and a note per platform:
  granted: "Your browser has promised to keep this data."
  denied: "Your browser may clear this data when space runs low. Install
  OmniStax as an app or bookmark it, then reopen this page, and keep a
  backup. Self-hosting removes the limit."
  Safari: also say that Safari deletes data after seven days without a
  visit unless the app is on the home screen.
- Export a backup from the same block. The block is the one place the reader
  learns whether their data is safe; nothing else nags.

## Milestones

Each is a commit onto the working branch with `npm run check`, `npm test`
and `npm run build` clean, plus the browser check named.

- [x] 0. Shared seams: `ItemId` kinds `file`, `drawing`, `chat` and `ex`
  (`ex:<section>/<exId>`, the exercise as a tab, which #17 needs) with keys,
  parsers and a Pane placeholder for each; `EntryKind` `file` and `drawing`
  with RANK and migration; link prefixes `file`, `drawing`, `chat`, `ex` in
  `links.ts` with `LinkTarget` cases and a Resolver that returns null for
  them; root labels OmniBooks and Your Files. Tests in `tests/urls.test.ts`,
  `explorer.test.ts`, `md.test.ts`. Commit as "feat: seams for files, drawings
  and chats (#16 #17 #3)".
- [x] 1. File store, blobs, import of markdown, images and PDFs, explorer
  rows, delete with undo, image tab, backup whitelist and the 500 MB cap.
  `tests/files.test.ts` for the pure model; extend
  `tests/backup-browser-check.py` with one PDF and one image round trip.
- [x] 2. PDF reader tab with lazy pdf.js, page rendering, text layer, zoom,
  `file:` links and embeds, page links. `tests/pdf-browser-check.py` opens a
  fixture PDF (put a two-page one under `tests/fixtures/`), scrolls, and
  follows a page link from a note.
- [x] 3. Highlights and text boxes on PDF pages, painted and undoable through
  the shell timeline, in the Annotations view, dragging out as `hl:` embeds.
  Browser check adds a highlight, reloads, sees it painted.
- [x] 4. Search corpus per file with text extracted at import, and the
  Storage block in Settings with persist and estimate. Browser check searches
  a word that only the fixture PDF holds.

## Progress

**2026-09-22 — milestone 0, the shared seams.** `ItemId` now holds `file`,
`drawing`, `chat` and `ex`, with branded `FileId`, `DrawingId` and `ChatId`
beside `NoteId`, one `base36(8)` generator behind all four of the reader's own
ids, keys and parsers that round-trip, and `sectionOfItem` answering for an
exercise. `EntryKind` gains `file` and `drawing`, each naming its record in a
field of its own the way a book names its book; RANK is folder, book, note,
drawing, file; the storage boundary refuses a row of those kinds that names no
record, and the old User migration is untouched. `links.ts` parses `file:<id>`,
`file:<id>:p<n>`, `drawing:<id>`, `chat:<id>`, `chat:<id>:<msg>` and
`ex:<section>:<exId>`, and writes each of them back. The renderer answers for
all four: a link is an anchor carrying the inner text, an embed is a stub card
with an eyebrow naming the kind, and a `Resolver` may now lend one its name
through the optional `file`, `drawing`, `chat` and `exercise` lookups. The Pane
mounts `ui/Placeholder.svelte` for each new kind and the tab reads its name
from the explorer row. The roots read OmniBooks and Your Files. The stub card
is deliberately unstyled: milestones 1 to 3 bring the real cards and their CSS
with them.

**2026-09-22 — milestone 1, the files themselves.** `files/model.ts` is the pure
list — a `FileDoc` of eight base-36 characters, what the app takes (`takeOf`
answers file, note or refused, on the browser's type first and the name after
it), and the storage boundary; `store.svelte.ts` keeps it under
`omnistax-files-v1`. `files/blobs.ts` is the one IndexedDB for heavy things,
`omnistax-files`, with a `blobs` store of Blobs and a `text` store of a PDF's
pages. `files/import.ts` is the single way in for the import icon on the Your
Files row and for a drop on the tree: markdown becomes an ordinary note, an
image and a PDF become file rows, and anything else is named in a line at the
foot of the window rather than thrown. A file row deletes as one compound edit
of `explorer/edits.ts` — the row, the record and its marks together — and its
bytes are left behind until the next boot sweeps them, so undo has something to
come back to. The backup carries `omnistax-files-v1` and `omnistax-filemarks-v1`
as validated records and the bytes as `files: [{ id, type, mime, base64,
created }]`; `MAX_BACKUP_BYTES` is 500 MB with a warning above 50.

**2026-09-22 — milestone 2, reading a PDF.** pdf.js 4.10.38 is vendored under
`public/vendor/pdfjs/` (the minified ESM build, its worker, the fourteen
standard fonts and a `VERSION` file) and fetched on demand by
`files/pdfjs.ts`, the way `fig/three.ts` fetches three; nothing of it is in the
app bundle until a PDF opens. `components/files/FileTab.svelte` shows an image
or mounts `PdfReader.svelte`, which stands every page in one scroller at the
size the document says it is and draws a page only as it nears the viewport,
releasing it again when it is far. The text layer is pdf.js's own `TextLayer`,
dressed by the component since the vendored build carries no stylesheet. Zoom
is fit-width by default and the two buttons step from there; Ctrl+wheel is left
alone. `[[file:<id>]]` and `[[file:<id>:p12]]` render as a card naming the file
and open the tab at that page, the page being asked for beside the tab
(`files/open.svelte.ts`) rather than written into its key, since a file open
twice is one document.

**2026-09-22 — milestone 3, marks on a page.** `files/marks.ts` is the pure ADT
— a highlight anchored by the book's own `Anchor` against the page's text, or a
box in fractions of the page's width and height — and `marks.svelte.ts` the
store, every change a step of the shell's timeline. A mark's id is ten base-36
characters where a book highlight's is eight, which is how one `[[hl:…]]`
resolver answers for both without asking each in turn. `HighlightBar` now
stands over a page of a file as it stands over a document of the book, and the
same painter lays the marks into the text layer, so they survive a redraw at
another zoom. `components/ui/TextBox.svelte` is the positioned markdown box,
written to the Drawer's own shape so the two share it: a rectangle in whatever
units the parent counts in, handed back as the reader drags it. The Annotations
view grows a "Your Files" group after the book's own, one heading per file, its
marks in page order, each dragging out as `![[hl:<id>]]`.

**2026-09-22 — milestone 4, search and storage.** The search now reads a list of
sources rather than a list of books: `search/sources.ts` holds
`{ kind, rows }`, with the books asked through their index as before and every
other source a straight read of its rows — `search/files.ts` for a page of a
PDF, and the chats beside it when #3 landed. The pages are extracted once, at
import, by pdf.js's worker into the `text` store; a profile restored from a
backup carries the bytes and not the pages, so `search/filecorpus.svelte.ts`
extracts what is missing the first time it looks. `storage/health.ts` answers
whether the data is safe — `navigator.storage.persist()` asked once on the
first blob written and remembered, the estimate, and the words per platform,
Safari's seven days included — and `components/settings/Storage.svelte` is the
one place that says so, with the size of a backup worked out on request and
written from the same block.

**Left out, and why.** An image embedded in a note still shows its card rather
than the picture: the bytes are in IndexedDB and the renderer is pure, so it
would need the asynchronous decoration pass that pasted images use, which
belongs with whoever next touches `NoteView`. Ctrl+F inside a PDF tab is still
the later milestone the document says it is; the global search covers the text.
A file tab reopens at its first page rather than where the reader left off.
