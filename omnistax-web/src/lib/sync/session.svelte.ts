/* One look at the repo beside this device: what differs, which version the
   reader has chosen where both changed, the file whose changes they are
   reading, and each file's progress while a sync runs. The sidebar and the
   changes tab both read it. */
import { createBackup, importBackup } from '../backup/adapters';
import { readBlob, type GitSha } from './github';
import { toRepo, type RepoPath } from './layout';
import { changesOf, overwrite, planOf, rebase, type Change, type Pick, type Plan, type Status } from './plan';
import { carry, hashed, survey, type HashedFile, type Survey } from './run';
import { sync } from './store.svelte';

export type Phase = 'idle' | 'reading' | 'ready' | 'moving';
const failure = (e: unknown): string => e instanceof Error ? e.message : 'Couldn’t reach GitHub.';

class SyncSession {
  phase = $state<Phase>('idle');
  problem = $state('');
  seen = $state.raw<Survey | null>(null);
  local = $state.raw<readonly HashedFile[]>([]);
  changes = $state.raw<readonly Change[]>([]);
  picks = $state.raw<ReadonlyMap<RepoPath, Pick>>(new Map());
  status = $state.raw<ReadonlyMap<RepoPath, Status>>(new Map());
  selected = $state<RepoPath | null>(null);
  #ticket = 0;
  #blobs = new Map<GitSha, Promise<Uint8Array>>();

  get plan(): Plan { return planOf(this.changes, this.picks); }
  get unchosen(): number { return this.changes.filter((c) => c.side === 'both' && !this.picks.has(c.path)).length; }

  clear(): void { this.#ticket++; this.phase = 'idle'; this.seen = null; this.changes = []; this.local = []; this.problem = ''; }

  async read(): Promise<void> {
    const remote = sync.remote; if (!remote) return;
    const mine = ++this.#ticket;
    this.phase = 'reading'; this.problem = '';
    try {
      const [s, files] = await Promise.all([survey(remote, fetch.bind(globalThis)), createBackup().then(toRepo).then(hashed)]);
      if (mine !== this.#ticket) return;
      const base = rebase(sync.last?.base ?? {}, new Map(files.map((f) => [f.path, f.sha] as const)), new Map(s.remote.map((e) => [e.path, e.sha] as const)));
      sync.agreed(base, false);
      this.seen = s; this.local = files; this.changes = changesOf(files, s.remote, base, s.manifest);
      this.picks = new Map([...this.picks].filter(([p]) => this.changes.some((c) => c.path === p && c.side === 'both')));
      this.status = new Map(); this.phase = 'ready';
    } catch (e) { if (mine === this.#ticket) { this.phase = 'idle'; this.problem = failure(e); } }
  }

  async go(plan: Plan): Promise<void> {
    const remote = sync.remote;
    if (!this.seen || !remote || this.phase !== 'ready') return;
    this.phase = 'moving'; this.problem = ''; this.status = new Map();
    try {
      const out = await carry(remote, fetch.bind(globalThis), this.seen, this.local, plan, sync.last?.base ?? {}, (path, s) => { this.status = new Map(this.status).set(path, s); });
      if (out.backup) {
        try { await importBackup(out.backup); sync.agreed(out.base, true); }
        catch (e) { alert(e instanceof Error ? e.message : 'Couldn’t update your data. Your previous data was restored.'); }
        location.reload();
        return;
      }
      sync.agreed(out.base, true);
      this.phase = 'ready';
      await this.read();
    } catch (e) { this.phase = 'ready'; this.problem = failure(e); }
  }
  force(to: 'device' | 'repo'): Promise<void> { return this.go(overwrite(this.changes, to)); }

  pick(path: RepoPath, p: Pick): void { const next = new Map(this.picks); if (next.get(path) === p) next.delete(path); else next.set(path, p); this.picks = next; }
  pickAll(p: Pick): void { this.picks = new Map(this.changes.filter((c) => c.side === 'both').map((c) => [c.path, p] as const)); }

  /* The repo's copy of a file, fetched once however often its changes are opened. */
  remoteBytes(sha: GitSha): Promise<Uint8Array> {
    const remote = sync.remote;
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
