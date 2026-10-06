/* A plan carried out: what comes down is fetched first, so a failure there
   changes nothing anywhere; then what goes up is sent and committed on the
   surveyed head as one commit, with a manifest that describes the merged tree;
   then the profile this device should hold is built. Each file's progress is
   reported as it goes. Takes the fetch it calls GitHub through. */
import { blobSha, commitChanges, readBlob, readHead, readTree, seedEmpty, writeBlob, type Fetch, type GitSha, type Head, type Remote, type RemoteEntry } from './github';
import { MANIFEST, fromRepo, groupOf, jsonBytes, parseManifest, type Manifest, type RepoFile, type RepoPath } from './layout';
import { manifestOf, originsAfter, rebase, type Base, type Change, type Plan, type Status } from './plan';
import type { ReaderBackup } from '../backup/schema';

export type Survey = { readonly head: Head; readonly remote: readonly RemoteEntry[]; readonly manifest: Manifest | null };
export type Report = (path: RepoPath, status: Status) => void;
export type HashedFile = RepoFile & { readonly sha: GitSha };
/* What a plan left behind: the branch's commit, the profile to import when
   anything came down, and the base to remember once that import has landed. */
export type Outcome = { readonly commit: GitSha | null; readonly backup: ReaderBackup | null; readonly base: Base };

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

/* Runs every item, reporting each, and fails after all have run if any did. */
const each = async (items: readonly Change[], report: Report, move: (c: Change) => Promise<void>, why: (n: number) => string): Promise<void> => {
  let failed = 0;
  await pool(items, AT_ONCE, async (c) => {
    report(c.path, { kind: 'moving' });
    try { await move(c); report(c.path, { kind: 'done' }); }
    catch (e) { failed++; report(c.path, { kind: 'failed', why: failure(e) }); }
  });
  if (failed) throw new Error(why(failed));
};
const files = (n: number): string => (n === 1 ? 'A file' : `${n} files`);

export const carry = async (remote: Remote, f: Fetch, seen: Survey, local: readonly HashedFile[], plan: Plan, base: Base, report: Report): Promise<Outcome> => {
  const top = local.find((x) => x.path === MANIFEST);
  if (!top) throw new Error('Nothing to sync.');
  const ownManifest = parseManifest(top.bytes);
  const mine = new Map(local.filter((x) => x.path !== MANIFEST).map((x) => [x.path, x] as const));
  const theirs = new Map(seen.remote.filter((e) => e.path !== MANIFEST && groupOf(e.path) !== null).map((e) => [e.path, e.sha] as const));
  const now = new Date().toISOString();
  [...plan.down, ...plan.up].forEach((c) => report(c.path, { kind: 'waiting' }));

  const fetched = new Map<RepoPath, Uint8Array>();
  await each(plan.down.filter((c) => c.remote !== null), report,
    async (c) => { fetched.set(c.path, await readBlob(remote, f, c.remote as GitSha)); },
    (n) => `${files(n)} didn’t arrive. Nothing was changed.`);

  let commit = seen.head.kind === 'at' ? seen.head.commit : null;
  const remoteAfter = new Map(theirs);
  if (plan.up.length) {
    const manifest = jsonBytes(manifestOf(originsAfter(theirs.keys(), 'remote', plan.up, 'local'), ownManifest, seen.manifest, now));
    const head = seen.head.kind === 'empty' ? await seedEmpty(remote, f, MANIFEST, manifest) : seen.head;
    const sent = new Map<RepoPath, GitSha | null>(plan.up.map((c) => [c.path, null] as const));
    await each(plan.up.filter((c) => c.local !== null), report,
      async (c) => { sent.set(c.path, await writeBlob(remote, f, mine.get(c.path)?.bytes ?? new Uint8Array())); },
      (n) => `${files(n)} didn’t reach GitHub. Nothing was committed.`);
    const manifestSha = await writeBlob(remote, f, manifest);
    commit = await commitChanges(remote, f, head, [...[...sent].map(([path, sha]) => ({ path, sha })), { path: MANIFEST, sha: manifestSha }], 'Sync from OmniStax');
    plan.up.forEach((c) => (c.local ? remoteAfter.set(c.path, c.local) : remoteAfter.delete(c.path)));
  }

  const localAfter = new Map([...mine].map(([p, x]) => [p, x.sha] as const));
  if (!plan.down.length) return { commit, backup: null, base: rebase(base, localAfter, remoteAfter) };
  const origins = originsAfter(mine.keys(), 'local', plan.down, 'remote');
  const profile = new Map([...origins].flatMap(([p, o]): [RepoPath, Uint8Array][] => {
    const bytes = o === 'local' ? mine.get(p)?.bytes : fetched.get(p);
    return bytes ? [[p, bytes]] : [];
  }));
  profile.set(MANIFEST, jsonBytes(manifestOf(origins, ownManifest, seen.manifest, now)));
  plan.down.forEach((c) => (c.remote ? localAfter.set(c.path, c.remote) : localAfter.delete(c.path)));
  return { commit, backup: fromRepo(profile), base: rebase(base, localAfter, remoteAfter) };
};
