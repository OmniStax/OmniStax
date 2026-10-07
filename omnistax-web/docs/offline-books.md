# Offline textbook contract

Offline textbooks are explicit, verified browser downloads. Adding a textbook
to the reader tree and downloading its files are separate actions. The Find a
textbook panel shows download size, progress, repair/remove actions, update
availability, release dates, and deterministic release changes. Once
downloaded, a book keeps itself up to date.

## Publication

`npm run build` generates `/offline-catalog.json`, one immutable manifest per
book/runtime snapshot, immutable copies of every inventoried resource, and a
Cloudflare-compatible `_headers` file. A semantic book release ID hashes that
book's canonical content inputs. A separate runtime artifact ID hashes the app
assets needed to render it; changing app CSS or JavaScript therefore does not
pretend the textbook changed and cannot overwrite an older snapshot.

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
downloaded book whose release or runtime artifact differs from the catalog is
installed again in the background. A file whose SHA-256 the active snapshot
already holds is copied from it, so a deploy that changes only the app
downloads only the app. A background install that fails, or is refused because
an older release is still in use, waits for the next check. The page keeps the
artifact ID of its first catalog; a later check that names another shows
"OmniStax was updated." with a Reload button at the foot of the window.

The production service worker is registered only on HTTPS or localhost. Online
is the live site: every request goes to the network first. A navigation falls
back to the installed snapshot when the network fails or takes longer than
three seconds; a file of a live page falls back only when the network fails.
A page the snapshot answered, or one opened on a release the reader chose,
takes all its files from that snapshot, so its app and content come from one
build. Offline, the front of OmniStax opens the front of a downloaded book.
Each client is pinned at navigation to the book release and runtime artifact
it falls back to, and that pin names the release practice provenance records.
A client holds one pin per book, so practising from a second downloaded
textbook reads that book's own release. After an update the previous snapshot
stays cached until no open window pins it and no saved practice session names
its release (a session is satisfied by the installed snapshot when only the app
changed), then it is reclaimed at the next startup; a further update is refused
while an older snapshot is still in use. The catalog always uses a network
request. A release carries one page per book, the book's
front page: any navigation into a downloaded book that is not a file of the
release is answered with it, and the shell opens the section the address
names. Section pages stay on the server for crawlers and cold loads. Figures
(JPEG) are re-encoded for the release at quality 80 and at most 1200 px on the
long side, and only where that is smaller; the served site keeps the
originals.

The app itself opens offline with no book downloaded. The build writes
`/offline-shell.json`: the runtime files the artifact ID hashes (less `sw.js`)
and, for each book, its front page, `book.json`, `book.html` and
`colours.css`. The worker saves them into `omnistax-shell:<shellId>` when it
installs and again after any navigation the network answers whose list names a
new shell ID, verifying each file's size and SHA-256; the copy counts once the
list itself is saved, and older shell caches are then deleted. When the network
fails, a navigation the installed snapshots cannot answer takes the shell's
copy of its page, and a page of a book not downloaded takes that book's front
page, whose shell opens the section and reports that it cannot load it. A file
the network cannot give, or answers 404, comes from the shell when it holds
it. Other navigations receive an explanatory HTML response; other missing
resources receive an HTTP 503 rather than unrelated fallback HTML.

The browser may evict site storage, and clearing site data removes downloaded
books and reader data. Export reader data from Settings regularly; the backup
contains personal records and referenced release hints, not textbook binaries.
There is no account, cloud synchronization, background upload, or Electron
storage implementation in this release.
