/* A push or a pull carried out: the files moved a few at a time, each one's
   progress reported as it goes. Takes the fetch it calls GitHub through. */
import { GitHubError, blobSha, commitChanges, readBlob, readHead, readTree, seedEmpty, writeBlob, type Fetch, type GitSha, type Head, type Remote, type RemoteEntry } from './github';
import { MANIFEST, fromRepo, parseManifest, type Manifest, type RepoFile, type RepoPath } from './layout';
import { pushChanges, pullFiles, tooLarge, type Row, type Selection, type Status } from './plan';
import type { ReaderBackup } from '../backup/schema';

export type Survey = { readonly head: Head; readonly remote: readonly RemoteEntry[]; readonly manifest: Manifest | null };
export type Report = (path: RepoPath, status: Status) => void;
export type HashedFile = RepoFile & { readonly sha: GitSha };

const AT_ONCE = 3;
const failure = (e: unknown): string => e instanceof Error ? e.message : 'Failed.';

const pool = async <T>(items: readonly T[], n: number, f: (item: T) => Promise<void>): Promise<void> => {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(n, queue.length) }, async () => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) await f(item);
  }));
};

export const hashed = async (files: readonly RepoFile[]): Promise<readonly HashedFile[]> =>
  Promise.all(files.map(async (f) => ({ ...f, sha: await blobSha(f.bytes) })));

export const survey = async (remote: Remote, f: Fetch): Promise<Survey> => {
  const head = await readHead(remote, f);
  if (head.kind !== 'at') return { head, remote: [], manifest: null };
  const entries = await readTree(remote, f, head.tree);
  const top = entries.find((e) => e.path === MANIFEST);
  const manifest = top ? await readBlob(remote, f, top.sha).then(parseManifest).catch(() => null) : null;
  return { head, remote: entries, manifest };
};

/* Sends the chosen files and commits them on top of the surveyed head. A file
   that fails keeps the branch's copy; the manifest failing stops the push. */
export const push = async (remote: Remote, f: Fetch, seen: Survey, local: readonly HashedFile[], rows: readonly Row[], sel: Selection, report: Report): Promise<GitSha> => {
  const manifest = local.find((x) => x.path === MANIFEST);
  if (!manifest) throw new Error('Nothing to push.');
  const head = seen.head.kind === 'empty' ? await seedEmpty(remote, f, MANIFEST, manifest.bytes) : seen.head;
  const bytes = new Map(local.map((x) => [x.path, x.bytes] as const));
  const sent = new Map<RepoPath, GitSha>();
  const chosen = rows.filter((r) => sel.has(r.path));
  chosen.forEach((r) => report(r.path, r.same ? { kind: 'same' } : tooLarge(r.size) ? { kind: 'failed', why: 'Over GitHub’s 100 MB limit.' } : { kind: 'waiting' }));
  chosen.filter((r) => r.same).forEach((r) => sent.set(r.path, r.sha));
  await pool(chosen.filter((r) => !r.same && !tooLarge(r.size)), AT_ONCE, async (r) => {
    report(r.path, { kind: 'moving' });
    try { sent.set(r.path, await writeBlob(remote, f, bytes.get(r.path) ?? new Uint8Array())); report(r.path, { kind: 'done' }); }
    catch (e) { report(r.path, { kind: 'failed', why: failure(e) }); if (e instanceof GitHubError && e.status === 401) throw e; }
  });
  if (!sent.has(MANIFEST)) throw new Error('omnistax.json didn’t reach GitHub, so nothing was committed.');
  const changes = pushChanges(local.map((x) => x.path), sent, seen.remote);
  if (changes.length === 0 && head.kind === 'at') return head.commit;
  return commitChanges(remote, f, head, changes, 'Push from OmniStax');
};

/* Fetches the chosen files and builds the profile they describe, keeping this
   device's copy of what was left unticked. Any file failing stops the pull
   before anything here is changed. */
export const pull = async (remote: Remote, f: Fetch, rows: readonly Row[], sel: Selection, local: ReadonlyMap<RepoPath, Uint8Array>, report: Report): Promise<ReaderBackup> => {
  const fetched = new Map<RepoPath, Uint8Array>();
  const chosen = rows.filter((r) => sel.has(r.path));
  chosen.forEach((r) => report(r.path, r.same && local.has(r.path) ? { kind: 'same' } : { kind: 'waiting' }));
  let failed = 0;
  await pool(chosen.filter((r) => !(r.same && local.has(r.path))), AT_ONCE, async (r) => {
    report(r.path, { kind: 'moving' });
    try { fetched.set(r.path, await readBlob(remote, f, r.sha)); report(r.path, { kind: 'done' }); }
    catch (e) { failed++; report(r.path, { kind: 'failed', why: failure(e) }); }
  });
  if (failed) throw new Error(failed === 1 ? 'A file didn’t arrive. Nothing here was changed.' : `${failed} files didn’t arrive. Nothing here was changed.`);
  return fromRepo(pullFiles(rows, sel, fetched, local));
};
