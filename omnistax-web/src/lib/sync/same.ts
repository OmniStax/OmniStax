/* A file whose fields only stand in another order is the same file. A chat
   that comes down is read through its schema, which lists its fields in the
   schema's order, and a record is written again by its store in the store's;
   neither changes what the file holds, and both change its bytes, so by its
   blob alone the file would read as changed here the moment it was pulled.

   So beside the base this device keeps, for each agreed blob of JSON, the sha
   of what it holds with every object's keys sorted (`Canon`). A file whose
   bytes differ from the agreed blob and whose sorted form does not is counted
   as that blob still: it is not offered for a push, and a change the repo
   makes to it comes down as a change the repo alone made. Nothing is written
   in the sorted form; it is only compared. Pure. */
import { blobSha, type GitSha } from './github';
import type { RepoPath } from './layout';

export type Canon = Readonly<Record<GitSha, GitSha>>;
type Hashed = { readonly path: RepoPath; readonly bytes: Uint8Array; readonly sha: GitSha };

const decoder = new TextDecoder();
const encoder = new TextEncoder();
const sorted = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(sorted);
  if (typeof v !== 'object' || v === null) return v;
  const o = v as Record<string, unknown>;
  return Object.fromEntries(Object.keys(o).sort().map((k) => [k, sorted(o[k])] as const));
};

export const comparable = (path: RepoPath): boolean => path.endsWith('.json');

/* The sha of what a JSON file holds, whatever order its fields stand in; null for bytes that are not JSON. */
export const canonSha = async (bytes: Uint8Array): Promise<GitSha | null> => {
  let v: unknown;
  try { v = JSON.parse(decoder.decode(bytes)); } catch { return null; }
  return blobSha(encoder.encode(JSON.stringify(sorted(v))));
};

/* What `canon` gains from blobs whose bytes are at hand. */
export const learn = async (blobs: Iterable<readonly [GitSha, Uint8Array]>, canon: Canon = {}): Promise<Canon> => {
  const out: Record<GitSha, GitSha> = {};
  for (const [sha, bytes] of blobs) {
    if (sha in canon || sha in out) continue;
    const c = await canonSha(bytes);
    if (c) out[sha] = c;
  }
  return out;
};

/* This device's files, each one that holds what its agreed blob holds
   standing as that blob. One the repo holds byte for byte (`there`) stays as
   it is: the two already agree. */
export const unmoved = async <T extends Hashed>(files: readonly T[], base: Readonly<Record<RepoPath, GitSha>>, canon: Canon, there: ReadonlyMap<RepoPath, GitSha> = new Map()): Promise<readonly T[]> =>
  Promise.all(files.map(async (f) => {
    const agreed = base[f.path];
    if (!agreed || agreed === f.sha || there.get(f.path) === f.sha || !comparable(f.path)) return f;
    const was = canon[agreed];
    return was && was === await canonSha(f.bytes) ? { ...f, sha: agreed } : f;
  }));

/* The entries still worth keeping: those of the blobs the base names. */
export const pruned = (canon: Canon, base: Readonly<Record<RepoPath, GitSha>>): Canon => {
  const named = new Set<string>(Object.values(base));
  return Object.fromEntries(Object.entries(canon).filter(([sha]) => named.has(sha)));
};
