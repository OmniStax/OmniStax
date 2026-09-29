# Storage size (#31)

## Where "about 10 GB" comes from

Settings → Storage reads `navigator.storage.estimate()`. Its `quota` is the browser's allowance for this origin (localStorage, IndexedDB, Cache Storage together). It is not an IndexedDB default and OmniStax sets no limit of its own. The number depends on the browser, the disk and its free space, so it differs between machines.

## How browsers set it

| browser | quota per origin | eviction |
| --- | --- | --- |
| Chrome, Edge (Chromium) | up to about 60% of total disk; the browser as a whole may use up to about 80% | best-effort data goes first, least recently used origin first, when the disk runs low; persisted data is kept |
| Firefox | best-effort: about 10% of disk (group limit capped at 10 GB); persistent: up to 50% of disk (capped at 8 TB) | best-effort evicted under pressure, least recently used first |
| Safari (17 and later) | about 60% of disk for a browser app, about 15% for an embedded web view; home-screen web apps as a browser app | clears script-written data after 7 days without a visit unless the site is a home-screen app |

Older Safari (16 and earlier) allowed about 1 GB and then asked the user for more; recent versions no longer prompt. The exact Safari figures have changed across releases and are the least certain here. Chromium's numbers are its documented policy; the estimate may be rounded or padded to hide fingerprinting detail.

## What the app can and cannot do

- It cannot raise the quota. No API asks for more space.
- It can ask for persistence (`navigator.storage.persist()`), which protects data from eviction; it does not enlarge the quota except in Firefox, where persistent origins get the larger limit.

## What a reader can do

- Install OmniStax as an app, or bookmark it; Chromium grants persistence more readily then, and Safari stops the 7-day clearing.
- Press "Keep my data" in Settings → Storage to ask for persistence.
- Free disk space: Chromium and Firefox scale the quota with the disk.
- Export a backup, then remove large imported files.
