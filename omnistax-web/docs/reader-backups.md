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
