/* What a push or a pull will move, and which of it the reader has chosen.
   Pure. */
import { GITHUB_MAX_BYTES, type GitSha, type Head, type RemoteEntry, type TreeChange } from './github';
import { GROUPS, MANIFEST, groupOf, labelOf, type Manifest, type RepoFile, type RepoPath, type SyncGroup } from './layout';

export type Direction = 'push' | 'pull';
/* One file the panel lists: what it is, how large, its blob on the sending
   side, and whether the other side already holds these very bytes. */
export type Row = { readonly path: RepoPath; readonly group: SyncGroup; readonly label: string; readonly size: number; readonly sha: GitSha; readonly same: boolean; readonly required: boolean };
export type Selection = ReadonlySet<RepoPath>;
export type Mark = 'all' | 'some' | 'none';

export type Status =
  | { readonly kind: 'waiting' }
  | { readonly kind: 'moving' }
  | { readonly kind: 'done' }
  | { readonly kind: 'same' }
  | { readonly kind: 'failed'; readonly why: string };

export const tooLarge = (size: number): boolean => size > GITHUB_MAX_BYTES;

const byPath = (a: Row, b: Row): number => GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group) || Number(b.required) - Number(a.required) || a.path.localeCompare(b.path);

export const pushRows = (local: readonly (RepoFile & { readonly sha: GitSha })[], remote: readonly RemoteEntry[]): readonly Row[] => {
  const there = new Map(remote.map((e) => [e.path, e.sha] as const));
  return local.map((f) => ({ path: f.path, group: f.group, label: f.label, size: f.bytes.length, sha: f.sha, same: there.get(f.path) === f.sha, required: f.path === MANIFEST })).sort(byPath);
};

export const pullRows = (remote: readonly RemoteEntry[], manifest: Manifest | null, local: ReadonlyMap<RepoPath, GitSha>): readonly Row[] =>
  remote.flatMap((e): Row[] => {
    const group = groupOf(e.path);
    return group ? [{ path: e.path, group, label: labelOf(e.path, manifest), size: e.size, sha: e.sha, same: local.get(e.path) === e.sha, required: e.path === MANIFEST }] : [];
  }).sort(byPath);

export const selectAll = (rows: readonly Row[]): Selection => new Set(rows.map((r) => r.path));
export const selectNone = (rows: readonly Row[]): Selection => new Set(rows.filter((r) => r.required).map((r) => r.path));
export const setGroup = (sel: Selection, rows: readonly Row[], group: SyncGroup, on: boolean): Selection => {
  const paths = rows.filter((r) => r.group === group && !r.required).map((r) => r.path);
  return on ? new Set([...sel, ...paths]) : new Set([...sel].filter((p) => !paths.includes(p)));
};
export const setFile = (sel: Selection, row: Row, on: boolean): Selection =>
  row.required ? sel : on ? new Set([...sel, row.path]) : new Set([...sel].filter((p) => p !== row.path));
export const groupMark = (sel: Selection, rows: readonly Row[], group: SyncGroup): Mark => {
  const inGroup = rows.filter((r) => r.group === group);
  const on = inGroup.filter((r) => sel.has(r.path)).length;
  return on === 0 ? 'none' : on === inGroup.length ? 'all' : 'some';
};
export const bytesOf = (rows: readonly Row[], sel: Selection): number => rows.reduce((n, r) => n + (sel.has(r.path) ? r.size : 0), 0);

/* Whether the branch has moved since this device last pulled or pushed: a
   push would then replace work it has never seen. */
export const remoteNewer = (head: Head, last: GitSha | null): boolean => head.kind === 'at' && head.commit !== last;

/* The tree changes one push makes. A chosen file the push sent points at its
   blob; a file of the profile's layout that is gone from this device is
   dropped; a file left unticked, or one that failed, keeps whatever the
   branch had. Files outside the layout are never touched. */
export const pushChanges = (local: readonly RepoPath[], sent: ReadonlyMap<RepoPath, GitSha>, remote: readonly RemoteEntry[]): readonly TreeChange[] => {
  const mine = new Set(local);
  const there = new Map(remote.map((e) => [e.path, e.sha] as const));
  const writes = [...sent].filter(([p, sha]) => there.get(p) !== sha).map(([path, sha]) => ({ path, sha }));
  const drops = remote.filter((e) => groupOf(e.path) !== null && !mine.has(e.path)).map((e) => ({ path: e.path, sha: null }));
  return [...writes, ...drops];
};

/* The files a pull assembles the profile from: what was fetched for each
   chosen path, and for a path left unticked, this device's own copy when it
   has one. A path only this device has is gone after the pull. */
export const pullFiles = (rows: readonly Row[], sel: Selection, fetched: ReadonlyMap<RepoPath, Uint8Array>, local: ReadonlyMap<RepoPath, Uint8Array>): ReadonlyMap<RepoPath, Uint8Array> =>
  new Map(rows.flatMap((r): [RepoPath, Uint8Array][] => {
    const bytes = sel.has(r.path) ? fetched.get(r.path) ?? (r.same ? local.get(r.path) : undefined) : local.get(r.path);
    return bytes ? [[r.path, bytes]] : [];
  }));
