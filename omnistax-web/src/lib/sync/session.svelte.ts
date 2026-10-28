/* One look at the repo beside this device: what differs, which version the
   reader has chosen where both changed (or the merge the app made, or the one
   the reader settled conflict by conflict), the files a pull holds back
   (queue.svelte.ts), the file whose changes they are reading, and each file's
   progress while a sync runs. The sidebar and the changes tab both read it. */
import { createBackup, importBackup } from '../backup/adapters';
import { readBlob, type GitSha } from './github';
import { toRepo, type RepoPath } from './layout';
import { changesOf, isMerged, mergedFor, overwrite, planOf, rebase, type Change, type Pick, type Plan, type Status } from './plan';
import { bothWays, carry, hashed, screen, settle, survey, type BothWays, type HashedFile, type Survey } from './run';
import { reconcile, withHeld, type Held } from './held';
import { heldQueue } from './queue.svelte';
import type { Choices } from './conflict';
import { sync } from './store.svelte';
import { t } from '../i18n';

export type Phase = 'idle' | 'reading' | 'ready' | 'moving';
/* What the reader has done in a conflicted file so far: a choice per
   conflict, and the result as they edited it by hand, if they did. */
export type Draft = { readonly choices: Choices; readonly edited: string | null };
const failure = (e: unknown): string => e instanceof Error ? e.message : t('files.sync.error.unreachable');

class SyncSession {
  phase = $state<Phase>('idle');
  problem = $state('');
  seen = $state.raw<Survey | null>(null);
  local = $state.raw<readonly HashedFile[]>([]);
  changes = $state.raw<readonly Change[]>([]);
  picks = $state.raw<ReadonlyMap<RepoPath, Pick>>(new Map());
  status = $state.raw<ReadonlyMap<RepoPath, Status>>(new Map());
  /* Each JSON file changed on both sides, merged as far as it goes. */
  merges = $state.raw<ReadonlyMap<RepoPath, BothWays>>(new Map());
  drafts = $state.raw<ReadonlyMap<RepoPath, Draft>>(new Map());
  selected = $state<RepoPath | null>(null);
  #ticket = 0;
  #blobs = new Map<GitSha, Promise<Uint8Array>>();

  get plan(): Plan { return withHeld(planOf(this.changes, this.picks), this.changes, heldQueue.items); }
  /* The hold on a file the repo changed, while it still holds. */
  heldFor(c: Change): Held | null { const h = heldQueue.items.find((x) => x.path === c.path); return h && c.side === 'down' && h.local === c.local && h.remote === c.remote ? h : null; }
  get unchosen(): number { return this.changes.filter((c) => c.side === 'both' && !this.chosen(c)).length; }
  chosen(c: Change): boolean { const p = this.picks.get(c.path); return p === 'mine' || p === 'theirs' || mergedFor(p, c); }

  clear(): void { this.#ticket++; this.phase = 'idle'; this.seen = null; this.changes = []; this.local = []; this.merges = new Map(); this.problem = ''; }

  async read(): Promise<void> {
    const remote = sync.remote; if (!remote) return;
    const mine = ++this.#ticket;
    this.phase = 'reading'; this.problem = '';
    try {
      const last = sync.last?.base ?? {};
      const [s, files] = await Promise.all([survey(remote, fetch.bind(globalThis), last), createBackup().then(toRepo).then(hashed)]);
      if (mine !== this.#ticket) return;
      this.seen = s;
      const base = rebase({ ...s.base, ...last }, new Map(files.map((f) => [f.path, f.sha] as const)), new Map(s.remote.map((e) => [e.path, e.sha] as const)));
      const changes = changesOf(files, s.remote, base, s.manifest);
      const merges = await bothWays(changes, files, base, (sha) => this.remoteBytes(sha));
      const checked = await screen(changes, files, (sha) => this.remoteBytes(sha));
      if (mine !== this.#ticket) return;
      this.seen = { ...s, held: new Map([...s.held, ...checked.bytes]) };
      heldQueue.set(reconcile(heldQueue.items, checked.found, changes));
      sync.agreed(base, false);
      this.local = files; this.changes = changes; this.merges = merges;
      /* A choice stands while the file it was made for still differs the same
         way; a merge the app made is offered for each file that merged clean. */
      const both = new Map(changes.filter((c) => c.side === 'both').map((c) => [c.path, c] as const));
      const kept = [...this.picks].filter(([p, pick]) => { const c = both.get(p); return c && (!isMerged(pick) || mergedFor(pick, c)); });
      const picks = new Map(kept);
      for (const [p, m] of merges) if (m.merged && !picks.has(p)) picks.set(p, m.merged);
      this.picks = picks;
      this.drafts = new Map([...this.drafts].filter(([p]) => both.has(p)));
      this.status = new Map(); this.phase = 'ready';
    } catch (e) { if (mine === this.#ticket) { this.phase = 'idle'; this.problem = failure(e); } }
  }

  async go(plan: Plan): Promise<void> {
    const remote = sync.remote;
    if (!this.seen || !remote || this.phase !== 'ready') return;
    this.phase = 'moving'; this.problem = ''; this.status = new Map();
    try {
      const out = await carry(remote, fetch.bind(globalThis), this.seen, this.local, plan, sync.last?.base ?? {}, (path, s) => { this.status = new Map(this.status).set(path, s); });
      /* A held file the sync moved, the reader's way, leaves the queue; one the
         check let through and this version still could not take joins it. */
      const moved = new Set([...plan.up, ...plan.down].map((c) => c.path));
      const stays = heldQueue.items.filter((h) => !moved.has(h.path) && !out.held.some((x) => x.path === h.path));
      heldQueue.set(out.held.length ? [...stays, ...reconcile(heldQueue.items, out.held, this.changes)] : stays);
      if (out.backup) {
        try { await importBackup(out.backup, { keepWorkspace: true }); sync.agreed(out.base, true); }
        catch (e) { alert(e instanceof Error ? e.message : t('files.sync.error.restored')); }
        location.reload();
        return;
      }
      sync.agreed(out.base, true);
      this.phase = 'ready';
      await this.read();
    } catch (e) { this.phase = 'ready'; this.problem = failure(e); }
  }
  force(to: 'device' | 'repo'): Promise<void> { return this.go(overwrite(this.changes, to)); }

  /* A whole side, or (again) the merge the app made; choosing the side already chosen takes it back. */
  pick(path: RepoPath, p: 'mine' | 'theirs' | 'merged'): void {
    const next = new Map(this.picks);
    const merged = this.merges.get(path)?.merged ?? null;
    if (p === 'merged') { if (merged) next.set(path, merged); }
    else if (next.get(path) === p) { if (merged) next.set(path, merged); else next.delete(path); }
    else next.set(path, p);
    this.picks = next;
  }
  /* For a held file: the repo's copy, or this device's. */
  hold(path: RepoPath, p: 'mine' | 'theirs'): void { heldQueue.pick(path, p); }
  pickAll(p: 'mine' | 'theirs'): void { this.picks = new Map(this.changes.filter((c) => c.side === 'both').map((c) => [c.path, p] as const)); }

  draft(path: RepoPath, d: Draft): void { this.drafts = new Map(this.drafts).set(path, d); }
  /* The reader's own settling of a file, checked as the file it would become;
     the reason it cannot be, when it cannot. */
  async resolve(c: Change, text: string): Promise<string | null> {
    const out = await settle(c, text, false);
    if (out.merged) this.picks = new Map(this.picks).set(c.path, out.merged);
    return out.problem;
  }

  /* The repo's copy of a file, fetched once however often its changes are
     opened; a record the survey took out of a category file is already here. */
  remoteBytes(sha: GitSha): Promise<Uint8Array> {
    const remote = sync.remote;
    const there = this.seen?.held.get(sha);
    if (there) return Promise.resolve(there);
    if (!remote) return Promise.reject(new Error('Not connected.'));
    const held = this.#blobs.get(sha);
    if (held) return held;
    const got = readBlob(remote, fetch.bind(globalThis), sha);
    this.#blobs.set(sha, got);
    got.catch(() => this.#blobs.delete(sha));
    return got;
  }
}
export const session = new SyncSession();
