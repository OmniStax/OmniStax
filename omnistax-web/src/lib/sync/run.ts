/* A plan carried out: what comes down is fetched first, so a failure there
   changes nothing anywhere; then what goes up is sent and committed on the
   surveyed head as one commit, with a manifest that describes the merged tree;
   then the profile this device should hold is built. Each file's progress is
   reported as it goes. Takes the fetch it calls GitHub through. */
import { blobSha, commitChanges, readBlob, readHead, readTree, seedEmpty, writeBlob, type Fetch, type GitSha, type Head, type Remote, type RemoteEntry } from './github';
import { MANIFEST, explode, fileProblem, fromRepo, groupOf, isLegacyRecords, jsonBytes, parseManifest, type Manifest, type RepoFile, type RepoPath } from './layout';
import { manifestOf, originsAfter, rebase, type Base, type Change, type Merged, type Plan, type Status } from './plan';
import { duplicateKey, mergeTexts } from './conflict';
import type { ParsedBackup } from '../backup/schema';
import { t } from '../i18n';

/* The repo as one look found it. A repo still in the first layout is shown as
   the second: each category file stands as the records' own files it holds
   (`virtual`, whose bytes are `held` by their sha, since the repo has no such
   blob yet), and `legacy` names the category files that the next push
   replaces with them. `base` is the same taking-apart of the category files
   the last sync agreed on, so a record is compared with its own last agreed
   version from the first sync on. */
export type Survey = {
  readonly head: Head; readonly remote: readonly RemoteEntry[]; readonly manifest: Manifest | null;
  readonly held: ReadonlyMap<GitSha, Uint8Array>; readonly virtual: ReadonlySet<RepoPath>; readonly legacy: readonly RepoPath[]; readonly base: Base;
};
export type Report = (path: RepoPath, status: Status) => void;
export type HashedFile = RepoFile & { readonly sha: GitSha };
/* What a plan left behind: the branch's commit, the profile to import when
   anything came down, and the base to remember once that import has landed. */
export type Outcome = { readonly commit: GitSha | null; readonly backup: ParsedBackup | null; readonly base: Base };

const AT_ONCE = 3;
const failure = (e: unknown): string => e instanceof Error ? e.message : t('files.sync.error.failed');

const pool = async <T>(items: readonly T[], n: number, f: (item: T) => Promise<void>): Promise<void> => {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(n, queue.length) }, async () => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) await f(item);
  }));
};

export const hashed = async (files: readonly RepoFile[]): Promise<readonly HashedFile[]> =>
  Promise.all(files.map(async (f) => ({ ...f, sha: await blobSha(f.bytes) })));

/* A category file taken apart into entries, each with its bytes held. */
const virtualOf = async (bytes: Uint8Array, held: Map<GitSha, Uint8Array>): Promise<RemoteEntry[]> =>
  Promise.all([...explode(bytes)].map(async ([path, b]) => {
    const sha = await blobSha(b);
    held.set(sha, b);
    return { path, sha, size: b.length };
  }));

export const survey = async (remote: Remote, f: Fetch, base: Base = {}): Promise<Survey> => {
  const held = new Map<GitSha, Uint8Array>();
  const head = await readHead(remote, f);
  const entries = head.kind === 'at' ? await readTree(remote, f, head.tree) : [];
  const top = entries.find((e) => e.path === MANIFEST);
  const manifest = top ? await readBlob(remote, f, top.sha).then(parseManifest).catch(() => null) : null;

  const legacy = entries.filter((e) => isLegacyRecords(e.path));
  const real = entries.filter((e) => !isLegacyRecords(e.path));
  const own = new Set(real.map((e) => e.path));
  /* Where a record has a file of its own beside a category file holding it,
     its own file is the later; the category file's copy is only what an older
     version left behind. */
  const exploded = (await Promise.all(legacy.map(async (e) => virtualOf(await readBlob(remote, f, e.sha), held)))).flat().filter((e) => !own.has(e.path));
  const agreed: Record<RepoPath, GitSha> = {};
  for (const [path, sha] of Object.entries(base)) {
    if (!isLegacyRecords(path)) continue;
    const bytes = await readBlob(remote, f, sha).catch(() => null);
    if (bytes) for (const e of await virtualOf(bytes, held).catch(() => [])) if (!(e.path in base)) agreed[e.path] = e.sha;
  }
  return { head, remote: [...real, ...exploded], manifest, held, virtual: new Set(exploded.map((e) => e.path)), legacy: legacy.map((e) => e.path), base: agreed };
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

/* A file's bytes by sha: one the plan or the survey already holds, else the repo's. */
const bytesBy = (remote: Remote, f: Fetch, seen: Survey, plan: Plan) => (c: Change, sha: GitSha): Promise<Uint8Array> => {
  const have = plan.held?.get(c.path) ?? seen.held.get(sha);
  return have ? Promise.resolve(have) : readBlob(remote, f, sha);
};

export const carry = async (remote: Remote, f: Fetch, seen: Survey, local: readonly HashedFile[], plan: Plan, base: Base, report: Report): Promise<Outcome> => {
  const top = local.find((x) => x.path === MANIFEST);
  if (!top) throw new Error(t('files.sync.error.nothing'));
  const ownManifest = parseManifest(top.bytes);
  const mine = new Map(local.filter((x) => x.path !== MANIFEST).map((x) => [x.path, x] as const));
  const theirs = new Map(seen.remote.filter((e) => e.path !== MANIFEST && groupOf(e.path) !== null).map((e) => [e.path, e.sha] as const));
  const now = new Date().toISOString();
  const bytesOf = bytesBy(remote, f, seen, plan);
  [...plan.down, ...plan.up].forEach((c) => report(c.path, { kind: 'waiting' }));

  const fetched = new Map<RepoPath, Uint8Array>();
  await each(plan.down.filter((c) => c.remote !== null), report,
    async (c) => { fetched.set(c.path, await bytesOf(c, c.remote as GitSha)); },
    (n) => t('files.sync.error.notArrived', { n }));
  /* A file this version cannot read is not taken: it stays as this device
     has it, its row says why, and since the base does not move for it, it is
     offered again (and never pushed over) until a version that reads it does. */
  const refused = new Set<RepoPath>();
  for (const [path, bytes] of fetched) {
    const why = fileProblem(path, bytes);
    if (why) { refused.add(path); fetched.delete(path); report(path, { kind: 'failed', why: t('files.sync.error.unreadable', { why }) }); }
  }
  const down = plan.down.filter((c) => !refused.has(c.path));

  let commit = seen.head.kind === 'at' ? seen.head.commit : null;
  const remoteAfter = new Map(theirs);
  if (plan.up.length) {
    const manifest = jsonBytes(manifestOf(originsAfter(theirs.keys(), 'remote', plan.up, 'local'), ownManifest, seen.manifest, now));
    const head = seen.head.kind === 'empty' ? await seedEmpty(remote, f, MANIFEST, manifest) : seen.head;
    const sent = new Map<RepoPath, GitSha | null>(plan.up.map((c) => [c.path, null] as const));
    await each(plan.up.filter((c) => c.local !== null), report,
      async (c) => { sent.set(c.path, await writeBlob(remote, f, plan.held?.get(c.path) ?? mine.get(c.path)?.bytes ?? new Uint8Array())); },
      (n) => t('files.sync.error.notSent', { n }));
    /* The move to a file per record, made with the first push: every record a
       category file held and this push does not already send is written as
       the repo had it, and the category files go. */
    const moved = [...seen.virtual].filter((p) => !sent.has(p) && theirs.has(p));
    await pool(moved, AT_ONCE, async (p) => { sent.set(p, await writeBlob(remote, f, seen.held.get(theirs.get(p) as GitSha) ?? new Uint8Array())); });
    seen.legacy.forEach((p) => sent.set(p, null));
    const manifestSha = await writeBlob(remote, f, manifest);
    commit = await commitChanges(remote, f, head, [...[...sent].map(([path, sha]) => ({ path, sha })), { path: MANIFEST, sha: manifestSha }], 'Sync from OmniStax');
    plan.up.forEach((c) => (c.local ? remoteAfter.set(c.path, c.local) : remoteAfter.delete(c.path)));
  }

  const localAfter = new Map([...mine].map(([p, x]) => [p, x.sha] as const));
  if (!down.length) return { commit, backup: null, base: rebase(base, localAfter, remoteAfter) };
  const origins = originsAfter(mine.keys(), 'local', down, 'remote');
  const profile = new Map([...origins].flatMap(([p, o]): [RepoPath, Uint8Array][] => {
    const bytes = o === 'local' ? mine.get(p)?.bytes : fetched.get(p);
    return bytes ? [[p, bytes]] : [];
  }));
  profile.set(MANIFEST, jsonBytes(manifestOf(origins, ownManifest, seen.manifest, now)));
  down.forEach((c) => (c.remote ? localAfter.set(c.path, c.remote) : localAfter.delete(c.path)));
  return { commit, backup: fromRepo(profile), base: rebase(base, localAfter, remoteAfter) };
};

/* What a file changed on both sides comes to: the two texts the reader
   settles between, and the merge, ready to send, where nothing conflicted
   and the merge reads as this version would read it. */
export type BothWays = { readonly mine: string; readonly theirs: string; readonly merged: Merged | null; readonly problem: string | null };

const decoder = new TextDecoder();
const encoder = new TextEncoder();
const text = (b: Uint8Array | null | undefined): string | null => (b ? decoder.decode(b) : null);

/* Each JSON file changed on both sides, merged against the version both last
   agreed on. The base is fetched by its sha, which the repo's history keeps;
   a base that cannot be had makes the merge two-way, where only what both
   sides hold differently conflicts. A file whose repo copy cannot be had is
   left out, and is settled by keeping one side whole as before. */
export const bothWays = async (changes: readonly Change[], local: readonly HashedFile[], base: Base, blob: (sha: GitSha) => Promise<Uint8Array>): Promise<ReadonlyMap<RepoPath, BothWays>> => {
  const out = new Map<RepoPath, BothWays>();
  await pool(changes.filter((c) => c.side === 'both' && c.path.endsWith('.json')), AT_ONCE, async (c) => {
    const mine = text(local.find((f) => f.path === c.path)?.bytes);
    const got = c.remote ? await blob(c.remote).catch(() => undefined) : null;
    if (got === undefined) return;
    const theirs = text(got);
    const was = base[c.path] ? text(await blob(base[c.path]).catch(() => null)) : null;
    const m = mergeTexts(was, mine, theirs);
    out.set(c.path, { mine: m.mine, theirs: m.theirs, ...(m.merged === null ? { merged: null, problem: null } : await settle(c, m.merged, true)) });
  });
  return out;
};

/* A merge's text as the file it becomes, or why it cannot be: the text must
   read as JSON and as what the file holds, and is laid out as the app lays
   out its files, so the device that imports it writes the same bytes back. */
export const settle = async (c: Change, text: string, auto: boolean): Promise<{ readonly merged: Merged | null; readonly problem: string | null }> => {
  let value: unknown;
  try { value = JSON.parse(text); } catch (e) { return { merged: null, problem: t('files.sync.error.notJson', { why: e instanceof Error ? e.message : '' }) }; }
  const twice = duplicateKey(text);
  if (twice !== null) return { merged: null, problem: t('files.sync.error.twice', { key: twice }) };
  const bytes = c.path.endsWith('.json') ? jsonBytes(value) : encoder.encode(text);
  const problem = fileProblem(c.path, bytes);
  if (problem) return { merged: null, problem };
  return { merged: { kind: 'merged', bytes, sha: await blobSha(bytes), local: c.local, remote: c.remote, auto }, problem: null };
};
