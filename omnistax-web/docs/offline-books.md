# Offline textbook contract

Offline textbooks are explicit, verified browser downloads. A textbook can be
added to the reader tree without downloading it; a download the reader asks
for adds the book to the tree as well, so what is kept offline is always on
the shelf. The Find a textbook panel lists one card per book with a language
button group for its editions (only the languages this build carries; a green
check marks an edition that is downloaded), and shows the chosen edition's
download size, progress, repair/remove actions, update availability, release
dates, and deterministic release changes. A downloaded book updates itself
unless the reader turns off "Update automatically", in that panel or in the
book row's menu; the setting is one for a book and its translations (kept per
book id in `omnistax-auto-update-v1`, on unless an edition was turned off).

## Publication

`npm run build` generates `/offline-catalog.json`, one immutable manifest per
book release, immutable copies of every inventoried resource, and a
Cloudflare-compatible `_headers` file. A download holds the book and never the
app: its section fragments (`doc.html`), figure scripts, data, `colours.css`
and media, no full page and no app file (`docs/release-plan.md`, decisions 19
to 22). A semantic book release ID hashes that book's canonical content inputs.
The second segment of a release's path, still called the artifact ID, hashes
the content format (`contentFormat` in the manifest), so an app deploy leaves
every download where it was. The catalog's own `artifactId` hashes the app
build and drives the update notice. A download below `MIN_CONTENT_FORMAT`
(`src/lib/offline/schema.ts`, mirrored in `public/sw.js`) is not served and is
offered again as a repair.

Fresh static output cannot preserve prior deployments by itself. For a release
build, point `OMNISTAX_RELEASE_ARCHIVE_DIR` at the prior deployed output. The
builder merges its `offline/releases/` tree before publishing the current
catalog. Hosting must retain every release named by the current catalog and at
least the previous release readers may still have pinned or referenced from a
saved session. Publish the generated `_headers`; versioned release paths are
long-lived and immutable, while `/offline-catalog.json`, stable HTML, and
`/sw.js` must revalidate.

## Browser behavior

Downloads use at most four concurrent requests, verify byte size and SHA-256,
and only move the active IndexedDB pointer after the complete manifest is in
Cache Storage. Interrupted and quota-failed downloads keep completed-resource
bookkeeping for retry. A denied persistent-storage request is nonfatal. Missing
cache entries are detected at startup and offered as a repair.

The app checks the catalog on startup, when its window gains focus or comes
back online, at most once per ten minutes after a successful check. Every
downloaded book set to update automatically whose release or runtime artifact
differs from the catalog is installed again in the background. A file whose SHA-256 the active snapshot
already holds is copied from it, so an update downloads only what changed. A
background install that fails, or is refused because an older release is still
in use, waits for the next check. The page keeps the app artifact ID of its
first catalog; a later check that names another shows "OmniStax was updated."
with a Reload button at the foot of the window.

A book row in the explorer wears two marks. "Update" with a yellow dot shows
while a downloaded book's installed release is older than the catalog's
(runtime-only differences do not count); clicking it installs now, and it
stays until the install completes, so with automatic updates on it shows only
while the background install runs. "Updated" with a blue dot shows, for every
reader whether the book is downloaded or not, when the release they have (the
download's, else the catalog's) is not the one they last saw.
`omnistax-seen-releases-v2` keeps per book the release, artifact and section
fingerprints last seen; a book first seen records them silently. Clicking the
mark records the current release as seen and opens the changes: sections
added, changed and removed by fingerprint, each added or changed one opening
to a line diff of its readable text (one block per line, maths as TeX, read
from the local snapshot when held, else the release's download URLs), and the
changed data files by name. When the earlier release is no longer on the
server, the section list still comes from the kept fingerprints and the
earlier text is said to be unavailable.

The production service worker is registered only on HTTPS or localhost. A
navigation into a downloaded book is answered with the app's `404.html`, live
when the network answers within three seconds, else the app's copy; that shell
reads the address and fetches the section, and the book's files come from the
download at the installed release or the one the reader chose. Every book
therefore runs the newest app the reader has loaded, and turning "Update
automatically" off keeps the text, not the app. App files come from the
network, else the app's copy. Everything else is the live site, network first,
falling back to the app's copy when the network fails or takes longer than
three seconds. Each client is pinned at navigation to the book release and runtime artifact
it falls back to, and that pin names the release practice provenance records.
A client holds one pin per book, so practising from a second downloaded
textbook reads that book's own release. After an update the previous snapshot
stays cached until no open window pins it and no saved practice session names
its release (a session is satisfied by the installed snapshot when only the app
changed), then it is reclaimed at the next startup; a further update is refused
while an older snapshot is still in use. The catalog always uses a network
request. Section pages stay on the server for crawlers and cold loads. Figures
(JPEG) are re-encoded for the release at quality 80 and at most 1200 px on the
long side, and only where that is smaller; the served site keeps the
originals.

The app itself opens offline with no book downloaded. The build writes
`/offline-shell.json`: the runtime files the app artifact ID hashes (less `sw.js`, with `404.html`)
and, for each book, its first built page, `book.json` and `colours.css`. The worker saves them into `omnistax-shell:<shellId>` when it
installs and again after any navigation the network answers whose list names a
new shell ID, verifying each file's size and SHA-256; the copy counts once the
list itself is saved, and older shell caches are then deleted. When the network
fails, a navigation the installed snapshots cannot answer takes the shell's
copy of its page, and a page of a book not downloaded takes that book's first
built page, whose shell opens the section and reports that it cannot load it. A file
the network cannot give, or answers 404, comes from the shell when it holds
it. Other navigations receive an explanatory HTML response; other missing
resources receive an HTTP 503 rather than unrelated fallback HTML.

The browser may evict site storage, and clearing site data removes downloaded
books and reader data. Export reader data from Settings regularly; the backup
contains personal records and referenced release hints, not textbook binaries.
There is no account, cloud synchronization, background upload, or Electron
storage implementation in this release.
