# Offline textbook contract

Offline textbooks are explicit, verified browser downloads. Adding a textbook
to the reader tree and downloading its files are separate actions. The Find a
textbook panel shows download size, progress, repair/remove actions, update
availability, release dates, and deterministic release changes.

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

The production service worker is registered only on HTTPS or localhost. Each
client is pinned to the book release and runtime artifact chosen at navigation,
so activating an update does not mix its HTML, data, media, scripts, or styles
into an already open reader. A client holds one pin per book, so practising
from a second downloaded textbook reads that book's own release. After an
update the previous release stays cached until no open window and no saved
practice session still names it, then it is reclaimed at the next startup; a
further update is refused while an older release is still in use. The catalog
always uses a network request. Unknown
offline navigations receive an explanatory HTML response; missing non-page
resources receive an HTTP 503 rather than unrelated fallback HTML.

The browser may evict site storage, and clearing site data removes downloaded
books and reader data. Export reader data from Settings regularly; the backup
contains personal records and referenced release hints, not textbook binaries.
There is no account, cloud synchronization, background upload, or Electron
storage implementation in this release.
