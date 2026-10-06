/* What differs between this device and the repo, and which way each file
   moves. Each side is compared with the base: the blob both last agreed on,
   per file. A file only this device changed goes up, one only the repo changed
   comes down, and one changed on both waits for the reader to choose. Files
   both sides hold the same never show. Pure. */
import { GITHUB_MAX_BYTES, type GitSha, type RemoteEntry } from './github';
import { GROUPS, MANIFEST, filePath, groupOf, imagePath, labelOf, type Manifest, type RepoFile, type RepoPath, type SyncGroup } from './layout';

export type Base = Readonly<Record<RepoPath, GitSha>>;
export type Side = 'up' | 'down' | 'both';
export type Letter = 'A' | 'M' | 'D' | '!';
export type Change = {
  readonly path: RepoPath; readonly group: SyncGroup; readonly label: string; readonly side: Side; readonly letter: Letter;
  readonly local: GitSha | null; readonly remote: GitSha | null; readonly size: number;
};
export type Pick = 'mine' | 'theirs';
export type Picks = ReadonlyMap<RepoPath, Pick>;
/* The files to send and to fetch. Whatever is in neither keeps its place. */
export type Plan = { readonly up: readonly Change[]; readonly down: readonly Change[] };
export type Origin = 'local' | 'remote';

export type Status =
  | { readonly kind: 'waiting' }
  | { readonly kind: 'moving' }
  | { readonly kind: 'done' }
  | { readonly kind: 'failed'; readonly why: string };

export const tooLarge = (size: number): boolean => size > GITHUB_MAX_BYTES;

const letterOf = (mine: GitSha | null, base: GitSha | null): Letter => (mine === null ? 'D' : base === null ? 'A' : 'M');

export const changesOf = (local: readonly (RepoFile & { readonly sha: GitSha })[], remote: readonly RemoteEntry[], base: Base, manifest: Manifest | null): readonly Change[] => {
  const here = new Map(local.map((f) => [f.path, f] as const));
  const there = new Map(remote.map((e) => [e.path, e] as const));
  return [...new Set([...here.keys(), ...there.keys()])].flatMap((path): Change[] => {
    const group = groupOf(path);
    if (group === null || path === MANIFEST) return [];
    const l = here.get(path), r = there.get(path);
    const ls = l?.sha ?? null, rs = r?.sha ?? null, bs = base[path] ?? null;
    if (ls === rs) return [];
    const side: Side = ls === bs ? 'down' : rs === bs ? 'up' : 'both';
    const letter = side === 'up' ? letterOf(ls, bs) : side === 'down' ? letterOf(rs, bs) : '!';
    return [{ path, group, label: l?.label ?? labelOf(path, manifest), side, letter, local: ls, remote: rs, size: l?.bytes.length ?? r?.size ?? 0 }];
  }).sort((a, b) => GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group) || a.label.localeCompare(b.label));
};

const sendable = (c: Change): boolean => c.local === null || !tooLarge(c.size);

export const planOf = (changes: readonly Change[], picks: Picks): Plan => ({
  up: changes.filter((c) => (c.side === 'up' || (c.side === 'both' && picks.get(c.path) === 'mine')) && sendable(c)),
  down: changes.filter((c) => c.side === 'down' || (c.side === 'both' && picks.get(c.path) === 'theirs')),
});
/* Every difference settled one way: the repo made this device, or this device made the repo. */
export const overwrite = (changes: readonly Change[], to: 'device' | 'repo'): Plan =>
  to === 'device' ? { up: [], down: changes } : { up: changes.filter(sendable), down: [] };

/* Where each file of one side's tree comes from once a plan's changes land on it. */
export const originsAfter = (paths: Iterable<RepoPath>, own: Origin, moved: readonly Change[], other: Origin): ReadonlyMap<RepoPath, Origin> => {
  const out = new Map<RepoPath, Origin>([...paths].map((p) => [p, own] as const));
  for (const c of moved) { if ((other === 'local' ? c.local : c.remote) === null) out.delete(c.path); else out.set(c.path, other); }
  return out;
};

/* The manifest of a tree whose files come from either side: each listed file,
   image and label is the one of the side its file came from. */
export const manifestOf = (origins: ReadonlyMap<RepoPath, Origin>, local: Manifest, remote: Manifest | null, exportedAt: string): Manifest => {
  const paths = [...origins.keys()].sort();
  const sides = (p: RepoPath): readonly (Manifest | null)[] => (origins.get(p) === 'remote' ? [remote, local] : [local, remote]);
  const entry = <T>(of: (m: Manifest) => readonly T[], pathOf: (t: T) => RepoPath) => (p: RepoPath): T[] => {
    const hit = sides(p).map((m) => m && of(m).find((t) => pathOf(t) === p)).find((t) => t !== undefined && t !== null);
    return hit ? [hit] : [];
  };
  return {
    format: 'omnistax-sync', version: 1, exportedAt,
    books: [...new Map([...(remote?.books ?? []), ...local.books].map((b) => [b.id, b] as const)).values()],
    files: paths.filter((p) => p.startsWith('files/')).flatMap(entry((m) => m.files, (f) => filePath(f.id, f.mime))),
    images: paths.filter((p) => p.startsWith('images/')).flatMap(entry((m) => m.images, (i) => imagePath(i.id, i.type))),
    labels: Object.fromEntries(paths.flatMap((p) => { const l = sides(p).map((m) => m?.labels[p]).find(Boolean); return l ? [[p, l]] : []; })),
  };
};

/* The base after a sync: every file both sides now hold the same is agreed;
   a file both lack is forgotten; the rest keep what they last agreed on. */
export const rebase = (base: Base, local: ReadonlyMap<RepoPath, GitSha>, remote: ReadonlyMap<RepoPath, GitSha>): Base => {
  const out: Record<RepoPath, GitSha> = { ...base };
  for (const p of new Set([...Object.keys(base), ...local.keys(), ...remote.keys()])) {
    const l = local.get(p) ?? null;
    if (l !== (remote.get(p) ?? null) || p === MANIFEST) continue;
    if (l) out[p] = l; else delete out[p];
  }
  return out;
};
