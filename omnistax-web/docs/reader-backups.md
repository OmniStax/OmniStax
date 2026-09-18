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
| Appearance and reading | `omnistax-cc`, `omnistax-theme`, `omnistax-anim`, `omnistax-exmode`, `omnistax-voice`, `omnistax-underlines`, `omnistax-map-progress`, `omnistax-zoom`, `omnistax-zoom-keys`, `omnistax-folded`, `omnistax-hidden-figs`, `omnistax-seen-releases-v1` |
| Keyboard | `omnistax-keys` |
| Practice | `omnistax-practice-v1`, `omnistax-practice-v2`, the corresponding `pages` and `sessions` v1/v2 records |
| Library | `omnistax-library-v1`, `omnistax-explorer-v1` |
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

Backups are limited to 50 MB. Oversized files are rejected before reading their
contents. Browser regression tests cover a fresh-profile import, pasted images,
cross-tab refusal, a quota failure during replacement, and interrupted-restore
recovery. Import previews remain plain immutable records so the restore journal
can store them with IndexedDB's structured-clone algorithm.
