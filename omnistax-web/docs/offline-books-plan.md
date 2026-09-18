# Offline textbooks, visible updates, and portable reader backups

Implementation handoff. Status: in progress. This document records
the product decisions from the September 2026 discussion and is intended to be
executable by a coding agent without reopening routine design decisions.

## Implementation progress

- [x] Milestone 1: versioned full reader-profile export/import, exact persisted
  key inventory, pasted note images, typed validation, replacement preview,
  cross-tab Web Lock, restore journal, rollback and pre-store startup recovery.
- [x] Milestone 2: immutable book/runtime release manifests, versioned resource
  paths, deterministic IDs, hosting headers, and release-archive input.
- [x] Milestone 3: verified resumable downloads, failure/cancellation records,
  quota handling, eviction detection, repair, and removal.
- [x] Milestone 4: production service worker, cold offline opening, durable
  per-client book/release/runtime pinning, and useful missing-route responses.
- [ ] Milestone 5: update discovery, changes, provenance, retained prior release,
  updated-section/lost-anchor UI, and mastery preservation are implemented;
  reference-aware reclamation and a real two-published-build update fixture remain.

### Milestone 1 validation — September 18

Settings now exposes the backup UI and ShellPage boots through ShellLoader.
Startup acquires a shared Web Lock before inspecting the journal and before
importing eager reader stores; restore drops that lock only after disabling
writes and obtains exclusivity. A second live tab causes a controlled refusal
and reload. The IndexedDB journal covers localStorage and note-image before/after
snapshots, and a local marker distinguishes unavailable IndexedDB from an
interrupted restore that must not be ignored.

Validation completed against a built site: `npm run check`, focused backup unit
tests, `npm run build`, `tests/backup-browser-check.py` (all-book records and
note-image round trip, second-tab refusal/retry, forced startup recovery), and
the existing `tests/practice-browser-check.py` all pass. Quota-failure injection
is still desirable additional hardening, but normal failure keeps the journal
for startup recovery and is not a reason to leave the milestone disabled.

### Milestones 2–5 validation — September 18

The post-media build hook now emits a network-only latest catalog and immutable
book/runtime manifests. Semantic release IDs derive only from canonical inputs;
runtime artifact IDs independently version the built app. The archive input is
`OMNISTAX_RELEASE_ARCHIVE_DIR`, and generated `_headers` encode immutable release
caching plus revalidation for stable entry points.

The installation service stages into a release-and-runtime cache, verifies size
and SHA-256, records resume progress, and moves the active IndexedDB pointer only
after completion. The worker pins navigation clients to that exact snapshot.
Update checks and installs stay explicit; practice attempts/sessions record
release hints, old sessions refuse silent content substitution, earned mastery
survives expanded availability, changed sections are marked, and notes with lost
anchors remain visible.

Validation completed against production build output: `npm run check` (zero
errors; four pre-existing hints), all 36 `npm test` suites, `npm run build`,
`tests/backup-browser-check.py`, `tests/practice-browser-check.py`, and
`tests/offline-browser-check.py`. The offline scenario covers persistence denial,
injected Cache Storage quota failure and retry, verified download, two clients
pinned to different releases, a closed warm tab, cold offline deep/root
navigation and feature-resource loads, deliberate resource eviction, and repair.

Remaining Milestone 5 work is deliberately recorded rather than hidden: old
release caches are retained safely but are not yet reclaimed after consulting
live-client and saved-session references; the synthetic two-cache pin test is not
a full publish-A/archive/publish-B/update browser fixture; cancellation, failed
update checks, and removal isolation are implemented but do not yet have dedicated
browser cases. Hosting must retain current and previous immutable artifacts; no
deployment or external provisioning was performed.

## Goal and boundaries

OmniStax remains a static, local-first application. A reader can browse online,
explicitly download a textbook, reopen it offline after closing the browser,
check for new textbook releases, review changes, and choose when to update.
Reader-owned data travels through explicit export/import only.

- No accounts, cloud sync, Chrome extension, browser-profile sync, background
  upload, or personal-data server.
- No Electron app in this milestone. Define portable content/install contracts
  so a future desktop implementation can use files instead of browser storage.
- No promise that browser storage is undeletable. Explain that clearing site
  data removes local books and reader data; an exported backup survives outside
  the browser.
- No automatic textbook replacement. Check availability automatically when
  appropriate; installation is an explicit action.
- Downloading a book and adding a book to the library are separate operations.
- Do not expand this into the unrelated visualization work in root todolist.md.

The dashboard accordion/Override progress changes already in the working tree
are prior work. Preserve them and test their integration; do not overwrite them.

## Read first and inspect

Read root README.md and omnistax-web/README.md completely. Follow their conventions.
Inspect these integration points before modifying them:

| Area | Existing files |
| --- | --- |
| Static publishing | astro.config.mjs, content.mjs, wrangler.jsonc, src/pages/library.json.ts |
| Content contracts | src/lib/content/schema.ts, paths.ts, bookdata.ts, version.ts |
| Page bootstrap | src/layouts/ShellPage.astro, Page.astro, src/lib/sections/boot.ts, src/components/Shell.svelte |
| Loading content | src/lib/sections/registry.svelte.ts, src/lib/practice/books.svelte.ts, books.ts, src/lib/search/store.svelte.ts, src/lib/sheets/store.svelte.ts |
| Library UI | src/lib/explorer/library.svelte.ts, src/components/views/Explorer.svelte, src/components/explorer/FindTextbook.svelte |
| Reader persistence | settings, colours, notes, practice, explorer, layout, scope, fold, and command-key stores |
| Existing transfer UI | src/components/views/Colours.svelte and src/lib/colours/store.svelte.ts |

Facts already verified:

- Practice, registry, and search keep their own in-memory caches. They are not
  a persistent installation system and do not globally deduplicate all fetches.
- Reader data is spread across localStorage keys, including per-book keys.
- There is a web manifest, but no service-worker/offline installation system.
- Section HTML contains a manifest and chapter data in a boot script, plus
  initial section content. Fetch interception alone cannot fix stale boot data.
- content.mjs copies media at astro:build:done into a shared /media/ namespace.
  An installation manifest must be generated after those files exist.
- src/lib/content/version.ts is an in-process development invalidation counter;
  it is not a durable publication release identifier.
- A complete reader-profile exporter was not found in the inspected paths.
  Audit the repository before introducing a duplicate mechanism.

## Architecture decisions

Keep three kinds of state separate:

1. Immutable published book resources and the app runtime needed to render them.
2. Local installation records: what was downloaded and verified on this device.
3. Reader-owned records: notes, highlights, exercise evidence, overrides,
   preferences, colors, library organization, and saved sessions.

Use Cache Storage for downloaded HTTP resources and IndexedDB for installation
metadata and import recovery records. Existing reader stores may remain in
localStorage for this milestone; do not undertake a wholesale database migration
just to implement offline books. Put backup serialization behind explicit
adapters so future persistence changes do not alter the backup format.

Introduce a small installation service interface: list, inspect, install,
cancel, removeDownload, checkUpdates, applyUpdate. Keep parsing, hashing,
release comparison, and state transitions in pure modules. Browser I/O belongs
in adapters; UI should not call Cache Storage directly. Avoid a generic storage
framework or speculative Electron dependencies.

Proposed new code locations (adjust to repository conventions if needed):

- src/lib/offline/schema.ts, model.ts, storage.ts, store.svelte.ts
- src/lib/backup/schema.ts, model.ts, adapters.ts, store.svelte.ts
- scripts/build-offline.ts or a build integration invoked after media copying
- A bundled service-worker source and production registration module
- Library download/update controls and a Settings backup/storage section

## Milestone 1 — Complete reader backup and restore

Do this first so subsequent storage work has a recovery path.

1. Inventory every persisted key, including keys for books not currently open,
   legacy versions, custom shortcuts, scoped colors, annotations, notes, practice
   history, rounds, presentations, self-assessments, library/explorer structure,
   saved sessions, layout, and scope/fold preferences. Record the inventory in
   documentation. Include each supported category or document an intentional
   exclusion. Do not export arbitrary origin storage or unrelated keys.
2. Define a versioned JSON backup with format identifier, schema version,
   exportedAt, app-format compatibility information, and typed reader records.
   Include referenced book IDs/releases as hints, not as proof of installation.
   Export persisted records from all books, not only the active Svelte stores.
3. Add Settings actions: Export my data and Import backup. Explain that book
   files are excluded and may need downloading on the destination device.
   Keep the existing color-only export/import working.
4. Validate the complete import before any writes. Show export date, categories,
   record counts, and a clear replacement warning. Reject unknown future backup
   versions, malformed records, and unreasonable payload sizes. Do not silently
   drop invalid records and call the import successful.
5. V1 imports replace reader data; they do not merge profiles. Explicitly state
   this in the UI. Offer exporting the current profile before replacement and
   retain a local recovery snapshot until successful reload. Do not touch
   installed book resources or installation metadata.
6. localStorage writes are not transactional: use an IndexedDB restore journal
   with before/after snapshots and a commit marker. Serialize restoration,
   quiesce store writers, and prevent writes from other open app tabs through
   a coordinated restore lock. Recover/roll back an interrupted restore before
   normal store initialization. A partial or quota-failed restore must not
   silently strand mixed state. Reinitialize through a controlled reload.
7. References to unavailable books remain in the backup/profile; tell the user
   those books need to be obtained. Never mark them installed based on import.

Acceptance: a populated profile round-trips into a clean browser with notes,
colors, progress, overrides, and saved sessions intact. Invalid imports change
nothing. Simulated interrupted/failed restoration recovers the previous profile.

## Milestone 2 — Immutable book releases and install manifests

Publish a small latest-release catalog separately from immutable resource files.
Keep existing /library.json consumers backward compatible (optional fields or a
separate offline-catalog.json are acceptable). Choose the separate catalog for
the first implementation to reduce unrelated parser changes.

Each book release manifest contains:

- Schema/content-format version, stable book ID, title, release ID.
- Publication date and optional authored release notes.
- Resource inventory: logical URL, immutable download URL, SHA-256, byte size,
  MIME type, and role (page, data, media, script, style, font, etc.).
- Section IDs and fingerprints for identifying changed sections.
- Required app runtime/artifact identity and compatibility information.
- Total download size, with an explicit definition (uncompressed bytes is fine).

Release identity is a deterministic hash of canonical book content/dependencies,
not a timestamp or repository-wide commit. Rebuilding identical content keeps the
same book release. An unrelated book change must not change this release.
Separate app/runtime artifact identity from the textbook's semantic release:
an app CSS change must not be described as a textbook correction.

Inventory the complete dependency closure: section pages, fragments, chapter
and book JSON, reference sheets, search index, figures.js, images, fonts, KaTeX,
Three.js where needed, dynamic-import chunks, and the runtime used by offline
navigation. Audit remote font/CDN dependencies and dynamic resource paths;
bundle required resources locally or report unsupported dependencies before
offering a complete offline installation. Do not infer completeness from only
exercises.json and concepts.json.

Use immutable versioned paths for published resources. Stable logical URLs are
resolved through the installed manifest. Shared /media/ paths must resolve to
the selected book release, including figure scripts with absolute media URLs.
Hash verification checks downloaded bytes before marking a resource complete.
Reject inventories that escape allowed paths/origins or contain conflicting
logical URLs. Hashes detect corruption; they are not a substitute for a trusted
publication origin.

Publishing requirement: retain immutable artifacts needed by available releases.
A fresh static build does not automatically retain earlier deploy output. Add a
documented build/release-archive input or equivalent static artifact retention
step. At minimum retain current and previous published releases initially.
Do not deploy or provision new hosting as part of this coding task. Report the
retention requirement and provide reproducible local release fixtures.

Set hosting headers on actual served artifacts: immutable cache headers for
versioned files; revalidation for latest catalogs, stable entry HTML, and the
worker script. Astro Response headers alone are not sufficient evidence for a
static deployment; generate/verify Cloudflare _headers as appropriate.

Acceptance: builds A and B with unchanged content have identical book release
IDs; changing one physics section changes physics only and identifies that
section. Every inventoried artifact exists and passes its digest check.

## Milestone 3 — Reliable downloads and installation records

Installation states: absent, downloading, interrupted/failed, ready; an existing
ready release can independently have an update downloading. Track installed and
available release IDs separately so checking for updates never alters readiness.

- Download into a staging cache with bounded concurrency and byte/file progress.
- Check storage estimates up front as advisory; handle actual quota failures.
- Request navigator.storage.persist() after the user's offline-download action.
  Denial does not fail installation. Explain protection accurately and offer
  export for reader data regardless of the grant.
- Verify all required files, then commit the active installation pointer in an
  IndexedDB transaction. Readers never use staging data.
- Persist completed-resource bookkeeping so an interrupted download can resume
  without restarting verified files. Serialize operations per book across tabs.
- Cancellation/failure of an update leaves the prior ready release usable.
- Detect missing/evicted cached files; mark the installation incomplete and
  offer repair. Offline, report the missing resource clearly.
- Remove download deletes book files only, preserving personal records and the
  library entry. Only reclaim shared resources when nothing still needs them.

UI: expose Download for offline use, progress/cancel/retry, Available offline,
size, and Remove download in the library. Persist enough book title/manifest
metadata to populate the library while offline. Distinguish offline from a
server error; navigator.onLine is only a hint, not proof a request will work.

## Milestone 4 — Offline opening and consistent version selection

Register a service worker in production/preview builds over HTTPS or localhost;
do not cache normal development-server responses. Browser tests must use built
preview output. Cache the app entry/offline library screen as well as book data.

This is the highest-risk integration point. Resolve it explicitly before calling
the feature complete:

- Opening an installed book serves its matching saved page/boot data and its
  dependency inventory. Do not combine new server HTML with old installed JSON.
- Pin each live client to its selected book/runtime snapshot. A newer active
  installation must not redirect a running client's resource requests into a
  different release. Full navigation can select the new installed release.
- Make logical URL resolution book/release-aware for documents, media, JSON,
  scripts, CSS, fonts, and imported modules. Account for root-relative URLs and
  CSS/JS dependencies, not just explicit fetch() calls. Test two tabs on different
  releases. Introduce version-scoped URLs where client pinning is insufficient.
- Do not force worker takeover/reload while a reader is answering exercises.
  Keep the old worker/runtime resources until existing clients no longer need
  them. Never use blanket cache deletion on worker activation.
- For installed books, local resources win even while online. A request to check
  the latest catalog explicitly goes to the network and cannot be answered by
  the installed catalog cache. Offline failure retains last-known metadata and
  says when the last successful check occurred.
- Online books can still be browsed without installation. Do not label opportunistic
  HTTP caching as a complete installation. The first milestone need not build a
  second persistent partial-book cache.
- Offline unknown routes show a useful offline library/download-needed screen,
  not unrelated HTML returned for a JSON or script request.

Adapt registry, practice, search, sheets, explorer loading, and page boot paths
to the selected release. Keep their useful in-memory caches but key/invalidate
them by release. Do not erase reader state when invalidating content caches.

Acceptance: after a verified download and browser restart, offline direct URL
navigation and app-root navigation both work. Reading, figures, sheets, search,
exercise selection/answers, progress accordions, overrides, notes, and colors
work without requiring network access.

## Milestone 5 — Visible, explicit textbook updates

- Check the small latest catalog on app opening when the last successful check
  is older than 24 hours, plus a manual Check for updates action. Use shared
  in-flight requests. Do not require a background worker that runs continuously.
- Show installed/available release dates, last check time, Update available,
  View changes, and Update. Network errors must not say Up to date.
- Show authored release notes when provided. Otherwise report deterministic
  added/changed/removed sections and resources. Do not invent semantic summaries
  such as "corrected solutions" solely from a changed file hash.
- Install updates through the same verified staging process. Existing clients
  continue using their previous snapshot; offer reopening when ready.
- Keep at least the previous installed release for rollback until no active
  client/session requires it; track references before reclaiming resources.
- Record book release provenance for newly created attempts and saved practice
  sessions. Existing records remain readable with unknown legacy provenance.
  Resuming a session uses its original content, or clearly explains why it needs
  that release. Never silently swap in changed questions/answers.
- Preserve canonical concept/exercise IDs, overrides, and attempt history.
  Show "Updated since your last visit" on changed sections, using local last-seen
  release data. Keep unresolved highlights/notes and surface their lost anchors.
- Verify whether availability-driven mastery recomputation changes progress
  after updates. Preserve earned mastery according to exercises-curriculum.md;
  do not let downloading new exercises unexpectedly erase achievements.

Acceptance: release B can be discovered without changing installed A. Failed B
installation leaves A intact. Successful B installation takes effect safely,
shows changes, preserves reader data, and keeps A sessions coherent.

## Verification and delivery

Add focused pure tests for release hashing/diffs, manifest validation, install
state transitions, backup validation/migrations, and release-aware provenance.
Use small two-book/two-release fixtures for browser integration tests, including:

1. Fresh online use and existing practice smoke test remain functional.
2. Download, restart the same browser profile, disable network, open a deep link.
3. Exercise the offline feature list from Milestone 4 and persist an answer/note.
4. Cancel, interrupt, corrupt a resource, simulate quota failure, retry/repair.
5. Discover and install B while another tab and a saved session still use A.
6. Offline/failed update checks preserve installed data and accurate status.
7. Remove one book without breaking shared dependencies used by another.
8. Export all reader data; clear site data; import into an empty profile. Verify
   profile restoration and that books correctly require reinstallation.
9. Invalid/future-version import and interrupted restoration leave recoverable
   reader data. Test competing tabs during import/install.
10. Test persistence denied and unsupported storage APIs with useful fallback UI.

Run npm test, npm run check, npm run build, the existing practice browser check,
and the new production-preview offline tests. Inspect narrow and wide layouts.
Do not claim offline support based on a warm tab or mocked fetch alone.

Deliver in milestone-sized changes with a brief record of validation and any
hosting prerequisite. Update README.md and relevant app docs to distinguish
current functionality from future Electron support. Do not deploy automatically.

## Later Electron implementation (design constraint, not current work)

Reuse release manifests, validation, update comparisons, backup formats, and
installation state transitions. Implement storage with a managed library folder,
staging directories, an installation index, and a constrained custom protocol.
Keep books outside the application binary directory. App updates and book updates
have independent lifecycles. Use ordinary durable files/database records for
reader data; Chrome's browsing-data deletion must have no effect on desktop data.
Do not require an account or sync service to export, import, install, or update.

Portable full-book archive export/import can be a later feature. The current
backup contains reader-owned data and book references, not textbook binaries.
