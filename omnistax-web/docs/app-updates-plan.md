# App updates apart from installed books

Implementation handoff. Status: built 2026-10-06. Builds on
`offline-books.md` and `offline-books-plan.md`; read both first.

## The problem

An installed book's snapshot carries the whole app runtime as well as the book,
and the worker answers from the snapshot before the network, `/` included. A
reader who installs a book keeps that build's UI after every later deploy until
they update the book by hand from Find Textbook.

## Decisions

1. **Online is the live site.** The worker tries the network first for every
   request and falls back to the installed snapshot only when the fetch fails or
   takes longer than 3 seconds.
2. **Offline is the snapshot, unchanged.** A snapshot's app and content come from
   one build, so they always agree. No content-format versioning, no app caches
   apart from books, no migration.
3. **Installed books update themselves.** When the catalog's release or artifact
   differs from an install, the app re-installs in the background. Resources
   whose `sha256` is already in the previous cache are copied from it, not
   fetched, so a deploy that changes only the app downloads only the app.
4. **One notice:** a toast at the foot of the window, in the `DragToast` /
   `ImportToast` stack: "OmniStax was updated." [Reload]. The page keeps the
   `artifactId` from its first catalog fetch; a later check that returns another
   one shows the toast. No build-time version is baked in.
5. **Checks run on startup, on window focus and on the `online` event**,
   throttled to one per 10 minutes, so a PWA window left open for days sees a
   deploy. The 24-hour throttle goes.

## Changes

- `public/sw.js` `fetch`: `fetch(request)` first with a 3-second timeout; the
  existing pinned-snapshot lookup runs only on failure. `/` no longer answers
  with the first install's snapshot.
- `src/lib/offline/service.ts` `installRelease`: before fetching a resource, look
  for the same `sha256` in the install's current cache and copy it.
- `src/lib/offline/store.svelte.ts`: the focus/online/startup check; after it,
  `install` every book whose release or artifact differs; the first-seen
  `artifactId` and an `appUpdated` flag.
- `src/components/ui/UpdateToast.svelte`, mounted in `Shell.svelte` beside the
  other toasts.
- `offline-books.md`: the worker is network first; installs refresh themselves.

## Known ceilings

- A page loaded online that goes offline mid-session may ask for a lazy chunk
  its snapshot does not hold (different hashes) and get the 503; a reload
  offline opens the snapshot. Precache the live app if that bites.
- Offline UI is as new as the last finished background install.
- Books re-download changed content on every release without asking. If readers
  on metered data matter, put a prompt in front of large downloads.
- An install still refuses while a tab or saved practice session uses the older
  release; the next check retries.

## Validation

`npm run check`, `npm test`, `npm run build`, and `tests/offline-browser-check.py`
with two published builds:

- an app-only change: an installed book shows the new UI online, an open tab gets
  the reload toast, the background install fetches only changed files, and an
  offline cold start afterwards shows the new UI;
- a content change: the book re-installs on its own and the changed sections carry
  "Updated";
- offline before the background install finishes: the old snapshot opens whole.

Builds run one at a time; this machine has 7 GB of RAM.
