/* The files a pull holds back. Every file the repo changed and this device
   did not is checked before it comes down; one that passes comes down with the
   rest, and one that fails waits for the reader instead of being taken or
   dropped. It fails when this version cannot read it (a newer version
   probably wrote it, or it is damaged), or when it would undo an edit made
   here: something in it was last touched before this device's copy of the
   same thing was.

   Only `updated` stamps are compared, which only ever go forward. Nothing a
   number that falls on its own is held for: mastery and freshness decay, a
   streak breaks, a timer runs down, and the practice record keeps the attempts
   they are worked out from rather than the numbers themselves.

   The base does not move for a held file, so it is offered again rather than
   overwritten; the reader takes the repo's copy (when this version can use
   it), keeps this device's, or leaves it for later. Pure. */
import type { GitSha } from './github';
import { fileIssue, type RepoPath, type SyncGroup } from './layout';
import type { Change, Plan } from './plan';

export type Reason = 'newer' | 'unreadable' | 'older';
export type Hold = { readonly reason: Reason; readonly why: string };
/* A held file as the queue keeps it: what it is, why it was held, the two
   versions it was held between, and what the reader chose. */
export type Held = Hold & {
  readonly path: RepoPath; readonly label: string; readonly group: SyncGroup;
  readonly local: GitSha | null; readonly remote: GitSha;
  readonly pick: 'mine' | 'theirs' | null; readonly seen: boolean;
};
export type Found = Hold & { readonly path: RepoPath; readonly local: GitSha | null; readonly remote: GitSha };

/* Only a copy this version reads can be taken; one it cannot is kept for a
   version that can. */
export const takeable = (h: Hold): boolean => h.reason === 'older';

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const idOf = (v: unknown): string | null => (isObject(v) && typeof v.id === 'string' ? v.id : null);

/* Whether something in `here` was touched later than the same thing in
   `there`: the file itself, a key of an object, an item of a list by its id. */
export const newerHere = (here: unknown, there: unknown): boolean => {
  if (Array.isArray(here) && Array.isArray(there)) {
    const theirs = new Map(there.flatMap((v) => { const id = idOf(v); return id === null ? [] : [[id, v] as const]; }));
    return here.some((v) => { const id = idOf(v); return id !== null && theirs.has(id) && newerHere(v, theirs.get(id)); });
  }
  if (!isObject(here) || !isObject(there)) return false;
  if (typeof here.updated === 'number' && typeof there.updated === 'number' && here.updated > there.updated) return true;
  return Object.keys(here).some((k) => Object.hasOwn(there, k) && newerHere(here[k], there[k]));
};

const decoder = new TextDecoder();
const json = (b: Uint8Array): unknown => { try { return JSON.parse(decoder.decode(b)); } catch { return undefined; } };

/* Why a file the repo changed should wait rather than come down, or null.
   `mine` is this device's copy, null where it has none. */
export const holdOf = (path: RepoPath, mine: Uint8Array | null, theirs: Uint8Array): Hold | null => {
  const issue = fileIssue(path, theirs);
  if (issue) return { reason: issue.newer ? 'newer' : 'unreadable', why: issue.why };
  if (mine && path.endsWith('.json') && newerHere(json(mine), json(theirs))) return { reason: 'older', why: '' };
  return null;
};

/* A held file counts only for the two versions it was held between: once
   either side changes it again it is checked afresh as what it now is. */
const holds = (h: Held | undefined, c: Change): h is Held => h !== undefined && h.local === c.local && h.remote === c.remote;

/* The queue after a look at the repo: what the check found now, each file
   that was already held keeping the reader's choice. A file no longer held
   (taken, kept, changed again, or the same on both sides now) leaves. */
export const reconcile = (queue: readonly Held[], found: readonly Found[], changes: readonly Change[]): Held[] => {
  const was = new Map(queue.map((h) => [h.path, h] as const));
  const byPath = new Map(changes.map((c) => [c.path, c] as const));
  return found.flatMap((f): Held[] => {
    const c = byPath.get(f.path);
    if (!c || c.side !== 'down') return [];
    const before = was.get(f.path);
    const same = holds(before, c) && before.reason === f.reason;
    return [{ ...f, label: c.label, group: c.group, pick: same ? before.pick : null, seen: same ? before.seen : false }];
  });
};

/* A plan with the held files taken out, except where the reader chose: the
   repo's copy comes down, or this device's goes up in its place. A copy this
   version cannot read is never pushed over, so keeping this device's leaves
   both where they are. */
export const withHeld = (plan: Plan, changes: readonly Change[], queue: readonly Held[]): Plan => {
  const by = new Map(queue.map((h) => [h.path, h] as const));
  const held = (c: Change): Held | null => { const h = by.get(c.path); return c.side === 'down' && holds(h, c) ? h : null; };
  const down = plan.down.filter((c) => { const h = held(c); return !h || (h.pick === 'theirs' && takeable(h)); });
  const up = changes.filter((c) => { const h = held(c); return h?.pick === 'mine' && takeable(h) && c.local !== null; })
    .map((c): Change => ({ ...c, side: 'up', letter: 'M' }));
  return { ...plan, up: [...plan.up, ...up], down };
};

/* The held files the reader has still to look at, or to choose for. */
export const waiting = (queue: readonly Held[]): readonly Held[] => queue.filter((h) => h.pick === null);
