/* Where this device syncs to, and the base: each file's blob as this device
   and the repo last agreed on it, which tells a change made here from one made
   there. Both keys stay out of backups and pushes: the repo is this device's choice, and
   the token could be spent. */
import { z } from 'zod';
import { repoName, type Remote } from './github';
import type { Base } from './plan';

const KEY = 'omnistax-sync-v1';
const TOKEN_KEY = 'omnistax-github-token';

const SavedSchema = z.object({
  repo: z.string(), branch: z.string(),
  last: z.object({ repo: z.string(), branch: z.string(), at: z.number().nullable(), base: z.record(z.string()).default({}) }).nullable(),
});
type Saved = z.infer<typeof SavedSchema>;
const EMPTY: Saved = { repo: '', branch: 'main', last: null };

const read = (key: string): string | null => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, v: string): void => { try { if (v) localStorage.setItem(key, v); else localStorage.removeItem(key); } catch { /* private mode */ } };
const load = (): Saved => { try { return SavedSchema.parse(JSON.parse(read(KEY) ?? 'null')); } catch { return EMPTY; } };

class SyncStore {
  saved = $state.raw<Saved>(EMPTY);
  token = $state('');

  init(): void { this.saved = load(); this.token = read(TOKEN_KEY) ?? ''; }

  private save(next: Saved): void { this.saved = next; write(KEY, JSON.stringify(next)); }
  setRepo(repo: string): void { this.save({ ...this.saved, repo: repo.trim() }); }
  setBranch(branch: string): void { this.save({ ...this.saved, branch: branch.trim() || 'main' }); }
  setToken(token: string): void { this.token = token.trim(); write(TOKEN_KEY, this.token); }

  get remote(): Remote | null {
    const repo = repoName(this.saved.repo);
    return repo && this.token ? { repo, branch: this.saved.branch, token: this.token } : null;
  }
  /* The last sync counts only for the repo and branch it was made with. */
  get last(): { readonly at: number | null; readonly base: Base } | null {
    const l = this.saved.last;
    return l && l.repo === this.saved.repo && l.branch === this.saved.branch ? { at: l.at, base: l.base as Base } : null;
  }
  /* A sync that moved files stamps the time; a survey that only found files
     already agreeing keeps the last one. */
  agreed(base: Base, synced: boolean, at: number = Date.now()): void {
    this.save({ ...this.saved, last: { repo: this.saved.repo, branch: this.saved.branch, base, at: synced ? at : this.last?.at ?? null } });
  }
}
export const sync = new SyncStore();
