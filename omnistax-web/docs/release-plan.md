# Releases, desktop and installs

Implementation handoff for issues #47 (release) and #48 (desktop OmniStax).
Status: built 2026-10-24 (steps 1 to 6 below); the repo split (24) is later.
Settled with Chen over one conversation; anything he did not object to is
agreed.

Where the build differs from the decisions:

- The What's new tab holds every note, newest first, not only the unseen ones;
  the unseen are the ones at the top.
- The preload exposes `{ platform }` only; nothing reads a version.
- A Mac reads `latest.yml` for the version, since a dmg-only build may write no
  `latest-mac.yml`; the Mac installer is universal (Intel and Apple silicon).
- Strings that fit both hosts were reworded once ("on this device", "isn't
  available here") rather than branched; only the language hint, the local AI
  help and the retention row branch on the desktop surface.
- The update notice compares the catalog's app artifact only. A page that
  opened offline from the app's copy and then sees a newer catalog shows no
  notice until the next deploy.

Builds on `offline-books.md`, `offline-books-plan.md` and `app-updates-plan.md`;
read those first. Decision 9 reverses one ruling of `app-updates-plan.md`.

## Decisions

### Addresses

1. **`omnistax.org` is the app.** No landing page: an address opens the app on
   that page. The origin holds every reader's data, so it never changes after
   beta. No subdomains.
2. **`omnistax.org/download`** is one static page in the same build. It puts the
   visitor's OS first, then the other two, then a link to GitHub Releases for
   older versions.
3. **`omnistax.org/changelog`** lists every release note, newest first.

### Deploys

4. **Every push to `main` deploys everything**, app and books, as today.
   Cloudflare's build command becomes `npm run check && npm test && npm run build`,
   so a failing check leaves the live site as it was. What slips through is
   undone with `npx wrangler rollback` (or the dashboard's rollback). No dev
   branch until broken pushes become a habit.
5. **Books keep their own release ids** and update on every push, with the
   Updated pill and changes dialog. They never wait for a release note.

### Release notes

6. **A release note is a Markdown file** in `omnistax-web/releases/`. The
   filename is only a name; the front matter carries the data:

   ```markdown
   ---
   version: 2026.11.7.1
   title: Exercises get a review page
   desktop: true        # optional: build desktop installers for this release
   ---
   Markdown body, images from releases/images/.
   ```

   - `version` is `YYYY.MM.DD.MICRO`, MICRO counting releases of that day from 0
     or 1. It is a label, not semver: nothing is gated on it.
   - An Astro content collection checks it with zod: the version pattern
     `^\d{4}\.(1[0-2]|[1-9])\.([1-9]|[12]\d|3[01])\.\d+$`, a non-empty title,
     and no version used twice. A bad file fails the build.
   - A Chinese note is an optional sibling, `<name>.zh-CN.md`, with the same
     front matter except `desktop`; zh-CN readers fall back to the English note.
     The i18n check does not require it.
7. **Readers see "What's new", never "release", for app notes.** "Release"
   stays the word for a book's version on book rows.
8. **When the app starts** it compares `omnistax-seen-notes-v1` with the newest
   note in the build:

   | Reader | Test | Shows |
   |---|---|---|
   | New | no `omnistax-*` key in localStorage | the addressed page, focused, with the About tab open beside it; with no address, About alone. No notes. Seen is set to the newest. |
   | Returning, unseen notes | seen older than newest, or seen missing but other `omnistax-*` keys present | a "What's new" tab, focused, holding every note after seen, newest first; then seen is set to the newest |
   | Returning, nothing new | seen is the newest | nothing |

   "Using it during the update" and "opening it later" are the same case: the
   [Reload] toast reloads, the reload is a start. The toast is unchanged. A
   deploy with no new note shows nothing after the reload. The key is
   registered in `src/lib/backup/schema.ts` so backups and Sync carry it.

### GitHub Releases

9. **`.github/workflows/release.yml`** runs on pushes to `main` that touch
   `omnistax-web/releases/**`:
   - for each note added between `before` and `after`: `gh release create
     <version> --title <title> --notes-file <body>` at that commit;
   - for each note changed: `gh release edit` with the new body;
   - if `omnistax-desktop/**` changed since the last release with installers,
     or the note says `desktop: true`: build the installers on Windows, macOS
     and Linux runners, attach them, and mark the release Latest;
   - every other release is created with `--latest=false`.

   So `github.com/BlastWind/OmniStax/releases/latest/download/<file>` always
   names a release with installers, and the download page links there with
   stable file names: `OmniStax-Setup.exe`, `OmniStax.dmg`, `OmniStax.AppImage`.
   No secrets beyond `GITHUB_TOKEN`.

### Desktop

10. **`omnistax-desktop/`**, beside `omnistax-web/`, is a thin Electron shell: a
    window that loads `https://omnistax.org` (`OMNISTAX_URL` overrides it for
    development). The site's service worker, app cache and book capsules work in
    it as in a browser. Each install keeps its own data; GitHub Sync moves it.
11. **The shell takes every key.** It replaces Electron's default menu so
    Ctrl+W, Ctrl+R, Ctrl+Shift+I and the rest reach the app. On macOS the app
    menu keeps Quit, Hide and the Edit roles, and binds nothing the app uses.
12. **The page knows it is in the shell** through a preload script that exposes
    `window.omnistaxDesktop = { version, platform }` and nothing else
    (`contextIsolation` on, `nodeIntegration` off). `host.svelte.ts` reports a
    fourth surface, `desktop`, and `keptChords` returns nothing for it.
13. **CORS does not apply in the shell.** The main process answers preflights
    and adds `Access-Control-Allow-Origin: https://omnistax.org` to responses
    for HTTPS hosts and for `localhost`/`127.0.0.1`, via
    `session.webRequest.onHeadersReceived`. Private network addresses other than
    loopback get no header. Chat and Sync code does not change; Ollama and LM
    Studio work without `OLLAMA_ORIGINS` or a CORS switch.
14. **Updates.** App and books arrive as on the web: a reload, a background book
    update. The shell itself updates rarely (an Electron bump every two or three
    months, a native feature, a shell bug):
    - Windows (NSIS) and Linux (AppImage): `electron-updater` from GitHub
      Releases, downloaded in the background, installed on restart.
    - macOS, unsigned until Chen buys the Apple account: the shell compares its
      version with the latest GitHub release and shows "A new desktop version is
      available. [Download]", which opens `/download` in the default browser.
15. **The shell's version is hidden semver** derived by the Action from the
    note's version: `2026.11.7.1` becomes `2026.1107.1` in
    `omnistax-desktop/package.json`, since npm and `electron-updater` need three
    parts. Readers see `2026.11.7.1` everywhere.

### Browser wording

16. Strings that assume a browser switch on `host.surface === 'desktop'` (new
    keys, en and zh-CN):

    | Strings | Browser | Desktop |
    |---|---|---|
    | `settings.shortcuts.reserved`, `reservedBy`, `install`, `installButton` | as now, plus "or get the desktop app" linking `/download` | hidden: nothing is reserved |
    | `shell.storage.*`, `settings.storage.retention`, `keep`, `unknown` | as now, the at-risk note links `/download` | the Data retention row goes; Space used stays |
    | `settings.ai.intro`, `views.sync.repoHint`, `settings.saved` | reworded to fit both: "straight from OmniStax on this device", "saved on this device" | same string |
    | `chat.error.cors`, the CORS half of `settings.ai.localHelp` | as now | not shown |
    | `language.setting.hint` | "Follows your browser" | "Follows your system" |
    | `commands.host.*` | "Chrome, in a browser tab" | "OmniStax desktop" |
    | `files.tab.missing` | "OmniStax no longer holds the file…" | same string |
    | `fig.three.noWebgl`, `settings.voice.unsupported` | "this browser" | "this computer" |
    | `shell.backup.noIndexedDb`, `noLocks`, `offline.error.unsupported` | as now | never reached |

17. **Two palette commands** in the App group:
    - "App: Download OmniStax Desktop" opens `/download`; `when` the surface is
      not `desktop`.
    - "App: Install OmniStax in this browser" calls `host.install()`; `when`
      `host.canInstall` (Chromium only, false in a PWA and on desktop).

### Shortcuts across installs

18. **`omnistax-keys-v2` stores only what the reader changed**, as
    `{ commandId: chords[] }`. Each install starts from `defaultBindings(host)`
    and applies the changes on top; a changed chord that this host keeps for
    itself takes its Alt twin when free, else the command's default here (the
    rule `defaultBindings` already uses). Nothing is written on load, so a pull
    never pushes back. The first start after this ships turns an
    `omnistax-keys` map into its changes by comparing it with this host's
    defaults; `omnistax-keys` itself is left alone.

### Books: text-only capsules and one app

19. **A downloaded book holds only its text, data and media**: `book.json`,
    `colours.css`, each section's `doc.html` fragment and `figures.js`, the
    chapter and sheet data, and its media. No app files and no full pages. The
    release path drops the artifact: `/offline/releases/<book>/<releaseId>/`.
20. **The app is the one app cache** the worker already keeps
    (`omnistax-shell:<shellId>`), refreshed on every navigation the network
    answers; `404.html`, the shell that boots on no book and reads the address,
    joins its list. Offline the app works with no book downloaded.
21. **A page of a downloaded book is put together from both.** A navigation into
    a downloaded book answers with the current app's `404.html` (live, else the
    app cache), which reads the address and fetches the fragment; the worker
    answers the book's files from its capsule, at the installed release, or at
    the release the reader chose. Turning "Update automatically" off now freezes
    the text only; every book runs the newest app the reader has loaded. Pins
    keep the book and release and lose the artifact.
22. **This reverses `app-updates-plan.md` decision 2**: app and content now mix
    builds, so a book carries a format. Each manifest gets `format: 1`. The
    contract is the fragment markup, the data JSON shapes and the members of
    the figure library `F` that `figures.js` receives. A change an older capsule
    cannot survive raises the format; the app reads every format from
    `MIN_FORMAT` to the current one and reads only backward (a book is
    downloaded online, where the app is current, so the app is never older than
    a book). A capsule below `MIN_FORMAT` opens on "This saved copy is too old
    for this version of OmniStax. [Update book]".

### Stored data

23. **Never change the format of an existing localStorage key; add a `-vN`
    key.** A tab left open on an older build shares storage with the new one and
    must neither misread nor overwrite the new format. Goes into the
    conventions in `omnistax-web/README.md`.

### One repo per book, before beta

24. **Each book moves to its own repo; images stay in plain git.** Not in this
    session: its own session, before beta, so the history rewrite breaks no
    reader's fork. Of 842 MB of tracked content, 680 MB is media (4,417
    images, about 130 MB a book); the pack is 733 MiB, and one repo would pass
    GitHub's 5 GB guidance near 35 books and its 10 GB limit near 75.
    - Precedent (researched 2026-10-24): OpenStax keeps 55 per-book repos of
      100–718 MB with media in plain git, no LFS, and builds from a list of
      approved books (repo + commit). Standard Ebooks, GITenberg and PreTeXt
      are also one repo per book. Nobody aggregates books with submodules, and
      GitHub's LFS bandwidth (10 GiB a month) ran out for W3C in 2025.
    - Layout: `OmniStax` keeps the app, desktop, shared tools, `RULES.md` and
      `docs/`; each book gets a repo such as
      `omnistax-book-college-physics-2e`. `books.json` in the app repo lists
      each book's repo and branch; the build shallow-clones them, so book
      history never slows a build. A push to a book repo calls a Cloudflare
      deploy hook, so book fixes still go live on every push.
    - Each book leaves with its history via `git filter-repo
      --subdirectory-filter`; the app repo's history is rewritten once to drop
      the content, and everyone re-clones.
    - Day to day: builders check out the app repo and the book repo side by
      side; a change spanning both (a new figure-library member and the book
      using it) is two pushes, app first, under decision 22's format rule.
    - Images move to object storage only for a book whose repo nears 1 GB.

### Parked

- iOS, Android and tablets.
- Signing: macOS ($99/year Apple account, later), Windows certificate.
- Raised but set aside by Chen: data left behind on `workers.dev`, an empty
  first desktop launch, locking the shell's navigation to `omnistax.org`,
  macOS "damaged" refusals of unsigned apps, single-instance lock, a first
  offline launch with nothing cached, the SmartScreen warning.
- Scaling past one deploy: each book built and published apart from the app
  (built output to object storage), and a paged catalog for Find Textbook.
  Triggers: a deploy near Cloudflare's file cap (20k free, 100k paid; 7,898 on
  2026-10-10), a full build over about 20 minutes, or many outside books.
  Decisions 19–22 and 24 are the first half of that path.

## Chen does

- Add `omnistax.org` as the Worker's custom domain; point the README at it.
- Set the Cloudflare build command (decision 4).

## Build order

Each step is committed on its own and leaves `main` deployable.

1. Shortcuts v2 (18), with a test of the migration and the Alt swap.
2. Desktop surface, wording and commands (12 host part, 16, 17).
3. Release notes: collection, `/changelog`, `/download`, the start rule and
   the What's new tab (6–8), with a test of the start rule.
4. Text-only capsules, format and worker (19–22); `offline-browser-check.py`
   extended to a frozen book opened by a newer app, online and offline.
5. `omnistax-desktop/` (10–15) and `release.yml` (9).
6. Conventions (23), and `offline-books.md` and `app-updates-plan.md` updated
   to point here.

The repo split (24) is a later session.

## Validation

`npm run check`, `npm test`, `npm run build`, `tests/offline-browser-check.py`;
the desktop shell launched against `npm run preview` with `OMNISTAX_URL`;
`release.yml` dry-run with `act` or on a throwaway note on a branch.
