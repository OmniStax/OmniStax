# Reader backups

OmniStax Settings can export and replace a reader profile as a versioned JSON
file. The file contains reader-owned data, not textbook files. Clearing browser
site data removes downloaded books and reader data; a backup saved outside the
browser survives. After importing on another device, referenced textbooks must
be added or downloaded separately.

## Version 1 inventory

Only these owned records are exported. Other origin storage is deliberately
excluded.

| Category | Storage records |
| --- | --- |
| Appearance and reading | `omnistax-theme`, `omnistax-lang` (the reader's language, `en` or `zh-CN`; absent, the browser's), `omnistax-anim`, `omnistax-exmode`, `omnistax-voice`, every `omnistax-highlights-<book>` record, `omnistax-map-progress`, `omnistax-zoom`, `omnistax-zoom-keys`, `omnistax-folded`, `omnistax-hidden-figs`, `omnistax-seen-releases-v2` (and the older `-v1`) |
| Keyboard | `omnistax-keys` |
| Practice | `omnistax-practice-v1`, `omnistax-practice-v2`, the corresponding `pages` and `sessions` v1/v2 records |
| Library | `omnistax-library-v1`, `omnistax-explorer-v1`, `omnistax-auto-update-v1` |
| Notes | `omnistax-notedocs-v1`, every `omnistax-notes-<book>` record, and pasted note images from the `omnistax-assets` IndexedDB |
| Colours | every `omnistax-colours-<book>` record |
| Workspace | `omnistax-layout-v5`, `omnistax-scope`, `omnistax-scope-v2` |

The exporter scans all matching per-book records, not only the currently open
book. Legacy records are preserved so an older profile can round-trip. Runtime
caches, installed book resources and installation metadata are intentionally
excluded.

Imports are replace-only. The complete document and each known record are
validated before changes begin. Each live reader tab holds a shared Web Lock;
import requires an exclusive lock and asks the reader to close other tabs when
that cannot be obtained. A restore journal in `omnistax-reader-restore` keeps
the before and after localStorage records and note images. Startup finishes or
rolls back an interrupted restore before importing the modules that initialize
reader stores. Browsers without IndexedDB/Web Locks can still read and export,
but refuse unsafe import.

### A record that cannot be read

The whole file is refused only when it is not a backup at all (not JSON, wrong
format or version, a duplicated key) or when a chat, drawing, scratch page,
generated exercise or imported file in it is malformed: those are replaced
whole, so leaving one out would delete it. The refusal names where the problem
is (`chats.0.messages.m1.state: Invalid enum value…`).

A reader record is validated on its own (`recordProblem` in
`src/lib/backup/schema.ts`). One this version cannot read — a key it does not
know, a JSON key whose value is not JSON, a value of the wrong shape — is set
aside with its key and the reason, the preview lists it, and the restore
writes this device's own value for that key back with the rest
(`keptRecords`), so nothing is overwritten with what could not be read and
nothing the device holds is dropped for it. A record's `category` is derived
from its key and is not checked, so a file written when a key stood in another
category still restores.

This replaces a rule that refused the whole profile for one bad record, with
the message "This is not a valid OmniStax backup: invalid reader record." The
schema had fallen behind the practice store (`settings.stopwatch`, exercise
picks, a round's exclusions, the review and sessions faces, a slot's concept,
a finished round's `after`), so every profile that had practised once was
refused, on import and on every sync pull, since a pull reads this device's own
records too. The practice store's readers now live in the pure
`src/lib/practice/stored.ts`, and `tests/backup.test.ts` checks that what they
write passes the backup's schema.

Backups are limited to 50 MB. Oversized files are rejected before reading their
contents. Browser regression tests cover a fresh-profile import, pasted images,
cross-tab refusal, a quota failure during replacement, and interrupted-restore
recovery. Import previews remain plain immutable records so the restore journal
can store them with IndexedDB's structured-clone algorithm.

## GitHub sync

Sync (`src/lib/sync/`) keeps the same profile in a GitHub repo of the reader's
own, as files a person can read, and moves only what differs.

### The repo's layout (manifest version 2)

| Path | Holds |
| --- | --- |
| `omnistax.json` | the manifest: `format: "omnistax-sync"`, `version: 2`, the books, the imported files' and images' metadata, the labels of the other files |
| `records/<key>.json` | one reader record, its key URL-encoded: the JSON value itself (`["college-physics-2e"]`), a setting's string as a JSON string (`"dark"`) |
| `chats/<id>.json`, `drawings/<id>.json`, `scratch/<key>.json`, `generated/<id>.json` | one each |
| `files/<id>.<ext>`, `images/<id>.<ext>` | the bytes |

A record's category is not in its path, so a key a later version files under
another category keeps its file. A record file whose key this version does not
know (a newer version's) is never pulled, never deleted and never shown: it
stays in the repo for the version that knows it.

Version 1 kept every record of a category in one file
(`records/<category>.json`), so two devices that touched any two records of a
category — the practice log on one, a practice setting on the other — were one
conflict. A version-1 repo is still read: the survey takes each category file
apart into the record files it stands for (`explode`, byte for byte what
`toRepo` writes) and compares those, and it takes apart the category files of
the last agreed base the same way, so each record is compared with its own last
agreed version from the first sync on. The next push writes every record as its
own file (the changed ones from this device, the rest as the repo had them),
deletes the category files and writes a version-2 manifest, in one commit.
Where a record has its own file and a category file still holds it, its own
file wins.

A version that knows only manifest version 1 refuses a version-2 manifest
("The repo’s omnistax.json isn’t one this version can read") rather than
misreading the repo, so every device should be updated before syncing on the
new version. An old version can still push; its category files are read again,
for keys that have no file of their own.

### Which way each file moves

The base is each file's blob sha as this device and the repo last agreed on it
(`omnistax-sync-v1`). A file only this device changed since the base goes up;
one only the repo changed comes down; one both changed is merged. A file
deleted on one side and unchanged on the other is deleted on the other; deleted
on one and changed on the other is a conflict of the whole file. After a sync
the base takes every file both sides now hold alike and forgets every file
both lack (`rebase`).

### Merging a file changed on both sides

The last agreed version is fetched by its sha (the repo's history keeps it) and
the three are merged by shape (`merge.ts`): an object key by key; a list of
things with an `id` (notes, marks, the explorer's rows, a drawing's strokes,
a chat's messages are an object by id) item by item, by id; a list of strings
as a set; a list both sides only appended to (attempts, rounds, focus
sessions) as one log with both sides' entries. A change only one side made is
taken, the same change made on both is taken once, a key or item one side
deleted and the other left alone is deleted, and an `updated` time both
touched takes the later. Only a leaf both sides changed differently, or an item
one side deleted and the other changed, conflicts. Without a base (it could not
be fetched) the merge is two-way: what only one side holds is kept.

A file that merges clean, and whose merge passes the file's check, is chosen
for the sync as the merge (`Merged`, `auto`): it goes up and comes down, so
both sides end holding it, and the timer's sync carries it too. Only a file
with conflicts waits for the reader.

### Settling conflicts

The merge is rendered twice, every conflict taken this device's way and every
conflict taken the repo's way; the lines in which the two texts differ are
exactly the conflicts (`conflict.ts`). The diff tab shows the file whole, each
conflict as this device's lines over the repo's with Accept this device's,
Accept the repo's, Accept both and Compare above it, a counter ("Conflict 2 of
5") with previous and next, and the result's state below. A choice can be
undone, and the result can be edited by hand. It is used only once every
conflict is settled and it reads as the file should: JSON, no key named twice
(`JSON.parse` would silently keep the later), and what the file holds (the
record's schema, a chat, a drawing). The settled file is a `Merged` pick: its
bytes travel with the plan, go up in the sync's commit and are imported here.
Keeping one side whole stays one click away, in the tab and in the list. A
pull alone or a push alone leaves merges out, since they go both ways.

### A file this version cannot read

Every file that comes down is checked first (`fileProblem`). One that fails is
not taken: its row says why, this device keeps its own, and since the base does
not move for it, it is offered again — and never pushed over — until a version
that reads it syncs.
